-- Stronger address canonicalization and automatic household assignment.
-- Equivalent textual variants must resolve to one chargeable dwelling.

CREATE OR REPLACE FUNCTION public.normalize_member_address(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := lower(translate(trim(value), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'));
  normalized := regexp_replace(normalized, '\m(n|no)\M[[:space:]#º°]*([0-9])', '\2', 'g');

  -- Canonical street and unit vocabulary used in Chilean addresses.
  normalized := regexp_replace(normalized, '\m(avenida|avda|av)\M', 'av', 'g');
  normalized := regexp_replace(normalized, '\m(pasaje|pje)\M', 'pje', 'g');
  normalized := regexp_replace(normalized, '\m(calle|clle)\M', 'calle', 'g');
  normalized := regexp_replace(normalized, '\m(camino|cno)\M', 'camino', 'g');
  normalized := regexp_replace(normalized, '\m(carretera|ruta)\M', 'ruta', 'g');
  normalized := regexp_replace(normalized, '\m(departamento|depto|dpto|apartamento|apto)\M', 'depto', 'g');
  normalized := regexp_replace(normalized, '\m(bloque|block|blk)\M', 'block', 'g');
  normalized := regexp_replace(normalized, '\m(condominio|cond)\M', 'condominio', 'g');
  normalized := regexp_replace(normalized, '\m(poblacion|pob)\M', 'pob', 'g');
  normalized := regexp_replace(normalized, '\m(numero|nro|num)\M', ' ', 'g');

  -- Punctuation, number signs, repeated spaces and casing are not identity.
  normalized := regexp_replace(normalized, '[#º°]', ' ', 'g');
  normalized := regexp_replace(normalized, '[^a-z0-9]+', ' ', 'g');
  normalized := trim(regexp_replace(normalized, '\s+', ' ', 'g'));

  IF normalized = '' THEN
    RAISE EXCEPTION 'La direccion no contiene datos utilizables';
  END IF;
  RETURN normalized;
END;
$$;

-- Map every current household to the canonical row produced by the stronger
-- normalizer. The oldest row remains the stable household identifier.
CREATE TEMP TABLE household_canonical_map ON COMMIT DROP AS
SELECT id AS household_id, canonical_id, normalized_address
FROM (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY junta_id, public.normalize_member_address(address)
      ORDER BY created_at, id
    ) AS canonical_id,
    public.normalize_member_address(address) AS normalized_address
  FROM public.households
) ranked;

-- Rank historical dues before merging households. One row remains the active
-- address due per period; any collision is retained as an unlinked legacy audit row.
CREATE TEMP TABLE household_due_merge_plan ON COMMIT DROP AS
SELECT
  due.id AS due_id,
  mapping.canonical_id,
  row_number() OVER (
    PARTITION BY mapping.canonical_id, due.period
    ORDER BY
      CASE due.status WHEN 'paid' THEN 0 WHEN 'preference_created' THEN 1 ELSE 2 END,
      due.updated_at DESC,
      due.created_at DESC,
      due.id
  ) AS position
FROM public.member_dues due
JOIN household_canonical_map mapping ON mapping.household_id = due.household_id;

UPDATE public.member_dues due
SET household_id = NULL
FROM household_due_merge_plan plan
WHERE plan.due_id = due.id AND plan.position > 1;

UPDATE public.member_dues due
SET household_id = plan.canonical_id
FROM household_due_merge_plan plan
WHERE plan.due_id = due.id
  AND plan.position = 1
  AND due.household_id IS DISTINCT FROM plan.canonical_id;

UPDATE public.profiles profile
SET household_id = mapping.canonical_id
FROM household_canonical_map mapping
WHERE profile.household_id = mapping.household_id
  AND mapping.household_id <> mapping.canonical_id;

DELETE FROM public.households household
USING household_canonical_map mapping
WHERE household.id = mapping.household_id
  AND mapping.household_id <> mapping.canonical_id;

UPDATE public.households household
SET normalized_address = mapping.normalized_address,
    updated_at = timezone('utc'::text, now())
FROM household_canonical_map mapping
WHERE household.id = mapping.canonical_id
  AND household.normalized_address IS DISTINCT FROM mapping.normalized_address;

CREATE OR REPLACE FUNCTION public.enforce_normalized_household_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.address := trim(NEW.address);
  NEW.normalized_address := public.normalize_member_address(NEW.address);
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_normalized_household_address ON public.households;
CREATE TRIGGER enforce_normalized_household_address
BEFORE INSERT OR UPDATE OF junta_id, address, normalized_address
ON public.households
FOR EACH ROW EXECUTE FUNCTION public.enforce_normalized_household_address();

CREATE OR REPLACE FUNCTION public.assign_profile_household_from_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resolved_household_id UUID;
BEGIN
  IF NEW.junta_id IS NULL OR char_length(trim(coalesce(NEW.address, ''))) < 3 THEN
    RAISE EXCEPTION 'La junta y direccion del socio son obligatorias';
  END IF;

  NEW.address := trim(NEW.address);
  INSERT INTO public.households (junta_id, address, normalized_address)
  VALUES (NEW.junta_id, NEW.address, public.normalize_member_address(NEW.address))
  ON CONFLICT (junta_id, normalized_address) DO UPDATE
    SET updated_at = timezone('utc'::text, now())
  RETURNING id INTO resolved_household_id;

  -- Ignore a client-supplied household id: the normalized address is authoritative.
  NEW.household_id := resolved_household_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_profile_household_from_address ON public.profiles;
CREATE TRIGGER assign_profile_household_from_address
BEFORE INSERT OR UPDATE OF junta_id, address, household_id
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_profile_household_from_address();

COMMENT ON FUNCTION public.normalize_member_address(TEXT) IS
  'Canonical Chilean address key used to prevent duplicate chargeable households.';

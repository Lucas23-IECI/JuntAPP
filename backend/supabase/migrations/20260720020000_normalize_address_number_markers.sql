-- Treat the common Chilean "N° 123" / "Nº 123" notation as the bare street number.

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
  normalized := regexp_replace(normalized, '[#º°]', ' ', 'g');
  normalized := regexp_replace(normalized, '[^a-z0-9]+', ' ', 'g');
  normalized := trim(regexp_replace(normalized, '\s+', ' ', 'g'));
  IF normalized = '' THEN RAISE EXCEPTION 'La direccion no contiene datos utilizables'; END IF;
  RETURN normalized;
END;
$$;

CREATE TEMP TABLE household_number_marker_map ON COMMIT DROP AS
SELECT id AS household_id, canonical_id, normalized_address
FROM (
  SELECT id,
    first_value(id) OVER (PARTITION BY junta_id, public.normalize_member_address(address) ORDER BY created_at, id) AS canonical_id,
    public.normalize_member_address(address) AS normalized_address
  FROM public.households
) ranked;

CREATE TEMP TABLE household_number_due_plan ON COMMIT DROP AS
SELECT due.id AS due_id, mapping.canonical_id,
  row_number() OVER (
    PARTITION BY mapping.canonical_id, due.period
    ORDER BY CASE due.status WHEN 'paid' THEN 0 WHEN 'preference_created' THEN 1 ELSE 2 END,
      due.updated_at DESC, due.created_at DESC, due.id
  ) AS position
FROM public.member_dues due
JOIN household_number_marker_map mapping ON mapping.household_id=due.household_id;

UPDATE public.member_dues due SET household_id=NULL
FROM household_number_due_plan plan
WHERE plan.due_id=due.id AND plan.position>1;

UPDATE public.member_dues due SET household_id=plan.canonical_id
FROM household_number_due_plan plan
WHERE plan.due_id=due.id AND plan.position=1 AND due.household_id IS DISTINCT FROM plan.canonical_id;

UPDATE public.profiles profile SET household_id=mapping.canonical_id
FROM household_number_marker_map mapping
WHERE profile.household_id=mapping.household_id AND mapping.household_id<>mapping.canonical_id;

DELETE FROM public.households household
USING household_number_marker_map mapping
WHERE household.id=mapping.household_id AND mapping.household_id<>mapping.canonical_id;

UPDATE public.households household
SET normalized_address=mapping.normalized_address, updated_at=timezone('utc'::text,now())
FROM household_number_marker_map mapping
WHERE household.id=mapping.canonical_id AND household.normalized_address IS DISTINCT FROM mapping.normalized_address;

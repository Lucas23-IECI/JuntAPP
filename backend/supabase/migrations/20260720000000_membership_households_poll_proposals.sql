-- Membership approval, address-based dues and member voting proposals.
-- A social due belongs to one dwelling/address, regardless of how many members live there.

CREATE OR REPLACE FUNCTION public.normalize_member_address(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT trim(regexp_replace(
    lower(translate(value, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
  address TEXT NOT NULL CHECK (char_length(trim(address)) >= 3),
  normalized_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (junta_id, normalized_address)
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read households in their junta"
ON public.households FOR SELECT TO authenticated
USING (junta_id = public.current_junta_id());
CREATE POLICY "Dirigentes can manage households in their junta"
ON public.households FOR ALL TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');
GRANT SELECT ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO service_role;

ALTER TABLE public.profiles ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE RESTRICT;

INSERT INTO public.households (junta_id, address, normalized_address)
SELECT DISTINCT ON (junta_id, public.normalize_member_address(address))
  junta_id, trim(address), public.normalize_member_address(address)
FROM public.profiles
ORDER BY junta_id, public.normalize_member_address(address), created_at;

UPDATE public.profiles profile
SET household_id = household.id
FROM public.households household
WHERE household.junta_id = profile.junta_id
  AND household.normalized_address = public.normalize_member_address(profile.address);

ALTER TABLE public.profiles ALTER COLUMN household_id SET NOT NULL;
CREATE INDEX idx_profiles_household_id ON public.profiles(household_id);

ALTER TABLE public.member_dues
  ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE RESTRICT;

UPDATE public.member_dues due
SET household_id = profile.household_id
FROM public.profiles profile
WHERE profile.id = due.profile_id;

-- Preserve every historical payment. If old per-person rows collide at one address,
-- only the best representative becomes the address due; the others remain as legacy audit rows.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY household_id, period
    ORDER BY CASE status WHEN 'paid' THEN 0 WHEN 'preference_created' THEN 1 ELSE 2 END,
             updated_at DESC, created_at DESC
  ) AS position
  FROM public.member_dues
  WHERE household_id IS NOT NULL
)
UPDATE public.member_dues due
SET household_id = NULL
FROM ranked
WHERE ranked.id = due.id AND ranked.position > 1;

ALTER TABLE public.member_dues ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.member_dues DROP CONSTRAINT IF EXISTS member_dues_profile_id_period_key;
CREATE UNIQUE INDEX member_dues_household_period_key
  ON public.member_dues(household_id, period) WHERE household_id IS NOT NULL;
CREATE INDEX idx_member_dues_household_period ON public.member_dues(household_id, period);

DROP POLICY IF EXISTS "Members can read their dues and dirigentes can read junta dues" ON public.member_dues;
CREATE POLICY "Households can read their dues and dirigentes can read junta dues"
ON public.member_dues FOR SELECT TO authenticated
USING (
  junta_id = public.current_junta_id()
  AND (
    public.current_user_role() = 'dirigente'
    OR household_id = (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  )
);

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('asamblea', 'votacion', 'cuota', 'seguridad', 'registro', 'propuesta'));

CREATE TABLE public.membership_applications (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 3),
  rut TEXT NOT NULL,
  address TEXT NOT NULL CHECK (char_length(trim(address)) >= 3),
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'activated')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  letter_delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (letter_delivery_status IN ('pending', 'sent', 'in_app', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX pending_membership_application_email
  ON public.membership_applications(junta_id, lower(email)) WHERE status = 'pending';
CREATE UNIQUE INDEX pending_membership_application_rut
  ON public.membership_applications(junta_id, rut) WHERE status = 'pending';
CREATE INDEX idx_membership_applications_junta_status
  ON public.membership_applications(junta_id, status, created_at DESC);
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board can read applications in their junta"
ON public.membership_applications FOR SELECT TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');
GRANT SELECT ON public.membership_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_applications TO service_role;

CREATE TABLE public.poll_proposals (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 160),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 2000),
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  poll_id UUID REFERENCES public.polls(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_poll_proposals_junta_status ON public.poll_proposals(junta_id, status, created_at DESC);
ALTER TABLE public.poll_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read own proposals and board can read all"
ON public.poll_proposals FOR SELECT TO authenticated
USING (
  junta_id = public.current_junta_id()
  AND (proposed_by = auth.uid() OR public.current_user_role() = 'dirigente')
);
GRANT SELECT ON public.poll_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.poll_proposals TO service_role;

WITH ranked_active_polls AS (
  SELECT id, row_number() OVER (PARTITION BY junta_id ORDER BY created_at DESC) AS position
  FROM public.polls WHERE active=true
)
UPDATE public.polls poll SET active=false
FROM ranked_active_polls ranked
WHERE ranked.id=poll.id AND ranked.position>1;
CREATE UNIQUE INDEX one_active_poll_per_junta ON public.polls(junta_id) WHERE active=true;

-- Only an approved application or a direct board invitation may create a joining profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target_junta_id UUID; target_household_id UUID; target_role TEXT := 'vecino'; target_position TEXT := NULL; target_cuota TEXT := 'pendiente';
  junta_action TEXT := coalesce(NEW.raw_user_meta_data->>'junta_action','join'); requested_code TEXT := upper(trim(NEW.raw_user_meta_data->>'invite_code'));
  requested_phone TEXT := trim(NEW.raw_user_meta_data->>'phone'); requested_address TEXT := trim(NEW.raw_user_meta_data->>'address');
  requested_region TEXT := trim(NEW.raw_user_meta_data->>'junta_region'); requested_comuna TEXT := trim(NEW.raw_user_meta_data->>'junta_comuna');
  requested_plan TEXT := coalesce(NEW.raw_user_meta_data->>'subscription_plan','juntapp'); requested_whatsapp BOOLEAN := coalesce((NEW.raw_user_meta_data->>'whatsapp_addon')::boolean,false);
  approved_application UUID := nullif(NEW.raw_user_meta_data->>'approved_application_id','')::uuid;
  manual_invite BOOLEAN := coalesce((NEW.raw_user_meta_data->>'manual_invite')::boolean, false);
  base_price INTEGER; new_invite_code TEXT; new_slug TEXT;
BEGIN
  IF char_length(regexp_replace(coalesce(requested_phone,''),'[^0-9]','','g')) < 9 THEN RAISE EXCEPTION 'El numero de celular es obligatorio'; END IF;
  IF char_length(requested_address) < 3 THEN RAISE EXCEPTION 'La direccion es obligatoria'; END IF;
  IF junta_action = 'create' THEN
    IF requested_plan NOT IN ('juntapp','juntapp_web','web') THEN requested_plan := 'juntapp'; END IF;
    base_price := CASE requested_plan WHEN 'web' THEN 9990 WHEN 'juntapp_web' THEN 22990 ELSE 14990 END;
    IF requested_whatsapp THEN base_price := base_price + 7990; END IF;
    IF char_length(trim(NEW.raw_user_meta_data->>'junta_name')) < 3 OR requested_region = '' OR requested_comuna = '' THEN RAISE EXCEPTION 'Datos de la junta incompletos'; END IF;
    LOOP new_invite_code := upper(substr(replace(extensions.uuid_generate_v4()::text,'-',''),1,6)); EXIT WHEN NOT EXISTS (SELECT 1 FROM public.juntas WHERE invite_code=new_invite_code); END LOOP;
    new_slug := trim(both '-' from regexp_replace(lower(translate(NEW.raw_user_meta_data->>'junta_name','áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')),'[^a-z0-9]+','-','g')) || '-' || substr(replace(extensions.uuid_generate_v4()::text,'-',''),1,8);
    INSERT INTO public.juntas(name,slug,comuna,region,invite_code,owner_id,subscription_status,subscription_price,subscription_plan,whatsapp_addon)
    VALUES(trim(NEW.raw_user_meta_data->>'junta_name'),new_slug,requested_comuna,requested_region,new_invite_code,NEW.id,'pending',base_price,requested_plan,requested_whatsapp) RETURNING id INTO target_junta_id;
    target_role := 'dirigente'; target_position := 'presidente'; target_cuota := 'al_dia';
  ELSE
    SELECT id INTO target_junta_id FROM public.juntas WHERE invite_code=requested_code AND subscription_status='authorized';
    IF target_junta_id IS NULL THEN RAISE EXCEPTION 'Codigo invalido o junta inactiva'; END IF;
    IF NOT manual_invite AND NOT EXISTS (
      SELECT 1 FROM public.membership_applications application
      WHERE application.id = approved_application
        AND application.junta_id = target_junta_id
        AND application.status = 'approved'
        AND lower(application.email) = lower(NEW.email)
        AND application.rut = upper(NEW.raw_user_meta_data->>'rut')
    ) THEN
      RAISE EXCEPTION 'La solicitud debe ser aprobada por Secretaria';
    END IF;
  END IF;

  INSERT INTO public.households(junta_id, address, normalized_address)
  VALUES(target_junta_id, requested_address, public.normalize_member_address(requested_address))
  ON CONFLICT (junta_id, normalized_address) DO UPDATE SET updated_at = timezone('utc'::text, now())
  RETURNING id INTO target_household_id;

  IF junta_action <> 'create' AND EXISTS (
    SELECT 1 FROM public.member_dues
    WHERE household_id=target_household_id
      AND period=date_trunc('month',current_date)::date
      AND status='paid'
  ) THEN target_cuota := 'al_dia'; END IF;

  INSERT INTO public.profiles(id,junta_id,household_id,name,rut,address,phone,email,role,board_position,cuota_status)
  VALUES(NEW.id,target_junta_id,target_household_id,trim(NEW.raw_user_meta_data->>'name'),upper(NEW.raw_user_meta_data->>'rut'),requested_address,requested_phone,NEW.email,target_role,target_position,target_cuota);

  IF approved_application IS NOT NULL THEN
    UPDATE public.membership_applications SET status='activated', updated_at=timezone('utc'::text, now())
    WHERE id=approved_application AND status='approved';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.record_approved_member_due(p_due_id UUID, p_payment_id TEXT, p_paid_at TIMESTAMPTZ)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_due public.member_dues%ROWTYPE; dwelling public.households%ROWTYPE; payer_id UUID; new_transaction_id BIGINT;
BEGIN
  SELECT * INTO target_due FROM public.member_dues WHERE id=p_due_id FOR UPDATE;
  IF target_due.id IS NULL OR target_due.household_id IS NULL THEN RAISE EXCEPTION 'Cuota por direccion no encontrada'; END IF;
  IF target_due.status='paid' THEN
    IF target_due.mercadopago_payment_id <> p_payment_id THEN RAISE EXCEPTION 'La cuota ya fue pagada con otra transaccion'; END IF;
    RETURN target_due.transaction_id;
  END IF;
  SELECT * INTO dwelling FROM public.households WHERE id=target_due.household_id AND junta_id=target_due.junta_id;
  SELECT id INTO payer_id FROM public.profiles WHERE household_id=dwelling.id ORDER BY (id=target_due.profile_id) DESC, created_at LIMIT 1;
  INSERT INTO public.transactions(junta_id,type,description,amount,date,created_by)
  VALUES(target_due.junta_id,'ingreso','Cuota domicilio '||to_char(target_due.period,'MM/YYYY')||' — '||dwelling.address||' — Mercado Pago',target_due.amount,coalesce(p_paid_at::date,current_date),payer_id)
  RETURNING id INTO new_transaction_id;
  UPDATE public.member_dues SET status='paid',payment_source='mercadopago',manual_payment_method=NULL,mercadopago_payment_id=p_payment_id,paid_at=p_paid_at,transaction_id=new_transaction_id,updated_at=timezone('utc'::text,now()) WHERE id=target_due.id;
  UPDATE public.profiles SET cuota_status='al_dia' WHERE household_id=dwelling.id AND junta_id=target_due.junta_id;
  INSERT INTO public.notifications(user_id,type,title,message,read,date,action)
  SELECT id,'cuota','Cuota del domicilio recibida','Mercado Pago confirmó la cuota de '||dwelling.address||' por $'||target_due.amount||'.',false,timezone('utc'::text,now()),'/tesoreria'
  FROM public.profiles WHERE household_id=dwelling.id;
  RETURN new_transaction_id;
END; $$;

DROP FUNCTION IF EXISTS public.set_manual_member_due(UUID, UUID, TEXT, TEXT);
CREATE FUNCTION public.set_manual_household_due(p_household_id UUID, p_junta_id UUID, p_action TEXT, p_method TEXT DEFAULT NULL)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_due public.member_dues%ROWTYPE; dwelling public.households%ROWTYPE; due_amount INTEGER; current_period DATE:=date_trunc('month',current_date)::date; method_label TEXT; actor_id UUID; new_transaction_id BIGINT;
BEGIN
  IF p_action NOT IN ('paid','pending') THEN RAISE EXCEPTION 'Accion de cuota invalida'; END IF;
  IF p_action='paid' AND p_method NOT IN ('cash','transfer','other') THEN RAISE EXCEPTION 'Metodo de pago manual invalido'; END IF;
  SELECT * INTO dwelling FROM public.households WHERE id=p_household_id AND junta_id=p_junta_id;
  IF dwelling.id IS NULL THEN RAISE EXCEPTION 'Direccion no encontrada'; END IF;
  SELECT monthly_due_amount INTO due_amount FROM public.juntas WHERE id=p_junta_id;
  SELECT id INTO actor_id FROM public.profiles WHERE household_id=p_household_id ORDER BY created_at LIMIT 1;
  SELECT * INTO target_due FROM public.member_dues WHERE household_id=p_household_id AND period=current_period FOR UPDATE;
  IF target_due.status='paid' AND target_due.mercadopago_payment_id IS NOT NULL THEN RAISE EXCEPTION 'La cuota fue confirmada por Mercado Pago y no puede modificarse manualmente'; END IF;
  IF p_action='pending' THEN
    IF target_due.status='paid' AND target_due.payment_source='manual' THEN
      INSERT INTO public.transactions(junta_id,type,description,amount,date,created_by) VALUES(p_junta_id,'egreso','Anulación cuota domicilio '||to_char(current_period,'MM/YYYY')||' — '||dwelling.address,target_due.amount,current_date,actor_id) RETURNING id INTO new_transaction_id;
      UPDATE public.member_dues SET status='pending',refund_transaction_id=new_transaction_id,paid_at=NULL,payment_source=NULL,manual_payment_method=NULL,updated_at=timezone('utc'::text,now()) WHERE id=target_due.id;
    END IF;
    UPDATE public.profiles SET cuota_status='pendiente' WHERE household_id=p_household_id;
    RETURN new_transaction_id;
  END IF;
  IF target_due.status='paid' AND target_due.payment_source='manual' THEN RETURN target_due.transaction_id; END IF;
  method_label:=CASE p_method WHEN 'cash' THEN 'Efectivo' WHEN 'transfer' THEN 'Transferencia' ELSE 'Otro medio manual' END;
  INSERT INTO public.transactions(junta_id,type,description,amount,date,created_by) VALUES(p_junta_id,'ingreso','Cuota domicilio '||to_char(current_period,'MM/YYYY')||' — '||dwelling.address||' — '||method_label,coalesce(target_due.amount,due_amount),current_date,actor_id) RETURNING id INTO new_transaction_id;
  INSERT INTO public.member_dues(junta_id,household_id,profile_id,period,amount,status,payment_source,manual_payment_method,paid_at,transaction_id)
  VALUES(p_junta_id,p_household_id,actor_id,current_period,due_amount,'paid','manual',p_method,timezone('utc'::text,now()),new_transaction_id)
  ON CONFLICT (household_id,period) WHERE household_id IS NOT NULL DO UPDATE SET status='paid',payment_source='manual',manual_payment_method=excluded.manual_payment_method,paid_at=excluded.paid_at,transaction_id=excluded.transaction_id,refund_transaction_id=NULL,updated_at=timezone('utc'::text,now());
  UPDATE public.profiles SET cuota_status='al_dia' WHERE household_id=p_household_id;
  INSERT INTO public.notifications(user_id,type,title,message,read,date,action)
  SELECT id,'cuota','Cuota del domicilio registrada','La directiva registró como pagada la cuota de '||dwelling.address||' mediante '||method_label||'.',false,timezone('utc'::text,now()),'/tesoreria' FROM public.profiles WHERE household_id=p_household_id;
  RETURN new_transaction_id;
END; $$;
REVOKE ALL ON FUNCTION public.set_manual_household_due(UUID,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_manual_household_due(UUID,UUID,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.record_refunded_member_due(p_due_id UUID, p_payment_id TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_due public.member_dues%ROWTYPE; dwelling public.households%ROWTYPE; actor_id UUID; new_transaction_id BIGINT;
BEGIN
  SELECT * INTO target_due FROM public.member_dues WHERE id=p_due_id FOR UPDATE;
  IF target_due.id IS NULL OR target_due.household_id IS NULL OR target_due.mercadopago_payment_id<>p_payment_id THEN RAISE EXCEPTION 'Pago de cuota por domicilio no encontrado'; END IF;
  IF target_due.status='refunded' THEN RETURN target_due.refund_transaction_id; END IF;
  IF target_due.status<>'paid' THEN RAISE EXCEPTION 'La cuota no se encuentra pagada'; END IF;
  SELECT * INTO dwelling FROM public.households WHERE id=target_due.household_id;
  SELECT id INTO actor_id FROM public.profiles WHERE household_id=target_due.household_id ORDER BY (id=target_due.profile_id) DESC,created_at LIMIT 1;
  INSERT INTO public.transactions(junta_id,type,description,amount,date,created_by)
  VALUES(target_due.junta_id,'egreso','Reembolso cuota domicilio '||to_char(target_due.period,'MM/YYYY')||' — '||dwelling.address,target_due.amount,current_date,actor_id)
  RETURNING id INTO new_transaction_id;
  UPDATE public.member_dues SET status='refunded',refund_transaction_id=new_transaction_id,updated_at=timezone('utc'::text,now()) WHERE id=target_due.id;
  UPDATE public.profiles SET cuota_status='pendiente' WHERE household_id=target_due.household_id;
  INSERT INTO public.notifications(user_id,type,title,message,read,date,action)
  SELECT id,'cuota','Cuota reembolsada','Mercado Pago informó el reembolso de la cuota de '||dwelling.address||'.',false,timezone('utc'::text,now()),'/tesoreria' FROM public.profiles WHERE household_id=target_due.household_id;
  RETURN new_transaction_id;
END; $$;

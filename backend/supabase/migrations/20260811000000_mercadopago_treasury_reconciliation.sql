-- Mercado Pago-backed treasury reconciliation.
-- Keeps the legacy cash book compatible while making provider movements traceable,
-- immutable to authenticated clients and safe to import repeatedly.

ALTER TABLE public.transactions
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'mercadopago', 'bank_import')),
  ADD COLUMN accounting_kind TEXT
    CHECK (accounting_kind IN ('income', 'expense', 'transfer', 'adjustment')),
  ADD COLUMN account_code TEXT,
  ADD COLUMN destination_account_code TEXT,
  ADD COLUMN category TEXT,
  ADD COLUMN gross_amount NUMERIC(12,2),
  ADD COLUMN fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  ADD COLUMN net_amount NUMERIC(12,2),
  ADD COLUMN provider TEXT,
  ADD COLUMN provider_transaction_id TEXT,
  ADD COLUMN provider_event_key TEXT,
  ADD COLUMN external_reference TEXT,
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'manual'
    CHECK (verification_status IN ('manual', 'provider_confirmed', 'reconciled')),
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN is_immutable BOOLEAN NOT NULL DEFAULT false;

UPDATE public.transactions
SET accounting_kind = CASE type WHEN 'ingreso' THEN 'income' ELSE 'expense' END,
    account_code = 'cash',
    gross_amount = amount,
    net_amount = CASE type WHEN 'ingreso' THEN amount ELSE -amount END
WHERE accounting_kind IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN accounting_kind SET NOT NULL,
  ALTER COLUMN account_code SET NOT NULL,
  ALTER COLUMN gross_amount SET NOT NULL,
  ALTER COLUMN net_amount SET NOT NULL;

CREATE OR REPLACE FUNCTION public.prepare_manual_treasury_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.source = 'manual' THEN
    NEW.accounting_kind := CASE NEW.type WHEN 'ingreso' THEN 'income' ELSE 'expense' END;
    NEW.account_code := coalesce(NEW.account_code, 'cash');
    NEW.gross_amount := NEW.amount;
    NEW.fee_amount := 0;
    NEW.net_amount := CASE NEW.type WHEN 'ingreso' THEN NEW.amount ELSE -NEW.amount END;
    NEW.verification_status := 'manual';
    NEW.is_immutable := false;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER prepare_manual_treasury_transaction_trigger
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.prepare_manual_treasury_transaction();

CREATE UNIQUE INDEX transactions_provider_event_key_unique
  ON public.transactions(junta_id, provider_event_key)
  WHERE provider_event_key IS NOT NULL;
CREATE INDEX idx_transactions_junta_source_date
  ON public.transactions(junta_id, source, date DESC);
CREATE INDEX idx_transactions_provider_transaction
  ON public.transactions(junta_id, provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- Authenticated neighbors can only read the public audit projection. Raw provider
-- references and event keys remain server-only; full payloads live in payment_events.
REVOKE SELECT ON public.transactions FROM authenticated;
GRANT SELECT (
  id, junta_id, type, description, amount, date, created_by, created_at,
  source, accounting_kind, account_code, destination_account_code, category,
  gross_amount, fee_amount, net_amount, verification_status, verified_at, is_immutable
) ON public.transactions TO authenticated;

-- Historical Mercado Pago dues were already verified through the Payments API,
-- but their fee/net reconciliation will only become final after importing a report.
UPDATE public.transactions transaction
SET source = 'mercadopago',
    accounting_kind = 'income',
    account_code = 'mercadopago',
    category = 'cuota_social',
    provider = 'mercadopago',
    provider_transaction_id = due.mercadopago_payment_id,
    external_reference = 'juntapp-due:' || due.id || ':' || due.junta_id || ':' || due.household_id,
    verification_status = 'provider_confirmed',
    verified_at = coalesce(due.paid_at, transaction.created_at),
    is_immutable = true
FROM public.member_dues due
WHERE due.transaction_id = transaction.id
  AND due.mercadopago_payment_id IS NOT NULL;

UPDATE public.transactions transaction
SET source = 'mercadopago',
    accounting_kind = 'expense',
    account_code = 'mercadopago',
    category = 'reembolso_cuota',
    provider = 'mercadopago',
    provider_transaction_id = due.mercadopago_payment_id,
    verification_status = 'provider_confirmed',
    verified_at = transaction.created_at,
    is_immutable = true
FROM public.member_dues due
WHERE due.refund_transaction_id = transaction.id
  AND due.mercadopago_payment_id IS NOT NULL;

-- Provider movements can only be modified by trusted server code. Manual rows may
-- still receive descriptive corrections, but deletion is replaced by visible reversals.
DROP POLICY IF EXISTS "Dirigentes can update transactions in their junta" ON public.transactions;
DROP POLICY IF EXISTS "Dirigentes can delete transactions in their junta" ON public.transactions;
DROP POLICY IF EXISTS "Dirigentes can insert transactions in their junta" ON public.transactions;

CREATE POLICY "Dirigentes can insert manual transactions in their junta"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (
  junta_id = public.current_junta_id()
  AND public.current_user_role() = 'dirigente'
  AND source = 'manual'
  AND verification_status = 'manual'
  AND is_immutable = false
);

CREATE POLICY "Dirigentes can update manual transactions in their junta"
ON public.transactions FOR UPDATE TO authenticated
USING (
  junta_id = public.current_junta_id()
  AND public.current_user_role() = 'dirigente'
  AND source = 'manual'
  AND is_immutable = false
)
WITH CHECK (
  junta_id = public.current_junta_id()
  AND public.current_user_role() = 'dirigente'
  AND source = 'manual'
  AND verification_status = 'manual'
  AND is_immutable = false
);

CREATE TABLE public.treasury_sync_runs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago')),
  provider_task_id TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  imported_count INTEGER NOT NULL DEFAULT 0,
  file_name TEXT,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  UNIQUE (junta_id, provider_task_id)
);
ALTER TABLE public.treasury_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_treasury_sync_runs_junta_status
  ON public.treasury_sync_runs(junta_id, status, requested_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.treasury_sync_runs TO service_role;

-- New Mercado Pago dues start as provider-confirmed and become reconciled when the
-- account report supplies the actual fee and net amount. Shared descriptions omit
-- names and addresses; the household retains its private detail in member_dues.
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
  INSERT INTO public.transactions(
    junta_id,type,description,amount,date,created_by,source,accounting_kind,account_code,
    category,gross_amount,fee_amount,net_amount,provider,provider_transaction_id,
    external_reference,verification_status,verified_at,is_immutable
  ) VALUES(
    target_due.junta_id,'ingreso','Cuota domiciliaria '||to_char(target_due.period,'MM/YYYY')||' verificada por Mercado Pago',
    target_due.amount,coalesce(p_paid_at::date,current_date),payer_id,'mercadopago','income','mercadopago',
    'cuota_social',target_due.amount,0,target_due.amount,'mercadopago',p_payment_id,
    'juntapp-due:'||target_due.id||':'||target_due.junta_id||':'||target_due.household_id,
    'provider_confirmed',coalesce(p_paid_at,timezone('utc'::text,now())),true
  ) RETURNING id INTO new_transaction_id;
  UPDATE public.member_dues SET status='paid',payment_source='mercadopago',manual_payment_method=NULL,mercadopago_payment_id=p_payment_id,paid_at=p_paid_at,transaction_id=new_transaction_id,updated_at=timezone('utc'::text,now()) WHERE id=target_due.id;
  UPDATE public.profiles SET cuota_status='al_dia' WHERE household_id=dwelling.id AND junta_id=target_due.junta_id;
  INSERT INTO public.notifications(user_id,type,title,message,read,date,action)
  SELECT id,'cuota','Cuota del domicilio recibida','Mercado Pago confirmo la cuota del domicilio por $'||target_due.amount||'.',false,timezone('utc'::text,now()),'/tesoreria'
  FROM public.profiles WHERE household_id=dwelling.id;
  RETURN new_transaction_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_refunded_member_due(p_due_id UUID, p_payment_id TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_due public.member_dues%ROWTYPE; actor_id UUID; new_transaction_id BIGINT;
BEGIN
  SELECT * INTO target_due FROM public.member_dues WHERE id=p_due_id FOR UPDATE;
  IF target_due.id IS NULL OR target_due.household_id IS NULL OR target_due.mercadopago_payment_id<>p_payment_id THEN RAISE EXCEPTION 'Pago de cuota por domicilio no encontrado'; END IF;
  IF target_due.status='refunded' THEN RETURN target_due.refund_transaction_id; END IF;
  IF target_due.status<>'paid' THEN RAISE EXCEPTION 'La cuota no se encuentra pagada'; END IF;
  SELECT id INTO actor_id FROM public.profiles WHERE household_id=target_due.household_id ORDER BY (id=target_due.profile_id) DESC,created_at LIMIT 1;
  INSERT INTO public.transactions(
    junta_id,type,description,amount,date,created_by,source,accounting_kind,account_code,
    category,gross_amount,fee_amount,net_amount,provider,provider_transaction_id,
    verification_status,verified_at,is_immutable
  ) VALUES(
    target_due.junta_id,'egreso','Reembolso de cuota verificado por Mercado Pago',target_due.amount,current_date,actor_id,
    'mercadopago','expense','mercadopago','reembolso_cuota',target_due.amount,0,-target_due.amount,
    'mercadopago',p_payment_id,'provider_confirmed',timezone('utc'::text,now()),true
  ) RETURNING id INTO new_transaction_id;
  UPDATE public.member_dues SET status='refunded',refund_transaction_id=new_transaction_id,updated_at=timezone('utc'::text,now()) WHERE id=target_due.id;
  UPDATE public.profiles SET cuota_status='pendiente' WHERE household_id=target_due.household_id;
  INSERT INTO public.notifications(user_id,type,title,message,read,date,action)
  SELECT id,'cuota','Cuota reembolsada','Mercado Pago informo el reembolso de la cuota del domicilio.',false,timezone('utc'::text,now()),'/tesoreria' FROM public.profiles WHERE household_id=target_due.household_id;
  RETURN new_transaction_id;
END; $$;

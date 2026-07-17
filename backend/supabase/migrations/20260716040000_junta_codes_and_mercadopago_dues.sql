-- Self-service member registration and per-junta Mercado Pago accounts for dues.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.juntas
    ADD COLUMN monthly_due_amount INTEGER NOT NULL DEFAULT 5000
        CHECK (monthly_due_amount BETWEEN 500 AND 1000000);

CREATE TABLE public.mercadopago_junta_accounts (
    junta_id UUID PRIMARY KEY REFERENCES public.juntas(id) ON DELETE CASCADE,
    mercadopago_user_id BIGINT UNIQUE NOT NULL,
    access_token_encrypted BYTEA NOT NULL,
    refresh_token_encrypted BYTEA,
    public_key TEXT,
    expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mercadopago_junta_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mercadopago_junta_accounts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mercadopago_junta_accounts TO service_role;

CREATE TABLE public.member_dues (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period DATE NOT NULL CHECK (extract(day FROM period) = 1),
    amount INTEGER NOT NULL CHECK (amount BETWEEN 500 AND 1000000),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'preference_created', 'paid', 'rejected', 'refunded')),
    mercadopago_preference_id TEXT,
    mercadopago_payment_id TEXT UNIQUE,
    checkout_url TEXT,
    paid_at TIMESTAMPTZ,
    transaction_id BIGINT UNIQUE REFERENCES public.transactions(id) ON DELETE SET NULL,
    refund_transaction_id BIGINT UNIQUE REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (profile_id, period)
);

CREATE INDEX idx_member_dues_junta_period ON public.member_dues(junta_id, period);
CREATE INDEX idx_member_dues_profile_period ON public.member_dues(profile_id, period);
ALTER TABLE public.member_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their dues and dirigentes can read junta dues"
ON public.member_dues FOR SELECT TO authenticated
USING (
    profile_id = auth.uid()
    OR (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
);

GRANT SELECT ON public.member_dues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_dues TO service_role;

CREATE OR REPLACE FUNCTION public.store_mercadopago_junta_account(
    p_junta_id UUID,
    p_mercadopago_user_id BIGINT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_public_key TEXT,
    p_expires_at TIMESTAMPTZ,
    p_encryption_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.mercadopago_junta_accounts (
        junta_id, mercadopago_user_id, access_token_encrypted,
        refresh_token_encrypted, public_key, expires_at
    ) VALUES (
        p_junta_id,
        p_mercadopago_user_id,
        extensions.pgp_sym_encrypt(p_access_token, p_encryption_key, 'cipher-algo=aes256'),
        CASE WHEN p_refresh_token IS NULL THEN NULL
            ELSE extensions.pgp_sym_encrypt(p_refresh_token, p_encryption_key, 'cipher-algo=aes256') END,
        p_public_key,
        p_expires_at
    )
    ON CONFLICT (junta_id) DO UPDATE SET
        mercadopago_user_id = excluded.mercadopago_user_id,
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = coalesce(excluded.refresh_token_encrypted, public.mercadopago_junta_accounts.refresh_token_encrypted),
        public_key = coalesce(excluded.public_key, public.mercadopago_junta_accounts.public_key),
        expires_at = excluded.expires_at,
        updated_at = timezone('utc'::text, now());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mercadopago_junta_account(
    p_junta_id UUID,
    p_encryption_key TEXT
)
RETURNS TABLE (
    junta_id UUID,
    mercadopago_user_id BIGINT,
    access_token TEXT,
    refresh_token TEXT,
    public_key TEXT,
    expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        account.junta_id,
        account.mercadopago_user_id,
        extensions.pgp_sym_decrypt(account.access_token_encrypted, p_encryption_key),
        CASE WHEN account.refresh_token_encrypted IS NULL THEN NULL
            ELSE extensions.pgp_sym_decrypt(account.refresh_token_encrypted, p_encryption_key) END,
        account.public_key,
        account.expires_at
    FROM public.mercadopago_junta_accounts account
    WHERE account.junta_id = p_junta_id;
$$;

CREATE OR REPLACE FUNCTION public.record_approved_member_due(
    p_due_id UUID,
    p_payment_id TEXT,
    p_paid_at TIMESTAMPTZ
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_due public.member_dues%ROWTYPE;
    member_name TEXT;
    new_transaction_id BIGINT;
BEGIN
    SELECT * INTO target_due
    FROM public.member_dues
    WHERE id = p_due_id
    FOR UPDATE;

    IF target_due.id IS NULL THEN
        RAISE EXCEPTION 'Cuota no encontrada';
    END IF;
    IF target_due.status = 'paid' THEN
        IF target_due.mercadopago_payment_id <> p_payment_id THEN
            RAISE EXCEPTION 'La cuota ya fue pagada con otra transaccion';
        END IF;
        RETURN target_due.transaction_id;
    END IF;

    SELECT name INTO member_name FROM public.profiles WHERE id = target_due.profile_id;
    INSERT INTO public.transactions (
        junta_id, type, description, amount, date, created_by
    ) VALUES (
        target_due.junta_id,
        'ingreso',
        'Cuota vecinal ' || to_char(target_due.period, 'MM/YYYY') || ' — ' || member_name || ' — Mercado Pago',
        target_due.amount,
        coalesce(p_paid_at::date, current_date),
        target_due.profile_id
    ) RETURNING id INTO new_transaction_id;

    UPDATE public.member_dues SET
        status = 'paid',
        mercadopago_payment_id = p_payment_id,
        paid_at = p_paid_at,
        transaction_id = new_transaction_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_due.id;

    UPDATE public.profiles
    SET cuota_status = 'al_dia'
    WHERE id = target_due.profile_id AND junta_id = target_due.junta_id;

    INSERT INTO public.notifications (
        user_id, type, title, message, read, date, action
    ) VALUES (
        target_due.profile_id,
        'cuota',
        'Cuota recibida con éxito',
        'Mercado Pago confirmó tu cuota vecinal de $' || target_due.amount || '.',
        false,
        timezone('utc'::text, now()),
        '/tesoreria'
    );

    RETURN new_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_refunded_member_due(
    p_due_id UUID,
    p_payment_id TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_due public.member_dues%ROWTYPE;
    member_name TEXT;
    new_transaction_id BIGINT;
BEGIN
    SELECT * INTO target_due
    FROM public.member_dues
    WHERE id = p_due_id
    FOR UPDATE;

    IF target_due.id IS NULL OR target_due.mercadopago_payment_id <> p_payment_id THEN
        RAISE EXCEPTION 'Pago de cuota no encontrado';
    END IF;
    IF target_due.status = 'refunded' THEN
        RETURN target_due.refund_transaction_id;
    END IF;

    SELECT name INTO member_name FROM public.profiles WHERE id = target_due.profile_id;
    INSERT INTO public.transactions (
        junta_id, type, description, amount, date, created_by
    ) VALUES (
        target_due.junta_id,
        'egreso',
        'Reembolso cuota vecinal ' || to_char(target_due.period, 'MM/YYYY') || ' — ' || member_name || ' — Mercado Pago',
        target_due.amount,
        current_date,
        target_due.profile_id
    ) RETURNING id INTO new_transaction_id;

    UPDATE public.member_dues SET
        status = 'refunded',
        refund_transaction_id = new_transaction_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_due.id;

    IF target_due.period = date_trunc('month', current_date)::date THEN
        UPDATE public.profiles SET cuota_status = 'pendiente' WHERE id = target_due.profile_id;
    END IF;

    INSERT INTO public.notifications (
        user_id, type, title, message, read, date, action
    ) VALUES (
        target_due.profile_id,
        'cuota',
        'Cuota reembolsada',
        'Mercado Pago informó el reembolso de tu cuota vecinal.',
        false,
        timezone('utc'::text, now()),
        '/tesoreria'
    );

    RETURN new_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.store_mercadopago_junta_account(UUID, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_mercadopago_junta_account(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_approved_member_due(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_refunded_member_due(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_mercadopago_junta_account(UUID, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_mercadopago_junta_account(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_approved_member_due(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_refunded_member_due(UUID, TEXT) TO service_role;

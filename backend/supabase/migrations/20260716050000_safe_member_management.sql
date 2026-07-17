-- Safe member removal support and auditable manual due payments.

ALTER TABLE public.member_dues
    ADD COLUMN payment_source TEXT CHECK (payment_source IN ('mercadopago', 'manual')),
    ADD COLUMN manual_payment_method TEXT CHECK (manual_payment_method IN ('cash', 'transfer', 'other'));

UPDATE public.member_dues
SET payment_source = 'mercadopago'
WHERE mercadopago_payment_id IS NOT NULL;

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
        payment_source = 'mercadopago',
        manual_payment_method = NULL,
        mercadopago_payment_id = p_payment_id,
        paid_at = p_paid_at,
        transaction_id = new_transaction_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_due.id;

    UPDATE public.profiles SET cuota_status = 'al_dia'
    WHERE id = target_due.profile_id AND junta_id = target_due.junta_id;

    INSERT INTO public.notifications (user_id, type, title, message, read, date, action)
    VALUES (
        target_due.profile_id, 'cuota', 'Cuota recibida con éxito',
        'Mercado Pago confirmó tu cuota vecinal de $' || target_due.amount || '.',
        false, timezone('utc'::text, now()), '/tesoreria'
    );

    RETURN new_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_manual_member_due(
    p_profile_id UUID,
    p_junta_id UUID,
    p_action TEXT,
    p_method TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_due public.member_dues%ROWTYPE;
    member_name TEXT;
    due_amount INTEGER;
    current_period DATE := date_trunc('month', current_date)::date;
    method_label TEXT;
    new_transaction_id BIGINT;
BEGIN
    IF p_action NOT IN ('paid', 'pending') THEN
        RAISE EXCEPTION 'Accion de cuota invalida';
    END IF;
    IF p_action = 'paid' AND p_method NOT IN ('cash', 'transfer', 'other') THEN
        RAISE EXCEPTION 'Metodo de pago manual invalido';
    END IF;

    SELECT profile.name, junta.monthly_due_amount
    INTO member_name, due_amount
    FROM public.profiles profile
    JOIN public.juntas junta ON junta.id = profile.junta_id
    WHERE profile.id = p_profile_id AND profile.junta_id = p_junta_id;
    IF member_name IS NULL THEN RAISE EXCEPTION 'Vecino no encontrado'; END IF;

    SELECT * INTO target_due
    FROM public.member_dues
    WHERE profile_id = p_profile_id AND period = current_period
    FOR UPDATE;

    IF target_due.status = 'paid' AND target_due.mercadopago_payment_id IS NOT NULL THEN
        RAISE EXCEPTION 'La cuota fue confirmada por Mercado Pago y no puede modificarse manualmente';
    END IF;

    IF p_action = 'pending' THEN
        IF target_due.status = 'paid' AND target_due.payment_source = 'manual' THEN
            INSERT INTO public.transactions (junta_id, type, description, amount, date, created_by)
            VALUES (
                p_junta_id, 'egreso',
                'Anulación cuota manual ' || to_char(current_period, 'MM/YYYY') || ' — ' || member_name,
                target_due.amount, current_date, p_profile_id
            ) RETURNING id INTO new_transaction_id;
            UPDATE public.member_dues SET
                status = 'pending',
                refund_transaction_id = new_transaction_id,
                paid_at = NULL,
                updated_at = timezone('utc'::text, now())
            WHERE id = target_due.id;
        END IF;
        UPDATE public.profiles SET cuota_status = 'pendiente' WHERE id = p_profile_id;
        RETURN new_transaction_id;
    END IF;

    IF target_due.status = 'paid' AND target_due.payment_source = 'manual' THEN
        RETURN target_due.transaction_id;
    END IF;

    method_label := CASE p_method
        WHEN 'cash' THEN 'Efectivo'
        WHEN 'transfer' THEN 'Transferencia'
        ELSE 'Otro medio manual'
    END;
    INSERT INTO public.transactions (junta_id, type, description, amount, date, created_by)
    VALUES (
        p_junta_id, 'ingreso',
        'Cuota vecinal ' || to_char(current_period, 'MM/YYYY') || ' — ' || member_name || ' — ' || method_label,
        coalesce(target_due.amount, due_amount), current_date, p_profile_id
    ) RETURNING id INTO new_transaction_id;

    INSERT INTO public.member_dues (
        junta_id, profile_id, period, amount, status, payment_source,
        manual_payment_method, paid_at, transaction_id
    ) VALUES (
        p_junta_id, p_profile_id, current_period, due_amount, 'paid', 'manual',
        p_method, timezone('utc'::text, now()), new_transaction_id
    )
    ON CONFLICT (profile_id, period) DO UPDATE SET
        status = 'paid',
        payment_source = 'manual',
        manual_payment_method = excluded.manual_payment_method,
        paid_at = excluded.paid_at,
        transaction_id = excluded.transaction_id,
        refund_transaction_id = NULL,
        updated_at = timezone('utc'::text, now());

    UPDATE public.profiles SET cuota_status = 'al_dia' WHERE id = p_profile_id;
    INSERT INTO public.notifications (user_id, type, title, message, read, date, action)
    VALUES (
        p_profile_id, 'cuota', 'Cuota registrada por la directiva',
        'La directiva registró tu cuota mensual como pagada mediante ' || method_label || '.',
        false, timezone('utc'::text, now()), '/tesoreria'
    );
    RETURN new_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_manual_member_due(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_manual_member_due(UUID, UUID, TEXT, TEXT) TO service_role;

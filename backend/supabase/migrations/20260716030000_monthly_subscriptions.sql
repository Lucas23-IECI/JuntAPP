-- Replace the one-time activation payment with a recurring monthly subscription.

ALTER TABLE public.juntas
    DROP CONSTRAINT IF EXISTS juntas_subscription_status_check,
    DROP CONSTRAINT IF EXISTS juntas_registration_price_check;

UPDATE public.juntas
SET subscription_status = CASE subscription_status
    WHEN 'active' THEN 'authorized'
    WHEN 'payment_review' THEN 'past_due'
    ELSE subscription_status
END;

ALTER TABLE public.juntas
    RENAME COLUMN registration_price TO subscription_price;

ALTER TABLE public.juntas
    ADD CONSTRAINT juntas_subscription_status_check CHECK (
        subscription_status IN ('pending', 'authorized', 'paused', 'cancelled', 'past_due')
    ),
    ADD CONSTRAINT juntas_subscription_price_check CHECK (subscription_price = 15000),
    ADD COLUMN mercadopago_subscription_id TEXT UNIQUE,
    ADD COLUMN subscription_next_payment_date TIMESTAMPTZ,
    ADD COLUMN subscription_last_payment_status TEXT,
    ADD COLUMN subscription_last_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.juntas.subscription_price IS
    'Monthly JuntAPP subscription price in CLP, VAT included.';

-- Existing associations remain authorized. A newly created association remains
-- pending until its Mercado Pago preapproval is verified by the server.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_junta_id UUID;
    target_role TEXT := 'vecino';
    target_position TEXT := NULL;
    target_cuota TEXT := 'pendiente';
    junta_action TEXT := coalesce(NEW.raw_user_meta_data->>'junta_action', 'join');
    requested_code TEXT := upper(trim(NEW.raw_user_meta_data->>'invite_code'));
    requested_phone TEXT := trim(NEW.raw_user_meta_data->>'phone');
    requested_region TEXT := trim(NEW.raw_user_meta_data->>'junta_region');
    requested_comuna TEXT := trim(NEW.raw_user_meta_data->>'junta_comuna');
    new_invite_code TEXT;
    new_slug TEXT;
BEGIN
    IF char_length(regexp_replace(coalesce(requested_phone, ''), '[^0-9]', '', 'g')) < 9 THEN
        RAISE EXCEPTION 'El numero de celular es obligatorio';
    END IF;

    IF junta_action = 'create' THEN
        IF char_length(trim(NEW.raw_user_meta_data->>'junta_name')) < 3 THEN
            RAISE EXCEPTION 'El nombre de la junta es obligatorio';
        END IF;
        IF requested_region = '' OR requested_comuna = '' THEN
            RAISE EXCEPTION 'La region y comuna son obligatorias';
        END IF;

        LOOP
            new_invite_code := upper(substr(replace(extensions.uuid_generate_v4()::text, '-', ''), 1, 6));
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM public.juntas WHERE invite_code = new_invite_code
            );
        END LOOP;

        new_slug := trim(both '-' from regexp_replace(
            lower(translate(NEW.raw_user_meta_data->>'junta_name',
                'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
            '[^a-z0-9]+', '-', 'g'
        )) || '-' || substr(replace(extensions.uuid_generate_v4()::text, '-', ''), 1, 8);

        INSERT INTO public.juntas (
            name, slug, comuna, region, invite_code, owner_id,
            subscription_status, subscription_price
        ) VALUES (
            trim(NEW.raw_user_meta_data->>'junta_name'),
            new_slug,
            requested_comuna,
            requested_region,
            new_invite_code,
            NEW.id,
            'pending',
            15000
        )
        RETURNING id INTO target_junta_id;

        target_role := 'dirigente';
        target_position := 'presidente';
        target_cuota := 'al_dia';
    ELSE
        SELECT id INTO target_junta_id
        FROM public.juntas
        WHERE invite_code = requested_code
          AND subscription_status = 'authorized';

        IF target_junta_id IS NULL THEN
            RAISE EXCEPTION 'Codigo de invitacion invalido o junta sin suscripcion activa';
        END IF;
    END IF;

    INSERT INTO public.profiles (
        id, junta_id, name, rut, address, phone, email, role,
        board_position, cuota_status
    ) VALUES (
        NEW.id,
        target_junta_id,
        trim(NEW.raw_user_meta_data->>'name'),
        upper(NEW.raw_user_meta_data->>'rut'),
        trim(NEW.raw_user_meta_data->>'address'),
        requested_phone,
        NEW.email,
        target_role,
        target_position,
        target_cuota
    );

    RETURN NEW;
END;
$$;

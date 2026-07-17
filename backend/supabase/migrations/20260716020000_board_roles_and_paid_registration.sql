-- Board positions and paid association activation.

ALTER TABLE public.profiles
    ADD COLUMN board_position TEXT;

UPDATE public.profiles
SET board_position = CASE WHEN role = 'dirigente' THEN 'dirigente' ELSE NULL END;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_board_position_check CHECK (
        (role = 'vecino' AND board_position IS NULL)
        OR
        (role = 'dirigente' AND board_position IN ('presidente', 'secretario', 'tesorero', 'dirigente'))
    );

CREATE UNIQUE INDEX one_president_per_junta
    ON public.profiles (junta_id) WHERE board_position = 'presidente';
CREATE UNIQUE INDEX one_secretary_per_junta
    ON public.profiles (junta_id) WHERE board_position = 'secretario';
CREATE UNIQUE INDEX one_treasurer_per_junta
    ON public.profiles (junta_id) WHERE board_position = 'tesorero';

ALTER TABLE public.juntas
    ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active'
        CHECK (subscription_status IN ('pending', 'active', 'payment_review')),
    ADD COLUMN registration_price INTEGER NOT NULL DEFAULT 15000
        CHECK (registration_price = 15000),
    ADD COLUMN mercadopago_preference_id TEXT,
    ADD COLUMN mercadopago_payment_id TEXT UNIQUE,
    ADD COLUMN activated_at TIMESTAMPTZ;

UPDATE public.juntas
SET activated_at = coalesce(activated_at, created_at)
WHERE subscription_status = 'active';

-- Existing associations remain active. New associations are always pending
-- until the server verifies an approved Mercado Pago payment.
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
            subscription_status, registration_price
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
          AND subscription_status = 'active';

        IF target_junta_id IS NULL THEN
            RAISE EXCEPTION 'Codigo de invitacion invalido o junta pendiente de activacion';
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

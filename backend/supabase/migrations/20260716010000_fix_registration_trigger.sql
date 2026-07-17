-- Fix cloud signup: Supabase installs uuid-ossp in the extensions schema.
-- The registration trigger runs with an empty search_path, so UUID calls must
-- be explicitly schema-qualified.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_junta_id UUID;
    target_role TEXT := 'vecino';
    target_cuota TEXT := 'pendiente';
    junta_action TEXT := coalesce(NEW.raw_user_meta_data->>'junta_action', 'join');
    requested_code TEXT := upper(trim(NEW.raw_user_meta_data->>'invite_code'));
    new_invite_code TEXT;
    new_slug TEXT;
BEGIN
    IF junta_action = 'create' THEN
        IF char_length(trim(NEW.raw_user_meta_data->>'junta_name')) < 3 THEN
            RAISE EXCEPTION 'El nombre de la junta es obligatorio';
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

        INSERT INTO public.juntas (name, slug, comuna, invite_code)
        VALUES (
            trim(NEW.raw_user_meta_data->>'junta_name'),
            new_slug,
            nullif(trim(NEW.raw_user_meta_data->>'junta_comuna'), ''),
            new_invite_code
        )
        RETURNING id INTO target_junta_id;

        target_role := 'dirigente';
        target_cuota := 'al_dia';
    ELSE
        SELECT id INTO target_junta_id
        FROM public.juntas
        WHERE invite_code = requested_code;

        IF target_junta_id IS NULL THEN
            RAISE EXCEPTION 'Código de invitación inválido';
        END IF;
    END IF;

    INSERT INTO public.profiles (
        id, junta_id, name, rut, address, phone, email, role, cuota_status
    ) VALUES (
        NEW.id,
        target_junta_id,
        trim(NEW.raw_user_meta_data->>'name'),
        upper(NEW.raw_user_meta_data->>'rut'),
        trim(NEW.raw_user_meta_data->>'address'),
        nullif(trim(NEW.raw_user_meta_data->>'phone'), ''),
        NEW.email,
        target_role,
        target_cuota
    );

    RETURN NEW;
END;
$$;

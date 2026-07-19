DO $$
DECLARE demo_id UUID;
BEGIN
  SELECT id INTO demo_id FROM public.profiles WHERE email = 'admin@juntapp.cl' LIMIT 1;
  IF demo_id IS NULL THEN RAISE EXCEPTION 'Demo profile not found'; END IF;
  UPDATE auth.users SET
    email = 'admin@juntapp.cl',
    encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  WHERE id = demo_id;
  UPDATE auth.identities SET
    identity_data = jsonb_set(jsonb_set(identity_data, '{email}', '"admin@juntapp.cl"'), '{email_verified}', 'true'),
    updated_at = timezone('utc', now())
  WHERE user_id = demo_id AND provider = 'email';
END $$;

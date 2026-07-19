-- Keep the documented demonstration account reproducible across environments.
UPDATE auth.users
SET encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
WHERE email = 'admin@juntapp.cl';

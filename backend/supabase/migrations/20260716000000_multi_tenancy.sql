-- JuntAPP multi-tenancy migration
-- Isolates every neighborhood association and keeps legacy single-tenant data usable.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations must exist before any policy references profiles.junta_id.
CREATE TABLE public.juntas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 3),
    slug TEXT UNIQUE NOT NULL,
    address TEXT,
    comuna TEXT,
    region TEXT NOT NULL DEFAULT 'Valparaíso',
    invite_code TEXT UNIQUE NOT NULL CHECK (char_length(invite_code) = 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles
    ADD COLUMN junta_id UUID REFERENCES public.juntas(id) ON DELETE SET NULL;
ALTER TABLE public.transactions
    ADD COLUMN junta_id UUID REFERENCES public.juntas(id) ON DELETE CASCADE;
ALTER TABLE public.polls
    ADD COLUMN junta_id UUID REFERENCES public.juntas(id) ON DELETE CASCADE;
ALTER TABLE public.announcements
    ADD COLUMN junta_id UUID REFERENCES public.juntas(id) ON DELETE CASCADE;

-- Existing installations were single-tenant. Move their data into one organization.
DO $$
DECLARE
    legacy_junta_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE junta_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.transactions WHERE junta_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.polls WHERE junta_id IS NULL)
       OR EXISTS (SELECT 1 FROM public.announcements WHERE junta_id IS NULL) THEN
        INSERT INTO public.juntas (name, slug, comuna, invite_code)
        VALUES ('Junta de Vecinos', 'junta-migrada', NULL, 'JUNTA1')
        ON CONFLICT (slug) DO UPDATE SET name = excluded.name
        RETURNING id INTO legacy_junta_id;

        UPDATE public.profiles SET junta_id = legacy_junta_id WHERE junta_id IS NULL;
        UPDATE public.transactions SET junta_id = legacy_junta_id WHERE junta_id IS NULL;
        UPDATE public.polls SET junta_id = legacy_junta_id WHERE junta_id IS NULL;
        UPDATE public.announcements SET junta_id = legacy_junta_id WHERE junta_id IS NULL;
    END IF;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN junta_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN junta_id SET NOT NULL;
ALTER TABLE public.polls ALTER COLUMN junta_id SET NOT NULL;
ALTER TABLE public.announcements ALTER COLUMN junta_id SET NOT NULL;

CREATE INDEX idx_profiles_junta_id ON public.profiles(junta_id);
CREATE INDEX idx_transactions_junta_id ON public.transactions(junta_id);
CREATE INDEX idx_polls_junta_id ON public.polls(junta_id);
CREATE INDEX idx_announcements_junta_id ON public.announcements(junta_id);
CREATE INDEX idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- Idempotency ledger for server-side payment webhooks. It is intentionally
-- inaccessible through the public API; only the service role writes it.
CREATE TABLE public.payment_events (
    provider_event_id TEXT PRIMARY KEY,
    junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payment_events_junta_id ON public.payment_events(junta_id);
GRANT SELECT, UPDATE ON public.juntas TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.payment_events TO service_role;

-- Private transparency documents, partitioned by junta UUID in the first path segment.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'transparency_reports',
    'transparency_reports',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- These helpers avoid recursive profile RLS policies.
CREATE OR REPLACE FUNCTION public.current_junta_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT junta_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_junta_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_junta_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

CREATE POLICY "Members can read documents from their junta"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'transparency_reports'
    AND (storage.foldername(name))[1] = public.current_junta_id()::text
);

CREATE POLICY "Dirigentes can upload documents to their junta"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'transparency_reports'
    AND (storage.foldername(name))[1] = public.current_junta_id()::text
    AND public.current_user_role() = 'dirigente'
);

CREATE POLICY "Dirigentes can update documents from their junta"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'transparency_reports'
    AND (storage.foldername(name))[1] = public.current_junta_id()::text
    AND public.current_user_role() = 'dirigente'
)
WITH CHECK (
    bucket_id = 'transparency_reports'
    AND (storage.foldername(name))[1] = public.current_junta_id()::text
    AND public.current_user_role() = 'dirigente'
);

CREATE POLICY "Dirigentes can delete documents from their junta"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'transparency_reports'
    AND (storage.foldername(name))[1] = public.current_junta_id()::text
    AND public.current_user_role() = 'dirigente'
);

ALTER TABLE public.juntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their junta"
ON public.juntas FOR SELECT TO authenticated
USING (id = public.current_junta_id());

CREATE POLICY "Dirigentes can update their junta"
ON public.juntas FOR UPDATE TO authenticated
USING (id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
WITH CHECK (id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

-- Profiles
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are updatable by dirigentes or owner" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by dirigentes or registration" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be deleted by dirigentes" ON public.profiles;

CREATE POLICY "Members can read profiles in their junta"
ON public.profiles FOR SELECT TO authenticated
USING (junta_id = public.current_junta_id());

CREATE POLICY "Members can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    AND junta_id = public.current_junta_id()
    AND role = public.current_user_role()
);

CREATE POLICY "Dirigentes can update profiles in their junta"
ON public.profiles FOR UPDATE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can delete profiles in their junta"
ON public.profiles FOR DELETE TO authenticated
USING (
    id <> auth.uid()
    AND junta_id = public.current_junta_id()
    AND public.current_user_role() = 'dirigente'
);

-- Transactions
DROP POLICY IF EXISTS "Transactions are readable by authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Transactions can be inserted by dirigentes" ON public.transactions;
DROP POLICY IF EXISTS "Transactions can be updated by dirigentes" ON public.transactions;
DROP POLICY IF EXISTS "Transactions can be deleted by dirigentes" ON public.transactions;

CREATE POLICY "Members can read transactions in their junta"
ON public.transactions FOR SELECT TO authenticated
USING (junta_id = public.current_junta_id());

CREATE POLICY "Dirigentes can insert transactions in their junta"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can update transactions in their junta"
ON public.transactions FOR UPDATE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can delete transactions in their junta"
ON public.transactions FOR DELETE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

-- Polls and votes
DROP POLICY IF EXISTS "Polls are readable by authenticated users" ON public.polls;
DROP POLICY IF EXISTS "Polls can be managed by dirigentes" ON public.polls;

CREATE POLICY "Members can read polls in their junta"
ON public.polls FOR SELECT TO authenticated
USING (junta_id = public.current_junta_id());

CREATE POLICY "Dirigentes can insert polls in their junta"
ON public.polls FOR INSERT TO authenticated
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can update polls in their junta"
ON public.polls FOR UPDATE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can delete polls in their junta"
ON public.polls FOR DELETE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

DROP POLICY IF EXISTS "Votes count readable by authenticated users" ON public.votes;
DROP POLICY IF EXISTS "Users can insert their own vote" ON public.votes;

CREATE POLICY "Members can read votes from their junta"
ON public.votes FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.polls
        WHERE polls.id = votes.poll_id
          AND polls.junta_id = public.current_junta_id()
    )
);

CREATE POLICY "Members can vote in active polls from their junta"
ON public.votes FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.polls
        WHERE polls.id = votes.poll_id
          AND polls.junta_id = public.current_junta_id()
          AND polls.active = true
          AND polls.options @> jsonb_build_array(jsonb_build_object('id', votes.option_id))
    )
);

-- Announcements
DROP POLICY IF EXISTS "Announcements are readable by authenticated users" ON public.announcements;
DROP POLICY IF EXISTS "Announcements can be managed by dirigentes" ON public.announcements;

CREATE POLICY "Members can read announcements in their junta"
ON public.announcements FOR SELECT TO authenticated
USING (junta_id = public.current_junta_id());

CREATE POLICY "Dirigentes can insert announcements in their junta"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can update announcements in their junta"
ON public.announcements FOR UPDATE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

CREATE POLICY "Dirigentes can delete announcements in their junta"
ON public.announcements FOR DELETE TO authenticated
USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');

-- Notifications inherit tenant membership from their recipient profile.
DROP POLICY IF EXISTS "Users can view and update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System or Dirigentes can insert notifications" ON public.notifications;

CREATE POLICY "Users can read their notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Dirigentes can notify members of their junta"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() = 'dirigente'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = notifications.user_id
          AND profiles.junta_id = public.current_junta_id()
    )
);

-- Registration is atomic: the trigger validates an invite or creates the junta.
-- This avoids exposing invite codes or allowing unauthenticated organization writes.
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
            new_invite_code := upper(substr(replace(public.uuid_generate_v4()::text, '-', ''), 1, 6));
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM public.juntas WHERE invite_code = new_invite_code
            );
        END LOOP;

        new_slug := trim(both '-' from regexp_replace(
            lower(translate(NEW.raw_user_meta_data->>'junta_name',
                'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
            '[^a-z0-9]+', '-', 'g'
        )) || '-' || substr(replace(public.uuid_generate_v4()::text, '-', ''), 1, 8);

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

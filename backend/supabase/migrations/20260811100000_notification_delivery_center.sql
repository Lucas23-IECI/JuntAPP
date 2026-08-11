-- Reliable, observable Web Push delivery and PWA installation tracking.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('asamblea', 'votacion', 'cuota', 'seguridad', 'registro', 'propuesta', 'general'));

CREATE TABLE public.app_devices (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL CHECK (char_length(device_key) BETWEEN 20 AND 100),
  platform TEXT NOT NULL DEFAULT 'unknown'
    CHECK (platform IN ('ios', 'android', 'desktop', 'unknown')),
  installation_status TEXT NOT NULL DEFAULT 'browser'
    CHECK (installation_status IN ('browser', 'installed')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, device_key)
);

CREATE INDEX idx_app_devices_user_id ON public.app_devices(user_id);
ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_devices FROM anon, authenticated;
GRANT ALL ON public.app_devices TO service_role;

ALTER TABLE public.push_subscriptions
  ADD COLUMN device_key TEXT,
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'unknown'
    CHECK (platform IN ('ios', 'android', 'desktop', 'unknown'));

CREATE TABLE public.push_notification_jobs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  junta_id UUID NOT NULL REFERENCES public.juntas(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL CHECK (char_length(event_key) BETWEEN 3 AND 240),
  notification_type TEXT NOT NULL
    CHECK (notification_type IN ('asamblea', 'votacion', 'cuota', 'seguridad', 'registro', 'propuesta', 'general')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 500),
  action TEXT,
  tag TEXT,
  recipient_user_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'delivered', 'partial', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  subscription_count INTEGER NOT NULL DEFAULT 0 CHECK (subscription_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  UNIQUE (junta_id, event_key)
);

CREATE INDEX idx_push_notification_jobs_retry
  ON public.push_notification_jobs(status, next_attempt_at)
  WHERE status IN ('pending', 'partial', 'failed');
CREATE INDEX idx_push_notification_jobs_junta_created
  ON public.push_notification_jobs(junta_id, created_at DESC);

ALTER TABLE public.push_notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_notification_jobs FROM anon, authenticated;
GRANT ALL ON public.push_notification_jobs TO service_role;

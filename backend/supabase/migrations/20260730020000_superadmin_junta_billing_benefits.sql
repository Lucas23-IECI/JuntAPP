-- Commercial terms assigned by the Superadmin when a junta is created.
-- A trial keeps the junta authorized until trial_ends_at. The daily cron and
-- server-side access checks move expired trials to past_due so the owner must
-- activate the regular Mercado Pago subscription.

ALTER TABLE public.juntas
  ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'subscription'
    CHECK (billing_mode IN ('subscription', 'trial_then_subscription', 'complimentary')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expired_notice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_notes TEXT;

ALTER TABLE public.juntas
  DROP CONSTRAINT IF EXISTS juntas_trial_billing_dates_check;

ALTER TABLE public.juntas
  ADD CONSTRAINT juntas_trial_billing_dates_check CHECK (
    (billing_mode = 'trial_then_subscription' AND trial_ends_at IS NOT NULL)
    OR
    (billing_mode <> 'trial_then_subscription' AND trial_ends_at IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_juntas_trial_expiry
  ON public.juntas (trial_ends_at)
  WHERE billing_mode = 'trial_then_subscription'
    AND subscription_status = 'authorized';

COMMENT ON COLUMN public.juntas.billing_mode IS
  'subscription: regular Mercado Pago billing; trial_then_subscription: free access until trial_ends_at; complimentary: manual free access without automatic expiry.';
COMMENT ON COLUMN public.juntas.trial_ends_at IS
  'UTC instant when a Superadmin-granted free period stops and payment becomes required.';
COMMENT ON COLUMN public.juntas.billing_notes IS
  'Internal commercial note visible only through service-role Superadmin views.';

CREATE OR REPLACE FUNCTION public.get_public_website(p_slug TEXT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'name', j.name, 'template', w.template, 'content', w.content,
    'theme', w.theme, 'logo_url', w.logo_url,
    'hero_image_url', w.hero_image_url, 'gallery', w.gallery
  )
  FROM public.juntas j
  JOIN public.website_pages w ON w.junta_id = j.id
  WHERE j.slug = p_slug
    AND w.published = true
    AND j.subscription_status = 'authorized'
    AND (
      j.billing_mode <> 'trial_then_subscription'
      OR j.trial_ends_at > timezone('utc'::text, now())
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_website(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_website(TEXT) TO anon, authenticated;

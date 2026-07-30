-- Expand the public website builder with genuinely different layouts.
ALTER TABLE public.website_pages
  DROP CONSTRAINT IF EXISTS website_pages_template_check;

ALTER TABLE public.website_pages
  ADD CONSTRAINT website_pages_template_check CHECK (template IN (
    'comunidad', 'mural', 'institucional', 'noticias', 'minimalista',
    'editorial', 'fotografica', 'barrio', 'agenda', 'clasica', 'portal'
  ));

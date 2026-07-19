CREATE OR REPLACE FUNCTION public.get_public_website(p_slug TEXT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object(
   'name', j.name, 'template', w.template, 'content', w.content,
   'theme', w.theme, 'logo_url', w.logo_url,
   'hero_image_url', w.hero_image_url, 'gallery', w.gallery
 )
 FROM public.juntas j JOIN public.website_pages w ON w.junta_id = j.id
 WHERE j.slug = p_slug AND w.published = true AND j.subscription_status = 'authorized'
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_website(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_website(TEXT) TO anon, authenticated;

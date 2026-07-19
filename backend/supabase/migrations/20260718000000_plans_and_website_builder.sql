-- Product plans, optional WhatsApp module, and public landing-page builder.
ALTER TABLE public.juntas DROP CONSTRAINT IF EXISTS juntas_subscription_price_check;
ALTER TABLE public.juntas ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'juntapp'
  CHECK (subscription_plan IN ('juntapp', 'juntapp_web', 'web'));
ALTER TABLE public.juntas ADD COLUMN IF NOT EXISTS whatsapp_addon BOOLEAN NOT NULL DEFAULT false;
UPDATE public.juntas SET subscription_price = 14990 WHERE subscription_price = 15000;
ALTER TABLE public.juntas ADD CONSTRAINT juntas_subscription_price_check CHECK (subscription_price IN (9990, 14990, 17980, 19990, 22980, 27980));

CREATE TABLE public.website_pages (
  junta_id UUID PRIMARY KEY REFERENCES public.juntas(id) ON DELETE CASCADE,
  template TEXT NOT NULL DEFAULT 'comunidad' CHECK (template IN ('comunidad','mural','institucional','noticias','minimalista')),
  published BOOLEAN NOT NULL DEFAULT false,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme JSONB NOT NULL DEFAULT '{"primary":"#0b3b60","accent":"#f97316","background":"#fffaf0","text":"#172033"}'::jsonb,
  logo_url TEXT,
  hero_image_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published websites are public" ON public.website_pages FOR SELECT USING (published OR junta_id = public.current_junta_id());
CREATE POLICY "Owners manage their website" ON public.website_pages FOR ALL TO authenticated
  USING (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente')
  WITH CHECK (junta_id = public.current_junta_id() AND public.current_user_role() = 'dirigente');
GRANT SELECT ON public.website_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.website_pages TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('website-media', 'website-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Website media public read" ON storage.objects FOR SELECT USING (bucket_id = 'website-media');
CREATE POLICY "Dirigentes upload website media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'website-media' AND (storage.foldername(name))[1] = public.current_junta_id()::text AND public.current_user_role() = 'dirigente');
CREATE POLICY "Dirigentes update website media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'website-media' AND (storage.foldername(name))[1] = public.current_junta_id()::text AND public.current_user_role() = 'dirigente');
CREATE POLICY "Dirigentes delete website media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'website-media' AND (storage.foldername(name))[1] = public.current_junta_id()::text AND public.current_user_role() = 'dirigente');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_junta_id UUID; target_role TEXT := 'vecino'; target_position TEXT := NULL; target_cuota TEXT := 'pendiente';
  junta_action TEXT := coalesce(NEW.raw_user_meta_data->>'junta_action','join'); requested_code TEXT := upper(trim(NEW.raw_user_meta_data->>'invite_code'));
  requested_phone TEXT := trim(NEW.raw_user_meta_data->>'phone'); requested_region TEXT := trim(NEW.raw_user_meta_data->>'junta_region'); requested_comuna TEXT := trim(NEW.raw_user_meta_data->>'junta_comuna');
  requested_plan TEXT := coalesce(NEW.raw_user_meta_data->>'subscription_plan','juntapp'); requested_whatsapp BOOLEAN := coalesce((NEW.raw_user_meta_data->>'whatsapp_addon')::boolean,false);
  base_price INTEGER; new_invite_code TEXT; new_slug TEXT;
BEGIN
 IF char_length(regexp_replace(coalesce(requested_phone,''),'[^0-9]','','g')) < 9 THEN RAISE EXCEPTION 'El numero de celular es obligatorio'; END IF;
 IF junta_action = 'create' THEN
  IF requested_plan NOT IN ('juntapp','juntapp_web','web') THEN requested_plan := 'juntapp'; END IF;
  base_price := CASE requested_plan WHEN 'web' THEN 9990 WHEN 'juntapp_web' THEN 19990 ELSE 14990 END;
  IF requested_whatsapp THEN base_price := base_price + 7990; END IF;
  IF char_length(trim(NEW.raw_user_meta_data->>'junta_name')) < 3 OR requested_region = '' OR requested_comuna = '' THEN RAISE EXCEPTION 'Datos de la junta incompletos'; END IF;
  LOOP new_invite_code := upper(substr(replace(extensions.uuid_generate_v4()::text,'-',''),1,6)); EXIT WHEN NOT EXISTS (SELECT 1 FROM public.juntas WHERE invite_code=new_invite_code); END LOOP;
  new_slug := trim(both '-' from regexp_replace(lower(translate(NEW.raw_user_meta_data->>'junta_name','áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')),'[^a-z0-9]+','-','g')) || '-' || substr(replace(extensions.uuid_generate_v4()::text,'-',''),1,8);
  INSERT INTO public.juntas(name,slug,comuna,region,invite_code,owner_id,subscription_status,subscription_price,subscription_plan,whatsapp_addon)
  VALUES(trim(NEW.raw_user_meta_data->>'junta_name'),new_slug,requested_comuna,requested_region,new_invite_code,NEW.id,'pending',base_price,requested_plan,requested_whatsapp) RETURNING id INTO target_junta_id;
  target_role := 'dirigente'; target_position := 'presidente'; target_cuota := 'al_dia';
 ELSE SELECT id INTO target_junta_id FROM public.juntas WHERE invite_code=requested_code AND subscription_status='authorized'; IF target_junta_id IS NULL THEN RAISE EXCEPTION 'Codigo invalido o junta inactiva'; END IF; END IF;
 INSERT INTO public.profiles(id,junta_id,name,rut,address,phone,email,role,board_position,cuota_status)
 VALUES(NEW.id,target_junta_id,trim(NEW.raw_user_meta_data->>'name'),upper(NEW.raw_user_meta_data->>'rut'),trim(NEW.raw_user_meta_data->>'address'),requested_phone,NEW.email,target_role,target_position,target_cuota);
 RETURN NEW;
END; $$;

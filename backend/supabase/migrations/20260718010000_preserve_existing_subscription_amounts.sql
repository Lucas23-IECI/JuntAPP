-- Existing Mercado Pago preapprovals keep the amount originally authorized by
-- their payer. New registrations use the published plan catalogue.
ALTER TABLE public.juntas DROP CONSTRAINT IF EXISTS juntas_subscription_price_check;
UPDATE public.juntas SET subscription_price = 15000
WHERE mercadopago_subscription_id IS NOT NULL
  AND subscription_plan = 'juntapp'
  AND whatsapp_addon = false;
ALTER TABLE public.juntas ADD CONSTRAINT juntas_subscription_price_check
  CHECK (subscription_price IN (9990, 14990, 15000, 17980, 19990, 22980, 27980));

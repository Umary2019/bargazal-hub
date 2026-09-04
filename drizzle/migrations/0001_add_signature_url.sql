ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS signature_url TEXT;

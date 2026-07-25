-- Extended columns for promotions table
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS coins_bonus NUMERIC DEFAULT 0;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS xp_bonus NUMERIC DEFAULT 0;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT true;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS max_claims INTEGER;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS max_claims_per_user INTEGER DEFAULT 1;

-- Fill missing slugs for existing rows
UPDATE public.promotions SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;

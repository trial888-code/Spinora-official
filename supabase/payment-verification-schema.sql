-- =========================================================
-- AUTOMATED PAYMENT VERIFICATION & TELEGRAM MARKETING SCHEMA
-- =========================================================

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'pending_admin_review', 'rejected')),
  memo TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('cashapp', 'venmo', 'paypal', 'chime', 'crypto', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  gemini_status TEXT DEFAULT 'processed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_broadcast_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  telegram_chat_id TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS & Indexes
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_broadcast_subscribers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_amount_memo ON public.payment_orders(amount, memo);
CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_chat_id ON public.telegram_broadcast_subscribers(telegram_chat_id);

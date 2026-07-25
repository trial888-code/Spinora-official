-- Fix wallet_transactions table permissions and wallet credit function
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'current',
  transaction_type TEXT NOT NULL DEFAULT 'credit',
  source TEXT NOT NULL DEFAULT 'deposit',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant full table permissions to service_role, authenticated, and anon
GRANT ALL ON TABLE public.wallet_transactions TO service_role;
GRANT ALL ON TABLE public.wallet_transactions TO authenticated;
GRANT ALL ON TABLE public.wallet_transactions TO anon;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Service role full access on wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Service role full access on wallet transactions"
  ON public.wallet_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Fix complete_deposit_request function so service_role or admin can credit wallet balance
CREATE OR REPLACE FUNCTION public.complete_deposit_request(
  p_deposit_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.deposit_requests;
  v_amount NUMERIC;
  v_method TEXT;
BEGIN
  SELECT * INTO v_row
  FROM public.deposit_requests
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Deposit request not found';
  END IF;

  IF v_row.wallet_credited OR v_row.status = 'completed' THEN
    RAISE EXCEPTION 'Deposit already completed';
  END IF;

  v_amount := COALESCE(p_amount, v_row.amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount is required';
  END IF;

  v_amount := round(v_amount::numeric, 2);

  -- Set session flag to bypass protect_wallet_columns_trigger
  PERFORM set_config('app.wallet_update', 'true', true);

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_amount
  WHERE id = v_row.user_id;

  v_method := COALESCE(v_row.payment_method, 'payment');

  INSERT INTO public.wallet_transactions (
    id, user_id, amount, wallet_type, transaction_type, source, description, created_by
  )
  VALUES (
    gen_random_uuid(),
    v_row.user_id,
    v_amount,
    'current',
    'credit',
    'deposit',
    format('Deposit confirmed — $%s via %s (%s)', v_amount, v_method, v_row.game_name),
    auth.uid()
  );

  UPDATE public.deposit_requests
  SET
    status = 'completed',
    amount = v_amount,
    wallet_credited = true,
    admin_notes = COALESCE(NULLIF(trim(p_admin_notes), ''), admin_notes),
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_deposit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_deposit_request(UUID, NUMERIC, TEXT) TO authenticated, service_role, anon;

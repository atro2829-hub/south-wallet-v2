-- =====================================================================
-- Migration 023: Ensure transfer_money() RPC exists and is correct
-- =====================================================================
-- The manage-balance edge function now calls transfer_money() RPC for
-- atomic transfers. This migration ensures the function exists with the
-- correct signature and uses FOR UPDATE row locking.

CREATE OR REPLACE FUNCTION public.transfer_money(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'YER',
  p_fee NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT ''
) RETURNS UUID AS $$
DECLARE
  v_balance_field TEXT;
  v_sender_balance NUMERIC;
  v_transaction_id UUID;
  v_total NUMERIC;
BEGIN
  IF p_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'لا يمكنك التحويل لنفسك';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ يجب أن يكون موجباً';
  END IF;

  v_balance_field := CASE p_currency
    WHEN 'YER' THEN 'balance_yer'
    WHEN 'SAR' THEN 'balance_sar'
    ELSE 'balance_usd'
  END;
  v_total := p_amount + p_fee;

  -- Lock the sender row and check balance atomically
  EXECUTE format(
    'SELECT %I FROM public.users WHERE id = $1 FOR UPDATE',
    v_balance_field
  ) INTO v_sender_balance USING p_from_user_id;

  IF v_sender_balance IS NULL THEN
    RAISE EXCEPTION 'المرسل غير موجود';
  END IF;
  IF v_sender_balance < v_total THEN
    RAISE EXCEPTION 'الرصيد غير كافي (المتاح: %, المطلوب: %)', v_sender_balance, v_total;
  END IF;

  -- Deduct from sender (atomic)
  EXECUTE format(
    'UPDATE public.users SET %I = %I - $1, updated_at = NOW() WHERE id = $2',
    v_balance_field, v_balance_field
  ) USING v_total, p_from_user_id;

  -- Add to receiver (atomic)
  EXECUTE format(
    'UPDATE public.users SET %I = %I + $1, updated_at = NOW() WHERE id = $2',
    v_balance_field, v_balance_field
  ) USING p_amount, p_to_user_id;

  -- Create transaction record
  INSERT INTO public.transactions(
    id, user_id, from_user_id, to_user_id,
    amount, currency, fee, fee_currency,
    type, status, description,
    completed_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_from_user_id, p_from_user_id, p_to_user_id,
    p_amount, p_currency, p_fee, p_currency,
    'transfer', 'completed', p_description,
    NOW(), NOW(), NOW()
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.transfer_money(UUID, UUID, NUMERIC, TEXT, NUMERIC, TEXT) TO anon, authenticated;

-- =====================================================================

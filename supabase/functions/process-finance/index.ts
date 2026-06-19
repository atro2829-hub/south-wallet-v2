import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()

    switch (action) {
      // === DEPOSITS ===
      case 'create_deposit_request': {
        const { user_id, amount, currency = 'YER', method = 'bank', bank_details, crypto_details } = data
        // Serialize bank/crypto details into the receipt_data JSONB column
        // (deposit_requests table doesn't have separate bank_details/crypto_details columns)
        const receiptData: any = {}
        if (bank_details) receiptData.bank = bank_details
        if (crypto_details) receiptData.crypto = crypto_details
        const { error } = await supabase.from('deposit_requests').insert({
          user_id,
          amount,
          currency,
          method,
          receipt_data: receiptData,
          status: 'pending',
        })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء طلب الإيداع' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'approve_deposit': {
        const { request_id, admin_id } = data
        const { data: request, error: reqErr } = await supabase
          .from('deposit_requests')
          .select('*')
          .eq('id', request_id)
          .maybeSingle()
        if (reqErr) throw reqErr
        if (!request) throw new Error('الطلب غير موجود')

        const cur = (request as any).currency.toLowerCase()

        // Update request status (deposit_requests has reviewed_by, not processed_by)
        await supabase.from('deposit_requests')
          .update({ status: 'approved', reviewed_by: admin_id, updated_at: new Date().toISOString() })
          .eq('id', request_id)

        // Add balance to user
        const { data: user } = await supabase
          .from('users')
          .select(`balance_${cur}`)
          .eq('id', (request as any).user_id)
          .maybeSingle()
        const currentBalance = Number((user as any)?.[`balance_${cur}`]) || 0

        await supabase.from('users')
          .update({ [`balance_${cur}`]: currentBalance + Number((request as any).amount) })
          .eq('id', (request as any).user_id)

        // Create a transaction record
        await supabase.from('transactions').insert({
          user_id: (request as any).user_id,
          type: 'deposit',
          amount: Number((request as any).amount),
          currency: (request as any).currency,
          status: 'completed',
          description: 'إيداع رصيد',
          reference_number: String(request_id),
          completed_at: new Date().toISOString(),
        })

        return new Response(JSON.stringify({ success: true, message: 'تم الموافقة على الإيداع' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'reject_deposit': {
        const { request_id, admin_id, reason } = data
        const { error } = await supabase.from('deposit_requests')
          .update({ status: 'rejected', reviewed_by: admin_id, updated_at: new Date().toISOString() })
          .eq('id', request_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم رفض الإيداع' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // === WITHDRAWALS ===
      case 'create_withdraw_request': {
        const { user_id, amount, currency = 'YER', method = 'bank', bank_iban, crypto_details } = data

        const cur = currency.toLowerCase()
        const { data: user, error: userErr } = await supabase
          .from('users')
          .select(`balance_${cur}`)
          .eq('id', user_id)
          .maybeSingle()
        if (userErr) throw userErr
        if (!user) throw new Error('المستخدم غير موجود')

        const balance = Number((user as any)[`balance_${cur}`]) || 0
        if (balance < amount) throw new Error('الرصيد غير كافي')

        // Deduct balance immediately
        await supabase.from('users')
          .update({ [`balance_${cur}`]: balance - amount })
          .eq('id', user_id)

        // Serialize bank_iban / crypto_details into receipt_data JSONB column
        const receiptData: any = {}
        if (bank_iban) receiptData.bank_iban = bank_iban
        if (crypto_details) receiptData.crypto = crypto_details

        // Create withdraw request (withdraw_requests uses receipt_data JSONB, not separate columns)
        const { error } = await supabase.from('withdraw_requests').insert({
          user_id,
          amount,
          currency,
          method,
          receipt_data: receiptData,
          status: 'pending',
        })
        if (error) throw error

        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء طلب السحب' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'approve_withdraw': {
        const { request_id, admin_id } = data
        const { error } = await supabase.from('withdraw_requests')
          .update({ status: 'approved', processed_by: admin_id, updated_at: new Date().toISOString() })
          .eq('id', request_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم الموافقة على السحب' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'reject_withdraw': {
        const { request_id, admin_id } = data
        // Refund balance
        const { data: request } = await supabase
          .from('withdraw_requests')
          .select('*')
          .eq('id', request_id)
          .maybeSingle()

        if (request) {
          const cur = (request as any).currency.toLowerCase()
          const { data: user } = await supabase
            .from('users')
            .select(`balance_${cur}`)
            .eq('id', (request as any).user_id)
            .maybeSingle()
          const currentBalance = Number((user as any)?.[`balance_${cur}`]) || 0
          await supabase.from('users')
            .update({ [`balance_${cur}`]: currentBalance + Number((request as any).amount) })
            .eq('id', (request as any).user_id)
        }

        await supabase.from('withdraw_requests')
          .update({ status: 'rejected', processed_by: admin_id, updated_at: new Date().toISOString() })
          .eq('id', request_id)

        return new Response(JSON.stringify({ success: true, message: 'تم رفض السحب واسترداد الرصيد' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // === EXCHANGE ===
      case 'exchange_currency': {
        const { user_id, from_currency, to_currency, amount } = data

        // Get exchange rate (exchange_rates table has from_currency, to_currency, rate columns)
        const { data: rateRow, error: rateErr } = await supabase
          .from('exchange_rates')
          .select('*')
          .or(`from_currency.eq.${from_currency},to_currency.eq.${to_currency}`)
          .limit(1)
          .maybeSingle()
        if (rateErr) throw rateErr
        if (!rateRow) throw new Error('سعر الصرف غير متوفر')

        // Try to read rate from the row (could be in different columns)
        const rateValue = Number((rateRow as any).rate || (rateRow as any).value || 1)
        const fromCur = from_currency.toLowerCase()
        const toCur = to_currency.toLowerCase()

        // Get user balance
        const { data: user } = await supabase
          .from('users')
          .select(`balance_${fromCur}, balance_${toCur}`)
          .eq('id', user_id)
          .maybeSingle()

        const fromBalance = Number((user as any)?.[`balance_${fromCur}`]) || 0
        const toBalance = Number((user as any)?.[`balance_${toCur}`]) || 0

        if (fromBalance < amount) throw new Error('الرصيد غير كافي')

        const convertedAmount = Number(amount) * rateValue

        // Deduct source currency, add target
        await supabase.from('users')
          .update({ [`balance_${fromCur}`]: fromBalance - amount, [`balance_${toCur}`]: toBalance + convertedAmount })
          .eq('id', user_id)

        // Create a transaction record
        await supabase.from('transactions').insert({
          user_id,
          type: 'exchange',
          amount: Number(amount),
          currency: from_currency,
          fee: 0,
          fee_currency: from_currency,
          status: 'completed',
          description: `تحويل ${amount} ${from_currency} إلى ${convertedAmount.toFixed(2)} ${to_currency}`,
          reference_number: `EX-${Date.now()}`,
          receipt_data: { from_currency, to_currency, rate: rateValue, converted_amount: convertedAmount },
          completed_at: new Date().toISOString(),
        })

        return new Response(JSON.stringify({
          success: true,
          message: `تم تحويل ${amount} ${from_currency} إلى ${convertedAmount.toFixed(2)} ${to_currency}`,
          data: { rate: rateValue, converted_amount: convertedAmount },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

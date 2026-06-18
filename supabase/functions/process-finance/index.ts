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
        const { error } = await supabase.from('deposit_requests').insert({
          user_id,
          amount,
          currency,
          method,
          bank_details,
          crypto_details,
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

        // Update request status
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

        // Create withdraw request
        const { error } = await supabase.from('withdraw_requests').insert({
          user_id,
          amount,
          currency,
          method,
          bank_iban,
          crypto_details,
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

        // Get exchange rate
        const { data: rate, error: rateErr } = await supabase
          .from('exchange_rates')
          .select('rate')
          .eq('from_currency', from_currency)
          .eq('to_currency', to_currency)
          .maybeSingle()
        if (rateErr) throw rateErr
        if (!rate) throw new Error('سعر الصرف غير متوفر')

        const rateValue = Number((rate as any).rate)
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

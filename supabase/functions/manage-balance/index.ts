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
      case 'transfer': {
        const { from_user_id, to_user_id, amount, currency = 'YER', fee = 0, note = '' } = data

        if (from_user_id === to_user_id) throw new Error('لا يمكنك التحويل لنفسك')

        const cur = currency.toLowerCase()

        // Get sender balance
        const { data: sender, error: senderErr } = await supabase
          .from('users')
          .select(`balance_${cur}`)
          .eq('id', from_user_id)
          .maybeSingle()
        if (senderErr) throw senderErr
        if (!sender) throw new Error('المرسل غير موجود')

        const senderBalance = Number((sender as any)[`balance_${cur}`]) || 0
        const total = Number(amount) + Number(fee)

        if (senderBalance < total) throw new Error('الرصيد غير كافي')

        // Get receiver
        const { data: receiver, error: recvErr } = await supabase
          .from('users')
          .select(`id, balance_${cur}`)
          .eq('id', to_user_id)
          .maybeSingle()
        if (recvErr) throw recvErr
        if (!receiver) throw new Error('المستلم غير موجود')

        const receiverBalance = Number((receiver as any)[`balance_${cur}`]) || 0

        // Create transaction record
        const { data: txn, error: txnErr } = await supabase
          .from('transactions')
          .insert({
            from_user_id,
            to_user_id,
            amount: Number(amount),
            fee: Number(fee),
            currency,
            type: 'transfer',
            status: 'completed',
            note,
          })
          .select()
          .single()
        if (txnErr) throw txnErr

        // Deduct from sender
        await supabase.from('users')
          .update({ [`balance_${cur}`]: senderBalance - total })
          .eq('id', from_user_id)

        // Add to receiver
        await supabase.from('users')
          .update({ [`balance_${cur}`]: receiverBalance + Number(amount) })
          .eq('id', to_user_id)

        return new Response(JSON.stringify({
          success: true,
          message: 'تم التحويل بنجاح',
          data: txn,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'get_balance': {
        const { user_id } = data
        const { data: user, error } = await supabase
          .from('users')
          .select('balance_yer, balance_sar, balance_usd')
          .eq('id', user_id)
          .maybeSingle()
        if (error) throw error
        if (!user) throw new Error('المستخدم غير موجود')
        return new Response(JSON.stringify({ success: true, data: user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get_transactions': {
        const { user_id, type, limit = 50, offset = 0 } = data
        let query = supabase.from('transactions')
          .select('*')
          .order('created_at', { ascending: false })

        if (user_id) {
          query = query.or(`from_user_id.eq.${user_id},to_user_id.eq.${user_id}`)
        }
        if (type) query = query.eq('type', type)
        query = query.range(offset, offset + limit - 1)

        const { data: txns, error } = await query
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: txns }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
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

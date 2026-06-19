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
        const { from_user_id, to_user_id, amount, currency = 'YER', fee = 0, note = '', description = '' } = data

        if (from_user_id === to_user_id) throw new Error('لا يمكنك التحويل لنفسك')

        // FIX: use the atomic transfer_money() PL/pgSQL function instead of
        // read-then-write (which had a race condition — two concurrent transfers
        // could both pass the balance check and overdraft).
        const { data: txnId, error: rpcErr } = await supabase.rpc('transfer_money', {
          p_from_user_id: from_user_id,
          p_to_user_id: to_user_id,
          p_amount: Number(amount),
          p_currency: currency,
          p_fee: Number(fee),
          p_description: description || note || 'تحويل بين المستخدمين',
        })
        if (rpcErr) throw rpcErr

        // Fetch the created transaction row
        const { data: txn, error: txnFetchErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', txnId)
          .maybeSingle()
        if (txnFetchErr) console.warn('[transfer] could not fetch txn:', txnFetchErr.message)

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

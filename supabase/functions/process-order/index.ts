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
      case 'process_order': {
        const { user_id, provider_id, package_id, amount, currency = 'YER' } = data

        // Get user balance
        const { data: user, error: userErr } = await supabase
          .from('users')
          .select(`balance_${currency.toLowerCase()}`)
          .eq('id', user_id)
          .maybeSingle()
        if (userErr) throw userErr
        if (!user) throw new Error('المستخدم غير موجود')

        const balance = Number((user as any)[`balance_${currency.toLowerCase()}`]) || 0

        // Get package cost
        const { data: pkg, error: pkgErr } = await supabase
          .from('product_packages')
          .select('cost_price, name')
          .eq('id', package_id)
          .maybeSingle()
        if (pkgErr) throw pkgErr
        if (!pkg) throw new Error('الباقة غير موجودة')

        const costPrice = Number(pkg.cost_price)

        if (balance < costPrice) {
          throw new Error('الرصيد غير كافي')
        }

        // Create order
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id,
            provider_id,
            package_id,
            amount: amount || costPrice,
            cost_price: costPrice,
            commission: 0,
            status: 'pending',
            currency,
          })
          .select()
          .single()
        if (orderErr) throw orderErr

        // Deduct balance
        const { error: balErr } = await supabase
          .from('users')
          .update({ [`balance_${currency.toLowerCase()}`]: balance - costPrice })
          .eq('id', user_id)
        if (balErr) throw balErr

        return new Response(JSON.stringify({
          success: true,
          message: 'تم إنشاء الطلب بنجاح',
          data: order,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'cancel_order': {
        const { order_id, refund = true } = data

        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', order_id)
          .maybeSingle()
        if (orderErr) throw orderErr
        if (!order) throw new Error('الطلب غير موجود')
        if (order.status === 'completed' && !refund) {
          throw new Error('لا يمكن إلغاء طلب مكتمل')
        }

        // Update order status
        const { error: updateErr } = await supabase
          .from('orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', order_id)
        if (updateErr) throw updateErr

        // Refund if needed
        if (refund && order.status !== 'completed') {
          const currency = order.currency?.toLowerCase() || 'yer'
          const { data: user } = await supabase
            .from('users')
            .select(`balance_${currency}`)
            .eq('id', order.user_id)
            .maybeSingle()
          const currentBalance = Number((user as any)?.[`balance_${currency}`]) || 0
          await supabase
            .from('users')
            .update({ [`balance_${currency}`]: currentBalance + Number(order.cost_price) })
            .eq('id', order.user_id)
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'تم إلغاء الطلب' + (refund ? ' واسترداد المبلغ' : ''),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'complete_order': {
        const { order_id, pin_code, serial_number, receipt_data } = data

        const updates: any = {
          status: 'completed',
          updated_at: new Date().toISOString(),
        }
        if (pin_code) updates.result_pin_code = pin_code
        if (serial_number) updates.result_serial = serial_number
        if (receipt_data) updates.receipt_data = receipt_data

        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', order_id)
        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          message: 'تم إكمال الطلب بنجاح',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'list_orders': {
        const { user_id, status, limit = 50, offset = 0 } = data
        let query = supabase.from('orders').select(`
          *, 
          service_providers(name, icon),
          product_packages(name)
        `).order('created_at', { ascending: false })
        if (user_id) query = query.eq('user_id', user_id)
        if (status) query = query.eq('status', status)
        query = query.range(offset, offset + limit - 1)
        const { data: orders, error } = await query
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: orders }), {
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

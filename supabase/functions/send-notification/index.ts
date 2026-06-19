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
      case 'send_notification': {
        const { user_id, title, body, type = 'general', data: extra = {} } = data

        const { error } = await supabase.from('notifications').insert({
          user_id,
          title,
          body,
          type,
          data: extra,
          is_read: false,
        })
        if (error) throw error

        // If FCM token available, try to send push notification
        const { data: user } = await supabase
          .from('users')
          .select('fcm_token')
          .eq('id', user_id)
          .maybeSingle()

        let pushResult = null
        if (user?.fcm_token) {
          try {
            // Firebase FCM push notification
            const fcmResp = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY') || ''}`,
              },
              body: JSON.stringify({
                to: user.fcm_token,
                notification: { title, body },
                data: extra,
              }),
            })
            pushResult = await fcmResp.json()
          } catch (e) {
            console.error('FCM send failed:', e)
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'تم إرسال الإشعار بنجاح',
          push_result: pushResult,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'send_bulk_notification': {
        const { title, body, type = 'general', user_ids, data: extra = {} } = data

        if (!user_ids || !Array.isArray(user_ids)) throw new Error('Missing user_ids array')

        const notifications = user_ids.map((uid: string) => ({
          user_id: uid,
          title,
          body,
          type,
          data: extra,
          is_read: false,
        }))

        const { error } = await supabase.from('notifications').insert(notifications)
        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          message: `تم إرسال الإشعار إلى ${user_ids.length} مستخدم`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'send_admin_notification': {
        const { title, body, type = 'general', data: extra = {} } = data
        const { error } = await supabase.from('admin_notifications').insert({
          title,
          body,
          type,
          data: extra,
          is_read: false,
        })
        if (error) throw error
        return new Response(JSON.stringify({
          success: true,
          message: 'تم إرسال إشعار الإدارة',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'list_user_notifications': {
        const { user_id, limit = 50, unread_only = false } = data
        let query = supabase.from('notifications')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (unread_only) query = query.eq('is_read', false)
        const { data: notifs, error } = await query
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: notifs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'mark_read': {
        const { notification_id } = data
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
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

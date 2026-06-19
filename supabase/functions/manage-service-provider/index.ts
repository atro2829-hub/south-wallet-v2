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

    const { action, provider_id, section_id, data } = await req.json()

    switch (action) {
      // === PROVIDERS ===
      case 'list_providers': {
        const query = supabase
          .from('service_providers')
          .select('*')
        if (section_id) query = query.eq('section_id', section_id)
        const { data: providers, error } = await query.order('sort_order', { ascending: true })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: providers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create_provider': {
        if (!data) throw new Error('Missing provider data')
        const { error } = await supabase
          .from('service_providers')
          .insert({
            ...data,
            id: data.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        if (error) throw error

        // If provider_sections data is included, create those too
        if (data.assigned_sections && Array.isArray(data.assigned_sections)) {
          const sectionLinks = data.assigned_sections.map((s: any) => ({
            provider_id: data.id || data.id,
            section_id: s.section_id,
            sub_section_id: s.sub_section_id || null,
            commission_rate: s.commission_rate || 0,
            commission_type: s.commission_type || 'percentage',
          }))
          if (sectionLinks.length > 0) {
            await supabase.from('provider_sections').insert(sectionLinks).catch(() => {})
          }
        }

        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء مزود الخدمة بنجاح' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update_provider': {
        if (!provider_id || !data) throw new Error('Missing provider_id or data')
        const { error } = await supabase
          .from('service_providers')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', provider_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم تحديث مزود الخدمة' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete_provider': {
        if (!provider_id) throw new Error('Missing provider_id')
        await supabase.from('product_packages').delete().eq('provider_id', provider_id).catch(() => {})
        await supabase.from('provider_sections').delete().eq('provider_id', provider_id).catch(() => {})
        const { error } = await supabase.from('service_providers').delete().eq('id', provider_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم حذف مزود الخدمة' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // === PROVIDER PACKAGES ===
      case 'list_packages': {
        if (!provider_id) throw new Error('Missing provider_id')
        const { data: packages, error } = await supabase
          .from('product_packages')
          .select('*')
          .eq('provider_id', provider_id)
          .order('sort_order', { ascending: true })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: packages }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create_package': {
        if (!data) throw new Error('Missing package data')
        const { error } = await supabase
          .from('product_packages')
          .insert({
            ...data,
            id: data.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء الباقة بنجاح' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update_package': {
        if (!data || !data.id) throw new Error('Missing package data')
        const { error } = await supabase
          .from('product_packages')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', data.id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم تحديث الباقة' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete_package': {
        if (!data || !data.id) throw new Error('Missing package id')
        const { error } = await supabase.from('product_packages').delete().eq('id', data.id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم حذف الباقة' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // === PROVIDER SECTIONS ASSIGNMENT ===
      case 'assign_provider_sections': {
        if (!provider_id || !data || !Array.isArray(data.sections)) {
          throw new Error('Missing provider_id or sections array')
        }
        // Remove existing assignments
        await supabase.from('provider_sections').delete().eq('provider_id', provider_id)
        // Create new assignments
        const links = data.sections.map((s: any) => ({
          provider_id,
          section_id: s.section_id,
          sub_section_id: s.sub_section_id || null,
          commission_rate: s.commission_rate || 0,
          commission_type: s.commission_type || 'percentage',
          max_discount: s.max_discount || 0,
        }))
        if (links.length > 0) {
          const { error } = await supabase.from('provider_sections').insert(links)
          if (error) throw error
        }
        return new Response(JSON.stringify({ success: true, message: 'تم تحديد أقسام مزود الخدمة' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get_provider_sections': {
        if (!provider_id) throw new Error('Missing provider_id')
        const { data: links, error } = await supabase
          .from('provider_sections')
          .select('*, sections(*), sub_sections(*)')
          .eq('provider_id', provider_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: links }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // === API PROVIDERS ===
      case 'list_api_providers': {
        const { data: apiProviders, error } = await supabase
          .from('api_providers')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: apiProviders }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create_api_provider': {
        if (!data) throw new Error('Missing API provider data')
        const { error } = await supabase
          .from('api_providers')
          .insert({
            ...data,
            id: data.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء مزود API' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update_api_provider': {
        if (!data || !data.id) throw new Error('Missing API provider data')
        const { error } = await supabase
          .from('api_providers')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', data.id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم تحديث مزود API' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete_api_provider': {
        if (!data || !data.id) throw new Error('Missing API provider id')
        await supabase.from('api_products').delete().eq('api_provider_id', data.id).catch(() => {})
        await supabase.from('api_categories').delete().eq('api_provider_id', data.id).catch(() => {})
        await supabase.from('api_provider_endpoints').delete().eq('api_provider_id', data.id).catch(() => {})
        const { error } = await supabase.from('api_providers').delete().eq('id', data.id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم حذف مزود API' }), {
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

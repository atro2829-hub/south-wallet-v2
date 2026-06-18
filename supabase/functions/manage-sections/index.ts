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

    const { action, section_id, sub_section_id, data } = await req.json()

    switch (action) {
      // === SECTIONS ===
      case 'list_sections': {
        const { data: sections, error } = await supabase
          .from('sections')
          .select('*')
          .order('sort_order', { ascending: true })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: sections }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create_section': {
        if (!data) throw new Error('Missing section data')
        const { error } = await supabase
          .from('sections')
          .insert({ ...data, id: data.id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء القسم بنجاح' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update_section': {
        if (!section_id || !data) throw new Error('Missing section_id or data')
        const { error } = await supabase
          .from('sections')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', section_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم تحديث القسم بنجاح' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete_section': {
        if (!section_id) throw new Error('Missing section_id')
        // Delete sub-sections first, then providers, then products, then section
        await supabase.from('product_packages').delete().in('provider_id',
          (await supabase.from('service_providers').select('id').eq('section_id', section_id)).data?.map(p => p.id) || []
        ).catch(() => {})
        await supabase.from('service_providers').delete().eq('section_id', section_id).catch(() => {})
        await supabase.from('sub_sections').delete().eq('section_id', section_id).catch(() => {})
        const { error } = await supabase.from('sections').delete().eq('id', section_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم حذف القسم بنجاح' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'reorder_sections': {
        if (!data || !Array.isArray(data)) throw new Error('Missing ordered IDs array')
        const updates = data.map((id: string, index: number) =>
          supabase.from('sections').update({ sort_order: index, updated_at: new Date().toISOString() }).eq('id', id)
        )
        await Promise.all(updates)
        return new Response(JSON.stringify({ success: true, message: 'تم إعادة ترتيب الأقسام' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // === SUB-SECTIONS ===
      case 'list_sub_sections': {
        if (!section_id) throw new Error('Missing section_id')
        const { data: subSections, error } = await supabase
          .from('sub_sections')
          .select('*')
          .eq('section_id', section_id)
          .order('sort_order', { ascending: true })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, data: subSections }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create_sub_section': {
        if (!data) throw new Error('Missing sub-section data')
        const { error } = await supabase
          .from('sub_sections')
          .insert({ ...data, id: data.id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم إنشاء القسم الفرعي بنجاح' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update_sub_section': {
        if (!sub_section_id || !data) throw new Error('Missing sub_section_id or data')
        const { error } = await supabase
          .from('sub_sections')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', sub_section_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم تحديث القسم الفرعي' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'delete_sub_section': {
        if (!sub_section_id) throw new Error('Missing sub_section_id')
        await supabase.from('service_providers').delete().eq('sub_section_id', sub_section_id).catch(() => {})
        const { error } = await supabase.from('sub_sections').delete().eq('id', sub_section_id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'تم حذف القسم الفرعي' }), {
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

// =====================================================================
// G2Bulk Proxy Edge Function — South Wallet
// =====================================================================
// Server-side proxy for ALL G2Bulk API calls.
// The G2BULK_API_KEY secret lives ONLY here — never in the client bundle.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const G2BULK_BASE_URL = 'https://api.g2bulk.com'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check: caller must send a Supabase API key or JWT
    const authHeader = req.headers.get('Authorization') || ''
    const apiKey = req.headers.get('apikey') || ''
    if (!authHeader && !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the G2Bulk API key from env
    const g2bulkApiKey = Deno.env.get('G2BULK_API_KEY')
    if (!g2bulkApiKey) {
      return new Response(JSON.stringify({ error: 'G2BULK_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse the request URL
    const url = new URL(req.url)
    let path = url.pathname
    // Strip the function mount prefix
    path = path.replace(/^\/functions\/v1\/g2bulk-proxy/, '')
    path = path.replace(/^\/g2bulk-proxy/, '')
    if (!path) path = '/'
    
    const query = url.search
    const method = req.method
    const targetUrl = `${G2BULK_BASE_URL}${path}${query}`

    // Forward the request
    const headers: Record<string, string> = {
      'X-API-Key': g2bulkApiKey,
      'Content-Type': 'application/json',
    }

    const fetchOptions: RequestInit = { method, headers }
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const body = await req.text()
      if (body) fetchOptions.body = body
    }

    console.log(`[g2bulk-proxy] ${method} ${targetUrl}`)
    const upstream = await fetch(targetUrl, fetchOptions)
    const upstreamText = await upstream.text()

    // Try to parse as JSON
    let upstreamBody: any = upstreamText
    try {
      upstreamBody = JSON.parse(upstreamText)
    } catch {
      // keep as text
    }

    return new Response(JSON.stringify(upstreamBody), {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[g2bulk-proxy] error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'فشل الاتصال بـ G2Bulk عبر البروكسي',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
// =====================================================================
// qt-game-api — Backend Proxy for QT.GAME (standalone, no deps)
// South Wallet — Edge Function كامل يطبق المنطق الذكي
// =====================================================================
// هذا الـ Edge Function هو الوسيط الكامل بين تطبيق QT.GAME ومزود G2Bulk.
// المفتاح X-API-Key لا يخرج من هذا السيرفر أبداً.
// يستخدم Supabase REST API مباشرة (دون @supabase/supabase-js) لتفادي
// مشاكل استيراد الحزم في Edge Runtime.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const G2BULK_BASE_URL = 'https://api.g2bulk.com'

interface SupabaseUser {
  id: string
  balance_usd: number
  balance_yer: number
  balance_sar: number
  role: string
  display_name: string
}

// ─── Supabase REST API helpers (no library) ─────────────────────────
function sbUrl(path: string, query: Record<string, string> = {}) {
  const base = `${Deno.env.get('SUPABASE_URL')!}/rest/v1/${path}`
  const qs = new URLSearchParams(query).toString()
  return qs ? `${base}?${qs}` : base
}

async function sbSelect(table: string, columns: string, filters: Record<string, string> = {}, orderBy?: string, ascending = true, limit = 1000) {
  const query: Record<string, string> = { select: columns, ...filters }
  if (orderBy) query.order = `${orderBy}.${ascending ? 'asc' : 'desc'}`
  if (limit) query.limit = String(limit)
  const url = sbUrl(table, query)
  const res = await fetch(url, {
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`sbSelect(${table}) HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return await res.json()
}

async function sbInsert(table: string, row: any) {
  const res = await fetch(sbUrl(table), {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`sbInsert(${table}) HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data[0] : data
}

async function sbUpdate(table: string, updates: any, filters: Record<string, string>) {
  const qs = new URLSearchParams(filters).toString()
  const res = await fetch(`${sbUrl(table)}?${qs}`, {
    method: 'PATCH',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`sbUpdate(${table}) HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
}

async function sbUpsert(table: string, rows: any | any[], onConflict: string) {
  const res = await fetch(`${sbUrl(table)}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`sbUpsert(${table}) HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
}

async function sbRpc(fn: string, params: any) {
  const res = await fetch(sbUrl(`rpc/${fn}`), {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`sbRpc(${fn}) HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return await res.json()
}

async function sbAuthGetUser(jwt: string) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')!}/auth/v1/user`, {
    headers: {
      apikey: Deno.env.get('SUPABASE_ANON_KEY') || '',
      Authorization: `Bearer ${jwt}`,
    },
  })
  if (!res.ok) return null
  return await res.json()
}

// ─── G2Bulk call helper ─────────────────────────────────────────────
async function g2bulkCall(apiKey: string, endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const url = `${G2BULK_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
  const opts: RequestInit = {
    method,
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  }
  if (body && method === 'POST') opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  const text = await res.text()
  let data: any = text
  try { data = JSON.parse(text) } catch {}
  if (!res.ok) {
    throw new Error(`G2Bulk ${res.status}: ${typeof data === 'string' ? data.slice(0,300) : JSON.stringify(data).slice(0,300)}`)
  }
  return data
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Main server ────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const apiKey = req.headers.get('apikey') || ''
    if (!authHeader && !apiKey) return json({ error: 'Missing auth' }, 401)

    const g2bulkApiKey = Deno.env.get('G2BULK_API_KEY')
    if (!g2bulkApiKey) return json({ error: 'G2BULK_API_KEY secret not set' }, 500)

    // Get current user (optional for some routes)
    const jwt = authHeader.replace('Bearer ', '')
    let currentUser: SupabaseUser | null = null
    if (jwt && jwt !== apiKey) {
      const authUser = await sbAuthGetUser(jwt)
      if (authUser?.id) {
        const userRows = await sbSelect('users', 'id, balance_usd, balance_yer, balance_sar, role, display_name', { id: `eq.${authUser.id}` }, undefined, true, 1)
        if (Array.isArray(userRows) && userRows.length > 0) {
          currentUser = userRows[0] as SupabaseUser
        }
      }
    }

    // Parse path
    const url = new URL(req.url)
    let path = url.pathname
    path = path.replace(/^\/functions\/v1\/qt-game-api/, '')
    path = path.replace(/^\/qt-game-api/, '')
    if (!path || path === '/') path = '/catalogue'

    console.log(`[qt-game-api] ${req.method} ${path} (user=${currentUser?.id || 'anon'})`)

    // Route
    if (path === '/catalogue' && req.method === 'GET') {
      return await handleGetCatalogue(url.searchParams)
    }
    if (path === '/games' && req.method === 'GET') {
      return await handleGetGames()
    }
    if (path === '/check-player' && req.method === 'POST') {
      const body = await req.json()
      return await handleCheckPlayer(g2bulkApiKey, body)
    }
    if (path === '/order' && req.method === 'POST') {
      if (!currentUser) return json({ error: 'يجب تسجيل الدخول' }, 401)
      const body = await req.json()
      return await handlePlaceOrder(g2bulkApiKey, currentUser, body)
    }
    if (path === '/order-status' && req.method === 'GET') {
      if (!currentUser) return json({ error: 'يجب تسجيل الدخول' }, 401)
      const orderId = url.searchParams.get('order_id') || ''
      const gameCode = url.searchParams.get('game_code') || ''
      return await handleOrderStatus(g2bulkApiKey, currentUser, orderId, gameCode)
    }
    if (path === '/sync' && req.method === 'POST') {
      if (!currentUser || !['admin', 'owner', 'super_admin'].includes(currentUser.role)) {
        return json({ error: 'صلاحيات الأدمن مطلوبة' }, 403)
      }
      return await handleSync(g2bulkApiKey)
    }

    return json({ error: `Unknown route: ${req.method} ${path}` }, 404)
  } catch (error) {
    console.error('[qt-game-api] FATAL:', error)
    return json({ error: 'internal_error', message: error.message, duration_ms: Date.now() - startTime }, 500)
  }
})

// ─── GET /catalogue ─────────────────────────────────────────────────
async function handleGetCatalogue(params: URLSearchParams) {
  const gameCode = params.get('game_code') || ''
  const gameFilters: Record<string, string> = {
    is_active: 'eq.true',
    is_visible: 'eq.true',
  }
  if (gameCode) gameFilters.game_code = `eq.${gameCode}`

  const games = await sbSelect('global_games',
    'id, game_code, name, name_ar, description, image_url, image_url_cached, icon, color, category, sort_order, is_pinned, required_fields, servers, tags',
    gameFilters, 'is_pinned', false, 200)

  if (!games || games.length === 0) return json({ games: [], packages: [] })

  const gameIds = games.map((g: any) => g.id)
  // Use the `in` filter for global_game_id
  const inFilter = `(${gameIds.map(id => `"${id}"`).join(',')})`
  const packages = await sbSelect('global_packages',
    'id, global_game_id, name, name_ar, description, unit_amount, unit_label, sell_price_usd, sell_price_yer, sell_price_sar, image_url, sort_order, is_active, is_popular, catalogue_name',
    { is_active: 'eq.true', global_game_id: `in.${inFilter}` }, 'unit_amount', true, 500)

  return json({
    games: games.map((g: any) => ({
      ...g,
      required_fields: g.required_fields || [],
      servers: g.servers || {},
      tags: g.tags || [],
    })),
    packages: packages || [],
  })
}

// ─── GET /games ─────────────────────────────────────────────────────
async function handleGetGames() {
  const games = await sbSelect('global_games',
    'id, game_code, name, name_ar, description, image_url, image_url_cached, icon, color, category, sort_order, is_pinned, required_fields, servers, tags',
    { is_active: 'eq.true', is_visible: 'eq.true' }, 'is_pinned', false, 200)
  return json({ games: games || [] })
}

// ─── POST /check-player ─────────────────────────────────────────────
async function handleCheckPlayer(g2bulkApiKey: string, body: any) {
  const { game_code, user_id, server_id } = body
  if (!game_code || !user_id) return json({ valid: false, error: 'game_code و user_id مطلوبان' }, 400)

  // Verify the game exists in our catalog
  const games = await sbSelect('global_games', 'game_code', { game_code: `eq.${game_code}`, is_active: 'eq.true' }, undefined, true, 1)
  if (!games || games.length === 0) return json({ valid: false, error: 'اللعبة غير متوفرة في الكتالوج' }, 404)

  try {
    const reqBody: any = { game: game_code, user_id: String(user_id) }
    if (server_id) reqBody.server_id = String(server_id)
    const result = await g2bulkCall(g2bulkApiKey, '/v1/games/checkPlayerId', 'POST', reqBody)
    return json({
      valid: result.valid === 'valid',
      name: result.name || '',
    })
  } catch (e: any) {
    console.error('[check-player] G2Bulk error:', e.message)
    return json({ valid: false, error: 'تعذر التحقق من المعرف. تأكد من صحته وحاول مرة أخرى.' }, 502)
  }
}

// ─── POST /order ────────────────────────────────────────────────────
async function handlePlaceOrder(g2bulkApiKey: string, user: SupabaseUser, body: any) {
  const { package_id, player_id, server_id, player_name } = body
  if (!package_id || !player_id) return json({ success: false, error: 'package_id و player_id مطلوبان' }, 400)

  // 1) Fetch global package
  const pkgs = await sbSelect('global_packages',
    'id, global_game_id, name, sell_price_usd, catalogue_name',
    { id: `eq.${package_id}`, is_active: 'eq.true' }, undefined, true, 1)
  if (!pkgs || pkgs.length === 0) return json({ success: false, error: 'الباقة غير موجودة' }, 404)
  const pkg = pkgs[0]

  // 2) Fetch the active offer (cheapest provider)
  const offers = await sbSelect('provider_products',
    'id, provider_id, provider_product_id, provider_game_code, provider_catalogue_name, cost_price',
    { global_package_id: `eq.${package_id}`, is_active_offer: 'eq.true' }, undefined, true, 1)
  if (!offers || offers.length === 0) return json({ success: false, error: 'لا يوجد مزود متوفر لهذه الباقة حالياً' }, 503)
  const offer = offers[0]

  // 3) Fetch game (for game_code)
  const games = await sbSelect('global_games', 'game_code, name', { id: `eq.${pkg.global_game_id}` }, undefined, true, 1)
  if (!games || games.length === 0) return json({ success: false, error: 'اللعبة غير موجودة' }, 404)
  const game = games[0]

  // 4) Atomic balance debit
  const sellPrice = Number(pkg.sell_price_usd) || 0
  if (Number(user.balance_usd) < sellPrice) {
    return json({
      success: false,
      error: `رصيدك غير كافي. المطلوب: $${sellPrice.toFixed(2)} | الرصيد: $${Number(user.balance_usd).toFixed(2)}`,
    }, 402)
  }

  try {
    await sbRpc('update_user_balance', {
      p_user_id: user.id, p_currency: 'USD', p_amount: sellPrice, p_operation: 'subtract',
    })
  } catch (e: any) {
    console.error('[order] debit failed:', e.message)
    return json({ success: false, error: 'فشل خصم الرصيد، حاول مرة أخرى' }, 500)
  }
  console.log(`[order] Debited $${sellPrice} from user ${user.id} for package ${package_id}`)

  // 5) Create pending order
  let orderRow: any
  try {
    orderRow = await sbInsert('orders', {
      user_id: user.id,
      provider_id: offer.provider_id,
      provider_name: 'G2Bulk',
      package_id: package_id,
      package_name: pkg.name,
      customer_input: String(player_id),
      amount: sellPrice,
      currency: 'USD',
      cost_price: Number(offer.cost_price) || 0,
      cost_currency: 'USD',
      commission_amount: sellPrice - (Number(offer.cost_price) || 0),
      commission_type: 'percentage',
      execution_type: 'api',
      api_provider_id: offer.provider_id,
      api_product_id: offer.provider_product_id || '',
      status: 'pending',
      game_code: game.game_code,
      player_id_verified: true,
      player_name: player_name || '',
    })
  } catch (e: any) {
    console.error('[order] insert failed — refunding:', e.message)
    try {
      await sbRpc('update_user_balance', {
        p_user_id: user.id, p_currency: 'USD', p_amount: sellPrice, p_operation: 'add',
      })
    } catch {}
    return json({ success: false, error: 'فشل تسجيل الطلب' }, 500)
  }

  // 6) Send order to G2Bulk
  try {
    const orderBody: any = {
      catalogue_name: offer.provider_catalogue_name || pkg.catalogue_name || pkg.name,
      player_id: String(player_id),
    }
    if (server_id) orderBody.server_id = String(server_id)

    const g2bulkResult = await g2bulkCall(g2bulkApiKey, `/v1/games/${game.game_code}/order`, 'POST', orderBody)

    if (g2bulkResult.success !== false && g2bulkResult.order) {
      await sbUpdate('orders', {
        api_order_id: String(g2bulkResult.order.order_id || ''),
        api_response: JSON.stringify(g2bulkResult),
        status: 'processing',
        g2bulk_order_status: g2bulkResult.order.status || 'PENDING',
        updated_at: new Date().toISOString(),
      }, { id: `eq.${orderRow.id}` })
      return json({
        success: true,
        order_id: orderRow.id,
        api_order_id: g2bulkResult.order.order_id,
        status: g2bulkResult.order.status || 'PENDING',
        message: g2bulkResult.message || 'تم إنشاء الطلب بنجاح',
        sell_price: sellPrice,
      })
    } else {
      // Refund
      await sbRpc('update_user_balance', {
        p_user_id: user.id, p_currency: 'USD', p_amount: sellPrice, p_operation: 'add',
      })
      await sbUpdate('orders', {
        status: 'failed',
        g2bulk_order_status: 'FAILED',
        result_message: g2bulkResult.message || 'G2Bulk order failed',
        updated_at: new Date().toISOString(),
      }, { id: `eq.${orderRow.id}` })
      return json({ success: false, error: g2bulkResult.message || 'فشل إرسال الطلب لـ G2Bulk', refunded: true }, 502)
    }
  } catch (e: any) {
    console.error('[order] G2Bulk call failed — refunding:', e.message)
    await sbRpc('update_user_balance', {
      p_user_id: user.id, p_currency: 'USD', p_amount: sellPrice, p_operation: 'add',
    })
    await sbUpdate('orders', {
      status: 'failed',
      g2bulk_order_status: 'FAILED',
      result_message: e.message,
      updated_at: new Date().toISOString(),
    }, { id: `eq.${orderRow.id}` })

    const arabicMsg = e.message.includes('401') || e.message.includes('403')
      ? 'مشكلة في مزود الخدمة. يرجى المحاولة لاحقاً.'
      : e.message.includes('402') || e.message.includes('balance')
      ? 'رصيد المزود غير كافٍ. يرجى المحاولة لاحقاً.'
      : e.message.includes('429')
      ? 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار دقيقة.'
      : 'فشل الاتصال بمزود الخدمة. يرجى المحاولة لاحقاً.'

    return json({ success: false, error: arabicMsg, refunded: true }, 502)
  }
}

// ─── GET /order-status ──────────────────────────────────────────────
async function handleOrderStatus(g2bulkApiKey: string, user: SupabaseUser, orderId: string, gameCode: string) {
  if (!orderId || !gameCode) return json({ error: 'order_id و game_code مطلوبان' }, 400)

  const orders = await sbSelect('orders',
    'id, api_order_id, status, g2bulk_order_status, user_id, amount',
    { id: `eq.${orderId}` }, undefined, true, 1)
  if (!orders || orders.length === 0) return json({ error: 'الطلب غير موجود' }, 404)
  const order = orders[0]
  if (order.user_id !== user.id) return json({ error: 'الطلب غير موجود' }, 404)

  if (!order.api_order_id) return json({ status: order.status, message: 'لا يوجد api_order_id بعد' })

  try {
    const result = await g2bulkCall(g2bulkApiKey, '/v1/games/order/status', 'POST', {
      order_id: Number(order.api_order_id),
      game: gameCode,
    })
    const status = result.order?.status || result.status || 'PENDING'
    const deliveryItems = result.order?.delivery_items || result.delivery_items

    let newStatus = order.status
    if (status === 'COMPLETED') newStatus = 'completed'
    else if (status === 'FAILED') {
      newStatus = 'refunded'
      const refundAmount = Number(order.amount) || 0
      if (refundAmount > 0) {
        await sbRpc('update_user_balance', {
          p_user_id: user.id, p_currency: 'USD', p_amount: refundAmount, p_operation: 'add',
        })
      }
    }

    await sbUpdate('orders', {
      status: newStatus,
      g2bulk_order_status: status,
      result_message: result.order?.message || '',
      updated_at: new Date().toISOString(),
    }, { id: `eq.${orderId}` })

    return json({
      order_id: orderId,
      api_order_id: order.api_order_id,
      status,
      db_status: newStatus,
      delivery_items: deliveryItems || null,
      message: result.order?.message || '',
    })
  } catch (e: any) {
    return json({ error: 'فشل جلب الحالة: ' + e.message }, 502)
  }
}

// ─── POST /sync (admin only) ────────────────────────────────────────
async function handleSync(g2bulkApiKey: string) {
  const stats = { games_updated: 0, packages_created: 0, offers_updated: 0, errors: [] as string[] }

  const globalGames = await sbSelect('global_games', 'id, game_code, name, category', { is_active: 'eq.true' }, undefined, true, 200)
  if (!globalGames || globalGames.length === 0) return json({ error: 'لا توجد ألعاب في الكتالوج العالمي' }, 404)

  let g2bulkGames: any[] = []
  try {
    const resp = await g2bulkCall(g2bulkApiKey, '/v1/games')
    g2bulkGames = resp.games || []
  } catch (e: any) {
    return json({ error: 'فشل جلب الألعاب من G2Bulk: ' + e.message }, 502)
  }

  const providers = await sbSelect('api_providers', 'id, auto_margin_percent, category_overrides', { id: 'eq.g2bulk' }, undefined, true, 1)
  const g2bulkProvider = providers?.[0] || { auto_margin_percent: 10, category_overrides: {} }

  for (const gg of globalGames) {
    const g2bulkGame = g2bulkGames.find((g: any) => g.code === gg.game_code)
    if (!g2bulkGame) {
      stats.errors.push(`Game ${gg.game_code} not found in G2Bulk`)
      continue
    }

    // Fetch required fields
    let requiredFields: string[] = []
    try {
      const fieldsResp = await g2bulkCall(g2bulkApiKey, '/v1/games/fields', 'POST', { game: gg.game_code })
      requiredFields = fieldsResp.info?.fields || fieldsResp.fields || []
    } catch (e: any) {
      stats.errors.push(`Fields for ${gg.game_code}: ${e.message}`)
    }

    // Fetch servers
    let servers: any = {}
    if (requiredFields.includes('serverid')) {
      try {
        const serversResp = await g2bulkCall(g2bulkApiKey, '/v1/games/servers', 'POST', { game: gg.game_code })
        servers = serversResp.servers || {}
      } catch {}
    }

    await sbUpdate('global_games', {
      image_url: g2bulkGame.image_url || '',
      banner_url: g2bulkGame.image_url || '',
      required_fields: JSON.stringify(requiredFields),
      servers: JSON.stringify(servers),
      updated_at: new Date().toISOString(),
    }, { id: `eq.${gg.id}` })
    stats.games_updated++

    // Fetch catalogue
    try {
      const catResp = await g2bulkCall(g2bulkApiKey, `/v1/games/${gg.game_code}/catalogue`)
      const catalogues = catResp.catalogues || []

      const marginPercent = Number(
        (g2bulkProvider as any).category_overrides?.[gg.category] ||
        (g2bulkProvider as any).auto_margin_percent || 10
      )

      for (let idx = 0; idx < catalogues.length; idx++) {
        const cat = catalogues[idx]
        const costPrice = Number(cat.amount) || 0
        const sellPrice = Number((costPrice * (1 + marginPercent / 100)).toFixed(2))
        const pkgId = `${gg.id}-pkg-${cat.id || idx}`

        await sbUpsert('global_packages', {
          id: pkgId,
          global_game_id: gg.id,
          name: cat.name || `باقة ${idx + 1}`,
          name_ar: cat.name || '',
          description: cat.description || '',
          unit_amount: costPrice,
          unit_label: cat.name || '',
          sell_price_usd: sellPrice,
          sell_price_yer: Math.round(sellPrice * 250),
          sell_price_sar: Number((sellPrice * 3.75).toFixed(2)),
          image_url: cat.image_url || g2bulkGame.image_url || '',
          sort_order: idx,
          is_active: true,
          catalogue_name: cat.name,
          updated_at: new Date().toISOString(),
        }, 'id')
        stats.packages_created++

        await sbUpsert('provider_products', {
          global_package_id: pkgId,
          provider_id: 'g2bulk',
          provider_product_id: String(cat.id || ''),
          provider_game_code: gg.game_code,
          provider_catalogue_name: cat.name,
          cost_price: costPrice,
          cost_currency: 'USD',
          stock_status: 'in_stock',
          is_active_offer: true,
          last_synced_at: new Date().toISOString(),
          raw_data: JSON.stringify(cat),
          updated_at: new Date().toISOString(),
        }, 'provider_id,provider_product_id')
        stats.offers_updated++
      }
    } catch (e: any) {
      stats.errors.push(`Catalogue for ${gg.game_code}: ${e.message}`)
    }
  }

  // Smart Routing — activate cheapest provider per package
  const allPackages = await sbSelect('global_packages', 'id', { is_active: 'eq.true' }, undefined, true, 1000)
  if (allPackages) {
    for (const pkg of allPackages) {
      const offers = await sbSelect('provider_products',
        'id, cost_price, stock_status',
        { global_package_id: `eq.${pkg.id}`, stock_status: 'eq.in_stock' },
        'cost_price', true, 50)
      if (offers && offers.length > 0) {
        const cheapest = offers[0]
        // Deactivate all, then activate the cheapest
        await sbUpdate('provider_products', { is_active_offer: false }, { global_package_id: `eq.${pkg.id}` })
        await sbUpdate('provider_products', { is_active_offer: true }, { id: `eq.${cheapest.id}` })
      }
    }
  }

  return json({ success: true, stats, synced_at: new Date().toISOString() })
}
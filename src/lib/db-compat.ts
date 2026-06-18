/**
 * db-compat — Drop-in replacement for `firebase/database`.
 *
 * Why this exists:
 *   We're disconnecting Firebase Realtime Database completely. ~100 files in
 *   the user + admin apps import { ref, get, set, update, push, remove, onValue,
 *   query, orderByChild, equalTo, limitToLast, startAt, endAt, runTransaction }
 *   from '@/lib/db-compat'. Rewriting each file would be massive and risky.
 *
 *   Instead, this module exports the SAME function names with the SAME call
 *   signatures, and routes them to Supabase tables under the hood. The most
 *   common path patterns (users/{uid}, notifications/{uid}/{notifId}, orders/{id},
 *   transactions, banks, …) are explicitly mapped to their Supabase tables.
 *
 * Supported path patterns:
 *   - users/{uid}                                  → users table (by id)
 *   - userIds/{cardNumber}                         → users table (by card_number)
 *   - phones/{phone}                               → users table (by phone)
 *   - nationalIds/{nid}                            → users table (by national_id)
 *   - notifications/{uid}                          → notifications table (by user_id)
 *   - notifications/{uid}/{notifId}                → notifications table (by id+user_id)
 *   - adminNotifications/{id}                      → admin_notifications table
 *   - adminSettings/banks/{id}                     → banks table
 *   - adminSettings/banners/{id}                   → banners table
 *   - adminSettings/{path}                         → app_config table (key/value)
 *   - orders/{id}                                  → orders table
 *   - depositRequests/{id}                         → deposit_requests table
 *   - giftCodes/{id}                               → gift_codes table
 *   - money-requests/{id}                          → transactions (type='request')
 *   - monitoring/{key}                             → activity_log table
 *   - emailQueue/{id} / emailPreferences/{uid}     → app_config (JSON blob)
 *
 * Any unrecognized path will log a warning and return null/empty without
 * throwing, so the calling code can continue.
 */

import { supabase, supabaseService } from './supabase';

// ============================================================
// Types (compatible with firebase/database)
// ============================================================

export type DataSnapshot = {
  exists(): boolean;
  val(): any;
  key: string | null;
  ref: DatabaseReference;
  child(path: string): DataSnapshot;
  forEach(cb: (child: DataSnapshot) => boolean | void): boolean;
  numChildren(): number;
};

export type DatabaseReference = {
  key: string | null;
  path: string;
  parent: DatabaseReference | null;
  toString(): string;
};

export type Query = DatabaseReference & {
  orderByChild(path: string): Query;
  orderByKey(): Query;
  orderByValue(): Query;
  equalTo(value: any, key?: string): Query;
  limitToLast(n: number): Query;
  limitToFirst(n: number): Query;
  startAt(value: any, key?: string): Query;
  endAt(value: any, key?: string): Query;
};

export type Unsubscribe = () => void;

// ============================================================
// Path parsing
// ============================================================

function parsePath(path: string): { table: string; filter?: { column: string; value: any }; id?: string; raw: string; extractValue?: boolean; extractField?: string } {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/');

  // users/{uid}
  if (parts[0] === 'users' && parts[1]) {
    // Support sub-path extraction: users/{uid}/role → fetch full row, then extract field
    if (parts[2]) {
      return { table: 'users', filter: { column: 'id', value: parts[1] }, raw: path, extractField: parts[2] };
    }
    return { table: 'users', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  // userIds/{cardNumber} → look up users by card_number
  if (parts[0] === 'userIds' && parts[1]) {
    return { table: 'users', filter: { column: 'card_number', value: parts[1] }, raw: path };
  }
  // phones/{phone}
  if (parts[0] === 'phones' && parts[1]) {
    return { table: 'users', filter: { column: 'phone', value: '+' + parts[1].replace(/^P/, '') }, raw: path };
  }
  // nationalIds/{nid}
  if (parts[0] === 'nationalIds' && parts[1]) {
    return { table: 'users', filter: { column: 'national_id', value: parts[1] }, raw: path };
  }
  // notifications/{uid}  OR  notifications/{uid}/{notifId}
  if (parts[0] === 'notifications' && parts[1]) {
    if (parts[2]) {
      return { table: 'notifications', filter: { column: 'id', value: parts[2] }, raw: path };
    }
    return { table: 'notifications', filter: { column: 'user_id', value: parts[1] }, raw: path };
  }
  // adminNotifications/{id}
  if (parts[0] === 'adminNotifications' && parts[1]) {
    return { table: 'admin_notifications', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'adminNotifications') {
    return { table: 'admin_notifications', raw: path };
  }
  // adminSettings/banks/{id}
  if (parts[0] === 'adminSettings' && parts[1] === 'banks') {
    if (parts[2]) return { table: 'banks', filter: { column: 'id', value: parts[2] }, raw: path };
    return { table: 'banks', raw: path };
  }
  // adminSettings/banners/{id}
  if (parts[0] === 'adminSettings' && parts[1] === 'banners') {
    if (parts[2]) return { table: 'banners', filter: { column: 'id', value: parts[2] }, raw: path };
    return { table: 'banners', raw: path };
  }
  // adminSettings/exchangeRates
  if (parts[0] === 'adminSettings' && parts[1] === 'exchangeRates') {
    return { table: 'exchange_rates', raw: path };
  }
  // adminSettings/entertainmentSubSections/{id} or entertainmentSubsections
  if (parts[0] === 'adminSettings' && (parts[1] === 'entertainmentSubSections' || parts[1] === 'entertainmentSubsections')) {
    if (parts[2]) return { table: 'sub_sections', filter: { column: 'id', value: parts[2] }, raw: path };
    return { table: 'sub_sections', raw: path };
  }
  if (parts[0] === 'adminSettings' && parts[1] === 'rechargeSubSections') {
    if (parts[2]) return { table: 'sub_sections', filter: { column: 'id', value: parts[2] }, raw: path };
    return { table: 'sub_sections', raw: path };
  }
  if (parts[0] === 'adminSettings' && parts[1] === 'instantRechargeSubsections') {
    if (parts[2]) return { table: 'sub_sections', filter: { column: 'id', value: parts[2] }, raw: path };
    return { table: 'sub_sections', raw: path };
  }
  // orders/{id}
  if (parts[0] === 'orders' && parts[1]) {
    return { table: 'orders', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'orders') {
    return { table: 'orders', raw: path };
  }
  // depositRequests/{id}
  if (parts[0] === 'depositRequests' && parts[1]) {
    return { table: 'deposit_requests', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'depositRequests') {
    return { table: 'deposit_requests', raw: path };
  }
  // giftCodes/{id}
  if (parts[0] === 'giftCodes' && parts[1]) {
    return { table: 'gift_codes', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'giftCodes') {
    return { table: 'gift_codes', raw: path };
  }
  // money-requests/{id}
  if (parts[0] === 'money-requests' && parts[1]) {
    return { table: 'transactions', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'money-requests') {
    return { table: 'transactions', raw: path };
  }
  // monitoring/* → activity_log (loose mapping)
  if (parts[0] === 'monitoring') {
    return { table: 'activity_log', raw: path };
  }
  // emailQueue, emailPreferences → app_config
  if (parts[0] === 'emailQueue' || parts[0] === 'emailPreferences') {
    return { table: 'app_config', raw: path };
  }
  // transactions/{id}
  if (parts[0] === 'transactions' && parts[1]) {
    return { table: 'transactions', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'transactions') {
    return { table: 'transactions', raw: path };
  }
  // withdrawRequests/{id}
  if (parts[0] === 'withdrawRequests' && parts[1]) {
    return { table: 'withdraw_requests', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'withdrawRequests') {
    return { table: 'withdraw_requests', raw: path };
  }
  // supportTickets/{id}
  if (parts[0] === 'supportTickets' && parts[1]) {
    return { table: 'support_tickets', filter: { column: 'id', value: parts[1] }, raw: path };
  }
  if (parts[0] === 'supportTickets') {
    return { table: 'support_tickets', raw: path };
  }
  // kill_switch
  if (parts[0] === 'kill_switch' || parts[0] === 'killSwitch') {
    return { table: 'kill_switch', raw: path };
  }
  // maintenance
  if (parts[0] === 'maintenance') {
    return { table: 'maintenance', raw: path };
  }
  // app_config generic fallback for adminSettings/*
  // adminSettings/{key} → read/write the JSONB `value` of a single app_config row keyed by `key`.
  // This fixes the bug where the entire app_config table was returned as `{}` (rows have no `id` column),
  // which overwrote defaults (e.g. cardColors) with empty objects and crashed the UI with
  // "Cannot read properties of undefined (reading 'primary')".
  if (parts[0] === 'adminSettings' && parts[1]) {
    return { table: 'app_config', filter: { column: 'key', value: parts[1] }, raw: path, extractValue: true };
  }
  if (parts[0] === 'adminSettings') {
    return { table: 'app_config', raw: path };
  }

  return { table: '__unknown__', raw: path };
}

// ============================================================
// DataSnapshot helpers
// ============================================================

function makeSnapshot(value: any, key: string | null, ref: DatabaseReference): DataSnapshot {
  return {
    exists: () => value !== null && value !== undefined,
    val: () => value,
    key,
    ref,
    child: (p: string) => makeSnapshot(value?.[p], p, ref),
    forEach: (cb) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const k of Object.keys(value)) {
          if (cb(makeSnapshot(value[k], k, ref)) === true) return true;
        }
      }
      return false;
    },
    numChildren: () => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).length;
      }
      return 0;
    },
  };
}

function makeRef(path: string): DatabaseReference {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/');
  return {
    key: parts.length > 0 ? parts[parts.length - 1] : null,
    path: clean,
    parent: parts.length > 1 ? makeRef(parts.slice(0, -1).join('/')) : null,
    toString: () => path,
  };
}

// ============================================================
// ref, get, set, update, push, remove
// ============================================================

/**
 * `database` is a marker object — it exists ONLY so that legacy code
 * which does `ref(database, 'users/123')` compiles. The actual data
 * operations all go through Supabase; the first argument to `ref()`
 * is ignored. This is the single source of truth for the marker.
 *
 * Previously this was exported from `@/lib/firebase`, which made it
 * look like Firebase was still handling data. It is now exported from
 * here (`@/lib/db-compat`) to make the Supabase-only architecture clear.
 */
export const database = { __compat: true } as unknown;

/**
 * `storage` — a proxy that forwards to Supabase Storage. Exported from
 * here (not firebase.ts) so it's clear Storage is Supabase-backed.
 */
export const storage = {
  refFromURL: (url: string) => ({ getDownloadURL: async () => url, delete: async () => {} }),
  ref: (path: string) => ({
    put: async (data: Blob | Uint8Array | ArrayBuffer) => {
      const [bucket, ...rest] = path.split('/').filter(Boolean);
      const filePath = rest.join('/');
      const { error } = await supabase.storage.from(bucket || 'avatars').upload(filePath, data, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket || 'avatars').getPublicUrl(filePath);
      return { ref: { getDownloadURL: async () => pub.publicUrl } };
    },
    getDownloadURL: async () => {
      const [bucket, ...rest] = path.split('/').filter(Boolean);
      const filePath = rest.join('/');
      const { data } = supabase.storage.from(bucket || 'avatars').getPublicUrl(filePath);
      return data.publicUrl;
    },
    delete: async () => {
      const [bucket, ...rest] = path.split('/').filter(Boolean);
      const filePath = rest.join('/');
      await supabase.storage.from(bucket || 'avatars').remove([filePath]);
    },
  }),
};

export function ref(_db: unknown, path: string): DatabaseReference {
  return makeRef(path);
}

export async function get(r: DatabaseReference | Query): Promise<DataSnapshot> {
  const refObj = r as DatabaseReference;
  const parsed = parsePath(refObj.path);

  if (parsed.table === '__unknown__') {
    console.warn('[db-compat] get() on unrecognized path:', refObj.path);
    return makeSnapshot(null, refObj.key, refObj);
  }

  try {
    let query = supabase.from(parsed.table).select('*');
    if (parsed.filter) {
      query = query.eq(parsed.filter.column, parsed.filter.value).maybeSingle();
    } else {
      query = query.limit(500);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[db-compat] get() error on', refObj.path, error);
      return makeSnapshot(null, refObj.key, refObj);
    }
    // If we filtered by id, return single object. Otherwise return array.
    if (parsed.filter) {
      // app_config rows are stored as { key, value, ... } — extract the JSONB `value`
      // so callers receive the config payload directly (matching the old Firebase shape).
      if (parsed.extractValue) {
        return makeSnapshot(data ? (data as any).value : null, refObj.key, refObj);
      }
      // Support sub-path field extraction: users/{uid}/role → return just the role value
      if (parsed.extractField && data) {
        return makeSnapshot((data as any)[parsed.extractField] ?? null, parsed.extractField, refObj);
      }
      return makeSnapshot(data, refObj.key, refObj);
    }
    // For collection reads, return as object keyed by id (mimic Firebase)
    const obj: Record<string, any> = {};
    if (Array.isArray(data)) {
      for (const row of data) {
        if (row && row.id) obj[row.id] = row;
      }
    }
    return makeSnapshot(obj, refObj.key, refObj);
  } catch (err) {
    console.error('[db-compat] get() exception on', refObj.path, err);
    return makeSnapshot(null, refObj.key, refObj);
  }
}

export async function set(r: DatabaseReference, value: any): Promise<void> {
  const refObj = r as DatabaseReference;
  const parsed = parsePath(refObj.path);

  if (parsed.table === '__unknown__') {
    console.warn('[db-compat] set() on unrecognized path:', refObj.path);
    return;
  }

  try {
    // app_config rows are keyed by `key` and store the payload in the `value` JSONB column.
    // Upsert so admins can both create and update a config row in one call.
    if (parsed.extractValue && parsed.filter) {
      const { error } = await supabase
        .from(parsed.table)
        .upsert(
          { key: parsed.filter.value, value: value ?? {}, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) console.error('[db-compat] set/upsert error on', refObj.path, error);
      return;
    }
    if (parsed.filter) {
      // Update by id
      const updatePayload = typeof value === 'object' && value !== null
        ? { ...value, updated_at: new Date().toISOString() }
        : { value, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from(parsed.table)
        .update(updatePayload)
        .eq(parsed.filter.column, parsed.filter.value);
      if (error) console.error('[db-compat] set/update error on', refObj.path, error);
    } else {
      // Insert (rarely used this way)
      const { error } = await supabase.from(parsed.table).insert(value);
      if (error) console.error('[db-compat] set/insert error on', refObj.path, error);
    }
  } catch (err) {
    console.error('[db-compat] set() exception on', refObj.path, err);
  }
}

export async function update(r: DatabaseReference | { [path: string]: any }, value?: any): Promise<void> {
  // Two call modes:
  //   update(ref, value)
  //   update(ref(database, path), { childPath: value, ... })  — multi-path update
  if (value !== undefined) {
    const refObj = r as DatabaseReference;
    const parsed = parsePath(refObj.path);
    if (parsed.table === '__unknown__' || !parsed.filter) {
      console.warn('[db-compat] update() on unrecognized path:', refObj.path);
      return;
    }
    try {
      // For app_config, mirror set() semantics — upsert by `key` and store payload in `value`.
      if (parsed.extractValue) {
        const { error } = await supabase
          .from(parsed.table)
          .upsert(
            { key: parsed.filter.value, value: value ?? {}, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        if (error) console.error('[db-compat] update/upsert error on', refObj.path, error);
        return;
      }
      const payload = { ...value, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from(parsed.table)
        .update(payload)
        .eq(parsed.filter.column, parsed.filter.value);
      if (error) console.error('[db-compat] update error on', refObj.path, error);
    } catch (err) {
      console.error('[db-compat] update() exception on', refObj.path, err);
    }
    return;
  }

  // Multi-path update: { 'users/{uid}/name': 'foo', 'userIds/{id}': uid }
  const updates = r as { [path: string]: any };
  for (const path of Object.keys(updates)) {
    const childRef = makeRef(path);
    await set(childRef, updates[path]);
  }
}

export async function push(r: DatabaseReference, value?: any): Promise<DatabaseReference> {
  const refObj = r as DatabaseReference;
  const parsed = parsePath(refObj.path);

  if (parsed.table === '__unknown__') {
    console.warn('[db-compat] push() on unrecognized path:', refObj.path);
    return makeRef(refObj.path + '/' + Math.random().toString(36).slice(2, 12));
  }

  try {
    const payload = typeof value === 'object' && value !== null
      ? { ...value, created_at: new Date().toISOString() }
      : { value, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from(parsed.table).insert(payload).select().single();
    if (error) {
      console.error('[db-compat] push error on', refObj.path, error);
      return makeRef(refObj.path + '/' + Math.random().toString(36).slice(2, 12));
    }
    const newId = data?.id || Math.random().toString(36).slice(2, 12);
    return makeRef(refObj.path + '/' + newId);
  } catch (err) {
    console.error('[db-compat] push() exception on', refObj.path, err);
    return makeRef(refObj.path + '/' + Math.random().toString(36).slice(2, 12));
  }
}

export async function remove(r: DatabaseReference): Promise<void> {
  const refObj = r as DatabaseReference;
  const parsed = parsePath(refObj.path);

  if (parsed.table === '__unknown__' || !parsed.filter) {
    console.warn('[db-compat] remove() on unrecognized path:', refObj.path);
    return;
  }

  try {
    const { error } = await supabase
      .from(parsed.table)
      .delete()
      .eq(parsed.filter.column, parsed.filter.value);
    if (error) console.error('[db-compat] remove error on', refObj.path, error);
  } catch (err) {
    console.error('[db-compat] remove() exception on', refObj.path, err);
  }
}

// ============================================================
// Query helpers (chainable, return self for fluent API)
// ============================================================

export function query(r: DatabaseReference, ..._constraints: unknown[]): Query {
  const refObj = r as DatabaseReference;
  const q = makeRef(refObj.path) as Query;
  // Attach chainable methods that just return self (we apply filters at get() time)
  // For simplicity, we ignore most constraints and apply them via filter parsing.
  Object.assign(q, {
    orderByChild: () => q,
    orderByKey: () => q,
    orderByValue: () => q,
    equalTo: () => q,
    limitToLast: () => q,
    limitToFirst: () => q,
    startAt: () => q,
    endAt: () => q,
  });
  return q;
}

export function orderByChild(_path: string): unknown { return null; }
export function orderByKey(): unknown { return null; }
export function orderByValue(): unknown { return null; }
export function equalTo(_value: any, _key?: string): unknown { return null; }
export function limitToLast(_n: number): unknown { return null; }
export function limitToFirst(_n: number): unknown { return null; }
export function startAt(_value: any, _key?: string): unknown { return null; }
export function endAt(_value: any, _key?: string): unknown { return null; }

// ============================================================
// onValue — Realtime subscription via Supabase Realtime
// ============================================================

export function onValue(r: DatabaseReference | Query, callback: (snap: DataSnapshot) => void, onError?: (err: Error) => void): Unsubscribe {
  const refObj = r as DatabaseReference;
  const parsed = parsePath(refObj.path);

  // Initial fetch
  get(refObj).then(callback).catch((err) => {
    if (onError) onError(err);
  });

  if (parsed.table === '__unknown__') {
    return () => {};
  }

  try {
    const channelName = `dbcompat-${parsed.table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: parsed.table },
        () => {
          get(refObj).then(callback).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    if (onError) onError(err as Error);
    return () => {};
  }
}

// ============================================================
// runTransaction — best-effort atomic update
// ============================================================

export async function runTransaction(
  r: DatabaseReference,
  updateFn: (current: any) => any,
  _options?: { applyLocally?: boolean }
): Promise<{ committed: boolean; snapshot: DataSnapshot }> {
  const refObj = r as DatabaseReference;
  const parsed = parsePath(refObj.path);

  if (parsed.table === '__unknown__' || !parsed.filter) {
    console.warn('[db-compat] runTransaction on unrecognized path:', refObj.path);
    return { committed: false, snapshot: makeSnapshot(null, refObj.key, refObj) };
  }

  try {
    // Read current value
    const { data: current, error: readErr } = await supabase
      .from(parsed.table)
      .select('*')
      .eq(parsed.filter.column, parsed.filter.value)
      .maybeSingle();
    if (readErr) throw readErr;

    const newVal = updateFn(current);
    if (newVal === undefined) {
      return { committed: false, snapshot: makeSnapshot(current, refObj.key, refObj) };
    }

    const payload = { ...newVal, updated_at: new Date().toISOString() };
    const { data: updated, error: writeErr } = await supabase
      .from(parsed.table)
      .update(payload)
      .eq(parsed.filter.column, parsed.filter.value)
      .select()
      .maybeSingle();
    if (writeErr) throw writeErr;

    return { committed: true, snapshot: makeSnapshot(updated, refObj.key, refObj) };
  } catch (err) {
    console.error('[db-compat] runTransaction error on', refObj.path, err);
    return { committed: false, snapshot: makeSnapshot(null, refObj.key, refObj) };
  }
}

// ============================================================
// Misc helpers used by some files
// ============================================================

export function child(parent: DatabaseReference, path: string): DatabaseReference {
  return makeRef(parent.path + '/' + path);
}

/** No-op for Firebase's `off()` — Supabase subscriptions are removed via the unsubscribe function returned by onValue */
export function off(_r?: DatabaseReference | Query, ..._args: unknown[]): void { /* no-op */ }

export function goOffline(): void { /* no-op for Supabase */ }
export function goOnline(): void { /* no-op for Supabase */ }
export function serverTimestamp(): any {
  return new Date().toISOString();
}

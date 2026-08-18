import { supabase } from './supabaseClient'
import type { Repository, AuthState, Member, Role, JoinResult, HouseholdInfo } from './repo'
import type { Recipe, PantryItem, ShoppingListItem, ActivityPing, ShareLink, HouseholdSettings } from '../db/types'
import { DEFAULT_CATEGORIES } from '../db/types'

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'mitglied'
}

function emailFor(joinCode: string, name: string): string {
  return `${joinCode.toLowerCase()}.${slugify(name)}@household.meine-rezepte.app`
}

function randomJoinCode(): string {
  // Ohne verwechselbare Zeichen (0/O, 1/I/l)
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

function friendlyAuthError(message: string): string {
  if (/confirm/i.test(message)) {
    return 'E-Mail-Bestätigung ist in deinem Supabase-Projekt noch aktiv. Bitte in Supabase unter Authentication → Providers → Email die Option "Confirm email" deaktivieren (siehe SETUP.md, Schritt 5).'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Name oder PIN ist falsch – oder du bist diesem Haushalt noch nicht beigetreten (dann "Beitreten" statt "Anmelden" verwenden).'
  }
  if (/already registered|user already exists/i.test(message)) {
    return 'Dieser Name ist in diesem Haushalt bereits vergeben. Falls das du bist, nutze "Anmelden".'
  }
  if (/password/i.test(message) && /least|characters/i.test(message)) {
    return 'Der PIN muss mindestens 6 Zeichen haben.'
  }
  return message
}

interface Ctx {
  userId: string
  householdId: string
  household: HouseholdInfo
  role: Role
  memberName: string
}

/**
 * Verbunden-Modus: Daten liegen in Supabase (Postgres), synchronisiert über
 * alle Geräte der Haushalts-Mitglieder. Zugriff & Rechte werden zusätzlich
 * serverseitig per Row-Level-Security abgesichert (siehe supabase/schema.sql).
 */
export class SupabaseRepository implements Repository {
  mode: 'cloud' = 'cloud'
  private ctxPromise: Promise<Ctx | null> | null = null

  private sb() {
    if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
    return supabase
  }

  private invalidateCtx() {
    this.ctxPromise = null
  }

  private async loadCtx(): Promise<Ctx | null> {
    const sb = this.sb()
    const { data: sessionData } = await sb.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return null

    const { data: memberRow, error: memberErr } = await sb
      .from('household_members')
      .select('id, household_id, display_name, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (memberErr || !memberRow) return null

    const { data: householdRow, error: hhErr } = await sb
      .from('households')
      .select('id, name, join_code')
      .eq('id', memberRow.household_id)
      .maybeSingle()
    if (hhErr || !householdRow) return null

    return {
      userId: user.id,
      householdId: memberRow.household_id,
      household: { id: householdRow.id, name: householdRow.name, joinCode: householdRow.join_code },
      role: memberRow.role as Role,
      memberName: memberRow.display_name,
    }
  }

  private ctx(): Promise<Ctx | null> {
    if (!this.ctxPromise) this.ctxPromise = this.loadCtx()
    return this.ctxPromise
  }

  private async requireCtx(): Promise<Ctx> {
    const c = await this.ctx()
    if (!c) throw new Error('Nicht angemeldet.')
    return c
  }

  async getAuthState(): Promise<AuthState> {
    const c = await this.ctx()
    if (!c) {
      return { cloudConfigured: true, loggedIn: false, household: null, currentRole: 'viewer', currentMemberName: null }
    }
    return {
      cloudConfigured: true,
      loggedIn: true,
      household: c.household,
      currentRole: c.role,
      currentMemberName: c.memberName,
    }
  }

  async createHousehold(householdName: string, yourName: string, pin: string): Promise<JoinResult> {
    const sb = this.sb()
    if (!householdName.trim() || !yourName.trim()) return { ok: false, error: 'Bitte Haushaltsname und deinen Namen angeben.' }

    for (let attempt = 0; attempt < 5; attempt++) {
      const joinCode = randomJoinCode()
      const email = emailFor(joinCode, yourName)
      const { data: signUpData, error: signUpErr } = await sb.auth.signUp({ email, password: pin })
      if (signUpErr) return { ok: false, error: friendlyAuthError(signUpErr.message) }
      if (!signUpData.session) {
        return { ok: false, error: friendlyAuthError('confirm email required') }
      }

      const { data: hh, error: hhErr } = await sb
        .from('households')
        .insert({ name: householdName.trim(), join_code: joinCode, owner_user_id: signUpData.user!.id })
        .select('id')
        .single()

      if (hhErr) {
        if ((hhErr as { code?: string }).code === '23505') continue // join_code Kollision, erneut versuchen
        return { ok: false, error: hhErr.message }
      }

      const { error: memberErr } = await sb.from('household_members').insert({
        household_id: hh.id,
        user_id: signUpData.user!.id,
        display_name: yourName.trim(),
        role: 'owner',
      })
      if (memberErr) return { ok: false, error: memberErr.message }

      this.invalidateCtx()
      return { ok: true }
    }
    return { ok: false, error: 'Beitritts-Code konnte nicht erzeugt werden, bitte erneut versuchen.' }
  }

  async joinHousehold(joinCode: string, yourName: string, pin: string): Promise<JoinResult> {
    const sb = this.sb()
    const code = joinCode.trim().toUpperCase()
    if (!code || !yourName.trim()) return { ok: false, error: 'Bitte Beitritts-Code und Namen angeben.' }

    const { data: hh, error: hhErr } = await sb.from('households').select('id, name, join_code').eq('join_code', code).maybeSingle()
    if (hhErr) return { ok: false, error: hhErr.message }
    if (!hh) return { ok: false, error: 'Kein Haushalt mit diesem Code gefunden. Bitte Code beim Besitzer prüfen.' }

    const { data: available, error: availErr } = await sb.rpc('display_name_available', { hid: hh.id, wanted_name: yourName.trim() })
    if (availErr) return { ok: false, error: availErr.message }
    if (!available) return { ok: false, error: 'Dieser Name ist in diesem Haushalt schon vergeben. Falls du das bist, nutze "Anmelden".' }

    const email = emailFor(code, yourName)
    const { data: signUpData, error: signUpErr } = await sb.auth.signUp({ email, password: pin })
    if (signUpErr) return { ok: false, error: friendlyAuthError(signUpErr.message) }
    if (!signUpData.session) return { ok: false, error: friendlyAuthError('confirm email required') }

    const { error: memberErr } = await sb.from('household_members').insert({
      household_id: hh.id,
      user_id: signUpData.user!.id,
      display_name: yourName.trim(),
      role: 'viewer',
    })
    if (memberErr) return { ok: false, error: memberErr.message }

    this.invalidateCtx()
    return { ok: true }
  }

  async loginExistingMember(joinCode: string, yourName: string, pin: string): Promise<JoinResult> {
    const sb = this.sb()
    const code = joinCode.trim().toUpperCase()
    const email = emailFor(code, yourName)
    const { error } = await sb.auth.signInWithPassword({ email, password: pin })
    if (error) return { ok: false, error: friendlyAuthError(error.message) }
    this.invalidateCtx()
    return { ok: true }
  }

  async logout(): Promise<void> {
    await this.sb().auth.signOut()
    this.invalidateCtx()
  }

  async listMembers(): Promise<Member[]> {
    const c = await this.requireCtx()
    const { data, error } = await this.sb()
      .from('household_members')
      .select('id, display_name, role, user_id')
      .eq('household_id', c.householdId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((m) => ({
      id: m.id,
      displayName: m.display_name,
      role: m.role as Role,
      isYou: m.user_id === c.userId,
    }))
  }

  async setMemberRole(memberId: string, role: Role): Promise<void> {
    const { error } = await this.sb().from('household_members').update({ role }).eq('id', memberId)
    if (error) throw error
  }

  async removeMember(memberId: string): Promise<void> {
    const { error } = await this.sb().from('household_members').delete().eq('id', memberId)
    if (error) throw error
  }

  async updateDisplayName(name: string): Promise<JoinResult> {
    const { error } = await this.sb().rpc('update_my_display_name', { new_name: name.trim() })
    if (error) return { ok: false, error: friendlyAuthError(error.message) }
    this.invalidateCtx()
    return { ok: true }
  }

  async listRecipes(): Promise<Recipe[]> {
    const c = await this.requireCtx()
    const { data, error } = await this.sb().from('recipes').select('*').eq('household_id', c.householdId).order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(rowToRecipe)
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const { data, error } = await this.sb().from('recipes').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToRecipe(data) : undefined
  }

  async saveRecipe(recipe: Recipe): Promise<void> {
    const c = await this.requireCtx()
    const row = recipeToRow(recipe, c.householdId, c.userId)
    const { error } = await this.sb().from('recipes').upsert(row)
    if (error) throw error
  }

  async deleteRecipe(id: string): Promise<void> {
    const { error } = await this.sb().from('recipes').delete().eq('id', id)
    if (error) throw error
  }

  async listPantry(): Promise<PantryItem[]> {
    const c = await this.requireCtx()
    const { data, error } = await this.sb().from('pantry_items').select('*').eq('household_id', c.householdId).order('name', { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToPantry)
  }

  async savePantryItem(item: PantryItem): Promise<void> {
    const c = await this.requireCtx()
    const { error } = await this.sb().from('pantry_items').upsert(pantryToRow(item, c.householdId))
    if (error) throw error
  }

  async deletePantryItem(id: string): Promise<void> {
    const { error } = await this.sb().from('pantry_items').delete().eq('id', id)
    if (error) throw error
  }

  async listShoppingList(): Promise<ShoppingListItem[]> {
    const c = await this.requireCtx()
    const { data, error } = await this.sb().from('shopping_list_items').select('*').eq('household_id', c.householdId).order('added_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToShopping)
  }

  async saveShoppingItem(item: ShoppingListItem): Promise<void> {
    const c = await this.requireCtx()
    const { error } = await this.sb().from('shopping_list_items').upsert(shoppingToRow(item, c.householdId))
    if (error) throw error
  }

  async deleteShoppingItem(id: string): Promise<void> {
    const { error } = await this.sb().from('shopping_list_items').delete().eq('id', id)
    if (error) throw error
  }

  subscribeToChanges(cb: () => void): () => void {
    let unsub = () => {}
    this.ctx().then((c) => {
      if (!c) return
      const channel = this.sb()
        .channel(`household-${c.householdId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes', filter: `household_id=eq.${c.householdId}` }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pantry_items', filter: `household_id=eq.${c.householdId}` }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `household_id=eq.${c.householdId}` }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${c.householdId}` }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_pings', filter: `household_id=eq.${c.householdId}` }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'household_settings', filter: `household_id=eq.${c.householdId}` }, cb)
        .subscribe()
      unsub = () => {
        this.sb().removeChannel(channel)
      }
    })
    return () => unsub()
  }

  async getSettings(): Promise<HouseholdSettings> {
    const c = await this.requireCtx()
    const { data, error } = await this.sb().from('household_settings').select('*').eq('household_id', c.householdId).maybeSingle()
    if (error) throw error
    return {
      logoDataUrl: data?.logo_data_url ?? null,
      extraCategories: data?.extra_categories ?? [],
      hiddenDefaultCategories: data?.hidden_default_categories ?? [],
    }
  }

  private async upsertSettingsPatch(patch: Record<string, unknown>) {
    const c = await this.requireCtx()
    const current = await this.getSettings()
    const { error } = await this.sb()
      .from('household_settings')
      .upsert({
        household_id: c.householdId,
        logo_data_url: current.logoDataUrl,
        extra_categories: current.extraCategories,
        hidden_default_categories: current.hiddenDefaultCategories,
        ...patch,
      })
    if (error) throw error
  }

  async setLogo(dataUrl: string | null): Promise<void> {
    await this.upsertSettingsPatch({ logo_data_url: dataUrl })
  }

  async addCategory(name: string): Promise<void> {
    const current = await this.getSettings()
    if (DEFAULT_CATEGORIES.includes(name)) {
      // Eine ausgeblendete Standard-Kategorie erneut anlegen -> wieder einblenden.
      await this.upsertSettingsPatch({ hidden_default_categories: current.hiddenDefaultCategories.filter((c) => c !== name) })
      return
    }
    if (current.extraCategories.includes(name)) return
    await this.upsertSettingsPatch({ extra_categories: [...current.extraCategories, name] })
  }

  async removeCategory(name: string): Promise<void> {
    const current = await this.getSettings()
    if (DEFAULT_CATEGORIES.includes(name)) {
      if (current.hiddenDefaultCategories.includes(name)) return
      await this.upsertSettingsPatch({ hidden_default_categories: [...current.hiddenDefaultCategories, name] })
      return
    }
    await this.upsertSettingsPatch({ extra_categories: current.extraCategories.filter((c) => c !== name) })
  }

  async listActivity(): Promise<ActivityPing[]> {
    const c = await this.requireCtx()
    const { data, error } = await this.sb()
      .from('recipe_pings')
      .select('id, recipe_id, kind, from_member_id, to_member_id, note, created_at, recipes(title), from:from_member_id(display_name), to:to_member_id(display_name)')
      .eq('household_id', c.householdId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      recipeTitle: row.recipes?.title,
      kind: row.kind,
      fromMemberId: row.from_member_id,
      fromMemberName: row.from?.display_name,
      toMemberId: row.to_member_id,
      toMemberName: row.to?.display_name,
      note: row.note ?? undefined,
      createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    }))
  }

  async pingRecipe(recipeId: string, toMemberId: string | null, note: string): Promise<void> {
    const c = await this.requireCtx()
    const { data: memberRow } = await this.sb().from('household_members').select('id').eq('user_id', c.userId).single()
    const { error } = await this.sb().from('recipe_pings').insert({
      household_id: c.householdId,
      recipe_id: recipeId,
      kind: 'ping',
      from_member_id: memberRow!.id,
      to_member_id: toMemberId,
      note: note || null,
    })
    if (error) throw error
    await this.sendPushForPing(recipeId, toMemberId, note)
  }

  async announceNewRecipe(recipeId: string): Promise<void> {
    const c = await this.requireCtx()
    const { data: memberRow } = await this.sb().from('household_members').select('id').eq('user_id', c.userId).single()
    const { error } = await this.sb().from('recipe_pings').insert({
      household_id: c.householdId,
      recipe_id: recipeId,
      kind: 'new_recipe',
      from_member_id: memberRow!.id,
      to_member_id: null,
    })
    if (error) throw error
  }

  private async sendPushForPing(recipeId: string, toMemberId: string | null, note: string) {
    // Best-effort: die Zustellung übernimmt primär der Database-Webhook auf
    // recipe_pings (siehe SETUP.md). Dieser Aufruf ist ein zusätzlicher,
    // synchroner Versuch, falls kein Webhook eingerichtet ist.
    try {
      await this.sb().functions.invoke('send-push', { body: { recipeId, toMemberId, note } })
    } catch {
      /* Webhook übernimmt es ggf. bereits, oder Funktion ist noch nicht deployt */
    }
  }

  async createShareLink(recipeId: string): Promise<ShareLink> {
    const c = await this.requireCtx()
    const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
    const { data, error } = await this.sb()
      .from('recipe_share_links')
      .insert({ token, recipe_id: recipeId, household_id: c.householdId, created_by: c.userId })
      .select('*')
      .single()
    if (error) throw error
    return { id: data.id, token: data.token, recipeId: data.recipe_id, viewCount: data.view_count, createdAt: Date.parse(data.created_at) }
  }

  async listShareLinks(recipeId: string): Promise<ShareLink[]> {
    const { data, error } = await this.sb().from('recipe_share_links').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: false })
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((d: any) => ({ id: d.id, token: d.token, recipeId: d.recipe_id, viewCount: d.view_count, createdAt: Date.parse(d.created_at) }))
  }

  async revokeShareLink(id: string): Promise<void> {
    const { error } = await this.sb().from('recipe_share_links').delete().eq('id', id)
    if (error) throw error
  }

  isPushSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  }

  async isPushSubscribed(): Promise<boolean> {
    if (!this.isPushSupported()) return false
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub)
  }

  async subscribeToPush(): Promise<JoinResult> {
    if (!this.isPushSupported()) return { ok: false, error: 'Push-Benachrichtigungen werden von diesem Browser/Gerät nicht unterstützt, oder es fehlt der VAPID-Schlüssel in der Konfiguration.' }
    const c = await this.requireCtx()
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, error: 'Berechtigung für Benachrichtigungen wurde nicht erteilt.' }
    const reg = await navigator.serviceWorker.ready
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
    const json = sub.toJSON()
    const { data: memberRow } = await this.sb().from('household_members').select('id').eq('user_id', c.userId).single()
    const { error } = await this.sb().from('push_subscriptions').upsert(
      {
        household_id: c.householdId,
        member_id: memberRow!.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth_key: json.keys!.auth,
      },
      { onConflict: 'endpoint' },
    )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  async unsubscribeFromPush(): Promise<void> {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await this.sb().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

/** Öffentlich, ohne Login abrufbar – für /teilen/:token Seiten. */
export async function getSharedRecipePublic(token: string): Promise<Recipe | undefined> {
  if (!supabase) return undefined
  const { data, error } = await supabase.rpc('get_shared_recipe', { share_token: token })
  if (error || !data || data.length === 0) return undefined
  return rowToRecipe(data[0])
}

// ---- Mapping-Helfer zwischen DB-Zeilen (snake_case) und App-Typen ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    cuisine: row.cuisine ?? undefined,
    tags: row.tags ?? [],
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
    cookTimeMinutes: row.cook_time_minutes ?? undefined,
    servings: row.servings ?? undefined,
    difficulty: row.difficulty ?? undefined,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    images: row.images ?? [],
    links: row.links ?? [],
    sourceUrl: row.source_url ?? undefined,
    favorite: row.favorite ?? false,
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  }
}

function recipeToRow(r: Recipe, householdId: string, userId: string) {
  return {
    id: r.id,
    household_id: householdId,
    title: r.title,
    description: r.description ?? null,
    category: r.category,
    cuisine: r.cuisine ?? null,
    tags: r.tags,
    prep_time_minutes: r.prepTimeMinutes ?? null,
    cook_time_minutes: r.cookTimeMinutes ?? null,
    servings: r.servings ?? null,
    difficulty: r.difficulty ?? null,
    ingredients: r.ingredients,
    steps: r.steps,
    images: r.images,
    links: r.links,
    source_url: r.sourceUrl ?? null,
    favorite: r.favorite,
    created_by: userId,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPantry(row: any): PantryItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit ?? '',
    category: row.category ?? '',
    expiryDate: row.expiry_date ?? undefined,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  }
}

function pantryToRow(p: PantryItem, householdId: string) {
  return {
    id: p.id,
    household_id: householdId,
    name: p.name,
    quantity: p.quantity,
    unit: p.unit || null,
    category: p.category || null,
    expiry_date: p.expiryDate || null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToShopping(row: any): ShoppingListItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit ?? '',
    checked: row.checked,
    fromRecipeIds: row.from_recipe_ids ?? [],
    addedAt: row.added_at ? Date.parse(row.added_at) : Date.now(),
  }
}

function shoppingToRow(s: ShoppingListItem, householdId: string) {
  return {
    id: s.id,
    household_id: householdId,
    name: s.name,
    quantity: s.quantity,
    unit: s.unit || null,
    checked: s.checked,
    from_recipe_ids: s.fromRecipeIds,
  }
}

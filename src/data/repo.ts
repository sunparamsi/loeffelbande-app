import type { Recipe, ShoppingListItem, ActivityPing, ShareLink, HouseholdSettings } from '../db/types'

export type Role = 'owner' | 'editor' | 'viewer'

export interface Member {
  id: string
  displayName: string
  role: Role
  isYou: boolean
}

export interface HouseholdInfo {
  id: string
  name: string
  joinCode: string
}

export interface AuthState {
  /** Ob überhaupt eine Cloud-Verbindung konfiguriert ist */
  cloudConfigured: boolean
  loggedIn: boolean
  household: HouseholdInfo | null
  currentRole: Role
  currentMemberName: string | null
  /** Stabile Kennung der aktuell angemeldeten Person (Cloud: auth-User-ID,
   * Solo: fester 'solo'-Wert) – zum Abgleich mit Recipe.createdByUserId für
   * Bearbeitungsrecht und den "Nur meine"-Filter. */
  currentUserId: string | null
}

export type JoinResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Gemeinsame Schnittstelle für Solo-Modus (lokal, IndexedDB) und
 * Verbunden-Modus (Supabase-Cloud). Die UI kennt nur dieses Interface,
 * dadurch funktioniert dieselbe Oberfläche in beiden Modi.
 */
export interface Repository {
  mode: 'local' | 'cloud'

  getAuthState(): Promise<AuthState>
  createHousehold(householdName: string, yourName: string, pin: string): Promise<JoinResult>
  joinHousehold(joinCode: string, yourName: string, pin: string): Promise<JoinResult>
  loginExistingMember(joinCode: string, yourName: string, pin: string): Promise<JoinResult>
  logout(): Promise<void>

  listMembers(): Promise<Member[]>
  setMemberRole(memberId: string, role: Role): Promise<void>
  removeMember(memberId: string): Promise<void>
  /** Ändert den eigenen Anzeigenamen (im Solo-Modus nur lokal auf diesem Gerät). */
  updateDisplayName(name: string): Promise<JoinResult>

  listRecipes(): Promise<Recipe[]>
  getRecipe(id: string): Promise<Recipe | undefined>
  saveRecipe(recipe: Recipe): Promise<void>
  deleteRecipe(id: string): Promise<void>

  listShoppingList(): Promise<ShoppingListItem[]>
  saveShoppingItem(item: ShoppingListItem): Promise<void>
  deleteShoppingItem(id: string): Promise<void>

  /** Registriert einen Live-Update-Listener (nur im Cloud-Modus aktiv). Gibt eine Unsubscribe-Funktion zurück. */
  subscribeToChanges(cb: () => void): () => void

  getSettings(): Promise<HouseholdSettings>
  setLogo(dataUrl: string | null): Promise<void>
  addCategory(name: string): Promise<void>
  removeCategory(name: string): Promise<void>

  listActivity(): Promise<ActivityPing[]>
  pingRecipe(recipeId: string, toMemberId: string | null, note: string): Promise<void>
  announceNewRecipe(recipeId: string): Promise<void>

  createShareLink(recipeId: string): Promise<ShareLink>
  listShareLinks(recipeId: string): Promise<ShareLink[]>
  revokeShareLink(id: string): Promise<void>

  /** Web-Push abonnieren/abbestellen (nur Cloud-Modus, no-op lokal). */
  isPushSupported(): boolean
  isPushSubscribed(): Promise<boolean>
  subscribeToPush(): Promise<JoinResult>
  unsubscribeFromPush(): Promise<void>
}

/** Öffentlich, ohne Login abrufbar – für /teilen/:token Seiten (nur Cloud-Modus sinnvoll). */
export interface PublicRepository {
  getSharedRecipe(token: string): Promise<Recipe | undefined>
}

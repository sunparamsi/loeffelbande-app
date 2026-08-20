import { localDb } from './db'
import type { Repository, AuthState, Member, JoinResult } from './repo'
import type { Recipe, ShoppingListItem, ActivityPing, ShareLink, HouseholdSettings } from '../db/types'
import { DEFAULT_CATEGORIES } from '../db/types'
import { getSoloDisplayName, setSoloDisplayName } from '../lib/prefs'

const SETTINGS_KEY = 'meine-rezepte-settings-v1'
const DEFAULT_SETTINGS: HouseholdSettings = { logoDataUrl: null, extraCategories: [], hiddenDefaultCategories: [] }

function readSettings(): HouseholdSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    // Älter gespeicherte Settings (vor Einführung von hiddenDefaultCategories)
    // per Spread mit den Defaults auffüllen, statt an fehlendem Feld zu scheitern.
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS }
}

function writeSettings(s: HouseholdSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

/**
 * Solo-Modus: alle Daten liegen ausschließlich lokal im Browser (IndexedDB).
 * Kein Account nötig, funktioniert offline. Keine Mitglieder/Rollen - du bist
 * immer "owner" auf deinem eigenen Gerät.
 */
export class LocalRepository implements Repository {
  mode: 'local' = 'local'

  async getAuthState(): Promise<AuthState> {
    return {
      cloudConfigured: false,
      loggedIn: true,
      household: null,
      currentRole: 'owner',
      currentMemberName: getSoloDisplayName(),
      currentUserId: 'solo',
    }
  }

  async createHousehold(): Promise<JoinResult> {
    return { ok: false, error: 'Im Solo-Modus nicht verfügbar. Bitte Cloud-Modus einrichten (siehe SETUP.md).' }
  }
  async joinHousehold(): Promise<JoinResult> {
    return { ok: false, error: 'Im Solo-Modus nicht verfügbar.' }
  }
  async loginExistingMember(): Promise<JoinResult> {
    return { ok: false, error: 'Im Solo-Modus nicht verfügbar.' }
  }
  async logout(): Promise<void> {}

  async listMembers(): Promise<Member[]> {
    return []
  }
  async setMemberRole(): Promise<void> {}
  async removeMember(): Promise<void> {}
  async updateDisplayName(name: string): Promise<JoinResult> {
    if (!name.trim()) return { ok: false, error: 'Bitte einen Namen angeben.' }
    setSoloDisplayName(name.trim())
    return { ok: true }
  }

  async listRecipes(): Promise<Recipe[]> {
    return localDb.recipes.orderBy('updatedAt').reverse().toArray()
  }
  async getRecipe(id: string): Promise<Recipe | undefined> {
    return localDb.recipes.get(id)
  }
  async saveRecipe(recipe: Recipe): Promise<void> {
    await localDb.recipes.put(recipe)
  }
  async deleteRecipe(id: string): Promise<void> {
    await localDb.recipes.delete(id)
  }

  async listShoppingList(): Promise<ShoppingListItem[]> {
    return localDb.shoppingListItems.orderBy('addedAt').toArray()
  }
  async saveShoppingItem(item: ShoppingListItem): Promise<void> {
    await localDb.shoppingListItems.put(item)
  }
  async deleteShoppingItem(id: string): Promise<void> {
    await localDb.shoppingListItems.delete(id)
  }

  subscribeToChanges(): () => void {
    // Im Solo-Modus gibt es nur ein Gerät, daher kein Live-Sync nötig.
    return () => {}
  }

  async getSettings(): Promise<HouseholdSettings> {
    return readSettings()
  }
  async setLogo(dataUrl: string | null): Promise<void> {
    const s = readSettings()
    s.logoDataUrl = dataUrl
    writeSettings(s)
  }
  async addCategory(name: string): Promise<void> {
    const s = readSettings()
    if (DEFAULT_CATEGORIES.includes(name)) {
      // Eine ausgeblendete Standard-Kategorie erneut anlegen -> wieder einblenden.
      s.hiddenDefaultCategories = s.hiddenDefaultCategories.filter((c) => c !== name)
    } else if (!s.extraCategories.includes(name)) {
      s.extraCategories.push(name)
    }
    writeSettings(s)
  }
  async removeCategory(name: string): Promise<void> {
    const s = readSettings()
    if (DEFAULT_CATEGORIES.includes(name)) {
      // Standard-Kategorien können nicht komplett gelöscht werden (fest im
      // Code), aber ausgeblendet, damit sie in der Auswahl nicht mehr auftauchen.
      if (!s.hiddenDefaultCategories.includes(name)) s.hiddenDefaultCategories.push(name)
    } else {
      s.extraCategories = s.extraCategories.filter((c) => c !== name)
    }
    writeSettings(s)
  }

  async listActivity(): Promise<ActivityPing[]> {
    // Aktivitäts-Feed ergibt nur mit mehreren Haushaltsmitgliedern Sinn (Cloud-Modus).
    return []
  }
  async pingRecipe(): Promise<void> {
    throw new Error('„Markieren" ist nur im Verbunden-Modus verfügbar, da es andere Haushaltsmitglieder voraussetzt.')
  }
  async announceNewRecipe(): Promise<void> {}

  async createShareLink(): Promise<ShareLink> {
    throw new Error('Teilen-Links sind nur im Verbunden-Modus verfügbar, da dafür ein Server nötig ist, der den Link auch ohne dein Gerät ausliefert.')
  }
  async listShareLinks(): Promise<ShareLink[]> {
    return []
  }
  async revokeShareLink(): Promise<void> {}

  isPushSupported(): boolean {
    return false
  }
  async isPushSubscribed(): Promise<boolean> {
    return false
  }
  async subscribeToPush(): Promise<JoinResult> {
    return { ok: false, error: 'Push-Benachrichtigungen setzen den Verbunden-Modus voraus.' }
  }
  async unsubscribeFromPush(): Promise<void> {}
}

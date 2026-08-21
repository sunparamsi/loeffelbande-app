import { getThemePref } from './prefs'

/** Setzt (oder entfernt) das data-theme-Attribut auf <html> passend zur
 * gespeicherten Präferenz - siehe index.css für die dazugehörigen
 * CSS-Variablen-Overrides. Bei "system" wird das Attribut entfernt, dann
 * entscheidet allein prefers-color-scheme (die Betriebssystem-Einstellung).
 * Wird zweimal aufgerufen: einmal ganz früh als Inline-Script in index.html
 * (verhindert ein kurzes Aufblitzen des falschen Thema beim Laden, bevor
 * React überhaupt initialisiert ist) und hier erneut, damit ein Wechsel der
 * Einstellung zur Laufzeit (siehe SettingsPage.tsx) sofort sichtbar wird. */
export function applyThemePref() {
  const pref = getThemePref()
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

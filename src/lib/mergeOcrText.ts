/**
 * Führt den erkannten Text mehrerer Fotos (z. B. mehrere Screenshots/Fotos
 * desselben Rezepts) zu einem Text zusammen. Entfernt dabei exakt doppelte
 * Zeilen (z. B. weil sich zwei Fotos überlappen oder ein Titel/Header auf
 * jedem Screenshot erneut zu sehen ist) – bei erster Vorkommnis behalten,
 * spätere Duplikate übersprungen. Groß-/Kleinschreibung und mehrfache
 * Leerzeichen werden beim Vergleich ignoriert. Kein Anspruch, auch
 * unterschiedlich erkannte (aber inhaltlich gleiche) Zeilen zu erkennen –
 * dafür gibt's die Prüfen-Ansicht zum manuellen Nacharbeiten danach.
 */
export function mergeOcrTexts(texts: string[]): string {
  const seen = new Set<string>()
  const outLines: string[] = []
  for (const text of texts) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    for (const line of lines) {
      const key = line.toLowerCase().replace(/\s+/g, ' ')
      if (seen.has(key)) continue
      seen.add(key)
      outLines.push(line)
    }
  }
  return outLines.join('\n')
}

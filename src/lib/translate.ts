/** Ruft die serverseitige Netlify-Funktion auf, die Texte über DeepL
 * übersetzt (die DeepL-API kann nicht direkt aus dem Browser aufgerufen
 * werden – CORS ist dort bewusst gesperrt, siehe netlify/functions/translate.js). */
export interface TranslateResult {
  translations: string[]
  detectedLang: string | null
}

export async function translateTexts(texts: string[], targetLang = 'DE'): Promise<TranslateResult> {
  const res = await fetch('/.netlify/functions/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, targetLang }),
  })
  if (!res.ok) {
    let message = 'Übersetzung fehlgeschlagen.'
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* ignorieren, Fallback-Meldung bleibt */
    }
    throw new Error(message)
  }
  return res.json()
}

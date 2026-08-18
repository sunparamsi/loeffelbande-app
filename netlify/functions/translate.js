// Netlify Function: übersetzt Texte serverseitig über die DeepL-API.
//
// Läuft NUR auf dem Server (Netlify), nicht im Browser – so bleibt der
// DeepL-API-Key geheim (die DeepL-API erlaubt ohnehin keine direkten
// Aufrufe aus dem Browser, siehe https://developers.deepl.com/docs/best-practices/cors-requests).
//
// Benötigt eine Umgebungsvariable DEEPL_API_KEY in den Netlify
// Site-Einstellungen (Site configuration → Environment variables). Ein
// kostenloser DeepL-API-Key (endet auf ":fx") reicht für den privaten
// Gebrauch völlig aus – 500.000 Zeichen/Monat gratis.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'DEEPL_API_KEY ist auf dem Server nicht konfiguriert. Bitte in den Netlify Site-Einstellungen unter "Environment variables" setzen und neu deployen.',
      }),
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ungültiges JSON im Request-Body.' }) }
  }

  const { texts, targetLang } = payload
  if (!Array.isArray(texts) || texts.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: '"texts" (Array von Strings) fehlt.' }) }
  }
  if (texts.length > 50) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Zu viele Texte auf einmal (max. 50).' }) }
  }

  // Kostenlose DeepL-Keys enden auf ":fx" und nutzen einen anderen Endpunkt
  // als Pro-Keys.
  const isFreeKey = apiKey.trim().endsWith(':fx')
  const endpoint = isFreeKey ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'

  const params = new URLSearchParams()
  for (const t of texts) params.append('text', typeof t === 'string' ? t : '')
  params.append('target_lang', targetLang || 'DE')

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const bodyText = await res.text()
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: `DeepL-Fehler (${res.status}): ${bodyText}` }) }
    }
    const data = JSON.parse(bodyText)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        translations: data.translations.map((t) => t.text),
        detectedLang: data.translations[0] ? data.translations[0].detected_source_language : null,
      }),
    }
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Übersetzungsdienst (DeepL) ist gerade nicht erreichbar.' }) }
  }
}

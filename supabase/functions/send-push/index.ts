// Supabase Edge Function: send-push
//
// Verschickt eine echte Web-Push-Benachrichtigung, wenn jemand ein Rezept
// markiert ("Markieren") oder ein neues Rezept im Haushalt angelegt wird.
//
// Wird auf zwei Wegen ausgelöst (beide werden hier unterstützt):
//   1. Empfohlen: Database Webhook auf INSERT in "recipe_pings"
//      (Supabase Dashboard → Database → Webhooks). Payload-Form:
//      { type: "INSERT", table: "recipe_pings", record: {...}, schema: "public" }
//   2. Optional/best effort: direkter Aufruf per supabase.functions.invoke("send-push", ...)
//      aus der App heraus. Payload-Form: { recipeId, toMemberId, note }
//
// Benötigte Function-Secrets (Dashboard → Edge Functions → send-push → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (z.B. "mailto:du@example.com")
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind automatisch verfügbar.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:kontakt@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type PingRecord = {
  id: string
  household_id: string
  recipe_id: string | null
  kind: 'ping' | 'new_recipe'
  from_member_id: string
  to_member_id: string | null
  note: string | null
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()

    let ping: PingRecord | null = null

    if (body?.record && body?.table === 'recipe_pings') {
      // Database-Webhook-Aufruf
      ping = body.record as PingRecord
    } else if (body?.recipeId && body?.toMemberId) {
      // Direkter Aufruf aus der App (Fallback, falls kein Webhook eingerichtet ist)
      const { data: pings } = await sb
        .from('recipe_pings')
        .select('*')
        .eq('recipe_id', body.recipeId)
        .eq('to_member_id', body.toMemberId)
        .order('created_at', { ascending: false })
        .limit(1)
      ping = (pings?.[0] as PingRecord) ?? null
    }

    if (!ping) {
      return new Response(JSON.stringify({ ok: false, error: 'no ping record found' }), { status: 400 })
    }

    const [{ data: fromMember }, { data: recipe }] = await Promise.all([
      sb.from('household_members').select('display_name').eq('id', ping.from_member_id).maybeSingle(),
      ping.recipe_id ? sb.from('recipes').select('title').eq('id', ping.recipe_id).maybeSingle() : Promise.resolve({ data: null }),
    ])

    const fromName = fromMember?.display_name ?? 'Jemand'
    const recipeTitle = recipe?.title ?? 'ein Rezept'

    const title = ping.kind === 'new_recipe' ? 'Neues Rezept' : `${fromName} hat dir ein Rezept geschickt`
    const bodyText =
      ping.kind === 'new_recipe'
        ? `${fromName} hat "${recipeTitle}" hinzugefügt.`
        : ping.note
          ? `"${recipeTitle}": ${ping.note}`
          : `Schau dir "${recipeTitle}" an.`
    const url = ping.recipe_id ? `/rezepte/${ping.recipe_id}` : '/'

    // Zielgruppe ermitteln: bestimmtes Mitglied, oder (bei new_recipe ohne
    // to_member_id) alle Mitglieder des Haushalts außer dem Absender.
    let memberIds: string[] = []
    if (ping.to_member_id) {
      memberIds = [ping.to_member_id]
    } else {
      const { data: members } = await sb
        .from('household_members')
        .select('id')
        .eq('household_id', ping.household_id)
        .neq('id', ping.from_member_id)
      memberIds = (members ?? []).map((m) => m.id)
    }

    if (memberIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })
    }

    const { data: subs } = await sb.from('push_subscriptions').select('*').in('member_id', memberIds)

    let sent = 0
    const staleEndpoints: string[] = []

    await Promise.all(
      (subs ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            JSON.stringify({ title, body: bodyText, url, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' }),
          )
          sent++
        } catch (err: any) {
          // 404/410 = Subscription ist nicht mehr gültig (z.B. Browser-Daten gelöscht)
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            staleEndpoints.push(sub.endpoint)
          }
        }
      }),
    )

    if (staleEndpoints.length > 0) {
      await sb.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 })
  }
})

# Löffelbande

Eine installierbare, offline-fähige App zum Inventarisieren und Katalogisieren von Rezepten – mit Kategorien & Tags, Suche, Vorratsverwaltung, automatischer Einkaufsliste und Fotos/Video-/Social-Media-Links pro Rezept.

Die App läuft in zwei Modi, die automatisch erkannt werden:

- **Solo-Modus**: alles lokal auf dem Gerät (IndexedDB), kein Account nötig.
- **Verbunden-Modus**: gemeinsamer Haushalt mit Freunden, Live-Synchronisation von Rezepten/Vorrat/Einkaufsliste über Supabase, inklusive echter Push-Benachrichtigungen.

## Setup

Eine vollständige, dashboard-only Schritt-für-Schritt-Anleitung (kein Kommandozeile nötig) findest du in **[SETUP.md](./SETUP.md)**.

Für lokale Entwicklung mit Node.js:

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build nach ./dist
```

Kopiere `.env.example` zu `.env` und trage Supabase-/VAPID-Werte ein, um den Verbunden-Modus lokal zu testen. Ohne diese Werte startet die App automatisch im Solo-Modus.

## Projektstruktur

- `src/pages` – alle Bildschirme (Start, Rezepte, Vorrat, Einkaufsliste, Aktivität, Haushalt, Einstellungen, Kochmodus, Rezept-Import …)
- `src/data` – Repository-Abstraktion (`localRepo.ts` für Solo-Modus via Dexie/IndexedDB, `supabaseRepo.ts` für Verbunden-Modus via Supabase)
- `src/lib` – Hilfsfunktionen (Bildkomprimierung, OCR, URL-Import, Freitext-Parsing, Saison-Vorschläge, Wake-Lock-Präferenz …)
- `src/sw.ts` – Service Worker (App-Shell-Caching + Web-Push-Benachrichtigungen)
- `supabase/schema.sql` – vollständiges Datenbankschema inkl. Row-Level-Security für den Verbunden-Modus
- `supabase/functions/send-push` – Edge Function, die Web-Push-Benachrichtigungen verschickt

## Tech-Stack

Vite, React, TypeScript, React Router, Tailwind CSS v4, Dexie.js (IndexedDB), Supabase (Postgres, Auth, Realtime, Edge Functions), Tesseract.js (Foto-Texterkennung), vite-plugin-pwa.

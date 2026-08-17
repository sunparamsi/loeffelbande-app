# Setup-Anleitung – Löffelbande

Diese Anleitung führt dich Schritt für Schritt durch die Veröffentlichung deiner App. Du brauchst dafür **keine Kommandozeile und keine Programmierkenntnisse** – alles läuft über Web-Oberflächen (GitHub, Netlify, Supabase).

## Überblick: Zwei Modi

Die App hat zwei Betriebsarten, die automatisch erkannt werden:

- **Solo-Modus**: Läuft komplett lokal auf deinem Gerät (keine Anmeldung, kein Account). Reicht, wenn nur du die App nutzen willst.
- **Verbunden-Modus**: Deine Rezepte, dein Vorrat und deine Einkaufsliste werden über einen gemeinsamen "Haushalt" mit Freunden geteilt, inklusive Push-Benachrichtigungen aufs Handy. Dafür brauchst du ein kostenloses Supabase-Projekt.

Du kannst **klein anfangen** (Schritte 1–3, Solo-Modus) und **jederzeit später** auf den Verbunden-Modus umsteigen (Schritte 4–9), ohne am Code etwas zu ändern – du ergänzt nur ein paar Werte in Netlify.

Alles, was du brauchst, ist in dem Projektordner enthalten, den ich dir geschickt habe.

---

## Schritt 1: GitHub-Konto anlegen und Projekt hochladen

GitHub ist der Ort, an dem der Programmcode deiner App liegt. Netlify (Schritt 3) holt sich den Code von dort und baut daraus die fertige, installierbare App – das übernimmt Netlify automatisch für dich, du musst dafür nichts installieren.

1. Gehe auf **[github.com](https://github.com)** und erstelle ein kostenloses Konto (falls du noch keins hast).
2. Klicke oben rechts auf das **+** und dann auf **"New repository"**.
3. Gib einen Namen ein, z. B. `loeffelbande-app`. Sichtbarkeit ("Public" oder "Private") spielt keine Rolle – nimm gerne "Private". Klicke auf **"Create repository"**.
4. Du landest auf einer leeren Projektseite. Klicke auf den Link **"uploading an existing file"**.
5. Entpacke die ZIP-Datei, die ich dir geschickt habe, auf deinem Computer. Öffne den entpackten Ordner und ziehe **alle Dateien und Unterordner** (also `src`, `public`, `supabase`, `package.json`, `index.html`, `vite.config.ts`, usw.) in das Upload-Feld im Browser.
   - **Wichtig:** Die Ordner `node_modules` und `dist` sind nicht in der ZIP-Datei enthalten – die brauchst du auch nicht hochzuladen.
   - Falls der Browser bei sehr vielen Dateien auf einmal meckert: einfach in zwei oder drei Durchgängen hochladen (z. B. erst den `src`-Ordner, dann den Rest).
6. Scrolle runter und klicke auf **"Commit changes"**.

Fertig – dein Code liegt jetzt auf GitHub.

---

## Schritt 2: Netlify-Konto anlegen

1. Gehe auf **[netlify.com](https://www.netlify.com)** und klicke auf **"Sign up"**.
2. Wähle **"Sign up with GitHub"** – so sind Netlify und GitHub direkt miteinander verbunden und du musst kein zusätzliches Passwort merken.
3. Bestätige die Verknüpfung, falls GitHub danach fragt.

---

## Schritt 3: App auf Netlify veröffentlichen (Solo-Modus ist damit sofort live)

1. Klicke im Netlify-Dashboard auf **"Add new site"** → **"Import an existing project"**.
2. Wähle **"Deploy with GitHub"** und suche dein Repository `loeffelbande-app` heraus.
3. Netlify erkennt automatisch, dass es sich um ein Vite-Projekt handelt. Prüfe, dass folgende Felder so gesetzt sind (Netlify füllt sie meist von selbst korrekt aus):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Klicke auf **"Deploy site"**.
5. Der erste Build dauert ca. 1–2 Minuten. Danach bekommst du oben eine Adresse wie `https://zufälliger-name-12345.netlify.app` – das ist deine App.
6. Optional: Unter **Site configuration → Domain management** kannst du den Namen ändern (z. B. `loeffelbande.netlify.app`) oder eine eigene Domain verbinden.

Öffne die Adresse auf deinem Handy – du kannst die Seite jetzt über "Zum Startbildschirm hinzufügen" (iPhone) bzw. "App installieren" (Android/Chrome) wie eine echte App installieren. Sie funktioniert bereits offline und speichert alle Daten lokal auf dem Gerät (Solo-Modus).

Wenn du die App nur für dich allein nutzen willst, bist du hier fertig! Die folgenden Schritte brauchst du nur für den Verbunden-Modus mit deinen Freunden.

---

## Schritt 4: Supabase-Projekt anlegen

Supabase ist der kostenlose Cloud-Dienst, der eure gemeinsamen Rezepte, den Vorrat und die Einkaufsliste speichert und in Echtzeit zwischen allen Geräten synchronisiert.

1. Gehe auf **[supabase.com](https://supabase.com)** und klicke auf **"Start your project"**, dann meldest du dich an (am einfachsten wieder mit deinem GitHub-Konto).
2. Klicke auf **"New project"**.
3. Wähle eine Organisation (wird beim ersten Mal automatisch angelegt), vergib einen Projektnamen (z. B. `loeffelbande`), ein Datenbank-Passwort (irgendein sicheres Passwort – notiere es dir, du brauchst es aber im Alltag nicht mehr) und eine Region in deiner Nähe (z. B. Frankfurt).
4. Klicke auf **"Create new project"** und warte 1–2 Minuten, bis das Projekt bereit ist.

---

## Schritt 5: E-Mail-Bestätigung deaktivieren (wichtig!)

Die App meldet Haushaltsmitglieder intern über Supabase mit Name + PIN an, ohne dass eine echte E-Mail-Adresse nötig ist. Damit das funktioniert, muss die Pflicht zur E-Mail-Bestätigung ausgeschaltet werden – sonst schlägt "Haushalt erstellen"/"Beitreten" fehl.

1. Gehe im Supabase-Dashboard deines Projekts links auf **Authentication**.
2. Klicke oben auf den Reiter **Sign In / Providers** (bzw. **Providers**).
3. Öffne **Email**.
4. Schalte die Option **"Confirm email"** aus.
5. Speichern.

---

## Schritt 6: Datenbank-Schema einspielen

1. Gehe im Supabase-Dashboard links auf **SQL Editor**.
2. Klicke auf **"New query"**.
3. Öffne die Datei `supabase/schema.sql` aus deinem Projektordner (z. B. mit einem Texteditor oder direkt auf GitHub anschauen), kopiere den **gesamten Inhalt** und füge ihn in den SQL-Editor ein.
4. Klicke auf **"Run"** (bzw. den grünen Play-Button).
5. Du solltest eine Erfolgsmeldung sehen ("Success. No rows returned"). Damit sind alle Tabellen, Sicherheitsregeln (Row Level Security) und Echtzeit-Synchronisation eingerichtet.

---

## Schritt 7: API-Schlüssel kopieren

1. Gehe im Supabase-Dashboard links auf **Project Settings** (Zahnrad-Symbol) → **API**.
2. Notiere dir zwei Werte:
   - **Project URL** (sieht aus wie `https://abcdefghijk.supabase.co`)
   - **anon public** Key (ein langer Text unter "Project API keys")

Diese beiden Werte trägst du gleich in Schritt 9 bei Netlify ein.

---

## Schritt 8: Echte Push-Benachrichtigungen einrichten

Damit z. B. eine Push-Benachrichtigung aufs Handy kommt, wenn dir jemand ein Rezept schickt ("Markieren"), braucht es drei Dinge: einen Schlüsselpaar-Code (VAPID), eine kleine Funktion, die die Nachricht verschickt (Edge Function), und einen Auslöser dafür (Datenbank-Webhook). Alles geht über das Supabase-Dashboard, ganz ohne Kommandozeile.

### 8.1 VAPID-Schlüssel

Ich habe dir bereits ein fertiges Schlüsselpaar erzeugt, das du direkt verwenden kannst:

```
Public Key:
BJBGcspY8zbd20BKHRcp7MJYNyDGFUMfh1n4Ylj2EVZ5ZdWlf5wGffDcHNH9QrHSZNc0rBxVmx41_L5O2_ltvWQ

Private Key:
frvxkUgyCmy7ucVM3WLAkgggGS05QuotFR3eEgahF8s
```

Diese Schlüssel identifizieren nur *deine* App gegenüber den Push-Diensten von Apple/Google – sie sind kein Login-Passwort und für niemand anderen nützlich. Du kannst sie einfach übernehmen. (Falls du lieber ein eigenes Paar möchtest: sag mir einfach Bescheid, dann erzeuge ich dir ein neues.)

### 8.2 Edge Function "send-push" anlegen

1. Gehe im Supabase-Dashboard links auf **Edge Functions**.
2. Klicke auf **"Deploy a new function"** → **"Via Editor"**.
3. Gib als Namen genau **`send-push`** ein.
4. Lösche den Beispielcode im Editor und füge stattdessen den **gesamten Inhalt** der Datei `supabase/functions/send-push/index.ts` aus deinem Projektordner ein.
5. Klicke auf **"Deploy function"**.

### 8.3 Secrets (geheime Werte) für die Funktion setzen

1. Gehe weiterhin unter **Edge Functions** auf den Reiter **Secrets** (oder **"Manage secrets"**).
2. Füge folgende drei Einträge hinzu (Name = Wert):
   - `VAPID_PUBLIC_KEY` = `BJBGcspY8zbd20BKHRcp7MJYNyDGFUMfh1n4Ylj2EVZ5ZdWlf5wGffDcHNH9QrHSZNc0rBxVmx41_L5O2_ltvWQ`
   - `VAPID_PRIVATE_KEY` = `frvxkUgyCmy7ucVM3WLAkgggGS05QuotFR3eEgahF8s`
   - `VAPID_SUBJECT` = `mailto:` + deine E-Mail-Adresse (z. B. `mailto:lucas.malsch@p3-group.com`)
3. Speichern. (`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` sind automatisch vorhanden, die musst du nicht selbst anlegen.)

### 8.4 Datenbank-Webhook einrichten (löst den Versand automatisch aus)

1. Gehe im Supabase-Dashboard links auf **Database** → **Webhooks**.
2. Klicke auf **"Create a new hook"**.
3. Trage ein:
   - **Name**: `send-push-on-ping`
   - **Table**: `recipe_pings`
   - **Events**: nur **Insert** anhaken
   - **Type**: **Supabase Edge Functions**
   - **Edge Function**: `send-push`
   - **HTTP Method**: `POST`
   - **HTTP Headers**: Klicke auf **"Add new header"** → **"Add auth header with service key"** (fügt automatisch den nötigen Berechtigungs-Header hinzu). Lass zusätzlich `Content-type: application/json` stehen.
4. Speichern.

Damit wird ab jetzt automatisch eine Push-Benachrichtigung verschickt, sobald jemand ein Rezept "markiert" oder ein neues Rezept anlegt.

---

## Schritt 9: Umgebungsvariablen in Netlify eintragen

Jetzt verbindest du die veröffentlichte App (aus Schritt 3) mit deinem Supabase-Projekt.

1. Gehe zurück zu deiner Seite im Netlify-Dashboard.
2. Klicke auf **Site configuration** → **Environment variables** → **"Add a variable"**.
3. Trage folgende drei Variablen ein (die Namen müssen exakt so geschrieben werden):
   - `VITE_SUPABASE_URL` = deine Project URL aus Schritt 7
   - `VITE_SUPABASE_ANON_KEY` = dein anon public Key aus Schritt 7
   - `VITE_VAPID_PUBLIC_KEY` = der Public Key aus Schritt 8.1
4. Gehe auf den Reiter **Deploys** und klicke auf **"Trigger deploy"** → **"Deploy site"**, damit die neuen Werte in die App eingebaut werden.
5. Nach ca. 1 Minute ist die App im **Verbunden-Modus** live – du erkennst das daran, dass beim Öffnen der App jetzt ein Anmeldebildschirm ("Haushalt erstellen / Beitreten / Anmelden") erscheint statt direkt loszulegen.

---

## Schritt 10: Haushalt erstellen und Freunde einladen

1. Öffne die App und wähle **"Erstellen"**. Gib einen Haushaltsnamen, deinen Namen und einen PIN (mind. 6 Zeichen) ein. Du wirst automatisch **Besitzer:in**.
2. Du bekommst einen 6-stelligen **Beitritts-Code** angezeigt (auch später jederzeit unter **Haushalt** einsehbar).
3. Schicke diesen Code an deine Freunde, zusammen mit dem Link zu deiner App. Sie wählen **"Beitreten"**, geben den Code, ihren eigenen Namen und einen selbstgewählten PIN ein.
4. Neue Mitglieder starten als **Betrachter** (nur Lesezugriff). Als Besitzer:in kannst du unter **Haushalt** die Rolle jeder Person auf **Bearbeiter** hochstufen, damit sie Rezepte, Vorrat und Einkaufsliste auch bearbeiten dürfen.

---

## Schritt 11: Push-Benachrichtigungen auf dem Handy erlauben

1. In der App unter **Einstellungen → Benachrichtigungen** den Schalter aktivieren und die Berechtigung im Browser/Handy bestätigen.
2. **Wichtig bei iPhone/iPad:** Push-Benachrichtigungen funktionieren im Safari-Browser nur, wenn die App vorher **"Zum Home-Bildschirm hinzufügen"** installiert und von dort geöffnet wurde (das ist eine Einschränkung von Apple, keine App-Einstellung). Bei Android/Chrome funktioniert es auch direkt im Browser, die Installation als App wird aber trotzdem empfohlen.

---

## Später etwas ändern

- **Logo hochladen/ändern**: In der App unter **Einstellungen → App-Logo**. Gilt sofort für den ganzen Haushalt, kein erneutes Deployment nötig.
- **Kategorien verwalten**: **Einstellungen → Kategorien verwalten**.
- **Code-Änderungen** (falls du mich später bittest, etwas anzupassen): Ich schicke dir die geänderten Dateien, du lädst sie in GitHub hoch (wie in Schritt 1, Punkt 4–6) – Netlify baut die Seite dann automatisch neu.

---

## Fehlerbehebung (FAQ)

**"E-Mail-Bestätigung ist in deinem Supabase-Projekt noch aktiv" beim Erstellen/Beitreten**
→ Schritt 5 wurde noch nicht (oder nicht vollständig) ausgeführt. Nochmal prüfen: Authentication → Sign In/Providers → Email → "Confirm email" muss **aus** sein.

**Nach dem Eintragen der Netlify-Umgebungsvariablen ändert sich nichts**
→ Umgebungsvariablen wirken erst nach einem neuen Build. Unter **Deploys → Trigger deploy → Deploy site** einen neuen Build anstoßen.

**"Name oder PIN ist falsch"**
→ Entweder ist der Name/PIN falsch geschrieben, oder die Person ist diesem Haushalt noch nicht beigetreten (dann "Beitreten" statt "Anmelden" wählen).

**Push-Benachrichtigungen kommen nicht an**
→ Prüfe: (1) Ist die Edge Function `send-push` erfolgreich deployt (Schritt 8.2)? (2) Sind alle drei Secrets gesetzt (Schritt 8.3)? (3) Ist der Datenbank-Webhook aktiv und zeigt auf `recipe_pings`/Insert (Schritt 8.4)? (4) Auf dem iPhone: Ist die App zum Home-Bildschirm hinzugefügt (Schritt 11)? Du kannst die Funktion außerdem manuell testen: Edge Functions → `send-push` → **Test**.

**Ich will die App offline testen, bevor ich Freunde einlade**
→ Kein Problem: Solange du in Schritt 9 keine Umgebungsvariablen einträgst (oder sie wieder löschst und neu deployst), läuft die App im Solo-Modus – perfekt zum Ausprobieren.

---

Bei Fragen zu einem der Schritte – melde dich einfach, ich helfe dir gerne weiter.

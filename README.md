# CampusPark

Mobile Campus-App auf Basis der CampusPark-HTML-Vorlage und der Navigationsmechanik von TierFinder.

**App:** https://rj68ngkjr2-max.github.io/campuspark/

## Funktionen

- Supabase-Anmeldung mit E-Mail und Passwort, optional dauerhaft angemeldet bleiben und Passwort-Rücksetzung.
- Privates Profil mit Anzeigename und Kennzeichen; Kennzeichen werden anderen Personen nicht angezeigt.
- Vier Modellparkflächen, gemeinsame Belegung aus aktiven App-Check-ins, Zeitverlängerung und Check-out per Wischen oder Taste. Abgelaufene Check-ins zählen automatisch nicht mehr zur Belegung.
- Mitfahrangebote und Fahrtgesuche mit Datum, Uhrzeit und Streckenfilter. Angebote absagen und eigene Gesuche schließen.
- Private Chats zwischen Fahrer und anfragender Person, Bestätigung/Ablehnung/Zurückziehen einer Anfrage und Ungelesen-Punkte. Erst eine Bestätigung belegt einen Sitzplatz.
- Untere Menüleiste mit Fingerziehen zum gewünschten Menüpunkt, Dark Mode, Systemdarstellung, Einführung und installierbare PWA.

Die Parkflächen und Kapazitäten stammen aus dem Studienprototyp und sind **keine verifizierten Stellplatzdaten**. Die Belegung ist die Anzahl aktiver Check-ins, keine Sensor-Messung. Es gibt keine offizielle Parkberechtigung, Standortverfolgung, Schrankenanbindung oder Auslastungsprognose. Die Campuskarte ist ein Schema mit Link zur OpenStreetMap-Karte.

## Quellcode und Build

Node.js 22 oder neuer und pnpm verwenden:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

`source-app.js` enthält die lesbare Oberfläche, `backend.js` die Supabase-Anbindung, `gestures.js` die Gesten und `auth-storage.js` die Sitzungsspeicherung. `styles.css` baut auf der bereitgestellten Vorlage auf. `build.mjs` erzeugt `app.js` und die Cache-Version in `sw.js`. Die gebauten Dateien sind eingecheckt, damit GitHub Pages ohne zusätzliche Build-Pipeline funktioniert.

GitHub Pages: Branch `main`, Ordner `/ (root)`. Nach Änderungen `pnpm build` ausführen und Quellcode und Build gemeinsam committen.

## Datenbank

Supabase-Projekt `gozrvrxcdykuhpkmiugr`, Region Stockholm. `schema.sql` legt eine **neue** Datenbankstruktur an und darf nicht erneut über das vorhandene Schema ausgeführt werden. Für bestehende Projekte gezielte additive Migrationen schreiben.

Sieben private Tabellen im Schema `campus`: `profiles`, `lots`, `parking`, `rides`, `wanted`, `conversations`, `messages`. RLS ist überall aktiv und direkte Clientrechte sind entzogen. Die einzige fachliche Schnittstelle `public.campus_rpc` prüft Anmeldung, Eigentum und Gesprächsteilnahme. Passwörter liegen ausschließlich bei Supabase Auth. `config.js` enthält nur Projektadresse und öffentlichen Publishable Key.

Die Datenbank serialisiert Check-ins je Parkfläche und Bestätigungen je Mitfahrt. Eindeutige Nachrichten-IDs machen das erneute Senden nach einem Verbindungsfehler sicher. Chats laden jeweils 50 Nachrichten, ältere Beiträge sind nachladbar. Nachrichten sind auf 2.000 Zeichen und 30 pro Minute begrenzt. Angebote und Gesuche sind auf zusammen 20 pro Tag und Konto begrenzt. Es werden höchstens 200 aktuelle Angebote/Gesuche geladen.

Die sichtbare App aktualisiert Belegung und Ungelesen-Zähler alle zehn Sekunden. Auf geöffnete Chats wird ebenfalls alle zehn Sekunden geprüft; im Hintergrund pausiert dies. Es gibt keine Push-Benachrichtigungen. Ein Service Worker speichert nur die öffentliche Oberfläche. Anmeldung und Datenaktionen benötigen Internet; Offline-Fehler werden angezeigt, Schreibaktionen nicht heimlich vorgemerkt.

## Anmeldung und E-Mail

Site URL und erlaubte Weiterleitungen sind auf die GitHub-Pages-Adresse eingestellt. E-Mail-Bestätigung bleibt aktiviert. Der tatsächliche Versand von Bestätigungs- und Rücksetzlinks hängt vom Supabase-Maildienst bzw. einer eigenen SMTP-Konfiguration ab. Für Registrierung durch beliebige externe Adressen muss in Supabase ein eigener Mailanbieter eingerichtet werden; Supabases Standarddienst ist eingeschränkt. Ohne Mailzustellung kann ein neues Konto noch nicht angemeldet werden.

Für die iPhone-Installation die App in Safari öffnen und über Teilen → Zum Home-Bildschirm hinzufügen.

## Prüfung

16 PostgreSQL-Tests mit PGlite prüfen unter anderem fremde Datenzugriffe, Profilanlage, Kapazität, doppelte Check-ins, Nachrichtenwiederholungen, Sitzplatzvergabe, Lesestände und Absagen. Mobile Navigation, Fingerziehen über die Menüleiste, Check-in und Formulare wurden zusätzlich mit isolierten lokalen Testdaten im Browser geprüft. Diese Testdaten werden nicht veröffentlicht.

Technische Referenzen: [Supabase Database Functions](https://supabase.com/docs/guides/database/functions), [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

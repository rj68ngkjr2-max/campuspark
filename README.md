# CampusPark

Mobile Campus-App auf Basis der CampusPark-HTML-Vorlage und der Navigationsmechanik von TierFinder.

**App:** https://rj68ngkjr2-max.github.io/campuspark/

## Funktionen

- Supabase-Anmeldung mit E-Mail und Passwort, optional dauerhaft angemeldet bleiben.
- Privates Profil mit Anzeigename und Kennzeichen; Kennzeichen werden anderen Personen nicht angezeigt.
- Vier Modellparkflächen, gemeinsame Belegung aus aktiven App-Check-ins, Zeitverlängerung und Check-out per Wischen oder Taste. Abgelaufene Check-ins zählen automatisch nicht mehr zur Belegung.
- Mitfahrangebote und Fahrtgesuche mit Datum, Uhrzeit und Streckenfilter. Angebote absagen und eigene Gesuche schließen.
- Private Chats zwischen Fahrer und anfragender Person, Bestätigung/Ablehnung/Zurückziehen einer Anfrage und Ungelesen-Punkte. Erst eine Bestätigung belegt einen Sitzplatz.
- Untere Menüleiste mit Fingerziehen zum gewünschten Menüpunkt, Dark Mode, Systemdarstellung, Einführung und installierbare PWA.

Die Parkflächen und Kapazitäten stammen aus dem Studienprototyp und sind **keine verifizierten Stellplatzdaten**. Die Belegung ist die Anzahl aktiver Check-ins, keine Sensor-Messung. Es gibt keine offizielle Parkberechtigung, Standortverfolgung, Schrankenanbindung oder Auslastungsprognose. Die Campuskarte ist eine interaktive Leaflet-/OpenStreetMap-Karte mit Zoomen, Verschieben, Parkflächen-Auswahl, Zentrierung und externen Karten-/Routenlinks. Parkflächenpositionen stammen näherungsweise aus der Vorlage. Leaflet 1.9.4 ist mit BSD-2-Clause-Lizenz lokal gebündelt; Kartenkacheln werden erst bei sichtbarer Karte vom OSM-Server geladen und nicht für Offline-Nutzung vorab gespeichert.

## Quellcode und Build

Node.js 22 oder neuer und pnpm verwenden:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

`source-app.js` enthält die lesbare Oberfläche, `backend.js` die Supabase-Anbindung, `gestures.js` die Gesten und `auth-storage.js` die Sitzungsspeicherung. `styles.css` baut auf der bereitgestellten Vorlage auf. `source-index.html` enthält das HTML. `build.mjs` erzeugt `app.js`, `index.html` mit versionierten Asset-URLs und die Cache-Version in `sw.js`. Die gebauten Dateien sind eingecheckt, damit GitHub Pages ohne zusätzliche Build-Pipeline funktioniert.

GitHub Pages: Branch `main`, Ordner `/ (root)`. Nach Änderungen `pnpm build` ausführen und Quellcode und Build gemeinsam committen.

## Datenbank

Supabase-Projekt `gozrvrxcdykuhpkmiugr`, Region Stockholm. `schema.sql` legt eine **neue** Datenbankstruktur an und darf nicht erneut über das vorhandene Schema ausgeführt werden. Für bestehende Projekte gezielte additive Migrationen schreiben.

Sieben private Tabellen im Schema `campus`: `profiles`, `lots`, `parking`, `rides`, `wanted`, `conversations`, `messages`. RLS ist überall aktiv und direkte Clientrechte sind entzogen. Die einzige fachliche Schnittstelle `public.campus_rpc` prüft Anmeldung, Eigentum und Gesprächsteilnahme. Passwörter liegen ausschließlich bei Supabase Auth. `config.js` enthält nur Projektadresse und öffentlichen Publishable Key.

Die Datenbank serialisiert Check-ins je Parkfläche und Bestätigungen je Mitfahrt. Eindeutige Nachrichten-IDs machen das erneute Senden nach einem Verbindungsfehler sicher. Chats laden jeweils 50 Nachrichten, ältere Beiträge sind nachladbar. Nachrichten sind auf 2.000 Zeichen und 30 pro Minute begrenzt. Angebote und Gesuche sind auf zusammen 20 pro Tag und Konto begrenzt. Es werden höchstens 200 aktuelle Angebote/Gesuche geladen.

Die sichtbare App aktualisiert Belegung und Ungelesen-Zähler alle zehn Sekunden. Auf geöffnete Chats wird ebenfalls alle zehn Sekunden geprüft; im Hintergrund pausiert dies. Es gibt keine Push-Benachrichtigungen. Ein Service Worker speichert nur die öffentliche Oberfläche. Anmeldung und Datenaktionen benötigen Internet; Offline-Fehler werden angezeigt, Schreibaktionen nicht heimlich vorgemerkt.

## Anmeldung und E-Mail

Site URL und erlaubte Weiterleitungen sind auf die GitHub-Pages-Adresse eingestellt. Für die Studien-Demo ist die E-Mail-Bestätigung auf ausdrücklichen Nutzerwunsch deaktiviert. Registrierung und Anmeldung funktionieren direkt; die Inhaberschaft eingegebener E-Mail-Adressen wird nicht geprüft. Es ist kein eigener SMTP-Anbieter eingerichtet. Die Oberfläche bietet deshalb aktuell keine Passwort-Rücksetzung per E-Mail an. Für einen späteren regulären Betrieb SMTP einrichten, die Bestätigung aktivieren und den Rücksetzablauf wieder einblenden.

Für die iPhone-Installation die App in Safari öffnen und über Teilen → Zum Home-Bildschirm hinzufügen.

## Prüfung

17 PostgreSQL-Tests mit PGlite prüfen unter anderem fremde Datenzugriffe, Profilanlage, Kapazität, doppelte Check-ins, Nachrichtenwiederholungen, Sitzplatzvergabe, Lesestände und Absagen. Mobile Navigation, Fingerziehen über die Menüleiste, Check-in und Formulare wurden zusätzlich mit isolierten lokalen Testdaten im Browser geprüft. Diese Testdaten werden nicht veröffentlicht.

Technische Referenzen: [Supabase Database Functions](https://supabase.com/docs/guides/database/functions), [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## iPhone-Layout

Statusleiste: `black-translucent`, `viewport-fit=cover`, Theme-Hintergrund bereits vor dem ersten App-Render. Schwebende, abgerundete Glas-Navigation über dem Inhalt; unterer Sicherheitsabstand wird nur einmal berücksichtigt. Der Glas-Effekt ist eine Web-Nachbildung mit Blur, Transparenz und Kontrast-Fallbacks, kein natives UIKit-Material. Overlays haben einen festen Kopf mit 44px-Schließtaste und einen getrennt scrollenden Inhalt; die sichtbare Bildschirmhöhe wird bei geöffneter Tastatur berücksichtigt. Nach Änderung der Installationsmetadaten kann eine erneute Homescreen-Installation nötig sein.

## Bedienungs- und Layoutkorrekturen

Karten-Gesten sind auf den Kartenbereich begrenzt (`touch-action: none` und lokale Touch-/Safari-Gestenbehandlung). Die Navigation bleibt bei Aktualisierungen im DOM; die Auswahlblase folgt dem Finger ohne Positionsanimation. 15 Gesten-Regressionsfälle prüfen unter anderem wiederholte Drags, Pointer-Abbruch, Begrenzung und doppelte Klicks. Auslastungskarten haben eigene Innenabstände. Datumsfelder sind in allen Formularen auf die verfügbare Breite begrenzt; Einstellungen haben getrennte Abstände. Die Begrüßungszeile verwendet eine größere Schrift mit ganzzahliger Zeilenhöhe.

## App-Icon

Das Icon verbindet das bereitgestellte DHBW-Zeichen mit einem weißen Park-P auf dunklem Hintergrund. Es wird auf dem Homescreen, als Favicon, auf der Anmeldung und im App-Kopf verwendet. PNG-Exporte: 180, 192 und 512 Pixel. Versionsparameter erneuern Browser- und PWA-Assets; das von iOS separat gespeicherte Homescreen-Icon kann eine erneute Installation erfordern. Der Header hat 32 Pixel oberen Innenabstand zusätzlich zur Safe Area (10 Pixel mehr als zuvor).

Beim Loslassen bleibt die Glasfläche sichtbar und gleitet in 240 ms zur ausgewählten Schaltfläche. Eine neue Berührung währenddessen setzt an der sichtbaren Position an. Reduzierte Bewegung deaktiviert diesen Übergang.

## Administration

Der bestehende Login bleibt unverändert. `campus.account_access.is_admin` ist der serverseitig geprüfte Schalter; neue Konten erhalten standardmäßig `false`. Rollen und Sperren werden bei jedem RPC aus der Datenbank gelesen, nicht aus manipulierbaren Profilfeldern oder Browserzustand. Die Tabellen sind durch fehlende Client-Grants und RLS geschützt. `campus.user_rpc` und `campus.admin_rpc` sind nur intern aufrufbar.

Für ein bestehendes Projekt einmal `migration-admin.sql` im Supabase SQL Editor ausführen. `schema.sql` enthält die vollständige Neuinstallation inklusive Migration. Die Migration ist wiederholbar und erhält bestehende Daten und Rollen.

Einen vorhandenen Nutzer über den Supabase Table Editor, Schema `campus`, Tabelle `account_access`, anhand seiner `auth.users.id` zuordnen und `is_admin = true` setzen. Alternativ im SQL Editor (Adresse ersetzen):

```sql
update campus.account_access a
set is_admin = true, updated_at = now()
from auth.users u
where a.user_id = u.id and lower(u.email) = lower('bestehendes-konto@example.org');
```

Rolle entziehen: denselben Datensatz auf `is_admin = false` setzen. Die App aktualisiert die Rolle beim nächsten Aufruf bzw. spätestens beim nächsten erfolgreichen Poll im Vordergrund. Admins öffnen **Profil → Administration**. Dort verfügbar: Parkflächen anlegen/bearbeiten/deaktivieren, Kapazität und Kartenposition pflegen; Konten suchen, Namen/Kennzeichen bearbeiten, sperren/entsperren; aktive Parkvorgänge beenden und die letzten 50 Verwaltungsaktionen einsehen. Die Verwaltung vergibt keine weiteren Admin-Rollen; dies bleibt wie vorgesehen eine Datenbankentscheidung.

Sperren gelten für alle CampusPark-Datenzugriffe, auch mit bestehenden Sessions. Der aktivierte Auth Hook verhindert zusätzlich neue Login-Tokens für gesperrte oder nicht freigeschaltete Konten. Zukünftige Angebote/Gesuche gesperrter Nutzer werden geschlossen und deren Mitfahranfragen zurückgezogen. Parkvorgänge bleiben bis zum regulären Ende bestehen, da eine Kontosperre kein Fahrzeug entfernt. Admin-Konten können in der Oberfläche nicht gesperrt werden. Entsperren stellt abgesagte Fahrten nicht wieder her.

Parkflächen werden deaktiviert statt gelöscht, sodass Historien und laufende Parkvorgänge erhalten bleiben. Kapazitäten können nicht unter die aktuelle Belegung abgesenkt werden. Admins sehen E-Mail, Anzeigename, Kennzeichen, Registrierungs-/Anmeldezeit und Sperrstatus, keine Passwörter und keine fremden Chat-Inhalte.

Validierung: 17 bisherige Datenbanktests, 15 Admin-/Berechtigungstests, 10 Freigabe-/Auth-Hook-Tests, 15 Gestentests. Referenzen: [Supabase-Funktionsberechtigungen](https://supabase.com/docs/guides/database/functions), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Freigabe neuer Registrierungen

Neue Konten haben `is_approved = false` in `campus.account_access`. Fehlende Zugriffsdatensätze gelten ebenfalls als nicht freigegeben. Die erstmalige Migration erhält bestehende Konten als freigegeben; erneutes Ausführen verändert den Freigabestatus neuer Konten nicht.

Für die bereits installierte Admin-Version: `migration-approval.sql` ausführen. Für eine Neuinstallation enthält `schema.sql` alles, `migration-admin.sql` enthält mittlerweile beide Erweiterungen. Danach in Supabase **Authentication → Auth Hooks → Customize Access Token (JWT) Claims → Postgres → public.campus_access_token_hook** aktivieren. Ohne diesen Konfigurationsschritt verhindert der RPC bereits jeden App-Datenzugriff; mit dem Hook wird auch die Ausgabe eines Login-Tokens verweigert. [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks).

Admins geben Konten unter **Profil → Administration → Freigaben** frei. Freigabe gewährt ausschließlich die normale User-Rolle. Alternativ kann die Projektverwaltung `is_approved` im geschützten Datenbankdatensatz setzen. Neue Registrierungen erscheinen auch ohne fertiges Profil in der Freigabeliste. Nach Freigabe meldet sich die Person normal an und vervollständigt ihr Profil. Es wird keine automatische Freigabe-E-Mail verschickt.

Die E-Mail-Bestätigung bleibt für diese Studien-Demo wie vereinbart deaktiviert. Supabase speichert die Registrierung vor der anschließenden Token-Ausgabe; ein wegen ausstehender Freigabe verweigerter Token verhindert deshalb nicht, dass das neue Konto in der Verwaltung erscheint. Die App zeigt in diesem Fall den Freigabehinweis.

Nach Beginn einer Wischgeste folgt die Glasfläche der horizontalen Fingerbewegung auch oberhalb und unterhalb der Menüleiste. Beim Loslassen wird der zur horizontalen Position passende Menüpunkt mit dem weichen Übergang ausgewählt. Seitlich außerhalb wird auf den ersten bzw. letzten Menüpunkt begrenzt. Ein tatsächlicher Pointer-Abbruch wählt weiterhin nichts aus.

Neue Registrierungen erhalten sofort einen ausstehenden Eintrag in `campus.account_access`. Für bestehende Installationen ergänzt `migration-registration.sql` fehlende Einträge ohne Freigaben oder Rollen zu ändern. Die Administration lädt ihre Liste alle zehn Sekunden sowie nach Rückkehr in die App nach; offene Formulare bleiben erhalten. Beim Wechsel des Verwaltungsbereichs wird ein alter Suchfilter zurückgesetzt.

Die E-Mail-Adresse steht in der Admin-Nutzerliste direkt als Überschrift. In Supabase zeigt die ausschließlich für die Datenbankverwaltung lesbare Ansicht `campus.pending_registrations` ausstehende Registrierungen mit E-Mail, Datum und Status. Die Freigabe erfolgt in der App unter Profil → Administration → Freigaben.

## Parken, Fahrzeuge, Chat und Ortsauswahl

Die Hauptnavigation besteht aus Parken, Mitfahrten, Chats und Profil. Parken kombiniert Karte, Auslastung und Check-in. Während eines Parkvorgangs stehen Restzeit und Auschecken im Vordergrund; die übrigen Parkflächen bleiben aufklappbar.

`migration-vehicles.sql` ergänzt maximal zwei Kennzeichen pro Profil und speichert das beim Check-in gewählte Kennzeichen am Parkvorgang. Bestehende Kennzeichen bleiben erhalten. Das zuletzt benutzte Auto wird vorausgewählt, sofern es noch im Profil vorhanden ist. Profiländerungen verändern keine laufenden Parkvorgänge. Die vollständige Installation und die bestehenden Admin-/Freigabe-Migrationen enthalten die Erweiterung ebenfalls.

Eigene Chatnachrichten stehen rechts, fremde links, Systemnachrichten mittig; die Nachrichtenliste hat 12 Pixel Abstand zwischen den Sprechblasen.

Die Ortsauswahl in Angeboten, Gesuchen und Suche verlangt bei nichtleeren Eingaben eine Auswahl aus Vorschlägen. DHBW Lörrach (Campus Hangstraße) und häufige regionale Orte sind lokal verfügbar. Online-Vorschläge kommen von [Photon](https://github.com/komoot/photon): 500 ms Verzögerung, Cache, Abbruch veralteter Anfragen, begrenzte Trefferzahl und explizite Offline-Meldung. Nur der eingegebene Suchbegriff wird übertragen, keine Profil- oder GPS-Daten. Der öffentliche Photon-Dienst ist für diese Studien-Demo geeignet, bietet aber keine Verfügbarkeitsgarantie; bei größerem Betrieb einen eigenen Dienst einsetzen. [DHBW-Adresse](https://dhbw-loerrach.de/kontakt/zentraler-kontakt/).

Die App-Hülle nutzt die dynamische Viewport-Höhe; der sichere untere Rand wird einmal berücksichtigt. Tastaturerkennung behandelt sowohl überlagernde als auch verkleinernde Bildschirmtastaturen. Browserprüfung bei 360×640, 390×844 und 430×932, zusätzlich verkleinerte Höhe bei fokussiertem Eingabefeld. Kein Ersatz für einen Test auf physischen iOS-/Android-Geräten.

Validierung dieser Erweiterung: 68 Tests insgesamt (17 Datenbank, 15 Administration, 10 Freigabe, 15 Gesten, 8 Fahrzeuge, 3 Ortsauswahl).

## Aktiver Parkvorgang und individuelle Dauer

Die aktive Parkansicht füllt die verfügbare Bildschirmhöhe ohne Scrollen. Erst die aufgeklappte Auslastung aktiviert den Scrollbereich. Der zusätzliche Hinweisbalken entfällt. Stunden und Minuten lassen sich über zwei einrastende Drehräder wählen (1–720 Minuten, Tastaturbedienung ebenfalls möglich). `migration-parking-duration.sql` aktiviert die individuelle Dauer in bestehenden Installationen; Schema und vorherige Migrationen enthalten sie ebenfalls.

Ein Swipe über mindestens 85 Prozent des Auscheck-Reglers beendet den Vorgang direkt. Kurze oder abgebrochene Gesten setzen ihn zurück. Während der Anfrage werden weitere Auscheck-Versuche unterdrückt; bei Fehlern bleibt ein erneuter Versuch möglich. Der alternative Textbutton behält seine Bestätigungsabfrage. Schieberradius 26 Pixel bei Container-Radius 31 Pixel und 5 Pixel Innenabstand.

Validierung: 71 Tests, Browserprüfung der ein- und aufgeklappten Ansicht, individuelle Dauer sowie kurzer und vollständiger Auscheck-Swipe.

## Unterer Rand bei Home-Bildschirm-Installationen

Die veraltete Apple-Metadaten-Einstellung `apple-mobile-web-app-status-bar-style=black-translucent` entfällt. WebKit empfiehlt ihre Entfernung und dokumentiert unterschiedliche App-Geometrie je nach Installationszeitpunkt: https://bugs.webkit.org/show_bug.cgi?id=317153 (der gemeldete iOS-27-Beta-Fehler wurde als behoben geschlossen). Der allgemeinere Bericht https://bugs.webkit.org/show_bug.cgi?id=313800 ist noch offen; eine OS-seitig abgeschnittene Zeichenfläche kann CSS nicht erweitern.

Installierte Fenster werden über `display-mode: standalone` bzw. `navigator.standalone` erkannt. Nur dort füllt die App mit `position:fixed; inset:0; height:auto` den bereitgestellten Bereich, ohne die Höhe ausschließlich von `100dvh` abzuleiten. Der normale Browser behält seine dynamische Höhe. Kein pauschales Addieren von Statusleistenhöhen oder Bildschirmmaßen, keine Änderungen an den Sicherheitsabständen. Hintergrund und Theme-Farbe bleiben konsistent.

Geprüft mit einer lokalen Simulation einer um 62 Pixel zu kleinen dynamischen Höhe. Das ersetzt nicht die Prüfung auf dem betroffenen Handy. Persistiert die Installations-Geometrie, kann nach einem OS-Update eine erneute Home-Bildschirm-Installation nötig sein.

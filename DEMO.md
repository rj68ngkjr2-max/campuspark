# CampusPark · Demo für Nutzertests

## Einstieg und Trennung

Im Login unten **Demo-Version ausprobieren** wählen oder direkt `demo.html` öffnen. Es werden keine Anmeldung und keine Freigabe benötigt.

Die Demo verwendet dieselben Bildschirmfunktionen, Styles, Karten, Parkdauer-Räder und Gesten wie die Live-App. Ein eigener Build ersetzt ausschließlich die Datenanbindung. `demo.js` enthält keinen Supabase-Client, keine Projektkonfiguration und keinen Zugriff auf die Live-Sitzung. Eine zusätzliche Content Security Policy erlaubt Datenanfragen nur an Photon für Ortsvorschläge. Die Karte lädt öffentliche OpenStreetMap-Kacheln.

Alle Nutzer, Kennzeichen, Belegungen, Fahrten und Nachrichten sind erfunden. Änderungen werden unter `campuspark.demo.v1` im Session Storage dieses Tabs gespeichert. Das Erscheinungsbild verwendet ausschließlich `campuspark.demo.theme`. Bei nicht verfügbarem Speicher funktioniert die Demo im Arbeitsspeicher; beim Neuladen beginnt sie dann neu. Es gibt weder eine Synchronisierung zwischen Geräten noch echte E-Mails oder Benachrichtigungen.

Die Live-Datenbank, Zugangskontrollen und Freigabepflicht bleiben unverändert. Kein SQL-Setup ist für die Demo nötig. Der Demo-Rollenumschalter gewährt keinerlei Live-Berechtigungen.

## Bedienung

Oben steht immer **Testversion · alle Daten erfunden**. **Demo steuern** öffnet:

- **Lea · Nutzerin:** Start ohne aktiven Parkvorgang, zwei Kennzeichen, eigenes Mitfahrtangebot und Chats.
- **Tom · Fahrer:** Aktiver Parkvorgang, Fahrt aus Weil am Rhein und offene Anfrage von Lea. Diese kann bestätigt werden.
- **Alex · Admin:** Unter Profil die Administration öffnen. Parkflächen und fiktive Konten bearbeiten; Jules wartet auf Freigabe.
- **Demo zurücksetzen:** Sofort zurück zum Ausgangszustand mit Lea. Alle Demo-Änderungen in diesem Tab werden verworfen, Live-Daten bleiben unberührt.
- **Zur Live-Anmeldung:** Zur ursprünglichen App zurückkehren. Eine bestehende Live-Sitzung wird nicht abgemeldet.

Abfahrten werden beim ersten Start und beim Reset für den nächsten Tag angelegt. Bei einem Test an einem neuen Tag deshalb zunächst zurücksetzen. Der Demo-Link ist ohne Anmeldung teilbar. Beim Hinzufügen der Demo zum Home-Bildschirm verwendet sie ein eigenes Manifest mit Start auf `demo.html`.

## Ausgangsdaten

| Parkfläche | Kapazität | Belegung | Frei |
| --- | ---: | ---: | ---: |
| P1 · Parkplatz Nord | 60 | 39, davon Tom | 21 |
| P2 · Campusmitte | 30 | 27 | 3 |
| P3 · Nordost | 50 | 50 | 0 |
| P4 · Bibliothek | 20 | 8 | 12 |

Die Grundbelegung stellt erfundene weitere Fahrzeuge dar. Eigene Parkvorgänge werden hinzugezählt. Vier Angebote aus Weil am Rhein, Schopfheim, Rheinfelden und Lörrach sowie zwei Fahrtgesuche sind vorhanden. Die beiden vorbereiteten Unterhaltungen zeigen unterschiedliche Rollen.

## Kurzer Probelauf

1. Zurücksetzen. Als Lea P2 wählen, zweites Kennzeichen und individuelle Dauer einstellen, einchecken, verlängern und auschecken.
2. Als Lea Toms Angebot ansehen und die vorbereitete Unterhaltung öffnen. Eine Nachricht senden.
3. Zu Tom wechseln. In Chats Leas Anfrage bestätigen und antworten. Zu Lea wechseln und die Bestätigung sowie die Antwort ansehen.
4. Als Lea ein eigenes Angebot veröffentlichen. Als Tom dieses Angebot anfragen. Als Lea die Anfrage bestätigen oder ablehnen.
5. Zu Alex wechseln. Im Profil die Administration öffnen, Jules freigeben und eine Modellparkfläche bearbeiten.
6. Zurücksetzen und prüfen, dass Jules wieder ausstehend ist und alle ursprünglichen Werte wiederhergestellt sind.

## Bezug zum Vorlesungsskript

Umgesetzt sind die App-Anforderungen aus „Schritt 0“ (PDF-Seite 9, Foliennummer 11): unmittelbarer Zugang ohne Registrierung, Rollenwechsel, Beispieldaten, vollständige Kernabläufe mit sichtbarer Rückmeldung, schneller Reset und sichtbarer Testhinweis. Die Kernoberfläche bleibt dieselbe wie in der bestehenden App.

Das Skript fordert zusätzlich die Durchführung und Dokumentation von Nutzertests. Testaufgaben, Fragebogen, Beobachtungen und Interviews werden nicht durch diese Demo ersetzt. Für vergleichbare Ergebnisse den getesteten Stand während der Interviews stabil halten. Vor der ersten Sitzung auf einem echten iPhone und Android-Gerät in einem privaten Browserfenster durchspielen; Desktop-Viewport-Prüfungen ersetzen keine echten Gerätetests.

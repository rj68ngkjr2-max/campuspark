# CampusPark Demo für den vereinbarten Testplan

## Einstieg

[Demo öffnen](https://rj68ngkjr2-max.github.io/campuspark/demo.html). Auf der Live-Login-Seite führt weiterhin „Demo-Version ausprobieren“ zur getrennten Demo.

Vor jeder Sitzung **Demo steuern → Demo zurücksetzen** wählen. Der Test startet als Lea Winter mit der Rolle **Nutzer**, zwei Kennzeichen und ohne aktiven Parkvorgang. Die drei Kernaufgaben laufen vollständig im selben Konto. Es gibt keine separate Fahrerrolle und keinen Rollenumschalter im laufenden Test.

Oben ist die Testversion gekennzeichnet. Unter „Demo steuern“ steht auch die App-Version für Testplan, Beobachtungsbogen und Fragebogen. Die Vorlesetexte und Erfolgskriterien bleiben in euren Word-Dateien; die App zeigt keine Lösungsanleitung für die Testaufgaben.

## Vorbereitete Daten für die Aufgaben

| Aufgabe | Ausgangslage und prüfbares Ergebnis |
| --- | --- |
| 1 Parken | Lea hat `LÖ DEMO 1` und `FR DEMO 2`. Kein aktiver Parkvorgang. P1, P2 und P4 haben freie Kapazität. Das zweite Kennzeichen und 90 Minuten können gewählt werden; Endzeit und Checkout bleiben wie in der Live-Oberfläche. |
| 2 Mitfahrt | Alex Campus bietet **morgen um 08:00 Uhr Schopfheim → DHBW Lörrach** an, mit drei freien Plätzen. Noch keine Anfrage von Lea vorhanden. Anfrage erstellen und anschließend „Ich warte am vereinbarten Treffpunkt.“ im Chat senden. |
| 3 Angebot | Im selben Nutzerkonto eine neue Fahrt **morgen um 07:45 Uhr Weil am Rhein → DHBW Lörrach**, zwei freie Plätze, veröffentlichen. Das Nutzerkonto hat zu Beginn keine eigenen Angebote. Ortsauswahl und Formular entsprechen der Live-App. |
| Z Administration | Das Konto `campus-test-neu` ist ausstehend. Nach der Freigabe ist eine normale Demo-Anmeldung möglich; das Konto bekommt keine Adminrechte. |

Weitere erfundene Angebote, Fahrtgesuche und ein Chat mit Nora bleiben als Hintergrunddaten vorhanden. Alex ist auch das verfügbare Gegenkonto für die Anfrage aus Aufgabe 2. Falls die Moderation die Gegenseite prüfen möchte, kann sie sich nach den Kernaufgaben als Alex anmelden und dort den Chat öffnen.

Die Angebote werden bei jedem Reset auf den nächsten Tag gesetzt. Deshalb vor jeder Sitzung zurücksetzen, insbesondere nach einem Tageswechsel. Reset entfernt eigene Demo-Angebote, Anfragen, Nachrichten, Parkvorgänge und Freigaben und stellt die ursprüngliche Belegung wieder her.

## Genau zwei Rollen und ein gemeinsamer Demo-Login

Für den optionalen Admin-Test im Profil **Abmelden** oder unter „Demo steuern“ **Zur Demo-Anmeldung** wählen. Im Anmeldeformular gibt es zwei Hilfen zum Vorausfüllen: **Nutzer** und **Admin**. Beide verwenden dasselbe Formular; anschließend „Anmelden“ drücken. Die Kernaufgaben benötigen diesen Wechsel nicht.

Nur für die Moderation, getrennt vom Aufgabenblatt aufbewahren:

| Testkonto | Rolle | E-Mail | Zustand nach Reset |
| --- | --- | --- | --- |
| Lea Winter | Nutzer | `lea@campuspark.example.invalid` | freigegeben, zwei Kennzeichen |
| Alex Campus | Admin | `alex@campuspark.example.invalid` | freigegeben, Gegenkonto für Aufgabe 2 |
| campus-test-neu | Nutzer | `campus-test-neu@campuspark.example.invalid` | wartet auf Freigabe |

Öffentliches, rein lokales Demo-Passwort für diese Testkonten: `CampusDemo2026!`. Es ist kein Zugang zur Live-App und keine geheime oder echte Authentifizierung.

Das dritte Konto dient nur dem Freigabetest und besitzt dieselbe Nutzerrolle; es ist keine dritte Demo-Rolle.

## Optionalen Freigabetest durchführen

1. Als Admin anmelden und im Profil die Administration öffnen.
2. Das ausstehende Konto `campus-test-neu` freigeben. Für den Beobachtungsbogen die oben genannte E-Mail notieren.
3. Abmelden. Im selben Demo-Anmeldeformular die E-Mail von `campus-test-neu` und das Demo-Passwort eingeben.
4. Anmeldung funktioniert; im Profil ist keine Administration verfügbar. Vor der Freigabe wird diese Anmeldung abgelehnt.
5. Für die nächste Testperson zurücksetzen. Das Konto ist dann wieder ausstehend.

## Trennung von der Live-App

Die Oberfläche und ihre Bedienabläufe stammen aus demselben App-Code. Der separate Demo-Build ersetzt ausschließlich die Datenanbindung und ergänzt Demo-Steuerung sowie Demo-Anmeldung. Der Live-App-Code, dessen Styles und die Supabase-Datenbank bleiben unverändert.

`demo.js` enthält keinen Supabase-Client, keine Projektkonfiguration und keinen Zugriff auf Live-Anmeldeschlüssel. Daten werden ausschließlich unter `campuspark.demo.v2` im Session Storage dieses Tabs gespeichert; das Erscheinungsbild nutzt `campuspark.demo.theme`. Die lokale Freigabe verleiht keine Live-Berechtigung. Es werden keine E-Mails gesendet.

Die Demo synchronisiert nicht zwischen Geräten oder Tabs. Bei gesperrtem Browserspeicher arbeitet sie im Arbeitsspeicher; Neuladen setzt dann den Zustand zurück. Karte und Online-Ortsvorschläge benötigen Internet und verwenden OpenStreetMap beziehungsweise Photon. Das eigene Demo-Manifest startet auch vom Home-Bildschirm auf `demo.html`.

## Prüfungen

Automatisierte Szenariotests decken die exakten Aufgaben 1, 2, 3 und Z, beide Rollen, Nachrichtenduplikate, Reset, Speicherung und Trennung vom Live-Build ab. Im Browser wurden das passende Angebot, Anfrage und Nachricht sowie die abgelehnte Anmeldung vor und die normale Anmeldung nach Freigabe geprüft.

Die Gerätebeobachtungen und Bewertungen aus euren Word-Bögen bleiben Teil der echten Nutzertests. Browseransichten am Desktop ersetzen keine Prüfung auf einem echten iPhone und Android-Gerät. Insbesondere unterer Bildschirmrand, Tastatur, Swipe-Gesten und Home-Bildschirm-Modus vor jeder Runde auf den Testgeräten prüfen.

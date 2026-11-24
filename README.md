# Chantals Adventskalender

Statische Website für GitHub Pages, mit Passwort-Einstieg und 24 Türchen für Dezember 2026. Alle Türchen enthalten zunächst Platzhalter.

## Lokal ansehen

Die fertig gebaute index.html im Projektordner oder in dist lässt sich direkt per Doppelklick öffnen. JavaScript und verschlüsselte Inhalte funktionieren auch als lokale Datei.

Optional steht ein Vorschau-Server bereit. Dafür wird Node.js benötigt. Keine zusätzlichen Pakete erforderlich.

```powershell
npm run preview
```

Öffne http://localhost:4173. Der Kalender verwendet das persönlich vereinbarte Passwort. Beim erneuten Bauen dasselbe Passwort eingeben oder bewusst ein neues festlegen.

Mit http://localhost:4173/?vorschau=1 sind alle Türchen zum Testen verfügbar. Der Passwortschutz gilt weiterhin. Ohne diesen Parameter öffnen sich die Türchen ab ihrem jeweiligen Datum in der Zeitzone Europe/Berlin. Vergangene Türchen bleiben verfügbar.

## Inhalte und Passwort setzen

Eine lokale Datei `content.local.json` anlegen. Sie enthält ein Array mit genau 24 Einträgen, jeweils mit `day`, `title` und `text`.

```json
{"day":1,"title":"Ein Brief für dich","text":"Liebe Chantal, …"}
```

Die Datei ist in .gitignore ausgeschlossen. Wenn sie fehlt, erzeugt der Build 24 Platzhalter. Bilder und Gutscheinfunktionen können später ergänzt werden.

In PowerShell ein Passwort eingeben und neu bauen.

```powershell
$secret = Read-Host 'Kalender-Passwort' -AsSecureString
$env:CALENDAR_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
try { npm run build } finally { Remove-Item Env:CALENDAR_PASSWORD }
```

## Veröffentlichung

Für GitHub Pages ausschließlich den Inhalt von `dist/` als Website veröffentlichen. Alle Pfade sind relativ und funktionieren auch unter einem Repository-Unterpfad. Das Repository und die Veröffentlichung sind noch einzurichten.

## Verschlüsselung und Verhalten

Die Texte liegen in der index.html eingebettet und zusätzlich in `dist/calendar.enc.json` mit AES-256-GCM verschlüsselt. PBKDF2-SHA-256 mit 600.000 Iterationen und zufälligem Salt leitet den Schlüssel aus dem Passwort ab. Der Browser hält entschlüsselte Inhalte nur während der geöffneten Sitzung. Nach Neuladen wird das Passwort erneut benötigt.

Die Datumssperre ist eine Komfortfunktion im Browser. Wer das Passwort besitzt, kann alle Inhalte technisch vorzeitig entschlüsseln oder den Vorschauparameter verwenden. Eine manipulationssichere Freigabe nach Datum benötigt einen Server oder tägliche Veröffentlichung.

Geöffnete Türchennummern werden im lokalen Browserspeicher gespeichert. Das funktioniert ohne Konten, wird aber nicht zwischen Geräten synchronisiert. Die Seite lädt keine externen Schriften oder Dienste.

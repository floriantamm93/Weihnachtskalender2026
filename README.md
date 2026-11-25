# Chantals Adventskalender

Statische Website für Dezember 2026 mit verschlüsselten Inhalten. Türchen 1–6 sowie die Sound-Türchen 7 und 11 sind zum Befüllen vorbereitet. Die übrigen Türchen enthalten allgemeine Platzhalter.

## Inhalte ergänzen

Bearbeite `content.local.json` im Projektordner. Die Datei wurde bereits mit den Vorlagen angelegt und ist von Git ausgeschlossen. Auf einem neuen Rechner zunächst `content.example.json` nach `content.local.json` kopieren. Die Beispieldatei enthält die öffentlichen Platzhalter.

| Tag | Ansicht | Felder zum Befüllen |
| --- | --- | --- |
| 1 | Brief | `greeting`, `text`, `signature` |
| 2 | Foto-Erinnerung | `text`, `image.src`, `image.alt`, `image.caption` |
| 3 | Filmabend-Gutschein | `text`, `voucher.headline`, `voucher.details`, `voucher.note` |
| 4 | Persönlicher Brief | `greeting`, `text`, `signature` |
| 5 | Quiz mit drei Fragen | `questions`, `completionText` |
| 6 | Galerie mit fünf Bildern | `text`, fünf Einträge in `photos` |
| 7 | Song mit Spieluhr | `text`, `audio.src`, `audio.title` |
| 11 | Sprachnachricht mit Spieluhr | `text`, `audio.src`, `audio.title` |

`title` ist jeweils die Überschrift im geöffneten Türchen. Eckige Klammern in den Texten markieren Stellen zum Ersetzen. Für Absätze innerhalb eines JSON-Textes `\n\n` verwenden. Die Nummern `day` von 1 bis 24 beibehalten.

### Fotos

Lege Bilder in `private-media/` ab. Unterstützt werden JPG, PNG, GIF und WebP. Trage bei `src` den Dateinamen relativ zu diesem Ordner ein, beispielsweise `erinnerung.jpg` oder `nikolaus/bild-1.jpg`. `alt` beschreibt das Bild, `caption` erscheint darunter. Eine leere Zeichenfolge bei `src` zeigt einen Platzhalter.

Die Galerie hat genau fünf Bildplätze. Jedes Bild lässt sich einzeln aufdecken und verbergen. Beim Schließen des Türchens werden alle wieder verborgen.

### Spieluhren und Sounds

Für Türchen 7 und 11 eine MP3-, WAV-, OGG- oder M4A-Datei in `private-media/` ablegen. In `audio.src` den relativen Dateinamen eintragen, beispielsweise `song.mp3` oder `sprachnachricht.m4a`. `audio.title` ist der Titel beim Abspielen. Ein leeres `src` lässt die Spieluhr mit Platzhalter ausprobieren. MP3 eignet sich gut für kompakte Dateien und breite Browserunterstützung.

Zehn Klicks auf die Spieluhr starten den Sound. Jeder Klick dreht ausschließlich den Schlüssel. Die benötigte Klickzahl und der Fortschritt werden in der Oberfläche verborgen. Enter und Leertaste funktionieren ebenfalls. Danach stehen Pause, Lautstärke und Fortschritt im Audioplayer zur Verfügung. Falls der Browser den automatischen Start verhindert, lässt sich die Wiedergabe dort manuell starten. Beim Schließen stoppt der Sound. Jedes erneute Öffnen beginnt bei null Umdrehungen.

Audiodateien werden beim Bauen zusammen mit den übrigen Inhalten verschlüsselt. Das dekorative Spieluhrmotiv liegt in `assets/gothic-music-box.png`.

### Quiz und Gutschein

Jede der drei Quizfragen hat eine `question`, eine Liste `answers`, eine `correctAnswer` und eine `explanation`. Die Antworten werden ab null gezählt. Bei drei Antworten steht `0` für die erste, `1` für die zweite und `2` für die dritte. `completionText` erscheint nach der letzten Frage.

Das Quiz startet bei jedem Öffnen neu. Der Gutschein zeigt deine Konditionen an. Einen Termin oder die Einlösung könnt ihr persönlich vereinbaren.

## Bauen

Nach Änderungen an Texten, Bildern oder Audiodateien den Kalender mit dem vereinbarten Passwort neu bauen. Node.js wird benötigt, zusätzliche Pakete sind nicht erforderlich.

```powershell
$secret = Read-Host 'Kalender-Passwort' -AsSecureString
$env:CALENDAR_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
try { npm run build } finally { Remove-Item Env:CALENDAR_PASSWORD }
```

Der Build prüft die Inhalte und liest die Mediendateien ein. Texte, Bilder und Audiodateien werden gemeinsam verschlüsselt und in die `index.html` sowie in `dist/` geschrieben. Ungültige Quizantworten, fehlende Bilddateien oder nicht unterstützte Formate brechen den Build mit einer Fehlermeldung ab. Wenn `content.local.json` fehlt, verwendet der Build die Beispieldatei.

## Lokal ansehen

Die gebaute `index.html` im Projektordner oder in `dist/` lässt sich direkt per Doppelklick öffnen. Für eine lokale Vorschau mit allen freigegebenen Türchen den Server starten.

```powershell
npm run preview
```

Öffne http://localhost:4173/?vorschau=1 und gib das vereinbarte Passwort ein. Ohne Vorschauparameter werden die Türchen ab ihrem jeweiligen Datum in der Zeitzone Europe/Berlin freigegeben. Vergangene Türchen bleiben verfügbar.

## GitHub Pages

Das Repository veröffentlicht den Branch `codex/adventskalender` aus dem Stammordner. Nach dem Bauen die aktualisierten Website-Dateien committen und pushen. Die fertige Website steht außerdem in `dist/` zur Verfügung.

`content.local.json` und `private-media/` sind durch `.gitignore` ausgeschlossen. Persönliche Inhalte gehören in diese lokalen Dateien. `content.example.json` wird als öffentliche Vorlage versioniert.

## Verschlüsselung und Verhalten

Texte, Bilder und Audiodateien werden mit AES-256-GCM verschlüsselt. PBKDF2-SHA-256 mit 600.000 Iterationen und zufälligem Salt leitet den Schlüssel aus dem Passwort ab. Nach Neuladen wird das Passwort erneut benötigt.

Die Datumssperre ist eine Komfortfunktion im Browser. Wer das Passwort besitzt, kann alle Inhalte technisch vorzeitig entschlüsseln oder den Vorschauparameter verwenden. Eine manipulationssichere Freigabe nach Datum benötigt einen Server oder tägliche Veröffentlichung.

Geöffnete Türchennummern werden im lokalen Browserspeicher gespeichert. Der Vorschaumodus hat einen eigenen Speicher. Es gibt keine Synchronisierung zwischen Geräten. Quizantworten und aufgedeckte Bilder werden nicht dauerhaft gespeichert.

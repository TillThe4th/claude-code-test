# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Entwicklungsumgebung

Kein Build-System, kein Package-Manager — reines HTML/CSS/JS-Projekt. Zum Entwickeln einfach `index.html` im Browser öffnen oder einen lokalen Dev-Server starten:

```bash
# Mit Python (überall verfügbar)
python -m http.server 8080

# Mit Node.js npx
npx serve .

# Mit VS Code: Live Server Extension → "Open with Live Server"
```

## Projektstruktur

Einstiegspunkt ist `index.html`. CSS in `style.css`, Logik in `script.js`. Neue Module als separate `.js`-Dateien anlegen und per `<script src="...">` oder ES-Module (`type="module"`) einbinden.

## Git & GitHub Workflow

Nach **jeder abgeschlossenen Coding-Aufgabe** committen und pushen:

```bash
git add <datei>          # oder git add -A für alles
git commit -m "typ: was und warum"
git push
```

**Commit-Typen:** `feat:` · `fix:` · `style:` · `refactor:` · `docs:` · `chore:`

- Hauptbranch: `main` — direkt pushen nur für kleine Änderungen
- Feature-Branches `feature/beschreibung` + `gh pr create` bei größeren Änderungen
- Remote: `https://github.com/TillThe4th/claude-code-test`

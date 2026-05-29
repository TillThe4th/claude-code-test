# Claude Code – Git & GitHub Workflow

## Git-Pflicht nach jeder Änderung

Nach **jeder abgeschlossenen Coding-Aufgabe** (neue Datei, Bugfix, Feature, Refactoring):

1. Stage die betroffenen Dateien gezielt (`git add <datei>`) oder alle (`git add -A`)
2. Erstelle einen aussagekräftigen Commit:
   ```
   git commit -m "typ: kurze Beschreibung was und warum"
   ```
3. Push direkt zu GitHub:
   ```
   git push
   ```

### Commit-Typen
- `feat:` — neues Feature
- `fix:` — Bugfix
- `style:` — CSS/Layout-Änderungen
- `refactor:` — Umstrukturierung ohne Funktionsänderung
- `docs:` — Dokumentation
- `chore:` — Build, Konfiguration, Dependencies

### Beispiele
```
feat: Navigationsleiste mit mobilem Hamburger-Menü
fix: Formular-Validierung bei leerem E-Mail-Feld
style: Dark-Mode-Farbschema für Header angepasst
```

## GitHub-Workflow

- Hauptbranch: `main`
- Feature-Branches: `feature/beschreibung`
- PRs via `gh pr create` wenn sinnvoll (bei größeren Features)
- Niemals direkt in `main` pushen ohne Test

## Repo

- Remote: `origin` → `https://github.com/TillThe4th/claude-code-test`
- GitHub-Account: `TillThe4th`

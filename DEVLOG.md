# The DelQuro Files — Dev Log

## Project Overview
- **App**: The DelQuro Files
- **Purpose**: Quick idea logging + project tracker with links to Arena.ai & GitHub
- **Stack**: HTML / CSS / JS (no build step)
- **Hosting**: GitHub Pages (free)
- **Design**: Mobile-first responsive
- **Storage**: localStorage (zero-config, works on first run)

---

## Build Log

### Slice 1 — Core Foundation (2026-08-15)
**Goal**: App loads, idea capture works, data persists.
- [x] Project structure: `index.html`, `style.css`, `app.js`
- [x] Mobile-first CSS with dark theme
- [x] Quick idea capture with timestamp
- [x] localStorage persistence
- [x] Idea list with delete
- [x] Auto-scroll to newest
- [x] Timestamp formatting (relative + absolute)

### Slice 2 — Project Tracker (2026-08-15)
**Goal**: Manage projects with Arena.ai / GitHub links.
- [x] Project cards with name, description, status
- [x] Link fields for Arena.ai and GitHub URLs
- [x] Project status badges (active, paused, completed, idea)
- [x] Quick-launch buttons to open project links
- [x] Edit and delete projects

### Slice 3 — Activity / Changelog (2026-08-15)
**Goal**: Auto-log every action taken in the app.
- [x] Activity log captures all user actions
- [x] Timestamped entries
- [x] Log ideas created/deleted
- [x] Log projects added/edited/deleted
- [x] Log exports/imports
- [x] Activity view in sidebar/tab

### Slice 4 — Tags & Search (2026-08-15)
**Goal**: Find things fast.
- [x] Tag ideas on creation
- [x] Filter by tag
- [x] Full-text search across ideas and projects
- [x] Search highlights

### Slice 5 — Data Portability (2026-08-15)
**Goal**: Export everything, import anything.
- [x] Export all data as JSON
- [x] Import from JSON backup
- [x] Copy to clipboard
- [x] GitHub-ready: just push and enable Pages

### Slice 6 — GitHub Sync (2026-08-15)
**Goal**: Login + data sync across devices via GitHub Gist.
- [x] Settings view with GitHub token input
- [x] Connect/disconnect GitHub account
- [x] Token verification (checks valid GitHub user)
- [x] Auto-create private Gist for data storage
- [x] Push data to Gist after every change (3s debounce)
- [x] Pull data from Gist on app startup
- [x] Smart merge: remote wins conflicts, local-only items preserved
- [x] Token stored obfuscated in localStorage
- [x] Sync status display (connected, last sync time, gist ID)
- [x] Manual sync button
- [x] Auto-sync on idea/project add/edit/delete
- [x] Clear all data option (danger zone)

---

## Design Decisions
1. **Single-page app** — no router needed, simple navigation
2. **No dependencies** — zero npm, zero CDN, works offline
3. **localStorage** — instant persistence, no server needed
4. **CSS custom properties** — easy theming
5. **JSON export** — portable, human-readable, git-friendly
6. **GitHub Gist sync** — free, no backend needed, uses existing GitHub account
7. **Token obfuscation** — not real encryption but prevents casual viewing in localStorage
8. **Debounced sync** — 3s delay prevents API spam while typing
9. **Smart merge** — combines local + remote without data loss

---

## User Dialog Log
- User requested: Full-stack idea logger + project tracker
- Key requirements: quick capture, Arena.ai/GitHub links, mobile-first, GitHub Pages hosting, fully functional on first run, vertical slice builds, complete change logging
- Approach: Static SPA with localStorage, no build step, drop-in deployable
- User requested: Login + data sync across devices
- Chosen approach: GitHub Personal Access Token + Gist API (stays in GitHub ecosystem)
- Implementation: Token stored obfuscated, data syncs to private Gist, auto-sync on changes, pull on startup

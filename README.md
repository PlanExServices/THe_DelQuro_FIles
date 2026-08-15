# The DelQuro Files

> Quick idea capture + project tracker with Arena.ai & GitHub links.  
> Mobile-first. Zero dependencies. Works on first run.

![Version](https://img.shields.io/badge/version-1.0.0-6c5ce7)
![License](https://img.shields.io/badge/license-MIT-green)
![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-free)

## ✨ Features

- **⚡ Quick Capture** — Type and save ideas instantly. Tags, timestamps, auto-log.
- **📁 Project Tracker** — Track apps/projects with status, Arena.ai & GitHub links.
- **📋 Activity Log** — Every action auto-logged. Full audit trail.
- **🔍 Search & Filter** — Find anything across ideas, projects, and tags.
- **🔗 GitHub Sync** — Login with GitHub, data syncs to a private Gist. Cross-device!
- **📦 Export/Import** — JSON backup. Portable. Git-friendly.
- **📱 Mobile-First** — Looks and feels great on any device.
- **🌑 Dark Theme** — Easy on the eyes, day or night.
- **⌨️ Keyboard Shortcuts** — Alt+N (new idea), Alt+1/2/3/4 (switch tabs)

## 🚀 Deploy to GitHub Pages (2 minutes)

1. Create a new repo on GitHub
2. Push these 3 files:
   ```
   index.html
   style.css
   app.js
   ```
3. Go to **Settings → Pages**
4. Source: **Deploy from branch** → `main` → `/ (root)`
5. Your app is live at `https://yourusername.github.io/repo-name/`

That's it. No build step. No npm. No server.

## 🔗 Setting Up GitHub Sync

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=gist&description=DelQuro%20Files)
2. Give it a name like "DelQuro Files"
3. Check the **gist** scope
4. Click **Generate token** — copy it
5. In the app, go to **⚙️ Settings** → paste the token → **Connect GitHub**
6. Done! Data auto-syncs to a private Gist from now on.

## ⌨️ Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + N` | New idea (focus capture) |
| `Alt + 1` | Ideas tab |
| `Alt + 2` | Projects tab |
| `Alt + 3` | Activity log tab |
| `Alt + 4` | Settings tab |
| `Ctrl + Enter` | Save idea (while typing) |
| `Escape` | Close modals |

## 🏗 Architecture

```
delquro-files/
├── index.html    — App shell & structure
├── style.css     — Mobile-first styles (dark theme)
├── app.js        — All logic (data, UI, events)
├── DEVLOG.md     — Build log & decisions
└── README.md     — This file
```

**Data Storage:** localStorage (browser-native, zero-config)  
**Dependencies:** None  
**Build Step:** None  

## 📋 Dev Log

See [DEVLOG.md](./DEVLOG.md) for full build history, design decisions, and changelog.

## 🗺 Roadmap

- [ ] Markdown support in idea text
- [ ] Drag-to-reorder ideas/projects
- [ ] PWA manifest + service worker (offline-first)
- [ ] Multi-device sync via GitHub Gist
- [ ] Idea templates / recurring prompts
- [ ] Export to Markdown (for docs)

## 📄 License

MIT — Do whatever you want with it.

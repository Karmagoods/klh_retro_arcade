# KLH Retro Arcade

Classic retro arcade games in the browser — **Breakout**, **Pong**, **Snake**, **Space Invaders**, and **Tetris**.

Built with HTML5 Canvas, CSS, and vanilla JavaScript. Desktop keyboard + full mobile touch controls. **Installable PWA**.

## Play

Open `games/index.html` (or the root `index.html` redirect) in a modern browser over **HTTPS** (or localhost).

- **Desktop:** Arrow keys / WASD · Space · P pause · Esc menu  
- **Mobile:** On-screen controls · drag on canvas · swipe (Snake)
- **Install:** Chrome/Edge show an install banner; iOS Safari → Share → Add to Home Screen. Settings also has **Install App**.

## PWA

- `manifest.webmanifest` — name, icons, standalone display
- `sw.js` — offline cache of shell + games
- `js/install.js` — `beforeinstallprompt` banner + iOS guidance
- Icons under `assets/icons/`

## Stack

- Neon CRT-style UI with scanlines and responsive layout
- Local high scores & settings (`localStorage`)
- Procedural Web Audio SFX
- Touch-ready controls on all five games

## Version

0.4 — PWA install prompts + service worker

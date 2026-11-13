# KLH Retro Arcade

Classic retro arcade games in the browser — **Breakout**, **Pong**, **Snake**, **Space Invaders**, **Tetris**, **Moto Dash**, **Turbo Race**, **Combat Zone**, **Maze Munch**, and **Hopper**.

Built with HTML5 Canvas, CSS, and vanilla JavaScript. Desktop keyboard + full mobile touch controls. **Installable PWA**.

## Play

Open `games/index.html` (or the root `index.html` redirect) in a modern browser over **HTTPS** (or localhost).

- **Desktop:** Arrow keys / WASD · Space · P pause · Esc menu  
- **Mobile:** On-screen controls · drag on canvas · swipe (Snake, Maze Munch, Hopper)
- **Install:** Chrome/Edge show an install banner; iOS Safari → Share → Add to Home Screen. Settings also has **Install App**.

## Games

| Game | Genre |
| --- | --- |
| Breakout | Brick breaker |
| Pong | Paddle duel |
| Snake | Grid grower |
| Space Invaders | Fixed shooter |
| Tetris | Falling blocks |
| Moto Dash | Endless traffic dodge |
| Turbo Race | Top-down racer |
| Combat Zone | Run-and-gun |
| Maze Munch | Maze chase (Pac-Man style) |
| Hopper | Lane crosser (Frogger style) |

## PWA

- `manifest.webmanifest` — name, icons, standalone display
- `sw.js` — offline cache of shell + games
- `js/install.js` — `beforeinstallprompt` banner + iOS guidance
- Icons under `assets/icons/`

## Stack

- Neon CRT-style UI with scanlines and responsive layout
- Local high scores & settings (`localStorage`)
- Procedural Web Audio SFX
- Touch-ready controls on all ten games

## Version

0.5 — Maze Munch + Hopper added

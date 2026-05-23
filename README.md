# ORBITAL COMMAND — Operation Contested Orbit

A mobile-first React orbital warfare game built on USSF operational doctrine.
Command a satellite constellation through a 12-mission campaign, defending
against ASATs, jamming enemy comms, and seizing orbital dominance.

## Features

- **12-mission campaign** "Operation Contested Orbit" across three phases:
  Defensive, Offensive, and Strategic Operations.
- **Quick Mission mode** with five scenarios and five difficulty tiers.
- **Persistent progression** — star ratings, global stats, unlockables.
- **Doctrine-based combat** — Detect → Track → Engage. ISR, COMM, INTC, STRK,
  EWAR, DEF satellite types each fill distinct roles.
- **Touch-first controls** — tap to select, drag to maneuver, tap to designate
  targets. Action bar for SCAN / MOVE / ENGAGE / JAM.
- **Realistic orbital mechanics** — three altitude bands (LEO/MEO/GEO) with
  band-appropriate velocities; orbital decay; fuel consumption for maneuvers.
- **Environmental effects** — destroyed satellites generate persistent debris
  clouds that damage anything passing through.

## Running

```bash
npm install
npm run dev      # development at http://localhost:5173
npm run build    # production build to dist/
```

Optimised for mobile / landscape orientation. Save state persists in
`localStorage` under `orbital-command-v1`.

## Stack

React 18 + Vite + HTML5 Canvas (no other runtime dependencies).

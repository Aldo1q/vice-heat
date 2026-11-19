# Vice Heat — a top-down crime sandbox

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Aldo1q/vice-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Aldo1q/vice-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Vice Heat** is a top-down 2D open-world crime game for the make.fun
"Make GTA 6" bounty — a neon coastal city at dusk where you walk, steal
cars, run missions and outrun the heat. Everything is drawn in code on a
canvas: no libraries, no network, no external assets. Plain ES modules,
a fixed 1280×720 viewport with a camera over a 3840×2160 world, a fixed
1/60 s simulation step and a seeded RNG (`?seed=N`).

## The game

Vice City at golden hour: a road grid with sidewalks, crosswalks and
dashed centre lines; blocks of neon-signed buildings — HOTEL, CLUB NEON,
DINER, PALMS CASINO — glowing pink and cyan over deep purple asphalt;
a beach with animated water, palm trees, umbrellas and long dusk shadows.

**Systems**

- **On foot & driving** — 8-way walking, press **E** to enter or exit the
  nearest car. Driving has acceleration, braking and reverse,
  speed-sensitive steering, skid marks on hard turns, brake lights,
  headlight glow and damage smoke.
- **Living traffic** — AI cars follow road lanes, turn at intersections
  and brake for each other; parked cars line the blocks.
- **Pedestrians** — they wander the sidewalks and dive or flee from fast
  cars and near misses. Clip one and the stars notice.
- **Wanted 1–5 stars** — stealing a car +1, hitting a pedestrian +1,
  hard traffic hits +1, hitting a police car +2. Cruisers spawn by star
  count, pursue and ram. If a cop stays close while you are slow for
  ~2 seconds you are **BUSTED**; break away and the stars decay one by one.
- **Collisions** — car↔building (stop and slide), car↔car (bounce, damage,
  smoke), car↔pedestrian (dive-away + wanted), world bounds.

**Missions** (banner + minimap marker, cash is the score)

1. **Warm-Up Lap** — drive to the beach checkpoint. **+$500**
2. **Special Delivery** — collect the package, deliver it to Club Neon
   before the 90-second timer runs out. **+$1,200**
3. **Heat Escape** — at wanted ≥2, lose the cops, then reach the hideout.
   **+$2,500**

After mission 3: free roam. Get busted and the run ends with your stats.

**HUD** — big condensed cash counter top-right with wanted stars under
it (they flash while police are searching), a circular minimap
bottom-left (roads, beach and water, player arrow, pulsing mission
marker, red/blue flashing police blips, traffic dots), speed and car
name bottom-right while driving, mission banner and toasts top-centre,
and context prompts like "Press E to enter Banshee".

## Controls

- **WASD / arrow keys** — walk; accelerate / brake / reverse and steer
  while driving
- **E** — enter / exit the nearest car
- **Enter / click** — start, restart after BUSTED
- **Esc / P** — pause

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game makes no
network requests and works fully offline.

Deterministic scenes for screenshots: `?shot=start|play|chase|end&seed=N`
stages that scene (title, neon-strip cruise, 3-star chase, BUSTED) with a
road-following autopilot and sets `window.__shotReady` when painted.

## Build the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Copies `game/` + `screenshots/` to `out/` and writes `out/dossier.json`
(via `vendor/makefun-game.ts`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=835rtjk0&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

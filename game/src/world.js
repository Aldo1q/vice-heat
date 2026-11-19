// Vice Heat world: a seeded coastal city (road grid, neon blocks, beach),
// traffic that follows lanes, pedestrians who wander and dive, police who
// pursue, a 1-5 star wanted system, car theft and three chained missions.
// No drawing and no browser in here: step() advances one fixed step from a
// control object {x, y, interact} and the renderer paints state.
import {
  CAR, CAR_TYPES, H_ROADS, LANE, PLAYER, ROAD_W, SAND_X, V_ROADS, WORLD,
} from './config.js';
import { pick, range } from './random.js';

export const EVENT_BUSTED = 1;
export const EVENT_MISSION = 2;

const TRAFFIC_COUNT = 15;
const PARKED_COUNT = 13;
const PED_COUNT = 22;
const MAX_POLICE = 5;

export const MISSIONS = [
  { name: 'MISSION 1 · WARM-UP LAP', objective: 'Drive to the beach checkpoint', reward: 500 },
  { name: 'MISSION 2 · SPECIAL DELIVERY', objective: 'Collect the package', reward: 1200 },
  { name: 'MISSION 3 · HEAT ESCAPE', objective: 'Lose the cops', reward: 2500 },
];
export const CHECKPOINTS = {
  beach: { x: 3310, y: 1080 },
  package: { x: 640, y: 1845 },
  club: { x: 1665, y: 972 },
  hideout: { x: 360, y: 235 },
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function circleRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  return d2 < r * r ? { nx, ny, dx, dy, d: Math.sqrt(d2) } : null;
}

/** Intersections of the road grid, as {x, y} centres. */
export const INTERSECTIONS = [];
for (const vx of V_ROADS) for (const hy of H_ROADS) INTERSECTIONS.push({ x: vx, y: hy });

export function isRoad(x, y) {
  for (const vx of V_ROADS) if (Math.abs(x - vx) < ROAD_W / 2) return true;
  for (const hy of H_ROADS) if (Math.abs(y - hy) < ROAD_W / 2) return true;
  return false;
}

const NEON_COLORS = ['#ff2e88', '#22d3ee', '#ffd93b', '#ff7a45', '#b388ff', '#5dff8f'];
const ROOF_COLORS = ['#4a3580', '#513a8c', '#463379', '#5a3f96', '#3f2f73', '#6247a8'];
const BUILDING_NAMES_FLAT = [
  'HOTEL', 'CLUB NEON', 'DINER', 'PALMS CASINO', 'VICE HOTEL', 'BAR',
  'OCEAN INN', 'CLUB MIRA', 'TACO RIO', 'HOTEL SOL', 'NEON GYM', 'LIQUOR',
  'PIZZA VICE', 'HOTEL LUNA', 'CLUB PULSE', 'SURF SHOP', 'BANCO', 'MOTEL',
  'CIGARS', 'HOTEL ROSA', 'DISCO 84', 'RAMEN', 'PALM COURT', 'ARCADE',
];

function buildCity(random) {
  const buildings = [];
  const palms = [];
  const props = [];
  let nameIdx = Math.floor(random() * BUILDING_NAMES_FLAT.length);
  // Blocks sit between neighbouring roads (and the world edges / beach).
  const xEdges = [70, ...V_ROADS, SAND_X - 60];
  const yEdges = [60, ...H_ROADS, WORLD.height - 60];
  for (let xi = 0; xi < xEdges.length - 1; xi += 1) {
    for (let yi = 0; yi < yEdges.length - 1; yi += 1) {
      const bx = xEdges[xi] + ROAD_W / 2 + 26;
      const by = yEdges[yi] + ROAD_W / 2 + 26;
      const bw = xEdges[xi + 1] - ROAD_W / 2 - 26 - bx;
      const bh = yEdges[yi + 1] - ROAD_W / 2 - 26 - by;
      if (bw < 150 || bh < 150) continue;
      const cols = bw > 430 ? 2 : 1;
      const rows = bh > 430 ? 2 : 1;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          const w = (bw - (cols - 1) * 34) / cols;
          const h = (bh - (rows - 1) * 34) / rows;
          const x = bx + c * (w + 34);
          const y = by + r * (h + 34);
          buildings.push({
            x: x + range(random, 0, 14), y: y + range(random, 0, 14),
            w: w - range(random, 0, 22), h: h - range(random, 0, 22),
            color: pick(random, ROOF_COLORS),
            neon: pick(random, NEON_COLORS),
            name: BUILDING_NAMES_FLAT[nameIdx++ % BUILDING_NAMES_FLAT.length],
            floors: 2 + Math.floor(random() * 4),
          });
        }
      }
      // Palms and props scattered on the block's sidewalk corners.
      const nPalm = 1 + Math.floor(random() * 3);
      for (let i = 0; i < nPalm; i += 1) {
        palms.push({
          x: bx - 16 + random() * (bw + 32), y: by - 16 + random() * (bh + 32),
          s: range(random, 0.8, 1.3), sway: random() * Math.PI * 2,
        });
      }
      if (random() < 0.7) {
        props.push({ kind: 'light', x: bx - 14, y: by - 14 });
        props.push({ kind: 'light', x: bx + bw + 14, y: by + bh + 14 });
      }
      if (random() < 0.5) props.push({ kind: 'crate', x: bx + random() * bw, y: by - 12 });
    }
  }
  // Beach palms, umbrellas and lights along the sand.
  for (let y = 140; y < WORLD.height - 80; y += range(random, 130, 210)) {
    palms.push({ x: SAND_X + range(random, 30, 130), y, s: range(random, 0.9, 1.4), sway: random() * Math.PI * 2 });
    if (random() < 0.75) props.push({ kind: 'umbrella', x: SAND_X + range(random, 90, 260), y: y + range(random, -30, 50), color: pick(random, NEON_COLORS) });
  }
  for (const ix of INTERSECTIONS) {
    props.push({ kind: 'light', x: ix.x - ROAD_W / 2 - 12, y: ix.y - ROAD_W / 2 - 12 });
    props.push({ kind: 'light', x: ix.x + ROAD_W / 2 + 12, y: ix.y + ROAD_W / 2 + 12 });
  }
  return { buildings, palms, props };
}

let CAR_ID = 1;
function makeCar(random, kind, x, y, angle) {
  const type = pick(random, CAR_TYPES);
  return {
    id: CAR_ID++, kind, x, y, angle, speed: 0,
    color: kind === 'police' ? '#e8ecf5' : type.color,
    name: kind === 'police' ? 'Police Cruiser' : type.name,
    topSpeed: kind === 'police' ? 500 : type.topSpeed,
    damage: 0, braking: false, siren: random() * Math.PI * 2,
    dir: 0, tx: x, ty: y, cruise: range(random, 215, 285),
    stuckT: 0, honkT: 0,
  };
}

function laneTarget(random, car) {
  // Choose the next intersection along the car's direction and aim at the
  // lane-correct corner of it; at the world edge, aim off-map (respawn).
  const cx = car.x;
  const cy = car.y;
  let best = null;
  for (const p of INTERSECTIONS) {
    if (car.dir === 0 && p.x > cx + 40 && Math.abs(p.y - cy) < ROAD_W && (best === null || p.x < best.x)) best = p;
    if (car.dir === 2 && p.x < cx - 40 && Math.abs(p.y - cy) < ROAD_W && (best === null || p.x > best.x)) best = p;
    if (car.dir === 1 && p.y > cy + 40 && Math.abs(p.x - cx) < ROAD_W && (best === null || p.y < best.y)) best = p;
    if (car.dir === 3 && p.y < cy - 40 && Math.abs(p.x - cx) < ROAD_W && (best === null || p.y > best.y)) best = p;
  }
  if (best === null) {
    car.tx = car.dir === 0 ? WORLD.width + 200 : car.dir === 2 ? -200 : cx;
    car.ty = car.dir === 1 ? WORLD.height + 200 : car.dir === 3 ? -200 : cy;
    car.edge = true;
    return;
  }
  car.edge = false;
  car.tx = best.x + (car.dir === 3 ? LANE : car.dir === 1 ? -LANE : 0);
  car.ty = best.y + (car.dir === 0 ? LANE : car.dir === 2 ? -LANE : 0);
}

function turnAtIntersection(random, car) {
  const r = random();
  if (r < 0.55) { /* straight on */ }
  else if (r < 0.78) car.dir = (car.dir + 1) % 4; // right turn
  else car.dir = (car.dir + 3) % 4; // left turn
  laneTarget(random, car);
}

function makePed(random, near) {
  const base = near || pick(random, INTERSECTIONS);
  const x = clamp(base.x + range(random, -260, 260), 40, WORLD.width - 40);
  const y = clamp(base.y + range(random, -260, 260), 40, WORLD.height - 40);
  return {
    x, y, angle: random() * Math.PI * 2, speed: 0, tx: x, ty: y,
    state: 'wander', timer: range(random, 0, 2), phase: random() * Math.PI * 2,
    color: pick(random, ['#ffd93b', '#22d3ee', '#ff2e88', '#5dff8f', '#f5f0ff', '#ff7a45', '#b388ff']),
    shirt: pick(random, ['#27356e', '#6e2737', '#276e4a', '#5c276e', '#6e5a27', '#274a6e']),
    vx: 0, vy: 0,
  };
}

function sidewalkTarget(random, ped) {
  const road = pick(random, INTERSECTIONS);
  const alongV = random() < 0.5;
  if (alongV) {
    ped.tx = clamp(road.x + (random() < 0.5 ? -1 : 1) * (ROAD_W / 2 + range(random, 14, 30)), 30, WORLD.width - 30);
    ped.ty = clamp(road.y + range(random, -420, 420), 30, WORLD.height - 30);
  } else {
    ped.tx = clamp(road.x + range(random, -420, 420), 30, WORLD.width - 30);
    ped.ty = clamp(road.y + (random() < 0.5 ? -1 : 1) * (ROAD_W / 2 + range(random, 14, 30)), 30, WORLD.height - 30);
  }
}

export function createWorld(random) {
  const city = buildCity(random);
  const state = {
    time: 0, elapsed: 0,
    player: { x: 1760, y: 1230, angle: -Math.PI / 2, inCar: null, phase: 0, moving: false },
    cars: [], peds: [], police: [],
    buildings: city.buildings, palms: city.palms, props: city.props,
    camera: { x: 1760, y: 1080 },
    cash: 0, wanted: 0, searching: false, bustT: 0, busted: false,
    crimeT: 0, searchT: 0, missionIdx: 0, missionPhase: 0, missionT: 0,
    banner: null, toasts: [], skids: [], parts: [],
    prompt: '', survived: 0, shake: 0,
  };

  function toast(text, color) {
    state.toasts.push({ text, color: color || '#ffffff', t: 0, life: 2.6 });
    if (state.toasts.length > 4) state.toasts.shift();
  }
  function banner(title, sub, life) {
    state.banner = { title, sub, t: 0, life: life || 3.6 };
  }
  function addCash(n) {
    state.cash += n;
    toast(`+$${n.toLocaleString('en-US')}`, '#5dff8f');
  }
  function addWanted(n, why) {
    const before = state.wanted;
    state.wanted = clamp(state.wanted + n, 0, 5);
    state.crimeT = 4;
    state.searchT = 0;
    if (state.wanted > before) {
      toast(why || 'WANTED LEVEL UP', '#ff5d5d');
      syncPolice();
    }
  }
  function syncPolice() {
    while (state.police.length < Math.min(state.wanted, MAX_POLICE)) {
      const a = random() * Math.PI * 2;
      const d = range(random, 780, 980);
      const x = clamp(state.player.x + Math.cos(a) * d, 60, WORLD.width - 60);
      const y = clamp(state.player.y + Math.sin(a) * d, 60, WORLD.height - 60);
      const cop = makeCar(random, 'police', x, y, a + Math.PI);
      state.police.push(cop);
      state.cars.push(cop);
    }
    while (state.police.length > state.wanted) {
      const cop = state.police.pop();
      state.cars.splice(state.cars.indexOf(cop), 1);
    }
  }

  function spawnTraffic() {
    for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
      const p = pick(random, INTERSECTIONS);
      const car = makeCar(random, 'traffic', p.x + range(random, -60, 60), p.y + range(random, -60, 60), 0);
      car.dir = Math.floor(random() * 4);
      car.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][car.dir];
      if (car.dir === 0) car.y = p.y + LANE;
      if (car.dir === 2) car.y = p.y - LANE;
      if (car.dir === 1) car.x = p.x - LANE;
      if (car.dir === 3) car.x = p.x + LANE;
      laneTarget(random, car);
      car.speed = car.cruise * 0.7;
      state.cars.push(car);
    }
    for (let i = 0; i < PARKED_COUNT; i += 1) {
      const b = pick(random, state.buildings);
      const side = Math.floor(random() * 4);
      const x = side === 0 ? b.x - 34 : side === 1 ? b.x + b.w + 34 : b.x + b.w / 2;
      const y = side === 2 ? b.y - 34 : side === 3 ? b.y + b.h + 34 : b.y + b.h / 2;
      const car = makeCar(random, 'parked', clamp(x, 40, WORLD.width - 40), clamp(y, 40, WORLD.height - 40), side < 2 ? Math.PI / 2 : 0);
      state.cars.push(car);
    }
    // The player's starter ride, parked by the spawn corner.
    const starter = makeCar(random, 'parked', 1835, 1215, 0);
    starter.color = '#ff2e88';
    starter.name = 'Banshee';
    starter.topSpeed = 520;
    state.cars.push(starter);
  }

  function reset() {
    CAR_ID = 1;
    state.time = 0; state.elapsed = 0; state.survived = 0;
    state.player.x = 1760; state.player.y = 1230;
    state.player.angle = -Math.PI / 2; state.player.inCar = null;
    state.cars.length = 0; state.peds.length = 0; state.police.length = 0;
    state.cash = 0; state.wanted = 0; state.searching = false;
    state.bustT = 0; state.busted = false; state.crimeT = 0; state.searchT = 0;
    state.missionIdx = 0; state.missionPhase = 0; state.missionT = 0;
    state.banner = null; state.toasts.length = 0;
    state.skids.length = 0; state.parts.length = 0; state.shake = 0;
    spawnTraffic();
    for (let i = 0; i < PED_COUNT; i += 1) {
      const ped = makePed(random, i < 8 ? { x: state.player.x, y: state.player.y } : null);
      sidewalkTarget(random, ped);
      state.peds.push(ped);
    }
    banner(MISSIONS[0].name, MISSIONS[0].objective, 4.5);
  }

  function collideBuildings(e, r) {
    for (const b of state.buildings) {
      const hit = circleRect(e.x, e.y, r, b);
      if (hit) {
        if (hit.d > 0.01) {
          e.x += (hit.dx / hit.d) * (r - hit.d);
          e.y += (hit.dy / hit.d) * (r - hit.d);
        } else {
          e.y = b.y - r;
        }
        return true;
      }
    }
    return false;
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2;
      const s = range(random, 30, speed);
      state.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: range(random, 0.3, 0.8), color, size: range(random, 2, 5) });
    }
    if (state.parts.length > 240) state.parts.splice(0, state.parts.length - 240);
  }

  function carCarCollisions(dt) {
    const cars = state.cars;
    for (let i = 0; i < cars.length; i += 1) {
      for (let j = i + 1; j < cars.length; j += 1) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = 46;
        if (d === 0 || d >= min) continue;
        const nx = dx / d;
        const ny = dy / d;
        const push = (min - d) / 2;
        const aParked = a.speed === 0 && a.kind === 'parked';
        const bParked = b.speed === 0 && b.kind === 'parked';
        if (!aParked) { a.x -= nx * push; a.y -= ny * push; }
        if (!bParked) { b.x += nx * push; b.y += ny * push; }
        const rel = Math.abs(a.speed - b.speed) + Math.abs(a.speed) * 0.2;
        const impact = Math.max(Math.abs(a.speed), Math.abs(b.speed));
        if (impact > 90) {
          a.damage = Math.min(100, a.damage + impact * 0.05);
          b.damage = Math.min(100, b.damage + impact * 0.05);
          burst((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffd93b', 6, 160);
          const involvesPlayer = state.player.inCar === a || state.player.inCar === b;
          if (involvesPlayer && impact > 240) {
            state.shake = Math.min(10, impact * 0.02);
            const other = state.player.inCar === a ? b : a;
            if (other.kind === 'police') addWanted(2, 'YOU HIT A COP CAR');
            else if (impact > 330) addWanted(1, 'RECKLESS DRIVING');
          }
          a.speed *= 0.45;
          b.speed *= 0.45;
        }
      }
    }
  }

  function stepPlayer(dt, ctl) {
    const p = state.player;
    if (p.inCar) {
      const car = p.inCar;
      const steer = ctl.x;
      const speedRatio = clamp(car.speed / 200, -1, 1);
      if (Math.abs(car.speed) > 12) {
        car.angle += steer * CAR.gripTurn * 0.42 * speedRatio * dt * (car.speed < 0 ? -1 : 1);
      }
      if (ctl.y < 0) {
        car.speed = Math.min(car.topSpeed, car.speed + CAR.accel * dt);
        car.braking = false;
      } else if (ctl.y > 0) {
        if (car.speed > 12) { car.speed = Math.max(0, car.speed - CAR.brake * dt); car.braking = true; }
        else { car.speed = Math.max(-CAR.reverseMax, car.speed - CAR.accel * 0.7 * dt); car.braking = false; }
      } else {
        car.braking = false;
        car.speed -= car.speed * CAR.drag * dt;
        if (Math.abs(car.speed) < 4) car.speed = 0;
      }
      // Hard turn at speed: lay skid marks and scrub speed.
      if (Math.abs(steer) > 0 && Math.abs(car.speed) > 300) {
        const bx = car.x - Math.cos(car.angle) * 18;
        const by = car.y - Math.sin(car.angle) * 18;
        state.skids.push({ x: bx - Math.sin(car.angle) * 10, y: by + Math.cos(car.angle) * 10, a: car.angle, t: 0 });
        state.skids.push({ x: bx + Math.sin(car.angle) * 10, y: by - Math.cos(car.angle) * 10, a: car.angle, t: 0 });
        if (state.skids.length > 420) state.skids.splice(0, state.skids.length - 420);
        car.speed -= car.speed * 0.25 * dt;
      }
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      car.x = clamp(nx, 30, WORLD.width - 30);
      car.y = clamp(ny, 30, WORLD.height - 30);
      if (collideBuildings(car, 23)) car.speed *= 0.35;
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      p.moving = Math.abs(car.speed) > 10;
      if (car.damage > 55 && random() < 0.3) {
        state.parts.push({ x: car.x + range(random, -8, 8), y: car.y - 8, vx: range(random, -8, 8), vy: range(random, -34, -18), t: 0, life: range(random, 0.6, 1.2), color: 'rgba(200,200,215,0.55)', size: range(random, 4, 8) });
      }
    } else {
      const mx = ctl.x;
      const my = ctl.y;
      const len = Math.hypot(mx, my);
      p.moving = len > 0;
      if (len > 0) {
        const s = PLAYER.walkSpeed * dt / Math.max(1, len);
        p.x = clamp(p.x + mx * s, 24, WORLD.width - 24);
        p.y = clamp(p.y + my * s, 24, WORLD.height - 24);
        p.angle = Math.atan2(my, mx);
        p.phase += dt * 11;
        collideBuildings(p, PLAYER.radius);
      }
    }
  }

  function tryInteract() {
    const p = state.player;
    if (p.inCar) {
      const car = p.inCar;
      p.inCar = null;
      car.kind = car.kind === 'police' ? 'parked' : 'owned';
      car.speed = 0;
      p.x = car.x - Math.sin(car.angle) * 38;
      p.y = car.y + Math.cos(car.angle) * 38;
      return;
    }
    let best = null;
    let bestD = 84;
    for (const car of state.cars) {
      if (car.kind === 'police') continue;
      const d = dist(p.x, p.y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    if (best) {
      const wasYours = best.kind === 'owned';
      best.kind = 'player';
      best.speed = 0;
      state.player.inCar = best;
      state.player.x = best.x;
      state.player.y = best.y;
      if (!wasYours) addWanted(1, 'VEHICLE STOLEN');
      toast(`Entered ${best.name}`, '#22d3ee');
    }
  }

  function stepTraffic(dt) {
    for (const car of state.cars) {
      if (car.kind !== 'traffic') continue;
      // Despawn far from the player, respawn near the action.
      const dp = dist(car.x, car.y, state.player.x, state.player.y);
      if (dp > 1500 || car.x < -120 || car.x > WORLD.width + 120 || car.y < -120 || car.y > WORLD.height + 120) {
        const p = pick(random, INTERSECTIONS);
        car.x = state.player.x + clamp(p.x - state.player.x, -900, 900) + range(random, -40, 40);
        car.y = state.player.y + clamp(p.y - state.player.y, -700, 700) + range(random, -40, 40);
        car.x = clamp(car.x, 60, WORLD.width - 60);
        car.y = clamp(car.y, 60, WORLD.height - 60);
        car.dir = Math.floor(random() * 4);
        car.angle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][car.dir];
        laneTarget(random, car);
        car.damage = 0;
      }
      let target = car.cruise;
      // Slow for a car ahead.
      for (const other of state.cars) {
        if (other === car) continue;
        const ahead = dist(car.x + Math.cos(car.angle) * 62, car.y + Math.sin(car.angle) * 62, other.x, other.y);
        if (ahead < 40) { target = Math.min(target, other.speed * 0.8); break; }
      }
      const want = Math.atan2(car.ty - car.y, car.tx - car.x);
      const diff = angDiff(want, car.angle);
      car.angle += clamp(diff, -1.9 * dt, 1.9 * dt);
      if (Math.abs(diff) > 1.1) target = Math.min(target, 110);
      car.braking = car.speed > target + 8;
      car.speed += clamp(target - car.speed, -CAR.brake * dt, CAR.accel * 0.55 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (collideBuildings(car, 23)) car.speed *= 0.4;
      if (dist(car.x, car.y, car.tx, car.ty) < 44) turnAtIntersection(random, car);
      if (car.damage > 55 && random() < 0.25) {
        state.parts.push({ x: car.x, y: car.y - 6, vx: range(random, -6, 6), vy: range(random, -30, -16), t: 0, life: 0.9, color: 'rgba(200,200,215,0.5)', size: range(random, 4, 7) });
      }
    }
  }

  function stepPolice(dt) {
    const p = state.player;
    const pSpeed = p.inCar ? Math.abs(p.inCar.speed) : (p.moving ? PLAYER.walkSpeed : 0);
    let nearest = Infinity;
    for (const cop of state.police) {
      cop.siren += dt * 9;
      const tx = p.x + (p.inCar ? Math.cos(p.angle) * pSpeed * 0.25 : 0);
      const ty = p.y + (p.inCar ? Math.sin(p.angle) * pSpeed * 0.25 : 0);
      const want = Math.atan2(ty - cop.y, tx - cop.x);
      const diff = angDiff(want, cop.angle);
      cop.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      const d = dist(cop.x, cop.y, p.x, p.y);
      nearest = Math.min(nearest, d);
      const target = d > 300 ? 495 : d > 90 ? 380 : 210;
      cop.braking = cop.speed > target + 10;
      cop.speed += clamp(target - cop.speed, -CAR.brake * dt, CAR.accel * 0.8 * dt);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      cop.x = clamp(cop.x, 30, WORLD.width - 30);
      cop.y = clamp(cop.y, 30, WORLD.height - 30);
      if (collideBuildings(cop, 23)) cop.speed *= 0.4;
    }
    // Bust and search logic.
    state.searching = state.wanted > 0 && nearest > 620;
    if (state.wanted > 0) {
      if (nearest < 58 && pSpeed < 48) state.bustT += dt;
      else state.bustT = Math.max(0, state.bustT - dt * 1.6);
      if (state.bustT >= 2) {
        state.busted = true;
        return EVENT_BUSTED;
      }
      if (state.searching && state.crimeT <= 0) {
        state.searchT += dt;
        if (state.searchT >= 5) {
          state.searchT = 0;
          state.wanted -= 1;
          toast(state.wanted > 0 ? 'THE HEAT IS COOLING…' : 'YOU LOST THE COPS', '#22d3ee');
          syncPolice();
        }
      } else state.searchT = 0;
    }
    return 0;
  }

  function stepPeds(dt) {
    const p = state.player;
    for (const ped of state.peds) {
      ped.phase += dt * (ped.state === 'wander' ? 7 : 13);
      // Threat check: a fast car very close makes peds dive or flee.
      let threat = null;
      let threatD = 999;
      for (const car of state.cars) {
        if (Math.abs(car.speed) < 130) continue;
        const d = dist(ped.x, ped.y, car.x, car.y);
        if (d < threatD) { threatD = d; threat = car; }
      }
      if (threat && threatD < 120 && ped.state === 'wander') {
        ped.state = threatD < 58 ? 'dive' : 'flee';
        ped.timer = threatD < 58 ? 0.75 : 1.4;
        const away = Math.atan2(ped.y - threat.y, ped.x - threat.x);
        ped.vx = Math.cos(away) * (threatD < 58 ? 330 : 190);
        ped.vy = Math.sin(away) * (threatD < 58 ? 330 : 190);
        // A genuine hit (car overlaps the ped): the ped dives clear but it
        // still counts — wanted goes up, no gore, ped scrambles away.
        if (threatD < 30 && (threat === p.inCar)) {
          addWanted(1, 'YOU HIT A PEDESTRIAN');
          burst(ped.x, ped.y, '#ffd93b', 5, 120);
        }
      }
      if (ped.state === 'wander') {
        const d = dist(ped.x, ped.y, ped.tx, ped.ty);
        if (d < 16) sidewalkTarget(random, ped);
        else {
          ped.angle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
          ped.x += Math.cos(ped.angle) * 74 * dt;
          ped.y += Math.sin(ped.angle) * 74 * dt;
        }
      } else {
        ped.timer -= dt;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
        ped.vx *= (1 - 2.4 * dt);
        ped.vy *= (1 - 2.4 * dt);
        ped.angle = Math.atan2(ped.vy, ped.vx);
        if (ped.timer <= 0) {
          ped.state = 'wander';
          sidewalkTarget(random, ped);
        }
      }
      ped.x = clamp(ped.x, 20, WORLD.width - 20);
      ped.y = clamp(ped.y, 20, WORLD.height - 20);
      collideBuildings(ped, 11);
    }
  }

  function missionTarget() {
    if (state.missionIdx === 0) return CHECKPOINTS.beach;
    if (state.missionIdx === 1) return state.missionPhase === 0 ? CHECKPOINTS.package : CHECKPOINTS.club;
    if (state.missionIdx === 2) return state.missionPhase === 1 ? CHECKPOINTS.hideout : null;
    return null;
  }

  function stepMissions(dt) {
    let events = 0;
    const p = state.player;
    if (state.missionIdx === 0) {
      const t = CHECKPOINTS.beach;
      if (dist(p.x, p.y, t.x, t.y) < 78) {
        addCash(MISSIONS[0].reward);
        banner('MISSION COMPLETE', 'Warm-Up Lap · +$500', 3.4);
        state.missionIdx = 1;
        state.missionPhase = 0;
        events |= EVENT_MISSION;
        setTimeoutBanner();
      }
    } else if (state.missionIdx === 1) {
      if (state.missionPhase === 0) {
        const t = CHECKPOINTS.package;
        if (dist(p.x, p.y, t.x, t.y) < 62) {
          state.missionPhase = 1;
          state.missionT = 90;
          banner('PACKAGE COLLECTED', 'Deliver it to Club Neon — fast!', 3.2);
          toast('90 seconds on the clock', '#ffd93b');
        }
      } else {
        state.missionT -= dt;
        const t = CHECKPOINTS.club;
        if (dist(p.x, p.y, t.x, t.y) < 72) {
          addCash(MISSIONS[1].reward);
          banner('MISSION COMPLETE', 'Special Delivery · +$1,200', 3.4);
          state.missionIdx = 2;
          state.missionPhase = 0;
          if (state.wanted < 2) { state.wanted = 2; syncPolice(); }
          state.crimeT = 5;
          events |= EVENT_MISSION;
          setTimeoutBanner();
        } else if (state.missionT <= 0) {
          state.missionPhase = 0;
          banner('DELIVERY FAILED', 'The package went cold. Pick it up again.', 3.2);
        }
      }
    } else if (state.missionIdx === 2) {
      if (state.missionPhase === 0) {
        if (state.wanted === 0) {
          state.missionPhase = 1;
          banner('HEAT LOST', 'Now reach the hideout, marked on your map', 3.2);
        }
      } else {
        const t = CHECKPOINTS.hideout;
        if (dist(p.x, p.y, t.x, t.y) < 78) {
          addCash(MISSIONS[2].reward);
          banner('MISSION COMPLETE', 'Heat Escape · +$2,500 — Vice City is yours', 4.2);
          state.missionIdx = 3;
          events |= EVENT_MISSION;
        }
      }
    }
    return events;
  }
  let bannerQueue = null;
  function setTimeoutBanner() {
    bannerQueue = 3.6;
  }

  function step(dt, ctl, harmless) {
    let events = 0;
    state.time += dt;
    state.elapsed += dt;
    if (!state.busted) state.survived += dt;
    if (state.crimeT > 0) state.crimeT -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 22);
    if (ctl.interact) tryInteract();
    stepPlayer(dt, ctl);
    stepTraffic(dt);
    events |= stepPolice(dt);
    stepPeds(dt);
    carCarCollisions(dt);
    if (!harmless) events |= stepMissions(dt);
    if (bannerQueue !== null) {
      bannerQueue -= dt;
      if (bannerQueue <= 0) {
        bannerQueue = null;
        if (state.missionIdx === 1) banner(MISSIONS[1].name, MISSIONS[1].objective, 3.6);
        else if (state.missionIdx === 2) banner(MISSIONS[2].name, MISSIONS[2].objective, 3.6);
      }
    }
    if (state.banner) {
      state.banner.t += dt;
      if (state.banner.t > state.banner.life) state.banner = null;
    }
    for (let i = state.toasts.length - 1; i >= 0; i -= 1) {
      state.toasts[i].t += dt;
      if (state.toasts[i].t > state.toasts[i].life) state.toasts.splice(i, 1);
    }
    for (const s of state.skids) s.t += dt;
    while (state.skids.length && state.skids[0].t > 9) state.skids.shift();
    for (let i = state.parts.length - 1; i >= 0; i -= 1) {
      const pt = state.parts[i];
      pt.t += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.t > pt.life) state.parts.splice(i, 1);
    }
    // Context prompt.
    const p = state.player;
    if (p.inCar) state.prompt = 'Press E to exit';
    else {
      let best = null;
      let bestD = 84;
      for (const car of state.cars) {
        if (car.kind === 'police') continue;
        const d = dist(p.x, p.y, car.x, car.y);
        if (d < bestD) { bestD = d; best = car; }
      }
      state.prompt = best ? `Press E to enter ${best.name}` : '';
    }
    // Camera follows with a little look-ahead toward travel direction.
    const look = p.inCar ? clamp(p.inCar.speed * 0.22, -90, 90) : 0;
    const tx = p.x + Math.cos(p.angle) * look;
    const ty = p.y + Math.sin(p.angle) * look;
    state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 5);
    return events;
  }

  reset();
  return { state, reset, step, missionTarget, addWanted, toast, banner, syncPolice };
}

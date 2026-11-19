// Screenshot scenes behind ?shot=start|play|chase|end. Each one plays the
// real world forward from a fresh seed with a simple road-following
// autopilot (so traffic, peds and water are alive), then stages the exact
// frame — cash, wanted, mission, car poses — deterministically.
import { CHECKPOINTS, MISSIONS } from './world.js';
import { SCREEN_BUSTED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { H_ROADS, V_ROADS } from './config.js';

const STEP_S = 1 / 60;

/** Steer the player's car toward a world point: returns a control object. */
function driveToward(state, tx, ty, throttle) {
  const car = state.player.inCar;
  if (!car) return { x: 0, y: 0, interact: false };
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return {
    x: diff > 0.12 ? 1 : diff < -0.12 ? -1 : 0,
    y: throttle === 0 ? 0 : -1,
    interact: false,
  };
}

function enterStarterCar(world) {
  const s = world.state;
  // Walk the player onto the starter Banshee and get in (through the real
  // interact path, then clear the theft heat: this is the player's ride).
  // The starter Banshee is the parked car nearest the spawn corner.
  let car = null;
  let bestD = Infinity;
  for (const c of s.cars) {
    if (c.kind !== 'parked') continue;
    const d = Math.hypot(c.x - 1760, c.y - 1230);
    if (d < bestD) { bestD = d; car = c; }
  }
  s.player.x = car.x + 20;
  s.player.y = car.y + 20;
  world.step(STEP_S, { x: 0, y: 0, interact: true });
  s.wanted = 0;
  s.toasts.length = 0;
  return s.player.inCar;
}

function simulate(world, seconds, pilot) {
  const steps = Math.round(seconds / STEP_S);
  for (let i = 0; i < steps; i += 1) {
    const ctl = pilot ? pilot(world.state) : { x: 0, y: 0, interact: false };
    world.step(STEP_S, ctl);
  }
}

function parkCop(world, x, y, angle, speed) {
  const s = world.state;
  world.syncPolice();
  const cop = s.police.find((c) => !c.__staged);
  if (!cop) return null;
  cop.__staged = true;
  cop.x = x; cop.y = y; cop.angle = angle; cop.speed = speed || 0;
  return cop;
}

export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  s.banner = null;
  s.toasts.length = 0;

  if (name === 'play') {
    const car = enterStarterCar(world);
    // Cruise the neon strip (H road 1080) east with traffic around.
    simulate(world, 7, (st) => driveToward(st, 2500, 1080 + 46, 1));
    // Final stage: mid-strip, braking, one star, M1 marker live.
    car.x = 1760; car.y = 1080 + 46; car.angle = 0; car.speed = 505; car.braking = true;
    s.player.x = car.x; s.player.y = car.y; s.player.angle = 0;
    s.camera.x = car.x + 60; s.camera.y = car.y;
    s.cash = 350;
    s.wanted = 1;
    world.syncPolice();
    // Keep the one cop distant so the frame stays a cruise, not a bust.
    for (const cop of s.police) { cop.x = car.x - 620; cop.y = car.y - 300; cop.speed = 200; cop.angle = 0.5; }
    s.missionIdx = 0;
    s.banner = null;
    // Density: two more cruisers on the strip and peds on the sidewalks.
    const traffic = s.cars.filter((c) => c.kind === 'traffic');
    if (traffic[0]) { traffic[0].x = car.x - 330; traffic[0].y = 1080 - 46; traffic[0].angle = Math.PI; traffic[0].speed = 240; }
    if (traffic[1]) { traffic[1].x = car.x + 390; traffic[1].y = 1080 + 46; traffic[1].angle = 0; traffic[1].speed = 260; }
    const spots = [[-190, -128], [150, 128], [430, -128], [-420, 128]];
    s.peds.slice(0, 4).forEach((ped, i) => {
      ped.x = car.x + spots[i][0];
      ped.y = car.y + spots[i][1];
      ped.state = 'wander';
    });
    return { screen: SCREEN_PLAY };
  }

  if (name === 'chase') {
    const car = enterStarterCar(world);
    simulate(world, 6, (st) => driveToward(st, 2400, 1080 + 46, 1));
    s.cash = 12450;
    s.wanted = 3;
    s.missionIdx = 2;
    s.missionPhase = 0;
    world.syncPolice();
    // Mid-turn across the strip with two cruisers tight behind.
    car.x = 1960; car.y = 1060; car.angle = -0.5; car.speed = 470; car.braking = false;
    s.player.x = car.x; s.player.y = car.y; s.player.angle = car.angle;
    s.camera.x = car.x; s.camera.y = car.y - 20;
    parkCop(world, car.x - 120, car.y + 74, -0.35, 430);
    parkCop(world, car.x - 215, car.y - 42, -0.62, 445);
    const third = parkCop(world, car.x + 330, car.y - 260, 2.6, 300);
    if (third) third.__staged = true;
    // Skid arcs from the turn.
    for (let i = 0; i < 16; i += 1) {
      const a = -0.5 + i * 0.045;
      s.skids.push({ x: car.x - Math.cos(a) * (30 + i * 7), y: car.y - Math.sin(a) * (30 + i * 7) + i * 2.4, a, t: 0.4 });
    }
    s.banner = { title: MISSIONS[2].name, sub: MISSIONS[2].objective, t: 0.6, life: 99 };
    s.toasts.length = 0;
    s.toasts.push({ text: 'THE HEAT IS ON YOU', color: '#ff5d5d', t: 0.4, life: 99 });
    return { screen: SCREEN_PLAY };
  }

  if (name === 'end') {
    const car = enterStarterCar(world);
    simulate(world, 5, (st) => driveToward(st, 1500, 1080 + 46, 1));
    s.cash = 3950;
    s.wanted = 4;
    s.missionIdx = 2;
    world.syncPolice();
    // Surrounded: car stopped dead, cruisers boxed in on three sides.
    car.x = 1500; car.y = 1080; car.angle = 0.15; car.speed = 0; car.braking = true; car.damage = 38;
    s.player.x = car.x; s.player.y = car.y; s.player.angle = car.angle;
    s.camera.x = car.x; s.camera.y = car.y;
    parkCop(world, car.x + 88, car.y - 8, Math.PI, 0);
    parkCop(world, car.x - 92, car.y + 20, 0, 0);
    parkCop(world, car.x - 6, car.y - 88, Math.PI / 2, 0);
    parkCop(world, car.x + 30, car.y + 92, -Math.PI / 2, 0);
    s.busted = true;
    s.survived = 214;
    s.banner = null;
    s.toasts.length = 0;
    return { screen: SCREEN_BUSTED };
  }

  // start: title over the scenic neon/beach corner — camera looking at the
  // coastal intersection with the beach and water beyond.
  simulate(world, 6, null);
  s.camera.x = V_ROADS[4] - 120;
  s.camera.y = H_ROADS[1];
  s.banner = null;
  s.toasts.length = 0;
  return { screen: SCREEN_TITLE };
}

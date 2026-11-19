// Vice Heat boot and the one loop: input every frame, the world advances in
// fixed 1/60 s steps, the renderer paints what is there. Screens: title,
// play, paused, busted.
//
// ?seed=N fixes the city and traffic. ?shot=start|play|chase|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, MISSIONS } from './world.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best cash then lasts this visit only.
  }
}

function hudExtra() {
  const s = world.state;
  const target = world.missionTarget();
  let missionName = 'FREE ROAM';
  let objective = 'Vice City is yours — steal, cruise, cause chaos';
  let timer;
  if (s.missionIdx === 0) {
    missionName = MISSIONS[0].name;
    objective = MISSIONS[0].objective;
  } else if (s.missionIdx === 1) {
    missionName = MISSIONS[1].name;
    objective = s.missionPhase === 0 ? MISSIONS[1].objective : 'Deliver the package to Club Neon';
    if (s.missionPhase === 1) timer = s.missionT;
  } else if (s.missionIdx === 2) {
    missionName = MISSIONS[2].name;
    objective = s.missionPhase === 0 ? MISSIONS[2].objective : 'Reach the hideout';
  }
  return { target, missionName, objective, timer, best: readBest() };
}

function runShot(name) {
  const scene = stageShot(name, world);
  const extra = name === 'start'
    ? { target: null }
    : { ...hudExtra(), best: Math.max(readBest(), world.state.cash) };
  if (name === 'chase') {
    extra.missionName = MISSIONS[2].name;
    extra.objective = MISSIONS[2].objective;
    extra.target = null;
  }
  if (name === 'end') extra.best = Math.max(readBest(), 3950);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, extra);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let titleT = 0;

  function announce(message) {
    status.textContent = message;
  }
  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing Vice Heat. Mission 1: drive to the beach checkpoint.');
  }
  function endGame() {
    screen = SCREEN_BUSTED;
    if (world.state.cash > best) {
      best = world.state.cash;
      saveBest(best);
    }
    announce(`Busted. Cash ${world.state.cash}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_BUSTED)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        world.step(STEP, { x: 0, y: 0, interact: false }, true);
        titleT += STEP;
        accumulator -= STEP;
      }
      // Slow scenic pan across the neon strip toward the beach.
      const s = world.state;
      s.camera.x = 2350 + Math.sin(titleT * 0.07) * 620;
      s.camera.y = 1080 + Math.cos(titleT * 0.05) * 130;
    } else if (screen === SCREEN_PLAY) {
      let pendingInteract = (actions & ACTION_INTERACT) !== 0;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const axes = input.axes();
        const events = world.step(STEP, {
          x: axes.x,
          y: axes.y,
          interact: pendingInteract,
        });
        pendingInteract = false;
        accumulator -= STEP;
        if (events & EVENT_BUSTED) endGame();
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { ...hudExtra(), best });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Vice Heat. Press Enter or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

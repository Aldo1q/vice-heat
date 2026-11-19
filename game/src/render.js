// Vice Heat renderer: everything is drawn in code on one canvas — the dusk
// coastal city (roads, neon blocks, beach, palms, long shadows), cars with
// headlights and sirens, pedestrians, then the GTA-style HUD: big cash,
// wanted stars, a circular minimap, speedo, mission banner and toasts.
import {
  FONT, FONT_BODY, H_ROADS, LANE, PALETTE, ROAD_W, SAND_X, V_ROADS, VIEW,
  WATER_X, WORLD,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';

function hash2(x, y) {
  let h = (Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold, font) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${font || FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(value, x, y);
  }

  function drawWorldBase(state) {
    const t = state.time;
    // Land.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = PALETTE.grassAlt;
    const gs = 240;
    for (let x = 0; x < WORLD.width; x += gs) {
      for (let y = 0; y < WORLD.height; y += gs) {
        if ((x / gs + y / gs) % 2 === 0) ctx.fillRect(x, y, gs, gs);
      }
    }
    // Beach sand and animated water.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(SAND_X, 0, WORLD.width - SAND_X, WORLD.height);
    ctx.fillStyle = PALETTE.sandDark;
    for (let i = 0; i < 260; i += 1) {
      const sx = SAND_X + hash2(i, 7) * (WATER_X - SAND_X);
      const sy = hash2(i, 13) * WORLD.height;
      ctx.fillRect(sx, sy, 7, 3);
    }
    const wg = ctx.createLinearGradient(WATER_X, 0, WORLD.width, 0);
    wg.addColorStop(0, PALETTE.waterLight);
    wg.addColorStop(1, PALETTE.water);
    ctx.fillStyle = wg;
    ctx.fillRect(WATER_X, 0, WORLD.width - WATER_X, WORLD.height);
    ctx.strokeStyle = 'rgba(140,210,255,0.35)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 26; row += 1) {
      const y = row * 86 + 30;
      ctx.beginPath();
      for (let x = WATER_X + 12; x < WORLD.width - 10; x += 26) {
        const yy = y + Math.sin(x * 0.02 + t * 1.7 + row) * 5;
        if (x === WATER_X + 12) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // Foamy shoreline.
    ctx.strokeStyle = PALETTE.foam;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 0; y <= WORLD.height; y += 22) {
      const x = WATER_X + Math.sin(y * 0.012 + t * 2.2) * 9;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawRoads() {
    // Sidewalks first (wider), then asphalt.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const vx of V_ROADS) ctx.fillRect(vx - ROAD_W / 2 - 17, 0, ROAD_W + 34, WORLD.height);
    for (const hy of H_ROADS) ctx.fillRect(0, hy - ROAD_W / 2 - 17, SAND_X + 60, ROAD_W + 34);
    ctx.fillStyle = PALETTE.asphalt;
    for (const vx of V_ROADS) ctx.fillRect(vx - ROAD_W / 2, 0, ROAD_W, WORLD.height);
    for (const hy of H_ROADS) ctx.fillRect(0, hy - ROAD_W / 2, SAND_X + 60, ROAD_W);
    // Sidewalk edging.
    ctx.strokeStyle = PALETTE.sidewalkEdge;
    ctx.lineWidth = 3;
    for (const vx of V_ROADS) {
      ctx.beginPath(); ctx.moveTo(vx - ROAD_W / 2 - 17, 0); ctx.lineTo(vx - ROAD_W / 2 - 17, WORLD.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx + ROAD_W / 2 + 17, 0); ctx.lineTo(vx + ROAD_W / 2 + 17, WORLD.height); ctx.stroke();
    }
    // Dashed centre lines.
    ctx.strokeStyle = 'rgba(255,217,59,0.75)';
    ctx.lineWidth = 5;
    ctx.setLineDash([34, 30]);
    for (const vx of V_ROADS) { ctx.beginPath(); ctx.moveTo(vx, 8); ctx.lineTo(vx, WORLD.height - 8); ctx.stroke(); }
    for (const hy of H_ROADS) { ctx.beginPath(); ctx.moveTo(8, hy); ctx.lineTo(SAND_X + 50, hy); ctx.stroke(); }
    ctx.setLineDash([]);
    // Lane guides.
    ctx.strokeStyle = 'rgba(232,227,255,0.28)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 22]);
    for (const vx of V_ROADS) {
      ctx.beginPath(); ctx.moveTo(vx - LANE * 1.9, 8); ctx.lineTo(vx - LANE * 1.9, WORLD.height - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx + LANE * 1.9, 8); ctx.lineTo(vx + LANE * 1.9, WORLD.height - 8); ctx.stroke();
    }
    for (const hy of H_ROADS) {
      ctx.beginPath(); ctx.moveTo(8, hy - LANE * 1.9); ctx.lineTo(SAND_X + 50, hy - LANE * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, hy + LANE * 1.9); ctx.lineTo(SAND_X + 50, hy + LANE * 1.9); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Crosswalks at every intersection.
    ctx.fillStyle = 'rgba(207,198,245,0.65)';
    for (const vx of V_ROADS) {
      for (const hy of H_ROADS) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(vx - ROAD_W / 2 - 14, hy + i * 26 - 8, 26, 15);
          ctx.fillRect(vx + ROAD_W / 2 - 12, hy + i * 26 - 8, 26, 15);
          ctx.fillRect(vx + i * 26 - 8, hy - ROAD_W / 2 - 14, 15, 26);
          ctx.fillRect(vx + i * 26 - 8, hy + ROAD_W / 2 - 12, 15, 26);
        }
      }
    }
  }

  function drawBuildings(state) {
    // Long dusk shadows first.
    ctx.fillStyle = PALETTE.shadow;
    for (const b of state.buildings) ctx.fillRect(b.x + 34, b.y + 42, b.w, b.h);
    for (const b of state.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(10,4,30,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      // Lit windows, deterministic per building.
      const cols = Math.max(2, Math.floor(b.w / 34));
      const rows = Math.max(2, Math.floor(b.h / 34));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          const h = hash2(b.x + c * 31, b.y + r * 47);
          if (h < 0.28) continue;
          ctx.fillStyle = h > 0.84 ? 'rgba(34,211,238,0.9)' : 'rgba(255,205,92,0.88)';
          ctx.fillRect(b.x + 10 + c * ((b.w - 20) / cols), b.y + 12 + r * ((b.h - 24) / rows), 13, 9);
        }
      }
      // Neon sign strip + name along the roof edge.
      ctx.save();
      ctx.shadowColor = b.neon;
      ctx.shadowBlur = 16;
      ctx.fillStyle = b.neon;
      ctx.fillRect(b.x + 6, b.y + 5, b.w - 12, 5);
      ctx.font = `700 ${b.w > 210 ? 21 : 16}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + 34);
      ctx.restore();
    }
  }

  function drawProps(state) {
    const t = state.time;
    for (const pr of state.props) {
      if (pr.kind === 'light') {
        const g = ctx.createRadialGradient(pr.x, pr.y, 2, pr.x, pr.y, 46);
        g.addColorStop(0, 'rgba(255,214,120,0.5)');
        g.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd678';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#241a45';
        ctx.fillRect(pr.x - 1.5, pr.y, 3, 10);
      } else if (pr.kind === 'umbrella') {
        ctx.fillStyle = PALETTE.shadow;
        ctx.beginPath(); ctx.ellipse(pr.x + 12, pr.y + 14, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 17, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#5b4326';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y + 14); ctx.stroke();
      } else if (pr.kind === 'crate') {
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(pr.x - 10, pr.y - 10, 20, 20);
        ctx.strokeStyle = '#5f3c1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(pr.x - 10, pr.y - 10, 20, 20);
      }
    }
    // Palms: shadow, trunk, swaying fronds.
    for (const palm of state.palms) {
      const sway = Math.sin(t * 1.3 + palm.sway) * 3;
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath(); ctx.ellipse(palm.x + 24, palm.y + 26, 20 * palm.s, 8 * palm.s, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6e4a26';
      ctx.lineWidth = 5 * palm.s;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y + 12 * palm.s);
      ctx.quadraticCurveTo(palm.x + 3, palm.y, palm.x + sway, palm.y - 12 * palm.s);
      ctx.stroke();
      ctx.strokeStyle = '#2fae5f';
      ctx.lineWidth = 3.4 * palm.s;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + palm.sway;
        ctx.beginPath();
        ctx.moveTo(palm.x + sway, palm.y - 12 * palm.s);
        ctx.quadraticCurveTo(
          palm.x + sway + Math.cos(a) * 13 * palm.s, palm.y - 12 * palm.s + Math.sin(a) * 8 * palm.s - 4,
          palm.x + sway + Math.cos(a) * 22 * palm.s, palm.y - 12 * palm.s + Math.sin(a) * 13 * palm.s + 5,
        );
        ctx.stroke();
      }
    }
  }

  function drawSkids(state) {
    ctx.fillStyle = 'rgba(10,6,22,0.85)';
    for (const s of state.skids) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.globalAlpha = Math.max(0, 0.8 - s.t * 0.07);
      ctx.fillRect(-8, -3.5, 16, 7);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawCheckpoint(state, target) {
    if (!target) return;
    const t = state.time;
    const pulse = 1 + Math.sin(t * 4) * 0.1;
    // Vertical beacon so the objective reads from anywhere.
    const grad = ctx.createLinearGradient(0, target.y - 320, 0, target.y);
    grad.addColorStop(0, 'rgba(255,217,59,0)');
    grad.addColorStop(1, 'rgba(255,217,59,0.30)');
    ctx.fillStyle = grad;
    ctx.fillRect(target.x - 13, target.y - 320, 26, 320);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(target.x, target.y, 46 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,217,59,0.45)';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(target.x, target.y, 58 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    const bob = Math.sin(t * 3) * 6;
    ctx.moveTo(target.x, target.y - 66 + bob);
    ctx.lineTo(target.x - 13, target.y - 88 + bob);
    ctx.lineTo(target.x + 13, target.y - 88 + bob);
    ctx.closePath(); ctx.fill();
  }

  function drawCar(car, state) {
    const t = state.time;
    ctx.save();
    ctx.translate(car.x, car.y);
    // Long shadow.
    ctx.fillStyle = PALETTE.shadow;
    ctx.save();
    ctx.translate(15, 19);
    ctx.rotate(car.angle);
    ctx.fillRect(-29, -14, 58, 28);
    ctx.restore();
    // Siren halo for police.
    if (car.kind === 'police') {
      const phase = Math.sin(car.siren) > 0;
      const col = phase ? '255,59,59' : '59,110,255';
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 74);
      g.addColorStop(0, `rgba(${col},0.5)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 74, 0, Math.PI * 2); ctx.fill();
    }
    // Headlight glow.
    ctx.rotate(car.angle);
    const hg = ctx.createLinearGradient(24, 0, 118, 0);
    hg.addColorStop(0, 'rgba(255,240,190,0.20)');
    hg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(24, -13); ctx.lineTo(118, -30); ctx.lineTo(118, 30); ctx.lineTo(24, 13);
    ctx.closePath(); ctx.fill();
    // Wheels.
    ctx.fillStyle = '#0c0a18';
    ctx.fillRect(13, -17, 13, 6); ctx.fillRect(13, 11, 13, 6);
    ctx.fillRect(-24, -17, 13, 6); ctx.fillRect(-24, 11, 13, 6);
    // Body.
    ctx.fillStyle = car.color;
    ctx.beginPath(); ctx.roundRect(-29, -14, 58, 28, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath(); ctx.roundRect(-29, -14, 58, 11, 8); ctx.fill();
    if (car.kind === 'police') {
      ctx.fillStyle = '#141824';
      ctx.fillRect(-12, -14, 24, 28);
      ctx.fillStyle = '#e8ecf5';
      ctx.font = `700 8.5px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 3);
      // Light bar.
      const phase = Math.sin(car.siren) > 0;
      ctx.fillStyle = phase ? '#ff3b3b' : '#571414';
      ctx.fillRect(-9, -8, 8, 16);
      ctx.fillStyle = phase ? '#571414' : '#3b6eff';
      ctx.fillRect(1, -8, 8, 16);
    } else {
      // Cabin + windshield.
      ctx.fillStyle = 'rgba(16,20,44,0.9)';
      ctx.beginPath(); ctx.roundRect(-11, -11, 24, 22, 5); ctx.fill();
      ctx.fillStyle = 'rgba(140,220,255,0.55)';
      ctx.fillRect(9, -10, 5, 20);
      // Racing stripe on sporty colours.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-29, -2.5, 58, 5);
    }
    // Headlights + brake lights.
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(26, -11, 4, 6); ctx.fillRect(26, 5, 4, 6);
    ctx.fillStyle = car.braking ? '#ff2222' : '#8f1d1d';
    if (car.braking) {
      ctx.save();
      ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 13;
      ctx.fillRect(-30, -11, 4, 6); ctx.fillRect(-30, 5, 4, 6);
      ctx.restore();
    } else {
      ctx.fillRect(-30, -11, 4, 6); ctx.fillRect(-30, 5, 4, 6);
    }
    ctx.restore();
    void t;
  }

  function drawPeds(state) {
    for (const ped of state.peds) {
      ctx.save();
      ctx.translate(ped.x, ped.y);
      ctx.fillStyle = PALETTE.shadow;
      ctx.beginPath(); ctx.ellipse(7, 9, 10, 5, 0.4, 0, Math.PI * 2); ctx.fill();
      const bob = ped.state === 'wander' ? Math.sin(ped.phase) * 1.6 : 0;
      ctx.rotate(ped.angle);
      ctx.fillStyle = ped.shirt;
      ctx.beginPath(); ctx.arc(0, bob * 0.3, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath(); ctx.arc(1.5, bob * 0.3, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c79b';
      ctx.beginPath(); ctx.arc(2.5, bob * 0.3, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayerFigure(state) {
    const p = state.player;
    if (p.inCar) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath(); ctx.ellipse(8, 10, 11, 5.5, 0.4, 0, Math.PI * 2); ctx.fill();
    const bob = p.moving ? Math.sin(p.phase) * 2 : 0;
    ctx.rotate(p.angle);
    // Directional ring so the player always reads.
    ctx.strokeStyle = 'rgba(255,217,59,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath(); ctx.arc(0, bob * 0.3, 10.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(1.5, bob * 0.3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath(); ctx.arc(3, bob * 0.3, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParts(state) {
    for (const pt of state.parts) {
      ctx.globalAlpha = Math.max(0, 1 - pt.t / pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function starPath(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawMinimap(state, target) {
    const cx = 112;
    const cy = 582;
    const R = 88;
    const sx = (R * 2) / WORLD.width;
    const sy = (R * 2) / WORLD.height;
    const s = Math.min(sx, sy);
    const ox = cx - (WORLD.width * s) / 2;
    const oy = cy - (WORLD.height * s) / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1d1440';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(ox + WATER_X * s, cy - R, R * 2, R * 2);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(ox + SAND_X * s, cy - R, (WATER_X - SAND_X) * s, R * 2);
    ctx.strokeStyle = 'rgba(232,227,255,0.75)';
    ctx.lineWidth = 3.4;
    for (const vx of V_ROADS) {
      ctx.beginPath(); ctx.moveTo(ox + vx * s, cy - R); ctx.lineTo(ox + vx * s, cy + R); ctx.stroke();
    }
    for (const hy of H_ROADS) {
      ctx.beginPath(); ctx.moveTo(cx - R, oy + hy * s); ctx.lineTo(cx + R, oy + hy * s); ctx.stroke();
    }
    // Traffic dots.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const car of state.cars) {
      if (car.kind === 'police' || car === state.player.inCar) continue;
      ctx.fillRect(ox + car.x * s - 1.6, oy + car.y * s - 1.6, 3.2, 3.2);
    }
    // Police blips flash red/blue.
    const flash = Math.sin(state.time * 9) > 0;
    for (const cop of state.police) {
      ctx.fillStyle = flash ? '#ff3b3b' : '#3b82ff';
      ctx.beginPath(); ctx.arc(ox + cop.x * s, oy + cop.y * s, 4.4, 0, Math.PI * 2); ctx.fill();
    }
    // Mission marker pulses gold.
    if (target) {
      const pr = 6 + Math.sin(state.time * 5) * 2.2;
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath(); ctx.arc(ox + target.x * s, oy + target.y * s, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,217,59,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox + target.x * s, oy + target.y * s, pr + 5, 0, Math.PI * 2); ctx.stroke();
    }
    // Player arrow.
    const px = ox + state.player.x * s;
    const py = oy + state.player.y * s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(9, 0); ctx.lineTo(-6, -5.4); ctx.lineTo(-6, 5.4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Ring + glass.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,6,28,0.6)';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, Math.PI * 2); ctx.stroke();
    text('VICE CITY', cx, cy + R + 24, 13, 'rgba(255,255,255,0.75)', 'center', true);
  }

  function drawHud(state, extra) {
    // Cash, top-right, big and condensed — the instant GTA tell.
    ctx.textBaseline = 'top';
    const cashText = `$${state.cash.toLocaleString('en-US')}`;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    text(cashText, VIEW.width - 28, 16, 46, PALETTE.cashGreen, 'right', true);
    ctx.restore();
    // Wanted stars under the cash.
    const flashOff = state.searching && Math.sin(state.time * 7) > 0;
    for (let i = 0; i < 5; i += 1) {
      const sx = VIEW.width - 40 - (4 - i) * 37;
      const sy = 84;
      if (i < state.wanted) {
        ctx.save();
        if (flashOff) ctx.globalAlpha = 0.25;
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 9;
        ctx.fillStyle = PALETTE.gold;
        starPath(sx, sy, 15);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(20,14,44,0.72)';
        starPath(sx, sy, 15);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
    // Mission line, top-left.
    if (extra.objective) {
      ctx.fillStyle = 'rgba(12,7,30,0.62)';
      const w = Math.min(430, 26 + extra.objective.length * 8.4);
      ctx.beginPath(); ctx.roundRect(18, 16, w, 56, 9); ctx.fill();
      text(extra.missionName || 'MISSION', 32, 24, 14, PALETTE.gold, 'left', true);
      text(extra.objective, 32, 43, 17.5, '#ffffff', 'left', true, FONT_BODY);
      if (extra.timer !== null && extra.timer !== undefined) {
        const urgent = extra.timer < 15;
        text(`${Math.max(0, Math.ceil(extra.timer))}s`, 32 + w - 14, 24, 21, urgent ? '#ff5d5d' : '#ffffff', 'right', true);
      }
    }
    // Mission banner, top-center.
    if (state.banner) {
      const b = state.banner;
      const fade = clamp(Math.min(b.t * 4, (b.life - b.t) * 2.2), 0, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(10,5,28,0.78)';
      const bw = 560;
      ctx.beginPath(); ctx.roundRect(VIEW.width / 2 - bw / 2, 18, bw, 76, 10); ctx.fill();
      ctx.fillStyle = PALETTE.neonPink;
      ctx.fillRect(VIEW.width / 2 - bw / 2, 18, bw, 4);
      text(b.title, VIEW.width / 2, 30, 27, PALETTE.gold, 'center', true);
      text(b.sub, VIEW.width / 2, 64, 17, '#ffffff', 'center', false, FONT_BODY);
      ctx.restore();
    }
    // Toasts under the banner.
    let ty = state.banner ? 106 : 22;
    ctx.textBaseline = 'top';
    for (const toast of state.toasts) {
      const a = clamp(Math.min(toast.t * 5, (toast.life - toast.t) * 1.6), 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 21px ${FONT}`;
      const w = ctx.measureText(toast.text).width + 30;
      ctx.fillStyle = 'rgba(10,5,28,0.66)';
      ctx.beginPath(); ctx.roundRect(VIEW.width / 2 - w / 2, ty, w, 32, 8); ctx.fill();
      text(toast.text, VIEW.width / 2, ty + 5, 21, toast.color, 'center', true);
      ctx.restore();
      ty += 38;
    }
    // Speedo, bottom-right while driving.
    const car = state.player.inCar;
    if (car) {
      const mph = Math.round(Math.abs(car.speed) * 0.165);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      text(`${mph}`, VIEW.width - 104, VIEW.height - 96, 54, '#ffffff', 'right', true);
      ctx.restore();
      text('MPH', VIEW.width - 96, VIEW.height - 82, 21, PALETTE.muted, 'left', true);
      text(car.name.toUpperCase(), VIEW.width - 28, VIEW.height - 40, 17, PALETTE.neonCyan, 'right', true);
      // Health bar for the car.
      const hp = clamp(1 - car.damage / 100, 0, 1);
      ctx.fillStyle = 'rgba(10,5,28,0.65)';
      ctx.fillRect(VIEW.width - 188, VIEW.height - 112, 160, 8);
      ctx.fillStyle = hp > 0.45 ? PALETTE.cashGreen : hp > 0.2 ? PALETTE.gold : PALETTE.red;
      ctx.fillRect(VIEW.width - 188, VIEW.height - 112, 160 * hp, 8);
    }
    // Bust warning.
    if (state.bustT > 0.15 && !state.busted) {
      const a = 0.35 + Math.sin(state.time * 12) * 0.25;
      ctx.fillStyle = `rgba(255,30,30,${a * 0.35})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      text('THE COPS ARE ON YOU — MOVE!', VIEW.width / 2, VIEW.height - 64, 24, '#ff6b6b', 'center', true);
    }
    // Context prompt, bottom-center.
    if (state.prompt) {
      ctx.font = `600 18px ${FONT_BODY}`;
      const w = ctx.measureText(state.prompt).width + 34;
      ctx.fillStyle = 'rgba(10,5,28,0.72)';
      ctx.beginPath(); ctx.roundRect(VIEW.width / 2 - w / 2, VIEW.height - 52, w, 34, 17); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(state.prompt, VIEW.width / 2, VIEW.height - 45, 18, '#ffffff', 'center', false, FONT_BODY);
    }
    drawMinimap(state, extra.target);
    ctx.textBaseline = 'alphabetic';
  }

  function neonTitle(size) {
    const grad = ctx.createLinearGradient(VIEW.width / 2 - 330, 0, VIEW.width / 2 + 330, 0);
    grad.addColorStop(0, '#ff2e88');
    grad.addColorStop(0.5, '#b388ff');
    grad.addColorStop(1, '#22d3ee');
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = 34;
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grad;
    ctx.fillText('VICE HEAT', VIEW.width / 2, 218);
    ctx.restore();
  }

  function drawTitle(state) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, 'rgba(23,8,54,0.52)');
    g.addColorStop(0.45, 'rgba(23,8,54,0.08)');
    g.addColorStop(1, 'rgba(23,8,54,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    neonTitle(118);
    text('A  T O P - D O W N  C R I M E  S A N D B O X', VIEW.width / 2, 262, 21, '#ffd93b', 'center', true);
    text('Steal cars · Run missions · Outrun the heat', VIEW.width / 2, 300, 19, '#ffffff', 'center', false, FONT_BODY);
    if (Math.sin(state.time * 3.4) > -0.35) {
      text('CLICK TO PLAY  ·  PRESS ENTER', VIEW.width / 2, 428, 29, '#ffffff', 'center', true);
    }
    ctx.fillStyle = 'rgba(10,5,28,0.66)';
    ctx.beginPath(); ctx.roundRect(VIEW.width / 2 - 330, 486, 660, 108, 12); ctx.fill();
    text('WASD / ARROWS — walk & drive      E — enter / exit car', VIEW.width / 2, 524, 18.5, '#e8e3ff', 'center', false, FONT_BODY);
    text('ESC / P — pause      Stars bring cops. Lose them to cool off.', VIEW.width / 2, 554, 18.5, '#e8e3ff', 'center', false, FONT_BODY);
    text('3 missions pay $4,200 total. Get busted and it all ends.', VIEW.width / 2, 580, 16, PALETTE.muted, 'center', false, FONT_BODY);
  }

  function drawBusted(state, extra) {
    ctx.fillStyle = 'rgba(24,2,10,0.52)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 30;
    text('BUSTED', VIEW.width / 2, 268, 118, '#ff3b3b', 'center', true);
    ctx.restore();
    text('The Vice City PD got you.', VIEW.width / 2, 306, 21, '#ffffff', 'center', false, FONT_BODY);
    const mins = Math.floor(state.survived / 60);
    const secs = Math.floor(state.survived % 60);
    const lines = [
      `Cash earned   $${state.cash.toLocaleString('en-US')}`,
      `Missions complete   ${Math.min(state.missionIdx, 3)} / 3`,
      `Time survived   ${mins}:${String(secs).padStart(2, '0')}`,
      extra.best ? `Best cash   $${extra.best.toLocaleString('en-US')}` : '',
    ].filter(Boolean);
    ctx.fillStyle = 'rgba(10,5,28,0.58)';
    ctx.beginPath(); ctx.roundRect(VIEW.width / 2 - 220, 336, 440, lines.length * 36 + 28, 12); ctx.fill();
    lines.forEach((line, i) => {
      text(line, VIEW.width / 2, 372 + i * 36, 21, '#e8e3ff', 'center', false, FONT_BODY);
    });
    if (Math.sin(state.time * 3.4) > -0.35) {
      text('PRESS ENTER OR CLICK TO RUN IT BACK', VIEW.width / 2, 336 + lines.length * 36 + 74, 22, PALETTE.gold, 'center', true);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(14,6,36,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text('PAUSED', VIEW.width / 2, 330, 72, '#ffffff', 'center', true);
    text('Press P or Esc to resume', VIEW.width / 2, 372, 20, PALETTE.muted, 'center', false, FONT_BODY);
  }

  /** Paint one frame: world (camera-clamped), then HUD or screen overlay. */
  function draw(state, screen, extra) {
    const opts = extra || {};
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Camera, clamped so the frame stays inside the world where possible.
    let camX = clamp(state.camera.x, VIEW.width / 2, WORLD.width - VIEW.width / 2);
    let camY = clamp(state.camera.y, VIEW.height / 2, WORLD.height - VIEW.height / 2);
    if (state.shake > 0.2) {
      camX += Math.sin(state.time * 71) * state.shake;
      camY += Math.cos(state.time * 83) * state.shake;
    }
    ctx.save();
    ctx.translate(VIEW.width / 2 - camX, VIEW.height / 2 - camY);
    // Sky-sunset wash at the top of the world.
    drawWorldBase(state);
    drawRoads(state);
    drawBuildings(state);
    drawProps(state);
    drawSkids(state);
    drawCheckpoint(state, opts.target);
    for (const car of state.cars) if (car !== state.player.inCar) drawCar(car, state);
    if (state.player.inCar) drawCar(state.player.inCar, state);
    drawPeds(state);
    drawPlayerFigure(state);
    drawParts(state);
    ctx.restore();
    // Sunset vignette.
    const vg = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95);
    vg.addColorStop(0, 'rgba(30,5,60,0)');
    vg.addColorStop(1, 'rgba(30,5,60,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (screen === SCREEN_TITLE) { drawTitle(state); return; }
    drawHud(state, opts);
    if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_BUSTED) drawBusted(state, opts);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

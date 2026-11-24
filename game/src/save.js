import { SAVE_KEY, WORLD } from './config.js';
import { clamp } from './random.js';

const finite = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || raw.version !== 1 || !raw.player || !raw.mission) return null;
    const p = raw.player, m = raw.mission;
    if (!Number.isInteger(m.index) || m.index < 0 || m.index > 6 || !Number.isInteger(m.stage) || m.stage < 0 || m.stage > 6) return null;
    return {
      ...raw, seed: finite(raw.seed, 27) >>> 0,
      player: { x: clamp(finite(p.x, 3944), 90, WORLD.water - 35), y: clamp(finite(p.y, 2544), 90, WORLD.height - 90),
        angle: finite(p.angle, 0), health: clamp(finite(p.health, 100), 10, 100), cash: Math.max(0, Math.floor(finite(p.cash, 350))),
        ammo: clamp(Math.floor(finite(p.ammo, 12)), 0, 12), reserve: clamp(Math.floor(finite(p.reserve, 60)), 0, 999),
        weapon: p.weapon === 'pistol' ? 'pistol' : 'fists', thefts: Math.max(0, finite(p.thefts, 0)) },
      mission: { index: m.index, stage: m.stage, entered: '', progress: 0, finished: m.index === 6, completed: m.index }
    };
  } catch { return null; }
}
export function saveGame(world) {
  if (world.terminal) return false;
  const p = world.player;
  const data = { version: 1, seed: world.seed, savedAt: Date.now(),
    player: { x: p.x, y: p.y, angle: p.angle, health: p.health, cash: p.cash, ammo: p.ammo, reserve: p.reserve, weapon: p.weapon, thefts: p.thefts },
    mission: { ...world.mission }, heat: world.wanted.heat,
    car: p.car ? { x: p.car.x, y: p.car.y, angle: p.car.angle, health: p.car.health, color: p.car.color, type: p.car.type } : null };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}

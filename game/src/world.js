// This module owns state and update order; each subsystem only owns its own rules.
import { createRandom, clamp, lerp } from './random.js';
import { createCity } from './city.js';
import { createTraffic, createVehicle, updateVehicles } from './vehicles.js';
import { createPedestrians, updatePedestrians } from './pedestrians.js';
import { createPlayer, updatePlayer, hurtPlayer } from './player.js';
import { createWanted, addCrime, updatePolice } from './police.js';
import { updateCombat } from './combat.js';
import { createMissionState, updateMissions, MISSIONS, currentStage } from './missions.js';
import { updateEffects, notify, say } from './effects.js';
import { POI } from './config.js';

export function createWorld(seed = 27, saved = null) {
  const random = createRandom(seed);
  const city = createCity(random);
  const world = {
    seed, random, city, player: createPlayer(), cars: createTraffic(city, random),
    pedestrians: createPedestrians(city, random), police: [], enemies: [], bullets: [], particles: [],
    pickups: [], skids: [], sounds: [], notices: [], dialogue: null, announcement: '',
    wanted: createWanted(), mission: createMissionState(), sideJob: null, jobSerial: 0,
    time: 0, terminal: null, shake: 0, needsSave: false, completion: null, finale: 0,
    interaction: '', camera: { x: 3944, y: 2544, zoom: 1.08 }, mapOpen: false
  };
  world.crime = (severity, label) => addCrime(world, severity, label);
  world.hurt = amount => hurtPlayer(world, amount);
  if (saved) {
    Object.assign(world.player, saved.player); Object.assign(world.mission, saved.mission);
    if (world.mission.index < 6 && !MISSIONS[world.mission.index].stages[world.mission.stage]) world.mission.stage = 0;
    if (world.city.collides(world.player.x, world.player.y, 12)) {
      const safe = city.roadPoint(world.player); world.player.x = safe.x; world.player.y = safe.y;
    }
    if (saved.car && Number.isFinite(saved.car.x) && Number.isFinite(saved.car.y)) {
      const car = createVehicle('continued-ride', world.player.x, world.player.y, world.player.angle, {
        color: /^#[0-9a-f]{6}$/i.test(saved.car.color) ? saved.car.color : '#eab958',
        type: ['coupe', 'sport', 'taxi', 'van', 'police'].includes(saved.car.type) ? saved.car.type : 'coupe',
        health: clamp(Number(saved.car.health) || 80, 10, 100), driver: 'player', stolen: true
      });
      world.cars.push(car); world.player.car = car;
    }
    world.wanted.heat = clamp(Number(saved.heat) || 0, 0, 495);
    world.wanted.stars = Math.ceil(world.wanted.heat / 100);
    // Escaping remains meaningful across a save; ordinary completed stages stay completed.
    const stage = currentStage(world);
    if (stage?.type === 'escape' && !world.wanted.stars) world.wanted.heat = 120, world.wanted.stars = 2;
  }
  world.camera.x = world.player.x; world.camera.y = world.player.y;
  return world;
}
export function stepWorld(world, input, dt, ambient = false) {
  world.time += dt;
  if (!ambient && !world.terminal) {
    updatePlayer(world, input, dt);
    updateMissions(world, input, dt);
  }
  updateVehicles(world, dt);
  updatePedestrians(world, dt);
  if (!ambient && !world.terminal) {
    updatePolice(world, dt);
    updateCombat(world, input, dt);
  }
  updateEffects(world, dt);
  if (world.player.car) { world.player.x = world.player.car.x; world.player.y = world.player.car.y; }
  if (world.completion) { world.completion.life -= dt; if (world.completion.life <= 0) world.completion = null; }
  world.finale = Math.max(0, world.finale - dt);
  const p = world.player, speed = p.car ? Math.abs(p.car.speed) : 0;
  const targetZoom = p.car ? lerp(1.08, 0.85, clamp(speed / 480, 0, 1)) : 1.1;
  world.camera.zoom = lerp(world.camera.zoom, targetZoom, 1 - Math.exp(-2.5 * dt));
  const lookX = p.car ? Math.cos(p.angle) * p.car.speed * 0.12 : 0;
  const lookY = p.car ? Math.sin(p.angle) * p.car.speed * 0.12 : 0;
  world.camera.x = lerp(world.camera.x, p.x + lookX, 1 - Math.exp(-6 * dt));
  world.camera.y = lerp(world.camera.y, p.y + lookY, 1 - Math.exp(-6 * dt));
}
export function respawn(world) {
  const wasBusted = world.terminal === 'busted', p = world.player;
  if (p.car) p.car.driver = null;
  p.car = null; p.health = 100; p.invulnerable = 3;
  p.cash = Math.max(0, p.cash - (wasBusted ? 250 : 150));
  if (wasBusted) { p.ammo = 12; p.reserve = Math.max(12, p.reserve - 12); }
  Object.assign(p, wasBusted ? { x: 2480, y: 2488 } : { x: POI.hospital.x, y: POI.hospital.y });
  world.wanted = createWanted(); world.police = []; world.enemies = []; world.bullets = [];
  world.terminal = null; world.mission.stage = 0; world.mission.entered = ''; world.mission.progress = 0;
  world.camera.x = p.x; world.camera.y = p.y; world.sideJob = null; world.needsSave = true;
  notify(world, wasBusted ? 'Released. Impound & fine: $250' : 'Back on your feet. Clinic bill: $150', '#ef8266', 6);
  say(world, 'INEZ', 'You’re still here. That counts for something. Pick up the job when you’re ready.', 8);
}

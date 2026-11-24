// Boot, screen transitions and one fixed-step loop. The world never depends on wall-clock time.
import { STEP } from './config.js';
import { createInput, scriptedInput } from './input.js';
import { createWorld, stepWorld, respawn } from './world.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';
import { UI, inButton } from './hud.js';
import { say } from './effects.js';

const params = new URLSearchParams(location.search);
const value = Number.parseInt(params.get('seed') || '', 10);
const seed = Number.isFinite(value) ? value >>> 0 : 27081986;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
let saved = loadSave(), world = createWorld(seed);
let screen = 'title', saveText = '', accumulator = 0, last = performance.now(), saveClock = 0;
function announce(message) { status.textContent = message; }
function start(continuing) {
  saved = loadSave();
  world = createWorld(continuing && saved ? saved.seed : seed, continuing ? saved : null);
  screen = 'play'; accumulator = 0; input.clear(); audio.unlock();
  say(world, 'INEZ VELA', continuing ? 'Back in the bay. Your next objective is marked. Let’s finish what we started.' : 'Welcome home, Mara. Come by Tideway Garage. I could use a driver I can trust.', 10);
  announce('Playing as Mara Cruz. ' + (continuing ? 'Progress loaded.' : 'Meet Inez at Tideway Garage.'));
}
function save() {
  const success = saveGame(world);
  saved = loadSave(); world.needsSave = false; saveClock = 0;
  saveText = success ? 'PROGRESS SAVED IN THIS BROWSER' : 'STORAGE UNAVAILABLE · PROGRESS LASTS THIS VISIT';
  announce(saveText); audio.play('ui');
}
function handleActions() {
  const click = input.mouse.clicked;
  const enter = input.take('Enter');
  if (input.take('KeyM')) audio.toggle();
  if (screen === 'title') {
    if (enter || (click && inButton(input.mouse, UI.start))) start(false);
    else if ((input.take('KeyC') || (click && inButton(input.mouse, UI.continue))) && saved) start(true);
    return;
  }
  const pause = input.take('Escape') || input.take('KeyP');
  if (world.terminal) {
    if (enter || (click && inButton(input.mouse, UI.recover))) {
      respawn(world); screen = 'play'; input.clear(); save();
    }
    return;
  }
  if (screen === 'pause') {
    if (pause || enter || (click && inButton(input.mouse, UI.resume))) { screen = 'play'; input.clear(); announce('Resumed.'); }
    else if (input.take('KeyS') || (click && inButton(input.mouse, UI.save))) save();
    else if (input.take('KeyT') || (click && inButton(input.mouse, UI.title))) { save(); screen = 'title'; input.clear(); }
    return;
  }
  if (world.mapOpen && (pause || input.take('Tab'))) { world.mapOpen = false; input.clear(); return; }
  if (input.take('Tab')) { world.mapOpen = true; input.clear(); return; }
  if (pause) { screen = 'pause'; accumulator = 0; input.clear(); announce('Paused.'); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.2, (now - last) / 1000); last = now;
  handleActions();
  if (screen === 'title' || (screen === 'play' && !world.mapOpen && !world.terminal)) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      stepWorld(world, input, STEP, screen === 'title');
      accumulator -= STEP;
      if (world.terminal) { screen = world.terminal; announce(screen === 'busted' ? 'Busted. Press Enter to return.' : 'Wasted. Press Enter to return.'); break; }
    }
    if (screen === 'play') {
      saveClock += elapsed;
      if (world.needsSave || saveClock > 25) save();
    }
  } else accumulator = 0;
  if (world.announcement) { announce(world.announcement); world.announcement = ''; }
  audio.update(world, screen === 'play' && !world.mapOpen);
  renderer.draw(world, screen, { hasSave: !!saved, muted: audio.muted, saveText });
  input.endFrame();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play' && !world.terminal) { screen = 'pause'; input.clear(); announce('Paused.'); }
});
window.addEventListener('pagehide', () => { if (screen !== 'title' && !world.terminal) saveGame(world); });
// A small inspection surface helps deterministic browser QA without changing any rules.
window.__solmar = {
  get world() { return world; }, get screen() { return screen; },
  step: (values = {}, count = 1) => { for (let i = 0; i < count; i++) stepWorld(world, scriptedInput(values), STEP); renderer.draw(world, world.terminal || screen, { hasSave: !!saved }); },
  start, save
};
const shot = params.get('shot');
if (shot) {
  screen = stageShot(shot, world);
  let paints = 0;
  const paint = () => {
    renderer.draw(world, screen, { hasSave: false, muted: false });
    if (++paints < 2) requestAnimationFrame(paint);
    else { window.__shotReady = true; announce('Deterministic ' + shot + ' scene ready.'); }
  };
  requestAnimationFrame(paint);
} else {
  announce('Solmar Bay: Hot Streets. Press Enter to begin, or C to continue.');
  requestAnimationFrame(frame);
}

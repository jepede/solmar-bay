import { VIEW } from './config.js';

export function createInput(canvas) {
  const keys = new Set(), pressed = new Set();
  const mouse = { x: 800, y: 400, down: false, clicked: false, active: false };
  const handled = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
  window.addEventListener('keydown', event => {
    if (handled.has(event.code)) event.preventDefault();
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
    mouse.x = (event.clientX - rect.left - (rect.width - VIEW.width * scale) / 2) / scale;
    mouse.y = (event.clientY - rect.top - (rect.height - VIEW.height * scale) / 2) / scale;
    mouse.active = true;
  }
  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointer(event); mouse.down = true; mouse.clicked = true; canvas.focus();
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  return {
    mouse,
    held: code => keys.has(code),
    take: code => { const value = pressed.has(code); pressed.delete(code); return value; },
    axis: () => ({ x: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), y: Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) }),
    endFrame: () => { mouse.clicked = false; },
    clear: () => { pressed.clear(); keys.clear(); mouse.down = false; mouse.clicked = false; }
  };
}
// Screenshot direction and automated checks use the same controls as a real player.
export function scriptedInput(values = {}) {
  const held = new Set(values.keys || []), pressed = new Set(values.pressed || []);
  return {
    mouse: { x: values.mouseX ?? 850, y: values.mouseY ?? 400, down: !!values.fire, active: !!values.aim, clicked: false },
    held: key => held.has(key),
    take: key => { const found = pressed.has(key); pressed.delete(key); return found; },
    axis: () => ({ x: Number(held.has('KeyD')) - Number(held.has('KeyA')), y: Number(held.has('KeyS')) - Number(held.has('KeyW')) })
  };
}

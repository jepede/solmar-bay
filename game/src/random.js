// Mulberry32: city layout, AI decisions and screenshot scenes share a reproducible seed.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const pick = (random, values) => values[Math.floor(random() * values.length)];

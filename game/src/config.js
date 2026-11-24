// Simulation coordinates are independent of browser size. No downloaded assets are used.
export const VIEW = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const WORLD = { width: 4700, height: 4320, coast: 4180, water: 4390 };
export const ROAD = { firstX: 240, firstY: 250, spacing: 540, count: 8, width: 108, lane: 25 };
export const COLORS = { ink: '#112f35', cream: '#fff1d5', gold: '#ffd16d', coral: '#ef8266', teal: '#55dbc0', muted: '#aac4bd' };
export const FONT = '"Trebuchet MS", Arial, sans-serif';
export const SAVE_KEY = 'solmar-bay.hot-streets.v1';
export const SPAWN = { x: 3956, y: 2510, angle: -Math.PI / 2 };
export const POI = {
  garage: { x: 3956, y: 2488, name: 'Tideway Garage' },
  radio: { x: 2876, y: 1948, name: 'Radio Sol' },
  warehouse: { x: 1390, y: 3408, name: 'Foundry lockup' },
  port: { x: 3860, y: 3350, name: 'Pelican Docks' },
  relay: { x: 4100, y: 868, name: 'Miramar relay' },
  safehouse: { x: 864, y: 868, name: 'Luz’s courtyard' },
  press: { x: 1936, y: 328, name: 'The Bay Current' },
  hospital: { x: 3020, y: 1408, name: 'Solmar Clinic' },
  dispatch: { x: 3560, y: 1948, name: 'Bay Dispatch' },
  supply: { x: 2480, y: 2488, name: 'Nico’s Supplies' }
};

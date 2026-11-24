import { POI } from './config.js';
import { distance, pick } from './random.js';
import { notify, say } from './effects.js';
import { spawnGuards } from './combat.js';

const talk = (target, objective, speaker, line) => ({ type: 'talk', target, objective, speaker, line });
const drive = (target, objective, extra = {}) => ({ type: 'drive', target, objective, ...extra });
export const MISSIONS = [
  { title: 'Borrowed wheels', contact: 'INEZ VELA', reward: 450, stages: [
    talk('garage', 'Meet Inez at Tideway Garage.', 'INEZ', 'Mara Cruz. Back in town and already late. Venn wants our block. Take a car to Sol; he has a lead.'),
    { type: 'steal', objective: 'Find a ride. Press E beside a car.', speaker: 'MARA', line: 'One borrowed car. What could possibly go wrong?' },
    drive('radio', 'Bring a car to Radio Sol.', { speaker: 'SOL RIVAS', line: 'Inez sent you? Good. Venn’s buying the whole coast with dirty money. Let’s find the receipts.' })
  ] },
  { title: 'Paper trails', contact: 'SOL RIVAS', reward: 850, stages: [
    talk('radio', 'Talk to Sol outside Radio Sol.', 'SOL', 'A freight manifest is sitting in a Foundry lockup. Take it quietly. Bring it to Inez.'),
    { type: 'collect', target: 'warehouse', objective: 'Recover the freight manifest. [F]', heat: 125, speaker: 'MARA', line: 'Private security. Public money. These numbers don’t add up.' },
    { type: 'escape', objective: 'Lose the police. Break sight and stay hidden.' },
    drive('garage', 'Deliver the manifest to Tideway Garage.', { speaker: 'INEZ', line: 'Sable Crew. Venn’s muscle. Their real ledger is down at Pelican Docks.' })
  ] },
  { title: 'Dockside debt', contact: 'INEZ VELA', reward: 1200, stages: [
    talk('garage', 'Meet Inez at the garage.', 'INEZ', 'Sable’s holding the ledger at the docks. They won’t hand it over. Use cover, and watch your back.'),
    { type: 'combat', target: 'port', objective: 'Take down the three Sable guards at the docks.', speaker: 'MARA', line: 'That ledger belongs to the people you stole from.' },
    { type: 'collect', target: 'port', objective: 'Collect Sable’s ledger. [F]', heat: 70 },
    drive('radio', 'Bring the ledger to Sol at Radio Sol.', { speaker: 'SOL', line: 'Every payoff. Every eviction. Now we need a signal big enough for the whole bay.' })
  ] },
  { title: 'Turn up the truth', contact: 'SOL RIVAS', reward: 1400, stages: [
    talk('radio', 'Pick up Sol’s transmitter. [F]', 'SOL', 'Miramar’s relay can reach every radio in town. Plug in the transmitter and keep it broadcasting.'),
    drive('relay', 'Drive to the Miramar beach relay.'),
    { type: 'upload', target: 'relay', objective: 'On foot: hold F by the relay to broadcast.', duration: 8, heat: 245, speaker: 'SOL', line: 'You’re live, Mara. Eight seconds. Give this city something worth listening to.' },
    { type: 'escape', objective: 'Transmission sent. Lose the three-star pursuit.' }
  ] },
  { title: 'Precious cargo', contact: 'INEZ VELA', reward: 1800, stages: [
    talk('garage', 'Collect Inez from Tideway Garage.', 'INEZ', 'Venn knows it was us. I’ve got the originals. Get me to Luz’s courtyard, and keep the engine running.'),
    drive('safehouse', 'Drive Inez to Luz’s courtyard.', { heatOnEnter: 245, speaker: 'INEZ', line: 'Remember when this was just a quiet drive home? Neither do I.' }),
    { type: 'escape', objective: 'Keep Inez safe. Lose the heat.' },
    talk('safehouse', 'Check in with Inez at the courtyard.', 'INEZ', 'We made it. One last delivery. The Bay Current will print what Venn can’t buy.')
  ] },
  { title: 'The city is listening', contact: 'MARA CRUZ', reward: 3000, stages: [
    talk('safehouse', 'Get the final plan from Inez.', 'INEZ', 'Sol has the recordings. Bring them to the newspaper, then send every last file. We finish this together.'),
    { type: 'collect', target: 'radio', objective: 'Collect the recordings at Radio Sol. [F]', speaker: 'SOL', line: 'The city is listening, Mara. Don’t keep it waiting.' },
    drive('press', 'Get the evidence to The Bay Current.'),
    { type: 'upload', target: 'press', objective: 'On foot: hold F to send Venn’s files.', duration: 10, heat: 345, speaker: 'MARA', line: 'For every family he pushed out. Let it all come to light.' },
    { type: 'escape', objective: 'The truth is out. Escape Venn’s last pursuit.' },
    talk('garage', 'Return to Inez at Tideway Garage.', 'INEZ', 'Venn’s finished. The garage stays. The coast stays ours. Welcome home, Mara.')
  ] }
];

export function createMissionState() {
  return { index: 0, stage: 0, entered: '', progress: 0, finished: false, completed: 0 };
}
export function currentStage(world) { return MISSIONS[world.mission.index]?.stages[world.mission.stage] || null; }
export function missionTarget(world) {
  const stage = currentStage(world);
  if (!stage) return null;
  return stage.target ? POI[stage.target] : stage.type === 'steal' ? { x: 3994, y: 2554, name: 'Find a ride' } : null;
}
function advance(world) {
  const m = world.mission, mission = MISSIONS[m.index];
  m.stage++; m.progress = 0; m.entered = ''; world.needsSave = true;
  world.sounds.push('pickup');
  if (m.stage < mission.stages.length) return;
  world.player.cash += mission.reward; m.completed++;
  notify(world, 'JOB COMPLETE  ·  ' + mission.title + '  +$' + mission.reward, '#55dbc0', 7);
  world.completion = { title: mission.title, reward: mission.reward, life: 5 };
  world.sounds.push('complete'); world.enemies = [];
  m.index++; m.stage = 0;
  if (m.index >= MISSIONS.length) {
    m.finished = true;
    world.finale = 16;
    say(world, 'INEZ VELA', 'The bay belongs to the people who call it home. Take a drive, Mara. You earned this sunrise.', 15);
  }
}
function canInteract(world, target, radius = 85) { return target && distance(world.player, target) < radius; }

const JOBS = [
  { title: 'Bay courier', kind: 'courier', reward: 400, duration: 160, route: ['dispatch', 'warehouse', 'garage'], text: 'Three parcels. No questions. Reach the marked delivery stops.' },
  { title: 'Meter running', kind: 'taxi', reward: 550, duration: 150, route: ['radio', 'safehouse'], text: 'Pick up a fare at Radio Sol, then drive them to Luz’s courtyard.' },
  { title: 'Coast sprint', kind: 'sprint', reward: 700, duration: 110, route: ['relay', 'port', 'garage'], text: 'Beat the clock. Hit all three coastal checkpoints in a car.' }
];
export function startSideJob(world) {
  if (world.sideJob) { world.sideJob = null; notify(world, 'Dispatch job cancelled.'); return; }
  const job = JOBS[world.jobSerial++ % JOBS.length];
  world.sideJob = { ...job, route: [...job.route], stage: 0, remaining: job.duration };
  notify(world, 'DISPATCH  ·  ' + job.title, '#55dbc0');
  say(world, 'BAY DISPATCH', job.text, 7);
}
function updateSideJob(world, dt) {
  const job = world.sideJob;
  if (!job) return;
  job.remaining -= dt;
  if (job.remaining <= 0) { world.sideJob = null; notify(world, 'Dispatch expired. Press J for a new job.', '#ef8266'); return; }
  const target = POI[job.route[job.stage]];
  if (world.player.car && distance(world.player, target) < 100) {
    job.stage++; world.sounds.push('pickup');
    if (job.stage >= job.route.length) {
      world.player.cash += job.reward; notify(world, job.title + ' complete  +$' + job.reward, '#55dbc0', 6);
      world.sideJob = null; world.needsSave = true; world.sounds.push('complete');
    } else notify(world, 'Stop complete. Next delivery marked.', '#55dbc0');
  }
}
function shops(world, pressed) {
  const p = world.player;
  if (canInteract(world, POI.supply, 65)) {
    world.interaction = 'F  ·  Ammo +36 / first aid  ·  $75';
    if (pressed && p.cash >= 75) {
      p.cash -= 75; p.reserve += 36; p.health = Math.min(100, p.health + 30);
      notify(world, 'Stocked up: +36 rounds · +30 health', '#55dbc0'); world.sounds.push('pickup'); world.needsSave = true;
    } else if (pressed) notify(world, 'You need $75.', '#ef8266');
  } else if (canInteract(world, POI.hospital, 65)) {
    world.interaction = 'F  ·  Full medical care  ·  $100';
    if (pressed && p.cash >= 100) { p.cash -= 100; p.health = 100; world.sounds.push('pickup'); notify(world, 'Patched up. Take it easy out there.', '#55dbc0'); }
    else if (pressed) notify(world, 'You need $100.', '#ef8266');
  } else if (p.car && canInteract(world, POI.garage, 95)) {
    world.interaction = world.wanted.stars ? 'Lose the heat before using the garage.' : 'F  ·  Repair car & repaint  ·  $125';
    if (pressed && !world.wanted.stars && p.cash >= 125) { p.cash -= 125; p.car.health = 100; p.car.color = pick(world.random, ['#6ebdc0', '#edb94d', '#ed886e']); notify(world, 'Good as new.', '#55dbc0'); world.sounds.push('pickup'); }
  }
}
export function updateMissions(world, input, dt) {
  world.interaction = '';
  if (input.take('KeyJ')) startSideJob(world);
  updateSideJob(world, dt);
  const stage = currentStage(world), m = world.mission;
  const pressed = input.take('KeyF');
  if (!stage) { shops(world, pressed); return; }
  const key = m.index + ':' + m.stage;
  if (m.entered !== key) {
    m.entered = key; m.progress = 0;
    if (stage.type === 'combat') spawnGuards(world, POI[stage.target]);
    if (stage.heatOnEnter && world.wanted.heat < stage.heatOnEnter) world.crime(stage.heatOnEnter - world.wanted.heat, 'Witness extraction');
    if (stage.type === 'upload' && stage.heat && world.wanted.heat < stage.heat) world.crime(stage.heat - world.wanted.heat, 'Unauthorized broadcast');
    if (stage.line && stage.type !== 'talk' && stage.type !== 'collect') say(world, stage.speaker, stage.line);
  }
  const target = missionTarget(world), near = canInteract(world, target);
  if ((stage.type === 'talk' || stage.type === 'collect') && near) {
    world.interaction = 'F  ·  ' + (stage.type === 'talk' ? 'Talk / collect intel' : 'Collect evidence');
    if (pressed) {
      if (stage.line) say(world, stage.speaker, stage.line, 10);
      if (stage.heat) world.crime(stage.heat, 'Evidence recovered');
      advance(world);
    }
  } else if (stage.type === 'steal') {
    if (world.player.car) advance(world);
  } else if (stage.type === 'drive' && near) {
    if (world.player.car) {
      if (stage.line) say(world, stage.speaker, stage.line, 9);
      advance(world);
    } else world.interaction = 'Bring a car to the yellow marker.';
  } else if (stage.type === 'escape' && world.wanted.stars === 0) {
    advance(world);
  } else if (stage.type === 'combat') {
    const alive = world.enemies.filter(e => e.health > 0).length;
    if (!alive) advance(world);
    else if (near) world.interaction = alive + ' Sable guards remaining · aim + click to attack';
  } else if (stage.type === 'upload' && near) {
    world.interaction = world.player.car ? 'E  ·  Get out to use the terminal' : 'Hold F  ·  Broadcast evidence';
    if (!world.player.car && input.held('KeyF')) {
      m.progress += dt;
      if (m.progress >= stage.duration) { notify(world, 'Evidence transmitted. Get clear!', '#55dbc0'); advance(world); }
    }
  }
  if (!world.interaction && !(near && (stage.type === 'collect' || stage.type === 'talk'))) shops(world, pressed);
}

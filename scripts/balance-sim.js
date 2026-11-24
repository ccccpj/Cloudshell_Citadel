'use strict';

// Run from the WeChat project with Node. Active profiles use the same skill tree plan.
// Their reaction interval, trigger distance and miss chance differ. Novices also
// choose a random reward card; the other two profiles prioritize combat bonuses.
const Game = require('../minigame/common/GameComponent');
const Config = require('../minigame/common/GameConfig');
const PROFILES = {
  idle: { interval: Infinity },
  novice: { interval: 1.6, range: 0.68, miss: 0.2 },
  regular: { interval: 0.65, range: 0.90, miss: 0.07 },
  skilled: { interval: 0.2, range: 1.0, miss: 0.0 }
};
const BUILDS = {
  fire: { first: 'flameBurst', output: ['damage', 'burnDamage', 'burnDuration', 'cooldown', 'explosion', 'burnSpread'] },
  ice: { first: 'absoluteZero', output: ['damage', 'slow', 'resonance', 'cooldown', 'slowDuration', 'armor'] },
  electric: { first: 'thunderGod', output: ['damage', 'chainCount', 'chainDamage', 'chainRange', 'cooldown', 'groupDamage'] },
  wind: { first: 'stormEye', output: ['damage', 'knockback', 'cooldown', 'groupDamage', 'knockbackDuration', 'speed'] }
};
const noop = () => {};
const ctx = new Proxy({ measureText: text => ({ width: [...text].length * 12 }) },
  { get: (object, key) => object[key] || noop });

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let v = Math.imul(seed ^ seed >>> 15, seed | 1);
    v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    return ((v ^ v >>> 14) >>> 0) / 4294967296;
  };
}

function tap(game, box, minY = box.y, maxY = box.y + box.height) {
  game.handleTouch(box.x + box.width / 2, (Math.max(minY, box.y) + Math.min(maxY, box.y + box.height)) / 2);
}

function buyRow(game, key, kind) {
  const panel = game.upgradeComponent;
  const points = game.experienceSystem.getExperienceStatus().upgradePoints;
  const rows = panel.listRows(points);
  const index = rows.findIndex(row => row.key === key && row.kind === kind);
  if (index < 0 || !rows[index].enabled) return false;
  panel.scrollBy(-panel.scrollOffset);
  panel.draw(ctx);
  let row = panel.rows.find(r => r.key === key && r.kind === kind);
  while (!row && panel.scrollOffset < panel.maxScroll) {
    panel.scrollBy(panel.listBottom - panel.listTop);
    panel.draw(ctx);
    row = panel.rows.find(r => r.key === key && r.kind === kind);
  }
  if (!row) throw new Error('Affordable upgrade has no visible control: ' + key);
  tap(game, row.rect, panel.listTop, panel.listBottom);
  panel.draw(ctx);
  return true;
}

// Purchases use the same list and detail controls as a player.
function invest(game, element, targets) {
  const system = game.upgradeSystem;
  for (const [key, level] of targets) {
    while (system.getWaveUpgradeLevel(element, key) < level && buyRow(game, key, 'upgrade')) {}
  }
  return targets.every(([key, level]) => system.getWaveUpgradeLevel(element, key) >= level);
}

function awaken(game, element, key) {
  const system = game.upgradeSystem, panel = game.upgradeComponent;
  if (system.hasAwakening(element, key)) return true;
  const requirements = Object.entries(system.awakeningSkills[element][key].requirements);
  if (!invest(game, element, requirements)) return false;
  buyRow(game, key, 'awakening');
  const purchased = Boolean(panel.detailBuy);
  tap(game, purchased ? panel.detailBuy : panel.detailBack);
  panel.draw(ctx);
  return purchased;
}

function maxStats(game, element, keys) {
  const system = game.upgradeSystem;
  return invest(game, element, keys.map(k => [k, system.getMaxUpgradeLevel(k, element)]));
}

function specialize(game, element, milestones) {
  const panel = game.upgradeComponent;
  const build = BUILDS[element];
  if (!awaken(game, element, build.first)) return;
  if (milestones.firstAwakening === null) milestones.firstAwakening = game.elapsed / 1000;
  // First finish the primary damage, control and cooldown stats of this build,
  // then meet and buy its other awakenings. This keeps all four builds investing.
  if (!maxStats(game, element, build.output)) return;
  const skills = Object.keys(game.upgradeSystem.awakeningSkills[element]);
  for (const key of skills) if (!awaken(game, element, key)) return;
  if (!maxStats(game, element, ['range', 'penetration'])) return;

  // After mastering the primary element, develop the always-available normal
  // wave through the same screen a player uses.
  tap(game, panel.backButton);
  panel.draw(ctx);
  buyRow(game, 'normal', 'element');
  if (!maxStats(game, 'normal', ['damage', 'cooldown', 'width'])) return;
  for (const key of ['instantCast', 'pureForce', 'infiniteSpread']) {
    if (!awaken(game, 'normal', key)) return;
  }
  maxStats(game, 'normal', ['range', 'penetration']);
}

function chooseRewards(game, order, milestones, behaviorRng, profile) {
  const cards = game.enhancementComponent;
  const stats = cards.enhancementSystem.playerStats;
  const priority = ['attack', 'waveWidth', 'cooldown', 'armor', 'critRate', 'health', 'shield'];
  if (stats.waveCount === 1) priority.unshift('waveCount');
  while (cards.isVisible()) {
    cards.draw(ctx);
    const offered = cards.state.availableCards;
    let card = offered[0];
    if (profile === 'novice') card = offered[Math.floor(behaviorRng() * offered.length)];
    else if (profile !== 'idle') {
      const weight = c => (priority.includes(c.type) ? priority.length - priority.indexOf(c.type) : 0) + c.tier * 0.65;
      card = offered.reduce((best, c) => weight(c) > weight(best) ? c : best);
    }
    tap(game, card.bounds);
    milestones.cards++;
  }
  const panel = game.upgradeComponent;
  if (!panel.isVisible()) return;
  panel.draw(ctx);
  const system = game.upgradeSystem;
  // With --order, save for the next element after bringing the previous one
  // to damage 2. Once the roster is complete, specialize in the first element.
  let element = order[0];
  for (const type of order) {
    element = type;
    if (!system.isWaveUnlocked(type) || system.getWaveUpgradeLevel(type, 'damage') < 2) break;
    element = order[0];
  }
  const unlocked = system.isWaveUnlocked(element);
  if (profile !== 'idle' && buyRow(game, element, 'element')) {
    if (!unlocked && milestones.firstElement === null) milestones.firstElement = game.elapsed / 1000;
    if (element === order[0] && order.every(type => system.isWaveUnlocked(type))) {
      specialize(game, element, milestones);
    } else {
      invest(game, element, [['damage', 2]]);
    }
  }
  tap(game, panel.continueButton);
}

function attack(game, profile, order, inputRng) {
  const player = game.player;
  const closest = game.enemyComponent.enemies.reduce((d, e) =>
    Math.min(d, Math.hypot(e.x - player.x, e.y - player.y) - e.radius), Infinity);
  // The release history snapshot used its device width as the arena. This fallback
  // lets the same bot run paired before/after comparisons on that snapshot.
  const fieldWidth = (Config.BATTLEFIELD || game.canvas).width;
  if (inputRng() < profile.miss) return;
  for (const type of [...order, 'normal']) {
    if (!game.upgradeSystem.isWaveUnlocked(type)) continue;
    const reach = fieldWidth * Config.WAVE_CONFIG.MAX_RADIUS_RATIO * game.upgradeSystem.getWaveRangeMultiplier(type);
    if (closest > reach * profile.range) continue;
    // A decision is a single press. Let this element's oldest wave reach its
    // target before replacing it; other elements have independent capacities.
    const active = game.waveComponent.waves.filter(w => !w.bonus && w.type === type);
    if (active.length >= game.enhancementComponent.enhancementSystem.playerStats.waveCount &&
        active[0].radius < closest - player.radius) continue;
    const b = game.waveButtons.find(button => button.type === type);
    const remaining = game.waveRecovery ? game.waveRecovery(b).remaining :
      game.waveCooldown(type) - (game.elapsed - b.lastUseTime);
    if (remaining > 0.01) continue;
    game.fireAt(b.x, b.y);
    return;
  }
}

function run(seed, name, order, levels, width, height) {
  Math.random = rng(seed);
  const inputRng = rng(seed ^ 0xbb67ae85);
  const storage = new Map([['flightFeedback', { autoWave: opts.mode !== 'manual' }]]);
  global.wx = {
    getStorageSync: k => storage.get(k), setStorageSync: (k, v) => storage.set(k, v),
    getOpenDataContext: () => ({ postMessage: noop }), vibrateShort: noop, vibrateLong: noop,
    createInnerAudioContext: () => ({ play: noop, onEnded: noop, onError: noop })
  };
  const game = new Game({ width, height, getContext: () => ctx }, ctx, { windowWidth: width, windowHeight: height });
  // Give enemy spawns their own reproducible random stream, so a lucky cosmetic particle
  // or an additional critical hit doesn't change the next enemy's spawn side or type.
  const spawn = game.enemyComponent.spawnEnemy;
  const spawnRng = rng(seed ^ 0x9e3779b9);
  game.enemyComponent.spawnEnemy = function () {
    const combatRng = Math.random;
    Math.random = spawnRng;
    try { return spawn.call(this); } finally { Math.random = combatRng; }
  };
  const milestones = { firstKill: null, firstElement: null, firstAwakening: null, kills: 0, cards: 0 };
  const onKill = game.enemyComponent.onEnemyKilled;
  game.enemyComponent.setEnemyKilledCallback((points, type) => {
    milestones.kills++;
    if (milestones.firstKill === null) milestones.firstKill = game.elapsed / 1000;
    onKill(points, type);
  });
  const stages = [];
  const profile = PROFILES[name];
  let next = 0;
  while (game.gameState === 'playing' && game.levelManager.currentLevel <= levels) {
    const level = game.levelManager.currentLevel;
    if (opts.mode !== 'auto' && name !== 'idle' && game.elapsed >= next) {
      attack(game, profile, order, inputRng);
      next = game.elapsed + profile.interval * (0.85 + 0.3 * inputRng()) * 1000;
    }
    game.step(1 / 60);
    if (game.gameState !== 'playing') break;
    if (!game.playing || game.levelManager.currentLevel !== level) {
      const hpAtClear = game.player.health;
      if (game.waveClear) game.advanceWaveClear(1000);
      chooseRewards(game, order, milestones, inputRng, name);
      if (!game.playing || game.levelManager.currentLevel !== level + 1) throw new Error('Stage failed to advance: ' + level);
      stages.push({ level, hpAtClear, kills: milestones.kills, cards: milestones.cards,
        playerLevel: game.experienceSystem.getExperienceStatus().currentLevel });
    }
  }
  return { seed, stages, ...milestones, seconds: game.elapsed / 1000, score: game.score,
    unspentPoints: game.experienceSystem.getExperienceStatus().upgradePoints,
    upgrades: game.upgradeSystem.waveUpgrades };
}

const round = n => Math.round(n * 10) / 10;
function median(values) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  return round((a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2);
}

function summarize(runs, levels) {
  const result = {};
  for (const key of ['firstKill', 'firstElement', 'firstAwakening']) {
    const seen = runs.map(r => r[key]).filter(Number.isFinite);
    result[key] = { count: seen.length, medianSeconds: median(seen) };
  }
  for (const key of ['seconds', 'kills', 'score', 'cards', 'unspentPoints']) result['median_' + key] = median(runs.map(r => r[key]));
  result.stages = Array.from({ length: levels }, (_, i) => {
    const cleared = runs.flatMap(r => r.stages[i] || []);
    return { level: i + 1, cleared: cleared.length, rate: round(100 * cleared.length / runs.length),
      medianHp: median(cleared.map(r => r.hpAtClear)), medianPlayerLevel: median(cleared.map(r => r.playerLevel)),
      medianCumulativeCards: median(cleared.map(r => r.cards)) };
  });
  return result;
}

const { parseArgs } = require('node:util');
const { values } = parseArgs({ options: {
  mode: { type: 'string', default: 'manual' },
  seeds: { type: 'string', default: '24' }, seed: { type: 'string', default: '1' },
  levels: { type: 'string', default: '10' }, profiles: { type: 'string', default: 'novice,regular,skilled' },
  element: { type: 'string', default: 'fire' }, order: { type: 'string' }, stride: { type: 'string', default: '1' }, width: { type: 'string', default: '375' },
  height: { type: 'string', default: '667' }, raw: { type: 'boolean', default: false }
} });
const opts = { ...values, order: (values.order || values.element).split(','), profiles: values.profiles.split(',') };
for (const name of ['seed', 'stride', 'seeds', 'levels', 'width', 'height']) {
  opts[name] = Number(values[name]);
  if (!Number.isSafeInteger(opts[name]) || opts[name] < (name === 'seed' ? 0 : 1)) throw new Error('Invalid --' + name);
}
if (!['manual', 'auto', 'mixed'].includes(opts.mode)) throw new Error('Unknown attack mode');
if (opts.order.some(type => !Object.hasOwn(BUILDS, type)) || new Set(opts.order).size !== opts.order.length || opts.profiles.some(p => !Object.hasOwn(PROFILES, p))) throw new Error('Unknown build or profile');
const output = { options: opts, results: {} };
const originalLog = console.log;
const originalRandom = Math.random;
console.log = noop;
try {
  for (const name of opts.profiles) {
    const runs = Array.from({ length: opts.seeds }, (_, i) => run(opts.seed + i * opts.stride, name, opts.order, opts.levels, opts.width, opts.height));
    output.results[name] = summarize(runs, opts.levels);
    if (opts.raw) output.results[name].runs = runs;
  }
} finally {
  console.log = originalLog;
  Math.random = originalRandom;
}
console.log(JSON.stringify(output, null, 2));

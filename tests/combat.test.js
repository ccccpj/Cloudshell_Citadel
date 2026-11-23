const { test } = require('node:test');
const assert = require('node:assert/strict');
const GameConfig = require('../minigame/common/GameConfig');
const EnemyComponent = require('../minigame/common/EnemyComponent');
const WaveComponent = require('../minigame/common/WaveComponent');
const UpgradeSystem = require('../minigame/common/UpgradeSystem');

const canvas = { getContext: () => ({}) };
const testField = { width: 320, height: 568 };

function arena() {
  const enemies = new EnemyComponent(canvas, testField);
  const waves = new WaveComponent(canvas, testField);
  const upgrades = new UpgradeSystem();
  waves.setUpgradeSystem(upgrades);
  enemies.setUpgradeSystem(upgrades);
  enemies.setWaveComponent(waves);
  return { enemies, waves, upgrades };
}

function target(id, x = 0) {
  return { id, type: 'tank', x, y: 0, radius: 8, vx: 0, vy: 0, health: 100, maxHealth: 100, impactDamage: 50,
    shield: 0, armor: 0, color: '#fff', resistances: [], immunities: [], statusEffects: new Map(), scoreValue: 20 };
}

function enable(upgrades, element, ...awakenings) {
  upgrades.unlockedWaves[element] = true;
  upgrades.waveUpgrades[element].awakening.push(...awakenings);
}

function stubFeedback(t) {
  const previous = global.wx;
  global.wx = { vibrateShort() {}, createInnerAudioContext: () => ({ onEnded() {}, onError() {}, play() {} }) };
  t.after(() => { global.wx = previous; });
}

test('不同刷新率下相同战场的一秒波程相同，最大半径的最后一段仍能命中', () => {
  for (const fps of [30, 60, 120]) {
    const { waves, enemies } = arena();
    waves.createWave('normal', 0, 0);
    for (let frame = 0; frame < fps; frame++) waves.update(1 / fps);
    assert.equal(waves.getWaves()[0].radius, 180);
    const edge = target(1, 191);
    enemies.enemies.push(edge);
    waves.update(0.1);
    enemies.checkWaveCollisions(waves.getWaves());
    assert.ok(edge.health < 100);
    waves.update(0.1);
    assert.equal(waves.getWaveCount(), 0);
  }
});

test('圆心同帧击杀先结算分数、经验类型及榜单击杀，存活目标才扣盾', t => {
  stubFeedback(t);
  const { enemies } = arena();
  const dead = target(1), alive = target(2);
  dead.health = -3;
  dead.rankTicket = { index: 1 };
  alive.health = 24;
  const stats = { armor: 0, shield: 5 };
  enemies.setEnhancementSystem({ getPlayerStats: () => stats, playerStats: stats });
  const kills = [], tickets = [];
  enemies.setEnemyKilledCallback((points, type) => kills.push([points, type]));
  enemies.rankedRun = { kill: ticket => tickets.push(ticket) };
  enemies.enemies.push(dead, alive);
  const player = { x: 0, y: 0, radius: 10 };
  assert.equal(enemies.checkPlayerCollision(player), 7);
  assert.equal(enemies.checkPlayerCollision(player), 0);
  assert.equal(stats.shield, 0);
  assert.deepEqual(kills, [[20, 'tank']]);
  assert.deepEqual(tickets, [dead.rankTicket]);
});

test('元素基础倍率只用一次，火冰穿透在第二级封顶', () => {
  const { upgrades } = arena();
  for (const [type, damage] of Object.entries({ fire: 15, wind: 8, ice: 9, electric: 12 })) {
    assert.equal(GameConfig.calculateDamage(10, type, target(1), false, null, upgrades), damage);
  }
  for (const element of ['fire', 'ice']) {
    enable(upgrades, element);
    assert.equal(upgrades.upgradeWave(element, 'penetration'), true);
    assert.equal(upgrades.upgradeWave(element, 'penetration'), true);
    const capped = upgrades.getWavePenetrationBonus(element);
    assert.equal(upgrades.upgradeWave(element, 'penetration'), false);
    assert.equal(upgrades.getWavePenetrationBonus(element), capped);
  }
});

test('纯净之力穿过免疫、护甲与护盾；奖励火环在手动波上限外生效', () => {
  const { upgrades, enemies, waves } = arena();
  enable(upgrades, 'normal', 'pureForce');
  enable(upgrades, 'fire');
  const ghost = target(1);
  ghost.immunities = ['normal'];
  ghost.shield = 80;
  ghost.armor = 999;
  enemies.enemies.push(ghost);
  waves.createWave('normal', 0, 0);
  waves.update(0.01);
  enemies.checkWaveCollisions(waves.getWaves());
  assert.ok(ghost.health <= 90);
  assert.equal(ghost.shield, 80);
  for (let i = 0; i < 8; i++) waves.createWave('fire', i, 0, true);
  waves.createWave('normal', 0, 0);
  assert.equal(waves.getWaveCount(), 9);
  waves.createWave('fire', 0, 0);
  assert.deepEqual(waves.getWaves().filter(w => !w.bonus).map(w => w.type), ['normal', 'fire']);
});

test('燃烧、火链、冰驱散与冻结死亡的范围伤害可连续结算', t => {
  stubFeedback(t);
  const { enemies, upgrades } = arena();
  enable(upgrades, 'ice', 'absoluteZero', 'crystalShatter');
  enable(upgrades, 'fire', 'eternalFire', 'fireChain', 'flameBurst');
  upgrades.waveUpgrades.ice.slow = 3;
  const first = target(1), second = target(2, 12), third = target(3, 18);
  enemies.enemies.push(first, second, third);
  enemies.applyDamage(first, 1, 'fire');
  enemies.applyDamage(second, 1, 'fire');
  assert.equal(first.statusEffects.get('burn').endTime, Infinity);
  enemies.updateStatusEffects(first, 1001);
  assert.ok(second.health < 99);
  enemies.applyDamage(first, 120, 'ice');
  assert.equal(first.statusEffects.has('burn'), false);
  assert.equal(first.statusEffects.get('slow').multiplier, 0);
  enemies.settleKills();
  assert.ok(third.health > 0 && third.health < 100);
  const before = third.health;
  enemies.applyDamage(second, 120, 'fire');
  enemies.settleKills();
  assert.ok(third.health > 0 && third.health < before);
});

test('无限连锁逐跳衰减，双倍破盾不会重复击中源敌人', () => {
  const { upgrades, enemies } = arena();
  enable(upgrades, 'electric', 'empPulse', 'infiniteChain');
  const line = [0, 40, 80, 120].map((x, i) => target(i, x));
  line[1].shield = 60;
  enemies.enemies = line;
  enemies.handleElectricChain(line[0], 30, new Set());
  assert.deepEqual(line.map(enemy => enemy.health), [100, 100, 84, 86]);
  assert.equal(line[1].shield, 24);
});

test('区域技能按战斗时间生效，冰暴按目标去重，风眼刷新时继承下一次伤害时间', () => {
  const { enemies, waves, upgrades } = arena();
  enable(upgrades, 'wind', 'stormEye');
  const victim = target(1, 15);
  enemies.enemies.push(victim);
  enemies.lastSpawnTime = Infinity;
  waves.triggerPolarStorm(0, 0);
  waves.update(0.2);
  enemies.update(0.2);
  const afterStorm = victim.health;
  assert.ok(afterStorm > 0 && afterStorm < 100);
  enemies.update(0.1);
  assert.equal(victim.health, afterStorm);
  assert.equal(victim.statusEffects.get('slow').multiplier, 0.3);
  waves.createWave('wind', 0, 0);
  enemies.update(0.1);
  assert.ok(victim.health < afterStorm);
  const nextTick = waves.vortices[0].nextTick;
  waves.createWave('wind', 0, 0);
  assert.equal(waves.vortices.length, 1);
  assert.equal(waves.vortices[0].nextTick, nextTick);
  waves.update(3.1);
  assert.equal(waves.vortices.length + waves.getPolarStorms().length, 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../minigame/common/GameComponent');

function setup(t) {
  const store = new Map();
  t.mock.method(Date, 'now', () => now);
  let now = 1000;
  global.wx = {
    getStorageSync: key => store.get(key), setStorageSync: (key, value) => store.set(key, value),
    createInnerAudioContext: () => ({ onEnded() {}, onError() {}, play() {} }),
    getOpenDataContext: () => ({ postMessage() {} }), vibrateShort() {}, vibrateLong() {}
  };
  t.after(() => { delete global.wx; });
  const ctx = new Proxy({ measureText: text => ({ width: String(text).length * 13 }),
    createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} })
  }, { get(target, key) { return target[key] ?? (() => {}); } });
  const canvas = { width: 375, height: 667, getContext: () => ctx };
  const info = { windowWidth: 375, windowHeight: 667, safeTop: 50, safeBottom: 20 };
  const game = new Game(canvas, ctx, info);
  return { game, canvas, info, store, tick(ms) { now += ms; game.update(); }, elapse(ms) { now += ms; } };
}

test('暂停和后台期间，波、敌人、关卡与释放冷却共用冻结的战斗时钟', t => {
  const { game, tick } = setup(t);
  const normal = game.waveButtons[2];
  assert.ok(game.fireAt(normal.x, normal.y));
  tick(100);
  const before = game.waveComponent.waves[0].radius, seconds = game.levelManager.timeRemaining;
  game.levelManager.togglePause();
  tick(10000);
  assert.equal(game.waveComponent.waves[0].radius, before);
  assert.equal(game.levelManager.timeRemaining, seconds);
  game.levelManager.togglePause();
  game.resetFrameClock();
  tick(100);
  assert.equal(Math.round(game.elapsed), 200);
  assert.equal(Math.round(game.waveComponent.waves[0].radius - before), 18);
  assert.ok(Math.abs(game.levelManager.timeRemaining - (seconds - 0.1)) < 1e-6);
});

test('元素切换保护单系冷却，普通波和被拒绝的点击不延长恢复', t => {
  const { game } = setup(t);
  const byType = Object.fromEntries(game.waveButtons.map(b => [b.type, b]));
  const { fire, normal, wind, ice } = byType;
  for (const button of [fire, wind, ice]) game.upgradeSystem.unlockWave(button.type);
  game.upgradeSystem.waveUpgrades.wind.awakening.push('endlessWind');
  const press = button => game.fireAt(button.x, button.y);
  press(fire);
  assert.equal(fire.lastUseTime, 0);
  assert.equal(game.waveRecovery(fire).duration, game.waveCooldown('fire'));
  assert.equal(game.waveRecovery(wind).remaining, 850);
  game.elapsed = 300;
  press(normal);
  press(ice);
  press(fire);
  assert.equal(normal.lastUseTime, 300);
  assert.equal(ice.lastUseTime, -Infinity);
  assert.equal(fire.lastUseTime, 0);
  assert.equal(game.waveRecovery(wind).remaining, 550);
  game.elapsed = 849;
  press(wind);
  assert.equal(wind.lastUseTime, -Infinity);
  game.elapsed = 850;
  press(wind);
  game.elapsed = 900;
  press(wind);
  assert.equal(wind.lastUseTime, 900);
  assert.equal(game.waveRecovery(wind).remaining, 0);
  assert.deepEqual(game.waveRecovery(ice), { remaining: 850, duration: 850, switching: true });
});

test('满两点每秒的回复在一秒战斗内补两点，暂停保留半个回复周期', t => {
  const { game, tick } = setup(t);
  const enhancements = game.enhancementComponent.enhancementSystem;
  enhancements.playerStats.healthRegen = 200;
  assert.equal(enhancements.calculateHealthRegenPerSecond(), 2);
  game.player.health = 70;
  tick(250);
  game.levelManager.togglePause();
  tick(5000);
  assert.equal(game.player.health, 70);
  game.levelManager.togglePause();
  game.resetFrameClock();
  tick(250);
  assert.equal(game.player.health, 71);
  tick(250);
  tick(250);
  assert.equal(game.player.health, 72);
});

test('关末先停留在战斗画面，期间冻结战斗，完成领取后进入下一关', t => {
  const { game, tick } = setup(t);
  game.currentLevelKills = 1;
  game.levelManager.timeRemaining = 0.01;
  game.step(1 / 60);
  game.draw();
  const elapsed = game.elapsed, count = game.waveComponent.waves.length;
  const normal = game.waveButtons[2];
  assert.equal(game.waveClear.level, 1);
  assert.equal(game.waveClear.kills, 1);
  for (let i = 0; i < 3; i++) {
    game.handleTouch(normal.x, normal.y);
    assert.equal(game.fireAt(normal.x, normal.y), false);
    tick(250);
  }
  assert.equal(game.elapsed, elapsed);
  assert.equal(game.enhancementComponent.isVisible(), false);
  assert.equal(game.waveComponent.waves.length, count);
  tick(150);
  game.draw();
  assert.equal(game.waveClear, null);
  assert.ok(game.enhancementComponent.isVisible());
  game.handleTouch(normal.x, normal.y);
  assert.ok(game.enhancementComponent.isVisible());
  assert.equal(game.levelManager.currentLevel, 1);
  const card = game.enhancementComponent.state.availableCards[0].bounds;
  game.handleTouch(card.x + card.width / 2, card.y + card.height / 2);
  assert.equal(game.levelManager.currentLevel, 2);
  assert.ok(game.levelManager.isRunning);
  assert.equal(game.experienceSystem.getExperienceStatus().enhancePoints, 0);
});

test('无奖励通关也有结算停留；后台时间不会跳过画面或增加战斗时间', t => {
  const { game, tick, elapse } = setup(t);
  game.levelManager.endLevel();
  tick(250);
  const elapsed = game.elapsed;
  // Mirrors wx.onShow: the frame clock restarts at the instant of return.
  elapse(60000);
  game.resetFrameClock();
  tick(0);
  assert.equal(game.waveClear.elapsed, 250);
  for (let i = 0; i < 3; i++) tick(250);
  assert.equal(game.levelManager.currentLevel, 2);
  assert.equal(game.elapsed, elapsed);
  const config = require('../minigame/common/GameConfig').LEVEL_CONFIG;
  assert.equal(game.levelManager.timeRemaining, Math.min(config.BASE_TIME + config.TIME_INCREMENT, config.MAX_TIME));
});

test('击杀即保存本机最高分，按敌人种类发经验，调整窗口只改变投影和按钮位置', t => {
  const { game, store, canvas, info } = setup(t);
  game.enemyComponent.onEnemyKilled(25, 'tank');
  assert.equal(store.get('waveGameHighScore'), '25');
  assert.equal(game.experienceSystem.getExperienceStatus().totalExp, 25);
  game.waveComponent.createWave('normal', game.player.x, game.player.y);
  canvas.width = info.windowWidth = 320;
  canvas.height = info.windowHeight = 568;
  game.resize();
  assert.equal(game.player.x, 187.5);
  assert.equal(game.waveComponent.waves[0].x, 187.5);
  assert.equal(game.waveComponent.waves[0].maxRadius, 225);
  assert.equal(game.view.scale, Math.min(320 / 375, 568 / 667));
  assert.equal(game.view.left + game.player.x * game.view.scale, 160);
  assert.equal(game.view.top + game.player.y * game.view.scale, 284);
  assert.equal(game.waveButtons[2].x, 160);
  game.draw();
});

test('实战首遇与换装按事件入册，角色帧和波前跟随逻辑坐标，死亡演出冻结战斗', t => {
  const { game, tick } = setup(t);
  const art = require('../minigame/common/Art');
  const book = require('../minigame/common/Collection');
  t.mock.method(art, 'image', path => ({ path, width: 256, height: 256 }));
  const actors = t.mock.method(art.player, 'drawFrame', () => {});
  const waves = t.mock.method(art.player, 'drawWave', () => {});
  const enemies = game.enemyComponent;
  enemies.rankedRun = null;
  t.mock.method(enemies, 'getRandomEnemyType', () => 'boss');
  enemies.setLevel(10);
  enemies.spawnEnemy();
  enemies.setLevel(11);
  enemies.spawnEnemy();
  assert.equal(book.encounters().boss, 10);
  game.upgradeSystem.unlockWave('electric');
  game.upgradeSystem.unlockWave('ice');
  assert.equal(game.formMask, 12);
  assert.ok(book.hasForm(12));
  const button = game.waveButtons.find(b => b.type === 'ice');
  game.fireAt(button.x, button.y);
  tick(100);
  game.draw();
  const cast = actors.mock.calls.find(call => call.arguments[3] === 'cast');
  assert.equal(cast.arguments[1].path, art.forms.forms[12].sheet);
  assert.deepEqual(cast.arguments.slice(5, 7), [game.player.x, game.player.y]);
  const wave = game.waveComponent.waves[0];
  assert.deepEqual(waves.mock.calls[0].arguments.slice(6), [wave.radius, wave.width, wave.alpha]);
  game.handlePlayerDeath();
  const elapsed = game.elapsed;
  assert.ok(game.isDefeatAnimating());
  for (let i = 0; i < 3; i++) tick(250);
  assert.equal(game.isDefeatAnimating(), false);
  assert.equal(game.elapsed, elapsed);
  game.draw();
  assert.ok(game.view.actions.some(action => action.id === 'restart'));
});

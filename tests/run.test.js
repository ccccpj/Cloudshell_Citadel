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
  return { game, canvas, info, store, tick(ms) { now += ms; game.update(); } };
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

test('关末面板拦截底层攻击，保留强化点后计时器进入下一关', t => {
  const { game } = setup(t);
  game.currentLevelKills = 1;
  game.levelManager.timeRemaining = 0.01;
  game.step(1 / 60);
  game.draw();
  assert.ok(game.enhancementComponent.isVisible());
  const count = game.waveComponent.waves.length;
  const normal = game.waveButtons[2];
  game.handleTouch(normal.x, normal.y);
  assert.equal(game.waveComponent.waves.length, count);
  const close = game.enhancementComponent.enhancementCloseButton;
  game.handleTouch(close.x + 4, close.y + 4);
  assert.equal(game.levelManager.currentLevel, 2);
  assert.ok(game.levelManager.isRunning);
  assert.equal(game.experienceSystem.getExperienceStatus().enhancePoints, 1);
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

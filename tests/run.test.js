const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../minigame/common/GameComponent');
const StateManager = require('../minigame/common/GameStateManager');

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

test('暂停设置复用首页偏好，返回后仍停在同一局，继续后才推进计时', t => {
  const { canvas, info, store, elapse } = setup(t);
  const manager = new StateManager(canvas, canvas.getContext(), info);
  manager.setState('playing');
  const run = manager.gameComponent;
  const level = run.levelManager;
  const tap = rect => {
    manager.handleTouch(rect.x + rect.width / 2, rect.y + rect.height / 2);
    manager.draw();
  };
  tap(level.pauseButton);
  tap(level.settingsButton);
  const menu = manager.menuComponent;
  assert.equal(menu.page, 'settings');
  const row = () => menu.zones.find(z => z.action === 'toggle:sound').rect;
  tap(row());
  assert.equal(store.get('flightFeedback').sound, false);
  tap(row());
  elapse(3000);
  const remaining = level.timeRemaining;
  run.update();
  tap(menu.zones.filter(z => z.action === 'home').at(-1).rect);
  assert.equal(manager.showingMenu, false);
  assert.equal(manager.gameComponent, run);
  assert.equal(level.isPaused, true);
  assert.equal(level.timeRemaining, remaining);
  tap(level.resume);
  elapse(100);
  run.update();
  assert.ok(Math.abs(level.timeRemaining - remaining + 0.1) < 1e-6);
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
  assert.equal(wind.lastUseTime, 850);
  assert.equal(game.waveComponent.waves.filter(wave => wave.type === 'wind').length, 1);
  assert.equal(game.waveRecovery(wind).remaining, 0);
  assert.deepEqual(game.waveRecovery(ice), { remaining: 800, duration: 850, switching: true });
  game.enhancementComponent.enhancementSystem.playerStats.cooldownAcceleration = 100;
  assert.equal(game.waveRecovery(ice).remaining, 375);
  game.enhancementComponent.enhancementSystem.playerStats.cooldownAcceleration = 9900;
  assert.equal(game.elementSwitchMs, 8.5);
  assert.equal(game.waveRecovery(ice).remaining, 0);
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

test('云幕合拢时换出强化卡，散去前点卡和放波均不生效', t => {
  const { game, tick } = setup(t);
  game.currentLevelKills = 1;
  game.levelManager.timeRemaining = 0.01;
  game.step(1 / 60);
  const elapsed = game.elapsed, count = game.waveComponent.waves.length;
  const normal = game.waveButtons[2];
  tick(250);
  tick(199);
  assert.equal(game.enhancementComponent.isVisible(), false);
  tick(1);
  assert.ok(game.enhancementComponent.isVisible());
  tick(250);
  tick(199);
  game.draw();
  const card = game.enhancementComponent.state.availableCards[0].bounds;
  const choose = () => game.handleTouch(card.x + card.width / 2, card.y + card.height / 2);
  choose();
  assert.equal(game.experienceSystem.getExperienceStatus().enhancePoints, 1);
  assert.equal(game.fireAt(normal.x, normal.y), false);
  assert.equal(game.waveComponent.waves.length, count);
  assert.equal(game.elapsed, elapsed);
  tick(1);
  assert.equal(game.waveClear, null);
  assert.equal(game.levelManager.currentLevel, 1);
  choose();
  assert.equal(game.levelManager.currentLevel, 2);
  assert.ok(game.levelManager.isRunning);
  assert.equal(game.experienceSystem.getExperienceStatus().enhancePoints, 0);
});

test('无奖励时云后显示下一关，切回前台及揭幕期间倒计时保持冻结', t => {
  const { game, tick, elapse } = setup(t);
  game.levelManager.endLevel();
  tick(250);
  const elapsed = game.elapsed;
  // Mirrors wx.onShow: the frame clock restarts at the instant of return.
  elapse(60000);
  game.resetFrameClock();
  tick(0);
  assert.equal(game.waveClear.elapsed, 250);
  assert.equal(game.levelManager.currentLevel, 1);
  tick(200);
  assert.equal(game.levelManager.currentLevel, 2);
  const config = require('../minigame/common/GameConfig').LEVEL_CONFIG;
  const fullTime = Math.min(config.BASE_TIME + config.TIME_INCREMENT, config.MAX_TIME);
  tick(250);
  assert.equal(game.playing, false);
  assert.equal(game.levelManager.timeRemaining, fullTime);
  tick(200);
  assert.equal(game.playing, true);
  assert.equal(game.levelManager.currentLevel, 2);
  assert.equal(game.elapsed, elapsed);
  assert.equal(game.levelManager.timeRemaining, fullTime);
  tick(100);
  assert.ok(game.levelManager.timeRemaining < fullTime);
});

test('模拟器一次走完整段云幕也只打开一次应得的元素工坊', t => {
  const { game } = setup(t);
  game.experienceSystem.addExperience(45);
  const opened = t.mock.method(game.upgradeComponent, 'showUpgradeScreen');
  game.levelManager.endLevel();
  game.advanceWaveClear(1000);
  assert.equal(opened.mock.callCount(), 1);
  assert.equal(game.waveClear, null);
  assert.ok(game.upgradeComponent.isVisible());
  assert.equal(game.levelManager.currentLevel, 1);
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

test('自动轮转已解锁且能命中的波，手点的最后一个元素优先接受同一切换冷却', t => {
  const { game } = setup(t);
  const feedback = require('../minigame/common/Feedback');
  t.mock.method(feedback, 'preferences', () => ({ autoWave: true }));
  const buttons = Object.fromEntries(game.waveButtons.map(button => [button.type, button]));
  for (const type of ['wind','fire','ice','electric']) game.upgradeSystem.unlockWave(type);
  const enemy = { x: game.player.x + 500, y: game.player.y, health: 50, radius: 10,
    resistances: [], immunities: ['wind','fire','ice','normal'] };
  game.enemyComponent.enemies.push(enemy);
  function advance(time) { game.elapsed = time; game.updateAutoWaves(); }
  advance(0);
  assert.equal(game.waveComponent.waves.length, 0);
  enemy.x = game.player.x + 200;
  advance(100);
  assert.equal(buttons.electric.lastUseTime, 100);
  enemy.immunities = [];
  for (const button of [buttons.fire, buttons.ice]) game.fireAt(button.x, button.y);
  assert.equal(game.queuedCast, buttons.ice);
  advance(200);
  assert.equal(buttons.normal.lastUseTime, 200);
  advance(949);
  assert.equal(buttons.ice.lastUseTime, -Infinity);
  advance(950);
  assert.equal(buttons.ice.lastUseTime, 950);
  assert.equal(game.queuedCast, null);
  game.fireAt(buttons.ice.x, buttons.ice.y);
  assert.equal(game.queuedCast, null);
  advance(1800);
  advance(2650);
  assert.deepEqual(new Set(game.waveComponent.waves.map(w => w.type)), new Set(Object.keys(buttons)));
});

test('零冷却满额时保护在途波，手点预约在空位出现后先于自动释放', t => {
  const { game } = setup(t);
  t.mock.method(require('../minigame/common/Feedback'), 'preferences', () => ({ autoWave: true }));
  const normal = game.waveButtons[2];
  game.upgradeSystem.waveUpgrades.normal.awakening.push('instantCast');
  game.fireAt(normal.x, normal.y);
  const first = game.waveComponent.waves[0];
  game.waveComponent.update(.5);
  game.elapsed = 500;
  game.fireAt(normal.x, normal.y);
  game.updateAutoWaves();
  assert.equal(game.queuedCast, normal);
  assert.equal(game.waveComponent.waves[0], first);
  assert.equal(normal.lastUseTime, 0);
  game.waveComponent.update(1);
  game.elapsed = 1500;
  game.updateAutoWaves();
  assert.equal(game.queuedCast, null);
  assert.equal(normal.lastUseTime, 1500);
  assert.equal(game.waveComponent.waves.length, 1);
  assert.notEqual(game.waveComponent.waves[0], first);
});

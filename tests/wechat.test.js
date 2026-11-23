const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const settings = require('../minigame/settings');
const Game = require('../minigame/common/GameComponent');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('结算后只有完整观看才能复活，同一局只能领取一次', async () => {
  const storage = new Map();
  let close, onError, shows = 0;
  const fakeAd = {
    onClose(fn) { close = fn; },
    onError(fn) { onError = fn; },
    async load() {},
    async show() { shows++; }
  };
  global.wx = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    getOpenDataContext: () => ({ postMessage() {} }),
    createInnerAudioContext: () => ({ onEnded() {}, onError() {}, play() {} }),
    createRewardedVideoAd: () => fakeAd
  };
  const canvas = { width: 375, height: 667, getContext: () => ({}) };
  const game = new Game(canvas, canvas.getContext(), { windowWidth: 375, windowHeight: 667 });
  game.score = 25;
  game.player.health = 0;
  await game.handlePlayerDeath();
  assert.equal(game.gameState, 'gameOver');
  assert.equal(storage.get('waveGameHighScore'), '25');
  const video = require('../minigame/common/RewardedVideo');
  assert.equal(video.available(), false);
  settings.rewardedVideoAdUnitId = 'test-fixture';
  try {
    const failed = game.tryReviveByAd();
    await flush();
    onError(new Error('无填充'));
    await failed;
    for (const result of [undefined, { isEnded: false }]) {
      const attempt = game.tryReviveByAd();
      await flush();
      close(result);
      await attempt;
      assert.equal(game.gameState, 'gameOver');
      assert.equal(game.reviveState.used, false);
    }
    const completed = game.tryReviveByAd();
    await game.tryReviveByAd();
    await flush();
    close({ isEnded: true });
    close({ isEnded: true });
    await completed;
    assert.equal(game.player.health, game.player.maxHealth);
    assert.equal(game.gameState, 'playing');
    assert.equal(game.score, 25);
    await game.handlePlayerDeath();
    await game.tryReviveByAd();
    assert.equal(game.gameState, 'gameOver');
    assert.equal(shows, 4);
  } finally {
    settings.rewardedVideoAdUnitId = '';
    delete global.wx;
  }
});

test('开放数据域保留最高分，并按数值绘制同玩好友成绩', async () => {
  let receive, stored = '70';
  const labels = [];
  const ctx = { clearRect() {}, fillRect() {}, fillText(text) { labels.push(text); } };
  const wx = {
    getSharedCanvas: () => ({ getContext: () => ctx }),
    onMessage: fn => { receive = fn; },
    getUserCloudStorage: o => o.success({ KVDataList: [{ key: 'circle_best_v1', value: stored }] }),
    setUserCloudStorage: o => { stored = o.KVDataList[0].value; o.success(); },
    getFriendCloudStorage: o => o.success({ data: [
      { nickname: '甲', KVDataList: [{ key: 'circle_best_v1', value: '9' }] },
      { nickname: '乙', KVDataList: [{ key: 'circle_best_v1', value: '100' }] }
    ] })
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../minigame/openDataContext/index'), 'utf8'), { wx, console, setTimeout, clearTimeout });
  receive({ type: 'record', best: 90 });
  receive({ type: 'show', best: 20, width: 375, height: 360 });
  await flush();
  assert.equal(stored, '90');
  assert.deepEqual(labels.slice(-4), ['1   乙', '100 分', '2   甲', '9 分']);
});

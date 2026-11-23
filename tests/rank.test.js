const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../cloudfunctions/leaderboard/runs');
const config = require('../minigame/common/GameConfig');
const ranks = require('../minigame/common/RankManager');
const settings = require('../minigame/settings');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('复活后的同一航程只占一个本机名次，保留历史最高分和最佳六局', () => {
  const store = new Map([['waveGameHighScore', '99']]);
  global.wx = {
    getStorageSync: key => store.get(key),
    setStorageSync: (key, value) => store.set(key, value)
  };
  try {
    const revived = { score: 10, levelManager: { currentLevel: 1 } };
    ranks.recordFlight(revived);
    for (let score = 2; score <= 14; score += 2) {
      ranks.recordFlight({ score, levelManager: { currentLevel: 1 } });
    }
    revived.score = 18;
    revived.levelManager.currentLevel = 2;
    ranks.recordFlight(revived);
    const list = store.get('cloudshell_flights_v1');
    assert.deepEqual(list.map(item => item.score), [18, 14, 12, 10, 8, 6]);
    assert.equal(list[0].level, 2);
    assert.equal(store.get('waveGameHighScore'), '99');
  } finally { delete global.wx; }
});

test('按签发的敌人及实际关卡分值重算，每个出生序号只计一次', () => {
  const run = rules.issueRun(2);
  for (const level of [1, 4, 6, 10]) {
    const groups = Array.from({ length: level }, () => []);
    groups[level - 1] = [0, 1, 2, 7];
    const expected = groups[level - 1].reduce((sum, index) =>
      sum + config.getEnemyConfigForLevel(rules.typeAt(run.decks, level, index), level).scoreValue, 0);
    assert.equal(rules.verifiedScore(run, 2400000, groups), expected);
  }
  assert.throws(() => rules.verifiedScore(run, 1000, [[0, 0]]));
  assert.throws(() => rules.verifiedScore(run, 1000, [[8]]));
  assert.throws(() => rules.verifiedScore(run, 5000, [[], [0]]));
});

test('旧设备和已签发数组按旧间隔验分，新版本与本地各关出怪边界一致', () => {
  const old = rules.issueRun();
  assert.equal(old.version, 1);
  assert.equal(rules.verifiedScore(old, 1100, [[2]]), 10);
  assert.equal(rules.verifiedScore(old.decks, 1100, [[2]]), 10);
  assert.throws(() => rules.issueRun(999));
  const run = rules.issueRun(2);
  const { BASE_TIME, MAX_TIME, TIME_INCREMENT } = config.LEVEL_CONFIG;
  let start = 0;
  for (let level = 1; level <= 30; level++) {
    const interval = config.getSpawnIntervalForLevel(level);
    const kills = Array.from({ length: level }, () => []);
    kills[level - 1].push(4);
    const boundary = start + interval * 3;
    assert.throws(() => rules.verifiedScore(run, boundary, kills), '第 ' + level + ' 关过早的击杀序号');
    assert.ok(rules.verifiedScore(run, boundary + 1, kills) > 0, '第 ' + level + ' 关合法的击杀序号');
    start += Math.min(MAX_TIME, BASE_TIME + (level - 1) * TIME_INCREMENT) * 1000;
  }
});

test('上报中断时依旧可以读榜，刷新后重试原对局', async () => {
  let failSave = true;
  const calls = [], store = new Map(), labels = [];
  global.wx = {
    getStorageSync: key => store.get(key), setStorageSync: (key, value) => store.set(key, value),
    getOpenDataContext: () => ({ postMessage() {} }),
    cloud: { init() {}, async callFunction({ data }) {
      calls.push(data);
      if (data.action === 'start') {
        assert.equal(data.version, 2);
        return { result: { id: 'run-test', ...rules.issueRun(data.version) } };
      }
      if (data.action === 'finish' && failSave) throw new Error('测试断网');
      return { result: data.action === 'list' ? { rows: [{ player: '8', score: 25, mine: false }] } : { status: 'saved' } };
    } }
  };
  settings.cloudEnvId = 'test';
  const ctx = new Proxy({fillText: value => labels.push(value)}, {
    get: (object, key) => object[key] || (() => {})
  });
  try {
    const run = ranks.startRun();
    const a = run.spawn(1);
    run.kill(a);
    await run.ready;
    run.kill(run.spawn(1));
    ranks.record(25, run);
    await flush();
    assert.deepEqual(calls.find(call => call.action === 'finish').kills, [[0, 1]]);
    ranks.open();
    ranks.handleTouch(320, 125, 375, 667);
    await flush();
    ranks.draw(ctx,375,667);
    assert.ok(labels.includes('玩家 8'));
    assert.equal(store.get('circle_rank_pending_v2').length, 1);
    failSave = false;
    ranks.handleTouch(280, 621, 375, 667);
    await flush();
    assert.equal(store.get('circle_rank_pending_v2').length, 0);
    ranks.handleTouch(48, 621, 375, 667);
    assert.equal(ranks.isOpen(), false);
  } finally {
    settings.cloudEnvId = '';
    delete global.wx;
  }
});

test('同一用户两台设备并发写分时，保留旧版及设备槽中的最高值并显示同步错误', async () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const code = fs.readFileSync(require.resolve('../minigame/openDataContext/index'), 'utf8');
  const saved = new Map([['circle_best_v1', '60']]), delayed = [];
  function device() {
    let receive, fail = false;
    const labels = [];
    const ctx = { clearRect() {}, fillRect() {}, fillText(t) { labels.push(t); } };
    const wx = {
      onMessage(fn) { receive = fn; }, getSharedCanvas: () => ({ getContext: () => ctx }),
      getUserCloudStorage(o) {
        if (fail) return o.fail();
        o.success({ KVDataList: o.keyList.filter(k => saved.has(k)).map(key => ({key, value: saved.get(key)})) });
      },
      setUserCloudStorage(o) { delayed.push(() => { for (const item of o.KVDataList) saved.set(item.key,item.value); o.success(); }); },
      getFriendCloudStorage(o) {
        o.success({ data: [{ nickname:'玩家', KVDataList: [...saved].map(([key,value]) => ({key, value})) }] });
      }
    };
    vm.runInNewContext(code, { wx, console, setTimeout, clearTimeout });
    return { receive, labels, reject: () => { fail = true; } };
  }
  const left = device(), right = device();
  left.receive({ type:'record', best:120, slot:48 });
  right.receive({ type:'record', best:80, slot:0 }); // 主槽相同，另一个槽不同
  await flush();
  delayed.splice(0).forEach(fn => fn());
  await flush();
  right.reject();
  right.receive({ type:'show', best:80, slot:0, width:300, height:360 });
  await flush();
  assert.ok(right.labels.includes('120 分'));
  assert.ok(right.labels.includes('我的成绩待同步，可刷新重试'));
});

const canvas = wx.getSharedCanvas();
const ctx = canvas.getContext('2d');
const legacy = 'circle_best_v1';
const slots = Array.from({ length: 96 }, (_, i) => 'c2_' + i);
const keys = [legacy, ...slots];
let writes = Promise.resolve();
let generation = 0;
let dpr = 1;

function maxScore(list) {
  let best = null;
  for (const item of list || []) {
    if (!keys.includes(item.key) || !/^\d+$/.test(item.value)) continue;
    const n = Number(item.value);
    if (Number.isSafeInteger(n) && (best === null || n > best)) best = n;
  }
  return best;
}

// Each installation keeps its best in two independent slots. Friends see the maximum,
// including the original score key used by previous versions.
function saveBest(best, slot) {
  const pair = Number.isInteger(slot) && slot >= 0 && slot < 48 * 48
    ? [slots[slot % 48], slots[48 + Math.floor(slot / 48)]] : [legacy];
  let expired = false, timer;
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => { expired = true; reject(new Error('好友成绩同步超时')); }, 6000);
    wx.getUserCloudStorage({
      keyList: pair, fail: reject,
      success: ({ KVDataList }) => {
        if (expired) return;
        const updates = pair.filter(key => {
          const value = maxScore(KVDataList.filter(item => item.key === key));
          return value === null || value < best;
        }).map(key => ({ key, value: String(best) }));
        if (!updates.length) return resolve(false);
        wx.setUserCloudStorage({ KVDataList: updates, success: () => resolve(true), fail: reject });
      }
    });
  }).finally(() => clearTimeout(timer));
}

function paint(message, rows, syncFailed) {
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#18383c';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e0e0c9';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  if (message) ctx.fillText(message, w / 2, h * 0.46, w * 0.94);
  const inset = syncFailed ? 27 : 0;
  if (syncFailed) {
    ctx.fillStyle = '#f7c986';
    ctx.fillText('我的成绩待同步，可刷新重试', w / 2, 18, w * 0.94);
  }
  const rowH = Math.min((h - inset) / 10, 46);
  ctx.font = Math.min(16, Math.max(10, rowH * 0.52)) + 'px sans-serif';
  rows.slice(0, 10).forEach((row, i) => {
    const y = inset + i * rowH;
    ctx.fillStyle = i % 2 ? '#213e40' : '#284749';
    ctx.fillRect(0, y, w, rowH - 1);
    ctx.fillStyle = i === 0 ? '#f3cc84' : '#efe7ce';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1) + '   ' + row.name, 10, y + rowH * 0.68, w * 0.60);
    ctx.textAlign = 'right';
    ctx.fillText(row.score + ' 分', w - 10, y + rowH * 0.68, w * 0.32);
  });
}

wx.onMessage(event => {
  if (event.type !== 'record' && event.type !== 'show') return;
  let sync = Promise.resolve(false);
  if (Number.isSafeInteger(event.best) && event.best > 0) {
    sync = writes.then(() => saveBest(event.best, event.slot)).catch(() => null);
    writes = sync;
  }
  if (event.type !== 'show') return;
  dpr = Math.max(1, Math.min(3, Number(event.dpr) || 1));
  canvas.width = Math.round(event.width * dpr);
  canvas.height = Math.round(event.height * dpr);
  if (dpr !== 1) ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const id = ++generation;
  let request = 0, finished = false, syncFailed = false, rows = [], message = '';
  function render() { if (finished && id === generation) paint(message, rows, syncFailed); }
  function list() {
    const read = ++request;
    wx.getFriendCloudStorage({
      keyList: keys,
      success: ({ data }) => {
        if (id !== generation || read !== request) return;
        rows = data.map(user => ({ name: user.nickname || '微信玩家', score: maxScore(user.KVDataList) }))
          .filter(row => row.score !== null).sort((a, b) => b.score - a.score);
        message = rows.length ? '' : '暂无同玩好友成绩';
        finished = true;
        render();
      },
      fail: () => { if (read !== request) return; finished = true; message = '好友成绩暂不可用，请刷新重试'; render(); }
    });
  }
  list();
  sync.then(changed => {
    if (id !== generation) return;
    syncFailed = changed === null;
    if (changed) list();
    else render();
  });
});

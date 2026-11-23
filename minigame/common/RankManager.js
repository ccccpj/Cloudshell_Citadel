const settings = require('../settings');
const utils = require('./Utils');
const { background, colors, graphic, nine, button, buttonLabel, label } = require('./GameUI');
let panel = null;
let cloudReady = false;
let uploading = false;
let deviceSlot;
const queueKey = 'circle_rank_pending_v2';
const runVersion = 2;
const day = 86400000;
let pending;
let latestRun;
const localFlightsKey = 'cloudshell_flights_v1';
const localIds = new WeakMap();

function savedFlights() {
  const list = utils.getStorage(localFlightsKey);
  if (!Array.isArray(list)) return [];
  return list.filter(entry => entry && typeof entry.id === 'string' &&
    Number.isSafeInteger(entry.level) && entry.level > 0 &&
    Number.isSafeInteger(entry.score) && entry.score >= 0);
}

function recordFlight(run) {
  let id = localIds.get(run);
  if (!id) {
    id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    localIds.set(run, id);
  }
  const row = { id, level: run.levelManager.currentLevel, score: run.score };
  const flights = [row, ...savedFlights().filter(entry => entry.id !== id)];
  flights.sort((a, b) => b.score - a.score || b.level - a.level);
  utils.setStorage(localFlightsKey, flights.slice(0, 6));
}

function cloud(action, payload = {}) {
  if (!cloudReady) {
    wx.cloud.init({ env: settings.cloudEnvId });
    cloudReady = true;
  }
  return wx.cloud.callFunction({
    name: 'leaderboard', data: { action, ...payload }, config: { env: settings.cloudEnvId }
  }).then(reply => reply.result);
}

function queue() {
  if (!pending) {
    const stored = utils.getStorage(queueKey);
    pending = Array.isArray(stored) ? stored.filter(item => item && typeof item.id === 'string' &&
      Array.isArray(item.kills) && item.deadline > Date.now()) : [];
  }
  return pending;
}

// A failed upload never prevents a separate list request. Replacing a snapshot while it is in
// flight retains the newer one, including subsequent kills after a successful ad revive.
async function upload() {
  if (uploading || !settings.cloudEnvId || !wx.cloud) return;
  uploading = true;
  const failed = new Set();
  let changed = false;
  try {
    let item;
    while ((item = queue().find(entry => !failed.has(entry.id)))) {
      try {
        if (item.deadline > Date.now()) {
          const result = await cloud('finish', { id: item.id, kills: item.kills });
          if (result.status === 'saved') changed = true;
        }
        pending = pending.filter(entry => entry !== item);
        utils.setStorage(queueKey, pending);
      } catch (error) {
        failed.add(item.id);
        console.warn('总榜成绩等待同步', error);
      }
    }
  } finally {
    uploading = false;
    if (changed && panel && panel.tab === 2) readTotal(panel);
  }
}

function startRun() {
  if (!settings.cloudEnvId || !wx.cloud) return null;
  const run = {
    id: '', decks: null, eligible: true, level: 0, nextIndex: 0, kills: [], count: 0, queued: 0,
    deadline: Date.now() + day,
    spawn(level) {
      if (!this.eligible) return null;
      if (level !== this.level) { this.level = level; this.nextIndex = 0; }
      const index = this.nextIndex++;
      let type;
      if (level === 1 && index < 3) type = ['basic', 'fast', 'basic'][index];
      else if (this.decks) {
        const { cards } = this.decks.find(deck => level >= deck.min);
        type = cards[(index + level * 31) % cards.length];
      } else {
        this.eligible = false;
        return null;
      }
      return { index, type, level };
    },
    kill(ticket) {
      if (!this.eligible) return;
      while (this.kills.length < ticket.level) this.kills.push([]);
      this.kills[ticket.level - 1].push(ticket.index);
      this.count++;
    }
  };
  const requested = Date.now();
  run.ready = Promise.resolve().then(() => cloud('start', { version: runVersion })).then(({ id, version, decks }) => {
    if (version !== runVersion || Date.now() - requested > 3000 || !id || !Array.isArray(decks) || !decks.length) {
      run.eligible = false;
      return;
    }
    run.id = id;
    run.decks = decks;
  }).catch(() => { run.eligible = false; });
  latestRun = run;
  return run;
}

function friendSlot() {
  if (deviceSlot === undefined) {
    const saved = utils.getStorage('circle_friend_device_slot');
    if (Number.isInteger(saved) && saved >= 0 && saved < 48 * 48) deviceSlot = saved;
    else {
      deviceSlot = Math.floor(Math.random() * 48 * 48);
      utils.setStorage('circle_friend_device_slot', deviceSlot);
    }
  }
  return deviceSlot;
}

function record(best, run) {
  if (best > 0) {
    try {
      wx.getOpenDataContext().postMessage({ type: 'record', best, slot: friendSlot() });
    } catch (error) { console.warn('好友成绩暂未同步', error); }
  }
  if (!run || !run.eligible || !run.count) return;
  function persist() {
    if (!run.id || !run.eligible || run.count === run.queued) return;
    run.queued = run.count;
    const snapshot = {
      id: run.id, deadline: run.deadline,
      kills: run.kills.map(group => group.slice().sort((a, b) => a - b))
    };
    pending = queue().filter(item => item.id !== run.id && item.deadline > Date.now());
    pending.push(snapshot);
    utils.setStorage(queueKey, pending);
    upload();
  }
  if (run.id) persist();
  else run.ready.then(persist);
}

const tabs = ['本机', '好友', '总榜'];
function open() { select(0); }

function select(tab) {
  const view = { tab, best: Number(utils.getStorage('waveGameHighScore')) || 0, since: Date.now() };
  panel = view;
  if (tab === 0) { view.flights = savedFlights(); return; }
  if (tab === 1) {
    view.message = '正在读取好友成绩…';
    wx.authorize({
      scope: 'scope.WxFriendInteraction',
      success: () => {
        if (panel !== view) return;
        try {
          const context = wx.getOpenDataContext();
          view.context = context;
        } catch (error) { view.error = '好友榜暂不可用'; }
      },
      fail: () => { view.denied = true; view.error = '请在小游戏设置中允许好友互动'; }
    });
    return;
  }
  if (!settings.cloudEnvId || !wx.cloud) { view.message = '总榜尚未开放'; return; }
  view.message = '正在读取总榜…';
  upload();
  readTotal(view);
}

function readTotal(view) {
  const request = (view.request || 0) + 1;
  view.request = request;
  Promise.resolve().then(() => cloud('list')).then(result => {
    if (view.request !== request) return;
    if (!result || !Array.isArray(result.rows)) throw new Error('榜单数据无效');
    view.rows = result.rows;
    view.error = null;
    view.message = '暂无上榜成绩';
  }).catch(() => { if (view.request === request) view.error = '总榜读取失败，请重试'; });
}

function layout(w, h, info = {}) {
  const x = Math.max(16, (w - 420) / 2), width = w - x * 2;
  const top = Math.max((info.safeTop || 0) + 40, 62, Math.min(h * 0.13, 104));
  const tabY = top + 21;
  const bodyY = tabY + 60;
  const bottom = h - Math.max(63, h * 0.095, (info.safeBottom || 0) + 54);
  return { x, width, top, tabY, bodyY, bodyH: Math.max(28, bottom - bodyY - 18), bottom };
}

function draw(ctx, w, h, info = {}) {
  if (!panel) return;
  const view = panel;
  const { x, width, top, tabY, bodyY, bodyH, bottom } = layout(w, h, info);
  ctx.save();
  ctx.shadowBlur = 0;
  background(ctx, { w, h });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  graphic(ctx, 'action.rank', x, top - 27, 34);
  label(ctx, '航行排行榜', x + 43, top - 9, 26, colors.text, 'left', true);
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < tabs.length; i++) {
    const selected = i === view.tab, left = x + i * width / 3;
    const tab = { x: left, y: tabY, width: width / 3 - 2, height: 46 };
    if (!nine(ctx, selected ? 'component.tab-active' : 'component.tab-idle', tab)) {
      ctx.fillStyle = selected ? '#8b6036' : '#29474b';
      ctx.fillRect(left, tabY, tab.width, 46);
    }
    graphic(ctx, ['action.localRank', 'action.friendRank', 'action.worldRank'][i],
      left + tab.width / 2 - 34, tabY + 10, 24);
    buttonLabel(ctx, tab, tabs[i], { size: 15, bold: selected, offsetX: 11 });
  }
  if (view.tab === 0) {
    const podium = { x, y: bodyY, width, height: Math.min(85, bodyH) };
    if (!nine(ctx, 'component.rank-podium', podium)) {
      ctx.fillStyle = '#534433'; ctx.fillRect(x, bodyY, width, podium.height);
    }
    graphic(ctx, 'action.personalBest', x + 14, bodyY + (podium.height - 40) / 2, 40);
    label(ctx, '本机最高分', x + 63, bodyY + podium.height / 2, 16, colors.text);
    label(ctx, String(view.best), x + width - 16, bodyY + podium.height / 2, 30,
      colors.gold, 'right', true, width - 165);
    const syncNotice = bodyH > 192 && settings.cloudEnvId && (queue().length || (latestRun && !latestRun.eligible));
    const listY = bodyY + podium.height + 8;
    const rowH = Math.min(49, (bodyH - podium.height - 8 - (syncNotice ? 24 : 0)) / 6);
    if (view.flights.length && rowH > 14) {
      view.flights.slice(0, 6).forEach((entry, i) => {
        const y = listY + i * rowH + rowH / 2;
        label(ctx, String(i + 1), x + 12, y, 16, colors.gold, 'left', true);
        label(ctx, '第 ' + entry.level + ' 关', x + 47, y, 14, colors.text);
        label(ctx, entry.score + ' 分', x + width - 12, y, 15, colors.text, 'right', true);
        ctx.fillStyle = '#54655c'; ctx.fillRect(x + 8, y + rowH / 2 - 1, width - 16, 1);
      });
    } else if (!view.flights.length && bodyH > 175) {
      graphic(ctx, 'action.emptyRank', w / 2 - 21, listY + 13, 42);
      label(ctx, '尚无航程记录', w / 2, listY + 75, 15, colors.muted, 'center');
    }
    if (syncNotice) {
      const message = queue().length ? '总榜成绩待同步，可在总榜刷新' : '本局未连接总榜，保留本机与好友成绩';
      label(ctx, message, w / 2, bodyY + bodyH - 10, 13, colors.muted, 'center', false, width - 12);
    }
  } else if (view.rows && view.rows.length) {
    const rowH = Math.min(bodyH / 10, 46);
    ctx.font = Math.min(16, Math.max(10, rowH * 0.52)) + 'px sans-serif';
    view.rows.slice(0, 10).forEach((row, i) => {
      const y = bodyY + i * rowH;
      ctx.fillStyle = row.mine ? '#416359' : i % 2 ? '#213e40' : '#284749';
      ctx.fillRect(x, y, width, rowH - 1);
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#f7c986' : '#c8d9da';
      ctx.fillText(String(i + 1), x + 10, y + rowH * 0.5);
      ctx.fillText(row.mine ? '我' : '玩家 ' + row.player, x + 38, y + rowH * 0.5, width * 0.47);
      ctx.textAlign = 'right';
      ctx.fillText(row.score + ' 分', x + width - 10, y + rowH * 0.5, width * 0.32);
    });
  } else {
    const timedOut = Date.now() - view.since > 8000 && (view.tab === 1 || view.message === '正在读取总榜…');
    const message = view.error || (timedOut ? '读取超时，可刷新重试' : view.message);
    if (bodyH > 145) graphic(ctx, 'action.emptyRank', w / 2 - 25, bodyY + bodyH * .46 - 68, 50);
    label(ctx, message, w / 2, bodyY + bodyH * .46, 15, colors.muted, 'center', false, width);
    if (view.context && !view.error) {
      try {
        const c = view.context.canvas;
        const logicalW = Math.round(width), logicalH = Math.round(bodyH);
        const dpr = Math.max(1, Math.min(3, Number(info.pixelRatio) || 1));
        if (view.canvasW !== logicalW || view.canvasH !== logicalH || view.dpr !== dpr) {
          view.canvasW = logicalW; view.canvasH = logicalH; view.dpr = dpr;
          c.width = Math.round(logicalW * dpr); c.height = Math.round(logicalH * dpr);
          view.context.postMessage({ type: 'show', best: view.best, slot: friendSlot(), width: logicalW, height: logicalH, dpr });
        }
        ctx.drawImage(c, x, bodyY, width, bodyH);
      } catch (error) { view.error = '好友榜暂不可用，请用微信真机重试'; }
    }
  }
  const two = view.tab === 1 || (view.tab === 2 && settings.cloudEnvId && wx.cloud);
  const buttonW = two ? (width - 8) / 2 : width;
  button(ctx, { x, y: bottom, width: buttonW, height: 46 }, '返回');
  if (two) button(ctx, { x: x + buttonW + 8, y: bottom, width: buttonW, height: 46 }, view.denied ? '去设置' : '刷新');
  ctx.restore();
  // 好友共享画布及已启用的云同步可能在本次绘制后更新。
  return view.tab === 1 || Boolean(settings.cloudEnvId && wx.cloud);
}

function handleTouch(x, y, w, h, info) {
  if (!panel) return false;
  const b = layout(w, h, info);
  if (x < b.x || x > b.x + b.width) return true;
  if (y >= b.tabY && y <= b.tabY + 46) {
    const tab = Math.min(2, Math.floor((x - b.x) / (b.width / 3)));
    if (tab !== panel.tab) select(tab);
  } else if (y >= b.bottom && y <= b.bottom + 46) {
    const two = panel.tab === 1 || (panel.tab === 2 && settings.cloudEnvId && wx.cloud);
    if (!two || x <= b.x + (b.width - 8) / 2) panel = null;
    else if (x >= b.x + (b.width + 8) / 2) {
      if (panel.denied) {
        const previous = panel;
        wx.openSetting({ success: () => { if (panel === previous) select(1); } });
      } else select(panel.tab);
    }
  }
  return true;
}

module.exports = { open, record, recordFlight, startRun, draw, handleTouch, isOpen: () => Boolean(panel) };

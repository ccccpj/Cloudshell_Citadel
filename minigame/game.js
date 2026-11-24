const GameStateManager = require('./common/GameStateManager');
const feedback = require('./common/Feedback');
const ranks = require('./common/RankManager');
const art = require('./common/Art');

const screen = wx.createCanvas();
const ctx = screen.getContext('2d');
const info = {};
// 组件使用逻辑像素布局。仅上屏画布持有物理像素尺寸。
const viewport = { width: 0, height: 0, getContext: () => ctx };
function sizeScreen() {
  const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  const capsule = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
  Object.assign(info, windowInfo);
  const area = info.safeArea || {};
  info.safeTop = Math.max(area.top || 0, capsule && capsule.bottom || 0) + 8;
  info.safeBottom = Math.max(0, info.windowHeight - (area.bottom || info.windowHeight));
  viewport.width = info.windowWidth;
  viewport.height = info.windowHeight;
  const ratio = Math.min(3, Math.max(1, info.pixelRatio || 1));
  screen.width = Math.round(viewport.width * ratio);
  screen.height = Math.round(viewport.height * ratio);
  ctx.scale(screen.width / viewport.width, screen.height / viewport.height);
}
sizeScreen();
const game = new GameStateManager(viewport, ctx, info);
feedback.setActive(true);

let frame = null;
let refreshTimer = null;
let hidden = false;
let gesture = null;
let rewardSurface = null;
let acceptPressAt = 0;
const RELEASE_GAP_MS = 300;

// An incoming reward screen or a fresh hand must first see a break in repeated presses.
function syncRewardSurface() {
  const run = game.gameComponent;
  let surface = null;
  if (run) {
    if (run.waveClear) surface = run.waveClear;
    else if (run.enhancementComponent.isVisible()) surface = run.enhancementComponent.state.availableCards;
    else if (run.upgradeComponent.isVisible()) {
      const workshop = run.upgradeComponent;
      surface = workshop.detail || workshop.state.currentView;
    }
  }
  if (surface !== rewardSurface) {
    rewardSurface = surface;
    gesture = null;
    acceptPressAt = Date.now() + RELEASE_GAP_MS;
  }
}

function invalidate() {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!hidden && frame === null) frame = requestAnimationFrame(draw);
}
function screenState() {
  if (ranks.isOpen()) return 'ranks';
  const run = game.gameComponent;
  if (game.showingMenu) return game.menuComponent.page;
  if (run.waveClear) return 'waveClear';
  if (run.gameState === 'gameOver') return 'result';
  if (run.enhancementComponent.isVisible()) return 'enhance';
  if (run.upgradeComponent.isVisible()) return 'upgrade';
  return run.levelManager.isPaused ? 'pause' : 'battle';
}
wx.onTouchStart(event => {
  const touch = event.changedTouches[0];
  if (!touch) return;
  syncRewardSurface();
  const state = screenState();
  const now = Date.now();
  if (state === 'waveClear' || now < acceptPressAt) {
    acceptPressAt = now + RELEASE_GAP_MS;
    return;
  }
  if (state === 'battle' && game.gameComponent.fireAt(touch.clientX, touch.clientY)) return;
  if (gesture) return;
  gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, lastY: touch.clientY,
    state, dragged: false };
});
wx.onTouchMove(event => {
  if (!gesture) return;
  const touch = Array.from(event.changedTouches).find(t => t.identifier === gesture.id);
  if (!touch) return;
  if (Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) > 6) gesture.dragged = true;
  if (gesture.dragged && gesture.state === 'upgrade' && screenState() === 'upgrade') {
    game.gameComponent.upgradeComponent.scrollBy(gesture.lastY - touch.clientY);
    invalidate();
  }
  gesture.lastY = touch.clientY;
});
wx.onTouchEnd(event => {
  if (!gesture) return;
  const touch = Array.from(event.changedTouches).find(t => t.identifier === gesture.id);
  if (!touch) return;
  const tap = gesture;
  gesture = null;
  if (tap.dragged || Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 8 || tap.state !== screenState()) return;
  const x = touch.clientX, y = touch.clientY;
  if (tap.state === 'ranks') ranks.handleTouch(x, y, viewport.width, viewport.height, info);
  else game.handleTouch(x, y);
  invalidate();
});
wx.onTouchCancel(() => { gesture = null; });

function draw() {
  frame = null;
  if (hidden) return;
  if (ranks.isOpen()) {
    if (ranks.draw(ctx, viewport.width, viewport.height, info)) {
      refreshTimer = setTimeout(invalidate, 150);
    }
  } else if (game.gameComponent) {
    const run = game.gameComponent;
    run.update();
    syncRewardSurface();
    game.draw();
    if (run.playing || run.waveClear || run.isDefeatAnimating()) invalidate();
    else if (run.gameState === 'gameOver' && (run.reviveState.isShowingAd || run.gameOverMessage.until > Date.now())) {
      refreshTimer = setTimeout(invalidate, 150);
    }
  } else {
    game.draw();
  }
}
if (wx.onWindowResize) wx.onWindowResize(() => {
  gesture = null;
  sizeScreen();
  if (game.gameComponent) game.gameComponent.resize();
  invalidate();
});
wx.onHide(() => {
  hidden = true;
  gesture = null;
  if (frame !== null) cancelAnimationFrame(frame);
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = null;
  frame = null;
  if (game.gameComponent) game.gameComponent.checkpoint();
  feedback.setActive(false);
});
wx.onShow(() => {
  if (!hidden) return;
  hidden = false;
  if (game.gameComponent) game.gameComponent.resetFrameClock();
  feedback.setActive(true);
  invalidate();
});
art.onReady(invalidate);
draw();

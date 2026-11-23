const GameStateManager = require('./common/GameStateManager');
const GameConfig = require('./common/GameConfig');
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
const audio = GameConfig.AUDIO_CONFIG;
let music;
if (audio.MUSIC_ENABLED) {
  music = wx.createInnerAudioContext();
  music.src = audio.AUDIO_PATHS.BACKGROUND_MUSIC;
  music.loop = true;
  music.volume = audio.MUSIC_VOLUME * audio.MASTER_VOLUME;
  music.play();
}

let frame = null;
let refreshTimer = null;
let hidden = false;
let gesture = null;

function invalidate() {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!hidden && frame === null) frame = requestAnimationFrame(draw);
}
function screenState() {
  if (ranks.isOpen()) return 'ranks';
  const run = game.gameComponent;
  if (!run) return game.menuComponent.page;
  if (run.gameState === 'gameOver') return 'result';
  if (run.enhancementComponent.isVisible()) return 'enhance';
  if (run.upgradeComponent.isVisible()) return 'upgrade';
  return run.levelManager.isPaused ? 'pause' : 'battle';
}
wx.onTouchStart(event => {
  const touch = event.changedTouches[0];
  if (!touch) return;
  const state = screenState();
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
    game.draw();
    if (run.playing || run.isDefeatAnimating()) invalidate();
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
  if (music) music.pause();
});
wx.onShow(() => {
  if (!hidden) return;
  hidden = false;
  if (game.gameComponent) game.gameComponent.resetFrameClock();
  if (music) music.play();
  invalidate();
});
art.onReady(invalidate);
draw();

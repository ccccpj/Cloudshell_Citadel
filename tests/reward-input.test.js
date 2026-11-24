const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('触摸入口丢弃跨屏长按和连点，停手后一次点击只选择当前奖励', () => {
  let now = 1000, nextFrame;
  let phase = 'battle', actions = 0;
  const callbacks = {};
  const run = {
    get playing() { return phase === 'battle'; },
    enhancementComponent: { state: { availableCards: [] }, isVisible: () => phase === 'reward' },
    upgradeComponent: { state: { currentView: 'elements' }, isVisible: () => phase === 'workshop' },
    levelManager: {}, fireAt: () => false, update() {}, isDefeatAnimating: () => false
  };
  class Game {
    constructor() { this.gameComponent = run; }
    draw() {}
    handleTouch() {
      actions++;
      if (phase === 'reward') phase = 'workshop';
      else if (phase === 'workshop') phase = 'battle';
    }
  }
  const wx = {
    getWindowInfo: () => ({windowWidth:375, windowHeight:667}),
    createCanvas: () => ({getContext: () => ({scale(){}})})
  };
  for (const e of ['TouchStart','TouchMove','TouchEnd','TouchCancel','Hide','Show']) {
    wx['on' + e] = fn => { callbacks[e] = fn; };
  }
  const modules = {
    GameStateManager: Game, Feedback: {setActive(){}}, RankManager: {isOpen:()=>false}, Art: {onReady(){}}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../minigame/game'), 'utf8'), {
    wx, require: key => modules[key.split('/').pop()], Date: {now:()=>now},
    requestAnimationFrame: fn => { nextFrame = fn; return 1; }, clearTimeout, setTimeout
  });
  const touch = {changedTouches:[{identifier:1, clientX:180, clientY:600}]};
  function tap() { callbacks.TouchStart(touch); callbacks.TouchEnd(touch); }

  callbacks.TouchStart(touch); // A finger went down in battle.
  run.waveClear = { level: 1 };
  phase = 'clear';
  nextFrame();
  callbacks.TouchEnd(touch);
  tap();
  assert.equal(actions, 0);

  now += 900;
  run.waveClear = null;
  phase = 'reward';
  nextFrame();
  for (let i = 0; i < 6; i++) { now += 120; tap(); }
  assert.equal(actions, 0); // Rapid taps straddling the banner cannot collect a card.
  now += 310;
  tap();
  assert.equal(phase, 'workshop');
  now += 60;
  tap();
  assert.equal(actions, 1);
  now += 310;
  tap();
  assert.equal(phase, 'battle');
  now += 50;
  tap();
  assert.equal(actions, 2);
});

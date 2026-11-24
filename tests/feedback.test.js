const test = require('node:test');
const assert = require('node:assert/strict');
const feedback = require('../minigame/common/Feedback');

test('音效和震动独立生效，音乐只在前台且已开启时播放', () => {
  let plays = 0, pauses = 0, pulses = 0;
  global.wx = {
    getStorageSync: () => ({ sound: false, music: false, vibration: true }),
    setStorageSync() {},
    createInnerAudioContext: () => ({
      onEnded() {}, onError() {}, play() { plays++; }, pause() { pauses++; }
    }),
    vibrateShort() { pulses++; }
  };
  feedback.setActive(true);
  feedback.playSound('wave', 1);
  feedback.vibrate('light');
  assert.deepEqual([plays, pulses], [0, 1]);
  feedback.toggle('vibration');
  feedback.toggle('sound');
  feedback.playSound('wave', 1);
  feedback.vibrate('light');
  assert.deepEqual([plays, pulses], [1, 1]);
  feedback.toggle('music');
  feedback.setActive(false);
  assert.deepEqual([plays, pauses], [2, 1]);
  feedback.toggle('music');
  feedback.setActive(true);
  assert.equal(plays, 2);
});

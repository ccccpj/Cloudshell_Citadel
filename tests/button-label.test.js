const test = require('node:test');
const assert = require('node:assert/strict');
const { buttonLabel } = require('../minigame/common/GameUI');

test('按钮按实际墨迹对齐，微信只提供字宽时仍有可用基线', () => {
  const box = { x: 10, y: 20, width: 160, height: 48 };
  let baseline;
  let metrics;
  const ctx = {
    measureText: () => metrics,
    fillText(text, x, y) { baseline = y; }
  };
  for (const [ascent, descent] of [[13, 2], [9, 4]]) {
    metrics = { width: 64, actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent };
    buttonLabel(ctx, box, '重新开始');
    assert.equal(ctx.textBaseline, 'alphabetic');
    assert.equal((baseline - ascent + baseline + descent) / 2, 43);
  }
  metrics = { width: 64 };
  buttonLabel(ctx, box, '重新开始');
  assert.equal(baseline, 43 + 16 * 0.35);
});

const Art = require('./Art');

function drawEffect(ctx, id, age, x, y, size, height = size, angle = 0, opacity = 1) {
  const clip = Art.fxById[id];
  if (!clip || age < 0 || (!clip.loop && age * clip.fps >= 1000 * clip.frames)) return false;
  const image = Art.image(clip.file);
  if (!image) return false;
  Art.player.drawClip(ctx, image, clip, age, x, y, size, height, angle, opacity);
  return true;
}

function duration(clip) {
  return clip.frames * 1000 / clip.fps;
}

module.exports = { drawEffect, duration };

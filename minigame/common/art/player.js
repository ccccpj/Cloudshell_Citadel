(function (root) {
  'use strict';

  // Coordinates are logical Canvas units. A positive angle is clockwise in radians.
  function frameIndex(elapsedMs, fps, count, loop) {
    const tick = Math.max(0, Math.floor(elapsedMs * fps / 1000));
    return loop ? tick % count : Math.min(tick, count - 1);
  }

  function blit(ctx, image, sx, sy, fw, fh, x, y, w, h, angle, opacity, pivotX, pivotY) {
    if (!image || w <= 0 || h <= 0 || opacity <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.globalAlpha *= Math.min(1, opacity);
    ctx.drawImage(image, sx, sy, fw, fh, -pivotX * w, -pivotY * h, w, h);
    ctx.restore();
  }

  // Actors use an action per row. Non-looping actions hold their last frame.
  function drawFrame(ctx, image, sheet, action, elapsedMs, x, y, w, h = w, angle = 0, opacity = 1) {
    const clip = sheet.animations[action];
    if (!clip) return;
    const i = frameIndex(elapsedMs, clip.fps, clip.frames, clip.loop);
    const pivot = sheet.anchor || [0.5, 0.5];
    blit(ctx, image, i * sheet.frameWidth, clip.row * sheet.frameHeight,
      sheet.frameWidth, sheet.frameHeight, x, y, w, h, angle, opacity, pivot[0], pivot[1]);
  }

  // Individual VFX clips wrap rows after 'columns'; pivot is normalized to the frame.
  function drawClip(ctx, image, clip, elapsedMs, x, y, w, h = w, angle = 0, opacity = 1) {
    const i = frameIndex(elapsedMs, clip.fps, clip.frames, clip.loop);
    const pivot = clip.pivot || [0.5, 0.5];
    const px = Array.isArray(pivot) ? pivot[0] : pivot.x;
    const py = Array.isArray(pivot) ? pivot[1] : pivot.y;
    blit(ctx, image, (i % clip.columns) * clip.frameWidth, Math.floor(i / clip.columns) * clip.frameHeight,
      clip.frameWidth, clip.frameHeight, x, y, w, h, angle, opacity, px, py);
  }

  const bits = {wind: 1, fire: 2, ice: 4, electric: 8};
  const waveEdge = {normal: '#d4f6e5', wind: '#a9eed9', fire: '#ffb47d', ice: '#c4e9ff', electric: '#ffe5a0'};

  // Draw the collision band at its actual radius. The small launch sprite blends
  // into constant-size marks before it would have to scale beyond its source.
  function drawWave(ctx, image, clip, elapsedMs, x, y, radius, width, opacity = 1) {
    if (radius <= 0 || width <= 0 || opacity <= 0) return;
    const element = clip.element, turn = Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= Math.sqrt(Math.min(1, opacity));
    const visibleAlpha = ctx.globalAlpha;
    ctx.strokeStyle = waveEdge[element];
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, turn);
    ctx.lineWidth = width;
    ctx.stroke();

    const detail = Math.min(1, Math.max(0, (radius / clip.sourceRadius - .55) / .45));
    if (image && detail < 1) {
      ctx.save();
      if (element === 'normal') {
        ctx.beginPath();
        ctx.arc(0, 0, radius + width / 2, 0, turn);
        const inner = Math.max(0, radius - width / 2);
        ctx.moveTo(inner, 0);
        ctx.arc(0, 0, inner, 0, turn, true);
        ctx.clip();
      }
      const size = radius * clip.frameWidth / clip.sourceRadius;
      drawClip(ctx, image, clip, elapsedMs, 0, 0, size, size, 0, 1 - detail);
      ctx.restore();
    }
    if (detail > 0) {
      const rim = radius + width / 2;
      ctx.globalAlpha = visibleAlpha * detail;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = element === 'normal' ? '#ffffff' : waveEdge[element];
      ctx.beginPath();
      if (element === 'normal') {
        ctx.arc(0, 0, rim, 0, turn);
      } else {
        const count = Math.min(32, Math.max(8, Math.round(radius / 8)));
        const phase = elapsedMs * .0003;
        for (let i = 0; i < count; i++) {
          const angle = i * turn / count + phase;
          ctx.save();
          ctx.rotate(angle);
          if (element === 'wind') {
            ctx.moveTo(rim + 3, 0);
            ctx.arc(0, 0, rim + 3, 0, 12 / rim);
          } else if (element === 'electric') {
            ctx.moveTo(rim, -6); ctx.lineTo(rim + 3, -1);
            ctx.lineTo(rim - 1, 1); ctx.lineTo(rim + 2, 6);
          } else {
            // Ice crystals point outwards. Flame tips lean along the moving front.
            ctx.moveTo(rim, -3);
            ctx.lineTo(rim + (element === 'fire' ? 6 : 4), element === 'fire' ? 3 : 0);
            ctx.lineTo(rim, 3);
          }
          ctx.restore();
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function formMask(unlockedWaves) {
    let mask = 0;
    for (const type of Object.keys(bits)) {
      if (unlockedWaves[type]) mask |= bits[type];
    }
    return mask;
  }

  // One far seamless tile and three independent foreground drifts. All scrolling is visual.
  function drawSky(ctx, far, cloud, timeMs, width, height) {
    const unit = width / 375;
    const seconds = Math.max(0, timeMs) / 1000;
    const tileH = width * far.height / far.width;
    const offset = (seconds * 13 * unit) % tileH;
    // A tiny overlap suppresses fine raster seams at fractional device transforms.
    for (let y = offset - tileH; y < height; y += tileH) {
      ctx.drawImage(far, 0, y, width, tileH + 0.5 * unit);
    }
    if (!cloud) return;
    ctx.save();
    const previousAlpha = ctx.globalAlpha;
    for (const drift of cloudDrifts) {
      const w = width * drift.width;
      const h = w * cloud.height / cloud.width;
      const length = height + h + 40 * unit;
      const y = (seconds * drift.speed * unit + length * drift.phase) % length - h;
      const x = width * drift.x + Math.sin(seconds * 0.16 + drift.phase * 7) * unit * 11;
      ctx.globalAlpha = previousAlpha * drift.alpha;
      ctx.save();
      ctx.translate(x, y);
      if (drift.flip) ctx.scale(-1, 1);
      ctx.drawImage(cloud, drift.flip ? -w : 0, 0, w, h);
      ctx.restore();
    }
    ctx.restore();
  }

  const cloudDrifts = [
    {x: -0.27, width: 0.68, speed: 39, phase: 0.17, alpha: 0.36, flip: false},
    {x: 0.66, width: 0.65, speed: 48, phase: 0.67, alpha: 0.38, flip: true},
    {x: 0.16, width: 0.52, speed: 28, phase: 0.98, alpha: 0.15, flip: false}
  ];

  // Call once per resource and keep the current scene's decoded images in memory.
  function loadImage(createImage, url) {
    return new Promise((resolve, reject) => {
      const image = createImage();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('无法加载图片 ' + url));
      image.src = url;
    });
  }

  const api = { drawFrame, drawClip, drawWave, drawSky, formMask, frameIndex, loadImage };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SkySprites = api;
})(typeof globalThis === 'object' ? globalThis : this);

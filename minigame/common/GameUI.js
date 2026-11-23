const Art = require('./Art');

const colors = {
  bg: '#102d32', surface: '#203d3c', raised: '#36514b', text: '#fff1d2',
  muted: '#cad4c5', line: '#8f7650', mint: '#99d7c2', gold: '#f4c980'
};

function bounds(info) {
  const w = info.windowWidth;
  const h = info.windowHeight;
  const top = Math.max(12, info.safeTop || 0);
  const bottom = h - Math.max(12, info.safeBottom || 0);
  const width = Math.min(440, w - 32);
  return { w, h, top, bottom, x: (w - width) / 2, width };
}

function contains(rect, x, y) {
  return rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function graphic(ctx, id, x, y, width, height = width) {
  const asset = Art.uiById[id];
  const image = asset && Art.image(asset.file);
  if (!image) return false;
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale, h = image.height * scale;
  ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
  return true;
}

function nine(ctx, id, box) {
  const asset = Art.uiById[id];
  if (!asset || !asset.nineSlice) return false;
  const image = Art.image(asset.file);
  if (!image) return false;
  const { x, y, width, height } = box;
  const { left, right, top, bottom } = asset.nineSlice;
  const scale = Math.min(0.7, width / (left + right), height / (top + bottom));
  const sx = [0, left, image.width - right, image.width];
  const sy = [0, top, image.height - bottom, image.height];
  const dx = [x, x + left * scale, x + width - right * scale, x + width];
  const dy = [y, y + top * scale, y + height - bottom * scale, y + height];
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      if (dx[i+1] > dx[i] && dy[j+1] > dy[j]) {
        ctx.drawImage(image, sx[i], sy[j], sx[i+1]-sx[i], sy[j+1]-sy[j],
          dx[i], dy[j], dx[i+1]-dx[i], dy[j+1]-dy[j]);
      }
    }
  }
  return true;
}

function panel(ctx, box, fill, radius = 12) {
  const { x, y, width: w, height: h } = box;
  if (fill === colors.surface && nine(ctx, 'component.panel', box)) return;
  if (fill === colors.raised && nine(ctx, 'component.row', box)) return;
  const r = Math.min(radius, w / 2, h / 2);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function label(ctx, value, x, y, size, color = colors.text, align = 'left', bold = false, maxWidth) {
  ctx.fillStyle = color;
  ctx.font = (bold ? 'bold ' : '') + size + 'px sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (maxWidth) ctx.fillText(value, x, y, maxWidth);
  else ctx.fillText(value, x, y);
}

function button(ctx, box, title, primary = false) {
  if (!nine(ctx, primary ? 'component.button-primary' : 'component.button-secondary', box)) {
    panel(ctx, box, primary ? '#795138' : '#354845', 10);
  }
  label(ctx, title, box.x + box.width / 2, box.y + box.height / 2, 16,
    colors.text, 'center', true, box.width - 16);
}

// 微信 Canvas 的中文没有单词空格，按 Unicode 字符测量，也适用于混排数字。
function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const char of text) {
    if (line && ctx.measureText(line + char).width > width) {
      lines.push(line);
      line = '';
    }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}

function background(ctx, viewport) {
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, viewport.w, viewport.h);
  const sky = Art.image('sky/far.jpg');
  if (sky) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(sky, 0, 0, viewport.w, viewport.h);
    ctx.restore();
  }
}

module.exports = { colors, bounds, contains, panel, label, button, wrap, background, graphic, nine };

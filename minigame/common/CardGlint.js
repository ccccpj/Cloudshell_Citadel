// The approved artwork and its highlights share a 600 × 200 drawing space.
const Art = require('./Art');
const upper = [[32,46],[52,28],[80,15],[119,4],[110,26],[157,38],[203,38],[260,38],
  [328,38],[394,38],[476,38],[543,38],[566,51],[583,75],[594,90]];
const lower = [[589,130],[578,149],[560,164],[544,172],[497,172],[431,172],[362,173],
  [287,172],[225,173],[161,174],[114,174],[85,174],[64,166],[29,155]];
const returnEdge = [...lower].reverse();
const socket = Array.from({ length: 33 }, (_, i) => {
  const angle = i * Math.PI / 16 - 2.1;
  return [80 + 48 * Math.cos(angle), 104 + 51 * Math.sin(angle)];
});
const goldLights = [[46,33,.03,8],[108,12,.07,10],[149,39,.24,7],[328,38,.4,9],
  [560,48,.58,10],[431,172,.70,8],[89,170,.89,9]];
const diamondLights = [[47,35,.04,10],[118,6,.12,15],[158,40,.18,8],[260,38,.34,14],
  [327,41,.40,7],[472,37,.60,16],[564,49,.68,8],[546,171,.63,12],[431,169,.73,13],
  [302,172,.83,10],[150,174,.94,12]];

function trail(ctx, path, head, length, color, width) {
  if (head < 0 || head > 1 + length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const steps = (path.length - 1) * 6;
  for (let j = Math.max(0, Math.ceil((head - length) * steps)); j < steps && j <= head * steps; j++) {
    const i = Math.floor(j / 6), t = (j % 6) / 6;
    const [x, y] = path[i];
    const dx = path[i + 1][0] - x, dy = path[i + 1][1] - y;
    ctx.globalAlpha = (1 - (head - j / steps) / length) ** 1.5;
    ctx.beginPath();
    ctx.moveTo(x + dx * t, y + dy * t);
    ctx.lineTo(x + dx * (t + 1/6), y + dy * (t + 1/6));
    ctx.stroke();
  }
  ctx.restore();
}

function star(ctx, radius, color) {
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.6);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(.12, color);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-2*radius, -2*radius, 4*radius, 4*radius);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, r = i % 2 ? radius * .14 : radius;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r * 1.25);
  }
  ctx.closePath();
  ctx.fill();
}

let sheen;
function prism(ctx, phase) {
  const mask = Art.image('interface/cards/diamond-rim.png');
  const x = -120 + phase * 860;
  if (!mask || x < -52 || x > 660) return;
  if (!sheen) {
    sheen = wx.createCanvas();
    sheen.width = 600;
    sheen.height = 200;
  }
  const layer = sheen.getContext('2d');
  layer.clearRect(0, 0, 600, 200);
  layer.drawImage(mask, 0, 0);
  layer.save();
  layer.globalCompositeOperation = 'source-in';
  const band = layer.createLinearGradient(x - 44, 0, x + 48, 23);
  for (const [offset, color] of [[0,'rgba(133,158,255,0)'],[.25,'rgba(186,142,254,.38)'],
    [.43,'rgba(133,238,255,.73)'],[.5,'white'],[.59,'rgba(207,243,255,.69)'],
    [.73,'rgba(197,162,255,.52)'],[1,'rgba(226,170,255,0)']]) band.addColorStop(offset, color);
  layer.fillStyle = band;
  layer.fillRect(0, 0, 600, 200);
  layer.restore();
  ctx.drawImage(sheen, 0, 0);
}

module.exports = function drawGlint(ctx, tier, phase) {
  const gold = tier === 3;
  const speed = gold ? phase : (phase + .12) % 1;
  const color = gold ? '#ffedb2' : '#c5ffff';
  trail(ctx, socket, speed * 4.4, .26, color, gold ? 1.7 : 2);
  trail(ctx, upper, (speed - .12) * 2.08, .19, color, gold ? 2 : 2.5);
  trail(ctx, lower, (speed - .55) * 2.78, .20, gold ? '#fff1be' : '#e4cfff', 2);
  if (!gold) {
    prism(ctx, phase);
    trail(ctx, returnEdge, (phase - .1) * 1.55, .16, '#a3ecff', 1.5);
  }
  const duration = gold ? .072 : .091;
  for (const [x, y, peak, radius] of gold ? goldLights : diamondLights) {
    const distance = Math.abs((phase - peak + 1.5) % 1 - .5);
    if (distance >= duration) continue;
    const glow = Math.cos(distance / duration * Math.PI / 2) ** 2;
    if (radius * glow < .3) continue;
    ctx.save();
    ctx.translate(x, y);
    star(ctx, radius * glow, gold ? '#ffdc87' : '#a8eaff');
    if (!gold && glow > .48) {
      ctx.rotate(.75);
      star(ctx, radius * glow * .59, '#f2caff');
    }
    ctx.restore();
  }
};

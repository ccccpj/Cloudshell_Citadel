// Paths in the art catalogs stay stable across main- and subpackage boundaries.
const forms = require('./art/forms');
const creatures = require('./art/creatures');
const ui = require('./art/interface');
const effects = require('./art/effects');
const player = require('./art/player');

const mainFiles = new Set(['forms/00-sheet.png', 'creatures/basic-sheet.png', 'effects/wave-normal.png']);
function packageFor(path) {
  if (mainFiles.has(path)) return '';
  const folder = path.split('/', 1)[0];
  if (folder === 'forms') return /^forms\/(0[89]|1[0-5])[-.]/.test(path) ? 'formLater' : 'formEarly';
  return { creatures: 'bestiary', interface: 'controls', effects: 'vfx' }[folder] || '';
}

const packages = new Map();
function ensurePackage(name) {
  if (!name) return Promise.resolve();
  if (!packages.has(name)) {
    const ready = new Promise((resolve, reject) => wx.loadSubpackage({ name, success: resolve, fail: reject }));
    packages.set(name, ready.catch(error => {
      packages.delete(name);
      throw error;
    }));
  }
  return packages.get(name);
}

const images = new Map();
const maxDecodedBytes = 48 * 1024 * 1024;
let decodedBytes = 0;
let redraw = () => {};
function trimCache(limit = maxDecodedBytes) {
  if (decodedBytes <= limit) return;
  const now = Date.now();
  const idle = Array.from(images.entries())
    .filter(([, item]) => item.image && now - item.lastDraw > 500)
    .sort((a, b) => a[1].lastDraw - b[1].lastDraw);
  for (const [path, item] of idle) {
    images.delete(path);
    decodedBytes -= item.bytes;
    if (decodedBytes <= limit) break;
  }
}

function image(path) {
  if (typeof wx === 'undefined' || !wx.createImage) return null;
  const now = Date.now();
  let item = images.get(path);
  if (item) {
    item.lastDraw = now;
    if (item.image || item.loading || item.retryAt > now) return item.image;
  } else {
    item = { image: null, lastDraw: now, failures: 0 };
    images.set(path, item);
  }
  item.loading = true;
  const group = packageFor(path);
  ensurePackage(group).then(() => player.loadImage(() => wx.createImage(), group ? group + '/' + path : path))
    .then(bitmap => {
      item.image = bitmap;
      item.loading = false;
      item.bytes = bitmap.width * bitmap.height * 4;
      decodedBytes += item.bytes;
      trimCache();
      redraw();
    }).catch(() => {
      item.loading = false;
      const delay = Math.min(30000, 1500 * Math.pow(2, Math.min(5, item.failures++)));
      item.retryAt = Date.now() + delay;
      // A static menu also needs to get a chance to retry after the network returns.
      setTimeout(redraw, delay + 30);
    });
  return null;
}

module.exports = {
  forms, creatures, ui, effects, player, image, packageFor,
  uiById: Object.fromEntries(ui.assets.map(item => [item.id, item])),
  fxById: Object.fromEntries(effects.clips.map(item => [item.id, item])),
  onReady(fn) {
    redraw = fn;
    if (wx.onMemoryWarning) wx.onMemoryWarning(() => trimCache(0));
  }
};

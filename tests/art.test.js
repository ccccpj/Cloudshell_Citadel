const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const art = require('../minigame/common/Art');
const config = require('../minigame/game.json');
const root = path.join(__dirname, '../minigame');

test('小游戏可按目录索引取得所有立绘、动画、图标和界面组件', () => {
  const groups = config.subpackages.map(item => item.name);
  const files = [
    'assets/hero.jpg', 'sky/far.jpg', 'sky/clouds.png',
    ...art.forms.forms.flatMap(item => [item.sheet, item.portrait]),
    ...art.forms.modules.map(item => item.file),
    ...art.creatures.creatures.flatMap(item => [item.sheet, item.portrait, item.badge, item.silhouette]),
    ...art.effects.clips.map(item => item.file), ...art.ui.assets.map(item => item.file)
  ];
  for (const file of files) {
    const group = art.packageFor(file);
    assert.ok(!group || groups.includes(group), file);
    assert.ok(fs.statSync(path.join(root, group, file)).isFile(), file);
  }
  for (const pack of config.subpackages) assert.ok(fs.existsSync(path.join(root,pack.root,'game.js')));
});

test('两张尚未就绪的同包图片共享一次加载，静态界面收到解码完成通知', async () => {
  let start, requests = 0, decoded = 0;
  global.wx = {
    loadSubpackage(options) { requests++; start = options.success; },
    createImage() { return { width: 128, height: 128, set src(value) { this.path = value; this.onload(); } }; }
  };
  try {
    art.onReady(() => decoded++);
    const paths = ['forms/10.png','forms/11.png'];
    for(const name of paths) assert.equal(art.image(name),null);
    art.image(paths[0]);
    assert.equal(requests,1);
    start();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(decoded,2);
    for(const name of paths) assert.equal(art.image(name).path,'formLater/'+name);
  } finally { delete global.wx; }
});

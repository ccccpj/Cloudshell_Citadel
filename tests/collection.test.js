const test = require('node:test');
const assert = require('node:assert/strict');
const Menu = require('../minigame/common/MenuComponent');
const collection = require('../minigame/common/Collection');

test('图鉴只记录实际首次遭遇；翻页、观察形态均不解锁进度', () => {
  const store = new Map();
  global.wx = { getStorageSync: key => store.get(key),
    setStorageSync: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))) };
  try {
    const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) },
      { get: (o, k) => o[k] || (() => {}) });
    const menu = new Menu({}, ctx, { windowWidth: 375, windowHeight: 667, safeTop: 52 });
    function tap(action) {
      const { rect } = menu.zones.find(z => z.action === action);
      menu.handleTouch(rect.x + rect.width / 2, rect.y + rect.height / 2);
      menu.draw();
    }
    menu.draw();
    tap('codex');
    tap('filter:10');
    tap('next');
    assert.equal(menu.zones.some(z => z.action.startsWith('entry:')), false);
    assert.equal(store.size, 0);
    const enemy = { immunities: ['ice'], resistances: ['wind'] };
    assert.equal(collection.recordEncounter('basic', 4, enemy), true);
    assert.equal(collection.recordEncounter('basic', 5, { immunities: [], resistances: [] }), false);
    assert.deepEqual(collection.firstDefenses('basic'), { immune: ['ice'], resist: ['wind'] });
    tap('prev');
    tap('entry:basic');
    assert.equal(menu.page, 'entry');
    tap('codex');
    tap('home');
    tap('forms');
    tap('final');
    assert.equal(menu.formMask, 15);
    assert.equal(collection.hasForm(15), false);
    collection.recordForm(1);
    collection.recordForm(3);
    assert.equal(collection.hasForm(2), false);
    delete require.cache[require.resolve('../minigame/common/Collection')];
    const restored = require('../minigame/common/Collection');
    assert.equal(restored.encounters().basic, 4);
    assert.equal(restored.hasForm(3), true);
    assert.equal(restored.hasForm(15), false);
  } finally {
    delete global.wx;
  }
});

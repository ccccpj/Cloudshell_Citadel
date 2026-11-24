const test = require('node:test');
const assert = require('node:assert/strict');
const Menu = require('../minigame/common/MenuComponent');
const Upgrades = require('../minigame/common/UpgradeComponent');
const System = require('../minigame/common/UpgradeSystem');
const Enhancement = require('../minigame/common/EnhancementComponent');
const Experience = require('../minigame/common/ExperienceSystem');
const Level = require('../minigame/common/LevelManager');

const ctx = new Proxy({
  measureText: value => ({ width: [...value].length * 13 }),
  createRadialGradient: () => ({ addColorStop() {} })
}, { get: (obj, key) => obj[key] || (() => {}) });
const canvas = { getContext: () => ctx };
const tap = rect => [rect.x + rect.width / 2, rect.y + rect.height / 2];
const info = (w, h) => ({ windowWidth: w, windowHeight: h, safeTop: 60, safeBottom: 24 });

test('三选一先按幸运权重抽稀有度，同一手牌不重复且稀有卡有对应数值', t => {
  const system = new Enhancement(canvas, info(320, 568)).enhancementSystem;
  let quantile = 0;
  t.mock.method(Math, 'random', () => quantile);
  for (const luck of [0, 100]) {
    system.playerStats.luckyValue = luck;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 200; i++) {
      quantile = (i + 0.5) / 200;
      const hand = system.generateRandomEnhancements(3);
      assert.equal(new Set(hand.map(card => card.type)).size, 3);
      for (const card of hand) {
        counts[card.tier - 1]++;
        assert.ok(system.enhancementCards[card.type].values[card.tier] !== undefined);
      }
    }
    const weights = system.calculateCardProbabilities();
    assert.deepEqual(counts, Object.values(weights).map(percent => Math.round(percent * 6)));
  }
});

test('按卡面数值应用强化，每次三选一都必须领取', () => {
  const panel = new Enhancement(canvas, info(320, 568));
  const exp = new Experience();
  exp.addEnhancePoints(2);
  let complete = 0;
  panel.showEnhancementScreen(exp, null, () => { complete++; });
  const startingAttack = panel.enhancementSystem.playerStats.attackPower;
  const card = { type: 'attack', name: '攻击力提升', tier: 1, value: 7.1 };
  card.description = panel.enhancementSystem.getEnhancementDescription(card.type, card.tier, card.value);
  assert.match(card.description, /7\.1%/);
  panel.state.availableCards[0] = card;
  panel.draw(ctx);
  panel.handleTouch(...tap(card.bounds), exp);
  assert.equal(panel.enhancementSystem.playerStats.attackPower, startingAttack + startingAttack * 0.071);
  panel.draw(ctx);
  panel.handleTouch(160, 531, exp);
  assert.equal(exp.getExperienceStatus().enhancePoints, 1);
  assert.equal(complete, 0);
  assert.equal(panel.isShowing(), true);
  panel.handleTouch(...tap(panel.state.availableCards[1].bounds), exp);
  assert.equal(exp.getExperienceStatus().enhancePoints, 0);
  assert.equal(complete, 1);
  assert.equal(panel.isShowing(), false);
});

test('工坊可直接保留全部升级点，也可在查看属性后购买并继续', () => {
  const exp = new Experience();
  exp.playerExperience.upgradePoints = 8;
  const system = new System();
  const panel = new Upgrades(canvas, info(375, 667));
  let complete = 0;
  const click = rect => {
    panel.handleClick(...tap(rect), system, exp);
    panel.draw(ctx);
  };
  panel.showUpgradeScreen(system, exp, () => complete++);
  panel.draw(ctx);
  click(panel.continueButton);
  assert.equal(complete, 1);
  assert.equal(exp.getExperienceStatus().upgradePoints, 8);
  panel.showUpgradeScreen(system, exp, () => complete++);
  panel.draw(ctx);
  click(panel.rows.find(row => row.key === 'normal').rect);
  click(panel.rows.find(row => row.kind === 'awakening').rect);
  click(panel.detailBack);
  assert.equal(complete, 1);
  assert.equal(exp.getExperienceStatus().upgradePoints, 8);
  click(panel.rows.find(row => row.key === 'damage').rect);
  click(panel.continueButton);
  assert.equal(complete, 2);
  assert.equal(exp.getExperienceStatus().upgradePoints, 7);
});

test('工坊无可买项目可继续，唯一可购买项目为觉醒时领取后可继续', () => {
  const exp = new Experience();
  const system = new System();
  const panel = new Upgrades(canvas, info(375, 667));
  const skill = system.awakeningSkills.normal.pureForce;
  for (const wave of Object.keys(system.waveUpgrades)) {
    if (!system.isWaveUnlocked(wave)) system.unlockWave(wave);
    for (const key of Object.keys(system.waveUpgrades[wave])) {
      if (key === 'awakening') continue;
      system.waveUpgrades[wave][key] = system.getMaxUpgradeLevel(key, wave);
    }
    for (const awakening of Object.values(system.awakeningSkills[wave])) awakening.unlocked = true;
  }
  skill.unlocked = false;
  let complete = 0;
  const show = points => {
    exp.playerExperience.upgradePoints = points;
    panel.showUpgradeScreen(system, exp, () => complete++);
    panel.draw(ctx);
  };
  const click = rect => { panel.handleClick(...tap(rect), system, exp); panel.draw(ctx); };
  show(7);
  click(panel.continueButton);
  assert.equal(complete, 1);
  show(8);
  click(panel.rows.find(row => row.key === 'normal').rect);
  click(panel.rows.find(row => row.key === 'pureForce').rect);
  click(panel.detailBuy);
  click(panel.continueButton);
  assert.equal(complete, 2);
  assert.equal(skill.unlocked, true);
  show(9);
  click(panel.continueButton);
  assert.equal(complete, 3);
  assert.equal(exp.getExperienceStatus().upgradePoints, 9);
});

test('无伤生存才触发完美奖励；暂停时关卡时间冻结', () => {
  const level = new Level(canvas, info(375, 667));
  const results = [];
  level.setLevelCompleteCallback((number, perfect) => results.push(perfect));
  for (const hurt of [false, true]) {
    level.startLevel();
    if (hurt) level.markPlayerHit();
    level.togglePause();
    const before = level.timeRemaining;
    level.update(1);
    assert.equal(level.timeRemaining, before);
    level.togglePause();
    level.update(before);
    level.update(1);
  }
  assert.deepEqual(results, [true, false]);
});

for (const [w, h] of [[320, 568], [375, 667], [430, 932]]) {
  test(w + ' × ' + h + ' 菜单、底部控件及最后一个觉醒都可触及', () => {
    const viewport = info(w, h);
    const menu = new Menu(canvas, ctx, viewport);
    menu.draw();
    menu.handleTouch(...tap(menu.startButton));
    menu.draw();
    assert.equal(menu.handleTouch(...tap(menu.healthAdviceAcceptButton)), 'startGame');

    const exp = new Experience();
    exp.playerExperience.upgradePoints = 120;
    const system = new System();
    const panel = new Upgrades(canvas, viewport);
    let complete = 0;
    panel.showUpgradeScreen(system, exp, () => { complete++; });
    const click = rect => panel.handleClick(...tap(rect), system, exp);
    panel.draw(ctx);
    const fire = panel.rows.find(row => row.key === 'fire');
    click(fire.rect);
    panel.draw(ctx);
    assert.equal(panel.state.selectedWaveType, 'fire');
    const points = exp.getExperienceStatus().upgradePoints;
    panel.scrollBy(2000);
    panel.draw(ctx);
    assert.equal(exp.getExperienceStatus().upgradePoints, points);
    const last = panel.rows.at(-1);
    assert.equal(last.key, 'phoenixRebirth');
    assert.ok(last.rect.y >= viewport.safeTop);
    assert.ok(last.rect.y + last.rect.height < panel.continueButton.y);
    click(last.rect);
    panel.draw(ctx);
    assert.ok(panel.detailBack);
    assert.equal(panel.detailBuy, null);
    click(panel.detailBack);
    panel.draw(ctx);
    click(panel.continueButton);
    assert.equal(complete, 1);
  });
}

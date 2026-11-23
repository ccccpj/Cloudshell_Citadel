const { randomInt } = require('node:crypto');

// These are the enemy scores and spawn intervals of this version of the game.
// Keep the protocol immutable for the lifetime of issued runs.
const enemies = [
  ['basic', 10, 40], ['fast', 15, 20], ['tank', 30, 10],
  ['fireResistant', 20, 10], ['iceImmune', 25, 8], ['electricResistant', 22, 7],
  ['shielded', 28, 3], ['ghost', 35, 2, 6], ['elite', 50, 2, 4], ['boss', 100, 1, 10]
];
const points = Object.fromEntries(enemies.map(([type, score]) => [type, score]));
// 关卡时长与计分沿用同一规则。间隔以毫秒计，按开局签发的版本选择。
const spawnRules = new Map([
  [1, { base: 1000, decrease: 100, min: 100 }],
  [2, { base: 1150, decrease: 65, min: 420 }]
]);

function issueRun(version = 1) {
  if (!spawnRules.has(version)) throw new Error('不支持的对局规则版本');
  return { version, decks: issueDecks() };
}

function issueDecks() {
  return [10, 6, 4, 1].map(min => {
    const cards = [];
    for (const [type, , weight, from = 1] of enemies) {
      if (min >= from) cards.push(...Array(weight).fill(type));
    }
    for (let i = cards.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return { min, cards };
  });
}

function typeAt(decks, level, index) {
  if (level === 1 && index < 3) return ['basic', 'fast', 'basic'][index];
  const { cards } = decks.find(deck => level >= deck.min);
  return cards[(index + level * 31) % cards.length];
}

function verifiedScore(issued, elapsedMs, kills) {
  // 旧服务把出怪表数组直接存入 jsonb。新对局同时保存在开局时协商的版本。
  const { version, decks } = Array.isArray(issued) ? { version: 1, decks: issued } : issued;
  const spawn = spawnRules.get(version);
  if (!spawn) throw new Error('不支持的对局规则版本');
  const invalid = () => { throw new Error('对局记录与出怪进度不符'); };
  if (!Array.isArray(kills) || kills.length > 1024) invalid();
  let startMs = 0, score = 0;
  for (let i = 0; i < kills.length; i++) {
    const level = i + 1;
    const durationMs = Math.min(100, 20 + 5 * i) * 1000;
    const activeMs = Math.min(durationMs, elapsedMs - startMs);
    const intervalMs = Math.max(spawn.min, spawn.base - i * spawn.decrease);
    const indexes = kills[i];
    if (!Array.isArray(indexes) || activeMs < 0 || indexes.length > Math.ceil(activeMs / intervalMs) + 1) invalid();
    const limit = Math.ceil(activeMs / intervalMs) + 1;
    let previous = -1;
    for (const index of indexes) {
      if (!Number.isSafeInteger(index) || index <= previous || index >= limit) invalid();
      previous = index;
      const type = typeAt(decks, level, index);
      score += Math.floor(points[type] * Math.pow(1.2, i));
    }
    startMs += durationMs;
  }
  return Math.min(score, Number.MAX_SAFE_INTEGER);
}

module.exports = { issueRun, typeAt, verifiedScore };

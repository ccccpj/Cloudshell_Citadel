const { getStorage, setStorage } = require('./Utils');
const { ENEMY_CONFIG } = require('./GameConfig');

const key = 'cloudshell_collection_v1';
const types = Object.keys(ENEMY_CONFIG.TYPES);
const elements = ['normal', 'wind', 'fire', 'ice', 'electric'];
let collection;

function load() {
  if (collection) return collection;
  const stored = typeof wx !== 'undefined' && getStorage(key);
  const seen = {};
  const defenses = {};
  for (const id of types) {
    const firstLevel = stored && stored.seen && stored.seen[id];
    if (!Number.isInteger(firstLevel) || firstLevel < 1) continue;
    seen[id] = firstLevel;
    const first = stored.defenses && stored.defenses[id];
    if (first && Array.isArray(first.immune) && Array.isArray(first.resist)) {
      defenses[id] = {
        immune: first.immune.filter(e => elements.includes(e)),
        resist: first.resist.filter(e => elements.includes(e))
      };
    }
  }
  const masks = stored && Array.isArray(stored.masks) ? stored.masks : [];
  collection = { seen, defenses, masks: [...new Set([0, ...masks.filter(m => Number.isInteger(m) && m >= 0 && m < 16)])] };
  return collection;
}

function save() {
  if (typeof wx !== 'undefined') setStorage(key, collection);
}

function recordEncounter(type, level, enemy) {
  const state = load();
  if (state.seen[type]) return false;
  state.seen[type] = level;
  if (enemy) state.defenses[type] = { immune: enemy.immunities.slice(), resist: enemy.resistances.slice() };
  save();
  return true;
}

function recordForm(mask) {
  const state = load();
  if (state.masks.includes(mask)) return false;
  state.masks.push(mask);
  save();
  return true;
}

module.exports = {
  recordEncounter, recordForm,
  encounters: () => load().seen,
  firstDefenses: type => load().defenses[type],
  hasForm: mask => load().masks.includes(mask)
};

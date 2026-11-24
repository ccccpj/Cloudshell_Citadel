const { colors, bounds, contains, panel, label, button, wrap, background, graphic, nine } = require('./GameUI');

const elements = {
  normal: ['普通波', '#e5efed', '环形扩散', ['penetration', 'width']],
  wind: ['风波', '#83f2cf', '击退敌人', ['knockback', 'knockbackDuration', 'penetration', 'groupDamage', 'speed']],
  fire: ['火波', '#ffab89', '持续燃烧', ['burnDamage', 'burnDuration', 'burnSpread', 'penetration', 'explosion']],
  ice: ['冰波', '#9cd9ff', '减缓移动', ['slow', 'slowDuration', 'armor', 'penetration', 'resonance']],
  electric: ['电波', '#f7d68a', '连锁攻击', ['chainRange', 'chainDamage', 'chainCount', 'penetration', 'groupDamage']]
};

function damageRequired(type) {
  if (type === 'damage') return 0;
  if (['range', 'cooldown'].includes(type)) return 1;
  if (['penetration', 'width', 'knockback', 'knockbackDuration', 'burnDamage', 'burnDuration',
    'slow', 'slowDuration', 'chainRange', 'chainDamage'].includes(type)) return 2;
  return 3;
}

class UpgradeComponent {
  constructor(canvas, systemInfo) {
    this.systemInfo = systemInfo;
    this.state = { isShowing: false, currentView: 'elements', selectedWaveType: null };
    this.rows = [];
    this.scrollOffset = 0;
    this.maxScroll = 0;
  }

  showUpgradeScreen(upgradeSystem, experienceSystem, completeCallback = null) {
    const points = experienceSystem.getExperienceStatus().upgradePoints;
    if (points <= 0) return false;
    this.upgradeSystem = upgradeSystem;
    this.experienceSystem = experienceSystem;
    this.completeCallback = completeCallback;
    this.state.isShowing = true;
    this.selectWave(null);
    return true;
  }

  selectWave(wave) {
    this.state.selectedWaveType = wave;
    this.state.currentView = wave ? 'tree' : 'elements';
    this.rows = [];
    this.detail = null;
    this.notice = '';
    this.scrollOffset = 0;
  }

  isShowing() { return this.state.isShowing; }
  isVisible() { return this.state.isShowing; }

  scrollBy(deltaY) {
    if (!this.isVisible() || this.detail) return false;
    this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  listRows(points, wave = this.state.selectedWaveType) {
    const system = this.upgradeSystem;
    if (!wave) {
      return Object.entries(elements).map(([key, [title, ink, caption]]) => {
        const unlocked = system.isWaveUnlocked(key);
        const cost = system.getUnlockCost(key);
        return { kind: 'element', key, title, ink, caption, unlocked, cost,
          action: unlocked ? '升级  ›' : '解锁 ' + cost + ' 点', enabled: unlocked || points >= cost };
      });
    }
    const upgrades = ['damage', 'range', 'cooldown', ...elements[wave][3]].map(key => {
      const level = system.getWaveUpgradeLevel(wave, key);
      const max = system.getMaxUpgradeLevel(key, wave);
      const cost = system.getUpgradeCost(wave, key);
      const required = damageRequired(key);
      const locked = system.getWaveUpgradeLevel(wave, 'damage') < required;
      const caption = '等级 ' + level + ' / ' + max;
      const action = level >= max ? '已满级' : locked ? '需伤害 ' + required + ' 级' : '升级 ' + cost + ' 点';
      return { kind: 'upgrade', key, title: system.getUpgradeTypeName(key), ink: elements[wave][1], caption,
        cost, enabled: !locked && level < max && points >= cost, action };
    });
    const awakenings = Object.entries(system.awakeningSkills[wave]).map(([key, skill]) => ({
      kind: 'awakening', key, title: skill.name, ink: colors.gold, caption: '觉醒技能', skill,
      action: skill.unlocked ? '已觉醒' : '查看条件  ›', enabled: true
    }));
    return [...upgrades, ...awakenings];
  }

  draw(ctx) {
    if (!this.isShowing()) return;
    const view = bounds(this.systemInfo);
    const { top, bottom, x, width } = view;
    const wave = this.state.selectedWaveType;
    const points = this.experienceSystem.getExperienceStatus().upgradePoints;
    ctx.save();
    background(ctx, view);
    if (wave) graphic(ctx, 'skill.' + wave, x, top + 1, 42);
    label(ctx, wave ? elements[wave][0] + '升级' : '元素工坊', x + (wave ? 48 : 0), top + 22, 25, colors.text, 'left', true);
    label(ctx, '升级点 ' + points, x + width, top + 24, 15, colors.gold, 'right', true);
    this.listTop = top + 72;
    this.listBottom = bottom - 60;
    const contentH = this.listBottom - this.listTop;
    const list = this.listRows(points);
    const columns = wave ? 2 : 1;
    const gap = 10;
    const rowCount = Math.ceil(list.length / columns);
    const fit = (contentH + gap) / rowCount;
    const step = wave ? Math.max(94, Math.min(108, fit)) : Math.max(74, Math.min(118, fit));
    this.maxScroll = Math.max(0, rowCount * step - gap - contentH);
    this.scrollOffset = Math.min(this.scrollOffset, this.maxScroll);
    label(ctx, this.notice || (this.maxScroll ? '上下滑动查看' : wave ? '选择属性或觉醒' : '选择光波以升级或解锁'),
      x, top + 53, 13, this.notice ? colors.mint : colors.muted);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, this.listTop, width, contentH);
    ctx.clip();
    this.rows = [];
    const cellW = (width - (this.maxScroll ? 9 : 0) - (columns - 1) * gap) / columns;
    list.forEach((row, i) => {
      const y = this.listTop + Math.floor(i / columns) * step - this.scrollOffset;
      const height = step - gap;
      if (y + height <= this.listTop || y >= this.listBottom) return;
      const left = x + (i % columns) * (cellW + gap);
      const rect = { x: left, y, width: cellW, height };
      this.rows.push({ ...row, rect });
      const skin = row.kind === 'awakening' ? 'row-selected' : 'row';
      if (!nine(ctx, 'component.' + skin, rect)) panel(ctx, rect, colors.surface, 8);
      if (!wave) {
        const size = Math.min(62, height - 22);
        const textX = left + size + 24;
        ctx.save();
        if (!row.unlocked) ctx.globalAlpha *= 0.67;
        graphic(ctx, 'skill.' + row.key, left + 13, y + (height - size) / 2, size);
        ctx.restore();
        label(ctx, row.title, textX, y + height / 2 - 11, 19, colors.text, 'left', true);
        label(ctx, row.caption, textX, y + height / 2 + 11, 13, colors.muted);
        label(ctx, row.action, left + cellW - 17, y + height / 2 - 1, 14,
          row.enabled ? colors.gold : colors.muted, 'right');
        return;
      }
      const artId = (row.kind === 'awakening' ? 'awakening.' : 'node.') + wave + '.' + row.key;
      const iconSize = cellW < 150 ? 28 : 32;
      const textX = left + 13 + iconSize + 6;
      const textWidth = left + cellW - 16 - textX;
      const blockTop = y + (height - 84) / 2;
      graphic(ctx, artId, left + 13, blockTop + 14, iconSize);
      label(ctx, row.title, textX, blockTop + 21, 15, colors.text, 'left', true, textWidth);
      label(ctx, row.caption, textX, blockTop + 40, 12, colors.muted, 'left', false, textWidth);
      label(ctx, row.action, left + cellW - 17, blockTop + 62, 13,
        row.enabled ? colors.gold : colors.muted, 'right', false, cellW - 34);
    });
    ctx.restore();
    if (this.maxScroll) {
      const content = contentH + this.maxScroll;
      const height = Math.max(12, contentH * contentH / content);
      const barY = this.listTop + (contentH - height) * this.scrollOffset / this.maxScroll;
      ctx.fillStyle = colors.line;
      ctx.fillRect(x + width - 3, this.listTop, 3, contentH);
      ctx.fillStyle = colors.muted;
      ctx.fillRect(x + width - 3, barY, 3, height);
    }
    this.backButton = wave ? { x, y: bottom - 48, width: (width - 8) * 0.42, height: 48 } : null;
    const nextX = this.backButton ? x + this.backButton.width + 8 : x;
    this.continueButton = { x: nextX, y: bottom - 48, width: x + width - nextX, height: 48 };
    if (wave) button(ctx, this.backButton, '返回元素');
    const nextLabel = points ? '保留 ' + points + ' 点并继续' : '进入下一关';
    button(ctx, this.continueButton, nextLabel, true);
    if (this.detail) this.drawDetail(ctx, view, points);
    ctx.restore();
  }

  drawDetail(ctx, view, points) {
    const system = this.upgradeSystem;
    const wave = this.state.selectedWaveType;
    const { key, skill } = this.detail;
    const cost = system.upgradeConfig.awakeningCost;
    const { w, h, x, width, top, bottom } = view;
    ctx.fillStyle = 'rgba(6,13,18,0.86)';
    ctx.fillRect(0, 0, w, h);
    const height = Math.min(328, bottom - top);
    const y = top + (bottom - top - height) / 2;
    const box = { x, y, width, height };
    if (!nine(ctx, 'component.panel-modal', box)) panel(ctx, box, colors.surface, 16);
    graphic(ctx, 'awakening.' + wave + '.' + key, x + 14, y + 10, 46);
    label(ctx, skill.name, x + 68, y + 33, 22, colors.gold, 'left', true, width - 84);
    ctx.font = '15px sans-serif';
    const desc = wrap(ctx, skill.description, width - 32);
    let lineY = y + 76;
    for (const line of desc) {
      label(ctx, line, x + 16, lineY, 15, colors.text);
      lineY += 19;
    }
    lineY += 12;
    for (const [type, required] of Object.entries(skill.requirements)) {
      const current = system.getWaveUpgradeLevel(wave, type);
      label(ctx, system.getUpgradeTypeName(type) + '等级  ' + current + ' / ' + required, x + 16, lineY, 14,
        current >= required ? colors.mint : colors.gold);
      lineY += 22;
    }
    label(ctx, '升级点  ' + points + ' / ' + cost, x + 16, lineY, 14, points >= cost ? colors.mint : colors.gold);
    const ready = system.canUnlockAwakening(wave, key) && points >= cost;
    const left = x + 12;
    const buttonY = y + height - 60;
    this.detailBack = { x: left, y: buttonY, width: ready ? (width - 32) / 2 : width - 24, height: 48 };
    button(ctx, this.detailBack, skill.unlocked ? '已觉醒，返回' : '返回升级');
    this.detailBuy = ready ? { ...this.detailBack, x: left + this.detailBack.width + 8 } : null;
    if (ready) button(ctx, this.detailBuy, '觉醒 ' + cost + ' 点', true);
  }

  handleClick(x, y, system, experience, changed) {
    if (!this.isShowing()) return false;
    const wave = this.state.selectedWaveType;
    if (this.detail) {
      if (contains(this.detailBack, x, y)) this.detail = null;
      else if (contains(this.detailBuy, x, y) && system.unlockAwakening(wave, this.detail.key)) {
        experience.spendPoints('upgradePoints', system.upgradeConfig.awakeningCost);
        this.notice = '已觉醒' + this.detail.title;
        this.detail = null;
        if (changed) changed(system);
      }
      return true;
    }
    if (contains(this.continueButton, x, y)) {
      this.state.isShowing = false;
      const next = this.completeCallback;
      this.completeCallback = null;
      if (next) next();
      return true;
    }
    if (contains(this.backButton, x, y)) {
      this.selectWave(null);
      return true;
    }
    if (y < this.listTop || y > this.listBottom) return true;
    const row = this.rows.find(entry => contains(entry.rect, x, y));
    if (!row) return true;
    if (row.kind === 'awakening') {
      this.detail = row;
      this.detailBuy = this.detailBack = null;
    } else if (row.kind === 'element' && row.unlocked) {
      this.selectWave(row.key);
    } else if (row.enabled && experience.hasEnoughPoints('upgradePoints', row.cost)) {
      const bought = row.kind === 'element' ? system.unlockWave(row.key) : system.upgradeWave(wave, row.key);
      if (bought) {
        experience.spendPoints('upgradePoints', row.cost);
        if (row.kind === 'element') this.selectWave(row.key);
        this.notice = (row.kind === 'element' ? '已解锁' : '已提升') + row.title;
        if (changed) changed(system);
      }
    } else {
      this.notice = row.action.startsWith('需') || row.action === '已满级' ? row.action : '升级点不足，需要 ' + row.cost + ' 点';
    }
    // 每次购买后重新生成命中区，避免同一帧中的第二次触摸复用旧价格。
    this.rows = [];
    return true;
  }
}

module.exports = UpgradeComponent;

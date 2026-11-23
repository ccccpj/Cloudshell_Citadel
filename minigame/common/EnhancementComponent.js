const EnhancementSystem = require('./EnhancementSystem');
const { colors, bounds, label, button, contains, wrap, background, graphic, nine } = require('./GameUI');
const tiers = ['', '基础', '高级', '精英', '传说'];

class EnhancementComponent {
  constructor(canvas, systemInfo) {
    this.systemInfo = systemInfo;
    this.enhancementSystem = new EnhancementSystem();
    this.state = { isShowing: false, availableCards: [], remainingSelections: 0 };
  }

  showEnhancementScreen(experienceSystem, upgradeCallback = null, completeCallback = null) {
    const points = experienceSystem.getExperienceStatus().enhancePoints;
    if (points <= 0) return false;
    this.state = { isShowing: true, remainingSelections: points,
      availableCards: this.enhancementSystem.generateRandomEnhancements(3) };
    this.upgradeCallback = upgradeCallback;
    this.completeCallback = completeCallback;
    this.enhancementCloseButton = null;
    return true;
  }

  isShowing() { return this.state.isShowing; }
  isVisible() { return this.state.isShowing; }

  finish(experienceSystem) {
    const next = experienceSystem.getExperienceStatus().upgradePoints > 0 && this.upgradeCallback
      ? this.upgradeCallback : this.completeCallback;
    this.state.isShowing = false;
    this.state.availableCards = [];
    this.enhancementCloseButton = null;
    this.upgradeCallback = this.completeCallback = null;
    if (next) next();
  }

  draw(ctx) {
    if (!this.state.isShowing) return;
    const view = bounds(this.systemInfo);
    const { top, bottom, x, width } = view;
    ctx.save();
    background(ctx, view);
    label(ctx, '选择强化', x, top + 23, 27, colors.text, 'left', true);
    label(ctx, '强化点 ' + this.state.remainingSelections, x + width, top + 25, 15, colors.gold, 'right', true);
    const rowTop = top + 65;
    this.enhancementCloseButton = { x, y: bottom - 48, width, height: 48 };
    const rowHeight = Math.min(114, (bottom - 66 - rowTop - 20) / 3);
    this.state.availableCards.forEach((card, i) => {
      const y = rowTop + i * (rowHeight + 10);
      const box = { x, y, width, height: rowHeight };
      card.bounds = box;
      if (!nine(ctx, 'component.panel-light', box)) {
        ctx.fillStyle = '#e7d7b6';
        ctx.fillRect(x, y, width, rowHeight);
      }
      const size = Math.min(72, rowHeight - 14, width * 0.22);
      const textX = x + size + 21;
      graphic(ctx, 'enhancement.' + card.type, x + 11, y + (rowHeight - size) / 2, size);
      label(ctx, card.name, textX, y + rowHeight * 0.34, 19, '#253c39', 'left', true,
        width - size - 92);
      graphic(ctx, 'quality.' + card.tier, x + width - 54, y + 9, 21);
      label(ctx, tiers[card.tier], x + width - 11, y + 20, 11, '#5f472e', 'right');
      ctx.font = '14px sans-serif';
      const lines = wrap(ctx, card.description, x + width - textX - 14);
      lines.forEach((line, lineIndex) => label(ctx, line, textX, y + rowHeight * 0.62 + lineIndex * 16, 14, '#254f48'));
    });
    button(ctx, this.enhancementCloseButton, '保留强化点，继续');
    ctx.restore();
  }

  handleTouch(x, y, experienceSystem, playerUpdateCallback) {
    if (!this.state.isShowing) return false;
    if (contains(this.enhancementCloseButton, x, y)) {
      this.finish(experienceSystem);
      return true;
    }
    const card = this.state.availableCards.find(option => contains(option.bounds, x, y));
    if (card && experienceSystem.spendPoints('enhancePoints', 1)) {
      this.enhancementSystem.applyEnhancement(card.type, card.tier, card.value);
      if (playerUpdateCallback) playerUpdateCallback(this.enhancementSystem.getPlayerStats());
      this.state.remainingSelections--;
      if (!this.state.remainingSelections) this.finish(experienceSystem);
      else this.state.availableCards = this.enhancementSystem.generateRandomEnhancements(3);
    }
    return true;
  }
}

module.exports = EnhancementComponent;

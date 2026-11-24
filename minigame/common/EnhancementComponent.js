const EnhancementSystem = require('./EnhancementSystem');
const { colors, bounds, label, contains, wrap, background, graphic, panel } = require('./GameUI');
const drawGlint = require('./CardGlint');
const inks = ['', '#402b18', '#263749', '#52300d', '#203955'];

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
    return true;
  }

  isShowing() { return this.state.isShowing; }
  isVisible() { return this.state.isShowing; }

  finish(experienceSystem) {
    const next = experienceSystem.getExperienceStatus().upgradePoints > 0 && this.upgradeCallback
      ? this.upgradeCallback : this.completeCallback;
    this.state.isShowing = false;
    this.state.availableCards = [];
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
    const rowHeight = Math.min(width / 3, (bottom - rowTop - 20) / 3);
    const cardWidth = rowHeight * 3;
    const left = (view.w - cardWidth) / 2;
    const phase = (Date.now() % 4100) / 4100;
    this.state.availableCards.forEach((card, i) => {
      const y = rowTop + i * (rowHeight + 10);
      card.bounds = { x: left, y, width: cardWidth, height: rowHeight };
      ctx.save();
      ctx.translate(left, y);
      ctx.scale(cardWidth / 600, rowHeight / 200);
      const ready = graphic(ctx, 'card.' + card.tier, 0, 0, 600, 200);
      if (!ready) panel(ctx, { x: 4, y: 30, width: 592, height: 145 }, '#e7d7b6', 15);
      else if (card.tier >= 3) drawGlint(ctx, card.tier, phase);
      graphic(ctx, 'enhancement.' + card.type, 53, 78, 56);
      const ink = inks[card.tier];
      ctx.font = '22px sans-serif';
      const lines = wrap(ctx, card.description, 368);
      label(ctx, card.name, 183, lines.length > 1 ? 78 : 88, 32, ink, 'left', true, 368);
      lines.forEach((line, index) => label(ctx, line, 184,
        lines.length > 1 ? 109 + index * 23 : 130, 22, ink, 'left', false, 368));
      ctx.restore();
    });
    ctx.restore();
  }

  handleTouch(x, y, experienceSystem, playerUpdateCallback) {
    if (!this.state.isShowing) return false;
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

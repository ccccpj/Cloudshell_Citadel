const GameConfig = require('./GameConfig');
const { colors, bounds, contains, panel, label, button, graphic } = require('./GameUI');

class LevelManager {
  constructor(canvas, systemInfo) {
    this.ctx = canvas.getContext('2d');
    this.systemInfo = systemInfo;
    this.currentLevel = 1;
    this.timeRemaining = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.showPauseMenu = false;
  }

  startLevel() {
    const config = GameConfig.LEVEL_CONFIG;
    this.timeRemaining = Math.min(config.BASE_TIME + (this.currentLevel - 1) * config.TIME_INCREMENT, config.MAX_TIME);
    this.tookDamage = false;
    this.isRunning = true;
    if (this.enemyComponent) this.enemyComponent.setLevel(this.currentLevel);
  }

  markPlayerHit() { this.tookDamage = true; }

  update(deltaSeconds) {
    if (!this.isRunning || this.isPaused) return;
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaSeconds);
    if (this.timeRemaining <= 1e-8) this.endLevel();
  }

  endLevel() {
    if (!this.isRunning) return;
    this.timeRemaining = 0;
    this.isRunning = false;
    if (this.levelCompleteCallback) this.levelCompleteCallback(this.currentLevel, !this.tookDamage);
  }

  nextLevel() {
    this.currentLevel++;
    this.startLevel();
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.showPauseMenu = this.isPaused;
  }

  restartGame() {
    if (this.gameStateManager) this.gameStateManager.restartGame();
    else {
      this.currentLevel = 1;
      this.isPaused = this.showPauseMenu = false;
      this.startLevel();
    }
  }

  exitToMenu() {
    this.isRunning = false;
    this.isPaused = this.showPauseMenu = false;
    if (this.gameStateManager) this.gameStateManager.setState('menu');
  }

  setGameStateManager(manager) { this.gameStateManager = manager; }
  setEnemyComponent(enemies) { this.enemyComponent = enemies; }
  setLevelCompleteCallback(callback) { this.levelCompleteCallback = callback; }
  setGameComponent(game) { this.gameComponent = game; }

  draw() {
    const ctx = this.ctx;
    const view = bounds(this.systemInfo);
    ctx.save();
    ctx.shadowBlur = 0;
    this.pauseButton = { x: Math.max(14, (view.w - 480) / 2), y: view.top, width: 48, height: 48 };
    const b = this.pauseButton;
    if (!graphic(ctx, 'action.pause', b.x + 4, b.y + 2, 39)) {
      panel(ctx, b, colors.surface, 12);
      ctx.fillStyle = colors.text;
      ctx.fillRect(b.x + 17, b.y + 15, 4, 18);
      ctx.fillRect(b.x + 27, b.y + 15, 4, 18);
    }
    if (this.showPauseMenu) this.drawPauseMenu(ctx, view);
    ctx.restore();
  }

  drawPauseMenu(ctx, view) {
    const { x, width, top, bottom, w, h } = view;
    const height = Math.min(476, bottom - top);
    const y = top + (bottom - top - height) / 2;
    ctx.fillStyle = 'rgba(8,27,32,.78)';
    ctx.fillRect(0, 0, w, h);
    panel(ctx, { x, y, width, height }, colors.surface, 18);
    label(ctx, '飞行暂停', x + 16, y + 31, 24, colors.text, 'left', true);
    label(ctx, '第 ' + this.currentLevel + ' 关', x + width - 16, y + 32, 15, colors.gold, 'right');
    const mainY = y + height - 120;
    if (this.gameComponent && this.gameComponent.player) {
      const source = this.gameComponent.enhancementComponent.enhancementSystem;
      const stats = source.getPlayerStats();
      const player = this.gameComponent.player;
      const fmt = n => String(Number(n.toFixed(1)));
      const lines = [
        ['生命', fmt(player.health) + '/' + fmt(player.maxHealth)], ['护盾', fmt(stats.shield)],
        ['攻击', fmt(stats.attackPower)], ['护甲', fmt(stats.armor)],
        ['暴击率', fmt(source.calculateCriticalRate()) + '%'], ['暴击伤害', fmt(source.calculateActualCriticalDamage()) + '%'],
        ['冷却加速', fmt(stats.cooldownAcceleration)], ['生命恢复', fmt(source.calculateHealthRegenPerSecond()) + '/秒'],
        ['同元素波上限', fmt(stats.waveCount)], ['波宽度', fmt(GameConfig.WAVE_CONFIG.LINE_WIDTH + stats.waveWidth)],
        ['幸运', fmt(stats.luckyValue)], ['积分', fmt(this.gameComponent.score)]
      ];
      const spacing = Math.min(31, (mainY - y - 116) / 6);
      lines.forEach(([name, val], i) => {
        const cellW = (width - 32) / 2;
        const cellX = x + 16 + (i % 2) * cellW;
        const cy = y + 62 + Math.floor(i / 2) * spacing;
        label(ctx, name, cellX, cy, 13, colors.muted);
        label(ctx, val, cellX + cellW - 8, cy, 14, colors.text, 'right', true);
      });
    }
    if (this.gameComponent) {
      const unlocked = this.gameComponent.upgradeSystem.unlockedWaves;
      label(ctx, '已解锁', x + 16, mainY - 54, 13, colors.muted);
      let left = x + 74;
      for (const wave of Object.keys(unlocked)) {
        if (unlocked[wave]) {
          graphic(ctx, 'skill.' + wave, left, mainY - 69, 30);
          left += 37;
        }
      }
    }
    const switchSeconds = GameConfig.WAVE_CONFIG.ELEMENT_SWITCH_MS / 1000;
    label(ctx, '元素切换间隔 ' + switchSeconds + ' 秒，普通波可穿插', x + 16, mainY - 19, 13, colors.muted);
    this.resume = { x: x + 12, y: mainY, width: width - 24, height: 48 };
    this.restart = { x: x + 12, y: mainY + 56, width: (width - 32) / 2, height: 48 };
    this.exit = { ...this.restart, x: this.restart.x + this.restart.width + 8 };
    button(ctx, this.resume, '继续飞行', true);
    button(ctx, this.restart, '重新开始');
    button(ctx, this.exit, '返回首页');
  }

  handleClick(x, y) {
    if (this.showPauseMenu) {
      if (contains(this.resume, x, y)) this.togglePause();
      else if (contains(this.restart, x, y)) this.restartGame();
      else if (contains(this.exit, x, y)) this.exitToMenu();
      return true;
    }
    if (contains(this.pauseButton, x, y)) {
      this.togglePause();
      return true;
    }
    return false;
  }

  getState() {
    return { currentLevel: this.currentLevel, timeRemaining: this.timeRemaining,
      isRunning: this.isRunning, isPaused: this.isPaused };
  }
}

module.exports = LevelManager;

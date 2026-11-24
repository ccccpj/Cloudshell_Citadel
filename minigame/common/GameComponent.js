const feedback = require('./Feedback');
const BattleView = require('./BattleView');
const Art = require('./Art');
const Collection = require('./Collection');
const { duration } = require('./FlightEffects');
const WaveComponent = require('./WaveComponent');
const EnemyComponent = require('./EnemyComponent');
const LevelManager = require('./LevelManager');
const ExperienceSystem = require('./ExperienceSystem');
const EnhancementComponent = require('./EnhancementComponent');
const UpgradeSystem = require('./UpgradeSystem');
const UpgradeComponent = require('./UpgradeComponent');
const GameConfig = require('./GameConfig');
const Utils = require('./Utils');
const ranks = require('./RankManager');
const video = require('./RewardedVideo');

const STEP = 1 / 60;
const WAVE_CLEAR_MS = 900;
const ELEMENTS = [
  ['wind', '风波', '#bedfcf'], ['fire', '火波', '#ff9c83'],
  ['normal', '普通波', '#83f2cf'], ['ice', '冰波', '#9cdcf3'],
  ['electric', '电波', '#f7c986']
];

class GameComponent {
  constructor(canvas, ctx, systemInfo) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.systemInfo = systemInfo;
    this.view = new BattleView(canvas, ctx, systemInfo);
    this.gameState = 'playing';
    this.elapsed = 0;
    this.lastElementButton = null;
    this.lastUpdateTime = Date.now();
    this.accumulator = 0;
    this.currentLevelKills = 0;
    this.score = 0;
    const saved = Number(Utils.getStorage('waveGameHighScore'));
    this.highScore = Number.isSafeInteger(saved) && saved > 0 ? saved : 0;
    this.previousBest = this.highScore;
    this.rankedRun = ranks.startRun();
    this.experienceSystem = new ExperienceSystem();
    this.enhancementComponent = new EnhancementComponent(canvas, systemInfo);
    this.formMask = 0;
    this.upgradeSystem = new UpgradeSystem();
    this.upgradeSystem.onUnlockWave = () => {
      this.formMask = Art.player.formMask(this.upgradeSystem.unlockedWaves);
      Collection.recordForm(this.formMask);
      this.setFormAction('unlock');
      this.coreEffect('unlock');
    };
    this.upgradeSystem.onAwaken = () => this.coreEffect('awaken');
    this.upgradeComponent = new UpgradeComponent(canvas, systemInfo);
    this.waveComponent = new WaveComponent(canvas);
    this.levelManager = new LevelManager(canvas, systemInfo);
    this.enemyComponent = new EnemyComponent(canvas);
    this.enemyComponent.rankedRun = this.rankedRun;
    this.enemyComponent.onSpawn = (enemy, level) => {
      if (Collection.recordEncounter(enemy.type, level, enemy)) {
        this.discovery = { species: Art.creatures.creatures.find(item => item.type === enemy.type), at: this.elapsed };
      }
    };
    const enhancements = this.enhancementComponent.enhancementSystem;
    this.levelManager.setEnemyComponent(this.enemyComponent);
    this.levelManager.setGameComponent(this);
    this.waveComponent.setEnhancementSystem(enhancements);
    this.waveComponent.setUpgradeSystem(this.upgradeSystem);
    this.enemyComponent.setEnhancementSystem(enhancements);
    this.enemyComponent.setUpgradeSystem(this.upgradeSystem);
    this.enemyComponent.setWaveComponent(this.waveComponent);
    this.levelManager.setLevelCompleteCallback((level, perfect) => this.completeLevel(level, perfect));
    this.enemyComponent.setEnemyKilledCallback((points, type) => {
      this.score += points;
      this.savePersonalBest();
      this.currentLevelKills++;
      this.experienceSystem.gainExpFromEnemy(type, this.levelManager.currentLevel);
    });
    this.experienceSystem.addEventListener('onLevelUp', () => {
      this.sound('LEVEL_UP');
      this.coreEffect('level-up');
    });
    this.experienceSystem.addEventListener('onPointsGain', () => this.sound('POINTS_GAIN'));
    const cfg = GameConfig.PLAYER_CONFIG;
    const field = GameConfig.BATTLEFIELD;
    this.player = { x: field.width / 2, y: field.height / 2, radius: cfg.SIZE,
      health: cfg.INITIAL_HEALTH, maxHealth: cfg.MAX_HEALTH, lastHealthRegenTime: 0 };
    this.reviveState = { used: false, isShowingAd: false };
    this.gameOverMessage = { text: '', until: 0 };
    this.waveButtons = ELEMENTS.map(([type, label, color]) => ({ type, label, color, lastUseTime: -Infinity }));
    this.resize();
    this.levelManager.startLevel();
  }

  setFormAction(name) {
    this.formAction = { name, start: this.elapsed };
  }

  coreEffect(id) {
    this.enemyComponent.showVisual(id, this.player, this.player.radius * 3.6);
  }

  isDefeatAnimating() {
    return this.gameState === 'gameOver' && this.defeatAge < duration(Art.forms.sheet.animations.defeat);
  }

  sound(key) {
    const config = GameConfig.AUDIO_CONFIG;
    feedback.playSound(config.AUDIO_PATHS[key], config.SOUND_VOLUME * config.MASTER_VOLUME * 0.7);
  }

  resize() {
    const { width, height } = this.canvas;
    const spacing = Math.min(80, (width - 20) / 5);
    this.waveButtons.forEach((button, index) => {
      button.x = width / 2 + (index - 2) * spacing;
      button.y = height - (this.systemInfo.safeBottom || 0) - 62;
      button.radius = Math.max(22, Math.min(30, spacing * 0.39));
    });
    this.view.resize();
  }

  completeLevel(level, perfect) {
    this.checkpoint();
    this.experienceSystem.gainExpFromLevel(level, perfect);
    const points = this.currentLevelKills > 0 ? Math.min(3, 1 + Math.floor(this.currentLevelKills / (6 + level))) : 0;
    if (points) this.experienceSystem.addEnhancePoints(points);
    this.waveClear = { elapsed: 0 };
    this.currentLevelKills = 0;
  }

  advanceWaveClear(milliseconds) {
    const wipe = this.waveClear;
    const previous = wipe.elapsed;
    wipe.elapsed += milliseconds;
    // Swap the live scene while the cloud bank fills the viewport.
    const coveredAt = WAVE_CLEAR_MS / 2;
    if (previous < coveredAt && wipe.elapsed >= coveredAt) this.openLevelRewards();
    if (wipe.elapsed >= WAVE_CLEAR_MS) this.waveClear = null;
  }

  openLevelRewards() {
    const next = () => {
      this.levelManager.nextLevel();
      this.resetFrameClock();
    };
    const upgrades = () => this.upgradeComponent.showUpgradeScreen(this.upgradeSystem, this.experienceSystem, next);
    const status = this.experienceSystem.getExperienceStatus();
    if (status.enhancePoints > 0) this.enhancementComponent.showEnhancementScreen(this.experienceSystem, upgrades, next);
    else if (status.upgradePoints > 0) upgrades();
    else next();
  }

  savePersonalBest() {
    if (this.score > this.highScore && Utils.setStorage('waveGameHighScore', String(this.score))) this.highScore = this.score;
  }

  checkpoint() {
    this.savePersonalBest();
    ranks.record(Math.max(this.score, this.highScore), this.rankedRun);
  }

  setGameStateManager(manager) {
    this.gameStateManager = manager;
    this.levelManager.setGameStateManager(manager);
  }

  get playing() {
    return this.gameState === 'playing' && !this.waveClear && this.levelManager.isRunning && !this.levelManager.isPaused &&
      !this.enhancementComponent.isVisible() && !this.upgradeComponent.isVisible();
  }

  waveCooldown(type) {
    if ((type === 'normal' && this.upgradeSystem.hasAwakening(type, 'instantCast')) ||
        (type === 'wind' && this.upgradeSystem.hasAwakening(type, 'endlessWind'))) return 0;
    const base = GameConfig.WAVE_CONFIG.TYPES[type].cooldown;
    return Math.max(50, base * this.upgradeSystem.getWaveCooldownMultiplier(type) *
      this.enhancementComponent.enhancementSystem.calculateCooldownReduction());
  }

  get elementSwitchMs() {
    return GameConfig.WAVE_CONFIG.ELEMENT_SWITCH_MS *
      this.enhancementComponent.enhancementSystem.calculateCooldownReduction();
  }

  waveRecovery(button) {
    const duration = this.waveCooldown(button.type);
    const remaining = Math.max(0, duration - (this.elapsed - button.lastUseTime));
    if (button.type !== 'normal' && this.lastElementButton && this.lastElementButton !== button) {
      const switchMs = this.elementSwitchMs;
      const switchRemaining = switchMs - (this.elapsed - this.lastElementButton.lastUseTime);
      if (switchRemaining > remaining) return { remaining: switchRemaining, duration: switchMs, switching: true };
    }
    return { remaining, duration, switching: false };
  }

  fireAt(x, y) {
    if (!this.playing) return false;
    const button = this.waveButtons.find(b => Math.hypot(x - b.x, y - b.y) <= b.radius + 3);
    if (!button) return false;
    if (!this.upgradeSystem.isWaveUnlocked(button.type)) {
      this.hint = '在关末升级中解锁' + button.label;
      this.hintUntil = this.elapsed + 1200;
      return true;
    }
    if (this.waveRecovery(button).remaining > 0.01) return true;
    button.lastUseTime = this.elapsed;
    if (button.type !== 'normal') this.lastElementButton = button;
    this.waveComponent.createWave(button.type, this.player.x, this.player.y);
    this.setFormAction('cast');
    this.coreEffect('cast-' + button.type);
    this.sound('WAVE_RELEASE');
    feedback.vibrate('light');
    if (button.type === 'fire' && this.upgradeSystem.hasAwakening('fire', 'phoenixRebirth')) {
      this.phoenixReadyAt = this.elapsed + this.waveCooldown(button.type);
    }
    if (button.type === 'electric' && this.upgradeSystem.hasAwakening('electric', 'thunderStrike') && Math.random() < 0.25) {
      this.createRadialWaves('electric', 3, 36);
    }
    return true;
  }

  createRadialWaves(type, count, distance) {
    for (let i = 0; i < count; i++) {
      const angle = 2 * Math.PI * i / count;
      this.waveComponent.createWave(type, this.player.x + Math.cos(angle) * distance,
        this.player.y + Math.sin(angle) * distance, true);
    }
  }

  handleTouch(x, y) {
    if (this.waveClear) return;
    if (this.gameState === 'gameOver') {
      if (this.reviveState.isShowingAd) return;
      const action = this.view.resultActionAt(x, y);
      if (action === 'revive') this.tryReviveByAd();
      if (action === 'finish') this.reviveDeclined = true;
      if (action === 'restart') this.gameStateManager.restartGame();
      if (action === 'rank') ranks.open();
      if (action === 'menu') this.gameStateManager.setState('menu');
      return;
    }
    if (this.enhancementComponent.isVisible()) {
      this.enhancementComponent.handleTouch(x, y, this.experienceSystem, stats => {
        this.coreEffect('enhance');
        if (stats.maxHealth > this.player.maxHealth) this.player.health += stats.maxHealth - this.player.maxHealth;
        this.player.maxHealth = stats.maxHealth;
      });
      return;
    }
    if (this.upgradeComponent.isVisible()) {
      this.upgradeComponent.handleClick(x, y, this.upgradeSystem, this.experienceSystem);
      return;
    }
    const paused = this.levelManager.isPaused;
    if (!this.levelManager.handleClick(x, y)) this.fireAt(x, y);
    if (paused && !this.levelManager.isPaused) this.resetFrameClock();
  }

  resetFrameClock() {
    this.lastUpdateTime = Date.now();
    this.accumulator = 0;
  }

  update() {
    const now = Date.now();
    const delta = Math.min(0.25, Math.max(0, (now - this.lastUpdateTime) / 1000));
    this.lastUpdateTime = now;
    if (!this.playing) {
      if (this.waveClear) this.advanceWaveClear(delta * 1000);
      else if (this.isDefeatAnimating()) this.defeatAge += delta * 1000;
      this.accumulator = 0;
      return;
    }
    this.accumulator += delta;
    while (this.accumulator + 1e-9 >= STEP && this.playing) {
      this.accumulator -= STEP;
      this.step(STEP);
    }
  }

  step(seconds) {
    this.elapsed += seconds * 1000;
    const enhancements = this.enhancementComponent.enhancementSystem;
    const regenInterval = enhancements.calculateHealthRegenInterval() * 1000;
    const regenTicks = Math.floor((this.elapsed - this.player.lastHealthRegenTime + 1e-7) / regenInterval);
    if (regenTicks > 0) {
      if (this.player.health < this.player.maxHealth) this.coreEffect('heal');
      this.player.health = Math.min(this.player.maxHealth, this.player.health + regenTicks);
      this.player.lastHealthRegenTime += regenTicks * regenInterval;
    }
    if (this.phoenixReadyAt != null && this.elapsed >= this.phoenixReadyAt) {
      this.phoenixReadyAt = null;
      this.coreEffect('phoenix');
      this.createRadialWaves('fire', 8, 80);
    }
    this.waveComponent.update(seconds);
    this.enemyComponent.update(seconds);
    this.enemyComponent.checkWaveCollisions(this.waveComponent.getWaves());
    const damage = this.enemyComponent.checkPlayerCollision(this.player);
    if (damage > 0) {
      const before = this.player.health;
      this.player.health = Math.max(0, before - damage);
      const recent = this.impact && this.elapsed - this.impact.at < 220;
      this.impact = {
        at: this.elapsed, before: recent ? this.impact.before : before,
        lost: (recent ? this.impact.lost : 0) + before - this.player.health
      };
      this.setFormAction('hit');
      this.levelManager.markPlayerHit();
      if (this.player.health <= 0) {
        this.handlePlayerDeath();
        return;
      }
    }
    this.levelManager.update(seconds);
  }

  handlePlayerDeath() {
    this.gameState = 'gameOver';
    this.defeatAge = 0;
    this.view.actions = [];
    this.levelManager.isPaused = true;
    this.sound('GAME_OVER');
    if (this.score > this.previousBest) this.sound('NEW_RECORD');
    this.checkpoint();
    ranks.recordFlight(this);
  }

  async tryReviveByAd() {
    if (this.reviveState.used || this.reviveState.isShowingAd || this.gameState !== 'gameOver') return;
    this.reviveState.isShowingAd = true;
    try {
      if (await video.play()) this.performAdRevive();
      else this.setGameOverMessage('视频未看完，可重试或重新挑战');
    } catch (error) {
      this.setGameOverMessage('暂无可用广告，可稍后重试');
    } finally {
      this.reviveState.isShowingAd = false;
    }
  }

  setGameOverMessage(text) {
    this.gameOverMessage = { text, until: Date.now() + 3800 };
  }

  performAdRevive() {
    if (this.reviveState.used || this.gameState !== 'gameOver') return;
    this.reviveState.used = true;
    this.enemyComponent.clearEnemies();
    this.waveComponent.clearAllWaves();
    this.player.health = this.player.maxHealth;
    this.impact = null;
    this.setFormAction('revive');
    this.coreEffect('revive');
    this.player.lastHealthRegenTime = this.elapsed;
    this.levelManager.isPaused = false;
    this.gameState = 'playing';
    this.resetFrameClock();
  }

  draw() {
    if (this.gameState === 'gameOver') {
      if (this.isDefeatAnimating()) {
        this.view.drawArena(this);
        this.view.drawHud(this);
        return;
      }
      this.view.drawResult(this, video.available() && !this.reviveState.used && !this.reviveDeclined);
      return;
    }
    if (this.enhancementComponent.isVisible()) {
      this.enhancementComponent.draw(this.ctx);
    } else if (this.upgradeComponent.isVisible()) {
      this.upgradeComponent.draw(this.ctx);
    } else {
      this.view.drawArena(this);
      this.view.drawHud(this);
      this.levelManager.draw();
    }
    if (this.waveClear) this.view.drawWaveClear(this.waveClear.elapsed / WAVE_CLEAR_MS);
  }
}

module.exports = GameComponent;

const Art = require('./Art');
const { drawEffect } = require('./FlightEffects');
// 波组件
const GameConfig = require('./GameConfig.js');

class WaveComponent {
  constructor(canvas, field = GameConfig.BATTLEFIELD) {
    this.ctx = canvas.getContext('2d');
    this.field = field;
    this.waves = [];
    this.vortices = [];
    this.elapsed = 0;
    this.enhancementSystem = null; // 强化系统引用
    this.upgradeSystem = null; // 升级系统引用
    this.frostGrounds = []; // 冰霜地面效果
    this.polarStorms = []; // 极地风暴效果
  }
  
  // 设置强化系统引用
  setEnhancementSystem(enhancementSystem) {
    this.enhancementSystem = enhancementSystem;
  }
  
  // 设置升级系统引用
  setUpgradeSystem(upgradeSystem) {
    this.upgradeSystem = upgradeSystem;
  }

  reach(type) {
    const multiplier = this.upgradeSystem ? this.upgradeSystem.getWaveRangeMultiplier(type) : 1;
    return this.field.width * GameConfig.WAVE_CONFIG.MAX_RADIUS_RATIO * multiplier;
  }

  // 创建新的光波
  createWave(type, playerX, playerY, bonus = false) {
    // 检查波是否已解锁（普通波始终可用）
    if (type !== 'normal' && this.upgradeSystem && !this.upgradeSystem.isWaveUnlocked(type)) {
      console.log(`波类型 ${type} 尚未解锁`);
      return;
    }
    
    const waveConfig = GameConfig.WAVE_CONFIG;
    
    // 获取强化后的属性
    const maxRadius = this.reach(type);
    let maxWaves = waveConfig.MAX_CONCURRENT_WAVES;
    let waveWidth = waveConfig.LINE_WIDTH; // 波的宽度
    
    if (this.upgradeSystem) {
      // 应用升级系统的波宽度强化（直接像素值增加）
      const widthBonus = this.upgradeSystem.getWaveWidthBonus(type);
      waveWidth += widthBonus;
    }
    
    if (this.enhancementSystem) {
      const stats = this.enhancementSystem.getPlayerStats();
      // 应用强化系统的波宽度强化（直接像素值增加）
      waveWidth += stats.waveWidth;
      // 应用波数量强化
      maxWaves = Math.max(1, stats.waveCount);
    }
    
    // 应用升级系统的速度强化
    let waveSpeed = waveConfig.SPEED;
    if (this.upgradeSystem) {
      const speedMultiplier = this.upgradeSystem.getWaveSpeedMultiplier(type);
      waveSpeed *= speedMultiplier;
    }

    if (!bonus) {
      const active = this.waves.filter(wave => !wave.bonus && wave.type === type);
      if (active.length >= maxWaves) {
        const replace = this.upgradeSystem?.hasZeroCooldown(type)
          ? active.find(wave => wave.radius >= wave.maxRadius)
          : active[0];
        if (!replace) return false;
        this.waves.splice(this.waves.indexOf(replace), 1);
      }
    }

    const wave = {
      id: this.elapsed + Math.random(), // 唯一ID
      x: playerX,
      y: playerY,
      radius: 0,
      startedAt: this.elapsed,
      maxRadius: maxRadius,
      alpha: 1.0,
      speed: waveSpeed,
      type: type,
      width: waveWidth, // 波的宽度
      bonus,
      touchingEnemies: new Map(), // 存储接触的敌人ID和相关伤害信息
      penetratedEnemies: new Set(), // 存储已穿透的敌人ID（用于穿透风暴觉醒技能）
      // 无限扩散觉醒技能相关
      hasInfiniteSpread: this.upgradeSystem && this.upgradeSystem.hasAwakening('normal', 'infiniteSpread') && type === 'normal',
      persistStartTime: null, // 持续存在开始时间
      persistDuration: 5000, // 持续5秒
      // 冰川时代觉醒技能相关
      hasIceAge: this.upgradeSystem && this.upgradeSystem.hasAwakening('ice', 'iceAge') && type === 'ice',
      frostGroundCreated: false, // 是否已创建冰霜地面
      // 极地风暴觉醒技能相关
      hasPolarStorm: this.upgradeSystem && this.upgradeSystem.hasAwakening('ice', 'polarStorm') && type === 'ice',
      polarStormTriggered: false // 是否已触发极地风暴
    };
    
    // 极地风暴觉醒技能：30%几率触发
    if (wave.hasPolarStorm && Math.random() < 0.3) {
      this.triggerPolarStorm(playerX, playerY);
      wave.polarStormTriggered = true;
    }
    if (type === 'wind' && this.upgradeSystem && this.upgradeSystem.hasAwakening('wind', 'stormEye')) {
      // 同一中心重复释放风波时刷新龙卷风的持续时间。
      const existing = this.vortices.find(v => v.x === playerX && v.y === playerY);
      if (existing) existing.endTime = this.elapsed + 3000;
      else this.vortices.push({ x: playerX, y: playerY, radius: 76, endTime: this.elapsed + 3000, nextTick: this.elapsed });
    }
    this.waves.push(wave);
    return true;
  }

  // 更新光波状态
  update(deltaSeconds) {
    this.elapsed += deltaSeconds * 1000;
    this.vortices = this.vortices.filter(v => v.endTime > this.elapsed);
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      
      // 光波扩散
      wave.previousRadius = wave.radius;
      if (wave.radius >= wave.maxRadius && !wave.hasInfiniteSpread) {
        this.waves.splice(i, 1);
        continue;
      }
      wave.radius = Math.min(wave.maxRadius, wave.radius + wave.speed * deltaSeconds);
      
      // 冰川时代觉醒技能：创建冰霜地面
      if (wave.hasIceAge && wave.radius >= wave.maxRadius && !wave.frostGroundCreated) {
        this.createFrostGround(wave.x, wave.y, wave.maxRadius);
        wave.frostGroundCreated = true;
      }
      
      // 处理无限扩散觉醒技能
      if (wave.hasInfiniteSpread && wave.radius >= wave.maxRadius) {
        if (wave.persistStartTime === null) {
          wave.persistStartTime = this.elapsed;
        }
        
        // 持续存在期间保持最大半径和透明度
        wave.radius = wave.maxRadius;
        wave.alpha = 0.8; // 保持较高透明度
        
        // 检查是否超过持续时间
        if (this.elapsed - wave.persistStartTime > wave.persistDuration) {
          this.waves.splice(i, 1);
          continue;
        }
      } else {
        // 透明度随半径减少
        wave.alpha = 1 - (wave.radius / wave.maxRadius);
      }
    }
    
    // 更新冰霜地面效果
    this.updateFrostGrounds();
    
    // 更新极地风暴效果
    this.updatePolarStorms(deltaSeconds);
  }

  draw() {
    const ctx = this.ctx;
    for (const area of this.frostGrounds) {
      drawEffect(ctx, 'frost-ground', this.elapsed - area.startTime, area.x, area.y,
        area.radius * 2, area.radius * 2, 0, area.alpha);
    }
    for (const vortex of this.vortices) {
      drawEffect(ctx, 'vortex', this.elapsed, vortex.x, vortex.y, vortex.radius * 2);
    }
    for (const wave of this.waves) {
      const clip = Art.fxById['wave-' + wave.type], image = Art.image(clip.file);
      Art.player.drawWave(ctx, image, clip, this.elapsed - wave.startedAt, wave.x, wave.y,
        wave.radius, wave.width, wave.alpha);
    }
    for (const area of this.polarStorms) {
      drawEffect(ctx, 'polar-storm', this.elapsed - area.startTime, area.x, area.y,
        area.radius * 2, area.radius * 2, 0, area.alpha);
    }
  }

  // 获取当前光波数量
  getWaveCount() {
    return this.waves.length;
  }

  // 获取所有光波（用于碰撞检测）
  getWaves() {
    return this.waves;
  }

  // 清除所有光波
  clearAllWaves() {
    this.waves = [];
    this.vortices = [];
    this.frostGrounds = [];
    this.polarStorms = [];
  }

  // 创建冰霜地面效果
  createFrostGround(x, y, radius) {
    const frostGround = {
      x: x,
      y: y,
      radius: radius,
      alpha: 0.6,
      duration: 8000, // 持续8秒
      startTime: this.elapsed,
      slowEffect: 0.5 // 减速50%
    };
    this.frostGrounds.push(frostGround);
  }

  // 更新冰霜地面效果
  updateFrostGrounds() {
    for (let i = this.frostGrounds.length - 1; i >= 0; i--) {
      const frost = this.frostGrounds[i];
      const elapsed = this.elapsed - frost.startTime;
      
      // 透明度随时间减少
      frost.alpha = 0.6 * (1 - elapsed / frost.duration);
      
      // 移除过期的冰霜地面
      if (elapsed > frost.duration || frost.alpha <= 0) {
        this.frostGrounds.splice(i, 1);
      }
    }
  }

  // 触发极地风暴
  triggerPolarStorm(x, y) {
    const storm = {
      x: x,
      y: y,
      radius: 0,
      maxRadius: 120,
      alpha: 1.0,
      duration: 3000, // 持续3秒
      startTime: this.elapsed,
      hit: new Set()
    };
    
    this.polarStorms.push(storm);
  }

  // 更新极地风暴效果
  updatePolarStorms(deltaSeconds) {
    for (let i = this.polarStorms.length - 1; i >= 0; i--) {
      const storm = this.polarStorms[i];
      const elapsed = this.elapsed - storm.startTime;
      
      // 风暴扩散
      if (storm.radius < storm.maxRadius) {
        storm.radius = Math.min(storm.maxRadius, storm.radius + 120 * deltaSeconds);
      }
      
      // 透明度随时间减少
      storm.alpha = 1 - (elapsed / storm.duration);
      
      // 移除过期的风暴
      if (elapsed > storm.duration || storm.alpha <= 0) {
        this.polarStorms.splice(i, 1);
      }
    }
  }

  // 获取冰霜地面效果（供敌人组件使用）
  getFrostGrounds() {
    return this.frostGrounds;
  }

  // 获取极地风暴效果（供敌人组件使用）
  getPolarStorms() {
    return this.polarStorms;
  }
}

module.exports = WaveComponent;
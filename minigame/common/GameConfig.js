// 游戏配置文件 - 统一管理所有游戏数值
class GameConfig {
  // 波的配置
  static get WAVE_CONFIG() {
    return {
      // 通用波属性
      ELEMENT_SWITCH_MS: 850,    // 两次不同元素出波之间的间隔，普通波不占用
      LINE_WIDTH: 2,              // 波的线条宽度
      SPEED: 180,                 // 波的扩散速度（逻辑像素/秒）
      MAX_RADIUS_RATIO: 0.6,      // 基础射程占逻辑战场宽度的比例
      MAX_CONCURRENT_WAVES: 1,   // 每种类型同时在场的手动波初始上限
      
      // 伤害相关
      DAMAGE_PER_WAVE: 10,        // 每次波造成的伤害值
      DAMAGE_INTERVAL: 100,        // 波造成伤害的间隔时间（毫秒）
      DAMAGE_EFFECT_DURATION: 200, // 受伤效果持续时间（毫秒）
      
      // 不同类型波的特殊属性
      TYPES: {
        normal: {
          color: '#83f2cf',
          shadowBlur: 2,
          damageMultiplier: 1.0,    // 伤害倍数
          penetration: 0,           // 穿透力（忽略护甲的百分比）
          cooldown: 2150            // 冷却时间（毫秒）
        },
        wind: {
          color: '#bedfcf',
          shadowBlur: 2,
          damageMultiplier: 0.8,
          penetration: 0.2,
          segments: 60,             // 风波的分段数
          waveOffset: 3,            // 波浪偏移量
          knockbackForce: 30,       // 击退力度
          knockbackDuration: 500,   // 击退持续时间（毫秒）
          cooldown: 5000            // 冷却时间（毫秒）
        },
        fire: {
          color: '#ff9c83',
          shadowBlur: 2,
          damageMultiplier: 1.5,
          penetration: 0.1,
          burnDuration: 3000,       // 燃烧持续时间（毫秒）
          burnDamage: 5,            // 燃烧每秒伤害
          cooldown: 5000            // 冷却时间（毫秒）
        },
        ice: {
          color: '#9cdcf3',
          shadowBlur: 2,
          damageMultiplier: 0.9,
          penetration: 0,
          segments: 24,             // 冰刺分段数
          spikeOffset: 4,           // 尖刺偏移量
          slowEffect: 0.5,          // 减速效果（速度倍数）
          slowDuration: 2000,       // 减速持续时间（毫秒）
          cooldown: 5000            // 冷却时间（毫秒）
        },
        electric: {
          color: '#f7c986',
          shadowBlur: 2,
          damageMultiplier: 1.2,
          penetration: 0.3,
          chainRange: 50,           // 连锁攻击范围
          chainDamage: 0.5,         // 连锁伤害倍数
          cooldown: 5000            // 冷却时间（毫秒）
        }
      }
    };
  }
  
  // 敌人配置
  static get ENEMY_CONFIG() {
    return {
      // 通用敌人属性
      DEFAULT_SIZE: 15,           // 默认敌人半径
      SPAWN_EDGE_MARGIN: 20,      // 生成边缘距离
      MAX_CONCURRENT_ENEMIES: 100, // 同时存在的最大敌人数量
      
      // 敌人类型配置
      TYPES: {
        // 基础敌人
        basic: {
          health: 50,
          impactDamage: 30,
          speed: 18.0,
          size: 15,
          color: '#e4a294',
          resistances: [],          // 对哪些波类型有抗性
          immunities: [],           // 对哪些波类型免疫
          scoreValue: 10,           // 击败后获得的分数
          armor: 5                  // 护甲值
        },
        
        // 快速敌人（橙色）
        fast: {
          health: 38,
          impactDamage: 23,
          speed: 30.0,
          size: 12,
          color: '#f0bf8b',
          scoreValue: 15,
          armor: 3                  // 护甲值
        },
        
        // 坦克敌人
        tank: {
          health: 126,
          impactDamage: 49,
          speed: 10.0,
          size: 20,
          color: '#bb837f',
          scoreValue: 30,
          armor: 15                 // 护甲值
        },
        
        // 火焰敌人（红色）
        fireResistant: {
          health: 66,
          impactDamage: 33,
          speed: 20.0,
          size: 16,
          color: '#e58d75',
          scoreValue: 20,
          armor: 8                  // 护甲值
        },
        
        // 冰霜敌人
        iceImmune: {
          health: 60,
          impactDamage: 31,
          speed: 16.0,
          size: 14,
          color: '#9ebbc6',
          scoreValue: 25,
          armor: 6                  // 护甲值
        },
        
        // 电系敌人（黄色）
        electricResistant: {
          health: 72,
          impactDamage: 34,
          speed: 14.0,
          size: 17,
          color: '#d9bb86',
          scoreValue: 22,
          armor: 10                 // 护甲值
        },
        
        // 精英敌人
        elite: {
          health: 172,
          impactDamage: 48,
          speed: 22.0,
          size: 25,
          color: '#c8a9ba',
          scoreValue: 50,
          armor: 25                 // 护甲值
        },
        
        // 幽灵敌人
        ghost: {
          health: 50,
          impactDamage: 27,
          speed: 26.0,
          size: 13,
          color: '#bdccce',
          resistances: [],          // 对哪些波类型有抗性
          immunities: ['normal', 'wind', 'fire', 'ice'], // 免疫普通、风、火、冰波，只能被电系伤害
          scoreValue: 35,
          armor: 2                  // 护甲值
        },
        
        // 护盾敌人
        shielded: {
          health: 92,
          impactDamage: 38,
          speed: 16.0,
          size: 18,
          color: '#91b6b4',
          scoreValue: 28,
          shield: 20,               // 护盾值
          armor: 12                 // 护甲值
        },
        
        // Boss敌人
        boss: {
          health: 340,
          impactDamage: 65,
          speed: 12.0,
          size: 35,
          color: '#ec9b89',
          scoreValue: 100,
          shield: 50,               // 护盾值
          armor: 40                 // 护甲值
        }
      }
    };
  }
  
  // 玩家配置
  static get PLAYER_CONFIG() {
    return {
      // 基础属性
      MAX_HEALTH: 100,            // 最大生命值
      INITIAL_HEALTH: 100,        // 初始生命值
      SIZE: 20,                   // 玩家半径
      COLOR: '#0080ff',           // 玩家颜色
      
      // 战斗属性
      ARMOR: 0,                   // 护甲值（减少受到的伤害）
      CRITICAL_RATE: 0.05,        // 暴击率（5%）
      CRITICAL_MULTIPLIER: 2.0,   // 暴击伤害倍数
      
      // 恢复属性
      HEALTH_REGEN_PER_SECOND: 1, // 每秒生命回复
      HEALTH_REGEN_INTERVAL: 1000, // 生命回复间隔（毫秒）
      
      // 技能属性
      WAVE_COOLDOWN: 100          // 波发射冷却时间（毫秒）
    };
  }
  
  // 关卡配置
  static get LEVEL_CONFIG() {
    return {
      BASE_TIME: 20,              // 第一关基础时间（秒）
      TIME_INCREMENT: 5,          // 每关时间增加（秒）
      MAX_TIME: 100,              // 最大关卡时间（秒）
      
      // 敌人生成配置
      BASE_SPAWN_INTERVAL: 1150,  // 基础敌人生成间隔（毫秒）
      SPAWN_INTERVAL_DECREASE: 65, // 每关生成间隔减少（毫秒）
      MIN_SPAWN_INTERVAL: 420,    // 最小生成间隔（毫秒）
      
      // 难度递增
      ENEMY_HEALTH_MULTIPLIER: 1.1, // 每关敌人生命值倍数
      ENEMY_SPEED_MULTIPLIER: 1.05,  // 每关敌人速度倍数
      SCORE_MULTIPLIER: 1.2       // 每关分数倍数
    };
  }
  
  // 游戏系统配置
  static get SYSTEM_CONFIG() {
    return {
      FPS: 60,                    // 游戏帧率
      CANVAS_BACKGROUND: '#000011', // 画布背景色
      
      // 网格背景
      GRID_SIZE: 50,              // 网格大小
      GRID_COLOR: 'rgba(0, 255, 255, 0.3)', // 网格颜色
      GRID_LINE_WIDTH: 1,         // 网格线宽
      
      // UI配置
      UI_FONT_FAMILY: 'Arial',    // UI字体
      UI_PRIMARY_COLOR: '#00ffff', // 主要UI颜色
      UI_SECONDARY_COLOR: '#ffffff', // 次要UI颜色
      
      // 音效配置
      SOUND_ENABLED: true,        // 是否启用音效
      MUSIC_ENABLED: true,        // 是否启用背景音乐
      MASTER_VOLUME: 0.7          // 主音量
    };
  }
  
  // 音频配置
  static get AUDIO_CONFIG() {
    return {
      // 音频开关
      SOUND_ENABLED: true,        // 音效开关
      MUSIC_ENABLED: true,        // 背景音乐开关
      
      // 音量设置
      MASTER_VOLUME: 1.0,         // 主音量 (0.0 - 1.0)
      MUSIC_VOLUME: 0.3,          // 背景音乐音量 (0.0 - 1.0)
      SOUND_VOLUME: 0.7,          // 音效音量 (0.0 - 1.0)
      
      // 音频文件路径
      AUDIO_PATHS: {
        BACKGROUND_MUSIC: 'assets/audio/flight-loop.wav',
        
        // 游戏音效
        WAVE_RELEASE: 'assets/audio/error_004.m4a',     // 波发射 - 轻击音效
        LEVEL_UP: 'assets/audio/confirmation_001.m4a',            // 升级 - 钟声
        POINTS_GAIN: 'assets/audio/drop_002.m4a',        // 得分 - 轻金属音
        ENEMY_DEATH: 'assets/audio/click_003.m4a',        // 敌人死亡 - 玻璃破碎
        GAME_OVER: 'assets/audio/close_004.m4a',          // 游戏结束 - 重金属音
        NEW_RECORD: 'assets/audio/question_003.m4a',          // 新纪录 - 庆祝钟声
        GAME_START: 'assets/audio/select_004.m4a'         // 游戏开始 - 冲击音
      }
    };
  }

  // 特效配置
  static get EFFECT_CONFIG() {
    return {
      // 粒子效果
      PARTICLE_COUNT: 20,         // 粒子数量
      PARTICLE_LIFE: 1000,        // 粒子生命周期（毫秒）
      
      // 屏幕震动
      SCREEN_SHAKE_DURATION: 200, // 屏幕震动持续时间（毫秒）
      SCREEN_SHAKE_INTENSITY: 5,  // 屏幕震动强度
      
      // 闪光效果
      FLASH_DURATION: 100,        // 闪光持续时间（毫秒）
      FLASH_INTENSITY: 0.5        // 闪光强度
    };
  }
  
  // 获取指定关卡的敌人配置
  static getEnemyConfigForLevel(type, level) {
    const config = this.ENEMY_CONFIG;
    const levelConfig = this.LEVEL_CONFIG;
    const enemyConfig = config.TYPES[type];
    
    if (!enemyConfig) {
      throw new Error(`Unknown enemy type: ${type}`);
    }
    
    // 根据关卡调整敌人属性
    const healthMultiplier = Math.pow(levelConfig.ENEMY_HEALTH_MULTIPLIER, level - 1);
    const speedMultiplier = Math.pow(levelConfig.ENEMY_SPEED_MULTIPLIER, level - 1);
    const armorMultiplier = Math.pow(levelConfig.ENEMY_HEALTH_MULTIPLIER, level - 1); // 护甲值按照生命值倍数递增
    
    return {
      ...enemyConfig,
      health: Math.floor(enemyConfig.health * healthMultiplier),
      speed: enemyConfig.speed * speedMultiplier,
      impactDamage: enemyConfig.impactDamage * (1 + 0.08 * (level - 1)),
      scoreValue: Math.floor(enemyConfig.scoreValue * Math.pow(levelConfig.SCORE_MULTIPLIER, level - 1)),
      armor: Math.floor(enemyConfig.armor * armorMultiplier)
    };
  }
  
  // 获取指定关卡的生成间隔
  static getSpawnIntervalForLevel(level) {
    const config = this.LEVEL_CONFIG;
    const interval = config.BASE_SPAWN_INTERVAL - (level - 1) * config.SPAWN_INTERVAL_DECREASE;
    return Math.max(interval, config.MIN_SPAWN_INTERVAL);
  }
  
  // 检查敌人对波的抗性
  static checkWaveResistance(enemy, waveType) {
    if (!enemy || !enemy.resistances || !enemy.immunities) {
      return { resistant: false, immune: false };
    }
    
    return {
      resistant: enemy.resistances.includes(waveType),
      immune: enemy.immunities.includes(waveType)
    };
  }
  
  // 计算实际伤害（考虑抗性、护甲、暴击等）
  static calculateDamage(baseDamage, waveType, enemy, isCritical = false, criticalDamage = null, upgradeSystem = null, hitCount = 1, penetrationCount = 0) {
    const waveConfig = this.WAVE_CONFIG.TYPES[waveType];
    const resistance = this.checkWaveResistance(enemy, waveType);
    
    // 检查纯净之力觉醒技能（普通波真实伤害）
    const hasPureForce = upgradeSystem && upgradeSystem.hasAwakening('normal', 'pureForce') && waveType === 'normal';
    
    // 免疫检查（纯净之力可以无视免疫）
    if (resistance.immune && !hasPureForce) {
      return 0;
    }
    
    const multiplier = upgradeSystem ? upgradeSystem.getWaveDamageMultiplier(waveType) : waveConfig.damageMultiplier;
    let damage = baseDamage * multiplier;
    const storm = waveType === 'wind' && upgradeSystem && upgradeSystem.hasAwakening('wind', 'penetratingStorm');
    if (storm) damage *= 1 + penetrationCount * 0.2;

    if (upgradeSystem) {
      if (hitCount > 1) damage *= 1 + upgradeSystem.getGroupDamageBonus(waveType) * (hitCount - 1);
      if (waveType === 'wind' && upgradeSystem.hasAwakening('wind', 'endlessWind')) damage *= 0.7;
    }

    const upgradedPenetration = upgradeSystem ? upgradeSystem.getWavePenetrationBonus(waveType) : 0;
    const penetration = Math.max(waveConfig.penetration, upgradedPenetration);
    if (resistance.resistant && !hasPureForce && !storm) damage *= 1 - 0.5 * (1 - penetration);
    if (enemy.armor > 0 && !hasPureForce) damage *= 100 / (100 + enemy.armor * (1 - penetration));

    // 暴击计算
    if (isCritical) {
      const criticalMultiplier = criticalDamage ? (criticalDamage / 100) : this.PLAYER_CONFIG.CRITICAL_MULTIPLIER;
      damage *= criticalMultiplier;
    }
    
    return Math.floor(damage);
  }
  
  // 根据关卡难度随机生成敌人防御属性
  static generateRandomDefenses(level) {
    const waveTypes = ['normal', 'wind', 'fire', 'ice', 'electric'];
    const resistances = [];
    const immunities = [];
    
    // 基础概率（随关卡增加）
    const baseResistanceChance = Math.min(0.1 + (level - 1) * 0.02, 0.4); // 最高40%
    const baseImmunityChance = Math.min(0.05 + (level - 1) * 0.01, 0.2);  // 最高20%
    
    // 每种波类型都有机会获得防御
    for (const waveType of waveTypes) {
      const resistanceRoll = Math.random();
      const immunityRoll = Math.random();
      
      // 前五关不出现免疫敌人
      if (level <= 5) {
        if (resistanceRoll < baseResistanceChance) {
          // 前五关只能获得抗性，不能获得免疫
          resistances.push(waveType);
        }
      } else {
        if (immunityRoll < baseImmunityChance) {
          // 免疫优先级更高
          immunities.push(waveType);
        } else if (resistanceRoll < baseResistanceChance) {
          // 如果没有免疫，可能获得抗性
          resistances.push(waveType);
        }
      }
    }
    
    // 限制最大防御数量（避免过于强大）
    const maxDefenses = Math.min(2 + Math.floor(level / 5), 4);
    const totalDefenses = resistances.length + immunities.length;
    
    if (totalDefenses > maxDefenses) {
      // 随机移除多余的防御，优先保留免疫
      const allDefenses = [...immunities.map(type => ({type, isImmune: true})), 
                          ...resistances.map(type => ({type, isImmune: false}))];
      
      // 打乱并截取
      for (let i = allDefenses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allDefenses[i], allDefenses[j]] = [allDefenses[j], allDefenses[i]];
      }
      
      const selectedDefenses = allDefenses.slice(0, maxDefenses);
      resistances.length = 0;
      immunities.length = 0;
      
      selectedDefenses.forEach(defense => {
        if (defense.isImmune) {
          immunities.push(defense.type);
        } else {
          resistances.push(defense.type);
        }
      });
    }
    
    return { resistances, immunities };
  }
  static get COMPLIANCE_CONFIG() {
    return {
      APPROVAL_NUMBER: '',
      PUBLICATION_NUMBER: '',
      COPYRIGHT_REG_NO: '2025SR2207935',
      HEALTH_ADVICE_TEXT: '抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。',
      AGE_LABEL: '适龄提示：8+'
    };
  }
}

GameConfig.BATTLEFIELD = Object.freeze({ width: 375, height: 667 });

module.exports = GameConfig;

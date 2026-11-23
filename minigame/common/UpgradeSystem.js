/**
 * 升级系统 - 管理波属性升级和解锁
 * 实现波的解锁、升级树、升级点消耗等功能
 */

class UpgradeSystem {
    constructor() {
        // 波解锁状态
        this.unlockedWaves = {
            normal: true,    // 普通波默认解锁
            wind: false,     // 风波需要解锁
            fire: false,     // 火波需要解锁
            ice: false,      // 冰波需要解锁
            electric: false  // 电波需要解锁
        };
        
        // 波升级等级
        this.waveUpgrades = {
            normal: {
                damage: 0,      // 伤害等级 0-5
                range: 0,       // 范围等级 0-3
                cooldown: 0,    // 冷却等级 0-3
                penetration: 0, // 穿透等级 0-3
                width: 0,       // 宽度等级 0-3
                awakening: []   // 觉醒技能列表
            },
            wind: {
                damage: 0,
                range: 0,
                cooldown: 0,
                knockback: 0,   // 击退强化等级 0-3
                knockbackDuration: 0, // 击退持续等级 0-3
                penetration: 0,
                groupDamage: 0, // 风压增强等级 0-2
                speed: 0,       // 疾风加速等级 0-2
                awakening: []
            },
            fire: {
                damage: 0,
                range: 0,
                cooldown: 0,
                burnDamage: 0,  // 燃烧强化等级 0-3
                burnDuration: 0, // 燃烧持续等级 0-3
                burnSpread: 0,  // 燃烧扩散等级 0-3
                penetration: 0, // 火焰穿透等级 0-2
                explosion: 0,   // 爆炸威力等级 0-2
                awakening: []
            },
            ice: {
                damage: 0,
                range: 0,
                cooldown: 0,
                slow: 0,        // 减速强化等级 0-3
                slowDuration: 0, // 减速持续等级 0-3
                armor: 0,       // 冰霜护甲等级 0-3
                penetration: 0, // 冰系穿透等级 0-2
                resonance: 0,   // 冰晶共鸣等级 0-2
                awakening: []
            },
            electric: {
                damage: 0,
                range: 0,
                cooldown: 0,
                penetration: 0,
                chainRange: 0,  // 连锁范围等级 0-3
                chainDamage: 0, // 连锁伤害等级 0-3
                chainCount: 0,  // 连锁次数等级 0-3
                groupDamage: 0, // 电弧增强等级 0-2
                awakening: []
            }
        };
        
        // 升级配置
        this.upgradeConfig = {
            // 解锁成本（按解锁顺序递增，与元素无关）
            getUnlockCostByOrder: (unlockOrder) => {
                // 首个元素2点，后续元素为8、18、32点
                return 2 * unlockOrder * unlockOrder;
            },
            
            // 基础升级成本（等级递增：1级1点，2级2点...）
            getUpgradeCost: (currentLevel) => {
                return currentLevel + 1;
            },
            
            // 觉醒技能成本
            awakeningCost: 8
        };
        
        // 觉醒技能定义
        this.awakeningSkills = {
            normal: {
                pureForce: {
                    name: "纯净之力",
                    description: "普通波对所有敌人造成真实伤害",
                    requirements: { damage: 5 },
                    unlocked: false
                },
                infiniteSpread: {
                    name: "无限扩散",
                    description: "普通波到达最大半径后不消失，持续存在5秒",
                    requirements: { width: 3 },
                    unlocked: false
                },
                instantCast: {
                    name: "瞬发",
                    description: "普通波无冷却时间",
                    requirements: { cooldown: 3 },
                    unlocked: false
                }
            },
            wind: {
                stormEye: {
                    name: "风暴之眼",
                    description: "风系波中心产生持续的龙卷风效果",
                    requirements: { damage: 5, knockback: 3 },
                    unlocked: false
                },
                penetratingStorm: {
                    name: "穿透风暴",
                    description: "风系波穿透敌人后伤害递增20%",
                    requirements: { penetration: 3 },
                    unlocked: false
                },
                chainKnockback: {
                    name: "连环击退",
                    description: "被击退的敌人撞击其他敌人时造成伤害",
                    requirements: { knockbackDuration: 3 },
                    unlocked: false
                },
                endlessWind: {
                    name: "无尽疾风",
                    description: "风系波无冷却时间，但伤害降低30%",
                    requirements: { cooldown: 3, speed: 2 },
                    unlocked: false
                }
            },
            fire: {
                flameBurst: {
                    name: "烈焰爆发",
                    description: "敌人燃烧死亡时爆炸，造成范围伤害",
                    requirements: { damage: 5, burnDamage: 3 },
                    unlocked: false
                },
                eternalFire: {
                    name: "永恒之火",
                    description: "燃烧效果不会自然消失，只能被冰系效果驱散",
                    requirements: { burnDuration: 3 },
                    unlocked: false
                },
                fireChain: {
                    name: "火焰链",
                    description: "燃烧的敌人之间产生火焰连线，造成持续伤害",
                    requirements: { burnSpread: 3 },
                    unlocked: false
                },
                phoenixRebirth: {
                    name: "凤凰涅槃",
                    description: "火系波冷却完成时，自动在玩家周围产生火环",
                    requirements: { cooldown: 3, explosion: 2 },
                    unlocked: false
                }
            },
            ice: {
                absoluteZero: {
                    name: "绝对零度",
                    description: "减速效果达到90%时变为冻结效果",
                    requirements: { damage: 5, slow: 3 },
                    unlocked: false
                },
                iceAge: {
                    name: "冰川时代",
                    description: "冰系波覆盖区域产生持续的冰霜地面",
                    requirements: { slowDuration: 3 },
                    unlocked: false
                },
                crystalShatter: {
                    name: "冰晶爆裂",
                    description: "冻结的敌人死亡时产生冰晶碎片，对周围敌人造成伤害",
                    requirements: { armor: 3 },
                    unlocked: false
                },
                polarStorm: {
                    name: "极地风暴",
                    description: "冰系波触发时有30%几率产生冰暴，持续减速周围敌人",
                    requirements: { cooldown: 3, resonance: 2 },
                    unlocked: false
                }
            },
            electric: {
                thunderGod: {
                    name: "雷神之怒",
                    description: "连锁攻击有几率触发闪电风暴",
                    requirements: { damage: 5, chainCount: 3 },
                    unlocked: false
                },
                empPulse: {
                    name: "电磁脉冲",
                    description: "电系波对护盾造成双倍伤害",
                    requirements: { penetration: 3, chainRange: 3 },
                    unlocked: false
                },
                infiniteChain: {
                    name: "无限连锁",
                    description: "连锁攻击不再有次数限制，但每次连锁伤害递减10%",
                    requirements: { chainDamage: 3 },
                    unlocked: false
                },
                thunderStrike: {
                    name: "雷霆万钧",
                    description: "电系波释放时有25%几率同时释放3道闪电",
                    requirements: { cooldown: 3, groupDamage: 2 },
                    unlocked: false
                }
            }
        };
    }
    
    /**
     * 检查波是否已解锁
     */
    isWaveUnlocked(waveType) {
        return this.unlockedWaves[waveType] || false;
    }
    
    /**
     * 获取波解锁成本
     */
    getUnlockCost(waveType) {
        if (waveType === 'normal') {
            return 0; // 普通波默认解锁，无需成本
        }
        
        // 计算当前已解锁的波数量（不包括普通波）
        const unlockedCount = Object.keys(this.unlockedWaves).filter(wave => 
            wave !== 'normal' && this.unlockedWaves[wave]
        ).length;
        
        // 下一个解锁的顺序（从1开始）
        const nextUnlockOrder = unlockedCount + 1;
        
        return this.upgradeConfig.getUnlockCostByOrder(nextUnlockOrder);
    }
    
    /**
     * 解锁波
     */
    unlockWave(waveType) {
        if (waveType === 'normal') {
            return true; // 普通波默认解锁
        }
        
        if (!this.unlockedWaves[waveType]) {
            this.unlockedWaves[waveType] = true;
            if (this.onUnlockWave) this.onUnlockWave(waveType);
            console.log(`解锁了${waveType}波`);
            return true;
        }
        return false;
    }
    
    /**
     * 获取波的升级等级
     */
    getWaveUpgradeLevel(waveType, upgradeType) {
        if (!this.waveUpgrades[waveType]) {
            return 0;
        }
        return this.waveUpgrades[waveType][upgradeType] || 0;
    }
    
    /**
     * 升级波属性
     */
    upgradeWave(waveType, upgradeType) {
        if (!this.isWaveUnlocked(waveType)) {
            return false;
        }
        
        if (!this.waveUpgrades[waveType]) {
            return false;
        }
        
        const currentLevel = this.waveUpgrades[waveType][upgradeType] || 0;
        const maxLevel = this.getMaxUpgradeLevel(upgradeType, waveType);
        
        if (currentLevel < maxLevel) {
            this.waveUpgrades[waveType][upgradeType] = currentLevel + 1;
            console.log(`${waveType}波的${upgradeType}升级到${currentLevel + 1}级`);
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取升级类型的最大等级
     */
    getMaxUpgradeLevel(upgradeType, waveType) {
        if (upgradeType === 'penetration' && (waveType === 'fire' || waveType === 'ice')) return 2;
        const maxLevels = {
            damage: 5,
            range: 3,
            cooldown: 3,
            penetration: 3,
            width: 3,
            knockback: 3,
            knockbackDuration: 3,
            groupDamage: 2,
            speed: 2,
            burnDamage: 3,
            burnDuration: 3,
            burnSpread: 3,
            explosion: 2,
            slow: 3,
            slowDuration: 3,
            armor: 3,
            resonance: 2,
            chainRange: 3,
            chainDamage: 3,
            chainCount: 3
        };
        
        return maxLevels[upgradeType] || 3;
    }
    
    /**
     * 获取升级成本
     */
    getUpgradeCost(waveType, upgradeType) {
        const currentLevel = this.getWaveUpgradeLevel(waveType, upgradeType);
        return this.upgradeConfig.getUpgradeCost(currentLevel);
    }
    
    /**
     * 检查觉醒技能是否可解锁
     */
    canUnlockAwakening(waveType, skillKey) {
        const skill = this.awakeningSkills[waveType] && this.awakeningSkills[waveType][skillKey];
        if (!skill || skill.unlocked) {
            return false;
        }
        
        // 检查前置条件
        for (const [upgradeType, requiredLevel] of Object.entries(skill.requirements)) {
            if (this.getWaveUpgradeLevel(waveType, upgradeType) < requiredLevel) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 解锁觉醒技能
     */
    unlockAwakening(waveType, skillKey) {
        if (!this.canUnlockAwakening(waveType, skillKey)) {
            return false;
        }
        
        const skill = this.awakeningSkills[waveType][skillKey];
        skill.unlocked = true;
        if (this.onAwaken) this.onAwaken(waveType, skillKey);
        
        // 添加到波的觉醒技能列表
        if (!this.waveUpgrades[waveType].awakening.includes(skillKey)) {
            this.waveUpgrades[waveType].awakening.push(skillKey);
        }
        
        console.log(`解锁了${waveType}波的觉醒技能：${skill.name}`);
        return true;
    }
    
    /**
     * 检查觉醒技能是否已解锁
     */
    hasAwakening(waveType, skillKey) {
        return this.waveUpgrades[waveType] && this.waveUpgrades[waveType].awakening.includes(skillKey);
    }
    
    /**
     * 获取已解锁的觉醒技能列表
     */
    getUnlockedAwakenings(waveType) {
        return this.waveUpgrades[waveType] ? this.waveUpgrades[waveType].awakening : [];
    }
    
    // 移除旧的升级选项生成方法
    
    /**
     * 获取波类型的中文名称
     */
    getWaveTypeName(waveType) {
        const names = {
            normal: '普通波',
            wind: '风波',
            fire: '火波',
            ice: '冰波',
            electric: '电波'
        };
        return names[waveType] || waveType;
    }
    
    /**
     * 获取升级类型的中文名称
     */
    getUpgradeTypeName(upgradeType) {
        const names = {
            damage: '伤害',
            range: '范围',
            cooldown: '冷却',
            penetration: '穿透',
            width: '宽度',
            knockback: '击退强化',
            knockbackDuration: '击退持续',
            groupDamage: '群体增强',
            speed: '速度加成',
            burnDamage: '燃烧强化',
            burnDuration: '燃烧持续',
            burnSpread: '燃烧扩散',
            explosion: '爆炸威力',
            slow: '减速强化',
            slowDuration: '减速持续',
            armor: '冰霜护甲',
            resonance: '冰晶共鸣',
            chainRange: '连锁范围',
            chainDamage: '连锁伤害',
            chainCount: '连锁次数'
        };
        return names[upgradeType] || upgradeType;
    }
    
    /**
     * 获取罗马数字
     */
    getRomanNumeral(num) {
        const numerals = ['', 'I', 'II', 'III', 'IV', 'V'];
        return numerals[num] || num.toString();
    }
    
    /**
     * 获取升级描述
     */
    getUpgradeDescription(waveType, upgradeType, level) {
        // 这里可以根据具体的升级类型和等级返回详细描述
        // 暂时返回简单描述
        return `提升${this.getWaveTypeName(waveType)}的${this.getUpgradeTypeName(upgradeType)}到${this.getRomanNumeral(level)}级`;
    }
    
    // 移除旧的升级选项应用方法
    
    /**
     * 获取所有已解锁的波
     */
    getUnlockedWaves() {
        return Object.keys(this.unlockedWaves).filter(type => this.unlockedWaves[type]);
    }
    
    /**
     * 获取波的所有升级信息
     */
    getWaveUpgradeInfo(waveType) {
        return this.waveUpgrades[waveType] || {};
    }
    
    /**
     * 获取波伤害强化倍数
     * @param {string} waveType - 波类型
     * @returns {number} 伤害倍数
     */
    getWaveDamageMultiplier(waveType) {
        const damageLevel = this.getWaveUpgradeLevel(waveType, 'damage');
        
        // 根据波类型和伤害等级计算倍数
        const damageMultipliers = {
            normal: [1.0, 1.1, 1.25, 1.4, 1.6, 1.8],  // 0-5级
            wind: [0.8, 0.9, 1.0, 1.15, 1.3, 1.5],    // 0-5级
            fire: [1.5, 1.65, 1.8, 2.0, 2.25, 2.5],   // 0-5级
            ice: [0.9, 1.0, 1.15, 1.3, 1.5, 1.7],     // 0-5级
            electric: [1.2, 1.35, 1.5, 1.7, 2.0, 2.3] // 0-5级
        };
        
        const multipliers = damageMultipliers[waveType];
        if (!multipliers) {
            return 1.0; // 默认倍数
        }
        
        return multipliers[damageLevel] || multipliers[0];
    }
    
    /**
     * 获取波范围强化倍数
     * @param {string} waveType - 波类型
     * @returns {number} 范围增加的倍数（如1.15表示增加15%）
     */
    getWaveRangeMultiplier(waveType) {
        const rangeLevel = this.getWaveUpgradeLevel(waveType, 'range');
        
        // 根据README，所有波类型的范围强化都是按百分比增加
        // 普通波没有明确说明，按照其他波的模式设定
        const rangeMultipliers = {
            normal: [1.0, 1.15, 1.30, 1.50],     // 0-3级：+0% → +15% → +30% → +50%
            wind: [1.0, 1.15, 1.30, 1.50],       // 0-3级：+0% → +15% → +30% → +50%
            fire: [1.0, 1.15, 1.30, 1.50],       // 0-3级：+0% → +15% → +30% → +50%
            ice: [1.0, 1.15, 1.30, 1.50],        // 0-3级：+0% → +15% → +30% → +50%
            electric: [1.0, 1.15, 1.30, 1.50]    // 0-3级：+0% → +15% → +30% → +50%
        };
        
        const multipliers = rangeMultipliers[waveType];
        if (!multipliers) {
            return 1.0; // 默认无加成
        }
        
        return multipliers[rangeLevel] || multipliers[0];
    }
    
    /**
     * 获取波冷却时间倍数
     * @param {string} waveType - 波类型
     * @returns {number} 冷却时间倍数（小于1表示冷却时间减少）
     */
    getWaveCooldownMultiplier(waveType) {
        const cooldownLevel = this.getWaveUpgradeLevel(waveType, 'cooldown');
        
        // 冷却时间强化：每级减少冷却时间
        const cooldownMultipliers = {
            normal: [1.0, 0.9, 0.8, 0.7],        // 0-3级：-0% → -10% → -20% → -30%
            wind: [1.0, 0.9, 0.8, 0.7],          // 0-3级：-0% → -10% → -20% → -30%
            fire: [1.0, 0.9, 0.8, 0.7],          // 0-3级：-0% → -10% → -20% → -30%
            ice: [1.0, 0.9, 0.8, 0.7],           // 0-3级：-0% → -10% → -20% → -30%
            electric: [1.0, 0.9, 0.8, 0.7]       // 0-3级：-0% → -10% → -20% → -30%
        };
        
        const multipliers = cooldownMultipliers[waveType];
        if (!multipliers) {
            return 1.0; // 默认无减少
        }
        
        return multipliers[cooldownLevel] || multipliers[0];
    }
    
    /**
     * 获取波穿透力加成
     * @param {string} waveType - 波类型
     * @returns {number} 穿透力加成（0-1之间的数值，表示穿透百分比）
     */
    getWavePenetrationBonus(waveType) {
        const penetrationLevel = this.getWaveUpgradeLevel(waveType, 'penetration');
        
        // 根据README中的描述，不同波类型有不同的穿透力加成
        const penetrationBonuses = {
            normal: [0, 0.1, 0.2, 0.3],          // 0-3级：0% → 10% → 20% → 30%
            wind: [0, 0.25, 0.45, 0.65],         // 0-3级：0% → 25% → 45% → 65%
            fire: [0, 0.3, 0.55],                // 0-2级：0% → 30% → 55%
            ice: [0, 0.25, 0.45],                 // 0-2级：0% → 25% → 45%
            electric: [0, 0.3, 0.45, 0.6]        // 0-3级：0% → 30% → 45% → 60%
        };
        
        const bonuses = penetrationBonuses[waveType];
        if (!bonuses) {
            return 0; // 默认无穿透
        }
        
        return bonuses[penetrationLevel] || bonuses[0];
    }

    /**
     * 获取波宽度强化加成
     * @param {string} waveType - 波类型
     * @returns {number} 宽度增加的像素值
     */
    getWaveWidthBonus(waveType) {
        const widthLevel = this.getWaveUpgradeLevel(waveType, 'width');
        
        // 波宽度强化：每级增加固定像素值
        const widthBonuses = {
            normal: [0, 5, 10, 15],               // 0-3级：+0 → +5 → +10 → +15像素
            wind: [0, 5, 10, 15],                 // 0-3级：+0 → +5 → +10 → +15像素
            fire: [0, 5, 10, 15],                 // 0-3级：+0 → +5 → +10 → +15像素
            ice: [0, 5, 10, 15],                  // 0-3级：+0 → +5 → +10 → +15像素
            electric: [0, 5, 10, 15]              // 0-3级：+0 → +5 → +10 → +15像素
        };
        
        const bonuses = widthBonuses[waveType];
        if (!bonuses) {
            return 0; // 默认无加成
        }
        
        return bonuses[widthLevel] || bonuses[0];
    }
    

    
    /**
     * 获取风系波击退强化倍数
     * @param {string} waveType - 波类型
     * @returns {number} 击退强化倍数
     */
    getKnockbackMultiplier(waveType) {
        if (waveType !== 'wind') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'knockback');
        const multipliers = [1, 1.3, 1.6, 2.0]; // +30% → +60% → +100%
        return multipliers[level] || 1;
    }

    /**
     * 获取风系波击退持续时间倍数
     * @param {string} waveType - 波类型
     * @returns {number} 击退持续时间倍数
     */
    getKnockbackDurationMultiplier(waveType) {
        if (waveType !== 'wind') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'knockbackDuration');
        const multipliers = [1, 1.5, 2.0, 2.5]; // +50% → +100% → +150%
        return multipliers[level] || 1;
    }

    /**
     * 获取火系波燃烧伤害
     * @param {string} waveType - 波类型
     * @returns {number} 燃烧伤害值
     */
    getBurnDamage(waveType) {
        if (waveType !== 'fire') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'burnDamage');
        const damages = [5, 7, 9, 12];
        return damages[level] || 0;
    }

    /**
     * 获取火系波燃烧持续时间
     * @param {string} waveType - 波类型
     * @returns {number} 燃烧持续时间（秒）
     */
    getBurnDuration(waveType) {
        if (waveType !== 'fire') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'burnDuration');
        const durations = [3, 4, 5, 6];
        return durations[level] || 0;
    }

    /**
     * 获取火系波燃烧扩散范围
     * @param {string} waveType - 波类型
     * @returns {number} 燃烧扩散范围（像素）
     */
    getBurnSpreadRange(waveType) {
        if (waveType !== 'fire') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'burnSpread');
        const ranges = [30, 40, 55, 70];
        return ranges[level] || 0;
    }

    /**
     * 获取冰系波减速效果
     * @param {string} waveType - 波类型
     * @returns {number} 减速效果（0-1，数值越小减速越强）
     */
    getSlowEffect(waveType) {
        if (waveType !== 'ice') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'slow');
        const effects = [0.5, 0.4, 0.25, 0.1];
        return effects[level] || 1;
    }

    /**
     * 获取冰系波减速持续时间
     * @param {string} waveType - 波类型
     * @returns {number} 减速持续时间（秒）
     */
    getSlowDuration(waveType) {
        if (waveType !== 'ice') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'slowDuration');
        const durations = [2, 3, 4, 5];
        return durations[level] || 0;
    }

    /**
     * 获取冰霜护甲伤害加成
     * @param {string} waveType - 波类型
     * @returns {number} 伤害加成倍数
     */
    getIceArmorDamageBonus(waveType) {
        if (waveType !== 'ice') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'armor');
        const bonuses = [1, 1.15, 1.3, 1.5]; // +15% → +30% → +50%
        return bonuses[level] || 1;
    }

    /**
     * 获取电系波连锁攻击范围
     * @param {string} waveType - 波类型
     * @returns {number} 连锁攻击范围（像素）
     */
    getChainRange(waveType) {
        if (waveType !== 'electric') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'chainRange');
        const ranges = [50, 60, 75, 90];
        return ranges[level] || 0;
    }

    /**
     * 获取电系波连锁伤害倍数
     * @param {string} waveType - 波类型
     * @returns {number} 连锁伤害倍数
     */
    getChainDamageMultiplier(waveType) {
        if (waveType !== 'electric') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'chainDamage');
        const multipliers = [0.5, 0.6, 0.7, 0.8];
        return multipliers[level] || 0;
    }

    /**
     * 获取电系波连锁次数
     * @param {string} waveType - 波类型
     * @returns {number} 最大连锁次数
     */
    getChainCount(waveType) {
        if (waveType !== 'electric') return 0;
        const level = this.getWaveUpgradeLevel(waveType, 'chainCount');
        const counts = [1, 2, 3, 4];
        return counts[level] || 0;
    }

    /**
     * 获取风系波扩散速度倍数
     * @param {string} waveType - 波类型
     * @returns {number} 扩散速度倍数
     */
    getWaveSpeedMultiplier(waveType) {
        if (waveType !== 'wind') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'speed');
        const multipliers = [1, 1.4, 1.8]; // +40% → +80%
        return multipliers[level] || 1;
    }

    /**
     * 获取群体伤害递增加成
     * @param {string} waveType - 波类型
     * @returns {number} 群体伤害递增百分比
     */
    getGroupDamageBonus(waveType) {
        const level = this.getWaveUpgradeLevel(waveType, 'groupDamage');
        if (waveType === 'wind') {
            const bonuses = [0, 0.1, 0.2]; // +10% → +20%
            return bonuses[level] || 0;
        } else if (waveType === 'electric') {
            const bonuses = [0, 0.15, 0.3]; // +15% → +30%
            return bonuses[level] || 0;
        }
        return 0;
    }

    /**
     * 获取爆炸威力加成
     * @param {string} waveType - 波类型
     * @returns {number} 爆炸威力倍数
     */
    getExplosionPowerMultiplier(waveType) {
        if (waveType !== 'fire') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'explosion');
        const multipliers = [1, 1.5, 2.0]; // +50% → +100%
        return multipliers[level] || 1;
    }

    /**
     * 获取冰晶共鸣额外伤害
     * @param {string} waveType - 波类型
     * @returns {number} 对已减速敌人的额外伤害倍数
     */
    getIceResonanceBonus(waveType) {
        if (waveType !== 'ice') return 1;
        const level = this.getWaveUpgradeLevel(waveType, 'resonance');
        const bonuses = [1, 1.25, 1.5]; // +25% → +50%
        return bonuses[level] || 1;
    }

    /**
     * 重置升级系统
     */
    reset() {
        // 重置解锁状态
        this.unlockedWaves = {
            normal: true,
            wind: false,
            fire: false,
            ice: false,
            electric: false
        };
        
        // 重置所有升级等级
        Object.keys(this.waveUpgrades).forEach(waveType => {
            Object.keys(this.waveUpgrades[waveType]).forEach(upgradeType => {
                if (upgradeType === 'awakening') {
                    this.waveUpgrades[waveType][upgradeType] = [];
                } else {
                    this.waveUpgrades[waveType][upgradeType] = 0;
                }
            });
        });
        
        // 重置觉醒技能
        Object.keys(this.awakeningSkills).forEach(waveType => {
            Object.keys(this.awakeningSkills[waveType]).forEach(skillKey => {
                this.awakeningSkills[waveType][skillKey].unlocked = false;
            });
        });
        
        console.log('升级系统已重置');
    }
}

module.exports = UpgradeSystem;
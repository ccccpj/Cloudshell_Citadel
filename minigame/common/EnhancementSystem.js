/**
 * 主体强化系统 - 管理玩家属性强化的核心逻辑
 * 包括卡片等级概率、数值叠加计算、生命恢复算法等
 */

class EnhancementSystem {
    constructor() {
        // 玩家基础属性
        this.playerStats = {
            maxHealth: 100,        // 最大生命值
            currentHealth: 100,    // 当前生命值
            attackPower: 10,       // 攻击力
            criticalRate: 5,       // 暴击率（数值，非百分比）
            criticalDamage: 150,   // 暴击伤害（百分比）
            cooldownAcceleration: 0,  // 冷却加速（数值）
            shield: 0,             // 护盾值
            armor: 0,              // 护甲值
            healthRegen: 100,      // 生命恢复（数值，影响恢复间隔）
            waveCount: 1,          // 波数量
            luckyValue: 0,         // 幸运值
            waveWidth: 0         // 波宽度（像素值）
        };

        // 卡片等级定义
        this.cardTiers = {
            BASIC: 1,     // 基础卡片
            ADVANCED: 2,  // 高级卡片
            ELITE: 3,     // 精英卡片
            LEGENDARY: 4  // 传说卡片
        };

        // 基础卡片出现概率（不含幸运值加成）
        this.baseCardProbabilities = {
            [this.cardTiers.BASIC]: 80,      // 80%
            [this.cardTiers.ADVANCED]: 13,   // 13%
            [this.cardTiers.ELITE]: 6,      // 6%
            [this.cardTiers.LEGENDARY]: 1    // 1%
        };

        // 强化卡片配置
        this.enhancementCards = {
            // 生命强化系列 - 百分比增加
            health: {
                name: "生命强化",
                values: {
                    [this.cardTiers.BASIC]: { min: 5, max: 10 },
                    [this.cardTiers.ADVANCED]: { min: 10, max: 15 },
                    [this.cardTiers.ELITE]: { min: 15, max: 25 },
                    [this.cardTiers.LEGENDARY]: { min: 25, max: 35 }
                },
                isPercentage: true
            },
            // 攻击力提升系列 - 百分比增加
            attack: {
                name: "攻击力提升",
                values: {
                    [this.cardTiers.BASIC]: { min: 5, max: 9 },
                    [this.cardTiers.ADVANCED]: { min: 9, max: 14 },
                    [this.cardTiers.ELITE]: { min: 14, max: 21 },
                    [this.cardTiers.LEGENDARY]: { min: 21, max: 30 }
                },
                isPercentage: true
            },
            // 暴击率提升系列
            critRate: {
                name: "暴击率提升",
                values: {
                    [this.cardTiers.BASIC]: { min: 1, max: 5 },
                    [this.cardTiers.ADVANCED]: { min: 5, max: 10 },
                    [this.cardTiers.ELITE]: { min: 10, max: 20 },
                    [this.cardTiers.LEGENDARY]: { min: 20, max: 30 }
                }
            },
            // 暴击伤害提升系列
            critDamage: {
                name: "暴击伤害提升",
                values: {
                    [this.cardTiers.BASIC]: { min: 1, max: 5 },
                    [this.cardTiers.ADVANCED]: { min: 5, max: 10 },
                    [this.cardTiers.ELITE]: { min: 10, max: 20 },
                    [this.cardTiers.LEGENDARY]: { min: 20, max: 30 }
                }
            },
            // 冷却加速系列
            cooldown: {
                name: "冷却加速",
                values: {
                    [this.cardTiers.BASIC]: { min: 10, max: 15 },
                    [this.cardTiers.ADVANCED]: { min: 15, max: 20 },
                    [this.cardTiers.ELITE]: { min: 20, max: 30 },
                    [this.cardTiers.LEGENDARY]: { min: 30, max: 50 }
                }
            },
            // 护盾掌握系列 - 基于当前生命值百分比
            shield: {
                name: "护盾掌握",
                values: {
                    [this.cardTiers.BASIC]: 15,
                    [this.cardTiers.ADVANCED]: 25,
                    [this.cardTiers.ELITE]: 35,
                    [this.cardTiers.LEGENDARY]: 50
                },
                isHealthPercentage: true
            },
            // 生命恢复强化系列
            healthRegen: {
                name: "生命恢复强化",
                values: {
                    [this.cardTiers.BASIC]: 20,
                    [this.cardTiers.ADVANCED]: 40,
                    [this.cardTiers.ELITE]: 70,
                    [this.cardTiers.LEGENDARY]: 120
                }
            },
            // 波数量系列 - 只有精英和传说
            waveCount: {
                name: "波波波",
                values: {
                    [this.cardTiers.ELITE]: 1,
                    [this.cardTiers.LEGENDARY]: 2
                }
            },
            // 幸运值系列
            lucky: {
                name: "幸运值提升",
                values: {
                    [this.cardTiers.BASIC]: 20,
                    [this.cardTiers.ADVANCED]: 40,
                    [this.cardTiers.ELITE]: 70,
                    [this.cardTiers.LEGENDARY]: 120
                }
            },
            // 波宽度系列
            waveWidth: {
                name: "波宽度增强",
                values: {
                    [this.cardTiers.BASIC]: 1,
                    [this.cardTiers.ADVANCED]: 2,
                    [this.cardTiers.ELITE]: 3,
                    [this.cardTiers.LEGENDARY]: 5
                }
            },
            // 护甲强化系列
            armor: {
                name: "护甲强化",
                values: {
                    [this.cardTiers.BASIC]: 15,
                    [this.cardTiers.ADVANCED]: 20,
                    [this.cardTiers.ELITE]: 35,
                    [this.cardTiers.LEGENDARY]: 100
                }
            }
        };
    }

    /**
     * 计算幸运值影响后的卡片概率
     * @param {number} luckyValue - 当前幸运值
     * @returns {Object} 各等级卡片的概率
     */
    calculateCardProbabilities(luckyValue = this.playerStats.luckyValue) {
        const probabilities = { ...this.baseCardProbabilities };
        
        // 幸运值加成：额外概率 = 幸运值/(100 + 幸运值)
        const extraProbability = this.calculateLuckyExtraProbability(luckyValue);
        const bonusToDistribute = extraProbability * 100; // 转换为百分比
        
        if (bonusToDistribute > 0) {
            probabilities[this.cardTiers.BASIC] -= bonusToDistribute * 0.5;
            probabilities[this.cardTiers.ADVANCED] += bonusToDistribute * 0.3;
            probabilities[this.cardTiers.ELITE] += bonusToDistribute * 0.15;
            probabilities[this.cardTiers.LEGENDARY] += bonusToDistribute * 0.05;
        }
        
        // 确保概率不为负数
        Object.keys(probabilities).forEach(tier => {
            probabilities[tier] = Math.max(0, probabilities[tier]);
        });
        
        return probabilities;
    }

    /**
     * 随机选择卡片等级
     * @param {number} luckyValue - 当前幸运值
     * @returns {number} 选中的卡片等级
     */
    selectRandomCardTier(luckyValue, availableTypes = Object.keys(this.enhancementCards)) {
        const probabilities = this.calculateCardProbabilities(luckyValue);
        const tiers = Object.keys(probabilities).filter(tier =>
            availableTypes.some(type => this.enhancementCards[type].values[tier] !== undefined)
        );
        const total = tiers.reduce((sum, tier) => sum + probabilities[tier], 0);
        let roll = Math.random() * total;
        for (const tier of tiers) {
            roll -= probabilities[tier];
            if (roll < 0) return Number(tier);
        }
        return Number(tiers[tiers.length - 1]);
    }

    /**
     * 格式化数字显示 - 只有有小数的数才保留小数点后一位
     * @param {number} value - 要格式化的数值
     * @returns {string} 格式化后的字符串
     */
    formatNumber(value) {
        if (value % 1 === 0) {
            // 整数，不显示小数点
            return value.toString();
        } else {
            // 有小数，保留一位小数
            return value.toFixed(1);
        }
    }

    /**
     * 获取随机数值
     * @param {Object|number} valueConfig - 数值配置
     * @returns {number} 随机数值
     */
    getRandomValue(valueConfig) {
        if (typeof valueConfig === 'number') {
            return valueConfig;
        }
        if (valueConfig.min !== undefined && valueConfig.max !== undefined) {
            return Math.random() * (valueConfig.max - valueConfig.min) + valueConfig.min;
        }
        return 0;
    }

    /**
     * 应用强化卡片效果
     * @param {string} cardType - 卡片类型
     * @param {number} tier - 卡片等级
     */
    applyEnhancement(cardType, tier, offeredValue) {
        if (!this.enhancementCards[cardType]) {
            console.error(`未知的强化类型: ${cardType}`);
            return;
        }

        const enhancement = this.enhancementCards[cardType];
        const valueConfig = enhancement.values[tier];
        
        if (valueConfig === undefined) {
            console.error(`未知的卡片等级: ${tier}`);
            return;
        }

        // 获取随机数值
        const value = offeredValue ?? this.getRandomValue(valueConfig);

        // 根据卡片类型应用不同的强化效果，确保数值不为负
        switch (cardType) {
            case 'health':
                if (enhancement.isPercentage) {
                    const increase = this.playerStats.maxHealth * (value / 100);
                    this.playerStats.maxHealth = Math.max(0, this.playerStats.maxHealth + increase);
                    this.playerStats.currentHealth = Math.max(0, this.playerStats.currentHealth + increase);
                } else {
                    this.playerStats.maxHealth = Math.max(0, this.playerStats.maxHealth + value);
                    this.playerStats.currentHealth = Math.max(0, this.playerStats.currentHealth + value);
                }
                break;
            case 'attack':
                if (enhancement.isPercentage) {
                    const increase = this.playerStats.attackPower * (value / 100);
                    this.playerStats.attackPower = Math.max(0, this.playerStats.attackPower + increase);
                } else {
                    this.playerStats.attackPower = Math.max(0, this.playerStats.attackPower + value);
                }
                break;
            case 'critRate':
                this.playerStats.criticalRate = Math.max(0, this.playerStats.criticalRate + value);
                break;
            case 'critDamage':
                this.playerStats.criticalDamage = Math.max(0, this.playerStats.criticalDamage + value);
                break;
            case 'cooldown':
                this.playerStats.cooldownAcceleration = Math.max(0, this.playerStats.cooldownAcceleration + value);
                break;
            case 'shield':
                if (enhancement.isHealthPercentage) {
                    const shieldValue = this.playerStats.maxHealth * (value / 100);
                    this.playerStats.shield = Math.max(0, this.playerStats.shield + shieldValue);
                } else {
                    this.playerStats.shield = Math.max(0, this.playerStats.shield + value);
                }
                break;
            case 'healthRegen':
                this.playerStats.healthRegen = Math.max(0, this.playerStats.healthRegen + value);
                break;
            case 'waveCount':
                this.playerStats.waveCount = Math.max(1, this.playerStats.waveCount + value); // 波数量至少为1
                break;
            case 'lucky':
                this.playerStats.luckyValue = Math.max(0, this.playerStats.luckyValue + value);
                break;
            case 'waveWidth':
                this.playerStats.waveWidth = Math.max(0, this.playerStats.waveWidth + value);
                break;
            case 'armor':
                this.playerStats.armor = Math.max(0, this.playerStats.armor + value);
                break;
        }

        console.log(`应用强化: ${enhancement.name} +${this.formatNumber(Math.max(0, value))}`);
    }

    /**
     * 计算暴击率（百分比）
     * @param {number} critValue - 暴击数值
     * @returns {number} 暴击率百分比（最大100%）
     */
    calculateCriticalRate(critValue = this.playerStats.criticalRate) {
        return Math.min(critValue, 100); // 暴击率最大100%
    }

    /**
     * 计算实际暴击伤害（包含超出100%暴击率的加成）
     * @param {number} critValue - 暴击数值
     * @param {number} baseCritDamage - 基础暴击伤害
     * @returns {number} 实际暴击伤害百分比
     */
    calculateActualCriticalDamage(critValue = this.playerStats.criticalRate, baseCritDamage = this.playerStats.criticalDamage) {
        let actualCritDamage = baseCritDamage;
        
        // 如果暴击率超过100%，多余的数值直接加到暴击伤害上
        if (critValue > 100) {
            const excessCrit = critValue - 100;
            actualCritDamage += excessCrit;
        }
        
        return actualCritDamage;
    }

    /**
     * 计算冷却缩减倍数
     * @param {number} cooldownValue - 冷却加速数值
     * @returns {number} 冷却缩减倍数
     */
    calculateCooldownReduction(cooldownValue = this.playerStats.cooldownAcceleration) {
        // 冷却缩减 = 冷却时间/(1 + 冷却加速/100)
        return 1 / (1 + cooldownValue / 100);
    }

    /**
     * 计算生命恢复间隔（秒）
     * @param {number} regenValue - 生命恢复数值
     * @returns {number} 恢复间隔（秒）
     */
    calculateHealthRegenInterval(regenValue = this.playerStats.healthRegen) {
        // 基础1秒恢复1点，数值越高间隔越短
        // 公式: 间隔 = 100 / 生命恢复数值（最小0.1秒）
        const interval = 100 / regenValue;
        return Math.max(interval, 0.1);
    }

    /**
     * 计算每秒生命恢复量
     * @param {number} regenValue - 生命恢复数值
     * @returns {number} 每秒恢复的生命值
     */
    calculateHealthRegenPerSecond(regenValue = this.playerStats.healthRegen) {
        const interval = this.calculateHealthRegenInterval(regenValue);
        return 1 / interval; // 每秒恢复量 = 1 / 间隔
    }

    /**
     * 计算幸运值的额外概率
     * @param {number} luckyValue - 幸运值
     * @returns {number} 额外概率（0-1之间）
     */
    calculateLuckyExtraProbability(luckyValue = this.playerStats.luckyValue) {
        // 额外概率 = 幸运值/(100 + 幸运值)
        return luckyValue / (100 + luckyValue);
    }

    /**
     * 生成随机强化卡片选项
     * @param {number} count - 生成卡片数量
     * @returns {Array} 卡片选项数组
     */
    generateRandomEnhancements(count = 3) {
        const cardTypes = Object.keys(this.enhancementCards);
        const options = [];
        const available = [...cardTypes];
        for (let i = 0; i < count; i++) {
            if (!available.length) available.push(...cardTypes);
            const tier = this.selectRandomCardTier(this.playerStats.luckyValue, available);
            const eligible = available.filter(type => this.enhancementCards[type].values[tier] !== undefined);
            const randomType = eligible[Math.floor(Math.random() * eligible.length)];
            available.splice(available.indexOf(randomType), 1);
            const enhancement = this.enhancementCards[randomType];
            
            const value = Number(this.getRandomValue(enhancement.values[tier]).toFixed(1));
            options.push({
                type: randomType,
                tier: tier,
                name: enhancement.name,
                value,
                description: this.getEnhancementDescription(randomType, tier, value)
            });
        }
        
        return options;
    }

    /**
     * 获取强化描述
     * @param {string} cardType - 卡片类型
     * @param {number} tier - 卡片等级
     * @returns {string} 强化描述
     */
    getEnhancementDescription(cardType, tier, value) {
        const enhancement = this.enhancementCards[cardType];
        const displayValue = this.formatNumber(value);
        let description = '';
        switch (cardType) {
            case 'health':
                if (enhancement.isPercentage) {
                    description += `最大生命值 +${displayValue}%`;
                } else {
                    description += `最大生命值 +${displayValue}`;
                }
                break;
            case 'attack':
                if (enhancement.isPercentage) {
                    description += `攻击力 +${displayValue}%`;
                } else {
                    description += `攻击力 +${displayValue}`;
                }
                break;
            case 'critRate':
                description += `暴击率 +${displayValue}%`;
                break;
            case 'critDamage':
                description += `暴击伤害 +${displayValue}%`;
                break;
            case 'cooldown':
                description += `冷却加速 +${displayValue}`;
                break;
            case 'shield':
                if (enhancement.isHealthPercentage) {
                    const shield = this.playerStats.maxHealth * value / 100;
                    description += `护盾 +${this.formatNumber(shield)}（最大生命的 ${displayValue}%）`;
                } else {
                    description += `护盾值 +${displayValue}`;
                }
                break;
            case 'healthRegen':
                const newRegen = this.calculateHealthRegenPerSecond(this.playerStats.healthRegen + value);
                const currentRegen = this.calculateHealthRegenPerSecond();
                const regenDiff = Math.max(0, newRegen - currentRegen);
                description += `生命恢复 +${this.formatNumber(regenDiff)}/秒`;
                break;
            case 'waveCount':
                description += `同元素波上限 +${displayValue}`;
                break;
            case 'lucky':
                description += `幸运值 +${displayValue}`;
                break;
            case 'armor':
                description += `护甲值 +${displayValue}`;
                break;
            case 'waveWidth':
                description += `波宽度 +${displayValue}像素`;
                break;
        }
        
        return description;
    }

    /**
     * 获取当前玩家属性
     * @returns {Object} 玩家属性对象
     */
    getPlayerStats() {
        return { ...this.playerStats };
    }

    /**
     * 重置玩家属性到初始状态
     */
    resetPlayerStats() {
        this.playerStats = {
            maxHealth: 100,
            currentHealth: 100,
            attackPower: 10,
            criticalRate: 5,
            criticalDamage: 150,
            cooldownAcceleration: 0,
            shield: 0,
            healthRegen: 100,
            waveCount: 1,
            luckyValue: 0,
            waveWidth: 0
        };
    }
}

// 导出类
module.exports = EnhancementSystem;

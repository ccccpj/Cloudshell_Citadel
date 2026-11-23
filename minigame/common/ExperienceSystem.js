/**
 * 经验系统 - 管理玩家经验获取、等级提升和点数转换
 * 支持升级点、强化点的获取和管理
 */

class ExperienceSystem {
    constructor() {
        // 经验获取配置
        this.expRewards = {
            // 击杀敌人经验
            enemies: {
                basic: 10,           // 基础敌人
                fast: 12,            // 快速敌人
                tank: 25,            // 坦克敌人
                fireResistant: 15,   // 火焰抗性敌人
                iceImmune: 20,       // 冰霜免疫敌人
                electricResistant: 18, // 电系抗性敌人
                elite: 50,           // 精英敌人
                ghost: 30,           // 幽灵敌人
                shielded: 22,        // 护盾敌人
                boss: 100           // Boss敌人
            },
            // 关卡完成经验
            levelCompletion: {
                baseExpPerLevel: 5,  // 每关基础经验倍数
                perfectBonusMultiplier: 1.5  // 完美通关奖励倍数
            }
        };

        // 等级系统配置
        this.levelSystem = {
            baseExpRequired: 45,     // 从1级升到2级
            expIncrement: 14,        // 此后每级多需14经验
            maxLevel: 999,           // 玩家等级上限
            upgradePointsPerLevel: 2 // 每升级获得2个升级点
        };

        this.reset();

        // 事件监听器
        this.eventListeners = {
            onExpGain: [],
            onLevelUp: [],
            onPointsGain: []
        };
    }

    /**
     * 添加经验值
     * @param {number} exp - 获得的经验值
     * @param {string} source - 经验来源（用于日志）
     */
    addExperience(exp, source = 'unknown') {
        if (exp <= 0) return;

        const oldLevel = this.playerExperience.currentLevel;
        this.playerExperience.totalExp += exp;

        // 检查是否升级
        this.checkLevelUp();

        // 触发经验获得事件
        this.triggerEvent('onExpGain', {
            exp: exp,
            source: source,
            totalExp: this.playerExperience.totalExp,
            leveledUp: this.playerExperience.currentLevel > oldLevel
        });


    }

    /**
     * 击杀敌人获得经验
     * @param {string} enemyType - 敌人类型
     * @param {number} level - 当前关卡（影响经验倍数）
     */
    gainExpFromEnemy(enemyType, level = 1) {
        const baseExp = this.expRewards.enemies[enemyType] || 10;
        // 关卡越高，经验倍数越高
        const levelMultiplier = 1 + (level - 1) * 0.1;
        const finalExp = Math.floor(baseExp * levelMultiplier);
        
        this.addExperience(finalExp, `击杀${enemyType}敌人`);
    }

    /**
     * 完成关卡获得经验
     * @param {number} level - 关卡数
     * @param {boolean} isPerfect - 是否完美通关
     */
    gainExpFromLevel(level, isPerfect = false) {
        let exp = level * this.expRewards.levelCompletion.baseExpPerLevel;
        
        if (isPerfect) {
            exp = Math.floor(exp * this.expRewards.levelCompletion.perfectBonusMultiplier);
        }
        
        const source = isPerfect ? `完美通关第${level}关` : `通关第${level}关`;
        this.addExperience(exp, source);
    }

    /**
     * 检查是否升级
     */
    checkLevelUp() {
        while (this.playerExperience.currentLevel < this.levelSystem.maxLevel) {
            const expRequired = this.getExpRequiredForLevel(this.playerExperience.currentLevel + 1);
            
            if (this.playerExperience.totalExp >= expRequired) {
                this.playerExperience.currentLevel++;
                if (this.playerExperience.currentLevel === this.levelSystem.maxLevel) this.playerExperience.expToNextLevel = 0;
                else this.playerExperience.expToNextLevel = this.getExpRequiredForLevel(this.playerExperience.currentLevel + 1) - this.playerExperience.totalExp;
                
                // 每升级获得升级点
                this.playerExperience.upgradePoints += this.levelSystem.upgradePointsPerLevel;
                
                // 触发升级事件
                this.triggerEvent('onLevelUp', {
                    newLevel: this.playerExperience.currentLevel,
                    totalExp: this.playerExperience.totalExp,
                    upgradePointsGained: this.levelSystem.upgradePointsPerLevel
                });
                

            } else {
                this.playerExperience.expToNextLevel = expRequired - this.playerExperience.totalExp;
                break;
            }
        }
    }

    /**
     * 计算指定等级所需的总经验
     * @param {number} level - 目标等级
     * @returns {number} 所需总经验
     */
    getExpRequiredForLevel(level) {
        if (level <= 1) return 0;
        
        const steps = level - 1;
        return steps * this.levelSystem.baseExpRequired + steps * (steps - 1) / 2 * this.levelSystem.expIncrement;
    }

    /**
     * 直接添加强化点数
     * @param {number} amount - 添加的强化点数量
     */
    addEnhancePoints(amount) {
        this.playerExperience.enhancePoints += amount;

    }

    /**
     * 消费点数
     * @param {string} pointType - 点数类型 ('upgradePoints', 'enhancePoints')
     * @param {number} amount - 消费数量
     * @returns {boolean} 是否消费成功
     */
    spendPoints(pointType, amount) {
        if (this.playerExperience[pointType] >= amount) {
            this.playerExperience[pointType] -= amount;

            return true;
        }
        
        console.warn(`${pointType}不足: 需要${amount}，当前${this.playerExperience[pointType]}`);
        return false;
    }

    /**
     * 检查是否有足够的点数
     * @param {string} pointType - 点数类型
     * @param {number} amount - 需要的数量
     * @returns {boolean} 是否有足够点数
     */
    hasEnoughPoints(pointType, amount) {
        return this.playerExperience[pointType] >= amount;
    }

    /**
     * 获取当前经验状态
     * @returns {Object} 经验状态对象
     */
    getExperienceStatus() {
        return {
            ...this.playerExperience,
            expRequiredForNextLevel: this.playerExperience.expToNextLevel,
            currentLevelProgress: this.getCurrentLevelProgress()
        };
    }

    /**
     * 获取当前等级进度（百分比）
     * @returns {number} 进度百分比 (0-100)
     */
    getCurrentLevelProgress() {
        if (this.playerExperience.currentLevel >= this.levelSystem.maxLevel) {
            return 100;
        }
        
        const currentLevelStartExp = this.getExpRequiredForLevel(this.playerExperience.currentLevel);
        const nextLevelExp = this.getExpRequiredForLevel(this.playerExperience.currentLevel + 1);
        const expInCurrentLevel = this.playerExperience.totalExp - currentLevelStartExp;
        const expNeededForLevel = nextLevelExp - currentLevelStartExp;
        
        return Math.floor((expInCurrentLevel / expNeededForLevel) * 100);
    }

    /**
     * 添加事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} callback - 回调函数
     */
    addEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].push(callback);
        }
    }

    /**
     * 移除事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} callback - 回调函数
     */
    removeEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            const index = this.eventListeners[eventType].indexOf(callback);
            if (index > -1) {
                this.eventListeners[eventType].splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     * @param {string} eventType - 事件类型
     * @param {Object} data - 事件数据
     */
    triggerEvent(eventType, data) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件监听器错误 (${eventType}):`, error);
                }
            });
        }
    }

    /**
     * 重置经验系统
     */
    reset() {
        this.playerExperience = {
            totalExp: 0,
            currentLevel: 1,
            expToNextLevel: this.levelSystem.baseExpRequired,
            upgradePoints: 0,
            enhancePoints: 0
        };
        

    }

}

// 导出类
module.exports = ExperienceSystem;

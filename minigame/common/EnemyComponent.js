const feedback = require('./Feedback');
// 敌人组件
const GameConfig = require('./GameConfig.js');
const Utils = require('./Utils.js');
const Art = require('./Art');
const { graphic } = require('./GameUI');
const { drawEffect, duration } = require('./FlightEffects');

const species = Object.fromEntries(Art.creatures.creatures.map(item => [item.type, item]));
const creatureSheet = Art.creatures.sheet;

class EnemyComponent {
  constructor(canvas, field = GameConfig.BATTLEFIELD) {
    this.ctx = canvas.getContext('2d');
    this.field = field;
    
    // 敌人数组
    this.enemies = [];
    this.enhancementSystem = null; // 强化系统引用
    this.upgradeSystem = null; // 升级系统引用
    
    // 敌人生成设置
    this.elapsed = 0;
    this.nextEnemyId = 1;
    this.links = [];
    this.spawnInterval = GameConfig.getSpawnIntervalForLevel(1); // 动态生成间隔
    this.lastSpawnTime = -Infinity;
    this.currentLevel = 1;
    
    // 敌人类型权重（用于随机生成）
    this.enemyTypeWeights = {
      basic: 40,
      fast: 20,
      tank: 10,
      fireResistant: 10,
      iceImmune: 8,
      electricResistant: 7,
      shielded: 3,
      ghost: 2
    };
    
    // 分数回调函数
    this.onEnemyKilled = null;
    
    // 伤害文字显示系统
    this.damageTexts = [];
    
    this.visuals = [];
  }
  
  // 生成敌人
  spawnEnemy() {
    const enemyConfig = GameConfig.ENEMY_CONFIG;
    const centerX = this.field.width / 2;
    const centerY = this.field.height / 2;
    
    const ticket = this.rankedRun && this.rankedRun.spawn(this.currentLevel);
    const enemyType = ticket ? ticket.type : this.getRandomEnemyType();
    const typeConfig = GameConfig.getEnemyConfigForLevel(enemyType, this.currentLevel);
    
    // 从屏幕边缘随机位置生成
    const side = Math.floor(Math.random() * 4); // 0:上, 1:右, 2:下, 3:左
    let x, y;
    const margin = enemyConfig.SPAWN_EDGE_MARGIN || typeConfig.size;
    
    switch(side) {
      case 0: // 上边
        x = Math.random() * this.field.width;
        y = -margin;
        break;
      case 1: // 右边
        x = this.field.width + margin;
        y = Math.random() * this.field.height;
        break;
      case 2: // 下边
        x = Math.random() * this.field.width;
        y = this.field.height + margin;
        break;
      case 3: // 左边
        x = -margin;
        y = Math.random() * this.field.height;
        break;
    }
    
    // 计算朝向中心的方向
    const dx = centerX - x;
    const dy = centerY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 随机生成防御属性
    const defenses = typeConfig.immunities && typeConfig.immunities.length
      ? typeConfig : GameConfig.generateRandomDefenses(this.currentLevel);
    
    const enemy = {
      id: this.nextEnemyId++,
      rankTicket: ticket,
      type: enemyType,
      x: x,
      y: y,
      vx: (dx / distance) * typeConfig.speed,
      vy: (dy / distance) * typeConfig.speed,
      health: typeConfig.health,
      maxHealth: typeConfig.health,
      impactDamage: typeConfig.impactDamage,
      shield: typeConfig.shield || 0,
      maxShield: typeConfig.shield || 0,
      armor: typeConfig.armor || 0,
      radius: typeConfig.size,
      color: typeConfig.color,
      resistances: defenses.resistances,
      immunities: defenses.immunities,
      scoreValue: typeConfig.scoreValue,
      statusEffects: new Map() // 存储状态效果（燃烧、减速等）
    };
    

    
    this.enemies.push(enemy);
    if (this.onSpawn) this.onSpawn(enemy, this.currentLevel);
  }
  
  // 更新敌人
  update(deltaTime) {
    this.elapsed += deltaTime * 1000;
    this.links = this.links.filter(link => link.end > this.elapsed);
    const currentTime = this.elapsed;
    
    // 更新伤害文字
    this.updateDamageTexts(deltaTime);
    
    for (let i = this.visuals.length - 1; i >= 0; i--) {
      if (this.visuals[i].until <= this.elapsed) this.visuals.splice(i, 1);
    }
    
    // 生成新敌人（检查数量限制）
    if (currentTime - this.lastSpawnTime > this.spawnInterval &&
        this.enemies.length < GameConfig.ENEMY_CONFIG.MAX_CONCURRENT_ENEMIES) {
      this.spawnEnemy();
      this.lastSpawnTime = currentTime;
    }
    
    if (this.waveComponent) {
      for (const vortex of this.waveComponent.vortices) {
        if (currentTime >= vortex.nextTick) {
          this.damageArea(vortex, vortex.radius, 'wind', 0.65);
          vortex.nextTick = currentTime + 450;
        }
      }
    }
    // 更新每个敌人的位置
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      if (enemy.health <= 0) continue;
      // 更新状态效果
      this.updateStatusEffects(enemy, currentTime);
      
      if (enemy.health <= 0) continue;

      // 检查冰霜地面减速效果
      this.checkFrostGroundEffect(enemy, currentTime);
      
      // 检查极地风暴伤害效果
      this.checkPolarStormEffect(enemy, currentTime);
      
      if (enemy.health <= 0) continue;

      // 移动敌人（考虑减速效果和击退效果）
      const slowEffect = enemy.statusEffects.get('slow');
      const knockbackEffect = enemy.statusEffects.get('knockback');
      
      let moveX = enemy.vx * deltaTime;
      let moveY = enemy.vy * deltaTime;
      
      // 应用减速效果
      if (slowEffect) {
        moveX *= slowEffect.multiplier;
        moveY *= slowEffect.multiplier;
      }
      
      // 应用击退效果（击退力会覆盖正常移动）
      if (knockbackEffect && (!slowEffect || slowEffect.multiplier > 0)) {
        moveX = knockbackEffect.forceX * deltaTime;
        moveY = knockbackEffect.forceY * deltaTime;
        
        // 连环击退觉醒技能：检查被击退敌人是否撞击其他敌人
        if (this.upgradeSystem && this.upgradeSystem.hasAwakening('wind', 'chainKnockback')) {
          this.checkKnockbackCollisions(enemy, moveX, moveY, currentTime);
        }
      }
      
      enemy.x += moveX;
      enemy.y += moveY;
      
      // 移除超出屏幕太远的敌人
      const removeMargin = 200; // 增加移除边界缓冲区
      if (enemy.x < -removeMargin || enemy.x > this.field.width + removeMargin ||
          enemy.y < -removeMargin || enemy.y > this.field.height + removeMargin) {
        this.enemies.splice(i, 1);
        continue;
      }
      
    }
  }

  // 在光波和范围伤害结算之后，先处理所有死亡连锁，再结算撞击圆心。
  settleKills() {
    let removed = 0;
    let index;
    while ((index = this.enemies.findIndex(enemy => enemy.health <= 0)) !== -1) {
      const [enemy] = this.enemies.splice(index, 1);
      if (enemy.statusEffects.has('burn')) {
        this.handleBurnSpread(enemy, this.elapsed);
        if (this.upgradeSystem && this.upgradeSystem.hasAwakening('fire', 'flameBurst')) {
          this.showVisual('explosion', enemy, 160);
          this.damageArea(enemy, 80, 'fire', 1.2 * this.upgradeSystem.getExplosionPowerMultiplier('fire'));
        }
      }
      const slow = enemy.statusEffects.get('slow');
      if (slow && slow.multiplier === 0 && this.upgradeSystem.hasAwakening('ice', 'crystalShatter')) {
        this.showVisual('shatter', enemy, 200);
        this.damageArea(enemy, 100, 'ice', 1.5);
      }
      this.showVisual('death', enemy, enemy.radius * 3.1, true);
      removed++;
      if (enemy.rankTicket) this.rankedRun.kill(enemy.rankTicket);
      if (this.onEnemyKilled) this.onEnemyKilled(enemy.scoreValue, enemy.type);
    }
    if (removed) {
      feedback.vibrate('light');
      const audio = GameConfig.AUDIO_CONFIG;
      feedback.playSound(audio.AUDIO_PATHS.ENEMY_DEATH, audio.SOUND_VOLUME * audio.MASTER_VOLUME * 0.6);
    }
  }

  applyDamageEffect(enemy) {
    enemy.hitTime = this.elapsed;
  }

  // 随机选择敌人类型
  getRandomEnemyType() {
    // 根据关卡调整敌人类型权重
    const weights = { ...this.enemyTypeWeights };
    
    // 前五关不能出现免疫敌人
    if (this.currentLevel <= 5) {
      weights.ghost = 0; // 幽灵敌人免疫普通波，前五关不生成
    }
    
    if (this.currentLevel >= 4) weights.elite = 2;
    if (this.currentLevel >= 10) weights.boss = 1;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (weight > 0 && random <= 0) {
        return type;
      }
    }
    
    return 'basic'; // 默认返回基础敌人
  }
  
  // 更新状态效果
  updateStatusEffects(enemy, currentTime) {
    // 更新燃烧效果
    const burnEffect = enemy.statusEffects.get('burn');
    if (burnEffect) {
      const until = Math.min(burnEffect.endTime, currentTime);
      if (until >= burnEffect.nextDamageTime) {
        const ticks = 1 + Math.floor((until - burnEffect.nextDamageTime) / 1000);
        burnEffect.nextDamageTime += ticks * 1000;
        this.takeDamage(enemy, burnEffect.damage * ticks, 'fire', false, 'burn');
        if (this.upgradeSystem && this.upgradeSystem.hasAwakening('fire', 'fireChain')) {
          const linked = this.enemies.find(other => other !== enemy && other.health > 0 &&
            other.statusEffects.has('burn') && Utils.calculateDistance(enemy.x, enemy.y, other.x, other.y) <= 120);
          if (linked) {
            this.showLink(enemy, linked, 'fire-chain', 350);
            this.takeDamage(linked, burnEffect.damage * ticks, 'fire', false, 'chain');
          }
        }
      }
      if (currentTime >= burnEffect.endTime && enemy.health > 0) enemy.statusEffects.delete('burn');
    }

    // 更新减速效果
    const slowEffect = enemy.statusEffects.get('slow');
    if (slowEffect && currentTime >= slowEffect.endTime) {
      enemy.statusEffects.delete('slow');
    }
    
    // 更新击退效果
    const knockbackEffect = enemy.statusEffects.get('knockback');
    if (knockbackEffect) {
      if (currentTime >= knockbackEffect.endTime) {
        enemy.statusEffects.delete('knockback');
      }
    }
  }
  
  // 设置当前关卡
  setLevel(level) {
    this.currentLevel = level;
    this.spawnInterval = GameConfig.getSpawnIntervalForLevel(level);
  }
  
  // 设置强化系统引用
  setEnhancementSystem(enhancementSystem) {
    this.enhancementSystem = enhancementSystem;
  }
  
  // 设置升级系统引用
  setUpgradeSystem(upgradeSystem) {
    this.upgradeSystem = upgradeSystem;
  }
  
  setWaveComponent(waveComponent) {
    this.waveComponent = waveComponent;
  }

  // 检查与波的碰撞并造成伤害
  checkWaveCollisions(waves) {
    const config = GameConfig.WAVE_CONFIG;
    for (const wave of waves) {
      const inner = (wave.previousRadius ?? wave.radius) - wave.width / 2;
      const outer = wave.radius + wave.width / 2;
      const touching = this.enemies.filter(enemy => {
        if (enemy.health <= 0) return false;
        const distance = Utils.calculateDistance(enemy.x, enemy.y, wave.x, wave.y);
        return distance - enemy.radius <= outer && distance + enemy.radius >= inner;
      });
      const current = new Set(touching.map(enemy => enemy.id));
      for (const id of wave.touchingEnemies.keys()) {
        if (!current.has(id)) {
          wave.touchingEnemies.delete(id);
          wave.penetratedEnemies.add(id);
        }
      }
      const conducted = new Set();
      for (const enemy of touching) {
        if (enemy.health <= 0) continue;
        const previousHit = wave.touchingEnemies.get(enemy.id);
        if (previousHit !== undefined && this.elapsed - previousHit < config.DAMAGE_INTERVAL) continue;
        const criticalRate = this.enhancementSystem
          ? this.enhancementSystem.calculateCriticalRate() / 100 : GameConfig.PLAYER_CONFIG.CRITICAL_RATE;
        const critical = Math.random() < criticalRate;
        const criticalDamage = this.enhancementSystem && this.enhancementSystem.calculateActualCriticalDamage();
        const base = this.attackPower();
        const damage = GameConfig.calculateDamage(base, wave.type, enemy, critical, criticalDamage,
          this.upgradeSystem, touching.length, wave.penetratedEnemies.size);
        if (!damage) {
          if (enemy.immunities.includes(wave.type) && !(enemy.immuneVisualUntil > this.elapsed)) {
            this.showVisual('immune', enemy, enemy.radius * 2.4);
            enemy.immuneVisualUntil = this.elapsed + 500;
          }
          continue;
        }
        wave.touchingEnemies.set(enemy.id, this.elapsed);
        this.applyDamage(enemy, damage, wave.type, critical);
        if (wave.type === 'electric') this.handleElectricChain(enemy, base, conducted);
      }
    }
  }

  attackPower() {
    return this.enhancementSystem ? this.enhancementSystem.getPlayerStats().attackPower : GameConfig.WAVE_CONFIG.DAMAGE_PER_WAVE;
  }

  damageArea(center, radius, type, power) {
    const base = this.attackPower() * power;
    for (const target of this.enemies) {
      if (target.health <= 0 || Utils.calculateDistance(center.x, center.y, target.x, target.y) > radius) continue;
      const damage = GameConfig.calculateDamage(base, type, target, false, null, this.upgradeSystem);
      if (damage > 0) this.applyDamage(target, damage, type);
    }
  }

  // 处理燃烧扩散效果
  handleBurnSpread(deadEnemy, currentTime) {
    const range = this.upgradeSystem ? this.upgradeSystem.getBurnSpreadRange('fire') : 30;
    for (const enemy of this.enemies) {
      if (enemy.health <= 0 || enemy.statusEffects.has('burn') || enemy.immunities.includes('fire')) continue;
      if (Utils.calculateDistance(deadEnemy.x, deadEnemy.y, enemy.x, enemy.y) <= range) this.ignite(enemy, currentTime);
    }
  }

  ignite(enemy, now) {
    const fire = GameConfig.WAVE_CONFIG.TYPES.fire;
    const damage = this.upgradeSystem ? this.upgradeSystem.getBurnDamage('fire') : fire.burnDamage;
    const duration = this.upgradeSystem ? this.upgradeSystem.getBurnDuration('fire') * 1000 : fire.burnDuration;
    const existing = enemy.statusEffects.get('burn');
    enemy.statusEffects.set('burn', {
      damage,
      endTime: this.upgradeSystem && this.upgradeSystem.hasAwakening('fire', 'eternalFire') ? Infinity : now + duration,
      nextDamageTime: existing ? existing.nextDamageTime : now + 1000
    });
  }

  // 处理连环击退觉醒技能
  handleChainKnockback(sourceEnemy, knockbackForce, knockbackDuration, currentTime) {
    const chainRange = 100; // 连环击退范围
    
    // 在范围内查找其他敌人
    for (let otherEnemy of this.enemies) {
      if (otherEnemy === sourceEnemy) continue;
      
      const distance = Math.sqrt(
        Math.pow(otherEnemy.x - sourceEnemy.x, 2) + 
        Math.pow(otherEnemy.y - sourceEnemy.y, 2)
      );
      
      if (distance <= chainRange) {
        // 检查目标敌人是否对风系免疫
        const resistance = GameConfig.checkWaveResistance(otherEnemy, 'wind');
        if (resistance.immune) continue;
        
        // 检查目标敌人是否已经被击退
        const existingKnockback = otherEnemy.statusEffects.get('knockback');
        if (existingKnockback) continue;
        
        // 计算击退方向（从屏幕中心向外）
        const centerX = this.field.width / 2;
        const centerY = this.field.height / 2;
        const dx = otherEnemy.x - centerX;
        const dy = otherEnemy.y - centerY;
        const knockbackDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (knockbackDistance > 0) {
          const normalizedDx = dx / knockbackDistance;
          const normalizedDy = dy / knockbackDistance;
          
          otherEnemy.statusEffects.set('knockback', {
            forceX: normalizedDx * knockbackForce,
            forceY: normalizedDy * knockbackForce,
            endTime: currentTime + knockbackDuration
          });
        }
      }
    }
  }
  
  // 检查被击退敌人的撞击伤害
  checkKnockbackCollisions(knockedEnemy, moveX, moveY, currentTime) {
    const newX = knockedEnemy.x + moveX;
    const newY = knockedEnemy.y + moveY;
    
    // 检查与其他敌人的碰撞
    for (let otherEnemy of this.enemies) {
      if (otherEnemy === knockedEnemy) continue;
      
      // 计算碰撞距离
      const distance = Math.sqrt(
        Math.pow(newX - otherEnemy.x, 2) + 
        Math.pow(newY - otherEnemy.y, 2)
      );
      
      const collisionDistance = knockedEnemy.radius + otherEnemy.radius;
      
      if (distance <= collisionDistance) {
        // 检查目标敌人是否对风系免疫
        const resistance = GameConfig.checkWaveResistance(otherEnemy, 'wind');
        if (resistance.immune) continue;
        
        // 检查是否已经对这个敌人造成过撞击伤害（避免重复伤害）
        if (!knockedEnemy.collisionDamageHistory) {
          knockedEnemy.collisionDamageHistory = new Set();
        }
        
        if (knockedEnemy.collisionDamageHistory.has(otherEnemy.id)) continue;
        
        // 计算撞击伤害（基于被击退敌人的生命值）
        const baseDamage = Math.floor(knockedEnemy.maxHealth * 0.3); // 撞击伤害为被击退敌人最大生命值的30%
        const collisionDamage = GameConfig.calculateDamage(baseDamage, 'wind', otherEnemy, false, null, this.upgradeSystem, 1, 0);
        
        // 应用撞击伤害
        this.applyDamage(otherEnemy, collisionDamage, 'wind', false);
        
        // 记录已对此敌人造成撞击伤害
        this.showVisual('knockback-contact', otherEnemy, otherEnemy.radius * 3);
        knockedEnemy.collisionDamageHistory.add(otherEnemy.id);
        
        // 限制历史记录大小，避免内存泄漏
        if (knockedEnemy.collisionDamageHistory.size > 10) {
          const firstEntry = knockedEnemy.collisionDamageHistory.values().next().value;
          knockedEnemy.collisionDamageHistory.delete(firstEntry);
        }
      }
    }
  }
  
  handleElectricChain(source, baseDamage, visited) {
    if (visited.has(source)) return;
    visited.add(source);
    const system = this.upgradeSystem;
    const config = GameConfig.WAVE_CONFIG.TYPES.electric;
    const range = system ? system.getChainRange('electric') : config.chainRange;
    const multiplier = system ? system.getChainDamageMultiplier('electric') : config.chainDamage;
    const unlimited = system && system.hasAwakening('electric', 'infiniteChain');
    const hops = unlimited ? Infinity : (system ? system.getChainCount('electric') : 1);
    let power = baseDamage * multiplier;
    let frontier = [source];
    for (let hop = 0; hop < hops && frontier.length && power >= 1; hop++) {
      const next = [];
      for (const from of frontier) {
        for (const target of this.enemies) {
          if (visited.has(target) || target.health <= 0 || target.immunities.includes('electric')) continue;
          if (Utils.calculateDistance(from.x, from.y, target.x, target.y) > range) continue;
          visited.add(target);
          const damage = GameConfig.calculateDamage(power, 'electric', target, false, null, system);
          if (!damage) continue;
          this.applyDamage(target, damage, 'electric');
          this.showLink(from, target, 'chain', 140);
          next.push(target);
        }
      }
      if (hop === 0 && next.length && system && system.hasAwakening('electric', 'thunderGod') && Math.random() < 0.25) {
        this.showVisual('storm-strike', next[0], 210);
        this.damageArea(next[0], 150, 'electric', 2);
      }
      power *= unlimited ? 0.9 : multiplier;
      frontier = next;
    }
  }

  // 密集连锁共用显示预算；所有命中的伤害和状态仍独立结算。
  showLink(from, to, id, duration) {
    if (this.links.length < 72) this.links.push({ from, to, id, end: this.elapsed + duration });
  }

  takeDamage(enemy, damage, waveType, isCritical, label) {
    const slow = enemy.statusEffects.get('slow');
    if (slow && this.upgradeSystem) {
      if (slow.source === 'wave') damage *= this.upgradeSystem.getIceArmorDamageBonus('ice');
      if (waveType === 'ice') damage *= this.upgradeSystem.getIceResonanceBonus('ice');
    }
    damage = Math.floor(damage);
    enemy.lastDamageType = waveType;
    this.addDamageText(enemy, damage, isCritical, label);
    const pure = waveType === 'normal' && this.upgradeSystem && this.upgradeSystem.hasAwakening('normal', 'pureForce');
    if (enemy.shield > 0 && !pure) {
      const emp = waveType === 'electric' && this.upgradeSystem && this.upgradeSystem.hasAwakening('electric', 'empPulse');
      const efficiency = emp ? 2 : 1;
      const shieldLoss = Math.min(enemy.shield, damage * efficiency);
      enemy.shield -= shieldLoss;
      if (emp) this.showVisual('emp', enemy, enemy.radius * 3);
      if (!enemy.shield) this.showVisual('shield-break', enemy, enemy.radius * 3);
      damage -= shieldLoss / efficiency;
    }
    enemy.health -= damage;
    this.applyDamageEffect(enemy);
    const impact = isCritical ? 'critical' : enemy.resistances.includes(waveType) ? 'resist' : 'enemy-hit';
    this.showVisual(impact, enemy, enemy.radius * 2.8);
  }

  applyDamage(enemy, damage, waveType, isCritical = false) {
    if (damage <= 0 || enemy.health <= 0) return;
    const currentTime = this.elapsed;
    const waveConfig = GameConfig.WAVE_CONFIG.TYPES[waveType];
    this.takeDamage(enemy, damage, waveType, isCritical, 'normal');
    if (waveType === 'fire') this.ignite(enemy, currentTime);
    if (waveType === 'ice') {
      if (this.upgradeSystem && this.upgradeSystem.hasAwakening('fire', 'eternalFire')) enemy.statusEffects.delete('burn');
      const slow = this.upgradeSystem ? this.upgradeSystem.getSlowEffect('ice') : waveConfig.slowEffect;
      const duration = this.upgradeSystem ? this.upgradeSystem.getSlowDuration('ice') * 1000 : waveConfig.slowDuration;
      const frozen = slow <= 0.1 && this.upgradeSystem && this.upgradeSystem.hasAwakening('ice', 'absoluteZero');
      enemy.statusEffects.set('slow', { multiplier: frozen ? 0 : slow, endTime: currentTime + duration, source: 'wave' });
    }
    if (waveType === 'wind') {
      const force = waveConfig.knockbackForce * (this.upgradeSystem ? this.upgradeSystem.getKnockbackMultiplier('wind') : 1);
      const duration = waveConfig.knockbackDuration * (this.upgradeSystem ? this.upgradeSystem.getKnockbackDurationMultiplier('wind') : 1);
      const dx = enemy.x - this.field.width / 2;
      const dy = enemy.y - this.field.height / 2;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        enemy.statusEffects.set('knockback', {
          forceX: dx / distance * force, forceY: dy / distance * force, endTime: currentTime + duration
        });
        if (this.upgradeSystem && this.upgradeSystem.hasAwakening('wind', 'chainKnockback')) {
          this.handleChainKnockback(enemy, force * 0.7, duration * 0.8, currentTime);
        }
      }
    }
  }

  // 检查与主体的碰撞
  checkPlayerCollision(player) {
    this.settleKills();
    let total = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      if (Utils.isCircleCollision(enemy.x, enemy.y, enemy.radius, player.x, player.y, player.radius)) {
        // 削弱残血敌人可按比例减轻撞击。
        let damage = Math.ceil(enemy.impactDamage * enemy.health / enemy.maxHealth);
        
        // 应用玩家护盾保护
        if (this.enhancementSystem) {
          const playerStats = this.enhancementSystem.getPlayerStats();
          const shieldValue = playerStats.shield;
          
          if (shieldValue > 0) {
            // 护盾优先承受伤害
            const shieldDamage = Math.min(damage, shieldValue);
            // 更新护盾值
            this.enhancementSystem.playerStats.shield -= shieldDamage;
            if (!this.enhancementSystem.playerStats.shield) this.showVisual('shield-break', player, player.radius * 3.4);
            damage -= shieldDamage;
          }
          
          // 应用玩家护甲减伤：实际承受伤害 = 原伤害 * (100 / (护甲值 + 100))
          const armorValue = playerStats.armor;
          if (armorValue > 0 && damage > 0) {
            const armorReduction = 100 / (armorValue + 100);
            damage = Math.floor(damage * armorReduction);
          }
        }
        
        this.showVisual('death', enemy, enemy.radius * 2.6, true);
        this.enemies.splice(i, 1);
        
        total += damage;
      }
    }
    if (total > 0) feedback.vibrate('medium');
    return total;
  }
  
  // Transient effects share the simulation clock, including pause and background freezes.
  showVisual(id, source, size, dying = false) {
    const time = this.elapsed;
    const life = dying ? duration(creatureSheet.animations.death) : duration(Art.fxById[id]);
    if (this.visuals.length >= 72) this.visuals.shift();
    this.visuals.push({ id, x: source.x, y: source.y, size, start: time, until: time + life,
      actor: dying ? source : null });
  }

  drawActor(enemy, action, age) {
    const image = Art.image(species[enemy.type].sheet);
    const size = enemy.radius * 2 * creatureSheet.frameWidth / creatureSheet.neutralSilhouetteExtentPx;
    const angle = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
    if (image) {
      Art.player.drawFrame(this.ctx, image, creatureSheet, action, age, enemy.x, enemy.y, size, size, angle);
    } else if (action !== 'death') {
      this.ctx.fillStyle = enemy.color;
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    for (const link of this.links) {
      const dx = link.to.x - link.from.x, dy = link.to.y - link.from.y;
      const x = (link.from.x + link.to.x) / 2, y = (link.from.y + link.to.y) / 2;
      if (!drawEffect(ctx, link.id, this.elapsed, x, y, Math.hypot(dx, dy), 13, Math.atan2(dy, dx))) {
        ctx.strokeStyle = link.id === 'chain' ? '#ffe37b' : '#ff8855';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(link.from.x, link.from.y); ctx.lineTo(link.to.x, link.to.y); ctx.stroke();
      }
    }
    for (const enemy of this.enemies) {
      const { x, y, radius } = enemy;
      const hitAge = this.elapsed - enemy.hitTime;
      const hurt = hitAge < duration(creatureSheet.animations.hit);
      const age = this.elapsed + enemy.id * 107;
      this.drawActor(enemy, hurt ? 'hit' : 'fly', hurt ? hitAge : age);
      const size = radius * 2.8;
      if (enemy.shield > 0) drawEffect(ctx, 'shield', age, x, y, size);
      if (enemy.statusEffects.has('burn')) {
        const burn = enemy.statusEffects.get('burn');
        drawEffect(ctx, burn.endTime === Infinity ? 'eternal-flame' : 'burn', age, x, y, size);
      }
      const slow = enemy.statusEffects.get('slow');
      if (slow) drawEffect(ctx, slow.multiplier ? 'slow' : 'freeze', age, x, y, size);
      const knock = enemy.statusEffects.get('knockback');
      if (knock) drawEffect(ctx, 'knockback', Math.max(0, duration(Art.fxById.knockback) - (knock.endTime - this.elapsed)), x, y, size);
      const health = enemy.health / enemy.maxHealth;
      if (health < 1) {
        ctx.fillStyle = '#463629'; ctx.fillRect(x - radius, y - radius - 5, 2 * radius, 2.5);
        ctx.fillStyle = '#ffdc97'; ctx.fillRect(x - radius, y - radius - 5, 2 * radius * Math.max(0, health), 2.5);
      }
      this.drawDefenseIndicators(enemy);
    }
    for (const event of this.visuals) {
      const age = this.elapsed - event.start;
      if (event.actor) this.drawActor(event.actor, 'death', age);
      drawEffect(ctx, event.id, age, event.x, event.y, event.size);
    }
    ctx.restore();
    this.drawDamageTexts(ctx);
  }

  drawDefenseIndicators(enemy) {
    const count = enemy.resistances.length + enemy.immunities.length;
    const size = Math.min(12, enemy.radius);
    let x = enemy.x - size * count / 2;
    const y = enemy.y + enemy.radius - 1;
    for (const type of enemy.resistances) {
      graphic(this.ctx, 'resist.' + type, x, y, size); x += size;
    }
    for (const type of enemy.immunities) {
      graphic(this.ctx, 'immune.' + type, x, y, size); x += size;
    }
  }

  // 检查冰霜地面减速效果
  checkFrostGroundEffect(enemy, currentTime) {
    if (!this.waveComponent) return;
    
    const frostGrounds = this.waveComponent.getFrostGrounds();
    
    // 检查敌人是否对冰系免疫
    const resistance = GameConfig.checkWaveResistance(enemy, 'ice');
    if (resistance.immune) return;
    
    // 检查敌人是否在任何冰霜地面范围内
    let inFrostGround = false;
    for (let frost of frostGrounds) {
      const distance = Utils.calculateDistance(enemy.x, enemy.y, frost.x, frost.y);
      if (distance <= frost.radius) {
        inFrostGround = true;
        
        // 应用冰霜地面减速效果（如果还没有更强的减速效果）
        const existingSlow = enemy.statusEffects.get('slow');
        const frostSlowEffect = frost.slowEffect; // 0.5，减速50%
        
        if (!existingSlow || existingSlow.multiplier > frostSlowEffect) {
          enemy.statusEffects.set('slow', {
            multiplier: frostSlowEffect,
            endTime: currentTime + 500, // 短暂持续，会被持续刷新
            source: 'frostGround' // 标记来源
          });
        }
        break;
      }
    }
    
    // 如果敌人离开了所有冰霜地面，移除冰霜地面的减速效果
    if (!inFrostGround) {
      const existingSlow = enemy.statusEffects.get('slow');
      if (existingSlow && existingSlow.source === 'frostGround') {
        enemy.statusEffects.delete('slow');
      }
    }
  }

  // 检查极地风暴伤害效果
  checkPolarStormEffect(enemy, currentTime) {
    if (!this.waveComponent) return;
    
    const polarStorms = this.waveComponent.getPolarStorms();
    if (!polarStorms || polarStorms.length === 0) return;
    
    // 检查敌人是否对冰系免疫
    const resistance = GameConfig.checkWaveResistance(enemy, 'ice');
    if (resistance.immune) return;
    
    for (const storm of polarStorms) {
      if (Utils.calculateDistance(enemy.x, enemy.y, storm.x, storm.y) > storm.radius) continue;
      const slow = enemy.statusEffects.get('slow');
      if (!slow || slow.multiplier > 0.3 || slow.source === 'storm') {
        enemy.statusEffects.set('slow', { multiplier: 0.3, endTime: currentTime + 350, source: 'storm' });
      }
      if (!storm.hit.has(enemy.id)) {
        storm.hit.add(enemy.id);
        const damage = GameConfig.calculateDamage(this.attackPower() * 0.8, 'ice', enemy, false, null, this.upgradeSystem);
        if (damage > 0) this.takeDamage(enemy, damage, 'ice', false, 'frost');
      }
    }
  }

  // 获取敌人数组（用于其他组件访问）
  getEnemies() {
    return this.enemies;
  }
  
  // 设置敌人击杀回调
  setEnemyKilledCallback(callback) {
    this.onEnemyKilled = callback;
  }
  
  // 清除所有敌人（用于游戏重置）
  clearEnemies() {
    this.enemies = [];
    this.damageTexts = [];
    this.visuals = [];
    this.links = [];
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

  // 添加伤害文字
  addDamageText(enemy, damage, isCritical = false, damageType = 'normal') {
    if (this.damageTexts.length >= 80) this.damageTexts.shift();
    const damageText = {
      id: this.elapsed + Math.random(),
      x: enemy.x + (Math.random() - 0.5) * 20, // 随机偏移
      y: enemy.y - enemy.radius - 10,
      damage: this.formatNumber(Math.max(0, damage)),
      isCritical: isCritical,
      damageType: damageType, // 伤害类型：normal, burn
      startTime: this.elapsed,
      duration: 1500, // 显示1.5秒
      opacity: 1.0
    };
    
    this.damageTexts.push(damageText);
  }
  
  // 更新伤害文字
  updateDamageTexts(deltaTime) {
    const currentTime = this.elapsed;
    
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const text = this.damageTexts[i];
      const elapsed = currentTime - text.startTime;
      
      if (elapsed >= text.duration) {
        this.damageTexts.splice(i, 1);
        continue;
      }
      
      // 更新位置和透明度
      const progress = elapsed / text.duration;
      text.y -= 30 * deltaTime; // 向上飘动
      text.opacity = 1.0 - progress; // 逐渐透明
    }
  }
  
  // 绘制伤害文字
  drawDamageTexts(ctx) {
    ctx.save();
    
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#11232a';
    ctx.lineWidth = 2;
    for (const text of this.damageTexts) {
      ctx.globalAlpha = text.opacity;
      ctx.font = text.isCritical ? 'bold 15px sans-serif' : '600 12px sans-serif';
      ctx.fillStyle = text.isCritical || text.damageType === 'chain' ? '#f7c986' :
        text.damageType === 'burn' ? '#ff9c83' : '#e6eee9';
      ctx.strokeText(text.damage, text.x, text.y);
      ctx.fillText(text.damage, text.x, text.y);
    }
    ctx.restore();
  }
  
}

module.exports = EnemyComponent;

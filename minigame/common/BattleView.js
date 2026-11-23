const { colors, panel, label, button, contains, graphic, nine, background } = require('./GameUI');

const { BATTLEFIELD } = require('./GameConfig');
const Art = require('./Art');
const { drawEffect, duration } = require('./FlightEffects');
const TAU = Math.PI * 2;
function circle(ctx, x, y, radius, fill, stroke, weight = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
}

class BattleView {
  constructor(canvas, ctx, info) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.info = info;
    this.actions = [];
  }

  resize() {
    const { width, height } = this.canvas;
    this.scale = Math.min(width / BATTLEFIELD.width, height / BATTLEFIELD.height);
    this.left = (width - BATTLEFIELD.width * this.scale) / 2;
    this.top = (height - BATTLEFIELD.height * this.scale) / 2;
  }

  drawArena(game) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const far = Art.image('sky/far.jpg'), cloud = Art.image('sky/clouds.png');
    ctx.fillStyle = '#3c8297';
    ctx.fillRect(0, 0, width, height);
    if (far) Art.player.drawSky(ctx, far, cloud, game.elapsed, width, height);
    ctx.save();
    ctx.translate(this.left, this.top);
    ctx.scale(this.scale, this.scale);
    ctx.beginPath();
    ctx.rect(0, 0, BATTLEFIELD.width, BATTLEFIELD.height);
    ctx.clip();
    game.waveComponent.draw();
    game.enemyComponent.draw();
    this.drawCore(game);
    ctx.restore();
  }

  drawCore(game) {
    const ctx = this.ctx, { x, y, radius, health, maxHealth } = game.player;
    const { sheet, forms } = Art.forms;
    const form = forms[game.formMask];
    let action = 'fly', age = game.elapsed;
    if (game.gameState === 'gameOver') {
      action = 'defeat'; age = game.defeatAge;
    } else if (game.formAction) {
      const elapsed = game.elapsed - game.formAction.start;
      if (elapsed < duration(sheet.animations[game.formAction.name])) {
        action = game.formAction.name; age = elapsed;
      }
    }
    if (game.gameState !== 'gameOver') {
      drawEffect(ctx, 'core-trail', game.elapsed, x, y + radius * 1.22, radius * 2.6, radius * 3, 0, .48);
    }
    const size = radius * 2 * sheet.frameWidth / sheet.neutralSpanPx;
    const image = Art.image(form.sheet);
    if (image) Art.player.drawFrame(ctx, image, sheet, action, age, x, y, size);
    else {
      const portrait = Art.image(form.portrait);
      if (portrait) ctx.drawImage(portrait, x-size/2, y-size/2, size, size);
      else circle(ctx, x, y, radius, '#317774', '#ffe3a5', 2);
    }
    if (game.enhancementComponent.enhancementSystem.getPlayerStats().shield > 0) {
      drawEffect(ctx, 'shield', game.elapsed, x, y, radius * 3);
    }
    if (health > 0 && health / maxHealth < .25) {
      drawEffect(ctx, 'low-health', game.elapsed, x, y, size * 1.3);
    }
  }

  drawHud(game) {
    const ctx = this.ctx, { width: w, height: h } = this.canvas;
    const player = game.player, top = (this.info.safeTop || 8) + 4;
    const margin = Math.max(14, (w - 480) / 2), left = margin + 55, right = w - margin;
    ctx.save();
    const topFade = ctx.createLinearGradient(0, 0, 0, top + 65);
    topFade.addColorStop(0, 'rgba(9,30,34,.93)');
    topFade.addColorStop(.67, 'rgba(11,38,43,.72)');
    topFade.addColorStop(1, 'rgba(11,38,43,0)');
    ctx.fillStyle = topFade; ctx.fillRect(0, 0, w, top + 65);
    label(ctx, '第 ' + game.levelManager.currentLevel + ' 关', left, top + 8, 19, colors.text, 'left', true);
    const seconds = Math.max(0, Math.ceil(game.levelManager.timeRemaining - 1e-8));
    label(ctx, seconds + ' 秒', left + 94, top + 8, 14, seconds <= 5 ? '#ffba8f' : colors.text);
    label(ctx, String(game.score), right, top + 8, 24, colors.text, 'right', true);
    const exp = game.experienceSystem.getExperienceStatus();
    const total = right-left, hpW = total*.48, xpX = left + hpW + 12;
    const hpRatio = player.health / player.maxHealth;
    label(ctx, '生命 '+Math.ceil(player.health)+' / '+Math.ceil(player.maxHealth),left,top+32,11,colors.text);
    label(ctx, '等级 '+exp.currentLevel,xpX,top+32,11,colors.muted);
    ctx.fillStyle = '#34504b'; ctx.fillRect(left,top+42,hpW,4); ctx.fillRect(xpX,top+42,right-xpX,4);
    ctx.fillStyle = hpRatio < .25 ? '#ff9c71' : '#efca78'; ctx.fillRect(left,top+42,hpW*hpRatio,4);
    ctx.fillStyle = '#8ad2c0'; ctx.fillRect(xpX,top+42,(right-xpX)*exp.currentLevelProgress/100,4);
    const controlsY = game.waveButtons[0].y;
    const gradient = ctx.createLinearGradient(0, controlsY-62, 0, h);
    gradient.addColorStop(0, 'rgba(10,30,36,0)');
    gradient.addColorStop(.55, 'rgba(10,30,36,.76)');
    gradient.addColorStop(1, 'rgba(9,27,33,.96)');
    ctx.fillStyle = gradient; ctx.fillRect(0,controlsY-62,w,h-controlsY+62);
    const hint = game.hintUntil > game.elapsed ? game.hint :
      (game.levelManager.currentLevel === 1 && game.waveButtons[2].lastUseTime === -Infinity ? '敌人靠近时，轻点普通波' : '');
    if (hint) label(ctx, hint, w/2, controlsY-43, 13, colors.text, 'center', true);
    if (game.discovery && game.elapsed - game.discovery.at < 1800) {
      const {species, at} = game.discovery;
      const x = margin + 3, y = top + 63;
      panel(ctx, {x,y,width:145,height:28}, 'rgba(16,44,45,.87)', 9);
      const badge = Art.image(species.badge);
      if (badge) ctx.drawImage(badge,x+4,y+2,24,24);
      drawEffect(ctx,'new-entry',game.elapsed-at,x+16,y+14,35);
      label(ctx,'新图鉴 · '+species.name,x+30,y+14,12,colors.text);
    }
    for (const b of game.waveButtons) {
      const unlocked = game.upgradeSystem.isWaveUnlocked(b.type);
      const recovery = game.waveRecovery(b), r = b.type === 'normal' ? b.radius : b.radius*.86;
      circle(ctx,b.x,b.y,r,'#2c4a4b',unlocked?'#d9ac6b':'#82908a',unlocked?2:1);
      ctx.save(); ctx.globalAlpha = !unlocked ? .4 : recovery.remaining > .01 ? .62 : 1;
      if (!graphic(ctx,'skill.'+b.type,b.x-r+1,b.y-r+1,2*(r-1))) {
        label(ctx,b.label.slice(0,1),b.x,b.y,16,b.color,'center',true);
      }
      ctx.restore();
      if (!unlocked) {
        circle(ctx,b.x+r*.61,b.y+r*.64,7,'#233e42');
        graphic(ctx,'action.lock',b.x+r*.61-6,b.y+r*.64-6,12);
      }
      if (unlocked && recovery.remaining > .01) {
        ctx.beginPath(); ctx.arc(b.x,b.y,r-2,-Math.PI/2,-Math.PI/2 + TAU * recovery.remaining/recovery.duration);
        ctx.strokeStyle = recovery.switching ? colors.mint : colors.gold; ctx.lineWidth = 3; ctx.stroke();
      }
      const text = recovery.switching && unlocked ? '切换中' : unlocked && recovery.remaining > .01 ?
        (recovery.remaining / 1000).toFixed(1)+'秒' : b.label;
      label(ctx,text,b.x,b.y+b.radius+13,12,unlocked ? colors.text : colors.muted,'center');
    }
    ctx.restore();
  }

  drawWaveClear({ level, perfect, kills, elapsed }) {
    const ctx = this.ctx, { width, height } = this.canvas;
    const fade = Math.min(1, elapsed / 150);
    const center = width / 2, boxWidth = Math.min(300, width - 44);
    const box = { x: center - boxWidth / 2, y: height * .37 - 40, width: boxWidth, height: 80 };
    ctx.save();
    ctx.fillStyle = 'rgba(11, 31, 34, ' + (.22 + fade * .2) + ')';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(0, 6 * (1 - fade));
    panel(ctx, box, colors.surface, 12);
    label(ctx, '第 ' + level + ' 关守住了', center, box.y + 29, 24, colors.text, 'center', true);
    const summary = (perfect ? '无伤通关' : '通关') + '  ·  击败 ' + kills + ' 名来敌';
    label(ctx, summary, center, box.y + 56, 14, colors.gold, 'center');
    ctx.restore();
  }

  drawResult(game, canRevive) {
    const { width: w, height: h } = this.canvas;
    const ctx = this.ctx;
    ctx.save();
    background(ctx, { w, h });
    const top = this.info.safeTop || 10, bottom = h - (this.info.safeBottom || 0) - 12;
    const height = Math.min(640, bottom - top);
    const y = top + (bottom - top - height) / 2;
    const width = Math.min(w - 38, 360), x = (w - width) / 2, center = w / 2;
    label(ctx, canRevive ? '飞龟遇险' : '航程结算', x, y + 16, 25, colors.text, 'left', true);
    label(ctx, '第 '+game.levelManager.currentLevel+' 关',x+width,y+16,14,colors.gold,'right');
    const form = Art.forms.forms[game.formMask];
    const ship = Art.image(form.sheet);
    const shipSize = Math.min(137, height * .23);
    if (ship) {
      Art.player.drawFrame(ctx, ship, Art.forms.sheet, canRevive ? 'defeat' : 'fly',
        canRevive ? 300 : game.elapsed, center, y + height * .24, shipSize);
    } else {
      const portrait = Art.image(form.portrait);
      if (portrait) ctx.drawImage(portrait, center - shipSize/2, y + height*.24 - shipSize/2, shipSize, shipSize);
    }
    const parchment = { x, y: y + height*.39, width, height: height*.24 };
    if (!nine(ctx, 'component.panel-light', parchment)) panel(ctx, parchment, '#ead6b2', 13);
    const ink = '#374039';
    label(ctx, '本次得分', center, parchment.y+parchment.height*.21, 14, ink, 'center');
    label(ctx, String(game.score), center, parchment.y+parchment.height*.54, Math.min(52, height*.073), ink, 'center', true);
    const best = game.score > game.previousBest ? '新的个人纪录' : '个人最高 '+game.highScore+' 分';
    label(ctx, best, center, parchment.y+parchment.height*.85, 13, '#555d4b', 'center');
    this.actions = [];
    const action = (id, title, fraction, strong) => {
      const rect = {x: x+10, y: y+height*fraction, width: width-20, height: Math.min(48, height*.095)};
      button(ctx, rect, title, strong);
      this.actions.push({ id, rect });
    };
    if (canRevive) {
      action('revive', game.reviveState.isShowingAd ? '广告加载中…' : '看视频 · 满血复活', .70, true);
      const message = game.gameOverMessage.until > Date.now() ? game.gameOverMessage.text : '本局可复活一次';
      label(ctx, message, center, y+height*.835, 13, colors.muted, 'center', false, width);
      action('finish','结束航程',.90,false);
    } else {
      action('restart','再次起飞',.67,true);
      action('rank','航行排行榜',.785,false);
      action('menu','返回首页',.90,false);
    }
    ctx.restore();
  }

  resultActionAt(x, y) {
    const action = this.actions.find(a => contains(a.rect, x, y));
    return action && action.id;
  }
}

module.exports = BattleView;

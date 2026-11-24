const feedback = require('./Feedback');
const ranks = require('./RankManager');
const { COMPLIANCE_CONFIG: compliance } = require('./GameConfig');
const collection = require('./Collection');
const art = require('./Art');
const { bounds, contains, panel, label, wrap, nine, graphic, button, buttonLabel } = require('./GameUI');

const W = 375, H = 620;
const cream = '#fff1d2', soft = '#dccea9', ink = '#283b38';
const elementNames = { wind: '风', fire: '火', ice: '冰', electric: '电' };
const routes = [0, 1, 4, 6, 10];

function picture(ctx, path, x, y, w, h, cover = false) {
  const image = art.image(path);
  if (!image) return;
  const scale = (cover ? Math.max : Math.min)(w / image.width, h / image.height);
  if (cover) {
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  } else {
    const iw = image.width * scale, ih = image.height * scale;
    ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
}

function shade(ctx, x, y, width, height, start, end) {
  const g = ctx.createLinearGradient(x, y, x, y + height);
  if (!g) return;
  g.addColorStop(0, start);
  g.addColorStop(1, end);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, width, height);
}

function title(ctx, text, x, y, size, color = cream) {
  ctx.font = 'bold ' + size + 'px serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

class MenuComponent {
  constructor(canvas, ctx, systemInfo) {
    this.ctx = ctx;
    this.systemInfo = systemInfo;
    this.page = 'home';
    this.codexStage = 0;
    this.codexPage = 0;
    this.formMask = 0;
    this.zones = [];
  }

  get healthAdviceOpen() { return this.page === 'guide'; }

  draw(fromPause = false) {
    const c = this.ctx, view = bounds(this.systemInfo);
    const home = this.page === 'home';
    this.zones = [];
    c.save();
    c.fillStyle = '#16373b';
    c.fillRect(0, 0, view.w, view.h);
    if (home) {
      picture(c, 'assets/hero.jpg', 0, 0, view.w, view.h, true);
      shade(c, 0, 0, view.w, view.h * .3, 'rgba(15,37,41,.8)', 'rgba(15,37,41,0)');
      shade(c, 0, view.h * .6, view.w, view.h * .4, 'rgba(12,31,32,0)', 'rgba(12,31,32,.98)');
    } else {
      c.save();
      c.globalAlpha = .19;
      picture(c, 'sky/far.jpg', 0, 0, view.w, view.h, true);
      c.restore();
      shade(c, 0, 0, view.w, view.h, 'rgba(11,35,39,.1)', '#112f31');
    }
    const scale = Math.min(view.w / W, (view.bottom - view.top) / H);
    this.scale = scale;
    this.left = (view.w - W * scale) / 2;
    this.top = view.top + (view.bottom - view.top - H * scale) / 2;
    c.translate(this.left, this.top);
    c.scale(scale, scale);
    switch (this.page) {
      case 'home': this.home(); break;
      case 'guide': this.guide(); break;
      case 'settings': this.settings(fromPause); break;
      case 'codex': this.codex(); break;
      case 'entry': this.entry(); break;
      case 'forms': this.forms(); break;
    }
    c.restore();
  }

  zone(action, x, y, width, height) {
    const rect = { x: this.left + x * this.scale, y: this.top + y * this.scale,
      width: width * this.scale, height: height * this.scale };
    this.zones.push({ action, rect });
    return rect;
  }

  control(action, caption, x, y, width, height, style = 'secondary') {
    const box = { x, y, width, height };
    if (!nine(this.ctx, 'component.button-' + style, box)) {
      panel(this.ctx, box, style === 'primary' ? '#9a653f' : '#384e49');
    }
    buttonLabel(this.ctx, box, caption, { family: 'serif', color: action ? cream : '#bdc1ac' });
    return action ? this.zone(action, x, y, width, height) : null;
  }

  plate(x, y, width, height, light) {
    const box = { x, y, width, height };
    if (!nine(this.ctx, 'component.' + (light ? 'panel-light' : 'panel'), box)) {
      panel(this.ctx, box, light ? '#eadbbd' : '#2d4949');
    }
  }

  heading(name, detail, back = 'home') {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(30, 15);
    c.lineTo(21, 24);
    c.lineTo(30, 33);
    c.strokeStyle = '#f2c688';
    c.lineWidth = 2.5;
    c.stroke();
    this.zone(back, 0, 0, 48, 49);
    label(c, name, 51, 24, 24, cream, 'left', true);
    label(c, detail, 353, 27, 12, soft, 'right');
    c.fillStyle = '#b49b69';
    c.fillRect(20, 51, 335, 1);
  }

  home() {
    const c = this.ctx;
    c.save();
    c.shadowColor = '#432f21';
    c.shadowBlur = 6;
    c.shadowOffsetY = 2;
    title(c, '守住圆心', W / 2, 53, 54);
    title(c, 'Cloudshell Citadel', W / 2, 97, 20);
    c.restore();
    this.control('settings', '设置', 300, 2, 67, 44);
    const legal = [[compliance.APPROVAL_NUMBER, '游戏批准文号 '],
      [compliance.PUBLICATION_NUMBER, '网络游戏出版号 '],
      [compliance.COPYRIGHT_REG_NO, '著作权登记号 ']].filter(([v]) => v);
    const lift = Math.max(0, legal.length - 1) * 14;
    this.startButton = this.control('launch', '开始飞行', 59, 438 - lift, 257, 56, 'primary');
    this.control('codex', '来敌图鉴', 13, 509 - lift, 111, 46);
    this.control('forms', '飞龟形态', 132, 509 - lift, 111, 46);
    this.rankButton = this.control('rank', '排行榜', 251, 509 - lift, 111, 46);
    legal.forEach(([value, prefix], i) => label(c, prefix + value, W / 2,
      579 - lift + i * 14, 11, cream, 'center'));
    label(c, [compliance.AGE_LABEL, '健康游戏忠告'].filter(Boolean).join('　·　'), W / 2, 605, 12, cream, 'center');
    this.zone('guide', 40, 585, 295, 35);
  }

  settings(fromPause) {
    this.heading('设置', '');
    const current = feedback.preferences();
    const rows = [['sound', '游戏音效'], ['music', '背景音乐'], ['vibration', '设备震动']];
    rows.forEach(([key, name], i) => {
      const y = 112 + i * 91;
      this.plate(19, y, 337, 76, false);
      label(this.ctx, name, 42, y + 38, 19, cream, 'left', true);
      button(this.ctx, { x: 225, y: y + 11, width: 109, height: 54 },
        current[key] ? '已开启' : '已关闭', current[key]);
      this.zone('toggle:' + key, 19, y, 337, 76);
    });
    this.control('home', fromPause ? '返回暂停菜单' : '返回首页', 42, 522, 291, 54);
  }

  guide() {
    this.heading('健康游戏忠告', compliance.AGE_LABEL);
    this.plate(19, 103, 337, 389, true);
    const c = this.ctx;
    c.font = '17px sans-serif';
    const lines = compliance.HEALTH_ADVICE_TEXT.split('。').filter(Boolean)
      .flatMap(s => wrap(c, s + '。', 281));
    lines.forEach((line, i) => label(c, line, 49, 165 + i * Math.min(42, 242 / lines.length), 17, ink));
    this.healthAdviceAcceptButton = this.control(this.departAfterGuide ? 'depart' : 'home',
      this.departAfterGuide ? '我已知晓 · 开始飞行' : '返回首页', 42, 522, 291, 54, 'primary');
  }

  codex() {
    const c = this.ctx, seen = collection.encounters();
    const species = art.creatures.creatures;
    this.heading('来敌图鉴', Object.keys(seen).length + ' / ' + species.length);
    routes.forEach((level, i) => this.control('filter:' + level, level ? level + ' 关' : '全航线',
      13 + i * 70, 64, 67, 40, level === this.codexStage ? 'primary' : 'secondary'));
    const list = species.filter(s => !this.codexStage || s.minLevel <= this.codexStage);
    const pages = Math.ceil(list.length / 6);
    list.slice(this.codexPage * 6, this.codexPage * 6 + 6).forEach((item, i) => {
      const x = 16 + i % 2 * 175, y = 119 + Math.floor(i / 2) * 143;
      const known = !!seen[item.id];
      this.plate(x, y, 167, 134, true);
      if (!known) panel(c, { x: x + 7, y: y + 7, width: 153, height: 120 }, '#a1b0a3', 5);
      picture(c, known ? item.portrait : item.silhouette, x + 30, y + 5, 107, 81);
      if (known) {
        picture(c, item.badge, x + 11, y + 10, 26, 26);
        this.zone('entry:' + item.id, x, y, 167, 134);
      }
      title(c, known ? item.name : '未遭遇', x + 83, y + 97, 17, ink);
      label(c, '第 ' + item.minLevel + ' 关起', x + 83, y + 117, 12, ink, 'center');
    });
    this.control(this.codexPage ? 'prev' : null, '上一页', 19, 560, 108, 47, this.codexPage ? 'secondary' : 'disabled');
    label(c, (this.codexPage + 1) + ' / ' + pages, W / 2, 584, 16, cream, 'center');
    const next = this.codexPage < pages - 1;
    this.control(next ? 'next' : null, '下一页', 248, 560, 108, 47, next ? 'secondary' : 'disabled');
  }

  entry() {
    const c = this.ctx, item = this.selected;
    this.heading('图鉴详情', '首次遇见 · 第 ' + collection.encounters()[item.id] + ' 关', 'codex');
    this.plate(19, 75, 337, 342, true);
    picture(c, item.portrait, 60, 89, 255, 213);
    title(c, item.name, W / 2, 329, 28, ink);
    picture(c, item.badge, 87, 357, 31, 31);
    label(c, item.class + '　·　第 ' + item.minLevel + ' 关起', 127, 373, 15, ink);
    const stats = item.baseStats;
    [['基础速度', stats.speed], ['体型', item.radius * 2], ['基础护甲', stats.armor], ['基础护盾', stats.shield]]
      .forEach(([k, v], i) => {
        label(c, k, 58 + i * 85, 446, 13, soft, 'center');
        label(c, String(v), 58 + i * 85, 471, 19, cream, 'center', true);
      });
    const defenses = collection.firstDefenses(item.id);
    label(c, item.id === 'ghost' ? '固有免疫' : '首次遭遇防御', 28, 520, 13, soft);
    if (defenses) {
      const marks = [...defenses.immune.map(k => 'immune.' + k), ...defenses.resist.map(k => 'resist.' + k)];
      if (!marks.length) label(c, '无额外防御', 144, 520, 14, cream);
      marks.forEach((id, i) => graphic(c, id, 135 + i * 39, 503, 33));
    }
    this.control('codex', '返回图鉴', 49, 560, 277, 47);
  }

  forms() {
    const c = this.ctx, mask = this.formMask, form = art.forms.forms.find(f => f.mask === mask);
    this.heading('飞龟形态', collection.hasForm(mask) ? '已在航程中到达' : '形态预览');
    this.plate(19, 72, 337, 292, false);
    picture(c, 'sky/far.jpg', 27, 80, 321, 276, true);
    shade(c, 27, 261, 321, 95, 'rgba(12,38,40,0)', 'rgba(12,38,40,.93)');
    picture(c, form.portrait, 80, 85, 215, 223);
    title(c, form.name, W / 2, 330, 24);
    label(c, '背甲装备', 25, 390, 16, cream);
    label(c, (form.stage + 1) + ' / 5 阶', 347, 390, 14, soft, 'right');
    Object.entries(elementNames).forEach(([key, name], i) => {
      const active = !!(mask & art.forms.bits[key]), x = 19 + i * 86;
      const box = { x, y: 415, width: 79, height: 92 };
      panel(c, box, active ? '#92653e' : '#304a4b', 12);
      c.save();
      c.globalAlpha = active ? 1 : .65;
      graphic(c, 'skill.' + key, x + 16, 420, 47);
      c.restore();
      const module = art.forms.modules.find(m => m.id === key);
      label(c, active ? module.name : name + '系', x + 40, 487, 13, cream, 'center');
      this.zone('module:' + key, x, 409, 79, 104);
    });
    this.control('initial', '查看初始形态', 20, 548, 160, 50);
    this.control('final', '查看最终形态', 193, 548, 162, 50, 'primary');
  }

  handleTouch(x, y) {
    const hit = this.zones.find(z => contains(z.rect, x, y));
    if (!hit) return null;
    const [action, key] = hit.action.split(':');
    switch (action) {
      case 'launch': case 'guide':
        this.departAfterGuide = action === 'launch';
        this.page = 'guide';
        break;
      case 'depart':
        this.page = 'home';
        this.zones = [];
        return 'startGame';
      case 'rank':
        ranks.open();
        return 'showRank';
      case 'toggle': feedback.toggle(key); break;
      case 'settings': case 'home': case 'codex': case 'forms': this.page = action; break;
      case 'prev': this.codexPage--; break;
      case 'next': this.codexPage++; break;
      case 'filter': this.codexStage = Number(key); this.codexPage = 0; break;
      case 'entry':
        this.selected = art.creatures.creatures.find(e => e.id === key);
        this.page = 'entry';
        break;
      case 'module': this.formMask ^= art.forms.bits[key]; break;
      case 'initial': this.formMask = 0; break;
      case 'final': this.formMask = 15; break;
    }
    this.zones = [];
    return null;
  }
}

module.exports = MenuComponent;

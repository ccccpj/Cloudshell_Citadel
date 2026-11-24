const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { createHash, randomUUID } = require('node:crypto');
const { issueRun, verifiedScore } = require('../cloudfunctions/leaderboard/runs');

const day = 86400000;
const prefix = '/api/rank/';
const nicknamePattern = /^[\p{L}\p{N} _-]{1,16}$/u;

function createRankHandler(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY, owner TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS leaders ON players(score DESC, id);
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, owner TEXT NOT NULL, started INTEGER NOT NULL, rules TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS expiration ON runs(started);
  `);
  const start = db.prepare('INSERT INTO runs VALUES (?,?,?,?)');
  const clean = db.prepare('DELETE FROM runs WHERE started < ?');
  const find = db.prepare('SELECT rules, started FROM runs WHERE id=? AND owner=? AND started>=?');
  const list = db.prepare('SELECT id AS player,name,score,owner=? AS mine FROM players WHERE score>0 ORDER BY score DESC,id LIMIT 10');
  const profile = db.prepare('SELECT name FROM players WHERE owner=?');
  const rename = db.prepare('INSERT INTO players(owner,name) VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name');
  const save = db.prepare('INSERT INTO players(owner,score) VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET score=excluded.score WHERE excluded.score>players.score');

  function respond(res, status, body) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify(body));
  }
  return async function handle(req, res) {
    try {
      const action = req.url.slice(prefix.length);
      const auth = /^Bearer ([0-9a-f-]{36})$/.exec(req.headers.authorization || '');
      if (!auth) return respond(res, 401, {error:'玩家标识无效'});
      const owner = createHash('sha256').update(auth[1]).digest('hex');
      if (action === 'list' && req.method === 'GET') {
        return respond(res, 200, {rows:list.all(owner), nickname:profile.get(owner)?.name || ''});
      }
      if (req.method !== 'POST' || !['start','finish','nickname'].includes(action)) return respond(res,404,{error:'接口不存在'});
      const parts = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) return respond(res,413,{error:'记录过长'});
        parts.push(chunk);
      }
      let data;
      try { data = JSON.parse(Buffer.concat(parts).toString('utf8')); }
      catch { return respond(res,400,{error:'数据格式错误'}); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return respond(res,400,{error:'数据格式错误'});
      if (action === 'nickname') {
        const name = typeof data.name === 'string' ? data.name.trim().normalize('NFC') : '';
        if (!nicknamePattern.test(name)) return respond(res,400,{error:'请输入 1–16 个字，可用文字、数字、空格、短横线或下划线'});
        rename.run(owner,name);
        return respond(res,200,{nickname:name});
      }
      const now = Date.now();
      if (action === 'start') {
        if (data.version !== 2) return respond(res,400,{error:'请刷新游戏后再试'});
        const rules = issueRun(data.version);
        const id = randomUUID();
        clean.run(now-day);
        start.run(id,owner,now,JSON.stringify(rules));
        return respond(res,200,{id,...rules});
      }
      const run = typeof data.id === 'string' && find.get(data.id,owner,now-day);
      if (!run) return respond(res,200,{status:'expired'});
      let score;
      try { score = verifiedScore(JSON.parse(run.rules),now-run.started+3000,data.kills); }
      catch { return respond(res,200,{status:'invalid'}); }
      if (score > 0) save.run(owner,score);
      return respond(res,200,{status:'saved',score});
    } catch (error) {
      console.error('网页榜请求失败',error.message);
      if (!res.headersSent && !res.destroyed) respond(res,500,{error:'网页榜暂时不可用'});
    }
  };
}

if (require.main === module) {
  const handler = createRankHandler(process.env.RANK_DB);
  http.createServer(handler).listen(18793,'127.0.0.1');
}
module.exports = { createRankHandler };

const cloud = require('wx-server-sdk');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
const { issueRun, verifiedScore } = require('./runs');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

let pool;
exports.main = async event => {
  const { OPENID, APPID } = cloud.getWXContext();
  if (!OPENID || !APPID) throw new Error('请从微信小游戏访问');
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('缺少排行榜数据库连接');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5000 });
  }
  if (event.action === 'list') {
    const { rows } = await pool.query(
      `SELECT player::text, verified_score AS score, openid = $2 AS mine FROM circle_game.scores
       WHERE appid = $1 AND verified_score > 0 ORDER BY verified_score DESC, player LIMIT 10`, [APPID, OPENID]
    );
    return { rows: rows.map(row => ({ ...row, score: Number(row.score) })) };
  }
  if (event.action === 'start') {
    const issued = issueRun(event.version), id = randomUUID();
    await pool.query('DELETE FROM circle_game.runs WHERE started_at < now() - interval \'1 day\'');
    await pool.query(
      'INSERT INTO circle_game.runs (id, appid, openid, decks) VALUES ($1,$2,$3,$4)',
      [id, APPID, OPENID, JSON.stringify(issued)]
    );
    return { id, ...issued };
  }
  if (event.action !== 'finish' || typeof event.id !== 'string' || event.id.length !== 36) {
    throw new Error('未知对局操作');
  }
  const { rows: [run] } = await pool.query(
    `SELECT decks, EXTRACT(EPOCH FROM (now() - started_at))::float8 * 1000 AS elapsed
     FROM circle_game.runs WHERE id = $1 AND appid = $2 AND openid = $3
     AND started_at >= now() - interval '1 day'`, [event.id, APPID, OPENID]
  );
  if (!run) return { status: 'expired' };
  // Include initial cloud round-trip and frame rounding. All time bounds use the database clock.
  const score = verifiedScore(run.decks, run.elapsed + 3000, event.kills);
  if (score > 0) await pool.query(
    `INSERT INTO circle_game.scores AS scores (appid, openid, score, verified_score) VALUES ($1,$2,LEAST($3::bigint, 2147483647)::integer,$3)
     ON CONFLICT (appid, openid) DO UPDATE SET verified_score = EXCLUDED.verified_score
     WHERE scores.verified_score IS NULL OR scores.verified_score < EXCLUDED.verified_score`, [APPID, OPENID, score]
  );
  return { status: 'saved', score };
};

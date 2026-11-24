const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');

test('网页榜按玩家保存最高分，昵称可重名和修改，并验证对局归属', {
  skip: !process.getBuiltinModule?.('node:sqlite')
}, async t => {
  const { createRankHandler } = require('../server/web-rank');
  const server = http.createServer(createRankHandler(':memory:')).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/rank/';
  async function request(token, action, data) {
    const response = await fetch(base + action, {
      method: data ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { status: response.status, ...await response.json() };
  }
  const first = randomUUID(), second = randomUUID();
  for (const token of [first, second]) {
    assert.equal((await request(token, 'nickname', { name: '云海' })).nickname, '云海');
  }
  assert.equal((await request(first, 'nickname', { name: '<' })).status, 400);
  assert.equal((await request('', 'list')).status, 401);
  const firstRun = await request(first, 'start', { version: 2 });
  const secondRun = await request(second, 'start', { version: 2 });
  assert.equal((await request(second, 'finish', { id: firstRun.id, kills: [[0]] })).status, 'expired');
  assert.equal((await request(first, 'finish', { id: firstRun.id, kills: [[90]] })).status, 'invalid');
  assert.equal((await request(first, 'finish', { id: firstRun.id, kills: [[0, 1]], score: 9000 })).score, 25);
  await request(first, 'finish', { id: firstRun.id, kills: [[0]] });
  await request(second, 'finish', { id: secondRun.id, kills: [[1]] });
  const { rows } = await request(first, 'list');
  assert.deepEqual(rows.map(row => [row.name, row.score, row.mine]), [['云海',25,1], ['云海',15,0]]);
  await request(first, 'nickname', { name: '圆心' });
  const renamed = await request(second, 'list');
  assert.equal(renamed.nickname, '云海');
  assert.deepEqual(renamed.rows.map(row => [row.name, row.score, row.mine]), [['圆心',25,0], ['云海',15,1]]);
});

// Local browser host for the same CommonJS entry point that WeChat runs.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../minigame');
const browser = path.join(__dirname, 'browser');
function modulesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? modulesIn(file) : entry.name.endsWith('.js') ? [file] : [];
  });
}
function gameBundle() {
  const files = [path.join(root, 'game.js'), path.join(root, 'settings.js'), ...modulesIn(path.join(root, 'common'))];
  const factories = files.map(file => {
    const id = path.relative(root, file).split(path.sep).join('/').slice(0, -3);
    return JSON.stringify(id) + ': function(require,module,exports){\n' + fs.readFileSync(file, 'utf8') + '\n}';
  });
  const loader = fs.readFileSync(path.join(browser, 'loader.js'), 'utf8');
  return '(' + loader + ')({\n' + factories.join(',\n') + '\n});';
}
const mime = {'.jpg':'image/jpeg','.png':'image/png','.m4a':'audio/mp4','.js':'application/javascript','.html':'text/html; charset=utf-8'};
let rankHandler;
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 13)) {
  const dir = path.join(require('node:os').tmpdir(), 'cloudshell-citadel-preview');
  fs.mkdirSync(dir, { recursive:true, mode:0o700 });
  rankHandler = require('../server/web-rank').createRankHandler(path.join(dir,'rank.sqlite'));
}
const port = Number(process.argv[2] || 18421);
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/rank/')) {
    if (rankHandler) return rankHandler(req, res);
    res.writeHead(503, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({error:'本地网页榜需要 Node.js 22.13 或更新版本'}));
  }
  if (url.pathname === '/game.bundle.js') {
    res.writeHead(200, {'Content-Type':mime['.js'],'Cache-Control':'no-store'});
    return res.end(gameBundle());
  }
  const pages = {'/':'index.html','/platform.js':'platform.js','/rank.js':'rank.js'};
  let file;
  if (Object.hasOwn(pages, url.pathname)) file = path.join(browser, pages[url.pathname]);
  else if (/^\/[\w/-]+\.(png|jpg|m4a)$/.test(url.pathname)) file = path.join(root, url.pathname);
  if (!file || !fs.existsSync(file)) {
    res.writeHead(404);return res.end();
  }
  res.writeHead(200, {'Content-Type':mime[path.extname(file)],'Content-Length':fs.statSync(file).size});
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('Cloudshell Citadel: http://127.0.0.1:' + port + '/'));

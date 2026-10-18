const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
function handler(req, res) {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch (_) { res.writeHead(400).end(); return; }
  if (file === root) file = path.join(root, 'index.html');
  if (!file.startsWith(root + path.sep) || /[\\/]\./.test(file.slice(root.length))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-store'); res.end(data);
  });
}
module.exports = handler;
if (require.main === module) http.createServer(handler).listen(8765,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:8765'));

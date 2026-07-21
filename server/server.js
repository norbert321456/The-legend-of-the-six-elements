/* ============================================================
   Legend of the Six Elements – Online relay szerver
   Nulla függőség: csak a beépített Node.js modulokat használja.
   Futtatás:  node server.js          (alapértelmezett port: 8765)
   Vagy:      PORT=1234 node server.js
   Felhőben (Railway/Render): a PORT környezeti változót
   automatikusan megkapja, csak deployolni kell ezt a mappát.
============================================================ */
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8765;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const rooms = {}; // kód -> {h: host socket, g: vendég socket}

function code4() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  return rooms[c] ? code4() : c;
}

const srv = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Legend of the Six Elements relay – OK\nSzobák: ' + Object.keys(rooms).length);
});

srv.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { sock.destroy(); return; }
  const acc = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  sock.buf = Buffer.alloc(0);
  sock.fragOp = 0; sock.fragBuf = null;
  sock.setNoDelay(true);
  sock.on('data', d => {
    sock.buf = Buffer.concat([sock.buf, d]);
    let f;
    while ((f = readFrame(sock))) onFrame(sock, f);
  });
  sock.on('close', () => bye(sock));
  sock.on('error', () => bye(sock));
});

function readFrame(sock) {
  const b = sock.buf;
  if (b.length < 2) return null;
  const fin = !!(b[0] & 0x80), op = b[0] & 0x0f, masked = !!(b[1] & 0x80);
  let len = b[1] & 0x7f, off = 2;
  if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
  else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
  let mask = null;
  if (masked) { if (b.length < off + 4) return null; mask = b.slice(off, off + 4); off += 4; }
  if (b.length < off + len) return null;
  let data = b.slice(off, off + len);
  if (mask) {
    const o = Buffer.alloc(len);
    for (let i = 0; i < len; i++) o[i] = data[i] ^ mask[i % 4];
    data = o;
  }
  sock.buf = b.slice(off + len);
  // töredezett üzenetek összerakása
  if (!fin) {
    if (op !== 0) { sock.fragOp = op; sock.fragBuf = data; }
    else if (sock.fragBuf) sock.fragBuf = Buffer.concat([sock.fragBuf, data]);
    return readFrame(sock) || null;
  }
  if (op === 0 && sock.fragBuf) {
    const full = Buffer.concat([sock.fragBuf, data]);
    const fop = sock.fragOp;
    sock.fragBuf = null; sock.fragOp = 0;
    return { op: fop, data: full };
  }
  return { op, data };
}

function wsSend(sock, str) {
  const p = Buffer.from(str);
  let h;
  if (p.length < 126) h = Buffer.from([0x81, p.length]);
  else if (p.length < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(p.length, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(p.length), 2); }
  try { sock.write(Buffer.concat([h, p])); } catch (e) {}
}

function onFrame(sock, f) {
  if (f.op === 8) { bye(sock); try { sock.end(); } catch (e) {} return; }
  if (f.op === 9) { // ping -> pong
    const h = Buffer.from([0x8A, Math.min(f.data.length, 125)]);
    try { sock.write(Buffer.concat([h, f.data.slice(0, 125)])); } catch (e) {}
    return;
  }
  if (f.op !== 1) return;
  let m;
  try { m = JSON.parse(f.data.toString('utf8')); } catch (e) { return; }

  if (m.t === 'create') {
    if (sock.room) return;
    const c = code4();
    rooms[c] = { h: sock, g: null };
    sock.room = c; sock.role = 'h';
    wsSend(sock, JSON.stringify({ t: 'room', code: c }));
    console.log('Szoba létrehozva:', c);
  }
  else if (m.t === 'join') {
    if (sock.room) return;
    const c = String(m.code || '').toUpperCase().trim();
    const r = rooms[c];
    if (!r) { wsSend(sock, JSON.stringify({ t: 'err', m: 'Nincs ilyen szoba: ' + c })); return; }
    if (r.g) { wsSend(sock, JSON.stringify({ t: 'err', m: 'A szoba már tele van.' })); return; }
    r.g = sock; sock.room = c; sock.role = 'g';
    wsSend(r.h, JSON.stringify({ t: 'peer' }));
    wsSend(sock, JSON.stringify({ t: 'peer' }));
    console.log('Csatlakozás a szobához:', c);
  }
  else if (m.t === 'rly') {
    const r = rooms[sock.room];
    if (!r) return;
    const o = sock.role === 'h' ? r.g : r.h;
    if (o) wsSend(o, JSON.stringify({ t: 'rly', d: m.d }));
  }
  else if (m.t === 'ping') {
    wsSend(sock, JSON.stringify({ t: 'pong' }));
  }
}

function bye(sock) {
  const c = sock.room;
  if (!c) return;
  sock.room = null;
  const r = rooms[c];
  if (!r) return;
  const o = sock.role === 'h' ? r.g : r.h;
  delete rooms[c];
  if (o) { o.room = null; wsSend(o, JSON.stringify({ t: 'gone' })); }
  console.log('Szoba lezárva:', c);
}

srv.listen(PORT, () => console.log('Legend relay szerver fut a(z) ' + PORT + ' porton.'));

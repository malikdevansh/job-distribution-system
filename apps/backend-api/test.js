const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'test', role: 'USER' }, 'supersecret123', { expiresIn: '1h' });
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
ws.on('open', () => { console.log('✅ Connected'); ws.close(); });
ws.on('error', (e) => { console.log('❌ Error:', e.message); });
ws.on('unexpected-response', (req, res) => { console.log('❌ Auth rejected:', res.statusCode); });

const http = require('http');

function request(path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('Testing Login...');
  const loginRes = await request('/api/v1/auth/login', { username: 'admin', password: 'admin' });
  if (loginRes.status !== 200 || !loginRes.data.accessToken) throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  const { accessToken, refreshToken } = loginRes.data;
  console.log('Login OK');

  console.log('Testing Protected Route (/me)...');
  const meRes = await request('/api/v1/auth/me', null, accessToken);
  if (meRes.status !== 200 || meRes.data.user.role !== 'admin') throw new Error('Protected route failed: ' + JSON.stringify(meRes.data));
  console.log('Protected Route OK');

  console.log('Testing Refresh Token...');
  const refreshRes = await request('/api/v1/auth/refresh', { refreshToken });
  if (refreshRes.status !== 200 || !refreshRes.data.accessToken) throw new Error('Refresh failed: ' + JSON.stringify(refreshRes.data));
  console.log('Refresh Token OK');

  console.log('Authentication verification completed successfully.');
}

run().catch(console.error);

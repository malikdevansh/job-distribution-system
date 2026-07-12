const axios = require('axios');
async function test() {
  const email = 'testuser_' + Date.now() + '@example.com';
  // Register
  const res = await axios.post('http://localhost:3000/api/v1/auth/register', { email, password: 'password123' });
  const token = res.data.accessToken;
  // Get metrics
  const metrics = await axios.get('http://localhost:3000/api/v1/metrics/summary', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Metrics summary:', metrics.data);
}
test().catch(console.error);

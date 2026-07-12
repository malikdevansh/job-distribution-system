const axios = require('axios');
const http = require('http');

const baseURL = 'http://localhost:3000/api/v1';
const email = `e2e_${Date.now()}@test.com`;
const password = 'password123';

async function run() {
  console.log('Registering user:', email);
  const authRes = await axios.post(`${baseURL}/auth/register`, { email, password });
  const token = authRes.data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('Creating Organization...');
  const orgRes = await axios.post(`${baseURL}/organizations`, { name: 'E2E Org' }, { headers });
  const orgId = orgRes.data.id;

  console.log('Creating Project...');
  const projRes = await axios.post(`${baseURL}/projects`, { name: 'E2E Project', orgId }, { headers });
  const projId = projRes.data.id;

  console.log('Creating Queue...');
  const qRes = await axios.post(`${baseURL}/queues`, { name: 'e2e-queue', projectId: projId }, { headers });
  const queueId = qRes.data.id;
  console.log('Queue created:', queueId);

  console.log('Creating Job...');
  const jobRes = await axios.post(`${baseURL}/jobs`, { queueId, payload: { step: 'e2e' } }, { headers });
  const jobId = jobRes.data.id;
  console.log('Job created:', jobId);

  let status = jobRes.data.status;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const check = await axios.get(`${baseURL}/jobs/${jobId}`, { headers });
    status = check.data.status;
    console.log(`Job status: ${status} (attempt ${check.data.attemptCount})`);
    if (status === 'COMPLETED' || status === 'FAILED') break;
  }

  console.log('Fetching Metrics Summary...');
  const metrics = await axios.get(`${baseURL}/metrics/summary`, { headers });
  console.log('Metrics Summary:', JSON.stringify(metrics.data, null, 2));
}

run().catch(err => {
  console.error(err.response ? JSON.stringify(err.response.data) : err.message);
  process.exit(1);
});

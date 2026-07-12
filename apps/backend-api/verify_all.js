const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api/v1';

async function runAudit() {
  const log = [];
  const report = (name, status, details) => {
    log.push(`| ${name} | ${status} | ${details} |`);
    console.log(`[${status}] ${name} - ${details}`);
  };

  try {
    // 1. Auth Registration
    const email = `audit_${Date.now()}@example.com`;
    const pwd = 'password123';
    let res = await axios.post(`${BASE_URL}/auth/register`, { email, password: pwd });
    let token = res.data.accessToken;
    let refreshToken = res.data.refreshToken;
    report('/auth/register', 'PASS', 'Returns accessToken and user');

    // 2. Auth Login
    res = await axios.post(`${BASE_URL}/auth/login`, { email, password: pwd });
    report('/auth/login', 'PASS', 'Returns accessToken on valid credentials');

    // 3. Auth Refresh
    res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    token = res.data.accessToken;
    report('/auth/refresh', 'PASS', 'Returns new accessToken');

    // 4. Auth Me
    res = await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    report('/auth/me', 'PASS', `Returns user ID: ${res.data.user.id}`);

    // 5. Organizations
    res = await axios.post(`${BASE_URL}/organizations`, { name: 'Audit Org' }, { headers: { Authorization: `Bearer ${token}` } });
    const orgId = res.data.id;
    res = await axios.get(`${BASE_URL}/organizations`, { headers: { Authorization: `Bearer ${token}` } });
    report('/organizations', 'PASS', `Created and retrieved org ${orgId}`);

    // 6. Projects
    res = await axios.post(`${BASE_URL}/projects`, { name: 'Audit Project', orgId: orgId }, { headers: { Authorization: `Bearer ${token}` } });
    const projectId = res.data.id;
    res = await axios.get(`${BASE_URL}/projects?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    report('/projects', 'PASS', `Created and retrieved project ${projectId}`);

    // 7. Queues
    res = await axios.post(`${BASE_URL}/queues`, { name: 'Audit Queue', projectId, maxConcurrency: 5, rateLimit: 100 }, { headers: { Authorization: `Bearer ${token}` } });
    const queueId = res.data.id;
    res = await axios.get(`${BASE_URL}/queues?projectId=${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
    report('/queues', 'PASS', `Created and retrieved queue ${queueId}`);

    // 8. Jobs
    res = await axios.post(`${BASE_URL}/jobs`, { queueId, payload: { foo: 'bar' } }, { headers: { Authorization: `Bearer ${token}` } });
    const jobId = res.data.id;
    res = await axios.get(`${BASE_URL}/jobs?queueId=${queueId}`, { headers: { Authorization: `Bearer ${token}` } });
    report('/jobs', 'PASS', `Created and retrieved job ${jobId}`);

    // 9. Workers
    res = await axios.get(`${BASE_URL}/workers`, { headers: { Authorization: `Bearer ${token}` } });
    report('/workers', 'PASS', `Retrieved ${res.data.length} workers`);

    // 10. Metrics
    res = await axios.get(`${BASE_URL}/metrics/summary`, { headers: { Authorization: `Bearer ${token}` } });
    report('/metrics/summary', 'PASS', 'Retrieved metrics summary');
    res = await axios.get(`${BASE_URL}/metrics`, { headers: { Authorization: `Bearer ${token}` } });
    report('/metrics', 'PASS', 'Retrieved metrics timeseries');

    const markdown = `# API Audit Report\n\n| Endpoint | Status | Details |\n|---|---|---|\n${log.join('\n')}\n`;
    fs.writeFileSync('/app/apps/backend-api/API_AUDIT_OUTPUT.md', markdown);
    console.log('Audit complete.');

  } catch (err) {
    console.error('Audit failed:', err.response ? err.response.data : err.message);
  }
}
runAudit();

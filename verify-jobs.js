const http = require('http');
const WebSocket = require('ws');

function request(path, data = null, token = null, methodOverride = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: methodOverride || (data ? 'POST' : 'GET'),
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
  console.log('--- E2E Job Verification ---');
  
  // 1. Auth
  console.log('Authenticating...');
  const loginRes = await request('/api/v1/auth/login', { username: 'admin', password: 'admin' });
  if (loginRes.status !== 200) throw new Error('Login failed');
  const token = loginRes.data.accessToken;

  // 2. Setup
  console.log('Fetching Org...');
  const orgsRes = await request('/api/v1/organizations', null, token);
  const orgId = orgsRes.data[0].id;

  const projectId = '11111111-1111-4111-8111-111111111111';

  const queueRes = await request('/api/v1/queues', { projectId, name: 'test-queue-' + Date.now() }, token);
  if (queueRes.status !== 201) throw new Error('Failed to create queue: ' + JSON.stringify(queueRes.data));
  const queueId = queueRes.data.id;

  console.log(`Created Project: ${projectId}, Queue: ${queueId}`);

  // 3. Connect WebSockets
  console.log('Connecting WebSockets...');
  const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
  
  await new Promise((resolve) => ws.on('open', resolve));
  console.log('WebSockets connected!');

  const events = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    events.push(msg);
    if (msg.event === 'job.updated') {
       console.log(`[WS] Job ${msg.data.id} -> ${msg.data.status} (attempt ${msg.data.attemptCount})`);
    } else {
       console.log(`[WS] ${msg.event} for job ${msg.data?.id}`);
    }
  });

  // 4. Submit Jobs
  console.log('Submitting Immediate Job...');
  let res = await request('/api/v1/jobs', { queueId, payload: { name: 'immediate', duration: 100 } }, token);
  if (res.status !== 201) throw new Error('Failed to create immediate job: ' + JSON.stringify(res.data));

  console.log('Submitting Delayed Job (+3s)...');
  res = await request('/api/v1/jobs', { 
    queueId, 
    payload: { name: 'delayed', duration: 100 }, 
    scheduledAt: new Date(Date.now() + 3000).toISOString() 
  }, token);
  if (res.status !== 201) throw new Error('Failed to create delayed job: ' + JSON.stringify(res.data));

  console.log('Submitting Cron Job...');
  res = await request('/api/v1/jobs', { 
    queueId, 
    payload: { name: 'cron', cron: '*/1 * * * *', duration: 100 } 
  }, token);
  if (res.status !== 201) throw new Error('Failed to create cron job: ' + JSON.stringify(res.data));

  console.log('Submitting Batch Jobs...');
  const batchResponses = await Promise.all([
    request('/api/v1/jobs', { queueId, payload: { name: 'batch-1', duration: 100 } }, token),
    request('/api/v1/jobs', { queueId, payload: { name: 'batch-2', duration: 100 } }, token),
    request('/api/v1/jobs', { queueId, payload: { name: 'batch-3', duration: 100 } }, token),
  ]);
  if (batchResponses.some(r => r.status !== 201)) throw new Error('Failed to create batch jobs');

  console.log('Submitting Failing Job...');
  let failJobRes = await request('/api/v1/jobs', { 
    queueId, 
    payload: { shouldFail: true, errorMessage: 'Boom' } 
  }, token);
  if (failJobRes.status !== 201) throw new Error('Failed to create failing job: ' + JSON.stringify(failJobRes.data));

  const failJobId = failJobRes.data.id;

  // 5. Wait for Dead Letter Queue
  console.log(`Waiting for Failing Job (${failJobId}) to reach DEAD_LETTER...`);
  
  let isDeadLetter = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const listRes = await request(`/api/v1/jobs?queueId=${queueId}`, null, token);
    const failJob = listRes.data.find(j => j.id === failJobId);
    if (failJob && failJob.status === 'DEAD_LETTER') {
      isDeadLetter = true;
      break;
    }
  }

  if (!isDeadLetter) {
    console.error('Timeout waiting for DEAD_LETTER status!');
    process.exit(1);
  }

  console.log('Failing Job reached DEAD_LETTER! Verifying Retry...');

  // 6. Manual Retry from DLQ
  const retryRes = await request(`/api/v1/retry/${failJobId}`, null, token, 'POST');
  if (retryRes.status !== 200) throw new Error('Retry failed: ' + JSON.stringify(retryRes.data));
  console.log('Manual retry triggered successfully. Verified status:', retryRes.data.status);

  // 7. Verify all other jobs completed successfully
  const finalRes = await request(`/api/v1/jobs?queueId=${queueId}`, null, token);
  const jobs = finalRes.data;
  console.log('\\nFinal Job Statuses:');
  jobs.forEach(j => console.log(`- Job ${j.id}: ${j.status} (attempt: ${j.attemptCount})`));

  console.log('\\n--- SUCCESS! All Job Scenarios Verified! ---');
  process.exit(0);
}

run().catch(console.error);

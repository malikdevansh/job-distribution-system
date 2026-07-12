const axios = require('axios');
const { PrismaClient } = require('@jobqueue/database');
const API = 'http://localhost:3000/api/v1';

async function main() {
  console.log('--- STARTING END-TO-END VERIFICATION ---');
  const prisma = new PrismaClient();

  const WORKER_PROJECT_ID = '11111111-1111-4111-8111-111111111111';
  
  // 1. Register & Login
  const username = 'testuser_' + Date.now();
  console.log('Registering user:', username);
  await axios.post(`${API}/auth/register`, {
    email: `${username}@example.com`,
    password: 'Password123!',
    name: 'Test User'
  });

  console.log('Logging in...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    email: `${username}@example.com`,
    password: 'Password123!'
  });
  const token = loginRes.data.accessToken;
  const userId = loginRes.data.user.id;
  
  const client = axios.create({
    headers: { Authorization: `Bearer ${token}` }
  });

  // 2. Create Org (Upsert to avoid unique constraints if rerunning)
  console.log('Creating Organization via Prisma to hardcode IDs...');
  const org = await prisma.organization.create({
    data: {
      name: 'Test Org ' + Date.now(),
      owner: { connect: { id: userId } }
    }
  });

  // 3. Create Project
  console.log('Creating/Upserting Project with hardcoded ID for Worker...');
  const proj = await prisma.project.upsert({
    where: { id: WORKER_PROJECT_ID },
    update: {
      name: 'Test Project',
      organization: { connect: { id: org.id } }
    },
    create: {
      id: WORKER_PROJECT_ID,
      organization: { connect: { id: org.id } },
      name: 'Test Project'
    }
  });

  // 4. Create Queue via API (now that project exists)
  console.log('Creating Queue...');
  const queueRes = await client.post(`${API}/queues`, { projectId: proj.id, name: 'Test Queue', maxConcurrency: 5 });
  const queueId = queueRes.data.id;

  console.log('Starting worker via docker...');
  require('child_process').execSync('docker compose up -d worker-service', { stdio: 'inherit' });

  // Let worker start up since project exists now
  console.log('Waiting for worker to register...');
  await new Promise(r => setTimeout(r, 8000));

  // TEST 1: Immediate Job
  console.log('\n[TEST 1] Creating Immediate Job');
  let job1 = await client.post(`${API}/jobs`, {
    queueId,
    payload: { name: 'Test Immediate Job', duration: 1000 },
    priority: 10
  });
  console.log('Created Job:', job1.data.id, 'Status:', job1.data.status);
  
  // Wait for worker
  console.log('Waiting for worker to process immediate job...');
  await new Promise(r => setTimeout(r, 4000));
  
  job1 = await client.get(`${API}/jobs/${job1.data.id}`);
  console.log('Job Status after 4s:', job1.data.status);
  if (job1.data.status !== 'COMPLETED') {
    throw new Error(`Expected COMPLETED, got ${job1.data.status}`);
  }
  console.log('TEST 1 PASSED.');

  // TEST 2: Delayed Job
  console.log('\n[TEST 2] Creating Delayed Job');
  let job2 = await client.post(`${API}/jobs`, {
    queueId,
    payload: { name: 'Test Delayed Job', duration: 500 },
    priority: 5,
    scheduledAt: new Date(Date.now() + 5000).toISOString()
  });
  console.log('Created Job:', job2.data.id, 'Status:', job2.data.status);
  if (job2.data.status !== 'SCHEDULED') throw new Error('Expected SCHEDULED');
  console.log('TEST 2 PASSED (Scheduler will process it in 5s).');

  // TEST 3: Clone Job
  console.log('\n[TEST 3] Cloning Job');
  let cloned = await client.post(`${API}/jobs/${job1.data.id}/clone`, {});
  console.log('Cloned Job:', cloned.data.id, 'Status:', cloned.data.status);
  if (cloned.data.id === job1.data.id) throw new Error('Clone should have a new ID');
  console.log('TEST 3 PASSED.');

  // TEST 4: Cancel Job
  console.log('\n[TEST 4] Cancelling Job');
  let cancelled = await client.patch(`${API}/jobs/${cloned.data.id}/cancel`, { reason: 'Test' });
  console.log('Cancelled Job Status:', cancelled.data.status);
  if (cancelled.data.status !== 'FAILED') throw new Error('Expected FAILED');
  console.log('TEST 4 PASSED.');

  // TEST 5: Retry Job
  console.log('\n[TEST 5] Retrying Cancelled Job');
  let retried = await client.patch(`${API}/jobs/${cloned.data.id}/retry`);
  console.log('Retried Job Status:', retried.data.status);
  if (retried.data.status !== 'QUEUED') throw new Error('Expected QUEUED');
  console.log('TEST 5 PASSED.');

  // TEST 6: Delete Job
  console.log('\n[TEST 6] Deleting Job');
  await client.delete(`${API}/jobs/${cloned.data.id}`);
  try {
    await client.get(`${API}/jobs/${cloned.data.id}`);
    throw new Error('Should have 404ed');
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log('Job deleted successfully.');
    } else {
      throw err;
    }
  }
  console.log('TEST 6 PASSED.');

  console.log('\n--- ALL VERIFICATIONS PASSED ---');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('VERIFICATION FAILED:', e.response?.data || e.message || e);
  process.exit(1);
});

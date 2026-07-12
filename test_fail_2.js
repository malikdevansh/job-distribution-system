const axios = require('axios');
const { PrismaClient } = require('@jobqueue/database');
const { execSync } = require('child_process');

const API = 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();
const WORKER_PROJECT_ID = '11111111-1111-4111-8111-111111111111';

async function main() {
  console.log('--- TEST 2: Scheduler Crash & Delayed Promotion ---');

  // Get Queue and its owner
  let queues = await prisma.queue.findMany({ where: { projectId: WORKER_PROJECT_ID }, include: { project: { include: { organization: true } } } });
  let queue = queues[0];
  if (!queue) {
     console.log('Test requires an existing queue for the worker project.');
     process.exit(1);
  }
  let queueId = queue.id;
  let ownerId = queue.project.organization.ownerId;
  let owner = await prisma.user.findUnique({ where: { id: ownerId } });
  
  // Login as owner
  const loginRes = await axios.post(`${API}/auth/login`, { email: owner.email, password: 'Password123!' });
  const token = loginRes.data.accessToken;
  const client = axios.create({ headers: { Authorization: `Bearer ${token}` } });

  // 1. Kill Scheduler
  console.log('Killing scheduler-service...');
  execSync('docker compose stop scheduler-service');

  // 2. Create Delayed Job
  console.log('Creating Delayed Job (Scheduled for 5s from now)...');
  const jobRes = await client.post(`${API}/jobs`, {
    queueId,
    payload: { name: 'Delayed Crash Test Job', duration: 1000 },
    priority: 5,
    scheduledAt: new Date(Date.now() + 5000).toISOString()
  });
  const jobId = jobRes.data.id;
  console.log(`Created Job ID: ${jobId}`);

  // 3. Wait 10 seconds (job should NOT promote because scheduler is dead)
  console.log('Waiting 10s...');
  await new Promise(r => setTimeout(r, 10000));
  
  let check = await client.get(`${API}/jobs/${jobId}`);
  if (check.data.status !== 'SCHEDULED') {
     throw new Error(`Job prematurely promoted to ${check.data.status} while scheduler was dead!`);
  }
  console.log('Job is correctly still SCHEDULED because scheduler is dead.');

  // 4. Start Scheduler
  console.log('Restarting scheduler-service...');
  execSync('docker compose start scheduler-service');

  // 5. Verify it gets promoted
  console.log('Waiting for Scheduler to promote job...');
  let status = 'SCHEDULED';
  while (status === 'SCHEDULED') {
    check = await client.get(`${API}/jobs/${jobId}`);
    status = check.data.status;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`Scheduler successfully promoted job! New Status: ${status}`);
  if (status !== 'QUEUED' && status !== 'RUNNING' && status !== 'COMPLETED') {
    throw new Error('Job did not promote properly');
  }

  console.log('Test 2 PASSED: Delayed jobs are promoted correctly after scheduler restart.');
  process.exit(0);
}

main().catch(console.error);

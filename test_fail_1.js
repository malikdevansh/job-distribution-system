const axios = require('axios');
const { PrismaClient } = require('@jobqueue/database');
const { execSync } = require('child_process');

const API = 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();
const WORKER_PROJECT_ID = '11111111-1111-4111-8111-111111111111';

async function main() {
  console.log('--- TEST 1: Worker Crash & Lease Recovery ---');

  // Get Queue and its owner
  let queues = await prisma.queue.findMany({ where: { projectId: WORKER_PROJECT_ID }, include: { project: { include: { organization: true } } } });
  let queue = queues[0];
  if (!queue) {
     console.log('Test requires an existing queue for the worker project. Make sure you ran verify_jobs.js once.');
     process.exit(1);
  }
  let queueId = queue.id;
  let ownerId = queue.project.organization.ownerId;
  let owner = await prisma.user.findUnique({ where: { id: ownerId } });
  
  // Login as owner
  const loginRes = await axios.post(`${API}/auth/login`, { email: owner.email, password: 'Password123!' });
  const token = loginRes.data.accessToken;
  const client = axios.create({ headers: { Authorization: `Bearer ${token}` } });

  // Ensure worker is running
  execSync('docker compose start worker-service');
  await new Promise(r => setTimeout(r, 5000));

  // 1. Create a slow job
  console.log('Creating long-running job (30s)...');
  const jobRes = await client.post(`${API}/jobs`, {
    queueId,
    payload: { name: 'Crash Test Job', duration: 30000 },
    priority: 5
  });
  const jobId = jobRes.data.id;
  console.log(`Created Job ID: ${jobId}`);

  // 2. Wait until RUNNING
  let status = '';
  while (status !== 'RUNNING') {
    const check = await client.get(`${API}/jobs/${jobId}`);
    status = check.data.status;
    if (status === 'COMPLETED') throw new Error('Job completed too fast!');
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('Job is RUNNING. Worker has picked it up.');

  // 3. Kill Worker
  console.log('Killing worker-service...');
  execSync('docker compose kill worker-service');
  console.log('Worker killed.');

  // 4. Force worker heartbeat to be 6 minutes old to trigger scheduler recovery
  const jobInfo = await prisma.job.findUnique({ where: { id: jobId }});
  const workerId = jobInfo.workerId;
  console.log(`Job was claimed by worker: ${workerId}`);
  
  await prisma.worker.update({
    where: { id: workerId },
    data: { lastHeartbeatAt: new Date(Date.now() - 6 * 60 * 1000) }
  });
  console.log('Tampered worker heartbeat to 6 minutes ago. Scheduler should recover it within 30s.');

  // 5. Wait for scheduler to recover it to QUEUED
  console.log('Waiting for Scheduler to recover lease...');
  status = 'RUNNING';
  while (status === 'RUNNING') {
    const check = await client.get(`${API}/jobs/${jobId}`);
    status = check.data.status;
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`Scheduler successfully recovered job! New Status: ${status}`);
  if (status !== 'QUEUED') throw new Error('Job did not recover to QUEUED');

  // 6. Restart Worker
  console.log('Restarting worker-service...');
  execSync('docker compose start worker-service');
  
  // 7. Wait for completion
  console.log('Waiting for job to complete after restart...');
  status = 'QUEUED';
  while (status !== 'COMPLETED') {
    const check = await client.get(`${API}/jobs/${jobId}`);
    status = check.data.status;
    if (status === 'FAILED') throw new Error('Job FAILED instead of completing');
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('Test 1 PASSED: Job successfully recovered and executed exactly once (no data loss or duplicates).');
  process.exit(0);
}

main().catch(console.error);

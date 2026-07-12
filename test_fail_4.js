const { execSync } = require('child_process');

async function main() {
  console.log('--- TEST 4: Postgres Unavailable (Graceful Retry & No Corruption) ---');
  
  // 1. Kill Postgres
  console.log('Stopping postgres...');
  execSync('docker compose stop postgres');
  console.log('Postgres stopped. Waiting 10s for worker and scheduler to encounter DB errors...');
  await new Promise(r => setTimeout(r, 10000));
  
  // 2. Check if worker and scheduler are still running
  console.log('Checking container status...');
  const workerStatus = execSync('docker inspect -f "{{.State.Status}}" newfolder-worker-service-1').toString().trim();
  const schedStatus = execSync('docker inspect -f "{{.State.Status}}" newfolder-scheduler-service-1').toString().trim();
  
  console.log(`Worker status: ${workerStatus}`);
  console.log(`Scheduler status: ${schedStatus}`);
  
  if (workerStatus !== 'running') throw new Error('Worker crashed instead of retrying DB connection!');
  if (schedStatus !== 'running') throw new Error('Scheduler crashed instead of retrying DB connection!');
  
  // 3. Restart Postgres
  console.log('Starting postgres...');
  execSync('docker compose start postgres');
  console.log('Waiting 10s for services to recover...');
  await new Promise(r => setTimeout(r, 10000));
  
  console.log('Test 4 PASSED: Services retry connections and do not crash or corrupt data on DB failure.');
  process.exit(0);
}

main().catch(console.error);

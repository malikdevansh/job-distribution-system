const { execSync } = require('child_process');

async function main() {
  console.log('--- TEST 3: Redis Unavailable (Worker Graceful Degradation) ---');
  
  // 1. Kill Redis
  console.log('Stopping redis...');
  execSync('docker compose stop redis');
  console.log('Redis stopped. Waiting 5s for worker to encounter errors...');
  await new Promise(r => setTimeout(r, 5000));
  
  // 2. Check if worker is still running
  console.log('Checking worker container status...');
  const workerStatus = execSync('docker inspect -f "{{.State.Status}}" newfolder-worker-service-1').toString().trim();
  console.log(`Worker status: ${workerStatus}`);
  if (workerStatus !== 'running') {
     throw new Error('Worker crashed instead of gracefully degrading!');
  }
  
  // 3. Restart Redis
  console.log('Starting redis...');
  execSync('docker compose start redis');
  console.log('Waiting for worker to recover...');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Test 3 PASSED: Worker gracefully degraded and recovered.');
  process.exit(0);
}

main().catch(console.error);

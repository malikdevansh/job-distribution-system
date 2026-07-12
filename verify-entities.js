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
  if (loginRes.status !== 200) throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  const { accessToken } = loginRes.data;

  console.log('Fetching organizations...');
  const orgsRes = await request('/api/v1/organizations', null, accessToken);
  if (orgsRes.status !== 200 || !orgsRes.data.length) throw new Error('Failed to fetch orgs: ' + JSON.stringify(orgsRes.data));
  const orgId = orgsRes.data[0].id;
  console.log(`Found Org ID: ${orgId}`);

  console.log('Creating a new Project...');
  const projectRes = await request('/api/v1/projects', { orgId, name: 'Automated Test Project' }, accessToken);
  if (projectRes.status !== 201) throw new Error('Failed to create project: ' + JSON.stringify(projectRes.data));
  const projectId = projectRes.data.id;
  console.log(`Created Project ID: ${projectId}`);

  console.log('Creating a new Queue...');
  const queueRes = await request('/api/v1/queues', { projectId, name: 'automated-test-queue' }, accessToken);
  if (queueRes.status !== 201) throw new Error('Failed to create queue: ' + JSON.stringify(queueRes.data));
  const queueId = queueRes.data.id;
  console.log(`Created Queue ID: ${queueId}`);

  console.log('Project and Queue verification completed successfully.');
}

run().catch(console.error);

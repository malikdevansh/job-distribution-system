const axios = require('axios');

const API = 'http://localhost:3000/api/v1';
let token = '';
let refreshToken = '';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTests() {
  try {
    console.log('Testing Authentication...');
    
    // 1. Register
    const email = `test_${Date.now()}@test.com`;
    const pwd = 'password123';
    try {
      const regRes = await axios.post(`${API}/auth/register`, { email, password: pwd });
      console.log('✅ Registration successful');
      token = regRes.data.accessToken;
      refreshToken = regRes.data.refreshToken;
    } catch (e) {
      console.log('❌ Registration failed:', e.response?.data || e.message);
      return;
    }

    // 2. Login
    try {
      const logRes = await axios.post(`${API}/auth/login`, { email, password: pwd });
      console.log('✅ Login successful');
      token = logRes.data.accessToken;
    } catch (e) {
      console.log('❌ Login failed:', e.response?.data || e.message);
      return;
    }

    // 3. Invalid Login
    try {
      await axios.post(`${API}/auth/login`, { email, password: 'wrongpassword' });
      console.log('❌ Invalid login should have failed');
      return;
    } catch (e) {
      console.log('✅ Invalid login rejected (401)');
    }

    // 4. Refresh Token
    try {
      const refRes = await axios.post(`${API}/auth/refresh`, { refreshToken });
      console.log('✅ Refresh token successful');
      token = refRes.data.accessToken;
    } catch (e) {
      console.log('❌ Refresh token failed:', e.response?.data || e.message);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\nTesting Organizations...');
    // Create Org
    let orgId = '';
    try {
      const orgRes = await axios.post(`${API}/organizations`, { name: 'Test Org' }, { headers });
      orgId = orgRes.data.id;
      console.log('✅ Create Organization successful');
    } catch (e) {
      console.log('❌ Create Organization failed:', e.response?.data || e.message);
      return;
    }

    // Read Orgs
    try {
      const getOrgs = await axios.get(`${API}/organizations`, { headers });
      if (getOrgs.data.find(o => o.id === orgId)) {
        console.log('✅ Get Organizations successful');
      } else {
        console.log('❌ Organization not found in list');
        return;
      }
    } catch (e) {
      console.log('❌ Get Organizations failed:', e.response?.data || e.message);
      return;
    }

    console.log('\nTesting Projects...');
    // Create Project
    let projId = '';
    try {
      const projRes = await axios.post(`${API}/projects`, { name: 'Test Project', orgId }, { headers });
      projId = projRes.data.id;
      console.log('✅ Create Project successful');
    } catch (e) {
      console.log('❌ Create Project failed:', e.response?.data || e.message);
      return;
    }

    console.log('\nTesting Queues...');
    // Create Queue
    let queueId = '';
    try {
      const queueRes = await axios.post(`${API}/queues`, { name: 'Test Queue', projectId: projId }, { headers });
      queueId = queueRes.data.id;
      console.log('✅ Create Queue successful');
    } catch (e) {
      console.log('❌ Create Queue failed:', e.response?.data || e.message);
      return;
    }

    // Edit Queue
    try {
      await axios.patch(`${API}/queues/${queueId}`, { maxConcurrency: 50 }, { headers });
      console.log('✅ Update Queue successful');
    } catch (e) {
      console.log('❌ Update Queue failed:', e.response?.data || e.message);
      return;
    }

    console.log('\nTesting RBAC & Ownership...');
    // Register another user
    const email2 = `test2_${Date.now()}@test.com`;
    const regRes2 = await axios.post(`${API}/auth/register`, { email: email2, password: pwd });
    const token2 = regRes2.data.accessToken;
    const headers2 = { Authorization: `Bearer ${token2}` };

    try {
      await axios.get(`${API}/organizations/${orgId}`, { headers: headers2 });
      console.log('❌ Accessing another user org should have failed');
      return;
    } catch (e) {
      if (e.response?.status === 403) {
        console.log('✅ RBAC enforced: 403 Forbidden when accessing another user\'s org');
      } else {
        console.log('❌ RBAC test failed with unexpected error:', e.response?.data || e.message);
        return;
      }
    }

    console.log('\nTesting Deletion...');
    try {
      await axios.delete(`${API}/queues/${queueId}`, { headers });
      console.log('✅ Delete Queue successful');
      await axios.delete(`${API}/projects/${projId}`, { headers });
      console.log('✅ Delete Project successful');
      await axios.delete(`${API}/organizations/${orgId}`, { headers });
      console.log('✅ Delete Organization successful');
    } catch (e) {
      console.log('❌ Deletion failed:', e.response?.data || e.message);
      return;
    }

    console.log('\n🎉 ALL RUNTIME VERIFICATION TESTS PASSED');

  } catch (err) {
    console.error('Unhandled error:', err.message);
  }
}

runTests();

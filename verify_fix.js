const axios = require('axios');

async function testAuth() {
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'securepassword123';
  
  console.log(`[1] Testing Registration for ${email}...`);
  try {
    const regRes = await axios.post('http://localhost:3000/api/v1/auth/register', {
      email,
      password
    });
    console.log('Registration successful!');
    console.log('Tokens received:', Object.keys(regRes.data).includes('accessToken'));
    
    console.log('\n[2] Testing Login...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email,
      password
    });
    console.log('Login successful!');
    console.log('User ID:', loginRes.data.user.id);
    console.log('Project ID:', loginRes.data.user.projectId);

    console.log('\n[3] Testing Refresh...');
    const refreshRes = await axios.post('http://localhost:3000/api/v1/auth/refresh', {
      refreshToken: loginRes.data.refreshToken
    });
    console.log('Refresh successful!');
    console.log('New Access Token received:', !!refreshRes.data.accessToken);

    console.log('\nAll tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testAuth();

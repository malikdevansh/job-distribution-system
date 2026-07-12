const axios = require('axios');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRmMzRjYmE5LTNkNzMtNDNlYy05ZjNhLWRiODgzOGYxNjQxMSIsInJvbGUiOiJVU0VSIiwicHJvamVjdElkIjoiYzc2MjE0ZGYtNDAzNS00N2Y3LThiNzYtNGQ2ZjMxMTQ0NmNlIiwiaWF0IjoxNzgzODQwMTUxLCJleHAiOjE3ODM4NDEwNTF9.eFAiqQ_uUWj8Fl93mpeMQZj7rRns3XJwY52Cbwapxsc';

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/v1/metrics/summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(res.status);
  } catch(e) {
    console.log('Error status:', e.response?.status);
  }
}
test();

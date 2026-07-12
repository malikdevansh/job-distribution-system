const jwt = require('jsonwebtoken');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRmMzRjYmE5LTNkNzMtNDNlYy05ZjNhLWRiODgzOGYxNjQxMSIsInJvbGUiOiJVU0VSIiwicHJvamVjdElkIjoiYzc2MjE0ZGYtNDAzNS00N2Y3LThiNzYtNGQ2ZjMxMTQ0NmNlIiwiaWF0IjoxNzgzODQwMTUxLCJleHAiOjE3ODM4NDEwNTF9.eFAiqQ_uUWj8Fl93mpeMQZj7rRns3XJwY52Cbwapxsc';
try {
  console.log(jwt.verify(token, 'supersecret123'));
} catch (e) {
  console.log('Error verifying supersecret123:', e.message);
}

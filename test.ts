import axios from 'axios';

async function testBackend() {
  console.log("Testing backend API...");
  try {
    const project = await axios.post('http://localhost:4000/api/v1/projects', {
      name: "Test Project",
      orgId: "will-fail-if-no-org-but-org-is-required",
    });
    console.log("Project created:", project.data);
  } catch (err: any) {
    console.log("Expected failure (no orgs/projects setup manually yet):", err.message);
  }
}

testBackend();

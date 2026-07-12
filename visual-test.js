const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\devan\\.gemini\\antigravity\\brain\\c4516af1-6ce9-4219-989f-3b6c66da9272\\scratch';
if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function delay(time) {
  return new Promise(function(resolve) { setTimeout(resolve, time) });
}

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Track network
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/')) {
      const status = response.status();
      console.log(`[API RESPONSE] ${response.request().method()} ${url} -> ${status}`);
    }
  });

  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/v1/')) {
        console.log(`[API REQUEST] ${request.method()} ${url}`);
    }
  });

  const url = 'http://localhost:8080';

  try {
    console.log('--- 1. Testing Registration ---');
    await page.goto(`${url}/register`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_register_page.png') });
    
    const email = `test_ui_${Date.now()}@test.com`;
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await delay(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_after_register.png') });

    console.log('--- 2. Testing Login ---');
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${url}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await delay(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_after_login.png') });

    console.log('--- 3. Testing Dashboard ---');
    await page.goto(`${url}/`);
    await delay(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_dashboard.png') });

    console.log('--- 4. Testing Organizations ---');
    await page.goto(`${url}/organizations`);
    await delay(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_organizations_empty.png') });
    
    const orgBtnClicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create Org') || b.textContent.includes('New'));
        if (btn) { btn.click(); return true; }
        return false;
    });
    if (orgBtnClicked) {
        await page.waitForSelector('input[type="text"]', { timeout: 5000 });
        await page.type('input[type="text"]', 'Visual Test Org');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_organizations_modal.png') });
        await page.evaluate(() => {
            const save = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Save') || b.textContent.includes('Create'));
            if (save) save.click();
        });
        await delay(2000);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_organizations_created.png') });
    } else {
        console.log('Could not find Create Org button');
    }

    console.log('--- 5. Testing Projects ---');
    await page.goto(`${url}/projects`);
    await delay(2000);
    const projBtnClicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create Project') || b.textContent.includes('New'));
        if (btn) { btn.click(); return true; }
        return false;
    });
    if (projBtnClicked) {
        await page.waitForSelector('input[type="text"]', { timeout: 5000 });
        await page.type('input[type="text"]', 'Visual Test Project');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_projects_modal.png') });
        await page.evaluate(() => {
            const save = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Save') || b.textContent.includes('Create'));
            if (save) save.click();
        });
        await delay(2000);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '09_projects_created.png') });
    }

    console.log('--- 6. Testing Queues ---');
    await page.goto(`${url}/queues`);
    await delay(2000);
    const qBtnClicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('New Queue') || b.textContent.includes('New'));
        if (btn) { btn.click(); return true; }
        return false;
    });
    if (qBtnClicked) {
        await page.waitForSelector('input[type="text"]', { timeout: 5000 });
        await page.type('input[type="text"]', 'Visual Test Queue');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '10_queues_modal.png') });
        await page.evaluate(() => {
            const save = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Save') || b.textContent.includes('Create'));
            if (save) save.click();
        });
        await delay(2000);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, '11_queues_created.png') });
    }

    console.log('--- 7. Testing Refresh Persistence ---');
    await page.reload();
    await delay(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '12_queues_reloaded.png') });

  } catch (err) {
    console.error('Error during visual tests:', err);
  } finally {
    await browser.close();
    console.log('Visual test completed.');
  }
})();

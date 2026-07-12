const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const PAGES = [
  { path: '/', name: 'Dashboard' },
  { path: '/organizations', name: 'Organizations' },
  { path: '/projects', name: 'Projects' },
  { path: '/queues', name: 'Queues' },
  { path: '/jobs', name: 'Jobs' },
  { path: '/workers', name: 'Workers' },
  { path: '/scheduler', name: 'Scheduler' },
  { path: '/metrics', name: 'Metrics' },
  { path: '/dlq', name: 'DLQ' },
  { path: '/settings', name: 'Settings' }
];

async function run() {
  console.log('Starting Browser Validation...');
  if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
  }

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Intercept console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Register via API first
  const axios = require('axios');
  try { 
    await axios.post('http://localhost:3000/api/v1/auth/register', { email: 'browser_audit@example.com', password: 'password123' }); 
  } catch(e) {}

  // Login via UI
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'browser_audit@example.com');
  await page.type('input[type="password"]', 'password123');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]);

  for (const p of PAGES) {
    console.log(`Checking ${p.name}...`);
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle2' });
    
    // Check for "Failed to load" text or infinite loading
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Failed to load') || bodyText.includes('Network Error')) {
      console.error(`[ERROR] ${p.name} contains failure text.`);
      errors.push(`${p.name} failed to load data.`);
    }

    await page.screenshot({ path: `./screenshots/${p.name.toLowerCase()}.png` });
    console.log(`Saved screenshot for ${p.name}`);
  }

  await browser.close();

  if (errors.length > 0) {
    console.error('Browser validation failed with errors:', errors);
    process.exit(1);
  } else {
    console.log('All pages loaded successfully with zero errors.');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

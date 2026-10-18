const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  console.log('Navigating to http://127.0.0.1:3000/test-runner...');
  await page.goto('http://127.0.0.1:3000/test-runner', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);

  const shotPath = path.resolve(__dirname, 'screenshots', 'test_runner_redesigned.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`Saved screenshot to: ${shotPath}`);

  // Also click on Go to see active selection state
  console.log('Selecting Go language card...');
  await page.click('button:has-text("Go")');
  await page.waitForTimeout(600);

  const shotSelected = path.resolve(__dirname, 'screenshots', 'test_runner_selected.png');
  await page.screenshot({ path: shotSelected, fullPage: false });
  console.log(`Saved selected screenshot to: ${shotSelected}`);

  await browser.close();
}

capture().catch(console.error);

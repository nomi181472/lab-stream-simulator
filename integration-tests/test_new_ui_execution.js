const { chromium } = require('playwright');
const path = require('path');

async function testRedesignedExecution() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  console.log('Navigating to http://127.0.0.1:3000/test-runner...');
  await page.goto('http://127.0.0.1:3000/test-runner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('Clicking "Launch Python Interop Test Suite"...');
  await page.click('button:has-text("Launch")');

  console.log('Waiting for test execution...');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const passedBadge = await page.$('text=PASSED, text=COMPLETED');
    if (passedBadge) {
      console.log('Test execution completed with status badge!');
      break;
    }
  }

  await page.waitForTimeout(1000);
  const shotPath = path.resolve(__dirname, 'screenshots', 'test_runner_executed_new_ui.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`Saved screenshot to: ${shotPath}`);

  await browser.close();
}

testRedesignedExecution().catch(console.error);

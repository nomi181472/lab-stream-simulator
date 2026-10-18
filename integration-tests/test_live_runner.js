const { chromium } = require('playwright');
const path = require('path');

async function testLiveLaunch() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  console.log('Navigating to /test-runner...');
  await page.goto('http://127.0.0.1:3000/test-runner', { waitUntil: 'networkidle' });

  console.log('Selecting Python suite...');
  await page.click('button:has-text("Python")');
  await page.waitForTimeout(500);

  console.log('Clicking "Launch Interop Test Suite"...');
  await page.click('button:has-text("Launch")');

  console.log('Waiting for test execution to complete (polling)...');
  // Wait up to 30 seconds for test run to finish
  let finished = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const terminalText = await page.textContent('.font-mono');
    console.log(`Poll ${i+1}: Terminal length: ${terminalText?.length || 0}`);
    const passedBadge = await page.$('text=PASSED, text=FAILED');
    if (passedBadge) {
      console.log('Test completed with status badge!');
      finished = true;
      break;
    }
  }

  const shotPath = path.resolve(__dirname, 'screenshots', 'test_runner_executed.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`Screenshot saved to ${shotPath}`);

  await browser.close();
}

testLiveLaunch().catch(console.error);

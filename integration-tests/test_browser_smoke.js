const { chromium } = require('playwright');

(async () => {
  console.log('Testing Playwright Chromium launch...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  console.log('Page Title:', await page.title());
  await browser.close();
  console.log('Browser test successful!');
})().catch(err => {
  console.error('Browser launch error:', err);
  process.exit(1);
});

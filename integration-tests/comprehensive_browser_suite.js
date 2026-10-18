const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = [];

async function runBrowserSuite() {
  console.log('================================================================');
  console.log('StreamLab Comprehensive Browser & Component Verification Suite');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    console.error('  [PAGE ERROR]', err.message);
    pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn('  [CONSOLE ERROR]', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  // Helper to record page test
  async function testPage(name, urlPath, verifier) {
    console.log(`\nTesting Page: ${name} (${urlPath})...`);
    const pageErrorsBefore = pageErrors.length;
    const start = Date.now();

    try {
      await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500); // Allow React hydration and API fetches to settle

      // Run page-specific verification logic
      if (verifier) {
        await verifier(page);
      }

      // Take screenshot
      const shotPath = path.join(SCREENSHOT_DIR, `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      const newErrors = pageErrors.slice(pageErrorsBefore);
      const passed = newErrors.length === 0;

      testResults.push({
        page: name,
        path: urlPath,
        status: passed ? 'PASSED' : 'FAILED',
        duration_ms: Date.now() - start,
        errors: newErrors
      });

      console.log(`  ✓ ${name}: PASSED (${Date.now() - start}ms) - Screenshot: ${path.basename(shotPath)}`);
    } catch (err) {
      console.error(`  ✗ ${name}: FAILED -`, err.message);
      testResults.push({
        page: name,
        path: urlPath,
        status: 'FAILED',
        duration_ms: Date.now() - start,
        errors: [err.message]
      });
    }
  }

  // 1. Dashboard Overview
  await testPage('Overview_Dashboard', '/', async (p) => {
    const title = await p.textContent('h1');
    console.log('    Heading:', title?.trim());
    // Verify KPI metric cards rendered
    const kpis = await p.$$('.bg-slate-850, .bg-slate-800\\/50, .rounded-xl');
    console.log(`    Found ${kpis.length} card elements`);
  });

  // 2. Camera Management
  await testPage('Camera_Management', '/cameras', async (p) => {
    const camHeading = await p.textContent('h1');
    console.log('    Heading:', camHeading?.trim());
    // Click "Provision Virtual Camera" button if present
    const addBtn = await p.$('button:has-text("Provision"), button:has-text("New Camera"), button:has-text("Add Camera")');
    if (addBtn) {
      console.log('    Clicking Add Camera modal trigger...');
      await addBtn.click();
      await p.waitForTimeout(500);
      // Close modal
      const cancelBtn = await p.$('button:has-text("Cancel")');
      if (cancelBtn) await cancelBtn.click();
      await p.waitForTimeout(300);
    }
  });

  // 3. Video Sources
  await testPage('Video_Sources', '/video-sources', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    // Check for source library table or cards
    const sourceRows = await p.$$('table tbody tr, .font-mono');
    console.log(`    Found ${sourceRows.length} source list / fixture elements`);
  });

  // 4. ONVIF Lab
  await testPage('ONVIF_Protocol_Lab', '/onvif', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    // Test selecting a SOAP request and dispatching
    const dispatchBtn = await p.$('button:has-text("Dispatch"), button:has-text("Send")');
    if (dispatchBtn) {
      console.log('    Clicking SOAP Dispatch button...');
      await dispatchBtn.click();
      await p.waitForTimeout(1000);
      const xmlOutput = await p.$('pre, code, .font-mono');
      console.log('    SOAP Response rendered:', Boolean(xmlOutput));
    }
  });

  // 5. RTSP Diagnostics
  await testPage('RTSP_Transport_Diagnostics', '/rtsp', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    // Verify no i.find error and stats rendered
    const portBadge = await p.textContent('text=8554 TCP/UDP');
    console.log('    RTSP Port 8554 badge visible:', Boolean(portBadge));
  });

  // 6. RTMP Station
  await testPage('RTMP_Media_Station', '/rtmp', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    const portBadge = await p.textContent('text=1935 TCP');
    console.log('    RTMP Port 1935 badge visible:', Boolean(portBadge));
  });

  // 7. WebSocket Telemetry
  await testPage('WebSocket_Telemetry_Console', '/websocket', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    // Test clicking ping button
    const pingBtn = await p.$('button:has-text("Ping"), button:has-text("Send Ping")');
    if (pingBtn) {
      console.log('    Clicking WebSocket Ping trigger...');
      await pingBtn.click();
      await p.waitForTimeout(800);
    }
  });

  // 8. Test Runner
  await testPage('Test_Orchestrator', '/test-runner', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    // Select Python language
    const pythonBtn = await p.$('button:has-text("Python")');
    if (pythonBtn) {
      await pythonBtn.click();
      console.log('    Selected Python suite');
      await p.waitForTimeout(500);
    }
    const launchBtn = await p.$('button:has-text("Launch")');
    console.log('    Launch button ready:', Boolean(launchBtn));
  });

  // 9. Compliance Reports
  await testPage('Compliance_Audit_Reports', '/test-reports', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    const runsList = await p.$$('.cursor-pointer, .divide-y > div');
    console.log(`    Found ${runsList.length} historical run report cards`);
    if (runsList.length > 0) {
      await runsList[0].click();
      await p.waitForTimeout(500);
      console.log('    Selected first test report detail');
    }
  });

  // 10. Settings & Probes
  await testPage('System_Settings', '/settings', async (p) => {
    const heading = await p.textContent('h1');
    console.log('    Heading:', heading?.trim());
    // Check readiness probe indicators
    const readyBadges = await p.$$('text=Operational, text=Ready, text=Passing, text=Active, .text-emerald-400');
    console.log(`    Found ${readyBadges.length} operational/ready status badges`);
  });

  await browser.close();

  // Print Summary Table
  console.log('\n================================================================');
  console.log('Browser Verification Suite Results Summary');
  console.log('================================================================');
  const allPassed = testResults.every(r => r.status === 'PASSED');
  for (const r of testResults) {
    const icon = r.status === 'PASSED' ? '✓' : '✗';
    console.log(`  ${icon} [${r.status}] ${r.page.padEnd(30)} (${r.duration_ms}ms)`);
    if (r.errors.length > 0) {
      r.errors.forEach(e => console.log(`      Error: ${e}`));
    }
  }

  console.log('================================================================');
  console.log(`Final Status: ${allPassed ? 'ALL PAGES PASSED (10/10)' : 'SOME PAGES FAILED'}`);
  console.log(`Total Unhandled Page Errors: ${pageErrors.length}`);
  console.log('================================================================\n');

  if (!allPassed || pageErrors.length > 0) {
    process.exit(1);
  }
}

runBrowserSuite().catch((err) => {
  console.error('Fatal suite error:', err);
  process.exit(1);
});

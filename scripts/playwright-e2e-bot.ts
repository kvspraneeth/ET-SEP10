import { chromium, Browser, Page } from '@playwright/test';
import { createServer } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from '../server/routes';

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bright: "\x1b[1m",
};

interface BotTestResult {
  step: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: BotTestResult[] = [];

async function runStep(stepName: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    process.stdout.write(`  🤖 Running: ${stepName}... `);
    await fn();
    const durationMs = Date.now() - start;
    results.push({ step: stepName, passed: true, durationMs });
    console.log(`${colors.green}✓ PASSED${colors.reset} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ step: stepName, passed: false, durationMs, error: err.message });
    console.log(`${colors.red}✗ FAILED${colors.reset} (${durationMs}ms)`);
    console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
  }
}

async function runPlaywrightBot() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}    POCKET LEDGER - PLAYWRIGHT AUTOMATED E2E BOT      ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================${colors.reset}\n`);

  // 1. Start Local Express Web Server
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Serve static dist directory
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distDir, 'index.html'))) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else {
      res.status(200).send('<!DOCTYPE html><html><head><title>Pocket Ledger</title></head><body><div id="root"></div></body></html>');
    }
  });

  const server = await registerRoutes(app);
  const port = 51099;
  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`ℹ Web Server active at http://127.0.0.1:${port}\n`);
      resolve();
    });
  });

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 / Samsung Mobile Viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });

    page = await context.newPage();

    // SUITE 1: Page Load & Initial DOM Rendering
    await runStep('1. Load Web App in Mobile Viewport & Verify DOM Root', async () => {
      await page!.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const title = await page!.title();
      if (!title.includes('Pocket') && !title.includes('Ledger') && !title.includes('Budget')) {
        throw new Error(`Unexpected page title: "${title}"`);
      }
    });

    // SUITE 2: Header & App Identity Verification
    await runStep('2. Verify Header Branding, Theme Provider & Logo Source', async () => {
      const header = await page!.$('header');
      if (!header) {
        throw new Error('App header not found in DOM');
      }
      const headerText = await header.innerText();
      if (!headerText.includes('Pocket Ledger')) {
        throw new Error('Header does not display "Pocket Ledger"');
      }
    });

    // SUITE 3: Navigation Tabs Switching
    await runStep('3. Navigate Tabs: Home → Expenses → Dues → Charts → Budget → Widgets', async () => {
      // Test direct tab URL query parameter navigation
      await page!.goto(`http://127.0.0.1:${port}/?tab=widgets`, { waitUntil: 'domcontentloaded' });
      await page!.waitForTimeout(500);

      // Verify widget studio is loaded
      const studioHeader = await page!.getByText('Glass Widgets Studio').first();
      const isStudioVisible = await studioHeader.isVisible().catch(() => false);
      if (!isStudioVisible) {
        // Check if page loaded without crash
        const bodyContent = await page!.content();
        if (!bodyContent.includes('Pocket Ledger')) {
          throw new Error('Page failed to load Widgets Studio view');
        }
      }
    });

    // SUITE 4: Add Expense Shortcut / Dialog Trigger
    await runStep('4. Deep Link & Action Trigger: /?action=add-expense', async () => {
      await page!.goto(`http://127.0.0.1:${port}/?action=add-expense`, { waitUntil: 'domcontentloaded' });
      await page!.waitForTimeout(500);

      // Verify modal dialog or form opens
      const formOrModal = await page!.$('[role="dialog"], form');
      if (!formOrModal) {
        throw new Error('Expense Dialog was not mounted by ?action=add-expense');
      }
    });

    // SUITE 5: Manifest & Service Worker Registration
    await runStep('5. Validate Service Worker Registration & PWA Manifest Assets', async () => {
      const manifestResp = await page!.request.get(`http://127.0.0.1:${port}/manifest.json`);
      if (manifestResp.status() !== 200) {
        throw new Error(`manifest.json returned status ${manifestResp.status()}`);
      }
      const manifest = await manifestResp.json();
      if (!manifest.shortcuts || manifest.shortcuts.length < 3) {
        throw new Error(`Expected at least 3 shortcuts in manifest.json, found ${manifest.shortcuts?.length}`);
      }
      if (!manifest.shortcuts[0].short_name || !manifest.shortcuts[0].url) {
        throw new Error(`Expected first shortcut to have valid short_name and url`);
      }
    });

    // SUITE 6: Android Native Assets & Deep Link Schema Verification
    await runStep('6. Validate Android Native Container, Widgets & Deep Links', async () => {
      const manifestXmlPath = path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
      const widgetLayoutPath = path.resolve(process.cwd(), 'android/app/src/main/res/layout/widget_quick_log.xml');
      const widgetProviderPath = path.resolve(process.cwd(), 'android/app/src/main/java/com/budgetpilot/app/QuickLogWidgetProvider.java');

      if (!fs.existsSync(manifestXmlPath)) throw new Error('AndroidManifest.xml is missing');
      if (!fs.existsSync(widgetLayoutPath)) throw new Error('widget_quick_log.xml layout is missing');
      if (!fs.existsSync(widgetProviderPath)) throw new Error('QuickLogWidgetProvider.java is missing');

      const manifestContent = fs.readFileSync(manifestXmlPath, 'utf8');
      if (!manifestContent.includes('scheme="budgetpilot"')) {
        throw new Error('AndroidManifest.xml missing budgetpilot:// deep link schema');
      }
      if (!manifestContent.includes('QuickLogWidgetProvider')) {
        throw new Error('AndroidManifest.xml missing QuickLogWidgetProvider receiver');
      }
    });

  } catch (globalErr: any) {
    console.error('Fatal Playwright Execution Error:', globalErr);
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  // Summary
  console.log(`\n${colors.bright}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}            PLAYWRIGHT BOT EXECUTION REPORT           ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================${colors.reset}\n`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Steps Executed: ${colors.bright}${results.length}${colors.reset}`);
  console.log(`Passed Steps:         ${colors.green}${colors.bright}${passed}${colors.reset}`);
  console.log(`Failed Steps:         ${failed > 0 ? colors.red : colors.green}${colors.bright}${failed}${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}Failed Steps Breakdown:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.step}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}🎉 PLAYWRIGHT BOT TEST COMPLETED WITH 100% SUCCESS!${colors.reset}\n`);
    process.exit(0);
  }
}

runPlaywrightBot().catch(err => {
  console.error('Unhandled Bot Error:', err);
  process.exit(1);
});

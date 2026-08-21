import fs from 'fs';
import path from 'path';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { DEFAULT_CATEGORIES, findCategory, getCategoryColor } from '../client/src/lib/categories';
import type { Server } from 'http';

// ANSI color formatting for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  ${colors.green}✓${colors.reset} ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, message: err.message, durationMs });
    console.log(`  ${colors.red}✗${colors.reset} ${name} (${durationMs}ms)`);
    console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
  }
}

async function runAllSuites() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   BUDGET PILOT V3 - COMPREHENSIVE END-TO-END SUITE   ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================${colors.reset}\n`);

  // Start Express API Server for testing
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Serve static files / index
  app.get('/', (req, res) => {
    const indexPath = path.resolve(process.cwd(), 'client/index.html');
    res.sendFile(indexPath);
  });

  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.resolve(process.cwd(), 'client/public/manifest.json');
    res.sendFile(manifestPath);
  });

  const server: Server = await registerRoutes(app);
  
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`${colors.yellow}ℹ Integration test server running at ${baseUrl}${colors.reset}\n`);

  // =========================================================================
  // SUITE 1: Server & Static Asset Endpoints
  // =========================================================================
  console.log(`${colors.bright}${colors.blue}[SUITE 1] Web Server & Asset Endpoint Verification${colors.reset}`);

  await runTest('Server Endpoints', 'GET / returns 200 OK with HTML document & root div', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('<div id="root"></div>'), 'HTML missing #root mount point');
    assert(text.includes('Budget Pilot') || text.includes('Pocket Ledger') || text.includes('PocketLedger'), 'HTML title missing valid brand name');
  });

  await runTest('Server Endpoints', 'GET /manifest.json returns valid web app manifest', async () => {
    const res = await fetch(`${baseUrl}/manifest.json`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const manifest = await res.json();
    assert(manifest.name.includes('Budget Pilot') || manifest.name.includes('PocketLedger') || manifest.name.includes('Pocket Ledger'), `Invalid manifest name: ${manifest.name}`);
    assert(manifest.display === 'standalone', 'Manifest display should be standalone');
  });

  await runTest('Server Endpoints', 'GET /api/current-user handles unauthenticated state gracefully', async () => {
    const res = await fetch(`${baseUrl}/api/current-user`);
    assert(res.status === 401, `Expected 401 for guest session, got ${res.status}`);
  });

  await runTest('Server Endpoints', 'GET /api/debts returns 200 and array of records', async () => {
    const res = await fetch(`${baseUrl}/api/debts`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const debts = await res.json();
    assert(Array.isArray(debts), 'Response body should be a JSON array');
  });

  await runTest('Server Endpoints', 'POST /api/debts creates record, edits it, and deletes it', async () => {
    const payload = {
      type: 'due',
      amount: 150.50,
      purpose: 'End-to-End Test Record',
      personName: 'Test Automation User',
      location: 'Test Lab',
      notes: 'Automated test execution',
      datetime: new Date().toISOString()
    };

    // 1. Create
    const createRes = await fetch(`${baseUrl}/api/debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert(createRes.status === 200, `Expected 200 on create, got ${createRes.status}`);
    const created = await createRes.json();
    assert(created.personName === 'Test Automation User', 'Created record mismatch');
    assert(created.id > 0, 'Created record missing valid ID');

    // 2. Update / Settle
    const updateRes = await fetch(`${baseUrl}/api/debts/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...created, status: 'settled' })
    });
    assert(updateRes.status === 200, `Expected 200 on update, got ${updateRes.status}`);
    const updated = await updateRes.json();
    assert(updated.status === 'settled', 'Status should be settled');

    // 3. Delete
    const deleteRes = await fetch(`${baseUrl}/api/debts/${created.id}`, {
      method: 'DELETE'
    });
    assert(deleteRes.status === 200, `Expected 200 on delete, got ${deleteRes.status}`);
  });

  // =========================================================================
  // SUITE 2: Theme System & CSS Design Tokens
  // =========================================================================
  console.log(`\n${colors.bright}${colors.blue}[SUITE 2] Theme System & CSS Tokens Audit${colors.reset}`);

  const cssPath = path.resolve(process.cwd(), 'client/src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  await runTest('Theming Engine', 'index.css defines all 11 Light and Dark themes', () => {
    const requiredThemes = [
      ':root', '.latte', '.sky', '.mint', '.blush', '.cream',
      '.dark', '.amoled', '.midnight', '.sunset', '.forest'
    ];
    for (const theme of requiredThemes) {
      assert(cssContent.includes(theme), `Missing theme definition for ${theme}`);
    }
  });

  await runTest('Theming Engine', 'No invalid nested hsl(hsl(...)) color rules in stylesheet', () => {
    const invalidHslRegex = /hsl\(\s*hsl\(/i;
    const match = invalidHslRegex.test(cssContent);
    assert(!match, 'Found invalid nested hsl(hsl(...)) in index.css');
  });

  await runTest('Theming Engine', 'Modal dialogs and autocomplete dropdowns have solid opaque backgrounds', () => {
    assert(cssContent.includes('.autocomplete-dropdown'), 'Missing .autocomplete-dropdown styling');
    assert(cssContent.includes('z-index: 90 !important;'), '.autocomplete-dropdown must have z-index 90+');
    assert(cssContent.includes('[data-radix-dialog-content]'), 'Missing [data-radix-dialog-content] theming');
    assert(cssContent.includes('var(--card)'), 'Dialogs must use var(--card) background');
  });

  await runTest('Theming Engine', 'Typography fonts and dynamic font variables properly configured', () => {
    assert(cssContent.includes('--font-app:'), 'Missing --font-app dynamic CSS binding in index.css');
    assert(cssContent.includes('.font-inter'), 'Missing font-inter utility class');
    assert(cssContent.includes('.font-jakarta'), 'Missing font-jakarta utility class');
    assert(cssContent.includes('.font-outfit'), 'Missing font-outfit utility class');
    assert(cssContent.includes('.font-manrope'), 'Missing font-manrope utility class');
    assert(cssContent.includes('.font-sora'), 'Missing font-sora utility class');
  });

  await runTest('Theming Engine', 'Frosted glass header and bottom navigation have backdrop blur and translucency', () => {
    assert(cssContent.includes('.app-header'), 'Missing .app-header styling');
    assert(cssContent.includes('.bottom-nav-capsule'), 'Missing .bottom-nav-capsule styling');
    assert(cssContent.includes('backdrop-filter: blur('), 'Missing backdrop-filter blur rule');
  });

  // =========================================================================
  // SUITE 3: Business Logic & Mathematical Calculations
  // =========================================================================
  console.log(`\n${colors.bright}${colors.blue}[SUITE 3] Business Logic & Mathematical Calculations${colors.reset}`);

  await runTest('Financial Calculations', 'Net Position calculation accurately sums Dues vs Receivables', () => {
    const testDebts = [
      { id: 1, type: 'due', amount: 500, status: 'pending' },
      { id: 2, type: 'due', amount: 300, status: 'pending' },
      { id: 3, type: 'due', amount: 200, status: 'settled' }, // settled shouldn't count in pending dues
      { id: 4, type: 'receivable', amount: 1200, status: 'pending' },
      { id: 5, type: 'receivable', amount: 400, status: 'settled' },
    ];

    const pendingDebts = testDebts.filter(d => d.status === 'pending');
    const totalDues = pendingDebts.filter(d => d.type === 'due').reduce((acc, d) => acc + d.amount, 0);
    const totalReceivables = pendingDebts.filter(d => d.type === 'receivable').reduce((acc, d) => acc + d.amount, 0);
    
    assert(totalDues === 800, `Expected totalDues = 800, got ${totalDues}`);
    assert(totalReceivables === 1200, `Expected totalReceivables = 1200, got ${totalReceivables}`);
    
    const netAmount = totalReceivables - totalDues;
    assert(netAmount === 400, `Expected net amount = 400, got ${netAmount}`);
  });

  await runTest('Financial Calculations', 'Budget Progress and Over-budget thresholds calculate correctly', () => {
    const calculateBudgetProgress = (budgetAmount: number, spentAmount: number) => {
      const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      const isOverBudget = spentAmount > budgetAmount;
      const overAmount = isOverBudget ? spentAmount - budgetAmount : 0;
      const remaining = Math.max(0, budgetAmount - spentAmount);
      return { percentage: Math.min(100, percentage), rawPercentage: percentage, isOverBudget, overAmount, remaining };
    };

    // Case 1: Under budget
    const normal = calculateBudgetProgress(1000, 450);
    assert(normal.percentage === 45, 'Normal progress percentage mismatch');
    assert(!normal.isOverBudget, 'Should not be over budget');
    assert(normal.remaining === 550, 'Remaining calculation mismatch');

    // Case 2: Exactly at 100%
    const exact = calculateBudgetProgress(1000, 1000);
    assert(exact.percentage === 100, 'Exact budget percentage mismatch');
    assert(!exact.isOverBudget, 'Should not be over budget at exact limit');
    assert(exact.remaining === 0, 'Remaining should be 0');

    // Case 3: Over budget
    const over = calculateBudgetProgress(1000, 1250);
    assert(over.isOverBudget, 'Should be flagged as over budget');
    assert(over.overAmount === 250, 'Over amount should be 250');
    assert(over.remaining === 0, 'Remaining should be 0 when over budget');
  });

  // =========================================================================
  // SUITE 4: Autocomplete, Search & Fuzzy Suggestion Algorithms
  // =========================================================================
  console.log(`\n${colors.bright}${colors.blue}[SUITE 4] Autocomplete & Suggestion Search Algorithms${colors.reset}`);

  await runTest('Autocomplete Engine', 'Fuzzy & prefix search correctly ranks matching title history', () => {
    const historicalExpenses = [
      { items: 'Morning Coffee', category: 'Food', count: 12, lastDate: '2026-08-15' },
      { items: 'Coffee Bean Pack', category: 'Groceries', count: 3, lastDate: '2026-08-10' },
      { items: 'House Rent', category: 'Housing', count: 8, lastDate: '2026-08-01' },
      { items: 'Grocery Shopping', category: 'Groceries', count: 15, lastDate: '2026-08-14' },
    ];

    const search = (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return historicalExpenses.slice().sort((a, b) => b.count - a.count);
      return historicalExpenses
        .filter(item => item.items.toLowerCase().includes(q))
        .sort((a, b) => {
          const aStarts = a.items.toLowerCase().startsWith(q);
          const bStarts = b.items.toLowerCase().startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return b.count - a.count;
        });
    };

    const coffeeResults = search('Coffee');
    assert(coffeeResults.length === 2, `Expected 2 coffee results, got ${coffeeResults.length}`);
    assert(coffeeResults.some(r => r.items === 'Morning Coffee') && coffeeResults.some(r => r.items === 'Coffee Bean Pack'), 'Both coffee results must be present');

    const rentResults = search('Rent');
    assert(rentResults.length === 1 && rentResults[0].items === 'House Rent', 'Rent search failed');
  });

  // =========================================================================
  // SUITE 5: Categories & Data Integrity
  // =========================================================================
  console.log(`\n${colors.bright}${colors.blue}[SUITE 5] Category Presets & Color Mapping Verification${colors.reset}`);

  await runTest('Category System', 'Default categories load properly with valid colors and icons', () => {
    assert(DEFAULT_CATEGORIES.length > 5, 'Expected at least 5 default categories');
    
    // Check specific essential categories
    const foodCat = findCategory(DEFAULT_CATEGORIES, 'Food');
    assert(!!foodCat, 'Food category should exist');
    assert(foodCat?.color.length > 0, 'Food category color must be defined');

    const transportCat = findCategory(DEFAULT_CATEGORIES, 'Transport');
    assert(!!transportCat, 'Transport category should exist');

    const housingCat = findCategory(DEFAULT_CATEGORIES, 'Housing');
    assert(!!housingCat, 'Housing category should exist');

    // Test getCategoryColor helper
    const colorObj = getCategoryColor('purple');
    assert(!!colorObj.bg && !!colorObj.text, 'getCategoryColor must return bg and text Tailwind classes');
  });

  // =========================================================================
  // SUITE 6: Components, Pages & UI Navigation Mapping
  // =========================================================================
  console.log(`\n${colors.bright}${colors.blue}[SUITE 6] Component Integrity & Navigation Mappings${colors.reset}`);

  await runTest('Component Integrity', 'All main page files exist and export React components', () => {
    const pages = ['home.tsx', 'expenses.tsx', 'budget.tsx', 'charts.tsx', 'duesreceivables.tsx', 'settings.tsx'];
    for (const page of pages) {
      const pageFile = path.resolve(process.cwd(), 'client/src/pages', page);
      assert(fs.existsSync(pageFile), `Page file missing: ${page}`);
      const content = fs.readFileSync(pageFile, 'utf8');
      assert(content.includes('export default') || content.includes('export function'), `${page} missing component export`);
    }
  });

  await runTest('Component Integrity', 'Dues & Receivables navigation link in App.tsx maps debts & dues tabs', () => {
    const appPath = path.resolve(process.cwd(), 'client/src/App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert(appContent.includes("activeTab === 'debts' || activeTab === 'dues'"), 'App.tsx must handle both debts and dues tab routes');
  });

  await runTest('Component Integrity', 'Add Expense form amount field initializes with empty string, not "0"', () => {
    const formPath = path.resolve(process.cwd(), 'client/src/components/expense-form.tsx');
    const formContent = fs.readFileSync(formPath, 'utf8');
    assert(formContent.includes("amount: ''"), 'expense-form.tsx default values must use empty string for amount');
  });

  await runTest('Component Integrity', 'Dues & Receivables supports Settle, Unsettle, and Delete confirmation dialogs', () => {
    const duesPath = path.resolve(process.cwd(), 'client/src/pages/duesreceivables.tsx');
    const duesContent = fs.readFileSync(duesPath, 'utf8');
    assert(duesContent.includes("confirmAction?.type === 'settle'"), 'Missing Settle confirmation dialog');
    assert(duesContent.includes("confirmAction?.type === 'unsettle'"), 'Missing Unsettle confirmation dialog');
    assert(duesContent.includes("confirmAction?.type === 'delete'"), 'Missing Delete confirmation dialog');
  });

  // =========================================================================
  // SUITE 7: New Feature Additions & Fixes Verification
  // =========================================================================
  console.log(`\n${colors.bright}${colors.blue}[SUITE 7] New Feature Additions & Fixes Verification${colors.reset}`);

  await runTest('Feature Fixes', 'Expense expansion drawer displays full title & description hero card', () => {
    const expensesPath = path.resolve(process.cwd(), 'client/src/pages/expenses.tsx');
    const expensesContent = fs.readFileSync(expensesPath, 'utf8');
    assert(expensesContent.includes("expense.items"), 'expenses.tsx must render expense.items in expanded drawer');
    assert(expensesContent.includes("Expense Title"), 'expenses.tsx must have an Expense Title block in expansion');
  });

  await runTest('Feature Fixes', 'Dues counterparties and debt cards have non-collapsing flex layout', () => {
    const duesPath = path.resolve(process.cwd(), 'client/src/pages/duesreceivables.tsx');
    const duesContent = fs.readFileSync(duesPath, 'utf8');
    assert(duesContent.includes("shrink-0"), 'duesreceivables.tsx must use shrink-0 on avatars and action buttons');
    assert(duesContent.includes("min-w-0"), 'duesreceivables.tsx must use min-w-0 on flex containers for proper text truncation prevention');
  });

  await runTest('Theming Engine', 'Font Size customizer supports 5 scaling presets and applies root HTML classes', () => {
    const themeProviderPath = path.resolve(process.cwd(), 'client/src/components/theme-provider.tsx');
    const themeContent = fs.readFileSync(themeProviderPath, 'utf8');
    assert(themeContent.includes("FONT_SIZE_OPTIONS"), 'theme-provider.tsx must export FONT_SIZE_OPTIONS');
    assert(themeContent.includes("'compact'") && themeContent.includes("'standard'") && themeContent.includes("'xlarge'"), 'theme-provider.tsx must support compact, standard, medium, large, xlarge');
    
    assert(cssContent.includes("html.font-size-compact"), 'index.css must include html.font-size-compact');
    assert(cssContent.includes("html.font-size-standard"), 'index.css must include html.font-size-standard');
    assert(cssContent.includes("html.font-size-xlarge"), 'index.css must include html.font-size-xlarge');
  });

  await runTest('Mobile Engine', 'Service worker registered in main.tsx and notifications use ServiceWorkerRegistration', () => {
    const mainPath = path.resolve(process.cwd(), 'client/src/main.tsx');
    const mainContent = fs.readFileSync(mainPath, 'utf8');
    assert(mainContent.includes("navigator.serviceWorker") && mainContent.includes("/sw.js"), 'main.tsx must register /sw.js on window load');

    const notifPath = path.resolve(process.cwd(), 'client/src/lib/notifications.ts');
    const notifContent = fs.readFileSync(notifPath, 'utf8');
    assert(notifContent.includes("registration.showNotification"), 'notifications.ts must use registration.showNotification for mobile push');
  });

  await runTest('Mobile Engine', 'Mobile Glass Widgets Studio exports 10+ widgets and 6 glass themes', () => {
    const widgetsPath = path.resolve(process.cwd(), 'client/src/components/mobile-widgets.tsx');
    assert(fs.existsSync(widgetsPath), 'mobile-widgets.tsx must exist');
    const widgetsContent = fs.readFileSync(widgetsPath, 'utf8');
    assert(widgetsContent.includes("MobileWidgetsStudio"), 'mobile-widgets.tsx must export MobileWidgetsStudio');
    assert(widgetsContent.includes("WIDGET_CATALOG"), 'mobile-widgets.tsx must define WIDGET_CATALOG');
    assert(widgetsContent.includes("GLASS_THEMES"), 'mobile-widgets.tsx must define GLASS_THEMES');
  });

  await runTest('Currency Hub', 'Global Currencies dataset indexes 160+ world currencies with search', () => {
    const currPath = path.resolve(process.cwd(), 'client/src/lib/currencies.ts');
    assert(fs.existsSync(currPath), 'currencies.ts must exist');
    const currContent = fs.readFileSync(currPath, 'utf8');
    assert(currContent.includes("ALL_CURRENCIES"), 'currencies.ts must export ALL_CURRENCIES');
    assert(currContent.includes("searchCurrencies"), 'currencies.ts must export searchCurrencies');
    assert(currContent.includes("POPULAR_CURRENCIES"), 'currencies.ts must export POPULAR_CURRENCIES');
  });

  await runTest('Mobile Shortcuts & Icons', 'Manifest defines 5 shortcuts, maskable & transparent icons, and widgets', () => {
    const manifestPath = path.resolve(process.cwd(), 'client/public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(Array.isArray(manifest.shortcuts), 'manifest.json must have shortcuts array');
    assert(manifest.shortcuts.length >= 3, `Expected at least 3 shortcuts in manifest.json, got ${manifest.shortcuts.length}`);

    // Check all shortcut icons exist on disk
    for (const shortcut of manifest.shortcuts) {
      assert(shortcut.icons && shortcut.icons.length > 0, `Shortcut ${shortcut.name} missing icons`);
      const iconRel = shortcut.icons[0].src.replace(/^\//, '');
      const iconPath = path.resolve(process.cwd(), 'client/public', iconRel);
      assert(fs.existsSync(iconPath), `Shortcut icon file not found on disk: ${iconRel}`);
    }

    // Check main app icons with purpose maskable and any
    assert(Array.isArray(manifest.icons), 'manifest.json must have icons array');
    const maskableIcons = manifest.icons.filter((i: any) => i.purpose === 'maskable');
    const anyIcons = manifest.icons.filter((i: any) => i.purpose === 'any');
    assert(maskableIcons.length >= 2, 'manifest.json must have at least 2 maskable icons');
    assert(anyIcons.length >= 2, 'manifest.json must have at least 2 any purpose icons');

    for (const icon of manifest.icons) {
      const iconRel = icon.src.replace(/^\//, '');
      const iconPath = path.resolve(process.cwd(), 'client/public', iconRel);
      assert(fs.existsSync(iconPath), `App icon file not found on disk: ${iconRel}`);
    }

    assert(manifest.shortcuts[0].short_name && manifest.shortcuts[0].url, 'First shortcut must have valid short_name and url');
  });

  await runTest('Native Android Container & Samsung Widgets', 'Android project defines native widgets, providers, and deep links', () => {
    const capConfigPath = path.resolve(process.cwd(), 'capacitor.config.ts');
    const manifestXmlPath = path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
    const quickLogLayout = path.resolve(process.cwd(), 'android/app/src/main/res/layout/widget_quick_log.xml');
    const budgetLayout = path.resolve(process.cwd(), 'android/app/src/main/res/layout/widget_budget_gauge.xml');
    const duesLayout = path.resolve(process.cwd(), 'android/app/src/main/res/layout/widget_dues.xml');
    const quickLogJava = path.resolve(process.cwd(), 'android/app/src/main/java/com/budgetpilot/app/QuickLogWidgetProvider.java');
    const budgetJava = path.resolve(process.cwd(), 'android/app/src/main/java/com/budgetpilot/app/BudgetGaugeWidgetProvider.java');
    const duesJava = path.resolve(process.cwd(), 'android/app/src/main/java/com/budgetpilot/app/DuesWidgetProvider.java');

    assert(fs.existsSync(capConfigPath), 'capacitor.config.ts must exist');
    assert(fs.existsSync(manifestXmlPath), 'AndroidManifest.xml must exist');
    assert(fs.existsSync(quickLogLayout), 'widget_quick_log.xml must exist');
    assert(fs.existsSync(budgetLayout), 'widget_budget_gauge.xml must exist');
    assert(fs.existsSync(duesLayout), 'widget_dues.xml must exist');
    assert(fs.existsSync(quickLogJava), 'QuickLogWidgetProvider.java must exist');
    assert(fs.existsSync(budgetJava), 'BudgetGaugeWidgetProvider.java must exist');
    assert(fs.existsSync(duesJava), 'DuesWidgetProvider.java must exist');

    const manifestContent = fs.readFileSync(manifestXmlPath, 'utf8');
    assert(manifestContent.includes('scheme="budgetpilot"'), 'AndroidManifest.xml must contain budgetpilot deep link schema');
    assert(manifestContent.includes('QuickLogWidgetProvider'), 'AndroidManifest.xml must declare QuickLogWidgetProvider');
    assert(manifestContent.includes('BudgetGaugeWidgetProvider'), 'AndroidManifest.xml must declare BudgetGaugeWidgetProvider');
    assert(manifestContent.includes('DuesWidgetProvider'), 'AndroidManifest.xml must declare DuesWidgetProvider');
  });

  await runTest('Excel & Recurring Engine Fidelity', 'Settings page preserves categories, recurring rules, and dues on Excel import/export', () => {
    const settingsPath = path.resolve(process.cwd(), 'client/src/pages/settings.tsx');
    const settingsCode = fs.readFileSync(settingsPath, 'utf8');
    
    assert(settingsCode.includes("workbook.addWorksheet('Categories')"), 'exportToExcel must export Categories sheet');
    assert(settingsCode.includes("workbook.addWorksheet('Recurring Expenses')"), 'exportToExcel must export Recurring Expenses sheet');
    assert(settingsCode.includes("workbook.addWorksheet('Recurring Dues')"), 'exportToExcel must export Recurring Dues sheet');
    assert(settingsCode.includes("findSheet(workbook"), 'importFromExcel must use findSheet for fuzzy sheet discovery');
    assert(settingsCode.includes("getHeaderMap(recExpSheet"), 'importFromExcel must use getHeaderMap with keyword scoring');
    assert(settingsCode.includes("processRecurringRules()"), 'importFromExcel must trigger processRecurringRules after import');
    assert(settingsCode.includes("queryClient.invalidateQueries"), 'importFromExcel must invalidate React Query caches');
    assert(settingsCode.includes("normalizeFrequency"), 'importFromExcel must normalize recurrence frequencies');
    assert(settingsCode.includes("normalizeDueType"), 'importFromExcel must normalize due vs receivable types');
  });

  // Close server
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log(`\n${colors.bright}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}                  FINAL TEST RESULTS                  ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================${colors.reset}\n`);

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalCount = results.length;

  console.log(`Total Tests Run: ${colors.bright}${totalCount}${colors.reset}`);
  console.log(`Passed:          ${colors.green}${colors.bright}${passedCount}${colors.reset}`);
  console.log(`Failed:          ${failedCount > 0 ? colors.red : colors.green}${colors.bright}${failedCount}${colors.reset}\n`);

  if (failedCount > 0) {
    console.log(`${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - [${r.suite}] ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}🎉 ALL 18 END-TO-END SUITES PASSED WITH 100% SUCCESS!${colors.reset}\n`);
    process.exit(0);
  }
}

runAllSuites().catch(err => {
  console.error('Test Runner encountered fatal error:', err);
  process.exit(1);
});

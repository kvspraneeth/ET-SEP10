import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsImagesDir = path.join(rootDir, 'docs', 'images');

if (!fs.existsSync(docsImagesDir)) {
  fs.mkdirSync(docsImagesDir, { recursive: true });
}

const testDataPath = path.join(rootDir, 'client', 'public', 'Test Data', 'test-data-1.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

async function startServer(): Promise<{ server: any; port: number }> {
  const app = express();
  const distDir = path.join(rootDir, 'dist');
  
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      console.log(`Web server listening on port ${addr.port}`);
      resolve({ server, port: addr.port });
    });
  });
}

async function capture() {
  const { server, port } = await startServer();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });

  const page = await context.newPage();

  console.log(`1. Initial page load on http://127.0.0.1:${port}/ ...`);
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  console.log('2. Seeding IndexedDB synchronously with full test data & dark theme...');
  await page.evaluate((data) => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');

    return new Promise((resolve, reject) => {
      const req = indexedDB.open('ExpenseTrackerDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const availableStores = Array.from(db.objectStoreNames);
        console.log('Available stores:', availableStores);
        const tx = db.transaction(availableStores, 'readwrite');

        for (const storeName of availableStores) {
          const store = tx.objectStore(storeName);
          store.clear();
          const items = data[storeName];
          if (Array.isArray(items)) {
            for (const item of items) {
              store.put(item);
            }
          }
        }

        if (data.settings && availableStores.includes('settings')) {
          data.settings.theme = 'dark';
          tx.objectStore('settings').put(data.settings);
        }

        tx.oncomplete = () => {
          localStorage.setItem('theme', 'dark');
          document.documentElement.classList.add('dark');
          resolve(true);
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, testData);

  console.log('3. Refreshing Home in Dark Mode...');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);

  // 1. Capture Dark Home / Dashboard
  console.log('Capturing dark-home.png...');
  await page.screenshot({ path: path.join(docsImagesDir, 'dark-home.png') });

  // 2. Capture Dark Expenses
  console.log('Capturing dark-expenses.png...');
  await page.goto(`http://127.0.0.1:${port}/?tab=expenses`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(docsImagesDir, 'dark-expenses.png') });

  // 3. Capture Dark Charts & Visual Analytics
  console.log('Capturing dark-charts.png...');
  await page.goto(`http://127.0.0.1:${port}/?tab=charts`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(docsImagesDir, 'dark-charts.png') });

  // 4. Capture Dark Widgets Studio & SpeedBar
  console.log('Capturing dark-widgets.png...');
  await page.goto(`http://127.0.0.1:${port}/?tab=widgets`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(docsImagesDir, 'dark-widgets.png') });

  // 5. Capture Dark Notification Center
  console.log('Capturing dark-notifications.png...');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  // Click notification bell
  const bell = await page.$('header button:has(svg.lucide-bell), header button[aria-label*="notification"]');
  if (bell) {
    await bell.click();
    await page.waitForTimeout(1000);
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(docsImagesDir, 'dark-notifications.png') });

  // 6. Capture Dark Settings / Fluid Customization
  console.log('Capturing dark-settings.png...');
  await page.goto(`http://127.0.0.1:${port}/?tab=settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: path.join(docsImagesDir, 'dark-settings.png') });

  console.log('All dark mode screenshots captured successfully!');
  await browser.close();
  server.close();
}

capture().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});

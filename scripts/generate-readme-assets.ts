import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsImagesDir = path.join(rootDir, 'docs', 'images');

if (!fs.existsSync(docsImagesDir)) {
  fs.mkdirSync(docsImagesDir, { recursive: true });
}

function getBase64Image(filePath: string): string {
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fileData.toString('base64')}`;
}

async function generateAssets() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const homeImg = getBase64Image(path.join(rootDir, 'client', 'public', 'Mobile Screenshots', 'Home_pg1.jpeg'));
  const expensesImg = getBase64Image(path.join(rootDir, 'client', 'public', 'Mobile Screenshots', 'Expenses_pg1.jpeg'));
  const chartsImg = getBase64Image(path.join(rootDir, 'client', 'public', 'Mobile Screenshots', 'Charts_pg1.jpeg'));
  const widgetsImg = getBase64Image(path.join(rootDir, 'client', 'public', 'Mobile Screenshots', 'Widgets_pg1.jpeg'));
  const notifsImg = getBase64Image(path.join(rootDir, 'client', 'public', 'Mobile Screenshots', 'Notifs_pg1.jpeg'));
  const logoImg = getBase64Image(path.join(rootDir, 'client', 'public', 'icons', 'v3_logo_512.png'));

  // 1. HERO BRAND BANNER
  console.log('Generating Hero Brand Banner...');
  const heroHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        height: 560px;
        background: radial-gradient(circle at 50% -20%, #1e1b4b 0%, #090d16 60%, #030712 100%);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 60px;
        position: relative;
        overflow: hidden;
      }
      .bg-glow-1 {
        position: absolute;
        top: -100px;
        left: 20%;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
        filter: blur(50px);
        pointer-events: none;
      }
      .bg-glow-2 {
        position: absolute;
        bottom: -150px;
        right: 10%;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%);
        filter: blur(60px);
        pointer-events: none;
      }
      .grid-lines {
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(circle at 50% 50%, black, transparent 85%);
      }
      .left-content {
        max-width: 600px;
        z-index: 2;
      }
      .brand-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        background: rgba(99, 102, 241, 0.12);
        border: 1px solid rgba(129, 140, 248, 0.35);
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 700;
        color: #a5b4fc;
        margin-bottom: 20px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .brand-pill .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
      }
      h1 {
        font-size: 52px;
        line-height: 1.1;
        font-weight: 900;
        letter-spacing: -0.03em;
        margin-bottom: 16px;
      }
      .gradient-text {
        background: linear-gradient(135deg, #ffffff 30%, #818cf8 70%, #34d399 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      p.tagline {
        font-size: 17px;
        line-height: 1.5;
        color: #94a3b8;
        margin-bottom: 28px;
        font-weight: 500;
      }
      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .feature-tag {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .feature-tag span {
        color: #38bdf8;
      }

      .phones-container {
        position: relative;
        width: 520px;
        height: 480px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-card {
        position: absolute;
        border-radius: 28px;
        overflow: hidden;
        border: 3px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2);
        background: #000;
      }
      .phone-card.left {
        width: 220px;
        height: 440px;
        transform: translate(-110px, 15px) rotate(-8deg) scale(0.92);
        opacity: 0.85;
        z-index: 1;
        border-color: rgba(99, 102, 241, 0.3);
      }
      .phone-card.center {
        width: 240px;
        height: 480px;
        transform: translate(0, -10px) rotate(0deg) scale(1.02);
        z-index: 3;
        border-color: rgba(129, 140, 248, 0.6);
        box-shadow: 0 30px 60px -10px rgba(0, 0, 0, 0.85), 0 0 45px rgba(99, 102, 241, 0.4);
      }
      .phone-card.right {
        width: 220px;
        height: 440px;
        transform: translate(110px, 15px) rotate(8deg) scale(0.92);
        opacity: 0.85;
        z-index: 2;
        border-color: rgba(52, 211, 153, 0.3);
      }
      .phone-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="grid-lines"></div>
    <div class="bg-glow-1"></div>
    <div class="bg-glow-2"></div>

    <div class="left-content">
      <div class="brand-pill">
        <span class="dot"></span>
        Budget Pilot • Version 2.0 Beta
      </div>
      <h1>Smarter Finance.<br><span class="gradient-text">Precision Control.</span></h1>
      <p class="tagline">Next-generation personal expense tracker & budget copilot with offline-first indexing, real-time analytics, instant logging, and native Android home-screen widgets.</p>
      <div class="badge-row">
        <div class="feature-tag"><span>⚡</span> Instant Logging</div>
        <div class="feature-tag"><span>📊</span> Visual Analytics</div>
        <div class="feature-tag"><span>📱</span> Android Native Widgets</div>
        <div class="feature-tag"><span>🔒</span> 100% Offline IndexedDB</div>
      </div>
    </div>

    <div class="phones-container">
      <div class="phone-card left">
        <img src="${chartsImg}" />
      </div>
      <div class="phone-card center">
        <img src="${homeImg}" />
      </div>
      <div class="phone-card right">
        <img src="${widgetsImg}" />
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(heroHtml);
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.screenshot({ path: path.join(docsImagesDir, 'hero-banner.png') });
  console.log('Saved hero-banner.png');

  // 2. FEATURE HIGHLIGHTS SHOWCASE (5 Phones Strip)
  console.log('Generating Mobile Showcase...');
  const showcaseHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        background: #090d16;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        padding: 50px 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .header {
        text-align: center;
        margin-bottom: 40px;
      }
      .header h2 {
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin-bottom: 8px;
        background: linear-gradient(135deg, #fff, #94a3b8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .header p {
        font-size: 15px;
        color: #64748b;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 20px;
        width: 100%;
      }
      .device-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .phone-frame {
        width: 220px;
        height: 450px;
        border-radius: 26px;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6);
        background: #020617;
        transition: transform 0.2s ease;
      }
      .phone-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
        display: block;
      }
      .label-badge {
        font-size: 13px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 20px;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
      }
      .label-desc {
        font-size: 11px;
        color: #64748b;
        text-align: center;
        max-width: 180px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>Crafted for Effortless Financial Flow</h2>
      <p>Explore the flagship views designed for speed, clarity, and mobile perfection</p>
    </div>

    <div class="grid">
      <div class="device-item">
        <div class="phone-frame">
          <img src="${homeImg}" />
        </div>
        <div class="label-badge">🏠 Smart Dashboard</div>
        <div class="label-desc">Live velocity gauges, instant balance & category budgets</div>
      </div>

      <div class="device-item">
        <div class="phone-frame">
          <img src="${expensesImg}" />
        </div>
        <div class="label-badge">💳 Quick Expenses</div>
        <div class="label-desc">One-tap chip entries, fast filters & detailed receipts</div>
      </div>

      <div class="device-item">
        <div class="phone-frame">
          <img src="${chartsImg}" />
        </div>
        <div class="label-badge">📊 Visual Analytics</div>
        <div class="label-desc">Deep breakdowns, spending trends & custom chart builder</div>
      </div>

      <div class="device-item">
        <div class="phone-frame">
          <img src="${widgetsImg}" />
        </div>
        <div class="label-badge">📱 Home Widgets</div>
        <div class="label-desc">Live budget gauge, quick log & dues on Android home screen</div>
      </div>

      <div class="device-item">
        <div class="phone-frame">
          <img src="${notifsImg}" />
        </div>
        <div class="label-badge">🔔 Notification Hub</div>
        <div class="label-desc">Recurring bill alerts, sound fx & budget milestone warnings</div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(showcaseHtml);
  await page.setViewportSize({ width: 1280, height: 660 });
  await page.screenshot({ path: path.join(docsImagesDir, 'mobile-showcase.png') });
  console.log('Saved mobile-showcase.png');

  // 3. WIDGETS & NATIVE POWER SHOWCASE
  console.log('Generating Widgets Feature Banner...');
  const widgetHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        height: 520px;
        background: linear-gradient(135deg, #090d16 0%, #0d1527 50%, #030712 100%);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 70px;
        position: relative;
        overflow: hidden;
      }
      .glow-blob {
        position: absolute;
        width: 450px;
        height: 450px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
        filter: blur(50px);
        top: 10%;
        left: 50%;
        pointer-events: none;
      }
      .content {
        max-width: 580px;
        z-index: 2;
      }
      .tag {
        color: #38bdf8;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      h2 {
        font-size: 40px;
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.02em;
        margin-bottom: 16px;
      }
      p {
        font-size: 16px;
        line-height: 1.6;
        color: #94a3b8;
        margin-bottom: 24px;
      }
      .feature-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .feature-item .icon-box {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid rgba(56, 189, 248, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #38bdf8;
        font-size: 14px;
        flex-shrink: 0;
      }
      .feature-item strong {
        color: #f1f5f9;
        font-size: 14px;
      }
      .feature-item span {
        color: #64748b;
        font-size: 13px;
        display: block;
      }
      .preview-side {
        position: relative;
        z-index: 2;
        width: 480px;
        height: 420px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-mockup {
        width: 230px;
        height: 420px;
        border-radius: 24px;
        overflow: hidden;
        border: 2px solid rgba(56, 189, 248, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.2);
        background: #000;
      }
      .phone-mockup img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      .floating-card {
        position: absolute;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 14px 18px;
        border-radius: 16px;
        box-shadow: 0 15px 30px rgba(0,0,0,0.5);
      }
      .floating-card.top-right {
        top: 25px;
        right: -10px;
      }
      .floating-card.bottom-left {
        bottom: 30px;
        left: -10px;
      }
      .floating-card h4 {
        font-size: 13px;
        font-weight: 700;
        color: #f8fafc;
      }
      .floating-card p {
        font-size: 12px;
        color: #34d399;
        margin: 0;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="glow-blob"></div>

    <div class="content">
      <div class="tag">Android Native Integration</div>
      <h2>Control Your Budget Right From Your Home Screen</h2>
      <p>Budget Pilot features first-class Samsung and Android home screen widgets for instantaneous logging without opening the app.</p>
      
      <div class="feature-list">
        <div class="feature-item">
          <div class="icon-box">⚡</div>
          <div>
            <strong>Quick Log Widget Provider</strong>
            <span>One-tap instant spend recording directly to local database</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="icon-box">🎯</div>
          <div>
            <strong>Budget Gauge Provider</strong>
            <span>Visual radial fill gauge showing monthly spend % & remaining limit</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="icon-box">🗓️</div>
          <div>
            <strong>Upcoming Dues & Subscriptions</strong>
            <span>Never miss a recurring bill with glanceable home screen countdowns</span>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-side">
      <div class="floating-card top-right">
        <h4>⚡ Instant One-Tap Log</h4>
        <p>Zero-friction tracking</p>
      </div>
      <div class="phone-mockup">
        <img src="${widgetsImg}" />
      </div>
      <div class="floating-card bottom-left">
        <h4>🎯 73% Budget Consumed</h4>
        <p>Safe Spending Pace</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(widgetHtml);
  await page.setViewportSize({ width: 1280, height: 520 });
  await page.screenshot({ path: path.join(docsImagesDir, 'widgets-showcase.png') });
  console.log('Saved widgets-showcase.png');

  // 4. ANALYTICS & DATA SOVEREIGNTY
  console.log('Generating Analytics Feature Banner...');
  const analyticsHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        height: 520px;
        background: radial-gradient(circle at 80% 20%, #1e1b4b 0%, #090d16 60%, #030712 100%);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 70px;
        position: relative;
        overflow: hidden;
      }
      .glow {
        position: absolute;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
        filter: blur(60px);
        top: -100px;
        right: 15%;
        pointer-events: none;
      }
      .preview-side {
        position: relative;
        z-index: 2;
        width: 460px;
        height: 440px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-mockup {
        width: 230px;
        height: 420px;
        border-radius: 24px;
        overflow: hidden;
        border: 2px solid rgba(168, 85, 247, 0.35);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 35px rgba(168, 85, 247, 0.25);
        background: #000;
      }
      .phone-mockup img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      .content {
        max-width: 600px;
        z-index: 2;
      }
      .tag {
        color: #c084fc;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      h2 {
        font-size: 38px;
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.02em;
        margin-bottom: 16px;
      }
      p {
        font-size: 16px;
        line-height: 1.6;
        color: #94a3b8;
        margin-bottom: 24px;
      }
      .pill-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .pill-card {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px 16px;
        backdrop-filter: blur(10px);
      }
      .pill-card h4 {
        font-size: 14px;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pill-card p {
        font-size: 12px;
        color: #64748b;
        margin: 0;
        line-height: 1.4;
      }
    </style>
  </head>
  <body>
    <div class="glow"></div>

    <div class="preview-side">
      <div class="phone-mockup">
        <img src="${chartsImg}" />
      </div>
    </div>

    <div class="content">
      <div class="tag">Analytics & Data Engine</div>
      <h2>Deep Visual Analytics with Zero Cloud Dependency</h2>
      <p>Gain absolute clarity over your cashflow velocity, daily burn rate, and category distributions with 100% offline local privacy.</p>
      
      <div class="pill-grid">
        <div class="pill-card">
          <h4>📊 Recharts Visual Engine</h4>
          <p>Interactive category donut, daily burn rate line charts, and spending breakdown.</p>
        </div>
        <div class="pill-card">
          <h4>💾 Dexie.js IndexedDB</h4>
          <p>Sub-millisecond queries with zero latency and full offline data persistence.</p>
        </div>
        <div class="pill-card">
          <h4>📑 Instant Excel & JSON Sync</h4>
          <p>One-click 2-way import/export compatible with spreadsheets and data tools.</p>
        </div>
        <div class="pill-card">
          <h4>🌍 Multi-Currency Ready</h4>
          <p>Seamless toggle across INR (₹), USD ($), EUR (€), GBP (£), JPY (¥), and more.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(analyticsHtml);
  await page.setViewportSize({ width: 1280, height: 520 });
  await page.screenshot({ path: path.join(docsImagesDir, 'analytics-showcase.png') });
  console.log('Saved analytics-showcase.png');

  await browser.close();
  console.log('All branded assets generated successfully in docs/images/!');
}

generateAssets().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});

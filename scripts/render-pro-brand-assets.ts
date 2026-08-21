import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsImagesDir = path.join(rootDir, 'docs', 'images');

function getBase64Image(filePath: string): string {
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fileData.toString('base64')}`;
}

async function renderProBrandAssets() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const darkHome = getBase64Image(path.join(docsImagesDir, 'dark-home.png'));
  const darkExpenses = getBase64Image(path.join(docsImagesDir, 'dark-expenses.png'));
  const darkCharts = getBase64Image(path.join(docsImagesDir, 'dark-charts.png'));
  const darkWidgets = getBase64Image(path.join(docsImagesDir, 'dark-widgets.png'));
  const darkNotifs = getBase64Image(path.join(docsImagesDir, 'dark-notifications.png'));
  const darkSettings = getBase64Image(path.join(docsImagesDir, 'dark-settings.png'));

  // =========================================================================
  // 1. PRO HERO BANNER (DARK FLUID GLASS & 3D FLOATING DEVICES)
  // =========================================================================
  console.log('Rendering 1. pro-hero-banner.png ...');
  const heroHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1300px;
        height: 600px;
        background: radial-gradient(circle at 50% -20%, #170f38 0%, #080b14 55%, #02040a 100%);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 65px;
        position: relative;
        overflow: hidden;
      }
      .ambient-glow-purple {
        position: absolute;
        top: -80px;
        left: 25%;
        width: 550px;
        height: 550px;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.28) 0%, transparent 65%);
        filter: blur(55px);
        pointer-events: none;
      }
      .ambient-glow-cyan {
        position: absolute;
        bottom: -100px;
        right: 15%;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.20) 0%, transparent 65%);
        filter: blur(65px);
        pointer-events: none;
      }
      .grid-overlay {
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
        background-size: 44px 44px;
        mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 80%);
      }
      .left-copy {
        max-width: 620px;
        z-index: 3;
      }
      .brand-pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 7px 16px;
        background: rgba(139, 92, 246, 0.12);
        border: 1px solid rgba(167, 139, 250, 0.4);
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 700;
        color: #c4b5fd;
        margin-bottom: 22px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .brand-pill .spark {
        color: #38bdf8;
        font-size: 14px;
      }
      h1 {
        font-size: 54px;
        line-height: 1.08;
        font-weight: 900;
        letter-spacing: -0.035em;
        margin-bottom: 18px;
      }
      .gradient-title {
        background: linear-gradient(135deg, #ffffff 20%, #c084fc 60%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      p.subtitle {
        font-size: 17px;
        line-height: 1.55;
        color: #94a3b8;
        margin-bottom: 28px;
        font-weight: 500;
      }
      .feature-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: 7px;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 7px 14px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
      }
      .chip .icon {
        color: #a78bfa;
      }

      .phones-stage {
        position: relative;
        width: 530px;
        height: 520px;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-mockup {
        position: absolute;
        border-radius: 32px;
        overflow: hidden;
        border: 3px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(139, 92, 246, 0.25);
        background: #020617;
      }
      .phone-mockup.left {
        width: 235px;
        height: 480px;
        transform: translate(-120px, 15px) rotate(-9deg) scale(0.92);
        opacity: 0.88;
        z-index: 1;
        border-color: rgba(139, 92, 246, 0.4);
      }
      .phone-mockup.center {
        width: 255px;
        height: 520px;
        transform: translate(0, -10px) rotate(0deg) scale(1.02);
        z-index: 3;
        border-color: rgba(167, 139, 250, 0.7);
        box-shadow: 0 35px 70px -10px rgba(0, 0, 0, 0.95), 0 0 55px rgba(139, 92, 246, 0.45);
      }
      .phone-mockup.right {
        width: 235px;
        height: 480px;
        transform: translate(120px, 15px) rotate(9deg) scale(0.92);
        opacity: 0.88;
        z-index: 2;
        border-color: rgba(56, 189, 248, 0.4);
      }
      .phone-mockup img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="grid-overlay"></div>
    <div class="ambient-glow-purple"></div>
    <div class="ambient-glow-cyan"></div>

    <div class="left-copy">
      <div class="brand-pill">
        <span class="spark">✦</span>
        Pocket Ledger • The V3 Evolution
      </div>
      <h1>Smarter Finance.<br><span class="gradient-title">Liquid Glass Precision.</span></h1>
      <p class="subtitle">Complete revamp engineered with Fluid Glassmorphism, real-time burn rate gauges, SpeedBar 1-tap logging, custom visual chart studio, and 100% offline local privacy.</p>
      <div class="feature-chips">
        <div class="chip"><span class="icon">⚡</span> 1-Tap SpeedBar</div>
        <div class="chip"><span class="icon">🎨</span> Fluid Glass UI</div>
        <div class="chip"><span class="icon">📊</span> Custom Chart Studio</div>
        <div class="chip"><span class="icon">🔒</span> 100% Offline IndexedDB</div>
      </div>
    </div>

    <div class="phones-stage">
      <div class="phone-mockup left">
        <img src="${darkCharts}" />
      </div>
      <div class="phone-mockup center">
        <img src="${darkHome}" />
      </div>
      <div class="phone-mockup right">
        <img src="${darkWidgets}" />
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(heroHtml);
  await page.setViewportSize({ width: 1300, height: 600 });
  await page.screenshot({ path: path.join(docsImagesDir, 'pro-hero-banner.png') });
  console.log('Saved pro-hero-banner.png');

  // =========================================================================
  // 2. 6-SCREEN DARK MODE SHOWCASE GRID
  // =========================================================================
  console.log('Rendering 2. pro-showcase-grid.png ...');
  const showcaseHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1380px;
        background: #040711;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        padding: 45px 35px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .title-area {
        text-align: center;
        margin-bottom: 35px;
      }
      .pill {
        display: inline-block;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
        border: 1px solid rgba(56, 189, 248, 0.25);
        padding: 5px 12px;
        border-radius: 9999px;
        margin-bottom: 10px;
      }
      .title-area h2 {
        font-size: 34px;
        font-weight: 900;
        letter-spacing: -0.025em;
        margin-bottom: 6px;
        background: linear-gradient(135deg, #ffffff 40%, #c4b5fd 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .title-area p {
        font-size: 14px;
        color: #64748b;
      }
      .device-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 16px;
        width: 100%;
      }
      .device-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .phone-card {
        width: 200px;
        height: 430px;
        border-radius: 26px;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.15);
        background: #020617;
      }
      .phone-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
        display: block;
      }
      .tag-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        text-align: center;
        white-space: nowrap;
      }
      .tag-desc {
        font-size: 11px;
        color: #64748b;
        text-align: center;
        max-width: 170px;
        line-height: 1.35;
      }
    </style>
  </head>
  <body>
    <div class="title-area">
      <div class="pill">Flagship Dark Mode Suite</div>
      <h2>Fluid Glass Interface Engineered for Flow</h2>
      <p>Precision financial command with pure dark aesthetic, tactile controls, and real-time responsiveness</p>
    </div>

    <div class="device-grid">
      <div class="device-col">
        <div class="phone-card">
          <img src="${darkHome}" />
        </div>
        <div class="tag-badge">🏠 Live Dashboard</div>
        <div class="tag-desc">Safe spend velocity & real-time monthly burn rate gauge</div>
      </div>

      <div class="device-col">
        <div class="phone-card">
          <img src="${darkExpenses}" />
        </div>
        <div class="tag-badge">💳 Ledger & Filters</div>
        <div class="tag-desc">Instant multi-tag search, fast filter chips & inline edits</div>
      </div>

      <div class="device-col">
        <div class="phone-card">
          <img src="${darkCharts}" />
        </div>
        <div class="tag-badge">📊 Visual Analytics</div>
        <div class="tag-desc">Interactive category donuts, burn progression & chart builder</div>
      </div>

      <div class="device-col">
        <div class="phone-card">
          <img src="${darkWidgets}" />
        </div>
        <div class="tag-badge">📱 Glass Widgets</div>
        <div class="tag-desc">SpeedBar 1-tap logger & customizable glass presets</div>
      </div>

      <div class="device-col">
        <div class="phone-card">
          <img src="${darkNotifs}" />
        </div>
        <div class="tag-badge">🔔 Smart Alerts Hub</div>
        <div class="tag-desc">Proactive bill reminders, threshold alerts & habit prompts</div>
      </div>

      <div class="device-col">
        <div class="phone-card">
          <img src="${darkSettings}" />
        </div>
        <div class="tag-badge">⚙️ Theme & Backups</div>
        <div class="tag-desc">5 AMOLED dark modes, 6 light presets & 2-way Excel sync</div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(showcaseHtml);
  await page.setViewportSize({ width: 1380, height: 660 });
  await page.screenshot({ path: path.join(docsImagesDir, 'pro-showcase-grid.png') });
  console.log('Saved pro-showcase-grid.png');

  // =========================================================================
  // 3. FLUID GLASS & CUSTOMIZATION SPOTLIGHT BANNER
  // =========================================================================
  console.log('Rendering 3. fluid-glass-showcase.png ...');
  const glassHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1300px;
        height: 540px;
        background: radial-gradient(circle at 20% 50%, #1e1035 0%, #080c18 50%, #020409 100%);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 70px;
        position: relative;
        overflow: hidden;
      }
      .glass-orb {
        position: absolute;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, transparent 65%);
        filter: blur(60px);
        top: -100px;
        left: 30%;
        pointer-events: none;
      }
      .content {
        max-width: 630px;
        z-index: 2;
      }
      .tag {
        color: #a855f7;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      h2 {
        font-size: 38px;
        font-weight: 900;
        line-height: 1.15;
        letter-spacing: -0.025em;
        margin-bottom: 16px;
      }
      p {
        font-size: 15px;
        line-height: 1.6;
        color: #94a3b8;
        margin-bottom: 22px;
      }
      .spec-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .spec-card {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 12px 16px;
        backdrop-filter: blur(16px);
      }
      .spec-card h4 {
        font-size: 13px;
        font-weight: 800;
        color: #f1f5f9;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .spec-card p {
        font-size: 12px;
        color: #64748b;
        margin: 0;
        line-height: 1.35;
      }
      .preview-side {
        position: relative;
        z-index: 2;
        width: 460px;
        height: 450px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-frame {
        width: 235px;
        height: 440px;
        border-radius: 28px;
        overflow: hidden;
        border: 2px solid rgba(168, 85, 247, 0.4);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.85), 0 0 40px rgba(168, 85, 247, 0.3);
        background: #000;
      }
      .phone-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      .floating-tag {
        position: absolute;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        padding: 10px 16px;
        border-radius: 14px;
        box-shadow: 0 15px 30px rgba(0,0,0,0.6);
      }
      .floating-tag.top-right {
        top: 20px;
        right: 0px;
      }
      .floating-tag.bottom-left {
        bottom: 25px;
        left: -10px;
      }
      .floating-tag h4 {
        font-size: 12px;
        font-weight: 800;
        color: #f8fafc;
      }
      .floating-tag p {
        font-size: 11px;
        color: #38bdf8;
        margin: 0;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="glass-orb"></div>

    <div class="content">
      <div class="tag">Next-Gen Appearance & Fluid Glass</div>
      <h2>Engineered With Pure Glassmorphic Aesthetics</h2>
      <p>Every element is sculpted with dynamic backdrop blur filters, luminous border sheens, and tactile micro-spring physics tailored for OLED displays.</p>
      
      <div class="spec-grid">
        <div class="spec-card">
          <h4>💎 6 Glass Styles</h4>
          <p>Frosted, Neon Glow, Obsidian Dark, Aurora Teal, Rose Quartz, Crystal Clear.</p>
        </div>
        <div class="spec-card">
          <h4>🌙 5 AMOLED Presets</h4>
          <p>Charcoal Dark, Deep Pitch OLED, Midnight Navy, Cyberpunk Indigo, Emerald Night.</p>
        </div>
        <div class="spec-card">
          <h4>⚡ SpeedBar 1-Tap Logs</h4>
          <p>Pre-configured instant micro-chips with customizable amounts and hotkeys.</p>
        </div>
        <div class="spec-card">
          <h4>🎨 Full Palette Theming</h4>
          <p>Custom gradient accents across Violet, Emerald, Sapphire, Amber & Rose.</p>
        </div>
      </div>
    </div>

    <div class="preview-side">
      <div class="floating-tag top-right">
        <h4>💎 Frosted Glass UI</h4>
        <p>Dynamic 24px Blur</p>
      </div>
      <div class="phone-frame">
        <img src="${darkWidgets}" />
      </div>
      <div class="floating-tag bottom-left">
        <h4>⚡ SpeedBar Hot-Log</h4>
        <p>Under 2s per Entry</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(glassHtml);
  await page.setViewportSize({ width: 1300, height: 540 });
  await page.screenshot({ path: path.join(docsImagesDir, 'fluid-glass-showcase.png') });
  console.log('Saved fluid-glass-showcase.png');

  // =========================================================================
  // 4. CUSTOM CHART STUDIO & ANALYTICS SPOTLIGHT BANNER
  // =========================================================================
  console.log('Rendering 4. charts-studio-showcase.png ...');
  const chartHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&family=JetBrains+Mono:wght@600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1300px;
        height: 540px;
        background: radial-gradient(circle at 80% 30%, #0d213a 0%, #060d19 50%, #020409 100%);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 70px;
        position: relative;
        overflow: hidden;
      }
      .cyan-orb {
        position: absolute;
        width: 550px;
        height: 550px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 65%);
        filter: blur(60px);
        top: -100px;
        right: 15%;
        pointer-events: none;
      }
      .preview-side {
        position: relative;
        z-index: 2;
        width: 460px;
        height: 450px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-frame {
        width: 235px;
        height: 440px;
        border-radius: 28px;
        overflow: hidden;
        border: 2px solid rgba(56, 189, 248, 0.4);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.25);
        background: #000;
      }
      .phone-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      .content {
        max-width: 630px;
        z-index: 2;
      }
      .tag {
        color: #38bdf8;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      h2 {
        font-size: 38px;
        font-weight: 900;
        line-height: 1.15;
        letter-spacing: -0.025em;
        margin-bottom: 16px;
      }
      p {
        font-size: 15px;
        line-height: 1.6;
        color: #94a3b8;
        margin-bottom: 22px;
      }
      .pill-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .pill-card {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 12px 16px;
        backdrop-filter: blur(16px);
      }
      .pill-card h4 {
        font-size: 13px;
        font-weight: 800;
        color: #f1f5f9;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pill-card p {
        font-size: 12px;
        color: #64748b;
        margin: 0;
        line-height: 1.35;
      }
    </style>
  </head>
  <body>
    <div class="cyan-orb"></div>

    <div class="preview-side">
      <div class="phone-frame">
        <img src="${darkCharts}" />
      </div>
    </div>

    <div class="content">
      <div class="tag">Visual Analytics & Custom Studio</div>
      <h2>Total Spending Insights with Custom Chart Builder</h2>
      <p>Transform raw transactions into actionable financial intelligence with Recharts-powered interactive analytics and customizable visual studios.</p>
      
      <div class="pill-grid">
        <div class="pill-card">
          <h4>📊 Custom Chart Studio</h4>
          <p>Build custom graphs: Donut, Area, Line, Bar, and Radar charts on the fly.</p>
        </div>
        <div class="pill-card">
          <h4>⚡ Velocity & Burn Rate</h4>
          <p>Daily burn trajectory, safe spend pacing, and end-of-month forecasts.</p>
        </div>
        <div class="pill-card">
          <h4>📑 Multi-Date Aggregation</h4>
          <p>Filter by Week, Month, Quarter, Year, or custom date range brackets.</p>
        </div>
        <div class="pill-card">
          <h4>💾 Two-Way Excel Sync</h4>
          <p>Instant spreadsheet export/import with automatic formula and tag mapping.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(chartHtml);
  await page.setViewportSize({ width: 1300, height: 540 });
  await page.screenshot({ path: path.join(docsImagesDir, 'charts-studio-showcase.png') });
  console.log('Saved charts-studio-showcase.png');

  await browser.close();
  console.log('All 4 pro brand assets generated successfully in docs/images/!');
}

renderProBrandAssets().catch((err) => {
  console.error('Error rendering pro assets:', err);
  process.exit(1);
});

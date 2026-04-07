// api/export.js — Server-side PNG export via Playwright + Sparticuz Chromium
// Renders template HTML at native resolution (no upscaling, no pixelation)

let chromium, playwright;
try {
  // Vercel/Lambda: use sparticuz chromium
  chromium = require('@sparticuz/chromium');
  playwright = require('playwright-core');
} catch {
  // Local dev fallback
  playwright = require('playwright');
  chromium = null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = '';
  await new Promise((resolve) => {
    req.on('data', chunk => body += chunk);
    req.on('end', resolve);
  });

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // designW/designH = CSS coordinate space (e.g. 340x340)
  // exportW/exportH = actual pixel output (e.g. 1080x1080)
  // deviceScaleFactor = exportW / designW — fonts/layout stay at designW, pixels are exportW
  const { html, designW, designH, exportW, exportH } = payload;
  if (!html || !designW || !designH || !exportW || !exportH) {
    return res.status(400).json({ error: 'Missing html, designW, designH, exportW, exportH' });
  }

  const deviceScaleFactor = exportW / designW;

  // Wrap template HTML with fonts + brand CSS
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Forum&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{width:${designW}px;height:${designH}px;overflow:hidden;}
</style>
</head>
<body>${html}</body>
</html>`;

  let browser;
  try {
    const launchOptions = chromium
      ? {
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        }
      : { args: ['--no-sandbox', '--disable-setuid-sandbox'] };

    browser = await (playwright.chromium || playwright).launch(launchOptions);
    const context = await browser.newContext({
      viewport: { width: designW, height: designH },
      deviceScaleFactor
    });
    const page = await context.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle' });
    // Extra wait for fonts to load
    await page.waitForTimeout(600);
    const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: designW, height: designH } });
    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="sb-template.png"');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).end(buffer);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
};

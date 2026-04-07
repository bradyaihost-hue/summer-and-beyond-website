// api/export.js — Server-side PNG export via Playwright
// Renders template HTML at native resolution (no upscaling, no pixelation)

const { chromium } = require('playwright');

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

  const { html, width, height } = payload;
  if (!html || !width || !height) {
    return res.status(400).json({ error: 'Missing html, width, or height' });
  }

  // Wrap template HTML with fonts + brand CSS for correct rendering
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Forum&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{width:${width}px;height:${height}px;overflow:hidden;}
</style>
</head>
<body>${html}</body>
</html>`;

  let browser;
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewportSize({ width, height });
    await page.setContent(fullHtml, { waitUntil: 'networkidle' });
    // Extra wait for fonts
    await page.waitForTimeout(500);
    const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
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

// api/export.js — Server-side PNG export via Playwright + Sparticuz Chromium

let chromiumPkg, playwrightLib;
try {
  chromiumPkg = require('@sparticuz/chromium');
  playwrightLib = require('playwright-core');
} catch {
  playwrightLib = require('playwright');
  chromiumPkg = null;
}

const BRAND_CSS = `
  :root {
    --cream: #F5F0E8;
    --sage: #A3BA9E;
    --dusty-pink: #D4A5A0;
    --warm-brown: #6B4F3A;
    --stone: #A09B99;
    --pale-bg: #EDEBE5;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .g1 { width: 340px; height: 340px; background: #6B4F3A; position: relative; overflow: hidden; }
  .g1 .overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(107,79,58,0.72) 0%, transparent 55%); }
  .g1 .content { position: absolute; bottom: 28px; left: 28px; right: 28px; }
  .g1 .eyebrow { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(245,240,232,0.7); margin-bottom: 6px; }
  .g1 .headline { font-family: 'Forum', serif; font-size: 30px; line-height: 1.1; color: #F5F0E8; margin-bottom: 10px; }
  .g1 .tagline { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 300; letter-spacing: 0.06em; color: rgba(245,240,232,0.75); }
  .g1 .logo-mark { position: absolute; top: 20px; right: 20px; font-family: 'Forum', serif; font-size: 11px; color: rgba(245,240,232,0.6); letter-spacing: 0.08em; }
  .g1 .ph { position: absolute; inset: 0; background: rgba(107,79,58,0.3); display: flex; align-items: center; justify-content: center; }

  .g2 { width: 340px; height: 340px; background: #F5F0E8; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; border: 1px solid rgba(107,79,58,0.14); }
  .g2 .img-side { width: 100%; height: 100%; background: rgba(163,186,158,0.2); position: relative; overflow: hidden; }
  .g2 .text-side { padding: 28px 20px; display: flex; flex-direction: column; justify-content: space-between; }
  .g2 .eyebrow { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #A3BA9E; margin-bottom: 10px; }
  .g2 .hotel-name { font-family: 'Forum', serif; font-size: 20px; line-height: 1.15; color: #6B4F3A; margin-bottom: 8px; }
  .g2 .location { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 400; letter-spacing: 0.08em; color: #A09B99; }
  .g2 .detail-line { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 300; line-height: 1.7; color: #6B4F3A; opacity: 0.7; margin-top: 14px; }
  .g2 .bottom { border-top: 1px solid rgba(107,79,58,0.1); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; }
  .g2 .cta { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #6B4F3A; }
  .g2 .logo-mark { font-family: 'Forum', serif; font-size: 9px; color: #A09B99; letter-spacing: 0.08em; }

  .g2b { width: 340px; height: 340px; background: #F5F0E8; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 24px; position: relative; border: 1px solid rgba(107,79,58,0.1); }
  .g2b .circle-wrap { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; background: rgba(163,186,158,0.2); margin-bottom: 16px; flex-shrink: 0; position: relative; }
  .g2b .person-name { font-family: 'Forum', serif; font-size: 22px; color: #6B4F3A; text-align: center; margin-bottom: 5px; }
  .g2b .person-title { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 400; letter-spacing: 0.08em; color: #A09B99; text-align: center; margin-bottom: 12px; }
  .g2b .rule { width: 28px; height: 1px; background: #A3BA9E; margin: 0 auto 12px; }
  .g2b .person-quote { font-family: 'Forum', serif; font-size: 13px; line-height: 1.5; text-align: center; color: #6B4F3A; opacity: 0.8; }
  .g2b .bottom-brand { position: absolute; bottom: 16px; font-family: 'Forum', serif; font-size: 9px; color: #A09B99; letter-spacing: 0.06em; }

  .g3 { width: 340px; height: 340px; background: #A3BA9E; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 44px 40px; position: relative; }
  .g3::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 1px solid rgba(245,240,232,0.25); pointer-events: none; }
  .g3 .rule { width: 28px; height: 1px; background: rgba(245,240,232,0.5); margin: 0 auto 18px; }
  .g3 .quote { font-family: 'Forum', serif; font-size: 20px; line-height: 1.45; text-align: center; color: #F5F0E8; margin-bottom: 20px; }
  .g3 .attribution { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(245,240,232,0.7); text-align: center; }
  .g3 .logo-mark { position: absolute; bottom: 20px; right: 22px; font-family: 'Forum', serif; font-size: 9px; color: rgba(245,240,232,0.5); letter-spacing: 0.08em; }

  .g4 { width: 340px; height: 340px; background: #F5F0E8; padding: 32px 28px; position: relative; display: flex; flex-direction: column; justify-content: center; outline: 1.5px solid rgba(107,79,58,0.18); outline-offset: -10px; }
  .g4::before { content: ''; position: absolute; top: 6px; left: 6px; right: 6px; bottom: 6px; border: 1px solid rgba(107,79,58,0.13); pointer-events: none; }
  .g4 .accent-line { width: 3px; height: 40px; background: #D4A5A0; margin-bottom: 20px; }
  .g4 .headline { font-family: 'Forum', serif; font-size: 22px; line-height: 1.2; color: #6B4F3A; margin-bottom: 20px; }
  .g4 .list-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .g4 .num { font-family: 'Forum', serif; font-size: 13px; color: #D4A5A0; min-width: 16px; line-height: 1.5; }
  .g4 .item-text { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 300; line-height: 1.5; color: #6B4F3A; opacity: 0.85; }
  .g4 .logo-mark { position: absolute; bottom: 22px; right: 24px; font-family: 'Forum', serif; font-size: 9px; color: #A09B99; letter-spacing: 0.08em; }

  .s1 { width: 200px; height: 356px; background: #6B4F3A; position: relative; overflow: hidden; }
  .s1 .logo-mark { position: absolute; top: 14px; left: 16px; font-family: 'Forum', serif; font-size: 9px; color: rgba(245,240,232,0.65); letter-spacing: 0.08em; }
  .s1 .bottom-panel { position: absolute; bottom: 0; left: 0; right: 0; height: 42%; background: #F5F0E8; padding: 18px 18px 22px; display: flex; flex-direction: column; justify-content: space-between; }
  .s1 .eyebrow { font-family: 'DM Sans', sans-serif; font-size: 7px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #A3BA9E; }
  .s1 .headline { font-family: 'Forum', serif; font-size: 22px; line-height: 1.1; color: #6B4F3A; }
  .s1 .subtext { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 300; letter-spacing: 0.06em; color: #A09B99; }

  .s2 { width: 200px; height: 356px; background: #6B4F3A; position: relative; overflow: hidden; }
  .s2 .overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(107,79,58,0.75) 0%, transparent 50%); }
  .s2 .logo-mark { position: absolute; top: 16px; right: 16px; font-family: 'Forum', serif; font-size: 9px; color: rgba(245,240,232,0.55); letter-spacing: 0.08em; }
  .s2 .content { position: absolute; bottom: 30px; left: 20px; right: 20px; }
  .s2 .eyebrow { font-family: 'DM Sans', sans-serif; font-size: 7px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(245,240,232,0.65); margin-bottom: 5px; }
  .s2 .headline { font-family: 'Forum', serif; font-size: 26px; line-height: 1.1; color: #F5F0E8; margin-bottom: 12px; }
  .s2 .cta-pill { display: inline-block; background: #A3BA9E; color: #F5F0E8; font-family: 'DM Sans', sans-serif; font-size: 7px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; }

  .s3 { width: 200px; height: 356px; background: #D4A5A0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; position: relative; }
  .s3::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 1px solid rgba(245,240,232,0.3); pointer-events: none; }
  .s3 .ornament { font-family: 'Forum', serif; font-size: 56px; line-height: 0.8; color: rgba(245,240,232,0.3); margin-bottom: 6px; }
  .s3 .quote { font-family: 'Forum', serif; font-size: 17px; line-height: 1.5; text-align: center; color: #F5F0E8; margin-bottom: 18px; }
  .s3 .rule { width: 22px; height: 1px; background: rgba(245,240,232,0.5); margin: 0 auto 12px; }
  .s3 .attribution { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,240,232,0.75); text-align: center; }
  .s3 .logo-mark { position: absolute; bottom: 18px; font-family: 'Forum', serif; font-size: 9px; color: rgba(245,240,232,0.5); letter-spacing: 0.08em; }

  .s4 { width: 200px; height: 356px; background: #F5F0E8; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  .s4 .photo-wrap { width: 100%; height: 52%; overflow: hidden; position: relative; }
  .s4 .content { flex: 1; padding: 14px 16px 16px; display: flex; flex-direction: column; justify-content: space-between; }
  .s4 .tag { display: inline-block; background: rgba(163,186,158,0.25); color: #A3BA9E; font-family: 'DM Sans', sans-serif; font-size: 7px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 8px; border-radius: 10px; margin-bottom: 8px; width: fit-content; }
  .s4 .hotel-name { font-family: 'Forum', serif; font-size: 19px; line-height: 1.15; color: #6B4F3A; margin-bottom: 4px; }
  .s4 .location { font-family: 'DM Sans', sans-serif; font-size: 8px; letter-spacing: 0.08em; color: #A09B99; margin-bottom: 6px; }
  .s4 .description { font-family: 'DM Sans', sans-serif; font-size: 8px; font-weight: 300; line-height: 1.65; color: #6B4F3A; opacity: 0.75; }
  .s4 .bottom { border-top: 1px solid rgba(107,79,58,0.1); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; }
  .s4 .cta { font-family: 'DM Sans', sans-serif; font-size: 7px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #6B4F3A; }
  .s4 .logo-mark { font-family: 'Forum', serif; font-size: 8px; color: #A09B99; letter-spacing: 0.06em; }
`;

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

  const { html, designW, designH, exportW, exportH } = payload;
  if (!html || !designW || !designH || !exportW || !exportH) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const deviceScaleFactor = exportW / designW;

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Forum&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap" rel="stylesheet">
<style>
body { width: ${designW}px; height: ${designH}px; overflow: hidden; margin: 0; padding: 0; }
${BRAND_CSS}
</style>
</head>
<body>${html}</body>
</html>`;

  let browser;
  try {
    const launchOptions = chromiumPkg
      ? {
          args: chromiumPkg.args,
          executablePath: await chromiumPkg.executablePath(),
          headless: chromiumPkg.headless,
        }
      : { args: ['--no-sandbox', '--disable-setuid-sandbox'] };

    browser = await (playwrightLib.chromium || playwrightLib).launch(launchOptions);
    const context = await browser.newContext({
      viewport: { width: designW, height: designH },
      deviceScaleFactor
    });
    const page = await context.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle' });
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

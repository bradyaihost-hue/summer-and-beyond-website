/**
 * Summer & Beyond — Form Submission Handler
 * Vercel Serverless Function (Node.js 20.x)
 *
 * Required environment variables (set in Vercel dashboard):
 *   AGENTMAIL_API_KEY   — AgentMail API key (from ~/.openclaw/secrets/agentmail.env)
 *   OPENCLAW_HOOKS_TOKEN — OpenClaw webhook token (from ~/.openclaw/secrets/hooks.env)
 */

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_INBOX = 'lennyclaw@agentmail.to';

/**
 * Parse application/x-www-form-urlencoded body from a Vercel request.
 * Vercel does NOT auto-parse bodies for serverless functions.
 */
async function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const data = {};
      for (const [key, value] of params.entries()) {
        if (key in data) {
          // Handle multi-value fields (e.g. style checkboxes)
          if (!Array.isArray(data[key])) {
            data[key] = [data[key]];
          }
          data[key].push(value);
        } else {
          data[key] = value;
        }
      }
      // Normalize style to always be an array
      if (data.style && !Array.isArray(data.style)) {
        data.style = [data.style];
      }
      if (!data.style) {
        data.style = [];
      }
      resolve(data);
    });
    req.on('error', reject);
  });
}

/**
 * Calculate number of nights between two date strings (YYYY-MM-DD).
 */
function calcNights(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return null;
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const nights = Math.round((to - from) / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : null;
}

/**
 * Format a date string (YYYY-MM-DD) to a readable format.
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Build the HTML intake email body.
 */
function buildIntakeEmailHtml({ name, email, home_city, destination, date_from, date_to, who, style, budget, notes }) {
  const nights = calcNights(date_from, date_to);
  const nightsStr = nights ? `${nights} night${nights !== 1 ? 's' : ''}` : '—';
  const styleStr = style && style.length > 0 ? style.join(', ') : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Trip Inquiry</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F0E8; font-family:'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F0E8; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#A3BA9E; border-radius:8px 8px 0 0; padding:36px 48px; text-align:center;">
              <p style="margin:0 0 6px 0; font-size:11px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:rgba(245,240,232,0.75);">Summer &amp; Beyond Travel</p>
              <h1 style="margin:0; font-size:32px; font-weight:400; color:#F5F0E8; line-height:1.2;">New Trip Inquiry</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff; padding:40px 48px;">

              <!-- Client Details -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:28px;">
                    <h2 style="margin:0 0 16px 0; font-size:13px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#A3BA9E; border-bottom:1px solid #e8e0d4; padding-bottom:8px;">Client Details</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0; width:140px; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Name</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${name || '—'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Email</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;"><a href="mailto:${email}" style="color:#6B4F3A; text-decoration:none;">${email || '—'}</a></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Departing From</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${home_city || '—'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Trip Details -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <h2 style="margin:0 0 16px 0; font-size:13px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#A3BA9E; border-bottom:1px solid #e8e0d4; padding-bottom:8px;">Trip Details</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0; width:140px; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Destination</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${destination || '—'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Travel Dates</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${formatDate(date_from)} → ${formatDate(date_to)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Length of Stay</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${nightsStr}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Travelers</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${who || '—'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Preferences -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <h2 style="margin:0 0 16px 0; font-size:13px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#A3BA9E; border-bottom:1px solid #e8e0d4; padding-bottom:8px;">Preferences</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0; width:140px; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Trip Style</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${styleStr}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13px; color:#A09B99; font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">Budget Style</td>
                        <td style="padding:6px 0; font-size:15px; color:#6B4F3A; font-weight:400;">${budget || '—'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Notes -->
                ${notes ? `
                <tr>
                  <td style="padding-bottom:28px;">
                    <h2 style="margin:0 0 16px 0; font-size:13px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#A3BA9E; border-bottom:1px solid #e8e0d4; padding-bottom:8px;">Notes from Client</h2>
                    <p style="margin:0; font-size:15px; line-height:1.7; color:#6B4F3A; font-weight:300; font-style:italic;">"${notes}"</p>
                  </td>
                </tr>
                ` : ''}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F0E8; border:1px solid #e8e0d4; border-radius:0 0 8px 8px; padding:28px 48px; text-align:center;">
              <p style="margin:0; font-size:13px; color:#A09B99; line-height:1.6;">AI itinerary draft will follow in a separate email shortly.</p>
              <p style="margin:8px 0 0; font-size:12px; color:#c4bab4;">Summer &amp; Beyond Travel · summerandbeyondtravel.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let formData;
  try {
    formData = await parseFormBody(req);
  } catch (err) {
    console.error('Failed to parse form body:', err);
    return res.status(400).json({ error: 'Failed to parse form data' });
  }

  const { name, email, home_city, destination, date_from, date_to, who, style, budget, notes } = formData;

  // ── 1. Send intake email to Hallie via AgentMail ──────────────────────────
  try {
    const emailHtml = buildIntakeEmailHtml({ name, email, home_city, destination, date_from, date_to, who, style, budget, notes });
    const subject = `New Inquiry — ${name || 'Unknown'} → ${destination || 'Unknown Destination'}`;

    const emailRes = await fetch(`https://api.agentmail.to/v0/inboxes/${AGENTMAIL_INBOX}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: ['hallie@summerandbeyondtravel.com'],
        cc: ['brady.lenahan@cloudzero.com'],
        subject,
        html: emailHtml
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('AgentMail error:', emailRes.status, errText);
      // Don't fail the whole request — still redirect
    } else {
      console.log('Intake email sent successfully for:', name);
    }
  } catch (err) {
    console.error('Failed to send intake email:', err);
    // Don't fail — still redirect
  }

  // ── 2. Trigger itinerary generation via OpenClaw webhook (fire and forget) ──
  // NOTE: This will fail from Vercel's servers (127.0.0.1 is local only).
  // That's expected. Kept here for when a tunneled/external endpoint is available.
  fetch('http://127.0.0.1:18789/hooks/trigger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENCLAW_HOOKS_TOKEN}`
    },
    body: JSON.stringify({
      event: 'summer_beyond_inquiry',
      data: { name, email, home_city, destination, date_from, date_to, travelers: who, style, budget_style: budget, notes }
    })
  }).catch(() => {}); // fire and forget — expected to fail from Vercel

  // ── 3. Redirect to thank you state ────────────────────────────────────────
  return res.redirect(303, '/?submitted=true');
}

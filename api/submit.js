/**
 * Summer & Beyond — Form Submission Handler
 * Vercel Serverless Function (Node.js 20.x)
 *
 * Required environment variables (set in Vercel dashboard):
 *   RESEND_API_KEY    — Resend API key for sending from hallie@summerandbeyondtravel.com
 *   AGENTMAIL_API_KEY — AgentMail API key for triggering AI itinerary generation
 *
 * Email flow:
 *   1. Resend  → hallie@summerandbeyondtravel.com (intake notification, CC brady)
 *   2. AgentMail → lennyclaw@agentmail.to (structured trigger for Becky itinerary pipeline)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;

const FROM_ADDRESS = 'Hallie at Summer & Beyond <hallie@summerandbeyondtravel.com>';
const HALLIE_EMAIL = 'hallie@summerandbeyondtravel.com';
const BRADY_EMAIL = 'brady.lenahan@cloudzero.com';
const AGENTMAIL_INBOX = 'lennyclaw@agentmail.to';

// ─── Body Parser ────────────────────────────────────────────────────────────

async function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const data = {};
      for (const [key, value] of params.entries()) {
        if (key in data) {
          if (!Array.isArray(data[key])) data[key] = [data[key]];
          data[key].push(value);
        } else {
          data[key] = value;
        }
      }
      // Normalize style checkboxes to array
      if (data.style && !Array.isArray(data.style)) data.style = [data.style];
      if (!data.style) data.style = [];
      resolve(data);
    });
    req.on('error', reject);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function calcNights(from, to) {
  if (!from || !to) return null;
  const n = Math.round((new Date(to) - new Date(from)) / 86400000);
  return n > 0 ? n : null;
}

// ─── Intake Email HTML ────────────────────────────────────────────────────────

function buildIntakeHtml({ name, email, home_city, destination, date_from, date_to, who, style, budget, notes }) {
  const nights = calcNights(date_from, date_to);
  const nightsStr = nights ? `${nights} night${nights !== 1 ? 's' : ''}` : '—';
  const styleStr = style?.length ? style.join(', ') : '—';

  const row = (label, value) => `
    <tr>
      <td style="padding:7px 0;width:150px;font-size:12px;color:#A09B99;font-weight:500;text-transform:uppercase;letter-spacing:0.1em;vertical-align:top;">${label}</td>
      <td style="padding:7px 0;font-size:15px;color:#6B4F3A;font-weight:400;">${value || '—'}</td>
    </tr>`;

  const section = (title, rows) => `
    <tr><td colspan="2" style="padding:28px 0 0;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#A3BA9E;border-bottom:1px solid #e8e0d4;padding-bottom:8px;">${title}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0E8;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <tr><td style="background:#A3BA9E;border-radius:8px 8px 0 0;padding:36px 48px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,240,232,0.75);">Summer &amp; Beyond Travel</p>
        <h1 style="margin:0;font-size:30px;font-weight:400;color:#F5F0E8;line-height:1.2;">New Trip Inquiry</h1>
      </td></tr>

      <tr><td style="background:#fff;padding:40px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${section('Client', row('Name', name) + row('Email', `<a href="mailto:${email}" style="color:#6B4F3A;">${email}</a>`) + row('Departing From', home_city))}
          ${section('Trip', row('Destination', destination) + row('Dates', `${formatDate(date_from)} → ${formatDate(date_to)}`) + row('Nights', nightsStr) + row('Travelers', who))}
          ${section('Preferences', row('Trip Style', styleStr) + row('Budget Style', budget))}
          ${notes ? section('Notes', `<tr><td colspan="2" style="padding:4px 0;font-size:15px;color:#6B4F3A;font-style:italic;line-height:1.7;">"${notes}"</td></tr>`) : ''}
        </table>
      </td></tr>

      <tr><td style="background:#F5F0E8;border:1px solid #e8e0d4;border-radius:0 0 8px 8px;padding:24px 48px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#A09B99;line-height:1.6;">An AI itinerary draft will follow in a separate email shortly.</p>
        <p style="margin:6px 0 0;font-size:12px;color:#c4bab4;">Summer &amp; Beyond Travel · summerandbeyondtravel.com</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── Send intake email via Resend ─────────────────────────────────────────────

async function sendIntakeEmail(formData) {
  const { name, destination } = formData;
  const subject = `New Inquiry — ${name || 'Unknown'} → ${destination || 'Unknown Destination'}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [HALLIE_EMAIL],
      // cc removed per Hallie request
      subject,
      html: buildIntakeHtml(formData),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log('Intake email sent via Resend, id:', data.id);
  return data;
}

// ─── Trigger itinerary generation via AgentMail → LennyClaw ──────────────────
// Sends a structured email to lennyclaw@agentmail.to that LennyClaw picks up
// on heartbeat and routes to Becky for the two-pass AI itinerary pipeline.

async function triggerItineraryGeneration(formData) {
  const { name, destination } = formData;
  const subject = `SUMMER_BEYOND_INQUIRY: ${name || 'Unknown'} → ${destination || 'Unknown'}`;

  const text = [
    'ACTION: generate_itinerary',
    '',
    'INTAKE:',
    JSON.stringify(formData, null, 2),
  ].join('\n');

  const res = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(AGENTMAIL_INBOX)}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [AGENTMAIL_INBOX],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AgentMail trigger error ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log('Itinerary trigger sent via AgentMail, id:', data.id || data.message_id);
  return data;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let formData;
  try {
    formData = await parseFormBody(req);
  } catch (err) {
    console.error('Body parse error:', err);
    return res.status(400).json({ error: 'Failed to parse form data' });
  }

  console.log('New inquiry from:', formData.name, '→', formData.destination);

  // ── 1. Send intake notification to Hallie via Resend ──────────────────────
  try {
    await sendIntakeEmail(formData);
  } catch (err) {
    // Log but don't block — redirect client regardless
    console.error('Resend intake email failed:', err.message);
  }

  // ── 2. Trigger AI itinerary pipeline via AgentMail ────────────────────────
  try {
    await triggerItineraryGeneration(formData);
  } catch (err) {
    console.error('AgentMail itinerary trigger failed:', err.message);
  }

  // ── 3. Redirect to thank-you state ────────────────────────────────────────
  return res.redirect(303, '/?submitted=true');
};

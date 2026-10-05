// netlify/functions/contact.js
// Sends the contact form to you (with reply-to set to the sender) and a short
// acknowledgement back to them. Uses the same RESEND_API_KEY / FROM_EMAIL / OWNER_EMAIL
// environment variables as rsvp.js.
//
// Spam defenses (no third-party service needed):
//   - Honeypot: a hidden "website" field real visitors never see; bots fill it.
//   - Timing: the page sends when it loaded (startedAt); instant or missing
//     timestamps are rejected, which also blocks bots that POST straight here.
//   - Content checks: link-stuffed messages and URLs in name fields are dropped.
//   - All user input is HTML-escaped before it goes into an email.

const MIN_FILL_MS = 3000;
const { renderEmail } = require('./lib/email-template');
const { logLead } = require('./lib/lead-log');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
const countLinks = (s) => (String(s ?? '').match(/https?:\/\/|www\./gi) || []).length;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { firstName, lastName, email, phone, topic, message, consent, website, startedAt } = data;

  // Honeypot filled in: pretend it worked so the bot doesn't adapt, but send nothing.
  if (website) return json(200, { ok: true });

  // A name and at least one way to reach the person (the call-back form on the
  // landing page asks for a phone number and treats email as optional).
  if (!firstName || (!email && !phone)) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  // Permission to contact is required; keep a record of when it was given.
  const consented = consent === 'yes' || consent === true;
  if (!consented) {
    return { statusCode: 400, body: 'Permission to contact is required' };
  }
  const consentRecord = `Permission to contact: YES (checkbox, wording ptc-v1) at ${new Date().toISOString()}`;

  if (
    (email && (!EMAIL_RE.test(email) || String(email).length > 254)) ||
    (phone && String(phone).replace(/\D/g, '').length < 7) ||
    String(firstName).length > 80 || String(lastName ?? '').length > 80 ||
    String(phone ?? '').length > 40 || String(topic ?? '').length > 120 ||
    String(message ?? '').length > 4000
  ) {
    return { statusCode: 400, body: 'Invalid input' };
  }

  const elapsed = Date.now() - Number(startedAt);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS || elapsed > MAX_AGE_MS) {
    return { statusCode: 400, body: 'Please reload the page and try again' };
  }

  // Link-stuffed messages and links in name/topic fields are almost always spam.
  if (countLinks(message) >= 2 || countLinks(`${firstName} ${lastName ?? ''} ${topic}`) > 0) {
    return json(200, { ok: true });
  }

  const safe = {
    firstName: escapeHtml(firstName),
    lastName: escapeHtml(lastName || ''),
    email: escapeHtml(email || 'n/a'),
    phone: escapeHtml(phone || 'n/a'),
    topic: escapeHtml(topic || 'n/a'),
    message: escapeHtml(message || '').replace(/\n/g, '<br>')
  };

  // Save a minimal record for the CRM to pull in. Open-ended messages are not
  // stored there; only the call-back form's fixed "best time" choice is.
  const isCallback = /^call-back/i.test(String(topic ?? ''));
  const bestTime = (String(message ?? '').match(/^Best time to call: (Anytime|Morning|Afternoon|Evening)$/) || [])[1];
  await logLead({
    source: isCallback ? 'callback' : 'contact',
    firstName, lastName, phone, email,
    detail: isCallback ? (bestTime ? `Best time to call: ${bestTime}` : '') : topic,
    consentRecord
  });

  const { RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL } = process.env;

  try {
    const ownerRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        ...(email ? { reply_to: email } : {}),
        subject: `Website contact: ${oneLine(firstName)} ${oneLine(lastName)} — ${oneLine(topic) || 'General'}`.replace('  ', ' '),
        html: `
          <p><strong>${safe.firstName} ${safe.lastName}</strong> sent a message via the website.</p>
          <ul>
            <li>Email: ${safe.email}</li>
            <li>Phone: ${safe.phone}</li>
            <li>Topic: ${safe.topic}</li>
            <li>${consentRecord}</li>
          </ul>
          <p>${safe.message}</p>
        `
      })
    });
    if (!ownerRes.ok) {
      console.error('Resend owner email failed:', ownerRes.status, await ownerRes.text());
      return { statusCode: 502, body: 'Email send failed' };
    }

    const replyRes = !email ? { ok: true } : await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Thanks for reaching out, ${oneLine(firstName)}`,
        html: renderEmail({
          preheader: "Thanks for reaching out. I'll get back to you personally, usually within a day.",
          heading: `Thanks for reaching out, ${oneLine(firstName)}`,
          bodyHtml: `
            <p style="margin:0 0 14px;">I received your message and I'll get back to you personally, usually within a day.</p>
            <p style="margin:0 0 14px;">If it's urgent, call me directly at <a href="tel:9492596744" style="color:#17324A;font-weight:bold;">949-259-6744</a>. If you'd rather pick a time that works for you, you can book a no-cost consultation below.</p>
          `
        })
      })
    });
    if (!replyRes.ok) {
      // The important email (to Chris) already succeeded — log this one but
      // don't fail the whole request over the visitor's nice-to-have auto-reply.
      console.error('Resend auto-reply failed:', replyRes.status, await replyRes.text());
    }
  } catch (err) {
    console.error('Resend contact error:', err);
    return { statusCode: 502, body: 'Email send failed' };
  }

  return json(200, { ok: true });
};

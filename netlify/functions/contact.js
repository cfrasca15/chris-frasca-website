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

  const { firstName, lastName, email, phone, topic, message, website, startedAt } = data;

  // Honeypot filled in: pretend it worked so the bot doesn't adapt, but send nothing.
  if (website) return json(200, { ok: true });

  if (!firstName || !lastName || !email) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  if (
    !EMAIL_RE.test(email) || email.length > 254 ||
    String(firstName).length > 80 || String(lastName).length > 80 ||
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
  if (countLinks(message) >= 2 || countLinks(`${firstName} ${lastName} ${topic}`) > 0) {
    return json(200, { ok: true });
  }

  const safe = {
    firstName: escapeHtml(firstName),
    lastName: escapeHtml(lastName),
    email: escapeHtml(email),
    phone: escapeHtml(phone || 'n/a'),
    topic: escapeHtml(topic || 'n/a'),
    message: escapeHtml(message || '').replace(/\n/g, '<br>')
  };

  const { RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL } = process.env;

  try {
    const ownerRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        reply_to: email,
        subject: `Website contact: ${oneLine(firstName)} ${oneLine(lastName)} — ${oneLine(topic) || 'General'}`,
        html: `
          <p><strong>${safe.firstName} ${safe.lastName}</strong> sent a message via the website.</p>
          <ul>
            <li>Email: ${safe.email}</li>
            <li>Phone: ${safe.phone}</li>
            <li>Topic: ${safe.topic}</li>
          </ul>
          <p>${safe.message}</p>
        `
      })
    });
    if (!ownerRes.ok) {
      console.error('Resend owner email failed:', ownerRes.status, await ownerRes.text());
      return { statusCode: 502, body: 'Email send failed' };
    }

    const replyRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Thanks for reaching out, ${oneLine(firstName)}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#22282E;">
            <p>Hi ${safe.firstName},</p>
            <p>Thanks for your message — I'll get back to you personally, usually within a day. If it's urgent, call me directly at 949-259-6744.</p>
            <p>Chris Frasca<br>Chris Frasca Insurance Services</p>
          </div>
        `
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

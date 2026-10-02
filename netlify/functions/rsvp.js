// netlify/functions/rsvp.js
//
// Handles RSVP form submissions:
//   1. Saves the RSVP as a row in your Airtable base (so you have a list you can see/sort)
//   2. Sends an instant confirmation email to the attendee via Resend
//   3. Sends a notification email to you so you know someone RSVP'd
//
// Requires these environment variables to be set in Netlify (Site settings > Environment variables):
//   AIRTABLE_API_KEY      - your Airtable personal access token
//   AIRTABLE_BASE_ID      - the base ID (starts with "app...")
//   AIRTABLE_TABLE_NAME   - e.g. "RSVPs"
//   RESEND_API_KEY        - your Resend API key
//   FROM_EMAIL             - the "from" address, e.g. "Chris Frasca <chris@chrisfrascainsurance.com>"
//   OWNER_EMAIL            - where new-RSVP notifications go, e.g. "chris@chrisfrascainsurance.com"
//
// Spam defenses match contact.js: hidden honeypot field, form-load timestamp,
// link/length/email validation, and HTML-escaping of everything put in an email.

const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_ID_RE = /^[a-z0-9-]{1,80}$/i;

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
const countLinks = (s) => (String(s ?? '').match(/https?:\/\/|www\./gi) || []).length;
const tooLong = (value, max) => String(value ?? '').length > max;

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

  const {
    firstName, lastName, email, phone, guests, notes,
    eventId, eventTitle, eventDate, eventTime, eventLocation, eventAddress,
    website, startedAt
  } = data;

  // Honeypot filled in: pretend it worked so the bot doesn't adapt, but do nothing.
  if (website) return json(200, { ok: true });

  if (!firstName || !lastName || !email || !eventId) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  if (
    !EMAIL_RE.test(email) || tooLong(email, 254) ||
    !EVENT_ID_RE.test(String(eventId)) ||
    tooLong(firstName, 80) || tooLong(lastName, 80) || tooLong(phone, 40) ||
    tooLong(guests, 10) || tooLong(notes, 2000) ||
    tooLong(eventTitle, 200) || tooLong(eventDate, 20) || tooLong(eventTime, 60) ||
    tooLong(eventLocation, 200) || tooLong(eventAddress, 300)
  ) {
    return { statusCode: 400, body: 'Invalid input' };
  }

  const elapsed = Date.now() - Number(startedAt);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS || elapsed > MAX_AGE_MS) {
    return { statusCode: 400, body: 'Please reload the page and try again' };
  }

  // Links in short fields, or several in the notes, are almost always spam.
  const shortFields = `${firstName} ${lastName} ${phone} ${eventTitle} ${eventLocation} ${eventAddress}`;
  if (countLinks(shortFields) > 0 || countLinks(notes) >= 2) {
    return json(200, { ok: true });
  }

  const safe = {
    firstName: escapeHtml(firstName),
    lastName: escapeHtml(lastName),
    email: escapeHtml(email),
    phone: escapeHtml(phone || 'n/a'),
    guests: escapeHtml(guests || '1'),
    notes: escapeHtml(notes || 'none'),
    eventTitle: escapeHtml(eventTitle || eventId),
    eventDate: escapeHtml(eventDate),
    eventTime: escapeHtml(eventTime),
    eventLocation: escapeHtml(eventLocation),
    eventAddress: escapeHtml(eventAddress)
  };

  const {
    AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME,
    RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL
  } = process.env;

  // 1. Save to Airtable
  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'First Name': firstName,
          'Last Name': lastName,
          'Email': email,
          'Phone': phone || '',
          'Guests': guests || '1',
          'Notes': notes || '',
          'Event ID': eventId,
          'Event Title': eventTitle || eventId,
          'Event Date': eventDate || '',
          'Event Time': eventTime || '',
          'Event Location': eventLocation || '',
          'RSVP Date': new Date().toISOString(),
          'Reminder Sent': false
        }
      })
    });
    if (!airtableRes.ok) {
      console.error('Airtable error:', airtableRes.status, await airtableRes.text());
    }
  } catch (err) {
    console.error('Airtable error:', err);
    // Continue anyway — don't block the confirmation email on a storage hiccup
  }

  // 2. Send confirmation email to attendee
  try {
    const confirmRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `You're confirmed: ${oneLine(eventTitle || eventId)}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#22282E;">
            <h2 style="color:#17324A;">You're all set, ${safe.firstName}!</h2>
            <p>You're confirmed for:</p>
            <p style="background:#F7F5F0;padding:16px;border-left:3px solid #A8763A;">
              <strong>${safe.eventTitle}</strong><br>
              ${safe.eventDate} &middot; ${safe.eventTime}<br>
              ${safe.eventLocation}${eventAddress ? '<br>' + safe.eventAddress : ''}
            </p>
            <p>I'll send you a reminder a few days before the event. If your plans change, just reply to this email or call me at 949-259-6744.</p>
            <p>Looking forward to seeing you,<br><strong>Chris Frasca</strong><br>Chris Frasca Insurance Services</p>
          </div>
        `
      })
    });
    if (!confirmRes.ok) {
      console.error('Resend confirmation error:', confirmRes.status, await confirmRes.text());
    }
  } catch (err) {
    console.error('Resend confirmation error:', err);
  }

  // 3. Notify the owner
  try {
    const ownerRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `New RSVP: ${oneLine(eventTitle || eventId)} — ${oneLine(firstName)} ${oneLine(lastName)}`,
        html: `
          <p><strong>${safe.firstName} ${safe.lastName}</strong> RSVP'd for <strong>${safe.eventTitle}</strong> (${safe.eventDate}).</p>
          <ul>
            <li>Email: ${safe.email}</li>
            <li>Phone: ${safe.phone}</li>
            <li>Guests: ${safe.guests}</li>
            <li>Notes: ${safe.notes}</li>
          </ul>
        `
      })
    });
    if (!ownerRes.ok) {
      console.error('Resend owner notification error:', ownerRes.status, await ownerRes.text());
    }
  } catch (err) {
    console.error('Resend owner notification error:', err);
  }

  return json(200, { ok: true });
};

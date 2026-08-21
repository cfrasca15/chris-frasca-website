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
    eventId, eventTitle, eventDate, eventTime, eventLocation, eventAddress
  } = data;

  if (!firstName || !lastName || !email || !eventId) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const {
    AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME,
    RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL
  } = process.env;

  // 1. Save to Airtable
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
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
  } catch (err) {
    console.error('Airtable error:', err);
    // Continue anyway — don't block the confirmation email on a storage hiccup
  }

  // 2. Send confirmation email to attendee
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `You're confirmed: ${eventTitle}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#22282E;">
            <h2 style="color:#16273D;">You're all set, ${firstName}!</h2>
            <p>You're confirmed for:</p>
            <p style="background:#F7F5F0;padding:16px;border-left:3px solid #B8863C;">
              <strong>${eventTitle}</strong><br>
              ${eventDate} &middot; ${eventTime}<br>
              ${eventLocation}${eventAddress ? '<br>' + eventAddress : ''}
            </p>
            <p>I'll send you a reminder a few days before the event. If your plans change, just reply to this email or call me at 949-259-6744.</p>
            <p>Looking forward to seeing you,<br><strong>Chris Frasca</strong><br>Chris Frasca Insurance Services</p>
          </div>
        `
      })
    });
  } catch (err) {
    console.error('Resend confirmation error:', err);
  }

  // 3. Notify the owner
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `New RSVP: ${eventTitle} — ${firstName} ${lastName}`,
        html: `
          <p><strong>${firstName} ${lastName}</strong> RSVP'd for <strong>${eventTitle}</strong> (${eventDate}).</p>
          <ul>
            <li>Email: ${email}</li>
            <li>Phone: ${phone || 'n/a'}</li>
            <li>Guests: ${guests || '1'}</li>
            <li>Notes: ${notes || 'none'}</li>
          </ul>
        `
      })
    });
  } catch (err) {
    console.error('Resend owner notification error:', err);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};

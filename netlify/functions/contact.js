// netlify/functions/contact.js
// Sends the contact form to you (with reply-to set to the sender) and a short
// acknowledgement back to them. Uses the same RESEND_API_KEY / FROM_EMAIL / OWNER_EMAIL
// environment variables as rsvp.js.

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

  const { firstName, lastName, email, phone, topic, message } = data;
  if (!firstName || !lastName || !email) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const { RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL } = process.env;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        reply_to: email,
        subject: `Website contact: ${firstName} ${lastName} — ${topic || 'General'}`,
        html: `
          <p><strong>${firstName} ${lastName}</strong> sent a message via the website.</p>
          <ul>
            <li>Email: ${email}</li>
            <li>Phone: ${phone || 'n/a'}</li>
            <li>Topic: ${topic || 'n/a'}</li>
          </ul>
          <p>${(message || '').replace(/\n/g, '<br>')}</p>
        `
      })
    });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Thanks for reaching out, ${firstName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#22282E;">
            <p>Hi ${firstName},</p>
            <p>Thanks for your message — I'll get back to you personally, usually within a day. If it's urgent, call me directly at 949-259-6744.</p>
            <p>Chris Frasca<br>Chris Frasca Insurance Services</p>
          </div>
        `
      })
    });
  } catch (err) {
    console.error('Resend contact error:', err);
    return { statusCode: 502, body: 'Email send failed' };
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};

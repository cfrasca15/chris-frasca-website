// netlify/functions/send-reminders.js
//
// Runs automatically once a day (schedule set in netlify.toml).
// Finds every RSVP in Airtable for an event happening REMINDER_DAYS_BEFORE
// days from now that hasn't been reminded yet, emails them, then marks it sent.
//
// Uses the same AIRTABLE_* and RESEND_* environment variables as rsvp.js.

const REMINDER_DAYS_BEFORE = 3;

exports.handler = async () => {
  const {
    AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME,
    RESEND_API_KEY, FROM_EMAIL
  } = process.env;

  const target = new Date();
  target.setDate(target.getDate() + REMINDER_DAYS_BEFORE);
  const targetDateStr = target.toISOString().slice(0, 10); // YYYY-MM-DD

  const formula = encodeURIComponent(
    `AND(IS_SAME({Event Date}, "${targetDateStr}", "day"), {Reminder Sent} = FALSE())`
  );

  const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?filterByFormula=${formula}`;

  let records = [];
  try {
    const res = await fetch(airtableUrl, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
    });
    const json = await res.json();
    records = json.records || [];
  } catch (err) {
    console.error('Airtable fetch error:', err);
    return { statusCode: 500, body: 'Airtable fetch failed' };
  }

  for (const record of records) {
    const f = record.fields;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: f['Email'],
          subject: `Reminder: ${f['Event Title']} is coming up`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#22282E;">
              <h2 style="color:#16273D;">See you soon, ${f['First Name']}!</h2>
              <p>Just a reminder about your upcoming event:</p>
              <p style="background:#F7F5F0;padding:16px;border-left:3px solid #B8863C;">
                <strong>${f['Event Title']}</strong><br>
                ${f['Event Date']} &middot; ${f['Event Time']}<br>
                ${f['Event Location']}
              </p>
              <p>Can't make it anymore? Just reply to this email or call 949-259-6744 to let me know.</p>
              <p>See you there,<br><strong>Chris Frasca</strong></p>
            </div>
          `
        })
      });

      // Mark as reminded so it's never sent twice
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${record.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: { 'Reminder Sent': true } })
      });
    } catch (err) {
      console.error(`Reminder failed for record ${record.id}:`, err);
    }
  }

  return { statusCode: 200, body: `Processed ${records.length} reminder(s) for ${targetDateStr}` };
};

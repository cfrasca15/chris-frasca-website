// netlify/functions/send-reminders.js
//
// Runs automatically once a day (schedule set in netlify.toml).
// Finds every RSVP in Airtable for an event happening REMINDER_DAYS_BEFORE
// days from now that hasn't been reminded yet, emails them, then marks it sent.
//
// Uses the same AIRTABLE_* and RESEND_* environment variables as rsvp.js.

const REMINDER_DAYS_BEFORE = 3;
const { renderEmail, eventCard } = require('./lib/email-template');

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

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
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: f['Email'],
          subject: `Reminder: ${oneLine(f['Event Title'])} is coming up`,
          html: renderEmail({
            preheader: `A reminder about ${oneLine(f['Event Title'])}.`,
            heading: `See you soon, ${oneLine(f['First Name'])}!`,
            bodyHtml: `
              <p style="margin:0 0 4px;">Just a reminder about your upcoming event:</p>
              ${eventCard({ title: f['Event Title'], date: f['Event Date'], time: f['Event Time'], location: f['Event Location'] })}
              <p style="margin:0 0 14px;">Can't make it anymore? Just reply to this email or call <a href="tel:9492596744" style="color:#17324A;font-weight:bold;">949-259-6744</a> to let me know.</p>
              <p style="margin:0 0 14px;">See you there!</p>
            `
          })
        })
      });

      if (!emailRes.ok) {
        console.error(`Reminder email failed for record ${record.id}:`, emailRes.status, await emailRes.text());
        continue; // Don't mark as sent — let tomorrow's run retry it
      }

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

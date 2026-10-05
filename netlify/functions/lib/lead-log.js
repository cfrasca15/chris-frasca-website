// netlify/functions/lib/lead-log.js
//
// Saves a minimal record of each website lead to a dedicated Airtable base so
// the CRM can pull it in (the CRM reaches out; nothing is pushed into it).
//
// Privacy choices:
//   - Only contact basics and the consent record are stored. Open-ended
//     messages and notes are NOT stored here (they only go in the email).
//   - The CRM deletes each row after importing it, so leads don't pile up in
//     Airtable.
//   - This uses its own Airtable base and token, separate from the RSVP and
//     reviews base.
//
// Environment variables (Netlify > Site settings > Environment variables):
//   WEBSITE_LEADS_AIRTABLE_TOKEN     token with access to ONLY the leads base
//   WEBSITE_LEADS_BASE_ID   the leads base ID (starts with "app...")
//   WEBSITE_LEADS_TABLE     table name, defaults to "WebsiteLeads"
//
// If the variables are missing, or Airtable fails, this logs and returns false.
// It never throws, so a lead is never lost because of the log.

const CLEAN = (s, max) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

async function logLead({ source, firstName, lastName, phone, email, detail, consentRecord }) {
  const { WEBSITE_LEADS_AIRTABLE_TOKEN, WEBSITE_LEADS_BASE_ID, WEBSITE_LEADS_TABLE } = process.env;
  if (!WEBSITE_LEADS_AIRTABLE_TOKEN || !WEBSITE_LEADS_BASE_ID) return false;

  const table = WEBSITE_LEADS_TABLE || 'WebsiteLeads';
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${WEBSITE_LEADS_BASE_ID}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WEBSITE_LEADS_AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          typecast: true,
          fields: {
            'Submitted At': new Date().toISOString(),
            'Source': CLEAN(source, 40),
            'First Name': CLEAN(firstName, 80),
            'Last Name': CLEAN(lastName, 80),
            'Phone': CLEAN(phone, 40),
            'Email': CLEAN(email, 254),
            'Detail': CLEAN(detail, 300),
            'Consent': CLEAN(consentRecord, 200)
          }
        })
      }
    );
    if (!res.ok) {
      console.error('Lead log failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lead log error:', err);
    return false;
  }
}

module.exports = { logLead };

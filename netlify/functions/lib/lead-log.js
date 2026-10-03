// netlify/functions/lib/lead-log.js
//
// Saves a minimal record of each website lead to a dedicated Airtable base so
// the CRM can pull it in (the CRM reaches out; nothing is pushed into it).
//
// Privacy choices:
//   - Only contact basics and the consent record are stored. Free-text
//     messages and notes are NOT stored here (they only go in the email).
//   - The CRM deletes each row after importing it, so leads don't pile up in
//     Airtable.
//   - This uses its own Airtable base and token, separate from the RSVP and
//     reviews base.
//
// Environment variables (Netlify > Site settings > Environment variables):
//   LEADS_AIRTABLE_TOKEN     token with access to ONLY the leads base
//   LEADS_AIRTABLE_BASE_ID   the leads base ID (starts with "app...")
//   LEADS_AIRTABLE_TABLE     table name, defaults to "Leads"
//
// If the variables are missing, or Airtable fails, this logs and returns false.
// It never throws, so a lead is never lost because of the log.

const CLEAN = (s, max) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

async function logLead({ source, firstName, lastName, phone, email, detail, consentRecord }) {
  const { LEADS_AIRTABLE_TOKEN, LEADS_AIRTABLE_BASE_ID, LEADS_AIRTABLE_TABLE } = process.env;
  if (!LEADS_AIRTABLE_TOKEN || !LEADS_AIRTABLE_BASE_ID) return false;

  const table = LEADS_AIRTABLE_TABLE || 'Leads';
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${LEADS_AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LEADS_AIRTABLE_TOKEN}`,
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

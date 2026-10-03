// netlify/functions/lib/email-template.js
//
// One branded layout shared by every email sent to a visitor (contact
// auto-reply, RSVP confirmation, event reminder). Edit the signature or the
// disclaimer here and all three update.
//
// Email clients are picky, so this uses tables and inline styles only.
// Everything passed in as text is HTML-escaped here; pass raw values.

const SITE = 'https://chrisfrascainsurance.com';
const ENROLL_URL = 'https://planenroll.com/?purl=Christopher-Frasca';

const COLORS = {
  navy: '#17324A',
  brass: '#9A6B30',
  brassLight: '#A8763A',
  paper: '#F7F5F0',
  text: '#22282E',
  muted: '#5C6670',
  line: '#DDD7CB'
};

const FONT = "Arial, Helvetica, sans-serif";

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// "2026-10-07" -> "Wednesday, October 7, 2026". Anything that isn't a plain
// ISO date is returned unchanged so we never show "Invalid Date".
function formatDate(value) {
  const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value ?? '');
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
}

function button(href, label, { filled = true } = {}) {
  const bg = filled ? COLORS.brass : '#FFFFFF';
  const fg = filled ? '#FFFFFF' : COLORS.navy;
  const border = filled ? COLORS.brass : COLORS.navy;
  return `
    <a href="${href}" style="display:inline-block;background:${bg};color:${fg};border:2px solid ${border};
       font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;
       padding:11px 20px;border-radius:6px;margin:0 10px 10px 0;">${escapeHtml(label)}</a>`;
}

// Boxed summary of an event (RSVP confirmation and reminder).
function eventCard({ title, date, time, location, address }) {
  const lines = [
    `<strong style="font-size:17px;color:${COLORS.navy};">${escapeHtml(title)}</strong>`,
    [formatDate(date), time].filter(Boolean).map(escapeHtml).join(' &middot; '),
    escapeHtml(location),
    escapeHtml(address)
  ].filter(Boolean);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:20px 0;background:${COLORS.paper};border-left:4px solid ${COLORS.brassLight};">
      <tr><td style="padding:16px 20px;font-family:${FONT};font-size:15px;line-height:1.7;color:${COLORS.text};">
        ${lines.join('<br>')}
      </td></tr>
    </table>`;
}

const signature = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin-top:28px;border-top:1px solid ${COLORS.line};">
    <tr><td style="padding-top:24px;font-family:${FONT};font-size:15px;color:${COLORS.text};">Best regards,</td></tr>
    <tr><td style="padding-top:18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="sig-cell" valign="middle" style="padding-right:16px;">
            <img src="${SITE}/images/chris-headshot-square.jpg" width="96" height="96" alt="Chris Frasca"
                 style="display:block;width:96px;height:96px;border-radius:14px;object-fit:cover;border:0;">
          </td>
          <td class="sig-cell sig-name" valign="middle" style="padding-right:16px;border-right:1px solid ${COLORS.line};">
            <div style="font-family:${FONT};font-size:20px;font-weight:bold;color:${COLORS.navy};line-height:1.3;">Christopher Frasca</div>
            <div style="font-family:${FONT};font-size:14px;color:${COLORS.muted};margin-top:4px;">Independent Agent</div>
            <div style="font-family:${FONT};font-size:14px;color:${COLORS.muted};margin-top:2px;">Lic. #: 0L86243</div>
          </td>
          <td class="sig-cell sig-contact" valign="middle" style="padding-left:16px;font-family:${FONT};font-size:13px;line-height:1.9;color:${COLORS.navy};">
            Office: <a href="tel:9492596744" style="color:${COLORS.navy};text-decoration:none;">949-259-6744</a><br>
            Cell: <a href="tel:8054155558" style="color:${COLORS.navy};text-decoration:none;">805-415-5558</a><br>
            Email: <a href="mailto:chris@chrisfrascainsurance.com" style="color:${COLORS.navy};text-decoration:none;">chris@chrisfrascainsurance.com</a><br>
            Web: <a href="${SITE}" style="color:${COLORS.navy};text-decoration:none;">ChrisFrascaInsurance.com</a>
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding-top:20px;">
      ${button(`${SITE}/bookings.html`, 'Book an Appointment')}
      ${button(ENROLL_URL, 'Shop Medicare Plans', { filled: false })}
    </td></tr>
  </table>`;

const disclaimer = `
  <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.muted};">
    We do not offer every plan available in your area. Currently we represent 10 organizations which offer 62 products in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Program (SHIP) to get information on all of your options.
  </p>
  <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLORS.muted};">
    Medicare has neither reviewed nor endorsed this information. Not connected with or endorsed by the United States government or the federal Medicare program. Online enrollment is provided through PlanEnroll, a non-government website operated by Integrity Marketing Group, LLC. California Insurance License No. 0L86243.
  </p>`;

// Wraps the message body in the branded layout, with the signature and
// disclaimer. `preheader` is the grey preview text shown in the inbox list.
function renderEmail({ preheader = '', heading, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
<style>
  @media only screen and (max-width: 480px) {
    .sig-cell { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; border: 0 !important; }
    .sig-photo-wrap { padding-bottom: 12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.paper};">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.paper};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:620px;background:#FFFFFF;border:1px solid ${COLORS.line};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${COLORS.navy};padding:20px 28px;border-bottom:4px solid ${COLORS.brassLight};">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#FFFFFF;">Chris Frasca</div>
          <div style="font-family:${FONT};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#D9AE6A;margin-top:2px;">Insurance Services</div>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;font-family:${FONT};font-size:16px;line-height:1.65;color:${COLORS.text};">
          <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${COLORS.navy};">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          ${signature}
        </td></tr>
        <tr><td style="padding:20px 28px 28px;border-top:1px solid ${COLORS.line};">
          ${disclaimer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { renderEmail, eventCard, formatDate, escapeHtml };

# Chris Frasca Insurance Services — Website + Event RSVP System

This is a plain HTML/CSS/JS website (no build step, no framework) plus three small
serverless functions that handle RSVPs, contact form messages, and automatic
reminder emails. Everything runs on Netlify's free/low-cost tier on your own domain.

---

## 1. What you're getting

- **4 pages**: Home, Medicare Help, Turning 65 Events (with RSVP), Contact
- **RSVP system**: attendees fill out a form → get an instant confirmation email →
  get an automatic reminder email a few days before the event
- **Contact form**: sends you an email, sends the person a short auto-reply
- **You edit events yourself** in one file (`js/events-data.js`) — no code changes
  needed elsewhere

You do **not** need to touch the `netlify/functions` folder unless you want to
change how emails are worded.

---

## 2. One-time setup (about 30–45 minutes)

### A. Create free accounts
1. **Netlify** — [netlify.com](https://netlify.com) (hosting + functions + your domain). Free tier is plenty to start.
2. **Airtable** — [airtable.com](https://airtable.com) (stores your RSVP list like a spreadsheet you can view/sort/export). Free tier is fine.
3. **Resend** — [resend.com](https://resend.com) (sends the actual emails). Free tier covers 3,000 emails/month, which is far more than you'll need.

### B. Set up Airtable
1. Create a new Base called **"Website"**.
2. Rename the default table to **RSVPs**.
3. Create these exact columns (field names matter — they're referenced in the code):

   | Field name      | Type              |
   |------------------|-------------------|
   | First Name       | Single line text  |
   | Last Name        | Single line text  |
   | Email            | Email             |
   | Phone            | Phone number      |
   | Guests           | Single line text  |
   | Notes            | Long text         |
   | Event ID         | Single line text  |
   | Event Title      | Single line text  |
   | Event Date       | Single line text  |
   | Event Time       | Single line text  |
   | Event Location   | Single line text  |
   | RSVP Date        | Single line text  |
   | Reminder Sent    | Checkbox          |

4. Get your credentials:
   - **Base ID**: open the base, click "Help" → "API documentation" — the Base ID starts with `app...`.
   - **API key**: go to [airtable.com/create/tokens](https://airtable.com/create/tokens), create a personal access token with `data.records:read` and `data.records:write` scopes for this base.

### C. Set up Resend (sending emails from your own domain)
1. Add your domain (`chrisfrascainsurance.com`) in Resend and follow their instructions
   to add a few DNS records (SPF/DKIM) at your domain registrar — this is what lets
   emails send *from* `chris@chrisfrascainsurance.com` and land in inboxes instead of spam.
2. Get your **API key** from the Resend dashboard.

### D. Deploy the site to Netlify
1. Easiest path: drag the whole project folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
   (Better long-term path once you're comfortable: push this folder to a GitHub repo and
   connect that repo in Netlify — then every edit you push auto-deploys.)
2. In Netlify: **Site settings → Domain management** → add your custom domain
   `chrisfrascainsurance.com` and follow the DNS instructions (usually just changing
   your domain's nameservers or adding a couple of records at your registrar).
3. In Netlify: **Site settings → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `AIRTABLE_API_KEY` | your Airtable token |
   | `AIRTABLE_BASE_ID` | your Airtable base ID |
   | `AIRTABLE_TABLE_NAME` | `RSVPs` |
   | `RESEND_API_KEY` | your Resend API key |
   | `FROM_EMAIL` | `Chris Frasca <chris@chrisfrascainsurance.com>` |
   | `OWNER_EMAIL` | `chris@chrisfrascainsurance.com` |

4. Redeploy the site (Netlify does this automatically after saving env vars, or trigger
   "Deploy site" manually).

That's it — RSVPs, confirmations, and reminders are now fully automatic.

---

## 3. Adding a new event (the only thing you'll do regularly)

Open `js/events-data.js` and copy/paste a new block inside the `EVENTS` list:

```js
{
  id: "laguna-oct-2026",
  title: "Free Medicare Workshop",
  date: "2026-10-05",
  time: "10:00 AM – 11:00 AM",
  location: "Laguna Niguel Library",
  address: "30341 Crown Valley Pkwy, Laguna Niguel, CA 92677",
  description: "A short description of what people will learn.",
  spots: "Limited to 30 seats"
}
```

- `id` must be unique and have no spaces — it's used in the RSVP link.
- Save the file and re-upload/redeploy (or just push to GitHub if you've connected that).
- The event automatically appears as a card on the Events page **and** as a choice in
  the RSVP dropdown — nothing else to update.

**Direct RSVP link for Facebook**: once an event is live, you can link straight to its
RSVP form (pre-selected) with:

```
https://chrisfrascainsurance.com/events.html?event=laguna-oct-2026
```

Use that exact link in your Facebook Event's "Website" field or in the event post —
clicking it opens your events page with that event already selected in the RSVP form.

---

## 4. How the pieces fit together

```
Visitor fills out RSVP form on events.html
        │
        ▼
netlify/functions/rsvp.js  (serverless function)
        │
        ├──▶ Airtable  (saves the RSVP so you have a list)
        ├──▶ Resend  →  confirmation email to the attendee
        └──▶ Resend  →  notification email to you

Every day, automatically:
netlify/functions/send-reminders.js
        │
        ├──▶ Airtable  (finds RSVPs for events happening in 3 days)
        └──▶ Resend  →  reminder email to each attendee
```

Want reminders sent a different number of days before the event? Change
`REMINDER_DAYS_BEFORE` at the top of `netlify/functions/send-reminders.js`.

---

## 5. Marketing events on Facebook

1. Create the event in `js/events-data.js` and deploy first.
2. Create a matching Facebook Event, and paste the direct RSVP link (see above) into
   the Facebook Event's website field and into your post text.
3. People can RSVP "Going" on Facebook *and* still fill out your site's form — the
   site form is what actually captures their email/phone and triggers the automated
   confirmation + reminder, so always point people to it as "reserve your seat here."

---

## 6. A note on compliance

Medicare marketing has specific CMS rules (required disclaimers, no misleading claims,
etc.). The disclaimer language already on the site (in the footer) mirrors what was on
your old site — keep it on every page, and if you add new marketing copy or a new
event flyer, it's worth a quick check against current CMS Medicare Communications and
Marketing Guidelines before publishing.

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
- **Hosting registration somewhere else** (e.g. an event platform run by a venue or
  partner)? Add `registerUrl: "https://..."` to the event. Its button then links there
  instead of using this site's RSVP form, and it stays out of the dropdown. If the link
  isn't ready yet, add `registrationOpensSoon: true` instead, and swap it for
  `registerUrl` later. When no events use the on-site form, the RSVP section hides itself.

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

## 6. Showing real Google reviews on the homepage

The homepage's review carousel can pull your actual Google reviews automatically
instead of the placeholder quotes. A scheduled function checks Google once a day and
caches the results in Airtable; the page reads that cache. (Google's API only ever
returns your 5 most relevant reviews, chosen by Google — there's no way to show all
of them or pick which ones.)

### A. Find your Google Place ID
1. Go to Google's [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id).
2. Search for "Chris Frasca Insurance Services" and copy the Place ID (starts with `ChIJ...`).

### B. Get a Google Places API key
1. In the [Google Cloud Console](https://console.cloud.google.com/), create a project (or use an existing one).
2. Enable the **Places API (New)**.
3. Create an API key under **APIs & Services → Credentials**. For safety, restrict it to the Places API only.
4. Google's free monthly credit comfortably covers one API call a day.

### C. Add a second Airtable table
1. In the same **Website** base you already created, add a new table called **GoogleReviews**.
2. Create these columns:

   | Field name    | Type              |
   |---------------|-------------------|
   | Review ID     | Single line text  |
   | Author Name   | Single line text  |
   | Rating        | Number            |
   | Review Text   | Long text         |
   | Publish Time  | Single line text  |

### D. Add the new environment variables in Netlify
   | Key | Value |
   |---|---|
   | `GOOGLE_PLACES_API_KEY` | your Google API key from step B |
   | `GOOGLE_PLACE_ID` | your Place ID from step A |
   | `AIRTABLE_REVIEWS_TABLE_NAME` | `GoogleReviews` |

   (Reuses the `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` you already have.)

### E. Run a sync
The reviews refresh automatically every day, but you can also force an update any
time (e.g. right after a great new review comes in) by opening this in your browser:
`https://chrisfrascainsurance.com/.netlify/functions/refresh-reviews`

It'll show a message like `Cached 5 review(s)`. (Note: the daily scheduled function
itself, `fetch-google-reviews`, can't be triggered manually this way — Netlify only
allows scheduled functions to run on their cron schedule, which is exactly why this
separate on-demand endpoint exists.)

After running it, refresh the homepage — the carousel should show your real reviews. If
nothing shows, it silently falls back to the placeholder quotes already in
`index.html`, so the page never breaks even if a key is missing or Google's API is
briefly down.

---

## 7. A note on compliance

Medicare marketing has specific CMS rules (required disclaimers, no misleading claims,
etc.). The disclaimer language already on the site (in the footer) mirrors what was on
your old site — keep it on every page, and if you add new marketing copy or a new
event flyer, it's worth a quick check against current CMS Medicare Communications and
Marketing Guidelines before publishing.

// netlify/functions/fetch-google-reviews.js
//
// Runs automatically once a day (schedule set in netlify.toml).
// Pulls your latest Google reviews via the Places API and caches them in
// Airtable, so the website's review carousel can show real reviews without
// calling Google (or exposing a Google API key) from the browser.
//
// Google's Places API only ever returns up to 5 reviews per business, chosen
// by Google's own "most relevant" ranking — there's no way to fetch all of
// them or pick which 5 show up.
//
// Requires these environment variables to be set in Netlify:
//   GOOGLE_PLACES_API_KEY   - a Google Cloud API key with the Places API (New) enabled
//   GOOGLE_PLACE_ID         - your business's Google Place ID (looks like "ChIJ...")
//   AIRTABLE_API_KEY        - same token used by rsvp.js
//   AIRTABLE_BASE_ID        - same base used by rsvp.js
//   AIRTABLE_REVIEWS_TABLE_NAME - e.g. "GoogleReviews" (a separate table from RSVPs)
//
// To force a sync right away instead of waiting for the daily schedule, use
// refresh-reviews.js — Netlify doesn't allow scheduled functions to be
// triggered manually via their URL.

const { syncGoogleReviews } = require('./lib/sync-google-reviews');

exports.handler = async () => {
  const result = await syncGoogleReviews();
  return { statusCode: result.ok ? 200 : 500, body: result.message };
};

// netlify/functions/lib/sync-google-reviews.js
//
// Shared logic used by both fetch-google-reviews.js (the daily scheduled
// job) and refresh-reviews.js (an on-demand endpoint for forcing a sync
// right away, since Netlify only allows scheduled functions to run on
// their cron schedule — they can't be triggered manually via their URL).
//
// 1. Preferred: ALL reviews from the Google Business Profile API.
// 2. If that fails (for example the sign-in expired), email the owner and keep
//    the last good copy; if there is no usable copy, fall back to the 5
//    reviews the Places API returns.
// Reviews are cached in Netlify Blobs (see reviews-store.js).

const { readReviews, writeReviews, isFresh } = require('./reviews-store');
const { fetchAllReviews } = require('./gbp-reviews');

function describeError(error) {
  if (typeof error === 'string') return error;
  return error.message || error.type || JSON.stringify(error);
}

async function emailOwner(subject, text) {
  const { RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL } = process.env;
  if (!RESEND_API_KEY || !FROM_EMAIL || !OWNER_EMAIL) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: OWNER_EMAIL, subject, text })
    });
  } catch (err) {
    console.error('Alert email failed:', err);
  }
}

async function syncFromPlaces() {
  const { GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID } = process.env;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}`,
    { headers: { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'reviews' } }
  );
  const json = await res.json();
  if (json.error) throw new Error(`Places API error: ${describeError(json.error)}`);
  return (json.reviews || []).map(r => ({
    id: r.name,
    author: r.authorAttribution?.displayName || 'Google user',
    rating: r.rating || 5,
    text: r.text?.text || r.originalText?.text || '',
    publishTime: r.publishTime || ''
  }));
}

async function syncGoogleReviews() {
  // 1. Business Profile API: every review
  try {
    const { reviews, averageRating, totalReviewCount } = await fetchAllReviews();
    if (reviews.length > 0) {
      await writeReviews(reviews, { source: 'business-profile', averageRating, totalReviewCount });
      return { ok: true, message: `Cached ${reviews.length} review(s) from the Business Profile API` };
    }
    console.error('Business Profile API returned no reviews');
  } catch (err) {
    console.error('Business Profile sync failed:', err);
    const needsSignIn = err.code === 'TOKEN';
    await emailOwner(
      needsSignIn ? 'Website reviews: Google sign-in needs renewing' : 'Website reviews: sync problem',
      (needsSignIn
        ? 'The Google sign-in used by the website review sync has expired. Re-run the OAuth Playground steps to get a new refresh token and update GBP_REFRESH_TOKEN in Netlify.\n\n'
        : 'The daily review sync hit a problem.\n\n') + describeError(err)
    );
  }

  // 2. Keep the last good copy if it is still recent
  try {
    const existing = await readReviews();
    if (isFresh(existing) && existing.reviews.length > 0) {
      return { ok: false, message: 'Business Profile sync failed; kept the existing cache' };
    }
  } catch (err) {
    console.error('Reading existing cache failed:', err);
  }

  // 3. Last resort: the 5 reviews from the Places API
  try {
    const reviews = await syncFromPlaces();
    if (reviews.length === 0) return { ok: false, message: 'No reviews available from Google' };
    await writeReviews(reviews, { source: 'places' });
    return { ok: true, message: `Cached ${reviews.length} review(s) from the Places API (fallback)` };
  } catch (err) {
    console.error('Places fallback failed:', err);
    return { ok: false, message: `Review sync failed: ${describeError(err)}` };
  }
}

module.exports = { syncGoogleReviews };

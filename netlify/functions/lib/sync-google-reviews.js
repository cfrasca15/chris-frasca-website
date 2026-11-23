// netlify/functions/lib/sync-google-reviews.js
//
// Shared logic used by both fetch-google-reviews.js (the daily scheduled
// job) and refresh-reviews.js (an on-demand endpoint for forcing a sync
// right away, since Netlify only allows scheduled functions to run on
// their cron schedule — they can't be triggered manually via their URL).
//
// Reviews are cached in Netlify Blobs (see reviews-store.js). If Google
// returns an error or no reviews, the last good copy is left untouched so the
// website never ends up with an empty carousel.

const { writeReviews } = require('./reviews-store');

function describeError(error) {
  if (typeof error === 'string') return error;
  return error.message || error.type || JSON.stringify(error);
}

async function syncGoogleReviews() {
  const { GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID } = process.env;

  let reviews = [];
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}`,
      {
        headers: {
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'reviews'
        }
      }
    );
    const json = await res.json();
    if (json.error) {
      console.error('Places API error:', json.error);
      return { ok: false, message: `Places API error: ${describeError(json.error)}` };
    }
    reviews = json.reviews || [];
  } catch (err) {
    console.error('Places API fetch failed:', err);
    return { ok: false, message: 'Places API fetch failed' };
  }

  if (reviews.length === 0) {
    return { ok: true, message: 'Google returned no reviews; kept the existing cache' };
  }

  const cleaned = reviews.map(r => ({
    id: r.name,
    author: r.authorAttribution?.displayName || 'Google user',
    rating: r.rating || 5,
    text: r.text?.text || r.originalText?.text || '',
    publishTime: r.publishTime || ''
  }));

  try {
    await writeReviews(cleaned);
  } catch (err) {
    console.error('Blobs write failed:', err);
    return { ok: false, message: `Saving reviews failed: ${describeError(err)}` };
  }

  return { ok: true, message: `Cached ${cleaned.length} review(s)` };
}

module.exports = { syncGoogleReviews };

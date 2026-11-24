// netlify/functions/refresh-reviews.js
//
// On-demand version of fetch-google-reviews.js. Visit this URL any time you
// want to force an immediate sync of your Google reviews (e.g. right after
// a great new one comes in) instead of waiting for the daily schedule:
//
//   https://chrisfrascainsurance.com/.netlify/functions/refresh-reviews
//
// The URL is public, so it ignores repeat requests made within 10 minutes of
// the last successful sync (protects the Google quota and your inbox).

const { syncGoogleReviews } = require('./lib/sync-google-reviews');
const { connect, readReviews } = require('./lib/reviews-store');

const MIN_GAP_MS = 10 * 60 * 1000;

exports.handler = async (event) => {
  connect(event);
  try {
    const data = await readReviews();
    if (data.source === 'business-profile' && data.updatedAt &&
        Date.now() - new Date(data.updatedAt).getTime() < MIN_GAP_MS) {
      return { statusCode: 200, body: 'Synced less than 10 minutes ago; try again later' };
    }
  } catch (err) {
    console.error('Reading cache failed:', err);
  }
  const result = await syncGoogleReviews();
  return { statusCode: result.ok ? 200 : 500, body: result.message };
};

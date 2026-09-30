// netlify/functions/refresh-reviews.js
//
// On-demand version of fetch-google-reviews.js. Visit this URL any time you
// want to force an immediate sync of your Google reviews (e.g. right after
// a great new one comes in) instead of waiting for the daily schedule:
//
//   https://chrisfrascainsurance.com/.netlify/functions/refresh-reviews

const { syncGoogleReviews } = require('./lib/sync-google-reviews');

exports.handler = async () => {
  const result = await syncGoogleReviews();
  return { statusCode: result.ok ? 200 : 500, body: result.message };
};

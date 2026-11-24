// netlify/functions/get-reviews.js
//
// Returns the Google reviews cached in Netlify Blobs by fetch-google-reviews.js,
// as plain JSON, so the review carousel on the website can display real
// reviews without ever exposing a Google API key to the browser.
//
// Shows the newest reviews that have written text (a carousel of every review
// would be too long). A cache older than Google's 30-day storage limit is not
// served; the page then keeps the placeholder reviews already in its HTML.

const { connect, readReviews, isFresh } = require('./lib/reviews-store');

const MAX_SHOWN = 20;

exports.handler = async (event) => {
  connect(event);
  const headers = { 'Content-Type': 'application/json' };
  try {
    const data = await readReviews();
    if (!isFresh(data)) {
      return { statusCode: 200, headers, body: JSON.stringify({ reviews: [] }) };
    }
    const reviews = (data.reviews || [])
      .filter(r => r.text && r.text.trim())
      .sort((a, b) => String(b.publishTime || '').localeCompare(String(a.publishTime || '')))
      .slice(0, MAX_SHOWN)
      .map(r => ({ author: r.author, rating: r.rating, text: r.text }));

    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({
        reviews,
        averageRating: data.averageRating ?? null,
        totalReviewCount: data.totalReviewCount ?? null
      })
    };
  } catch (err) {
    console.error('get-reviews error:', err);
    return { statusCode: 200, headers, body: JSON.stringify({ reviews: [] }) };
  }
};

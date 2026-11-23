// netlify/functions/get-reviews.js
//
// Returns the Google reviews cached in Netlify Blobs by fetch-google-reviews.js,
// as plain JSON, so the review carousel on the website can display real
// reviews without ever exposing a Google API key to the browser.

const { connect, readReviews } = require('./lib/reviews-store');

exports.handler = async (event) => {
  connect(event);
  try {
    const data = await readReviews();
    const reviews = (data.reviews || [])
      .slice()
      .sort((a, b) => String(b.publishTime || '').localeCompare(String(a.publishTime || '')))
      .map(r => ({ author: r.author, rating: r.rating, text: r.text }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify({ reviews })
    };
  } catch (err) {
    console.error('get-reviews error:', err);
    // Empty list: the page keeps the placeholder reviews already in its HTML.
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviews: [] }) };
  }
};

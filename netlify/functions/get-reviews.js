// netlify/functions/get-reviews.js
//
// Returns the Google reviews cached in Airtable by fetch-google-reviews.js,
// as plain JSON, so the review carousel on the website can display real
// reviews without ever exposing an Airtable or Google API key to the browser.
//
// Requires the same AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_REVIEWS_TABLE_NAME
// environment variables as fetch-google-reviews.js.

exports.handler = async () => {
  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_REVIEWS_TABLE_NAME } = process.env;

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_REVIEWS_TABLE_NAME)}?sort[0][field]=Publish Time&sort[0][direction]=desc`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } }
    );
    const json = await res.json();
    const reviews = (json.records || []).map(rec => ({
      author: rec.fields['Author Name'],
      rating: rec.fields['Rating'],
      text: rec.fields['Review Text']
    }));

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
    return { statusCode: 500, body: JSON.stringify({ reviews: [] }) };
  }
};

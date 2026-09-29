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

exports.handler = async () => {
  const {
    GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID,
    AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_REVIEWS_TABLE_NAME
  } = process.env;

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
      return { statusCode: 502, body: 'Places API error' };
    }
    reviews = json.reviews || [];
  } catch (err) {
    console.error('Places API fetch failed:', err);
    return { statusCode: 502, body: 'Places API fetch failed' };
  }

  const tableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_REVIEWS_TABLE_NAME)}`;
  const airtableHeaders = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const freshIds = reviews.map(r => r.name);

  // Remove any cached reviews that are no longer in Google's top 5
  try {
    const existingRes = await fetch(tableUrl, { headers: airtableHeaders });
    const existingJson = await existingRes.json();
    const staleRecordIds = (existingJson.records || [])
      .filter(rec => !freshIds.includes(rec.fields['Review ID']))
      .map(rec => rec.id);

    for (let i = 0; i < staleRecordIds.length; i += 10) {
      const batch = staleRecordIds.slice(i, i + 10);
      const query = batch.map(id => `records[]=${id}`).join('&');
      await fetch(`${tableUrl}?${query}`, { method: 'DELETE', headers: airtableHeaders });
    }
  } catch (err) {
    console.error('Airtable cleanup failed:', err);
  }

  // Upsert the current top reviews
  if (reviews.length > 0) {
    try {
      await fetch(tableUrl, {
        method: 'PATCH',
        headers: airtableHeaders,
        body: JSON.stringify({
          performUpsert: { fieldsToMergeOn: ['Review ID'] },
          records: reviews.map(r => ({
            fields: {
              'Review ID': r.name,
              'Author Name': r.authorAttribution?.displayName || 'Google user',
              'Rating': r.rating || 5,
              'Review Text': r.text?.text || r.originalText?.text || '',
              'Publish Time': r.publishTime || ''
            }
          }))
        })
      });
    } catch (err) {
      console.error('Airtable upsert failed:', err);
      return { statusCode: 500, body: 'Airtable upsert failed' };
    }
  }

  return { statusCode: 200, body: `Cached ${reviews.length} review(s)` };
};

// netlify/functions/lib/sync-google-reviews.js
//
// Shared logic used by both fetch-google-reviews.js (the daily scheduled
// job) and refresh-reviews.js (an on-demand endpoint for forcing a sync
// right away, since Netlify only allows scheduled functions to run on
// their cron schedule — they can't be triggered manually via their URL).

async function syncGoogleReviews() {
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
      return { ok: false, message: `Places API error: ${json.error.message}` };
    }
    reviews = json.reviews || [];
  } catch (err) {
    console.error('Places API fetch failed:', err);
    return { ok: false, message: 'Places API fetch failed' };
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
    if (existingJson.error) {
      console.error('Airtable read error:', existingJson.error);
      return { ok: false, message: `Airtable read error: ${existingJson.error.message}` };
    }
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
      const upsertRes = await fetch(tableUrl, {
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
      const upsertJson = await upsertRes.json();
      if (upsertJson.error) {
        console.error('Airtable upsert error:', upsertJson.error);
        return { ok: false, message: `Airtable upsert error: ${upsertJson.error.message}` };
      }
    } catch (err) {
      console.error('Airtable upsert failed:', err);
      return { ok: false, message: 'Airtable upsert failed' };
    }
  }

  return { ok: true, message: `Cached ${reviews.length} review(s)` };
}

module.exports = { syncGoogleReviews };

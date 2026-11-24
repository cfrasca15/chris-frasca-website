// netlify/functions/lib/reviews-store.js
//
// Where the cached Google reviews live. They are kept in Netlify Blobs (built
// into Netlify, no separate account and no API-call limit) instead of Airtable.
//
// Stored as one JSON document:
//   { reviews: [...], updatedAt, source, averageRating, totalReviewCount }
//
// Google's Business Profile API terms allow keeping review data for at most 30
// days, so get-reviews stops serving a copy older than that.

const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'google-reviews';
const KEY = 'latest';
const MAX_AGE_MS = 29 * 24 * 60 * 60 * 1000;

// Call once at the top of each handler so Blobs can find this site.
function connect(event) {
  try {
    if (event && event.blobs) connectLambda(event);
  } catch (err) {
    console.error('Blobs connect failed:', err);
  }
}

function store() {
  return getStore(STORE_NAME);
}

async function readReviews() {
  const data = await store().get(KEY, { type: 'json' });
  return data || { reviews: [], updatedAt: null };
}

async function writeReviews(reviews, meta = {}) {
  await store().setJSON(KEY, { ...meta, reviews, updatedAt: new Date().toISOString() });
}

function isFresh(data) {
  return !!(data && data.updatedAt && Date.now() - new Date(data.updatedAt).getTime() < MAX_AGE_MS);
}

module.exports = { connect, readReviews, writeReviews, isFresh };

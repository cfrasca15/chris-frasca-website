// netlify/functions/lib/reviews-store.js
//
// Where the cached Google reviews live. They are kept in Netlify Blobs (built
// into Netlify, no separate account and no API-call limit) instead of Airtable.
//
// Stored as one JSON document: { reviews: [...], updatedAt: "ISO date" }.

const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'google-reviews';
const KEY = 'latest';

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

async function writeReviews(reviews) {
  await store().setJSON(KEY, { reviews, updatedAt: new Date().toISOString() });
}

module.exports = { connect, readReviews, writeReviews };

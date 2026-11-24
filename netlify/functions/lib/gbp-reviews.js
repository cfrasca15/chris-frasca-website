// netlify/functions/lib/gbp-reviews.js
//
// Reads ALL reviews of your own Google Business Profile through the Google
// Business Profile API (the Places API only ever returns 5).
//
// Environment variables (Netlify > Site configuration > Environment variables):
//   GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN
//   GBP_LOCATION_ID   optional: numeric location id, only needed if the Google
//                     account manages more than one business profile
//
// While the Google OAuth app is in "Testing" status the refresh token expires
// after about 7 days. When that happens this throws an error with
// code 'TOKEN' so the caller can email you to sign in again.

const STAR = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

class GbpError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function getAccessToken() {
  const { GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN } = process.env;
  if (!GBP_CLIENT_ID || !GBP_CLIENT_SECRET || !GBP_REFRESH_TOKEN) {
    throw new GbpError('Google Business Profile credentials are not set', 'CONFIG');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GBP_CLIENT_ID,
      client_secret: GBP_CLIENT_SECRET,
      refresh_token: GBP_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new GbpError(`Google sign-in failed: ${json.error_description || json.error || res.status}`, 'TOKEN');
  }
  return json.access_token;
}

async function api(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error?.message || res.status;
    throw new GbpError(`Google API error (${url.split('?')[0]}): ${msg}`, 'API');
  }
  return json;
}

async function findLocation(token) {
  const accounts = (await api('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', token)).accounts || [];
  const wanted = process.env.GBP_LOCATION_ID;
  const found = [];
  for (const account of accounts) {
    const json = await api(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title&pageSize=100`,
      token
    ).catch(() => ({}));
    for (const loc of json.locations || []) found.push({ account: account.name, location: loc.name, title: loc.title || '' });
  }
  if (found.length === 0) throw new GbpError('No business locations found for this Google account', 'API');
  const match = (wanted && found.find(f => f.location.endsWith('/' + wanted)))
    || found.find(f => /frasca/i.test(f.title))
    || found[0];
  return match;
}

async function fetchAllReviews() {
  const token = await getAccessToken();
  const { account, location } = await findLocation(token);
  const reviews = [];
  let averageRating = null;
  let totalReviewCount = null;
  let pageToken = '';
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' });
    if (pageToken) qs.set('pageToken', pageToken);
    const json = await api(`https://mybusiness.googleapis.com/v4/${account}/${location}/reviews?${qs}`, token);
    if (json.averageRating != null) averageRating = json.averageRating;
    if (json.totalReviewCount != null) totalReviewCount = json.totalReviewCount;
    for (const r of json.reviews || []) {
      reviews.push({
        id: r.reviewId || r.name,
        author: r.reviewer?.isAnonymous ? 'A Google user' : (r.reviewer?.displayName || 'A Google user'),
        rating: STAR[r.starRating] || 5,
        text: r.comment || '',
        publishTime: r.createTime || r.updateTime || ''
      });
    }
    pageToken = json.nextPageToken || '';
    if (!pageToken) break;
  }
  return { reviews, averageRating, totalReviewCount };
}

module.exports = { fetchAllReviews, GbpError };

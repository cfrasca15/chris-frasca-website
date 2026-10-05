// Tells Bing (and other IndexNow search engines) which pages changed, right after a deploy.
// Bing's index also feeds several AI assistants, so this speeds up how fast changes show up.
//
// Usage, AFTER the site has deployed:
//     node scripts/indexnow.js            (submits every page listed in sitemap.xml)
//     node scripts/indexnow.js /about.html /events.html   (submits only these paths)
//
// The key file (<key>.txt in the site root) proves you own the site; the same key is saved in
// scripts/indexnow-key.txt.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const HOST = 'chrisfrascainsurance.com';
const key = fs.readFileSync(path.join(__dirname, 'indexnow-key.txt'), 'utf8').trim();

let urls;
if (process.argv.length > 2) {
  urls = process.argv.slice(2).map((p) => `https://${HOST}${p.startsWith('/') ? p : '/' + p}`);
} else {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

(async () => {
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: urls })
  });
  console.log(`IndexNow: submitted ${urls.length} URLs, response ${res.status} ${res.statusText}`);
  if (res.status === 200 || res.status === 202) console.log('Accepted. 202 means the key is still being verified, which is normal on first use.');
  else console.log(await res.text());
})();

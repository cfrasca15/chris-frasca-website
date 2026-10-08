// Seasonal swap: "Turning 65 Events" -> "Annual Enrollment Events" across the site.
// `node scripts/season-events-label.js` = Annual Enrollment season (applied Oct 2026).
// `node scripts/season-events-label.js reverse` in January switches back to Turning 65 wording;
// then run `node scripts/build-footer.js` and `node scripts/build-events-static.js`.
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/Chris Frasca/Desktop/chris-frasca-website';
const REVERSE = process.argv[2] === 'reverse';

const pairs = [
  ['Turning 65 Events', 'Annual Enrollment Events'],
  ['No-cost Medicare workshops for people turning 65 or retiring soon. See upcoming dates and register online.',
   'No-cost Annual Enrollment workshops in Mission Viejo. See upcoming dates and register online.'],
  ['Short, plain-English workshops that cover the Medicare basics everyone wishes someone had explained sooner. Pick a date below to register.',
   "Short, plain-English workshops on what's changing for Medicare in 2027 and what to do before Annual Enrollment ends December 7. Pick a date below to register."],
  ['<a href="/turning-65-medicare-guide.html" style="color:var(--brass-light);font-weight:600;text-decoration:underline;">Prefer to read first? See the turning-65 enrollment guide &rarr;</a>',
   '<a href="/2027-medicare-changes-california.html" style="color:var(--brass-light);font-weight:600;text-decoration:underline;">Prefer to read first? See the 2027 Medicare changes guide &rarr;</a>'],
  ['Join a Turning 65 event near you', 'Join an Annual Enrollment workshop near you'],
  ["I host no-cost, no-pressure workshops that break down Medicare basics &mdash; RSVP takes two minutes and you'll get a reminder before the day.",
   "I host no-cost, no-pressure workshops on what's changing for Medicare in 2027 &mdash; RSVP takes two minutes and you'll get a reminder before the day."],
  ['Turning 65 workshops', 'Annual Enrollment workshops'],
];

let changed = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(html|js|txt|md)$/.test(e.name) || e.name === 'season-events-label.js') continue;
    let s = fs.readFileSync(p, 'utf8'), o = s;
    for (const [a, b] of pairs) {
      const [from, to] = REVERSE ? [b, a] : [a, b];
      s = s.split(from).join(to);
    }
    if (s !== o) { fs.writeFileSync(p, s); changed++; console.log('updated', path.relative(ROOT, p)); }
  }
})(ROOT);
console.log('files changed:', changed);

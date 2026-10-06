// Writes the upcoming workshops into events.html as plain HTML (and as Event structured data in
// the page head), so search engines and AI crawlers that don't run JavaScript can still read them.
// Visitors with JavaScript still get the interactive cards from js/events.js, which replace this list.
//
// Run after editing js/events-data.js (and again once an event date passes):
//     node scripts/build-events-static.js
// then commit events.html.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// Load the event data and the schema helper from events.js without a browser.
const noop = () => {};
const sandbox = { console, Intl, Date, JSON, Math, String, Number, Array, Object, RegExp, setTimeout: noop };
sandbox.window = sandbox;
sandbox.document = { addEventListener: noop, getElementById: () => null, querySelectorAll: () => [], createElement: () => ({}), head: { appendChild: noop } };
vm.createContext(sandbox);
vm.runInContext(read('js/events-data.js'), sandbox);
vm.runInContext(read('js/events.js'), sandbox);
const EVENTS = vm.runInContext('EVENTS', sandbox);
const eventToSchema = vm.runInContext('eventToSchema', sandbox);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date(); today.setHours(0, 0, 0, 0);
const upcoming = EVENTS.filter((e) => new Date(e.date + 'T00:00:00') >= today).sort((a, b) => a.date.localeCompare(b.date));

const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

const cards = upcoming.map((e) => {
  let action;
  if (e.registerUrl) action = `<a href="${esc(e.registerUrl)}" target="_blank" rel="noopener">Register for this event</a>`;
  else if (e.registrationOpensSoon) action = 'Registration opens soon. Call <a href="tel:9492596744">949-259-6744</a> with questions.';
  else action = '<a href="#rsvp">RSVP for this event</a>';
  return `      <article class="card" style="margin-bottom:22px;">
        <h3>${esc(e.title)}</h3>
        <p><strong>${esc(longDate(e.date))}</strong>, ${esc(e.time)}</p>
        <p>${esc(e.location)}<br>${esc(e.address)}</p>
        <p>${esc(e.description)}</p>
        ${e.spots ? `<p class="hint">${esc(e.spots)}</p>` : ''}
        ${e.offeredWith ? `<p class="hint">Offered with ${esc(e.offeredWith)}</p>` : ''}
        <p>${action}</p>
      </article>`;
}).join('\n');

const staticHtml = upcoming.length
  ? `<div id="events-static">\n${cards}\n    </div>`
  : '<div id="events-static"><p class="lede">No workshops are scheduled right now. Call 949-259-6744 or send a message for one-on-one help.</p></div>';

const p = path.join(root, 'events.html');
let html = fs.readFileSync(p, 'utf8');
const nl = html.includes('\r\n') ? '\r\n' : '\n';

// 1. visible list inside #events-list (kept between markers so this script can be re-run)
const block = '<!-- events:start -->' + nl + '    ' + staticHtml.split('\n').join(nl) + nl + '    <!-- events:end -->';
if (html.includes('<!-- events:start -->')) html = html.replace(/<!-- events:start -->[\s\S]*?<!-- events:end -->/, () => block);
else if (html.includes('<div id="events-list"></div>')) html = html.replace('<div id="events-list"></div>', () => '<div id="events-list">' + nl + '    ' + block + nl + '    </div>');
else throw new Error('events-list not found');

// 2. Event structured data in the head (events.js replaces it with the same data when scripts run)
const schema = { '@context': 'https://schema.org', '@graph': upcoming.map(eventToSchema) };
const tag = '<script type="application/ld+json" id="event-schema">' + nl + JSON.stringify(schema, null, 2).replace(/</g, '\\u003c') + nl + '</script>';
if (/<script type="application\/ld\+json" id="event-schema">[\s\S]*?<\/script>/.test(html)) html = html.replace(/<script type="application\/ld\+json" id="event-schema">[\s\S]*?<\/script>/, () => tag);
else html = html.replace('</head>', tag + nl + '</head>');

fs.writeFileSync(p, html);
console.log('static events written:', upcoming.length, 'upcoming of', EVENTS.length);

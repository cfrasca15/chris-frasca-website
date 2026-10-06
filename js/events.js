function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
    full: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  };
}

const SITE_URL = 'https://chrisfrascainsurance.com';

// UTC offset (e.g. "-07:00") for Pacific time at a given local date/time, so
// start times are right on both sides of the daylight-saving change.
function pacificOffset(isoDate, hour, minute) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour + 8, minute));
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'shortOffset' })
    .formatToParts(guess).find(p => p.type === 'timeZoneName');
  const match = part && part.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '-08:00';
  return `${match[1]}${match[2].padStart(2, '0')}:${match[3] || '00'}`;
}

function to24h(hour, minute, meridiem) {
  let h = Number(hour) % 12;
  if (/pm/i.test(meridiem)) h += 12;
  return { h, m: Number(minute) };
}

function eventToSchema(ev) {
  const schema = {
    '@type': 'Event',
    name: ev.title,
    description: ev.description,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true,
    organizer: { '@type': 'Person', name: 'Chris Frasca', url: SITE_URL + '/' }
  };

  const t = String(ev.time || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (t) {
    const s = to24h(t[1], t[2], t[3]);
    const e = to24h(t[4], t[5], t[6]);
    const pad = n => String(n).padStart(2, '0');
    const offset = pacificOffset(ev.date, s.h, s.m);
    schema.startDate = `${ev.date}T${pad(s.h)}:${pad(s.m)}:00${offset}`;
    schema.endDate = `${ev.date}T${pad(e.h)}:${pad(e.m)}:00${offset}`;
  } else {
    schema.startDate = ev.date;
  }

  const a = String(ev.address || '').match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5})/);
  schema.location = {
    '@type': 'Place',
    name: ev.location,
    address: a
      ? { '@type': 'PostalAddress', streetAddress: a[1], addressLocality: a[2], addressRegion: a[3], postalCode: a[4], addressCountry: 'US' }
      : ev.address
  };

  // Only advertise a way to register once there is one.
  if (!ev.registrationOpensSoon) {
    schema.offers = {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: ev.registerUrl || SITE_URL + '/events.html#rsvp'
    };
  }
  return schema;
}

function injectEventSchema(events) {
  const old = document.getElementById('event-schema');
  if (old) old.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'event-schema';
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': events.map(eventToSchema) })
    .replace(/</g, '\\u003c');
  document.head.appendChild(script);
}

function renderEvents() {
  const list = document.getElementById('events-list');
  const select = document.getElementById('rsvp-event');
  if (!list || !select) return;
  // The page ships a plain-HTML copy of the events for crawlers that don't run scripts; replace it.
  const staticEvents = document.getElementById('events-static');
  if (staticEvents) staticEvents.remove();

  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = EVENTS.filter(e => new Date(e.date + "T00:00:00") >= today)
                          .sort((a,b) => new Date(a.date) - new Date(b.date));

  if (upcoming.length === 0) {
    list.innerHTML = '<p class="lede">No events are scheduled right now — check back soon, or contact me directly for one-on-one help.</p>';
  } else {
    injectEventSchema(upcoming);
  }

  upcoming.forEach(ev => {
    const d = formatDate(ev.date);

    let action;
    if (ev.registerUrl) {
      action = `<a href="${ev.registerUrl}" class="btn btn-primary" target="_blank" rel="noopener">Register for this event</a>`;
    } else if (ev.registrationOpensSoon) {
      action = `<p class="hint" style="margin:0;">Registration opens soon &mdash; check back, or call <a href="tel:9492596744" style="white-space:nowrap;">949-259-6744</a>.</p>`;
    } else {
      action = `<a href="#rsvp" class="btn btn-primary rsvp-jump" data-event="${ev.id}">RSVP for this event</a>`;
    }

    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.marginBottom = '26px';
    card.innerHTML = `
      <div class="event-date-block">
        <div class="day">${d.day}</div>
        <div class="month">${d.month}</div>
        <div class="year">${d.year}</div>
      </div>
      <div class="event-details">
        <h3>${ev.title}</h3>
        <div class="event-meta">
          <span><svg style="width:18px;height:18px;flex-shrink:0;color:var(--brass);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${ev.time}</span>
          <span><svg style="width:18px;height:18px;flex-shrink:0;color:var(--brass);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>${ev.location}</span>
        </div>
        <p>${ev.description}</p>
        <p class="hint" style="margin-bottom:6px;">${ev.spots || ''}</p>
        ${ev.offeredWith ? `<p class="hint" style="margin-bottom:16px;">Offered with ${ev.offeredWith}</p>` : ''}
        ${action}
      </div>
    `;
    list.appendChild(card);

    // Only events registered through this site's own form go in the dropdown.
    if (!ev.registerUrl && !ev.registrationOpensSoon) {
      const opt = document.createElement('option');
      opt.value = ev.id;
      opt.textContent = `${d.full} — ${ev.title}`;
      select.appendChild(opt);
    }
  });

  // No events use the on-site form (e.g. all registration happens on the host's page): hide it.
  const rsvpSection = document.getElementById('rsvp');
  if (rsvpSection && select.options.length <= 1) rsvpSection.style.display = 'none';

  // Jump + preselect
  document.querySelectorAll('.rsvp-jump').forEach(btn => {
    btn.addEventListener('click', () => {
      select.value = btn.dataset.event;
    });
  });

  // Preselect from URL, e.g. events.html?event=irvine-aug-2026 (for Facebook event links)
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('event');
  if (preselect && [...select.options].some(o => o.value === preselect)) {
    select.value = preselect;
    setTimeout(() => document.getElementById('rsvp').scrollIntoView({ behavior: 'smooth' }), 300);
  }
}

function wireRsvpForm() {
  const form = document.getElementById('rsvp-form');
  if (!form) return;
  const statusEl = document.getElementById('rsvp-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const startedAt = Date.now();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.className = 'form-status';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const data = Object.fromEntries(new FormData(form).entries());
    const selectedEvent = EVENTS.find(ev => ev.id === data.eventId);

    try {
      const res = await fetch('/.netlify/functions/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          startedAt,
          eventTitle: selectedEvent ? selectedEvent.title : data.eventId,
          eventDate: selectedEvent ? selectedEvent.date : '',
          eventTime: selectedEvent ? selectedEvent.time : '',
          eventLocation: selectedEvent ? selectedEvent.location : '',
          eventAddress: selectedEvent ? selectedEvent.address : ''
        })
      });

      if (!res.ok) throw new Error('Request failed');

      statusEl.textContent = "You're all set! A confirmation email is on its way, and I'll send you a reminder before the event.";
      statusEl.className = 'form-status show ok';
      statusEl.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      form.reset();
    } catch (err) {
      statusEl.textContent = "Something went wrong sending your RSVP. Please call or email me directly at 949-259-6744 / chris@chrisfrascainsurance.com.";
      statusEl.className = 'form-status show err';
      statusEl.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'RSVP Now';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderEvents();
  wireRsvpForm();
});

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
    full: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  };
}

function renderEvents() {
  const list = document.getElementById('events-list');
  const select = document.getElementById('rsvp-event');
  if (!list || !select) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = EVENTS.filter(e => new Date(e.date + "T00:00:00") >= today)
                          .sort((a,b) => new Date(a.date) - new Date(b.date));

  if (upcoming.length === 0) {
    list.innerHTML = '<p class="lede">No events are scheduled right now — check back soon, or contact me directly for one-on-one help.</p>';
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
        <p class="hint" style="margin-bottom:16px;">${ev.spots || ''}</p>
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
      form.reset();
    } catch (err) {
      statusEl.textContent = "Something went wrong sending your RSVP. Please call or email me directly at 949-259-6744 / chris@chrisfrascainsurance.com.";
      statusEl.className = 'form-status show err';
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

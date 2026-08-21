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
          <span>&#128337; ${ev.time}</span>
          <span>&#128205; ${ev.location}</span>
        </div>
        <p>${ev.description}</p>
        <p class="hint" style="margin-bottom:16px;">${ev.spots || ''}</p>
        <a href="#rsvp" class="btn btn-primary rsvp-jump" data-event="${ev.id}">RSVP for this event</a>
      </div>
    `;
    list.appendChild(card);

    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = `${d.full} — ${ev.title}`;
    select.appendChild(opt);
  });

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

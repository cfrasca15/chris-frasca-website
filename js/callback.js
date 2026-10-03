// Call-back request form on the plan-changes landing page. Posts to the same
// contact function (name + phone required, email optional) and counts as a
// contact-form conversion.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('callback-form');
  if (!form) return;
  const statusEl = document.getElementById('callback-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const startedAt = Date.now();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.className = 'form-status';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const data = Object.fromEntries(new FormData(form).entries());
    const bestTime = data.bestTime || 'Anytime';
    const payload = {
      firstName: data.firstName,
      phone: data.phone,
      email: data.email,
      consent: data.consent,
      website: data.website,
      topic: 'Call-back request (landing page)',
      message: `Best time to call: ${bestTime}`,
      startedAt
    };

    try {
      const res = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Request failed');

      statusEl.textContent = "Thanks. I'll call you back at the number you gave me, usually within one business day. If it's urgent, call 949-259-6744.";
      statusEl.className = 'form-status show ok';
      if (window.trackConversion) window.trackConversion('contact');
      form.reset();
    } catch (err) {
      statusEl.textContent = 'Something went wrong. Please call me directly at 949-259-6744.';
      statusEl.className = 'form-status show err';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request a call back';
      statusEl.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
  });
});

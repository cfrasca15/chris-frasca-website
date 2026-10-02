document.querySelectorAll('[data-review-carousel]').forEach(setupReviewCarousel);

async function setupReviewCarousel(root) {
  try {
    const res = await fetch('/.netlify/functions/get-reviews');
    if (res.ok) {
      const { reviews } = await res.json();
      if (Array.isArray(reviews) && reviews.length > 0) renderReviews(root, reviews);
    }
  } catch (err) {
    // Function unreachable (e.g. viewing the site as a local file) — keep
    // the placeholder reviews already in the HTML.
  }
  initReviewCarousel(root);
}

function renderReviews(root, reviews) {
  const track = root.querySelector('.review-track');
  track.innerHTML = '';
  reviews.forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card review-slide';

    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.textContent = '★'.repeat(Math.max(1, Math.min(5, Math.round(r.rating || 5))));

    const quote = document.createElement('p');
    quote.className = 'review-quote';
    quote.textContent = '"' + (r.text || '') + '"';

    const author = document.createElement('div');
    author.className = 'review-author';
    author.textContent = '— ' + (r.author || 'Google user');

    card.append(stars, quote, author);
    track.appendChild(card);
  });
}

function initReviewCarousel(root) {
  const track = root.querySelector('.review-track');
  const slides = Array.from(track.children);
  const prevBtn = root.querySelector('.review-nav-prev');
  const nextBtn = root.querySelector('.review-nav-next');
  const dotsWrap = root.querySelector('.review-dots');

  if (!track || slides.length <= 1) {
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    return;
  }

  const AUTOPLAY_MS = 6000;
  let index = 0;
  let timer = null;

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'review-dot';
    dot.setAttribute('aria-label', 'Go to review ' + (i + 1));
    dot.addEventListener('click', () => goTo(i, true));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function update() {
    track.style.transform = 'translateX(-' + (index * 100) + '%)';
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function goTo(i, userInitiated) {
    index = (i + slides.length) % slides.length;
    update();
    if (userInitiated) restartAutoplay();
  }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function restartAutoplay() {
    stopAutoplay();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1, true));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1, true));

  root.addEventListener('mouseenter', stopAutoplay);
  root.addEventListener('mouseleave', restartAutoplay);
  root.addEventListener('focusin', stopAutoplay);
  root.addEventListener('focusout', restartAutoplay);

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(index - 1, true);
    if (e.key === 'ArrowRight') goTo(index + 1, true);
  });

  let touchStartX = null;
  track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1), true);
    touchStartX = null;
  });

  update();
  restartAutoplay();
}

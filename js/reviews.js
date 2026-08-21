document.querySelectorAll('[data-review-carousel]').forEach(initReviewCarousel);

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

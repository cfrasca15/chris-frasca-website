(function () {
  var header = document.querySelector('.site-header');
  var nav = document.querySelector('.primary-nav');
  var toggle = document.querySelector('.nav-toggle');
  if (!header) return;

  // The mobile menu opens just below the header, whatever height it ends up
  // (the logo text can wrap to extra lines on narrow phones).
  function setHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  if (window.ResizeObserver) new ResizeObserver(setHeaderHeight).observe(header);
  else window.addEventListener('resize', setHeaderHeight);
  window.addEventListener('load', setHeaderHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeight);

  if (nav && toggle) {
    toggle.addEventListener('click', setHeaderHeight);
    var sync = function () {
      toggle.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
    };
    sync();
    new MutationObserver(sync).observe(nav, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') nav.classList.remove('open');
    });
  }
})();

// Mobile call bar: a big, always-visible "Call" button on phones. Hidden on larger
// screens by CSS. Skipped on the 404 page.
(function () {
  if (document.querySelector('.call-bar')) return;
  var bar = document.createElement('div');
  bar.className = 'call-bar';
  bar.innerHTML =
    '<a href="tel:9492596744" class="btn btn-primary">' +
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1v3.4c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    'Call 949-259-6744</a>';
  function add() {
    document.body.appendChild(bar);
    document.body.classList.add('has-callbar');
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();

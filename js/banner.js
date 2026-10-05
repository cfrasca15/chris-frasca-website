// Seasonal Medicare Annual Enrollment banner. Shows Oct 1 - Dec 7 each year
// (below the header, never sticky) and hides itself the rest of the year.
(function () {
  var now = new Date();
  var y = now.getFullYear();
  var start = new Date(y, 9, 1);              // Oct 1
  var open = new Date(y, 9, 15);              // Oct 15
  var end = new Date(y, 11, 7, 23, 59, 59);   // Dec 7
  if (now < start || now > end) return;

  try { if (sessionStorage.getItem('aepBannerClosed') === '1') return; } catch (e) {}

  var header = document.querySelector('header.site-header');
  if (!header) return;

  var msg = now < open
    ? 'Medicare Annual Enrollment starts October 15 and ends December 7.'
    : 'Medicare Annual Enrollment is open through December 7.';

  var bar = document.createElement('div');
  bar.className = 'aep-banner';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Annual Enrollment notice');
  bar.innerHTML =
    '<div class="wrap">' +
      '<p>' + msg + ' <a href="/plan-changes.html">Get a no-cost plan review &rarr;</a></p>' +
      '<button type="button" class="aep-banner-close" aria-label="Dismiss notice">&times;</button>' +
    '</div>';
  header.parentNode.insertBefore(bar, header.nextSibling);

  bar.querySelector('.aep-banner-close').addEventListener('click', function () {
    bar.remove();
    try { sessionStorage.setItem('aepBannerClosed', '1'); } catch (e) {}
  });
})();

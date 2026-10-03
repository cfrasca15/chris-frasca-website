// Google Ads conversion tracking behind a cookie choice.
//
// Google Consent Mode: everything starts "denied", so no advertising cookies
// are set until the visitor clicks Accept. The choice is remembered in
// localStorage (if the browser allows it).
//
// To track a conversion, create it in Google Ads (Goals > Conversions), copy
// the send_to value from its event snippet (looks like "AW-10860847307/AbCd...")
// and paste it below. Until a value is filled in, that conversion is skipped.
(function () {
  var AW_ID = 'AW-10860847307';
  var CONVERSIONS = {
    contact: 'AW-10860847307/YNjKCKy32I8dEMvB7boo',   // contact form submitted
    booking: null    // Calendly consultation booked
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };

  function getChoice() { try { return localStorage.getItem('cookieChoice'); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem('cookieChoice', v); } catch (e) {} }

  gtag('consent', 'default', DENIED);
  if (getChoice() === 'granted') gtag('consent', 'update', GRANTED);
  gtag('js', new Date());
  gtag('config', AW_ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_ID;
  document.head.appendChild(s);

  window.trackConversion = function (name) {
    var sendTo = CONVERSIONS[name];
    if (sendTo) gtag('event', 'conversion', { send_to: sendTo });
  };

  // Calendly tells the page when a booking is completed (inline and popup).
  window.addEventListener('message', function (e) {
    if (e.origin === 'https://calendly.com' && e.data && e.data.event === 'calendly.event_scheduled') {
      window.trackConversion('booking');
    }
  });

  function showBanner() {
    var bar = document.createElement('div');
    bar.className = 'cookie-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie notice');
    bar.innerHTML =
      '<p>We use cookies to measure how our ads perform. You can accept or decline. ' +
      '<a href="/privacy-policy.html">Privacy Policy</a></p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-outline cookie-decline">Decline</button>' +
      '<button type="button" class="btn btn-primary cookie-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector('.cookie-accept').addEventListener('click', function () {
      setChoice('granted'); gtag('consent', 'update', GRANTED); bar.remove();
    });
    bar.querySelector('.cookie-decline').addEventListener('click', function () {
      setChoice('denied'); bar.remove();
    });
  }

  function init() { if (!getChoice()) showBanner(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

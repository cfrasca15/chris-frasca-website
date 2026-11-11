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
    booking: 'AW-10860847307/LQSiCK-32I8dEMvB7boo',   // Calendly consultation booked
    call: 'AW-10860847307/Nzw7COatx7EdEMvB7boo'       // "Website phone call": tap on a phone number
  };

  // Microsoft Advertising (Bing) UET tag ID, from Microsoft Ads > Tools > UET tag.
  // Until it is filled in, the Microsoft tag is not loaded.
  var UET_ID = '187286249';
  // Microsoft conversion goals (custom event, manual tracking); each value is the
  // goal's Action: SubmitLeadForm, BookAppointment, Contact (tap on a phone number).
  var UET_EVENTS = { contact: 'submit_lead_form', booking: 'book_appointment', call: 'contact' };

  // Remember, for this browser tab only, which page an ad visit landed on and
  // which ad network sent it, so bookings.html can tell Calendly the booking came
  // from an ad. Stores the page name and network, not the click ID.
  try {
    var adSource = /[?&](gclid|gbraid|wbraid)=/.test(location.search) ? 'google'
      : /[?&]msclkid=/.test(location.search) ? 'bing' : null;
    if (adSource && !sessionStorage.getItem('adLanding')) {
      sessionStorage.setItem('adLanding', location.pathname.replace(/^\/|\.html$/g, '') || 'index');
      sessionStorage.setItem('adSource', adSource);
    }
  } catch (e) {}

  // Microsoft consent mode: no Microsoft ad cookies until the visitor clicks Accept.
  window.uetq = window.uetq || [];
  window.uetq.push('consent', 'default', { ad_storage: 'denied' });

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };

  function getChoice() { try { return localStorage.getItem('cookieChoice'); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem('cookieChoice', v); } catch (e) {} }

  function grant() {
    gtag('consent', 'update', GRANTED);
    window.uetq.push('consent', 'update', { ad_storage: 'granted' });
  }

  gtag('consent', 'default', DENIED);
  if (getChoice() === 'granted') grant();
  // URL passthrough carries the ad click ID in internal links when cookies are
  // declined, so a booking or call on a later page still credits the ad. It sets no cookies.
  gtag('set', 'url_passthrough', true);
  gtag('js', new Date());
  gtag('config', AW_ID);

  // Load gtag.js once the page has finished loading (and the browser is idle) so it
  // doesn't compete with the first paint. Events fired before it loads are queued
  // in dataLayer, so nothing is lost.
  function loadTag() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW_ID;
    document.head.appendChild(s);
    if (UET_ID) {
      var b = document.createElement('script');
      b.async = true;
      b.src = 'https://bat.bing.com/bat.js';
      b.onload = function () {
        if (!window.UET) return;
        var queued = window.uetq;
        window.uetq = new window.UET({ ti: UET_ID, q: queued, enableAutoSpaTracking: true });
        window.uetq.push('pageLoad');
      };
      document.head.appendChild(b);
    }
  }
  function whenIdle() {
    if (window.requestIdleCallback) window.requestIdleCallback(loadTag, { timeout: 3000 });
    else setTimeout(loadTag, 1500);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle);

  window.trackConversion = function (name) {
    var sendTo = CONVERSIONS[name];
    if (sendTo) gtag('event', 'conversion', { send_to: sendTo });
    if (UET_ID && UET_EVENTS[name]) window.uetq.push('event', UET_EVENTS[name], {});
  };

  // Any tap on a tel: link counts as a call conversion, once a "call" send_to is filled in above.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (a) window.trackConversion('call');
  });

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
      '<p>We use cookies to measure our ads. ' +
      '<a href="/privacy-policy.html">Privacy Policy</a></p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-outline cookie-decline">Decline</button>' +
      '<button type="button" class="btn btn-primary cookie-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector('.cookie-accept').addEventListener('click', function () {
      setChoice('granted'); grant(); bar.remove();
    });
    bar.querySelector('.cookie-decline').addEventListener('click', function () {
      setChoice('denied'); bar.remove();
    });
  }

  function init() { if (!getChoice()) showBanner(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

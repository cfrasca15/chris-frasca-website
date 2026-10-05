document.addEventListener('DOMContentLoaded', function () {
  var el = document.getElementById('site-footer');
  if (!el) return;
  var orgs = el.getAttribute('data-orgs') || '10';
  var products = el.getAttribute('data-products') || '62';
  el.innerHTML = `
    <div class="wrap">
      <div class="footer-top">
        <div>
          <h4>Chris Frasca Insurance Services</h4>
          <p style="max-width:38ch;">No-cost, unbiased Medicare guidance for Orange County and Ventura County. Independent licensed insurance agent, personal service, for life.</p>
        </div>
        <div>
          <h4>Site</h4>
          <ul>
            <li><a href="/index.html">Home</a></li>
            <li><a href="/about.html">About Chris</a></li>
            <li><a href="/medicare-help.html">Medicare Help</a></li>
            <li><a href="/events.html">Turning 65 Events</a></li>
            <li><a href="/turning-65-medicare-guide.html">Turning 65 Guide</a></li>
            <li><a href="/bookings.html">Book a Consultation</a></li>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/privacy-policy.html">Privacy Policy</a></li>
          </ul>
        </div>
        <div>
          <h4>Areas</h4>
          <ul>
            <li><a href="/medicare-help-mission-viejo.html">Mission Viejo</a></li>
            <li><a href="/medicare-help-newport-beach.html">Newport Beach</a></li>
            <li><a href="/medicare-help-irvine.html">Irvine</a></li>
            <li><a href="/medicare-help-ventura.html">Ventura</a></li>
            <li><a href="/medicare-help-oxnard.html">Oxnard</a></li>
            <li><a href="/areas.html">All service areas</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="tel:9492596744">949-259-6744</a></li>
            <li><a href="mailto:chris@chrisfrascainsurance.com">chris@chrisfrascainsurance.com</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-id"><strong>Chris Frasca Insurance Services</strong> &middot; California Insurance License No. 0L86243</p>
        Medicare has neither reviewed nor endorsed this information. Not connected with or endorsed by the United States government or the federal Medicare program. California Insurance License No. 0L86243.
        <br>We do not offer every plan available in your area. Currently we represent ${orgs} organizations which offer ${products} products in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Program (SHIP) to get information on all of your options.
        <br><br>&copy; <span id="year"></span> Chris Frasca Insurance Services. All rights reserved.
      </div>
    </div>
  `;
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

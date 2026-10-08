// Writes the site footer directly into every HTML page (no JavaScript needed), so search
// engines and AI crawlers that don't run scripts still see the license number, the required
// disclaimer, and the footer links.
//
// To change the footer or the organization/product counts: edit this file, then run
//     node scripts/build-footer.js
// from the website folder, and commit the updated pages.
// (The same disclaimer wording also lives in netlify/functions/lib/email-template.js and the
// email signature; update those too when the counts change.)

const fs = require('fs');
const path = require('path');

const ORGS = 10;
const PRODUCTS = 62;
const YEAR = new Date().getFullYear();

const FOOTER = `
    <div class="wrap">
      <div class="footer-top">
        <div>
          <h2 class="footer-h">Chris Frasca Insurance Services</h2>
          <p style="max-width:38ch;">No-cost, unbiased Medicare guidance for Orange County and Ventura County. Independent licensed insurance agent, personal service, for life.</p>
        </div>
        <div>
          <h2 class="footer-h">Site</h2>
          <ul>
            <li><a href="/index.html">Home</a></li>
            <li><a href="/about.html">About Chris</a></li>
            <li><a href="/medicare-help.html">Medicare Help</a></li>
            <li><a href="/events.html">Annual Enrollment Events</a></li>
            <li><a href="/bookings.html">Book a Consultation</a></li>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/privacy-policy.html">Privacy Policy</a></li>
          </ul>
        </div>
        <div>
          <h2 class="footer-h">Guides</h2>
          <ul>
            <li><a href="/turning-65-medicare-guide.html">Turning 65 Guide</a></li>
            <li><a href="/medicare-advantage-vs-medigap-california.html">Medicare Advantage vs. Medigap</a></li>
            <li><a href="/find-a-local-insurance-agent-for-medicare.html">Finding a Local Agent</a></li>
            <li><a href="/2027-medicare-changes-california.html">2027 Changes in California</a></li>
          </ul>
        </div>
        <div>
          <h2 class="footer-h">Areas</h2>
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
          <h2 class="footer-h">Contact</h2>
          <ul>
            <li><a href="tel:9492596744">949-259-6744</a></li>
            <li><a href="mailto:chris@chrisfrascainsurance.com">chris@chrisfrascainsurance.com</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-id"><strong>Chris Frasca Insurance Services</strong> &middot; California Insurance License No. 0L86243</p>
        Medicare has neither reviewed nor endorsed this information. Not connected with or endorsed by the United States government or the federal Medicare program. California Insurance License No. 0L86243.
        <br>We do not offer every plan available in your area. Currently we represent ${ORGS} organizations which offer ${PRODUCTS} products in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Program (SHIP) to get information on all of your options.
        <br><br>&copy; ${YEAR} Chris Frasca Insurance Services. All rights reserved.
      </div>
    </div>
  `;

const root = path.join(__dirname, '..');
const footerRe = /<footer class="site-footer" id="site-footer">[\s\S]*?<\/footer>/;
const scriptRe = /\r?\n?<script src="\/?js\/footer\.js"><\/script>/;
let changed = 0;
for (const f of fs.readdirSync(root)) {
  if (!f.endsWith('.html') || f.startsWith('google')) continue;
  const p = path.join(root, f);
  let s = fs.readFileSync(p, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  if (!footerRe.test(s)) { console.log('no footer in', f); continue; }
  let out = s.replace(footerRe, () => '<footer class="site-footer" id="site-footer">' + FOOTER.replace(/\n/g, nl) + '</footer>');
  out = out.replace(scriptRe, '');
  if (out !== s) { fs.writeFileSync(p, out); changed++; }
}
console.log('footer written into', changed, 'pages');

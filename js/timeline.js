// Annual Enrollment timeline: places a "Today" marker and a caption that match
// the real date. Dots are evenly spaced at 12.5%, 37.5%, 62.5%, and 87.5%.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.aep-timeline').forEach((tl) => {
    const now = new Date();
    const y = now.getFullYear();
    const stops = [
      { at: 12.5, date: new Date(y, 9, 1) },    // Oct 1
      { at: 37.5, date: new Date(y, 9, 15) },   // Oct 15
      { at: 62.5, date: new Date(y, 11, 7, 23, 59) }, // Dec 7
      { at: 87.5, date: new Date(y + 1, 0, 1) } // Jan 1
    ];
    const lead = new Date(y, 8, 1); // Sep 1: marker starts just left of Oct 1
    const caption = tl.querySelector('.tl-caption');
    const today = tl.querySelector('.tl-today');
    const dateText = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    let pct = null;
    if (now >= lead && now < stops[0].date) {
      pct = 3 + ((now - lead) / (stops[0].date - lead)) * (stops[0].at - 3);
    } else {
      for (let i = 0; i < stops.length - 1; i++) {
        if (now >= stops[i].date && now < stops[i + 1].date) {
          pct = stops[i].at + ((now - stops[i].date) / (stops[i + 1].date - stops[i].date)) * (stops[i + 1].at - stops[i].at);
          break;
        }
      }
    }

    if (pct === null) {
      if (today) today.hidden = true;
    } else if (today) {
      today.style.left = pct + '%';
      today.hidden = false;
    }

    if (caption) {
      if (now.getMonth() <= 7) {
        caption.textContent = 'Annual Enrollment runs October 15 through December 7 every year.';
      } else if (now < new Date(y, 9, 1)) {
        caption.textContent = `Today is ${dateText}. 2027 plan details are posted on October 1, and Annual Enrollment opens October 15.`;
      } else if (now < new Date(y, 9, 15)) {
        caption.textContent = `Today is ${dateText}. 2027 plan details are posted, and Annual Enrollment opens October 15.`;
      } else if (now < new Date(y, 11, 8)) {
        caption.textContent = `Today is ${dateText}. Annual Enrollment is open and ends December 7.`;
      } else {
        caption.textContent = `Today is ${dateText}. Annual Enrollment has ended for this year.`;
      }
    }
  });
});

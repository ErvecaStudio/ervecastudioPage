(function () {
  'use strict';

  var DATA_URL = '../data/events.json';
  var NAV_OFFSET = 120;

  var headerEl = document.querySelector('.event-header');
  var tabsEl   = document.querySelector('.day-tabs');
  var gridEl   = document.querySelector('.activities-grid');
  var statusEl = document.querySelector('.event-status');
  if (!tabsEl || !gridEl) return;

  var events = [];
  var current = null;   
  var currentDay = null; 

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function today() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function fmtRange(days) {
    if (!days.length) return '';
    var first = days[0].dateLabel || days[0].date;
    var last = days[days.length - 1].dateLabel || days[days.length - 1].date;
    return days.length > 1 ? (first + ' – ' + last) : first;
  }

  function pickEvent(list) {
    var now = today().getTime();
    var best = null, bestDiff = Infinity;
    list.forEach(function (ev) {
      (ev.days || []).forEach(function (day) {
        var d = parseDate(day.date);
        if (!d) return;
        var diff = d.getTime() - now;
        if (diff >= 0 && diff < bestDiff) { bestDiff = diff; best = ev; }
      });
    });
    return best || list[0];
  }

  function pickDay(days) {
    var now = today().getTime();
    var next = null, nextDiff = Infinity;
    for (var i = 0; i < days.length; i++) {
      var d = parseDate(days[i].date);
      if (!d) continue;
      var diff = d.getTime() - now;
      if (diff === 0) return days[i];
      if (diff > 0 && diff < nextDiff) { nextDiff = diff; next = days[i]; }
    }
    return next || days[days.length - 1];
  }

  function renderHeader(ev) {
    if (!headerEl) return;
    headerEl.innerHTML = '';
    var h = document.createElement('h2');
    h.textContent = ev.name || '';
    headerEl.appendChild(h);

    var meta = document.createElement('p');
    meta.className = 'event-meta';
    var bits = [];
    if (ev.place) bits.push(ev.place);
    var range = fmtRange(ev.days || []);
    if (range) bits.push(range);
    meta.textContent = bits.join(' · ');
    headerEl.appendChild(meta);
  }

  function renderTabs(ev) {
    tabsEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    (ev.days || []).forEach(function (day) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'track-tab btn btn-secondary';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.dataset.date = day.date;
      btn.textContent = day.dateLabel || day.date;
      btn.addEventListener('click', function () { selectDay(day, true); });
      frag.appendChild(btn);
    });
    tabsEl.appendChild(frag);
  }

  function hasLink(item) {
    return !!(item.link && item.link.trim());
  }

  function buildShowcaseCard(item) {
    var linked = hasLink(item);
    var card = document.createElement(linked ? 'a' : 'div');
    card.className = 'activity-card showcase' + (linked ? ' is-link' : '');
    if (linked) {
      card.href = item.link;
      if (/^https?:/.test(item.link)) { card.target = '_blank'; card.rel = 'noopener'; }
    }

    if (item.image) {
      var media = document.createElement('div');
      media.className = 'card-img';
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = '';
      img.loading = 'lazy';
      media.appendChild(img);
      var badge = document.createElement('span');
      badge.className = 'card-badge sage';
      badge.textContent = 'Showcase';
      media.appendChild(badge);
      card.appendChild(media);
    }

    var body = document.createElement('div');
    body.className = 'card-body';

    if (item.studio) {
      var studio = document.createElement('p');
      studio.className = 'activity-studio';
      studio.textContent = item.studio;
      body.appendChild(studio);
    }

    var h = document.createElement('h3');
    h.textContent = item.title || '';
    body.appendChild(h);

    if (item.description) {
      var p = document.createElement('p');
      p.textContent = item.description;
      body.appendChild(p);
    }

    if (linked) {
      var link = document.createElement('span');
      link.className = 'card-link';
      link.textContent = 'Más información →';
      body.appendChild(link);
    }

    card.appendChild(body);
    return card;
  }

  function buildCharlaCard(item) {
    var linked = hasLink(item);
    var card = document.createElement(linked ? 'a' : 'div');
    card.className = 'activity-card charla' + (linked ? ' is-link' : '');
    if (linked) {
      card.href = item.link;
      if (/^https?:/.test(item.link)) { card.target = '_blank'; card.rel = 'noopener'; }
    }

    var body = document.createElement('div');
    body.className = 'card-body';

    var eyebrow = document.createElement('p');
    eyebrow.className = 'activity-eyebrow charla';
    eyebrow.textContent = item.showedType || 'Charla';
    body.appendChild(eyebrow);

    var h = document.createElement('h3');
    h.textContent = item.title || '';
    body.appendChild(h);

    if (item.authors) {
      var authors = document.createElement('p');
      authors.className = 'activity-authors';
      authors.textContent = item.authors;
      body.appendChild(authors);
    }

    if (item.description) {
      var p = document.createElement('p');
      p.textContent = item.description;
      body.appendChild(p);
    }

    if (linked) {
      var link = document.createElement('span');
      link.className = 'card-link';
      link.textContent = 'Más información →';
      body.appendChild(link);
    }

    card.appendChild(body);
    return card;
  }

  function groupByTime(items) {
    var map = {};
    var order = [];
    items.forEach(function (item) {
      var key = item.start || '_';
      if (!map[key]) {
        map[key] = { start: item.start || null, end: item.end || null, items: [] };
        order.push(key);
      }
      map[key].items.push(item);
      if (item.end && (!map[key].end || item.end > map[key].end)) map[key].end = item.end;
    });
    order.sort(function (a, b) {
      if (a === '_') return 1;
      if (b === '_') return -1;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    return order.map(function (key) { return map[key]; });
  }

  function formatTimeRange(start, end) {
    if (!start) return 'Horario por confirmar';
    return end && end !== start ? (start + ' – ' + end) : start;
  }

  function renderActivities(day) {
    gridEl.innerHTML = '';
    var items = (day && day.activities) || [];
    var groups = groupByTime(items);
    var frag = document.createDocumentFragment();

    groups.forEach(function (group) {
      var slot = document.createElement('div');
      slot.className = 'time-slot';

      var timeLabel = document.createElement('p');
      timeLabel.className = 'time-slot-time';
      timeLabel.textContent = formatTimeRange(group.start, group.end);
      slot.appendChild(timeLabel);

      var showcases = group.items.filter(function (i) { return i.type !== 'talk'; });
      var charlas = group.items.filter(function (i) { return i.type === 'talk'; });

      if (showcases.length) {
        var row = document.createElement('div');
        row.className = 'time-slot-showcases count-' + showcases.length;
        showcases.forEach(function (item) { row.appendChild(buildShowcaseCard(item)); });
        slot.appendChild(row);
      }

      if (charlas.length) {
        var stack = document.createElement('div');
        stack.className = 'time-slot-talks';
        charlas.forEach(function (item) { stack.appendChild(buildCharlaCard(item)); });
        slot.appendChild(stack);
      }

      frag.appendChild(slot);
    });

    gridEl.appendChild(frag);

    if (statusEl) {
      statusEl.textContent = items.length
        ? items.length + ' actividad' + (items.length === 1 ? '' : 'es') + ' programada' + (items.length === 1 ? '' : 's') + ' para este día.'
        : 'Todavía no hay actividades publicadas para este día.';
    }
  }

  function selectDay(day, scroll) {
    currentDay = day;
    var btns = tabsEl.querySelectorAll('.track-tab');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].dataset.date === day.date;
      btns[i].classList.toggle('btn-primary', on);
      btns[i].classList.toggle('btn-secondary', !on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    renderActivities(day);
    if (history.replaceState) history.replaceState(null, '', '#' + day.date);
    if (scroll) {
      var target = gridEl;
      var y = window.pageYOffset + target.getBoundingClientRect().top - NAV_OFFSET;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }

  function init(ev) {
    current = ev;
    renderHeader(ev);
    renderTabs(ev);

    var days = ev.days || [];
    if (!days.length) {
      if (statusEl) statusEl.textContent = 'Todavía no hay fechas publicadas para este evento.';
      return;
    }

    var fromHash = (location.hash || '').replace('#', '');
    var target = days.filter(function (d) { return d.date === fromHash; })[0] || pickDay(days);
    selectDay(target, false);
  }

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (json) {
      events = (json && json.events) || [];
      if (!events.length) throw new Error('sin datos');
      var params = new URLSearchParams(location.search);
      var idxParam = params.get('event');
      var idx = idxParam !== null ? parseInt(idxParam, 10) : NaN;
      var ev = (!isNaN(idx) && events[idx]) ? events[idx] : pickEvent(events);
      init(ev);
    })
    .catch(function () {
      if (statusEl) statusEl.textContent = 'No hemos podido cargar los eventos. Recarga la página en un momento.';
    });
})();
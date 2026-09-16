(function () {
  'use strict';

  var DATA_URL = '../data/roadmaps.json';
  var NAV_OFFSET = 120;

  var tabsEl   = document.querySelector('.track-tabs');
  var introEl  = document.querySelector('.track-intro');
  var wrapEl   = document.getElementById('roadmap');
  var statusEl = document.querySelector('.roadmap-status');
  if (!tabsEl || !wrapEl) return;

  var itemsEl  = wrapEl.querySelector('.roadmap-items');
  var svgEl    = wrapEl.querySelector('.roadmap-svg');
  var pathBase = wrapEl.querySelector('.rm-path-base');
  var pathDone = wrapEl.querySelector('.rm-path-done');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tracks = [];
  var current = null;
  var nextRow = -1;  

  var VISIBLE_COUNT = 6;
  var loadMoreBtn = document.getElementById('rm-load-more');
  var scrollTopBtn = document.getElementById('rm-scroll-top');

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

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

  function findNext(items) {
    var now = today().getTime();
    for (var i = 0; i < items.length; i++) {
      var d = parseDate(items[i].date);
      if (items[i].status !== 'done' && d && d.getTime() >= now) return i;
    }
    return items.length ? items.length - 1 : -1;
  }

  function renderTabs() {
    var frag = document.createDocumentFragment();
    tracks.forEach(function (track) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'track-tab btn btn-secondary';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.dataset.track = track.id;
      btn.textContent = track.label;
      btn.addEventListener('click', function () { selectTrack(track.id, true); });
      frag.appendChild(btn);
    });
    tabsEl.appendChild(frag);
  }

  function badgeClass(state) {
    if (state === 'next') return 'card-badge';
    if (state === 'future') return 'card-badge sage';
    return 'card-badge gold';
  }

  function buildItem(item, state, side) {
    var art = document.createElement('article');
    art.className = 'rm-item ' + side + ' is-' + state;

    var hasLink = state !== 'done' && !!(item.link && item.link.trim());
    var card = document.createElement(hasLink ? 'a' : 'div');
    card.className = 'rm-card' + (hasLink ? ' is-link' : '');
    if (hasLink) {
      card.href = item.link;
      if (/^https?:/.test(item.link)) { card.target = '_blank'; card.rel = 'noopener'; }
    }

    var label = item.dateLabel || item.date || '';

    if (item.image) {
      var media = document.createElement('div');
      media.className = 'card-img';
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('load', schedulePath);
      media.appendChild(img);
      if (label) {
        var badge = document.createElement('span');
        badge.className = badgeClass(state);
        badge.textContent = label;
        media.appendChild(badge);
      }
      card.appendChild(media);
    }

    var body = document.createElement('div');
    body.className = 'card-body';

    if (!item.image && label) {
      var date = document.createElement('p');
      date.className = 'rm-date';
      date.textContent = label;
      body.appendChild(date);
    }

    var h = document.createElement('h3');
    h.textContent = item.title || '';
    body.appendChild(h);

    if (item.description) {
      var p = document.createElement('p');
      p.textContent = item.description;
      body.appendChild(p);
    }

    if (item.place) {
      var place = document.createElement('p');
      place.className = 'rm-place';
      place.textContent = item.place;
      body.appendChild(place);
    }

    if (hasLink) {
      var link = document.createElement('span');
      link.className = 'card-link';
      link.textContent = 'Más información →';
      body.appendChild(link);
    }

    card.appendChild(body);

    var node = document.createElement('div');
    node.className = 'rm-node';
    var dot = document.createElement('span');
    dot.className = 'rm-dot';
    node.appendChild(dot);

    art.appendChild(card);
    art.appendChild(node);
    return art;
  }

  function renderTrack(track) {
    var items = (track.items || []).slice();
    var next = findNext(items);

    var states = items.map(function (item, i) {
      if (item.status === 'done' || (next > -1 && i < next)) return 'done';
      return i === next ? 'next' : 'future';
    });

    itemsEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    var row = 0;
    nextRow = -1;
    var total = items.length;

    for (var i = items.length - 1; i >= 0; i--) {
      if (states[i] === 'next') nextRow = row;
      var el = buildItem(items[i], states[i], (row % 2 === 0) ? 'left' : 'right');
      if (row >= VISIBLE_COUNT) el.classList.add('rm-hidden');
      frag.appendChild(el);
      row++;
    }

    itemsEl.appendChild(frag);
    if (introEl) introEl.textContent = track.intro || '';
    if (statusEl) {
      statusEl.textContent = total
        ? 'De abajo arriba: ' + total + ' paradas de ' + track.label + '.'
        : 'Todavía no hay fechas publicadas para ' + track.label + '.';
    }

    if (loadMoreBtn) loadMoreBtn.hidden = total <= VISIBLE_COUNT;

    schedulePath();
  }

  function nodePoints() {
    var box = wrapEl.getBoundingClientRect();
    var dots = itemsEl.querySelectorAll('.rm-item:not(.rm-hidden) .rm-dot');
    var pts = [];
    for (var i = 0; i < dots.length; i++) {
      var r = dots[i].getBoundingClientRect();
      pts.push({
        x: r.left - box.left + r.width / 2,
        y: r.top - box.top + r.height / 2
      });
    }
    return { pts: pts, w: box.width, h: box.height };
  }

  function zigzagVertices(pts, amp, seed) {
    var rnd = mulberry32(seed);
    var v = [];
    var first = pts[0];
    var last = pts[pts.length - 1];

    v.push({ x: first.x, y: Math.max(0, first.y - 46) });

    for (var i = 0; i < pts.length - 1; i++) {
      v.push(pts[i]);
      var a = pts[i], b = pts[i + 1];
      var steps = 3;
      for (var s = 1; s <= steps; s++) {
        var t = s / (steps + 1);
        var dir = (s % 2 === 0) ? 1 : -1;
        var jitter = amp * (0.5 + rnd() * 0.9) * dir;
        v.push({
          x: a.x + (b.x - a.x) * t + jitter,
          y: a.y + (b.y - a.y) * t
        });
      }
    }

    v.push(last);
    v.push({ x: last.x, y: last.y + 46 });
    return v;
  }

  function smoothPath(pts) {
    if (pts.length < 2) return 'M ' + (pts[0] ? pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1) : '0 0');
    var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6;
      var c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6;
      var c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' +
           c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' +
           p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }

  function lengthAtY(path, targetY, total) {
    var lo = 0, hi = total;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).y < targetY) lo = mid; else hi = mid;
    }
    return lo;
  }

  function drawPath() {
    var data = nodePoints();
    if (data.pts.length < 1 || !data.w) return;

    svgEl.setAttribute('viewBox', '0 0 ' + data.w + ' ' + data.h);
    svgEl.setAttribute('width', data.w);
    svgEl.setAttribute('height', data.h);

    var amp = Math.max(12, Math.min(42, data.w * 0.05));
    var seed = hash((current ? current.id : 'erveca') + '|' + Math.round(data.w / 40));
    var d = smoothPath(zigzagVertices(data.pts, amp, seed));

    pathBase.setAttribute('d', d);
    pathDone.setAttribute('d', d);

    var total = pathDone.getTotalLength();
    var cut = total;
    if (nextRow > -1 && data.pts[nextRow]) {
      cut = lengthAtY(pathDone, data.pts[nextRow].y, total);
    }
    pathDone.style.strokeDasharray = '0 ' + cut.toFixed(1) + ' ' + (total - cut).toFixed(1);
    pathDone.style.strokeDashoffset = 0;
  }

  var pathFrame = 0;
  function schedulePath() {
    cancelAnimationFrame(pathFrame);
    pathFrame = requestAnimationFrame(function () {
      requestAnimationFrame(drawPath);
    });
  }

  function scrollToNext(smooth) {
    var el = itemsEl.querySelector('.rm-item.is-next');
    if (!el) return;
    var y = window.pageYOffset + el.getBoundingClientRect().top - NAV_OFFSET;
    window.scrollTo({ top: Math.max(0, y), behavior: (smooth && !reduceMotion) ? 'smooth' : 'auto' });
  }

  function selectTrack(id, scroll) {
    var track = tracks.filter(function (t) { return t.id === id; })[0] || tracks[0];
    if (!track) return;
    current = track;

    var btns = tabsEl.querySelectorAll('.track-tab');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].dataset.track === track.id;
      btns[i].classList.toggle('btn-primary', on);
      btns[i].classList.toggle('btn-secondary', !on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }

    renderTrack(track);
    if (history.replaceState) history.replaceState(null, '', '#' + track.id);
    if (scroll !== false) requestAnimationFrame(function () { scrollToNext(true); });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      var hidden = itemsEl.querySelectorAll('.rm-item.rm-hidden');
      for (var i = 0; i < hidden.length; i++) hidden[i].classList.remove('rm-hidden');
      loadMoreBtn.hidden = true;
      schedulePath();
    });
  }

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (json) {
      tracks = (json && json.tracks) || [];
      if (!tracks.length) throw new Error('sin datos');
      renderTabs();
      var fromHash = (location.hash || '').replace('#', '');
      selectTrack(fromHash || tracks[0].id, !!fromHash);
    })
    .catch(function () {
      if (statusEl) statusEl.textContent = 'No hemos podido cargar las fechas. Recarga la página en un momento.';
    });

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(schedulePath, 120);
  });

  window.addEventListener('load', schedulePath);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePath);
})();
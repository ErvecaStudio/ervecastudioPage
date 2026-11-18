(function () {
  'use strict';

  var SUPPORTED = ['es', 'en', 'fr'];
  var SOURCE = 'es';
  var FALLBACK = 'en';
  var PAGE = document.documentElement.dataset.page;
  var NEEDS_JS = document.documentElement.hasAttribute('data-i18n-js');

  var dict = {};
  var lang = SOURCE;

  function storeGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }

  function pick() {
    var q = null;
    new URLSearchParams(location.search).forEach(function (v, k) {
      k = k.toLowerCase();
      if (!q && SUPPORTED.indexOf(k) > -1) q = k;
    });
    if (q) {
      storeSet('lang-test', q);
      return q;
    }

    var s = storeGet('lang-test');
    if (SUPPORTED.indexOf(s) > -1) return s;

    var langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    var n = langs
      .map(function (x) { return x.slice(0, 2).toLowerCase(); })
      .filter(function (x) { return SUPPORTED.indexOf(x) > -1; })[0];
    return n || FALLBACK;
  }

  var domReady = document.readyState === 'loading'
    ? new Promise(function (resolve) {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      })
    : Promise.resolve();

  var early = pick();
  if (early !== SOURCE) {
    document.documentElement.classList.add('i18n-pending');
    setTimeout(function () {
      document.documentElement.classList.remove('i18n-pending');
    }, 1500);
  }

  function t(key, vars) {
    vars = vars || {};
    var text = dict[key] != null ? dict[key] : key;
    return text.replace(/\{(\w+)\}/g, function (_, v) {
      return vars[v] != null ? vars[v] : '';
    });
  }

  function tr(o) {
    if (!o || typeof o !== 'object') return o;
    if (o[lang] != null) return o[lang];
    if (o[FALLBACK] != null) return o[FALLBACK];
    return o[SOURCE];
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-attr]').forEach(function (el) {
      var key = el.dataset.i18n;
      var html = el.dataset.i18nHtml;
      var attrs = el.dataset.i18nAttr;

      if (key && dict[key] != null) el.textContent = dict[key];
      if (html && dict[html] != null) el.innerHTML = dict[html];
      if (attrs) {
        attrs.split(';').forEach(function (pair) {
          var parts = pair.split(':');
          if (dict[parts[1]] != null) el.setAttribute(parts[0], dict[parts[1]]);
        });
      }
    });
    if (dict['meta.title']) document.title = dict['meta.title'];
  }

  function getJson(url) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .catch(function () {
        console.warn('i18n: no se pudo cargar', url);
        return {};
      });
  }

  function emit(l) {
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: l }));
  }

  function load(l) {
    lang = l;
    document.documentElement.lang = l;

    if (l === SOURCE && !NEEDS_JS) {
      emit(l);
      return Promise.resolve();
    }

    var files = ['common', PAGE].filter(Boolean);

    return Promise.all(files.map(function (f) {
      return getJson('/lang/' + l + '/' + f + '.json');
    }))
      .then(function (parts) {
        dict = Object.assign.apply(null, [{}].concat(parts));
        return domReady;
      })
      .then(function () {
        if (l !== SOURCE) apply();
        document.documentElement.classList.remove('i18n-pending');
        emit(l);
      });
  }

  var ready = load(early);

  window.i18n = {
    t: t,
    tr: tr,
    apply: apply,
    ready: ready,
    raw: function (key) { return dict[key]; },
    get lang() { return lang; }
  };
})();
/* Say Gracé · Secret Menu
   Everything on the page is rendered from menu.yaml — edit that file, not this one. */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LOGO_WIDTH = 467.29;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DEFAULTS = {
    currency: '₹',
    brand: { name: 'Say Gracé', tagline: 'Crafted with love, made to indulge.' },
    welcome: { enabled: true, eyebrow: 'Welcome to', message: 'Come on in — something sweet is waiting.' },
    hero: {
      whisper: 'psst… you found it',
      title: 'The *Secret* Menu',
      intro: '{Count} off-menu indulgences, made for those in the know. Ask for them by name — we’ll keep it between us.',
      cta: 'Take a peek',
      badge: 'The secret menu ✦ Say Gracé ✦ Shh, don’t tell ✦'
    },
    ribbon: [],
    items: [],
    how_to_order: { title: 'How to order', text: 'Just whisper the name at the counter — we’ll take it from there.' },
    footer: { thanks: 'Thank you for choosing', signoff: 'See you soon!' }
  };

  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  window.__menuBooted = true;

  // Always open on the welcome + hero; deep links (#secret-…) are honoured after the welcome.
  var initialHash = location.hash;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ---------- helpers ---------- */
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function merge(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (!isObj(extra)) return out;
    Object.keys(extra).forEach(function (k) {
      var v = extra[k];
      out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : (v == null ? '' : v);
    });
    return out;
  }

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function text(v) { return v == null ? '' : String(v).trim(); }

  function esc(s) {
    return text(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Escaped text with *word* → <em>word</em>
  function fmt(s) { return esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>'); }

  function plain(s) { return text(s).replace(/\*/g, ''); }

  var NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  // Replace {count} / {Count} in any copy with the number of menu items.
  function withCount(value, count) {
    if (typeof value === 'string') {
      var word = NUMBER_WORDS[count] || String(count);
      return value.replace(/\{count\}/g, word).replace(/\{Count\}/g, word.charAt(0).toUpperCase() + word.slice(1));
    }
    if (Array.isArray(value)) return value.map(function (v) { return withCount(v, count); });
    if (isObj(value)) {
      var out = {};
      Object.keys(value).forEach(function (k) { out[k] = k === 'items' ? value[k] : withCount(value[k], count); });
      return out;
    }
    return value;
  }

  function slug(s) {
    return plain(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'secret';
  }

  function safeColor(v, fallback) {
    var c = text(v);
    return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab)\([^;{}]*\)|[a-z]+)$/i.test(c) ? c : fallback;
  }

  function formatPrice(p) {
    if (typeof p === 'number') return p.toLocaleString('en-IN');
    return text(p);
  }

  /* ---------- data ---------- */
  function loadMenu() {
    var request = window.__menuRequest ||
      fetch('menu.yaml', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('menu.yaml: HTTP ' + r.status);
        return r.text();
      });

    var timeout = sleep(15000).then(function () { throw new Error('Timed out loading menu.yaml'); });

    return Promise.race([request, timeout]).then(function (src) {
      if (!window.jsyaml) throw new Error('The YAML parser (vendor/js-yaml.min.js) did not load.');
      var parsed = window.jsyaml.load(src) || {};
      var data = merge(DEFAULTS, parsed);
      data.items = Array.isArray(parsed.items) ? parsed.items.filter(isObj) : [];
      data.ribbon = Array.isArray(parsed.ribbon) ? parsed.ribbon.map(text).filter(Boolean) : [];
      return { data: withCount(data, data.items.length) };
    }).catch(function (error) {
      console.error('[Secret menu] Could not load menu.yaml → ' + (error && error.message || error));
      return { data: merge(DEFAULTS, {}), error: error };
    });
  }

  /* ---------- simple bindings ---------- */
  function bindText(data, scope) {
    $$('[data-bind]', scope).forEach(function (el) {
      if (scope === doc && welcome && welcome.contains(el)) return;
      var v = get(data, el.getAttribute('data-bind'));
      if (el.hasAttribute('data-format')) el.innerHTML = fmt(v);
      else el.textContent = text(v);
    });
  }

  function renderStatic(data) {
    bindText(data, doc);

    var whisper = $('.hero__whisper');
    if (whisper) whisper.hidden = !text(data.hero.whisper);
    var cta = $('.hero__cta');
    if (cta) cta.hidden = !text(data.hero.cta);
    var order = $('.order');
    if (order) order.hidden = !text(data.how_to_order.title) && !text(data.how_to_order.text);

    var badge = $('.badge__text textPath');
    if (badge) {
      var label = text(data.hero.badge).toUpperCase();
      badge.textContent = label ? label + ' ' : '';
      $('.badge').hidden = !label;
    }

    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- ribbon ---------- */
  function renderRibbon(words) {
    var ribbon = $('.ribbon');
    var track = $('.ribbon__track');
    if (!ribbon || !track) return;
    if (!words.length) { ribbon.hidden = true; return; }

    var group = words.map(function (w) {
      return '<span class="ribbon__item">' + esc(w) + '<svg aria-hidden="true"><use href="#i-sparkle"/></svg></span>';
    }).join('');

    function build() {
      track.innerHTML = group;
      var groupWidth = track.scrollWidth || 1;
      var copies = Math.max(1, Math.ceil((window.innerWidth * 1.2) / groupWidth));
      var half = new Array(copies + 1).join(group);
      track.innerHTML = half + half;
      // constant speed regardless of screen size / text length
      track.style.animationDuration = Math.round((groupWidth * copies) / 42) + 's';
    }

    build();
    var lastWidth = window.innerWidth;
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (Math.abs(window.innerWidth - lastWidth) > 40) { lastWidth = window.innerWidth; build(); }
      }, 200);
    });
  }

  /* ---------- items ---------- */
  function renderItems(items, currency) {
    var list = $('#secrets-list');
    if (!list) return [];
    list.innerHTML = '';
    var used = {};

    return items.map(function (item, i) {
      var n = String(i + 1).padStart(2, '0');
      var name = text(item.name) || 'Secret ' + n;
      var id = 'secret-' + slug(name);
      if (used[id]) id += '-' + n;
      used[id] = true;
      var cutout = text(item.image_style).toLowerCase() === 'cutout';
      var price = formatPrice(item.price);
      var badge = text(item.badge);
      var tagline = text(item.tagline);
      var desc = text(item.description);
      var image = text(item.image);
      var garnish = text(item.garnish);

      var li = doc.createElement('li');
      li.className = 'secret' + (reduceMotion ? '' : ' is-pending');
      li.id = id;
      li.style.setProperty('--tint', safeColor(item.tint, '#f3e6d3'));
      li.style.setProperty('--accent', safeColor(item.accent, '#612723'));
      li.style.setProperty('--n', String(i));

      li.innerHTML =
        '<article class="secret__card" aria-labelledby="' + id + '-name">' +
          '<div class="secret__media secret__media--' + (cutout ? 'cutout' : 'photo') + (image ? '' : ' is-missing') + '">' +
            '<span class="secret__num" aria-hidden="true">' + n + '</span>' +
            '<div class="secret__arch" aria-hidden="true"></div>' +
            (image ? '<div class="secret__float"><img class="secret__img" width="760" height="700" decoding="async"' + (i > 1 ? ' loading="lazy"' : '') + '></div>' : '') +
            (garnish ? '<div class="secret__garnish" aria-hidden="true"><img alt="" width="340" height="250" decoding="async" loading="lazy"></div>' : '') +
            (badge ? '<span class="secret__sticker">' + esc(badge) + '</span>' : '') +
          '</div>' +
          '<div class="secret__body">' +
            '<div class="secret__eyebrow" style="--i:0">' +
              '<span>Secret Nº ' + n + '</span>' +
              '<span class="secret__leader" aria-hidden="true"></span>' +
              (price ? '<p class="secret__price"><span class="sr-only">Price: </span><span class="cur">' + esc(currency) + '</span>' + esc(price) + '</p>' : '') +
            '</div>' +
            '<h2 class="secret__name" id="' + id + '-name" style="--i:1">' + fmt(name) + '</h2>' +
            (tagline ? '<p class="secret__tagline" style="--i:2">' + fmt(tagline) + '</p>' : '') +
            (desc ? '<p class="secret__desc" style="--i:3">' + fmt(desc) + '</p>' : '') +
          '</div>' +
        '</article>';

      var media = $('.secret__media', li);
      var img = $('.secret__img', li);
      if (img) {
        img.alt = text(item.image_alt) || plain(name);
        img.addEventListener('error', function () { media.classList.add('is-missing'); });
        img.src = image;
      }
      var gImg = $('.secret__garnish img', li);
      if (gImg) {
        gImg.addEventListener('error', function () { gImg.parentNode.remove(); });
        gImg.src = garnish;
      }

      list.appendChild(li);
      return {
        el: li,
        garnish: $('.secret__garnish', li),
        id: id,
        n: n,
        name: plain(name),
        image: image,
        cutout: cutout,
        tint: safeColor(item.tint, '#f3e6d3'),
        accent: safeColor(item.accent, '#612723')
      };
    });
  }

  function renderError(error) {
    var list = $('#secrets-list');
    if (!list) return;
    var local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
    var hint = location.protocol === 'file:'
      ? 'This page needs to be opened through a web server (see README.md) — browsers block reading menu.yaml from a local file.'
      : String(error && error.message || error);
    list.innerHTML =
      '<li class="menu-error"><strong>Our secrets are hiding…</strong>' +
      'We couldn’t load the menu just now. Please refresh in a moment.' +
      (local ? '<code>' + esc(hint) + '</code>' : '') + '</li>';
  }

  /* ---------- keyhole carousel ---------- */
  function setupKeyhole(entries) {
    var keyhole = $('#keyhole');
    var slidesG = $('.keyhole__slides');
    var caption = $('.keyhole__caption');
    var visual = $('.hero__visual');
    var slides = entries.filter(function (e) { return e.image; });
    if (!keyhole || !slidesG) return { start: function () {} };
    if (!slides.length) { visual.hidden = true; return { start: function () {} }; }

    slides.forEach(function (s) {
      var im = doc.createElementNS(SVG_NS, 'image');
      im.setAttribute('href', s.image);
      if (s.cutout) {
        im.setAttribute('x', '16'); im.setAttribute('y', '18');
        im.setAttribute('width', '168'); im.setAttribute('height', '156');
        im.setAttribute('preserveAspectRatio', 'xMidYMax meet');
      } else {
        im.setAttribute('x', '0'); im.setAttribute('y', '0');
        im.setAttribute('width', '200'); im.setAttribute('height', '320');
        im.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      }
      im.setAttribute('class', 'keyhole__slide');
      slidesG.appendChild(im);
      s.slide = im;
    });

    var current = -1;
    var timer = null;
    var visible = true;
    var started = false;
    var paused = false;
    var ticks = 0;
    var maxTicks = slides.length * 2; // rest after two rounds — a peek, not a slideshow

    // Skip slides whose image URL is broken.
    slides.forEach(function (s) {
      var probe = new Image();
      probe.onerror = function () {
        s.broken = true;
        s.slide.remove();
        if (slides.every(function (x) { return x.broken; })) { visual.hidden = true; clearInterval(timer); return; }
        if (slides[current] === s) tick();
      };
      probe.src = s.image;
    });
    var num = $('.keyhole__num');
    var nameEl = $('.keyhole__name');

    function show(i) {
      var prev = slides[current];
      var next = slides[i];
      if (prev) {
        prev.slide.classList.remove('is-active');
        prev.slide.classList.add('is-leaving');
        setTimeout(function (el) { el.classList.remove('is-leaving'); }, 900, prev.slide);
      }
      next.slide.classList.remove('is-leaving');
      next.slide.classList.add('is-active');
      keyhole.style.setProperty('--k-tint', next.tint);
      visual.style.setProperty('--k-accent', next.accent);

      if (caption) {
        caption.classList.add('is-swapping');
        setTimeout(function () {
          num.textContent = 'Nº ' + next.n;
          nameEl.textContent = next.name;
          caption.classList.remove('is-swapping');
        }, current === -1 ? 0 : 320);
      }
      current = i;
    }

    function tick() {
      for (var step = 1; step <= slides.length; step++) {
        var i = (current + step) % slides.length;
        if (!slides[i].broken) { if (i !== current) show(i); return; }
      }
    }

    function run() {
      clearInterval(timer);
      timer = null;
      if (started && visible && !paused && !doc.hidden && !reduceMotion && ticks < maxTicks &&
          slides.filter(function (s) { return !s.broken; }).length > 1) {
        timer = setInterval(function () {
          tick();
          if (++ticks >= maxTicks) clearInterval(timer);
        }, 2800);
      }
    }

    function pause(state) { paused = state; run(); }
    keyhole.addEventListener('pointerenter', function () { pause(true); });
    keyhole.addEventListener('pointerleave', function () { pause(false); });
    keyhole.addEventListener('focus', function () { pause(true); });
    keyhole.addEventListener('blur', function () { pause(false); });

    show(0);

    keyhole.addEventListener('click', function () {
      var target = slides[Math.max(current, 0)];
      var el = target && doc.getElementById(target.id);
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; run(); }).observe(keyhole);
    }
    doc.addEventListener('visibilitychange', run);

    return { start: function () { started = true; run(); } };
  }

  /* ---------- scroll: reveal, scrollspy, parallax, topbar ---------- */
  function setupNav(entries) {
    var nav = $('#topbar-nav');
    if (!nav) return [];
    nav.innerHTML = '';
    return entries.map(function (e) {
      var a = doc.createElement('a');
      a.className = 'topbar__dot';
      a.href = '#' + e.id;
      a.style.setProperty('--accent', e.accent);
      a.setAttribute('aria-label', 'Secret Nº ' + e.n + ': ' + e.name);
      a.innerHTML = '<span aria-hidden="true">' + e.n + '</span>';
      nav.appendChild(a);
      return a;
    });
  }

  function setupReveal(entries) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      entries.forEach(function (e) { e.el.classList.remove('is-pending'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('is-pending');
        e.target.classList.add('is-revealed');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -14% 0px', threshold: 0.08 });
    entries.forEach(function (e) { io.observe(e.el); });
  }

  function setupScroll(entries, dots) {
    var topbar = $('#topbar');
    var hero = $('.hero');
    var active = -2;
    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var mid = vh * 0.5;

      if (topbar && hero) topbar.classList.toggle('is-visible', hero.getBoundingClientRect().bottom < 40);

      var idx = -1;
      entries.forEach(function (e, i) {
        var r = e.el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) idx = i;
        if (!reduceMotion && e.garnish && r.bottom > -100 && r.top < vh + 100) {
          var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - mid) / vh));
          e.garnish.style.setProperty('--py', (p * -46).toFixed(1) + 'px');
          e.garnish.style.setProperty('--pr', (p * 14).toFixed(1) + 'deg');
        }
      });

      if (idx !== active) {
        active = idx;
        body.style.setProperty('--page-tint', idx >= 0 ? entries[idx].tint : 'var(--ivory)');
        dots.forEach(function (d, i) {
          d.classList.toggle('is-active', i === idx);
          if (i === idx) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        });
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- welcome ---------- */
  var welcome = $('#welcome');
  var welcomeDone = false;
  var welcomeTimer = null;
  var onEnter = [];

  function whenEntered(fn) { if (welcomeDone) fn(); else onEnter.push(fn); }

  function buildWelcomeLogo() {
    var symbol = doc.getElementById('sg-logo');
    var strokes = $('.welcome__strokes', welcome);
    var fills = $('.welcome__fills', welcome);
    var sub = $('.welcome__sub', welcome);
    if (!symbol || !strokes || strokes.childNodes.length) return;

    $$('.logo__script path', symbol).forEach(function (p) {
      var d = p.getAttribute('d');
      fills.appendChild(p.cloneNode(true));
      d.split(/(?=M)/).forEach(function (part) {
        var sp = doc.createElementNS(SVG_NS, 'path');
        sp.setAttribute('d', part);
        strokes.appendChild(sp);
      });
    });
    $$('.logo__sub path', symbol).forEach(function (p) { sub.appendChild(p.cloneNode(true)); });

    // write the script left → right
    $$('path', strokes).forEach(function (sp) {
      try {
        sp.style.setProperty('--len', sp.getTotalLength().toFixed(1));
        sp.style.setProperty('--d', (sp.getBBox().x / LOGO_WIDTH * 0.45).toFixed(3) + 's');
      } catch (e) { /* not rendered – the fill fade still runs */ }
    });
    $$('path', fills).forEach(function (fp) {
      try { fp.style.setProperty('--d', (fp.getBBox().x / LOGO_WIDTH * 0.45).toFixed(3) + 's'); } catch (e) {}
    });
  }

  function enter() {
    if (welcomeDone) return;
    welcomeDone = true;
    clearTimeout(welcomeTimer);
    $$('[inert]').forEach(function (el) { el.removeAttribute('inert'); });
    body.classList.remove('is-locked');
    body.classList.add('is-entered');

    if (welcome) {
      welcome.classList.add('is-leaving');
      var finish = function () { welcome.classList.add('is-gone'); };
      welcome.addEventListener('transitionend', function (e) { if (e.target === welcome) finish(); });
      setTimeout(finish, 1400);
    }

    onEnter.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { console.error('[Secret menu]', e); }
    });
  }

  function playWelcome(cfg) {
    if (welcomeDone) return;
    if (!welcome || cfg.enabled === false || cfg.enabled === 'false') {
      if (welcome) welcome.classList.add('is-gone');
      enter();
      return;
    }
    bindText({ welcome: cfg }, welcome);
    buildWelcomeLogo();
    // force a style flush so the stroke offsets apply before the animation starts
    void welcome.offsetWidth;
    welcome.classList.add('is-playing');
    welcomeTimer = setTimeout(enter, reduceMotion ? 1500 : 2000);
  }

  if (welcome) {
    welcome.addEventListener('pointerdown', enter);
    doc.addEventListener('keydown', function (e) {
      if (!welcomeDone && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        enter();
      }
    });
  }

  /* ---------- boot ---------- */
  // Wait (briefly) for the exact faces the welcome uses, so its text never swaps mid-animation.
  function fontsReady(maxWait) {
    if (!doc.fonts || !doc.fonts.load) return Promise.resolve();
    var link = doc.getElementById('fonts-css');
    var css = !link || link.media === 'all' ? Promise.resolve() : new Promise(function (resolve) {
      link.addEventListener('load', resolve);
      link.addEventListener('error', resolve);
    });
    var faces = ['500 12px Outfit', 'italic 400 20px Fraunces', '600 20px Fraunces', '600 24px Caveat'];
    return Promise.race([
      css.then(function () {
        return Promise.all(faces.map(function (f) { return doc.fonts.load(f).catch(function () {}); }));
      }),
      sleep(maxWait)
    ]);
  }

  var menuPromise = loadMenu();

  // Don't keep guests waiting on a slow connection: the welcome plays with defaults after 2.5s.
  Promise.race([menuPromise, sleep(2500).then(function () { return null; })])
    .then(function (early) {
      var cfg = early ? early.data.welcome : DEFAULTS.welcome;
      var skip = welcomeDone || cfg.enabled === false || cfg.enabled === 'false';
      return (skip ? Promise.resolve() : fontsReady(early ? 1200 : 0)).then(function () {
        playWelcome(cfg);
        return early || menuPromise;
      });
    })
    .then(function (result) {
      var data = result.data;
      renderStatic(data);
      renderRibbon(data.ribbon);

      if (result.error || !data.items.length) {
        ['.hero__visual', '.hero__intro', '.order'].forEach(function (sel) {
          var el = $(sel);
          if (el) el.hidden = true;
        });
        renderError(result.error || new Error('menu.yaml has no items.'));
        whenEntered(function () {});
        return;
      }

      var entries = renderItems(data.items, text(data.currency) || '₹');
      var dots = setupNav(entries);
      var keyhole = setupKeyhole(entries);
      setupScroll(entries, dots);
      whenEntered(function () {
        keyhole.start();
        setupReveal(entries);
        var id = initialHash.slice(1);
        try { id = decodeURIComponent(id); } catch (e) { /* keep raw */ }
        var target = id && doc.getElementById(id);
        if (target) setTimeout(function () { target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }, 400);
      });
    });
})();

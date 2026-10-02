/* ============================================================
   Lumen — landing page interactions
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Sticky nav shadow ---------- */
  var nav = $('#nav');
  var toggle = $('#navToggle');
  var links = $('#navLinks');

  function onScroll() {
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 2. Mobile menu ---------- */
  function closeMenu() {
    if (!links || !toggle) return;
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('a', links).forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', function (e) {
      if (links.classList.contains('is-open') && !links.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  /* ---------- 3. Reveal on scroll ---------- */
  var revealables = $$('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(function () { el.classList.add('is-in'); }, delay);
          io.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- 4. Animated counters ---------- */
  var counters = $$('[data-count]');

  function formatNum(value, decimals) {
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function runCount(el) {
    var target   = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix   = el.getAttribute('data-suffix') || '';
    var duration = 1500;
    var start    = null;

    if (reduceMotion) { el.textContent = formatNum(target, decimals) + suffix; return; }

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);          // easeOutCubic
      el.textContent = formatNum(target * eased, decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCount);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCount(entry.target);
          cio.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- 5. Pricing billing toggle ---------- */
  var toggleBtns = $$('.toggle__btn');

  function setPeriod(period) {
    toggleBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-period') === period;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    $$('.plan').forEach(function (plan) {
      var amt  = $('.amt', plan);
      var note = $('.plan__note', plan);
      if (!amt) return;
      var next = amt.getAttribute('data-' + period);
      if (note && note.getAttribute('data-' + period)) note.textContent = note.getAttribute('data-' + period);
      if (next === amt.textContent) return;

      amt.classList.add('is-swap');
      if (reduceMotion) {
        amt.textContent = next;
        amt.classList.remove('is-swap');
      } else {
        setTimeout(function () {
          amt.textContent = next;
          amt.classList.remove('is-swap');
        }, 160);
      }
    });
  }

  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { setPeriod(btn.getAttribute('data-period')); });
  });
  if (toggleBtns.length) setPeriod('monthly');

  /* ---------- 6. Trial / CTA forms ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function wireForm(formId, inputId, msgId) {
    var form = document.getElementById(formId);
    var input = document.getElementById(inputId);
    var msg = document.getElementById(msgId);
    if (!form || !input || !msg) return;

    input.addEventListener('input', function () { input.classList.remove('is-bad'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();

      if (!value) {
        msg.className = 'form__msg err';
        msg.textContent = 'Please enter your email address.';
        input.classList.add('is-bad');
        input.focus();
        return;
      }
      if (!EMAIL_RE.test(value)) {
        msg.className = 'form__msg err';
        msg.textContent = 'That does not look like a valid email address.';
        input.classList.add('is-bad');
        input.focus();
        return;
      }

      msg.className = 'form__msg ok';
      msg.textContent = '✓ Thanks! Check ' + value + ' for your invite link.';
      input.value = '';
      input.classList.remove('is-bad');
      input.blur();
    });
  }

  wireForm('trialForm', 'trialEmail', 'trialMsg');
  wireForm('ctaForm', 'ctaEmail', 'ctaMsg');

  /* ---------- 7. FAQ: one open at a time ----------
     Handled on 'click' (synchronous) rather than 'toggle' (async task) so a
     second item can never be left open alongside the first, even if the user
     clicks quickly. */
  var faqs = $$('.faq__item');
  faqs.forEach(function (item) {
    var summary = $('summary', item);
    if (!summary) return;
    summary.addEventListener('click', function () {
      if (item.open) return;                      // closing — nothing to do
      faqs.forEach(function (other) {
        if (other !== item && other.open) other.open = false;
      });
    });
  });

  /* ---------- 8. Footer year ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 9. Scroll-spy on nav links ---------- */
  var spyTargets = ['features', 'how', 'pricing', 'faq']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var spyLinks = $$('.nav__links a[href^="#"]').filter(function (a) {
    return a.getAttribute('href').length > 1 && a.getAttribute('href') !== '#hero';
  });

  if (spyTargets.length && spyLinks.length && 'IntersectionObserver' in window) {
    var visible = {};
    var currentSpy = null;
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var bestId = null, best = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > best) { best = visible[id]; bestId = id; }
      });
      // Only touch the DOM when the active section actually changes —
      // writing an identical style still fires a mutation record.
      if (bestId === currentSpy) return;
      currentSpy = bestId;
      spyLinks.forEach(function (a) {
        a.style.color = (bestId && a.getAttribute('href') === '#' + bestId) ? 'var(--brand-dark)' : '';
      });
    }, { threshold: [0.15, 0.4, 0.7], rootMargin: '-70px 0px -35% 0px' });
    spyTargets.forEach(function (el) { sio.observe(el); });
  }
})();
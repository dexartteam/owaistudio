/* Two-row native gallery: at most two visible videos per row, with random rotation. */
(() => {
  'use strict';
  const gallery = document.querySelector('[data-viral-gallery]');
  if (!gallery) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const items = Array.from(gallery.querySelectorAll('[data-viral-card]')).map(card => ({
    card,
    video: card.querySelector('video'),
    button: card.querySelector('[data-viral-play]'),
    fallback: card.querySelector('.viral-fallback'),
    row: card.dataset.row,
    visible: !('IntersectionObserver' in window),
    selected: false, manual: false, loaded: false,
    blocked: false, failed: false, attempt: null,
  }));
  const rows = [...new Set(items.map(item => item.row))];
  const scroller = gallery.querySelector('.viral-scroll');
  const scrollButtons = Array.from(gallery.querySelectorAll('[data-viral-scroll]'));
  let timer = null;
  let suspended = false;
  const automatic = () => !motion.matches && !connection?.saveData;
  const active = () => !document.hidden && !suspended;
  const allowed = item => item.manual || automatic();
  const eligible = item => item.visible && allowed(item) && !item.blocked && !item.failed;
  const wants = item => active() && item.selected && eligible(item);
  const shuffled = list => {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  function buttons(item) {
    const label = item.failed ? 'Повторить' : 'Запустить видео';
    item.button.hidden = !item.failed && !item.blocked && allowed(item);
    item.button.textContent = label;
    item.button.setAttribute('aria-label', `${label}: ${item.card.dataset.videoLabel}`);
    item.fallback.hidden = !item.failed;
  }

  function pause(item) {
    if (item.attempt) item.attempt.interrupted = true;
    item.video.pause();
    if (item.video.preload === 'auto') item.video.preload = 'metadata';
    // Keep the last decoded frame instead of flashing back to the poster.
  }

  function fail(item) {
    item.failed = true;
    item.selected = false;
    pause(item);
    item.card.classList.remove('has-frame');
    buttons(item);
  }

  function prime(item, preload = 'metadata') {
    item.video.preload = preload;
    if (item.loaded) return true;
    item.loaded = true;
    item.video.muted = true;
    item.video.defaultMuted = true;
    item.video.loop = true;
    item.video.playsInline = true;
    item.video.src = item.video.dataset.src;
    try { item.video.load(); }
    catch (_) { fail(item); return false; }
    return true;
  }

  function sync(item) {
    buttons(item);
    if (!wants(item)) { pause(item); return; }
    if (item.attempt || !item.video.paused) return;
    if (!prime(item, 'auto')) return;
    const attempt = { interrupted: false };
    item.attempt = attempt;
    let result;
    let aborted = false;
    try { result = item.video.play(); }
    catch (error) { result = Promise.reject(error); }
    Promise.resolve(result).then(() => {
      if (!wants(item)) pause(item);
    }).catch(error => {
      if (error?.name === 'AbortError') aborted = true;
      else if (error?.name === 'NotAllowedError') {
        item.blocked = true;
        item.selected = false;
        pause(item);
      } else fail(item);
    }).finally(() => {
      item.attempt = null;
      buttons(item);
      if (!wants(item)) pause(item);
      // A scroll/hide can abort play while the video becomes visible again.
      // Retry that interrupted request, but never loop on an unexplained abort.
      if (aborted) {
        if (attempt.interrupted && wants(item)) sync(item);
      } else reconcile();
    });
  }

  function canRotate() {
    return active() && automatic() && rows.some(row =>
      items.some(item => item.row === row && item.selected && !item.manual) &&
      items.some(item => item.row === row && !item.selected && eligible(item)));
  }

  function schedule() {
    if (!canRotate()) {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      return;
    }
    if (timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      if (!active()) return;
      for (const victim of shuffled(items.filter(item => item.selected && !item.manual))) {
        const next = shuffled(items.filter(item =>
          item.row === victim.row && !item.selected && eligible(item)))[0];
        if (!next) continue;
        victim.selected = false;
        pause(victim);
        next.selected = true;
        break;
      }
      reconcile();
    }, 3000 + Math.random() * 2000);
  }

  function reconcile() {
    if (!active()) {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      items.forEach(pause);
      return;
    }
    items.forEach(item => { if (!eligible(item)) item.selected = false; });
    for (const row of rows) {
      const selected = items.filter(item => item.row === row && item.selected);
      selected.slice(2).forEach(item => { item.selected = false; });
      let count = Math.min(selected.length, 2);
      for (const item of shuffled(items.filter(item =>
        item.row === row && !item.selected && eligible(item)))) {
        if (count >= 2) break;
        item.selected = true;
        count++;
      }
    }
    // Stop outgoing videos before starting replacements, including pending plays.
    items.filter(item => !item.selected).forEach(sync);
    items.filter(item => item.selected).forEach(sync);
    schedule();
  }

  items.forEach(item => {
    buttons(item);
    item.button.addEventListener('click', () => {
      item.manual = true;
      item.blocked = false;
      if (item.failed) {
        item.failed = false;
        item.loaded = false;
      }
      const others = items.filter(other =>
        other !== item && other.row === item.row && other.selected);
      if (others.length >= 2) {
        const victim = others.find(other => !other.manual) || others[0];
        victim.selected = false;
        pause(victim);
      }
      item.selected = true;
      reconcile();
    });
    item.video.addEventListener('playing', () => {
      if (!wants(item)) { pause(item); return; }
      item.video.preload = 'auto';
      item.card.classList.add('has-frame');
      buttons(item);
    });
    item.video.addEventListener('canplay', () => sync(item));
    item.video.addEventListener('error', () => { fail(item); reconcile(); });
  });

  if ('IntersectionObserver' in window) {
    const map = new Map(items.map(item => [item.card, item]));
    const preload = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = map.get(entry.target);
        if (!entry.isIntersecting || !active() || !allowed(item) || item.loaded) return;
        prime(item); // Only metadata; selected videos alone get preload="auto".
        preload.unobserve(item.card);
      });
    }, { rootMargin: '500px 0px' });
    const visible = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        map.get(entry.target).visible = entry.isIntersecting && entry.intersectionRatio >= .25;
      });
      reconcile();
    }, { threshold: [0, .25, 1] });
    // The default viewport root also clips cards inside horizontally scrolling rows.
    items.forEach(item => { preload.observe(item.card); visible.observe(item.card); });
  } else reconcile();
  document.addEventListener('visibilitychange', reconcile);
  motion.addEventListener('change', reconcile);
  connection?.addEventListener?.('change', reconcile);
  window.addEventListener('pagehide', () => { suspended = true; reconcile(); });
  window.addEventListener('pageshow', () => { suspended = false; reconcile(); });

  if (scroller) {
    const updateScrollButtons = () => {
      const end = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      scrollButtons.forEach(button => {
        button.disabled = Number(button.dataset.viralScroll) < 0
          ? scroller.scrollLeft <= 2 : scroller.scrollLeft >= end - 2;
      });
    };
    scrollButtons.forEach(button => button.addEventListener('click', () => {
      scroller.scrollBy({
        left: Number(button.dataset.viralScroll) * scroller.clientWidth * .8,
        behavior: motion.matches ? 'auto' : 'smooth',
      });
    }));
    scroller.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    window.addEventListener('load', updateScrollButtons);
    updateScrollButtons();
  }
})();

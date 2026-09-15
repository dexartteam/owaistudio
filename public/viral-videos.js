/* Two-row Vimeo gallery: muted playback rotates among visible examples. */
(() => {
  'use strict';
  const gallery = document.querySelector('[data-viral-gallery]');
  if (!gallery) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let timer = null;
  let suspended = false;
  const items = Array.from(gallery.querySelectorAll('[data-viral-card]')).map(card => ({
    card, frame: card.querySelector('iframe'), button: card.querySelector('[data-viral-play]'),
    fallback: card.querySelector('.viral-fallback'), row: card.dataset.row,
    visible: !('IntersectionObserver' in window), selected: false, manual: false,
    blocked: false, failed: false, player: null, ready: null, pending: false,
  }));
  const allowed = item => item.manual || (!motion.matches && !connection?.saveData);
  const eligible = item => item.visible && allowed(item) && !item.blocked && !item.failed;
  const wants = item => item.selected && eligible(item) && !document.hidden && !suspended;
  const shuffled = list => {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  function buttons(item) {
    item.button.hidden = item.failed || (!item.blocked && allowed(item));
    item.fallback.hidden = !item.failed;
    item.button.setAttribute('aria-label', `Запустить: ${item.frame.title}`);
  }
  function fail(item) {
    item.failed = true;
    item.selected = false;
    buttons(item);
    reconcile();
  }
  function ensure(item) {
    if (item.ready) return item.ready;
    item.frame.src = item.frame.dataset.src;
    if (!window.Vimeo?.Player) {
      item.failed = true;
      buttons(item);
      return Promise.resolve(false);
    }
    item.player = new window.Vimeo.Player(item.frame);
    item.ready = item.player.ready().then(async () => {
      await item.player.setAutopause(false);
      await item.player.setMuted(true);
      await item.player.setLoop(true);
      return true;
    }).catch(() => { fail(item); return false; });
    return item.ready;
  }
  function pause(item) {
    if (item.player) item.player.pause().catch(() => {});
  }
  function sync(item) {
    buttons(item);
    if (!wants(item)) { pause(item); return; }
    if (item.pending) return;
    item.pending = true;
    ensure(item).then(ready => {
      if (!ready || !wants(item)) return;
      return item.player.play();
    }).catch(error => {
      if (error?.name === 'NotAllowedError') {
        item.blocked = true;
        item.selected = false;
      } else if (error?.name !== 'AbortError') {
        item.failed = true;
        item.selected = false;
      }
    }).finally(() => {
      item.pending = false;
      if (!wants(item)) pause(item);
      buttons(item);
    });
  }
  function schedule() {
    if (timer !== null || document.hidden || suspended || !items.some(eligible)) return;
    timer = window.setTimeout(() => {
      timer = null;
      const victims = shuffled(items.filter(item => item.selected && !item.manual));
      for (const victim of victims) {
        const next = shuffled(items.filter(item => !item.selected && eligible(item) && item.row === victim.row))[0];
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
    if (document.hidden || suspended) {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      items.forEach(pause);
      return;
    }
    items.forEach(item => { if (!eligible(item)) item.selected = false; });
    for (const row of ['0', '1']) {
      const selected = items.filter(item => item.row === row && item.selected);
      selected.slice(2).forEach(item => { item.selected = false; });
      let count = items.filter(item => item.row === row && item.selected).length;
      for (const item of shuffled(items.filter(item => item.row === row && !item.selected && eligible(item)))) {
        if (count >= 2) break;
        item.selected = true;
        count++;
      }
    }
    items.filter(item => !item.selected).forEach(sync);
    items.filter(item => item.selected).forEach(sync);
    schedule();
  }
  items.forEach(item => {
    buttons(item);
    item.button.addEventListener('click', () => {
      item.manual = true;
      item.blocked = false;
      const sameRow = items.filter(other => other !== item && other.row === item.row && other.selected);
      if (sameRow.length >= 2) { sameRow[0].selected = false; pause(sameRow[0]); }
      item.selected = true;
      reconcile();
    });
  });
  if ('IntersectionObserver' in window) {
    const map = new Map(items.map(item => [item.card, item]));
    const preload = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const item = map.get(entry.target);
        ensure(item);
        preload.unobserve(item.card);
      });
    }, { rootMargin: '500px 0px' });
    const visible = new IntersectionObserver(entries => {
      entries.forEach(entry => { map.get(entry.target).visible = entry.isIntersecting && entry.intersectionRatio >= .25; });
      reconcile();
    }, { threshold: [0, .25, 1] });
    items.forEach(item => { preload.observe(item.card); visible.observe(item.card); });
  } else reconcile();
  document.addEventListener('visibilitychange', reconcile);
  motion.addEventListener('change', reconcile);
  connection?.addEventListener?.('change', reconcile);
  window.addEventListener('pagehide', () => { suspended = true; reconcile(); });
  window.addEventListener('pageshow', () => { suspended = false; reconcile(); });
})();

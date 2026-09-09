/* Native inline videos, with the same muted playback and poster fallback as the product cards. */
(() => {
  'use strict';

  const slots = Array.from(document.querySelectorAll('[data-native-player]'));
  if (!slots.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const items = slots.map(slot => ({
    slot,
    video: slot.querySelector('video'),
    button: slot.querySelector('[data-video-toggle]'),
    status: slot.querySelector('[data-video-status]'),
    visible: !('IntersectionObserver' in window),
    userMotion: null,
    loaded: false,
    pending: false,
    blocked: false,
    failed: false,
  }));
  const bySlot = new Map(items.map(item => [item.slot, item]));
  const motionAllowed = item => item.userMotion ??
    (!reducedMotion.matches && !connection?.saveData);
  const wantsPlay = item => item.visible && !document.hidden && motionAllowed(item);

  function prime(item) {
    if (item.loaded) return;
    item.loaded = true;
    item.video.muted = true;
    item.video.preload = 'auto';
    item.video.src = item.video.dataset.src;
    item.video.load();
  }

  function updateButton(item) {
    const active = wantsPlay(item) && !item.blocked && !item.failed;
    const label = item.failed ? 'Повторить' : active ? 'Остановить видео' : 'Запустить видео';
    item.button.textContent = label;
    item.button.setAttribute('aria-label', `${label}: ${item.slot.dataset.videoLabel}`);
    item.status.hidden = !item.failed;
  }

  function sync(item) {
    updateButton(item);
    if (!wantsPlay(item)) {
      item.video.pause();
      return;
    }
    if (item.pending || item.blocked || item.failed || !item.video.paused) return;
    prime(item);
    item.pending = true;
    let interrupted = false;
    let attempt;
    try { attempt = item.video.play(); }
    catch (error) { attempt = Promise.reject(error); }
    Promise.resolve(attempt).then(() => {
      if (!wantsPlay(item)) item.video.pause();
    }).catch(error => {
      if (error.name === 'NotAllowedError') item.blocked = true;
      else if (error.name === 'AbortError') interrupted = true;
      else item.failed = true;
    }).finally(() => {
      item.pending = false;
      updateButton(item);
      // Scrolling away can cancel a pending play; resume if the slot returned meanwhile.
      if (interrupted && wantsPlay(item)) sync(item);
    });
  }

  items.forEach(item => {
    item.button.hidden = false;
    item.button.addEventListener('click', () => {
      const active = wantsPlay(item) && !item.blocked && !item.failed;
      item.userMotion = !active;
      item.blocked = false;
      if (item.failed) {
        item.failed = false;
        item.loaded = false;
      }
      sync(item);
    });
    item.video.addEventListener('playing', () => {
      if (!wantsPlay(item)) {
        item.video.pause();
        return;
      }
      item.slot.classList.add('has-frame');
      updateButton(item);
    });
    item.video.addEventListener('error', () => {
      item.failed = true;
      item.slot.classList.remove('has-frame');
      updateButton(item);
    });
    item.video.addEventListener('canplay', () => sync(item));
    updateButton(item);
  });

  if ('IntersectionObserver' in window) {
    const preloadObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = bySlot.get(entry.target);
        if (entry.isIntersecting && motionAllowed(item) && !document.hidden) {
          prime(item);
          preloadObserver.unobserve(item.slot);
        }
      });
    }, { rootMargin: '900px 0px' });
    const playObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = bySlot.get(entry.target);
        item.visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        sync(item);
      });
    }, { threshold: [0, 0.25, 1] });
    items.forEach(item => {
      preloadObserver.observe(item.slot);
      playObserver.observe(item.slot);
    });
  } else items.forEach(sync);

  const syncAll = () => items.forEach(sync);
  document.addEventListener('visibilitychange', syncAll);
  reducedMotion.addEventListener('change', syncAll);
  connection?.addEventListener?.('change', syncAll);
  window.addEventListener('pagehide', () => items.forEach(item => item.video.pause()));
  window.addEventListener('pageshow', syncAll);
})();

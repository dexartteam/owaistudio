(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => reducedMotion.matches ? 'auto' : 'smooth';
  const tabs = Array.from(document.querySelectorAll('[data-series]'));
  function chooseSeries(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
    updateCarousel(document.getElementById(tab.getAttribute('aria-controls')));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseSeries(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        chooseSeries(tabs[next], true);
      }
    });
  });

  function updateCarousel(panel) {
    if (panel.hidden) return;
    const track = panel.querySelector('.carousel');
    const maxScroll = track.scrollWidth - track.clientWidth;
    panel.querySelector('[data-scroll="-1"]').disabled = track.scrollLeft < 3;
    panel.querySelector('[data-scroll="1"]').disabled = track.scrollLeft >= maxScroll - 3;
  }
  const panels = Array.from(document.querySelectorAll('.series-panel'));
  panels.forEach(panel => {
    const track = panel.querySelector('.carousel');
    const slideDistance = () => {
      const slides = track.querySelectorAll('.slide');
      return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
    };
    panel.querySelectorAll('[data-scroll]').forEach(button => {
      button.addEventListener('click', () => {
        track.scrollBy({ left: Number(button.dataset.scroll) * slideDistance(), behavior: scrollBehavior() });
      });
    });
    track.addEventListener('scroll', () => updateCarousel(panel), { passive: true });
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      track.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * slideDistance(), behavior: scrollBehavior() });
    });
    updateCarousel(panel);
  });
  window.addEventListener('resize', () => panels.forEach(updateCarousel), { passive: true });

  const dialog = document.getElementById('gallery-dialog');
  const dialogImage = document.getElementById('dialog-image');
  const dialogCaption = document.getElementById('dialog-caption');
  let gallerySlides = [];
  let galleryIndex = 0;
  let galleryTrigger = null;
  function showGalleryImage() {
    const slide = gallerySlides[galleryIndex];
    const image = slide.querySelector('img');
    dialogImage.src = image.currentSrc || image.src;
    dialogImage.alt = image.alt;
    dialogCaption.textContent = slide.dataset.caption;
  }
  function stepGallery(direction) {
    galleryIndex = (galleryIndex + direction + gallerySlides.length) % gallerySlides.length;
    showGalleryImage();
  }
  document.querySelectorAll('.slide').forEach(slide => {
    slide.addEventListener('click', () => {
      if (typeof dialog.showModal !== 'function') {
        window.open(slide.querySelector('img').src, '_blank', 'noopener');
        return;
      }
      gallerySlides = Array.from(slide.closest('[data-gallery]').querySelectorAll('.slide'));
      galleryIndex = gallerySlides.indexOf(slide);
      galleryTrigger = slide;
      showGalleryImage();
      dialog.showModal();
      document.body.classList.add('dialog-open');
      document.getElementById('dialog-close').focus();
    });
  });
  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  document.getElementById('dialog-prev').addEventListener('click', () => stepGallery(-1));
  document.getElementById('dialog-next').addEventListener('click', () => stepGallery(1));
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (galleryTrigger) galleryTrigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepGallery(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  let touchStart = null;
  const dialogMedia = dialog.querySelector('.dialog-media');
  dialogMedia.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    else touchStart = null;
  }, { passive: true });
  dialogMedia.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) stepGallery(dx < 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });

  if (document.getElementById('language-text')) {
  const languageCopy = {
    ru: ['У каждого бренда\nесть своя история.', 'Помогаем рассказать её людям, которые говорят на вашем языке.'],
    en: ['Every brand\nhas a story.', 'We help you share it with people in a language that feels familiar to them.'],
    de: ['Jede Marke\nhat ihre Geschichte.', 'Wir helfen Ihnen, sie Menschen in ihrer eigenen Sprache zu erzählen.']
  };
  const languageText = document.getElementById('language-text');
  const languageButtons = document.querySelectorAll('[data-language]');
  languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      const language = button.dataset.language;
      languageButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      languageText.lang = language;
      const heading = document.createElement('h3');
      const lines = languageCopy[language][0].split('\n');
      heading.append(lines[0], document.createElement('br'), lines[1]);
      const description = document.createElement('p');
      description.textContent = languageCopy[language][1];
      languageText.replaceChildren(heading, description);
    });
  });

  }

  if (document.getElementById('hero-video')) {
  const heroVideo = document.getElementById('hero-video');
  const motionButton = document.getElementById('motion-toggle');
  let motionAllowed = !reducedMotion.matches && !(navigator.connection && navigator.connection.saveData);
  let heroVisible = false;
  function syncMotionButton() {
    const playing = !heroVideo.paused;
    motionButton.textContent = playing ? 'Остановить движение' : 'Включить движение';
    motionButton.setAttribute('aria-pressed', String(playing));
  }
  function playHero() {
    const promise = heroVideo.play();
    if (promise && typeof promise.catch === 'function') promise.catch(syncMotionButton);
  }
  motionButton.addEventListener('click', () => {
    motionAllowed = heroVideo.paused;
    if (motionAllowed) playHero();
    else heroVideo.pause();
  });
  heroVideo.addEventListener('play', syncMotionButton);
  heroVideo.addEventListener('pause', syncMotionButton);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible && motionAllowed && !document.hidden) playHero();
      else heroVideo.pause();
    }, { threshold: 0.15 }).observe(heroVideo);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) heroVideo.pause();
    else if (heroVisible && motionAllowed) playHero();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      motionAllowed = false;
      heroVideo.pause();
    }
  });
  }

  // Product cards have their own controller and may play together.
  const videos = Array.from(document.querySelectorAll('video'))
    .filter(video => !video.closest('#owai-product-cards'));
  videos.forEach(video => video.addEventListener('play', () => {
    videos.forEach(other => { if (other !== video) other.pause(); });
  }));
})();

/* Vimeo slots: preload ahead of the viewport, start the moment a slot is fully visible. */
(function () {
  const slots = Array.from(document.querySelectorAll('.vplayer[data-vid]'));
  if (!slots.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MAX_CONCURRENT_LOADS = 3;
  const state = new Map();
  let loading = 0;
  const queue = [];

  slots.forEach(slot => {
    const id = slot.dataset.vid;
    if (slot.dataset.aspect && !slot.closest('.stage-main, .stage-person')) {
      slot.style.aspectRatio = slot.dataset.aspect;
    }
    state.set(slot, { id, player: null, ready: false, wantsPlay: false, queued: false });
  });

  function buildSrc(slot, id) {
    const params = new URLSearchParams({
      background: '1', muted: '1', loop: '1', autopause: '0', playsinline: '1',
      controls: '0', title: '0', byline: '0', portrait: '0', dnt: '1', autoplay: '1'
    });
    if (slot.dataset.hash) params.set('h', slot.dataset.hash);
    return 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?' + params.toString();
  }

  function pump() {
    while (loading < MAX_CONCURRENT_LOADS && queue.length) {
      queue.sort((a, b) => distance(a) - distance(b));
      mount(queue.shift());
    }
  }

  function distance(slot) {
    const r = slot.getBoundingClientRect();
    return Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
  }

  function mount(slot) {
    const st = state.get(slot);
    if (!st || st.player || typeof window.Vimeo === 'undefined') return;
    loading++;
    const holder = document.createElement('div');
    holder.className = 'vp-frame';
    slot.insertBefore(holder, slot.firstChild);
    const opts = {
      id: Number(st.id), background: true, muted: true, loop: true, autopause: false,
      controls: false, playsinline: true, title: false, byline: false, portrait: false,
      dnt: true, autoplay: true, responsive: false
    };
    if (slot.dataset.hash) opts.h = slot.dataset.hash;
    const player = new window.Vimeo.Player(holder, opts);

    st.player = player;
    const settle = () => {
      if (st.ready) return;
      st.ready = true;
      loading = Math.max(0, loading - 1);
      pump();
      if (st.wantsPlay) start(slot);
      else player.pause().catch(() => {});
    };
    setTimeout(settle, 8000); // never let a stalled embed block the queue
    player.ready().then(() => Promise.allSettled([
      player.setMuted(true),
      player.setLoop(true),
      typeof player.setControls === 'function' ? player.setControls(false) : Promise.resolve()
    ])).then(settle).catch(settle);
    player.on('bufferend', settle);
    player.on('playing', () => slot.classList.add('is-playing'));
  }

  function start(slot) {
    const st = state.get(slot);
    if (!st) return;
    st.wantsPlay = true;
    if (!st.player) { enqueue(slot); return; }
    st.player.play().then(() => slot.classList.add('is-playing')).catch(() => {});
  }

  function stop(slot) {
    const st = state.get(slot);
    if (!st) return;
    st.wantsPlay = false;
    if (st.player) st.player.pause().catch(() => {});
  }

  function enqueue(slot) {
    const st = state.get(slot);
    if (!st || st.player || st.queued) return;
    st.queued = true;
    queue.push(slot);
    pump();
  }

  function init() {
    // Hero slots are independent of viewport visibility: mount on page load and
    // play as soon as Vimeo is ready. Other slots keep the queued viewport flow.
    const eager = slots.filter(slot => slot.closest('.home-stage') || slot.dataset.eager === '1');
    eager.forEach(slot => { const st = state.get(slot); if (st) st.wantsPlay = true; enqueue(slot); });
    const deferred = slots.filter(slot => !eager.includes(slot));
    if (reduced.matches) return;
    if (!('IntersectionObserver' in window)) { deferred.forEach(enqueue); return; }
    const preloadObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { enqueue(e.target); preloadObserver.unobserve(e.target); } });
    }, { rootMargin: '900px 0px' });
    const shouldPlay = e => {
      if (!e.isIntersecting || document.hidden) return false;
      if (e.intersectionRatio >= 0.9) return true;
      // Slots taller than the viewport can never be 90% visible: play when they fill most of the screen.
      const r = e.intersectionRect;
      return r.height >= Math.min(e.boundingClientRect.height, window.innerHeight * 0.7);
    };
    const playObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (shouldPlay(e)) start(e.target); else stop(e.target); });
    }, { threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] });

    deferred.forEach(slot => { preloadObserver.observe(slot); playObserver.observe(slot); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) slots.forEach(s => { const st = state.get(s); if (st && st.player) st.player.pause().catch(() => {}); });
      else slots.forEach(s => { const st = state.get(s); if (st && st.wantsPlay) start(s); });
    });
  }

  if (typeof window.Vimeo !== 'undefined') init();
  else window.addEventListener('load', init);
})();

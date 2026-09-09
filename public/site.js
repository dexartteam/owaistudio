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

  // Decorative inline videos have independent controllers and may play together.
  const videos = Array.from(document.querySelectorAll('video'))
    .filter(video => !video.closest('#owai-product-cards, [data-native-player]'));
  videos.forEach(video => video.addEventListener('play', () => {
    videos.forEach(other => { if (other !== video) other.pause(); });
  }));
})();

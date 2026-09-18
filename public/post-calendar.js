/* Decorative calendar: no API calls or publishing actions. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const CYCLE_MS = 12300;
  const RESET_MS = 11750;

  document.querySelectorAll('[data-post-calendar]').forEach(calendar => {
    if (calendar.dataset.calendarReady) return;
    calendar.dataset.calendarReady = 'true';
    const posts = Array.from(calendar.querySelectorAll('[data-calendar-post]'))
      .sort((a, b) => Number(a.dataset.sequence) - Number(b.dataset.sequence));
    const counter = calendar.querySelector('[data-calendar-count]');
    const status = calendar.querySelector('[data-calendar-status]');
    if (!posts.length || !counter || !status) return;

    let visible = false;
    let pageActive = true;
    let running = false;
    let timer = null;
    let elapsed = 0;
    let startedAt = 0;
    let cursor = 0;
    let filled = 0;
    const events = posts.map((post, index) => ({ at: 650 + index * 500, post }));
    events.push({ at: RESET_MS, reset: true });

    const paintCount = () => {
      counter.textContent = String(filled);
      calendar.style.setProperty('--calendar-progress', String(filled / posts.length));
      status.textContent = filled === posts.length ? 'Неделя спланирована' : 'Собираем расписание';
    };

    const empty = () => {
      posts.forEach(post => post.classList.remove('is-filled'));
      calendar.classList.remove('is-resetting');
      cursor = 0;
      filled = 0;
      paintCount();
    };

    const pause = () => {
      if (running) elapsed += performance.now() - startedAt;
      running = false;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };

    const tick = () => {
      timer = null;
      if (!running) return;
      const now = performance.now();
      let position = elapsed + now - startedAt;
      if (position >= CYCLE_MS) {
        empty();
        elapsed = 0;
        startedAt = now;
        position = 0;
      }
      while (cursor < events.length && events[cursor].at <= position) {
        const event = events[cursor++];
        if (event.reset) {
          calendar.classList.add('is-resetting');
          status.textContent = 'Следующая неделя';
          calendar.style.setProperty('--calendar-progress', '0');
        } else {
          event.post.classList.add('is-filled');
          filled++;
          paintCount();
        }
      }
      const next = cursor < events.length ? events[cursor].at : CYCLE_MS;
      timer = window.setTimeout(tick, Math.max(16, next - position));
    };

    const sync = () => {
      if (reducedMotion.matches || !visible || document.hidden || !pageActive) {
        pause();
        return;
      }
      if (running) return;
      running = true;
      startedAt = performance.now();
      tick();
    };

    const setMotion = () => {
      pause();
      elapsed = 0;
      if (reducedMotion.matches) {
        calendar.classList.remove('is-animated', 'is-resetting');
        posts.forEach(post => post.classList.add('is-filled'));
        filled = posts.length;
        paintCount();
      } else {
        calendar.classList.add('is-animated');
        empty();
        sync();
      }
    };

    // Without IntersectionObserver, retain the complete static illustration.
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        sync();
      });
    }, { threshold: [0, 0.15] });
    setMotion();
    observer.observe(calendar);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { pageActive = false; pause(); });
    window.addEventListener('pageshow', () => { pageActive = true; sync(); });
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', setMotion);
    else reducedMotion.addListener(setMotion);
  });
})();

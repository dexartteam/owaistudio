(() => {
  'use strict';
  const header = document.querySelector('.unified-header');
  const menuButton = header.querySelector('.menu-toggle');
  const nav = header.querySelector('#navigation');
  const toggles = Array.from(header.querySelectorAll('[data-menu-toggle]'));
  const mobile = window.matchMedia('(max-width: 1000px)');

  function closeDropdowns(except = null) {
    toggles.forEach(button => {
      if (button === except) return;
      button.setAttribute('aria-expanded', 'false');
      document.getElementById(button.getAttribute('aria-controls')).hidden = true;
    });
  }
  function closeNavigation() {
    menuButton.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    closeDropdowns();
  }
  function openDropdown(button) {
    closeDropdowns(button);
    button.setAttribute('aria-expanded', 'true');
    document.getElementById(button.getAttribute('aria-controls')).hidden = false;
  }
  menuButton.addEventListener('click', () => {
    const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(willOpen));
    nav.classList.toggle('open', willOpen);
    if (!willOpen) closeDropdowns();
  });
  toggles.forEach(button => {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-expanded') === 'true') closeDropdowns();
      else openDropdown(button);
    });
    button.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      openDropdown(button);
      document.getElementById(button.getAttribute('aria-controls')).querySelector('a').focus();
    });
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeNavigation();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const expanded = toggles.find(button => button.getAttribute('aria-expanded') === 'true');
    if (expanded) {
      closeDropdowns();
      expanded.focus();
    } else if (nav.classList.contains('open')) {
      closeNavigation();
      menuButton.focus();
    }
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeNavigation();
  });
  header.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!header.contains(document.activeElement)) closeDropdowns();
    }, 0);
  });
  if (mobile.addEventListener) mobile.addEventListener('change', closeNavigation);

  const groups = new Map();
  document.querySelectorAll('[data-content-tab]').forEach(button => {
    const key = button.dataset.contentTab;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(button);
  });
  groups.forEach(buttons => {
    function activate(button, moveFocus = false) {
      buttons.forEach(item => {
        const active = item === button;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
      });
      if (moveFocus) button.focus();
    }
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => activate(button));
      button.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = (index + 1) % buttons.length;
        if (event.key === 'ArrowLeft') target = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = buttons.length - 1;
        if (target !== undefined) {
          event.preventDefault();
          activate(buttons[target], true);
        }
      });
    });
  });
})();

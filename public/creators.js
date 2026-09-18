/* Static contact flow: composing a message never submits it to a server. */
(() => {
  'use strict';
  const form = document.querySelector('[data-creator-form]');
  if (!form) return;
  const result = document.querySelector('[data-creator-result]');
  const message = document.querySelector('[data-creator-message]');
  const emailLink = document.querySelector('[data-creator-email]');
  const status = document.querySelector('[data-creator-status]');
  const copy = document.querySelector('[data-creator-copy]');
  const normalize = (value) => String(value || '').trim().replace(/[\r\n]+/g, ' ');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = normalize(data.get('creator-name'));
    const subject = `Креатор OWAI — ${name}`;
    const body = [
      'Здравствуйте! Хочу обсудить сотрудничество с OWAI.',
      '',
      `Имя: ${name}`,
      `Профиль / портфолио: ${normalize(data.get('creator-profile'))}`,
      `Интересующий формат: ${normalize(data.get('creator-format'))}`,
      '',
      'Идея и примеры:',
      String(data.get('creator-idea') || '').trim() || 'Хочу обсудить идею вместе.',
      '',
      'Буду рад(а) обсудить формат, сроки и условия сотрудничества.',
    ].join('\n');
    message.value = `Кому: hello@owai.studio\nТема: ${subject}\n\n${body}`;
    emailLink.href = `mailto:hello@owai.studio?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    result.hidden = false;
    status.textContent = 'Письмо подготовлено. Оно ещё не отправлено.';
    emailLink.focus();
  });
  copy.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(message.value);
      status.textContent = 'Письмо скопировано. Вставьте его в почту и отправьте на hello@owai.studio.';
    } catch (_) {
      message.focus();
      message.select();
      status.textContent = 'Текст выделен — скопируйте его и отправьте на hello@owai.studio.';
    }
  });
})();

(function() {
  'use strict';

  async function getBotUsername() {
    try {
      const resp = await fetch('/api/public-config', { cache: 'no-store' });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data && data.botUsername ? String(data.botUsername) : null;
    } catch (e) {
      return null;
    }
  }

  function openTelegramLink(url) {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.openTelegramLink === 'function') {
      try { tg.openTelegramLink(url); } catch (e) {}
      return;
    }
    if (tg && typeof tg.openLink === 'function') {
      try { tg.openLink(url); } catch (e) {}
      return;
    }
    window.location.href = url;
  }

  async function onDepositClick(e) {
    e.preventDefault();
    const botUsername = await getBotUsername();
    const username = botUsername || 'TwinsHelperBot';
    openTelegramLink(`https://t.me/${username}?start=deposit`);
  }

  function init() {
    const btn = document.querySelector('.deposit-button');
    if (!btn) return;
    btn.style.cursor = 'pointer';
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    btn.addEventListener('click', onDepositClick);
    btn.addEventListener('pointerup', onDepositClick);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onDepositClick(e);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

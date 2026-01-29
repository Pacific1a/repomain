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
 
  function deriveBotUsernameFromDom() {
    const candidates = [
      '.bot .text-wrapper-3',
      '.bot',
      '[data-bot-username]',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      const raw = (el && (el.getAttribute('data-bot-username') || el.textContent)) ? String(el.getAttribute('data-bot-username') || el.textContent) : '';
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      if (withoutAt) return withoutAt;
    }
    return null;
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
 
  let cachedUsername = null;
  let usernameFetchStarted = false;

  function prefetchUsername() {
    if (usernameFetchStarted) return;
    usernameFetchStarted = true;
    getBotUsername().then((u) => {
      if (u) cachedUsername = u;
    }).catch(() => {});
  }

  function goDeposit(e) {
     if (e) {
       e.preventDefault?.();
       e.stopPropagation?.();
     }
    const username = cachedUsername || deriveBotUsernameFromDom() || 'TwinsHelperBot';
     openTelegramLink(`https://t.me/${username}?start=deposit`);
   }
 
   function findDepositRoot(target) {
     if (!target || !(target instanceof Element)) return null;
     const root = target.closest('.add-funds, .deposit-button, [data-deposit]');
     if (root) return root;
 
     const link = target.closest('a');
     if (link) {
       const text = (link.textContent || '').trim().toLowerCase();
       if (text === 'deposite' || text.includes('deposite')) return link;
     }
 
     const elText = (target.textContent || '').trim().toLowerCase();
     if (elText === 'deposite' || elText.includes('deposite')) return target;
 
     return null;
   }
 
   function install() {
    cachedUsername = deriveBotUsernameFromDom() || cachedUsername;
    prefetchUsername();

     document.addEventListener('click', (e) => {
       const root = findDepositRoot(e.target);
       if (!root) return;
       goDeposit(e);
     }, true);
 
     document.addEventListener('pointerup', (e) => {
       const root = findDepositRoot(e.target);
       if (!root) return;
       goDeposit(e);
     }, true);
 
     document.addEventListener('keydown', (e) => {
       if (e.key !== 'Enter' && e.key !== ' ') return;
       const root = findDepositRoot(e.target);
       if (!root) return;
       goDeposit(e);
     }, true);
 
     const candidates = document.querySelectorAll('.add-funds, .deposit-button, [data-deposit]');
     candidates.forEach((el) => {
       try {
         el.style.cursor = 'pointer';
         el.setAttribute('role', 'button');
         if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        const link = el.matches('a') ? el : el.querySelector('a');
        if (link && link.getAttribute('href') === '') link.setAttribute('href', '#');
       } catch (e) {}
     });
   }
 
   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', install);
   } else {
     install();
   }
 })();

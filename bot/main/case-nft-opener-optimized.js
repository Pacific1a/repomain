// NFT Case Opener - SMOOTH LONG ANIMATION
// Идеально плавная длинная анимация без рывков
(function() {
  'use strict';

  const CASE_MAPPING = {
    279: 279, 329: 329, 389: 389, 419: 419, 479: 479,
    529: 529, 659: 659, 777: 777, 819: 819, 939: 939, 999: 999
  };

  const configCache = {};
  let currentCase = null;
  let currentCaseType = null;
  let isSpinning = false;
  let wonPrize = null;
  let isPrizeCollected = false;
  const isCoarsePointer = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  let pausedMainConveyor = false;
  let modalOpen = false;
  let exitLocked = false;
  let modalHistoryPushed = false;
  let popstateBound = false;
  let tgBackHandler = null;

  function getExitButton() {
    return document.querySelector('.modal-window .exit');
  }

  function syncExitUi() {
    const exitBtn = getExitButton();
    if (!exitBtn) return;
    exitBtn.style.pointerEvents = exitLocked ? 'none' : '';
    exitBtn.style.opacity = exitLocked ? '0.45' : '';
    exitBtn.style.filter = exitLocked ? 'grayscale(1)' : '';
  }

  function setExitLocked(nextLocked) {
    exitLocked = !!nextLocked;
    syncExitUi();
  }

  function pushModalHistory() {
    if (modalHistoryPushed) return;
    try {
      history.pushState({ caseModal: true }, '');
      modalHistoryPushed = true;
    } catch (e) {}
  }

  function attemptCloseModal() {
    if (exitLocked) return;
    closeModal();
  }

  function onPopState() {
    if (!modalOpen) return;
    if (exitLocked) {
      pushModalHistory();
      return;
    }
    attemptCloseModal();
  }

  function bindBackInterception() {
    if (!popstateBound) {
      window.addEventListener('popstate', onPopState);
      popstateBound = true;
    }
    pushModalHistory();

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      tg.BackButton.show();
      tgBackHandler = () => {
        if (exitLocked) return;
        attemptCloseModal();
      };
      if (typeof tg.BackButton.onClick === 'function') {
        tg.BackButton.onClick(tgBackHandler);
      }
    }
  }

  function unbindBackInterception() {
    if (popstateBound) {
      window.removeEventListener('popstate', onPopState);
      popstateBound = false;
    }

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      if (tgBackHandler && typeof tg.BackButton.offClick === 'function') {
        tg.BackButton.offClick(tgBackHandler);
      }
      tgBackHandler = null;
      tg.BackButton.hide();
    }

    if (modalHistoryPushed) {
      const shouldBack = !!(history?.state && history.state.caseModal);
      modalHistoryPushed = false;
      if (shouldBack) {
        try {
          history.back();
        } catch (e) {}
      }
    }
  }

  function parseColorToRgb(color) {
    const c = String(color || '').trim();
    if (!c) return null;

    const hex = c.startsWith('#') ? c.slice(1) : c;
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b];
    }
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    }

    const m = c.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*(?:0|1|0?\.[0-9]+))?\s*\)$/i);
    if (m) {
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
      return [r, g, b];
    }
    return null;
  }

  function setRarityVars(card, prize) {
    const rarity = prize?.rarity;
    const rarityColor = prize?.rarityColor;
    if (rarityColor) {
      card.style.setProperty('--rarity-color', rarityColor);
      const rgb = parseColorToRgb(rarityColor);
      if (rgb) {
        card.style.setProperty('--rarity-color-rgb', `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`);
        return;
      }
    }

    const fallback = {
      divine: [218, 143, 74],
      mythical: [190, 58, 65],
      legendary: [195, 47, 128],
      epic: [142, 77, 222],
      rare: [79, 102, 227],
      common: [124, 148, 174]
    };
    const f = fallback[String(rarity || '').toLowerCase()];
    if (f) {
      card.style.setProperty('--rarity-color-rgb', `${f[0]}, ${f[1]}, ${f[2]}`);
    }
  }

  function pauseBackgroundAnimations() {
    const conveyor = window.MainSmoothConveyor;
    if (conveyor && typeof conveyor.pause === 'function') {
      conveyor.pause();
      pausedMainConveyor = true;
    }
  }

  function resumeBackgroundAnimations() {
    if (!pausedMainConveyor) return;
    pausedMainConveyor = false;
    const conveyor = window.MainSmoothConveyor;
    if (conveyor && typeof conveyor.resume === 'function') {
      conveyor.resume();
    }
  }

  function preloadImage(src, timeoutMs = 1200) {
    return new Promise((resolve) => {
      if (!src) {
        resolve();
        return;
      }
      const img = new Image();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      const t = setTimeout(finish, timeoutMs);
      img.onload = () => {
        if (typeof img.decode === 'function') {
          Promise.race([
            img.decode().catch(() => {}),
            new Promise((r) => setTimeout(r, timeoutMs))
          ]).finally(() => {
            clearTimeout(t);
            finish();
          });
        } else {
          clearTimeout(t);
          finish();
        }
      };
      img.onerror = () => {
        clearTimeout(t);
        finish();
      };
      img.src = src;
    });
  }

  function waitForImagesInElement(root, timeoutMs = 5000) {
    const imgs = Array.from(root?.querySelectorAll?.('img') || []);
    if (!imgs.length) return Promise.resolve();

    const waitOne = (img) => new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      const t = setTimeout(finish, timeoutMs);

      const onLoad = () => {
        if (typeof img.decode === 'function') {
          Promise.race([
            img.decode().catch(() => {}),
            new Promise((r) => setTimeout(r, timeoutMs))
          ]).finally(() => {
            clearTimeout(t);
            finish();
          });
        } else {
          clearTimeout(t);
          finish();
        }
      };

      const onError = () => {
        clearTimeout(t);
        finish();
      };

      if (img.complete && img.naturalWidth > 0) {
        onLoad();
        return;
      }

      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
    });

    return Promise.all(imgs.map(waitOne)).then(() => {});
  }

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function createSpinCard(prize, sizePx) {
    const card = createPrizeCard(prize);
    card.style.width = `${sizePx}px`;
    card.style.height = `${sizePx}px`;
    card.style.flexShrink = '0';
    card.style.willChange = 'transform';
    return card;
  }

  async function loadCaseConfig(casePrice) {
    if (configCache[casePrice]) {
      return configCache[casePrice];
    }
    
    try {
      const response = await fetch(`main/content-case/${casePrice}/config.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const config = await response.json();
      configCache[casePrice] = config;
      console.log(`✅ Конфиг кейса ${casePrice}₽ загружен`);
      return config;
    } catch (error) {
      console.error(`❌ Ошибка загрузки конфига ${casePrice}:`, error);
      return null;
    }
  }

  function initCaseOpener() {
    console.log('🎰 Initializing SMOOTH long case opener...');
    
    const cards = document.querySelectorAll('.case-card .cards');
    const modal = document.querySelector('.modal-window');
    const exitBtn = modal?.querySelector('.exit');
    const openBtn = modal?.querySelector('.open-btn button');
    const keepBtn = modal?.querySelector('.keep-it button');
    
    if (!cards.length || !modal) {
      console.error('❌ Required elements not found!');
      return;
    }

    modal.style.display = 'none';

    cards.forEach((card) => {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        openCaseModal(card);
      });
    });

    if (exitBtn) exitBtn.addEventListener('click', attemptCloseModal);
    if (openBtn) openBtn.addEventListener('click', spinCase);
    if (keepBtn) keepBtn.addEventListener('click', keepPrize);

    console.log(`✅ Smooth long opener ready for ${cards.length} cases`);
  }

  async function openCaseModal(card) {
    const price = parseFloat(card.getAttribute('data-price')) || 0;
    const isChipsCase = card.getAttribute('data-chips') === 'true';
    const caseName = card.querySelector('.text-block h4')?.textContent || 'Case';
    const caseStyle = card.querySelector('.text-block h4')?.getAttribute('style') || '';

    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal-window');
    const caseLoader = document.getElementById('case-loader');
    const modalContent = modal.querySelector('.modal-window-content');
    const titleWindow = modal.querySelector('.title-window span');
    const itemPreview = modal.querySelector('.item-preview-item');
    const contentWindow = modal.querySelector('.content-window-item');
    const winWindow = modal.querySelector('.win-window');
    
    if (modalOverlay) modalOverlay.classList.add('loading-state');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    pauseBackgroundAnimations();
    modalOpen = true;
    setExitLocked(false);
    bindBackInterception();
    
    if (modalContent) {
      modalContent.style.opacity = '0';
      modalContent.style.visibility = 'hidden';
    }
    
    if (caseLoader) caseLoader.classList.add('active');

    if (titleWindow) {
      titleWindow.setAttribute('style', caseStyle);
      titleWindow.textContent = caseName;
    }

    if (itemPreview) itemPreview.innerHTML = '';
    if (winWindow) {
      winWindow.style.display = 'none';
      winWindow.style.opacity = '0';
      const winWindowItem = winWindow.querySelector('.win-window-item');
      if (winWindowItem) winWindowItem.innerHTML = '';
    }

    const config = await loadCaseConfig(price);
    if (!config || !config.prizes || config.prizes.length === 0) {
      if (caseLoader) caseLoader.classList.remove('active');
      if (modalOverlay) modalOverlay.classList.remove('loading-state');
      if (modalContent) {
        modalContent.style.opacity = '1';
        modalContent.style.visibility = 'visible';
      }
      setExitLocked(false);
      alert('Конфигурация кейса не найдена!');
      return;
    }

    currentCaseType = config.caseType || null;
    currentCase = { price, isChipsCase, caseName, caseStyle, prizes: config.prizes, card };

    if (contentWindow) contentWindow.innerHTML = '';

    await displayPrizesPreview(itemPreview, config.prizes);
    await waitForImagesInElement(itemPreview, 6000);
    await nextPaint();

    if (caseLoader) caseLoader.classList.remove('active');
    if (modalOverlay) modalOverlay.classList.remove('loading-state');
    if (modalContent) {
      modalContent.style.opacity = '1';
      modalContent.style.visibility = 'visible';
    }

    isSpinning = false;
    wonPrize = null;
    isPrizeCollected = false;
    updateOpenButton();
  }

  async function displayPrizesPreview(container, prizes) {
    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
    container.style.gap = '10px';
    container.style.padding = '10px';
    container.style.justifyItems = 'center';
    
    const sortedPrizes = [...prizes].sort((a, b) => b.price - a.price);

    let lastCard = null;
    sortedPrizes.forEach((prize) => {
      const prizeCard = createPrizeCard(prize);
      const img = prizeCard.querySelector('img.prize-image');
      if (img) img.loading = 'eager';
      container.appendChild(prizeCard);
      lastCard = prizeCard;
    });

    await nextPaint();
    if (!lastCard) return;

    const containerWidth = container.clientWidth;
    const cardWidth = 110;
    const itemsPerRow = Math.max(1, Math.floor(containerWidth / cardWidth));
    const itemsInLastRow = sortedPrizes.length % itemsPerRow || itemsPerRow;
    if (itemsInLastRow === 1) {
      lastCard.style.gridColumn = '1 / -1';
      lastCard.style.justifySelf = 'center';
    }
  }

  function createPrizeCard(prize) {
    const card = document.createElement('div');
    card.className = 'prize-card';
    card.setAttribute('data-rarity', prize.rarity);
    setRarityVars(card, prize);
    
    if (currentCaseType === 'chips') {
      card.setAttribute('data-case-type', 'chips');
    }
    
    const currencyIcon = currentCaseType === 'chips' ? 'main/assets/chips.png' : 'main/assets/rubles.png';
    const currencyAlt = currentCaseType === 'chips' ? 'Chips' : '₽';

    const badge = document.createElement('div');
    badge.className = 'prize-price-badge';

    const icon = document.createElement('img');
    icon.className = 'prize-currency-icon';
    icon.src = currencyIcon;
    icon.alt = currencyAlt;
    icon.loading = 'lazy';
    icon.decoding = 'async';

    const value = document.createElement('span');
    value.className = 'prize-price-value';
    value.textContent = String(prize.price);

    badge.append(icon, value);

    const img = document.createElement('img');
    img.className = 'prize-image';
    img.src = prize.image;
    img.alt = `Prize ${prize.price}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;border-radius:12px;';

    card.append(badge, img);

    return card;
  }

  async function spinCase() {
    if (isSpinning || !currentCase) return;

    let balance = 0;
    
    try {
      const tgWebApp = window.Telegram?.WebApp;
      const tgUser = tgWebApp?.initDataUnsafe?.user;
      const telegramId = tgUser?.id || '1889923046';
      
      const response = await fetch(`https://duopartners.xyz/api/balance/${telegramId}`);
      
      if (response.ok) {
        const data = await response.json();
        balance = currentCase.isChipsCase ? (data.chips || 0) : (data.rubles || 0);
      } else {
        alert('Ошибка загрузки баланса!');
        return;
      }
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      alert('Ошибка проверки баланса!');
      return;
    }
    
    if (balance < currentCase.price) {
      alert(`Недостаточно средств!`);
      return;
    }

    isSpinning = true;
    setExitLocked(true);
    const openBtn = document.querySelector('.open-btn button');
    if (openBtn) {
      openBtn.disabled = true;
      openBtn.style.opacity = '0.5';
    }

    wonPrize = selectWinningPrize(currentCase.prizes);
    console.log('🎰 Выбран приз:', wonPrize);

    try {
      await deductBalance(currentCase.price, currentCase.isChipsCase);
    } catch (error) {
      console.error('Ошибка списания баланса:', error);
      isSpinning = false;
      setExitLocked(false);
      if (openBtn) {
        openBtn.disabled = false;
        openBtn.style.opacity = '1';
      }
      return;
    }

    await playSmoothLongAnimation(wonPrize);
    await showWinScreen(wonPrize);

    isSpinning = false;
  }

  // ================================
  // 🎰 ИДЕАЛЬНО ПЛАВНАЯ АНИМАЦИЯ
  // ================================
  
  async function playSmoothLongAnimation(prize) {
    const totalCards = isCoarsePointer ? 24 : 35;
    const winIndex = isCoarsePointer ? 18 : 30;
    const gap = isCoarsePointer ? 4 : 6;
    const itemSize = isCoarsePointer ? 92 : 110;
    const durationMs = isCoarsePointer ? 6200 : 8000;

    const carouselPrizes = [];
    for (let i = 0; i < totalCards; i++) {
      const randomPrize = currentCase.prizes[Math.floor(Math.random() * currentCase.prizes.length)];
      carouselPrizes.push(randomPrize);
    }
    carouselPrizes[winIndex] = prize;

    const uniqueSources = Array.from(new Set(carouselPrizes.map((p) => p?.image).filter(Boolean)));
    const preloadLimit = isCoarsePointer ? 10 : 18;
    await Promise.all(uniqueSources.slice(0, preloadLimit).map((src) => preloadImage(src, 1200)));

    return new Promise((resolve) => {
      const contentWindow = document.querySelector('.content-window-item');
      if (!contentWindow) {
        resolve();
        return;
      }

      console.log(`🎰 Starting SMOOTH long animation: ${totalCards} cards, ${Math.round(durationMs/100)/10}s`);

      contentWindow.style.display = 'flex';
      contentWindow.style.overflow = 'hidden';
      contentWindow.style.position = 'relative';
      contentWindow.style.height = '160px';

      const carousel = document.createElement('div');
      carousel.style.cssText = `
        display: flex;
        gap: ${gap}px;
        align-items: center;
        position: absolute;
        left: 0;
        will-change: transform;
        transform: translate3d(0, 0, 0);
      `;

      const fragment = document.createDocumentFragment();
      
      carouselPrizes.forEach((prizeItem) => {
        fragment.appendChild(createSpinCard(prizeItem, itemSize));
      });
      
      carousel.appendChild(fragment);
      contentWindow.innerHTML = '';
      contentWindow.appendChild(carousel);
      
      const cardWidth = itemSize + gap;
      const targetOffset = winIndex * cardWidth - (contentWindow.clientWidth / 2) + (itemSize / 2);
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          carousel.style.transition = `transform ${durationMs}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
          carousel.style.transform = `translate3d(-${targetOffset}px, 0, 0)`;
        });
      });

      setTimeout(() => {
        const winCard = carousel.children[winIndex];
        if (winCard) {
          winCard.style.transition = 'transform 0.22s ease';
          winCard.style.transform = 'scale(1.12)';
          
          setTimeout(() => {
            winCard.style.transform = 'scale(1)';
          }, 300);
        }
      }, Math.max(0, durationMs - 200));

      setTimeout(() => {
        carousel.style.willChange = 'auto';
        resolve();
      }, durationMs + 300);
    });
  }

  function selectWinningPrize(prizes) {
    const random = Math.random() * 100;
    let accumulated = 0;

    for (const prize of prizes) {
      accumulated += prize.chance;
      if (random <= accumulated) {
        return prize;
      }
    }

    return prizes[0];
  }

  function showWinScreen(prize) {
    return new Promise((resolve) => {
      const winWindow = document.querySelector('.win-window');
      const contentWindow = document.querySelector('.content-window');
      const openButton = document.querySelector('.open-btn button');
      
      if (!winWindow) {
        resolve();
        return;
      }

      if (contentWindow) {
        contentWindow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        contentWindow.style.opacity = '0';
        contentWindow.style.transform = 'scale(0.9)';
        setTimeout(() => {
          contentWindow.style.display = 'none';
        }, 300);
      }
      
      if (openButton) {
        openButton.style.display = 'none';
      }

      const keepItBtn = document.querySelector('.keep-it');
      const winWindowItem = winWindow.querySelector('.win-window-item');
      
      if (winWindowItem) {
        winWindowItem.innerHTML = '';
        
        const prizeImage = document.createElement('img');
        prizeImage.src = prize.image;
        prizeImage.alt = `Prize ${prize.price}`;
        prizeImage.className = 'prize-image';
        prizeImage.decoding = 'async';
        
        winWindowItem.appendChild(prizeImage);
      }
      
      winWindow.style.display = 'flex';
      winWindow.style.opacity = '0';
      winWindow.style.transform = 'scale(0.5)';
      
      setTimeout(() => {
        winWindow.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        winWindow.style.opacity = '1';
        winWindow.style.transform = 'scale(1)';
        if (!isCoarsePointer) {
          winWindow.style.filter = 'drop-shadow(0 0 20px rgba(180, 150, 50, 0.4))';
          setTimeout(() => {
            winWindow.style.filter = '';
          }, 500);
        }
      }, 100);
      
      const openBtn = document.querySelector('.open-btn');
      if (openBtn) {
        openBtn.style.display = 'none';
      }
      
      setTimeout(() => {
        if (keepItBtn) {
          keepItBtn.style.display = 'block';
          keepItBtn.style.opacity = '0';
          keepItBtn.style.transform = 'translateY(20px)';
          
          setTimeout(() => {
            keepItBtn.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            keepItBtn.style.opacity = '1';
            keepItBtn.style.transform = 'translateY(0)';
          }, 100);
          
          const keepItButton = keepItBtn.querySelector('button');
          if (keepItButton) {
            keepItButton.style.display = 'block';
            keepItButton.style.opacity = '1';
          }
        }
      }, 600);
      
      resolve();
    });
  }

  async function keepPrize() {
    if (isPrizeCollected || !wonPrize) return;

    isPrizeCollected = true;
    
    try {
      await addPrizeToBalance(wonPrize.price, currentCase.isChipsCase);
      setExitLocked(false);
      
      const winWindow = document.querySelector('.win-window');
      const contentWindow = document.querySelector('.content-window');
      const openBtn = document.querySelector('.open-btn button');
      
      if (winWindow) {
        winWindow.style.transition = 'all 0.3s ease';
        winWindow.style.opacity = '0';
        winWindow.style.transform = 'scale(0.8)';
        setTimeout(() => {
          winWindow.style.display = 'none';
          const winWindowItem = winWindow.querySelector('.win-window-item');
          if (winWindowItem) {
            winWindowItem.innerHTML = '';
          }
        }, 300);
      }
      
      const keepItBtn = document.querySelector('.keep-it');
      if (keepItBtn) {
        keepItBtn.style.display = 'none';
        keepItBtn.style.opacity = '0';
      }
      
      setTimeout(() => {
        if (contentWindow) {
          contentWindow.style.display = 'flex';
          contentWindow.style.transform = 'scale(1)';
          setTimeout(() => {
            contentWindow.style.opacity = '1';
          }, 50);
        }
        
        const openBtnContainer = document.querySelector('.open-btn');
        if (openBtnContainer) {
          openBtnContainer.style.display = 'block';
        }
        
        const openBtnElement = document.querySelector('.open-btn button');
        if (openBtnElement) {
          openBtnElement.style.display = 'block';
          openBtnElement.disabled = false;
          openBtnElement.style.opacity = '1';
        }
        
        if (openBtn) {
          openBtn.style.display = 'block';
          openBtn.disabled = false;
          openBtn.style.opacity = '1';
        }
        
        wonPrize = null;
        isPrizeCollected = false;
        isSpinning = false;
      }, 400);
      
    } catch (error) {
      console.error('Ошибка добавления приза:', error);
      isPrizeCollected = false;
    }
  }

  async function deductBalance(amount, isChips) {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const telegramId = tgUser?.id || '1889923046';
    const endpoint = `https://duopartners.xyz/api/balance/${telegramId}/subtract`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rubles: isChips ? 0 : amount,
        chips: isChips ? amount : 0,
        reason: 'case_opening',
        gameType: 'case'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to deduct balance');
    }

    const data = await response.json();
    
    if (window.BalanceAPI) {
      window.BalanceAPI.balance = {
        rubles: parseFloat(data.balance || data.newBalance || 0),
        chips: parseInt(data.chips || data.newChips || 0)
      };
      window.BalanceAPI.updateVisual();
    }

    return data;
  }

  async function addPrizeToBalance(amount, isChips) {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const telegramId = tgUser?.id || '1889923046';
    const endpoint = `https://duopartners.xyz/api/balance/${telegramId}/add`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rubles: isChips ? 0 : amount,
        chips: isChips ? amount : 0,
        source: 'case_win',
        description: `Won from case`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add prize');
    }

    const data = await response.json();
    
    if (window.BalanceAPI) {
      window.BalanceAPI.balance = {
        rubles: parseFloat(data.balance || data.newBalance || 0),
        chips: parseInt(data.chips || data.newChips || 0)
      };
      window.BalanceAPI.updateVisual();
    }

    return data;
  }

  function updateOpenButton() {
    const openBtn = document.querySelector('.open-btn button');
    const keepBtn = document.querySelector('.keep-it button');

    if (wonPrize && !isPrizeCollected) {
      if (openBtn) openBtn.style.display = 'none';
      if (keepBtn) {
        keepBtn.style.display = 'block';
        keepBtn.disabled = false;
      }
    } else {
      if (openBtn) {
        openBtn.style.display = 'block';
        openBtn.disabled = false;
        openBtn.style.opacity = '1';
      }
      if (keepBtn) keepBtn.style.display = 'none';
    }
  }

  function closeModal() {
    if (exitLocked) return;
    const modal = document.querySelector('.modal-window');
    const modalOverlay = document.querySelector('.modal-overlay');
    const winWindow = document.querySelector('.win-window');
    const contentWindow = document.querySelector('.content-window');
    const caseLoader = document.getElementById('case-loader');
    
    if (modal) {
      modal.style.display = 'none';
    }
    if (modalOverlay) {
      modalOverlay.classList.remove('loading-state');
    }
    if (caseLoader) {
      caseLoader.classList.remove('active');
    }
    
    if (winWindow) {
      winWindow.style.display = 'none';
      const winWindowItem = winWindow.querySelector('.win-window-item');
      if (winWindowItem) {
        winWindowItem.innerHTML = '';
      }
    }
    
    if (contentWindow) {
      contentWindow.style.display = 'flex';
      contentWindow.style.opacity = '1';
    }
    
    document.body.style.overflow = '';
    resumeBackgroundAnimations();
    unbindBackInterception();
    modalOpen = false;
    setExitLocked(false);
    
    currentCase = null;
    isSpinning = false;
    wonPrize = null;
    isPrizeCollected = false;
  }

  function startCaseOpener() {
    if (!window.BalanceAPI) {
      setTimeout(startCaseOpener, 100);
      return;
    }
    
    console.log('✅ SMOOTH long case opener ready!');
    initCaseOpener();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCaseOpener);
  } else {
    startCaseOpener();
  }

})();

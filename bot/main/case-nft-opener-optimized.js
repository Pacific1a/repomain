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

    if (exitBtn) exitBtn.addEventListener('click', closeModal);
    if (openBtn) openBtn.addEventListener('click', spinCase);
    if (keepBtn) keepBtn.addEventListener('click', keepPrize);

    console.log(`✅ Smooth long opener ready for ${cards.length} cases`);
  }

  async function openCaseModal(card) {
    const price = parseFloat(card.getAttribute('data-price')) || 0;
    const isChipsCase = card.getAttribute('data-chips') === 'true';
    const caseName = card.querySelector('.text-block h4')?.textContent || 'Case';
    const caseStyle = card.querySelector('.text-block h4')?.getAttribute('style') || '';
    
    const config = await loadCaseConfig(price);
    if (!config || !config.prizes || config.prizes.length === 0) {
      alert('Конфигурация кейса не найдена!');
      return;
    }

    currentCaseType = config.caseType || null;
    currentCase = { price, isChipsCase, caseName, caseStyle, prizes: config.prizes, card };

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

    console.log('⚡ Preloading first 3 images...');
    const preloadPromises = config.prizes.slice(0, 3).map((prize) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = prize.image;
        setTimeout(resolve, 1500);
      });
    });
    
    await Promise.all(preloadPromises);
    
    await displayPrizesPreview(itemPreview, config.prizes);
    
    if (contentWindow) {
      contentWindow.innerHTML = '';
    }
    
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

  function displayPrizesPreview(container, prizes) {
    return new Promise((resolve) => {
      if (!container) {
        resolve();
        return;
      }

      container.innerHTML = '';
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
      container.style.gap = '10px';
      container.style.padding = '10px';
      container.style.justifyItems = 'center';
      
      const sortedPrizes = [...prizes].sort((a, b) => b.price - a.price);

      sortedPrizes.forEach((prize, index) => {
        const prizeCard = createPrizeCard(prize);
        container.appendChild(prizeCard);
        
        if (index === sortedPrizes.length - 1) {
          setTimeout(() => {
            const containerWidth = container.offsetWidth;
            const cardWidth = 110;
            const itemsPerRow = Math.floor(containerWidth / cardWidth);
            const itemsInLastRow = sortedPrizes.length % itemsPerRow || itemsPerRow;
            
            if (itemsInLastRow === 1) {
              prizeCard.style.gridColumn = `1 / -1`;
              prizeCard.style.justifySelf = 'center';
            }
            
            resolve();
          }, 50);
        }
      });
    });
  }

  function createPrizeCard(prize) {
    const card = document.createElement('div');
    card.className = 'prize-card';
    card.setAttribute('data-rarity', prize.rarity);
    card.style.setProperty('--rarity-color', prize.rarityColor);
    
    if (currentCaseType === 'chips') {
      card.setAttribute('data-case-type', 'chips');
    }
    
    const currencyIcon = currentCaseType === 'chips' ? 'main/assets/chips.png' : 'main/assets/rubles.png';
    const currencyAlt = currentCaseType === 'chips' ? 'Chips' : '₽';
    
    card.innerHTML = `
      <div class="prize-price-badge">
        <img class="prize-currency-icon" src="${currencyIcon}" alt="${currencyAlt}">
        <span class="prize-price-value">${prize.price}</span>
      </div>
      <img class="prize-image" src="${prize.image}" alt="Prize ${prize.price}" loading="eager" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:12px;">
    `;

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
  
  function playSmoothLongAnimation(prize) {
    return new Promise((resolve) => {
      const contentWindow = document.querySelector('.content-window-item');
      if (!contentWindow) {
        resolve();
        return;
      }

      console.log('🎰 Starting SMOOTH long animation: 35 cards, 8 seconds');

      contentWindow.style.display = 'flex';
      contentWindow.style.overflow = 'hidden';
      contentWindow.style.position = 'relative';
      contentWindow.style.height = '160px';

      const carousel = document.createElement('div');
      carousel.style.cssText = `
        display: flex;
        gap: 6px;
        align-items: center;
        position: absolute;
        left: 0;
        will-change: transform;
        transform: translate3d(0, 0, 0);
      `;

      // Генерируем 35 карточек
      const carouselPrizes = [];
      for (let i = 0; i < 35; i++) {
        const randomPrize = currentCase.prizes[Math.floor(Math.random() * currentCase.prizes.length)];
        carouselPrizes.push(randomPrize);
      }
      
      carouselPrizes[30] = prize;

      const fragment = document.createDocumentFragment();
      
      carouselPrizes.forEach((prizeItem) => {
        const card = createPrizeCard(prizeItem);
        card.style.cssText = `
          flex-shrink: 0;
          width: 110px;
          height: 110px;
          will-change: transform;
        `;
        
        const img = card.querySelector('img.prize-image');
        if (img) {
          img.style.cssText = `
            width: 25px;
            height: 25px;
          `;
        }
        
        fragment.appendChild(card);
      });
      
      carousel.appendChild(fragment);
      contentWindow.innerHTML = '';
      contentWindow.appendChild(carousel);
      
      const cardWidth = 110 + 6;
      const targetOffset = 30 * cardWidth - (contentWindow.offsetWidth / 2) + 55;
      
      // 🎰 ОДНА ПЛАВНАЯ АНИМАЦИЯ от начала до конца (БЕЗ РЫВКОВ!)
      // Идеальная кривая ease-in-out для плавного замедления
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          carousel.style.transition = 'transform 8s cubic-bezier(0.25, 0.1, 0.25, 1)';
          carousel.style.transform = `translate3d(-${targetOffset}px, 0, 0)`;
        });
      });

      // Финальная вспышка победной карточки (БЕЗ покачиваний!)
      setTimeout(() => {
        const winCard = carousel.children[30];
        if (winCard) {
          winCard.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
          winCard.style.transform = 'scale(1.12)';
          winCard.style.boxShadow = '0 0 20px rgba(180, 150, 50, 0.5)';
          
          setTimeout(() => {
            winCard.style.transform = 'scale(1)';
            winCard.style.boxShadow = '';
          }, 300);
        }
      }, 7800);

      setTimeout(() => {
        carousel.style.willChange = 'auto';
        resolve();
      }, 8300);
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
        
        winWindowItem.appendChild(prizeImage);
      }
      
      winWindow.style.display = 'flex';
      winWindow.style.opacity = '0';
      winWindow.style.transform = 'scale(0.5)';
      
      setTimeout(() => {
        winWindow.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        winWindow.style.opacity = '1';
        winWindow.style.transform = 'scale(1)';
        
        winWindow.style.filter = 'drop-shadow(0 0 20px rgba(180, 150, 50, 0.4))';
        
        setTimeout(() => {
          winWindow.style.filter = '';
        }, 500);
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
    const modal = document.querySelector('.modal-window');
    const modalOverlay = document.querySelector('.modal-overlay');
    const winWindow = document.querySelector('.win-window');
    const contentWindow = document.querySelector('.content-window');
    
    if (modal) {
      modal.style.display = 'none';
    }
    if (modalOverlay) {
      modalOverlay.classList.remove('loading-state');
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
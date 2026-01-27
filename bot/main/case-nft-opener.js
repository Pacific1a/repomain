// NFT Case Opener - 3 стадии открытия кейса
(function() {
  'use strict';

  // ================================
  // МАППИНГ КЕЙСОВ: СТАРЫЕ ЦЕНЫ → НОВАЯ СИСТЕМА
  // ================================
  
  const CASE_MAPPING = {
    279: 279,
    329: 329,
    389: 389,
    419: 419,
    479: 479,
    529: 529,
    659: 659,
    777: 777,
    819: 819,
    939: 939,
    999: 999
  };

  // Кэш загруженных конфигов
  const configCache = {};
  
  // Текущее состояние
  let currentCase = null;
  let currentCaseType = null; // Тип кейса (chips, nft, etc)
  let isSpinning = false;
  let wonPrize = null;
  let isPrizeCollected = false;

  // ================================
  // ЗАГРУЗКА КОНФИГУРАЦИИ КЕЙСА
  // ================================
  
  async function loadCaseConfig(casePrice) {
    // Проверяем кэш
    if (configCache[casePrice]) {
      return configCache[casePrice];
    }
    
    try {
      const response = await fetch(`main/content-case/${casePrice}/config.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const config = await response.json();
      configCache[casePrice] = config;
      console.log(`✅ Конфиг кейса ${casePrice}₽ загружен:`, config.prizes.length, 'призов');
      return config;
      
    } catch (error) {
      console.error(`❌ Ошибка загрузки конфига ${casePrice}:`, error);
      return null;
    }
  }

  // ================================
  // ИНИЦИАЛИЗАЦИЯ
  // ================================
  
  function initCaseOpener() {
    console.log('🔧 Initializing case opener...');
    
    const cards = document.querySelectorAll('.case-card .cards');
    const modal = document.querySelector('.modal-window');
    const exitBtn = modal?.querySelector('.exit');
    const openBtn = modal?.querySelector('.open-btn button');
    const keepBtn = modal?.querySelector('.keep-it button');
    
    console.log('📦 Found elements:', {
      cards: cards.length,
      modal: !!modal,
      exitBtn: !!exitBtn,
      openBtn: !!openBtn,
      keepBtn: !!keepBtn
    });
    
    if (!cards.length) {
      console.error('❌ No case cards found!');
      return;
    }
    
    if (!modal) {
      console.error('❌ Modal window not found!');
      return;
    }

    modal.style.display = 'none';

    cards.forEach((card, index) => {
      console.log(`🎯 Attaching click handler to card ${index + 1}`);
      card.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Card clicked:', card);
        openCaseModal(card);
      });
    });

    if (exitBtn) {
      exitBtn.addEventListener('click', closeModal);
    }

    if (openBtn) {
      openBtn.addEventListener('click', spinCase);
    }

    if (keepBtn) {
      keepBtn.addEventListener('click', keepPrize);
    }

    console.log(`✅ NFT Case opener initialized for ${cards.length} cases`);
  }

  // ================================
  // СТАДИЯ 1: ОТКРЫТИЕ МОДАЛКИ + PREVIEW
  // ================================
  
  async function openCaseModal(card) {
    const price = parseFloat(card.getAttribute('data-price')) || 0;
    const isChipsCase = card.getAttribute('data-chips') === 'true';
    const caseName = card.querySelector('.text-block h4')?.textContent || 'Case';
    const caseStyle = card.querySelector('.text-block h4')?.getAttribute('style') || '';
    
    // Загружаем конфиг
    const config = await loadCaseConfig(price);
    if (!config || !config.prizes || config.prizes.length === 0) {
      alert('Конфигурация кейса не найдена!');
      return;
    }

    // Сохраняем тип кейса
    currentCaseType = config.caseType || null;

    currentCase = {
      price,
      isChipsCase,
      caseName,
      caseStyle,
      prizes: config.prizes,
      card
    };

    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal-window');
    const caseLoader = document.getElementById('case-loader');
    const modalContent = modal.querySelector('.modal-window-content');
    const titleWindow = modal.querySelector('.title-window span');
    const itemPreview = modal.querySelector('.item-preview-item');
    const contentWindow = modal.querySelector('.content-window-item');
    const winWindow = modal.querySelector('.win-window');
    
    // ОТКРЫВАЕМ МОДАЛКУ
    if (modalOverlay) {
      modalOverlay.classList.add('loading-state');
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // СКРЫВАЕМ КОНТЕНТ НА ВРЕМЯ ЗАГРУЗКИ
    if (modalContent) {
      modalContent.style.opacity = '0';
      modalContent.style.visibility = 'hidden';
    }
    
    // ПОКАЗЫВАЕМ LOADER
    if (caseLoader) {
      caseLoader.classList.add('active');
    }

    // Обновляем заголовок
    if (titleWindow) {
      titleWindow.setAttribute('style', caseStyle);
      titleWindow.textContent = caseName;
    }

    // Очищаем предыдущий контент
    if (itemPreview) itemPreview.innerHTML = '';
    // НЕ очищаем winWindow, только скрываем
    if (winWindow) {
      winWindow.style.display = 'none';
      winWindow.style.opacity = '0';
      // Очищаем только внутренний элемент
      const winWindowItem = winWindow.querySelector('.win-window-item');
      if (winWindowItem) winWindowItem.innerHTML = '';
    }

    // ПРЕДЗАГРУЗКА: Загружаем ВСЕ картинки на заднем плане ДО показа
    console.log('🔄 Preloading all case images...');
    const preloadPromises = config.prizes.map((prize, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log(`✅ Preloaded ${index + 1}/${config.prizes.length}:`, prize.image);
          resolve();
        };
        img.onerror = () => {
          console.error(`❌ Failed to preload ${index + 1}/${config.prizes.length}:`, prize.image);
          resolve(); // Продолжаем даже если ошибка
        };
        img.src = prize.image;
        setTimeout(resolve, 5000); // Максимум 5 сек на картинку
      });
    });
    
    await Promise.all(preloadPromises);
    console.log('✅ All images preloaded!');
    
    // СТАДИЯ 1: ОТОБРАЖЕНИЕ PREVIEW (возможные призы) - теперь мгновенно
    await displayPrizesPreview(itemPreview, config.prizes);
    
    // ДЕМОНСТРАЦИЯ: Показываем карусель для красоты (без спина)
    if (contentWindow) {
      displayCarouselDemo(contentWindow, config.prizes);
    }
    
    // Показываем контент после загрузки
    if (caseLoader) {
      caseLoader.classList.remove('active');
    }
    if (modalOverlay) {
      modalOverlay.classList.remove('loading-state');
    }
    if (modalContent) {
      modalContent.style.opacity = '1';
      modalContent.style.visibility = 'visible';
    }

    // Сброс состояния
    isSpinning = false;
    wonPrize = null;
    isPrizeCollected = false;
    
    // Обновляем кнопку открытия
    updateOpenButton();
  }

  // ================================
  // ОТОБРАЖЕНИЕ PREVIEW ПРИЗОВ
  // ================================
  
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
      
      // Сортируем призы: от дорогих к дешевым (легендарные → обычные)
      const sortedPrizes = [...prizes].sort((a, b) => b.price - a.price);

      sortedPrizes.forEach((prize, index) => {
        setTimeout(() => {
          const prizeCard = createPrizeCard(prize);
          
          // Добавляем в контейнер
          container.appendChild(prizeCard);
          
          // Центрируем последнюю карточку если она одна в ряду
          // Делаем это после добавления, чтобы правильно рассчитать ширину
          if (index === sortedPrizes.length - 1) {
            setTimeout(() => {
              const containerWidth = container.offsetWidth;
              const cardWidth = 110; // 100px + gap
              const itemsPerRow = Math.floor(containerWidth / cardWidth);
              const totalRows = Math.ceil(sortedPrizes.length / itemsPerRow);
              const itemsInLastRow = sortedPrizes.length % itemsPerRow || itemsPerRow;
              
              // Если последний элемент один в ряду - центрируем его
              if (itemsInLastRow === 1) {
                prizeCard.style.gridColumn = `1 / -1`;
                prizeCard.style.justifySelf = 'center';
              }
            }, 50);
          }
          
          // Анимация появления
          requestAnimationFrame(() => {
            prizeCard.style.opacity = '1';
            prizeCard.style.transform = 'scale(1) translateY(0)';
          });
          
          if (index === prizes.length - 1) {
            setTimeout(() => resolve(), 100);
          }
        }, index * 50);
      });
    });
  }

  // ================================
  // ДЕМОНСТРАЦИЯ КАРУСЕЛИ (БЕЗ СПИНА)
  // ================================
  
  function displayCarouselDemo(container, prizes) {
    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';
    container.style.height = '130px';
    container.style.justifyContent = 'flex-start';

    // Создаём карусель
    const carousel = document.createElement('div');
    carousel.style.display = 'flex';
    carousel.style.gap = '6px';
    carousel.style.position = 'absolute';
    carousel.style.left = '0';

    // Генерируем последовательность (15 карточек) - от дорогих к дешевым
    const sortedPrizes = [...prizes].sort((a, b) => b.price - a.price);
    const demoCount = 15;
    for (let i = 0; i < demoCount; i++) {
      const randomPrize = sortedPrizes[Math.floor(Math.random() * sortedPrizes.length)];
      const card = createPrizeCard(randomPrize);
      card.style.flexShrink = '0';
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
      card.style.width = '100px';
      card.style.height = '100px';
      carousel.appendChild(card);
    }

    container.appendChild(carousel);
    console.log('✨ Демонстрация карусели показана');
  }

  // ================================
  // СОЗДАНИЕ КАРТОЧКИ ПРИЗА
  // ================================
  
  function createPrizeCard(prize) {
    const card = document.createElement('div');
    card.className = 'prize-card';
    card.setAttribute('data-rarity', prize.rarity);
    card.style.setProperty('--rarity-color', prize.rarityColor);
    
    // Если это кейс с фишками - добавляем атрибут
    if (currentCaseType === 'chips') {
      card.setAttribute('data-case-type', 'chips');
    }
    
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8) translateY(20px)';
    card.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Badge с ценой
    const priceBadge = document.createElement('div');
    priceBadge.className = 'prize-price-badge';
    const currencyIcon = currentCaseType === 'chips' ? 'main/assets/chips.png' : 'main/assets/rubles.png';
    const currencyAlt = currentCaseType === 'chips' ? 'Chips' : '₽';
    priceBadge.innerHTML = `
      <img class="prize-currency-icon" src="${currencyIcon}" alt="${currencyAlt}">
      <span class="prize-price-value">${prize.price}</span>
    `;

    // Изображение приза
    const img = document.createElement('img');
    img.className = 'prize-image';
    img.src = prize.image;
    img.alt = `Prize ${prize.price}₽`;
    
    // КРИТИЧНО! Явные стили для img
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      position: relative;
      z-index: 1;
      display: block;
      border-radius: 12px;
    `;
    
    img.loading = 'eager';
    
    img.onerror = function() {
      console.error('❌ Ошибка загрузки:', this.src);
      this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="40" text-anchor="middle" x="50">🎁</text></svg>';
    };
    
    img.onload = function() {
      console.log('✅ Картинка загружена:', prize.price);
    };

    card.appendChild(priceBadge);
    card.appendChild(img);

    return card;
  }

  // ================================
  // СТАДИЯ 2: СПИН (АНИМАЦИЯ ОТКРЫТИЯ)
  // ================================
  
  async function spinCase() {
    if (isSpinning || !currentCase) return;

    // ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ - загружаем с сервера КАЖДЫЙ РАЗ
    let balance = 0;
    
    try {
      // Получаем Telegram ID с МАКСИМАЛЬНЫМ логированием
      const tgWebApp = window.Telegram?.WebApp;
      const tgUser = tgWebApp?.initDataUnsafe?.user;
      const telegramId = tgUser?.id || '1889923046';
      
      console.log('🆔 Telegram WebApp check:', {
        hasTelegram: !!window.Telegram,
        hasWebApp: !!tgWebApp,
        hasInitData: !!tgWebApp?.initDataUnsafe,
        hasUser: !!tgUser,
        userId: tgUser?.id,
        userFirstName: tgUser?.first_name,
        finalTelegramId: telegramId,
        platform: tgWebApp?.platform,
        version: tgWebApp?.version
      });
      
      const response = await fetch(`https://duopartners.xyz/api/balance/${telegramId}`);
      
      if (response.ok) {
        const data = await response.json();
        balance = currentCase.isChipsCase ? (data.chips || 0) : (data.rubles || 0);
        console.log('🔍 Balance check (from server):', {
          telegramId: telegramId,
          data: data,
          balance: balance,
          casePrice: currentCase.price,
          caseType: currentCase.isChipsCase ? 'chips' : 'rubles',
          enough: balance >= currentCase.price
        });
      } else {
        console.error('❌ Failed to fetch balance:', response.status);
        alert('Ошибка загрузки баланса!');
        return;
      }
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      alert('Ошибка проверки баланса!');
      return;
    }
    
    if (balance < currentCase.price) {
      alert(`Недостаточно средств! Баланс: ${balance}${currentCase.isChipsCase ? ' chips' : '₽'}, Цена кейса: ${currentCase.price}${currentCase.isChipsCase ? ' chips' : '₽'}`);
      return;
    }

    isSpinning = true;
    const openBtn = document.querySelector('.open-btn button');
    if (openBtn) {
      openBtn.disabled = true;
      openBtn.style.opacity = '0.5';
    }

    // Выбираем выигрышный приз (взвешенный рандом)
    wonPrize = selectWinningPrize(currentCase.prizes);
    console.log('🎰 Выбран приз:', wonPrize);

    // Списываем баланс
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

    // Запускаем анимацию спина
    await playSpinAnimation(wonPrize);

    // Переходим к показу выигрыша
    await showWinScreen(wonPrize);

    isSpinning = false;
  }

  // ================================
  // ВЫБОР ПРИЗА (ВЗВЕШЕННЫЙ РАНДОМ)
  // ================================
  
  function selectWinningPrize(prizes) {
    const random = Math.random() * 100;
    let accumulated = 0;

    for (const prize of prizes) {
      accumulated += prize.chance;
      if (random <= accumulated) {
        return prize;
      }
    }

    // Fallback на самый частый приз
    return prizes[0];
  }

  // ================================
  // АНИМАЦИЯ СПИНА (КАРУСЕЛЬ)
  // ================================
  
  function playSpinAnimation(winningPrize) {
    return new Promise((resolve) => {
      const contentWindow = document.querySelector('.content-window-item');
      if (!contentWindow) {
        console.error('❌ .content-window-item не найден!');
        resolve();
        return;
      }

      console.log('🎰 Запуск анимации спина для:', winningPrize);
      console.log('🎰 Content window:', contentWindow);

      contentWindow.innerHTML = '';
      contentWindow.style.display = 'flex';
      contentWindow.style.overflow = 'hidden';
      contentWindow.style.position = 'relative';
      contentWindow.style.height = '160px';
      contentWindow.style.justifyContent = 'flex-start';

      // Создаём карусель призов
      const carousel = document.createElement('div');
      carousel.style.cssText = `
        display: flex;
        gap: 6px;
        align-items: center;
        position: absolute;
        left: 0;
        will-change: transform;
        backface-visibility: hidden;
        transform: translate3d(0, 0, 0);
      `;

      // Генерируем рандомную последовательность (20 карточек) - оптимизация
      const sortedPrizes = [...currentCase.prizes].sort((a, b) => b.price - a.price);
      const carouselPrizes = [];
      for (let i = 0; i < 20; i++) {
        const randomPrize = sortedPrizes[Math.floor(Math.random() * sortedPrizes.length)];
        carouselPrizes.push(randomPrize);
      }
      
      console.log('🎰 Призы для карусели:', carouselPrizes.length);
      
      // Вставляем выигрышный приз в конец
      carouselPrizes[carouselPrizes.length - 4] = winningPrize;

      carouselPrizes.forEach((prize, idx) => {
        const card = createPrizeCard(prize);
        card.style.cssText = `
          flex-shrink: 0;
          width: 110px;
          height: 110px;
        `;
        
        // Уменьшаем только картинку внутри до 25px
        const img = card.querySelector('img');
        if (img) {
          img.style.cssText = `
            width: 25px;
            height: 25px;
          `;
        }
        
        carousel.appendChild(card);
      });

      console.log('🎰 Карусель создана, карточек:', carousel.children.length);
      console.log('🎰 Картинок в карусели:', carousel.querySelectorAll('img').length);
      
      contentWindow.appendChild(carousel);
      
      console.log('🎰 Карусель добавлена в DOM');
      console.log('🎰 Проверка: img в content-window:', document.querySelectorAll('.content-window-item img').length);

      // Даём браузеру отрисовать DOM
      setTimeout(() => {
        // Включаем анимацию: БЫСТРОЕ НАЧАЛО → МЕДЛЕННЫЙ КОНЕЦ
        carousel.style.transition = 'transform 6.5s cubic-bezier(0.25, 1, 0.5, 1)';
        
        // Рассчитываем финальную позицию (выигрышный приз по центру)
        const cardWidth = 110 + 6; // ширина карточки + gap
        const targetOffset = (carouselPrizes.length - 4) * cardWidth - (contentWindow.offsetWidth / 2) + 55;
        carousel.style.transform = `translate3d(-${targetOffset}px, 0, 0)`;
      }, 100);

      // Ждём окончания анимации (6.5s + задержка)
      setTimeout(() => {
        // Убираем will-change после анимации
        carousel.style.willChange = 'auto';
        resolve();
      }, 6900); // 6.5s animation + 400ms
    });
  }

  // ================================
  // СТАДИЯ 3: ПОКАЗ ВЫИГРЫША
  // ================================
  
  function showWinScreen(prize) {
    return new Promise((resolve) => {
      const winWindow = document.querySelector('.win-window');
      const contentWindow = document.querySelector('.content-window'); // Весь контейнер с индикатором
      const openButton = document.querySelector('.open-btn button');
      
      if (!winWindow) {
        resolve();
        return;
      }

      // Полностью скрываем content-window (карусель + индикатор)
      if (contentWindow) {
        contentWindow.style.opacity = '0';
        setTimeout(() => {
          contentWindow.style.display = 'none'; // Убираем из DOM полностью
        }, 300);
      }
      
      // Скрываем кнопку открытия
      if (openButton) {
        openButton.style.display = 'none';
      }

      // Находим существующую кнопку Keep it
      const keepItBtn = document.querySelector('.keep-it');
      const openBtn = document.querySelector('.open-btn');
      
      console.log('🔍 Keep it button before prize:', {
        keepItBtn: !!keepItBtn,
        display: keepItBtn?.style.display,
        opacity: keepItBtn?.style.opacity
      });
      
      // Показываем окно выигрыша с картинкой
      const winWindowItem = winWindow.querySelector('.win-window-item');
      
      console.log('🎁 Creating prize display:', {
        winWindow: !!winWindow,
        winWindowItem: !!winWindowItem,
        prizeSrc: prize.image,
        prizePrice: prize.price
      });
      
      if (winWindowItem) {
        winWindowItem.innerHTML = '';
        
        // Картинка приза (используем CSS из index.html)
        const prizeImage = document.createElement('img');
        prizeImage.src = prize.image;
        prizeImage.alt = `Prize ${prize.price}`;
        prizeImage.className = 'prize-image';
        
        prizeImage.onload = () => {
          console.log('✅ Prize image loaded:', prize.image);
        };
        
        prizeImage.onerror = () => {
          console.error('❌ Prize image failed to load:', prize.image);
        };
        
        winWindowItem.appendChild(prizeImage);
        console.log('📸 Prize image added to DOM');
        
        // Анимация появления
        setTimeout(() => {
          prizeImage.style.transform = 'scale(1)';
        }, 200);
      } else {
        console.error('❌ .win-window-item not found!');
      }
      
      // Показываем win-window с задержкой для плавности
      setTimeout(() => {
        winWindow.style.display = 'flex';
        setTimeout(() => {
          winWindow.style.opacity = '1';
          winWindow.style.transform = 'scale(1)';
        }, 50);
        
        console.log('👁️ Win window visible:', {
          display: winWindow.style.display,
          opacity: winWindow.style.opacity,
          transform: winWindow.style.transform
        });
      }, 100);
      
      // Скрываем кнопку Open
      if (openBtn) {
        openBtn.style.display = 'none';
      }
      
      // Показываем кнопку Keep it (и контейнер, и саму кнопку)
      if (keepItBtn) {
        keepItBtn.style.display = 'block';  // Контейнер .keep-it
        keepItBtn.style.opacity = '1';
        keepItBtn.style.transform = 'translateY(0)';
        
        console.log('✅ Keep it container set to:', {
          display: keepItBtn.style.display,
          opacity: keepItBtn.style.opacity
        });
        
        // Показываем саму кнопку внутри
        const keepItButton = keepItBtn.querySelector('button');
        if (keepItButton) {
          keepItButton.style.display = 'block';  // Сама кнопка <button>
          keepItButton.style.opacity = '1';
          
          console.log('✅ Keep it button set to:', {
            display: keepItButton.style.display,
            opacity: keepItButton.style.opacity
          });
        }
      } else {
        console.error('❌ keepItBtn not found!');
      }
      
      resolve();
    });
  }

  // ================================
  // ЗАБРАТЬ ПРИЗ
  // ================================
  
  async function keepPrize() {
    if (isPrizeCollected || !wonPrize) return;

    isPrizeCollected = true;
    
    try {
      await addPrizeToBalance(wonPrize.price, currentCase.isChipsCase);
      console.log(`✅ Приз ${wonPrize.price} добавлен в баланс`);
      
      // Скрываем окно выигрыша
      const winWindow = document.querySelector('.win-window');
      const contentWindow = document.querySelector('.content-window'); // Весь контейнер
      const openBtn = document.querySelector('.open-btn button');
      
      if (winWindow) {
        winWindow.style.opacity = '0';
        setTimeout(() => {
          winWindow.style.display = 'none';
          winWindow.innerHTML = '';
        }, 300);
      }
      
      // Скрываем кнопку Keep it
      const keepItBtn = document.querySelector('.keep-it');
      if (keepItBtn) {
        keepItBtn.style.display = 'none';
        keepItBtn.style.opacity = '0';
      }
      
      // Возвращаем content-window (карусель + индикатор)
      setTimeout(() => {
        if (contentWindow) {
          contentWindow.style.display = 'flex'; // Восстанавливаем в DOM
          setTimeout(() => {
            contentWindow.style.opacity = '1'; // Плавное появление
          }, 50);
        }
        
        // Показываем кнопку Open обратно (И контейнер, И кнопку!)
        const openBtnContainer = document.querySelector('.open-btn');
        if (openBtnContainer) {
          openBtnContainer.style.display = 'block';  // Контейнер .open-btn
        }
        
        const openBtnElement = document.querySelector('.open-btn button');
        if (openBtnElement) {
          openBtnElement.style.display = 'block';  // Кнопка внутри
          openBtnElement.disabled = false;
          openBtnElement.style.opacity = '1';
        }
        
        if (openBtn) {
          openBtn.style.display = 'block';
          openBtn.disabled = false;
          openBtn.style.opacity = '1';
        }
        
        // keep-it остаётся скрытой, показываем только Open
        
        // Сбрасываем состояние
        wonPrize = null;
        isPrizeCollected = false;
        isSpinning = false;
      }, 400);
      
    } catch (error) {
      console.error('Ошибка добавления приза:', error);
      isPrizeCollected = false;
    }
  }

  // ================================
  // РАБОТА С БАЛАНСОМ
  // ================================
  
  async function deductBalance(amount, isChips) {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const telegramId = tgUser?.id || '1889923046';
    const endpoint = `https://duopartners.xyz/api/balance/${telegramId}/subtract`;
    
    console.log('💸 Deducting balance:', { 
      amount, 
      isChips, 
      telegramId,
      hasUser: !!tgUser,
      userId: tgUser?.id,
      userName: tgUser?.first_name
    });
    
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
    console.log('✅ Balance deducted:', data);
    
    // Обновляем через BalanceAPI
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
    
    console.log('💰 Adding prize:', { 
      amount, 
      isChips, 
      telegramId,
      hasUser: !!tgUser,
      userId: tgUser?.id,
      userName: tgUser?.first_name
    });
    
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
    console.log('✅ Prize added:', data);
    
    // Обновляем через BalanceAPI
    if (window.BalanceAPI) {
      window.BalanceAPI.balance = {
        rubles: parseFloat(data.balance || data.newBalance || 0),
        chips: parseInt(data.chips || data.newChips || 0)
      };
      window.BalanceAPI.updateVisual();
    }

    return data;
  }

  // ================================
  // ОБНОВЛЕНИЕ КНОПКИ
  // ================================
  
  function updateOpenButton() {
    const openBtn = document.querySelector('.open-btn button');
    const keepBtn = document.querySelector('.keep-it button');

    if (wonPrize && !isPrizeCollected) {
      // Показываем кнопку "Забрать"
      if (openBtn) openBtn.style.display = 'none';
      if (keepBtn) {
        keepBtn.style.display = 'block';
        keepBtn.disabled = false;
      }
    } else {
      // Показываем кнопку "Открыть"
      if (openBtn) {
        openBtn.style.display = 'block';
        openBtn.disabled = false;
        openBtn.style.opacity = '1';
      }
      if (keepBtn) keepBtn.style.display = 'none';
    }
  }

  // ================================
  // ЗАКРЫТИЕ МОДАЛКИ
  // ================================
  
  function closeModal() {
    const modal = document.querySelector('.modal-window');
    const modalOverlay = document.querySelector('.modal-overlay');
    const winWindow = document.querySelector('.win-window');
    const contentWindow = document.querySelector('.content-window');
    
    // Скрываем модалку
    if (modal) {
      modal.style.display = 'none';
    }
    if (modalOverlay) {
      modalOverlay.classList.remove('loading-state');
    }
    
    // Очищаем win-window если приз не забран
    if (winWindow) {
      winWindow.style.display = 'none';
      winWindow.innerHTML = '';
    }
    
    // Показываем content-window обратно
    if (contentWindow) {
      contentWindow.style.display = 'flex';
      contentWindow.style.opacity = '1';
    }
    
    document.body.style.overflow = '';
    
    // Сброс состояния
    currentCase = null;
    isSpinning = false;
    wonPrize = null;
    isPrizeCollected = false;
  }

  // ================================
  // АВТОЗАПУСК С ПРОВЕРКОЙ ЗАВИСИМОСТЕЙ
  // ================================
  
  function startCaseOpener() {
    // Проверяем что BalanceAPI загружен
    if (!window.BalanceAPI) {
      console.error('❌ BalanceAPI not loaded! Retrying in 100ms...');
      setTimeout(startCaseOpener, 100);
      return;
    }
    
    console.log('✅ BalanceAPI ready, starting case opener...');
    initCaseOpener();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCaseOpener);
  } else {
    startCaseOpener();
  }

  // Экспорт для отладки
  window.debugCaseOpener = {
    loadCaseConfig,
    selectWinningPrize,
    currentCase: () => currentCase
  };

})();

// Case opening logic with balance integration
(function() {
  'use strict';

  const CASE_CONFIG = {
    // Кейсы за рубли
    279: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1500],
    329: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 2000],
    389: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 2000],
    419: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2500],
    479: [100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 3000],
    529: [150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000],
    659: [200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    777: [200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    819: [250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    999: [400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    
    // Кейсы за фишки (chips)
    314: [50, 101, 155, 202, 255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002],
    542: [155, 202, 255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505],
    911: [255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505, 3003],
    993: [255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505, 3003, 4004],
    1337: [255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505, 3003, 4004, 5005]
  };

  // Все доступные цвета для рублевых призов
  const PRIZE_COLORS_RUBLES = {
    5000: ['red'],                              // red везде
    4000: ['blue'],                             // blue везде
    3000: ['blue'],                             // blue везде
    2500: ['red', 'blue'],                      // red + blue везде
    2000: ['red', 'blue', 'purple'],            // red + blue + purple везде
    1500: ['red', 'blue', 'purple'],            // red + blue + purple везде
    1000: ['yellow', 'blue', 'purple'],         // yellow + blue + purple везде
    888: ['yellow', 'blue', 'purple'],          // yellow + blue + purple везде
    777: ['yellow', 'blue', 'purple'],          // yellow + blue + purple везде
    700: ['yellow', 'gray', 'purple'],          // yellow + gray + purple везде
    500: ['yellow', 'gray', 'purple'],          // yellow + gray + purple везде
    400: ['yellow', 'gray', 'purple'],          // yellow + gray + purple везде
    350: ['yellow', 'gray'],                    // yellow + gray везде
    300: ['yellow', 'gray'],                    // yellow + gray везде
    250: ['yellow', 'gray'],                    // yellow + gray везде
    200: ['gray'],                              // gray везде
    150: ['gray'],                              // gray везде
    100: ['gray'],                              // gray везде
    50: ['gray']                                // gray везде
  };

  // Все доступные цвета для фишек (ТОЛЬКО существующие во ВСЕХ трех папках!)
  const PRIZE_COLORS_CHIPS = {
    5005: ['red'],
    4004: ['red'],                    // blue только в Win, НЕТ в preview
    3003: ['blue', 'red'],
    2505: ['blue', 'purple', 'red'],
    2002: ['blue', 'purple', 'red'],
    1505: ['blue'],                   // purple НЕТ в Win
    1001: ['blue', 'purple', 'yellow'],
    880: ['purple'],                  // НЕТ в Win!
    777: ['purple', 'yellow'],
    707: ['purple', 'yellow'],
    505: ['gray', 'yellow'],
    404: ['gray', 'yellow'],
    303: ['gray', 'yellow'],
    255: ['gray', 'yellow'],
    202: ['gray'],
    155: ['gray'],
    101: ['gray'],
    50: ['gray']
  };

  // Функция для получения рандомного цвета для номинала
  function getRandomColor(prize, isChips = false) {
    const colors = isChips ? PRIZE_COLORS_CHIPS[prize] : PRIZE_COLORS_RUBLES[prize];
    if (!colors || colors.length === 0) return 'gray';
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Функция для получения путей к изображениям с учетом рандомного цвета
  function getPrizeImages(prize, isChips = false) {
    const color = getRandomColor(prize, isChips);
    
    if (isChips) {
      // Пути для кейсов за фишки
      const paths = {
        spin: `https://raw.githubusercontent.com/Pacific1a/img/main/main/Chips-case/${color}/${prize}-chips-${color}.png`,
        preview: `https://raw.githubusercontent.com/Pacific1a/img/main/main/preview-chips/${prize}-chips-${color}-preview.png`,
        win: `https://raw.githubusercontent.com/Pacific1a/img/main/main/Win-chips/${prize}-chips-${color}.png`,
        color: color
      };
      return paths;
    } else {
      // Пути для кейсов за рубли
      // ВАЖНО: Папка называется purple, но ФАЙЛЫ внутри названы puple (с опечаткой!)
      const previewColor = color === 'purple' ? 'puple' : color;
      
      const paths = {
        spin: `https://raw.githubusercontent.com/Pacific1a/img/main/main/Case-tokens/${color}/${prize}-r-${color}.png`,
        preview: `https://raw.githubusercontent.com/Pacific1a/img/main/main/prewiew-tokens/purple/${prize}-r-${previewColor}.png`,
        win: `https://raw.githubusercontent.com/Pacific1a/img/main/main/win-tokens/${color}/${prize}-r-${color}.png`,
        color: color
      };
      
      // Для не-purple цветов используем обычный путь
      if (color !== 'purple') {
        paths.preview = `https://raw.githubusercontent.com/Pacific1a/img/main/main/prewiew-tokens/${color}/${prize}-r-${color}.png`;
      }
      
      return paths;
    }
  }

  // Кэш для хранения выбранных цветов (чтобы в рамках одной сессии цвет не менялся)
  const prizeColorCache = {};

  let currentCase = null;
  let isSpinning = false;
  let wonPrize = null;
  let isPrizeCollected = false;

  function initCaseOpener() {
    const cards = document.querySelectorAll('.case-card .cards');
    const modal = document.querySelector('.modal-window');
    const exitBtn = modal?.querySelector('.exit');
    const openBtn = modal?.querySelector('.open-btn button');
    const keepBtn = modal?.querySelector('.keep-it button');
    
    if (!cards.length) {
      console.warn('Cases not found on page');
      return;
    }

    modal.style.display = 'none';

    cards.forEach(card => {
      card.addEventListener('click', function(e) {
        e.preventDefault();
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

    console.log(`✅ Case opener initialized for ${cards.length} cases`);
  }

  function openCaseModal(card) {
    const price = parseFloat(card.getAttribute('data-price')) || 0;
    const isChipsCase = card.getAttribute('data-chips') === 'true';
    const caseName = card.querySelector('.text-block h4')?.textContent || 'Case';
    const caseStyle = card.querySelector('.text-block h4')?.getAttribute('style') || '';
    
    const prizes = CASE_CONFIG[price];
    if (!prizes) {
      alert('Конфигурация кейса не найдена!');
      return;
    }

    currentCase = {
      price,
      isChipsCase,
      caseName,
      caseStyle,
      prizes,
      card
    };

    const modal = document.querySelector('.modal-window');
    const titleWindow = modal.querySelector('.title-window span');
    const itemPreview = modal.querySelector('.item-preview-item');
    const contentWindow = modal.querySelector('.content-window-item');
    const winWindow = modal.querySelector('.win-window');

    if (titleWindow) {
      titleWindow.textContent = caseName;
      titleWindow.setAttribute('style', caseStyle);
    }

    if (itemPreview) {
      itemPreview.innerHTML = '';
      prizes.forEach(prize => {
        const img = document.createElement('img');
        const prizeData = getPrizeImages(prize, isChipsCase);
        
        // Фиксируем размеры для предотвращения CLS
        img.width = 110;
        img.height = 110;
        img.src = prizeData.preview;
        img.alt = isChipsCase ? `${prize} chips` : `${prize}₽`;
        img.loading = 'lazy'; // Ленивая загрузка для ускорения
        img.decoding = 'async';
        
        itemPreview.appendChild(img);
      });
    }

    if (contentWindow) {
      populateSpinItems(contentWindow, prizes);
    }

    if (winWindow) {
      winWindow.style.display = 'none';
    }

    modal.querySelector('.open-btn button').disabled = false;
    modal.querySelector('.keep-it').style.display = 'none';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    isSpinning = false;
    wonPrize = null;
  }

  function populateSpinItems(container, prizes) {
    container.innerHTML = '';
    
    const allPrizes = [];
    const weights = {
      veryHigh: 1,
      high: 2,
      medium: 8,
      low: 20,
      veryLow: 30
    };

    prizes.forEach(prize => {
      let count;
      if (prize >= 3000) {
        count = weights.veryHigh;
      } else if (prize >= 2000) {
        count = weights.high;
      } else if (prize >= 700) {
        count = weights.medium;
      } else if (prize >= 300) {
        count = weights.low;
      } else {
        count = weights.veryLow;
      }
      
      for (let i = 0; i < count; i++) {
        allPrizes.push(prize);
      }
    });

    for (let i = allPrizes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPrizes[i], allPrizes[j]] = [allPrizes[j], allPrizes[i]];
    }

    const duplicated = [];
    for (let i = 0; i < 6; i++) {
      duplicated.push(...allPrizes);
    }

    const fragment = document.createDocumentFragment();
    duplicated.forEach(prize => {
      const img = document.createElement('img');
      const prizeData = getPrizeImages(prize, currentCase.isChipsCase);
      
      // Фиксируем размеры для предотвращения CLS
      img.width = 110;
      img.height = 110;
      img.src = prizeData.spin;
      img.alt = currentCase.isChipsCase ? `${prize} chips` : `${prize}₽`;
      img.dataset.value = prize;
      img.dataset.color = prizeData.color;
      img.loading = 'lazy';
      img.decoding = 'async';
      
      fragment.appendChild(img);
    });
    container.appendChild(fragment);
  }

  async function spinCase() {
    if (isSpinning) return;
    
    const currency = currentCase.isChipsCase ? 'chips' : 'rubles';
    
    if (!window.BalanceAPI) {
      alert('Система баланса не загружена');
      return;
    }

    // Проверяем баланс
    const hasEnough = currency === 'chips' 
      ? window.BalanceAPI.hasEnoughChips(currentCase.price)
      : window.BalanceAPI.hasEnoughRubles(currentCase.price);
      
    if (!hasEnough) {
      alert(`Недостаточно средств! Требуется: ${currentCase.price}${currency === 'chips' ? ' chips' : '₽'}`);
      return;
    }

    // Списываем средства
    const success = currency === 'chips'
      ? await window.BalanceAPI.subtractChips(currentCase.price)
      : await window.BalanceAPI.subtractRubles(currentCase.price);
      
    if (!success) {
      alert('Ошибка при списании средств');
      return;
    }

    isSpinning = true;
    document.querySelector('.open-btn button').disabled = true;

    wonPrize = selectRandomPrize(currentCase.prizes);
    
    const contentWindow = document.querySelector('.content-window-item');
    const images = contentWindow.querySelectorAll('img');
    
    const containerWidth = document.querySelector('.content-window').offsetWidth;
    const centerPosition = containerWidth / 2;
    
    // НЕ создаем новую фишку! Ищем СУЩЕСТВУЮЩИЕ фишки с нужным номиналом в карусели
    const matchingImages = [];
    images.forEach((img, index) => {
      if (parseInt(img.dataset.value) === wonPrize) {
        matchingImages.push({ img, index });
      }
    });
    
    // Если нашли фишки с нужным номиналом - выбираем одну из них
    let winningIndex;
    let winningImg;
    let winningColor;
    
    if (matchingImages.length > 0) {
      // Выбираем случайную фишку нужного номинала из доступных в карусели
      const randomMatch = matchingImages[Math.floor(Math.random() * matchingImages.length)];
      winningIndex = randomMatch.index;
      winningImg = randomMatch.img;
      winningColor = winningImg.dataset.color;
      console.log('✅ Found', matchingImages.length, 'matching images for', wonPrize + '₽', '→ selected index', winningIndex, 'color:', winningColor);
    } else {
      // Если не нашли (не должно быть) - используем старую логику
      const minIndex = Math.floor(images.length * 0.70);
      const maxIndex = Math.floor(images.length * 0.80);
      winningIndex = Math.floor(Math.random() * (maxIndex - minIndex) + minIndex);
      winningImg = images[winningIndex];
      winningColor = winningImg.dataset.color || getRandomColor(wonPrize);
      console.warn('⚠️  No matching images found, using fallback');
    }
    
    // ИСПОЛЬЗУЕМ РЕАЛЬНЫЕ РАЗМЕРЫ из браузера!
    // Берем первую фишку и измеряем её РЕАЛЬНЫЙ размер
    const firstImg = contentWindow.querySelector('img');
    const firstImgRect = firstImg.getBoundingClientRect();
    const realItemWidth = firstImgRect.width;
    
    // Считаем РЕАЛЬНЫЙ gap между фишками
    const containerStyle = window.getComputedStyle(contentWindow);
    const realGap = parseFloat(containerStyle.gap) || 1;
    
    // Полная ширина элемента = ширина фишки + gap
    const totalItemWidth = realItemWidth + realGap;
    
    // ТОЧНЫЙ РАСЧЕТ: центр выигрышной фишки используя РЕАЛЬНЫЕ размеры
    const leftEdge = winningIndex * totalItemWidth;
    const imageCenterPosition = leftEdge + (realItemWidth / 2);
    const targetOffset = centerPosition - imageCenterPosition;
    
    console.log('🎯 SPIN START');
    console.log('💰 Prize:', wonPrize + '₽', 'Color:', winningColor);
    console.log('📍 Index:', winningIndex, '/', images.length);
    console.log('📐 REAL sizes: img=' + realItemWidth + 'px, gap=' + realGap + 'px, total=' + totalItemWidth + 'px');
    console.log('📏 Container:', containerWidth + 'px', '→ Center:', centerPosition + 'px');
    console.log('🎯 Image left edge:', leftEdge + 'px', '→ Center:', imageCenterPosition + 'px');
    console.log('↔️  Offset:', targetOffset + 'px');
    
    contentWindow.style.transition = 'transform 6.5s cubic-bezier(0.22, 1, 0.36, 1)';
    contentWindow.style.transform = `translateX(${targetOffset}px)`;

    setTimeout(() => {
      console.log('✅ SPIN COMPLETE');
      
      // Проверяем какая фишка РЕАЛЬНО под индикатором
      const container = document.querySelector('.content-window');
      const containerRect = container.getBoundingClientRect();
      const indicatorCenterX = containerRect.left + centerPosition;
      
      // Получаем все фишки после анимации
      const allImages = contentWindow.querySelectorAll('img');
      let actualWinningImg = null;
      let minDistance = Infinity;
      
      allImages.forEach(img => {
        const imgRect = img.getBoundingClientRect();
        const imgCenterX = imgRect.left + (imgRect.width / 2);
        const distance = Math.abs(imgCenterX - indicatorCenterX);
        
        if (distance < minDistance) {
          minDistance = distance;
          actualWinningImg = img;
        }
      });
      
      if (actualWinningImg) {
        const actualValue = parseInt(actualWinningImg.dataset.value);
        const actualColor = actualWinningImg.dataset.color;
        console.log('🎯 Under indicator:', actualValue + '₽', actualColor, '(distance:', Math.round(minDistance) + 'px)');
        console.log('🏆 Expected win:', wonPrize + '₽', winningColor);
        
        if (actualValue != wonPrize || actualColor != winningColor) {
          if (actualValue != wonPrize) {
            console.warn('⚠️  VALUE MISMATCH! Expected', wonPrize, 'but got', actualValue);
          }
          if (actualColor != winningColor) {
            console.warn('⚠️  COLOR MISMATCH! Expected', winningColor, 'but got', actualColor);
          }
          console.warn('🔧 FIXING: Using actual chip under indicator');
          // ИСПРАВЛЯЕМ - используем реальное значение и цвет под индикатором!
          wonPrize = actualValue;
          winningColor = actualColor;
        } else {
          console.log('✅ PERFECT MATCH! Indicator shows:', wonPrize + '₽', winningColor);
        }
      }
      
      // Сохраняем цвет для использования в showWinResult
      window.winningColor = winningColor;
      
      // Показываем результат с анимацией
      showWinResult();
    }, 6800);
  }

  function selectRandomPrize(prizes) {
    const weights = prizes.map(prize => {
      if (prize >= 3000) return 0.3;   // было 0.5
      if (prize >= 2000) return 0.7;   // было 1
      if (prize >= 1000) return 2;     // было 5
      if (prize >= 500) return 5;      // было 15
      if (prize >= 300) return 30;     // было 40
      return 120;                       // было 80
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < prizes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return prizes[i];
      }
    }

    return prizes[prizes.length - 1];
  }

  async function showWinResult() {
    const contentWindow = document.querySelector('.content-window');
    const winWindow = document.querySelector('.win-window');
    const winItem = winWindow.querySelector('.win-window-item');
    const polygonIndicator = document.querySelector('.content-window img[src*="Polygon"]');
    const openBtn = document.querySelector('.open-btn');
    
    // Скрываем кнопку Open с схлопыванием
    if (openBtn) {
      openBtn.style.transition = 'opacity 0.3s ease-out, max-height 0.3s ease-out, margin 0.3s ease-out';
      openBtn.style.opacity = '0';
      openBtn.style.maxHeight = '0';
      openBtn.style.margin = '0';
      openBtn.style.overflow = 'hidden';
      setTimeout(() => {
        openBtn.style.display = 'none';
      }, 300);
    }
    
    // 1. Плавно скрываем карусель и индикатор
    contentWindow.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out, max-height 0.3s ease-out 0.5s, margin 0.3s ease-out 0.5s';
    contentWindow.style.opacity = '0';
    contentWindow.style.transform = 'scale(0.8)';
    
    if (polygonIndicator) {
      polygonIndicator.style.transition = 'opacity 0.5s ease-out';
      polygonIndicator.style.opacity = '0';
    }
    
    // Схлопываем высоту после затухания
    setTimeout(() => {
      contentWindow.style.maxHeight = '0';
      contentWindow.style.margin = '0';
      contentWindow.style.overflow = 'hidden';
    }, 500);
    
    // Ждем завершения всех анимаций
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Полностью скрываем карусель
    contentWindow.style.display = 'none';
    
    // 2. Подготавливаем win-window для появления
    // ВАЖНО: используем winningColor который был определен в spinCase()
    const prizeInfo = getPrizeImages(wonPrize, currentCase.isChipsCase);
    // Если winningColor задан - используем его для win-токена
    let winImagePath;
    if (window.winningColor) {
      if (currentCase.isChipsCase) {
        winImagePath = `https://raw.githubusercontent.com/Pacific1a/img/main/main/Win-chips/${wonPrize}-chips-${window.winningColor}.png`;
      } else {
        winImagePath = `https://raw.githubusercontent.com/Pacific1a/img/main/main/win-tokens/${window.winningColor}/${wonPrize}-r-${window.winningColor}.png`;
      }
    } else {
      winImagePath = prizeInfo.win;
    }
    
    winItem.innerHTML = '';
    const winImg = document.createElement('img');
    
    // Фиксируем размеры для предотвращения CLS
    winImg.width = 110;
    winImg.height = 110;
    winImg.src = winImagePath;
    winImg.alt = `WIN ${wonPrize}₽`;
    winImg.loading = 'eager';
    winImg.decoding = 'async';
    
    winItem.appendChild(winImg);
    
    console.log('🏆 Showing win:', wonPrize + '₽', window.winningColor);
    
    // Отправляем выигрыш через WebSocket всем пользователям
    if (window.LivePrizes) {
      window.LivePrizes.broadcastWin(wonPrize, currentCase.isChipsCase, window.winningColor);
    }

    // Устанавливаем начальное состояние для анимации появления
    winWindow.style.display = 'flex';
    winWindow.style.maxHeight = '0';
    winWindow.style.opacity = '0';
    winWindow.style.transform = 'scale(0.5) translateY(30px)';
    winWindow.style.overflow = 'hidden';
    
    // 3. Запускаем анимацию появления
    requestAnimationFrame(() => {
      winWindow.style.transition = 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), max-height 0.6s ease-out';
      winWindow.style.maxHeight = '500px';
      winWindow.style.opacity = '1';
      winWindow.style.transform = 'scale(1) translateY(0)';
      winWindow.style.overflow = 'visible';
    });
    
    // 4. Показываем кнопку Keep it с задержкой
    setTimeout(() => {
      const keepItBtn = document.querySelector('.keep-it');
      keepItBtn.style.display = 'block';
      keepItBtn.style.maxHeight = '0';
      keepItBtn.style.opacity = '0';
      keepItBtn.style.transform = 'translateY(20px)';
      keepItBtn.style.overflow = 'hidden';
      
      requestAnimationFrame(() => {
        keepItBtn.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out, max-height 0.4s ease-out';
        keepItBtn.style.maxHeight = '200px';
        keepItBtn.style.opacity = '1';
        keepItBtn.style.transform = 'translateY(0)';
        keepItBtn.style.overflow = 'visible';
      });
    }, 400);

    isSpinning = false;
  }

  async function keepPrize() {
    if (!wonPrize || isPrizeCollected) return;
    
    isPrizeCollected = true;
    const keepButton = document.querySelector('.keep-it button');
    if (keepButton) {
      keepButton.disabled = true;
      keepButton.style.opacity = '0.5';
      keepButton.style.cursor = 'not-allowed';
    }

    // Начисляем выигрыш (всегда в рублях из кейсов)
    await window.BalanceAPI.addRubles(wonPrize);
    
    console.log(`🎉 Поздравляем! Вы выиграли ${wonPrize}₽`);
    
    closeModal();
  }

  function closeModal() {
    const modal = document.querySelector('.modal-window');
    const contentWindow = document.querySelector('.content-window');
    const contentWindowItem = document.querySelector('.content-window-item');
    const winWindow = document.querySelector('.win-window');
    const polygonIndicator = document.querySelector('.content-window img[src*="Polygon"]');
    
    // Сбрасываем состояние карусели
    if (contentWindowItem) {
      contentWindowItem.style.transition = 'none';
      contentWindowItem.style.transform = 'translateX(0)';
    }
    
    // Сбрасываем видимость элементов
    if (contentWindow) {
      contentWindow.style.display = 'flex';
      contentWindow.style.opacity = '1';
      contentWindow.style.transform = 'scale(1)';
      contentWindow.style.maxHeight = '';
      contentWindow.style.margin = '';
      contentWindow.style.overflow = 'hidden';
    }
    
    if (polygonIndicator) {
      polygonIndicator.style.opacity = '1';
    }
    
    if (winWindow) {
      winWindow.style.display = 'none';
      winWindow.style.opacity = '0';
      winWindow.style.transform = 'scale(0.5)';
      winWindow.style.maxHeight = '0';
      winWindow.style.overflow = 'hidden';
    }

    modal.style.display = 'none';
    document.body.style.overflow = '';
    
    const keepButton = document.querySelector('.keep-it button');
    const keepItBtn = document.querySelector('.keep-it');
    const openBtn = document.querySelector('.open-btn');
    
    if (keepButton) {
      keepButton.disabled = false;
      keepButton.style.opacity = '';
      keepButton.style.cursor = '';
    }
    if (keepItBtn) {
      keepItBtn.style.display = 'none';
      keepItBtn.style.opacity = '0';
      keepItBtn.style.maxHeight = '0';
      keepItBtn.style.overflow = 'hidden';
    }
    if (openBtn) {
      openBtn.style.display = 'flex';
      openBtn.style.opacity = '1';
      openBtn.style.maxHeight = '';
      openBtn.style.margin = '';
      openBtn.style.overflow = 'visible';
    }
    
    currentCase = null;
    isSpinning = false;
    wonPrize = null;
    isPrizeCollected = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCaseOpener);
  } else {
    initCaseOpener();
  }
})();

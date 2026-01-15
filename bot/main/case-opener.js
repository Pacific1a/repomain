// Case opening logic with balance integration
(function() {
  'use strict';

  // ⚠️ ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ загрузки изображений призов с GitHub
  // Установите false чтобы отключить загрузку изображений
  const ENABLE_PRIZE_IMAGES = false;

  const CASE_CONFIG = {
    // Кейсы за рубли (более адекватная экономика)
    // Формат: [частые маленькие призы, средние призы, редкие большие призы]
    // RTP ~75-80% (казино зарабатывает 20-25%)
    
    279: [100, 150, 200, 250, 300, 350, 400, 500],              // Макс: 500₽ (x1.8)
    329: [150, 200, 250, 300, 350, 400, 500, 600],              // Макс: 600₽ (x1.8)
    389: [150, 200, 250, 300, 400, 500, 600, 700],              // Макс: 700₽ (x1.8)
    419: [200, 250, 300, 350, 400, 500, 600, 700, 800],         // Макс: 800₽ (x1.9)
    479: [200, 250, 300, 400, 500, 600, 700, 800, 1000],        // Макс: 1000₽ (x2.1)
    529: [250, 300, 400, 500, 600, 700, 800, 1000, 1200],       // Макс: 1200₽ (x2.3)
    659: [300, 400, 500, 600, 700, 800, 1000, 1200, 1500],      // Макс: 1500₽ (x2.3)
    777: [350, 400, 500, 700, 800, 1000, 1200, 1500, 1800],     // Макс: 1800₽ (x2.3)
    819: [400, 500, 600, 700, 800, 1000, 1500, 1800, 2000],     // Макс: 2000₽ (x2.4)
    939: [400, 500, 700, 800, 1000, 1500, 1800, 2000, 2500],    // Макс: 2500₽ (x2.7)
    999: [500, 600, 700, 800, 1000, 1500, 2000, 2500, 3000],    // Макс: 3000₽ (x3.0)
    
    // Кейсы за фишки (более адекватная экономика)
    314: [150, 200, 250, 300, 400, 500, 600],                   // Макс: 600 (x1.9)
    542: [250, 300, 400, 500, 600, 800, 1000],                  // Макс: 1000 (x1.8)
    911: [400, 500, 600, 800, 1000, 1500, 2000],                // Макс: 2000 (x2.2)
    993: [500, 600, 800, 1000, 1500, 2000, 2500],               // Макс: 2500 (x2.5)
    1337: [600, 800, 1000, 1500, 2000, 2500, 3000, 4000]        // Макс: 4000 (x3.0)
  };

  // Все доступные цвета для рублевых призов
  const PRIZE_COLORS_RUBLES = {
    // Высокие призы (редкие)
    3000: ['red'],                              // Очень редко
    2500: ['red'],                              // Очень редко
    2000: ['red', 'blue'],                      // Редко
    1800: ['blue'],                             // Редко
    1500: ['blue', 'purple'],                   // Редко
    1200: ['purple'],                           // Средне-редко
    
    // Средние призы (обычные)
    1000: ['purple', 'yellow'],                 // Средне
    800: ['yellow'],                            // Средне
    700: ['yellow'],                            // Средне
    600: ['yellow', 'gray'],                    // Часто
    500: ['yellow', 'gray'],                    // Часто
    
    // Низкие призы (частые)
    400: ['gray'],                              // Часто
    350: ['gray'],                              // Часто
    300: ['gray'],                              // Часто
    250: ['gray'],                              // Очень часто
    200: ['gray'],                              // Очень часто
    150: ['gray'],                              // Очень часто
    100: ['gray']                               // Очень часто
  };

  // Все доступные цвета для фишек
  const PRIZE_COLORS_CHIPS = {
    // Высокие призы (редкие)
    4000: ['red'],                              // Очень редко
    3000: ['red'],                              // Очень редко
    2500: ['red', 'blue'],                      // Редко
    2000: ['blue'],                             // Редко
    1500: ['blue', 'purple'],                   // Редко
    
    // Средние призы (обычные)
    1000: ['purple', 'yellow'],                 // Средне
    800: ['yellow'],                            // Средне
    600: ['yellow', 'gray'],                    // Часто
    500: ['yellow', 'gray'],                    // Часто
    
    // Низкие призы (частые)
    400: ['gray'],                              // Часто
    300: ['gray'],                              // Часто
    250: ['gray'],                              // Очень часто
    200: ['gray'],                              // Очень часто
    150: ['gray']                               // Очень часто
  };

  // Функция для получения рандомного цвета для номинала
  function getRandomColor(prize, isChips = false) {
    const colors = isChips ? PRIZE_COLORS_CHIPS[prize] : PRIZE_COLORS_RUBLES[prize];
    if (!colors || colors.length === 0) return 'gray';
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Функция для получения путей к изображениям с учетом рандомного цвета
  function getPrizeImages(prize, isChips = false) {
    // ⚠️ ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ: не загружаем изображения с GitHub
    if (!ENABLE_PRIZE_IMAGES) {
      console.log('⚠️ Prize images loading is disabled');
      return {
        spin: '',
        preview: '',
        win: '',
        color: 'gray'
      };
    }
    
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
    const caseLoader = document.getElementById('case-loader');
    const modalContent = modal.querySelector('.modal-window-content');
    const titleWindow = modal.querySelector('.title-window span');
    const itemPreview = modal.querySelector('.item-preview-item');
    const contentWindow = modal.querySelector('.content-window-item');
    const winWindow = modal.querySelector('.win-window');
    
    // ОТКРЫВАЕМ МОДАЛКУ В РЕЖИМЕ ЗАГРУЗКИ (компактная)
    modal.classList.add('loading-state');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // СКРЫВАЕМ ВЕСЬ КОНТЕНТ КЕЙСА
    if (modalContent) {
      modalContent.style.opacity = '0';
      modalContent.style.visibility = 'hidden';
    }
    
    // ПОКАЗЫВАЕМ LOADER
    if (caseLoader) {
      caseLoader.classList.add('active');
    }
    
    // ПОДГОТАВЛИВАЕМ КОНТЕНТ (пока скрытый)
    if (titleWindow) {
      titleWindow.textContent = caseName;
      titleWindow.setAttribute('style', caseStyle);
    }

    if (itemPreview) {
      itemPreview.innerHTML = '';
      prizes.forEach(prize => {
        const container = document.createElement('div');
        container.className = 'prize-preview-container';
        container.setAttribute('data-prize', prize);
        container.setAttribute('data-is-chips', isChipsCase);
        container.style.width = '110px';
        container.style.height = '110px';
        
        itemPreview.appendChild(container);
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
    isSpinning = false;
    wonPrize = null;
    
    // ЧЕРЕЗ 1.5 СЕК: скрываем loader и показываем контент
    setTimeout(() => {
      // Убираем режим загрузки (модалка растянется под контент)
      modal.classList.remove('loading-state');
      
      // Скрываем loader
      if (caseLoader) {
        caseLoader.style.transition = 'opacity 0.4s ease';
        caseLoader.style.opacity = '0';
        
        setTimeout(() => {
          caseLoader.classList.remove('active');
          caseLoader.style.opacity = '1';
        }, 400);
      }
      
      // Показываем контент плавно
      if (modalContent) {
        modalContent.style.transition = 'opacity 0.5s ease, visibility 0s';
        modalContent.style.opacity = '1';
        modalContent.style.visibility = 'visible';
      }
    }, 1500);
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
      
      // УБРАЛИ width/height атрибуты для поддержки Retina
      img.src = prizeData.spin;
      img.style.width = '110px';
      img.style.height = '110px';
      img.style.imageRendering = '-webkit-optimize-contrast';
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
    
    // ⚠️ ВРЕМЕННО ОТКЛЮЧЕНО: не создаем <img> элементы
    // Создаем только div контейнер для ручного наполнения через HTML
    const winContainer = document.createElement('div');
    winContainer.className = 'prize-win-container';
    winContainer.setAttribute('data-prize', wonPrize);
    winContainer.setAttribute('data-is-chips', currentCase.isChipsCase);
    winContainer.setAttribute('data-color', window.winningColor || 'gray');
    winContainer.style.width = '110px';
    winContainer.style.height = '110px';
    // Здесь вы можете добавить свой HTML через innerHTML
    // winContainer.innerHTML = '<img src="..." />' или любой другой контент
    
    winItem.appendChild(winContainer);
    
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

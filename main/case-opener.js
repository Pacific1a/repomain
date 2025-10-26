// Case opening logic with balance integration
(function() {
  'use strict';

  const CASE_CONFIG = {
    279: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1500],
    329: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 2000],
    389: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 2000],
    419: [50, 100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2500],
    479: [100, 150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 3000],
    529: [150, 200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000],
    659: [200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    777: [200, 250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    819: [250, 300, 350, 400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
    999: [400, 500, 700, 777, 888, 1000, 1500, 2000, 2500, 3000, 4000, 5000]
  };

  const PRIZE_IMAGES = {
    5000: { spin: 'main/img/5000r-red.png', preview: 'main/img/5000r-prewiew.png', win: 'main/img/win-5000r-red.png', color: 'red' },
    4000: { spin: 'main/img/4000r-red.png', preview: 'main/img/4000r-prewiew.png', win: 'main/img/win-4000r-red.png', color: 'red' },
    3000: { spin: 'main/img/3000r-red.png', preview: 'main/img/3000r-prewiew-red.png', win: 'main/img/win-3000r-red.png', color: 'red' },
    2500: { spin: 'main/img/2500r-blue.png', preview: 'main/img/2500r-prewiew.png', win: 'main/img/win-2500r-blue.png', color: 'blue' },
    2000: { spin: 'main/img/2000r-blue.png', preview: 'main/img/2000r-prewiew.png', win: 'main/img/win-2000r-blue.png', color: 'blue' },
    1500: { spin: 'main/img/1500r-purple.png', preview: 'main/img/1500r-prewiew.png', win: 'main/img/win-1500r-purple.png', color: 'purple' },
    1000: { spin: 'main/img/1000r-purple.png', preview: 'main/img/1000r-prewiew.png', win: 'main/img/win-1000r-purple.png', color: 'purple' },
    888: { spin: 'main/img/888r-purple.png', preview: 'main/img/888r-prewiew.png', win: 'main/img/win-888r-purple.png', color: 'purple' },
    777: { spin: 'main/img/777r-yellow.png', preview: 'main/img/777r-prewiew.png', win: 'main/img/win-777r-yellow.png', color: 'yellow' },
    700: { spin: 'main/img/700r-purple.png', preview: 'main/img/700r-prewiew.png', win: 'main/img/win-700r-purple.png', color: 'purple' },
    500: { spin: 'main/img/500r-yellow.png', preview: 'main/img/500r-prewiew.png', win: 'main/img/win-500r-yellow.png', color: 'yellow' },
    400: { spin: 'main/img/400r-yellow.png', preview: 'main/img/400r-prewiew.png', win: 'main/img/win-400r-yellow.png', color: 'yellow' },
    350: { spin: 'main/img/350r-yellow.png', preview: 'main/img/350r-prewiew.png', win: 'main/img/win-350r-yellow.png', color: 'yellow' },
    300: { spin: 'main/img/300r-yellow.png', preview: 'main/img/300r-prewiew.png', win: 'main/img/win-300r-yellow.png', color: 'yellow' },
    250: { spin: 'main/img/250r-gray.png', preview: 'main/img/250r-prewiew.png', win: 'main/img/win-250r-gray.png', color: 'gray' },
    200: { spin: 'main/img/200r-gray.png', preview: 'main/img/200r-prewiew.png', win: 'main/img/win-200r-gray.png', color: 'gray' },
    150: { spin: 'main/img/150r-gray.png', preview: 'main/img/150r-prewiew.png', win: 'main/img/win-150r-gray.png', color: 'gray' },
    100: { spin: 'main/img/100r-gray.png', preview: 'main/img/100r-prewiew.png', win: 'main/img/win-100r-gray.png', color: 'gray' },
    50: { spin: 'main/img/50r-gray.png', preview: 'main/img/50r-prewiew.png', win: 'main/img/win-50r-gray.png', color: 'gray' }
  };

  let currentCase = null;
  let isSpinning = false;
  let wonPrize = null;

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
        img.src = PRIZE_IMAGES[prize]?.preview || '';
        img.alt = `${prize}₽`;
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
      low: 15,
      veryLow: 20
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
      img.src = PRIZE_IMAGES[prize]?.spin || '';
      img.alt = `${prize}₽`;
      img.dataset.value = prize;
      img.loading = 'lazy';
      fragment.appendChild(img);
    });
    container.appendChild(fragment);
  }

  async function spinCase() {
    if (isSpinning) return;
    
    const currency = currentCase.isChipsCase ? 'chips' : 'rubles';
    
    if (!window.GameBalanceAPI) {
      alert('Система баланса не загружена');
      return;
    }

    if (!window.GameBalanceAPI.canPlaceBet(currentCase.price, currency)) {
      alert(`Недостаточно средств! Требуется: ${currentCase.price}${currency === 'chips' ? ' chips' : '₽'}`);
      return;
    }

    const success = await window.GameBalanceAPI.placeBet(currentCase.price, currency);
    if (!success) {
      alert('Ошибка при списании средств');
      return;
    }

    isSpinning = true;
    document.querySelector('.open-btn button').disabled = true;

    wonPrize = selectRandomPrize(currentCase.prizes);
    
    const contentWindow = document.querySelector('.content-window-item');
    const images = contentWindow.querySelectorAll('img');
    
    const itemWidth = 65;
    const containerWidth = document.querySelector('.content-window').offsetWidth;
    const centerPosition = containerWidth / 2;
    
    const minIndex = Math.floor(images.length * 0.70);
    const maxIndex = Math.floor(images.length * 0.80);
    const winningIndex = Math.floor(Math.random() * (maxIndex - minIndex) + minIndex);
    
    const winningImg = document.createElement('img');
    winningImg.src = PRIZE_IMAGES[wonPrize]?.spin || '';
    winningImg.alt = `${wonPrize}₽`;
    winningImg.dataset.value = wonPrize;
    winningImg.loading = 'lazy';
    winningImg.style.width = '60px';
    winningImg.style.height = '60px';
    winningImg.style.flexShrink = '0';
    
    if (images[winningIndex]) {
      images[winningIndex].replaceWith(winningImg);
    }
    
    const imageCenterPosition = (winningIndex * itemWidth) + (itemWidth / 2);
    const targetOffset = centerPosition - imageCenterPosition;
    
    console.log('DEBUG: wonPrize =', wonPrize, 'index =', winningIndex, 'containerW =', containerWidth, 'centerPos =', centerPosition, 'imgCenter =', imageCenterPosition, 'offset =', targetOffset);
    
    contentWindow.style.transition = 'transform 6.5s cubic-bezier(0.22, 1, 0.36, 1)';
    contentWindow.style.transform = `translateX(${targetOffset}px)`;

    setTimeout(() => {
      const finalImage = document.elementFromPoint(centerPosition + document.querySelector('.content-window').getBoundingClientRect().left, window.innerHeight / 2);
      console.log('DEBUG: Final image under indicator:', finalImage?.dataset?.value);
      showWinResult();
    }, 6800);
  }

  function selectRandomPrize(prizes) {
    const weights = prizes.map(prize => {
      if (prize >= 3000) return 2;
      if (prize >= 2000) return 5;
      if (prize >= 1000) return 15;
      if (prize >= 500) return 25;
      if (prize >= 300) return 30;
      return 50;
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
    const winWindow = document.querySelector('.win-window');
    const winItem = winWindow.querySelector('.win-window-item');
    
    winItem.innerHTML = '';
    const winImg = document.createElement('img');
    winImg.src = PRIZE_IMAGES[wonPrize]?.win || '';
    winImg.alt = `WIN ${wonPrize}₽`;
    winItem.appendChild(winImg);

    winWindow.style.display = 'flex';
    document.querySelector('.keep-it').style.display = 'block';

    isSpinning = false;
  }

  async function keepPrize() {
    if (!wonPrize) return;

    await window.GameBalanceAPI.payWinnings(wonPrize, 'rubles');
    
    alert(`🎉 Поздравляем! Вы выиграли ${wonPrize}₽`);
    
    closeModal();
  }

  function closeModal() {
    const modal = document.querySelector('.modal-window');
    const contentWindow = document.querySelector('.content-window-item');
    
    if (contentWindow) {
      contentWindow.style.transition = 'none';
      contentWindow.style.transform = 'translateX(0)';
    }

    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentCase = null;
    isSpinning = false;
    wonPrize = null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCaseOpener);
  } else {
    initCaseOpener();
  }
})();

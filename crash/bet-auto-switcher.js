(function() {
  'use strict';

  // ============ ELEMENTS ============
  const elements = {
    betButton: document.querySelector('.bet-section-2 .bet'),
    autoButton: document.querySelector('.bet-section-2 .div-wrapper-3'),
    autoSection: document.querySelector('.auto-section'),
    betSection: document.querySelector('.bet-2'),
    switcherBg: document.querySelector('.bg-svitch'),
    switcherToggle: document.querySelector('.bg-sv'),
    multiplierSpan: document.querySelector('.text-auto-2 span:first-child'),
    multiplierContainer: document.querySelector('.text-auto-2')
  };

  let currentMode = 'bet'; // 'bet' или 'auto'
  let autoCashOutEnabled = false; // Включен ли авто-вывод
  let autoCashOutMultiplier = 2.0; // Множитель для авто-вывода (по умолчанию 2.0x)
  let isGameActive = false; // Блокировка изменений во время игры

  // ============ SWITCH MODE ============
  function switchMode(mode) {
    currentMode = mode;

    if (mode === 'bet') {
      // Режим Bet активен
      elements.betButton.classList.add('bet');
      elements.betButton.classList.remove('div-wrapper-3');
      
      elements.autoButton.classList.add('div-wrapper-3');
      elements.autoButton.classList.remove('bet');
      
      // Скрываем Auto Cash Out секцию
      if (elements.autoSection) {
        elements.autoSection.style.display = 'none';
      }
      
      // Показываем обычную секцию ставок
      if (elements.betSection) {
        elements.betSection.style.display = 'flex';
      }
    } else if (mode === 'auto') {
      // Режим Auto активен
      elements.betButton.classList.add('div-wrapper-3');
      elements.betButton.classList.remove('bet');
      
      elements.autoButton.classList.add('bet');
      elements.autoButton.classList.remove('div-wrapper-3');
      
      // Показываем Auto Cash Out секцию
      if (elements.autoSection) {
        elements.autoSection.style.display = 'flex';
      }
      
    
    }
  }

  // ============ AUTO CASH OUT TOGGLE ============
  function toggleAutoCashOut() {
    if (isGameActive) return; // Блокировка во время игры
    autoCashOutEnabled = !autoCashOutEnabled;
    updateSwitcherUI();
  }

  function updateSwitcherUI() {
    if (!elements.switcherToggle) return;

    if (autoCashOutEnabled) {
      // Включен - переключатель справа, зеленый
      elements.switcherToggle.style.marginLeft = 'auto';
      elements.switcherToggle.style.backgroundColor = 'rgb(255, 255, 255)';
    } else {
      // Выключен - переключатель слева, серый
      elements.switcherToggle.style.marginLeft = '5px';
      elements.switcherToggle.style.backgroundColor = 'rgb(97, 97, 97)';
    }
  }

  // ============ MULTIPLIER MANAGEMENT ============
  function updateMultiplierDisplay() {
    if (elements.multiplierSpan) {
      elements.multiplierSpan.textContent = autoCashOutMultiplier.toFixed(1);
    }
  }

  function increaseMultiplier() {
    if (autoCashOutMultiplier < 100) {
      autoCashOutMultiplier += 0.5;
      updateMultiplierDisplay();
    }
  }

  function decreaseMultiplier() {
    if (autoCashOutMultiplier > 1.1) {
      autoCashOutMultiplier -= 0.5;
      updateMultiplierDisplay();
    }
  }

  function enableMultiplierInput() {
    if (!elements.multiplierSpan || isGameActive) return; // Блокировка во время игры
    
    const currentValue = autoCashOutMultiplier.toFixed(1);
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentValue;
    input.min = '1.1';
    input.max = '100';
    input.step = '0.1';
    input.style.cssText = `
      width: 35px;
      background: transparent;
      border: none;
      color: #aeaeaec5;
      font-family: 'Montserrat', Helvetica;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      outline: none;
    `;
    
    elements.multiplierSpan.style.display = 'none';
    elements.multiplierContainer.insertBefore(input, elements.multiplierSpan);
    input.focus();
    input.select();
    
    const finishEdit = () => {
      const value = parseFloat(input.value);
      if (!isNaN(value) && value >= 1.1 && value <= 100) {
        autoCashOutMultiplier = value;
      }
      input.remove();
      elements.multiplierSpan.style.display = 'inline';
      updateMultiplierDisplay();
    };
    
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishEdit();
      if (e.key === 'Escape') {
        input.remove();
        elements.multiplierSpan.style.display = 'inline';
      }
    });
  }
  
  function clearMultiplier() {
    if (isGameActive) return; // Блокировка во время игры
    autoCashOutMultiplier = 1.1;
    updateMultiplierDisplay();
  }

  // ============ EVENT LISTENERS ============
  if (elements.betButton) {
    elements.betButton.addEventListener('click', () => {
      switchMode('bet');
    });
  }

  if (elements.autoButton) {
    elements.autoButton.addEventListener('click', () => {
      switchMode('auto');
    });
  }

  // Переключатель Auto Cash Out
  if (elements.switcherBg) {
    elements.switcherBg.addEventListener('click', toggleAutoCashOut);
  }

  // Клик на множитель для изменения
  if (elements.multiplierContainer) {
    elements.multiplierContainer.addEventListener('click', enableMultiplierInput);
  }

  // Колесико мыши для изменения множителя
  if (elements.multiplierContainer) {
    elements.multiplierContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (isGameActive) return;
      if (e.deltaY < 0) {
        increaseMultiplier();
      } else {
        decreaseMultiplier();
      }
    });
  }

  // Кнопка очистки (×)
  const closeButton = document.querySelector('.text-auto-2 .close');
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Не вызывать enableMultiplierInput
      clearMultiplier();
    });
  }

  // ============ EXPORT ============
  window.BetAutoSwitcher = {
    getCurrentMode: () => currentMode,
    switchToBet: () => switchMode('bet'),
    switchToAuto: () => switchMode('auto'),
    isAutoCashOutEnabled: () => autoCashOutEnabled,
    getAutoCashOutMultiplier: () => autoCashOutMultiplier,
    setAutoCashOutMultiplier: (value) => {
      if (value >= 1.1 && value <= 100) {
        autoCashOutMultiplier = value;
        updateMultiplierDisplay();
      }
    },
    setGameActive: (active) => {
      isGameActive = active;
      // Визуально показываем блокировку
      if (elements.autoSection) {
        elements.autoSection.style.opacity = active ? '0.6' : '1';
        elements.autoSection.style.pointerEvents = active ? 'none' : 'auto';
      }
    }
  };

  // ============ INIT ============
  function init() {
    switchMode('bet'); // По умолчанию режим Bet
    updateSwitcherUI();
    updateMultiplierDisplay();
    console.log('🎮 Bet/Auto Switcher готов!');
    console.log('Auto Cash Out:', autoCashOutEnabled ? 'Включен' : 'Выключен');
    console.log('Множитель:', autoCashOutMultiplier + 'x');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

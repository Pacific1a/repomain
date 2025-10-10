(function() {
  'use strict';

  // ============ СОСТОЯНИЯ ============
  const GAME_STATES = {
    WAITING: 'waiting',
    FLYING: 'flying',
    CRASHED: 'crashed'
  };

  const BUTTON_STATES = {
    BET: 'bet',
    CANCEL: 'cancel',
    CASHOUT: 'cashout'
  };

  let gameState = GAME_STATES.WAITING;
  let buttonState = BUTTON_STATES.BET;
  let playerBetAmount = 0;
  let playerHasBet = false;
  let playerCashedOut = false;
  let betPlacedDuringFlight = false; // Флаг: ставка сделана во время полета (для следующего раунда)
  let currentMultiplier = 1.00;
  let players = [];
  let ws = null;
  let autoCashOutEnabled = false;
  let autoCashOutMultiplier = 2.0;
  let crashChart = null;
  let crashHistory = [];
  
  // Debounce для обновлений UI
  let updateUIScheduled = false;
  let playerElementsCache = new Map();

  // ============ ЭЛЕМЕНТЫ ============
  const elements = {
    // Игра
    waitingRoot: document.getElementById('waitingRoot'),
    waitingTimer: null, // Создадим динамически
    multiplierLayer: document.getElementById('multiplierLayer'),
    currentMultiplier: document.getElementById('currentMultiplier'),
    gameEnded: document.querySelector('.game-ended'),
    crashHistory: document.getElementById('crashHistory'),
    
    // Ставка
    betInput: document.querySelector('#betInput'),
    betButton: document.querySelector('.cancel-button-next'),
    betButtonText: document.querySelector('.cancel-button-next .text-wrapper-15'),
    betButtonChips: document.querySelector('.cancel-button-next .text-wrapper-16'),
    minusBtn: document.querySelector('.button'),
    plusBtn: document.querySelector('.union-wrapper'),
    multiplyButtons: document.querySelectorAll('.button-2'),
    
    // Auto Cash Out
    autoSection: document.querySelector('.auto-section'),
    autoSwitcher: document.querySelector('.bg-svitch'),
    autoSwitcherBg: document.querySelector('.bg-sv'),
    autoInput: document.querySelector('.text-auto-2 span:first-child'),
    autoClear: document.querySelector('.text-auto-2 .close'),
    
    // Статистика
    totalBetsCount: document.querySelector('.total-bets .text-wrapper-17'),
    totalWinAmount: document.querySelector('.total-win .text-wrapper-19'),
    progressBar: document.querySelector('.progress-bar .rectangle-3'),
    
    // Игроки
    playersList: document.querySelector('.user-templates')
  };
  
  // Инициализация UI при загрузке
  if (elements.gameEnded) {
    elements.gameEnded.style.display = 'none';
  }
  
  // Создаем эффект загрузки (стеклянный блюр) - С САМОГО НАЧАЛА
  const gameContainer = document.querySelector('.game');
  if (gameContainer) {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.style.opacity = '1';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.innerHTML = `
      <div class="glass-loader">
        <div class="glass-shine"></div>
      </div>
    `;
    gameContainer.appendChild(loadingOverlay);
    elements.loadingOverlay = loadingOverlay;
  }
  
  // Флаг что данные получены
  let dataReceived = false;
  
  // Инициализируем график с передачей элемента множителя
  if (gameContainer && window.CrashChart && elements.currentMultiplier) {
    crashChart = new window.CrashChart(gameContainer, elements.currentMultiplier);
    crashChart.stop();
  }
  
  // Скрываем все блоки при загрузке
  if (elements.multiplierLayer) {
    elements.multiplierLayer.style.display = 'none';
  }
  
  if (elements.waitingRoot) {
    elements.waitingRoot.style.display = 'none';
    
    // Создаем таймер динамически
    const timerSpan = document.createElement('span');
    timerSpan.textContent = '0';
    elements.waitingRoot.appendChild(timerSpan);
    elements.waitingTimer = timerSpan;
  }
  
  // Обнуляем статистику
  if (elements.totalBetsCount) {
    elements.totalBetsCount.textContent = '0/550';
  }
  if (elements.totalWinAmount) {
    elements.totalWinAmount.textContent = '0';
  }
  if (elements.progressBar) {
    elements.progressBar.style.width = '0%';
  }

  // ============ WEBSOCKET ============
  
  // Функция обновления доступности Auto Cash Out секции
  function updateAutoSectionState() {
    // Блокируем Auto Cash Out как только сделана ставка (до момента завершения раунда)
    const isDisabled = playerHasBet && !playerCashedOut;
    
    if (elements.autoSection) {
      if (isDisabled) {
        elements.autoSection.style.opacity = '0.5';
        elements.autoSection.style.pointerEvents = 'none';
        elements.autoSection.style.cursor = 'not-allowed';
      } else {
        elements.autoSection.style.opacity = '1';
        elements.autoSection.style.pointerEvents = 'auto';
        elements.autoSection.style.cursor = 'default';
      }
    }
  }
  
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ Crash WebSocket готов');
      initWebSocket();
    } else {
      setTimeout(waitForWebSocket, 100); // Уменьшил задержку 500ms → 100ms
    }
  }

  function initWebSocket() {
    console.log('🚀 Crash WebSocket инициализация...');
    
    // Подключаемся к комнате
    ws.socket.emit('join_game', { game: 'crash' });

    // Синхронизация состояния
    ws.socket.on('game_state_sync', (state) => {
      console.log('🔄 Crash состояние:', state);
      
      // Убираем загрузку при первом получении данных
      if (!dataReceived && elements.loadingOverlay) {
        dataReceived = true;
        setTimeout(() => {
          elements.loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            elements.loadingOverlay.style.display = 'none';
          }, 500);
        }, 300);
      }
      
      players = state.players || [];
      scheduleUIUpdate();
      
      // Синхронизируем состояние игры при подключении
      if (state.status === 'flying' && gameState === GAME_STATES.WAITING) {
        // Игра уже идет, переключаем состояние
        gameState = GAME_STATES.FLYING;
        updateAutoSectionState(); // Блокируем Auto Cash Out
        
        // Скрываем waiting overlay
        if (elements.waitingRoot) {
          elements.waitingRoot.style.display = 'none';
        }
        if (elements.multiplierLayer) {
          elements.multiplierLayer.style.display = 'flex';
        }
        
        // Показываем график
        if (crashChart && crashChart.canvas) {
          crashChart.canvas.style.opacity = '1';
          crashChart.canvas.style.visibility = 'visible';
        }
        
        // Восстанавливаем историю графика
        if (crashChart && !crashChart.isCrashed && state.startTime) {
          const startTime = new Date(state.startTime).getTime();
          const now = Date.now();
          const elapsed = now - startTime;
          
          // Восстанавливаем startTime графика
          crashChart.startTime = startTime;
          crashChart.points = [];
          
          // Генерируем историю точек от 1.00x до текущего момента
          // Рост: +0.02x каждые 350ms
          const updateInterval = 350;
          const step = 0.02;
          const numUpdates = Math.floor(elapsed / updateInterval);
          
          // Добавляем начальную точку
          crashChart.points.push({ time: 0, multiplier: 1.00 });
          
          // Генерируем промежуточные точки
          for (let i = 1; i <= numUpdates; i++) {
            const pointTime = i * updateInterval;
            const pointMultiplier = parseFloat((1.00 + i * step).toFixed(2));
            crashChart.points.push({ time: pointTime, multiplier: pointMultiplier });
          }
          
          // Используем множитель с сервера если он есть, иначе вычисляем
          const serverMultiplier = state.multiplier || null;
          const calculatedMultiplier = serverMultiplier || parseFloat((1.00 + numUpdates * step).toFixed(2));
          currentMultiplier = calculatedMultiplier;
          
          // Если есть множитель с сервера и он отличается - добавляем точку с ним
          if (serverMultiplier && serverMultiplier > calculatedMultiplier) {
            crashChart.points.push({ time: elapsed, multiplier: serverMultiplier });
          }
          
          // Обновляем отображение
          if (elements.currentMultiplier) {
            elements.currentMultiplier.textContent = `${calculatedMultiplier.toFixed(2)}x`;
            elements.currentMultiplier.classList.remove('crashed');
          }
          
          console.log(`📊 Восстановлено ${crashChart.points.length} точек графика, множитель: ${calculatedMultiplier.toFixed(2)}x`);
        }
        
        // Запускаем график если есть
        if (crashChart && !crashChart.isCrashed) {
          crashChart.start();
        }
      }
      
      // НЕ сбрасываем локальное состояние игрока
      // playerHasBet, playerCashedOut, playerBetAmount остаются неизменными
    });

    // Новая ставка
    ws.socket.on('player_bet', (data) => {
      console.log('💰 Ставка:', data);
      
      const existing = players.find(p => p.userId === data.userId);
      if (existing) {
        existing.bet += data.bet;
      } else {
        players.push({
          userId: data.userId,
          nickname: data.nickname,
          photoUrl: data.photoUrl,
          bet: data.bet,
          cashout: null,
          multiplier: null
        });
      }
      
      scheduleUIUpdate();
    });

    // Игрок отменил ставку
    ws.socket.on('player_removed', (data) => {
      console.log('❌ Игрок удален:', data);
      
      const index = players.findIndex(p => p.userId === data.userId);
      if (index !== -1) {
        players.splice(index, 1);
        scheduleUIUpdate();
      }
    });

    // Таймер ожидания
    ws.socket.on('crash_waiting', (data) => {
      console.log('⏳ Ожидание:', data.timeLeft);
      gameState = GAME_STATES.WAITING;
      currentMultiplier = 1.00;
      updateAutoSectionState(); // Разблокируем Auto Cash Out
      
      // Сбрасываем визуальный коэффициент в период ожидания
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = '1.00x';
        elements.currentMultiplier.classList.remove('crashed');
      }
      
      // Убираем загрузку ТОЛЬКО КОГДА ПОЛУЧЕНЫ ДАННЫЕ
      if (!dataReceived && elements.loadingOverlay) {
        dataReceived = true;
        setTimeout(() => {
          elements.loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            elements.loadingOverlay.style.display = 'none';
          }, 500);
        }, 300);
      }
      
      // Показываем waiting
      if (elements.waitingRoot) {
        elements.waitingRoot.style.display = 'flex';
        elements.waitingRoot.style.visibility = 'visible';
      }
      if (elements.multiplierLayer) {
        elements.multiplierLayer.style.display = 'none';
      }
      
      // Скрываем график
      if (crashChart && crashChart.canvas) {
        crashChart.canvas.style.opacity = '0';
        crashChart.canvas.style.visibility = 'hidden';
        crashChart.stop();
      }
      
      // Обновляем таймер всегда
      if (elements.waitingTimer) {
        elements.waitingTimer.textContent = data.timeLeft;
      }
      
      // Если есть ставка - показываем CANCEL
      if (playerHasBet && !playerCashedOut) {
        setButtonState(BUTTON_STATES.CANCEL);
      }
    });

    // Игра началась
    ws.socket.on('crash_started', async (data) => {
      console.log('🚀 Crash начался!');
      gameState = GAME_STATES.FLYING;
      currentMultiplier = 1.00;
      updateAutoSectionState(); // Блокируем Auto Cash Out
      
      // Убираем загрузку ТОЛЬКО КОГДА ПОЛУЧЕНЫ ДАННЫЕ
      if (!dataReceived && elements.loadingOverlay) {
        dataReceived = true;
        setTimeout(() => {
          elements.loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            elements.loadingOverlay.style.display = 'none';
          }, 500);
        }, 300);
      }
      
      // Скрываем waiting
      if (elements.waitingRoot) {
        elements.waitingRoot.style.display = 'none';
      }
      // Показываем HTML множитель
      if (elements.multiplierLayer) {
        elements.multiplierLayer.style.display = 'flex';
        // Принудительная перерисовка элемента
        void elements.multiplierLayer.offsetHeight;
      }
      
      // Скрываем "Round ended"
      if (elements.gameEnded) {
        elements.gameEnded.style.display = 'none';
      }
      
      // Показываем график
      if (crashChart && crashChart.canvas) {
        crashChart.canvas.style.opacity = '1';
        crashChart.canvas.style.visibility = 'visible';
      }
      
      // Принудительно устанавливаем 1.00x перед запуском графика
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = '1.00x';
        elements.currentMultiplier.classList.remove('crashed');
        // Принудительная перерисовка текста
        void elements.currentMultiplier.offsetHeight;
      }
      
      // Запускаем график (график тоже установит 1.00x)
      if (crashChart) {
        crashChart.start();
      }
      
      // Обрабатываем ставки - списываем баланс для ВСЕХ зарезервированных ставок
      if (playerHasBet && !playerCashedOut) {
        // Списываем баланс независимо от того когда была сделана ставка
        const success = await window.GameBalanceAPI.placeBet(playerBetAmount, 'chips');
        if (!success) {
          // Если не хватает баланса - отменяем ставку
          console.log('❌ Недостаточно фишек для активации ставки');
          playerBetAmount = 0;
          playerHasBet = false;
          playerCashedOut = false;
          betPlacedDuringFlight = false;
          setButtonState(BUTTON_STATES.BET);
          updateAutoSectionState();
          return;
        }
        
        // Баланс списан успешно, отправляем ставку на сервер
        if (ws) {
          const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456789;
          const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
          const nickname = tgUser?.first_name || 'Test';
          const photoUrl = tgUser?.photo_url || null;

          ws.socket.emit('place_bet', {
            game: 'crash',
            userId,
            nickname,
            photoUrl,
            bet: playerBetAmount
          });
        }
        
        // Активируем ставку для текущего раунда
        betPlacedDuringFlight = false;
        setButtonState(BUTTON_STATES.CASHOUT);
        updateAutoSectionState(); // Блокируем Auto Cash Out так как ставка активна
        console.log('✅ Ставка активирована для текущего раунда, баланс списан');
      } else if (playerHasBet && playerCashedOut) {
        // Уже забрали - показываем BET для следующего раунда
        setButtonState(BUTTON_STATES.BET);
        updateAutoSectionState(); // Разблокируем Auto Cash Out так как уже забрали
      }
    });

    // Обновление множителя
    ws.socket.on('crash_multiplier', (data) => {
      // Принимаем множитель если игра в FLYING или CRASHED состоянии
      // Игнорируем только в WAITING (чтобы избежать race condition с crash_started)
      if (gameState === GAME_STATES.WAITING) {
        console.warn('⚠️ Получен множитель в WAITING состоянии, игнорируем');
        return;
      }
      
      currentMultiplier = data.multiplier;
      
      // Обновляем график (график сам обновит текст множителя)
      if (crashChart) {
        crashChart.updateMultiplier(data.multiplier);
      }
      
      // Обновляем live выигрыш ТОЛЬКО на желтой кнопке CASH OUT
      if (playerHasBet && !playerCashedOut && buttonState === BUTTON_STATES.CASHOUT && elements.betButtonChips) {
        const potentialWin = Math.floor(playerBetAmount * currentMultiplier);
        elements.betButtonChips.textContent = `${potentialWin} chips`;
      }
      
      // Auto Cash Out
      if (autoCashOutEnabled && playerHasBet && !playerCashedOut && currentMultiplier >= autoCashOutMultiplier) {
        console.log(`🤖 Auto Cash Out на ${currentMultiplier.toFixed(2)}x`);
        performCashOut();
      }
    });

    // Игрок забрал
    ws.socket.on('player_cashout', (data) => {
      console.log('💵 Забрал:', data);
      
      const player = players.find(p => p.userId === data.userId);
      if (player) {
        player.cashout = data.cashout;
        player.multiplier = data.multiplier;
      }
      
      scheduleUIUpdate();
    });

    // Краш
    ws.socket.on('crash_ended', (data) => {
      console.log('💥 Краш на:', data.crashPoint);
      gameState = GAME_STATES.CRASHED;
      currentMultiplier = data.crashPoint;
      
      // Анимация краша на графике (график сам обновит текст множителя)
      if (crashChart) {
        crashChart.crash(data.crashPoint);
      }
      
      // Показываем "Round ended"
      if (elements.gameEnded) {
        elements.gameEnded.style.display = 'block';
      }
      
      // Добавляем в историю
      addToCrashHistory(data.crashPoint);
      
      // Сбрасываем только если НЕ забрали
      if (playerHasBet && !playerCashedOut) {
        // Если ставка была сделана во время полета - НЕ сбрасываем флаги
        // Они нужны для следующего раунда
        if (!betPlacedDuringFlight) {
          // Обычный проигрыш - сбрасываем все
          playerHasBet = false;
          playerBetAmount = 0;
          playerCashedOut = false;
        }
        // betPlacedDuringFlight НЕ сбрасываем - он нужен для следующего раунда
      }
      
      // Устанавливаем состояние кнопки в зависимости от наличия отложенной ставки
      if (betPlacedDuringFlight) {
        setButtonState(BUTTON_STATES.CANCEL);
      } else {
        setButtonState(BUTTON_STATES.BET);
      }
      
      // Обновляем состояние Auto Cash Out ПОСЛЕ сброса флагов
      updateAutoSectionState();
    });
  }

  // ============ СТАВКА ============
  function getBetAmount() {
    return parseInt(elements.betInput?.value) || 50;
  }

  function setBetAmount(amount) {
    if (elements.betInput) {
      elements.betInput.value = Math.max(50, amount);
    }
  }

  // Кнопки +/- (активны всегда)
  if (elements.minusBtn) {
    elements.minusBtn.addEventListener('click', () => {
      setBetAmount(getBetAmount() - 50);
      if (buttonState === BUTTON_STATES.BET) {
        setButtonState(BUTTON_STATES.BET); // Обновляем текст
      }
    });
  }

  if (elements.plusBtn) {
    elements.plusBtn.addEventListener('click', () => {
      setBetAmount(getBetAmount() + 50);
      if (buttonState === BUTTON_STATES.BET) {
        setButtonState(BUTTON_STATES.BET); // Обновляем текст
      }
    });
  }
  
  // Кнопки умножения (1x, 2x, 5x, 10x) - активны всегда
  if (elements.multiplyButtons) {
    elements.multiplyButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const multipliers = [1, 2, 5, 10];
        const current = getBetAmount();
        setBetAmount(current * multipliers[index]);
        if (buttonState === BUTTON_STATES.BET) {
          setButtonState(BUTTON_STATES.BET); // Обновляем текст
        }
      });
    });
  }

  // ============ КНОПКА BET/CANCEL/CASHOUT ============
  function setButtonState(state) {
    buttonState = state;
    const betButton = elements.betButton;
    if (!betButton) return;

    const textEl = elements.betButtonText;
    const chipsEl = elements.betButtonChips;

    switch(state) {
      case BUTTON_STATES.BET:
        if (textEl) textEl.textContent = 'BET';
        if (chipsEl) chipsEl.textContent = `${getBetAmount()} chips`;
        betButton.style.background = 'linear-gradient(90deg, #407B3D 0%, #54A450 100%)';
        break;
        
      case BUTTON_STATES.CANCEL:
        if (textEl) textEl.textContent = 'CANCEL';
        if (chipsEl) chipsEl.textContent = 'Wait to next round';
        betButton.style.background = 'linear-gradient(90deg, #874041 0%, #BA5759 100%)';
        break;
        
      case BUTTON_STATES.CASHOUT:
        if (textEl) textEl.textContent = 'CASH OUT';
        if (chipsEl) {
          const potentialWin = Math.floor(playerBetAmount * currentMultiplier);
          chipsEl.textContent = `${potentialWin} chips`;
        }
        betButton.style.background = 'linear-gradient(90deg, #877440 0%, #BAA657 100%)';
        break;
    }
  }

  // Функция Cash Out
  async function performCashOut() {
    if (!playerHasBet || playerCashedOut) return;
    
    // Нельзя забрать если ставка для следующего раунда
    if (betPlacedDuringFlight) {
      console.log('⚠️ Нельзя забрать ставку для следующего раунда');
      return;
    }
    
    const winAmount = Math.floor(playerBetAmount * currentMultiplier);
    await window.GameBalanceAPI.payWinnings(winAmount, 'chips');
    
    playerCashedOut = true;
    betPlacedDuringFlight = false; // Сбрасываем флаг
    setButtonState(BUTTON_STATES.BET);
    updateAutoSectionState(); // Разблокируем Auto Cash Out после забирания
    
    // Отправляем на сервер
    if (ws) {
      const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456789;
      
      ws.socket.emit('crash_cashout', {
        game: 'crash',
        userId
      });
    }
    
    console.log(`💰 Cash Out: ${winAmount} chips (${currentMultiplier.toFixed(2)}x)`);
  }

  if (elements.betButton) {
    elements.betButton.addEventListener('click', async () => {
      if (buttonState === BUTTON_STATES.BET && gameState !== GAME_STATES.FLYING) {
        // Резервируем ставку в период ожидания (баланс НЕ списываем)
        const betAmount = getBetAmount();
        
        if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
          console.log('❌ Недостаточно фишек');
          return;
        }
        
        // Только проверяем баланс, но НЕ списываем
        // Баланс будет списан когда раунд начнется
        playerBetAmount = betAmount;
        playerHasBet = true;
        playerCashedOut = false;
        betPlacedDuringFlight = false; // Ставка в период ожидания
        setButtonState(BUTTON_STATES.CANCEL);
        updateAutoSectionState();
        
        console.log(`✅ Ставка зарезервирована: ${betAmount} chips (баланс будет списан при старте раунда)`);
      } else if (buttonState === BUTTON_STATES.BET && gameState === GAME_STATES.FLYING) {
        // Резервируем ставку на следующий раунд (баланс НЕ списываем)
        const betAmount = getBetAmount();
        
        if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
          console.log('❌ Недостаточно фишек');
          return;
        }
        
        // Только проверяем что хватает баланса, но НЕ списываем
        // Баланс будет списан только когда начнется следующий раунд
        playerBetAmount = betAmount;
        playerHasBet = true;
        playerCashedOut = false;
        betPlacedDuringFlight = true; // Помечаем что ставка сделана во время полета
        setButtonState(BUTTON_STATES.CANCEL);
        updateAutoSectionState();
        
        console.log(`✅ Ставка зарезервирована на следующий раунд: ${betAmount} chips (баланс будет списан при старте)`);
      } else if (buttonState === BUTTON_STATES.CANCEL) {
        // Отменяем ставку
        // Баланс НЕ возвращаем, так как он еще не был списан
        
        // Отправляем на сервер отмену ставки только если она была отправлена
        if (!betPlacedDuringFlight && ws) {
          const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456789;
          
          ws.socket.emit('cancel_bet', {
            game: 'crash',
            userId
          });
        }
        
        console.log('❌ Резервирование ставки отменено');
        
        playerBetAmount = 0;
        playerHasBet = false;
        playerCashedOut = false;
        betPlacedDuringFlight = false;
        setButtonState(BUTTON_STATES.BET);
        updateAutoSectionState();
      } else if (buttonState === BUTTON_STATES.CASHOUT) {
        // Забираем выигрыш
        await performCashOut();
      }
    });
  }

  // ============ ИСТОРИЯ КРАШЕЙ ============
  function addToCrashHistory(crashPoint) {
    crashHistory.unshift(crashPoint);
    
    if (crashHistory.length > 10) {
      crashHistory = crashHistory.slice(0, 10);
    }
    
    updateCrashHistoryUI();
  }
  
  function updateCrashHistoryUI() {
    if (!elements.crashHistory) return;
    
    elements.crashHistory.innerHTML = '';
    
    crashHistory.forEach(point => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const color = point >= 2.0 ? '#54A450' : point >= 1.5 ? '#BAA657' : '#CA3959';
      
      historyItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px 10px;
        border-radius: 8px;
        background: ${color}33;
        border: 1px solid ${color}66;
        min-width: 50px;
      `;
      
      const textEl = document.createElement('span');
      textEl.style.cssText = `
        font-family: 'Montserrat', Helvetica;
        font-weight: 600;
        font-size: 12px;
        color: ${color};
      `;
      textEl.textContent = `${point.toFixed(2)}x`;
      
      historyItem.appendChild(textEl);
      elements.crashHistory.appendChild(historyItem);
    });
  }

  // ============ ОБНОВЛЕНИЕ UI (ОПТИМИЗИРОВАНО) ============
  
  // Планирует обновление UI через requestAnimationFrame
  function scheduleUIUpdate() {
    if (updateUIScheduled) return;
    updateUIScheduled = true;
    
    requestAnimationFrame(() => {
      updateUIScheduled = false;
      updatePlayersUI();
      updateStats();
    });
  }
  
  function updatePlayersUI() {
    if (!elements.playersList) return;

    const fragment = document.createDocumentFragment();
    const currentPlayerIds = new Set();

    // Добавляем или обновляем игроков
    players.forEach(player => {
      if (!player || !player.userId) return;
      currentPlayerIds.add(player.userId);
      
      let playerEl = playerElementsCache.get(player.userId);
      let needsUpdate = false;
      
      if (!playerEl) {
        playerEl = document.createElement('div');
        playerEl.dataset.userId = player.userId;
        playerElementsCache.set(player.userId, playerEl);
        needsUpdate = true;
      }
      
      // Проверяем нужно ли обновлять содержимое
      const newClassName = player.cashout ? 'win' : 'default';
      if (playerEl.className !== newClassName) {
        playerEl.className = newClassName;
        needsUpdate = true;
      }
      
      if (needsUpdate || playerEl._lastBet !== player.bet || 
          playerEl._lastCashout !== player.cashout || 
          playerEl._lastMultiplier !== player.multiplier) {
        
        // Аватарка
        let avatarHTML = '';
        if (player.photoUrl) {
          avatarHTML = `<div class="avatar-2" style="background-image: url(${player.photoUrl}); background-size: cover;"></div>`;
        } else {
          const initial = player.nickname[0].toUpperCase();
          avatarHTML = `<div class="avatar-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${initial}</div>`;
        }
        
        // Маскируем ник
        const maskedNick = player.nickname.length > 2 
          ? player.nickname[0] + '***' + player.nickname[player.nickname.length - 1]
          : player.nickname;
        
        const multiplierText = player.multiplier ? `${player.multiplier.toFixed(2)}x` : '-';
        const cashoutText = player.cashout ? player.cashout : '-';
        
        playerEl.innerHTML = `
          <div class="acc-inf">
            <div class="div-wrapper-2">${avatarHTML}</div>
            <div class="div-wrapper-3"><div class="text-wrapper-22">${maskedNick}</div></div>
          </div>
          <div class="div-wrapper-3"><div class="text-wrapper-23">${player.bet}</div></div>
          <div class="div-wrapper-3"><div class="text-wrapper-24">${multiplierText}</div></div>
          <div class="div-wrapper-4"><div class="text-wrapper-25">${cashoutText}</div></div>
        `;
        
        playerEl._lastBet = player.bet;
        playerEl._lastCashout = player.cashout;
        playerEl._lastMultiplier = player.multiplier;
      }
      
      fragment.appendChild(playerEl);
    });

    // Удаляем игроков которых больше нет
    for (const [userId, element] of playerElementsCache.entries()) {
      if (!currentPlayerIds.has(userId)) {
        playerElementsCache.delete(userId);
      }
    }

    // Обновляем DOM одним разом
    elements.playersList.innerHTML = '';
    elements.playersList.appendChild(fragment);
  }

  function updateStats() {
    // Считаем все значения за один проход
    let totalBets = 0;
    let totalWin = 0;
    const betsCount = players.length;
    
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      totalBets += p.bet || 0;
      totalWin += p.cashout || 0;
    }
    
    // Total Bets
    if (elements.totalBetsCount) {
      elements.totalBetsCount.textContent = `${betsCount}/550`;
    }
    
    // Total Win
    if (elements.totalWinAmount) {
      elements.totalWinAmount.textContent = totalWin > 0 ? totalWin.toLocaleString() : '0';
    }
    
    // Прогресс-бар
    if (elements.progressBar) {
      const progress = Math.min((betsCount / 550) * 100, 100);
      elements.progressBar.style.width = `${progress}%`;
    }
  }

  // ============ AUTO CASH OUT ============
  
  // Переключатель Auto Cash Out
  if (elements.autoSwitcher) {
    elements.autoSwitcher.addEventListener('click', () => {
      // Блокируем если есть активная ставка
      if (playerHasBet && !playerCashedOut) {
        console.log('⚠️ Auto Cash Out нельзя изменить когда есть активная ставка');
        return;
      }
      
      autoCashOutEnabled = !autoCashOutEnabled;
      
      if (elements.autoSwitcherBg) {
        if (autoCashOutEnabled) {
          elements.autoSwitcherBg.style.transform = 'translateX(20px)';
          elements.autoSwitcherBg.style.background = '#39d811';
        } else {
          elements.autoSwitcherBg.style.transform = 'translateX(0)';
          elements.autoSwitcherBg.style.background = '#6a6a6a';
        }
      }
      
      console.log(`🤖 Auto Cash Out: ${autoCashOutEnabled ? 'ON' : 'OFF'}`);
    });
  }
  
  // Ввод множителя
  if (elements.autoInput) {
    elements.autoInput.contentEditable = 'true';
    elements.autoInput.addEventListener('input', (e) => {
      // Блокируем если есть активная ставка
      if (playerHasBet && !playerCashedOut) {
        e.preventDefault();
        return;
      }
      
      let value = e.target.textContent.replace(/[^0-9.]/g, '');
      const num = parseFloat(value) || 2.0;
      autoCashOutMultiplier = Math.max(1.01, Math.min(100, num));
      e.target.textContent = autoCashOutMultiplier.toFixed(2);
    });
  }
  
  // Очистка
  if (elements.autoClear) {
    elements.autoClear.addEventListener('click', () => {
      // Блокируем если есть активная ставка
      if (playerHasBet && !playerCashedOut) {
        console.log('⚠️ Auto Cash Out нельзя изменить когда есть активная ставка');
        return;
      }
      
      if (elements.autoInput) {
        elements.autoInput.textContent = '2.00';
        autoCashOutMultiplier = 2.0;
      }
    });
  }



  // ============ ЗАПУСК ============
  waitForWebSocket();
  
  // Инициализация кнопки
  setButtonState(BUTTON_STATES.BET);

  console.log('✅ Crash WebSocket инициализирован');

})();

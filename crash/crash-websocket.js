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
  let currentMultiplier = 1.00;
  let players = [];
  let ws = null;
  let autoCashOutEnabled = false;
  let autoCashOutMultiplier = 2.0;

  // ============ ЭЛЕМЕНТЫ ============
  const elements = {
    // Игра
    waitingRoot: document.getElementById('waitingRoot'),
    waitingTimer: null, // Создадим динамически
    multiplierLayer: document.getElementById('multiplierLayer'),
    currentMultiplier: document.getElementById('currentMultiplier'),
    gameEnded: document.querySelector('.game-ended'),
    graphCanvas: null, // Canvas для графика
    graphCtx: null,
    
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
  
  // Создаем Canvas для графика
  if (gameContainer) {
    const canvas = document.createElement('canvas');
    canvas.id = 'crashGraph';
    canvas.width = 400;
    canvas.height = 256;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.display = 'none';
    gameContainer.appendChild(canvas);
    elements.graphCanvas = canvas;
    elements.graphCtx = canvas.getContext('2d');
  }
  
  // Данные графика
  let graphPoints = [];
  let graphTime = 0;
  let graphCrashed = false;
  
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
      
      players = state.players || [];
      updatePlayersUI();
      updateStats();
      
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
      
      updatePlayersUI();
      updateStats();
    });

    // Таймер ожидания
    ws.socket.on('crash_waiting', (data) => {
      console.log('⏳ Ожидание:', data.timeLeft);
      gameState = GAME_STATES.WAITING;
      
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
    ws.socket.on('crash_started', (data) => {
      console.log('🚀 Crash начался!');
      gameState = GAME_STATES.FLYING;
      
      // Сбрасываем график
      graphPoints = [];
      graphTime = 0;
      graphCrashed = false;
      
      // Показываем canvas
      if (elements.graphCanvas) {
        elements.graphCanvas.style.display = 'block';
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
      
      // Скрываем waiting, показываем множитель СРАЗУ
      if (elements.waitingRoot) {
        elements.waitingRoot.style.display = 'none';
      }
      if (elements.multiplierLayer) {
        elements.multiplierLayer.style.display = 'flex';
        elements.multiplierLayer.style.visibility = 'visible';
      }
      if (elements.currentMultiplier) {
        elements.currentMultiplier.classList.remove('crashed');
        // Не сбрасываем текст, ждем crash_multiplier
      }
      
      // Скрываем "Round ended"
      if (elements.gameEnded) {
        elements.gameEnded.style.display = 'none';
      }
      
      // Если есть ставка и не забрали - показываем CASHOUT
      if (playerHasBet && !playerCashedOut) {
        setButtonState(BUTTON_STATES.CASHOUT);
      } else if (playerHasBet && playerCashedOut) {
        // Уже забрали - показываем BET для следующего раунда
        setButtonState(BUTTON_STATES.BET);
      }
    });

    // Обновление множителя
    ws.socket.on('crash_multiplier', (data) => {
      currentMultiplier = data.multiplier;
      
      if (elements.currentMultiplier) {
        // Плавное обновление
        elements.currentMultiplier.style.transition = 'all 0.1s ease';
        elements.currentMultiplier.textContent = `${data.multiplier.toFixed(2)}x`;
      }
      
      // Обновляем график
      updateGraph();
      
      // Обновляем live выигрыш в Auto Cash Out
      if (autoCashOutEnabled && playerHasBet && !playerCashedOut && elements.betButtonChips) {
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
      
      updatePlayersUI();
      updateStats();
    });

    // Краш
    ws.socket.on('crash_ended', (data) => {
      console.log('💥 Краш на:', data.crashPoint);
      gameState = GAME_STATES.CRASHED;
      
      // Краш графика
      graphCrashed = true;
      drawGraph(); // Перерисовываем красным
      
      // Скрываем график через 3 секунды
      setTimeout(() => {
        if (elements.graphCanvas) {
          elements.graphCanvas.style.display = 'none';
        }
      }, 3000);
      
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = `${data.crashPoint}x`;
        elements.currentMultiplier.classList.add('crashed');
      }
      
      // Показываем "Round ended"
      if (elements.gameEnded) {
        elements.gameEnded.style.display = 'block';
      }
      
      // Сбрасываем только если НЕ забрали
      if (playerHasBet && !playerCashedOut) {
        // Проиграли
        playerHasBet = false;
        playerBetAmount = 0;
        playerCashedOut = false;
      }
      
      setButtonState(BUTTON_STATES.BET);
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
        if (chipsEl) chipsEl.textContent = '';
        betButton.style.background = 'linear-gradient(90deg, #877440 0%, #BAA657 100%)';
        break;
    }
  }

  // Функция Cash Out
  async function performCashOut() {
    if (!playerHasBet || playerCashedOut) return;
    
    const winAmount = Math.floor(playerBetAmount * currentMultiplier);
    await window.GameBalanceAPI.payWinnings(winAmount, 'chips');
    
    playerCashedOut = true;
    setButtonState(BUTTON_STATES.BET);
    
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
        // Делаем ставку (только в waiting)
        const betAmount = getBetAmount();
        
        if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
          console.log('❌ Недостаточно фишек');
          return;
        }
        
        const success = await window.GameBalanceAPI.placeBet(betAmount, 'chips');
        if (success) {
          playerBetAmount = betAmount;
          playerHasBet = true;
          playerCashedOut = false;
          setButtonState(BUTTON_STATES.CANCEL);
          
          // Отправляем на сервер
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
              bet: betAmount
            });
          }
          
          console.log(`✅ Ставка: ${betAmount} chips`);
        }
      } else if (buttonState === BUTTON_STATES.BET && gameState === GAME_STATES.FLYING) {
        // Делаем ставку во время игры (для следующего раунда)
        const betAmount = getBetAmount();
        
        if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
          console.log('❌ Недостаточно фишек');
          return;
        }
        
        const success = await window.GameBalanceAPI.placeBet(betAmount, 'chips');
        if (success) {
          playerBetAmount = betAmount;
          playerHasBet = true;
          playerCashedOut = false;
          setButtonState(BUTTON_STATES.CANCEL);
          console.log(`✅ Ставка на следующий раунд: ${betAmount} chips`);
        }
      } else if (buttonState === BUTTON_STATES.CANCEL) {
        // Отменяем ставку
        await window.GameBalanceAPI.payWinnings(playerBetAmount, 'chips');
        playerBetAmount = 0;
        playerHasBet = false;
        playerCashedOut = false;
        setButtonState(BUTTON_STATES.BET);
        console.log('❌ Ставка отменена');
      } else if (buttonState === BUTTON_STATES.CASHOUT) {
        // Забираем выигрыш
        await performCashOut();
      }
    });
  }

  // ============ ОБНОВЛЕНИЕ UI ============
  function updatePlayersUI() {
    if (!elements.playersList) return;

    // Очищаем
    elements.playersList.innerHTML = '';

    // Добавляем игроков
    players.forEach(player => {
      if (!player || !player.userId) return;
      
      const playerEl = document.createElement('div');
      playerEl.className = player.cashout ? 'win' : 'default';
      
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
      
      elements.playersList.appendChild(playerEl);
    });
  }

  function updateStats() {
    const totalBets = players.reduce((sum, p) => sum + (p.bet || 0), 0);
    const totalWin = players.reduce((sum, p) => sum + (p.cashout || 0), 0);
    const betsCount = players.length;
    
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
      let value = e.target.textContent.replace(/[^0-9.]/g, '');
      const num = parseFloat(value) || 2.0;
      autoCashOutMultiplier = Math.max(1.01, Math.min(100, num));
      e.target.textContent = autoCashOutMultiplier.toFixed(2);
    });
  }
  
  // Очистка
  if (elements.autoClear) {
    elements.autoClear.addEventListener('click', () => {
      if (elements.autoInput) {
        elements.autoInput.textContent = '2.00';
        autoCashOutMultiplier = 2.0;
      }
    });
  }

  // ============ ГРАФИК ============
  function drawGraph() {
    if (!elements.graphCtx || !elements.graphCanvas) return;
    
    const ctx = elements.graphCtx;
    const width = elements.graphCanvas.width;
    const height = elements.graphCanvas.height;
    
    // Очищаем
    ctx.clearRect(0, 0, width, height);
    
    if (graphPoints.length < 2) return;
    
    // Цвет #FF1D50
    const lineColor = graphCrashed ? '#FF1D50' : '#FF1D50';
    const gradientColor = graphCrashed ? 'rgba(255, 29, 80, 0.3)' : 'rgba(255, 29, 80, 0.3)';
    
    // Градиент снизу
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, gradientColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    // Рисуем заливку
    ctx.beginPath();
    ctx.moveTo(graphPoints[0].x, height);
    for (let i = 0; i < graphPoints.length; i++) {
      ctx.lineTo(graphPoints[i].x, graphPoints[i].y);
    }
    ctx.lineTo(graphPoints[graphPoints.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Рисуем линию (ОПТИМИЗИРОВАННО: простые lineTo)
    ctx.beginPath();
    ctx.moveTo(graphPoints[0].x, graphPoints[0].y);
    for (let i = 1; i < graphPoints.length; i++) {
      ctx.lineTo(graphPoints[i].x, graphPoints[i].y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 29, 80, 0.45)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    
    // Рисуем стрелку ➤ только если не краш
    if (!graphCrashed && graphPoints.length > 1) {
      const lastPoint = graphPoints[graphPoints.length - 1];
      const prevPoint = graphPoints[graphPoints.length - 2];
      
      ctx.save();
      ctx.translate(lastPoint.x, lastPoint.y);
      
      // Угол по направлению линии
      const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
      ctx.rotate(angle);
      
      // Рисуем стрелку ➤ (треугольник)
      ctx.beginPath();
      ctx.moveTo(15, 0);        // Кончик
      ctx.lineTo(0, -8);        // Верх
      ctx.lineTo(5, 0);         // Середина
      ctx.lineTo(0, 8);         // Низ
      ctx.closePath();
      ctx.fillStyle = lineColor;
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  function updateGraph() {
    if (gameState !== GAME_STATES.FLYING || graphCrashed) return;
    
    const width = elements.graphCanvas.width;
    const height = elements.graphCanvas.height;
    
    // Увеличиваем время (МЕДЛЕННО)
    graphTime += 0.05;
    
    // Медленный рост в правый верхний угол
    const progress = Math.min(graphTime / 20, 1); // Нормализуем 0-1
    
    // Позиция от левого низа к правому верху
    const startX = 30;
    const startY = height - 30;
    const endX = width - 30;
    const endY = 30;
    
    const baseX = startX + (endX - startX) * progress;
    const baseY = startY + (endY - startY) * progress;
    
    // Добавляем колебания
    const noise = Math.sin(graphTime * 3) * 5 + Math.cos(graphTime * 7) * 3;
    
    const x = baseX;
    const y = baseY + noise;
    
    graphPoints.push({ x, y });
    
    // Ограничиваем количество точек (ВСЕГДА В ЗОНЕ ВИДИМОСТИ)
    if (graphPoints.length > 100) {
      graphPoints.shift();
    }
    
    drawGraph();
  }

  // ============ ЗАПУСК ============
  waitForWebSocket();
  
  // Инициализация кнопки
  setButtonState(BUTTON_STATES.BET);

  console.log('✅ Crash WebSocket инициализирован');

})();

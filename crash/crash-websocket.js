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
  let currentMultiplier = 1.00;
  let players = [];
  let ws = null;

  // ============ ЭЛЕМЕНТЫ ============
  const elements = {
    // Игра
    waitingRoot: document.getElementById('waitingRoot'),
    waitingTimer: document.querySelector('#waitingRoot span'),
    multiplierLayer: document.getElementById('multiplierLayer'),
    currentMultiplier: document.getElementById('currentMultiplier'),
    gameEnded: document.querySelector('.game-ended'),
    
    // Ставка
    betInput: document.querySelector('#betInput'),
    betButton: document.querySelector('.cancel-button-next'),
    betButtonText: document.querySelector('.cancel-button-next .text-wrapper-15'),
    betButtonChips: document.querySelector('.cancel-button-next .text-wrapper-16'),
    minusBtn: document.querySelector('.button'),
    plusBtn: document.querySelector('.union-wrapper'),
    multiplyButtons: document.querySelectorAll('.button-2'),
    
    // Статистика
    totalBetsCount: document.querySelector('.total-bets .text-wrapper-17'),
    totalWinAmount: document.querySelector('.total-win .text-wrapper-19'),
    progressBar: document.querySelector('.progress-bar .rectangle-3'),
    
    // Игроки
    playersList: document.querySelector('.user-templates')
  };
  
  // Скрываем "Round ended" при загрузке
  if (elements.gameEnded) {
    elements.gameEnded.style.display = 'none';
  }

  // ============ WEBSOCKET ============
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ Crash WebSocket готов');
      initWebSocket();
    } else {
      setTimeout(waitForWebSocket, 500);
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
      
      // Показываем waiting
      if (elements.waitingRoot) elements.waitingRoot.style.display = 'flex';
      if (elements.multiplierLayer) elements.multiplierLayer.style.display = 'none';
      
      // Обновляем таймер
      if (elements.waitingTimer) {
        elements.waitingTimer.textContent = data.timeLeft;
      }
      
      // Если есть ставка - показываем CANCEL
      if (playerHasBet) {
        setButtonState(BUTTON_STATES.CANCEL);
      }
    });

    // Игра началась
    ws.socket.on('crash_started', (data) => {
      console.log('🚀 Crash начался!');
      gameState = GAME_STATES.FLYING;
      
      // Скрываем waiting, показываем множитель
      if (elements.waitingRoot) elements.waitingRoot.style.display = 'none';
      if (elements.multiplierLayer) elements.multiplierLayer.style.display = 'flex';
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = '1.00x';
        elements.currentMultiplier.classList.remove('crashed');
      }
      
      // Скрываем "Round ended"
      if (elements.gameEnded) {
        elements.gameEnded.style.display = 'none';
      }
      
      // Если есть ставка - показываем CASHOUT
      if (playerHasBet) {
        setButtonState(BUTTON_STATES.CASHOUT);
      }
    });

    // Обновление множителя
    ws.socket.on('crash_multiplier', (data) => {
      currentMultiplier = data.multiplier;
      
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = `${data.multiplier.toFixed(2)}x`;
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
      
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = `${data.crashPoint}x`;
        elements.currentMultiplier.classList.add('crashed');
      }
      
      // Показываем "Round ended"
      if (elements.gameEnded) {
        elements.gameEnded.style.display = 'block';
      }
      
      // Сбрасываем ставку
      playerHasBet = false;
      playerBetAmount = 0;
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

  // Кнопки +/-
  if (elements.minusBtn) {
    elements.minusBtn.addEventListener('click', () => {
      if (gameState === GAME_STATES.FLYING) return;
      setBetAmount(getBetAmount() - 50);
      setButtonState(BUTTON_STATES.BET); // Обновляем текст
    });
  }

  if (elements.plusBtn) {
    elements.plusBtn.addEventListener('click', () => {
      if (gameState === GAME_STATES.FLYING) return;
      setBetAmount(getBetAmount() + 50);
      setButtonState(BUTTON_STATES.BET); // Обновляем текст
    });
  }
  
  // Кнопки умножения (1x, 2x, 5x, 10x)
  if (elements.multiplyButtons) {
    elements.multiplyButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (gameState === GAME_STATES.FLYING) return;
        const multipliers = [1, 2, 5, 10];
        const current = getBetAmount();
        setBetAmount(current * multipliers[index]);
        setButtonState(BUTTON_STATES.BET); // Обновляем текст
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
        betButton.style.background = 'linear-gradient(180deg, rgb(57, 216, 17) 0%, rgb(41, 155, 13) 100%)';
        break;
        
      case BUTTON_STATES.CANCEL:
        if (textEl) textEl.textContent = 'CANCEL';
        if (chipsEl) chipsEl.textContent = 'Wait to next round';
        betButton.style.background = 'linear-gradient(180deg, rgb(255, 87, 87) 0%, rgb(200, 50, 50) 100%)';
        break;
        
      case BUTTON_STATES.CASHOUT:
        if (textEl) textEl.textContent = 'CASH OUT';
        if (chipsEl) chipsEl.textContent = '';
        betButton.style.background = 'linear-gradient(180deg, rgb(255, 215, 0) 0%, rgb(200, 170, 0) 100%)';
        break;
    }
  }

  if (elements.betButton) {
    elements.betButton.addEventListener('click', async () => {
      if (buttonState === BUTTON_STATES.BET) {
        // Делаем ставку
        const betAmount = getBetAmount();
        
        if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
          console.log('❌ Недостаточно фишек');
          return;
        }
        
        const success = await window.GameBalanceAPI.placeBet(betAmount, 'chips');
        if (success) {
          playerBetAmount = betAmount;
          playerHasBet = true;
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
      } else if (buttonState === BUTTON_STATES.CANCEL) {
        // Отменяем ставку
        await window.GameBalanceAPI.payWinnings(playerBetAmount, 'chips');
        playerBetAmount = 0;
        playerHasBet = false;
        setButtonState(BUTTON_STATES.BET);
        console.log('❌ Ставка отменена');
      } else if (buttonState === BUTTON_STATES.CASHOUT) {
        // Забираем выигрыш
        if (ws) {
          const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 123456789;
          
          ws.socket.emit('crash_cashout', {
            game: 'crash',
            userId
          });
        }
        console.log('💰 Забрали выигрыш');
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

  // ============ ЗАПУСК ============
  waitForWebSocket();
  
  // Инициализация кнопки
  setButtonState(BUTTON_STATES.BET);

  console.log('✅ Crash WebSocket инициализирован');

})();

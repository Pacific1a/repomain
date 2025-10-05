(function() {
  'use strict';

  let ws = null;
  let gameState = {
    status: 'waiting', // waiting, betting, flying, crashed
    players: [],
    multiplier: 1.00,
    crashPoint: null,
    startTime: null
  };

  // Ждём WebSocket
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ Crash WebSocket готов');
      console.log('🔌 WebSocket подключен:', ws.connected);
      console.log('🆔 Socket ID:', ws.socket.id);
      initSync();
    } else {
      console.log('⏳ Ожидание WebSocket для Crash...');
      setTimeout(waitForWebSocket, 500);
    }
  }

  function initSync() {
    console.log('🚀 Инициализация Crash синхронизации...');
    
    // Подписываемся на глобальную игру Crash
    ws.socket.emit('join_game', { game: 'crash' });
    console.log('📡 Отправлен запрос join_game для crash');

    // Получаем текущее состояние
    ws.socket.on('game_state_sync', (state) => {
      console.log('🔄 Crash синхронизация:', state);
      gameState = state;
      
      // Обновляем UI без перерисовки
      updatePlayersUI();
      updateGamePhase(state.status);
    });

    // Новый игрок сделал ставку
    ws.socket.on('player_bet', (data) => {
      console.log('💰 Crash: Игрок сделал ставку:', data);
      
      // Добавляем/обновляем игрока
      const existingPlayer = gameState.players.find(p => p.userId === data.userId);
      if (existingPlayer) {
        existingPlayer.bet += data.bet;
      } else {
        gameState.players.push({
          userId: data.userId,
          nickname: data.nickname,
          bet: data.bet,
          cashout: null,
          multiplier: null
        });
      }

      updatePlayersUI();
    });

    // Игра началась (ракета взлетает)
    ws.socket.on('crash_started', (data) => {
      console.log('🚀 Crash начался!', data);
      gameState.status = 'flying';
      gameState.startTime = data.startTime;
      
      // Переключаем панели без удаления DOM
      updateGamePhase('flying');
      
      if (window.crashGame && window.crashGame.start) {
        window.crashGame.start(data.startTime);
      }
    });
    // Обновление множителя
    ws.socket.on('crash_multiplier', (data) => {
      gameState.multiplier = data.multiplier;
      
      if (window.crashGame && window.crashGame.updateMultiplier) {
        window.crashGame.updateMultiplier(data.multiplier);
      }
    });

    // Игрок забрал выигрыш
    ws.socket.on('player_cashout', (data) => {
      console.log('💵 Игрок забрал:', data);
      
      const player = gameState.players.find(p => p.userId === data.userId);
      if (player) {
        player.cashout = data.cashout;
        player.multiplier = data.multiplier;
      }
      
      updatePlayersUI();
    });

    // Игра упала (crashed)
    ws.socket.on('crash_ended', (data) => {
      console.log('💥 Crash упал на:', data.crashPoint);
      gameState.status = 'crashed';
      gameState.crashPoint = data.crashPoint;
      
      // Переключаем в режим crashed
      updateGamePhase('crashed');
      
      if (window.crashGame && window.crashGame.crash) {
        window.crashGame.crash(data.crashPoint);
      }

      // НЕ сбрасываем - ждем новое событие waiting с сервера
    });
  }

  // Сделать ставку
  function placeBet(amount) {
    if (!ws) {
      console.error('❌ WebSocket не подключен');
      return;
    }

    // Получаем данные пользователя
    let userId, nickname, photoUrl;

    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      userId = tgUser.id;
      nickname = tgUser.first_name || tgUser.username || 'Player';
      photoUrl = tgUser.photo_url || null;
    } else if (window.TelegramUserData) {
      userId = window.TelegramUserData.id;
      nickname = window.TelegramUserData.first_name || window.TelegramUserData.username || 'Player';
      photoUrl = window.TelegramUserData.photo_url || null;
    } else if (ws.currentUser) {
      userId = ws.currentUser.id;
      nickname = ws.currentUser.nickname || 'Player';
      photoUrl = ws.currentUser.photoUrl || null;
    } else {
      // Тестовый пользователь
      userId = localStorage.getItem('testUserId') || 123456789;
      nickname = 'Test';
      photoUrl = null;
    }

    console.log('💰 Crash: Отправляем ставку:', { userId, nickname, bet: amount });

    ws.socket.emit('place_bet', {
      game: 'crash',
      userId,
      nickname,
      photoUrl,
      bet: amount
    });
  }

  // Забрать выигрыш
  function cashout() {
    if (!ws) {
      console.error('❌ WebSocket не подключен');
      return;
    }

    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 
                   localStorage.getItem('testUserId') || 
                   123456789;

    console.log('💵 Crash: Забираем выигрыш');

    ws.socket.emit('crash_cashout', {
      game: 'crash',
      userId
    });
  }

  // Обновление фазы игры (без удаления DOM)
  function updateGamePhase(phase) {
    const waitingPanel = document.getElementById('waitingPanel');
    const crashPanel = document.getElementById('crashPanel');
    const gameCanvas = document.getElementById('gameCanvas');
    
    if (!waitingPanel || !crashPanel) return;
    
    // Убираем все классы состояния
    const gameContainer = document.querySelector('.game');
    if (gameContainer) {
      gameContainer.classList.remove('waiting', 'flying', 'crashed');
    }
    
    switch(phase) {
      case 'waiting':
        waitingPanel.style.display = 'flex';
        crashPanel.style.display = 'none';
        if (gameContainer) gameContainer.classList.add('waiting');
        console.log('🔄 Фаза: WAITING');
        break;
        
      case 'betting':
        waitingPanel.style.display = 'flex';
        crashPanel.style.display = 'none';
        if (gameContainer) gameContainer.classList.add('waiting');
        console.log('💰 Фаза: BETTING');
        break;
        
      case 'flying':
        waitingPanel.style.display = 'none';
        crashPanel.style.display = 'flex';
        if (gameContainer) gameContainer.classList.add('flying');
        console.log('🚀 Фаза: FLYING');
        break;
        
      case 'crashed':
        crashPanel.style.display = 'flex';
        if (gameContainer) gameContainer.classList.add('crashed');
        console.log('💥 Фаза: CRASHED');
        break;
    }
  }
  
  // Обновление списка игроков (без перерисовки)
  function updatePlayersUI() {
    const playersList = document.querySelector('.user-templates');
    if (!playersList) return;

    // НЕ очищаем - только обновляем/добавляем

    gameState.players.forEach(player => {
      if (!player || !player.userId || !player.nickname) return;
      
      // Ищем существующий элемент
      let playerEl = playersList.querySelector(`[data-player-id="${player.userId}"]`);
      
      if (!playerEl) {
        // Создаем только если нет
        playerEl = document.createElement('div');
        playerEl.className = 'default bet-fade-in';
        playerEl.setAttribute('data-player-id', player.userId);
      
      let avatarHTML = '';
      if (player.photoUrl) {
        avatarHTML = `<div class="avatar-3" style="background-image: url(${player.photoUrl}); background-size: cover; background-position: center;"></div>`;
      } else {
        const initial = player.nickname ? player.nickname[0].toUpperCase() : 'P';
        avatarHTML = `<div class="avatar-3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${initial}</div>`;
      }
      
      // Маскируем ник (показываем первую и последнюю букву)
      const maskedNick = player.nickname.length > 2 
        ? player.nickname[0] + '***' + player.nickname[player.nickname.length - 1]
        : player.nickname;
      
      const multiplierText = player.multiplier ? `${player.multiplier.toFixed(2)}x` : '-';
      const cashoutText = player.cashout ? player.cashout.toFixed(0) : '-';
      
      playerEl.innerHTML = `
        <div class="acc-inf-2">
          <div class="avatar-wrapper">${avatarHTML}</div>
          <div class="n-k"><div class="text-wrapper-26">${maskedNick}</div></div>
        </div>
        <div class="div-wrapper-3"><div class="text-wrapper-27">${player.bet}</div></div>
        <div class="div-wrapper-3"><div class="text-wrapper-27">${multiplierText}</div></div>
        <div class="div-wrapper-4"><div class="text-wrapper-28">${cashoutText}</div></div>
      `;
        
        playersList.appendChild(playerEl);
      } else {
        // Обновляем существующий
        const betEl = playerEl.querySelector('.text-wrapper-27');
        const multiplierEl = playerEl.querySelectorAll('.text-wrapper-27')[1];
        const cashoutEl = playerEl.querySelector('.text-wrapper-28');
        
        if (betEl) betEl.textContent = player.bet;
        if (multiplierEl) multiplierEl.textContent = player.multiplier ? `${player.multiplier.toFixed(2)}x` : '-';
        if (cashoutEl) cashoutEl.textContent = player.cashout ? player.cashout.toFixed(0) : '-';
      }
    });
    
    // Удаляем только тех кого нет в gameState
    const currentPlayerIds = new Set(gameState.players.map(p => p.userId));
    const allPlayerEls = playersList.querySelectorAll('[data-player-id]');
    allPlayerEls.forEach(el => {
      const playerId = el.getAttribute('data-player-id');
      if (!currentPlayerIds.has(playerId)) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }
    });
  }

  // Экспорт
  window.CrashSync = {
    placeBet,
    cashout,
    getState: () => gameState
  };

  // Запуск
  waitForWebSocket();

  console.log('✅ Crash Sync инициализирован');

})();

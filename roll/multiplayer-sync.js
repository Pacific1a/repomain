// Синхронизация состояния Roll игры для всех игроков
(function() {
  'use strict';

  let ws = null;
  let gameState = {
    status: 'waiting', // waiting, betting, spinning, finished
    players: [],
    timer: 0,
    startTime: null
  };

  // Ждём WebSocket
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ WebSocket готов для синхронизации');
      initSync();
    } else {
      setTimeout(waitForWebSocket, 500);
    }
  }

  function initSync() {
    // Подписываемся на глобальное состояние Roll
    ws.socket.emit('join_global_game', { game: 'roll' });

    // Получаем текущее состояние
    ws.socket.on('game_state_sync', (state) => {
      console.log('🔄 Синхронизация состояния:', state);
      gameState = state;
      updateUI();
      
      // Если идёт таймер - запускаем локально
      if (state.status === 'betting' && state.startTime) {
        syncTimer(state.startTime, state.timer);
      }
    });

    // Новый игрок сделал ставку
    ws.socket.on('player_bet', (data) => {
      console.log('💰 Игрок сделал ставку:', data);
      
      // Добавляем/обновляем игрока
      const existingPlayer = gameState.players.find(p => p.userId === data.userId);
      if (existingPlayer) {
        existingPlayer.bet += data.bet;
      } else {
        gameState.players.push({
          userId: data.userId,
          nickname: data.nickname,
          photoUrl: data.photoUrl,
          bet: data.bet
        });
      }

      // Обновляем колесо через wheel-game
      if (window.rollGame && window.rollGame.addPlayer) {
        window.rollGame.addPlayer({
          id: data.userId,
          username: data.nickname,
          photo_url: data.photoUrl,
          betAmount: data.bet,
          isBot: false
        });
      }

      updateUI();
    });

    // Игра началась
    ws.socket.on('game_started', (data) => {
      console.log('🎮 Игра началась! Таймер:', data.timer);
      gameState.status = 'betting';
      gameState.startTime = data.startTime;
      gameState.timer = data.timer;
      
      syncTimer(data.startTime, data.timer);
    });

    // Крутим колесо
    ws.socket.on('spin_wheel', (data) => {
      console.log('🎰 Крутим колесо! Победитель:', data.winner);
      gameState.status = 'spinning';
      
      if (window.rollGame && window.rollGame.spin) {
        window.rollGame.spin(data.winner);
      }
    });

    // Игра завершена
    ws.socket.on('game_finished', (data) => {
      console.log('🏁 Игра завершена!');
      gameState.status = 'finished';
      
      setTimeout(() => {
        gameState.status = 'waiting';
        gameState.players = [];
        
        // Сброс UI
        const waitText = document.querySelector('.wait span:first-child');
        if (waitText) {
          waitText.style.display = 'inline';
          waitText.style.color = '#6a6a6a';
          waitText.textContent = 'Wait...';
        }
        const playText = document.querySelector('.wait span:last-child');
        if (playText) {
          playText.style.display = 'none';
        }
        
        updateUI();
      }, 8000);
    });

    // Запрашиваем текущее состояние
    ws.socket.emit('get_game_state', { game: 'roll' });
  }

  // Синхронизация таймера
  function syncTimer(startTime, duration) {
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    let timeLeft = duration - elapsed;

    if (timeLeft <= 0) {
      timeLeft = 0;
    }

    console.log(`⏱️ Таймер: ${timeLeft} сек (прошло ${elapsed} сек)`);

    const timerInterval = setInterval(() => {
      timeLeft--;
      
      // Обновляем таймер в wheel-game
      const waitText = document.querySelector('.wait span:last-child');
      if (waitText) {
        waitText.style.display = 'inline';
        waitText.style.color = '#39d811';
        waitText.textContent = `${timeLeft}s`;
      }
      const waitSpan = document.querySelector('.wait span:first-child');
      if (waitSpan) {
        waitSpan.style.display = 'none';
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);

    // Обновляем UI сразу
    const waitText = document.querySelector('.wait span:last-child');
    if (waitText) {
      waitText.style.display = 'inline';
      waitText.style.color = '#39d811';
      waitText.textContent = `${timeLeft}s`;
    }
    const waitSpan = document.querySelector('.wait span:first-child');
    if (waitSpan) {
      waitSpan.style.display = 'none';
    }
  }

  // Сделать ставку
  function placeBet(amount) {
    if (!ws) {
      console.error('❌ WebSocket не подключен');
      return;
    }

    // Получаем данные пользователя из разных источников
    let userId, nickname, photoUrl;

    // Приоритет 1: Telegram WebApp
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      userId = tgUser.id;
      nickname = tgUser.first_name || tgUser.username || 'Player';
      photoUrl = tgUser.photo_url || null;
    }
    // Приоритет 2: TelegramUserData
    else if (window.TelegramUserData) {
      userId = window.TelegramUserData.id;
      nickname = window.TelegramUserData.first_name || window.TelegramUserData.username || 'Player';
      photoUrl = window.TelegramUserData.photo_url || null;
    }
    // Приоритет 3: WebSocket currentUser
    else if (ws.currentUser) {
      userId = ws.currentUser.id;
      nickname = ws.currentUser.nickname || 'Player';
      photoUrl = ws.currentUser.photoUrl || null;
    }
    // Fallback
    else {
      userId = 'user_' + Date.now();
      nickname = 'Player';
      photoUrl = null;
    }

    console.log('💰 Отправляем ставку:', { userId, nickname, photoUrl, bet: amount });
    console.log('📡 WebSocket состояние:', { connected: ws.connected, socketId: ws.socket?.id });

    ws.socket.emit('place_bet', {
      game: 'roll',
      userId,
      nickname,
      photoUrl,
      bet: amount
    });

    console.log('✅ Событие place_bet отправлено');
  }

  // Обновление UI
  function updateUI() {
    const playersList = document.querySelector('.user-templates');
    if (!playersList) return;

    playersList.innerHTML = '';

    gameState.players.forEach(player => {
      const playerEl = document.createElement('div');
      playerEl.className = 'default';
      
      let avatarHTML = '';
      if (player.photoUrl) {
        avatarHTML = `<div class="avatar-2" style="background-image: url(${player.photoUrl}); background-size: cover; background-position: center; width: 32px; height: 32px; border-radius: 50%;"></div>`;
      } else {
        const initial = player.nickname ? player.nickname[0].toUpperCase() : 'P';
        avatarHTML = `<div class="avatar-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; width: 32px; height: 32px; border-radius: 50%; font-size: 16px;">${initial}</div>`;
      }
      
      playerEl.innerHTML = `
        <div class="acc-inf">
          <div class="avatar-wrapper">
            ${avatarHTML}
          </div>
          <div class="n-k">
            <div class="n-k-2">${player.nickname || 'Player'}</div>
          </div>
        </div>
        <div class="div-wrapper-2">
          <div class="text-wrapper-14">${player.bet}</div>
        </div>
        <div class="element-wrapper">
          <div class="element-3">-</div>
        </div>
      `;
      playersList.appendChild(playerEl);
    });

    // Обновляем статус
    const waitText = document.querySelector('.wait');
    if (waitText && gameState.status === 'waiting') {
      waitText.textContent = `Waiting for players... (${gameState.players.length})`;
    }
  }

  // Экспорт
  window.RollSync = {
    placeBet,
    getState: () => gameState
  };

  // Запуск
  waitForWebSocket();

  console.log('✅ Roll Sync инициализирован');

})();

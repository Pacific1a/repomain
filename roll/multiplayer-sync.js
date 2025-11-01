(function() {
  'use strict';

  let ws = null;
  let gameState = {
    status: 'waiting', // waiting, betting, spinning, finished
    players: [],
    timer: 0,
    startTime: null
  };
  
  let timerActive = false; // Флаг чтобы не запускать таймер несколько раз

  // Ждём WebSocket
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ WebSocket готов для синхронизации');
      console.log('🔌 WebSocket подключен:', ws.connected);
      console.log('🆔 Socket ID:', ws.socket.id);
      initSync();
    } else {
      console.log('⏳ Ожидание WebSocket...');
      setTimeout(waitForWebSocket, 500);
    }
  }

  function initSync() {
    console.log('🚀 Инициализация синхронизации Roll...');
    
    // Подписываемся на глобальное состояние Roll
    ws.socket.emit('join_game', { game: 'roll' });
    console.log('📡 Отправлен запрос join_game для roll');
    console.log('🔗 Подключение к комнате global_roll');

    // Получаем текущее состояние
    ws.socket.on('game_state_sync', (state) => {
      console.log('🔄 Синхронизация состояния:', state);
      console.log('🤖 Игроки в состоянии:', state.players?.length, 'ботов:', state.players?.filter(p => p.isBot || String(p.userId || p.id || '').startsWith('bot_')).length);
      
      const wasWaiting = gameState.status === 'waiting';
      const previousStatus = gameState.status;
      gameState = state;
      
      // ТОЛЬКО updateUI (внутри уже есть обновление колеса)
      updateUI();
      
      // Восстанавливаем таймер если игра в betting
      // Это работает как для перехода waiting->betting, так и для переподключения во время betting
      if (state.status === 'betting' && state.startTime) {
        // Останавливаем старый таймер если есть (на случай переподключения)
        if (activeTimerInterval) {
          clearInterval(activeTimerInterval);
          activeTimerInterval = null;
        }
        
        // Запускаем/восстанавливаем таймер
        timerActive = true;
        console.log('⏱️ Запускаем/восстанавливаем таймер (статус: betting, startTime:', state.startTime, ')');
        syncTimer(state.startTime, state.timer);
      }
      
      // Если игра в spinning, останавливаем таймер и показываем PLAY
      if (state.status === 'spinning') {
        if (activeTimerInterval) {
          clearInterval(activeTimerInterval);
          activeTimerInterval = null;
        }
        timerActive = false;
        
        const waitText = document.querySelector('.wait span:last-child');
        const waitSpan = document.querySelector('.wait span:first-child');
        if (waitText && waitSpan) {
          waitSpan.style.display = 'none';
          waitText.style.display = 'inline';
          waitText.style.color = '#ffc107';
          waitText.textContent = 'PLAY';
        }
      }
      
      // Сбрасываем флаг когда игра закончилась
      if (state.status === 'waiting') {
        timerActive = false;
        if (activeTimerInterval) {
          clearInterval(activeTimerInterval);
          activeTimerInterval = null;
        }
      }
    });

    // Новый игрок сделал ставку
    ws.socket.on('player_bet', (data) => {
      console.log('💰 Игрок сделал ставку:', data, 'бот:', data.isBot);
      
      // Добавляем/обновляем игрока (С ЦВЕТОМ И ФЛАГОМ БОТА!)
      const existingPlayer = gameState.players.find(p => p.userId === data.userId);
      if (existingPlayer) {
        existingPlayer.bet += data.bet;
        // Обновляем цвет если пришел
        if (data.color) {
          existingPlayer.color = data.color;
        }
        // Обновляем флаг бота
        if (data.isBot !== undefined) {
          existingPlayer.isBot = data.isBot;
        }
      } else {
        gameState.players.push({
          userId: data.userId,
          nickname: data.nickname,
          photoUrl: data.photoUrl,
          bet: data.bet,
          color: data.color, // ДОБАВЛЯЕМ ЦВЕТ!
          isBot: data.isBot || false // Добавляем флаг бота
        });
      }

      // Синхронизируем всех игроков с колесом
      syncPlayersToWheel();
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
    console.log('🎯 Подписка на событие spin_wheel...');
    ws.socket.on('spin_wheel', (data) => {
      console.log('📥 ПОЛУЧЕНО СОБЫТИЕ spin_wheel!', data);
      console.log('🎰 Крутим колесо! Победитель:', data.winner);
      console.log('📊 Текущие игроки:', gameState.players);
      
      // Останавливаем таймер если он активен
      if (activeTimerInterval) {
        clearInterval(activeTimerInterval);
        activeTimerInterval = null;
      }
      
      gameState.status = 'spinning';
      
      // Показываем "Play" только когда начинается spinning
      const waitText = document.querySelector('.wait span:last-child');
      const waitSpan = document.querySelector('.wait span:first-child');
      if (waitText && waitSpan) {
        waitSpan.style.display = 'none';
        waitText.style.display = 'inline';
        waitText.style.color = '#ffc107';
        waitText.textContent = 'PLAY';
      }
      
      // НЕ очищаем игроков! Колесо должно крутиться с текущими игроками
      if (window.rollGame && window.rollGame.spin) {
        console.log('✅ Вызываем window.rollGame.spin(', data.winner, ')');
        window.rollGame.spin(data.winner);
      } else {
        console.error('❌ window.rollGame.spin не доступен!');
      }
      
      // Показываем победителя через 5 секунд (после анимации)
      setTimeout(() => {
        const winner = gameState.players.find(p => p.userId === data.winner);
        if (winner) {
          console.log('🏆 Победитель:', winner.nickname);
          if (window.rollGame && window.rollGame.showResult) {
            window.rollGame.showResult({ winner: data.winner, amount: data.amount });
          }
        }
        
        // Очищаем колесо через 3 секунды после показа победителя
        setTimeout(() => {
          console.log('🔄 Сброс игры');
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
        }, 3000);
      }, 5000);
    });

    // Игра завершена (удалено - теперь обрабатывается в spin_wheel)
    ws.socket.on('game_finished', (data) => {
      console.log('🏁 Игра завершена (событие получено)');
    });

    // Запрашиваем текущее состояние
    ws.socket.emit('get_game_state', { game: 'roll' });
  }

  // Хранилище активных интервалов таймера
  let activeTimerInterval = null;

  // Синхронизация таймера
  function syncTimer(startTime, duration) {
    // Очищаем предыдущий интервал если есть
    if (activeTimerInterval) {
      clearInterval(activeTimerInterval);
      activeTimerInterval = null;
    }

    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    let timeLeft = duration - elapsed;

    if (timeLeft <= 0) {
      timeLeft = 0;
    }

    console.log(`⏱️ Таймер: ${timeLeft} сек (прошло ${elapsed} сек)`);

    // Обновляем UI сразу
    const waitText = document.querySelector('.wait span:last-child');
    const waitSpan = document.querySelector('.wait span:first-child');
    
    if (waitText && waitSpan) {
      waitSpan.style.display = 'none';
      if (timeLeft > 0) {
        waitText.style.display = 'inline';
        waitText.style.color = '#39d811';
        waitText.textContent = `${timeLeft}s`;
      } else {
        // Если таймер уже закончился, не показываем "Play" - ждем события spin_wheel
        waitText.style.display = 'none';
      }
    }

    // Если таймер уже закончился, не создаем интервал
    if (timeLeft <= 0) {
      console.log('⏰ Таймер уже закончился, ожидаем spin_wheel от сервера...');
      return;
    }

    activeTimerInterval = setInterval(() => {
      timeLeft--;
      
      // Проверяем статус игры - если уже spinning, останавливаем таймер
      if (gameState.status === 'spinning' || gameState.status === 'finished') {
        clearInterval(activeTimerInterval);
        activeTimerInterval = null;
        return;
      }
      
      // Обновляем таймер
      if (waitText && waitSpan) {
        waitSpan.style.display = 'none';
        
        if (timeLeft > 0) {
          // Показываем счетчик времени
          waitText.style.display = 'inline';
          waitText.style.color = '#39d811';
          waitText.textContent = `${timeLeft}s`;
        } else {
          // Таймер закончился - скрываем текст, ждем spin_wheel от сервера
          waitText.style.display = 'none';
          waitSpan.style.display = 'none';
        }
      }

      if (timeLeft <= 0) {
        clearInterval(activeTimerInterval);
        activeTimerInterval = null;
        console.log('⏰ Таймер закончился, ожидаем spin_wheel от сервера...');
        // НЕ показываем "Play" здесь - он появится только когда придет spin_wheel
      }
    }, 1000);
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

  // Обновление UI (без мерцания)
  function updateUI() {
    // Обновляем колесо через wheel-game
    if (window.rollGame && window.rollGame.updateState) {
      window.rollGame.updateState(gameState);
    }

    // Обновляем список игроков в зависимости от активной вкладки
    const currentTab = window.TabsManager ? window.TabsManager.getCurrentTab() : 'previos';
    
    // Обновляем счетчик онлайн игроков для Live Bets
    if (currentTab === 'live-bets' && window.TabsManager) {
      window.TabsManager.updatePlayersCount(gameState.players.length);
    }

    const playersList = document.querySelector('.user-templates');
    if (!playersList) return;

    // Удаляем старых игроков которых нет в текущем состоянии
    const currentPlayerIds = new Set(gameState.players.map(p => p.userId));
    const existingPlayers = playersList.querySelectorAll('[data-player-id]');
    existingPlayers.forEach(el => {
      const playerId = parseInt(el.getAttribute('data-player-id'));
      if (!currentPlayerIds.has(playerId)) {
        el.remove(); // Удаляем фейковых/старых игроков
      }
    });

    gameState.players.forEach(player => {
      // Пропускаем невалидных игроков
      if (!player || !player.userId || !player.nickname) return;
      
      // Ищем существующий блок игрока
      let playerEl = playersList.querySelector(`[data-player-id="${player.userId}"]`);
      
      if (!playerEl) {
        // Создаем новый блок только если игрока нет
        playerEl = document.createElement('div');
        playerEl.className = 'win';
        playerEl.setAttribute('data-player-id', player.userId);
        
        let avatarHTML = '';
        if (player.photoUrl) {
          avatarHTML = `<div class="avatar-2" style="background-image: url(${player.photoUrl}); background-size: cover; background-position: center; width: 25px; height: 25px; border-radius: 50%;"></div>`;
        } else {
          const initial = player.nickname ? player.nickname[0].toUpperCase() : 'P';
          avatarHTML = `<div class="avatar-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; width: 25px; height: 25px; border-radius: 50%; font-size: 16px;">${initial}</div>`;
        }
        
        // В Live Bets показываем только ник и аватарку, в Previos - полную информацию
        if (currentTab === 'live-bets') {
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
              <div class="text-wrapper-14">-</div>
            </div>
            <div class="element-wrapper">
              <div class="element-3">-</div>
            </div>
          `;
        } else {
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
              <div class="text-wrapper-14" data-bet-amount>${player.bet}</div>
            </div>
            <div class="element-wrapper">
              <div class="element-3" data-win-amount>-</div>
            </div>
          `;
        }
        playersList.appendChild(playerEl);
      } else {
        // Обновляем только цифры в Previos
        if (currentTab === 'previos') {
          const betElement = playerEl.querySelector('[data-bet-amount]');
          if (betElement) betElement.textContent = player.bet;
        }
      }
    });
  }
  // Синхронизация игроков с колесом
  function syncPlayersToWheel() {
    if (!window.rollGame || !window.rollGame.updateState) return;
    
    // Преобразуем формат для wheel-game (фильтруем невалидных игроков)
    const wheelPlayers = gameState.players
      .filter(player => player && player.userId && player.nickname) // Только валидные игроки
      .map((player, index) => {
        const playerId = String(player.userId || player.id || '');
        const isBot = player.isBot || playerId.startsWith('bot_');
        return {
          id: playerId,
          username: player.nickname,
          photo_url: player.photoUrl,
          betAmount: player.bet || 0,
          color: player.color || '#39d811', // ДОБАВЛЯЕМ ЦВЕТ!
          isUser: false,
          isBot: isBot // Правильно определяем ботов
        };
      });
    
    console.log('🔄 syncPlayersToWheel:', wheelPlayers.length, 'игроков, ботов:', wheelPlayers.filter(p => p.isBot).length);
    window.rollGame.updateState({ players: wheelPlayers });
  }
  // Экспорт
  window.RollSync = {
    placeBet,
    getState: () => gameState,
    syncPlayersToWheel
  };

  // Запуск
  waitForWebSocket();

  console.log('✅ Roll Sync инициализирован');

  // УБРАНО: Периодический запрос вызывал задержку
  // Обновления приходят через game_state_sync автоматически

})();

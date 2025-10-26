// BlackJack Multiplayer Synchronization
(function() {
  'use strict';

  let ws = null;
  let gameState = {
    status: 'waiting',
    players: [],
    history: []
  };
  
  let currentTab = 'live-bets';

  // Ждём WebSocket
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ BlackJack: WebSocket готов');
      initSync();
    } else {
      console.log('⏳ BlackJack: Ожидание WebSocket...');
      setTimeout(waitForWebSocket, 500);
    }
  }

  function initSync() {
    console.log('🚀 BlackJack: Инициализация синхронизации...');
    
    // Подписываемся на глобальное состояние BlackJack
    ws.socket.emit('join_game', { game: 'blackjack' });
    console.log('📡 BlackJack: Подключение к комнате global_blackjack');

    // Получаем текущее состояние
    ws.socket.on('game_state_sync', (state) => {
      if (state.game === 'blackjack') {
        console.log('🔄 BlackJack: Синхронизация состояния:', state);
        gameState = state;
        updateUI();
      }
    });

    // Новый игрок зашел в игру
    ws.socket.on('player_joined_game', (data) => {
      if (data.game === 'blackjack') {
        console.log('👤 BlackJack: Игрок зашел:', data);
        
        // Добавляем игрока если его еще нет
        const exists = gameState.players.find(p => p.userId === data.userId);
        if (!exists) {
          gameState.players.push({
            userId: data.userId,
            nickname: data.nickname,
            photoUrl: data.photoUrl,
            lastSeen: Date.now()
          });
        }
        updateUI();
      }
    });

    // Игрок вышел из игры
    ws.socket.on('player_left_game', (data) => {
      if (data.game === 'blackjack') {
        console.log('👋 BlackJack: Игрок вышел:', data.userId);
        gameState.players = gameState.players.filter(p => p.userId !== data.userId);
        updateUI();
      }
    });

    // Новая игра началась
    ws.socket.on('blackjack_game_started', (data) => {
      console.log('🎮 BlackJack: Игра началась:', data);
      
      // Обновляем статус игрока
      const player = gameState.players.find(p => p.userId === data.userId);
      if (player) {
        player.currentBet = data.bet;
        player.status = 'playing';
      }
      updateUI();
    });

    // Игра завершена
    ws.socket.on('blackjack_game_finished', (data) => {
      console.log('🏁 BlackJack: Игра завершена:', data);
      
      // Добавляем в историю
      gameState.history.unshift({
        userId: data.userId,
        nickname: data.nickname,
        photoUrl: data.photoUrl,
        bet: data.bet,
        win: data.win,
        multiplier: data.multiplier,
        isWinner: data.isWinner,
        timestamp: Date.now()
      });
      
      // Оставляем только последние 20 игр
      if (gameState.history.length > 20) {
        gameState.history = gameState.history.slice(0, 20);
      }
      
      // Обновляем статус игрока
      const player = gameState.players.find(p => p.userId === data.userId);
      if (player) {
        player.status = 'waiting';
        player.currentBet = null;
      }
      
      updateUI();
    });

    // Запрашиваем текущее состояние
    ws.socket.emit('get_game_state', { game: 'blackjack' });
    
    // Уведомляем сервер что мы зашли в игру
    notifyJoinGame();
  }

  // Уведомить сервер что зашли в игру
  function notifyJoinGame() {
    if (!ws) return;
    
    let userId, nickname, photoUrl;

    // Получаем данные пользователя
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      userId = tgUser.id;
      nickname = tgUser.first_name || tgUser.username || 'Player';
      photoUrl = tgUser.photo_url || null;
    } else if (window.TelegramUserData) {
      userId = window.TelegramUserData.id;
      nickname = window.TelegramUserData.first_name || window.TelegramUserData.username || 'Player';
      photoUrl = window.TelegramUserData.photo_url || null;
    } else {
      userId = 'user_' + Date.now();
      nickname = 'Player';
      photoUrl = null;
    }

    ws.socket.emit('join_game_session', {
      game: 'blackjack',
      userId,
      nickname,
      photoUrl
    });
    
    console.log('✅ BlackJack: Отправлено уведомление о входе');
  }

  // Отправить результат игры
  function reportGameResult(bet, win, isWinner, multiplier) {
    if (!ws) return;
    
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
    } else {
      userId = 'user_' + Date.now();
      nickname = 'Player';
      photoUrl = null;
    }

    ws.socket.emit('blackjack_result', {
      game: 'blackjack',
      userId,
      nickname,
      photoUrl,
      bet,
      win,
      isWinner,
      multiplier
    });
    
    console.log('📊 BlackJack: Результат отправлен на сервер');
  }

  // Переключение вкладок
  function switchTab(tabName) {
    currentTab = tabName;
    
    const tabButtons = document.querySelectorAll('.section-menu > div');
    tabButtons.forEach(btn => {
      const btnTab = btn.classList.contains('selected-wrapper') ? 'live-bets' : 'your-bets';
      if (btnTab === tabName) {
        btn.querySelector('div').classList.remove('not-selected');
        btn.querySelector('div').classList.add('selected');
      } else {
        btn.querySelector('div').classList.remove('selected');
        btn.querySelector('div').classList.add('not-selected');
      }
    });
    
    updateUI();
  }

  // Обновление UI
  function updateUI() {
    const playersList = document.querySelector('.user-templates');
    if (!playersList) return;

    // Очищаем список
    playersList.innerHTML = '';
    
    if (currentTab === 'live-bets') {
      // Live Bets - показываем онлайн игроков
      updateOnlineCount();
      renderLivePlayers(playersList);
    } else {
      // Your Bets - показываем историю игр
      renderGameHistory(playersList);
    }
  }

  // Обновить счетчик онлайн
  function updateOnlineCount() {
    const onlineElement = document.querySelector('.element-online .text-wrapper-12');
    if (onlineElement) {
      // Фильтруем активных игроков (последняя активность < 5 минут)
      const now = Date.now();
      const activeUsers = gameState.players.filter(p => {
        return (now - (p.lastSeen || 0)) < 5 * 60 * 1000;
      });
      onlineElement.textContent = `${activeUsers.length} online`;
    }
  }

  // Отрисовка онлайн игроков
  function renderLivePlayers(container) {
    const now = Date.now();
    const activePlayers = gameState.players.filter(p => {
      return (now - (p.lastSeen || 0)) < 5 * 60 * 1000;
    });

    activePlayers.forEach(player => {
      const playerEl = createPlayerElement(player, true);
      container.appendChild(playerEl);
    });

    if (activePlayers.length === 0) {
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 20px; text-align: center;">No players online</div>';
    }
  }

  // Отрисовка истории игр
  function renderGameHistory(container) {
    if (gameState.history.length === 0) {
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 20px; text-align: center;">No game history</div>';
      return;
    }

    gameState.history.forEach(game => {
      const playerEl = createPlayerElement(game, false);
      container.appendChild(playerEl);
    });
  }

  // Создание элемента игрока
  function createPlayerElement(player, isLive) {
    const div = document.createElement('div');
    div.className = 'div-4';
    
    // Создаем аватар
    let avatarHTML = '';
    if (player.photoUrl) {
      avatarHTML = `<div class="avatar-2" style="background-image: url(${player.photoUrl}); background-size: cover; background-position: center; width: 19px; height: 19px; border-radius: 50%;"></div>`;
    } else {
      const initial = player.nickname ? player.nickname[0].toUpperCase() : 'P';
      const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
      ];
      const colorIndex = (player.nickname?.charCodeAt(0) || 0) % colors.length;
      avatarHTML = `<div class="avatar-2" style="background: ${colors[colorIndex]}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; width: 19px; height: 19px; border-radius: 50%; font-size: 10px;">${initial}</div>`;
    }
    
    // Маскируем имя
    const maskedName = maskPlayerName(player.nickname || 'Player');
    
    if (isLive) {
      // Live Bets - показываем только имя и статус
      div.innerHTML = `
        <div class="acc-inf">
          <div class="avatar-wrapper">${avatarHTML}</div>
          <div class="div-3"><div class="text-wrapper-14">${maskedName}</div></div>
        </div>
        <div class="div-3"><div class="text-wrapper-15">-</div></div>
        <div class="div-3"><div class="text-wrapper-15">-</div></div>
        <div class="div-wrapper-2"><div class="text-wrapper-16">-</div></div>
      `;
    } else {
      // Your Bets - показываем полную информацию
      const multiplier = player.multiplier ? `${player.multiplier}x` : '0x';
      const winAmount = player.isWinner && player.win ? player.win : '--';
      const winClass = player.isWinner ? 'text-wrapper-19' : 'text-wrapper-16';
      const winWrapperClass = player.isWinner ? 'element-2' : 'div-wrapper-2';
      
      div.innerHTML = `
        <div class="acc-inf">
          <div class="avatar-3"><div class="avatar-4">${avatarHTML}</div></div>
          <div class="div-3"><div class="text-wrapper-17">${maskedName}</div></div>
        </div>
        <div class="div-3"><div class="text-wrapper-18">${player.bet}</div></div>
        <div class="div-3"><div class="text-wrapper-18">${multiplier}</div></div>
        <div class="${winWrapperClass}"><div class="${winClass}">${winAmount}</div></div>
      `;
    }
    
    return div;
  }

  // Маскировка имени
  function maskPlayerName(name) {
    if (!name || name.length <= 2) return name;
    const first = name[0];
    const last = name[name.length - 1];
    const middle = '*'.repeat(Math.min(name.length - 2, 3));
    return `${first}${middle}${last}`;
  }

  // Инициализация вкладок
  function initTabs() {
    const selectedWrapper = document.querySelector('.section-menu .selected-wrapper');
    const yourBetsWrapper = document.querySelector('.section-menu .your-bets');
    
    if (selectedWrapper) {
      selectedWrapper.addEventListener('click', () => switchTab('live-bets'));
    }
    
    if (yourBetsWrapper) {
      yourBetsWrapper.addEventListener('click', () => switchTab('your-bets'));
    }
    
    // Начальная вкладка
    switchTab('live-bets');
  }

  // Экспорт
  window.BlackJackSync = {
    reportGameResult,
    getState: () => gameState,
    switchTab,
    updateUI
  };

  // Запуск
  waitForWebSocket();
  
  // Инициализируем вкладки когда DOM готов
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
  } else {
    initTabs();
  }

  console.log('✅ BlackJack Sync инициализирован');

})();

// BlackJack Multiplayer Synchronization
(function() {
  'use strict';

  let ws = null;
  let gameState = {
    status: 'waiting',
    players: [],
    activeGames: [],  // Временные игры для Live Bets (удаляются через 10 сек)
    history: []       // Постоянная история для Your Bets
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
        // Убеждаемся что есть все поля
        gameState = {
          status: state.status || 'waiting',
          players: state.players || [],
          activeGames: state.activeGames || [],
          history: state.history || []
        };
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
      
      // Добавляем в активные игры
      gameState.activeGames.unshift({
        userId: data.userId,
        nickname: data.nickname,
        photoUrl: data.photoUrl,
        bet: data.bet,
        status: 'playing',
        startTime: Date.now()
      });
      
      updateUI();
    });

    // Игра завершена
    ws.socket.on('blackjack_game_finished', (data) => {
      console.log('🏁 BlackJack: Игра завершена:', data);
      
      // Находим игру в активных
      const gameIndex = gameState.activeGames.findIndex(g => g.userId === data.userId);
      
      if (gameIndex !== -1) {
        // Обновляем результат в активной игре
        gameState.activeGames[gameIndex] = {
          ...gameState.activeGames[gameIndex],
          win: data.win,
          multiplier: data.multiplier,
          isWinner: data.isWinner,
          status: 'finished',
          finishTime: Date.now()
        };
        
        // Удаляем через 10 секунд
        setTimeout(() => {
          gameState.activeGames = gameState.activeGames.filter(g => 
            g.userId !== data.userId || g.finishTime !== gameState.activeGames[gameIndex]?.finishTime
          );
          updateUI();
        }, 10000);
      }
      
      // Добавляем в постоянную историю (Your Bets)
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
      
      // Оставляем только последние 100 игр в истории
      if (gameState.history.length > 100) {
        gameState.history = gameState.history.slice(0, 100);
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
      // Live Bets - ВРЕМЕННЫЕ игры (активные + недавно завершенные)
      updateOnlineCount();
      renderLiveGames(playersList);
    } else {
      // Your Bets - ПОСТОЯННАЯ история текущего игрока
      renderPlayerGamesHistory(playersList);
    }
  }

  // Обновить счетчик онлайн (количество активных игр)
  function updateOnlineCount() {
    const onlineElement = document.querySelector('.element-online .text-wrapper-12');
    if (onlineElement) {
      const activeCount = gameState.activeGames.length;
      onlineElement.textContent = `${activeCount} live`;
    }
  }

  // Отрисовка временных игр (Live Bets)
  function renderLiveGames(container) {
    if (gameState.activeGames.length === 0) {
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 20px; text-align: center; font-family: "Montserrat", Helvetica;">No active games</div>';
      return;
    }

    // Показываем все активные игры
    gameState.activeGames.forEach(game => {
      const playerEl = createLiveGameElement(game);
      container.appendChild(playerEl);
    });
  }

  // Отрисовка истории игр ТЕКУЩЕГО игрока (Your Bets)
  function renderPlayerGamesHistory(container) {
    const currentUserId = getCurrentUserId();
    
    if (!currentUserId) {
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 20px; text-align: center;">Unable to identify player</div>';
      return;
    }

    // Фильтруем только игры текущего пользователя
    const playerGames = gameState.history.filter(game => game.userId === currentUserId);
    
    if (playerGames.length === 0) {
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 20px; text-align: center;">You have no games yet</div>';
      return;
    }

    // Показываем последние 10 игр игрока
    const recentGames = playerGames.slice(0, 10);
    
    recentGames.forEach(game => {
      const playerEl = createPlayerElement(game);
      container.appendChild(playerEl);
    });
  }

  // Получить userId текущего игрока
  function getCurrentUserId() {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return window.Telegram.WebApp.initDataUnsafe.user.id;
    } else if (window.TelegramUserData) {
      return window.TelegramUserData.id;
    } else if (ws && ws.currentUser) {
      return ws.currentUser.id;
    }
    return null;
  }

  // Создание элемента для Live Bets (БЕЗ желтого!)
  function createLiveGameElement(game) {
    const div = document.createElement('div');
    div.className = 'div-4';
    
    // Если игра завершена - показываем результат (зеленый/красный)
    if (game.status === 'finished') {
      if (game.isWinner) {
        div.style.backgroundColor = '#407B3D'; // Зеленый
      } else {
        div.style.backgroundColor = '#402626'; // Красный
      }
    } else {
      // Если играет - обычный фон (БЕЗ желтого!)
      div.style.backgroundColor = 'transparent';
    }
    
    div.style.borderRadius = '8px';
    div.style.padding = '8px';
    div.style.marginBottom = '4px';
    
    // Создаем аватар
    let avatarHTML = '';
    if (game.photoUrl) {
      avatarHTML = `<div class="avatar-2" style="background-image: url(${game.photoUrl}); background-size: cover; background-position: center; width: 19px; height: 19px; border-radius: 50%;"></div>`;
    } else {
      const initial = game.nickname ? game.nickname[0].toUpperCase() : 'P';
      const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
      ];
      const colorIndex = (game.nickname?.charCodeAt(0) || 0) % colors.length;
      avatarHTML = `<div class="avatar-2" style="background: ${colors[colorIndex]}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; width: 19px; height: 19px; border-radius: 50%; font-size: 10px;">${initial}</div>`;
    }
    
    const maskedName = game.nickname || 'Player';
    
    // Если играет - показываем "Playing...", если закончена - результат
    let multiplierText = '--';
    let winText = '--';
    
    if (game.status === 'finished') {
      multiplierText = game.multiplier ? `${game.multiplier.toFixed(1)}x` : '0x';
      winText = game.win || '0';
    } else {
      multiplierText = 'Playing...';
    }
    
    div.innerHTML = `
      <div class="acc-inf">
        <div class="avatar-wrapper">${avatarHTML}</div>
        <div class="div-3"><div class="text-wrapper-17" style="color: #fff;">${maskedName}</div></div>
      </div>
      <div class="div-3"><div class="text-wrapper-18" style="color: #fff;">${game.bet}</div></div>
      <div class="div-3"><div class="text-wrapper-18" style="color: #fff;">${multiplierText}</div></div>
      <div class="div-3"><div class="text-wrapper-19" style="color: #fff;">${winText}</div></div>
    `;
    
    return div;
  }

  // Создание элемента для Your Bets (постоянная история)
  function createPlayerElement(player) {
    const div = document.createElement('div');
    div.className = 'div-4';
    
    // Окрашиваем фон в зависимости от результата
    if (player.isWinner) {
      div.style.backgroundColor = '#407B3D'; // Зеленый для выигрыша
    } else {
      div.style.backgroundColor = '#402626'; // Красный для проигрыша
    }
    div.style.borderRadius = '8px';
    div.style.padding = '8px';
    div.style.marginBottom = '4px';
    
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
    
    // История игр - показываем полную информацию с окрашенным фоном
    const multiplier = player.multiplier ? `${player.multiplier.toFixed(1)}x` : '0x';
    const winAmount = player.isWinner && player.win ? player.win : '--';
    
    div.innerHTML = `
      <div class="acc-inf">
        <div class="avatar-wrapper">${avatarHTML}</div>
        <div class="div-3"><div class="text-wrapper-17" style="color: #fff;">${maskedName}</div></div>
      </div>
      <div class="div-3"><div class="text-wrapper-18" style="color: #fff;">${player.bet}</div></div>
      <div class="div-3"><div class="text-wrapper-18" style="color: #fff;">${multiplier}</div></div>
      <div class="div-3"><div class="text-wrapper-19" style="color: #fff;">${winAmount}</div></div>
    `;
    
    return div;
  }

  // Показываем имя полностью без маскирования
  function maskPlayerName(name) {
    return name || 'Player';
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

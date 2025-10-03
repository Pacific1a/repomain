// Мультиплеер для Roll игры
(function() {
  'use strict';

  // Проверяем наличие WebSocket
  if (!window.GameWebSocket || !window.GameWebSocket.socket) {
    console.warn('⚠️ WebSocket не подключен. Игра в одиночном режиме.');
    return;
  }

  const ws = window.GameWebSocket;
  let currentRoom = null;
  let isHost = false;

  // ============ СОЗДАНИЕ/ПОИСК КОМНАТЫ ============
  
  function findOrCreateRoom() {
    // Ищем доступную комнату для Roll
    ws.socket.emit('get_rooms');
    
    ws.socket.once('rooms_list', (rooms) => {
      const rollRooms = rooms.filter(r => 
        r.game === 'roll' && 
        r.status === 'waiting' && 
        r.players < r.maxPlayers
      );

      if (rollRooms.length > 0) {
        // Присоединяемся к существующей комнате
        joinRoom(rollRooms[0].id);
      } else {
        // Создаём новую комнату
        createRoom();
      }
    });
  }

  function createRoom() {
    ws.socket.emit('create_room', {
      name: `Roll Game ${Date.now()}`,
      game: 'roll',
      maxPlayers: 3,
      isPrivate: false
    });

    ws.socket.once('room_created', (room) => {
      currentRoom = room;
      isHost = true;
      console.log('✅ Комната создана:', room.id);
      updateUI();
    });
  }

  function joinRoom(roomId) {
    ws.socket.emit('join_room', roomId);

    ws.socket.once('room_joined', (room) => {
      currentRoom = room;
      isHost = false;
      console.log('✅ Присоединились к комнате:', room.id);
      updateUI();
    });
  }

  // ============ ОБРАБОТЧИКИ СОБЫТИЙ ============

  ws.socket.on('player_joined', (data) => {
    if (currentRoom && data.room.id === currentRoom.id) {
      currentRoom = data.room;
      console.log('👤 Игрок присоединился:', data.player.nickname);
      updateUI();
    }
  });

  ws.socket.on('player_left', (data) => {
    if (currentRoom && data.room.id === currentRoom.id) {
      currentRoom = data.room;
      console.log('👋 Игрок вышел');
      updateUI();
    }
  });

  ws.socket.on('game_start', (room) => {
    if (currentRoom && room.id === currentRoom.id) {
      console.log('🎮 Игра началась!');
      startGame();
    }
  });

  ws.socket.on('game_update', (data) => {
    if (currentRoom && data.gameState) {
      // Обновляем состояние игры
      updateGameState(data.gameState);
    }
  });

  ws.socket.on('game_end', (result) => {
    if (currentRoom) {
      console.log('🏁 Игра завершена! Победитель:', result.winner);
      showWinner(result);
    }
  });

  // ============ ИГРОВАЯ ЛОГИКА ============

  function placeBet(amount) {
    if (!currentRoom) return;

    ws.socket.emit('make_move', {
      roomId: currentRoom.id,
      move: 'place_bet',
      gameData: {
        bet: amount,
        userId: ws.currentUser?.id
      }
    });
  }

  function playerReady() {
    if (!currentRoom) return;
    ws.socket.emit('player_ready', currentRoom.id);
  }

  function startGame() {
    // Запускаем вращение колеса
    if (window.rollGame && window.rollGame.spin) {
      window.rollGame.spin();
    }
  }

  function updateGameState(gameState) {
    // Обновляем UI игры
    if (window.rollGame && window.rollGame.updateState) {
      window.rollGame.updateState(gameState);
    }
  }

  function showWinner(result) {
    // Показываем победителя
    if (window.rollGame && window.rollGame.showResult) {
      window.rollGame.showResult(result);
    }
  }

  // ============ UI ОБНОВЛЕНИЕ ============

  function updateUI() {
    if (!currentRoom) return;

    const playersCount = currentRoom.players.length;
    const maxPlayers = currentRoom.maxPlayers;

    // Обновляем счётчик игроков
    const waitText = document.querySelector('.wait');
    if (waitText) {
      waitText.textContent = `Waiting for players... (${playersCount}/${maxPlayers})`;
    }

    // Обновляем список игроков
    updatePlayersList();

    // Если все готовы - показываем кнопку старта
    if (playersCount >= 2 && isHost) {
      showStartButton();
    }
  }

  function updatePlayersList() {
    const playersList = document.querySelector('.user-templates');
    if (!playersList || !currentRoom) return;

    playersList.innerHTML = '';

    currentRoom.players.forEach((player, index) => {
      // Добавляем игрока в wheel-game
      if (window.rollGame && window.rollGame.addPlayer) {
        window.rollGame.addPlayer({
          id: player.userId,
          username: player.nickname,
          photo_url: player.photoUrl,
          betAmount: 0,
          isBot: false
        });
      }

      const playerEl = document.createElement('div');
      playerEl.className = 'default';
      
      // Аватарка из Telegram
      const avatarStyle = player.photoUrl 
        ? `background-image: url(${player.photoUrl}); background-size: cover; background-position: center;`
        : `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;`;
      
      const avatarContent = player.photoUrl ? '' : player.nickname[0].toUpperCase();
      
      playerEl.innerHTML = `
        <div class="acc-inf">
          <div class="avatar-wrapper">
            <div class="avatar-2" style="${avatarStyle}">${avatarContent}</div>
          </div>
          <div class="n-k">
            <div class="n-k-2">${player.nickname}</div>
          </div>
        </div>
        <div class="div-wrapper-2">
          <div class="text-wrapper-14">-</div>
        </div>
        <div class="element-wrapper">
          <div class="element-3">-</div>
        </div>
      `;
      playersList.appendChild(playerEl);
    });
  }

  function showStartButton() {
    const betButton = document.querySelector('.cancel-button-this-2');
    if (betButton && isHost) {
      betButton.textContent = 'START GAME';
      betButton.onclick = () => playerReady();
    }
  }

  // ============ ЭКСПОРТ ============

  window.RollMultiplayer = {
    findOrCreateRoom,
    placeBet,
    playerReady,
    getCurrentRoom: () => currentRoom,
    isHost: () => isHost
  };

  // Автоматически ищем/создаём комнату при загрузке
  if (ws.connected) {
    findOrCreateRoom();
  } else {
    ws.socket.once('connect', findOrCreateRoom);
  }

  console.log('✅ Roll Multiplayer инициализирован');

})();

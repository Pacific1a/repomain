// Мультиплеер для Roll игры
(function() {
  'use strict';

  let ws = null;
  let currentRoom = null;
  let isHost = false;
  let myBet = 0;

  // Ждём подключения WebSocket
  function waitForWebSocket() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected) {
      ws = window.GameWebSocket;
      console.log('✅ WebSocket готов для мультиплеера');
      findOrCreateRoom();
    } else {
      console.log('⏳ Ожидание WebSocket...');
      setTimeout(waitForWebSocket, 500);
    }
  }

  // ============ СОЗДАНИЕ/ПОИСК КОМНАТЫ ============
  
  function findOrCreateRoom() {
    console.log('🔍 Поиск комнаты для Roll...');
    
    // Ищем доступную комнату для Roll
    ws.socket.emit('get_rooms');
    
    ws.socket.once('rooms_list', (rooms) => {
      console.log('📋 Найдено комнат:', rooms.length);
      
      const rollRooms = rooms.filter(r => 
        r.game === 'roll' && 
        r.status === 'waiting' && 
        r.players < r.maxPlayers
      );

      console.log('🎰 Roll комнат доступно:', rollRooms.length);

      if (rollRooms.length > 0) {
        // Присоединяемся к существующей комнате
        console.log('👥 Присоединяемся к комнате:', rollRooms[0].id);
        joinRoom(rollRooms[0].id);
      } else {
        // Создаём новую комнату
        console.log('🆕 Создаём новую комнату');
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
      console.log('🔄 Обновление игры:', data);
      
      // Если это ставка - добавляем игрока в wheel-game
      if (data.move === 'place_bet' && data.gameData) {
        const { userId, nickname, photoUrl, bet } = data.gameData;
        
        if (window.rollGame && window.rollGame.addPlayer) {
          window.rollGame.addPlayer({
            id: userId,
            username: nickname,
            photo_url: photoUrl,
            betAmount: bet,
            isBot: false
          });
          
          console.log('✅ Игрок добавлен в колесо:', nickname, 'ставка:', bet);
        }
      }
      
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
    if (!currentRoom || !ws) {
      console.error('❌ Нет комнаты или WebSocket');
      return;
    }

    myBet = amount;
    
    console.log('💰 Отправляем ставку:', amount);
    
    ws.socket.emit('make_move', {
      roomId: currentRoom.id,
      move: 'place_bet',
      gameData: {
        bet: amount,
        userId: ws.currentUser?.id,
        nickname: ws.currentUser?.nickname,
        photoUrl: ws.currentUser?.photoUrl
      }
    });

    // Обновляем свою ставку в UI
    updateMyBet(amount);
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

    // Обновляем верхнюю панель с аватаркой текущего игрока
    const accountInfo = document.querySelector('.account-info');
    if (accountInfo && ws.currentUser) {
      const avatar = accountInfo.querySelector('.avatar');
      const nickname = accountInfo.querySelector('.nickname .text-wrapper');
      
      if (avatar && ws.currentUser.photoUrl) {
        avatar.style.backgroundImage = `url(${ws.currentUser.photoUrl})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
      }
      
      if (nickname) {
        nickname.textContent = ws.currentUser.nickname || 'Player';
      }
    }

    // Обновляем список игроков
    updatePlayersList();

    // Если все готовы - показываем кнопку старта
    if (playersCount >= 2 && isHost) {
      showStartButton();
    }
  }

  function updateMyBet(amount) {
    const playersList = document.querySelector('.user-templates');
    if (!playersList || !ws.currentUser) return;

    // Находим свою строку в списке
    const myRow = Array.from(playersList.children).find(row => {
      const nickname = row.querySelector('.n-k-2');
      return nickname && nickname.textContent === ws.currentUser.nickname;
    });

    if (myRow) {
      const betCell = myRow.querySelector('.text-wrapper-14');
      if (betCell) {
        betCell.textContent = amount;
      }
    }
  }

  function updatePlayersList() {
    const playersList = document.querySelector('.user-templates');
    if (!playersList || !currentRoom) return;

    playersList.innerHTML = '';

    currentRoom.players.forEach((player, index) => {
      // НЕ добавляем в wheel-game автоматически
      // Игроки добавятся когда сделают ставку

      const playerEl = document.createElement('div');
      playerEl.className = 'default';
      
      // Аватарка из Telegram с правильными стилями
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

  // Запускаем ожидание WebSocket
  waitForWebSocket();

  console.log('✅ Roll Multiplayer инициализирован');

})();

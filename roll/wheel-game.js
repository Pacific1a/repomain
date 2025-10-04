(function() {
  'use strict';

  // ============ GAME STATES ============
  const GAME_STATES = {
    WAITING: 'waiting',
    BETTING: 'betting',
    SPINNING: 'spinning',
    FINISHED: 'finished'
  };

  // ============ GAME VARIABLES ============
  let gameState = GAME_STATES.WAITING;
  let players = []; // Максимум 10+ игроков
  let bettingTimeLeft = 60;
  let bettingTimer = null;
  let currentRotation = 0;

  // ============ COLORS (только яркие цвета для PvP) ============
  const colors = [
    '#ffbe0b', // Желтый
    '#fb5607', // Оранжевый  
    '#ff006e', // Розовый
    '#8338ec', // Фиолетовый
    '#3a86ff', // Синий
    '#fcbf49', // Золотой
    '#4cc9f0', // Голубой
    '#f72585', // Малиновый
    '#8ac926', // Зеленый
    '#ee6c4d', // Коралловый
    '#56cfe1', // Бирюзовый
    '#ffc971', // Персиковый
    '#9d4edd', // Пурпурный
    '#06d6a0', // Мятный
    '#abc4ff', // Лавандовый
    '#dcf763'  // Лаймовый
  ];

  // ============ DOM ELEMENTS ============
  const elements = {
    wheel: document.getElementById('fortune-wheel'),
    totalBets: document.querySelector('.text-wrapper-5'),
    waitText: document.querySelector('.wait'),
    betInput: document.querySelector('.element .text-wrapper-7'),
    betButton: document.querySelector('.cancel-button-this-2'),
    resultText: document.querySelector('.element-2'),
    playersList: document.querySelector('.user-templates'),
    minusBtn: document.querySelector('.button'),
    plusBtn: document.querySelector('.union-wrapper'),
    halfBtn: document.querySelector('.button-2'),
    doubleBtn: document.querySelector('.button-3')
  };

  // ============ BET CONTROLS ============
  function getBetAmount() {
    return parseInt(elements.betInput.textContent) || 50;
  }

  function setBetAmount(amount) {
    elements.betInput.textContent = Math.max(50, amount);
  }

  elements.minusBtn?.addEventListener('click', () => setBetAmount(getBetAmount() - 50));
  elements.plusBtn?.addEventListener('click', () => setBetAmount(getBetAmount() + 50));
  elements.halfBtn?.addEventListener('click', () => setBetAmount(Math.floor(getBetAmount() / 2)));
  elements.doubleBtn?.addEventListener('click', () => setBetAmount(getBetAmount() * 2));

  // ============ BET BUTTON ============
  elements.betButton?.addEventListener('click', async () => {
    if (gameState === GAME_STATES.SPINNING || gameState === GAME_STATES.FINISHED) return;

    const betAmount = getBetAmount();
    
    if (!window.GameBalanceAPI?.canPlaceBet(betAmount, 'chips')) {
      showNotification('Недостаточно фишек');
      return;
    }

    const success = await window.GameBalanceAPI.placeBet(betAmount, 'chips');
    if (!success) return;

    // СИНХРОНИЗАЦИЯ: отправляем ставку через WebSocket
    if (window.RollSync && window.RollSync.placeBet) {
      window.RollSync.placeBet(betAmount);
      showNotification('Ставка сделана!');
      return;
    }

    // Fallback: старая логика (если нет мультиплеера)
    const userData = window.TelegramUserData || { first_name: 'Player', photo_url: null, id: 'user_' + Date.now() };
    
    const added = addPlayer({
      id: userData.id || 'user_' + Date.now(),
      username: userData.first_name || userData.username || 'Player',
      photo_url: userData.photo_url,
      betAmount: betAmount,
      isUser: true
    });

    if (!added) {
      await window.GameBalanceAPI.payWinnings(betAmount, 'chips');
      return;
    }

    if (gameState === GAME_STATES.WAITING) {
      startBetting();
    }
  });

  // Хранилище цветов игроков (userId -> color)
  const playerColors = new Map();
  let nextColorIndex = 0;

  // ============ PLAYER MANAGEMENT ============
  function addPlayer(player) {
    // Максимум 16 игроков (по количеству цветов)
    if (players.length >= colors.length) {
      showNotification(`Максимум ${colors.length} игроков!`);
      return false;
    }

    const existing = players.find(p => p.id === player.id);
    if (existing) {
      existing.betAmount += player.betAmount;
    } else {
      // Назначаем цвет по порядку
      const colorIndex = players.length;
      player.color = colors[colorIndex];
      player.colorIndex = colorIndex;
      players.push(player);
    }

    updateWheel();
    updateDisplay();
    return true;
  }

  // УБРАНО: Больше не добавляем ботов
  // Только реальные игроки через мультиплеер
  function addBotsIfNeeded() {
    // Отключено - только реальные игроки
    return;
    
    bots.forEach(bot => {
      if (players.length >= 3) return;
      
      const teamIndex = players.length;
      const botPlayer = {
        id: bot.id,
        username: bot.maskedName,
        photo_url: null,
        avatarColor: bot.avatarColor,
        betAmount: Math.floor(Math.random() * 300) + 100,
        isUser: false,
        isBot: true,
        team: teams[teamIndex],
        teamIndex: teamIndex
      };
      
      players.push(botPlayer);
    });
  }

  // ============ WHEEL RENDERING (SVG КРУГОВОЕ КОЛЕСО) ============
  function updateWheel() {
    if (!elements.wheel) return;

    if (players.length === 0) {
      elements.wheel.innerHTML = '';
      return;
    }

    // Рассчитываем пропорциональные сегменты
    const totalBets = players.reduce((sum, p) => sum + (p.betAmount || 0), 0);
    
    if (totalBets === 0) {
      console.warn('⚠️ Общая сумма ставок = 0');
      return;
    }
    
    let currentAngle = 0;
    const segments = [];

    players.forEach((player, index) => {
      const betAmount = player.betAmount || 0;
      const percent = (betAmount / totalBets) * 100;
      const degrees = (betAmount / totalBets) * 360;
      
      segments.push({
        start: currentAngle,
        end: currentAngle + degrees,
        center: currentAngle + degrees / 2,
        player: player,
        percent: percent
      });
      
      currentAngle += degrees;
    });

    // Создаем SVG колесо с настоящими секторами
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "250");
    svg.setAttribute("height", "250");
    svg.setAttribute("viewBox", "0 0 250 250");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    
    const centerX = 125;
    const centerY = 125;
    const radius = 125;
    
    // Создаем каждый сектор как SVG path
    segments.forEach((seg, index) => {
      const startAngle = (seg.start - 90) * Math.PI / 180;
      const endAngle = (seg.end - 90) * Math.PI / 180;
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      const largeArc = seg.end - seg.start > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `Z`
      ].join(' ');
      
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", seg.player.color);
      path.setAttribute("stroke", "rgba(0,0,0,0.2)");
      path.setAttribute("stroke-width", "1");
      path.classList.add('wheel-segment');
      path.setAttribute('data-player-id', seg.player.id);
      
      svg.appendChild(path);
    });
    
    // Очищаем и добавляем SVG
    elements.wheel.innerHTML = '';
    elements.wheel.appendChild(svg);
    
    // Создаем аватарки поверх SVG
    segments.forEach((seg) => {
      const centerAngle = seg.center;
      const angleRad = (centerAngle - 90) * (Math.PI / 180);
      const avatarRadius = 62.5;
      
      const xPx = centerX + avatarRadius * Math.cos(angleRad);
      const yPx = centerY + avatarRadius * Math.sin(angleRad);
      
      const avatar = document.createElement('div');
      avatar.className = 'avatar dynamic-avatar';
      avatar.setAttribute('data-player-id', seg.player.id);
      
      const size = Math.max(30, Math.min(45, 30 + seg.percent * 0.3));
      avatar.style.width = `${size}px`;
      avatar.style.height = `${size}px`;
      avatar.style.position = 'absolute';
      avatar.style.left = `${xPx}px`;
      avatar.style.top = `${yPx}px`;
      avatar.style.transform = `translate(-50%, -50%) rotate(-${currentRotation}deg)`;
      avatar.style.borderRadius = '50%';
      avatar.style.border = '3px solid rgba(255, 255, 255, 0.9)';
      avatar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
      avatar.style.zIndex = '10';
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.pointerEvents = 'none';
      
      const photoUrl = seg.player.photo_url || seg.player.photoUrl;
      if (photoUrl && photoUrl.trim() !== '') {
        avatar.style.backgroundImage = `url(${photoUrl})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
      } else {
        avatar.style.backgroundColor = seg.player.color;
        avatar.style.color = 'white';
        avatar.style.fontSize = `${size * 0.5}px`;
        avatar.style.fontWeight = 'bold';
        avatar.textContent = seg.player.username ? seg.player.username[0].toUpperCase() : '?';
      }
      
      elements.wheel.appendChild(avatar);
    });
  }

  // ============ DISPLAY UPDATES ============
  function updateDisplay() {
    const totalBets = players.reduce((sum, p) => sum + (p.betAmount || 0), 0);
    if (elements.totalBets) {
      elements.totalBets.textContent = totalBets || 0;
    }

    // Обновляем только если мы в режиме Previos (ставки игроков)
    if (window.TabsManager && window.TabsManager.getCurrentTab() !== 'previos') {
      return;
    }

    if (elements.playersList) {
      if (players.length === 0) {
        elements.playersList.innerHTML = '';
        return;
      }
      
      players.forEach(player => {
        // Пропускаем невалидных игроков
        if (!player || !player.id || !player.username || player.id === 'undefined') return;
        
        // Ищем существующий блок игрока
        let playerDiv = elements.playersList.querySelector(`[data-player-id="${player.id}"]`);
        
        if (!playerDiv) {
          // Создаем новый блок только если игрока нет
          playerDiv = document.createElement('div');
          playerDiv.className = 'win';
          playerDiv.setAttribute('data-player-id', player.id);
          
          const photoUrl = player.photo_url || player.photoUrl;
          let avatarStyle = '';
          if (photoUrl && photoUrl.trim() !== '') {
            avatarStyle = `background-image: url(${photoUrl}); background-size: cover; background-position: center;`;
          } else {
            const initial = player.username ? player.username[0].toUpperCase() : 'P';
            avatarStyle = `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px;`;
          }
          
          playerDiv.innerHTML = `
            <div class="acc-inf">
              <div class="avatar-wrapper">
                <div class="avatar-2" style="${avatarStyle}; width: 21px; height: 21px; border-radius: 50%;">${photoUrl ? '' : (player.username ? player.username[0].toUpperCase() : 'P')}</div>
              </div>
              <div class="n-k"><div class="n-k-2">${player.username}</div></div>
            </div>
            <div class="div-wrapper-2"><div class="text-wrapper-14" data-bet-amount>${player.betAmount || 0}</div></div>
            <div class="element-wrapper"><div class="element-3" data-win-amount>${player.winAmount || '-'}</div></div>
          `;
          elements.playersList.appendChild(playerDiv);
        } else {
          // Обновляем только цифры
          const betElement = playerDiv.querySelector('[data-bet-amount]');
          const winElement = playerDiv.querySelector('[data-win-amount]');
          if (betElement) betElement.textContent = player.betAmount || 0;
          if (winElement) winElement.textContent = player.winAmount || '-';
        }
      });
    }
  }

  // Экспортируем для tabs-manager
  window.updateDisplay = updateDisplay;

  function updateWaitText() {
    if (!elements.waitText) return;
    const spans = elements.waitText.querySelectorAll('span');
    
    if (gameState === GAME_STATES.WAITING) {
      spans[0].style.display = 'inline';
      spans[0].style.color = '#6a6a6a';
      spans[0].textContent = 'Wait...';
      spans[1].style.display = 'none';
    } else if (gameState === GAME_STATES.BETTING) {
      spans[0].style.display = 'none';
      spans[1].style.display = 'inline';
      spans[1].style.color = '#39d811';
      spans[1].textContent = `${bettingTimeLeft}s`;
    } else if (gameState === GAME_STATES.SPINNING) {
      spans[0].style.display = 'none';
      spans[1].style.display = 'inline';
      spans[1].style.color = '#ffc107';
      spans[1].textContent = 'PLAY';
    }
  }

  // ============ GAME PHASES ============
  function startBetting() {
    gameState = GAME_STATES.BETTING;
    bettingTimeLeft = 60;
    updateWaitText();

    bettingTimer = setInterval(() => {
      bettingTimeLeft--;
      updateWaitText();
      
      if (bettingTimeLeft <= 0) {
        clearInterval(bettingTimer);
        startSpinning();
      }
    }, 1000);
  }

  function startSpinning() {
    if (players.length === 0) {
      resetGame();
      return;
    }

    gameState = GAME_STATES.SPINNING;
    updateWaitText();

    const winner = selectWinner();
    spinToWinner(winner);
  }

  function selectWinner() {
    const totalBets = players.reduce((sum, p) => sum + p.betAmount, 0);
    const random = Math.random() * totalBets;
    
    let cumulative = 0;
    for (const player of players) {
      cumulative += player.betAmount;
      if (random <= cumulative) return player;
    }
    
    return players[0];
  }

  function spinToWinner(winner) {
    const spins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = winner.centerAngle;
    const finalRotation = spins * 360 + (360 - targetAngle);

    elements.wheel.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    elements.wheel.style.transform = `rotate(${finalRotation}deg)`;
    currentRotation = finalRotation;

    // Обновляем аватарки во время вращения
    updateAvatarsRotation();

    setTimeout(() => finishRound(winner), 5000);
  }

  // Функция для обновления вращения всех аватарок
  function updateAvatarsRotation() {
    const avatars = elements.wheel?.querySelectorAll('.dynamic-avatar');
    if (!avatars) return;
    
    avatars.forEach(avatar => {
      // Получаем текущую позицию (left, top остаются прежними)
      const left = avatar.style.left;
      const top = avatar.style.top;
      
      // Применяем counter-rotation
      avatar.style.transform = `translate(-50%, -50%) rotate(-${currentRotation}deg)`;
      avatar.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'; // Синхронизируем с колесом
    });
  }

  function finishRound(winner) {
    gameState = GAME_STATES.FINISHED;
    
    const totalBets = players.reduce((sum, p) => sum + p.betAmount, 0);
    
    if (winner.isUser && window.GameBalanceAPI) {
      window.GameBalanceAPI.payWinnings(totalBets, 'chips');
    }
    
    winner.winAmount = totalBets;

    if (elements.resultText) {
      elements.resultText.textContent = `${winner.username} WIN`;
    }
    
    // Показываем блок результата
    const resultBlock = document.getElementById('round-result-block');
    if (resultBlock) {
      resultBlock.style.display = 'block';
    }

    updateDisplay();

    setTimeout(() => resetGame(), 5000);
  }

  function resetGame() {
    gameState = GAME_STATES.WAITING;
    players = [];
    
    if (elements.wheel) {
      elements.wheel.style.transition = 'none';
      elements.wheel.style.transform = 'rotate(0deg)';
      elements.wheel.style.background = '#2a2a2a';
      elements.wheel.innerHTML = '';
    }
    
    // Скрываем блок результата
    const resultBlock = document.getElementById('round-result-block');
    if (resultBlock) {
      resultBlock.style.display = 'none';
    }

    currentRotation = 0;
    updateDisplay();
    updateWaitText();
  }

  // ============ NOTIFICATIONS ============
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(31, 29, 29, 0.98);
      color: #ffb3c1;
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid rgba(202, 57, 88, 0.5);
      font-family: 'Montserrat', Helvetica;
      font-size: 13px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 6px 18px rgba(202, 57, 88, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }

  // ============ TEST FUNCTIONS ============
  window.addTestPlayers = function() {
    players = [];
    const testPlayers = [
      { id: 'bot1', username: 'Alice', photo_url: null, betAmount: 100, isUser: false },
      { id: 'bot2', username: 'Bob', photo_url: null, betAmount: 200, isUser: false },
      { id: 'bot3', username: 'Charlie', photo_url: null, betAmount: 150, isUser: false }
    ];
    
    testPlayers.forEach(p => addPlayer(p));
    if (gameState === GAME_STATES.WAITING) startBetting();
    
   
    players.forEach(p => console.log(`${p.color.name}: ${p.username} - ${p.betAmount} chips (${p.percent.toFixed(1)}%)`));
  };

  window.skipTimer = function() {
    if (gameState === GAME_STATES.BETTING) {
      clearInterval(bettingTimer);
      startSpinning();
    }
  };

  // ============ INIT ============
  function init() {
    if (window.TelegramUserData?.username) {
      const nicknameEl = document.querySelector('.account-info .text-wrapper');
      if (nicknameEl) nicknameEl.textContent = window.TelegramUserData.username;
    }
    
    // Скрываем блок результата при инициализации
    const resultBlock = document.getElementById('round-result-block');
    if (resultBlock) {
      resultBlock.style.display = 'none';
    }

    updateWaitText();
    updateDisplay();
    
    console.log('🎰 Wheel Game готов!');
    console.log('Команды: addTestPlayers(), skipTimer()');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Экспорт для мультиплеера
  window.rollGame = {
    addPlayer,
    players: () => players,
    spin: (winnerId) => {
      // Находим победителя
      const winner = players.find(p => p.id === winnerId);
      if (winner) {
        spinToWinner(winner);
      }
    },
    updateState: (state) => {
      // Обновление состояния от сервера
      if (state.players) {
        console.log('🔄 updateState получил игроков:', state.players);
        
        // Преобразуем игроков с ПОСТОЯННЫМИ цветами
        const newPlayers = state.players.map((player) => {
          const playerId = player.id || player.userId;
          
          // Назначаем цвет НАВСЕГДА для этого игрока (PvP требование)
          if (!playerColors.has(playerId)) {
            playerColors.set(playerId, colors[nextColorIndex % colors.length]);
            console.log(`🎨 Игрок ${player.username || player.nickname} получил цвет ${colors[nextColorIndex % colors.length]}`);
            nextColorIndex++;
          }
          
          return {
            id: playerId,
            username: player.username || player.nickname,
            photo_url: player.photo_url || player.photoUrl,
            betAmount: player.betAmount || player.bet || 0,
            color: playerColors.get(playerId) // Постоянный цвет для PvP
          };
        });
        
        console.log('✅ Преобразованные игроки:', newPlayers);
        
        players = newPlayers;
        updateWheel();
        updateDisplay();
      }
    },
    showResult: (result) => {
      // Показать результат
      const winner = players.find(p => p.id === result.winner);
      if (winner) {
        showNotification(`🏆 ${winner.username} выиграл!`);
      }
    }
  };
})();

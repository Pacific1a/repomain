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
  let players = []; // Максимум 3 игрока
  let bettingTimeLeft = 60;
  let bettingTimer = null;
  let currentRotation = 0;

  // ============ COLORS (3 команды) ============
  const teams = [
    { 
      start: '#8f7aff', 
      end: '#4837a8', 
      name: 'Purple'
    },
    { 
      start: '#b92eff', 
      end: '#5a00a0', 
      name: 'Pink'
    },
    { 
      start: '#ffdcb9', 
      end: '#b38c69', 
      name: 'Beige'
    }
  ];

  // ============ DOM ELEMENTS ============
  const elements = {
    wheel: document.getElementById('fortune-wheel'),
    avatar1: document.getElementById('avatar-1'),
    avatar2: document.getElementById('avatar-2'),
    avatar3: document.getElementById('avatar-3'),
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
  
  const avatarElements = [elements.avatar1, elements.avatar2, elements.avatar3];

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

  // ============ PLAYER MANAGEMENT ============
  function addPlayer(player) {
    // Максимум 3 игрока
    if (players.length >= 3) {
      showNotification('Максимум 3 игрока!');
      return false;
    }

    const existing = players.find(p => p.id === player.id);
    if (existing) {
      existing.betAmount += player.betAmount;
    } else {
      // Назначаем команду по порядку
      const teamIndex = players.length;
      player.team = teams[teamIndex];
      player.teamIndex = teamIndex;
      players.push(player);
    }

    // Добавляем ботов если нужно
    addBotsIfNeeded();

    updateWheel();
    updateDisplay();
    return true;
  }

  // Добавление ботов для заполнения игры
  function addBotsIfNeeded() {
    if (!window.PlayersSystem) return;
    
    const neededBots = 3 - players.length;
    if (neededBots <= 0) return;

    const bots = window.PlayersSystem.getRandomBots(neededBots);
    
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

  // ============ WHEEL RENDERING ============
  function updateWheel() {
    if (!elements.wheel) return;

    // ВСЕГДА 3 равных сегмента по 120° (не зависит от ставок!)
    elements.wheel.style.background = `conic-gradient(from -90deg,
      ${teams[0].start} 0deg, ${teams[0].end} 120deg,
      ${teams[1].start} 120deg, ${teams[1].end} 240deg,
      ${teams[2].start} 240deg, ${teams[2].end} 360deg
    )`;

    // Фиксированные углы для каждой позиции
    const segments = [
      { start: 0, end: 120, center: 60 },    // Purple
      { start: 120, end: 240, center: 180 }, // Pink
      { start: 240, end: 360, center: 300 }  // Beige
    ];

    // Обновляем аватарки
    players.forEach((player, index) => {
      const avatar = avatarElements[index];
      if (!avatar) return;

      const segment = segments[index];
      player.centerAngle = segment.center;

      // Показываем аватарку и загружаем фото
      avatar.style.display = 'block';
      
      if (player.photo_url) {
        // Реальная аватарка из Telegram
        avatar.style.backgroundImage = `url(${player.photo_url})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.style.background = '';
      } else if (player.avatarColor) {
        // Цветной градиент для бота
        avatar.style.background = player.avatarColor;
        avatar.style.backgroundImage = '';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.color = 'white';
        avatar.style.fontSize = '20px';
        avatar.style.fontWeight = 'bold';
        avatar.textContent = player.username ? player.username[0].toUpperCase() : '?';
      } else {
        // Дефолтный серый градиент
        avatar.style.background = 'linear-gradient(180deg, #7d7d7d, #a2a2a2)';
        avatar.style.backgroundImage = '';
      }

    });

    // Скрываем неиспользуемые аватарки
    for (let i = players.length; i < 3; i++) {
      if (avatarElements[i]) {
        avatarElements[i].style.display = 'none';
      }
    }
  }

  // ============ DISPLAY UPDATES ============
  function updateDisplay() {
    const totalBets = players.reduce((sum, p) => sum + p.betAmount, 0);
    if (elements.totalBets) {
      elements.totalBets.textContent = totalBets;
    }

    // Обновляем только если мы в режиме Previos (ставки игроков)
    if (window.TabsManager && window.TabsManager.getCurrentTab() !== 'previos') {
      return;
    }

    if (elements.playersList) {
      elements.playersList.innerHTML = '';
      
      if (players.length === 0) {
        // Показываем пустой список
        return;
      }
      
      players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'win';
        div.innerHTML = `
          <div class="acc-inf">
            <div class="avatar-wrapper">
              <div class="avatar-2" style="${player.photo_url ? `background-image: url(${player.photo_url}); background-size: cover;` : ''}"></div>
            </div>
            <div class="n-k"><div class="n-k-2">${player.username}</div></div>
          </div>
          <div class="div-wrapper-2"><div class="text-wrapper-14">${player.betAmount}</div></div>
          <div class="element-wrapper"><div class="element-3">${player.winAmount || '-'}</div></div>
        `;
        elements.playersList.appendChild(div);
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

    setTimeout(() => finishRound(winner), 5000);
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
})();

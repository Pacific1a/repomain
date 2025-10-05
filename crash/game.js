(function () {
  'use strict';

  // ============ GAME STATE ============
  const GAME_STATES = {
    WAITING: 'waiting',
    BETTING: 'betting',
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
  let currentMultiplier = 1.00;
  let crashPoint = 1.50;
  let playerBetAmount = 0;
  let playerHasBet = false;
  let playerCashedOut = false;
  let bettingTimeLeft = 10;
  let flyingStartTime = 0;
  let animationFrameId = null;

  // ============ STATE PERSISTENCE ============
  const STORAGE_KEY = 'crash_game_state';
  
  function saveGameState() {
    try {
      const state = {
        playerBetAmount,
        betAmountValue: getBetAmount(),
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  function loadGameState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        // Only restore bet amount, not active bets (they expire)
        if (state.betAmountValue) {
          setBetAmount(state.betAmountValue);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  // ============ FAKE PLAYERS ============
  const FAKE_NAMES = [
    'Alex', 'Maria', 'John', 'Anna', 'Mike', 'Kate', 'Tom', 'Lisa',
    'David', 'Emma', 'Chris', 'Sofia', 'Max', 'Olga', 'Nick', 'Vera'
  ];

  let fakePlayers = [];
  let allBets = [];

  // ============ DOM ELEMENTS ============
  const elements = {
    waitingRoot: document.getElementById('waitingRoot'),
    waitingBar: document.getElementById('waitingBar'),
    waitingText: document.getElementById('waitingText'),
    currentMultiplier: document.getElementById('currentMultiplier'),
    crashOverlay: document.getElementById('crashOverlay'),
    gameCanvas: document.getElementById('gameCanvas'),
    betInput: document.getElementById('betInput'),
    betButton: document.querySelector('.cancel-button-next-2'),
    betButtonText: document.querySelector('.text-wrapper-15'),
    betButtonSubtext: document.querySelector('.text-wrapper-16'),
    userTemplates: document.querySelector('.user-templates'),
    minusButton: document.querySelector('.button'),
    plusButton: document.querySelector('.union-wrapper'),
    multiplierButtons: document.querySelectorAll('.button-2'),
    totalBetsText: document.querySelector('.text-wrapper-17'),
    totalWinText: document.querySelector('.text-wrapper-19'),
    progressBar: document.querySelector('.rectangle-3'),
    crashHistory: document.getElementById('crashHistory')
  };
  
  // ============ CRASH HISTORY ============
  let crashHistoryArray = [];
  
  // ============ PLANE IMAGE ============
  const planeImage = new Image();
  planeImage.src = 'https://raw.githubusercontent.com/Pacific1a/img/main/crash/Union.png';
  let planeLoaded = false;
  planeImage.onload = () => {
    planeLoaded = true;
    console.log('Plane image loaded!');
  };

  // ============ CANVAS SETUP ============
  const canvas = elements.gameCanvas;
  const ctx = canvas.getContext('2d');
  let canvasWidth = 0;
  let canvasHeight = 0;
  let trailPoints = [];

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height - 30;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }

  // ============ UTILITY FUNCTIONS ============
  function maskName(name) {
    if (!name || name.length <= 1) return name;
    if (name.length === 2) return name.charAt(0) + '*';
    if (name.length === 3) return name.charAt(0) + '*' + name.charAt(2);
    // For names longer than 3 chars
    return name.charAt(0) + '***' + name.charAt(name.length - 1);
  }

  function generateCrashPoint() {
    // Полностью случайный краш с экспоненциальным распределением
    const rand = Math.random();
    
    // Используем обратное экспоненциальное распределение для непредсказуемости
    const lambda = 0.5; // Параметр распределения
    const crash = 1.00 + (-Math.log(1 - rand) / lambda);
    
    // Ограничиваем максимум до 100x
    return Math.min(crash, 100.00);
  }

  function generateFakePlayers() {
    const count = 3 + Math.floor(Math.random() * 5); // 3-7 fake players
    fakePlayers = [];
    
    for (let i = 0; i < count; i++) {
      const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
      const betAmount = [50, 100, 150, 200, 250, 300, 500][Math.floor(Math.random() * 7)];
      const willCashout = Math.random() > 0.3; // 70% will cashout
      let cashoutAt = 0;
      
      if (willCashout) {
        const rand = Math.random();
        if (rand < 0.4) cashoutAt = 1.20 + Math.random() * 0.80; // 1.20-2.00x
        else if (rand < 0.7) cashoutAt = 2.00 + Math.random() * 1.00; // 2.00-3.00x
        else cashoutAt = 3.00 + Math.random() * 2.00; // 3.00-5.00x
      }
      
      fakePlayers.push({
        name,
        betAmount,
        willCashout,
        cashoutAt,
        hasCashedOut: false
      });
    }
  }

  // ============ BET AMOUNT CONTROLS ============
  function getBetAmount() {
    return parseInt(elements.betInput.value) || 50;
  }

  function setBetAmount(amount) {
    elements.betInput.value = Math.max(50, amount);
    updateBetButtonSubtext();
    saveGameState();
  }
  
  // Handle input changes
  elements.betInput.addEventListener('input', () => {
    updateBetButtonSubtext();
  });
  
  elements.betInput.addEventListener('blur', () => {
    const value = parseInt(elements.betInput.value);
    if (isNaN(value) || value < 50) {
      elements.betInput.value = 50;
    }
  });

  function updateBetButtonSubtext() {
    const amount = getBetAmount();
    if (buttonState === BUTTON_STATES.BET) {
      elements.betButtonSubtext.textContent = `${amount} chips`;
    } else if (buttonState === BUTTON_STATES.CANCEL) {
      if (gameState === GAME_STATES.BETTING) {
        elements.betButtonSubtext.textContent = 'Cancel bet';
      } else {
        elements.betButtonSubtext.textContent = 'Waiting to next round';
      }
    } else if (buttonState === BUTTON_STATES.CASHOUT) {
      const potentialWin = Math.floor(playerBetAmount * currentMultiplier);
      elements.betButtonSubtext.textContent = `${potentialWin} chips`;
    }
  }

  elements.minusButton.addEventListener('click', () => {
    if (buttonState !== BUTTON_STATES.BET) return;
    const current = getBetAmount();
    const newAmount = Math.max(50, current - 50);
    setBetAmount(newAmount);
  });

  elements.plusButton.addEventListener('click', () => {
    if (buttonState !== BUTTON_STATES.BET) return;
    const current = getBetAmount();
    const newAmount = current + 50;
    setBetAmount(newAmount);
  });

  elements.multiplierButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (buttonState !== BUTTON_STATES.BET) return;
      const multiplier = parseInt(btn.textContent);
      const current = getBetAmount();
      setBetAmount(current * multiplier);
    });
  });

  // ============ BUTTON STATE MANAGEMENT ============
  function setButtonState(state) {
    buttonState = state;
    const btn = elements.betButton;
    
    // Remove all state classes
    btn.classList.remove('btn-bet', 'btn-cancel', 'btn-cashout');
    
    switch (state) {
      case BUTTON_STATES.BET:
        btn.classList.add('btn-bet');
        elements.betButtonText.textContent = 'BET';
        elements.betButtonSubtext.textContent = `${getBetAmount()} chips`;
        break;
      case BUTTON_STATES.CANCEL:
        btn.classList.add('btn-cancel');
        elements.betButtonText.textContent = 'CANCEL';
        elements.betButtonSubtext.textContent = 'Waiting to next round';
        break;
      case BUTTON_STATES.CASHOUT:
        btn.classList.add('btn-cashout');
        elements.betButtonText.textContent = 'CASH OUT';
        updateBetButtonSubtext();
        break;
    }
  }

  // ============ CASH OUT FUNCTION ============
  async function performCashOut() {
    if (!playerHasBet || playerCashedOut) return;
    
    const winAmount = Math.floor(playerBetAmount * currentMultiplier);
    
    // Начисляем выигрыш
    if (window.GameBalanceAPI) {
      window.GameBalanceAPI.payWinnings(winAmount, 'chips');
    }
    
    playerCashedOut = true;
    
    // Update player bet in list
    updatePlayerBetInList(currentMultiplier, winAmount);
    
    // Update stats
    updateGameStats();
    
    playerBetAmount = 0;
    playerHasBet = false;
    
    // Disable button until next round
    elements.betButton.style.opacity = '0.5';
    elements.betButton.style.pointerEvents = 'none';
    
    console.log(`💰 Cash Out: ${winAmount} chips (${currentMultiplier.toFixed(2)}x)`);
  }

  // ============ BET BUTTON HANDLER ============
  elements.betButton.addEventListener('click', async () => {
    if (buttonState === BUTTON_STATES.BET && gameState === GAME_STATES.BETTING) {
      // Place bet
      const betAmount = getBetAmount();
      
      if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
        showNotification('Недостаточно фишек', 'error');
        return;
      }
      
      const success = await window.GameBalanceAPI.placeBet(betAmount, 'chips');
      if (success) {
        playerBetAmount = betAmount;
        playerHasBet = true;
        playerCashedOut = false;
        setButtonState(BUTTON_STATES.CANCEL);
        
        // Add player to bets list
        addPlayerBetToList();
        
        // Update stats
        updateGameStats();
        
        console.log(`🎲 Bet placed: ${betAmount} chips`);
        
        // Проверяем Auto Cash Out
        if (window.BetAutoSwitcher && window.BetAutoSwitcher.isAutoCashOutEnabled()) {
          const target = window.BetAutoSwitcher.getAutoCashOutMultiplier();
          console.log(`🤖 Auto Cash Out enabled: ${target.toFixed(2)}x`);
        }
      }
    } else if (buttonState === BUTTON_STATES.CANCEL && gameState === GAME_STATES.BETTING) {
      // Cancel bet during betting phase
      await window.GameBalanceAPI.payWinnings(playerBetAmount, 'chips');
      playerBetAmount = 0;
      playerHasBet = false;
      setButtonState(BUTTON_STATES.BET);
      
      // Remove player from bets list
      removePlayerBetFromList();
      
      // Update stats
      updateGameStats();
    } else if (buttonState === BUTTON_STATES.BET && gameState === GAME_STATES.FLYING) {
      // Place bet during flying phase - must wait for next round
      const betAmount = getBetAmount();
      
      if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
        showNotification('Недостаточно фишек', 'error');
        return;
      }
      
      const success = await window.GameBalanceAPI.placeBet(betAmount, 'chips');
      if (success) {
        playerBetAmount = betAmount;
        playerHasBet = true;
        playerCashedOut = false;
        setButtonState(BUTTON_STATES.CANCEL);
        
        // Don't add to list yet - will be added next round
      }
    } else if (buttonState === BUTTON_STATES.CANCEL && gameState === GAME_STATES.FLYING) {
      // Cancel bet placed during flying phase
      await window.GameBalanceAPI.payWinnings(playerBetAmount, 'chips');
      playerBetAmount = 0;
      playerHasBet = false;
      setButtonState(BUTTON_STATES.BET);
    } else if (buttonState === BUTTON_STATES.CASHOUT && gameState === GAME_STATES.FLYING) {
      // Manual cash out
      await performCashOut();
    }
  });

  // ============ BETS LIST MANAGEMENT ============
  function addPlayerBetToList() {
    const userName = window.TelegramUser ? window.TelegramUser.getDisplayName() : 'You';
    const maskedName = maskName(userName);
    
    const betHtml = `
      <div class="win player-bet" data-player="user">
        <div class="acc-inf">
          <div class="div-wrapper-2"><div class="avatar-2"></div></div>
          <div class="div-wrapper-3"><div class="text-wrapper-22">${maskedName}</div></div>
        </div>
        <div class="div-wrapper-3"><div class="text-wrapper-23">${playerBetAmount}</div></div>
        <div class="div-wrapper-3"><div class="text-wrapper-27">-</div></div>
        <div class="div-wrapper-4"><div class="text-wrapper-28">-</div></div>
      </div>
    `;
    
    elements.userTemplates.insertAdjacentHTML('afterbegin', betHtml);
    
    // Set avatar if available
    if (window.TelegramUser && window.TelegramUser.getPhotoUrl()) {
      const avatar = elements.userTemplates.querySelector('.player-bet .avatar-2');
      if (avatar) {
        avatar.style.backgroundImage = `url(${window.TelegramUser.getPhotoUrl()})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
      }
    }
  }

  function removePlayerBetFromList() {
    const playerBet = elements.userTemplates.querySelector('.player-bet[data-player="user"]');
    if (playerBet) {
      playerBet.remove();
    }
  }

  function updatePlayerBetInList(multiplier, winAmount) {
    const playerBet = elements.userTemplates.querySelector('.player-bet[data-player="user"]');
    if (playerBet) {
      playerBet.classList.remove('default');
      playerBet.classList.add('win');
      
      const multiplierEl = playerBet.querySelector('.text-wrapper-27');
      const winEl = playerBet.querySelector('.text-wrapper-28');
      
      if (multiplierEl) {
        multiplierEl.className = 'text-wrapper-24';
        multiplierEl.textContent = `${multiplier.toFixed(2)}x`;
      }
      if (winEl) {
        winEl.className = 'text-wrapper-25';
        winEl.textContent = winAmount;
      }
    }
  }

  function addSingleFakePlayer(player) {
    const maskedName = maskName(player.name);
    const betHtml = `
      <div class="default bet-fade-in" data-player="${player.name}">
        <div class="acc-inf-2">
          <div class="avatar-wrapper"><div class="avatar-3"></div></div>
          <div class="n-k"><div class="text-wrapper-26">${maskedName}</div></div>
        </div>
        <div class="div-wrapper-3"><div class="text-wrapper-27">${player.betAmount}</div></div>
        <div class="div-wrapper-3"><div class="text-wrapper-27">-</div></div>
        <div class="div-wrapper-4"><div class="text-wrapper-28">-</div></div>
      </div>
    `;
    
    elements.userTemplates.insertAdjacentHTML('beforeend', betHtml);
    
    // Update stats after adding player
    updateGameStats();
    
    // Scroll to bottom to show new bet
    setTimeout(() => {
      elements.userTemplates.scrollTop = elements.userTemplates.scrollHeight;
    }, 50);
  }

  function updateFakeBetsInList() {
    fakePlayers.forEach(player => {
      if (player.willCashout && !player.hasCashedOut && currentMultiplier >= player.cashoutAt) {
        player.hasCashedOut = true;
        const winAmount = Math.floor(player.betAmount * player.cashoutAt);
        
        const betEl = elements.userTemplates.querySelector(`[data-player="${player.name}"]`);
        if (betEl) {
          betEl.classList.remove('default');
          betEl.classList.add('win');
          betEl.innerHTML = `
            <div class="acc-inf">
              <div class="div-wrapper-2"><div class="avatar-2"></div></div>
              <div class="div-wrapper-3"><div class="text-wrapper-22">${maskName(player.name)}</div></div>
            </div>
            <div class="div-wrapper-3"><div class="text-wrapper-23">${player.betAmount}</div></div>
            <div class="div-wrapper-3"><div class="text-wrapper-24">${player.cashoutAt.toFixed(2)}x</div></div>
            <div class="div-wrapper-4"><div class="text-wrapper-25">${winAmount}</div></div>
          `;
        }
        
        // Update stats when player cashes out
        updateGameStats();
      }
    });
  }

  function finalizeFakeBetsAfterCrash() {
    fakePlayers.forEach(player => {
      if (!player.hasCashedOut) {
        const betEl = elements.userTemplates.querySelector(`[data-player="${player.name}"]`);
        if (betEl) {
          // Show as lost (keep default style with dashes)
          betEl.classList.add('default');
          betEl.classList.add('lost');
          betEl.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
          betEl.style.transition = 'background-color 0.3s ease';
        }
      }
    });
    
    // Also mark player as lost if they didn't cash out
    if (playerHasBet && !playerCashedOut) {
      const playerBet = elements.userTemplates.querySelector('.player-bet[data-player="user"]');
      if (playerBet) {
        playerBet.classList.add('lost');
        playerBet.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        playerBet.style.transition = 'background-color 0.3s ease';
      }
    }
  }

  // ============ GAME STATISTICS ============
  function updateGameStats() {
    // Count only visible bets in the list
    const visibleBets = elements.userTemplates.querySelectorAll('.default, .win');
    let totalBets = visibleBets.length;
    let totalChips = 0;
    let totalWinChips = 0;
    
    visibleBets.forEach(betEl => {
      const betAmountEl = betEl.querySelector('.text-wrapper-23, .text-wrapper-27');
      if (betAmountEl) {
        const amount = parseInt(betAmountEl.textContent) || 0;
        totalChips += amount;
      }
      
      const winAmountEl = betEl.querySelector('.text-wrapper-25');
      if (winAmountEl && winAmountEl.textContent !== '-') {
        const winAmount = parseInt(winAmountEl.textContent) || 0;
        totalWinChips += winAmount;
      }
    });
    
    // Update UI
    if (elements.totalBetsText) {
      elements.totalBetsText.textContent = `${totalBets}/550`;
    }
    
    if (elements.totalWinText) {
      elements.totalWinText.textContent = totalWinChips.toLocaleString();
    }
    
    // Update progress bar
    if (elements.progressBar) {
      const progress = Math.min((totalChips / 5000) * 100, 100); // Max 5000 chips = 100%
      elements.progressBar.style.width = `${progress}%`;
    }
  }

  // ============ CUSTOM NOTIFICATION ============
  function showNotification(message, type = 'error') {
    // Remove existing notification
    const existing = document.querySelector('.custom-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto remove after 2.5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  // ============ CANVAS DRAWING ============
  function clearCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawTrail() {
    if (trailPoints.length < 1) return;
    
    const lastPoint = trailPoints[trailPoints.length - 1];
    
    // Draw fill area under the curve
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    
    if (trailPoints.length === 1) {
      ctx.lineTo(lastPoint.x, lastPoint.y);
    } else {
      ctx.lineTo(trailPoints[0].x, trailPoints[0].y);
      for (let i = 1; i < trailPoints.length; i++) {
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
      }
    }
    
    ctx.lineTo(lastPoint.x, canvasHeight);
    ctx.lineTo(0, canvasHeight);
    ctx.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, canvasHeight, 0, 0);
    fillGradient.addColorStop(0, 'rgba(202, 57, 88, 0.08)');
    fillGradient.addColorStop(0.5, 'rgba(202, 57, 88, 0.18)');
    fillGradient.addColorStop(1, 'rgba(255, 155, 176, 0.3)');
    ctx.fillStyle = fillGradient;
    ctx.fill();
    
    // Draw the curve line
    if (trailPoints.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
      
      for (let i = 1; i < trailPoints.length; i++) {
        ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
      }
      
      const lineGradient = ctx.createLinearGradient(0, canvasHeight, lastPoint.x, lastPoint.y);
      lineGradient.addColorStop(0, 'rgba(202, 57, 88, 0.6)');
      lineGradient.addColorStop(0.5, 'rgba(255, 100, 130, 0.9)');
      lineGradient.addColorStop(1, 'rgba(255, 155, 176, 1)');
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(202, 57, 88, 0.5)';
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw plane image on canvas at the end of line
    if (planeLoaded && trailPoints.length > 0) {
      const planeX = lastPoint.x;
      const planeY = lastPoint.y;
      
      // Calculate rotation
      let angle = 0;
      if (trailPoints.length >= 3) {
        const current = trailPoints[trailPoints.length - 1];
        const previous = trailPoints[trailPoints.length - 3];
        const deltaX = current.x - previous.x;
        const deltaY = current.y - previous.y;
        angle = Math.atan2(-deltaY, deltaX);
      }
      
      // Draw plane (proportional size)
      const planeWidth = 35;
      const planeHeight = 35;
      ctx.save();
      ctx.translate(planeX, planeY);
      ctx.rotate(angle);
      ctx.drawImage(planeImage, -planeWidth/2, -planeHeight/2, planeWidth, planeHeight);
      ctx.restore();
    }
  }

  // ============ GAME PHASES ============
  function startBettingPhase() {
    gameState = GAME_STATES.BETTING;
    bettingTimeLeft = 10;
    
    // ВАЖНО: Если игрок поставил во время полета, НЕ сбрасываем его ставку
    // Она должна остаться и участвовать в следующем раунде
    const hadPendingBet = playerHasBet && buttonState === BUTTON_STATES.CANCEL;
    
    if (!hadPendingBet) {
      // Только если не было ставки "в ожидании"
      playerHasBet = false;
      playerBetAmount = 0;
    }
    
    playerCashedOut = false;
    currentMultiplier = 1.00;
    crashPoint = generateCrashPoint();
    
    // Разблокировать Auto Cash Out
    if (window.BetAutoSwitcher) {
      window.BetAutoSwitcher.setGameActive(false);
    }
    
    // УБРАНО: generateFakePlayers() - теперь только реальные игроки через WebSocket
    
    // НЕ очищаем список - игроки управляются через crash-multiplayer-sync.js
    
    elements.waitingRoot.classList.remove('hidden');
    elements.crashOverlay.classList.remove('show');
    elements.currentMultiplier.textContent = '1.00x';
    elements.currentMultiplier.classList.remove('crashed');
    
    // Hide multiplier during betting
    elements.currentMultiplier.style.display = 'none';
    
    // Update stats
    updateGameStats();
    
    clearCanvas();
    trailPoints = [];
    
    // Reset button - если была отложенная ставка, показываем CANCEL
    if (hadPendingBet) {
      setButtonState(BUTTON_STATES.CANCEL);
      console.log(`✅ Ставка ${playerBetAmount} chips перенесена на новый раунд`);
    } else {
      setButtonState(BUTTON_STATES.BET);
    }
    elements.betButton.style.opacity = '1';
    elements.betButton.style.pointerEvents = 'auto';
    
    // Add fake players gradually during betting phase
    let playerIndex = 0;
    const addPlayerInterval = setInterval(() => {
      if (playerIndex < fakePlayers.length && gameState === GAME_STATES.BETTING) {
        addSingleFakePlayer(fakePlayers[playerIndex]);
        playerIndex++;
      } else {
        clearInterval(addPlayerInterval);
      }
    }, 800); // Add a player every 0.8 seconds
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      bettingTimeLeft -= 0.1;
      const progress = (bettingTimeLeft / 10) * 100;
      elements.waitingBar.style.width = `${Math.max(0, progress)}%`;
      elements.waitingText.textContent = `Waiting... ${Math.ceil(bettingTimeLeft)}s`;
      
      if (bettingTimeLeft <= 0) {
        clearInterval(countdownInterval);
        clearInterval(addPlayerInterval);
        // УБРАНО: Локальный запуск - сервер запустит crash_started
        // startFlyingPhase();
      }
    }, 100);
  }
  function startFlyingPhase() {
    gameState = GAME_STATES.FLYING;
    flyingStartTime = Date.now();
    
    // Заблокировать AutoCash Out во время игры
    if (window.BetAutoSwitcher) {
      window.BetAutoSwitcher.setGameActive(true);
    }
    
    // Reset trail
    trailPoints = [];
    
    elements.waitingRoot.classList.add('hidden');
    
    // Show multiplier during flying
    elements.currentMultiplier.style.display = 'block';
    
    // Show button during flying
    elements.betButton.style.display = 'flex';
    
    // If player has bet from betting phase, show cashout (disabled if auto)
    // If player bet during previous flying phase, keep cancel (waiting)
    if (playerHasBet && gameState === GAME_STATES.FLYING) {
      const playerBet = elements.userTemplates.querySelector('.player-bet[data-player="user"]');
      if (playerBet) {
        // Player has active bet in list, can cash out
        setButtonState(BUTTON_STATES.CASHOUT);
        
        // Если Auto Cash Out включен, блокируем кнопку
        if (window.BetAutoSwitcher && window.BetAutoSwitcher.isAutoCashOutEnabled()) {
          elements.betButton.style.opacity = '0.5';
          elements.betButton.style.pointerEvents = 'none';
        } else {
          elements.betButton.style.opacity = '1';
          elements.betButton.style.pointerEvents = 'auto';
        }
      } else {
        // Player bet during flying OR carried over from previous round
        // Добавляем в список, если еще не добавлен
        if (buttonState === BUTTON_STATES.CANCEL) {
          addPlayerBetToList();
          console.log(`🎲 Отложенная ставка ${playerBetAmount} chips активирована`);
        }
        setButtonState(BUTTON_STATES.CASHOUT);
        
        // Проверяем Auto Cash Out
        if (window.BetAutoSwitcher && window.BetAutoSwitcher.isAutoCashOutEnabled()) {
          elements.betButton.style.opacity = '0.5';
          elements.betButton.style.pointerEvents = 'none';
        } else {
          elements.betButton.style.opacity = '1';
          elements.betButton.style.pointerEvents = 'auto';
        }
      }
    }
    
    animateFlying();
  }

  function animateFlying() {
    if (gameState !== GAME_STATES.FLYING) return;
    
    const elapsed = (Date.now() - flyingStartTime) / 1000;
    
    // Calculate multiplier (very slow growth)
    currentMultiplier = Math.pow(1.0012, elapsed * 100);
    
    if (currentMultiplier >= crashPoint) {
      crash();
      return;
    }
    
    elements.currentMultiplier.textContent = `${currentMultiplier.toFixed(2)}x`;
    
    // Check auto cash out
    if (window.BetAutoSwitcher && window.BetAutoSwitcher.isAutoCashOutEnabled()) {
      const autoCashOutMultiplier = window.BetAutoSwitcher.getAutoCashOutMultiplier();
      if (playerHasBet && !playerCashedOut && currentMultiplier >= autoCashOutMultiplier) {
        // Auto cash out
        console.log(`🤖 Auto Cash Out triggered at ${currentMultiplier.toFixed(2)}x (target: ${autoCashOutMultiplier.toFixed(2)}x)`);
        performCashOut();
      }
    }
    
    // Update cashout button
    if (buttonState === BUTTON_STATES.CASHOUT) {
      updateBetButtonSubtext();
    }
    
    // Update fake players cashouts
    updateFakeBetsInList();
    
    // Линия движется МЕДЛЕННО по времени, независимо от краша
    // Это делает невозможным предсказать когда будет краш
    
    // Прогресс по времени (очень медленно)
    const timeProgress = Math.min(elapsed / 20, 1); // 20 секунд до конца экрана
    const curveProgress = Math.pow(timeProgress, 0.85); // Плавная кривая
    
    // X position: медленно движется к правому краю
    const marginX = 20;
    const maxWidth = canvasWidth - marginX * 2;
    const xPos = marginX + (curveProgress * maxWidth * 0.88);
    
    // Y position: медленно поднимается к верху
    const marginY = 30;
    const maxHeight = canvasHeight - marginY * 2;
    const yProgress = Math.pow(curveProgress, 0.8); // Плавный подъем
    const baseY = canvasHeight - marginY - (yProgress * maxHeight * 0.82);
    
    // Add subtle wave
    const waveAmplitude = 6;
    const waveFrequency = 1.2;
    const wave = Math.sin(elapsed * waveFrequency) * waveAmplitude;
    const graphY = baseY + wave;
    
    // Add trail point (сохраняем ВСЕ точки, не удаляем старые)
    trailPoints.push({ x: xPos, y: graphY });
    // НЕ удаляем старые точки - хвост должен быть на весь график!
    
    // Draw trail
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawTrail();
    
    animationFrameId = requestAnimationFrame(animateFlying);
  }

  function crash() {
    gameState = GAME_STATES.CRASHED;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    elements.currentMultiplier.textContent = `${crashPoint.toFixed(2)}x`;
    elements.currentMultiplier.classList.add('crashed');
    elements.crashOverlay.classList.add('show');
    
    // Добавляем краш в историю
    addCrashToHistory(crashPoint);
    
    // If player didn't cash out, they lost
    if (playerHasBet && !playerCashedOut) {
      const playerBet = elements.userTemplates.querySelector('.player-bet[data-player="user"]');
      if (playerBet) {
        playerBet.classList.remove('win');
        playerBet.classList.add('default');
        
        const multiplierEl = playerBet.querySelector('.text-wrapper-27, .text-wrapper-24');
        const winEl = playerBet.querySelector('.text-wrapper-28, .text-wrapper-25');
        
        if (multiplierEl) {
          multiplierEl.className = 'text-wrapper-27';
          multiplierEl.textContent = '-';
        }
        if (winEl) {
          winEl.className = 'text-wrapper-28';
          winEl.textContent = '-';
        }
      }
    }
    
    finalizeFakeBetsAfterCrash();
    
    // Update final stats
    updateGameStats();
    
    // УБРАНО: Локальный запуск - теперь только через WebSocket
    // setTimeout(() => {
    //   startBettingPhase();
    // }, 3000);
  }

  // ============ CRASH HISTORY MANAGEMENT ============
  function addCrashToHistory(crashValue) {
    // Добавляем в начало массива
    crashHistoryArray.unshift(crashValue);
    
    // Ограничиваем до 10 последних крашей
    if (crashHistoryArray.length > 10) {
      crashHistoryArray.pop();
    }
    
    // Обновляем отображение
    updateCrashHistoryDisplay();
  }
  
  function updateCrashHistoryDisplay() {
    if (!elements.crashHistory) return;
    
    // Очищаем
    elements.crashHistory.innerHTML = '';
    
    // Добавляем каждый краш
    crashHistoryArray.forEach((crash, index) => {
      const crashDiv = document.createElement('div');
      crashDiv.className = 'div-wrapper-2';
      
      // Определяем класс по значению
      let textClass = 'text-wrapper-5'; // По умолчанию
      if (crash >= 10) textClass = 'text-wrapper-10';
      else if (crash >= 8) textClass = 'text-wrapper-9';
      else if (crash >= 5) textClass = 'text-wrapper-8';
      else if (crash >= 3) textClass = 'text-wrapper-7';
      else if (crash >= 2) textClass = 'text-wrapper-6';
      
      crashDiv.innerHTML = `<div class="${textClass}">${crash.toFixed(2)}x</div>`;
      elements.crashHistory.appendChild(crashDiv);
    });
  }

  // ============ INITIALIZATION ============
  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Load saved state
    loadGameState();
    
    console.log('✅ Crash Game готов - ожидание WebSocket...');
  }

  // Экспорт для WebSocket
  window.crashGame = {
    start: startFlyingPhase,
    crash: crash,
    updateMultiplier: (multiplier) => {
      currentMultiplier = multiplier;
      if (elements.currentMultiplier) {
        elements.currentMultiplier.textContent = `${multiplier.toFixed(2)}x`;
      }
    },
    getState: () => gameState
  };

  // Start game when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

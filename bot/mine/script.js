// ============================================
// MINES GAME - ПОЛНАЯ ИНТЕГРАЦИЯ С СЕРВЕРОМ
// ============================================
(function() {
  'use strict';
  
  const SERVER_URL = window.GAME_SERVER_URL || window.location.origin;
  
  const ASSETS = {
    SAFE: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/hit-a-safe-tile.svg',
    SAFE_GRAY: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/revealed-a-safe-tile.svg',
    MINE_GRENADE: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/revealed-mines.svg',
    MINE_EXPLOSION: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/hit-a-mine.svg',
  };

  const MIN_BET = 50;
  
  const state = {
    inGame: false,
    bombs: 2,
    bet: 50,
    gameId: null,
    revealed: new Set(),
    explodedIndex: null,
    clickLock: false,
    currentMultiplier: 1.0,
    potentialWin: 0,
    socket: null,
    telegramId: null
  };

  // Helpers
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function formatChips(n){ return `${Math.max(0, Math.floor(n))} Chips`; }

  function showNotification(message) {
    let toast = document.querySelector('#mine-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mine-toast';
      toast.className = 'roll-toast';
      Object.assign(toast.style, {
        position: 'fixed',
        left: '50%',
        top: '10px',
        transform: 'translateX(-50%)',
        background: 'rgba(60, 60, 60, 0.92)',
        color: 'rgb(229, 229, 229)',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'rgba(0, 0, 0, 0.35) 0px 6px 20px',
        fontFamily: 'Montserrat, Inter, Arial, sans-serif',
        fontSize: '13px',
        letterSpacing: '0.2px',
        zIndex: '9999',
        opacity: '0',
        transition: 'opacity 0.2s',
        pointerEvents: 'none'
      });
      document.body.appendChild(toast);
    }
    
    if (toast.hideTimer) clearTimeout(toast.hideTimer);
    
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
      }, 1600);
    });
  }

  function getTelegramId() {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlTgId = urlParams.get('tgId') || urlParams.get('telegram_id');
    if (urlTgId) return urlTgId;
    
    const savedId = localStorage.getItem('telegram_id');
    if (savedId && savedId !== 'test_m3xabw0pr' && !savedId.startsWith('test_')) {
      return savedId;
    }
    
    return '1889923046'; // Default for testing
  }

  function initSocket() {
    state.telegramId = getTelegramId();
    
    if (!window.io) {
      console.error('❌ Socket.IO не загружен');
      return;
    }
    
    console.log(`🔌 Подключение к серверу: ${SERVER_URL}`);
    
    state.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      query: { telegramId: state.telegramId }
    });
    
    state.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
    });
    
    state.socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });
    
    // Игра началась
    state.socket.on('mines_game_started', (data) => {
      console.log('🎮 Игра началась:', data);
      state.gameId = data.gameId;
      state.inGame = true;
      state.revealed.clear();
      state.currentMultiplier = 1.0;
      state.potentialWin = state.bet;
      updateCashoutDisplay();
      setControlsEnabled(false);
    });
    
    // Клетка открыта
    state.socket.on('mines_cell_revealed', (data) => {
      console.log('✅ Клетка открыта:', data);
      
      const cell = getCells()[data.cellIndex];
      if (cell) {
        flipReveal(cell, ASSETS.SAFE, 500);
        state.revealed.add(data.cellIndex);
      }
      
      state.currentMultiplier = data.multiplier;
      state.potentialWin = data.potentialWin;
      updateCashoutDisplay();
      
      state.clickLock = false;
    });
    
    // Игра завершена
    state.socket.on('mines_game_over', (data) => {
      console.log('🏁 Игра завершена:', data);
      
      state.clickLock = true;
      
      if (data.result === 'lose') {
        // ПРОИГРЫШ - показываем взрыв
        const cell = getCells()[data.cellIndex];
        if (cell) {
          state.explodedIndex = data.cellIndex;
          
          // 1. Граната
          flipReveal(cell, ASSETS.MINE_GRENADE, 400);
          
          setTimeout(() => {
            // 2. Взрыв
            setBackImage(cell, ASSETS.MINE_EXPLOSION);
            
            // КРАСНЫЙ ФОН!
            setGameBackground('red');
            
            setTimeout(() => {
              // 3. Показываем все мины
              revealAllMines(data.allMines, data.revealed);
              
              // Списываем баланс
              if (window.BalanceAPI) {
                window.BalanceAPI.subtractRubles(state.bet, 'game', 'Проигрыш в Mines', 'mines');
              }
              
              // Сохраняем в историю
              saveGameResult(false, data.multiplier, 0);
              
              setTimeout(() => {
                // 4. Сброс доски
                resetGame();
              }, 2000);
            }, 600);
          }, 1000);
        }
        
      } else {
        // ВЫИГРЫШ - показываем все мины
        revealAllMines(data.allMines, data.revealed);
        
        // ЗЕЛЕНЫЙ ФОН!
        setGameBackground('green');
        
        // Добавляем баланс
        if (window.BalanceAPI) {
          window.BalanceAPI.addRubles(data.winnings, 'game', `Выигрыш в Mines x${data.multiplier}`);
          showNotification(`🎉 Выигрыш ${data.winnings} rubles!`);
        }
        
        // Сохраняем в историю
        saveGameResult(true, data.multiplier, data.winnings);
        
        setTimeout(() => {
          resetGame();
        }, 3000);
      }
    });
    
    // Ошибки
    state.socket.on('mines_error', (data) => {
      console.error('❌ Ошибка:', data.message);
      showNotification(data.message);
      state.clickLock = false;
    });
  }

  function setGameBackground(color) {
    const betBlock = $('.bet');
    if (!betBlock) return;
    
    // Удаляем старые классы
    betBlock.classList.remove('game-win', 'game-lose');
    
    if (color === 'red') {
      betBlock.classList.add('game-lose');
    } else if (color === 'green') {
      betBlock.classList.add('game-win');
    }
  }

  function resetGameBackground() {
    const betBlock = $('.bet');
    if (!betBlock) return;
    betBlock.classList.remove('game-win', 'game-lose');
  }

  function getCells() {
    return $$('.game .tile .div-3');
  }

  function cellIndexOf(cell) {
    return getCells().indexOf(cell);
  }

  function clearCell(cell) {
    const img = $('img', cell);
    if (img) img.remove();
  }

  function showImage(cell, src) {
    clearCell(cell);
    const img = document.createElement('img');
    img.className = 'img-2';
    img.src = src;
    Object.assign(img.style, {
      width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto'
    });
    cell.appendChild(img);
  }

  function ensureFlipStructure(cell) {
    let wrap = cell.querySelector('.flip-wrap');
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'flip-wrap';
    Object.assign(wrap.style, {
      position: 'relative', width: '100%', height: '100%'
    });
    cell.innerHTML = '';
    cell.appendChild(wrap);
    return wrap;
  }

  function flipReveal(cell, src, durationMs = 500) {
    try {
      const wrap = ensureFlipStructure(cell);
      wrap.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'img-2';
      img.src = src;
      Object.assign(img.style, {
        width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto',
        transform: 'scale(0) rotate(-180deg)', opacity: '0',
        transition: `all ${durationMs}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`
      });
      wrap.appendChild(img);
      requestAnimationFrame(() => {
        img.style.transform = 'scale(1) rotate(0deg)';
        img.style.opacity = '1';
      });
    } catch (e) {
      showImage(cell, src);
    }
  }

  function setBackImage(cell, src) {
    const wrap = ensureFlipStructure(cell);
    wrap.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'img-2';
    img.src = src;
    Object.assign(img.style, {
      width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto'
    });
    wrap.appendChild(img);
  }

  function resetBoardVisuals() {
    state.revealed.clear();
    state.explodedIndex = null;
    getCells().forEach(cell => {
      const wrap = cell.querySelector('.flip-wrap');
      if (wrap) {
        wrap.innerHTML = '';
      } else {
        clearCell(cell);
      }
      cell.classList.remove('revealed','bomb');
    });
  }

  function revealAllMines(allMines, revealedCells) {
    const cells = getCells();
    cells.forEach((cell, idx) => {
      const delay = 40 * (idx % 5);
      setTimeout(() => {
        if (allMines.includes(idx)) {
          if (idx !== state.explodedIndex) {
            flipReveal(cell, ASSETS.MINE_GRENADE, 650);
          }
        } else {
          flipReveal(cell, ASSETS.SAFE_GRAY, 650);
        }
      }, delay);
    });
  }

  function updateCashoutDisplay() {
    const button = $('.cash-out-button');
    const labelEl = $('.cash-out-button .text-wrapper-27');
    const amountEl = $('.cash-out-button .text-wrapper-28');
    
    if (!button || !labelEl || !amountEl) return;
    
    if (state.inGame) {
      // Cash Out режим
      button.classList.add('state-cashout');
      labelEl.textContent = 'Cash Out';
      amountEl.textContent = formatChips(state.potentialWin);
    } else {
      // Bet режим
      button.classList.remove('state-cashout');
      labelEl.textContent = 'Bet';
      amountEl.textContent = formatChips(state.bet);
    }
  }

  function setControlsEnabled(enabled) {
    const bombsContainer = $('.number-of-bombs .frame-2');
    if (bombsContainer) {
      $$('.element-3, .element-4', bombsContainer).forEach(el => {
        el.style.pointerEvents = enabled ? '' : 'none';
        el.style.filter = enabled ? '' : 'grayscale(1)';
        el.style.opacity = enabled ? '' : '0.6';
      });
    }

    const halfBtn = $('.bet .button-x .button-2');
    const x2Btn = $('.bet .button-x .button-3');
    [halfBtn, x2Btn].forEach(btn => {
      if (!btn) return;
      btn.style.pointerEvents = enabled ? '' : 'none';
      btn.style.filter = enabled ? '' : 'grayscale(1)';
      btn.style.opacity = enabled ? '' : '0.6';
    });

    const minusBtn = $('.input-amount-bet .button');
    const unionBtn = $('.input-amount-bet .union-wrapper');
    [minusBtn, unionBtn].forEach(btn => {
      if (!btn) return;
      btn.style.pointerEvents = enabled ? '' : 'none';
      btn.style.filter = enabled ? '' : 'grayscale(1)';
      btn.style.opacity = enabled ? '' : '0.6';
    });
  }

  function startGame() {
    if (state.bet < MIN_BET) {
      showNotification(`Минимальная ставка: ${MIN_BET} rubles`);
      return;
    }
    
    if (!window.BalanceAPI || !window.BalanceAPI.hasEnoughRubles(state.bet)) {
      showNotification(`Недостаточно средств для ставки ${state.bet} rubles`);
      return;
    }
    
    if (!state.socket || !state.socket.connected) {
      showNotification('Нет соединения с сервером');
      return;
    }
    
    state.clickLock = false;
    resetBoardVisuals();
    resetGameBackground();
    
    // Отправляем запрос на сервер
    state.socket.emit('mines_start_game', {
      bombs: state.bombs,
      bet: state.bet
    });
    
    console.log(`💣 Начинаем игру: ${state.bombs} мин, ставка ${state.bet}`);
  }

  function resetGame() {
    state.inGame = false;
    state.gameId = null;
    state.revealed.clear();
    state.explodedIndex = null;
    state.currentMultiplier = 1.0;
    state.potentialWin = 0;
    state.clickLock = false;
    
    resetBoardVisuals();
    resetGameBackground();
    updateCashoutDisplay();
    setControlsEnabled(true);
  }

  function onCellClick(cell) {
    if (!state.inGame || state.clickLock) return;
    
    const idx = cellIndexOf(cell);
    if (idx < 0 || state.revealed.has(idx)) return;

    state.clickLock = true;
    
    // Отправляем на сервер
    state.socket.emit('mines_reveal_cell', {
      gameId: state.gameId,
      cellIndex: idx
    });
  }

  function onBetOrCash() {
    if (!state.inGame) {
      // Начать игру
      if (![2, 3, 5, 7].includes(state.bombs)) {
        indicateBombsRequired();
        return;
      }
      startGame();
    } else {
      // Cash out
      if (state.revealed.size === 0) {
        showNotification('Откройте хотя бы одну клетку');
        return;
      }
      
      if (state.clickLock) return;
      
      state.clickLock = true;
      
      // Отправляем на сервер
      state.socket.emit('mines_cash_out', {
        gameId: state.gameId
      });
    }
  }

  function indicateBombsRequired() {
    const container = $('.number-of-bombs .frame-2');
    if (!container) return;
    const old = container.style.boxShadow;
    container.style.boxShadow = '0 0 0 2px #ca3958';
    setTimeout(() => { container.style.boxShadow = old; }, 600);
  }

  function setupTileClicks() {
    getCells().forEach(cell => {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => onCellClick(cell));
    });
  }

  function setupBetControls() {
    const halfBtn = $('.bet .button-x .button-2');
    if (halfBtn) {
      halfBtn.addEventListener('click', () => {
        state.bet = Math.max(MIN_BET, Math.floor(state.bet / 2));
        updateCashoutDisplay();
        renderBetAmount();
      });
    }

    const x2Btn = $('.bet .button-x .button-3');
    if (x2Btn) {
      x2Btn.addEventListener('click', () => {
        state.bet = Math.min(999999, state.bet * 2);
        updateCashoutDisplay();
        renderBetAmount();
      });
    }

    const betCash = $('.cash-out-button');
    if (betCash) {
      betCash.style.cursor = 'pointer';
      betCash.addEventListener('click', onBetOrCash);
    }

    updateCashoutDisplay();

    const minusBtn = $('.input-amount-bet .button');
    if (minusBtn) {
      minusBtn.style.cursor = 'pointer';
      minusBtn.addEventListener('click', () => {
        state.bet = Math.max(MIN_BET, state.bet - 1);
        updateCashoutDisplay();
        renderBetAmount();
      });
    }

    const unionBtn = $('.input-amount-bet .union-wrapper');
    if (unionBtn) {
      unionBtn.style.cursor = 'pointer';
      const presets = [50, 100, 250, 500, 1000, 2500, 5000];
      unionBtn.addEventListener('click', () => {
        const idx = presets.findIndex(v => v >= state.bet);
        const next = presets[(idx + 1) % presets.length];
        state.bet = next;
        updateCashoutDisplay();
        renderBetAmount();
      });
    }

    renderBetAmount();
  }

  function setupBombsSelector() {
    const container = $('.number-of-bombs .frame-2');
    if (!container) return;
    const options = $$('.element-3, .element-4', container);
    options.forEach(o => { o.style.outline = ''; });

    function extractNumFromOption(opt) {
      const t30 = opt.querySelector('.text-wrapper-30');
      const t31 = opt.querySelector('.text-wrapper-31');
      const raw = t30 ? t30.textContent : t31 ? t31.textContent : opt.textContent;
      const n = parseInt(String(raw).trim(), 10);
      return isNaN(n) ? null : n;
    }

    options.forEach(opt => {
      const n = extractNumFromOption(opt);
      if (n != null) opt.dataset.bombs = String(n);
    });
    
    options.forEach(opt => {
      opt.style.cursor = 'pointer';
      opt.addEventListener('click', () => {
        if (state.inGame) return;
        const n = parseInt(opt.dataset.bombs || '', 10);
        if (!isNaN(n)) {
          state.bombs = n;
          options.forEach(o => {
            const num = parseInt(o.dataset.bombs || '', 10);
            if (isNaN(num)) return;
            const wrap = document.createElement('div');
            if (num === state.bombs) {
              wrap.className = 'selected';
              const txt = document.createElement('div');
              txt.className = 'text-wrapper-30';
              txt.textContent = String(num);
              wrap.appendChild(txt);
            } else {
              wrap.className = 'div-wrapper-2';
              const txt = document.createElement('div');
              txt.className = 'text-wrapper-31';
              txt.textContent = String(num);
              wrap.appendChild(txt);
            }
            o.innerHTML = '';
            o.appendChild(wrap);
          });
        }
      });
    });
    
    // Initial render
    options.forEach(o => {
      const num = parseInt(o.dataset.bombs || '', 10);
      if (isNaN(num)) return;
      const wrap = document.createElement('div');
      if (num === state.bombs) {
        wrap.className = 'selected';
        const txt = document.createElement('div');
        txt.className = 'text-wrapper-30';
        txt.textContent = String(num);
        wrap.appendChild(txt);
      } else {
        wrap.className = 'div-wrapper-2';
        const txt = document.createElement('div');
        txt.className = 'text-wrapper-31';
        txt.textContent = String(num);
        wrap.appendChild(txt);
      }
      o.innerHTML = '';
      o.appendChild(wrap);
    });
  }

  function renderBetAmount() {
    const container = $('.input-amount-bet .element');
    if (!container) return;
    container.innerHTML = '';
    const span = document.createElement('div');
    span.className = 'text-wrapper-25';
    span.textContent = String(state.bet);
    container.appendChild(span);
  }

  // ========== СИСТЕМА LIVE BETS ==========
  const STORAGE_KEY = 'mines_players_history';
  const MAX_HISTORY_AGE = 5 * 60 * 1000;
  
  function initPlayersSystem() {
    console.log('🎮 Инициализация локальной системы игроков для Mines');
    cleanOldHistory();
    updateOnlineCount();
    renderLiveBets();
    setInterval(() => {
      cleanOldHistory();
      updateOnlineCount();
      renderLiveBets();
    }, 10000);
  }

  function getPlayersHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function savePlayerGame(playerData) {
    const history = getPlayersHistory();
    history.push({ ...playerData, timestamp: Date.now() });
    const recentHistory = history.slice(-20);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentHistory));
    } catch (e) {
      console.error('Ошибка сохранения истории:', e);
    }
    renderLiveBets();
  }

  function cleanOldHistory() {
    const history = getPlayersHistory();
    const now = Date.now();
    const fresh = history.filter(p => (now - p.timestamp) < MAX_HISTORY_AGE);
    if (fresh.length !== history.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch (e) {}
    }
  }

  function updateOnlineCount() {
    const onlineElement = $('.element-online .text-wrapper-35');
    if (onlineElement) {
      const history = getPlayersHistory();
      const uniquePlayers = new Set(history.map(p => p.userId)).size;
      const count = Math.max(uniquePlayers, 1);
      onlineElement.textContent = `${count} online`;
    }
  }

  function renderLiveBets() {
    const container = $('.user-templates');
    if (!container) return;

    const history = getPlayersHistory();
    const recentGames = history.slice(-10).reverse();

    container.innerHTML = '';

    if (recentGames.length === 0) {
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 10px; text-align: center; font-family: \'Montserrat\', Helvetica;">No recent games</div>';
      return;
    }

    recentGames.forEach(game => {
      const playerElement = createPlayerElement(game);
      container.appendChild(playerElement);
    });
  }

  function createPlayerElement(game) {
    const div = document.createElement('div');
    div.className = 'div-4';
    
    const avatar = createTelegramAvatar(game);
    const maskedName = game.playerName || 'Player';
    const bet = game.bet;
    const isWinner = game.isWinner;
    const multiplier = game.multiplier ? `${game.multiplier.toFixed(2)}x` : '0x';
    const winAmount = isWinner && game.winnings ? game.winnings : '--';
    const winClass = isWinner ? 'text-wrapper-42' : 'text-wrapper-39';
    const winWrapperClass = isWinner ? 'element-5' : 'div-wrapper-4';

    div.innerHTML = `
      <div class="acc-inf">
        <div class="avatar-wrapper"></div>
        <div class="div-wrapper-3"><div class="text-wrapper-37">${maskedName}</div></div>
      </div>
      <div class="div-wrapper-3"><div class="text-wrapper-38">${bet}</div></div>
      <div class="div-wrapper-3"><div class="text-wrapper-38">${multiplier}</div></div>
      <div class="${winWrapperClass}"><div class="${winClass}">${winAmount}</div></div>
    `;

    const avatarWrapper = div.querySelector('.avatar-wrapper');
    avatarWrapper.appendChild(avatar);

    return div;
  }

  function createTelegramAvatar(game) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar-2';
    Object.assign(avatar.style, {
      width: '19px',
      height: '19px',
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 'bold',
      color: 'white'
    });
    
    if (game.playerAvatar) {
      avatar.style.backgroundImage = `url(${game.playerAvatar})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    } else {
      const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
      ];
      const name = game.playerName || 'P';
      const colorIndex = name.charCodeAt(0) % colors.length;
      avatar.style.background = colors[colorIndex];
      avatar.textContent = name[0].toUpperCase();
    }
    
    return avatar;
  }

  function getCurrentPlayer() {
    if (window.TelegramUserData) {
      return {
        userId: window.TelegramUserData.id || 'user_' + Date.now(),
        playerName: window.TelegramUserData.first_name || 'Player',
        playerAvatar: window.TelegramUserData.photo_url || null
      };
    }
    return {
      userId: 'local_user',
      playerName: 'Player',
      playerAvatar: null
    };
  }

  function saveGameResult(isWinner, multiplier, winnings) {
    const player = getCurrentPlayer();
    
    const gameData = {
      userId: player.userId,
      playerName: player.playerName,
      playerAvatar: player.playerAvatar,
      bet: state.bet,
      bombs: state.bombs,
      revealed: state.revealed.size,
      multiplier: multiplier,
      isWinner: isWinner,
      winnings: winnings
    };
    
    savePlayerGame(gameData);
  }

  function init() {
    console.log('🎮 Mines Game: Initializing...');
    initSocket();
    setupTileClicks();
    setupBetControls();
    setupBombsSelector();
    initPlayersSystem();
    console.log('✅ Mines Game: Ready!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

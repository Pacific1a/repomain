// Mines game JS: adds onclick handlers without changing styles/HTML structure
// Uses existing elements and classes in mine/index.html

(function() {
  const ASSETS = {
    SAFE: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/hit-a-safe-tile.svg',
    SAFE_GRAY: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/revealed-a-safe-tile.svg',
    MINE_GRENADE: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/revealed-mines.svg',
    MINE_EXPLOSION: 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/hit-a-mine.svg',
  };

  const MIN_BET = 50; // Минимальная ставка
  
  const state = {
    inGame: false,
    bombs: 2,
    bet: 50,
    mines: new Set(), // indices 0..24
    revealed: new Set(),
    explodedIndex: null,
    timers: [],
    clickLock: false,
    isCashingOut: false,
    isGameOver: false,
  };

  // Helpers
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function formatChips(n){ return `${Math.max(0, Math.floor(n))} Chips`; }

  // Функция для показа toast-уведомлений
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
    
    // Сбрасываем предыдущий таймер если есть
    if (toast.hideTimer) {
      clearTimeout(toast.hideTimer);
    }
    
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
      }, 1600);
    });
  }

  function getCells() {
    // All clickable tiles are divs with class .div-3 inside .game .tile
    return $$('.game .tile .div-3');
  }

  function cellIndexOf(cell) {
    const cells = getCells();
    return cells.indexOf(cell);
  }

  function clearCell(cell) {
    // Remove any image in tile
    const img = $('img', cell);
    if (img) img.remove();
  }

  function showImage(cell, src) {
    // Fallback simple render (used rarely now)
    clearCell(cell);
    const img = document.createElement('img');
    img.className = 'img-2';
    img.src = src;
    Object.assign(img.style, {
      width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto'
    });
    cell.appendChild(img);
  }

  
  
  // АНИМАЦИЯ 2: Масштабирование с вращением (раскомментируйте чтобы использовать)
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
    const card = wrap.querySelector('.flip-card');
    const back = wrap.querySelector('.flip-back');
    if (!back) return;
    back.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'img-2';
    img.src = src;
    Object.assign(img.style, {
      width: '100%', height: '100%', objectFit: 'contain', display: 'block', margin: '0 auto'
    });
    back.appendChild(img);
    if (card) card.style.transform = 'rotateY(180deg)';
  }

  function resetBoardVisuals() {
    clearAllTimers();
    state.revealed.clear();
    state.explodedIndex = null;
    getCells().forEach(cell => {
      // Reset flip structure to front side
      const wrap = cell.querySelector('.flip-wrap');
      if (wrap) {
        const card = wrap.querySelector('.flip-card');
        const front = wrap.querySelector('.flip-front');
        const back = wrap.querySelector('.flip-back');
        if (front) front.innerHTML = '';
        if (back) back.innerHTML = '';
        if (card) card.style.transform = 'rotateY(0deg)';
      } else {
        clearCell(cell);
      }
      cell.classList.remove('revealed','bomb');
    });
  }

  function placeMines() {
    state.mines.clear();
    const total = getCells().length;
    const bombsToPlace = Math.min(state.bombs, Math.max(0, total - 1));
    while (state.mines.size < bombsToPlace) {
      state.mines.add(Math.floor(Math.random() * total));
    }
  }

  function currentMultiplier() {
    // Simple demo multipliers based on bombs and revealed safe tiles
    // You can replace with your exact payout table
    const baseMap = {2: 1.02, 3: 1.11, 5: 1.22, 7: 1.34};
    const base = baseMap[state.bombs] || 1.02;
    const increment = (state.bombs >= 7) ? 0.18 : (state.bombs >= 5) ? 0.12 : (state.bombs >= 3) ? 0.09 : 0.08;
    return +(base + increment * state.revealed.size).toFixed(2);
  }

  function updateCashoutDisplay() {
    const button = $('.cash-out-button');
    const labelEl = $('.cash-out-button .text-wrapper-27');
    const amountEl = $('.cash-out-button .text-wrapper-28');
    
    if (!button || !labelEl || !amountEl) return;
    
    // Если игра завершена (проигрыш) - показываем Bet режим
    if (state.inGame && !state.isGameOver) {
      // Cash Out режим - показываем текущий выигрыш
      const multi = currentMultiplier();
      const potentialWin = Math.floor(state.bet * multi);
      
      button.classList.add('state-cashout');
      labelEl.textContent = 'Cash Out';
      amountEl.textContent = formatChips(potentialWin);
    } else {
      // Bet режим - показываем ставку
      button.classList.remove('state-cashout');
      labelEl.textContent = 'Bet';
      amountEl.textContent = formatChips(state.bet);
    }
  }

  function setInGame(on) {
    state.inGame = on;
    updateCashoutDisplay();
    setControlsEnabled(!on);
  }

  function setControlsEnabled(enabled) {
    // Toggle bombs selector
    const bombsContainer = $('.number-of-bombs .frame-2');
    if (bombsContainer) {
      $$('.element-3, .element-4', bombsContainer).forEach(el => {
        el.style.pointerEvents = enabled ? '' : 'none';
        el.style.filter = enabled ? '' : 'grayscale(1)';
        el.style.opacity = enabled ? '' : '0.6';
      });
    }

    // Toggle bet controls
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

  function hideInitialImages() {
    // Hide any sample images currently present in the grid container
    $$('.game .tile img').forEach(img => {
      // Do not remove; just hide so layout stays intact
      img.style.display = 'none';
    });
  }

  async function startGame() {
    // Проверка минимальной ставки
    if (state.bet < MIN_BET) {
      showNotification(`Минимальная ставка: ${MIN_BET} rubles`);
      return false;
    }
    
    // Проверка баланса (не списываем сразу, только проверяем)
    if (!window.BalanceAPI) {
      console.error('GameBalanceAPI не загружен');
      return false;
    }
    
    if (!window.BalanceAPI.hasEnoughRubles(state.bet)) {
      showNotification(`Недостаточно средств для ставки ${state.bet} rubles`);
      return false;
    }
    
    // НЕ списываем баланс сразу - только после завершения игры
    console.log(`💣 Mines: ставка ${state.bet} rubles зарезервирована`);
    
    hideInitialImages();
    clearAllTimers();
    resetBoardVisuals();
    placeMines();
    setInGame(true);
    state.isCashingOut = false;
    state.isGameOver = false;
    updateCashoutDisplay();
    return true;
  }

  function revealAllAfterMine() {
    const cells = getCells();
    cells.forEach((cell, idx) => {
      const delay = 40 * (idx % 5); // light stagger for smoother feel
      schedule(() => {
        if (state.mines.has(idx)) {
          if (idx !== state.explodedIndex) {
            flipReveal(cell, ASSETS.MINE_GRENADE, 650);
          }
        } else {
          flipReveal(cell, ASSETS.SAFE_GRAY, 650);
        }
      }, delay);
    });
  }

  function revealAllAfterCashout() {
    const cells = getCells();
    cells.forEach((cell, idx) => {
      const delay = 40 * (idx % 5);
      schedule(() => {
        if (state.mines.has(idx)) {
          flipReveal(cell, ASSETS.MINE_GRENADE, 650);
        } else {
          flipReveal(cell, ASSETS.SAFE, 650);
        }
      }, delay);
    });
  }

  function endGame(lost) {
    setInGame(false);
    
    if (lost) {
      // Проигрыш - списываем ставку С ТРЕКИНГОМ РЕФЕРАЛЬНОЙ СИСТЕМЫ
      if (window.BalanceAPI) {
        window.BalanceAPI.subtractRubles(state.bet, 'game', `Проигрыш в Mines`, 'mine');
        console.log(`💥 Mines: проигрыш, списано ${state.bet} rubles (с трекингом реферальной системы)`);
      }
      
      // Анимация уже отработала в onCellClick
      
      // Сохраняем результат игры в историю (ПРОИГРЫШ)
      const multi = currentMultiplier();
      saveCurrentGame(false, multi, 0);
    }
    
    // Add summary block only after a loss per request
    if (lost) renderRoundSummary();
  }

  function renderRoundSummary() {
    const box = $('.info-about-multiply');
    if (!box) return;
    // Append a compact summary block
    const element = document.createElement('div');
    element.className = 'element-mine';
    const overlap = document.createElement('div');
    overlap.className = 'overlap-group';
    const x = document.createElement('div');
    x.className = 'text-wrapper-4';
    const multi = currentMultiplier();
    x.textContent = `x${multi}`;
    const count = document.createElement('div');
    count.className = 'text-wrapper-5';
    count.textContent = String(state.revealed.size);
    const star = document.createElement('img');
    star.src = 'https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/mine/mine-icon-1.svg';
    star.alt = 'star';
    star.style.width = '8px';
    star.style.height = '10px';
    star.style.marginLeft = '4px';
    count.appendChild(star);
    overlap.appendChild(x);
    overlap.appendChild(count);
    element.appendChild(overlap);
    box.appendChild(element);
    // Auto-scroll to the end so the newest summary is visible
    try {
      box.parentElement && (box.parentElement.scrollLeft = box.parentElement.scrollWidth);
      box.scrollLeft = box.scrollWidth;
    } catch (e) {}
  }

  function onCellClick(cell) {
    if (!state.inGame) return;
    if (!isValidBombs(state.bombs)) return;
    if (state.clickLock) return; // Блокировка во время анимации
    
    const idx = cellIndexOf(cell);
    if (idx < 0 || state.revealed.has(idx)) return;

    if (state.mines.has(idx)) {
      // Попали на мину!
      state.clickLock = true;
      state.isGameOver = true;
      state.explodedIndex = idx;
      
      // Сразу переключаем кнопку в Bet режим
      updateCashoutDisplay();
      
      // 1. Показываем гранату на 1 секунду
      flipReveal(cell, ASSETS.MINE_GRENADE, 400);
      
      schedule(() => {
        // 2. Показываем взрыв
        setBackImage(cell, ASSETS.MINE_EXPLOSION);
        
        schedule(() => {
          // 3. Раскрываем все карточки
          revealAllAfterMine();
          
          schedule(() => {
            endGame(true);
            state.clickLock = false;
            
            // Сбрасываем доску после задержки
            schedule(() => {
              resetBoardVisuals();
              state.revealed.clear();
              state.mines.clear();
              state.explodedIndex = null;
              state.isGameOver = false;
            }, 2000);
          }, 1000);
        }, 600);
      }, 1000);
      
      return;
    }

    // Safe
    state.revealed.add(idx);
    flipReveal(cell, ASSETS.SAFE, 500);
    
    // Update cashout display with new multiplier
    updateCashoutDisplay();
  }

  async function onBetOrCash() {
    if (!state.inGame) {
      if (state.clickLock) return;
      // brief debounce to avoid accidental double-trigger when starting
      state.clickLock = true;
      // Use direct setTimeout so it won't be cleared by clearAllTimers() on startGame
      setTimeout(() => { state.clickLock = false; }, 600);
      if (!isValidBombs(state.bombs)) {
        indicateBombsRequired();
        return;
      }
      // Start game (balance check inside)
      const gameStarted = await startGame();
      
      // Показываем toast уведомления
      if (gameStarted) {
        showNotification(`Ставка ${state.bet} rubles сделана!`);
      } else {
        // Ошибка уже показывается в startGame() через showNotification
      }
    } else {
      // Block cashout reveal if bombs selection is invalid
      if (!isValidBombs(state.bombs)) {
        indicateBombsRequired();
        return;
      }
      // Require at least one opened safe tile before allowing cash out
      if (state.revealed.size === 0) {
        indicateOpenRequired();
        return;
      }
      // Блокировка если игра уже завершена (проигрыш)
      if (state.isGameOver) {
        console.log('⚠️ Игра уже завершена, Cash Out невозможен');
        return;
      }
      // Блокировка повторного нажатия Cash Out
      if (state.isCashingOut) {
        return;
      }
      
      state.isCashingOut = true;
      
      // Блокируем кнопку визуально
      const cashOutBtn = $('.cash-out-button');
      if (cashOutBtn) {
        cashOutBtn.style.opacity = '0.5';
        cashOutBtn.style.cursor = 'not-allowed';
        cashOutBtn.style.pointerEvents = 'none';
      }
      
      // Calculate winnings and pay out through global API
      const multi = currentMultiplier();
      const win = Math.floor(state.bet * multi);
      
      if (window.BalanceAPI) {
        window.BalanceAPI.addRubles(win);
        console.log(`💰 Mines: выигрыш ${win} rubles (x${multi})`);
      }
      
      // Сохраняем результат игры в историю (ВЫИГРЫШ)
      saveCurrentGame(true, multi, win);
      
      // Cash out: reveal all remaining, then clear board
      revealAllAfterCashout();
      schedule(() => {
        setInGame(false);
        renderRoundSummary();
        schedule(() => {
          resetBoardVisuals();
          // Восстанавливаем кнопку после сброса
          if (cashOutBtn) {
            cashOutBtn.style.opacity = '';
            cashOutBtn.style.cursor = '';
            cashOutBtn.style.pointerEvents = '';
          }
        }, 300);
      }, 500);
    }
  }

  function indicateOpenRequired() {
    // No visual highlight; simply ignore the action
    return;
  }

  function schedule(fn, delay = 0) {
    const id = setTimeout(fn, delay);
    state.timers.push(id);
    return id;
  }

  function clearAllTimers() {
    if (!state.timers) return;
    state.timers.forEach(id => clearTimeout(id));
    state.timers = [];
  }

  function isValidBombs(n) {
    return n === 2 || n === 3 || n === 5 || n === 7;
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
    // /2 button
    const halfBtn = $('.bet .button-x .button-2');
    if (halfBtn) {
      halfBtn.addEventListener('click', () => {
        state.bet = Math.max(MIN_BET, Math.floor(state.bet / 2));
        updateCashoutDisplay();
        renderBetAmount();
      });
    }

    // x2 control (is a div with class .button-3)
    const x2Btn = $('.bet .button-x .button-3');
    if (x2Btn) {
      x2Btn.addEventListener('click', () => {
        state.bet = Math.min(999999, state.bet * 2);
        updateCashoutDisplay();
        renderBetAmount();
      });
    }

    // Bet/Cash Out main control (кнопка .cash-out-button)
    const betCash = $('.cash-out-button');
    if (betCash) {
      betCash.style.cursor = 'pointer';
      betCash.addEventListener('click', onBetOrCash);
    } else {
      console.error('❌ Кнопка .cash-out-button не найдена!');
    }

    updateCashoutDisplay();

    // Input amount area controls
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

    // Initial render of amount into middle element
    renderBetAmount();
  }

  function setupBombsSelector() {
    const container = $('.number-of-bombs .frame-2');
    if (!container) return;
    const options = $$('.element-3, .element-4', container);
    // Remove any pre-set outlines from HTML inline styles
    options.forEach(o => { o.style.outline = ''; });

    // Helper to extract current number from an option's inner text
    function extractNumFromOption(opt) {
      const t30 = opt.querySelector('.text-wrapper-30');
      const t31 = opt.querySelector('.text-wrapper-31');
      const raw = t30 ? t30.textContent : t31 ? t31.textContent : opt.textContent;
      const n = parseInt(String(raw).trim(), 10);
      return isNaN(n) ? null : n;
    }

    // Initialize dataset values for each option once
    options.forEach(opt => {
      const n = extractNumFromOption(opt);
      if (n != null) opt.dataset.bombs = String(n);
    });
    options.forEach(opt => {
      opt.style.cursor = 'pointer';
      opt.addEventListener('click', () => {
        if (state.inGame) return; // do not allow changing bombs during an active round
        // Read number from dataset (stable across rebuilds)
        const n = parseInt(opt.dataset.bombs || '', 10);
        if (!isNaN(n)) {
          state.bombs = n;
          // Rebuild inner wrapper to use selected/div-wrapper-2 without touching external classes
          options.forEach(o => {
            const num = parseInt(o.dataset.bombs || '', 10);
            if (isNaN(num)) return;
            // Build inner content
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
            // Replace first child of option with our wrapper
            o.innerHTML = '';
            o.appendChild(wrap);
          });
        }
      });
    });
    // Initial rebuild based on default state.bombs
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
    // Render numeric text instead of static image
    container.innerHTML = '';
    const span = document.createElement('div');
    span.className = 'text-wrapper-25';
    span.textContent = String(state.bet);
    container.appendChild(span);
  }

  // ========== ЛОКАЛЬНАЯ СИСТЕМА ИГРОКОВ (ТОЛЬКО НА СТРАНИЦЕ MINES) ==========
  const STORAGE_KEY = 'mines_players_history';
  const MAX_HISTORY_AGE = 5 * 60 * 1000; // 5 минут
  
  function initPlayersSystem() {
    console.log('🎮 Инициализация локальной системы игроков для Mines');
    
    // Очищаем старые записи
    cleanOldHistory();
    
    // Обновляем отображение
    updateOnlineCount();
    renderLiveBets();
    
    // Обновляем каждые 10 секунд
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
    
    // Добавляем новую запись
    history.push({
      ...playerData,
      timestamp: Date.now()
    });
    
    // Оставляем только последние 20 записей
    const recentHistory = history.slice(-20);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentHistory));
      console.log('💾 Сохранена игра:', playerData);
    } catch (e) {
      console.error('Ошибка сохранения истории:', e);
    }
    
    // Обновляем отображение
    renderLiveBets();
  }

  function cleanOldHistory() {
    const history = getPlayersHistory();
    const now = Date.now();
    const fresh = history.filter(p => (now - p.timestamp) < MAX_HISTORY_AGE);
    
    if (fresh.length !== history.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        console.log(`🧹 Очищено ${history.length - fresh.length} старых записей`);
      } catch (e) {
        console.error('Ошибка очистки истории:', e);
      }
    }
  }

  function updateOnlineCount() {
    const onlineElement = $('.element-online .text-wrapper-35');
    if (onlineElement) {
      const history = getPlayersHistory();
      // Подсчитываем уникальных игроков за последние 5 минут
      const uniquePlayers = new Set(history.map(p => p.userId)).size;
      const count = Math.max(uniquePlayers, 1); // Минимум 1
      onlineElement.textContent = `${count} online`;
    }
  }

  function renderLiveBets() {
    const container = $('.user-templates');
    if (!container) return;

    // Получаем последние игры (максимум 10)
    const history = getPlayersHistory();
    const recentGames = history.slice(-10).reverse(); // Последние 10, в обратном порядке

    // Очищаем контейнер
    container.innerHTML = '';

    if (recentGames.length === 0) {
      // Показываем сообщение если нет игр
      container.innerHTML = '<div style="color: #7a7a7a; font-size: 12px; padding: 10px; text-align: center; font-family: "Montserrat", Helvetica;">No recent games</div>';
      return;
    }

    // Рендерим каждую игру
    recentGames.forEach(game => {
      const playerElement = createPlayerElement(game);
      container.appendChild(playerElement);
    });
  }

  function createPlayerElement(game) {
    const div = document.createElement('div');
    div.className = 'div-4';
    
    // Создаем аватар
    const avatar = createTelegramAvatar(game);
    
    // Маскируем имя
    const maskedName = maskPlayerName(game.playerName);
    
    // РЕАЛЬНЫЕ данные из игры
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

    // Вставляем аватар
    const avatarWrapper = div.querySelector('.avatar-wrapper');
    avatarWrapper.appendChild(avatar);

    return div;
  }

  function createTelegramAvatar(game) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar-2';
    avatar.style.width = '19px';
    avatar.style.height = '19px';
    avatar.style.borderRadius = '50%';
    avatar.style.overflow = 'hidden';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '10px';
    avatar.style.fontWeight = 'bold';
    avatar.style.color = 'white';
    
    if (game.playerAvatar) {
      // Аватар из Telegram
      avatar.style.backgroundImage = `url(${game.playerAvatar})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    } else {
      // Градиент с первой буквой имени
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

  function maskPlayerName(name) {
    // Показываем имя ПОЛНОСТЬЮ без маскирования
    return name || 'Player';
  }

  function getCurrentPlayer() {
    // Получаем данные игрока из Telegram
    if (window.TelegramUserData) {
      return {
        userId: window.TelegramUserData.id || 'user_' + Date.now(),
        playerName: window.TelegramUserData.first_name || 'Player',
        playerAvatar: window.TelegramUserData.photo_url || null
      };
    }
    // Fallback если нет Telegram данных
    return {
      userId: 'local_user',
      playerName: 'Player',
      playerAvatar: null
    };
  }

  function saveCurrentGame(isWinner, multiplier, winnings) {
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
    setupTileClicks();
    setupBetControls();
    setupBombsSelector();
    initPlayersSystem();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

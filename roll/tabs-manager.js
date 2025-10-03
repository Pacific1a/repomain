(function() {
  'use strict';

  // ============ FAKE PLAYERS GENERATOR ============
  const firstNames = ['Alex', 'John', 'Mike', 'Sarah', 'Emma', 'David', 'Chris', 'Anna', 'Tom', 'Lisa', 'Mark', 'Kate', 'Nick', 'Jane', 'Paul', 'Mary', 'Dan', 'Lucy', 'Sam', 'Nina'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis'];

  function maskUsername(name) {
    if (name.length <= 2) return name;
    const first = name[0];
    const last = name[name.length - 1];
    const stars = '*'.repeat(Math.max(1, name.length - 2));
    return `${first}${stars}${last}`;
  }

  function generateFakePlayers(count = 30) {
    const players = [];
    const usedNames = new Set();

    for (let i = 0; i < count; i++) {
      let username;
      do {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        username = Math.random() > 0.5 ? firstName : `${firstName}${lastName[0]}`;
      } while (usedNames.has(username));

      usedNames.add(username);
      
      players.push({
        id: `fake_${i}`,
        username: maskUsername(username),
        photo_url: null,
        betAmount: Math.floor(Math.random() * 500) + 50,
        winAmount: 0
      });
    }

    return players;
  }

  // ============ TAB MANAGEMENT ============
  let currentTab = 'live-bets';
  const fakePlayers = generateFakePlayers(30);
  let activePlayers = []; // Игроки, которые сейчас "играют"
  let simulationInterval = null;
  let playersOnlineCount = 0;

  const elements = {
    tabButtons: document.querySelectorAll('.tab-button'),
    tableHeaders: document.getElementById('table-headers'),
    roundResultBlock: document.getElementById('round-result-block'),
    playersOnlineBlock: document.getElementById('players-online-block'),
    playersCount: document.getElementById('players-count'),
    playersList: document.querySelector('.user-templates')
  };

  function switchTab(tabName) {
    currentTab = tabName;

    // Переключаем классы между кнопками
    elements.tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        // Активная кнопка
        btn.classList.add('active');
        btn.classList.add('previos-2');
        btn.classList.remove('div-wrapper-2');
      } else {
        // Неактивная кнопка
        btn.classList.remove('active');
        btn.classList.remove('previos-2');
        btn.classList.add('div-wrapper-2');
      }
    });

    if (tabName === 'live-bets') {
      // Режим Live Bets - показываем Players Online (сколько онлайн)
      elements.roundResultBlock.style.display = 'none';
      elements.playersOnlineBlock.style.display = 'block';
      
      // Запускаем симуляцию игроков
      startSimulation();
    } else if (tabName === 'previos') {
      // Режим Previos - показываем текущие ставки игроков
      elements.playersOnlineBlock.style.display = 'none';
      
      // Останавливаем симуляцию
      stopSimulation();
      
      // Обновляем список из wheel-game.js если есть
      if (window.updateDisplay) {
        window.updateDisplay();
      }
    }
  }

  // ============ SIMULATION ============
  function startSimulation() {
    stopSimulation(); // Останавливаем предыдущую симуляцию
    
    activePlayers = [];
    
    // Сразу добавляем 3-4 игрока
    const initialCount = Math.floor(Math.random() * 2) + 3;
    for (let i = 0; i < initialCount; i++) {
      addRandomPlayer();
    }
    
    renderPreviosPlayers();
    updatePlayersCount();
    
    // Добавляем/удаляем игроков каждые 1-2 секунды
    simulationInterval = setInterval(() => {
      const action = Math.random();
      
      if (action > 0.4 && activePlayers.length < 5) {
        // Добавляем нового игрока (60% шанс)
        addRandomPlayer();
      } else if (activePlayers.length > 0 && action < 0.3) {
        // Удаляем САМОГО СТАРОГО игрока (30% шанс)
        removeOldestPlayer();
      }
      
      updatePlayersCount();
    }, Math.random() * 1000 + 1000); // 1-2 секунды
  }

  function stopSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  }

  function addRandomPlayer() {
    // Выбираем случайного игрока, которого еще нет в активных
    const availablePlayers = fakePlayers.filter(p => !activePlayers.find(ap => ap.id === p.id));
    if (availablePlayers.length === 0) return;
    
    const player = { ...availablePlayers[Math.floor(Math.random() * availablePlayers.length)] };
    
    // Генерируем результат: 40% победа, 60% проигрыш
    const isWinner = Math.random() < 0.4;
    player.isWinner = isWinner;
    player.winAmount = isWinner ? Math.floor(player.betAmount * (Math.random() * 3 + 1.5)) : 0;
    player.addedTime = Date.now(); // Отметка времени добавления
    
    activePlayers.push(player);
    renderPreviosPlayers();
  }

  function removeOldestPlayer() {
    if (activePlayers.length === 0) return;
    
    // Удаляем самого старого игрока (первый в массиве)
    activePlayers.shift();
    renderPreviosPlayers();
  }

  function renderPreviosPlayers() {
    if (!elements.playersList) return;
    
    elements.playersList.innerHTML = '';
    
    activePlayers.forEach(player => {
      const div = document.createElement('div');
      // Победители — зеленый/обычный блок, проигравшие — красный фон
      div.className = player.isWinner ? 'win' : 'default lost';
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.5s ease, background-color 0.3s ease';
      
      // Красный фон для проигравших
      if (!player.isWinner) {
        div.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        div.style.width = '100%';
      }
      
      div.innerHTML = `
        <div class="acc-inf">
          <div class="avatar-wrapper">
            <div class="avatar-2" style="${player.photo_url ? `background-image: url(${player.photo_url}); background-size: cover;` : ''}"></div>
          </div>
          <div class="n-k"><div class="n-k-2">${player.username}</div></div>
        </div>
        <div class="div-wrapper-2"><div class="text-wrapper-14">${player.betAmount}</div></div>
        <div class="element-wrapper"><div class="element-3">${player.isWinner && player.winAmount > 0 ? player.winAmount : '-'}</div></div>
      `;
      elements.playersList.appendChild(div);
      
      // Анимация появления
      setTimeout(() => {
        div.style.opacity = '1';
      }, 50);
    });
  }

  function updatePlayersCount() {
    // Счетчик = количество игроков в списке
    playersOnlineCount = activePlayers.length;
    
    if (elements.playersCount) {
      elements.playersCount.textContent = playersOnlineCount;
    }
  }

  // ============ EVENT LISTENERS ============
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // ============ EXPORT FOR WHEEL-GAME ============
  window.TabsManager = {
    getCurrentTab: () => currentTab,
    switchToPrevios: () => switchTab('previos'),
    switchToLiveBets: () => switchTab('live-bets'),
    getFakePlayers: () => fakePlayers,
  };

  // ============ INIT ============
  function init() {
    switchTab('previos'); // По умолчанию показываем ставки игроков
    updatePlayersCount();
    console.log('📋 Roll Tabs Manager готов!');
    console.log(`Создано ${fakePlayers.length} фейковых игроков`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

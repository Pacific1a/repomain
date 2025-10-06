(function() {
  'use strict';

  let ws = null;
  let game = null;

  // Ждем загрузки WebSocket и игры
  function init() {
    if (window.GameWebSocket && window.GameWebSocket.socket && window.GameWebSocket.connected && window.speedCashGame) {
      ws = window.GameWebSocket;
      game = window.speedCashGame;
      console.log('✅ SpeedCASH WebSocket готов');
      initWebSocket();
    } else {
      setTimeout(init, 100);
    }
  }

  function initWebSocket() {
    console.log('🚗 SpeedCASH WebSocket инициализация...');
    
    // Подключаемся к комнате
    ws.socket.emit('join_speedcash');

    // Начало ставок
    ws.socket.on('speedcash_betting_start', (data) => {
      console.log('🚗 Betting started:', data);
      game.startBettingPhase(data.blueTarget, data.orangeTarget, data.delayedCar);
    });

    // Таймер ставок
    ws.socket.on('speedcash_betting_timer', (data) => {
      game.updateBettingTimer(data.timeLeft);
    });

    // Начало гонки
    ws.socket.on('speedcash_race_start', (data) => {
      console.log('🏁 Race started:', data);
      game.startRace(data.blueTarget, data.orangeTarget, data.delayedCar);
    });

    // Обновление множителей
    ws.socket.on('speedcash_multiplier_update', (data) => {
      game.updateMultipliers(data.blueMultiplier, data.orangeMultiplier);
    });

    // Конец гонки
    ws.socket.on('speedcash_race_end', (data) => {
      console.log('🏁 Race ended:', data);
      game.endRace(data.winner, data.blueMultiplier, data.orangeMultiplier, data.blueEscaped, data.orangeEscaped);
    });

    // Синхронизация состояния
    ws.socket.on('speedcash_state', (data) => {
      console.log('🔄 State sync:', data);
      if (data.status === 'betting') {
        game.gameState = 'betting';
        game.bettingTimeLeft = data.bettingTime;
      } else if (data.status === 'racing') {
        game.gameState = 'racing';
        game.blueMultiplier = data.blueMultiplier;
        game.orangeMultiplier = data.orangeMultiplier;
      }
    });
  }

  // Запуск
  init();

  console.log('✅ SpeedCASH WebSocket инициализирован');

})();

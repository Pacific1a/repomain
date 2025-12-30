// ============================================
// SPEEDCASH GAME LOGIC  
// Blue vs Orange car race с задержками
// ============================================

const gameStates = require('./gameStates');

function initializeSpeedcash(io) {
    const gameState = gameStates.speedcash;
    
    if (!gameState.isInitialized) {
        gameState.isInitialized = true;
        setTimeout(() => {
            startBetting(io);
        }, 2000);
    }
}

// Запуск фазы ставок
function startBetting(io) {
    const gameState = gameStates.speedcash;
    gameState.status = 'betting';
    gameState.bettingTime = 5;
    gameState.blueMultiplier = 1.00;
    gameState.orangeMultiplier = 1.00;
    gameState.winner = null;
    
    // Генерируем длительность гонки (10-20 секунд для МЕДЛЕННОГО роста)
    gameState.raceDuration = 10000 + Math.random() * 10000;
    
    // Определяем сценарий гонки
    const rand = Math.random();
    if (rand < 0.45) {
        // 45% - blue задержана, orange уехала
        gameState.delayedCar = 'blue';
        gameState.blueStopMultiplier = 1.1 + Math.random() * 0.6; // 1.1-1.7x (останавливается раньше)
        gameState.orangeStopMultiplier = 2.5 + Math.random() * 2.5; // 2.5-5.0x (продолжает расти)
    } else if (rand < 0.90) {
        // 45% - orange задержана, blue уехала
        gameState.delayedCar = 'orange';
        gameState.blueStopMultiplier = 2.5 + Math.random() * 2.5; // 2.5-5.0x (продолжает расти)
        gameState.orangeStopMultiplier = 1.1 + Math.random() * 0.6; // 1.1-1.7x (останавливается раньше)
    } else if (rand < 0.98) {
        // 8% - обе уехали (близкие множители, интересная гонка)
        gameState.delayedCar = 'none';
        const base = 2.5 + Math.random() * 2.0; // Базовый множитель 2.5-4.5
        gameState.blueStopMultiplier = base + (Math.random() - 0.5) * 0.5; // ±0.25
        gameState.orangeStopMultiplier = base + (Math.random() - 0.5) * 0.5; // ±0.25
    } else {
        // 2% - обе задержаны (ОЧЕНЬ редко)
        gameState.delayedCar = 'both';
        gameState.blueStopMultiplier = 1.1 + Math.random() * 0.4; // 1.1-1.5x
        gameState.orangeStopMultiplier = 1.1 + Math.random() * 0.4; // 1.1-1.5x
    }
    
    console.log(`🚗 Speedcash betting started. Duration: ${(gameState.raceDuration/1000).toFixed(1)}s, Delayed: ${gameState.delayedCar}`);
    
    io.to('global_speedcash').emit('speedcash_betting_start', {
        bettingTime: 5,
        delayedCar: gameState.delayedCar
    });
    
    if (gameState.bettingTimer) clearInterval(gameState.bettingTimer);
    
    gameState.bettingTimer = setInterval(() => {
        gameState.bettingTime--;
        
        io.to('global_speedcash').emit('speedcash_betting_timer', {
            timeLeft: gameState.bettingTime
        });
        
        if (gameState.bettingTime <= 0) {
            clearInterval(gameState.bettingTimer);
            gameState.bettingTimer = null;
            startRace(io);
        }
    }, 1000);
}

// Запуск гонки
function startRace(io) {
    const gameState = gameStates.speedcash;
    gameState.status = 'racing';
    gameState.raceStartTime = Date.now();
    
    io.to('global_speedcash').emit('speedcash_race_start', {
        delayedCar: gameState.delayedCar
    });
    
    console.log(`🏁 Speedcash race started!`);
    
    // Обновляем множители каждые 100мс
    if (gameState.raceInterval) clearInterval(gameState.raceInterval);
    
    // ОБЕ МАШИНЫ РАСТУТ С ОДИНАКОВОЙ МЕДЛЕННОЙ СКОРОСТЬЮ
    // Но останавливаются в РАЗНОЕ время (одна раньше - задержана, другая позже - уехала)
    
    gameState.raceInterval = setInterval(() => {
        const elapsed = Date.now() - gameState.raceStartTime;
        const progress = Math.min(elapsed / gameState.raceDuration, 1);
        
        // ОБЕ растут с ОДИНАКОВОЙ скоростью до своих целей
        gameState.blueMultiplier = Math.min(
            1.00 + (gameState.blueStopMultiplier - 1.00) * progress,
            gameState.blueStopMultiplier
        );
        gameState.orangeMultiplier = Math.min(
            1.00 + (gameState.orangeStopMultiplier - 1.00) * progress,
            gameState.orangeStopMultiplier
        );
        
        io.to('global_speedcash').emit('speedcash_multiplier_update', {
            blueMultiplier: parseFloat(gameState.blueMultiplier.toFixed(2)),
            orangeMultiplier: parseFloat(gameState.orangeMultiplier.toFixed(2)),
            progress: parseFloat((progress * 100).toFixed(1))
        });
        
        // Финиш когда обе достигли своих целей
        if (progress >= 1) {
            clearInterval(gameState.raceInterval);
            gameState.raceInterval = null;
            finishRace(io);
        }
    }, 100);
}

// Финиш гонки
function finishRace(io) {
    const gameState = gameStates.speedcash;
    gameState.status = 'finished';
    
    // Определяем победителя (большой множитель)
    gameState.winner = gameState.blueMultiplier > gameState.orangeMultiplier ? 'blue' : 'orange';
    
    io.to('global_speedcash').emit('speedcash_race_end', {
        winner: gameState.winner,
        blueMultiplier: parseFloat(gameState.blueStopMultiplier.toFixed(2)),
        orangeMultiplier: parseFloat(gameState.orangeStopMultiplier.toFixed(2))
    });
    
    console.log(`🏁 Speedcash finished! Winner: ${gameState.winner}`);
    
    // Новая игра через 3 секунды
    setTimeout(() => {
        startBetting(io);
    }, 3000);
}

// Socket handlers
function registerSpeedcashHandlers(socket, io) {
    // Подключение к Speedcash
    socket.on('join_speedcash', () => {
        socket.join('global_speedcash');
        console.log(`🚗 Player joined Speedcash`);
        
        const gameState = gameStates.speedcash;
        
        // Инициализация
        if (!gameState.isInitialized) {
            initializeSpeedcash(io);
        }
    });
    
    // Запрос текущего состояния
    socket.on('get_speedcash_state', () => {
        const gameState = gameStates.speedcash;
        
        let elapsed = 0;
        if (gameState.status === 'racing' && gameState.raceStartTime) {
            elapsed = Date.now() - gameState.raceStartTime;
        }
        
        socket.emit('speedcash_current_state', {
            status: gameState.status,
            timeLeft: gameState.bettingTime,
            blueMultiplier: parseFloat(gameState.blueMultiplier.toFixed(2)),
            orangeMultiplier: parseFloat(gameState.orangeMultiplier.toFixed(2)),
            blueTarget: gameState.blueStopMultiplier,
            orangeTarget: gameState.orangeStopMultiplier,
            delayedCar: gameState.delayedCar,
            elapsed: elapsed
        });
    });
}

module.exports = {
    registerSpeedcashHandlers,
    initializeSpeedcash
};

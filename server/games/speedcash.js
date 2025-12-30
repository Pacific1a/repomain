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
    gameState.blueEscaped = false;
    gameState.orangeEscaped = false;
    gameState.blueEscapeAt = null;
    gameState.orangeEscapeAt = null;
    
    // ФИКСИРОВАННАЯ скорость роста: 0.07x за секунду (БЫСТРО!)
    const growthRate = 0.07; // 0.07x в секунду (быстрее на 40%)
    
    // Определяем сценарий гонки
    const rand = Math.random();
    if (rand < 0.40) {
        // 40% - blue задержана, orange УЕХАЛА (не останавливается!)
        gameState.delayedCar = 'blue';
        gameState.blueStopMultiplier = 1.1 + Math.random() * 0.5; // 1.1-1.6x (задержана)
        gameState.orangeStopMultiplier = 999; // УЕХАЛА - не останавливается!
        gameState.orangeEscapeAt = 3.0 + Math.random() * 3.0; // Показывает "УЕХАЛ" на 3.0-6.0x
    } else if (rand < 0.80) {
        // 40% - orange задержана, blue УЕХАЛА (не останавливается!)
        gameState.delayedCar = 'orange';
        gameState.blueStopMultiplier = 999; // УЕХАЛА - не останавливается!
        gameState.blueEscapeAt = 3.0 + Math.random() * 3.0; // Показывает "УЕХАЛ" на 3.0-6.0x
        gameState.orangeStopMultiplier = 1.1 + Math.random() * 0.5; // 1.1-1.6x (задержана)
    } else if (rand < 0.95) {
        // 15% - обе УЕХАЛИ (близкие множители, интересная гонка!)
        gameState.delayedCar = 'none';
        const base = 3.5 + Math.random() * 2.0; // 3.5-5.5x
        gameState.blueStopMultiplier = 999;
        gameState.orangeStopMultiplier = 999;
        gameState.blueEscapeAt = base + (Math.random() - 0.5) * 0.5; // ±0.25
        gameState.orangeEscapeAt = base + (Math.random() - 0.5) * 0.5; // ±0.25
    } else {
        // 5% - обе задержаны (редко!)
        gameState.delayedCar = 'both';
        gameState.blueStopMultiplier = 1.1 + Math.random() * 0.4; // 1.1-1.5x
        gameState.orangeStopMultiplier = 1.1 + Math.random() * 0.4; // 1.1-1.5x
    }
    
    // Вычисляем МАКСИМАЛЬНУЮ длительность
    // Если машина уехала (999) - используем escapeAt, иначе stopMultiplier
    const blueTarget = gameState.blueStopMultiplier === 999 ? gameState.blueEscapeAt : gameState.blueStopMultiplier;
    const orangeTarget = gameState.orangeStopMultiplier === 999 ? gameState.orangeEscapeAt : gameState.orangeStopMultiplier;
    const maxMultiplier = Math.max(blueTarget || 0, orangeTarget || 0);
    gameState.raceDuration = ((maxMultiplier - 1.00) / growthRate) * 1000; // В миллисекундах
    
    // Сохраняем скорость роста
    gameState.growthRate = growthRate;
    
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
    
    // ПРАВИЛЬНАЯ ЛОГИКА: ОДИН общий множитель, задержанные ЗАМОРАЖИВАЮТСЯ
    gameState.currentMultiplier = 1.00;
    gameState.blueDetained = false;
    gameState.orangeDetained = false;
    
    gameState.raceInterval = setInterval(() => {
        const elapsedSeconds = (Date.now() - gameState.raceStartTime) / 1000;
        
        // ОДИН общий множитель растет для ВСЕХ
        gameState.currentMultiplier = 1.00 + (elapsedSeconds * gameState.growthRate);
        
        // Проверка задержания BLUE (достигла точки задержания)
        if (!gameState.blueDetained && !gameState.blueEscaped && gameState.currentMultiplier >= gameState.blueStopMultiplier) {
            gameState.blueDetained = true;
            gameState.blueMultiplier = gameState.currentMultiplier; // ЗАМОРАЖИВАЕМ на текущем значении
            console.log(`🚫 Blue detained at ${gameState.blueMultiplier.toFixed(2)}x`);
        }
        
        // Проверка УЕХАЛА BLUE (достигла точки побега)
        if (!gameState.blueEscaped && gameState.blueEscapeAt && gameState.currentMultiplier >= gameState.blueEscapeAt) {
            gameState.blueEscaped = true;
            gameState.blueMultiplier = gameState.currentMultiplier; // Финальный множитель
            console.log(`🚗💨 Blue escaped at ${gameState.blueMultiplier.toFixed(2)}x`);
        }
        
        // Проверка задержания ORANGE (достигла точки задержания)
        if (!gameState.orangeDetained && !gameState.orangeEscaped && gameState.currentMultiplier >= gameState.orangeStopMultiplier) {
            gameState.orangeDetained = true;
            gameState.orangeMultiplier = gameState.currentMultiplier; // ЗАМОРАЖИВАЕМ на текущем значении
            console.log(`🚫 Orange detained at ${gameState.orangeMultiplier.toFixed(2)}x`);
        }
        
        // Проверка УЕХАЛА ORANGE (достигла точки побега)
        if (!gameState.orangeEscaped && gameState.orangeEscapeAt && gameState.currentMultiplier >= gameState.orangeEscapeAt) {
            gameState.orangeEscaped = true;
            gameState.orangeMultiplier = gameState.currentMultiplier; // Финальный множитель
            console.log(`🚗💨 Orange escaped at ${gameState.orangeMultiplier.toFixed(2)}x`);
        }
        
        // Обновляем множители:
        // Если НЕ задержана И НЕ уехала - растет вместе с общим
        // Если задержана ИЛИ уехала - остается замороженной
        if (!gameState.blueDetained && !gameState.blueEscaped) {
            gameState.blueMultiplier = gameState.currentMultiplier;
        }
        if (!gameState.orangeDetained && !gameState.orangeEscaped) {
            gameState.orangeMultiplier = gameState.currentMultiplier;
        }
        
        io.to('global_speedcash').emit('speedcash_multiplier_update', {
            blueMultiplier: parseFloat(gameState.blueMultiplier.toFixed(2)),
            orangeMultiplier: parseFloat(gameState.orangeMultiplier.toFixed(2)),
            blueDetained: gameState.blueDetained,
            orangeDetained: gameState.orangeDetained,
            blueEscaped: gameState.blueEscaped,
            orangeEscaped: gameState.orangeEscaped,
            elapsedSeconds: parseFloat(elapsedSeconds.toFixed(1))
        });
        
        // Финиш когда ОБЕ остановились (задержаны ИЛИ уехали)
        const blueFinished = gameState.blueDetained || gameState.blueEscaped;
        const orangeFinished = gameState.orangeDetained || gameState.orangeEscaped;
        
        if (blueFinished && orangeFinished) {
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

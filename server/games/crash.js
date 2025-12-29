// ============================================
// CRASH GAME LOGIC
// Multiplier растёт до случайного crash point
// ============================================

const gameStates = require('./gameStates');

// Генерация weighted crash point (75% низкие, 20% средние, 5% высокие)
function generateWeightedCrashPoint() {
    const rand = Math.random();
    
    // 75% - низкие множители (1.15-1.6)
    if (rand < 0.75) {
        return 1.15 + Math.random() * 0.45;
    }
    // 20% - средние множители (1.6-2.0)
    else if (rand < 0.95) {
        return 1.6 + Math.random() * 0.4;
    }
    // 5% - высокие множители (2.0-3.5)
    else {
        return 2.0 + Math.random() * 1.5;
    }
}

function initializeCrash(io) {
    const gameState = gameStates.crash;
    
    // Запуск первой игры
    if (!gameState.isInitialized) {
        gameState.isInitialized = true;
        setTimeout(() => {
            startCrashWaiting(io);
        }, 2000);
    }
}

// Таймер ожидания (5 секунд)
function startCrashWaiting(io) {
    const gameState = gameStates.crash;
    gameState.status = 'waiting';
    gameState.waitingTime = 5;
    gameState.players = []; // Очищаем игроков
    
    console.log('⏳ Crash: Ожидание 5 сек...');
    
    if (gameState.waitingTimer) {
        clearInterval(gameState.waitingTimer);
        gameState.waitingTimer = null;
    }
    
    io.to('global_crash').emit('crash_waiting', {
        timeLeft: 5
    });
    
    gameState.waitingTimer = setInterval(() => {
        gameState.waitingTime--;
        
        io.to('global_crash').emit('crash_waiting', {
            timeLeft: gameState.waitingTime
        });
        
        if (gameState.waitingTime <= 0) {
            clearInterval(gameState.waitingTimer);
            gameState.waitingTimer = null;
            startCrashGame(io);
        }
    }, 1000);
}

// Запуск игры
function startCrashGame(io) {
    const gameState = gameStates.crash;
    gameState.status = 'flying';
    gameState.startTime = new Date();
    gameState.multiplier = 1.00;
    gameState.crashPoint = generateWeightedCrashPoint().toFixed(2);
    
    io.to('global_crash').emit('crash_started', {
        startTime: gameState.startTime.toISOString()
    });
    
    console.log(`🚀 Crash started! Will crash at: ${gameState.crashPoint}x`);
    
    // Увеличиваем multiplier каждые 100мс
    gameState.gameInterval = setInterval(() => {
        // Ускоряем рост по мере увеличения
        let increment = 0.01;
        if (gameState.multiplier > 2) increment = 0.02;
        if (gameState.multiplier > 5) increment = 0.05;
        if (gameState.multiplier > 10) increment = 0.1;
        
        gameState.multiplier += increment;
        
        io.to('global_crash').emit('crash_multiplier', {
            multiplier: parseFloat(gameState.multiplier.toFixed(2))
        });
        
        // Проверяем crash
        if (gameState.multiplier >= parseFloat(gameState.crashPoint)) {
            crashGame(io);
        }
    }, 100);
}

// Краш!
function crashGame(io) {
    const gameState = gameStates.crash;
    
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    gameState.status = 'crashed';
    
    io.to('global_crash').emit('crash_ended', {
        crashPoint: parseFloat(gameState.crashPoint)
    });
    
    console.log(`💥 Crash ended at: ${gameState.crashPoint}x`);
    
    // Сброс через 3 секунды
    setTimeout(() => {
        gameState.players = [];
        gameState.multiplier = 1.00;
        gameState.crashPoint = null;
        
        io.to('global_crash').emit('game_state_sync', {
            status: 'waiting',
            players: [],
            multiplier: 1.00,
            crashPoint: null
        });
        
        // Автозапуск следующей игры
        setTimeout(() => {
            startCrashWaiting(io);
        }, 1000);
    }, 3000);
}

// Socket handlers
function registerCrashHandlers(socket, io) {
    // Подключение к Crash (поддержка обоих форматов)
    const joinCrashHandler = () => {
        socket.join('global_crash');
        console.log(`🎮 Player joined Crash`);
        
        const gameState = gameStates.crash;
        
        // Отправляем текущее состояние
        socket.emit('game_state_sync', {
            status: gameState.status,
            multiplier: gameState.multiplier,
            crashPoint: gameState.crashPoint,
            players: gameState.players,
            waitingTime: gameState.waitingTime
        });
        
        // Инициализация если еще не было
        if (!gameState.isInitialized) {
            initializeCrash(io);
        }
    };
    
    socket.on('join_crash', joinCrashHandler);
    
    // Поддержка старого формата join_game
    socket.on('join_game', ({ game }) => {
        if (game === 'crash') {
            joinCrashHandler();
        }
    });
    
    // Ставка
    socket.on('place_bet', ({ game, userId, nickname, photoUrl, bet }) => {
        if (game !== 'crash') return;
        
        const gameState = gameStates.crash;
        
        if (gameState.status !== 'waiting') {
            console.log(`⚠️ Нельзя ставить во время игры (статус: ${gameState.status})`);
            return;
        }
        
        // Проверка существующей ставки
        if (gameState.players.find(p => p.userId === userId)) {
            console.log(`⚠️ Игрок ${userId} уже сделал ставку`);
            return;
        }
        
        // Добавляем игрока
        gameState.players.push({
            userId,
            nickname,
            photoUrl,
            bet,
            cashout: null,
            multiplier: null
        });
        
        io.to('global_crash').emit('player_joined', {
            userId,
            nickname,
            photoUrl,
            bet
        });
        
        console.log(`📥 Crash bet: ${nickname} -> ${bet}`);
    });
    
    // Cashout
    socket.on('crash_cashout', ({ userId }) => {
        const gameState = gameStates.crash;
        
        if (gameState.status !== 'flying') return;
        
        const player = gameState.players.find(p => p.userId === userId);
        if (!player || player.cashout) return;
        
        const cashout = Math.floor(player.bet * gameState.multiplier);
        player.cashout = cashout;
        player.multiplier = gameState.multiplier;
        
        io.to('global_crash').emit('player_cashout', {
            userId,
            cashout,
            multiplier: parseFloat(gameState.multiplier.toFixed(2))
        });
        
        console.log(`💵 ${player.nickname} cashed out ${cashout} at ${gameState.multiplier.toFixed(2)}x`);
    });
}

module.exports = {
    registerCrashHandlers,
    initializeCrash
};

// ============================================
// ROLL (WHEEL) GAME LOGIC
// Рулетка с весовым выбором победителя
// ============================================

const gameStates = require('./gameStates');
const { addBotsToRoll, startBotBets, stopBotBets, cleanupBots, incrementBotGames } = require('./fakePlayers');

function initializeRoll(io) {
    const gameState = gameStates.roll;
    
    if (!gameState.isInitialized) {
        gameState.isInitialized = true;
        
        // Добавляем начальных ботов через 2 секунды
        setTimeout(() => {
            const initialBotCount = 2 + Math.floor(Math.random() * 3); // 2-4 бота
            console.log(`🤖 Добавляем ${initialBotCount} начальных ботов`);
            addBotsToRoll(initialBotCount, io);
            
            // Запускаем ставки ботов
            setTimeout(() => {
                startBotBets(io, () => startRollGame(io));
            }, 2000);
        }, 2000);
    }
}

// Запуск игры
function startRollGame(io) {
    const gameState = gameStates.roll;
    
    if (gameState.status !== 'waiting') {
        console.log(`⚠️ Roll уже запущена (статус: ${gameState.status})`);
        return;
    }
    
    if (gameState.players.length < 2) {
        console.log(`⚠️ Недостаточно игроков для Roll (минимум 2)`);
        return;
    }
    
    gameState.status = 'betting';
    gameState.startTime = new Date();
    
    io.to('global_roll').emit('game_started', {
        startTime: gameState.startTime.toISOString(),
        timer: gameState.timer
    });
    
    console.log(`🎮 Roll started! Players: ${gameState.players.length}, Timer: ${gameState.timer}s`);
    
    // Таймер на спин
    gameState.timerInterval = setTimeout(() => {
        spinWheel(io);
    }, gameState.timer * 1000);
}

// Крутим колесо
function spinWheel(io) {
    const gameState = gameStates.roll;
    
    console.log(`🎰 Spinning wheel... Players: ${gameState.players.length}`);
    
    if (gameState.players.length === 0) {
        console.log(`⚠️ Нет игроков, сброс игры`);
        gameState.status = 'waiting';
        return;
    }
    
    stopBotBets();
    
    // Выбираем победителя по весам (боты +30%)
    const weightedBets = gameState.players.map(p => {
        const isBot = p.isBot || String(p.userId).startsWith('bot_');
        const weight = isBot ? p.bet * 1.3 : p.bet; // Боты имеют +30% шанс
        return { player: p, weight };
    });
    
    const totalWeight = weightedBets.reduce((sum, w) => sum + w.weight, 0);
    const random = Math.random() * totalWeight;
    let sum = 0;
    let winner = gameState.players[0];
    
    for (const weighted of weightedBets) {
        sum += weighted.weight;
        if (random <= sum) {
            winner = weighted.player;
            break;
        }
    }
    
    // Увеличиваем счетчик игр для ботов
    incrementBotGames(gameState.players);
    
    console.log(`🏆 Winner: ${winner.nickname} (userId: ${winner.userId})`);
    
    gameState.status = 'spinning';
    gameState.winner = winner.userId;
    
    const totalAmount = gameState.players.reduce((sum, p) => sum + p.bet, 0);
    
    io.to('global_roll').emit('spin_wheel', {
        winner: winner.userId,
        amount: totalAmount
    });
    
    // Завершение через 5 секунд
    setTimeout(() => {
        finishRoll(io);
    }, 5000);
}

// Завершение игры
function finishRoll(io) {
    const gameState = gameStates.roll;
    
    io.to('global_roll').emit('game_finished', {
        winner: gameState.winner
    });
    
    // Сброс состояния
    gameState.status = 'waiting';
    gameState.players = [];
    gameState.startTime = null;
    gameState.winner = null;
    
    // Очистка ботов и добавление новых
    setTimeout(() => {
        if (gameState.status !== 'waiting') {
            console.log(`⏸️ Игра уже началась, пропускаем добавление ботов`);
            return;
        }
        
        cleanupBots();
        
        const currentBotCount = gameState.activeBots.length;
        const targetBotCount = 2 + Math.floor(Math.random() * 3); // 2-4 бота
        
        if (currentBotCount < targetBotCount) {
            const botsToAdd = targetBotCount - currentBotCount;
            console.log(`🤖 После игры: добавляем ${botsToAdd} новых ботов`);
            addBotsToRoll(botsToAdd, io);
        }
        
        // Запускаем ставки ботов
        if (gameState.activeBots.length > 0) {
            startBotBets(io, () => startRollGame(io));
        }
    }, 2000);
    
    console.log(`🏁 Roll finished`);
}

// Socket handlers
function registerRollHandlers(socket, io) {
    // Подключение к Roll
    socket.on('join_game', ({ game }) => {
        if (game !== 'roll') return;
        
        socket.join('global_roll');
        console.log(`🎮 Player joined Roll`);
        
        const gameState = gameStates.roll;
        
        // Отправляем текущее состояние
        socket.emit('game_state_sync', {
            status: gameState.status,
            players: gameState.players,
            timer: gameState.timer,
            activeBots: gameState.activeBots.length
        });
        
        // Инициализация
        if (!gameState.isInitialized) {
            initializeRoll(io);
        }
    });
    
    // Ставка
    socket.on('place_bet', ({ game, userId, nickname, photoUrl, bet }) => {
        if (game !== 'roll') return;
        
        const gameState = gameStates.roll;
        
        if (gameState.status === 'spinning') {
            console.log(`⚠️ Нельзя ставить во время спина`);
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
            isBot: false
        });
        
        io.to('global_roll').emit('player_joined', {
            userId,
            nickname,
            photoUrl,
            bet
        });
        
        console.log(`📥 Roll bet: ${nickname} -> ${bet}`);
        
        // Запуск игры если >= 2 игроков
        if (gameState.status === 'waiting' && gameState.players.length >= 2) {
            console.log(`🎮 Starting Roll (${gameState.players.length} players)`);
            startRollGame(io);
        }
    });
}

module.exports = {
    registerRollHandlers,
    initializeRoll
};

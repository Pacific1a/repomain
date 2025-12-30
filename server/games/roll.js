// ============================================
// ROLL (WHEEL) GAME LOGIC
// Рулетка с весовым выбором победителя
// ============================================

const gameStates = require('./gameStates');
const { addBotsToRoll, startBotBets, stopBotBets, cleanupBots, incrementBotGames } = require('./fakePlayers');

// Палитра цветов для игроков
const PLAYER_COLORS = [
    '#bde0fe', '#ffafcc', '#ade8f4', '#edede9', '#6f2dbd',
    '#b8c0ff', '#ff9e00', '#826aed', '#ffff3f', '#1dd3b0',
    '#ffd449', '#54defd', '#2fe6de', '#00f2f2', '#2d00f7',
    '#00ccf5', '#00f59b', '#7014f2', '#ff00ff', '#ffe017',
    '#44d800', '#ff8c00', '#ff3800', '#fff702', '#00ffff',
    '#00ffe0', '#00ffc0', '#00ffa0', '#00ffff', '#8000ff',
    '#02b3f6'
];

// Генерация уникального цвета для игрока
function getUniqueColor(usedColors) {
    for (const color of PLAYER_COLORS) {
        if (!usedColors.has(color)) {
            return color;
        }
    }
    // Если все цвета заняты - генерируем случайный
    return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
}

function initializeRoll(io) {
    const gameState = gameStates.roll;
    
    if (!gameState.isInitialized) {
        gameState.isInitialized = true;
        
        // ИСПРАВЛЕНО: НЕ добавляем ботов автоматически!
        // Боты добавятся только после ставки реального игрока
        console.log(`✅ Roll инициализирован (без автостарта ботов)`);
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
    
    // ИСПРАВЛЕНО: Очищаем ботов ПОЛНОСТЬЮ, НЕ добавляем новых автоматически
    // Боты добавятся только когда реальный игрок сделает ставку
    setTimeout(() => {
        cleanupBots();
        
        // Очищаем всех активных ботов
        gameState.activeBots = [];
        
        console.log(`🏁 Roll finished, ждём реальных игроков`);
    }, 2000);
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
        
        // ИСПРАВЛЕНО: Можно ставить только в waiting или betting (НЕ во время spinning)
        if (gameState.status === 'spinning') {
            console.log(`⚠️ Нельзя ставить во время спина`);
            return;
        }
        
        // Проверка существующей ставки
        const existingPlayer = gameState.players.find(p => p.userId === userId);
        if (existingPlayer) {
            // ИСПРАВЛЕНО: Если игрок уже есть - ДОБАВЛЯЕМ к его ставке
            console.log(`💰 Игрок ${nickname} увеличивает ставку: ${existingPlayer.bet} + ${bet} = ${existingPlayer.bet + bet}`);
            existingPlayer.bet += bet;
            
            // Отправляем обновление (с цветом)
            io.to('global_roll').emit('player_bet_updated', {
                userId,
                nickname,
                bet: existingPlayer.bet,
                color: existingPlayer.color
            });
            return;
        }
        
        // ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ ЦВЕТ
        const usedColors = new Set(gameState.players.map(p => p.color));
        const playerColor = getUniqueColor(usedColors);
        
        // Добавляем игрока
        gameState.players.push({
            userId,
            nickname,
            photoUrl,
            bet,
            color: playerColor,
            isBot: false
        });
        
        io.to('global_roll').emit('player_joined', {
            userId,
            nickname,
            photoUrl,
            bet,
            color: playerColor
        });
        
        console.log(`📥 Roll bet: ${nickname} -> ${bet}, color: ${playerColor}`);
        
        // НОВАЯ ЛОГИКА: Добавляем ботов после первой ставки реального игрока
        if (gameState.players.length === 1 && gameState.activeBots.length === 0) {
            console.log(`🤖 Первый игрок сделал ставку, добавляем ботов...`);
            const botCount = 2 + Math.floor(Math.random() * 3); // 2-4 бота
            addBotsToRoll(botCount, io);
            
            // Запускаем ставки ботов
            setTimeout(() => {
                startBotBets(io, () => startRollGame(io));
            }, 1000);
        }
        
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

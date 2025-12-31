const gameStates = require('./gameStates');

// BlackJack game state (ТОЛЬКО ИСТОРИЯ! Игра локально на клиенте)
gameStates.blackjack = {
    players: [],      // Активные игроки в комнате
    history: []       // История игр
};

// Добавить в историю
function addToHistory(userId, nickname, photoUrl, bet, win, isWinner, multiplier) {
    gameStates.blackjack.history.unshift({
        userId,
        nickname,
        photoUrl,
        bet,
        win,
        isWinner,
        multiplier,
        timestamp: Date.now()
    });
    
    // Оставляем только последние 100 игр
    if (gameStates.blackjack.history.length > 100) {
        gameStates.blackjack.history = gameStates.blackjack.history.slice(0, 100);
    }
}

// Socket handlers (ТОЛЬКО ИСТОРИЯ!)
function registerBlackjackHandlers(socket, io) {
    const telegramId = socket.handshake.query.telegramId;
    
    if (!telegramId) {
        console.error('❌ BlackJack: No telegramId in socket handshake');
        return;
    }
    
    console.log(`🃏 BlackJack: Player ${telegramId} connected`);
    
    // Подключение к игре
    socket.on('join_game', ({ game }) => {
        if (game !== 'blackjack') return;
        
        socket.join('global_blackjack');
        console.log(`🃏 BlackJack: ${telegramId} joined room`);
        
        // Отправляем текущее состояние
        const gameState = gameStates.blackjack;
        socket.emit('game_state_sync', {
            game: 'blackjack',
            status: 'waiting',
            players: gameState.players,
            history: gameState.history.slice(0, 20)
        });
    });
    
    // Игрок зашёл в комнату
    socket.on('join_game_session', ({ game, userId, nickname, photoUrl }) => {
        if (game !== 'blackjack') return;
        
        console.log(`🃏 BlackJack: Player ${userId} joined session`);
        
        // Добавляем игрока если его еще нет
        const exists = gameStates.blackjack.players.find(p => p.userId === userId);
        if (!exists) {
            gameStates.blackjack.players.push({
                userId,
                nickname,
                photoUrl,
                lastSeen: Date.now()
            });
        }
        
        // Уведомляем всех
        io.to('global_blackjack').emit('player_joined_game', {
            game: 'blackjack',
            userId,
            nickname,
            photoUrl
        });
    });
    
    // Игра началась
    socket.on('blackjack_game_started', ({ game, userId, nickname, photoUrl, bet }) => {
        if (game !== 'blackjack') return;
        
        console.log(`🎮 BlackJack: Game started from ${userId}: bet=${bet}`);
        
        // Рассылаем всем игрокам
        io.to('global_blackjack').emit('blackjack_game_started', {
            userId,
            nickname,
            photoUrl,
            bet
        });
    });
    
    // Результат игры (из локальной игры на клиенте!)
    socket.on('blackjack_result', ({ game, userId, nickname, photoUrl, bet, win, isWinner, multiplier }) => {
        if (game !== 'blackjack') return;
        
        console.log(`🏁 BlackJack: Result from ${userId}: bet=${bet}, win=${win}, isWinner=${isWinner}, multiplier=${multiplier}`);
        
        // Добавляем в историю
        addToHistory(userId, nickname, photoUrl, bet, win, isWinner, multiplier);
        
        // Рассылаем всем игрокам
        io.to('global_blackjack').emit('blackjack_game_finished', {
            userId,
            nickname,
            photoUrl,
            bet,
            win,
            isWinner,
            multiplier
        });
        
        console.log('✅ BlackJack: Result added to history and broadcasted');
    });
    
    // Отключение
    socket.on('disconnect', () => {
        console.log(`🔌 BlackJack: ${telegramId} disconnected`);
        
        // Удаляем игрока из списка активных через некоторое время
        setTimeout(() => {
            const idx = gameStates.blackjack.players.findIndex(p => p.userId === telegramId);
            if (idx !== -1) {
                gameStates.blackjack.players.splice(idx, 1);
                console.log(`🗑️ BlackJack: Removed player ${telegramId}`);
            }
        }, 30000); // 30 секунд задержка
    });
}

module.exports = {
    registerBlackjackHandlers
};

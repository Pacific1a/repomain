const { gameStates } = require('../game-state');

// Mines game state
gameStates.mines = {
    // Активные игры игроков: { telegramId: { gameId, bombs, mines, revealed, bet, startTime } }
    activeGames: new Map()
};

// Генерация мин на сервере
function placeMines(bombs, totalCells = 25) {
    const mines = new Set();
    const bombsToPlace = Math.min(bombs, totalCells - 1);
    
    while (mines.size < bombsToPlace) {
        mines.add(Math.floor(Math.random() * totalCells));
    }
    
    return Array.from(mines);
}

// Расчет множителя
function calculateMultiplier(bombs, revealedCount) {
    const baseMap = {
        2: 1.02,
        3: 1.11,
        5: 1.22,
        7: 1.34
    };
    
    const base = baseMap[bombs] || 1.02;
    const increment = (bombs >= 7) ? 0.18 : (bombs >= 5) ? 0.12 : (bombs >= 3) ? 0.09 : 0.08;
    
    return parseFloat((base + increment * revealedCount).toFixed(2));
}

// Socket handlers
function registerMinesHandlers(socket, io) {
    const telegramId = socket.handshake.query.telegramId;
    
    if (!telegramId) {
        console.error('❌ Mines: No telegramId in socket handshake');
        return;
    }
    
    console.log(`🎮 Mines: Player ${telegramId} connected`);
    
    // Старт новой игры
    socket.on('mines_start_game', async ({ bombs, bet }) => {
        try {
            console.log(`💣 Mines: Start game - bombs: ${bombs}, bet: ${bet}, player: ${telegramId}`);
            
            // Валидация
            if (![2, 3, 5, 7].includes(bombs)) {
                socket.emit('mines_error', { message: 'Invalid bombs count' });
                return;
            }
            
            if (bet < 50) {
                socket.emit('mines_error', { message: 'Минимальная ставка: 50 rubles' });
                return;
            }
            
            // Проверяем что нет активной игры
            if (gameStates.mines.activeGames.has(telegramId)) {
                socket.emit('mines_error', { message: 'У вас уже есть активная игра' });
                return;
            }
            
            // Генерируем мины НА СЕРВЕРЕ
            const mines = placeMines(bombs);
            const gameId = `${telegramId}_${Date.now()}`;
            
            // Сохраняем игру
            gameStates.mines.activeGames.set(telegramId, {
                gameId,
                bombs,
                mines, // НА СЕРВЕРЕ!
                revealed: [],
                bet,
                startTime: Date.now()
            });
            
            console.log(`✅ Mines: Game ${gameId} created with ${bombs} bombs at positions:`, mines);
            
            // Отправляем подтверждение (БЕЗ позиций мин!)
            socket.emit('mines_game_started', {
                gameId,
                bombs,
                bet,
                // mines НЕ отправляем клиенту!
            });
            
        } catch (error) {
            console.error('❌ Mines start error:', error);
            socket.emit('mines_error', { message: 'Ошибка создания игры' });
        }
    });
    
    // Открытие клетки
    socket.on('mines_reveal_cell', async ({ gameId, cellIndex }) => {
        try {
            const game = gameStates.mines.activeGames.get(telegramId);
            
            if (!game || game.gameId !== gameId) {
                socket.emit('mines_error', { message: 'Игра не найдена' });
                return;
            }
            
            // Проверка что клетка не открыта
            if (game.revealed.includes(cellIndex)) {
                socket.emit('mines_error', { message: 'Клетка уже открыта' });
                return;
            }
            
            // Проверка на мину
            const isMine = game.mines.includes(cellIndex);
            
            if (isMine) {
                // ПРОИГРЫШ!
                console.log(`💥 Mines: Player ${telegramId} hit mine at ${cellIndex}`);
                
                // Удаляем игру
                gameStates.mines.activeGames.delete(telegramId);
                
                const multiplier = calculateMultiplier(game.bombs, game.revealed.length);
                
                socket.emit('mines_game_over', {
                    result: 'lose',
                    cellIndex,
                    isMine: true,
                    allMines: game.mines,
                    revealed: game.revealed,
                    multiplier,
                    bet: game.bet,
                    winnings: 0
                });
                
            } else {
                // БЕЗОПАСНАЯ КЛЕТКА!
                game.revealed.push(cellIndex);
                
                const multiplier = calculateMultiplier(game.bombs, game.revealed.length);
                const potentialWin = Math.floor(game.bet * multiplier);
                
                console.log(`✅ Mines: Player ${telegramId} revealed safe cell ${cellIndex}. Multiplier: ${multiplier}x`);
                
                socket.emit('mines_cell_revealed', {
                    cellIndex,
                    isMine: false,
                    revealed: game.revealed,
                    multiplier,
                    potentialWin
                });
            }
            
        } catch (error) {
            console.error('❌ Mines reveal error:', error);
            socket.emit('mines_error', { message: 'Ошибка открытия клетки' });
        }
    });
    
    // Cash out
    socket.on('mines_cash_out', async ({ gameId }) => {
        try {
            const game = gameStates.mines.activeGames.get(telegramId);
            
            if (!game || game.gameId !== gameId) {
                socket.emit('mines_error', { message: 'Игра не найдена' });
                return;
            }
            
            // Проверка что открыта хотя бы одна клетка
            if (game.revealed.length === 0) {
                socket.emit('mines_error', { message: 'Откройте хотя бы одну клетку' });
                return;
            }
            
            // Расчет выигрыша
            const multiplier = calculateMultiplier(game.bombs, game.revealed.length);
            const winnings = Math.floor(game.bet * multiplier);
            
            console.log(`💰 Mines: Player ${telegramId} cashed out. Win: ${winnings} (${multiplier}x)`);
            
            // Удаляем игру
            gameStates.mines.activeGames.delete(telegramId);
            
            // Отправляем результат
            socket.emit('mines_game_over', {
                result: 'win',
                allMines: game.mines,
                revealed: game.revealed,
                multiplier,
                bet: game.bet,
                winnings
            });
            
        } catch (error) {
            console.error('❌ Mines cash out error:', error);
            socket.emit('mines_error', { message: 'Ошибка cash out' });
        }
    });
    
    // Отключение
    socket.on('disconnect', () => {
        // Удаляем незавершенные игры
        if (gameStates.mines.activeGames.has(telegramId)) {
            console.log(`🔌 Mines: Player ${telegramId} disconnected, removing active game`);
            gameStates.mines.activeGames.delete(telegramId);
        }
    });
}

module.exports = {
    registerMinesHandlers
};

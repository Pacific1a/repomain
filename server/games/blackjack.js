const gameStates = require('./gameStates');

// BlackJack game state
gameStates.blackjack = {
    players: [],      // Активные игроки в комнате
    history: [],      // История игр
    activeGames: new Map()  // Активные игры: { telegramId: { gameId, deck, dealerHand, playerHand, bet, ... } }
};

// Карты
const SUITS = ["heart", "blackheart", "rhomb", "CrossIt"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Создание колоды
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: getCardValue(rank) });
        }
    }
    return shuffleDeck(deck);
}

// Перемешивание
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Значение карты
function getCardValue(rank) {
    if (rank === "A") return 11;
    if (["K", "Q", "J"].includes(rank)) return 10;
    return parseInt(rank, 10);
}

// Подсчет очков
function calculateScore(hand) {
    let total = 0;
    let aces = 0;
    
    for (const card of hand) {
        total += card.value;
        if (card.rank === "A") aces++;
    }
    
    // Уменьшаем тузы с 11 до 1 если перебор
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    
    return total;
}

// Проверка на soft 17 (дилер берет на soft 17)
function isSoft17(hand) {
    const score = calculateScore(hand);
    if (score !== 17) return false;
    
    // Проверяем есть ли туз считающийся как 11
    let total = 0;
    let aces = 0;
    for (const card of hand) {
        total += card.value;
        if (card.rank === "A") aces++;
    }
    
    return aces > 0 && total > 21;
}

// Игра дилера
function playDealer(hand, deck) {
    const dealerHand = [...hand];
    
    while (calculateScore(dealerHand) < 17 || isSoft17(dealerHand)) {
        if (deck.length === 0) {
            deck = createDeck();
        }
        dealerHand.push(deck.pop());
    }
    
    return { dealerHand, deck };
}

// Определение победителя
function determineWinner(playerScore, dealerScore) {
    if (playerScore > 21) return { result: 'lose', multiplier: 0 };
    if (dealerScore > 21) return { result: 'win', multiplier: 2.0 };
    if (playerScore > dealerScore) return { result: 'win', multiplier: 2.0 };
    if (playerScore < dealerScore) return { result: 'lose', multiplier: 0 };
    return { result: 'push', multiplier: 1.0 }; // Ничья
}

// Socket handlers
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
    
    // Старт новой игры
    socket.on('blackjack_start', async ({ bet, userId, nickname, photoUrl }) => {
        try {
            console.log(`🃏 BlackJack: ${userId} starting game with bet ${bet}`);
            
            // Валидация ставки
            if (bet < 50) {
                socket.emit('blackjack_error', { message: 'Минимальная ставка: 50 chips' });
                return;
            }
            
            // Проверяем активную игру
            if (gameStates.blackjack.activeGames.has(telegramId)) {
                socket.emit('blackjack_error', { message: 'У вас уже есть активная игра' });
                return;
            }
            
            // Создаем колоду
            const deck = createDeck();
            
            // Раздаем карты
            const playerHand = [deck.pop(), deck.pop()];
            const dealerHand = [deck.pop(), deck.pop()];
            
            const gameId = `${telegramId}_${Date.now()}`;
            
            // Сохраняем игру
            gameStates.blackjack.activeGames.set(telegramId, {
                gameId,
                userId,
                nickname,
                photoUrl,
                deck,
                playerHand,
                dealerHand,
                bet,
                startTime: Date.now(),
                canDouble: true  // Можно удвоить только на первом ходу
            });
            
            console.log(`✅ BlackJack: Game ${gameId} created`);
            
            // Отправляем карты клиенту
            socket.emit('blackjack_cards', {
                gameId,
                playerHand,
                dealerCards: [dealerHand[0]], // Только первая карта дилера
                playerScore: calculateScore(playerHand),
                canDouble: true
            });
            
            // Уведомляем комнату о новой игре
            io.to('global_blackjack').emit('blackjack_game_started', {
                userId,
                nickname,
                photoUrl,
                bet
            });
            
            // Проверка на блекджек
            const playerScore = calculateScore(playerHand);
            if (playerScore === 21) {
                // Блекджек! Автоматический выигрыш
                const dealerScore = calculateScore(dealerHand);
                const isBlackjack = dealerScore !== 21;
                const multiplier = isBlackjack ? 2.5 : 1.0; // Блекджек платит 3:2
                const winnings = Math.floor(bet * multiplier);
                
                gameStates.blackjack.activeGames.delete(telegramId);
                
                socket.emit('blackjack_result', {
                    result: isBlackjack ? 'blackjack' : 'push',
                    playerScore,
                    dealerScore,
                    dealerHand,
                    multiplier,
                    winnings,
                    bet
                });
                
                // Добавляем в историю
                addToHistory(userId, nickname, photoUrl, bet, winnings, multiplier > 1.0, multiplier);
                
                // Уведомляем комнату
                io.to('global_blackjack').emit('blackjack_game_finished', {
                    userId,
                    nickname,
                    photoUrl,
                    bet,
                    win: winnings,
                    isWinner: multiplier > 1.0,
                    multiplier
                });
            }
            
        } catch (error) {
            console.error('❌ BlackJack start error:', error);
            socket.emit('blackjack_error', { message: 'Ошибка начала игры' });
        }
    });
    
    // Взять карту (Hit)
    socket.on('blackjack_hit', async ({ gameId }) => {
        try {
            const game = gameStates.blackjack.activeGames.get(telegramId);
            
            if (!game || game.gameId !== gameId) {
                socket.emit('blackjack_error', { message: 'Игра не найдена' });
                return;
            }
            
            // Берем карту
            if (game.deck.length === 0) {
                game.deck = createDeck();
            }
            game.playerHand.push(game.deck.pop());
            game.canDouble = false; // Больше нельзя удваивать
            
            const playerScore = calculateScore(game.playerHand);
            
            console.log(`🃏 BlackJack: ${telegramId} hit, score: ${playerScore}`);
            
            // Отправляем новую карту
            socket.emit('blackjack_card_dealt', {
                card: game.playerHand[game.playerHand.length - 1],
                playerScore,
                canDouble: false
            });
            
            // Проверка на перебор
            if (playerScore > 21) {
                gameStates.blackjack.activeGames.delete(telegramId);
                
                socket.emit('blackjack_result', {
                    result: 'bust',
                    playerScore,
                    dealerScore: calculateScore(game.dealerHand),
                    dealerHand: game.dealerHand,
                    multiplier: 0,
                    winnings: 0,
                    bet: game.bet
                });
                
                // Добавляем в историю
                addToHistory(game.userId, game.nickname, game.photoUrl, game.bet, 0, false, 0);
                
                // Уведомляем комнату
                io.to('global_blackjack').emit('blackjack_game_finished', {
                    userId: game.userId,
                    nickname: game.nickname,
                    photoUrl: game.photoUrl,
                    bet: game.bet,
                    win: 0,
                    isWinner: false,
                    multiplier: 0
                });
            }
            
        } catch (error) {
            console.error('❌ BlackJack hit error:', error);
            socket.emit('blackjack_error', { message: 'Ошибка при взятии карты' });
        }
    });
    
    // Остановиться (Stand)
    socket.on('blackjack_stand', async ({ gameId }) => {
        try {
            const game = gameStates.blackjack.activeGames.get(telegramId);
            
            if (!game || game.gameId !== gameId) {
                socket.emit('blackjack_error', { message: 'Игра не найдена' });
                return;
            }
            
            console.log(`🃏 BlackJack: ${telegramId} stand`);
            
            // Дилер играет
            const { dealerHand, deck } = playDealer(game.dealerHand, game.deck);
            game.dealerHand = dealerHand;
            game.deck = deck;
            
            const playerScore = calculateScore(game.playerHand);
            const dealerScore = calculateScore(dealerHand);
            
            const { result, multiplier } = determineWinner(playerScore, dealerScore);
            const winnings = Math.floor(game.bet * multiplier);
            
            gameStates.blackjack.activeGames.delete(telegramId);
            
            socket.emit('blackjack_result', {
                result,
                playerScore,
                dealerScore,
                dealerHand,
                multiplier,
                winnings,
                bet: game.bet
            });
            
            // Добавляем в историю
            addToHistory(game.userId, game.nickname, game.photoUrl, game.bet, winnings, multiplier > 1.0, multiplier);
            
            // Уведомляем комнату
            io.to('global_blackjack').emit('blackjack_game_finished', {
                userId: game.userId,
                nickname: game.nickname,
                photoUrl: game.photoUrl,
                bet: game.bet,
                win: winnings,
                isWinner: multiplier > 1.0,
                multiplier
            });
            
        } catch (error) {
            console.error('❌ BlackJack stand error:', error);
            socket.emit('blackjack_error', { message: 'Ошибка завершения игры' });
        }
    });
    
    // Удвоить ставку (Double)
    socket.on('blackjack_double', async ({ gameId }) => {
        try {
            const game = gameStates.blackjack.activeGames.get(telegramId);
            
            if (!game || game.gameId !== gameId) {
                socket.emit('blackjack_error', { message: 'Игра не найдена' });
                return;
            }
            
            if (!game.canDouble) {
                socket.emit('blackjack_error', { message: 'Удвоение доступно только на первом ходу' });
                return;
            }
            
            console.log(`🃏 BlackJack: ${telegramId} double`);
            
            // Удваиваем ставку
            game.bet *= 2;
            
            // Берем одну карту
            if (game.deck.length === 0) {
                game.deck = createDeck();
            }
            game.playerHand.push(game.deck.pop());
            
            const playerScore = calculateScore(game.playerHand);
            
            // Проверка на перебор
            if (playerScore > 21) {
                gameStates.blackjack.activeGames.delete(telegramId);
                
                socket.emit('blackjack_result', {
                    result: 'bust',
                    playerScore,
                    dealerScore: calculateScore(game.dealerHand),
                    dealerHand: game.dealerHand,
                    multiplier: 0,
                    winnings: 0,
                    bet: game.bet
                });
                
                addToHistory(game.userId, game.nickname, game.photoUrl, game.bet, 0, false, 0);
                
                io.to('global_blackjack').emit('blackjack_game_finished', {
                    userId: game.userId,
                    nickname: game.nickname,
                    photoUrl: game.photoUrl,
                    bet: game.bet,
                    win: 0,
                    isWinner: false,
                    multiplier: 0
                });
                
                return;
            }
            
            // Дилер играет
            const { dealerHand, deck } = playDealer(game.dealerHand, game.deck);
            game.dealerHand = dealerHand;
            game.deck = deck;
            
            const dealerScore = calculateScore(dealerHand);
            const { result, multiplier } = determineWinner(playerScore, dealerScore);
            const winnings = Math.floor(game.bet * multiplier);
            
            gameStates.blackjack.activeGames.delete(telegramId);
            
            socket.emit('blackjack_result', {
                result,
                playerScore,
                dealerScore,
                dealerHand,
                multiplier,
                winnings,
                bet: game.bet
            });
            
            addToHistory(game.userId, game.nickname, game.photoUrl, game.bet, winnings, multiplier > 1.0, multiplier);
            
            io.to('global_blackjack').emit('blackjack_game_finished', {
                userId: game.userId,
                nickname: game.nickname,
                photoUrl: game.photoUrl,
                bet: game.bet,
                win: winnings,
                isWinner: multiplier > 1.0,
                multiplier
            });
            
        } catch (error) {
            console.error('❌ BlackJack double error:', error);
            socket.emit('blackjack_error', { message: 'Ошибка удвоения' });
        }
    });
    
    // Отключение
    socket.on('disconnect', () => {
        // Удаляем незавершенные игры
        if (gameStates.blackjack.activeGames.has(telegramId)) {
            console.log(`🔌 BlackJack: ${telegramId} disconnected, removing active game`);
            gameStates.blackjack.activeGames.delete(telegramId);
        }
    });
}

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

module.exports = {
    registerBlackjackHandlers
};

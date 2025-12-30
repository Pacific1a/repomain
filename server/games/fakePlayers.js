// ============================================
// FAKE PLAYERS (BOTS) SYSTEM
// Фейковые игроки для Roll игры
// ============================================

const gameStates = require('./gameStates');

// База ботов
const ROLL_BOTS = [
    { id: 'bot_den', nickname: 'den', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/1.png?raw=true' },
    { id: 'bot_sagarius', nickname: 'Sagarius', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/2.png?raw=true' },
    { id: 'bot_dev_fenomen', nickname: 'dev_fenomen', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/3.png?raw=true' },
    { id: 'bot_majer', nickname: 'Majer', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/4.png?raw=true' },
    { id: 'bot_ovi', nickname: 'OVI', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/5.png?raw=true' },
    { id: 'bot_user', nickname: 'User', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/6.png?raw=true' },
    { id: 'bot_mr_baton', nickname: 'Mr.Baton', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/7.png?raw=true' },
    { id: 'bot_wal', nickname: 'Wal?!!?', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/8.png?raw=true' },
    { id: 'bot_r1mskyy', nickname: 'r1mskyy', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/9.png?raw=true' },
    { id: 'bot_crownfall', nickname: 'crownfall', photoUrl: 'https://github.com/Pacific1a/img/blob/main/roll/10.png?raw=true' }
];

const BOT_BET_MIN = 100;
const BOT_BET_MAX = 2000;

// Активные боты
const activeBotsData = new Map(); // botId -> { gamesPlayed, betTimer }

// Получить случайных ботов (без повторов)
function getRandomBots(count) {
    const botsToAdd = [];
    const selectedIds = new Set();
    const usedAvatars = new Set();
    const shuffled = [...ROLL_BOTS].sort(() => Math.random() - 0.5);
    
    const gameState = gameStates.roll;
    gameState.activeBots.forEach(activeBot => {
        usedAvatars.add(activeBot.photoUrl);
    });
    
    for (let i = 0; i < count && i < shuffled.length; i++) {
        const bot = shuffled[i];
        const alreadyActive = gameState.activeBots.find(b => b.id === bot.id);
        
        if (!alreadyActive && !selectedIds.has(bot.id) && !usedAvatars.has(bot.photoUrl)) {
            botsToAdd.push(bot);
            selectedIds.add(bot.id);
            usedAvatars.add(bot.photoUrl);
        }
    }
    
    return botsToAdd;
}

// Добавить ботов в игру
function addBotsToRoll(count, io) {
    const gameState = gameStates.roll;
    
    if (gameState.status !== 'waiting') {
        console.log(`⚠️ Нельзя добавлять ботов во время игры (статус: ${gameState.status})`);
        return;
    }
    
    const botsToAdd = getRandomBots(count);
    
    botsToAdd.forEach(bot => {
        if (!gameState.activeBots.find(b => b.id === bot.id)) {
            gameState.activeBots.push({
                id: bot.id,
                nickname: bot.nickname,
                photoUrl: bot.photoUrl,
                gamesPlayed: 0
            });
            
            activeBotsData.set(bot.id, {
                gamesPlayed: 0,
                betTimer: null
            });
            
            console.log(`🤖 Бот ${bot.nickname} добавлен в игру`);
        }
    });
}

// Сделать ставку от бота
function makeBotBet(botId, io, startGameCallback) {
    const gameState = gameStates.roll;
    const botData = activeBotsData.get(botId);
    if (!botData) return;
    
    const bot = ROLL_BOTS.find(b => b.id === botId);
    if (!bot) return;
    
    if (gameState.status === 'spinning') {
        return;
    }
    
    // Проверяем лимит игр
    if (botData.gamesPlayed >= 2) {
        console.log(`🤖 Бот ${bot.nickname} уже сыграл 2 игры, пропускаем ставку`);
        return;
    }
    
    // Проверка что бот уже не сделал ставку
    if (gameState.players.find(p => p.userId === botId)) {
        console.log(`🤖 Бот ${bot.nickname} уже сделал ставку`);
        return;
    }
    
    const bet = BOT_BET_MIN + Math.floor(Math.random() * (BOT_BET_MAX - BOT_BET_MIN));
    
    // ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ ЦВЕТ для бота
    const PLAYER_COLORS = [
        '#bde0fe', '#ffafcc', '#ade8f4', '#edede9', '#6f2dbd',
        '#b8c0ff', '#ff9e00', '#826aed', '#ffff3f', '#1dd3b0',
        '#ffd449', '#54defd', '#2fe6de', '#00f2f2', '#2d00f7',
        '#00ccf5', '#00f59b', '#7014f2', '#ff00ff', '#ffe017',
        '#44d800', '#ff8c00', '#ff3800', '#fff702', '#00ffff',
        '#00ffe0', '#00ffc0', '#00ffa0', '#00ffff', '#8000ff',
        '#02b3f6'
    ];
    const usedColors = new Set(gameState.players.map(p => p.color));
    let botColor = PLAYER_COLORS.find(c => !usedColors.has(c)) || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
    gameState.players.push({
        userId: botId,
        nickname: bot.nickname,
        photoUrl: bot.photoUrl,
        bet: bet,
        color: botColor,
        isBot: true
    });
    
    io.to('global_roll').emit('player_joined', {
        userId: botId,
        nickname: bot.nickname,
        photoUrl: bot.photoUrl,
        bet: bet,
        color: botColor
    });
    
    console.log(`🤖 Бот ${bot.nickname} поставил ${bet}`);
    
    // Запускаем игру если >= 2 игроков
    if (gameState.status === 'waiting' && gameState.players.length >= 2) {
        console.log(`🎮 Запускаем Roll (${gameState.players.length} игроков)`);
        startGameCallback();
    }
}

// Запуск ставок для ботов
function startBotBets(io, startGameCallback) {
    const gameState = gameStates.roll;
    
    // Задержки: 1, 3, 6, 9 секунд
    const botDelays = [1000, 3000, 6000, 9000];
    let delayIndex = 0;
    
    gameState.activeBots.forEach(bot => {
        const botData = activeBotsData.get(bot.id);
        if (!botData) return;
        
        // Пропускаем ботов с 2 играми
        if (botData.gamesPlayed >= 2) {
            console.log(`🤖 Бот ${bot.nickname} пропущен (игр: ${botData.gamesPlayed})`);
            return;
        }
        
        const delay = botDelays[delayIndex % botDelays.length];
        delayIndex++;
        
        botData.betTimer = setTimeout(() => {
            makeBotBet(bot.id, io, startGameCallback);
        }, delay);
    });
}

// Остановить ставки ботов
function stopBotBets() {
    activeBotsData.forEach(botData => {
        if (botData.betTimer) {
            clearTimeout(botData.betTimer);
            botData.betTimer = null;
        }
    });
}

// Очистить ботов после 2 игр
function cleanupBots() {
    const gameState = gameStates.roll;
    
    gameState.activeBots = gameState.activeBots.filter(bot => {
        const botData = activeBotsData.get(bot.id);
        if (botData && botData.gamesPlayed >= 2) {
            activeBotsData.delete(bot.id);
            console.log(`🤖 Бот ${bot.nickname} удален после ${botData.gamesPlayed} игр`);
            return false;
        }
        return true;
    });
}

// Инкремент игр для ботов
function incrementBotGames(players) {
    players.forEach(player => {
        if (player.isBot || String(player.userId).startsWith('bot_')) {
            const botData = activeBotsData.get(player.userId);
            if (botData) {
                botData.gamesPlayed++;
                console.log(`🤖 Бот ${player.nickname} сыграл игру (всего: ${botData.gamesPlayed}/2)`);
            }
        }
    });
}

// Периодическое добавление ботов (каждые 5 минут)
function scheduleBotSpawn(io) {
    setInterval(() => {
        const gameState = gameStates.roll;
        
        if (gameState.status !== 'waiting') {
            console.log(`⏸️ Пропускаем добавление ботов (статус: ${gameState.status})`);
            return;
        }
        
        cleanupBots();
        
        const currentBotCount = gameState.activeBots.length;
        const targetBotCount = 2 + Math.floor(Math.random() * 3); // 2-4 бота
        
        if (currentBotCount < targetBotCount) {
            const botsToAdd = targetBotCount - currentBotCount;
            console.log(`🤖 Периодическое добавление: ${botsToAdd} ботов`);
            addBotsToRoll(botsToAdd, io);
        }
    }, 5 * 60 * 1000); // 5 минут
}

module.exports = {
    addBotsToRoll,
    startBotBets,
    stopBotBets,
    cleanupBots,
    incrementBotGames,
    scheduleBotSpawn
};

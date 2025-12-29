// ============================================
// GAME STATES
// Глобальные состояния игр (одна игра для всех игроков)
// ============================================

const gameStates = {
    crash: {
        status: 'waiting', // waiting, flying, crashed
        players: [],
        multiplier: 1.00,
        crashPoint: null,
        startTime: null,
        gameInterval: null,
        waitingTimer: null,
        waitingTime: 5,
        isInitialized: false
    },
    
    speedcash: {
        status: 'betting', // betting, racing, finished
        bettingTime: 5,
        blueMultiplier: 1.00,
        orangeMultiplier: 1.00,
        blueStopMultiplier: null,
        orangeStopMultiplier: null,
        delayedCar: null, // 'blue', 'orange', 'both', null
        winner: null,
        raceDuration: 10000,
        raceStartTime: null,
        bettingTimer: null,
        raceInterval: null,
        isInitialized: false
    },
    
    roll: {
        status: 'waiting', // waiting, betting, spinning
        players: [],
        timer: 30,
        startTime: null,
        timerInterval: null,
        winner: null,
        totalBet: 0,
        bets: {},
        activeBots: [],
        isInitialized: false
    }
};

module.exports = gameStates;

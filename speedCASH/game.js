// SpeedCASH Game - WebSocket Synchronized Racing Game
class SpeedCashGame {
    constructor() {
        console.log('🎮 SpeedCASH Game initialized');
        
        // WebSocket connection
        this.socket = null;
        
        // Game state
        this.gameState = 'initial'; // initial, waiting, playing, finished
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        
        // Betting
        this.blueBetAmount = 50;
        this.orangeBetAmount = 50;
        this.blueBetPlaced = false;
        this.orangeBetPlaced = false;
        
        // Auto cashout
        this.blueAutoCashout = false;
        this.orangeAutoCashout = false;
        this.blueAutoCashoutValue = 2.00;
        this.orangeAutoCashoutValue = 2.00;
        
        // DOM elements
        this.initElements();
        
        // Connect to WebSocket
        this.connectWebSocket();
    }
    
    initElements() {
        // Multiplier displays
        this.blueMultiplierDisplay = document.querySelector('.text-wrapper-4');
        this.orangeMultiplierDisplay = document.querySelector('.text-wrapper-5');
        
        // Countdown
        this.countdownDisplay = document.querySelector('.countdown-text');
        
        // Waiting screen
        this.waitingScreen = document.querySelector('.waiting-screen');
        
        // Bet buttons
        this.blueBetButton = document.querySelector('.div-4.blue .bet-button');
        this.orangeBetButton = document.querySelector('.div-4.orange .bet-button');
        
        // Bet amount displays
        this.blueBetAmountDisplay = document.querySelector('.div-4.blue .text-wrapper-13');
        this.orangeBetAmountDisplay = document.querySelector('.div-4.orange .text-wrapper-13');
        
        console.log('✅ DOM elements initialized');
    }
    
    connectWebSocket() {
        // Show glass loader
        this.showGlassLoader();
        
        // Use existing socket from players-system
        if (window.playersSocket) {
            this.socket = window.playersSocket;
            console.log('✅ Using existing WebSocket connection');
            this.socket.emit('join_speedcash');
            this.setupSocketListeners();
        } else {
            console.error('❌ playersSocket not found');
        }
    }
    
    setupSocketListeners() {
        // Betting phase started
        this.socket.on('speedcash_betting_start', (data) => {
            console.log('🎲 Betting started:', data);
            this.startBettingPhase(data);
        });
        
        // Betting timer
        this.socket.on('speedcash_betting_timer', (data) => {
            this.updateCountdown(data.timeLeft);
        });
        
        // Race started
        this.socket.on('speedcash_race_start', (data) => {
            console.log('🏁 Race started:', data);
            this.startRace(data);
        });
        
        // Multiplier update
        this.socket.on('speedcash_multiplier_update', (data) => {
            this.updateMultipliers(data.blueMultiplier, data.orangeMultiplier);
        });
        
        // Race ended
        this.socket.on('speedcash_race_end', (data) => {
            console.log('🏁 Race ended:', data);
            this.endRace(data);
        });
    }
    
    showGlassLoader() {
        const loader = document.createElement('div');
        loader.className = 'glass-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <div class="loader-text">Загрузка игры...</div>
            </div>
        `;
        document.querySelector('.game').appendChild(loader);
        this.glassLoader = loader;
    }
    
    hideGlassLoader() {
        if (this.glassLoader) {
            this.glassLoader.style.opacity = '0';
            setTimeout(() => {
                if (this.glassLoader && this.glassLoader.parentNode) {
                    this.glassLoader.parentNode.removeChild(this.glassLoader);
                    this.glassLoader = null;
                }
            }, 300);
        }
    }
    
    startBettingPhase(data) {
        this.gameState = 'waiting';
        this.hideGlassLoader();
        
        // Show waiting screen
        this.waitingScreen.style.display = 'flex';
        
        // Reset multipliers
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        console.log('⏳ Betting phase started');
    }
    
    updateCountdown(timeLeft) {
        if (this.countdownDisplay) {
            this.countdownDisplay.textContent = timeLeft;
        }
    }
    
    startRace(data) {
        this.gameState = 'playing';
        
        // Hide waiting screen
        this.waitingScreen.style.display = 'none';
        
        console.log('🏁 Race started');
    }
    
    updateMultipliers(blue, orange) {
        this.blueMultiplier = blue;
        this.orangeMultiplier = orange;
        this.updateMultiplierDisplays();
    }
    
    updateMultiplierDisplays() {
        if (this.blueMultiplierDisplay) {
            this.blueMultiplierDisplay.textContent = `x${this.blueMultiplier.toFixed(2)}`;
        }
        if (this.orangeMultiplierDisplay) {
            this.orangeMultiplierDisplay.textContent = `x${this.orangeMultiplier.toFixed(2)}`;
        }
    }
    
    endRace(data) {
        this.gameState = 'finished';
        console.log('🏁 Race finished');
    }
    
    // Bet amount adjustment
    adjustBetAmount(car, action) {
        const currentAmount = car === 'blue' ? this.blueBetAmount : this.orangeBetAmount;
        let newAmount = currentAmount;
        
        if (action === 'half') {
            newAmount = Math.floor(currentAmount / 2);
        } else if (action === 'double') {
            newAmount = currentAmount * 2;
        } else if (typeof action === 'number') {
            newAmount = currentAmount + action;
        }
        
        // Validate amount
        if (newAmount < 10) newAmount = 10;
        if (newAmount > 10000) newAmount = 10000;
        
        if (car === 'blue') {
            this.blueBetAmount = newAmount;
            this.blueBetAmountDisplay.textContent = newAmount;
        } else {
            this.orangeBetAmount = newAmount;
            this.orangeBetAmountDisplay.textContent = newAmount;
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for playersSocket
    const initGame = () => {
        if (window.playersSocket) {
            window.game = new SpeedCashGame();
        } else {
            console.log('⏳ Waiting for playersSocket...');
            setTimeout(initGame, 100);
        }
    };
    
    initGame();
});

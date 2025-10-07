// SpeedCASH Game - WebSocket Synchronized Racing Game
class SpeedCashGame {
    constructor() {
        console.log('🎮 SpeedCASH Game initialized');
        
        // WebSocket connection
        this.socket = null;
        
        // Game state
        this.gamePhase = 'initial'; // initial, waiting, playing, finished
        this.gameMode = 'two-cars'; // two-cars, one-car
        
        // Multipliers
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        
        // Blue car state
        this.blueBetAmount = 50;
        this.blueBetStatus = 'none'; // none, placed, playing, cashed, next-round
        this.blueAutoCashout = false;
        this.blueAutoCashoutValue = 2.00;
        
        // Orange car state
        this.orangeBetAmount = 50;
        this.orangeBetStatus = 'none';
        this.orangeAutoCashout = false;
        this.orangeAutoCashoutValue = 2.00;
        
        // History
        this.blueHistory = [];
        this.orangeHistory = [];
        
        // DOM elements
        this.initElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
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
        
        // Use existing socket from GameWebSocket
        if (window.GameWebSocket && window.GameWebSocket.socket) {
            this.socket = window.GameWebSocket.socket;
            console.log('✅ Using existing WebSocket connection');
            this.socket.emit('join_speedcash');
            this.setupSocketListeners();
            
            // Request current game state
            this.socket.emit('get_speedcash_state');
        } else {
            console.error('❌ GameWebSocket not found');
        }
    }
    
    setupSocketListeners() {
        // Current game state (when joining)
        this.socket.on('speedcash_current_state', (data) => {
            console.log('📊 Current state:', data);
            this.hideGlassLoader();
            
            if (data.status === 'betting' || data.status === 'waiting') {
                // Show countdown
                this.startBettingPhase(data);
                if (data.timeLeft) {
                    this.updateCountdown(data.timeLeft);
                }
            } else if (data.status === 'racing' || data.status === 'playing') {
                // Show game
                this.startRace(data);
                if (data.blueMultiplier && data.orangeMultiplier) {
                    this.updateMultipliers(data.blueMultiplier, data.orangeMultiplier);
                }
            }
        });
        
        // Betting phase started
        this.socket.on('speedcash_betting_start', (data) => {
            console.log('🎲 Betting started:', data);
            this.hideGlassLoader(); // Hide loader when data received
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
        loader.className = 'glass-loader-overlay';
        loader.innerHTML = `
            <div class="glass-block">
                <div class="glass-shine"></div>
            </div>
        `;
        
        const gameContainer = document.querySelector('.game');
        if (gameContainer) {
            gameContainer.appendChild(loader);
            this.glassLoader = loader;
        }
    }
    
    hideGlassLoader() {
        if (this.glassLoader && this.glassLoader.parentNode) {
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
        this.gamePhase = 'waiting';
        
        // Show waiting screen (countdown)
        if (this.waitingScreen) {
            this.waitingScreen.style.opacity = '1';
            this.waitingScreen.style.pointerEvents = 'auto';
            this.waitingScreen.style.display = 'flex';
        }
        
        // Hide game elements (cars, multipliers, road)
        const blueCar = document.querySelector('.auto-blue-2');
        const orangeCar = document.querySelector('.auto-orange');
        const blueMultiplier = document.querySelector('.multiplier');
        const orangeMultiplier = document.querySelector('.div-3');
        const roadLines = document.getElementById('roadLines');
        
        if (blueCar) blueCar.style.opacity = '0';
        if (orangeCar) orangeCar.style.opacity = '0';
        if (blueMultiplier) blueMultiplier.style.opacity = '0';
        if (orangeMultiplier) orangeMultiplier.style.opacity = '0';
        if (roadLines) roadLines.style.opacity = '0';
        
        // Reset multipliers
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        console.log('⏳ Betting phase started - showing countdown');
    }
    
    updateCountdown(timeLeft) {
        if (this.countdownDisplay && timeLeft > 0) {
            this.countdownDisplay.textContent = timeLeft;
        }
    }
    
    startRace(data) {
        this.gamePhase = 'playing';
        
        // Hide waiting screen (countdown)
        if (this.waitingScreen) {
            this.waitingScreen.style.opacity = '0';
            this.waitingScreen.style.pointerEvents = 'none';
            setTimeout(() => {
                if (this.waitingScreen) {
                    this.waitingScreen.style.display = 'none';
                }
            }, 300);
        }
        
        // Show game elements (cars, multipliers, road)
        const blueCar = document.querySelector('.auto-blue-2');
        const orangeCar = document.querySelector('.auto-orange');
        const blueMultiplier = document.querySelector('.multiplier');
        const orangeMultiplier = document.querySelector('.div-3');
        const roadLines = document.getElementById('roadLines');
        
        // Запускаем анимацию машин через JS
        if (blueCar) {
            blueCar.style.opacity = '1';
            blueCar.style.transform = 'translateY(0)';
            this.startCarAnimation('blue');
        }
        if (orangeCar) {
            orangeCar.style.opacity = '1';
            orangeCar.style.transform = 'translateY(0)';
            this.startCarAnimation('orange');
        }
        if (blueMultiplier) blueMultiplier.style.opacity = '1';
        if (orangeMultiplier) orangeMultiplier.style.opacity = '1';
        if (roadLines) roadLines.style.opacity = '1';
        
        // Convert placed bets to playing
        if (this.blueBetStatus === 'placed') {
            this.blueBetStatus = 'playing';
            this.updateBetButton('blue');
        }
        if (this.orangeBetStatus === 'placed') {
            this.orangeBetStatus = 'playing';
            this.updateBetButton('orange');
        }
        
        console.log('🏁 Race started - showing game');
    }
    
    updateMultipliers(blue, orange) {
        this.blueMultiplier = blue;
        this.orangeMultiplier = orange;
        this.updateMultiplierDisplays();
        
        // Update bet buttons to show current winnings
        if (this.blueBetStatus === 'playing') {
            this.updateBetButton('blue');
        }
        if (this.orangeBetStatus === 'playing') {
            this.updateBetButton('orange');
        }
        
        // Check auto-cashout
        if (this.blueAutoCashout && this.blueBetStatus === 'playing' && 
            this.blueMultiplier >= this.blueAutoCashoutValue) {
            console.log(`🤖 Auto cash out: blue at x${this.blueMultiplier.toFixed(2)}`);
            this.cashOut('blue');
        }
        if (this.orangeAutoCashout && this.orangeBetStatus === 'playing' && 
            this.orangeMultiplier >= this.orangeAutoCashoutValue) {
            console.log(`🤖 Auto cash out: orange at x${this.orangeMultiplier.toFixed(2)}`);
            this.cashOut('orange');
        }
    }
    
    startCarAnimation(car) {
        const positions = car === 'blue' 
            ? [0, -15, 20, 0] 
            : [0, 18, -17, 0];
        let currentIndex = 0;
        const duration = car === 'blue' ? 2000 : 2300; // Разная скорость
        
        const intervalKey = `${car}AnimationInterval`;
        
        // Очищаем старый интервал если есть
        if (this[intervalKey]) {
            clearInterval(this[intervalKey]);
        }
        
        // Запускаем анимацию
        this[intervalKey] = setInterval(() => {
            const carElement = document.querySelector(car === 'blue' ? '.auto-blue-2' : '.auto-orange');
            if (carElement && this.gamePhase === 'playing') {
                currentIndex = (currentIndex + 1) % positions.length;
                carElement.style.transition = 'transform 0.5s ease-in-out';
                carElement.style.transform = `translateY(${positions[currentIndex]}px)`;
            }
        }, duration / positions.length);
    }
    
    stopCarAnimation(car) {
        const carElement = document.querySelector(car === 'blue' ? '.auto-blue-2' : '.auto-orange');
        console.log(`🛑 stopCarAnimation called for ${car}`, carElement);
        
        // Останавливаем интервал анимации
        const intervalKey = `${car}AnimationInterval`;
        if (this[intervalKey]) {
            clearInterval(this[intervalKey]);
            this[intervalKey] = null;
            console.log(`✅ Animation interval cleared for ${car}`);
        }
        
        if (carElement) {
            // Добавляем анимацию выезда вниз
            carElement.style.transition = 'transform 1.5s ease-in';
            carElement.style.transform = 'translateY(500px)';
            console.log(`✅ Transform applied for ${car}: translateY(500px)`);
        } else {
            console.error(`❌ Car element not found for ${car}`);
        }
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
        this.gamePhase = 'finished';
        
        console.log('🏁 endRace data:', data);
        console.log('blueEscaped:', data.blueEscaped, 'orangeEscaped:', data.orangeEscaped);
        
        // Останавливаем машины которые достигли target (проиграли)
        if (data.blueEscaped === false) {
            console.log('🚗 Blue car STOPPED - reached target');
            this.stopCarAnimation('blue');
        }
        if (data.orangeEscaped === false) {
            console.log('🚗 Orange car STOPPED - reached target');
            this.stopCarAnimation('orange');
        }
        
        // Add to history
        this.blueHistory.unshift(this.blueMultiplier);
        this.orangeHistory.unshift(this.orangeMultiplier);
        
        // Limit history to 10 items
        if (this.blueHistory.length > 10) this.blueHistory.pop();
        if (this.orangeHistory.length > 10) this.orangeHistory.pop();
        
        // Show glass effect (затемнение) после анимации
        setTimeout(() => {
            this.showTransitionEffect();
        }, 1500);
        
        // Reset bet statuses
        if (this.blueBetStatus === 'playing') {
            this.blueBetStatus = 'none';
            this.updateBetButton('blue');
        }
        if (this.orangeBetStatus === 'playing') {
            this.orangeBetStatus = 'none';
            this.updateBetButton('orange');
        }
        
        // Process next-round bets
        if (this.blueBetStatus === 'next-round') {
            this.blueBetStatus = 'placed';
            this.updateBetButton('blue');
        }
        if (this.orangeBetStatus === 'next-round') {
            this.orangeBetStatus = 'placed';
            this.updateBetButton('orange');
        }
        
        console.log('🏁 Race finished - showing transition');
    }
    
    showTransitionEffect() {
        // Hide game elements first
        const blueCar = document.querySelector('.auto-blue-2');
        const orangeCar = document.querySelector('.auto-orange');
        const blueMultiplier = document.querySelector('.multiplier');
        const orangeMultiplier = document.querySelector('.div-3');
        const roadLines = document.getElementById('roadLines');
        
        if (blueCar) blueCar.style.opacity = '0';
        if (orangeCar) orangeCar.style.opacity = '0';
        if (blueMultiplier) blueMultiplier.style.opacity = '0';
        if (orangeMultiplier) orangeMultiplier.style.opacity = '0';
        if (roadLines) roadLines.style.opacity = '0';
        
        // Create glass overlay for transition
        const overlay = document.createElement('div');
        overlay.className = 'transition-overlay';
        overlay.innerHTML = `
            <div class="drove-away-text">Drove Away</div>
        `;
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 999;
            opacity: 0;
            transition: opacity 0.5s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const gameContainer = document.querySelector('.game');
        if (gameContainer) {
            gameContainer.appendChild(overlay);
        }
        
        // Fade in
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
        
        // Remove after 1 second and prepare for next round
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 1000);
    }
    
    setupEventListeners() {
        // Mode switcher будет добавлен позже
        console.log('✅ Event listeners setup');
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
            if (this.blueBetAmountDisplay) {
                this.blueBetAmountDisplay.textContent = newAmount;
            }
        } else {
            this.orangeBetAmount = newAmount;
            if (this.orangeBetAmountDisplay) {
                this.orangeBetAmountDisplay.textContent = newAmount;
            }
        }
    }
    
    // Place bet
    placeBet(car) {
        const betAmount = car === 'blue' ? this.blueBetAmount : this.orangeBetAmount;
        
        // Check balance
        if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
            console.log('❌ Insufficient balance');
            return;
        }
        
        // Place bet
        const success = window.GameBalanceAPI.placeBet(betAmount, 'chips');
        if (!success) return;
        
        if (this.gamePhase === 'waiting') {
            // Bet during waiting phase
            if (car === 'blue') {
                this.blueBetStatus = 'placed';
            } else {
                this.orangeBetStatus = 'placed';
            }
        } else if (this.gamePhase === 'playing') {
            // Bet during playing phase - queue for next round
            if (car === 'blue') {
                this.blueBetStatus = 'next-round';
            } else {
                this.orangeBetStatus = 'next-round';
            }
        }
        
        this.updateBetButton(car);
        console.log(`✅ Bet placed: ${car} - ${betAmount} chips`);
    }
    
    // Cancel bet
    cancelBet(car) {
        const betAmount = car === 'blue' ? this.blueBetAmount : this.orangeBetAmount;
        
        // Return chips
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(betAmount, 'chips');
        }
        
        if (car === 'blue') {
            this.blueBetStatus = 'none';
        } else {
            this.orangeBetStatus = 'none';
        }
        
        this.updateBetButton(car);
        console.log(`❌ Bet cancelled: ${car}`);
    }
    
    // Cash out
    cashOut(car) {
        const betAmount = car === 'blue' ? this.blueBetAmount : this.orangeBetAmount;
        const multiplier = car === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
        const winAmount = Math.floor(betAmount * multiplier);
        
        // Pay winnings
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winAmount, 'chips');
        }
        
        if (car === 'blue') {
            this.blueBetStatus = 'cashed';
        } else {
            this.orangeBetStatus = 'cashed';
        }
        
        this.updateBetButton(car);
        console.log(`💰 Cash out: ${car} - ${winAmount} chips (x${multiplier.toFixed(2)})`);
    }
    
    // Update bet button state
    updateBetButton(car) {
        const button = car === 'blue' ? this.blueBetButton : this.orangeBetButton;
        if (!button) return;
        
        const betStatus = car === 'blue' ? this.blueBetStatus : this.orangeBetStatus;
        const betAmount = car === 'blue' ? this.blueBetAmount : this.orangeBetAmount;
        const multiplier = car === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
        
        const textElement = button.querySelector('.text-wrapper-9');
        const amountElement = button.querySelector('.text-wrapper-14');
        
        // Remove all state classes
        button.classList.remove('state-bet', 'state-cancel', 'state-cashout', 'state-next-round');
        
        switch (betStatus) {
            case 'none':
                // BET state
                button.classList.add('state-bet');
                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                button.style.borderColor = '#667eea';
                if (textElement) textElement.textContent = 'Bet';
                if (amountElement) amountElement.textContent = `${betAmount} Chips`;
                button.onclick = () => this.placeBet(car);
                break;
                
            case 'placed':
                // CANCEL state (placed during waiting)
                button.classList.add('state-cancel');
                button.style.background = 'linear-gradient(180deg, #77C074 0%, #407B3D 100%)';
                button.style.borderColor = '#77C074';
                if (textElement) textElement.textContent = 'Cancel';
                if (amountElement) amountElement.textContent = '';
                button.onclick = () => this.cancelBet(car);
                break;
                
            case 'playing':
                // CASH OUT state
                button.classList.add('state-cashout');
                button.style.background = 'linear-gradient(180deg, #BAA657 0%, #877440 100%)';
                button.style.borderColor = '#BAA657';
                const winAmount = Math.floor(betAmount * multiplier);
                if (textElement) textElement.textContent = 'Cash Out';
                if (amountElement) amountElement.textContent = `${winAmount} Chips`;
                button.onclick = () => this.cashOut(car);
                break;
                
            case 'next-round':
                // CANCEL WAIT TO NEXT ROUND state
                button.classList.add('state-next-round');
                button.style.background = 'linear-gradient(180deg, #77C074 0%, #407B3D 100%)';
                button.style.borderColor = '#77C074';
                if (textElement) textElement.textContent = 'Cancel';
                if (amountElement) amountElement.textContent = 'Wait to next round';
                button.onclick = () => this.cancelBet(car);
                break;
                
            case 'cashed':
                // After cash out - reset to BET
                if (car === 'blue') {
                    this.blueBetStatus = 'none';
                } else {
                    this.orangeBetStatus = 'none';
                }
                this.updateBetButton(car);
                break;
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for GameWebSocket
    const initGame = () => {
        if (window.GameWebSocket && window.GameWebSocket.socket) {
            window.game = new SpeedCashGame();
        } else {
            console.log('⏳ Waiting for GameWebSocket...');
            setTimeout(initGame, 100);
        }
    };
    
    initGame();
});

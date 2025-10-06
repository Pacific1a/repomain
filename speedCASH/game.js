// SpeedCASH Game - Полная синхронизация с сервером через WebSocket
class SpeedCashGame {
    constructor() {
        console.log('🎮 SpeedCASH Game initialized');
        
        // WebSocket
        this.socket = null;
        
        // Game state
        this.gameState = 'waiting'; // waiting, betting, racing, finished
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.blueTarget = null;
        this.orangeTarget = null;
        this.delayedCar = null;
        
        // Car positions
        this.bluePosition = 0;
        this.orangePosition = 0;
        
        // DOM elements
        this.blueCar = null;
        this.orangeCar = null;
        this.blueMultiplierDisplay = null;
        this.orangeMultiplierDisplay = null;
        this.countdownDisplay = null;
        
        // Animation
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        // Получаем DOM элементы
        this.blueCar = document.querySelector('.auto-blue-2 img');
        this.orangeCar = document.querySelector('.auto-orange-2 img');
        this.blueMultiplierDisplay = document.querySelector('.text-wrapper-10');
        this.orangeMultiplierDisplay = document.querySelector('.text-wrapper-11');
        this.countdownDisplay = document.querySelector('.text-wrapper-12');
        
        // Подключаемся к WebSocket
        this.connectWebSocket();
    }
    
    connectWebSocket() {
        // Используем тот же socket что и players-system
        if (window.playersSocket) {
            this.socket = window.playersSocket;
            console.log('✅ Используем существующий WebSocket');
            this.socket.emit('join_speedcash');
        } else {
            console.error('❌ playersSocket не найден!');
            return;
        }
        
        this.socket.on('connect', () => {
            console.log('✅ SpeedCASH WebSocket connected');
            this.socket.emit('join_speedcash');
        });
        
        // Betting phase started
        this.socket.on('speedcash_betting_start', (data) => {
            console.log('🎲 Betting started:', data);
            this.startBetting(data);
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
        
        // Multiplier update from server
        this.socket.on('speedcash_multiplier_update', (data) => {
            this.updateMultipliers(data.blueMultiplier, data.orangeMultiplier);
        });
        
        // Race ended
        this.socket.on('speedcash_race_end', (data) => {
            console.log('🏁 Race ended:', data);
            this.endRace(data);
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
        });
    }
    
    startBetting(data) {
        this.gameState = 'betting';
        this.blueTarget = data.blueTarget;
        this.orangeTarget = data.orangeTarget;
        this.delayedCar = data.delayedCar;
        
        // Reset positions
        this.bluePosition = 0;
        this.orangePosition = 0;
        this.updateCarPositions();
        
        // Reset multipliers
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        // Show countdown
        this.showCountdown();
    }
    
    updateCountdown(timeLeft) {
        if (this.countdownDisplay) {
            this.countdownDisplay.textContent = timeLeft;
        }
    }
    
    showCountdown() {
        const raceArea = document.querySelector('.race');
        if (raceArea) {
            raceArea.classList.add('countdown-mode');
            raceArea.classList.remove('game-active');
        }
    }
    
    startRace(data) {
        this.gameState = 'racing';
        this.blueTarget = data.blueTarget;
        this.orangeTarget = data.orangeTarget;
        this.delayedCar = data.delayedCar;
        
        console.log(`🎯 Targets: Blue=${this.blueTarget.toFixed(2)}, Orange=${this.orangeTarget.toFixed(2)}, Delayed=${this.delayedCar}`);
        
        // Show game
        const raceArea = document.querySelector('.race');
        if (raceArea) {
            raceArea.classList.remove('countdown-mode');
            raceArea.classList.add('game-active');
        }
        
        // Start animation
        this.animate();
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
    
    animate() {
        if (this.gameState !== 'racing') return;
        
        // Хаотичное плавание машин
        const time = Date.now() * 0.001;
        
        // Blue car floating
        if (this.blueMultiplier < this.blueTarget) {
            const blueWave = Math.sin(time * 0.8) * 25 + Math.cos(time * 1.3) * 15;
            this.bluePosition = blueWave;
        } else if (this.delayedCar === 'blue') {
            // Задержана - едет вниз
            this.bluePosition += 5;
            if (this.bluePosition > 500) this.bluePosition = 500;
        } else {
            // Уезжает вверх
            this.bluePosition -= 8;
            if (this.bluePosition < -500) this.bluePosition = -500;
        }
        
        // Orange car floating
        if (this.orangeMultiplier < this.orangeTarget) {
            const orangeWave = Math.sin(time * 1.1) * 20 + Math.cos(time * 1.7) * 18;
            this.orangePosition = orangeWave;
        } else if (this.delayedCar === 'orange') {
            // Задержана - едет вниз
            this.orangePosition += 5;
            if (this.orangePosition > 500) this.orangePosition = 500;
        } else {
            // Уезжает вверх
            this.orangePosition -= 8;
            if (this.orangePosition < -500) this.orangePosition = -500;
        }
        
        this.updateCarPositions();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateCarPositions() {
        if (this.blueCar) {
            this.blueCar.style.transform = `translate3d(0, ${this.bluePosition}px, 0)`;
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = `translate3d(0, ${this.orangePosition}px, 0)`;
        }
    }
    
    endRace(data) {
        this.gameState = 'finished';
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log(`🏆 Winner: ${data.winner}`);
    }
}

// Initialize game when DOM is ready and WebSocket is available
document.addEventListener('DOMContentLoaded', () => {
    // Ждем пока playersSocket будет готов
    const initGame = () => {
        if (window.playersSocket) {
            window.speedCashGame = new SpeedCashGame();
        } else {
            console.log('⏳ Ожидание playersSocket...');
            setTimeout(initGame, 100);
        }
    };
    
    initGame();
});

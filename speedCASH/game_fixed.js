class SpeedCashGame {
    constructor() {
        // Определение мобильного устройства
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        console.log(`📱 Мобильное устройство: ${this.isMobile}`);
        
        this.gameState = 'waiting'; // 'waiting', 'betting', 'racing', 'finished'
        this.blueBet = 50;
        this.orangeBet = 50;
        this.currentBlueBet = null;
        this.currentOrangeBet = null;
        
        // Single mode
        this.singleBet = 50;
        this.currentSingleBet = null;
        this.singleSelectedCar = 'blue'; // 'blue' или 'orange'
        
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.raceStartTime = null;
        this.raceDuration = 20000; // 20 seconds race
        this.animationId = null;
        this.roadAnimationId = null;
        this.winner = null;
        this.balance = 1000; // Starting balance (displayed in HTML)
        this.bettingTimer = null;
        this.bettingTimeLeft = 5; // 5 seconds to bet
        this.delayedCar = null; // Only one car gets delayed
        this.blueStopMultiplier = 2 + Math.random() * 6; // Random stop point 2-8x
        this.orangeStopMultiplier = 2 + Math.random() * 6; // Random stop point 2-8x
        this.bluePosition = 0;
        this.orangePosition = 0;
        this.gameEnded = false;
        this.blueEscaped = false;
        this.orangeEscaped = false;
        this.escapeTextShown = false;
        this.racingPhase = false;
        
        // Auto Cash Out
        this.blueAutoCashOutEnabled = false;
        this.orangeAutoCashOutEnabled = false;
        this.blueAutoCashOutMultiplier = 2.00;
        this.orangeAutoCashOutMultiplier = 2.00;
        
        this.initializeElements();
        this.createRoadLines();
        this.showGlassLoader();
        this.initializeWebSocket();
        // Balance update removed - using static HTML value
        // startBettingPhase будет вызван после получения состояния от сервера
    }

    initializeWebSocket() {
        // Подключение к серверу (если есть)
        if (typeof io !== 'undefined') {
            this.socket = io();
            console.log('🔌 WebSocket подключен');
            
            // Таймаут 3 секунды - если сервер не ответил, запускаем локально
            const timeout = setTimeout(() => {
                console.log('⚠️ Сервер не ответил - запуск локально');
                this.hideGlassLoader();
                this.startBettingPhase();
            }, 3000);
            
            // Подключаемся к игре
            this.socket.emit('join_speedcash');
            
            // Запрашиваем текущее состояние игры
            this.socket.emit('get_speedcash_state');
            
            // Получаем текущее состояние от сервера
            this.socket.on('speedcash_current_state', (data) => {
                clearTimeout(timeout); // Отменяем таймаут
                console.log('📊 Текущее состояние:', data);
                this.syncWithServer(data);
            });
            
            // Слушаем события от сервера (для синхронизации)
            this.socket.on('speedcash_player_bet', (data) => {
                console.log('🎮 Ставка игрока:', data);
                // Можно показать уведомление о ставке другого игрока
            });
            
            this.socket.on('speedcash_player_cashout', (data) => {
                console.log('💰 Игрок сделал Cash Out:', data);
            });
            
            // Обновления множителей от сервера
            this.socket.on('speedcash_multiplier_update', (data) => {
                this.blueMultiplier = data.blueMultiplier;
                this.orangeMultiplier = data.orangeMultiplier;
                this.updateMultiplierDisplays();
            });
            
            // Конец гонки
            this.socket.on('speedcash_race_end', (data) => {
                console.log('🏁 Гонка закончилась:', data);
                
                // Сохраняем финальные множители для истории
                this.finalBlueMultiplier = data.blueMultiplier;
                this.finalOrangeMultiplier = data.orangeMultiplier;
                
                // СРАЗУ устанавливаем флаги задержания и показываем иконки
                if (!data.blueEscaped) {
                    this.blueDetained = true;
                    this.showCrashIcon('blue', this.bluePosition);
                }
                if (!data.orangeEscaped) {
                    this.orangeDetained = true;
                    this.showCrashIcon('orange', this.orangePosition);
                }
                
                // Победитель уезжает ЧЕРЕЗ 2 секунды (набирает еще коэфф)
                setTimeout(() => {
                    this.blueEscaped = data.blueEscaped;
                    this.orangeEscaped = data.orangeEscaped;
                    
                    // Показываем текст "УЕХАЛ" КОГДА машина начинает уезжать
                    if (!this.escapeTextShown) {
                        this.escapeTextShown = true;
                        
                        // Определяем кто уехал
                        if (data.blueEscaped && data.orangeEscaped) {
                            // Обе уехали (winner: 'both')
                            this.showEscapeText('blue'); // Показываем надпись
                        } else if (data.blueEscaped) {
                            this.showEscapeText('blue');
                        } else if (data.orangeEscaped) {
                            this.showEscapeText('orange');
                        } else {
                            // Никто не уехал (обе задержаны)
                            this.showBothDetainedScreen();
                        }
                    }
                }, 2000);
            });
            
            // Начало фазы ставок
            this.socket.on('speedcash_betting_start', (data) => {
                console.log('🎮 Начало фазы ставок:', data);
                this.gameState = 'betting';
                this.bettingTimeLeft = data.bettingTime || 5;
                
                // Инициализируем множители
                this.blueMultiplier = 1.00;
                this.orangeMultiplier = 1.00;
                this.delayedCar = data.delayedCar;
                this.updateMultiplierDisplays();
                
                // Сбрасываем состояние игры
                this.gameEnded = false;
                this.blueEscaped = false;
                this.orangeEscaped = false;
                this.blueDetained = false;
                this.orangeDetained = false;
                
                // Сбрасываем позиции машин
                this.bluePosition = 0;
                this.orangePosition = 0;
                if (this.blueCar) {
                    this.blueCar.style.transform = 'translateY(0px)';
                }
                if (this.orangeCar) {
                    this.orangeCar.style.transform = 'translateY(0px)';
                }
                
                // Удаляем иконки задержания
                const crashIcons = document.querySelectorAll('.crash-icon');
                crashIcons.forEach(icon => icon.remove());
                
                // Обрабатываем ставки из очереди
                this.processQueuedBets();
                
                // Очищаем старый таймер
                if (this.bettingTimer) {
                    clearTimeout(this.bettingTimer);
                }
                
                // Переходим в countdown mode
                const raceArea = document.querySelector('.race');
                if (raceArea) {
                    raceArea.classList.add('countdown-mode');
                    raceArea.classList.remove('game-active');
                }
                
                const roadLines = document.getElementById('roadLines');
                if (roadLines) {
                    roadLines.classList.remove('visible');
                }
                
                // Показываем countdown
                this.showCountdown();
                const countdownText = document.querySelector('.countdown-text');
                if (countdownText) {
                    countdownText.textContent = this.bettingTimeLeft;
                }
            });
            
            // Обновление таймера
            this.socket.on('speedcash_betting_timer', (data) => {
                this.bettingTimeLeft = data.timeLeft;
                const countdownText = document.querySelector('.countdown-text');
                if (countdownText) {
                    countdownText.textContent = this.bettingTimeLeft;
                }
            });
            
            // Начало гонки
            this.socket.on('speedcash_race_start', (data) => {
                console.log('🏁 Начало гонки:', data);
                this.gameState = 'racing';
                
                // Инициализируем множители
                this.blueMultiplier = 1.00;
                this.orangeMultiplier = 1.00;
                this.delayedCar = data.delayedCar;
                this.updateMultiplierDisplays();
                
                // Сбрасываем состояние игры
                this.gameEnded = false;
                this.blueEscaped = false;
                this.orangeEscaped = false;
                this.blueDetained = false;
                this.orangeDetained = false;
                this.escapeTextShown = false;
                
                // Скрываем countdown
                this.hideCountdown();
                
                // Показываем игру
                const raceArea = document.querySelector('.race');
                if (raceArea) {
                    raceArea.classList.remove('countdown-mode');
                    raceArea.classList.add('game-active');
                }
                
                const roadLines = document.getElementById('roadLines');
                if (roadLines) {
                    roadLines.classList.add('visible');
                }
                
                // Запускаем анимацию
                this.startTime = Date.now();
                this.racePhaseEndTime = this.startTime + 8000;
                
                // Останавливаем старые анимации
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                    this.animationId = null;
                }
                if (this.roadAnimationId) {
                    cancelAnimationFrame(this.roadAnimationId);
                    this.roadAnimationId = null;
                }
                
                // Запускаем новые анимации
                this.animateRace();
                this.animateRoadLines();
            });
        } else {
            console.log('⚠️ WebSocket не доступен - локальный режим');
            this.socket = null;
            // В локальном режиме запускаем сразу
            this.hideGlassLoader();
            this.startBettingPhase();
        }
    }
    
    syncWithServer(data) {
        this.hideGlassLoader();
        
        if (data.status === 'betting' || data.status === 'waiting') {
            // Фаза ставок
            this.gameState = 'betting';
            this.bettingTimeLeft = data.timeLeft || 5;
            
            // Инициализируем множители
            this.blueMultiplier = 1.00;
            this.orangeMultiplier = 1.00;
            this.updateMultiplierDisplays();
            
            // Очищаем старый таймер
            if (this.bettingTimer) {
                clearTimeout(this.bettingTimer);
            }
            
            // Показываем countdown
            this.showCountdown();
            
            // Обновляем countdown с правильным временем
            const countdownText = document.querySelector('.countdown-text');
            if (countdownText) {
                countdownText.textContent = this.bettingTimeLeft;
            }
            
            // Запускаем таймер с правильной позиции
            const countdown = () => {
                if (this.bettingTimeLeft > 0) {
                    this.bettingTimeLeft--;
                    this.updateCountdown();
                    this.bettingTimer = setTimeout(countdown, 1000);
                } else {
                    this.hideCountdown();
                    this.startRace();
                }
            };
            countdown();
        } else if (data.status === 'racing' || data.status === 'playing') {
            // Гонка идет
            this.gameState = 'racing';
            this.blueMultiplier = data.blueMultiplier || 1.00;
            this.orangeMultiplier = data.orangeMultiplier || 1.00;
            this.updateMultiplierDisplays();
            
            // Устанавливаем правильное состояние кнопок при синхронизации
            // Если есть активная ставка - Cash Out enabled, если нет - Bet disabled
            if (this.currentBlueBet) {
                this.updateBetButton('blue', 'cashout', this.currentBlueBet, false);
            } else {
                this.updateBetButton('blue', 'bet', this.blueBet, true);
            }
            if (this.currentOrangeBet) {
                this.updateBetButton('orange', 'cashout', this.currentOrangeBet, false);
            } else {
                this.updateBetButton('orange', 'bet', this.orangeBet, true);
            }
            if (this.currentSingleBet) {
                this.updateSingleButton('cashout', this.currentSingleBet, false);
            } else {
                this.updateSingleButton('bet', this.singleBet, true);
            }
            
            // Скрываем countdown, показываем игру
            this.hideCountdown();
            const raceArea = document.querySelector('.race');
            if (raceArea) {
                raceArea.classList.remove('countdown-mode');
                raceArea.classList.add('game-active');
            }
            
            const roadLines = document.getElementById('roadLines');
            if (roadLines) {
                roadLines.classList.add('visible');
            }
            
            // Запускаем анимацию
            if (!this.animationId) {
                // Останавливаем старые анимации на всякий случай
                if (this.roadAnimationId) {
                    cancelAnimationFrame(this.roadAnimationId);
                    this.roadAnimationId = null;
                }
                
                this.startTime = Date.now() - (data.elapsed || 0);
                this.racePhaseEndTime = this.startTime + 8000;
                this.animateRace();
                this.animateRoadLines();
            }
        }
    }
    
    showGlassLoader() {
        const gameElement = document.querySelector('.game');
        if (!gameElement) return;
        
        const loader = document.createElement('div');
        loader.className = 'glass-loader';
        loader.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            border-radius: 20px;
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        // Добавляем CSS анимацию
        if (!document.getElementById('spinnerAnimation')) {
            const style = document.createElement('style');
            style.id = 'spinnerAnimation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        loader.appendChild(spinner);
        gameElement.appendChild(loader);
        this.glassLoader = loader;
    }
    
    hideGlassLoader() {
        if (this.glassLoader && this.glassLoader.parentNode) {
            this.glassLoader.parentNode.removeChild(this.glassLoader);
            this.glassLoader = null;
        }
    }

    initializeElements() {
        // Cache all DOM elements for better performance
        this.blueBetButton = document.querySelector('.div-4:first-child .bet-button');
        this.orangeBetButton = document.querySelector('.div-4:last-child .cash-out-button');
        this.blueBetAmount = document.querySelector('.div-4:first-child .text-wrapper-13');
        this.orangeBetAmount = document.querySelector('.div-4:last-child .text-wrapper-13');
        this.blueMultiplierDisplay = document.querySelector('.text-wrapper-4');
        this.orangeMultiplierDisplay = document.querySelector('.text-wrapper-5');
        this.blueCar = document.querySelector('.auto-blue-2');
        this.orangeCar = document.querySelector('.auto-orange');
        this.raceArea = document.querySelector('.race');
        this.roadLinesContainer = document.getElementById('roadLines');
        this.countdownText = document.querySelector('.countdown-text');
        this.gameElement = document.querySelector('.game');
        
        // Enable GPU acceleration for cars
        if (this.blueCar) {
            this.blueCar.style.transform = 'translateZ(0)';
            this.blueCar.style.willChange = 'transform';
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = 'translateZ(0)';
            this.orangeCar.style.willChange = 'transform';
        }
        
        // Throttle settings только для DOM обновлений (не для анимаций)
        this.lastMultiplierUpdate = 0;
        this.multiplierUpdateInterval = this.isMobile ? 70 : 50; // Мобильные: 70ms, Десктоп: 50ms
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.blueBetButton) {
            this.blueBetButton.addEventListener('click', () => this.placeBet('blue'));
        }
        if (this.orangeBetButton) {
            this.orangeBetButton.addEventListener('click', () => this.placeBet('orange'));
        }
        
        // Single mode button
        const singleButton = document.querySelector('.who-is-win .bet-button');
        if (singleButton) {
            singleButton.addEventListener('click', () => this.placeBet('single'));
        }
        
        // Setup bet control buttons
        this.setupBetButtons();
    }
    
    setupBetButtons() {
        // Blue buttons
        const blueMinus = document.querySelector('.blue-minus-10');
        const bluePlus = document.querySelector('.blue-plus-10');
        const blueHalf = document.querySelector('.blue-half');
        const blueDouble = document.querySelector('.blue-double');
        
        if (blueMinus) blueMinus.addEventListener('click', () => this.adjustBetAmount('blue', -10));
        if (bluePlus) bluePlus.addEventListener('click', () => this.adjustBetAmount('blue', 10));
        if (blueHalf) blueHalf.addEventListener('click', () => this.adjustBetAmount('blue', 'half'));
        if (blueDouble) blueDouble.addEventListener('click', () => this.adjustBetAmount('blue', 'double'));
        
        // Orange buttons
        const orangeMinus = document.querySelector('.orange-minus-10');
        const orangePlus = document.querySelector('.orange-plus-10');
        const orangeHalf = document.querySelector('.orange-half');
        const orangeDouble = document.querySelector('.orange-double');
        
        if (orangeMinus) orangeMinus.addEventListener('click', () => this.adjustBetAmount('orange', -10));
        if (orangePlus) orangePlus.addEventListener('click', () => this.adjustBetAmount('orange', 10));
        if (orangeHalf) orangeHalf.addEventListener('click', () => this.adjustBetAmount('orange', 'half'));
        if (orangeDouble) orangeDouble.addEventListener('click', () => this.adjustBetAmount('orange', 'double'));
        
        // Single buttons
        const singleMinus = document.querySelector('.single-minus-10');
        const singlePlus = document.querySelector('.single-plus-10');
        const singleHalf = document.querySelector('.single-half');
        const singleDouble = document.querySelector('.single-double');
        const singleSelectBlue = document.querySelector('.single-select-blue');
        const singleSelectOrange = document.querySelector('.single-select-orange');
        
        if (singleMinus) singleMinus.addEventListener('click', () => this.adjustBetAmount('single', -10));
        if (singlePlus) singlePlus.addEventListener('click', () => this.adjustBetAmount('single', 10));
        if (singleHalf) singleHalf.addEventListener('click', () => this.adjustBetAmount('single', 'half'));
        if (singleDouble) singleDouble.addEventListener('click', () => this.adjustBetAmount('single', 'double'));
        if (singleSelectBlue) singleSelectBlue.addEventListener('click', () => this.selectSingleCar('blue'));
        if (singleSelectOrange) singleSelectOrange.addEventListener('click', () => this.selectSingleCar('orange'));
    }

    createRoadLines() {
        const roadContainer = document.getElementById('roadLines');
        if (!roadContainer) return;
        
        // Clear existing lines
        roadContainer.innerHTML = '';
        
        // Create proper dashed road markings with unique IDs
        // Оптимизация для мобильных устройств: уменьшено с 15 до 12 линий
        for (let i = 0; i < 12; i++) {
            const line = document.createElement('div');
            line.className = 'road-line';
            line.id = `road-line-${i}`;
            line.style.top = `${i * 80 - 400}px`; // Больше расстояние между линиями
            roadContainer.appendChild(line);
        }
    }
    
    animateRoadLines() {
        if (!this.roadLinesContainer) return;
        
        // Cache road lines once
        if (!this.cachedRoadLines) {
            this.cachedRoadLines = Array.from(this.roadLinesContainer.querySelectorAll('.road-line'));
            // Enable GPU acceleration for road lines
            this.cachedRoadLines.forEach(line => {
                line.style.willChange = 'transform';
            });
        }
        
        const animateLines = () => {
            if (this.gameState !== 'racing') return;
            
            // Анимация дороги на полном FPS (без throttling)
            this.cachedRoadLines.forEach(line => {
                let currentTop = parseFloat(line.dataset.top) || parseInt(line.style.top) || 0;
                currentTop += 3;
                
                if (currentTop > 700) {
                    currentTop = -400;
                }
                
                line.dataset.top = currentTop;
                line.style.transform = `translate3d(0, ${currentTop}px, 0)`;
                line.style.top = '0'; // Reset top to use transform
            });
            
            this.roadAnimationId = requestAnimationFrame(animateLines);
        };
        
        animateLines();
    }

    startBettingPhase() {
        this.gameState = 'betting';
        this.bettingTimeLeft = 5;
        
        // Use cached elements
        if (this.raceArea) {
            this.raceArea.classList.add('countdown-mode');
            this.raceArea.classList.remove('game-active');
        }
        
        if (this.roadLinesContainer) {
            this.roadLinesContainer.classList.remove('visible');
        }
        
        // Show countdown
        this.showCountdown();
        const countdown = () => {
            if (this.bettingTimeLeft > 0) {
                this.bettingTimeLeft--;
                this.updateCountdown();
                this.bettingTimer = setTimeout(countdown, 1000);
            } else {
                this.hideCountdown();
                this.startRace();
            }
        };
        
        countdown();
    }



    showNotification(message) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            left: 50%;
            top: 10px;
            transform: translateX(-50%);
            background: rgba(60, 60, 60, 0.92);
            color: rgb(229, 229, 229);
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: rgba(0, 0, 0, 0.35) 0px 6px 20px;
            font-family: Montserrat, Inter, Arial, sans-serif;
            font-size: 13px;
            letter-spacing: 0.2px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.2s;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Показываем
        setTimeout(() => notification.style.opacity = '1', 10);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 200);
        }, 3000);
    }

    placeBet(color) {
        // Single mode
        if (color === 'single') {
            return this.placeSingleBet();
        }
        
        const button = this.getButton(color);
        const currentBet = color === 'blue' ? this.currentBlueBet : this.currentOrangeBet;
        
        // Во время betting фазы
        if (this.gameState === 'betting') {
            if (currentBet) {
                // Уже есть ставка - отменяем (Cancel)
                this.cancelBet(color);
            } else {
                // Ставим новую ставку
                const betAmount = color === 'blue' ? this.blueBet : this.orangeBet;
                if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(betAmount, 'chips')) {
                    this.showNotification('Недостаточно средств');
                    return;
                }
                const success = window.GameBalanceAPI.placeBet(betAmount, 'chips');
                if (success) {
                    if (color === 'blue') {
                        this.currentBlueBet = betAmount;
                    } else {
                        this.currentOrangeBet = betAmount;
                    }
                    this.updateBetButton(color, 'cancel', betAmount);
                    console.log(`✅ Ставка ${betAmount} чипов на ${color} принята`);
                    
                    // Отправляем на сервер
                    if (this.socket) {
                        this.socket.emit('speedcash_place_bet', {
                            color: color,
                            amount: betAmount,
                            multiplier: color === 'blue' ? this.blueMultiplier : this.orangeMultiplier
                        });
                    }
                }
            }
            return;
        }
        
        // Во время racing фазы
        if (this.gameState === 'racing') {
            if (currentBet) {
                // Проверяем не задержана ли машина
                const isDetained = (color === 'blue' && this.blueDetained) || (color === 'orange' && this.orangeDetained);
                if (isDetained) {
                    // Кнопка уже disabled, ничего не делаем
                    return;
                }
                // Есть ставка и машина не задержана - делаем Cash Out
                this.cashOut(color);
            }
            // Нет ставки во время racing - ничего не делаем (кнопка disabled)
            return;
        }
    }

    cancelBet(color) {
        const betAmount = color === 'blue' ? this.currentBlueBet : this.currentOrangeBet;
        if (!betAmount) return;
        
        // Возвращаем средства
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(betAmount, 'chips');
        }
        
        // Сбрасываем ставку
        if (color === 'blue') {
            this.currentBlueBet = null;
        } else {
            this.currentOrangeBet = null;
        }
        
        const amount = color === 'blue' ? this.blueBet : this.orangeBet;
        this.updateBetButton(color, 'bet', amount);
        console.log(`❌ Ставка отменена: ${color} - ${betAmount} chips`);
    }

    cashOut(color) {
        const betAmount = color === 'blue' ? this.currentBlueBet : this.currentOrangeBet;
        if (!betAmount) return;
        
        const multiplier = color === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
        const winnings = Math.floor(betAmount * multiplier);
        
        // Выплачиваем выигрыш
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winnings, 'chips');
        }
        
        // Сбрасываем ставку
        if (color === 'blue') {
            this.currentBlueBet = null;
        } else {
            this.currentOrangeBet = null;
        }
        
        const amount = color === 'blue' ? this.blueBet : this.orangeBet;
        this.updateBetButton(color, 'bet', amount);
        console.log(`💰 ${color} Cash Out: ${winnings} chips (x${multiplier.toFixed(2)})`);
        
        // Отправляем на сервер
        if (this.socket) {
            this.socket.emit('speedcash_cashout', {
                color: color,
                multiplier: multiplier,
                winnings: winnings
            });
        }
    }

    updateBetButton(color, state, amount, disabled = false) {
        const button = this.getButton(color);
        const wrapper = this.getButtonWrapper(color);
        if (!button) return;
        
        const textElement = button.querySelector('.text-wrapper-9');
        const amountElement = button.querySelector(color === 'blue' ? '.text-wrapper-10' : '.text-wrapper-14');
        
        // Удаляем все классы состояний
        button.classList.remove('state-bet', 'state-cancel', 'state-cashout', 'disabled');
        if (wrapper) {
            wrapper.classList.remove('state-bet', 'state-cancel', 'state-cashout', 'disabled');
        }
        
        // Устанавливаем disabled если нужно
        if (disabled) {
            button.classList.add('disabled');
            if (wrapper) wrapper.classList.add('disabled');
            button.style.opacity = '0.5';
            button.style.pointerEvents = 'none';
        } else {
            button.style.opacity = '';
            button.style.pointerEvents = '';
        }
        
        // Устанавливаем новое состояние
        if (state === 'bet') {
            if (textElement) textElement.textContent = 'Bet';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-bet');
            if (wrapper) wrapper.classList.add('state-bet');
        } else if (state === 'cancel') {
            if (textElement) textElement.textContent = 'Cancel';
            if (amountElement) amountElement.textContent = '';
            button.classList.add('state-cancel');
            if (wrapper) wrapper.classList.add('state-cancel');
        } else if (state === 'cashout') {
            if (textElement) textElement.textContent = 'Cash Out';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-cashout');
            if (wrapper) wrapper.classList.add('state-cashout');
        }
    }
    
    getButton(color) {
        return color === 'blue' 
            ? document.querySelector('.div-4:first-child .bet-button')
            : document.querySelector('.div-4:last-child .cash-out-button');
    }
    
    getButtonWrapper(color) {
        return color === 'blue'
            ? document.querySelector('.div-4:first-child .div-wrapper-3')
            : document.querySelector('.div-4:last-child .div-wrapper-3');
    }

    startRace() {
        this.gameState = 'racing';
        this.raceStartTime = Date.now();
        this.startTime = this.raceStartTime;
        this.racePhaseEndTime = this.raceStartTime + 8000;
        this.gameEnded = false;
        this.blueEscaped = false;
        this.orangeEscaped = false;
        this.escapeTextShown = false;
        this.blueDetained = false;
        this.orangeDetained = false;
        this.lastMultiplierUpdate = 0;
        
        // Use cached elements
        if (this.raceArea) {
            this.raceArea.classList.remove('countdown-mode');
            this.raceArea.classList.add('game-active');
        }
        
        if (this.roadLinesContainer) {
            this.roadLinesContainer.classList.add('visible');
        }
        
        // Reset positions and set initial multipliers
        this.bluePosition = 0;
        this.orangePosition = 0;
        
        // Сразу сбрасываем позиции машин в DOM чтобы избежать дергания
        if (this.blueCar) {
            this.blueCar.style.transform = 'translate3d(0, 0px, 0)';
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = 'translate3d(0, 0px, 0)';
        }
        
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        // Рандомные иксы для обеих машин (2.0 - 8.0)
        this.blueTargetMultiplier = 2.0 + Math.random() * 6.0;
        this.orangeTargetMultiplier = 2.0 + Math.random() * 6.0;
        
        // Убедимся что иксы разные (минимум 0.3 разницы)
        while (Math.abs(this.blueTargetMultiplier - this.orangeTargetMultiplier) < 0.3) {
            this.orangeTargetMultiplier = 2.0 + Math.random() * 6.0;
        }
        
        // Определяем кто будет задержан
        // 98.5% - одна машина, 1.5% - обе машины
        const bothDetained = Math.random() < 0.015;
        
        if (bothDetained) {
            this.delayedCar = 'both';
            console.log('🚔🚔 Обе машины будут задержаны!');
        } else {
            // Задерживаем ту, у которой меньше множитель
            this.delayedCar = this.blueTargetMultiplier < this.orangeTargetMultiplier ? 'blue' : 'orange';
        }
        
        console.log(`🎲 Blue target: x${this.blueTargetMultiplier.toFixed(2)}, Orange target: x${this.orangeTargetMultiplier.toFixed(2)}`);
        console.log(`🚔 Delayed car: ${this.delayedCar}`);
        
        // Обновляем кнопки на Cash Out если ставки размещены (disabled = false, так как в начале гонки машины еще не задержаны)
        // Если нет ставки - кнопка становится disabled
        if (this.currentBlueBet) {
            this.updateBetButton('blue', 'cashout', this.currentBlueBet, false);
        } else {
            this.updateBetButton('blue', 'bet', this.blueBet, true);
        }
        if (this.currentOrangeBet) {
            this.updateBetButton('orange', 'cashout', this.currentOrangeBet, false);
        } else {
            this.updateBetButton('orange', 'bet', this.orangeBet, true);
        }
        if (this.currentSingleBet) {
            this.updateSingleButton('cashout', this.currentSingleBet, false);
        } else {
            this.updateSingleButton('bet', this.singleBet, true);
        }
        
        // Останавливаем старые анимации перед запуском новых
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.roadAnimationId) {
            cancelAnimationFrame(this.roadAnimationId);
            this.roadAnimationId = null;
        }
        
        // Start animations
        this.animateRace();
        this.animateRoadLines();
    }

    animateRace() {
        if (this.gameState !== 'racing') return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        
        // Determine racing phase (first 8 seconds)
        this.racingPhase = currentTime < this.racePhaseEndTime;
        
        // Determine delayed status only AFTER racing phase ends
        const blueDelayed = !this.racingPhase && (this.delayedCar === 'blue' || this.delayedCar === 'both');
        const orangeDelayed = !this.racingPhase && (this.delayedCar === 'orange' || this.delayedCar === 'both');

        // Increment multipliers ONLY in local mode (no server)
        if (!this.gameEnded && !this.socket) {
            const baseIncrease = 0.00015 + Math.random() * 0.00025;

            // Blue множитель
            if (!blueDelayed && !this.blueEscaped && this.blueMultiplier < this.blueTargetMultiplier) {
                this.blueMultiplier += baseIncrease;
                if (this.blueMultiplier >= this.blueTargetMultiplier) {
                    this.blueMultiplier = this.blueTargetMultiplier;
                }
            }

            // Orange множитель
            if (!orangeDelayed && !this.orangeEscaped && this.orangeMultiplier < this.orangeTargetMultiplier) {
                this.orangeMultiplier += baseIncrease;
                if (this.orangeMultiplier >= this.orangeTargetMultiplier) {
                    this.orangeMultiplier = this.orangeTargetMultiplier;
                }
            }
        }
        
        // Throttle updates - only update every 50ms for better performance
        if (currentTime - this.lastMultiplierUpdate >= this.multiplierUpdateInterval) {
            this.updateMultiplierDisplays();
            this.updateLiveWinnings();
            this.checkAutoCashOut();
            this.lastMultiplierUpdate = currentTime;
        }
        
        // Движение машин - упрощенная формула для мобильных
        if (this.isMobile) {
            // Упрощенная анимация для мобильных (только 2 sin вместо 6)
            const t = elapsed * 0.001;
            
            // Blue car movement
            if (this.blueEscaped) {
                this.bluePosition -= 8;
            } else if (this.blueDetained) {
                this.bluePosition += 5;
            } else {
                const blueTarget = Math.sin(t) * 30;
                this.bluePosition += (blueTarget - this.bluePosition) * 0.06;
            }
            
            // Orange car movement
            if (this.orangeEscaped) {
                this.orangePosition -= 8;
            } else if (this.orangeDetained) {
                this.orangePosition += 5;
            } else {
                const orangeTarget = Math.sin(t * 1.2) * 30;
                this.orangePosition += (orangeTarget - this.orangePosition) * 0.06;
            }
        } else {
            // Полная анимация для десктопа
            const t1 = elapsed * 0.0008;
            const t2 = elapsed * 0.0013;
            const t3 = elapsed * 0.0019;
            const t4 = elapsed * 0.0011;
            const t5 = elapsed * 0.0017;
            const t6 = elapsed * 0.0023;
            
            // Blue car movement
            if (this.blueEscaped) {
                this.bluePosition -= 8;
            } else if (this.blueDetained) {
                this.bluePosition += 5;
            } else {
                const blueTarget = Math.sin(t1) * 25 + Math.cos(t2) * 15 + Math.sin(t3) * 10;
                this.bluePosition += (blueTarget - this.bluePosition) * 0.04;
            }
            
            // Orange car movement
            if (this.orangeEscaped) {
                this.orangePosition -= 8;
            } else if (this.orangeDetained) {
                this.orangePosition += 5;
            } else {
                const orangeTarget = Math.sin(t4) * 20 + Math.cos(t5) * 18 + Math.sin(t6) * 12;
                this.orangePosition += (orangeTarget - this.orangePosition) * 0.04;
            }
        }
        
        // Use GPU-accelerated transforms with translate3d
        if (this.blueCar) {
            this.blueCar.style.transform = `translate3d(0, ${this.bluePosition}px, 0)`;
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = `translate3d(0, ${this.orangePosition}px, 0)`;
        }
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animateRace());
    }

    showCrashIcon(color, carPosition) {
        // Show crash icon only once per car
        const iconId = `crash-icon-${color}`;
        if (document.getElementById(iconId)) return;
        
        const icon = document.createElement('div');
        icon.id = iconId;
        icon.className = 'crash-icon';
        const leftPosition = color === 'blue' ? '25%' : '75%';
        // Фиксированная высота для всех иконок задержания
        icon.style.cssText = `
            position: absolute;
            top: 60%;
            left: ${leftPosition};
            transform: translate(-50%, -50%);
            z-index: 50;
            text-align: center;
        `;
        
        const img = document.createElement('img');
        img.src = color === 'blue'
            ? 'https://github.com/Pacific1a/img/blob/main/speedcash/blue.webp?raw=true'
            : 'https://github.com/Pacific1a/img/blob/main/speedcash/orange.webp?raw=true';
        img.style.cssText = `
            width: 60px;
            height: 60px;
            border-radius: 8px;
        `;
        
        const text = document.createElement('div');
        text.textContent = 'Задержан';
        text.style.cssText = `
            color: ${color === 'blue' ? '#244eb6' : '#c44c13'};
            font-family: 'Montserrat', Helvetica;
            font-weight: 600;
            font-size: 14px;
            margin-top: 5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        `;
        
        icon.appendChild(img);
        icon.appendChild(text);
        document.querySelector('.game').appendChild(icon);
    }
    
    

    
    
    showEscapeText(color) {
        // Проверяем что хотя бы одна машина уехала
        if (this.delayedCar === 'both') {
            // Если обе задержаны - показываем специальный экран
            console.log('🚫 Обе машины задержаны - игра заканчивается');
            this.showBothDetainedScreen();
            return;
        }
        
        const escapeElement = document.createElement('div');
        escapeElement.className = 'escape-text';
        escapeElement.textContent = 'УЕХАЛ!';
        
        // Position based on which car escaped
        if (color === 'blue') {
            escapeElement.style.left = '25%'; // Left side for blue car
        } else {
            escapeElement.style.left = '75%'; // Right side for orange car
        }
        
        document.querySelector('.race').appendChild(escapeElement);
        
        // Show the text
        setTimeout(() => {
            escapeElement.classList.add('show');
        }, 100);
        
        // Remove after 1.5 seconds and show DROVE AWAY screen
        setTimeout(() => {
            if (escapeElement.parentNode) {
                escapeElement.parentNode.removeChild(escapeElement);
            }
            this.showDroveAwayScreen();
        }, 1500);
    }

    showBothDetainedScreen() {
        // Экран когда обе машины задержаны
        const detainedScreen = document.createElement('div');
        detainedScreen.className = 'drove-away-screen';
        detainedScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, rgb(0, 0, 0) 0%, rgb(15.3, 15.3, 15.3) 100%);
            z-index: 200;
        `;
        
        const detainedText = document.createElement('div');
        detainedText.textContent = 'BOTH DETAINED';
        detainedText.style.cssText = `
            font-size: 17px;
            font-weight: 600;
            color: #ff6b6b;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: droveAwayPulse 1s ease-in-out;
        `;
        
        detainedScreen.appendChild(detainedText);
        document.querySelector('.race').appendChild(detainedScreen);
        
        // Сбрасываем все кнопки в Bet
        this.currentBlueBet = null;
        this.currentOrangeBet = null;
        this.currentSingleBet = null;
        this.updateBetButton('blue', 'bet', this.blueBet);
        this.updateBetButton('orange', 'bet', this.orangeBet);
        this.updateSingleButton('bet', this.singleBet);
        
        // Удаляем через 1.5 секунды и заканчиваем игру
        setTimeout(() => {
            if (detainedScreen.parentNode) {
                detainedScreen.parentNode.removeChild(detainedScreen);
            }
            this.endGame();
        }, 1500);
    }

    showDroveAwayScreen() {
        // Создаем экран DROVE AWAY (как waiting screen)
        const droveAwayScreen = document.createElement('div');
        droveAwayScreen.className = 'drove-away-screen';
        droveAwayScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, rgb(0, 0, 0) 0%, rgb(15.3, 15.3, 15.3) 100%);
            z-index: 200;
        `;
        
        const droveAwayText = document.createElement('div');
        droveAwayText.textContent = 'DROVE AWAY';
        droveAwayText.style.cssText = `
            font-size: 17px;
            font-weight: 600;
            color: white;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: droveAwayPulse 1s ease-in-out;
        `;
        
        droveAwayScreen.appendChild(droveAwayText);
        document.querySelector('.race').appendChild(droveAwayScreen);
        
        // Добавляем CSS анимацию
        if (!document.getElementById('droveAwayAnimation')) {
            const style = document.createElement('style');
            style.id = 'droveAwayAnimation';
            style.textContent = `
                @keyframes droveAwayPulse {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Удаляем через 1 секунду и заканчиваем игру
        setTimeout(() => {
            if (droveAwayScreen.parentNode) {
                droveAwayScreen.parentNode.removeChild(droveAwayScreen);
            }
            this.endGame();
        }, 1000);
    }

    endGame() {
        this.gameState = 'finished';
        this.gameEnded = true;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.roadAnimationId) {
            cancelAnimationFrame(this.roadAnimationId);
        }
        
        // Start smooth transition after escape text is shown
        setTimeout(() => {
            this.startTransition();
        }, 2000);
    }
    
    startTransition() {
        // Добавляем результат в историю (используем сохраненные финальные значения)
        this.addToHistory(this.finalBlueMultiplier || this.blueMultiplier, this.finalOrangeMultiplier || this.orangeMultiplier);
        
        // Calculate winnings (используем финальные множители)
        let winnings = 0;
        if (this.currentBlueBet && this.blueEscaped) {
            winnings += this.currentBlueBet * (this.finalBlueMultiplier || this.blueMultiplier);
        }
        if (this.currentOrangeBet && this.orangeEscaped) {
            winnings += this.currentOrangeBet * (this.finalOrangeMultiplier || this.orangeMultiplier);
        }
        
        // Выплачиваем выигрыш через глобальный баланс
        if (winnings > 0 && window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winnings, 'chips');
            console.log(`Выплачен выигрыш: ${winnings} чипов`);
        }
        
        // Проверяем Single mode выигрыш (используем финальные множители)
        if (this.currentSingleBet) {
            const selectedCarEscaped = (this.singleSelectedCar === 'blue' && this.blueEscaped) || 
                                       (this.singleSelectedCar === 'orange' && this.orangeEscaped);
            
            if (selectedCarEscaped) {
                const multiplier = this.singleSelectedCar === 'blue' ? 
                    (this.finalBlueMultiplier || this.blueMultiplier) : 
                    (this.finalOrangeMultiplier || this.orangeMultiplier);
                const singleWinnings = Math.floor(this.currentSingleBet * multiplier * 1.5);
                if (window.GameBalanceAPI) {
                    window.GameBalanceAPI.payWinningsAndUpdate(singleWinnings, 'chips');
                    console.log(`🎯 Single выигрыш: ${singleWinnings} chips (x${multiplier.toFixed(2)} × 1.5)`);
                }
            } else {
                console.log(`❌ Single ставка проиграна`);
            }
        }
        
        // Reset bets
        this.currentBlueBet = null;
        this.currentOrangeBet = null;
        this.currentSingleBet = null;
        
        // Reset bet buttons
        this.updateBetButton('blue', 'bet', this.blueBet);
        this.updateBetButton('orange', 'bet', this.orangeBet);
        this.updateSingleButton('bet', this.singleBet);
        
        // Reset multipliers
        this.blueMultiplier = 1.00;
        this.orangeMultiplier = 1.00;
        this.updateMultiplierDisplays();
        
        // Reset car positions СРАЗУ
        if (this.blueCar) {
            this.blueCar.style.transform = 'translateY(0px)';
        }
        if (this.orangeCar) {
            this.orangeCar.style.transform = 'translateY(0px)';
        }
        
        // Clear any crash icons СРАЗУ
        const existingIcons = document.querySelectorAll('.crash-icon');
        existingIcons.forEach(icon => icon.remove());
        
        // СРАЗУ скрываем игровые элементы и показываем countdown
        const raceArea = document.querySelector('.race');
        if (raceArea) {
            raceArea.classList.remove('game-active');
            raceArea.classList.add('countdown-mode');
        }
        
        const roadLines = document.getElementById('roadLines');
        if (roadLines) {
            roadLines.classList.remove('visible');
        }
        
        // Запускаем новую фазу betting БЕЗ задержки
        this.startBettingPhase();
    }

    updateMultiplierDisplays() {
        if (this.blueMultiplierDisplay && this.blueMultiplier !== undefined) {
            this.blueMultiplierDisplay.textContent = `x${this.blueMultiplier.toFixed(2)}`;
        }
        if (this.orangeMultiplierDisplay && this.orangeMultiplier !== undefined) {
            this.orangeMultiplierDisplay.textContent = `x${this.orangeMultiplier.toFixed(2)}`;
        }
    }

    updateLiveWinnings() {
        // Blue live winnings
        if (this.currentBlueBet && this.gameState === 'racing' && this.blueMultiplier !== undefined) {
            const blueWinnings = Math.floor(this.currentBlueBet * this.blueMultiplier);
            const blueDisabled = this.blueDetained || this.blueEscaped;
            this.updateBetButton('blue', 'cashout', blueWinnings, blueDisabled);
        }
        
        // Orange live winnings
        if (this.currentOrangeBet && this.gameState === 'racing' && this.orangeMultiplier !== undefined) {
            const orangeWinnings = Math.floor(this.currentOrangeBet * this.orangeMultiplier);
            const orangeDisabled = this.orangeDetained || this.orangeEscaped;
            this.updateBetButton('orange', 'cashout', orangeWinnings, orangeDisabled);
        }
        
        // Single live winnings
        if (this.currentSingleBet && this.gameState === 'racing') {
            const multiplier = this.singleSelectedCar === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
            if (multiplier !== undefined) {
                const singleWinnings = Math.floor(this.currentSingleBet * multiplier * 1.5);
                const singleDisabled = (this.singleSelectedCar === 'blue' && (this.blueDetained || this.blueEscaped)) || 
                                       (this.singleSelectedCar === 'orange' && (this.orangeDetained || this.orangeEscaped));
                this.updateSingleButton('cashout', singleWinnings, singleDisabled);
            }
        }
    }

    checkAutoCashOut() {
        // Blue auto cash out
        if (this.currentBlueBet && this.blueAutoCashOutEnabled && this.blueMultiplier !== undefined && !this.blueDetained) {
            if (this.blueMultiplier >= this.blueAutoCashOutMultiplier) {
                this.cashOut('blue');
                console.log(`🤖 Blue Auto Cash Out at x${this.blueMultiplier.toFixed(2)}`);
            }
        }
        
        // Orange auto cash out
        if (this.currentOrangeBet && this.orangeAutoCashOutEnabled && this.orangeMultiplier !== undefined && !this.orangeDetained) {
            if (this.orangeMultiplier >= this.orangeAutoCashOutMultiplier) {
                this.cashOut('orange');
                console.log(`🤖 Orange Auto Cash Out at x${this.orangeMultiplier.toFixed(2)}`);
            }
        }
    }

    showCountdown() {
        // Countdown is handled by the waiting-circle HTML elements
        console.log('Countdown started');
    }
    
    updateCountdown() {
        // Use cached element
        if (this.countdownText) {
            this.countdownText.textContent = this.bettingTimeLeft;
        }
    }
    
    hideCountdown() {
        const countdownText = document.querySelector('.countdown-text');
        const countdownLabel = document.querySelector('.countdown-label');
        if (countdownText && countdownLabel) {
            countdownText.textContent = 'GO!';
            countdownLabel.textContent = 'ПОЕХАЛИ';
        }
    }

    adjustBetAmount(color, action) {
        // Single mode
        if (color === 'single') {
            if (this.gameState !== 'betting') return;
            
            if (action === 'half') {
                this.singleBet = Math.max(10, Math.floor(this.singleBet / 2));
            } else if (action === 'double') {
                this.singleBet = this.singleBet * 2;
            } else {
                this.singleBet = Math.max(10, this.singleBet + action);
            }
            
            const singleAmountDisplay = document.querySelector('.who-is-win .text-wrapper-13');
            if (singleAmountDisplay) {
                singleAmountDisplay.textContent = this.singleBet;
            }
            
            if (!this.currentSingleBet) {
                this.updateSingleButton('bet', this.singleBet);
            }
            return;
        }
        
        // Разрешаем изменять ставку только во время betting
        if (this.gameState !== 'betting') return;
        
        if (color === 'blue') {
            if (action === 'half') {
                this.blueBet = Math.max(10, Math.floor(this.blueBet / 2));
            } else if (action === 'double') {
                this.blueBet = this.blueBet * 2;
            } else {
                this.blueBet = Math.max(10, this.blueBet + action);
            }
            if (this.blueBetAmount) {
                this.blueBetAmount.textContent = this.blueBet;
            }
            // Обновляем сумму в кнопке если нет активной ставки
            if (!this.currentBlueBet) {
                this.updateBetButton('blue', 'bet', this.blueBet);
            }
        } else if (color === 'orange') {
            if (action === 'half') {
                this.orangeBet = Math.max(10, Math.floor(this.orangeBet / 2));
            } else if (action === 'double') {
                this.orangeBet = this.orangeBet * 2;
            } else {
                this.orangeBet = Math.max(10, this.orangeBet + action);
            }
            if (this.orangeBetAmount) {
                this.orangeBetAmount.textContent = this.orangeBet;
            }
            // Обновляем сумму в кнопке если нет активной ставки
            if (!this.currentOrangeBet) {
                this.updateBetButton('orange', 'bet', this.orangeBet);
            }
        }
    }

    placeSingleBet() {
        // Во время betting фазы
        if (this.gameState === 'betting') {
            if (this.currentSingleBet) {
                // Отменяем ставку (Cancel)
                this.cancelSingleBet();
            } else {
                // Ставим новую ставку
                if (!window.GameBalanceAPI || !window.GameBalanceAPI.canPlaceBet(this.singleBet, 'chips')) {
                    this.showNotification('Недостаточно средств');
                    return;
                }
                const success = window.GameBalanceAPI.placeBet(this.singleBet, 'chips');
                if (success) {
                    this.currentSingleBet = this.singleBet;
                    this.updateSingleButton('cancel', this.singleBet);
                    console.log(`✅ Single ставка ${this.singleBet} чипов на ${this.singleSelectedCar} принята`);
                    
                    // Отправляем на сервер
                    if (this.socket) {
                        this.socket.emit('speedcash_place_bet', {
                            color: this.singleSelectedCar,
                            amount: this.singleBet,
                            mode: 'single',
                            multiplier: this.singleSelectedCar === 'blue' ? this.blueMultiplier : this.orangeMultiplier
                        });
                    }
                }
            }
            return;
        }
        
        // Во время racing фазы
        if (this.gameState === 'racing') {
            if (this.currentSingleBet) {
                // Проверяем не задержана ли выбранная машина
                const isDetained = (this.singleSelectedCar === 'blue' && this.blueDetained) || 
                                   (this.singleSelectedCar === 'orange' && this.orangeDetained);
                if (isDetained) {
                    // Кнопка уже disabled, ничего не делаем
                    return;
                }
                // Cash Out для Single mode
                this.cashOutSingle();
            }
            // Нет ставки во время racing - ничего не делаем (кнопка disabled)
            return;
        }
    }

    cashOutSingle() {
        if (!this.currentSingleBet) return;
        
        const multiplier = this.singleSelectedCar === 'blue' ? this.blueMultiplier : this.orangeMultiplier;
        const winnings = Math.floor(this.currentSingleBet * multiplier * 1.5);
        
        // Выплачиваем выигрыш
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(winnings, 'chips');
        }
        
        this.currentSingleBet = null;
        this.updateSingleButton('bet', this.singleBet);
        console.log(`💰 Single Cash Out: ${winnings} chips (x${multiplier.toFixed(2)} × 1.5)`);
        
        // Отправляем на сервер
        if (this.socket) {
            this.socket.emit('speedcash_cashout', {
                color: this.singleSelectedCar,
                multiplier: multiplier,
                winnings: winnings,
                mode: 'single'
            });
        }
    }

    cancelSingleBet() {
        if (!this.currentSingleBet) return;
        if (window.GameBalanceAPI) {
            window.GameBalanceAPI.payWinningsAndUpdate(this.currentSingleBet, 'chips');
        }
        this.currentSingleBet = null;
        this.updateSingleButton('bet', this.singleBet);
        console.log(`❌ Single ставка отменена`);
    }



    updateSingleButton(state, amount, disabled = false) {
        const button = document.querySelector('.who-is-win .bet-button');
        if (!button) return;
        
        const textElement = button.querySelector('.text-wrapper-9');
        const amountElement = button.querySelector('.text-wrapper-10');
        
        button.classList.remove('state-bet', 'state-cancel', 'state-cashout', 'disabled');
        
        // Устанавливаем disabled если нужно
        if (disabled) {
            button.classList.add('disabled');
            button.style.opacity = '0.5';
            button.style.pointerEvents = 'none';
        } else {
            button.style.opacity = '';
            button.style.pointerEvents = '';
        }
        
        if (state === 'bet') {
            if (textElement) textElement.textContent = 'Bet';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-bet');
        } else if (state === 'cancel') {
            if (textElement) textElement.textContent = 'Cancel';
            if (amountElement) amountElement.textContent = '';
            button.classList.add('state-cancel');
        } else if (state === 'cashout') {
            if (textElement) textElement.textContent = 'Cash Out';
            if (amountElement) amountElement.textContent = `${amount} Chips`;
            button.classList.add('state-cashout');
        }
    }

    selectSingleCar(car) {
        this.singleSelectedCar = car;
        const blueTab = document.querySelector('.who-is-win .plays .div-wrapper-2:first-child');
        const orangeTab = document.querySelector('.who-is-win .plays .div-wrapper-2:last-child');
        
        if (car === 'blue') {
            if (blueTab) blueTab.innerHTML = '<div class="selected"><div class="text-wrapper-6">Blue</div></div>';
            if (orangeTab) orangeTab.innerHTML = '<div class="not-selected"><div class="text-wrapper-6">Orange</div></div>';
        } else {
            if (blueTab) blueTab.innerHTML = '<div class="not-selected"><div class="text-wrapper-6">Blue</div></div>';
            if (orangeTab) orangeTab.innerHTML = '<div class="selected"><div class="text-wrapper-6">Orange</div></div>';
        }
        console.log(`🎯 Выбрана машина: ${car}`);
    }

    addToHistory(blueMultiplier, orangeMultiplier) {
        const streak = document.querySelector('.streak');
        if (!streak) return;
        
        // Создаем новый элемент истории
        const historyItem = document.createElement('div');
        historyItem.className = 'div-5';
        historyItem.innerHTML = `
            <div class="text-wrapper-15" style="color: #244eb6;">x${blueMultiplier.toFixed(2)}</div>
            <div class="text-wrapper-16" style="color: #c44c14;">x${orangeMultiplier.toFixed(2)}</div>
        `;
        
        // Добавляем в начало
        streak.insertBefore(historyItem, streak.firstChild);
        
        // Оставляем только последние 10 результатов
        while (streak.children.length > 10) {
            streak.removeChild(streak.lastChild);
        }
    }
}

// Global game object
let gameInstance = null;

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    gameInstance = new SpeedCashGame();
    
    // Setup mode switching and auto cash out
    setupModeSwitching();
    setupAutoCashOut();
});

// Переключение режимов Crash / Single
function setupModeSwitching() {
    const crashTab = document.querySelector('.crash-section-2 .div-wrapper-2:first-child');
    const singleTab = document.querySelector('.crash-section-2 .div-wrapper-2:last-child');
    const betsContainer = document.querySelector('.bets');
    const whoIsWinContainer = document.querySelector('.who-is-win');
    
    if (!crashTab || !singleTab) return;
    
    // Crash mode (по умолчанию)
    crashTab.addEventListener('click', () => {
        // Стили для Crash (selected)
        crashTab.innerHTML = '<div class="selected"><div class="text-wrapper-6">Crash</div></div>';
        // Стили для Single (not-selected)
        singleTab.innerHTML = '<div class="not-selected"><img class="vector" src="https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/speedcash/vector.svg" /></div>';
        
        // Показываем bets, скрываем who-is-win
        if (betsContainer) betsContainer.style.display = 'flex';
        if (whoIsWinContainer) whoIsWinContainer.style.display = 'none';
    });
    
    // Single mode
    singleTab.addEventListener('click', () => {
        // Стили для Single (selected)
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'selected';
        selectedDiv.style.borderRadius = '13.5px';
        selectedDiv.style.background = 'linear-gradient(90deg, rgba(35, 35, 35, 1) 0%, rgba(46, 46, 46, 1) 100%)';
        selectedDiv.innerHTML = '<img class="vector" src="https://raw.githubusercontent.com/Pacific1a/img/6768186bd224ed8383ca478d1363a8b40b694805/speedcash/vector.svg" style="filter: brightness(1.5);" />';
        singleTab.innerHTML = '';
        singleTab.appendChild(selectedDiv);
        
        // Стили для Crash (not-selected)
        crashTab.innerHTML = '<div class="not-selected"><div class="text-wrapper-6">Crash</div></div>';
        
        // Скрываем bets, показываем who-is-win
        if (betsContainer) betsContainer.style.display = 'none';
        if (whoIsWinContainer) whoIsWinContainer.style.display = 'flex';
    });
}

// Настройка автокешаута
function setupAutoCashOut() {
    setupAutoCashOutForColor('blue');
    setupAutoCashOutForColor('orange');
}

function setupAutoCashOutForColor(color) {
    const selector = color === 'blue' 
        ? '.div-4:first-child' 
        : '.div-4:last-child';
    
    const container = document.querySelector(selector);
    if (!container) return;
    
    const toggleBtn = container.querySelector('.div-6');
    const multiplierInput = container.querySelector('.text-wrapper-12');
    
    if (!toggleBtn || !multiplierInput) return;
    
    // Изначально выключен
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'pointer';
    let isEnabled = false;
    
    // Переключение вкл/выкл
    toggleBtn.addEventListener('click', () => {
        isEnabled = !isEnabled;
        toggleBtn.style.opacity = isEnabled ? '1' : '0.5';
        
        if (gameInstance) {
            if (color === 'blue') {
                gameInstance.blueAutoCashOutEnabled = isEnabled;
            } else {
                gameInstance.orangeAutoCashOutEnabled = isEnabled;
            }
        }
        
        console.log(`${color} Auto Cash Out: ${isEnabled ? 'ON' : 'OFF'}`);
    });
    
    // Редактирование множителя
    multiplierInput.contentEditable = 'true';
    multiplierInput.style.cursor = 'text';
    
    multiplierInput.addEventListener('focus', (e) => {
        const text = e.target.textContent;
        if (text.startsWith('x')) {
            e.target.textContent = text.substring(1);
        }
        // Выделяем весь текст
        const range = document.createRange();
        range.selectNodeContents(e.target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });
    
    multiplierInput.addEventListener('blur', (e) => {
        let value = parseFloat(e.target.textContent.replace(/[^0-9.]/g, ''));
        if (isNaN(value) || value < 1.01) value = 2.00;
        e.target.textContent = `x${value.toFixed(2)}`;
        
        if (gameInstance) {
            if (color === 'blue') {
                gameInstance.blueAutoCashOutMultiplier = value;
            } else {
                gameInstance.orangeAutoCashOutMultiplier = value;
            }
        }
    });
    
    multiplierInput.addEventListener('keydown', (e) => {
        const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
        if (!allowed.includes(e.key)) {
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });
    
    multiplierInput.addEventListener('input', (e) => {
        // Запрещаем удалять 'x' в начале
        const text = e.target.textContent;
        if (!text.startsWith('x') && !e.target.matches(':focus')) {
            e.target.textContent = 'x' + text.replace(/[^0-9.]/g, '');
        }
    });
}


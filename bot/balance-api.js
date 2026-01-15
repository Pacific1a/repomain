// ============================================
// ЕДИНЫЙ API БАЛАНСА - работает ТОЛЬКО через сервер
// ============================================
(function() {
    'use strict';
    
    // Автоматически определяем URL сервера (используем config.js)
    const SERVER_URL = window.GAME_SERVER_URL || window.location.origin;
    
    class BalanceAPI {
        constructor() {
            this.telegramId = null;
            this.balance = { rubles: 0, chips: 0 };
            this.socket = null;
            this.isReady = false;
            this.updateCallbacks = [];
            this.init();
        }
        
        async init() {
            console.log('💰 Balance API initializing...');
            
            // Получаем реальный Telegram ID
            this.telegramId = this.getTelegramId();
            if (!this.telegramId) {
                console.error('❌ No Telegram ID found');
                return;
            }
            
            console.log(`✅ Telegram ID: ${this.telegramId}`);
            
            // Загружаем баланс с сервера
            await this.loadBalance();
            
            // Подключаем WebSocket для обновлений в реальном времени
            this.connectWebSocket();
            
            // ⚠️ ОТКЛЮЧЕНА автоперезагрузка - полагаемся на WebSocket
            // Раньше: setInterval(() => this.loadBalance(), 30000);
            // Проблема: перезагрузка могла "восстанавливать" баланс после списания
            
            this.isReady = true;
            console.log('✅ Balance API ready (WebSocket mode)');
        }
        
        getTelegramId() {
            // Приоритет 1: Реальный Telegram WebApp
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
            }
            
            // Приоритет 2: Из URL параметров (для тестирования в браузере)
            const urlParams = new URLSearchParams(window.location.search);
            const urlTgId = urlParams.get('tgId') || urlParams.get('telegram_id');
            if (urlTgId) {
                console.log('🔧 Using Telegram ID from URL:', urlTgId);
                return urlTgId;
            }
            
            // Приоритет 3: Из localStorage (если был сохранен ранее)
            const savedId = localStorage.getItem('telegram_id');
            if (savedId && savedId !== 'test_m3xabw0pr' && !savedId.startsWith('test_')) {
                console.log('💾 Using saved Telegram ID:', savedId);
                return savedId;
            }
            
            // Для разработки - используем дефолтный ID
            console.warn('⚠️ No real Telegram ID found, using default for testing');
            return '1889923046'; // Дефолтный ID для тестирования
        }
        
        async loadBalance() {
            try {
                console.log(`🔄 Загрузка баланса с сервера для ${this.telegramId}...`);
                const response = await fetch(`${SERVER_URL}/api/balance/${this.telegramId}`);
                console.log(`📡 Ответ сервера: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📦 Данные с сервера:', data);
                    
                    this.balance = {
                        rubles: parseFloat(data.rubles) || 0,
                        chips: parseInt(data.chips) || 0
                    };
                    this.updateVisual();
                    this.notifyCallbacks();
                    console.log('💰 Balance loaded from server:', this.balance);
                    return true;
                } else {
                    console.warn(`⚠️ Сервер вернул статус ${response.status}`);
                }
            } catch (error) {
                console.error('❌ Error loading balance:', error);
            }
            return false;
        }
        
        async setBalance(rubles, chips) {
            // УСТАНАВЛИВАЕМ баланс (для внутреннего использования)
            try {
                const response = await fetch(`${SERVER_URL}/api/balance/${this.telegramId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rubles: rubles !== undefined ? rubles : this.balance.rubles,
                        chips: chips !== undefined ? chips : this.balance.chips
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.balance = {
                        rubles: parseFloat(data.rubles || data.balance || data.newBalance) || 0,
                        chips: parseInt(data.chips || data.newChips) || 0
                    };
                    this.updateVisual();
                    this.notifyCallbacks();
                    console.log('✅ Balance SET on server:', this.balance);
                    return true;
                }
            } catch (error) {
                console.error('❌ Error setting balance:', error);
            }
            return false;
        }
        
        async addMoney(rubles = 0, chips = 0, source = 'system', description = '') {
            try {
                const response = await fetch(`${SERVER_URL}/api/balance/${this.telegramId}/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rubles, chips })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.balance = {
                        rubles: parseFloat(data.rubles || data.balance || data.newBalance) || 0,
                        chips: parseInt(data.chips || data.newChips) || 0
                    };
                    this.updateVisual();
                    this.notifyCallbacks();
                    
                    // Сохраняем транзакцию
                    if (rubles > 0) {
                        await this.saveTransaction('add', rubles, source, description || `Пополнение ${rubles}₽`);
                    }
                    if (chips > 0) {
                        await this.saveTransaction('add', chips, source, description || `Пополнение ${chips} chips`);
                    }
                    
                    console.log(`➕ Added ${rubles}₽, ${chips} chips. New balance:`, this.balance);
                    return true;
                }
            } catch (error) {
                console.error('❌ Error adding money:', error);
            }
            return false;
        }
        
        async saveTransaction(type, amount, source = 'system', description = '') {
            try {
                await fetch(`${SERVER_URL}/api/transactions/${this.telegramId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        amount,
                        source,
                        description
                    })
                });
            } catch (error) {
                console.error('❌ Error saving transaction:', error);
            }
        }
        
        async subtractRubles(amount, source = 'game', description = '', gameType = null) {
            if (this.balance.rubles < amount) {
                console.warn('⚠️ Insufficient balance');
                return false;
            }
            
            // ВСЕГДА используем /subtract эндпоинт
            try {
                const response = await fetch(`${SERVER_URL}/api/balance/${this.telegramId}/subtract`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        rubles: amount, 
                        gameType: gameType || 'unknown',
                        reason: description || source
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.balance = {
                        rubles: parseFloat(data.rubles || data.balance || data.newBalance) || 0,
                        chips: parseInt(data.chips || data.newChips) || 0
                    };
                    this.updateVisual();
                    this.notifyCallbacks();
                    console.log(`➖ Subtracted: ${amount}₽ in ${gameType || 'game'}`);
                    console.log(`💰 New balance: ${this.balance.rubles}₽, ${this.balance.chips} chips`);
                    await this.saveTransaction('subtract', amount, source, description || `Списание ${amount}₽ в ${gameType || 'игре'}`);
                    return true;
                }
            } catch (error) {
                console.error('❌ Error subtracting balance:', error);
            }
            
            return false;
        }
        
        async subtractChips(amount, source = 'game', description = '') {
            if (this.balance.chips < amount) {
                console.warn('⚠️ Insufficient chips');
                return false;
            }
            
            // Используем /subtract эндпоинт для chips
            try {
                const response = await fetch(`${SERVER_URL}/api/balance/${this.telegramId}/subtract`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chips: amount,
                        reason: description || source
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.balance = {
                        rubles: parseFloat(data.rubles || data.balance || data.newBalance) || 0,
                        chips: parseInt(data.chips || data.newChips) || 0
                    };
                    this.updateVisual();
                    this.notifyCallbacks();
                    await this.saveTransaction('subtract', amount, source, description || `Списание ${amount} chips`);
                    return true;
                }
            } catch (error) {
                console.error('❌ Error subtracting chips:', error);
            }
            
            return false;
        }
        
        async addRubles(amount, source = 'game', description = '', isWin = false) {
            const result = await this.addMoney(amount, 0, source, description);
            // Если это выигрыш, сохраняем дополнительную транзакцию с типом 'win'
            if (result && isWin) {
                await this.saveTransaction('win', amount, source, description || `Выигрыш ${amount}₽`);
            }
            return result;
        }
        
        async addChips(amount, source = 'game', description = '', isWin = false) {
            const result = await this.addMoney(0, amount, source, description);
            // Если это выигрыш, сохраняем дополнительную транзакцию с типом 'win'
            if (result && isWin) {
                await this.saveTransaction('win', amount, source, description || `Выигрыш ${amount} chips`);
            }
            return result;
        }
        
        hasEnoughRubles(amount) {
            return this.balance.rubles >= amount;
        }
        
        hasEnoughChips(amount) {
            return this.balance.chips >= amount;
        }
        
        getBalance() {
            return { ...this.balance };
        }
        
        getRubles() {
            return this.balance.rubles;
        }
        
        getChips() {
            return this.balance.chips;
        }
        
        updateVisual() {
            // Обновляем ВСЕ элементы с балансом на странице
            
            // 1. Основной баланс (.balance-1)
            const balanceBlocks = document.querySelectorAll('.balance-1');
            balanceBlocks.forEach(block => {
                const groups = block.querySelectorAll('.group-ico-1');
                if (groups.length >= 2) {
                    // Рубли (первый блок)
                    const rublesGroup = groups[0];
                    const rublesText = rublesGroup.childNodes[0];
                    if (rublesText && rublesText.nodeType === Node.TEXT_NODE) {
                        rublesText.textContent = `${this.balance.rubles.toFixed(2)} `;
                    }
                    
                    // Фишки (второй блок)
                    const chipsGroup = groups[1];
                    const chipsSpan = chipsGroup.querySelector('span');
                    if (chipsSpan) {
                        chipsSpan.textContent = this.balance.chips.toString();
                    }
                }
            });
            
            // 2. Баланс в профиле (.text-wrapper-4)
            // НЕ обновляем .text-wrapper-4 внутри .invite-button (там реферальная ссылка)
            const profileBalances = document.querySelectorAll('.text-wrapper-4');
            profileBalances.forEach(element => {
                // Пропускаем элементы внутри invite-button
                if (!element.closest('.invite-button')) {
                    element.textContent = this.balance.rubles.toFixed(2);
                }
            });
            
            // 3. Любые другие элементы с data-balance атрибутом
            const dataBalanceElements = document.querySelectorAll('[data-balance="rubles"]');
            dataBalanceElements.forEach(element => {
                element.textContent = this.balance.rubles.toFixed(2);
            });
            
            const dataChipsElements = document.querySelectorAll('[data-balance="chips"]');
            dataChipsElements.forEach(element => {
                element.textContent = this.balance.chips.toString();
            });
            
            // Отправляем событие для других скриптов
            window.dispatchEvent(new CustomEvent('balanceUpdated', {
                detail: this.balance
            }));
        }
        
        connectWebSocket() {
            if (typeof io === 'undefined') {
                console.warn('⚠️ Socket.IO not loaded, skipping WebSocket');
                return;
            }
            
            try {
                this.socket = io(SERVER_URL, {
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionAttempts: 5
                });
                
                this.socket.on('connect', () => {
                    console.log('✅ Balance WebSocket connected');
                });
                
                // Слушаем обновления баланса для этого пользователя
                this.socket.on(`balance_updated_${this.telegramId}`, (data) => {
                    console.log('💰 Balance update received:', data);
                    this.balance = {
                        rubles: parseFloat(data.rubles) || 0,
                        chips: parseInt(data.chips) || 0
                    };
                    this.updateVisual();
                    this.notifyCallbacks();
                    
                    // Уведомление отключено
                    // if (data.transaction && data.amount > 0) {
                    //     this.showNotification(`+${data.amount}₽`);
                    // }
                });
                
                this.socket.on('disconnect', () => {
                    console.log('❌ Balance WebSocket disconnected');
                });
                
            } catch (error) {
                console.error('❌ Failed to connect WebSocket:', error);
            }
        }
        
        showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                font-size: 18px;
                font-weight: 600;
                animation: slideIn 0.5s ease-out;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideIn 0.5s ease-out reverse';
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
        
        // Подписка на обновления баланса
        onBalanceUpdate(callback) {
            this.updateCallbacks.push(callback);
        }
        
        notifyCallbacks() {
            this.updateCallbacks.forEach(callback => {
                try {
                    callback(this.balance);
                } catch (error) {
                    console.error('Error in balance callback:', error);
                }
            });
        }
    }
    
    // Создаем глобальный экземпляр
    window.BalanceAPI = new BalanceAPI();
    
    // Для обратной совместимости (старый код может использовать GlobalBalance)
    window.GlobalBalance = window.BalanceAPI;
    
    console.log('💰 Balance API loaded!');
    
})();

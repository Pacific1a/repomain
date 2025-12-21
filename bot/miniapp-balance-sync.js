// Синхронизация баланса с сервером для Mini App
(function() {
    'use strict';
    
    const SERVER_URL = window.GAME_SERVER_URL || 'https://telegram-games-plkj.onrender.com';
    
    class MiniAppBalanceSync {
        constructor() {
            this.telegramId = null;
            this.balance = { rubles: 0, chips: 0 };
            this.socket = null;
            this.init();
        }
        
        async init() {
            console.log('💰 Mini App Balance Sync initializing...');
            
            // Получаем Telegram ID
            this.telegramId = this.getTelegramId();
            if (!this.telegramId) {
                console.error('❌ No Telegram ID found');
                return;
            }
            
            console.log(`✅ Telegram ID: ${this.telegramId}`);
            
            // Загружаем начальный баланс
            await this.loadBalance();
            
            // Подключаем WebSocket для реального времени
            this.connectWebSocket();
            
            // Обновляем каждые 10 секунд
            setInterval(() => this.loadBalance(), 10000);
        }
        
        getTelegramId() {
            // Из Telegram WebApp
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
            }
            
            // Из глобального баланса
            if (window.GlobalBalance?.telegramId) {
                return window.GlobalBalance.telegramId;
            }
            
            // Для теста
            return localStorage.getItem('test_telegram_id') || '1889923046';
        }
        
        async loadBalance() {
            try {
                const response = await fetch(`${SERVER_URL}/api/balance/${this.telegramId}`);
                if (response.ok) {
                    const data = await response.json();
                    this.balance = data;
                    this.updateVisual();
                    console.log('💰 Balance loaded:', this.balance);
                    return true;
                }
            } catch (error) {
                console.error('❌ Error loading balance:', error);
            }
            return false;
        }
        
        updateVisual() {
            console.log('🔄 Updating visual balance:', this.balance);
            
            // 1. Обновляем ВСЕ блоки .balance-1
            const balanceBlocks = document.querySelectorAll('.balance-1');
            balanceBlocks.forEach(block => {
                const groups = block.querySelectorAll('.group-ico-1');
                if (groups.length >= 2) {
                    // Первый блок - рубли
                    const rublesGroup = groups[0];
                    const rublesText = rublesGroup.childNodes[0];
                    if (rublesText && rublesText.nodeType === Node.TEXT_NODE) {
                        rublesText.textContent = `${this.balance.rubles.toFixed(2)} `;
                    }
                    
                    // Второй блок - фишки
                    const chipsGroup = groups[1];
                    const chipsSpan = chipsGroup.querySelector('span');
                    if (chipsSpan) {
                        chipsSpan.textContent = this.balance.chips.toString();
                    }
                }
            });
            
            // 2. Обновляем ВСЕ .text-wrapper-4 (баланс в профиле)
            const profileBalances = document.querySelectorAll('.text-wrapper-4');
            profileBalances.forEach(element => {
                element.textContent = this.balance.rubles.toFixed(2);
            });
            
            console.log(`✅ Visual updated: ${this.balance.rubles}₽, ${this.balance.chips} chips`);
            
            // Отправляем событие для других скриптов
            window.dispatchEvent(new CustomEvent('balanceUpdated', {
                detail: this.balance
            }));
            
            // Обновляем глобальный баланс если есть
            if (window.GlobalBalance) {
                window.GlobalBalance.balance = this.balance;
                window.GlobalBalance.updateMainBalance();
            }
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
                    console.log('✅ WebSocket connected');
                });
                
                // Слушаем обновления баланса для этого пользователя
                this.socket.on(`balance_updated_${this.telegramId}`, (data) => {
                    console.log('💰 Balance update received:', data);
                    if (data.transaction) {
                        // Обновляем баланс
                        this.balance.rubles = (this.balance.rubles || 0) + data.amount;
                        this.updateVisual();
                        
                        // Уведомление отключено
                        // this.showNotification(`+${data.amount}₽`);
                        
                        // Добавляем транзакцию
                        if (window.TransactionsList) {
                            window.TransactionsList.addTransaction(data.transaction);
                        }
                    }
                });
                
                // Общие обновления баланса
                this.socket.on('balance_updated', (data) => {
                    if (data.telegramId === this.telegramId) {
                        console.log('💰 Balance update (general):', data);
                        this.loadBalance();
                    }
                });
                
                this.socket.on('disconnect', () => {
                    console.log('❌ WebSocket disconnected');
                });
                
                this.socket.on('error', (error) => {
                    console.error('❌ WebSocket error:', error);
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
                animation: slideInRight 0.5s ease-out;
            `;
            notification.textContent = message;
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideInRight 0.5s ease-out reverse';
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
    }
    
    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.MiniAppBalanceSync = new MiniAppBalanceSync();
        });
    } else {
        window.MiniAppBalanceSync = new MiniAppBalanceSync();
    }
    
    console.log('💰 Mini App Balance Sync loaded!');
})();

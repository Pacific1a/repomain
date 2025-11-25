// Система живых транзакций для профиля
(function() {
    'use strict';
    
    const SERVER_URL = window.GAME_SERVER_URL || 'https://telegram-games-plkj.onrender.com';
    
    class TransactionsList {
        constructor() {
            this.telegramId = null;
            this.transactions = [];
            this.container = null;
            this.showButton = null;
            this.isExpanded = false;
            this.init();
        }
        
        async init() {
            console.log('📜 Transactions List initializing...');
            
            // Получаем Telegram ID
            this.telegramId = this.getTelegramId();
            if (!this.telegramId) {
                console.error('❌ No Telegram ID');
                return;
            }
            
            // Ждем загрузки DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }
        
        getTelegramId() {
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
            }
            if (window.MiniAppBalanceSync?.telegramId) {
                return window.MiniAppBalanceSync.telegramId;
            }
            return localStorage.getItem('test_telegram_id') || '1889923046';
        }
        
        async setup() {
            // Находим контейнер транзакций
            this.container = document.querySelector('.transaction');
            if (!this.container) {
                console.warn('⚠️ .transaction container not found');
                return;
            }
            
            // Находим кнопку show
            this.showButton = this.container.querySelector('.show-button');
            if (this.showButton) {
                this.showButton.style.cursor = 'pointer';
                this.showButton.addEventListener('click', () => this.toggleExpand());
            }
            
            console.log('✅ Transaction container found');
            
            // Загружаем транзакции
            await this.loadTransactions();
            
            // Слушаем WebSocket обновления
            this.listenWebSocket();
        }
        
        async loadTransactions() {
            try {
                const response = await fetch(`${SERVER_URL}/api/transactions/${this.telegramId}`);
                if (response.ok) {
                    this.transactions = await response.json();
                    this.render();
                    console.log(`✅ Loaded ${this.transactions.length} transactions`);
                }
            } catch (error) {
                console.error('❌ Error loading transactions:', error);
            }
        }
        
        render() {
            if (!this.container) return;
            
            // Удаляем старые блоки .transaction-2
            const oldBlocks = this.container.querySelectorAll('.transaction-2');
            oldBlocks.forEach(block => block.remove());
            
            if (this.transactions.length === 0) {
                // Показываем сообщение о пустоте
                const emptyBlock = document.createElement('div');
                emptyBlock.className = 'transaction-2';
                emptyBlock.style.cssText = 'padding: 20px; text-align: center; opacity: 0.5;';
                emptyBlock.textContent = 'Транзакций пока нет';
                
                // Вставляем после .frame-3 если есть
                const frame = this.container.querySelector('.frame-3');
                if (frame) {
                    frame.after(emptyBlock);
                } else {
                    this.container.appendChild(emptyBlock);
                }
                
                // Скрываем кнопку
                if (this.showButton) {
                    this.showButton.style.display = 'none';
                }
                return;
            }
            
            // Сортируем по дате (новые первыми)
            const sorted = [...this.transactions].sort((a, b) => b.timestamp - a.timestamp);
            
            // Показываем только первые 3 или все
            const toShow = this.isExpanded ? sorted : sorted.slice(0, 3);
            
            // Создаем блоки
            toShow.forEach(transaction => {
                const block = this.createTransactionBlock(transaction);
                
                // Вставляем после .frame-3
                const frame = this.container.querySelector('.frame-3');
                if (frame) {
                    frame.after(block);
                } else {
                    this.container.appendChild(block);
                }
            });
            
            // Управляем кнопкой
            if (this.showButton) {
                if (this.transactions.length > 3) {
                    this.showButton.style.display = '';
                    const buttonText = this.showButton.querySelector('.text-wrapper-9');
                    if (buttonText) {
                        buttonText.textContent = this.isExpanded ? 'Show less' : 'Show available';
                    }
                } else {
                    this.showButton.style.display = 'none';
                }
            }
            
            console.log(`✅ Rendered ${toShow.length} transactions`);
        }
        
        createTransactionBlock(transaction) {
            const date = new Date(transaction.timestamp);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            const block = document.createElement('div');
            block.className = 'transaction-2';
            
            block.innerHTML = `
                <div class="div-2">
                    <div class="text-wrapper-11">${dateStr}, ${timeStr}</div>
                    <div class="text-wrapper-10">${transaction.method || 'CactusPay'}</div>
                </div>
                <div class="element-2">
                    <div class="text-wrapper-12">+${transaction.amount}₽</div>
                </div>
            `;
            
            return block;
        }
        
        toggleExpand() {
            this.isExpanded = !this.isExpanded;
            this.render();
            
            // Скроллим если расширили
            if (this.isExpanded && this.transactions.length > 3) {
                setTimeout(() => {
                    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
        
        addTransaction(transaction) {
            // Добавляем в начало списка
            this.transactions.unshift(transaction);
            this.render();
            console.log('➕ Transaction added:', transaction);
        }
        
        listenWebSocket() {
            if (typeof io === 'undefined') {
                console.warn('⚠️ Socket.IO not loaded');
                return;
            }
            
            try {
                const socket = io(SERVER_URL, {
                    transports: ['websocket', 'polling']
                });
                
                socket.on('connect', () => {
                    console.log('✅ Transactions WebSocket connected');
                });
                
                socket.on(`balance_updated_${this.telegramId}`, (data) => {
                    if (data.transaction) {
                        this.addTransaction(data.transaction);
                    }
                });
                
                socket.on('new_transaction', (data) => {
                    if (data.telegramId === this.telegramId) {
                        this.loadTransactions();
                    }
                });
            } catch (error) {
                console.error('❌ WebSocket error:', error);
            }
        }
    }
    
    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.TransactionsList = new TransactionsList();
        });
    } else {
        window.TransactionsList = new TransactionsList();
    }
    
    console.log('📜 Transactions List loaded!');
})();

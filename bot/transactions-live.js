// Динамическая система транзакций с сервера
(function() {
    'use strict';
    
    // Автоматически определяем URL сервера
    const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : (window.GAME_SERVER_URL || 'https://duopartners.xyz');
    
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
         
            
            // Ждем загрузки BalanceAPI
            await this.waitForBalanceAPI();
            
            this.telegramId = window.BalanceAPI.telegramId;
           
            
            // Ждем загрузки DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }
        
        async waitForBalanceAPI() {
            return new Promise((resolve) => {
                const check = () => {
                    if (window.BalanceAPI && window.BalanceAPI.isReady) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }
        
        async setup() {
            // Находим контейнер транзакций
            this.container = document.querySelector('.transaction');
            if (!this.container) {
                console.warn('⚠️ .transaction container not found');
                return;
            }
            
          
            
            // Удаляем статичные блоки
            const staticBlocks = this.container.querySelectorAll('.transaction-2');
            staticBlocks.forEach(block => block.remove());
          
            
            // Находим кнопку show
            this.showButton = this.container.querySelector('.show-button');
            if (this.showButton) {
                this.showButton.style.cursor = 'pointer';
                this.showButton.addEventListener('click', () => this.toggleExpand());
            }
            
            // Загружаем транзакции
            await this.loadTransactions();
            
            // Слушаем WebSocket обновления
            this.listenWebSocket();
        }
        
        async loadTransactions() {
            try {
                const response = await fetch(`${SERVER_URL}/api/transactions/${this.telegramId}?limit=20`);
                if (response.ok) {
                    const data = await response.json();
                    // Сервер возвращает { success, telegramId, transactions }
                    this.transactions = data.transactions || data || [];
                    // Сортируем по timestamp (новые первые)
                    this.transactions.sort((a, b) => b.timestamp - a.timestamp);
                    this.render();
                } else {
                    console.warn('⚠️ No transactions found');
                    this.transactions = [];
                    this.render();
                }
            } catch (error) {
                console.error('❌ Error loading transactions:', error);
                this.transactions = [];
                this.render();
            }
        }
        
        render() {
            if (!this.container) return;
            
            // Удаляем старые блоки транзакций (но НЕ .frame-3!)
            const oldBlocks = this.container.querySelectorAll('.transaction-2');
            oldBlocks.forEach(block => block.remove());
            
            if (this.transactions.length === 0) {
                // Показываем сообщение о пустоте
                const emptyBlock = document.createElement('div');
                emptyBlock.className = 'transaction-2';
                emptyBlock.style.cssText = 'padding: 15px; text-align: center; opacity: 0.7; color: #999; font-family: Montserrat, sans-serif;';
                emptyBlock.innerHTML = `
                    <div style="font-size: 14px; font-family: Montserrat, sans-serif;">История транзакций пуста</div>
                    <div style="font-size: 12px; margin-top: 5px; font-family: Montserrat, sans-serif;">Пополните баланс или сыграйте в игру</div>
                `;
                
                // Вставляем после .frame-3
                const frame = this.container.querySelector('.frame-3');
                if (frame) {
                    frame.after(emptyBlock);
                } else {
                    this.container.appendChild(emptyBlock);
                }
                
                // Скрываем кнопку show
                if (this.showButton) {
                    this.showButton.style.display = 'none';
                }
                return;
            }
            
            // Отображаем только последние 2 или все
            const visibleTransactions = this.isExpanded 
                ? this.transactions 
                : this.transactions.slice(0, 2);
            
            // Создаем блоки транзакций
            const fragment = document.createDocumentFragment();
            
            visibleTransactions.forEach(tx => {
                const block = this.createTransactionBlock(tx);
                fragment.appendChild(block);
            });
            
            // Вставляем после .frame-3
            const frame = this.container.querySelector('.frame-3');
            if (frame) {
                frame.after(fragment);
            } else {
                this.container.appendChild(fragment);
            }
            
            // Обновляем кнопку show
            if (this.showButton && this.transactions.length > 2) {
                this.showButton.style.display = 'block';
                const textElement = this.showButton.querySelector('.text-wrapper-9');
                if (textElement) {
                    textElement.textContent = this.isExpanded ? 'Show less' : 'Show more';
                }
            } else if (this.showButton) {
                this.showButton.style.display = 'none';
            }
        }
        
        createTransactionBlock(tx) {
            const block = document.createElement('div');
            block.className = 'transaction-2';
            block.dataset.transactionId = tx.id;
            
            // Определяем цвет и префикс
            let amountPrefix = '+';
            let color = '#4ade80'; // зеленый
            
            if (tx.type === 'subtract' || tx.type === 'bet') {
                amountPrefix = '-';
                color = '#ef4444'; // красный
            } else if (tx.type === 'win') {
                amountPrefix = '+';
                color = '#22c55e'; // ярко-зеленый для выигрыша
            }
            
            // Форматируем дату и время
            const date = new Date(tx.timestamp);
            const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            // Форматируем описание
            const description = tx.description || this.getDefaultDescription(tx);
            
            // Структура как в оригинальном профиле
            block.innerHTML = `
                <div class="div-2">
                    <div class="text-wrapper-10">${timeStr} ${dateStr}</div>
                    <div class="text-wrapper-11">${description}</div>
                </div>
                <div class="element-2">
                    <div class="text-wrapper-12" style="color: ${color};">
                        ${amountPrefix}${Math.abs(tx.amount).toFixed(2)}₽
                    </div>
                </div>
            `;
            
            return block;
        }
        
        getDefaultDescription(tx) {
            const sourceNames = {
                'bot': 'Telegram Bot',
                'game': 'Игра',
                'admin': 'Администратор',
                'system': 'Система',
                'case': 'Кейс',
                'crash': 'Crash',
                'roll': 'Roll',
                'blackjack': 'BlackJack',
                'mines': 'Mines',
                'speedcash': 'SpeedCASH'
            };
            
            const source = sourceNames[tx.source] || tx.source || 'Система';
            
            if (tx.type === 'add') {
                return `Пополнение • ${source}`;
            } else if (tx.type === 'subtract') {
                return `Списание • ${source}`;
            } else if (tx.type === 'win') {
                return `Выигрыш • ${source}`;
            } else if (tx.type === 'bet') {
                return `Ставка • ${source}`;
            } else {
                return source;
            }
        }
        
        toggleExpand() {
            this.isExpanded = !this.isExpanded;
            this.render();
        }
        
        addTransaction(tx) {
            // Добавляем в начало массива
            this.transactions.unshift(tx);
            
            // Оставляем только последние 20
            if (this.transactions.length > 20) {
                this.transactions = this.transactions.slice(0, 20);
            }
            
            this.render();
            
            // Уведомление отключено
            // this.showTransactionNotification(tx);
        }
        
        showTransactionNotification(tx) {
            const notification = document.createElement('div');
            const isPositive = tx.type === 'add' || tx.type === 'win';
            
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${isPositive ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
                color: white;
                padding: 15px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10001;
                font-size: 16px;
                font-weight: 600;
                animation: slideInRight 0.5s ease-out;
            `;
            
            const prefix = isPositive ? '+' : '-';
            notification.textContent = `${prefix}${Math.abs(tx.amount).toFixed(2)}₽`;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.5s';
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        }
        
        listenWebSocket() {
            if (!window.BalanceAPI?.socket) {
                console.warn('⚠️ Socket not available');
                return;
            }
            
            const socket = window.BalanceAPI.socket;
            
            // Слушаем новые транзакции
            socket.on(`transaction_added_${this.telegramId}`, (tx) => {
                
                this.addTransaction(tx);
            });
            
  
        }
    }
    
    // Создаем глобальный экземпляр
    window.TransactionsList = new TransactionsList();
    
})();

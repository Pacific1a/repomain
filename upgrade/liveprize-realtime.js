/**
 * Real-time Live Prizes - Только реальные выигрыши через WebSocket
 * Показывает только картинки призов БЕЗ ников и цен
 */

class RealtimeLivePrizes {
    constructor() {
        this.ws = null;
        this.streakContainer = null;
        this.liveContainer = null;
        this.recentWins = [];
        this.maxWins = 10; // Максимум видимых призов
        this.reconnectTimeout = null;
        this.reconnectDelay = 3000;
        this.maxReconnectAttempts = 5; // Максимум попыток переподключения
        this.reconnectAttempts = 0;
        this.isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        this.init();
    }
    
    init() {
        this.streakContainer = document.querySelector('.streak');
        if (!this.streakContainer) {
            console.warn('Live prizes container not found');
            return;
        }
        
        this.setupStyles();
        this.setupContainer();
        this.connectWebSocket();
        // Фейковые выигрыши теперь генерируются на сервере!
    }
    
    setupStyles() {
        const styleId = 'realtime-live-prizes-style';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .streak {
                position: relative;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .realtime-live-container {
                flex: 1;
                height: 60px;
                overflow: hidden;
                position: relative;
                background: transparent;
                /* Виньетка по краям */
                mask-image: linear-gradient(to right, 
                    transparent 0%, 
                    black 10%, 
                    black 90%, 
                    transparent 100%);
                -webkit-mask-image: linear-gradient(to right, 
                    transparent 0%, 
                    black 10%, 
                    black 90%, 
                    transparent 100%);
            }
            
            .live-prizes-track {
                display: flex;
                align-items: center;
                height: 100%;
                perspective: 1000px;
            }
            
            .live-prize-chip {
                flex-shrink: 0;
                width: 60px;
                height: 60px;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                animation: slideIn 0.5s ease-out;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .live-prize-chip.new {
                animation: flyFromTop 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
        
            
            .live-prize-chip img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                padding: 4px;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-30px) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }
            
            @keyframes flyFromTop {
                0% {
                    opacity: 0;
                    transform: translateY(-100px) scale(0.6);
                }
                40% {
                    opacity: 0.8;
                    transform: translateY(-10px) scale(0.95);
                }
                70% {
                    opacity: 1;
                    transform: translateY(2px) scale(1.02);
                }
                85% {
                    transform: translateY(-1px) scale(1.01);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .circle {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { 
                    opacity: 1; 
                    transform: scale(1); 
                }
                50% { 
                    opacity: 0.7; 
                    transform: scale(1.2); 
                }
            }
            
            /* Статус подключения */
            .ws-status {
                position: absolute;
                bottom: -20px;
                right: 0;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.5);
            }
            
            .ws-status.connected {
                color: #4CAF50;
            }
            
            .ws-status.disconnected {
                color: #FF5252;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupContainer() {
        // Удаляем старые элементы
        const oldPrizes = this.streakContainer.querySelectorAll('.img-2, .img-3, .smooth-conveyor-container, .realistic-live-container');
        oldPrizes.forEach(el => el.remove());
        
        // Создаем контейнер
        const liveContainer = document.createElement('div');
        liveContainer.className = 'realtime-live-container';
        
        const track = document.createElement('div');
        track.className = 'live-prizes-track';
        
        liveContainer.appendChild(track);
        
        const frameElement = this.streakContainer.querySelector('.frame');
        if (frameElement) {
            frameElement.insertAdjacentElement('afterend', liveContainer);
        } else {
            this.streakContainer.appendChild(liveContainer);
        }
        
        this.liveContainer = track;
    }
    
    connectWebSocket() {
        // Определяем URL WebSocket сервера
        let wsUrl;
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Локальная разработка - подключаемся к локальному серверу на порту 3000
            wsUrl = 'ws://localhost:3000';
            console.log('🔧 Development mode - connecting to local WebSocket server');
        } else {
            // Production - явно указываем URL Render сервера
            // Фронтенд на Vercel, бэкенд на Render
            wsUrl = 'wss://telegram-games-plkj.onrender.com';
            console.log('🌐 Production mode - connecting to Render WebSocket server');
        }
        
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.reconnectDelay = 3000; // Сброс задержки
                this.reconnectAttempts = 0; // Сброс счетчика попыток
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'init') {
                        // Начальные данные - исправляем пути
                        this.recentWins = (data.wins || []).map(win => this.fixImagePath(win));
                        this.renderWins();
                    } else if (data.type === 'new_win') {
                        // Новый выигрыш - исправляем путь
                        this.addWin(this.fixImagePath(data.win));
                    }
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('❌ WebSocket disconnected, reconnecting...');
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error('❌ Error creating WebSocket:', error);
            this.scheduleReconnect();
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        // В локальной разработке ограничиваем попытки переподключения
        if (this.isLocalDev) {
            this.reconnectAttempts++;
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.warn(`⚠️  WebSocket: Превышено максимум попыток подключения (${this.maxReconnectAttempts})`);
                console.warn('💡 Для локальной разработки запустите WebSocket сервер: cd server && node server.js');
                console.warn('💡 Или игнорируйте эти ошибки - приложение работает без WebSocket');
                return; // Прекращаем попытки
            }
        }
        
        this.reconnectTimeout = setTimeout(() => {
            this.connectWebSocket();
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000); // Макс 30 сек
        }, this.reconnectDelay);
    }
    
    sendWin(prize, isChips, color) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️  WebSocket not connected');
            return;
        }
        
        const imagePath = this.getPrizeImagePath(prize, color, isChips);
        
        const message = JSON.stringify({
            type: 'win',
            prize: prize,
            isChips: isChips,
            color: color,
            imagePath: imagePath
        });
        
        this.ws.send(message);
    }
    
    getPrizeImagePath(prize, color, isChips) {
        // Проверяем находимся ли мы в upgrade/
        const currentPath = window.location.pathname;
        const currentHref = window.location.href;
        
        // Несколько способов проверки
        const isInUpgrade = currentPath.includes('/upgrade/') || 
                           currentPath.includes('/upgrade') ||
                           currentHref.includes('/upgrade/');
        
        const prefix = isInUpgrade ? '../' : '';
        
        if (isChips) {
            return `${prefix}main/Chips-case/${color}/${prize}-chips-${color}.png`;
        } else {
            return `${prefix}main/Case-tokens/${color}/${prize}-r-${color}.png`;
        }
    }
    
    // Исправляем путь для данных из WebSocket
    fixImagePath(win) {
        const currentPath = window.location.pathname;
        const isInUpgrade = currentPath.includes('/upgrade/') || 
                           currentPath.includes('/upgrade');
        
        if (isInUpgrade && win.imagePath && !win.imagePath.startsWith('../')) {
            // Добавляем ../ если мы в upgrade/ и путь ещё не исправлен
            return {
                ...win,
                imagePath: '../' + win.imagePath
            };
        }
        
        return win;
    }
    
    addWin(winData) {
        // Добавляем новый выигрыш
        this.recentWins.unshift(winData);
        
        // Ограничиваем количество
        if (this.recentWins.length > this.maxWins) {
            this.recentWins = this.recentWins.slice(0, this.maxWins);
        }
        
        this.renderWins(true);
    }
    
    renderWins(animate = false) {
        if (!this.liveContainer) return;
        
        this.liveContainer.innerHTML = '';
        
        this.recentWins.forEach((win, index) => {
            const chipElement = this.createChipElement(win, animate && index === 0);
            this.liveContainer.appendChild(chipElement);
        });
    }
    
    createChipElement(win, isNew = false) {
        const chip = document.createElement('div');
        chip.className = 'live-prize-chip' + (isNew ? ' new' : '');
        
        const img = document.createElement('img');
        img.src = win.imagePath;
        img.alt = win.prize;
        img.onerror = () => {
            // Если картинка не загрузилась
            chip.textContent = win.isChips ? '💎' : '💰';
            chip.style.fontSize = '24px';
        };
        
        chip.appendChild(img);
        
        return chip;
    }
    
    // Публичный метод для отправки выигрыша
    broadcastWin(prize, isChips, color) {
        this.sendWin(prize, isChips, color);
    }
}

// Автоматический запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.LivePrizes = new RealtimeLivePrizes();
        console.log('✅ Realtime Live Prizes initialized');
    }, 300);
});

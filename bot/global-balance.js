// Глобальная система балансов (Server + CloudStorage + fallback)
class GlobalBalance {
    constructor() {
        this.balance = this.defaultBalance();
        this.storageKey = 'telegram_game_balance';
        this.isCloudAvailable = this.tg && this.tg.CloudStorage && typeof this.tg.CloudStorage.getItem === 'function';
        this.serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:3000' 
            : 'https://duopartners.xyz';
        // Cache DOM elements to avoid repeated queries
        this.cachedElements = {};
        this.updateThrottle = null;
        this.telegramId = null;
        this.init();
    }

    async init() {
        // Получаем Telegram ID
        this.telegramId = this.getTelegramId();
        console.log('🆔 Telegram ID:', this.telegramId);
        
        await this.loadBalance();
        this.updateMainBalance();

        // Слушаем локальные изменения как fallback
        window.addEventListener('storage', async (e) => {
            if (e.key === this.storageKey) {
                await this.loadFromLocal();
                this.updateMainBalance();
            }
        });
        
        // ⚠️ ОТКЛЮЧЕНА автоперезагрузка - полагаемся на WebSocket
        // Раньше: setInterval(() => this.syncWithServer(), 30000);
        // Проблема: восстанавливал баланс каждые 30 секунд!
    }
    
    getTelegramId() {
        // Пытаемся получить Telegram ID из разных источников
        if (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
            return this.tg.initDataUnsafe.user.id.toString();
        }
        
        // Для тестирования - используем ID из localStorage или генерируем
        let testId = localStorage.getItem('test_telegram_id');
        if (!testId) {
            testId = 'test_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('test_telegram_id', testId);
            console.log('⚠️ Test mode: generated ID:', testId);
        }
        return testId;
    }

    defaultBalance() {
        return {
            rubles: 0.00,
            chips: 0
        };
    }

    getLocalItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    setLocalItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // ignore
        }
    }

    async getCloudItem(key) {
        if (!this.cloudAvailable) {
            return null;
        }
        return new Promise((resolve) => {
            this.tg.CloudStorage.getItem(key, (error, value) => {
                if (error) {
                    resolve(null);
                } else {
                    resolve(value);
                }
            });
        });
    }

    async setCloudItem(key, value) {
        if (!this.cloudAvailable) {
            return false;
        }
        return new Promise((resolve) => {
            this.tg.CloudStorage.setItem(key, value, () => {
                resolve(true);
            });
        });
    }

    async loadFromLocal() {
        const stored = this.getLocalItem(this.storageKey);
        if (!stored) {
            this.balance = this.defaultBalance();
            return;
        }
        try {
            const parsed = JSON.parse(stored);
            this.balance = {
                rubles: parseFloat(parsed.rubles) ?? 0,
                chips: parseInt(parsed.chips, 10) ?? 0
            };
        } catch (e) {
            this.balance = this.defaultBalance();
        }
    }

    async loadBalance() {
        try {
            // Приоритет 1: Загрузить с сервера
            const serverBalance = await this.loadFromServer();
            if (serverBalance) {
                this.balance = serverBalance;
                this.setLocalItem(this.storageKey, JSON.stringify(serverBalance));
                await this.setCloudItem(this.storageKey, JSON.stringify(serverBalance));
                console.log('✅ Balance loaded from server:', serverBalance);
                this.isReady = true;
                return;
            }
            
            // Приоритет 2: CloudStorage
            const cloudValue = await this.getCloudItem(this.storageKey);
            if (cloudValue) {
                const parsed = JSON.parse(cloudValue);
                this.balance = {
                    rubles: parseFloat(parsed.rubles) ?? 0,
                    chips: parseInt(parsed.chips, 10) ?? 0
                };
                this.setLocalItem(this.storageKey, cloudValue);
                // Синхронизируем с сервером
                await this.saveToServer();
            } else {
                // Приоритет 3: localStorage
                await this.loadFromLocal();
                await this.persistBalance();
            }
        } catch (e) {
            console.error('❌ Error loading balance:', e);
            await this.loadFromLocal();
        }
        this.isReady = true;
    }
    
    async loadFromServer() {
        if (!this.telegramId) return null;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/balance/${this.telegramId}`);
            if (response.ok) {
                const data = await response.json();
                return {
                    rubles: parseFloat(data.rubles) ?? 0,
                    chips: parseInt(data.chips, 10) ?? 0
                };
            }
        } catch (e) {
            console.warn('⚠️ Server not available, using local balance');
        }
        return null;
    }
    
    async saveToServer() {
        if (!this.telegramId) return false;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/balance/${this.telegramId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.balance)
            });
            if (response.ok) {
                console.log('✅ Balance synced to server');
                return true;
            }
        } catch (e) {
            console.warn('⚠️ Failed to sync balance to server');
        }
        return false;
    }
    
    async syncWithServer() {
        // Синхронизируем баланс с сервером
        const serverBalance = await this.loadFromServer();
        if (serverBalance) {
            // Если баланс на сервере отличается - обновляем локальный
            if (serverBalance.rubles !== this.balance.rubles || 
                serverBalance.chips !== this.balance.chips) {
                this.balance = serverBalance;
                await this.setCloudItem(this.storageKey, JSON.stringify(serverBalance));
                this.setLocalItem(this.storageKey, JSON.stringify(serverBalance));
                this.updateMainBalance();
                console.log('🔄 Balance synced from server');
            }
        }
    }

    async persistBalance() {
        const payload = JSON.stringify(this.balance);
        this.setLocalItem(this.storageKey, payload);
        await this.setCloudItem(this.storageKey, payload);
        await this.saveToServer(); // Синхронизируем с сервером
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

    async setRubles(amount) {
        this.balance.rubles = parseFloat(amount);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async setChips(amount) {
        this.balance.chips = parseInt(amount, 10);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async addRubles(amount) {
        this.balance.rubles += parseFloat(amount);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async addChips(amount) {
        this.balance.chips += parseInt(amount, 10);
        await this.persistBalance();
        this.updateMainBalance();
    }

    async subtractRubles(amount) {
        const newAmount = this.balance.rubles - parseFloat(amount);
        if (newAmount >= 0) {
            this.balance.rubles = newAmount;
            await this.persistBalance();
            this.updateMainBalance();
            return true;
        }
        return false;
    }

    async subtractChips(amount) {
        const newAmount = this.balance.chips - parseInt(amount, 10);
        if (newAmount >= 0) {
            this.balance.chips = newAmount;
            await this.persistBalance();
            this.updateMainBalance();
            return true;
        }
        return false;
    }

    updateMainBalance() {
        // Throttle updates to avoid excessive DOM manipulation
        if (this.updateThrottle) return;
        this.updateThrottle = setTimeout(() => {
            this.updateThrottle = null;
        }, 16); // ~60fps throttle
        
        // Cache DOM queries
        if (!this.cachedElements.balanceContainer) {
            this.cachedElements.balanceContainer = document.querySelector('.balance-1');
            if (this.cachedElements.balanceContainer) {
                this.cachedElements.groups = this.cachedElements.balanceContainer.querySelectorAll('.group-ico-1');
            }
        }
        
        if (this.cachedElements.groups) {
            this.cachedElements.groups.forEach((group, index) => {
                if (index === 0) {
                    // Рубли (без span)
                    if (!group._valueNode) {
                        group._valueNode = Array.from(group.childNodes).find((node) => 
                            node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
                        if (!group._valueNode) {
                            group._valueNode = document.createTextNode('');
                            group.insertBefore(group._valueNode, group.firstChild);
                        }
                    }
                    group._valueNode.textContent = `${this.balance.rubles.toFixed(2)} `;
                } else {
                    if (!group._span) {
                        group._span = group.querySelector('span');
                    }
                    if (group._span) {
                        group._span.textContent = this.balance.chips.toString();
                    }
                }
            });
        }

        if (!this.cachedElements.profileRubElement) {
            this.cachedElements.profileRubElement = document.querySelector('.profile .balance .div-wrapper .text-wrapper-4');
        }
        if (this.cachedElements.profileRubElement) {
            this.cachedElements.profileRubElement.textContent = this.balance.rubles.toFixed(2);
        }
    }

    updateAllBalances() {
        this.updateMainBalance();
    }

    hasEnoughRubles(amount) {
        return this.balance.rubles >= parseFloat(amount);
    }

    hasEnoughChips(amount) {
        return this.balance.chips >= parseInt(amount, 10);
    }

    async resetBalance() {
        this.balance = this.defaultBalance();
        await this.persistBalance();
        this.updateMainBalance();
    }
}

window.GlobalBalance = new GlobalBalance();

console.log('💰 Global Balance API loaded!');
   setMoney(рубли, фишки) - установить точный баланс
   showBalance() - показать текущий баланс
   resetMoney() - сбросить баланс
   
   Быстрые команды:
   million() - выдать по миллиону рублей и фишек
   rich() - установить баланс 999999/999999
   
   Примеры:
   addMoney(10000, 5000)
   setMoney(50000, null) - только рубли
   setMoney(null, 100000) - только фишки
`);

document.addEventListener('DOMContentLoaded', () => {
    if (window.GlobalBalance && window.GlobalBalance.isReady) {
        window.GlobalBalance.updateMainBalance();
    } else {
        setTimeout(() => {
            if (window.GlobalBalance) {
                window.GlobalBalance.updateMainBalance();
            }
        }, 300);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalBalance;
}

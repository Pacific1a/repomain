// ============================================
// РЕФЕРАЛЬНАЯ СИСТЕМА ДЛЯ САЙТА ПАРТНЕРОВ
// ============================================

class ReferralManager {
    constructor() {
        this.referralCode = null;
        this.referralLink = null;
        this.stats = {
            clicks: 0,           // Переходы
            firstDeposits: 0,    // Первые депозиты
            deposits: 0,          // Кол-во пополнений
            totalDeposits: 0,    // Сумма депозитов
            costPerClick: 0,     // Стоимость перехода
            avgIncomePerPlayer: 0 // Средний доход с игрока
        };
        this.init();
    }
    
    async init() {
        console.log('🎁 Referral Manager initializing...');
        await this.loadReferralData();
        this.setupUI();
        console.log('✅ Referral Manager ready');
    }
    
    async loadReferralData() {
        try {
            const token = API.getToken();
            if (!token) {
                console.warn('⚠️ Не авторизован');
                return;
            }
            
            const response = await fetch(`${API_BASE_URL || '/api'}/referral/partner/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Реферальные данные:', data);
                
                this.referralCode = data.referralCode;
                
                // API возвращает данные в корне объекта, а не в data.stats
                this.stats = {
                    clicks: data.clicks || 0,
                    firstDeposits: data.firstDeposits || 0,
                    deposits: data.deposits || 0,
                    totalDeposits: data.totalDeposits || 0,
                    costPerClick: data.costPerClick || 0,
                    avgIncomePerPlayer: data.avgIncomePerPlayer || 0,
                    totalEarnings: data.totalEarnings || 0
                };
                
                console.log('📊 Обработанная статистика:', this.stats);
                
                // Генерируем ссылку
                this.generateReferralLink();
                
                // Обновляем UI
                this.updateStats();
                
                // Обновляем график (если есть функция updateChartWithRealData)
                if (typeof window.updateChartWithRealData === 'function') {
                    window.updateChartWithRealData(this.stats);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки реферальных данных:', error);
        }
    }
    
    generateReferralLink() {
        if (!this.referralCode) {
            console.warn('⚠️ Нет реферального кода');
            return;
        }
        
        // Получаем имя бота из config или используем дефолтное
        // TODO: Установить правильное имя бота в window.BOT_USERNAME
        const botUsername = window.BOT_USERNAME || 'aasasdasdadsddasdbot';
        
        if (botUsername === 'YOUR_BOT_USERNAME') {
            console.warn('⚠️ BOT_USERNAME не установлен! Установите window.BOT_USERNAME = "aasasdasdadsddasdbot"');
        }
        
        // Генерируем короткий код
        const shortCode = this.referralCode;
        
        // Создаем ссылку на бота
        this.referralLink = `https://t.me/${botUsername}?start=ref_${shortCode}`;
        
        console.log('🔗 Реферальная ссылка:', this.referralLink);
        
        // Обновляем поля в обеих модалках
        this.updateReferralInputs();
    }
    
    updateReferralInputs() {
        // Обновляем поля в ref_program и sub_partner
        const refInputs = document.querySelectorAll('.ref_program .btn_parnters input, .sub_partner .btn_parnters input');
        
        refInputs.forEach(input => {
            if (this.referralLink) {
                input.value = this.referralLink;
                input.setAttribute('readonly', true);
                input.style.cursor = 'pointer';
                
                // Проверяем что обработчик ещё не навешан
                if (!input.dataset.handlerAttached) {
                    // При клике на input - копируем (и останавливаем всплытие события!)
                    input.addEventListener('click', (e) => {
                        e.stopPropagation(); // Останавливаем всплытие чтобы не открывать окно повторно
                        this.copyReferralLink();
                    });
                    input.dataset.handlerAttached = 'true';
                }
            }
        });
    }
    
    setupUI() {
        // Обработчик кнопок "Скопировать"
        const copyButtons = document.querySelectorAll('.ref_program .btn_parnters button, .sub_partner .btn_parnters button');
        
        copyButtons.forEach(button => {
            // Проверяем что обработчик ещё не навешан
            if (!button.dataset.handlerAttached) {
                button.addEventListener('click', () => {
                    this.copyReferralLink();
                });
                button.dataset.handlerAttached = 'true';
            }
        });
        
        console.log('✅ UI настроен');
    }
    
    async copyReferralLink() {
        if (!this.referralLink) {
            Toast.warning('Ссылка не сгенерирована');
            return;
        }
        
        // Защита от множественных кликов
        if (this.isCopying) {
            return;
        }
        this.isCopying = true;
        
        try {
            await navigator.clipboard.writeText(this.referralLink);
            Toast.success('Ссылка скопирована!');
            console.log('✅ Ссылка скопирована');
        } catch (error) {
            // Fallback
            const input = document.createElement('input');
            input.value = this.referralLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            Toast.success('Ссылка скопирована!');
            console.log('✅ Ссылка скопирована (fallback)');
        } finally {
            // Разблокируем через 1 секунду
            setTimeout(() => {
                this.isCopying = false;
            }, 1000);
        }
    }
    
    updateStats() {
        console.log('🔄 Обновление статистики:', this.stats);
        
        // Обновляем detail-value элементы (новая структура)
        this.updateDetailValue('.visits-value', this.stats.clicks || 0);
        this.updateDetailValue('.clients-value', this.stats.firstDeposits || 0);
        this.updateDetailValue('.deposits-value', this.stats.deposits || 0);
        this.updateDetailValue('.amount-value', `${this.stats.totalDeposits || 0}₽`);
        this.updateDetailValue('.cost-value', `${this.stats.costPerClick || 0}₽`);
        this.updateDetailValue('.income-value', `${this.stats.avgIncomePerPlayer || 0}₽`);
        
        // Обновляем карточки статистики (старая структура, если есть)
        const statCards = document.querySelectorAll('.stat-card');
        
        if (statCards.length >= 2) {
            // Первая карточка
            const firstCard = statCards[0];
            this.updateStatRow(firstCard, 0, 'Переходы:', this.stats.clicks);
            this.updateStatRow(firstCard, 1, 'Первые депозиты:', this.stats.firstDeposits);
            this.updateStatRow(firstCard, 2, 'Кол-во пополений депозитов:', this.stats.deposits);
            
            // Вторая карточка
            const secondCard = statCards[1];
            this.updateStatRow(secondCard, 0, 'Сумма депозитов:', `${this.stats.totalDeposits}₽`);
            this.updateStatRow(secondCard, 1, 'Стоимость перехода:', `${this.stats.costPerClick}₽`);
            this.updateStatRow(secondCard, 2, 'Средний доход с игрока:', `${this.stats.avgIncomePerPlayer}₽`);
        }
        
        console.log('✅ Статистика обновлена');
    }
    
    updateDetailValue(selector, value) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.textContent = value;
            console.log(`✅ Обновлено ${selector} = ${value}`);
        });
    }
    
    updateStatRow(card, index, label, value) {
        const rows = card.querySelectorAll('.stat-row');
        if (rows[index]) {
            const labelEl = rows[index].querySelector('.stat-label');
            const valueEl = rows[index].querySelector('.stat-value');
            
            if (labelEl) labelEl.textContent = label;
            if (valueEl) valueEl.textContent = value;
        }
    }
    
    // Периодическое обновление статистики
    startAutoUpdate(intervalMs = 120000) { // Увеличил с 30 до 120 секунд (2 минуты)
        setInterval(() => {
            this.loadReferralData();
        }, intervalMs);
        
        console.log(`✅ Автообновление каждые ${intervalMs / 1000}с`);
    }
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    // Ждем создания модальных окон
    setTimeout(() => {
        window.ReferralManager = new ReferralManager();
        
        // Запускаем автообновление каждые 2 минуты (120 секунд)
        window.ReferralManager.startAutoUpdate(120000);
        
        console.log('✅ ReferralManager инициализирован');
    }, 1000);
});

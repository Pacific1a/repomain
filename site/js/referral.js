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
                this.stats = data.stats || this.stats;
                
                // Генерируем ссылку
                this.generateReferralLink();
                
                // Обновляем UI
                this.updateStats();
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
        
        // Получаем имя бота из пользователя или используем дефолтное
        const botUsername = window.BOT_USERNAME || 'aasasdasdadsddasdbot';
        
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
                
                // При клике на input - копируем
                input.addEventListener('click', () => {
                    this.copyReferralLink();
                });
            }
        });
    }
    
    setupUI() {
        // Обработчик кнопок "Скопировать"
        const copyButtons = document.querySelectorAll('.ref_program .btn_parnters button, .sub_partner .btn_parnters button');
        
        copyButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.copyReferralLink();
            });
        });
        
        console.log('✅ UI настроен');
    }
    
    async copyReferralLink() {
        if (!this.referralLink) {
            Toast.warning('Ссылка не сгенерирована');
            return;
        }
        
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
        }
    }
    
    updateStats() {
        console.log('🔄 Обновление статистики:', this.stats);
        
        // Обновляем карточки статистики
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
    startAutoUpdate(intervalMs = 30000) {
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
        
        // Запускаем автообновление каждые 30 секунд
        window.ReferralManager.startAutoUpdate(30000);
        
        console.log('✅ ReferralManager инициализирован');
    }, 1000);
});

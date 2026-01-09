/**
 * СПИСОК ПРИГЛАШЕННЫХ РЕФЕРАЛОВ
 * Показывает таблицу всех приглашенных пользователей с аватарками
 */

class ReferralsListManager {
    constructor() {
        this.referrals = [];
        this.container = null;
    }
    
    async init() {
        console.log('📋 ReferralsListManager initializing...');
        
        // Ищем контейнер для списка
        this.container = document.querySelector('.referrals-list-container');
        
        if (!this.container) {
            console.warn('⚠️ .referrals-list-container не найден');
            return;
        }
        
        await this.loadReferrals();
        this.render();
        
        console.log('✅ ReferralsListManager ready');
    }
    
    async loadReferrals() {
        try {
            const token = API.getToken();
            if (!token) {
                console.warn('⚠️ Не авторизован');
                return;
            }
            
            const response = await fetch('/api/referral/partner/referrals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.referrals = data.referrals || [];
                
                console.log(`📋 Загружено рефералов: ${this.referrals.length}`);
                console.log('Данные:', this.referrals);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки рефералов:', error);
        }
    }
    
    render() {
        if (!this.container) return;
        
        if (this.referrals.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <p>Пока нет приглашенных пользователей</p>
                    <p class="hint">Поделитесь своей реферальной ссылкой!</p>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <div class="referrals-table">
                <div class="table-header">
                    <div class="col-avatar">Пользователь</div>
                    <div class="col-deposits">Депозиты</div>
                    <div class="col-losses">Проигрыши</div>
                    <div class="col-date">Дата регистрации</div>
                </div>
                <div class="table-body">
                    ${this.referrals.map(ref => this.renderReferralRow(ref)).join('')}
                </div>
            </div>
        `;
        
        this.container.innerHTML = tableHTML;
    }
    
    renderReferralRow(referral) {
        // Используем AvatarHelper если подключен
        let avatarHTML = '';
        if (typeof AvatarHelper !== 'undefined') {
            avatarHTML = AvatarHelper.renderAvatar({
                nickname: referral.nickname || `User${referral.userId}`,
                photoUrl: referral.photoUrl
            }, '40px');
        } else {
            // Fallback если AvatarHelper не подключен
            if (referral.photoUrl) {
                avatarHTML = `<img src="${referral.photoUrl}" alt="${referral.nickname}" style="width: 40px; height: 40px; border-radius: 50%;">`;
            } else {
                avatarHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background: #666; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600;">${(referral.nickname || 'U').charAt(0).toUpperCase()}</div>`;
            }
        }
        
        const nickname = referral.nickname || `User${referral.userId}`;
        const deposits = referral.totalDeposits || 0;
        const losses = referral.totalLosses || 0;
        const date = referral.joinedAt ? new Date(referral.joinedAt).toLocaleDateString('ru-RU') : '—';
        
        return `
            <div class="table-row">
                <div class="col-avatar">
                    <div class="user-info">
                        ${avatarHTML}
                        <span class="user-nickname">${nickname}</span>
                    </div>
                </div>
                <div class="col-deposits">${deposits}₽</div>
                <div class="col-losses">${losses}₽</div>
                <div class="col-date">${date}</div>
            </div>
        `;
    }
    
    // Автообновление списка каждые 2 минуты
    startAutoUpdate(intervalMs = 120000) {
        setInterval(() => {
            this.loadReferrals().then(() => this.render());
        }, intervalMs);
        
        console.log(`✅ Автообновление списка каждые ${intervalMs / 1000}с`);
    }
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (document.querySelector('.referrals-list-container')) {
            window.ReferralsListManager = new ReferralsListManager();
            window.ReferralsListManager.init();
            window.ReferralsListManager.startAutoUpdate(120000);
            
            console.log('✅ ReferralsListManager инициализирован');
        }
    }, 1500);
});

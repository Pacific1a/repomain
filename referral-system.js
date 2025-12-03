// ============================================
// РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================
(function() {
    'use strict';
    
    // Автоматически определяем URL сервера
    const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : (window.GAME_SERVER_URL || 'https://telegram-games-plkj.onrender.com');
    
    class ReferralSystem {
        constructor() {
            this.telegramId = null;
            this.referralCode = null;
            this.referralBalance = 0;
            this.referrals = [];
            this.init();
        }
        
        async init() {
            console.log('🎁 Referral System initializing...');
            
            // Получаем Telegram ID
            this.telegramId = this.getTelegramId();
            if (!this.telegramId) {
                console.error('❌ No Telegram ID found');
                return;
            }
            
            console.log(`✅ Telegram ID: ${this.telegramId}`);
            
            // Проверяем, пришел ли пользователь по реферальной ссылке
            await this.checkReferralLink();
            
            // Загружаем данные о рефералах
            await this.loadReferralData();
            
            // Инициализируем UI
            this.initializeUI();
            
            console.log('✅ Referral System ready');
        }
        
        getTelegramId() {
            // Приоритет 1: Реальный Telegram WebApp
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
            }
            
            // Приоритет 2: Из localStorage (для тестирования)
            const cached = localStorage.getItem('telegram_user_id');
            if (cached) return cached;
            
            // Приоритет 3: Тестовый ID
            console.warn('⚠️ Using test ID');
            return '1889923046';
        }
        
        async checkReferralLink() {
            // Проверяем URL параметры на наличие реферального кода
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');
            
            if (refCode && refCode !== this.telegramId) {
                console.log(`🔗 Пришел по реферальной ссылке: ${refCode}`);
                
                // Сохраняем информацию о реферере
                try {
                    const response = await fetch(`${SERVER_URL}/api/referral/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: this.telegramId,
                            referrerId: refCode
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Реферал зарегистрирован:', data);
                        this.showNotification('Вы зарегистрированы по реферальной ссылке!');
                    }
                } catch (error) {
                    console.error('❌ Ошибка регистрации реферала:', error);
                }
            }
        }
        
        async loadReferralData() {
            try {
                // Загружаем информацию о рефералах
                const response = await fetch(`${SERVER_URL}/api/referral/${this.telegramId}`);
                
                if (response.ok) {
                    const data = await response.json();
                    this.referralCode = data.referralCode;
                    this.referralBalance = data.referralBalance || 0;
                    this.referrals = data.referrals || [];
                    
                    console.log('📊 Реферальные данные:', data);
                    this.updateUI();
                }
            } catch (error) {
                console.error('❌ Ошибка загрузки данных:', error);
            }
        }
        
        initializeUI() {
            // Кнопка "Пригласить"
            const inviteButton = document.querySelector('.invite-button');
            if (inviteButton) {
                inviteButton.addEventListener('click', () => this.generateReferralLink());
            }
            
            // Кнопка "Копировать"
            const copyButton = document.querySelector('.copy-button');
            if (copyButton) {
                copyButton.addEventListener('click', () => this.copyReferralLink());
            }
            
            // Кнопка "Вывести"
            const withdrawButton = document.querySelector('.withdraw-button');
            if (withdrawButton) {
                withdrawButton.addEventListener('click', () => this.withdraw());
            }
            
            console.log('✅ UI initialized');
        }
        
        generateReferralLink() {
            if (!this.referralCode) {
                this.referralCode = this.telegramId;
            }
            
            // Генерируем ссылку (можно использовать t.me/your_bot?start=refXXX)
            const botUsername = 'your_bot'; // ЗАМЕНИТЕ НА ИМЯ ВАШЕГО БОТА
            this.referralLink = `https://t.me/${botUsername}?start=ref${this.referralCode}`;
            
            // Обновляем текст кнопки
            const textWrapper = document.querySelector('.invite-button .text-wrapper-4');
            if (textWrapper) {
                textWrapper.textContent = this.referralLink;
                console.log('🔗 Реферальная ссылка:', this.referralLink);
            }
            
            this.showNotification('Реферальная ссылка создана! Нажмите кнопку копирования');
        }
        
        async copyReferralLink() {
            if (!this.referralLink) {
                this.generateReferralLink();
            }
            
            try {
                // Копируем в буфер обмена
                await navigator.clipboard.writeText(this.referralLink);
                this.showNotification('Ссылка скопирована!');
                console.log('✅ Ссылка скопирована');
            } catch (error) {
                // Fallback для Telegram WebApp
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.showAlert(`Ваша ссылка: ${this.referralLink}`);
                }
                console.error('❌ Ошибка копирования:', error);
            }
        }
        
        async withdraw() {
            if (this.referralBalance <= 0) {
                this.showNotification('Недостаточно средств для вывода');
                return;
            }
            
            // Рассчитываем комиссию 5%
            const commission = this.referralBalance * 0.05;
            const amountToWithdraw = this.referralBalance - commission;
            
            // Подтверждение
            const confirmed = confirm(
                `Вывести ${this.referralBalance.toFixed(2)}₽?\n` +
                `Комиссия 5%: ${commission.toFixed(2)}₽\n` +
                `Вы получите: ${amountToWithdraw.toFixed(2)}₽`
            );
            
            if (!confirmed) return;
            
            try {
                const response = await fetch(`${SERVER_URL}/api/referral/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.telegramId,
                        amount: this.referralBalance
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Вывод выполнен:', data);
                    
                    // Обновляем балансы
                    this.referralBalance = 0;
                    this.updateUI();
                    
                    // Обновляем основной баланс через BalanceAPI
                    if (window.BalanceAPI) {
                        await window.BalanceAPI.loadBalance();
                    }
                    
                    this.showNotification(`Выведено ${amountToWithdraw.toFixed(2)}₽ на основной баланс`);
                } else {
                    const error = await response.json();
                    this.showNotification(`Ошибка: ${error.message}`);
                }
            } catch (error) {
                console.error('❌ Ошибка вывода:', error);
                this.showNotification('Ошибка при выводе средств');
            }
        }
        
        updateUI() {
            // Обновляем реферальный баланс
            const balanceEl = document.querySelector('.ref-balance .text-wrapper-7');
            if (balanceEl) {
                balanceEl.textContent = this.referralBalance.toFixed(2);
            }
            
            // Обновляем количество приглашенных
            const invitedAmountEl = document.querySelector('.invidet-amount .text-wrapper-9');
            if (invitedAmountEl) {
                invitedAmountEl.textContent = this.referrals.length.toString();
            }
            
            // Обновляем список рефералов
            this.updateReferralsList();
        }
        
        updateReferralsList() {
            const container = document.querySelector('.invited-info');
            if (!container) return;
            
            // Удаляем старые элементы (кроме первого - это шаблон)
            const oldItems = container.querySelectorAll('.refferal-info:not(:first-child)');
            oldItems.forEach(item => item.remove());
            
            // Получаем шаблон
            const template = container.querySelector('.refferal-info');
            if (!template) return;
            
            // Создаем элементы для каждого реферала
            this.referrals.forEach((referral, index) => {
                const item = template.cloneNode(true);
                
                // Аватар
                const avatar = item.querySelector('.avatar-2');
                if (avatar && referral.avatar) {
                    avatar.style.backgroundImage = `url(${referral.avatar})`;
                }
                
                // Ник
                const nickname = item.querySelector('.text-wrapper-13');
                if (nickname) {
                    nickname.textContent = referral.nickname || `User${referral.userId.slice(-4)}`;
                }
                
                // Сумма выигрыша
                const winAmount = item.querySelector('.text-wrapper-14');
                if (winAmount) {
                    winAmount.textContent = `${(referral.totalWinnings || 0).toFixed(2)}₽`;
                }
                
                // Ваша прибыль (10% от выигрышей)
                const profitAmount = item.querySelector('.text-wrapper-15');
                if (profitAmount) {
                    const profit = (referral.totalWinnings || 0) * 0.10;
                    profitAmount.textContent = `+${profit.toFixed(2)}₽`;
                }
                
                container.appendChild(item);
            });
            
            // Удаляем шаблон, если есть рефералы
            if (this.referrals.length > 0) {
                template.style.display = 'none';
            }
        }
        
        showNotification(message) {
            // Используем функцию showToast если она есть
            if (typeof showToast === 'function') {
                showToast(message);
            } else if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showPopup({
                    message: message,
                    buttons: [{ type: 'ok' }]
                });
            } else {
                console.log('📢', message);
            }
        }
        
        // Метод для начисления процентов (вызывается из игр)
        async addReferralEarnings(userId, amount) {
            try {
                const response = await fetch(`${SERVER_URL}/api/referral/add-earnings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        amount: amount
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Начислено рефереру:', data);
                    return true;
                }
            } catch (error) {
                console.error('❌ Ошибка начисления:', error);
            }
            return false;
        }
    }
    
    // Создаем глобальный экземпляр
    window.ReferralSystem = new ReferralSystem();
    
    console.log('✅ Referral System loaded');
})();

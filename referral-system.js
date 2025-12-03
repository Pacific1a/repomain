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
                    console.log(`📊 Количество рефералов: ${this.referrals.length}`);
                    
                    // Загружаем никнеймы из PlayersSystem
                    if (this.referrals.length > 0) {
                        this.referrals.forEach(ref => {
                            if (window.PlayersSystem?.players[ref.userId]) {
                                ref.nickname = window.PlayersSystem.players[ref.userId].nickname;
                                ref.avatar = window.PlayersSystem.players[ref.userId].avatar;
                            }
                        });
                    }
                    
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
            
            // Генерируем короткий код (base36 - короче и красивее)
            const shortCode = parseInt(this.referralCode).toString(36).toUpperCase();
            
            // Генерируем ссылку
            const botUsername = 'aasasdasdadsddasdbot'; // ИМЯ ВАШЕГО БОТА
            this.referralLink = `https://t.me/${botUsername}?start=${shortCode}`;
            
            // Обновляем текст в кнопке invite-button
            const inviteButton = document.querySelector('.invite-button .text-wrapper-4');
            if (inviteButton) {
                inviteButton.textContent = this.referralLink;
            }
            
            console.log('🔗 Реферальная ссылка:', this.referralLink, 'код:', shortCode);
            this.showNotification('Ссылка создана! Нажмите "Copy" для копирования');
        }

        async copyReferralLink() {
            if (!this.referralLink) {
                this.generateReferralLink();
                return;
            }
            
            try {
                // Копируем в буфер обмена
                await navigator.clipboard.writeText(this.referralLink);
                this.showNotification('✅ Ссылка скопирована!');
                console.log('✅ Ссылка скопирована');
            } catch (error) {
                // Fallback для Telegram WebApp
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.showPopup({
                        title: 'Ваша реферальная ссылка',
                        message: this.referralLink,
                        buttons: [{type: 'close'}]
                    });
                } else {
                    // Fallback для браузера
                    const input = document.createElement('input');
                    input.value = this.referralLink;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    this.showNotification('✅ Ссылка скопирована!');
                }
                console.log('✅ Ссылка скопирована (fallback)');
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
            console.log('🔄 Обновление UI, рефералов:', this.referrals.length);
            
            // Обновляем реферальный баланс
            const balanceEl = document.querySelector('.ref-balance .text-wrapper-7');
            if (balanceEl) {
                balanceEl.textContent = this.referralBalance.toFixed(2);
                console.log('✅ Обновлен реферальный баланс:', this.referralBalance);
            } else {
                console.warn('⚠️ Элемент .ref-balance .text-wrapper-7 не найден');
            }
            
            // Обновляем количество приглашенных
            const invitedAmountEl = document.querySelector('.invidet-amount .text-wrapper-9');
            if (invitedAmountEl) {
                invitedAmountEl.textContent = this.referrals.length.toString();
                console.log('✅ Обновлен счетчик рефералов:', this.referrals.length);
            } else {
                console.warn('⚠️ Элемент .invidet-amount .text-wrapper-9 не найден');
            }
            
            // Обновляем список рефералов
            this.updateReferralsList();
        }
        
        updateReferralsList() {
            console.log(`🔄 Обновление списка рефералов: ${this.referrals.length} шт.`);
            
            const container = document.querySelector('.invited-info');
            if (!container) {
                console.warn('⚠️ Контейнер .invited-info не найден');
                return;
            }
            
            // Удаляем все существующие карточки кроме шаблона
            const existingCards = container.querySelectorAll('.refferal-info');
            existingCards.forEach((card, index) => {
                if (index > 0) { // Оставляем первую как шаблон
                    card.remove();
                }
            });
            
            // Если рефералов нет - скрываем шаблон
            const template = container.querySelector('.refferal-info');
            if (this.referrals.length === 0) {
                console.log('ℹ️ Нет рефералов для отображения');
                if (template) {
                    template.style.display = 'none';
                }
                return;
            }
            
            console.log('✅ Отображаем рефералов:', this.referrals);
            
            // Если нет шаблона - создаем структуру
            if (!template) {
                console.warn('⚠️ Шаблон .refferal-info не найден, создаем свой');
                this.createCustomReferralCards(container);
                return;
            }
            
            // Скрываем шаблон
            template.style.display = 'none';
            
            // Создаем карточки на основе шаблона
            this.referrals.forEach((referral) => {
                const card = template.cloneNode(true);
                card.style.display = 'flex'; // Показываем клон
                
                // Получаем никнейм
                let nickname = 'User' + referral.userId.slice(-4);
                if (window.PlayersSystem?.players[referral.userId]) {
                    nickname = window.PlayersSystem.players[referral.userId].nickname || nickname;
                }
                
                // Обновляем аватар (первая буква) - стили берутся из CSS
                const avatar = card.querySelector('.avatar-2');
                if (avatar) {
                    avatar.textContent = nickname.charAt(0).toUpperCase();
                }
                
                // Обновляем ник
                const nicknameEl = card.querySelector('.text-wrapper-13');
                if (nicknameEl) {
                    nicknameEl.textContent = nickname;
                }
                
                // Обновляем сумму выигрыша
                const winningsEl = card.querySelector('.text-wrapper-14');
                if (winningsEl) {
                    winningsEl.textContent = `Выиграл | ${(referral.totalWinnings || 0).toFixed(2)}₽`;
                }
                
                // Обновляем вашу прибыль
                const earningsEl = card.querySelector('.text-wrapper-15');
                if (earningsEl) {
                    earningsEl.textContent = (referral.totalEarnings || 0).toFixed(2);
                }
                
                // Добавляем после шаблона
                template.parentNode.insertBefore(card, template.nextSibling);
            });
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

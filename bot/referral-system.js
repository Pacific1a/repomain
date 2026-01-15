// ============================================
// РЕФЕРАЛЬНАЯ СИСТЕМА
// ============================================
(function() {
    'use strict';
    
    // Автоматически определяем URL сервера
    const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : (window.GAME_SERVER_URL || 'https://duopartners.xyz');
    
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
                        this.showNotification('Вы зарегистрированы по реферальной ссылке');
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
                    // Referral balance = ЗАРАБОТОК ПАРТНЕРА (10% от всех депозитов)
                    this.referralBalance = data.totalEarnings || 0;
                    // Общая сумма депозитов всех рефералов
                    this.totalDeposits = data.totalDeposits || 0;
                    this.referrals = data.referrals || [];
                    
                    console.log('📊 Реферальные данные:', data);
                    console.log(`💰 Referral balance (ЗАРАБОТОК партнера): ${this.referralBalance}₽`);
                    console.log(`💵 Total deposits (сумма депозитов рефералов): ${this.totalDeposits}₽`);
                    console.log(`📊 Количество рефералов: ${this.referrals.length}`);
                    
                    // 🔄 Генерируем ссылку БЕЗ уведомления (тихо)
                    this.generateReferralLink(true);
                    
                    // Загружаем данные пользователей через Telegram Bot API
                    if (this.referrals.length > 0) {
                        await this.loadUserProfiles();
                    }
                    
                    this.updateUI();
                }
            } catch (error) {
                console.error('❌ Ошибка загрузки данных:', error);
            }
        }
        
        async loadUserProfiles() {
            console.log('👤 Загрузка профилей пользователей через Telegram Bot API...');
            
            for (const ref of this.referrals) {
                try {
                    // Запрос к нашему серверу, который получит данные через Bot API
                    const response = await fetch(`${SERVER_URL}/api/telegram-user/${ref.userId}`);
                    
                    if (response.ok) {
                        const userData = await response.json();
                        if (userData.success) {
                            ref.nickname = userData.first_name || userData.username || 'User' + ref.userId.slice(-4);
                            ref.photo_url = userData.photo_url;
                            console.log(`✅ Загружен профиль: ${ref.nickname}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Не удалось загрузить профиль ${ref.userId}:`, error);
                    ref.nickname = 'User' + ref.userId.slice(-4);
                }
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
        
        generateReferralLink(silent = false) {
            if (!this.referralCode) {
                this.referralCode = this.telegramId;
            }
            
            // Генерируем короткий код (base36 - короче и красивее)
            const shortCode = parseInt(this.referralCode).toString(36).toUpperCase();
            
            // Генерируем ссылку
            const botUsername = 'TestingForaGeyBot'; // ИМЯ ВАШЕГО БОТА
            this.referralLink = `https://t.me/${botUsername}?start=${shortCode}`;
            
            // Обновляем текст в кнопке invite-button
            const inviteButton = document.querySelector('.invite-button .text-wrapper-4');
            if (inviteButton) {
                inviteButton.textContent = this.referralLink;
            }
            
            console.log('🔗 Реферальная ссылка:', this.referralLink, 'код:', shortCode);
            
            // Показываем уведомление только если НЕ silent режим
            if (!silent) {
                this.showNotification('Ссылка создана! Нажмите "Copy" для копирования');
            }
        }

        async copyReferralLink() {
            if (!this.referralLink) {
                this.generateReferralLink(false); // Показываем уведомление при ручной генерации
                return;
            }
            
            try {
                // Копируем в буфер обмена
                await navigator.clipboard.writeText(this.referralLink);
                // ⚠️ УБРАЛИ УВЕДОМЛЕНИЕ при копировании
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
                    // ⚠️ УБРАЛИ УВЕДОМЛЕНИЕ
                }
                console.log('✅ Ссылка скопирована (fallback)');
            }
        }
        
        async withdraw() {
            if (this.referralBalance <= 0) {
                this.showNotification('Недостаточно средств для вывода');
                return;
            }
            
            // Рассчитываем комиссию 10%
            const commission = this.referralBalance * 0.10;
            const amountToWithdraw = this.referralBalance - commission;
            
            // Подтверждение с правильным заголовком
            if (window.Telegram?.WebApp) {
                const confirmed = await new Promise((resolve) => {
                    window.Telegram.WebApp.showPopup({
                        title: 'TwinsUp',
                        message: `Вывести ${this.referralBalance.toFixed(2)}₽?\n\nКомиссия 10%: ${commission.toFixed(2)}₽\nВы получите: ${amountToWithdraw.toFixed(2)}₽`,
                        buttons: [
                            { id: 'cancel', type: 'cancel' },
                            { id: 'confirm', type: 'ok', text: 'Вывести' }
                        ]
                    }, (buttonId) => {
                        resolve(buttonId === 'confirm');
                    });
                });
                if (!confirmed) return;
            } else {
                // Fallback для браузера
                const confirmed = confirm(
                    `Вывести ${this.referralBalance.toFixed(2)}₽?\n` +
                    `Комиссия 10%: ${commission.toFixed(2)}₽\n` +
                    `Вы получите: ${amountToWithdraw.toFixed(2)}₽`
                );
                if (!confirmed) return;
            }
            
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
                    
                    // Обновляем реферальный баланс
                    this.referralBalance = 0;
                    
                    // ⚠️ НЕ ПЕРЕЗАГРУЖАЕМ данные рефералов сразу! Ждём 2 секунды
                    // Чтобы БД успела обновиться
                    setTimeout(async () => {
                        // Перезагружаем данные рефералов с сервера
                        await this.loadReferralData();
                        console.log('✅ Данные рефералов обновлены после вывода');
                    }, 2000);
                    
                    // КРИТИЧНО: Обновляем основной баланс ВРУЧНУЮ (не loadBalance!)
                    if (window.BalanceAPI) {
                        const oldBalance = window.BalanceAPI.getRubles();
                        const newBalance = oldBalance + amountToWithdraw;
                        
                        // Устанавливаем новый баланс НАПРЯМУЮ без загрузки с сервера
                        window.BalanceAPI.balance.rubles = newBalance;
                        window.BalanceAPI.updateVisual();
                        
                        console.log(`✅ Баланс обновлён: ${oldBalance}₽ → ${newBalance}₽ (+${amountToWithdraw.toFixed(2)}₽)`);
                        console.log('⚠️ Баланс обновлён ЛОКАЛЬНО, без запроса к серверу');
                    }
                    
                    // Показываем уведомление
                    this.showNotification(`✅ Выведено ${amountToWithdraw.toFixed(2)}₽ на основной баланс`);
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
                balanceEl.textContent = this.referralBalance.toFixed(2) + '₽';
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
                card.style.display = 'flex';
                
                // Используем загруженный ник или дефолтный
                const nickname = referral.nickname || 'User' + referral.userId.slice(-4);
                
                // Аватар
                const avatar = card.querySelector('.avatar-2');
                if (avatar) {
                    if (referral.photo_url) {
                        // Если есть фото - показываем картинку
                        avatar.style.backgroundImage = `url(${referral.photo_url})`;
                        avatar.style.backgroundSize = 'cover';
                        avatar.style.backgroundPosition = 'center';
                        avatar.textContent = '';
                    } else {
                        // Иначе - первая буква
                        avatar.textContent = nickname.charAt(0).toUpperCase();
                    }
                }
                
                const nicknameEl = card.querySelector('.text-wrapper-13');
                if (nicknameEl) nicknameEl.textContent = nickname;
                
                // Deposited = сколько игрок положил на баланс (его депозиты)
                const winningsEl = card.querySelector('.text-wrapper-14');
                if (winningsEl) winningsEl.textContent = `Deposited | ${(referral.totalDeposits || 0).toFixed(2)}₽`;
                
                // Your Profit = заработок партнера с этого игрока (10% от депозитов)
                const earningsEl = card.querySelector('.text-wrapper-15');
                if (earningsEl) earningsEl.textContent = (referral.totalEarnings || 0).toFixed(2) + '₽';
                
                template.parentNode.insertBefore(card, template.nextSibling);
            });
        }
        
        createCustomReferralCards(container) {
            // Создаем карточки если нет шаблона
            this.referrals.forEach((referral) => {
                let nickname = 'User' + referral.userId.slice(-4);
                if (window.PlayersSystem?.players[referral.userId]) {
                    nickname = window.PlayersSystem.players[referral.userId].nickname || nickname;
                }
                
                const card = document.createElement('article');
                card.className = 'refferal-info';
                card.style.cssText = 'display: flex; margin-bottom: 10px;';
                card.innerHTML = `
                    <div class="refferal-info-2" style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <div class="avatar-2" style="
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 20px;
                        ">${nickname.charAt(0).toUpperCase()}</div>
                        <div class="refferal-info-3">
                            <span class="text-wrapper-13" style="color: #fff; font-size: 14px; font-weight: 600;">${nickname}</span>
                            <span class="text-wrapper-14" style="color: #9aa0a6; font-size: 12px;">Выиграл | ${(referral.totalWinnings || 0).toFixed(2)}₽</span>
                        </div>
                    </div>
                    <div class="profit-amount" style="display: flex; align-items: center; gap: 5px;">
                        <span class="text-wrapper-15" style="color: #667eea; font-size: 16px; font-weight: 600;">${(referral.totalEarnings || 0).toFixed(2)}</span>
                    </div>
                `;
                container.appendChild(card);
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
        
        // Метод для начисления процентов партнёру (вызывается когда реферал делает депозит)
        async addReferralEarnings(referralUserId, depositAmount) {
            try {
                console.log(`📤 Sending earnings: referralUser=${referralUserId}, deposit=${depositAmount}₽`);
                
                const response = await fetch(`${SERVER_URL}/api/referral/add-earnings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        referralUserId: referralUserId.toString(),
                        depositAmount: depositAmount
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Referral earnings processed:', data);
                    if (data.success) {
                        console.log(`💰 Partner ${data.partnerId} earned ${data.earnings}₽ (60% of ${lossAmount}₽)`);
                    } else {
                        console.log(`ℹ️ ${data.message}`);
                    }
                    return data.success;
                } else {
                    const errorData = await response.json();
                    console.error('❌ Server error:', errorData);
                }
            } catch (error) {
                console.error('❌ Network error:', error);
            }
            return false;
        }
    }
    
    // Создаем глобальный экземпляр
    window.ReferralSystem = new ReferralSystem();
    
    console.log('✅ Referral System loaded');
})();

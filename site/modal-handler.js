/**
 * Универсальный обработчик модальных окон
 * Управляет открытием, закрытием и взаимодействием со всеми модальными окнами
 */

const ModalHandler = {
    // Список всех модальных окон в системе
    modals: {
        withdrawal: '.witd_funds',                    // Вывод средств (недоступен)
        withdrawalAuth: '.withdrawal-auth',           // Требование 2FA для вывода
        withdrawalAuthStep: '.withdrawal-auth-step',  // Ввод кода 2FA для вывода
        withdrawalSchedule: '.withdrawal-schedule',   // Вывод по вторникам 10-18
        autoWithdrawal: '.auto-redirect-tuesday',     // Настройки автовывода
        subPartner: '.sub_partner',                   // Суб-партнерство
        refProgram: '.ref_program',                   // Реферальная программа
        auth2FA: '.auth_2f',                          // Настройки 2FA
        accountSettings: '.sts_ac',                   // Настройки аккаунта
        contentAlert: '.content_alert',               // Выбор контента
        alertBot: '.alert_bot'                        // Алерт бота
    },

    // Текущее открытое модальное окно
    currentModal: null,

    /**
     * Инициализация обработчика модальных окон
     */
    init() {
        console.log('ModalHandler: Инициализация...');
        
        // Ждем загрузки модальных окон из modal-generator.js
        this.waitForModals();
        
        // Навешиваем обработчики на кнопки с data-modal атрибутом
        this.attachButtonHandlers();
        
        // Обработчики для специфичных кнопок
        this.attachSpecificHandlers();
        
        // Обработчики кнопок внутри модальных окон
        this.setupModalButtons();
        
        console.log('ModalHandler: Готов к работе');
    },

    /**
     * Ожидание загрузки модальных окон
     */
    waitForModals() {
        const checkInterval = setInterval(() => {
            const modalsExist = document.querySelector('.witd_funds');
            if (modalsExist) {
                clearInterval(checkInterval);
                this.setupCloseHandlers();
                console.log('ModalHandler: Модальные окна загружены');
            }
        }, 100);

        // Таймаут на случай если окна не загрузятся
        setTimeout(() => clearInterval(checkInterval), 5000);
    },

    /**
     * Открыть модальное окно по ключу
     * @param {string} modalKey - Ключ из объекта modals
     * @param {object} options - Дополнительные опции
     */
    open(modalKey, options = {}) {
        const selector = this.modals[modalKey];
        if (!selector) {
            console.error(`ModalHandler: Модальное окно "${modalKey}" не найдено`);
            return false;
        }

        const modal = document.querySelector(selector);
        if (!modal) {
            console.error(`ModalHandler: Элемент "${selector}" не существует в DOM`);
            return false;
        }

        // Закрываем текущее открытое окно
        if (this.currentModal && this.currentModal !== modal) {
            this.close();
        }

        // Открываем новое окно
        modal.style.display = 'flex';
        this.currentModal = modal;

        // Блокируем прокрутку body
        if (options.blockScroll !== false) {
            document.body.style.overflow = 'hidden';
        }

        console.log(`ModalHandler: Открыто окно "${modalKey}"`);
        return true;
    },

    /**
     * Открыть модальное окно по селектору
     * @param {string} selector - CSS селектор
     */
    openBySelector(selector) {
        const modal = document.querySelector(selector);
        if (!modal) {
            console.error(`ModalHandler: Элемент "${selector}" не найден`);
            return false;
        }

        if (this.currentModal && this.currentModal !== modal) {
            this.close();
        }

        modal.style.display = 'flex';
        this.currentModal = modal;
        document.body.style.overflow = 'hidden';
        
        console.log(`ModalHandler: Открыто окно "${selector}"`);
        return true;
    },

    /**
     * Закрыть текущее модальное окно
     */
    close() {
        if (!this.currentModal) return;

        this.currentModal.style.display = 'none';
        this.currentModal = null;
        document.body.style.overflow = '';

        console.log('ModalHandler: Окно закрыто');
    },

    /**
     * Закрыть все модальные окна
     */
    closeAll() {
        Object.values(this.modals).forEach(selector => {
            const modal = document.querySelector(selector);
            if (modal) {
                modal.style.display = 'none';
            }
        });
        this.currentModal = null;
        document.body.style.overflow = '';
        
        console.log('ModalHandler: Все окна закрыты');
    },

    /**
     * Настройка обработчиков закрытия для всех модальных окон
     */
    setupCloseHandlers() {
        // Кнопки закрытия (крестики)
        document.querySelectorAll('.exit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        });

        // Клик по оверлею (фону)
        Object.values(this.modals).forEach(selector => {
            const modal = document.querySelector(selector);
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close();
                    }
                });
            }
        });

        // ESC для закрытия
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.close();
            }
        });
    },

    /**
     * Навешивание обработчиков на кнопки с data-modal атрибутом
     * Использование: <button data-modal="withdrawal">Открыть</button>
     */
    attachButtonHandlers() {
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-modal]');
            if (trigger) {
                e.preventDefault();
                const modalKey = trigger.dataset.modal;
                this.open(modalKey);
            }
        });
    },

    /**
     * Специфичные обработчики для существующих кнопок
     */
    attachSpecificHandlers() {
        // Кнопка вывода средств в мобильном меню
        document.addEventListener('click', (e) => {
            const modalFunds = e.target.closest('.modal_funds');
            if (modalFunds) {
                e.preventDefault();
                this.openWithdrawal();
            }
        });

        // Кнопка вывода в sidebar
        document.querySelectorAll('.menu-item').forEach(item => {
            const text = item.textContent;
            const img = item.querySelector('img');
            
            if ((text && text.includes('ВЫВОД')) || 
                (img && img.src && img.src.includes('withraw'))) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openWithdrawal();
                });
            }
        });

        // Кнопка суб-партнерства
        document.querySelectorAll('.menu-item').forEach(item => {
            const text = item.textContent;
            if (text && text.includes('СУБ.ПАРТНЕРСТВО')) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.open('subPartner');
                });
            }
        });

        // Кнопка реф.программа
        document.querySelectorAll('.menu-item').forEach(item => {
            const text = item.textContent;
            if (text && text.includes('РЕФ.ПРОГРАММА')) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.open('refProgram');
                });
            }
        });
    },

    /**
     * Логика открытия окна вывода средств
     * ПОСЛЕДОВАТЕЛЬНОСТЬ:
     * 1. НЕ вторник ИЛИ баланс < 2000₽ → окно "Вывод недоступен" (withdrawal)
     * 2. Вторник 10-18 И баланс >= 2000₽ → окно "Вывод по расписанию" (withdrawalSchedule) → кнопка → окно "Верификация" (withdrawalAuth) → кнопка → окно "OTP" (withdrawalAuthStep)
     */
    async openWithdrawal() {
        console.log('ModalHandler: Открытие окна вывода средств...');
        
        // Получаем АКТУАЛЬНЫЙ баланс из базы данных через API
        console.log('ModalHandler: Запрос актуального баланса с сервера...');
        const result = await API.getUserFromServer();
        
        if (!result.success || !result.user) {
            console.error('ModalHandler: Ошибка получения данных с сервера');
            if (typeof Toast !== 'undefined') {
                Toast.error('Ошибка получения данных пользователя с сервера');
            }
            return;
        }
        
        const balance = parseFloat(result.user.balance || 0);
        const MIN_WITHDRAWAL = 2000;
        
        console.log('ModalHandler: Актуальный баланс из БД:', balance + '₽');
        console.log('ModalHandler: Минимум для вывода:', MIN_WITHDRAWAL + '₽');
        
        // Проверяем день недели и время ПО МОСКОВСКОМУ ВРЕМЕНИ (UTC+3)
        const now = new Date();
        const moscowTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
        const dayOfWeek = moscowTime.getDay(); // 0 = Воскресенье, 2 = Вторник
        const hour = moscowTime.getHours();
        
        const isTuesday = dayOfWeek === 2;
        const isWithdrawalTime = hour >= 10 && hour < 18;
        
        console.log('ModalHandler: Московское время:', moscowTime.toLocaleString('ru-RU'));
        console.log('ModalHandler: День недели (МСК):', dayOfWeek, '(2 = вторник)');
        console.log('ModalHandler: Час (МСК):', hour);
        console.log('ModalHandler: Вторник?', isTuesday);
        console.log('ModalHandler: Время 10-18 (МСК)?', isWithdrawalTime);
        
        // Проверяем ВСЕ условия для вывода
        if (balance < MIN_WITHDRAWAL) {
            // Недостаточно средств
            console.log('ModalHandler: Недостаточно средств (< 2000₽)');
            this.open('withdrawal');
        } else if (!isTuesday || !isWithdrawalTime) {
            // Не вторник или не то время
            console.log('ModalHandler: Не вторник или не рабочее время');
            this.open('withdrawal');
        } else {
            // ВСЁ ОК: вторник 10-18 и баланс >= 2000₽
            console.log('ModalHandler: Вторник 10-18 и достаточно средств → открываем форму');
            this.open('withdrawalSchedule');
        }
    },

    /**
     * Настройка обработчиков кнопок внутри модальных окон
     */
    setupModalButtons() {
        // Флаг чтобы избежать дублирования обработчиков
        if (this._buttonsSetup) {
            console.log('ModalHandler: Обработчики кнопок уже настроены');
            return;
        }
        this._buttonsSetup = true;

        // Кнопка "Настроить автовыплаты" в окне witd_funds
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.witd_funds .button_funds button');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                this.close();
                setTimeout(() => this.open('autoWithdrawal'), 300);
            }
        });

        // Кнопка "Продолжить" в окне funds_sts (автовывод)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.funds_sts .button_sts button');
            const isFundsSts = e.target.closest('.auto-redirect-tuesday');
            if (btn && isFundsSts) {
                e.stopPropagation();
                e.preventDefault();
                
                // Валидация кошелька перед продолжением
                const walletInput = document.querySelector('.funds_sts .walet_sts input');
                if (walletInput) {
                    const walletAddress = walletInput.value.trim();
                    
                    // Проверка USDT TRC20 адреса (должен начинаться с T и быть 34 символа)
                    if (!walletAddress) {
                        if (typeof Toast !== 'undefined') {
                            Toast.error('Введите адрес кошелька');
                        } else {
                            alert('Введите адрес кошелька');
                        }
                        return;
                    }
                    
                    if (!walletAddress.startsWith('T') || walletAddress.length !== 34) {
                        if (typeof Toast !== 'undefined') {
                            Toast.error('Неверный адрес USDT TRC20. Адрес должен начинаться с "T" и содержать 34 символа');
                        } else {
                            alert('Неверный адрес USDT TRC20');
                        }
                        return;
                    }
                    
                    // СОХРАНЯЕМ адрес в sessionStorage перед закрытием окна
                    sessionStorage.setItem('withdrawal_usdt_address', walletAddress);
                    console.log('💾 Адрес сохранён в sessionStorage:', walletAddress);
                }
                
                this.close();
                setTimeout(() => this.open('withdrawalAuth'), 300);
            }
        });

        // Кнопка "Запросить выплату" в окне withdrawal-schedule
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.withdrawal-schedule .button_sts button');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                this.close();
                setTimeout(() => this.open('withdrawalAuth'), 300);
            }
        });

        // Кнопка "Пройти верификацию" в окне withdrawal-auth
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.withdrawal-auth .verification button');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                
                // Проверяем включена ли 2FA у пользователя
                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${window.API_BASE_URL || 'https://duopartners.xyz/api'}/2fa/status`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && data.twoFactorEnabled) {
                        // 2FA ВКЛЮЧЕНА → открываем окно ввода OTP кода
                        console.log('2FA включена, открываем окно ввода кода');
                        this.close();
                        setTimeout(() => this.open('withdrawalAuthStep'), 300);
                    } else {
                        // 2FA НЕ ВКЛЮЧЕНА → требуем подключить 2FA
                        console.log('2FA не включена, требуется подключение');
                        
                        if (typeof Toast !== 'undefined') {
                            Toast.warning('Для вывода средств необходимо подключить Google Authenticator (2FA). Перенаправление в настройки...');
                        } else {
                            alert('Для вывода средств необходимо подключить Google Authenticator (2FA)');
                        }
                        
                        // Закрываем текущее окно и открываем настройки 2FA
                        this.close();
                        setTimeout(() => {
                            this.open('auth2FA');
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Ошибка проверки статуса 2FA:', error);
                    // При ошибке показываем уведомление о необходимости 2FA
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Ошибка проверки 2FA. Убедитесь что Google Authenticator подключен');
                    } else {
                        alert('Ошибка проверки 2FA');
                    }
                }
            }
        });

        // Кнопка "Подключить 2FA" в header
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-2fa-add');
            if (btn) {
                e.preventDefault();
                this.open('auth2FA');
            }
        });

        console.log('ModalHandler: Обработчики кнопок настроены');
    },

    /**
     * Проверка открыто ли модальное окно
     * @returns {boolean}
     */
    isOpen() {
        return this.currentModal !== null;
    },

    /**
     * Получить текущее открытое окно
     * @returns {HTMLElement|null}
     */
    getCurrent() {
        return this.currentModal;
    }
};

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Ждем немного чтобы modal-generator.js успел создать окна
        setTimeout(() => ModalHandler.init(), 100);
    });
} else {
    setTimeout(() => ModalHandler.init(), 100);
}

// Экспорт в глобальную область для использования в консоли/других скриптах
window.ModalHandler = ModalHandler;

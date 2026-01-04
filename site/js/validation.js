// ============================================
// Валидация для форм
// ============================================

// Валидация USDT TRC20 адреса
function validateUSDTTRC20Address(address) {
    // TRC20 адрес начинается с 'T' и имеет длину 34 символа
    const trc20Regex = /^T[A-Za-z1-9]{33}$/;
    return trc20Regex.test(address);
}

// Валидация 2FA кода (6 цифр)
function validate2FACode(code) {
    const codeRegex = /^\d{6}$/;
    return codeRegex.test(code);
}

// Добавляем валидацию в реальном времени для всех полей кошелька
function setupWalletValidation() {
    const walletInputs = document.querySelectorAll('.walet_sts input[type="address"]');
    
    walletInputs.forEach(input => {
        // Стиль для ошибки
        const errorStyle = {
            border: '2px solid #ff4444',
            boxShadow: '0 0 5px rgba(255, 68, 68, 0.5)'
        };
        
        const normalStyle = {
            border: '',
            boxShadow: ''
        };
        
        // Проверка при вводе
        input.addEventListener('input', function() {
            const address = this.value.trim();
            
            if (address.length === 0) {
                // Пустое поле - нормальный стиль
                Object.assign(this.style, normalStyle);
                removeErrorMessage(this);
                return;
            }
            
            if (validateUSDTTRC20Address(address)) {
                // Валидный адрес
                Object.assign(this.style, normalStyle);
                removeErrorMessage(this);
            } else {
                // Невалидный адрес
                Object.assign(this.style, errorStyle);
                showErrorMessage(this, 'Неверный формат адреса USDT TRC20. Адрес должен начинаться с "T" и содержать 34 символа.');
            }
        });
        
        // Проверка при потере фокуса
        input.addEventListener('blur', function() {
            const address = this.value.trim();
            
            if (address.length > 0 && !validateUSDTTRC20Address(address)) {
                Object.assign(this.style, errorStyle);
                showErrorMessage(this, 'Неверный формат адреса USDT TRC20. Адрес должен начинаться с "T" и содержать 34 символа.');
            }
        });
    });
}

// Показать сообщение об ошибке под полем
function showErrorMessage(inputElement, message) {
    // Удаляем старое сообщение если есть
    removeErrorMessage(inputElement);
    
    // Создаем новое сообщение
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error-message';
    errorDiv.style.cssText = 'color: #ff4444; font-size: 12px; margin-top: 5px; animation: fadeIn 0.3s;';
    errorDiv.textContent = message;
    
    // Вставляем после родительского элемента поля
    const parent = inputElement.parentElement;
    parent.appendChild(errorDiv);
}

// Удалить сообщение об ошибке
function removeErrorMessage(inputElement) {
    const parent = inputElement.parentElement;
    const existingError = parent.querySelector('.validation-error-message');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Создание заявки на вывод средств
 * Вызывается после успешной 2FA верификации
 */
async function createWithdrawalRequest() {
    try {
        // Получаем адрес кошелька из модального окна
        const usdtInput = document.querySelector('.withdrawal-schedule input[name="usdt_address"]');
        
        if (!usdtInput) {
            console.error('❌ Поле адреса не найдено');
            Toast.error('Ошибка: не найдено поле для адреса кошелька');
            return;
        }
        
        // Получаем баланс пользователя (выводим ВСЁ)
        const user = API.getUserFromStorage();
        if (!user || !user.balance) {
            Toast.error('Невозможно получить баланс пользователя');
            return;
        }
        
        const amount = parseFloat(user.balance);
        const usdtAddress = usdtInput.value.trim();
        
        // Валидация суммы
        if (!amount || amount <= 0) {
            Toast.error('Недостаточно средств для вывода');
            return;
        }
        
        // Проверка минимальной суммы 2000₽
        if (amount < 2000) {
            Toast.error('Минимальная сумма вывода: 2000₽. У вас на балансе: ' + amount.toFixed(2) + '₽');
            return;
        }
        
        if (!usdtAddress || !usdtAddress.startsWith('T') || usdtAddress.length !== 34) {
            Toast.error('Некорректный USDT TRC20 адрес');
            return;
        }
        
        // Отправляем запрос на создание заявки
        const response = await fetch(`${window.API_BASE_URL || 'https://duopartners.xyz/api'}/withdrawal/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API.getToken()}`
            },
            body: JSON.stringify({
                amount,
                usdtAddress
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Заявка на вывод создана:', result);
            Toast.success('Заявка на вывод успешно создана! Ожидайте обработки администратором.');
            
            // Очищаем поля
            amountInput.value = '';
            usdtInput.value = '';
            
            // Закрываем все модальные окна
            document.querySelectorAll('.withdrawal-schedule, .withdrawal-auth-step').forEach(modal => {
                modal.style.display = 'none';
            });
            
        } else {
            console.error('❌ Ошибка создания заявки:', result.message);
            Toast.error(result.message || 'Ошибка создания заявки');
        }
        
    } catch (error) {
        console.error('❌ Ошибка отправки заявки:', error);
        Toast.error('Ошибка связи с сервером');
    }
}

// Проверка 2FA кода при выводе средств
async function verify2FAForWithdrawal() {
    const codeInputs = document.querySelectorAll('.withdrawal-auth-step .type_code .code');
    let code = '';
    
    codeInputs.forEach(input => {
        code += input.value.trim();
    });
    
    console.log('🔑 2FA код для проверки вывода:', code);
    
    if (!validate2FACode(code)) {
        Toast.error('Введите полный код (6 цифр)');
        return false;
    }
    
    // Проверяем код через API (используем тот же эндпоинт что и для включения 2FA)
    try {
        const response = await fetch(`${window.API_BASE_URL || 'https://duopartners.xyz/api'}/2fa/verify-withdrawal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API.getToken()}`
            },
            body: JSON.stringify({ token: code })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 2FA код верный - вывод разрешён');
            Toast.success('Код подтверждён');
            return true;
        } else {
            console.log('❌ 2FA код неверный');
            Toast.error(result.message || 'Неверный код 2FA');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка проверки 2FA:', error);
        Toast.error('Ошибка проверки кода');
        return false;
    }
}

// Настройка свитчера автовывода средств
function setupAutoWithdrawalSwitch() {
    const switches = document.querySelectorAll('.auto_cons .switch_sts');
    
    switches.forEach(switchContainer => {
        const switchElement = switchContainer.querySelector('.switch');
        
        // Начальное состояние - выключен
        let isActive = false;
        
        switchContainer.addEventListener('click', function() {
            isActive = !isActive;
            
            if (isActive) {
                // Включен
                switchElement.style.transform = 'translateX(20px)';
                switchElement.style.backgroundColor = '#4CAF50';
                switchContainer.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                console.log('Автовывод включен');
                Toast.success('Автовывод средств включен');
            } else {
                // Выключен
                switchElement.style.transform = 'translateX(0)';
                switchElement.style.backgroundColor = '#ccc';
                switchContainer.style.backgroundColor = '#e0e0e0';
                console.log('Автовывод выключен');
                Toast.info('Автовывод средств выключен');
            }
            
            // Сохраняем состояние в атрибут
            switchContainer.setAttribute('data-active', isActive);
        });
    });
}

// Получить состояние свитчера автовывода
function getAutoWithdrawalStatus() {
    const switchContainer = document.querySelector('.auto_cons .switch_sts');
    if (!switchContainer) return false;
    
    return switchContainer.getAttribute('data-active') === 'true';
}

// Настройка обработчиков для окна 2FA верификации при выводе
function setupWithdrawal2FAHandlers() {
    const modal = document.querySelector('.withdrawal-auth-step');
    if (!modal) return;
    
    // Автопереключение между полями кода
    const codeInputs = modal.querySelectorAll('.type_code .code');
    
    codeInputs.forEach((input, index) => {
        // Очистка предыдущих обработчиков (если есть)
        input.replaceWith(input.cloneNode(true));
    });
    
    // Получаем новые ссылки после клонирования
    const freshCodeInputs = modal.querySelectorAll('.type_code .code');
    
    freshCodeInputs.forEach((input, index) => {
        // Автопереход на следующее поле при вводе цифры
        input.addEventListener('input', function(e) {
            // Удаляем все нецифровые символы
            this.value = this.value.replace(/\D/g, '');
            
            // Если ввели цифру - переходим на следующее поле
            if (this.value.length === 1) {
                if (index < freshCodeInputs.length - 1) {
                    freshCodeInputs[index + 1].focus();
                }
            }
        });
        
        // Backspace - переход на предыдущее поле
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace') {
                if (this.value.length === 0 && index > 0) {
                    // Переходим на предыдущее поле
                    freshCodeInputs[index - 1].focus();
                }
            }
            
            // Стрелка влево
            if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                freshCodeInputs[index - 1].focus();
            }
            
            // Стрелка вправо
            if (e.key === 'ArrowRight' && index < freshCodeInputs.length - 1) {
                e.preventDefault();
                freshCodeInputs[index + 1].focus();
            }
        });
        
        // Только цифры при нажатии клавиш
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
        
        // Вставка кода из буфера
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = e.clipboardData.getData('text');
            const digits = paste.replace(/\D/g, '').split('').slice(0, 6);
            
            digits.forEach((digit, i) => {
                if (freshCodeInputs[i]) {
                    freshCodeInputs[i].value = digit;
                }
            });
            
            // Фокус на последнем заполненном поле или первом пустом
            const lastFilledIndex = Math.min(digits.length - 1, 5);
            if (freshCodeInputs[lastFilledIndex]) {
                freshCodeInputs[lastFilledIndex].focus();
            }
        });
        
        // Двойной клик - очистка всех полей
        input.addEventListener('dblclick', function() {
            freshCodeInputs.forEach(inp => inp.value = '');
            freshCodeInputs[0].focus();
        });
    });
    
    // Обработчик кнопки "Продолжить"
    const continueBtn = modal.querySelector('.button_2f button');
    if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
            const isValid = await verify2FAForWithdrawal();
            
            if (isValid) {
                // Закрываем модальное окно 2FA
                modal.style.display = 'none';
                
                // Показываем успешное сообщение
                Toast.success('2FA верификация пройдена. Создаём заявку на вывод...');
                
                // Создаём заявку на вывод через API
                await createWithdrawalRequest();
            }
        });
    }
}

// Обработка вывода средств после успешной 2FA
async function processWithdrawal() {
    // Получаем данные из формы вывода
    const walletInput = document.querySelector('.funds_sts .walet_sts input, .withdrawal-schedule .walet_sts input');
    
    if (!walletInput) {
        Toast.error('Не найдено поле кошелька');
        return;
    }
    
    const walletAddress = walletInput.value.trim();
    
    // Валидация адреса
    if (!validateUSDTTRC20Address(walletAddress)) {
        Toast.error('Неверный формат адреса USDT TRC20');
        return;
    }
    
    // Отправляем запрос на вывод
    console.log('Отправка запроса на вывод средств...');
    console.log('Адрес кошелька:', walletAddress);
    
    // Здесь добавить реальный API запрос на вывод
    // const result = await API.requestWithdrawal(walletAddress);
    
    Toast.success('Заявка на вывод средств отправлена');
}

// Инициализация всех валидаций
document.addEventListener('DOMContentLoaded', function() {
    console.log('Validation.js загружен');
    
    // Ждем немного, чтобы модальные окна успели создаться
    setTimeout(() => {
        setupWalletValidation();
        setupWithdrawal2FAHandlers();
        setupAutoWithdrawalSwitch();
        console.log('✅ Валидация инициализирована');
    }, 500);
    
    // Реинициализация при открытии модальных окон (ТОЛЬКО 1 РАЗ!)
    let withdrawal2FAHandlersInitialized = false;
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            const withdrawalModal = document.querySelector('.withdrawal-auth-step');
            if (withdrawalModal && withdrawalModal.style.display === 'flex') {
                if (!withdrawal2FAHandlersInitialized) {
                    console.log('Модальное окно 2FA открыто - инициализация обработчиков');
                    withdrawal2FAHandlersInitialized = true;
                    setTimeout(() => {
                        setupWithdrawal2FAHandlers();
                    }, 100);
                }
            }
        });
    });
    
    // Наблюдаем за изменениями в body
    observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['style']
    });
});

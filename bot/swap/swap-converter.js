/**
 * Swap Converter - Конвертер рублей и фишек
 * Интеграция с глобальной системой баланса
 */

(function() {
    'use strict';

    // Курс обмена: 1 рубль = 1 фишка (можно настроить)
    const EXCHANGE_RATE = 1;
    const MIN_AMOUNT = 1;
    const CHIPS_TO_RUBLES_FEE = 0.05; // 5% комиссия при обмене фишек на рубли

    // Элементы UI
    const elements = {
        rublesInput: document.querySelector('.rubles .text-wrapper-7'),
        tokensInput: document.querySelector('.tokens .text-wrapper-7'),
        exchangeButton: document.querySelector('.exchenge-button'),
        rublesIcon: document.querySelector('.rubles .overlap-group-wrapper'),
        tokensIcon: document.querySelector('.tokens .overlap-group-wrapper'),
        vectorIcon: document.querySelector('.vector'),
        rublesContainer: document.querySelector('.rubles'),
        tokensContainer: document.querySelector('.tokens'),
        swapContainer: document.querySelector('.div-3')
    };

    // Состояние
    let currentMode = 'rubles-to-chips'; // 'rubles-to-chips' или 'chips-to-rubles'
    let rublesAmount = 0;
    let tokensAmount = 0;
    let isSwapping = false; // Флаг для блокировки во время анимации

    /**
     * Инициализация
     */
    function init() {
        if (!elements.rublesInput || !elements.tokensInput || !elements.exchangeButton) {
            console.error('❌ Swap Converter: необходимые элементы не найдены');
            return;
        }

        // Делаем поля редактируемыми (plaintext-only блокирует форматирование и переносы)
        elements.rublesInput.setAttribute('contenteditable', 'plaintext-only');
        elements.rublesInput.setAttribute('inputmode', 'decimal');
        elements.rublesInput.setAttribute('autocomplete', 'off');
        elements.rublesInput.setAttribute('autocorrect', 'off');
        elements.rublesInput.setAttribute('spellcheck', 'false');

        elements.tokensInput.setAttribute('contenteditable', 'plaintext-only');
        elements.tokensInput.setAttribute('inputmode', 'decimal');
        elements.tokensInput.setAttribute('autocomplete', 'off');
        elements.tokensInput.setAttribute('autocorrect', 'off');
        elements.tokensInput.setAttribute('spellcheck', 'false');

        // Добавляем стили для редактируемых полей
        addStyles();

        // Устанавливаем начальные значения
        updateRublesDisplay(0);
        updateTokensDisplay(0);

        // Подключаем обработчики
        setupEventListeners();

        // Обновляем начальный баланс
        updateBalanceDisplay();

        console.log('✅ Swap Converter инициализирован');
    }

    /**
     * Добавление стилей
     */
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .rubles,
            .tokens {
                cursor: pointer !important;
                transition: all 0.3s ease;
            }

            /* Когда rubles на первой позиции */
            .rubles:first-child {
                justify-content: flex-start !important;
            }

            /* Когда tokens на первой позиции */
            .tokens:first-child {
                justify-content: flex-start !important;
            }

            /* Когда rubles на последней позиции */
            .rubles:last-child {
                justify-content: flex-end !important;
            }

            /* Когда tokens на последней позиции */
            .tokens:last-child {
                justify-content: flex-end !important;
            }

            .vector {
                cursor: pointer;
                transition: transform 0.5s ease;
            }

            .rubles.swapping,
            .tokens.swapping {
                pointer-events: none;
            }

            .vector.swap-rotate {
                transform: rotate(180deg);
            }

            .rubles .text-wrapper-7,
            .tokens .text-wrapper-7 {
                outline: none;
                cursor: text !important;
                user-select: text !important;
                min-width: 50px;
                max-width: 90px;
                display: inline-block;
                -webkit-user-select: text !important;
                pointer-events: auto !important;
                -moz-user-select: text;
                -ms-user-select: text;
                overflow: hidden;
                white-space: nowrap;
                word-break: keep-all;
                word-wrap: normal;
                overflow-wrap: normal;
            }

            .rubles .text-wrapper-7 {
                caret-color: #fff;
            }

            .tokens .text-wrapper-7 {
                caret-color: #CA3959;
            }

            .rubles .text-wrapper-7:focus,
            .tokens .text-wrapper-7:focus {
                outline: none;
                text-shadow: 0px 0px 10px rgba(255, 255, 255, 0.5);
            }

            .tokens .text-wrapper-7:focus {
                text-shadow: 0px 0px 10px rgba(202, 57, 89, 0.5);
            }

            .vector {
                cursor: pointer;
                transition: transform 0.3s ease, filter 0.2s;
                will-change: transform;
            }

            .vector:hover {
                transform: scale(1.15);
                filter: brightness(1.2);
            }

            .vector:active {
                transform: scale(0.95) rotate(180deg);
            }





            .exchenge-button {
                cursor: pointer;
                transition: transform 0.2s, opacity 0.2s;
            }

            .exchenge-button:hover {
                transform: scale(1.05);
                opacity: 0.9;
            }

            .exchenge-button:active {
                transform: scale(0.95);
            }

            .exchenge-button.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }

            .rubles .overlap-group-wrapper,
            .tokens .icon-token {
                cursor: pointer;
                transition: transform 0.2s;
            }

            .rubles .overlap-group-wrapper:hover,
            .tokens .icon-token:hover {
                transform: scale(1.1);
            }

            .mode-indicator {
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(60, 60, 60, 0.9);
                color: #39ff95;
                padding: 4px 12px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.5px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
                z-index: 10;
            }

            .mode-indicator.active {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Настройка обработчиков событий
     */
    function setupEventListeners() {
        // Блокируем перенос строки через Enter/Shift+Enter
        const blockLineBreaks = (e) => {
            // Блокируем Enter и Shift+Enter
            if (e.key === 'Enter' || (e.keyCode === 13)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        
        // Блокируем вставку текста с переносами строк
        const blockPasteBreaks = (e) => {
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            if (paste && paste.includes('\n')) {
                e.preventDefault();
                // Вставляем только первую строку без переносов
                const cleanText = paste.split('\n')[0].replace(/[^0-9.]/g, '');
                document.execCommand('insertText', false, cleanText);
                return false;
            }
        };
        
        // Ввод в поле рублей
        elements.rublesInput.addEventListener('input', handleRublesInput);
        elements.rublesInput.addEventListener('focus', () => handleFieldFocus('rubles'));
        elements.rublesInput.addEventListener('blur', handleBlur);
        elements.rublesInput.addEventListener('keydown', blockLineBreaks);
        elements.rublesInput.addEventListener('paste', blockPasteBreaks);
        
        // Клик на весь контейнер рублей для быстрого фокуса
        if (elements.rublesContainer) {
            const focusRubles = (e) => {
                // Игнорируем клик на иконку
                if (e.target.closest('.overlap-group-wrapper')) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                elements.rublesInput.focus();
                // Для мобильных небольшая задержка для открытия клавиатуры
                setTimeout(() => selectAllText(elements.rublesInput), 50);
            };
            elements.rublesContainer.addEventListener('click', focusRubles);
            elements.rublesContainer.addEventListener('touchend', focusRubles);
        }

        // Ввод в поле фишек
        elements.tokensInput.addEventListener('input', handleTokensInput);
        elements.tokensInput.addEventListener('focus', () => handleFieldFocus('tokens'));
        elements.tokensInput.addEventListener('blur', handleBlur);
        elements.tokensInput.addEventListener('keydown', blockLineBreaks);
        elements.tokensInput.addEventListener('paste', blockPasteBreaks);
        
        // Клик на весь контейнер фишек для быстрого фокуса
        if (elements.tokensContainer) {
            const focusTokens = (e) => {
                // Игнорируем клик на иконку
                if (e.target.closest('.overlap-group-wrapper')) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                elements.tokensInput.focus();
                // Для мобильных небольшая задержка для открытия клавиатуры
                setTimeout(() => selectAllText(elements.tokensInput), 50);
            };
            elements.tokensContainer.addEventListener('click', focusTokens);
            elements.tokensContainer.addEventListener('touchend', focusTokens);
        }

        // Кнопка обмена
        elements.exchangeButton.addEventListener('click', handleExchange);

        // Переключение режима по клику на иконки
        if (elements.rublesIcon) {
            elements.rublesIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                switchMode('rubles-to-chips');
            });
        }
        if (elements.tokensIcon) {
            elements.tokensIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                switchMode('chips-to-rubles');
            });
        }

        // Клик на vector для смены направления с анимацией
        if (elements.vectorIcon) {
            elements.vectorIcon.addEventListener('click', () => {
                swapCurrenciesWithAnimation();
            });
        }

        // Обновление баланса при изменениях
        if (window.BalanceAPI) {
            // Подписываемся на обновления баланса
            const originalUpdate = window.BalanceAPI.updateBalanceUI;
            window.BalanceAPI.updateBalanceUI = function() {
                originalUpdate.call(window.BalanceAPI);
                updateBalanceDisplay();
            };
        }
    }

    /**
     * Обработка фокуса на поле
     */
    function handleFieldFocus(field) {
        if (field === 'rubles') {
            currentMode = 'rubles-to-chips';
            if (elements.rublesInput.textContent === '0.00') {
                elements.rublesInput.textContent = '';
            } else {
                // Выделяем весь текст для удобства редактирования
                setTimeout(() => selectAllText(elements.rublesInput), 10);
            }
        } else {
            currentMode = 'chips-to-rubles';
            if (elements.tokensInput.textContent === '0.00') {
                elements.tokensInput.textContent = '';
            } else {
                // Выделяем весь текст для удобства редактирования
                setTimeout(() => selectAllText(elements.tokensInput), 10);
            }
        }
        showModeIndicator();
    }

    /**
     * Обработка потери фокуса
     */
    function handleBlur(e) {
        const target = e.target;
        if (target === elements.rublesInput && target.textContent.trim() === '') {
            updateRublesDisplay(0);
        } else if (target === elements.tokensInput && target.textContent.trim() === '') {
            updateTokensDisplay(0);
        }
    }

    /**
     * Обработка ввода в поле рублей
     */
    function handleRublesInput() {
        currentMode = 'rubles-to-chips';
        
        let text = elements.rublesInput.textContent || '';
        // Удаляем все переносы строк и недопустимые символы
        text = text.replace(/[\r\n]/g, '').replace(/[^0-9.]/g, '');
        
        // Разрешаем только одну точку
        const parts = text.split('.');
        if (parts.length > 2) {
            text = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Ограничиваем два знака после запятой
        if (parts.length === 2 && parts[1].length > 2) {
            text = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // Лимит до 1 миллиона
        const maxValue = 1000000;
        const numValue = parseFloat(text) || 0;
        if (numValue > maxValue) {
            text = maxValue.toString();
        }

        if (elements.rublesInput.textContent !== text) {
            elements.rublesInput.textContent = text;
            moveCursorToEnd(elements.rublesInput);
        }

        rublesAmount = parseFloat(text) || 0;
        tokensAmount = calculateTokensFromRubles(rublesAmount);
        updateTokensDisplay(tokensAmount);
    }

    /**
     * Обработка ввода в поле фишек
     */
    function handleTokensInput() {
        currentMode = 'chips-to-rubles';
        
        let text = elements.tokensInput.textContent || '';
        // Удаляем все переносы строк и недопустимые символы
        text = text.replace(/[\r\n]/g, '').replace(/[^0-9.]/g, '');
        
        // Разрешаем только одну точку
        const parts = text.split('.');
        if (parts.length > 2) {
            text = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Ограничиваем два знака после запятой
        if (parts.length === 2 && parts[1].length > 2) {
            text = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // Лимит до 1 миллиона
        const maxValue = 1000000;
        const numValue = parseFloat(text) || 0;
        if (numValue > maxValue) {
            text = maxValue.toString();
        }

        if (elements.tokensInput.textContent !== text) {
            elements.tokensInput.textContent = text;
            moveCursorToEnd(elements.tokensInput);
        }

        tokensAmount = parseFloat(text) || 0;
        rublesAmount = calculateRublesFromTokens(tokensAmount);
        updateRublesDisplay(rublesAmount);
    }

    /**
     * Переключение режима конвертации
     */
    function switchMode(mode) {
        currentMode = mode;
        
        if (mode === 'rubles-to-chips') {
            elements.rublesInput.focus();
        } else {
            elements.tokensInput.focus();
        }
    }

    /**
     * Показать индикатор комиссии (убрано)
     */
    function showFeeIndicator() {
        // Индикатор комиссии убран по запросу пользователя
    }

    /**
     * Анимация смены валют местами
     */
    function swapCurrenciesWithAnimation() {
        if (!elements.rublesContainer || !elements.tokensContainer || !elements.vectorIcon) {
            return;
        }

        // Блокируем повторные клики
        if (isSwapping) {
            return;
        }

        isSwapping = true;

        // Анимация vector
        elements.vectorIcon.classList.add('swap-rotate');
        elements.rublesContainer.classList.add('swapping');
        elements.tokensContainer.classList.add('swapping');

        // Меняем режим
        if (currentMode === 'rubles-to-chips') {
            currentMode = 'chips-to-rubles';
        } else {
            currentMode = 'rubles-to-chips';
        }

        // Пересчитываем значения при переключении
        if (rublesAmount > 0 || tokensAmount > 0) {
            if (currentMode === 'chips-to-rubles') {
                const temp = rublesAmount;
                tokensAmount = temp;
                rublesAmount = calculateRublesFromTokens(temp);
            } else {
                const temp = tokensAmount;
                rublesAmount = temp;
                tokensAmount = calculateTokensFromRubles(temp);
            }
        }

        // Физически меняем местами блоки .rubles и .tokens в DOM
        const parent = elements.swapContainer;
        const rublesBlock = elements.rublesContainer;
        const tokensBlock = elements.tokensContainer;
        const vectorBlock = elements.vectorIcon;
        
        // Определяем текущий порядок
        const isRublesFirst = parent.children[0] === rublesBlock;
        
        // Удаляем элементы из DOM (но сохраняем ссылки)
        parent.removeChild(rublesBlock);
        parent.removeChild(tokensBlock);
        parent.removeChild(vectorBlock);
        
        // Вставляем в новом порядке
        if (isRublesFirst) {
            // Было: rubles, vector, tokens → Станет: tokens, vector, rubles
            parent.appendChild(tokensBlock);
            parent.appendChild(vectorBlock);
            parent.appendChild(rublesBlock);
        } else {
            // Было: tokens, vector, rubles → Станет: rubles, vector, tokens
            parent.appendChild(rublesBlock);
            parent.appendChild(vectorBlock);
            parent.appendChild(tokensBlock);
        }

        // Обновляем ссылки на элементы
        elements.rublesContainer = document.querySelector('.rubles');
        elements.tokensContainer = document.querySelector('.tokens');
        elements.rublesInput = document.querySelector('.rubles .text-wrapper-7');
        elements.tokensInput = document.querySelector('.tokens .text-wrapper-7');
        elements.rublesIcon = document.querySelector('.rubles .overlap-group-wrapper');
        elements.tokensIcon = document.querySelector('.tokens .overlap-group-wrapper');
        elements.vectorIcon = document.querySelector('.vector');
        
        // Обновляем отображение
        updateRublesDisplay(rublesAmount);
        updateTokensDisplay(tokensAmount);
        
        // Переподключаем обработчики
        setupEventListeners();

        // Убираем классы после анимации
        setTimeout(() => {
            const rubles = document.querySelector('.rubles');
            const tokens = document.querySelector('.tokens');
            const vector = document.querySelector('.vector');
            
            if (rubles) rubles.classList.remove('swapping');
            if (tokens) tokens.classList.remove('swapping');
            if (vector) vector.classList.remove('swap-rotate');
            
            isSwapping = false;
        }, 500);
    }

    /**
     * Показать индикатор режима
     */
    function showModeIndicator() {
        // Убрали индикатор режима - он не нужен
    }

    /**
     * Обработка нажатия кнопки Exchange
     */
    async function handleExchange() {
        if (!window.BalanceAPI) {
            showNotification('Система баланса не загружена');
            return;
        }

        if (currentMode === 'rubles-to-chips') {
            await exchangeRublesToChips();
        } else {
            await exchangeChipsToRubles();
        }
    }

    /**
     * Обмен рублей на фишки
     */
    async function exchangeRublesToChips() {
        if (rublesAmount < MIN_AMOUNT) {
            showNotification(`Минимальная сумма обмена: ${MIN_AMOUNT} ₽`);
            return;
        }

        // Максимальная сумма обмена - 1 миллион
        const MAX_EXCHANGE = 1000000;
        if (rublesAmount > MAX_EXCHANGE) {
            showNotification(`Максимальная сумма обмена: ${MAX_EXCHANGE.toLocaleString('ru-RU')} ₽`);
            return;
        }

        const currentRubles = window.BalanceAPI.getRubles();
        if (rublesAmount > currentRubles) {
            showNotification('Недостаточно рублей');
            return;
        }

        // Списываем рубли через placeBet
        const deducted = window.BalanceAPI.subtractRubles(rublesAmount);
        if (!deducted) {
            showNotification('Ошибка списания рублей');
            return;
        }

        // Начисляем фишки
        const chipsToAdd = parseFloat(tokensAmount.toFixed(2));
        window.BalanceAPI.addChips(chipsToAdd);

        showNotification(`Обменяно: ${rublesAmount.toFixed(2)} ₽ → ${chipsToAdd.toFixed(2)} Chips`);

        // Сбрасываем поля
        resetInputs();
        updateBalanceDisplay();
    }

    /**
     * Обмен фишек на рубли (с комиссией 5%)
     */
    async function exchangeChipsToRubles() {
        if (tokensAmount < MIN_AMOUNT) {
            showNotification(`Минимальная сумма обмена: ${MIN_AMOUNT} Chips`);
            return;
        }

        // Максимальная сумма обмена - 1 миллион
        const MAX_EXCHANGE = 1000000;
        if (tokensAmount > MAX_EXCHANGE) {
            showNotification(`Максимальная сумма обмена: ${MAX_EXCHANGE.toLocaleString('ru-RU')} Chips`);
            return;
        }

        const currentChips = window.BalanceAPI.getChips();
        if (tokensAmount > currentChips) {
            showNotification('Недостаточно фишек');
            return;
        }

        // Списываем фишки через placeBet
        const deducted = window.BalanceAPI.subtractChips(tokensAmount);
        if (!deducted) {
            showNotification('Ошибка списания фишек');
            return;
        }

        // Начисляем рубли (уже рассчитано с учетом комиссии)
        const rublesToAdd = parseFloat(rublesAmount.toFixed(2));
        const fee = parseFloat((tokensAmount * EXCHANGE_RATE * CHIPS_TO_RUBLES_FEE).toFixed(2));
        
        window.BalanceAPI.addRubles(rublesToAdd);

        showNotification(`Обменяно: ${tokensAmount.toFixed(2)} Chips → ${rublesToAdd.toFixed(2)} ₽ (комиссия ${fee.toFixed(2)} ₽)`);

        // Сбрасываем поля
        resetInputs();
        updateBalanceDisplay();
    }

    /**
     * Расчет фишек из рублей
     */
    function calculateTokensFromRubles(rubles) {
        return rubles * EXCHANGE_RATE;
    }

    /**
     * Расчет рублей из фишек (с учетом комиссии 5%)
     */
    function calculateRublesFromTokens(tokens) {
        const baseAmount = tokens / EXCHANGE_RATE;
        const fee = baseAmount * CHIPS_TO_RUBLES_FEE;
        return baseAmount - fee;
    }

    /**
     * Обновление отображения рублей
     */
    function updateRublesDisplay(amount) {
        if (elements.rublesInput && document.activeElement !== elements.rublesInput) {
            elements.rublesInput.textContent = amount.toFixed(2);
        }
    }

    /**
     * Обновление отображения фишек
     */
    function updateTokensDisplay(amount) {
        if (elements.tokensInput && document.activeElement !== elements.tokensInput) {
            elements.tokensInput.textContent = amount.toFixed(2);
        }
    }

    /**
     * Обновление отображения баланса
     */
    function updateBalanceDisplay() {
        if (!window.BalanceAPI) return;

        const rubles = window.BalanceAPI.getRubles();
        const chips = window.BalanceAPI.getChips();

        // Баланс уже обновляется через GameBalanceAPI.updateBalanceUI
        console.log(`💰 Текущий баланс: ${rubles.toFixed(2)} ₽ | ${chips} Chips`);
    }

    /**
     * Сброс полей ввода
     */
    function resetInputs() {
        rublesAmount = 0;
        tokensAmount = 0;
        updateRublesDisplay(0);
        updateTokensDisplay(0);
    }

    /**
     * Перемещение курсора в конец
     */
    function moveCursorToEnd(element) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Выделение всего текста
     */
    function selectAllText(element) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Показать уведомление
     */
    function showNotification(message) {
        let notification = document.getElementById('swap-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'swap-notification';
            notification.style.cssText = `
                position: fixed;
                left: 50%;
                top: 10px;
                transform: translateX(-50%);
                background: rgba(60, 60, 60, 0.92);
                color: rgb(229, 229, 229);
                padding: 10px 14px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: rgba(0, 0, 0, 0.35) 0px 6px 20px;
                font-family: Montserrat, Inter, Arial, sans-serif;
                font-size: 13px;
                letter-spacing: 0.2px;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.opacity = '0';
            }, 2500);
        });
    }

    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Экспорт для внешнего использования
    window.SwapConverter = {
        setExchangeRate: (rate) => { 
            if (rate > 0) EXCHANGE_RATE = rate; 
        },
        getExchangeRate: () => EXCHANGE_RATE,
        getCurrentMode: () => currentMode,
        reset: resetInputs
    };

})();

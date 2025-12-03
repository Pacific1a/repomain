// ============================================
// СИСТЕМА ЛОКАЛИЗАЦИИ (i18n)
// ============================================
(function() {
    'use strict';
    
    const translations = {
        ru: {
            // Общие
            'loading': 'Загрузка...',
            'error': 'Ошибка',
            
            // Header
            'deposit': 'Пополнить',
            'balance': 'Баланс',
            
            // Profile
            'your_transactions': 'Ваши транзакции:',
            'show_more': 'Показать ещё',
            'invite_friends': 'Пригласи друзей',
            'invite': 'Пригласить',
            'follow_us': 'Подпишись на наши соцсети!',
            
            // Menu
            'main': 'Главная',
            'upgrade': 'Апгрейд',
            'game': 'Игры',
            'swap': 'Обмен',
            'profile': 'Профиль',
            
            // Transactions
            'transaction_add': 'Пополнение',
            'transaction_subtract': 'Списание',
            'transaction_win': 'Выигрыш',
            'transaction_bet': 'Ставка',
            'refill_via': 'Пополнение через',
            
            // Upgrade
            'bet_amount': 'Сумма ставки:',
            'desired_prize': 'Желаемый выигрыш:',
            'chance': 'Шанс:',
            'apply': 'Применить',
            'upgrade_button': 'Апгрейд',
            'min_bet': 'Минимальная ставка',
            'max_bet': 'Максимальная ставка',
            'no_chips': 'У вас нет фишек! Обменяйте рубли на фишки в разделе Swap',
            'insufficient_chips': 'Недостаточно фишек. У вас:',
            'bet_accepted': 'Ставка принята! Нажмите Upgrade',
            'enter_bet': 'Введите ставку',
            'insufficient_funds': 'Недостаточно средств',
            'click_apply': 'Сначала нажмите Apply',
            
            // Swap
            'exchange': 'Обмен',
            'from': 'Из',
            'to': 'В',
            'amount': 'Сумма',
            'rate': 'Курс',
            'exchange_button': 'Обменять',
            'rubles': 'Рубли',
            'chips': 'Фишки',
            
            // Games
            'choose_game': 'Выберите игру',
            'crash': 'Краш',
            'roll': 'Рулетка',
            'mines': 'Мины',
            'blackjack': 'Блэкджек',
            'speedcash': 'SpeedCASH',
            
            // Notifications
            'success': 'Успешно',
            'warning': 'Внимание',
            'language_changed': 'Язык изменён'
        },
        
        en: {
            // General
            'loading': 'Loading...',
            'error': 'Error',
            
            // Header
            'deposit': 'Deposit',
            'balance': 'Balance',
            
            // Profile
            'your_transactions': 'Your transactions:',
            'show_more': 'Show more',
            'invite_friends': 'Invite Friends',
            'invite': 'Invite',
            'follow_us': 'Follow us on social media!',
            
            // Menu
            'main': 'Main',
            'upgrade': 'Upgrade',
            'game': 'Games',
            'swap': 'Swap',
            'profile': 'Profile',
            
            // Transactions
            'transaction_add': 'Deposit',
            'transaction_subtract': 'Withdrawal',
            'transaction_win': 'Win',
            'transaction_bet': 'Bet',
            'refill_via': 'Deposit via',
            
            // Upgrade
            'bet_amount': 'Bet Amount:',
            'desired_prize': 'Desired prize:',
            'chance': 'Chance:',
            'apply': 'Apply',
            'upgrade_button': 'Upgrade',
            'min_bet': 'Min bet',
            'max_bet': 'Max bet',
            'no_chips': 'You have no chips! Exchange rubles for chips in Swap',
            'insufficient_chips': 'Insufficient chips. You have:',
            'bet_accepted': 'Bet accepted! Click Upgrade',
            'enter_bet': 'Enter bet',
            'insufficient_funds': 'Insufficient funds',
            'click_apply': 'Click Apply first',
            
            // Swap
            'exchange': 'Exchange',
            'from': 'From',
            'to': 'To',
            'amount': 'Amount',
            'rate': 'Rate',
            'exchange_button': 'Exchange',
            'rubles': 'Rubles',
            'chips': 'Chips',
            
            // Games
            'choose_game': 'Choose game',
            'crash': 'Crash',
            'roll': 'Roulette',
            'mines': 'Mines',
            'blackjack': 'Blackjack',
            'speedcash': 'SpeedCASH',
            
            // Notifications
            'success': 'Success',
            'warning': 'Warning',
            'language_changed': 'Language changed'
        }
    };
    
    class I18n {
        constructor() {
            this.currentLang = localStorage.getItem('lang') || 'ru';
            this.translations = translations;
            console.log(`🌐 Language: ${this.currentLang}`);
        }
        
        t(key) {
            return this.translations[this.currentLang][key] || key;
        }
        
        setLanguage(lang) {
            if (!this.translations[lang]) {
                console.error(`❌ Language ${lang} not found`);
                return false;
            }
            
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
            this.updatePage();
            
            // Отправляем событие для других скриптов
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: { lang } 
            }));
            
            console.log(`✅ Language changed to: ${lang}`);
            return true;
        }
        
        getCurrentLanguage() {
            return this.currentLang;
        }
        
        updatePage() {
            // Обновляем все элементы с data-i18n атрибутом
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = this.t(key);
                
                // Проверяем тип элемента
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            });
            
            // Обновляем элементы с data-i18n-placeholder
            document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                element.placeholder = this.t(key);
            });
            
            // Обновляем элементы с data-i18n-title
            document.querySelectorAll('[data-i18n-title]').forEach(element => {
                const key = element.getAttribute('data-i18n-title');
                element.title = this.t(key);
            });
        }
    }
    
    // Создаем глобальный экземпляр
    window.i18n = new I18n();
    
    // Автоматически обновляем страницу при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.i18n.updatePage());
    } else {
        window.i18n.updatePage();
    }
    
    console.log('✅ i18n initialized');
})();

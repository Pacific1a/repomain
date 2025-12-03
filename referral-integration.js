// ============================================
// ИНТЕГРАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ИГРАМИ
// ============================================
// Этот файл добавляет автоматическое начисление процентов при выигрышах

(function() {
    'use strict';
    
    // Оригинальный метод addChips из BalanceAPI
    if (window.BalanceAPI) {
        const originalAddChips = window.BalanceAPI.addChips.bind(window.BalanceAPI);
        
        // Переопределяем метод для отслеживания выигрышей
        window.BalanceAPI.addChips = async function(amount, source = 'game', description = '') {
            // Вызываем оригинальный метод
            const result = await originalAddChips(amount, source, description);
            
            // Если это выигрыш в игре - начисляем процент рефереру
            if (result && source && ['upgrade', 'crash', 'roll', 'mines', 'blackjack', 'speedcash'].includes(source)) {
                console.log(`🎰 Win detected: ${amount} chips from ${source}`);
                
                // Начисляем процент рефереру
                if (window.ReferralSystem) {
                    await window.ReferralSystem.addReferralEarnings(
                        window.BalanceAPI.telegramId,
                        amount
                    );
                }
            }
            
            return result;
        };
        
        console.log('✅ Referral integration installed on BalanceAPI');
    }
    
    // Также можно добавить интеграцию с GameBalanceAPI если он используется
    if (window.GameBalanceAPI) {
        const originalAddBalance = window.GameBalanceAPI.addBalance.bind(window.GameBalanceAPI);
        
        window.GameBalanceAPI.addBalance = async function(rubles, chips, source = 'game', description = '') {
            const result = await originalAddBalance(rubles, chips, source, description);
            
            // Начисляем процент только от фишек при выигрыше
            if (result && chips > 0 && source && ['upgrade', 'crash', 'roll', 'mines', 'blackjack', 'speedcash'].includes(source)) {
                console.log(`🎰 Win detected: ${chips} chips from ${source}`);
                
                if (window.ReferralSystem) {
                    await window.ReferralSystem.addReferralEarnings(
                        window.GameBalanceAPI.telegramId,
                        chips
                    );
                }
            }
            
            return result;
        };
        
        console.log('✅ Referral integration installed on GameBalanceAPI');
    }
})();

// Добавляем глобальную функцию для ручного начисления процентов
window.addReferralBonus = async function(userId, amount) {
    if (window.ReferralSystem) {
        return await window.ReferralSystem.addReferralEarnings(userId, amount);
    }
    console.warn('⚠️ ReferralSystem not loaded');
    return false;
};

console.log('✅ Referral integration loaded');

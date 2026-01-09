// ============================================
// ИНТЕГРАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ИГРАМИ
// ============================================
// Этот файл добавляет автоматическое начисление процентов при ДЕПОЗИТАХ игроков
// Партнёр получает 10% от суммы депозита реферала

(function() {
    'use strict';
    
    // Функция для начисления профита рефереру при ДЕПОЗИТЕ игрока
    const trackDeposit = async (userId, depositAmount, source) => {
        console.log(`💰 Deposit detected: ${depositAmount}₽ from ${source}`);
        
        if (window.ReferralSystem) {
            try {
                // Партнёр получает 10% от депозита
                await window.ReferralSystem.addReferralEarnings(userId, depositAmount);
                console.log(`✅ Referral bonus processed for ${userId}: ${depositAmount}₽ deposit`);
            } catch (e) {
                console.error('❌ Referral bonus error:', e);
            }
        } else {
            console.warn('⚠️ ReferralSystem not loaded');
        }
    };
    
    // Перехват BalanceAPI.addRubles - ЭТО ДЕПОЗИТЫ!
    if (window.BalanceAPI) {
        const originalAddRubles = window.BalanceAPI.addRubles.bind(window.BalanceAPI);
        
        window.BalanceAPI.addRubles = async function(amount, source = 'deposit', description = '') {
            console.log(`💰 BalanceAPI.addRubles called: amount=${amount}₽, source=${source}`);
            
            const result = await originalAddRubles(amount, source, description);
            
            // Если это депозит - партнёр получает 10%
            if (result && amount > 0 && (source === 'deposit' || source === 'refill')) {
                await trackDeposit(window.BalanceAPI.telegramId, amount, source);
            }
            
            return result;
        };
        
        console.log('✅ Referral integration installed on BalanceAPI.addRubles');
    }
    
    // Подтверждаем загрузку после инициализации
    setTimeout(() => {
        if (window.BalanceAPI && window.BalanceAPI.subtractRubles) {
            console.log('✅ Referral integration fully loaded and ready');
        }
    }, 1000);
})();

// Добавляем глобальную функцию для ручного начисления процентов (если нужно)
window.addReferralBonus = async function(userId, amount) {
    if (window.ReferralSystem) {
        return await window.ReferralSystem.addReferralEarnings(userId, amount);
    }
    console.warn('⚠️ ReferralSystem not loaded');
    return false;
};

console.log('✅ Referral integration loaded');

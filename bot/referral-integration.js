// ============================================
// ИНТЕГРАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ИГРАМИ
// ============================================
// Этот файл добавляет автоматическое начисление процентов при ПРОИГРЫШАХ игроков
// Партнёр получает 60% от суммы проигрыша реферала

(function() {
    'use strict';
    
    // Функция для начисления профита рефереру при ПРОИГРЫШЕ игрока
    const trackLoss = async (userId, lossAmount, source) => {
        console.log(`💸 Loss detected: ${lossAmount}₽ from ${source}`);
        
        if (window.ReferralSystem) {
            try {
                // Партнёр получает 60% от проигрыша
                await window.ReferralSystem.addReferralEarnings(userId, lossAmount);
                console.log(`✅ Referral bonus processed for ${userId}: ${lossAmount}₽ loss`);
            } catch (e) {
                console.error('❌ Referral bonus error:', e);
            }
        } else {
            console.warn('⚠️ ReferralSystem not loaded');
        }
    };
    
    // Перехват BalanceAPI.subtractRubles - ЭТО ПРОИГРЫШИ!
    if (window.BalanceAPI) {
        const originalSubtractRubles = window.BalanceAPI.subtractRubles.bind(window.BalanceAPI);
        
        window.BalanceAPI.subtractRubles = async function(amount, source = 'game', description = '') {
            console.log(`💸 BalanceAPI.subtractRubles called: amount=${amount}₽, source=${source}`);
            
            const result = await originalSubtractRubles(amount, source, description);
            
            // Если это проигрыш в игре - партнёр получает 60%
            if (result && amount > 0 && source === 'game') {
                await trackLoss(window.BalanceAPI.telegramId, amount, source);
            }
            
            return result;
        };
        
        console.log('✅ Referral integration installed on BalanceAPI.subtractRubles');
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

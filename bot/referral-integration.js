// ============================================
// ИНТЕГРАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ С ИГРАМИ
// ============================================
// Этот файл добавляет автоматическое начисление процентов при выигрышах

(function() {
    'use strict';
    
    // Функция для начисления профита рефереру
    const trackWinning = async (userId, amount, source) => {
        console.log(`🎰 Win detected: ${amount} from ${source}`);
        
        if (window.ReferralSystem) {
            try {
                await window.ReferralSystem.addReferralEarnings(userId, amount);
                console.log(`✅ Referral bonus processed for ${userId}`);
            } catch (e) {
                console.error('❌ Referral bonus error:', e);
            }
        } else {
            console.warn('⚠️ ReferralSystem not loaded');
        }
    };
    
    // Перехват BalanceAPI.addChips
    if (window.BalanceAPI) {
        const originalAddChips = window.BalanceAPI.addChips.bind(window.BalanceAPI);
        
        window.BalanceAPI.addChips = async function(amount, source = 'game', description = '') {
            console.log(`💰 BalanceAPI.addChips called: amount=${amount}, source=${source}`);
            
            const result = await originalAddChips(amount, source, description);
            
            // Если это выигрыш - начисляем
            if (result && amount > 0) {
                await trackWinning(window.BalanceAPI.telegramId, amount, source);
            }
            
            return result;
        };
        
        console.log('✅ Referral integration installed on BalanceAPI');
    }
    
    // Перехват GameBalanceAPI.addBalance
    if (window.GameBalanceAPI) {
        const originalAddBalance = window.GameBalanceAPI.addBalance.bind(window.GameBalanceAPI);
        
        window.GameBalanceAPI.addBalance = async function(rubles, chips, source = 'game', description = '') {
            console.log(`💰 GameBalanceAPI.addBalance called: rubles=${rubles}, chips=${chips}, source=${source}`);
            
            const result = await originalAddBalance(rubles, chips, source, description);
            
            // Начисляем от фишек
            if (result && chips > 0) {
                await trackWinning(window.GameBalanceAPI.telegramId, chips, source);
            }
            
            return result;
        };
        
        console.log('✅ Referral integration installed on GameBalanceAPI');
    }
    
    // Перехват balance-api addMoney (для рублей и чипов)
    setTimeout(() => {
        if (window.balanceAPI) {
            const originalAddMoney = window.balanceAPI.addMoney.bind(window.balanceAPI);
            
            window.balanceAPI.addMoney = async function(rubles, chips) {
                console.log(`💰 balanceAPI.addMoney called: rubles=${rubles}, chips=${chips}`);
                
                const result = await originalAddMoney(rubles, chips);
                
                // Начисляем от рублей или чипов (что больше)
                const amount = Math.max(rubles || 0, chips || 0);
                if (result && amount > 0) {
                    await trackWinning(window.balanceAPI.telegramId, amount, 'game');
                }
                
                return result;
            };
            
            console.log('✅ Referral integration installed on balanceAPI');
        }
        
        // Перехват BalanceAPI.addRubles
        if (window.BalanceAPI && window.BalanceAPI.addRubles) {
            const originalAddRubles = window.BalanceAPI.addRubles.bind(window.BalanceAPI);
            
            window.BalanceAPI.addRubles = async function(amount, source = 'game', description = '') {
                console.log(`💰 BalanceAPI.addRubles called: amount=${amount}, source=${source}`);
                
                const result = await originalAddRubles(amount, source, description);
                
                if (result && amount > 0) {
                    await trackWinning(window.BalanceAPI.telegramId, amount, source);
                }
                
                return result;
            };
            
            console.log('✅ Referral integration installed on BalanceAPI.addRubles');
        }
    }, 1000);
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

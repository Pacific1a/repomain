// ============================================
// СИНХРОНИЗАЦИЯ РЕФЕРАЛЬНЫХ ДАННЫХ
// Отправляет данные из бота на сервер сайта партнеров
// ============================================

const fetch = require('node-fetch');

// URL сервера сайта партнеров
const PARTNER_SITE_URL = process.env.PARTNER_SITE_URL || 'http://localhost:3000';

class ReferralSync {
    constructor() {
        console.log('🔄 Referral Sync инициализирован');
        console.log(`📡 URL сервера партнеров: ${PARTNER_SITE_URL}`);
    }
    
    // Отправить клик по реферальной ссылке
    async trackClick(referralCode) {
        try {
            console.log(`📊 Отправка клика: ${referralCode}`);
            
            const response = await fetch(`${PARTNER_SITE_URL}/api/referral/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referralCode })
            });
            
            if (response.ok) {
                console.log(`✅ Клик отправлен: ${referralCode}`);
                return true;
            } else {
                const error = await response.json();
                console.error(`❌ Ошибка отправки клика:`, error);
            }
        } catch (error) {
            console.error(`❌ Ошибка сети при отправке клика:`, error.message);
        }
        return false;
    }
    
    // Зарегистрировать нового реферала (при первом депозите)
    async registerReferral(referralCode, referralUserId, depositAmount) {
        try {
            console.log(`📊 Регистрация реферала: ${referralUserId} по коду ${referralCode}`);
            
            const response = await fetch(`${PARTNER_SITE_URL}/api/referral/register-referral`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    referralCode, 
                    referralUserId: referralUserId.toString(), 
                    depositAmount 
                })
            });
            
            if (response.ok) {
                console.log(`✅ Реферал зарегистрирован: ${referralUserId}`);
                return true;
            } else {
                const error = await response.json();
                console.error(`❌ Ошибка регистрации реферала:`, error);
            }
        } catch (error) {
            console.error(`❌ Ошибка сети при регистрации реферала:`, error.message);
        }
        return false;
    }
    
    // Обновить депозит реферала
    async updateDeposit(referralCode, referralUserId, depositAmount) {
        try {
            console.log(`📊 Обновление депозита: ${referralUserId} +${depositAmount}₽`);
            
            const response = await fetch(`${PARTNER_SITE_URL}/api/referral/update-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    referralCode, 
                    referralUserId: referralUserId.toString(), 
                    depositAmount 
                })
            });
            
            if (response.ok) {
                console.log(`✅ Депозит обновлен: ${referralUserId} +${depositAmount}₽`);
                return true;
            } else {
                const error = await response.json();
                console.error(`❌ Ошибка обновления депозита:`, error);
            }
        } catch (error) {
            console.error(`❌ Ошибка сети при обновлении депозита:`, error.message);
        }
        return false;
    }
    
    // Начислить доход партнеру (60% от проигрыша)
    async addEarnings(referralCode, referralUserId, lossAmount) {
        try {
            console.log(`📊 Начисление дохода: ${referralUserId} проиграл ${lossAmount}₽`);
            
            const response = await fetch(`${PARTNER_SITE_URL}/api/referral/add-earnings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    referralCode, 
                    referralUserId: referralUserId.toString(), 
                    lossAmount 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Доход начислен: ${data.earnings}₽ (60% от ${lossAmount}₽)`);
                return true;
            } else {
                const error = await response.json();
                console.error(`❌ Ошибка начисления дохода:`, error);
            }
        } catch (error) {
            console.error(`❌ Ошибка сети при начислении дохода:`, error.message);
        }
        return false;
    }
}

// Создаем глобальный экземпляр
const referralSync = new ReferralSync();

// Экспортируем для использования в других модулях
module.exports = referralSync;

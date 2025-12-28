// ============================================
// BALANCE API ROUTES
// For bot balance management
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// In-memory balance storage (для быстрого доступа)
const balances = new Map();

// Загрузить балансы из localStorage если есть
try {
    // Балансы хранятся в памяти сервера
} catch (error) {
    console.error('Error loading balances:', error);
}

/**
 * GET /api/balance/:telegramId
 * Get user balance
 */
router.get('/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log(`📥 GET /api/balance/${telegramId}`);
        
        // Получить баланс из памяти или вернуть 0
        const balance = balances.get(telegramId) || { rubles: 0, chips: 0 };
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            balance: balance.rubles || 0,
            chips: balance.chips || 0,
            rubles: balance.rubles || 0
        });
    } catch (error) {
        console.error('❌ Error getting balance:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/balance/:telegramId
 * Update user balance (add/subtract)
 */
router.post('/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { amount, reason, rubles, chips } = req.body;
        
        console.log(`📥 POST /api/balance/${telegramId}:`, { amount, rubles, chips, reason });
        
        // Получить текущий баланс
        const currentBalance = balances.get(telegramId) || { rubles: 0, chips: 0 };
        
        // Обновить баланс
        if (amount !== undefined) {
            currentBalance.rubles = (currentBalance.rubles || 0) + amount;
        }
        if (rubles !== undefined) {
            currentBalance.rubles = (currentBalance.rubles || 0) + rubles;
        }
        if (chips !== undefined) {
            currentBalance.chips = (currentBalance.chips || 0) + chips;
        }
        
        // Сохранить
        balances.set(telegramId, currentBalance);
        
        console.log(`✅ Balance updated: ${telegramId} -> ${currentBalance.rubles}₽ / ${currentBalance.chips} chips`);
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            oldBalance: currentBalance.rubles - (amount || rubles || 0),
            newBalance: currentBalance.rubles,
            balance: currentBalance.rubles,
            chips: currentBalance.chips,
            amount: amount || rubles || 0
        });
    } catch (error) {
        console.error('❌ Error updating balance:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/balance/:telegramId/add
 * Add balance
 */
router.post('/:telegramId/add', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { amount, rubles, chips, source, description } = req.body;
        
        const addAmount = amount || rubles || 0;
        const addChips = chips || 0;
        
        console.log(`📥 POST /api/balance/${telegramId}/add:`, { addAmount, addChips, source });
        
        const currentBalance = balances.get(telegramId) || { rubles: 0, chips: 0 };
        
        currentBalance.rubles = (currentBalance.rubles || 0) + addAmount;
        currentBalance.chips = (currentBalance.chips || 0) + addChips;
        
        balances.set(telegramId, currentBalance);
        
        console.log(`✅ Balance added: ${telegramId} +${addAmount}₽ +${addChips} chips`);
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            newBalance: currentBalance.rubles,
            newChips: currentBalance.chips,
            balance: currentBalance.rubles,
            chips: currentBalance.chips
        });
    } catch (error) {
        console.error('❌ Error adding balance:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/balance/:telegramId/subtract
 * Subtract balance (проигрыш в игре)
 */
router.post('/:telegramId/subtract', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { amount, rubles, chips, reason, gameType } = req.body;
        
        const subtractAmount = amount || rubles || 0;
        const subtractChips = chips || 0;
        
        console.log(`📥 POST /api/balance/${telegramId}/subtract:`, { subtractAmount, subtractChips, gameType, reason });
        
        const currentBalance = balances.get(telegramId) || { rubles: 0, chips: 0 };
        
        // Проверить достаточно ли средств
        if (currentBalance.rubles < subtractAmount || currentBalance.chips < subtractChips) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }
        
        currentBalance.rubles = (currentBalance.rubles || 0) - subtractAmount;
        currentBalance.chips = (currentBalance.chips || 0) - subtractChips;
        
        balances.set(telegramId, currentBalance);
        
        console.log(`✅ Balance subtracted: ${telegramId} -${subtractAmount}₽ -${subtractChips} chips`);
        
        // ✅ ОТПРАВИТЬ ПРОИГРЫШ В РЕФЕРАЛЬНУЮ СИСТЕМУ (60% партнёру!)
        if (subtractAmount > 0 && gameType && gameType !== 'unknown') {
            // Получить referrer_code из Python бота
            // Для этого нужно хранить связь telegramId -> referrerCode
            // Пока просто проверим есть ли в БД
            try {
                const ReferralService = require('../services/referral.service');
                const referrerCode = await ReferralService.getUserReferrer(telegramId);
                
                if (referrerCode) {
                    await ReferralService.addEarnings(
                        referrerCode,
                        telegramId,
                        subtractAmount
                    );
                }
            } catch (refError) {
                console.error('❌ Error sending loss to referral system:', refError);
                // Не блокируем основной запрос если реферальная система недоступна
            }
        }
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            newBalance: currentBalance.rubles,
            newChips: currentBalance.chips,
            balance: currentBalance.rubles,
            chips: currentBalance.chips
        });
    } catch (error) {
        console.error('❌ Error subtracting balance:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

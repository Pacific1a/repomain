// ============================================
// BALANCE API ROUTES
// For bot balance management
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к БД Python бота (из config.py: PATH_DATABASE = "tgbot/data/database.db")
const BOT_DB_PATH = path.join(__dirname, '../../bot/autoshop/tgbot/data/database.db');

// In-memory balance cache (для быстрого доступа, НО с синхронизацией с Python БД)
const balances = new Map();

// Функция для получения баланса из Python БД
function getBalanceFromBotDB(telegramId) {
    return new Promise((resolve, reject) => {
        const botDB = new sqlite3.Database(BOT_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('❌ Error opening bot DB:', err);
                resolve(null); // Если не удалось открыть - вернём null
                return;
            }
            
            botDB.get(
                'SELECT user_balance FROM storage_users WHERE user_id = ?',
                [telegramId],
                (err, row) => {
                    botDB.close();
                    
                    if (err) {
                        console.error('❌ Error reading from bot DB:', err);
                        resolve(null);
                        return;
                    }
                    
                    if (row) {
                        resolve({ rubles: row.user_balance || 0, chips: 0 });
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    });
}

/**
 * GET /api/balance/:telegramId
 * Get user balance (синхронизировано с Python БД)
 */
router.get('/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        console.log(`📥 GET /api/balance/${telegramId}`);
        
        // 1. Проверить кэш
        let balance = balances.get(telegramId);
        
        // 2. Если нет в кэше - прочитать из Python БД
        if (!balance) {
            balance = await getBalanceFromBotDB(telegramId);
            
            if (balance) {
                // Сохранить в кэш
                balances.set(telegramId, balance);
                console.log(`💾 Баланс загружен из Bot DB: ${telegramId} → ${balance.rubles}₽`);
            } else {
                // Если пользователя нет в БД - вернуть 0
                balance = { rubles: 0, chips: 0 };
            }
        }
        
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
 * Add balance (инвалидирует кэш чтобы перечитать из Python БД)
 */
router.post('/:telegramId/add', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { amount, rubles, chips, source, description } = req.body;
        
        const addAmount = amount || rubles || 0;
        const addChips = chips || 0;
        
        console.log(`📥 POST /api/balance/${telegramId}/add:`, { addAmount, addChips, source });
        
        // Получить текущий баланс (из кэша или БД)
        let currentBalance = balances.get(telegramId);
        if (!currentBalance) {
            currentBalance = await getBalanceFromBotDB(telegramId) || { rubles: 0, chips: 0 };
        }
        
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

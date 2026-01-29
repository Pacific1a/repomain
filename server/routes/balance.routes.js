// ============================================
// BALANCE API ROUTES
// For bot balance management
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { webhookAuth } = require('../middleware/webhook');

// Путь к БД Python бота (из config.py: PATH_DATABASE = "tgbot/data/database.db")
const BOT_DB_PATH = path.join(__dirname, '../../bot/autoshop/tgbot/data/database.db');

// In-memory balance cache (для быстрого доступа, НО с синхронизацией с Python БД)
const balances = new Map();

// Persistent miniapp balances (server-side source of truth for miniapp)
db.run(
    `CREATE TABLE IF NOT EXISTS miniapp_balances (
        telegram_id TEXT PRIMARY KEY,
        rubles REAL NOT NULL DEFAULT 0,
        chips INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
);

// Функция для экспорта балансов (для доступа из других модулей)
router.clearAllBalances = () => {
    balances.clear();
    console.log('🗑️ All balances cleared!');
};

router.setBalance = (telegramId, rubles, chips = 0) => {
    balances.set(telegramId, { rubles, chips });
    console.log(`✅ Balance set: ${telegramId} -> ${rubles}₽ / ${chips} chips`);
};

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

function ensureMiniappBalanceRow(telegramId) {
    return db.getAsync('SELECT telegram_id, rubles, chips FROM miniapp_balances WHERE telegram_id = ?', [telegramId])
        .then(async (row) => {
            if (row) {
                return { rubles: parseFloat(row.rubles) || 0, chips: parseInt(row.chips, 10) || 0 };
            }

            const botBalance = await getBalanceFromBotDB(telegramId);
            const initial = botBalance || { rubles: 0, chips: 0 };
            await db.runAsync(
                'INSERT INTO miniapp_balances (telegram_id, rubles, chips) VALUES (?, ?, ?)',
                [telegramId, initial.rubles || 0, initial.chips || 0]
            );
            return { rubles: initial.rubles || 0, chips: initial.chips || 0 };
        });
}

function updateBotDbRublesDelta(telegramId, deltaRubles) {
    return new Promise((resolve) => {
        const botDB = new sqlite3.Database(BOT_DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error('❌ Error opening bot DB for write:', err);
                resolve(false);
                return;
            }

            botDB.run(
                'UPDATE storage_users SET user_balance = COALESCE(user_balance, 0) + ? WHERE user_id = ?',
                [deltaRubles, telegramId],
                function (err) {
                    botDB.close();
                    if (err) {
                        console.error('❌ Error updating bot DB balance:', err);
                        resolve(false);
                        return;
                    }
                    resolve(this.changes > 0);
                }
            );
        });
    });
}

function updateBotDbRublesSet(telegramId, rubles) {
    return new Promise((resolve) => {
        const botDB = new sqlite3.Database(BOT_DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error('❌ Error opening bot DB for write:', err);
                resolve(false);
                return;
            }

            botDB.run(
                'UPDATE storage_users SET user_balance = ? WHERE user_id = ?',
                [rubles, telegramId],
                function (err) {
                    botDB.close();
                    if (err) {
                        console.error('❌ Error setting bot DB balance:', err);
                        resolve(false);
                        return;
                    }
                    resolve(this.changes > 0);
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

        const balance = await ensureMiniappBalanceRow(telegramId);
        balances.set(telegramId, balance);
        
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
 * SET user balance (УСТАНАВЛИВАЕТ, не добавляет!)
 */
router.post('/:telegramId', webhookAuth, async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { rubles, chips } = req.body;
        
        console.log(`📥 POST /api/balance/${telegramId} [SET]:`, { rubles, chips });
        
        // УСТАНАВЛИВАЕМ баланс (НЕ добавляем!)
        const newBalance = {
            rubles: rubles !== undefined ? parseFloat(rubles) : 0,
            chips: chips !== undefined ? parseInt(chips) : 0
        };
        
        await db.runAsync(
            `INSERT INTO miniapp_balances (telegram_id, rubles, chips)
             VALUES (?, ?, ?)
             ON CONFLICT(telegram_id) DO UPDATE SET
               rubles = excluded.rubles,
               chips = excluded.chips,
               updated_at = CURRENT_TIMESTAMP`,
            [telegramId, newBalance.rubles, newBalance.chips]
        );

        if (newBalance.rubles !== undefined) {
            await updateBotDbRublesSet(telegramId, newBalance.rubles);
        }

        balances.set(telegramId, newBalance);
        
        console.log(`✅ Balance SET: ${telegramId} -> ${newBalance.rubles}₽ / ${newBalance.chips} chips`);
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            balance: newBalance.rubles,
            chips: newBalance.chips,
            rubles: newBalance.rubles,
            newBalance: newBalance.rubles,
            newChips: newBalance.chips
        });
    } catch (error) {
        console.error('❌ Error setting balance:', error);
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
        
        await ensureMiniappBalanceRow(telegramId);
        await db.runAsync(
            `UPDATE miniapp_balances
             SET rubles = rubles + ?,
                 chips = chips + ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE telegram_id = ?`,
            [addAmount, addChips, telegramId]
        );

        const currentBalance = await ensureMiniappBalanceRow(telegramId);
        balances.set(telegramId, currentBalance);
        
        console.log(`✅ Balance added: ${telegramId} +${addAmount}₽ +${addChips} chips`);

        if (addAmount) {
            await updateBotDbRublesDelta(telegramId, addAmount);
        }
        
        // Отправляем WebSocket событие об обновлении баланса
        const io = require('../server').io;
        if (io) {
            io.emit(`balance_updated_${telegramId}`, {
                rubles: currentBalance.rubles,
                chips: currentBalance.chips
            });
            console.log(`📡 WebSocket sent: balance_updated_${telegramId}`);
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
        
        console.log(`📥 POST /api/balance/${telegramId}/subtract`);
        console.log(`   Amount: ${subtractAmount}₽, Chips: ${subtractChips}`);
        console.log(`   Reason: ${reason}, Game: ${gameType}`);
        
        const currentBalance = await ensureMiniappBalanceRow(telegramId);
        
        // Проверить достаточно ли средств
        if (currentBalance.rubles < subtractAmount || currentBalance.chips < subtractChips) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        await db.runAsync(
            `UPDATE miniapp_balances
             SET rubles = rubles - ?,
                 chips = chips - ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE telegram_id = ?`,
            [subtractAmount, subtractChips, telegramId]
        );

        const newBalance = await ensureMiniappBalanceRow(telegramId);
        balances.set(telegramId, newBalance);
        
        console.log(`✅ Balance subtracted: ${telegramId} -${subtractAmount}₽ -${subtractChips} chips`);

        if (subtractAmount) {
            await updateBotDbRublesDelta(telegramId, -subtractAmount);
        }
        
        // Отправляем WebSocket событие об обновлении баланса
        const io = require('../server').io;
        if (io) {
            io.emit(`balance_updated_${telegramId}`, {
                rubles: newBalance.rubles,
                chips: newBalance.chips
            });
            console.log(`📡 WebSocket sent: balance_updated_${telegramId}`);
        }
        
        // Referral tracking is handled by referral-integration.js on client side
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            newBalance: newBalance.rubles,
            newChips: newBalance.chips,
            balance: newBalance.rubles,
            chips: newBalance.chips
        });
    } catch (error) {
        console.error('❌ Error subtracting balance:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/balance/admin/clear
 * Clear all balances (admin only)
 */
router.post('/admin/clear', (req, res) => {
    try {
        const { adminKey } = req.body;
        
        // Простая защита - проверка ключа
        if (adminKey !== 'G3ce12soSjWJK38jyGq') {
            return res.status(403).json({
                success: false,
                message: 'Invalid admin key'
            });
        }
        
        balances.clear();
        console.log('🗑️ All balances cleared by admin!');
        
        res.json({
            success: true,
            message: 'All balances cleared'
        });
    } catch (error) {
        console.error('❌ Error clearing balances:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/balance/admin/set
 * Set balance for specific user (admin only)
 */
router.post('/admin/set', (req, res) => {
    try {
        const { adminKey, telegramId, rubles, chips } = req.body;
        
        // Простая защита - проверка ключа
        if (adminKey !== 'G3ce12soSjWJK38jyGq') {
            return res.status(403).json({
                success: false,
                message: 'Invalid admin key'
            });
        }
        
        const newBalance = {
            rubles: parseFloat(rubles) || 0,
            chips: parseInt(chips) || 0
        };
        
        balances.set(telegramId, newBalance);
        
        // Отправляем WebSocket событие
        const io = require('../server').io;
        if (io) {
            io.emit(`balance_updated_${telegramId}`, {
                rubles: newBalance.rubles,
                chips: newBalance.chips
            });
        }
        
        console.log(`✅ Admin set balance: ${telegramId} -> ${newBalance.rubles}₽ / ${newBalance.chips} chips`);
        
        res.json({
            success: true,
            message: 'Balance set successfully',
            balance: newBalance
        });
    } catch (error) {
        console.error('❌ Error setting balance:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

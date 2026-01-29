// ============================================
// TRANSACTIONS API ROUTES
// For bot transaction history
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { webhookAuth } = require('../middleware/webhook');

// Socket.IO instance (will be set by server.js)
let io = null;

db.run(
    `CREATE TABLE IF NOT EXISTS miniapp_transactions (
        id TEXT PRIMARY KEY,
        telegram_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT,
        description TEXT,
        timestamp INTEGER NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
);

// Function to set Socket.IO instance
router.setIO = function(ioInstance) {
    io = ioInstance;
    console.log('✅ Transactions routes: Socket.IO instance set');
};

/**
 * GET /api/transactions/:telegramId
 * Get user transactions
 */
router.get('/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
        
        console.log(`📥 GET /api/transactions/${telegramId}`);

        const rows = await db.allAsync(
            `SELECT id, type, amount, source, description, timestamp, date
             FROM miniapp_transactions
             WHERE telegram_id = ?
             ORDER BY timestamp DESC
             LIMIT ?`,
            [telegramId, limit]
        );
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            transactions: rows || []
        });
    } catch (error) {
        console.error('❌ Error getting transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * POST /api/transactions/:telegramId
 * Add transaction
 */
router.post('/:telegramId', webhookAuth, async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { type, amount, source, description } = req.body;
        
        console.log(`📥 POST /api/transactions/${telegramId}:`, { type, amount, source });

        const transaction = {
            id: Date.now().toString(),
            type: type || 'add',
            amount: typeof amount === 'number' ? amount : parseFloat(amount) || 0,
            source: source || 'unknown',
            description: description || '',
            timestamp: Date.now(),
            date: new Date().toISOString()
        };

        await db.runAsync(
            `INSERT INTO miniapp_transactions (id, telegram_id, type, amount, source, description, timestamp, date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transaction.id,
                telegramId,
                transaction.type,
                transaction.amount,
                transaction.source,
                transaction.description,
                transaction.timestamp,
                transaction.date
            ]
        );
        
        console.log(`✅ Transaction added: ${telegramId} ${type} ${amount}`);
        
        // Отправляем WebSocket событие
        if (io) {
            io.emit(`transaction_added_${telegramId}`, transaction);
            console.log(`📡 WebSocket event sent: transaction_added_${telegramId}`);
        }
        
        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error('❌ Error adding transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

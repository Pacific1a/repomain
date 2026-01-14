// ============================================
// TRANSACTIONS API ROUTES
// For bot transaction history
// ============================================

const express = require('express');
const router = express.Router();

// In-memory transactions storage
const transactions = new Map();

// Socket.IO instance (will be set by server.js)
let io = null;

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
        
        console.log(`📥 GET /api/transactions/${telegramId}`);
        
        const userTransactions = transactions.get(telegramId) || [];
        
        res.json({
            success: true,
            telegramId: parseInt(telegramId),
            transactions: userTransactions.slice(-50) // Last 50
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
router.post('/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { type, amount, source, description } = req.body;
        
        console.log(`📥 POST /api/transactions/${telegramId}:`, { type, amount, source });
        
        if (!transactions.has(telegramId)) {
            transactions.set(telegramId, []);
        }
        
        const transaction = {
            id: Date.now().toString(),
            type: type || 'add',
            amount: amount || 0,
            source: source || 'unknown',
            description: description || '',
            timestamp: Date.now(),
            date: new Date().toISOString()
        };
        
        transactions.get(telegramId).push(transaction);
        
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

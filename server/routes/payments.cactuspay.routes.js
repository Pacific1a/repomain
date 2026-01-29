const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { db } = require('../config/database');

const BOT_DB_PATH = path.join(__dirname, '../../bot/autoshop/tgbot/data/database.db');

db.run(
    `CREATE TABLE IF NOT EXISTS miniapp_balances (
        telegram_id TEXT PRIMARY KEY,
        rubles REAL NOT NULL DEFAULT 0,
        chips INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
);

db.run(
    `CREATE TABLE IF NOT EXISTS miniapp_payment_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        provider_order_id TEXT NOT NULL,
        telegram_id TEXT,
        amount REAL,
        currency TEXT,
        status TEXT,
        raw_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_order_id)
    )`
);

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

function parseNumber(v) {
    const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

function normalizeStatus(s) {
    return String(s || '').trim().toUpperCase();
}

function extractTelegramIdFromOrderId(orderId) {
    const s = String(orderId || '').trim();
    if (!s) return null;
    const m = s.match(/^(\d{5,})[_:-]/);
    return m ? m[1] : null;
}

function updateBotDbRublesDelta(telegramId, deltaRubles) {
    return new Promise((resolve) => {
        const botDB = new sqlite3.Database(BOT_DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                resolve(false);
                return;
            }
            botDB.run(
                'UPDATE storage_users SET user_balance = COALESCE(user_balance, 0) + ? WHERE user_id = ?',
                [deltaRubles, telegramId],
                function (err) {
                    botDB.close();
                    if (err) resolve(false);
                    else resolve(this.changes > 0);
                }
            );
        });
    });
}

async function creditBalance(telegramId, rublesAmount, source, description) {
    await db.runAsync(
        `INSERT INTO miniapp_balances (telegram_id, rubles, chips)
         VALUES (?, 0, 0)
         ON CONFLICT(telegram_id) DO NOTHING`,
        [telegramId]
    );

    await db.runAsync(
        `UPDATE miniapp_balances
         SET rubles = rubles + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = ?`,
        [rublesAmount, telegramId]
    );

    const currentBalance = await db.getAsync(
        'SELECT rubles, chips FROM miniapp_balances WHERE telegram_id = ?',
        [telegramId]
    );

    await updateBotDbRublesDelta(telegramId, rublesAmount);

    const tx = {
        id: Date.now().toString(),
        type: 'add',
        amount: rublesAmount,
        source: source || 'deposit',
        description: description || '',
        timestamp: Date.now(),
        date: new Date().toISOString()
    };

    await db.runAsync(
        `INSERT INTO miniapp_transactions (id, telegram_id, type, amount, source, description, timestamp, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, telegramId, tx.type, tx.amount, tx.source, tx.description, tx.timestamp, tx.date]
    );

    const io = require('../server').io;
    if (io) {
        io.emit(`balance_updated_${telegramId}`, {
            rubles: currentBalance ? currentBalance.rubles : null,
            chips: currentBalance ? currentBalance.chips : null
        });
        io.emit(`transaction_added_${telegramId}`, tx);
    }

    return tx;
}

router.post('/webhook', express.json({ limit: '256kb' }), async (req, res) => {
    const expectedSecret = process.env.CACTUSPAY_WEBHOOK_SECRET;
    if (!expectedSecret) {
        return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    const providedSecret = req.headers['x-cactuspay-secret'] || req.headers['x-webhook-secret'] || req.query.secret || (req.body && req.body.secret);
    if (String(providedSecret || '') !== String(expectedSecret)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const body = req.body || {};
    const provider = 'cactuspay';
    const orderId = body.order_id || body.orderId || body.order || body.id || body.receipt;
    const status = normalizeStatus(body.status || body.payment_status || body.state);
    const amount = parseNumber(body.amount || body.sum || body.value);
    const telegramId = String(body.telegram_id || body.user_id || extractTelegramIdFromOrderId(orderId) || '');

    if (!orderId) return res.status(400).json({ success: false, message: 'Missing order_id' });
    if (!telegramId) return res.status(400).json({ success: false, message: 'Missing telegram_id' });
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    try {
        await db.runAsync(
            `INSERT INTO miniapp_payment_events (provider, provider_order_id, telegram_id, amount, currency, status, raw_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [provider, String(orderId), telegramId, amount, 'RUB', status, JSON.stringify(body)]
        );
    } catch (e) {
        if (String(e && e.message).includes('SQLITE_CONSTRAINT')) {
            return res.json({ success: true, message: 'Already processed' });
        }
        return res.status(500).json({ success: false, message: 'DB error' });
    }

    const paid = status === 'ACCEPT' || status === 'PAID' || status === 'SUCCESS';
    if (!paid) {
        return res.json({ success: true, message: 'Recorded', status });
    }

    const tx = await creditBalance(telegramId, amount, 'deposit', `Пополнение через CactusPay (${orderId})`);
    return res.json({ success: true, telegramId: parseInt(telegramId, 10), transaction: tx });
});

module.exports = router;

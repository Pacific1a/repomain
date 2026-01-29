const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const confirmIndex = process.argv.indexOf('--confirm');
const confirmValue = confirmIndex >= 0 ? process.argv[confirmIndex + 1] : null;
if (confirmValue !== 'RESET_ALL_DATA') {
    console.error('Missing or invalid --confirm token. Use: --confirm RESET_ALL_DATA');
    process.exit(1);
}

const keepPartners = !process.argv.includes('--wipe-partners');
const keepBotCatalog = !process.argv.includes('--wipe-bot-catalog');

const serverDbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/database.db');
const botDbPath = path.join(__dirname, '../../bot/autoshop/tgbot/data/database.db');

function ensureParentDir(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function openDb(dbPath, mode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE) {
    ensureParentDir(dbPath);
    return new sqlite3.Database(dbPath, mode);
}

function runAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

function allAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

async function tableExists(db, name) {
    const rows = await allAsync(db, `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [name]);
    return rows.length > 0;
}

async function resetServerDb() {
    const db = openDb(serverDbPath);
    try {
        await runAsync(db, 'PRAGMA foreign_keys = ON');

        if (await tableExists(db, 'referral_events')) await runAsync(db, 'DELETE FROM referral_events');
        if (await tableExists(db, 'referrals')) await runAsync(db, 'DELETE FROM referrals');

        if (await tableExists(db, 'referral_stats')) {
            const cols = await allAsync(db, 'PRAGMA table_info(referral_stats)');
            const names = cols.map((c) => c.name);
            const resetCols = [
                'clicks',
                'first_deposits',
                'deposits',
                'total_deposits',
                'earnings',
                'total_losses',
                'sub_partner_earnings'
            ].filter((n) => names.includes(n));
            if (resetCols.length) {
                const setSql = resetCols.map((n) => `${n}=0`).join(', ');
                await runAsync(db, `UPDATE referral_stats SET ${setSql}`);
            }
        }

        if (await tableExists(db, 'withdrawal_notifications')) await runAsync(db, 'DELETE FROM withdrawal_notifications');
        if (await tableExists(db, 'withdrawal_requests')) await runAsync(db, 'DELETE FROM withdrawal_requests');

        if (await tableExists(db, 'miniapp_balances')) await runAsync(db, 'DELETE FROM miniapp_balances');
        if (await tableExists(db, 'miniapp_transactions')) await runAsync(db, 'DELETE FROM miniapp_transactions');
        if (await tableExists(db, 'miniapp_payment_events')) await runAsync(db, 'DELETE FROM miniapp_payment_events');

        if (!keepPartners) {
            if (await tableExists(db, 'users')) await runAsync(db, 'DELETE FROM users');
            if (await tableExists(db, 'referral_stats')) await runAsync(db, 'DELETE FROM referral_stats');
        } else {
            if (await tableExists(db, 'users')) await runAsync(db, 'UPDATE users SET balance = 0');
        }
    } finally {
        db.close();
    }
}

async function resetBotDb() {
    const db = openDb(botDbPath);
    try {
        await runAsync(db, 'PRAGMA foreign_keys = OFF');

        const wipeTables = [
            'storage_users',
            'storage_refill',
            'storage_item',
            'storage_purchases'
        ];

        for (const t of wipeTables) {
            if (await tableExists(db, t)) await runAsync(db, `DELETE FROM ${t}`);
        }

        if (!keepBotCatalog) {
            const catalogTables = ['storage_category', 'storage_position'];
            for (const t of catalogTables) {
                if (await tableExists(db, t)) await runAsync(db, `DELETE FROM ${t}`);
            }
        }
    } finally {
        db.close();
    }
}

(async () => {
    console.log('Reset started');
    console.log('Server DB:', serverDbPath);
    console.log('Bot DB:', botDbPath);
    await resetServerDb();
    await resetBotDb();
    console.log('Reset completed');
    process.exit(0);
})().catch((e) => {
    console.error('Reset failed:', e && e.message ? e.message : e);
    process.exit(1);
});

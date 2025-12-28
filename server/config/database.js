// ============================================
// DATABASE CONFIGURATION - SQLite
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/database.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory:', dataDir);
}

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database:', dbPath);
});

// Initialize database schema
function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Table: users (partners who register on the site)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                login TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                telegram TEXT,
                balance REAL DEFAULT 0,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )`, (err) => {
                if (err) {
                    console.error('❌ Error creating users table:', err);
                } else {
                    console.log('✅ Table [users] ready');
                }
            });
            
            // Table: referral_stats (overall partner statistics)
            db.run(`CREATE TABLE IF NOT EXISTS referral_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                referral_code TEXT UNIQUE NOT NULL,
                clicks INTEGER DEFAULT 0,
                first_deposits INTEGER DEFAULT 0,
                deposits INTEGER DEFAULT 0,
                total_deposits REAL DEFAULT 0,
                earnings REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('❌ Error creating referral_stats table:', err);
                } else {
                    console.log('✅ Table [referral_stats] ready');
                }
            });
            
            // Table: referrals (list of referred users)
            db.run(`CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partner_id INTEGER NOT NULL,
                referral_user_id TEXT NOT NULL,
                first_deposit_amount REAL DEFAULT 0,
                total_deposits REAL DEFAULT 0,
                total_earnings REAL DEFAULT 0,
                deposits_count INTEGER DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(partner_id, referral_user_id)
            )`, (err) => {
                if (err) {
                    console.error('❌ Error creating referrals table:', err);
                } else {
                    console.log('✅ Table [referrals] ready');
                }
            });
            
            // Table: referral_events (timeline events for charts)
            db.run(`CREATE TABLE IF NOT EXISTS referral_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partner_id INTEGER NOT NULL,
                referral_user_id TEXT,
                event_type TEXT NOT NULL,
                amount REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('❌ Error creating referral_events table:', err);
                    reject(err);
                } else {
                    console.log('✅ Table [referral_events] ready');
                    console.log('✅ Database initialization complete');
                    resolve();
                }
            });
        });
    });
}

// Helper: Promisify db.get
db.getAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Helper: Promisify db.all
db.allAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Helper: Promisify db.run
db.runAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

module.exports = { db, initDatabase };

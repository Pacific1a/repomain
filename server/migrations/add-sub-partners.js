/**
 * Migration: Add Sub-Partner System
 * 
 * Adds support for 2-level referral program:
 * - Level 1: Partner gets 60% from referral losses
 * - Level 2: Super-partner gets 5% from partner's earnings
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'database.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database:', DB_PATH);
});

// Promisify
function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function migrate() {
    try {
        console.log('\n🔄 Starting sub-partner migration...\n');

        // 1. Добавляем колонку sub_partner_id в referral_stats
        console.log('1️⃣ Adding sub_partner_id column to referral_stats...');
        
        // Проверяем существует ли колонка
        const tableInfo = await new Promise((resolve, reject) => {
            db.all('PRAGMA table_info(referral_stats)', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const hasSubPartnerId = tableInfo.some(col => col.name === 'sub_partner_id');
        
        if (!hasSubPartnerId) {
            await runAsync(`
                ALTER TABLE referral_stats 
                ADD COLUMN sub_partner_id INTEGER DEFAULT NULL
            `);
            console.log('   ✅ Added sub_partner_id column');
        } else {
            console.log('   ℹ️  Column sub_partner_id already exists');
        }

        // 2. Добавляем колонку sub_partner_earnings (заработок от субпартнёров)
        console.log('2️⃣ Adding sub_partner_earnings column...');
        
        const hasSubPartnerEarnings = tableInfo.some(col => col.name === 'sub_partner_earnings');
        
        if (!hasSubPartnerEarnings) {
            await runAsync(`
                ALTER TABLE referral_stats 
                ADD COLUMN sub_partner_earnings REAL DEFAULT 0
            `);
            console.log('   ✅ Added sub_partner_earnings column');
        } else {
            console.log('   ℹ️  Column sub_partner_earnings already exists');
        }

        // 3. Создаём таблицу sub_partners (список привлечённых партнёров)
        console.log('3️⃣ Creating sub_partners table...');
        
        await runAsync(`
            CREATE TABLE IF NOT EXISTS sub_partners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                super_partner_id INTEGER NOT NULL,
                partner_id INTEGER NOT NULL,
                total_earnings REAL DEFAULT 0,
                sub_partner_cut REAL DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (super_partner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(super_partner_id, partner_id)
            )
        `);
        console.log('   ✅ Created sub_partners table');

        // 4. Создаём таблицу sub_partner_events (история отчислений)
        console.log('4️⃣ Creating sub_partner_events table...');
        
        await runAsync(`
            CREATE TABLE IF NOT EXISTS sub_partner_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                super_partner_id INTEGER NOT NULL,
                partner_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                partner_earnings REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (super_partner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✅ Created sub_partner_events table');

        console.log('\n✅ Sub-partner migration completed successfully!\n');
        console.log('📊 Database structure:');
        console.log('   - referral_stats.sub_partner_id: кто привлёк этого партнёра');
        console.log('   - referral_stats.sub_partner_earnings: заработок от субпартнёров');
        console.log('   - sub_partners: список привлечённых партнёров');
        console.log('   - sub_partner_events: история отчислений 5%\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

migrate();

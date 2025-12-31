// Migration: Add 2FA columns to users table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Running migration: Add 2FA columns to users table...');

db.serialize(() => {
    // Check if columns already exist
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('❌ Error reading table info:', err);
            return;
        }
        
        const hasTwoFactorSecret = columns.some(col => col.name === 'two_factor_secret');
        const hasTwoFactorEnabled = columns.some(col => col.name === 'two_factor_enabled');
        
        if (!hasTwoFactorSecret) {
            db.run(`ALTER TABLE users ADD COLUMN two_factor_secret TEXT`, (err) => {
                if (err) {
                    console.error('❌ Error adding two_factor_secret column:', err);
                } else {
                    console.log('✅ Added column: two_factor_secret');
                }
            });
        } else {
            console.log('ℹ️  Column two_factor_secret already exists');
        }
        
        if (!hasTwoFactorEnabled) {
            db.run(`ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0`, (err) => {
                if (err) {
                    console.error('❌ Error adding two_factor_enabled column:', err);
                } else {
                    console.log('✅ Added column: two_factor_enabled');
                }
                
                // Close database after last operation
                db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err);
                    } else {
                        console.log('✅ Migration completed successfully');
                    }
                });
            });
        } else {
            console.log('ℹ️  Column two_factor_enabled already exists');
            db.close();
        }
    });
});

// Migration script to add total_losses column to referral_stats table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data/database.db');

console.log('📊 Migration: Adding total_losses column to referral_stats');
console.log(`📂 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

db.run('ALTER TABLE referral_stats ADD COLUMN total_losses REAL DEFAULT 0', (err) => {
    if (err) {
        if (err.message.includes('duplicate')) {
            console.log('ℹ️  Column total_losses already exists');
        } else {
            console.error('❌ Error adding column:', err);
            db.close();
            process.exit(1);
        }
    } else {
        console.log('✅ Column total_losses added successfully');
    }
    
    // Verify the column was added
    db.all('PRAGMA table_info(referral_stats)', (err, rows) => {
        if (err) {
            console.error('❌ Error checking table:', err);
        } else {
            console.log('\n📋 referral_stats columns:');
            rows.forEach(row => {
                console.log(`  - ${row.name} (${row.type})`);
            });
        }
        
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('\n✅ Migration complete!');
            }
        });
    });
});

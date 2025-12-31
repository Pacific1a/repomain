// Script to clear ALL referral data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data/database.db');

console.log('🧹 Clearing ALL referral data...');
console.log(`📂 Database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database\n');
});

// Clear all referral tables
db.serialize(() => {
    console.log('🗑️  Clearing referral_events...');
    db.run('DELETE FROM referral_events', (err) => {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log('✅ referral_events cleared');
        }
    });
    
    console.log('🗑️  Clearing referrals...');
    db.run('DELETE FROM referrals', (err) => {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log('✅ referrals cleared');
        }
    });
    
    console.log('🗑️  Resetting referral_stats...');
    db.run(`UPDATE referral_stats SET 
        clicks = 0, 
        first_deposits = 0, 
        deposits = 0, 
        total_deposits = 0, 
        earnings = 0,
        total_losses = 0`, (err) => {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log('✅ referral_stats reset to 0');
        }
        
        // Verify
        db.all('SELECT * FROM referral_stats', (err, stats) => {
            if (err) {
                console.error('❌ Error checking stats:', err);
            } else {
                console.log('\n📊 Partner stats after reset:');
                stats.forEach(s => {
                    console.log(`  Partner #${s.user_id}: ${s.clicks} clicks, ${s.earnings}₽ earnings`);
                });
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                } else {
                    console.log('\n✅ All referral data cleared!');
                    console.log('🎯 Ready for fresh testing!');
                }
            });
        });
    });
});

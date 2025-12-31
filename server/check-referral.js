const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking LOCAL database...\n');

// Get ALL partners
db.all('SELECT * FROM referral_stats', (err, stats) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }
    
    console.log('💰 ВСЕ партнёры в ЛОКАЛЬНОЙ базе:\n');
    if (stats.length === 0) {
        console.log('❌ НЕТ ПАРТНЁРОВ!');
    } else {
        stats.forEach(s => {
            console.log(`Партнёр #${s.user_id}:`);
            console.log(`  Referral Code: ${s.referral_code}`);
            console.log(`  Clicks: ${s.clicks}`);
            console.log(`  Earnings: ${s.earnings}₽`);
            console.log(`  Total Losses: ${s.total_losses || 0}₽`);
            console.log('');
        });
    }
    
    // Get ALL referrals
    db.all('SELECT * FROM referrals', (err, refs) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }
        
        console.log('\n👥 ВСЕ рефералы в ЛОКАЛЬНОЙ базе:\n');
        if (refs.length === 0) {
            console.log('❌ НЕТ РЕФЕРАЛОВ!');
        } else {
            refs.forEach(r => {
                console.log(`Partner #${r.partner_id} → Referral ${r.referral_user_id}`);
                console.log(`  Earnings: ${r.total_earnings}₽`);
            });
        }
        
        db.close();
    });
});

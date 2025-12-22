// Скрипт для сброса всех 2FA
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to database at:', dbPath);
});

// Сбрасываем все 2FA
db.run(`UPDATE users SET twofa_secret = NULL, twofa_enabled = 0`, (err) => {
    if (err) {
        console.error('Error resetting 2FA:', err);
        process.exit(1);
    }
    
    console.log('✅ Все 2FA сброшены!');
    console.log('Теперь можно заново подключать 2FA');
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
        process.exit(0);
    });
});

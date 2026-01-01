/**
 * Restore Script
 * Восстанавливает проект из бэкапа
 * 
 * Usage:
 *   node scripts/restore.js <backup-path>
 * 
 * Example:
 *   node scripts/restore.js ../backups/duo-backup-2026-01-01T12-00-00
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROJECT_ROOT = path.join(__dirname, '..');
const DATABASE_PATH = path.join(PROJECT_ROOT, 'data', 'database.db');

// Получаем путь к бэкапу
const backupPath = process.argv[2];

if (!backupPath) {
    console.error('❌ Usage: node scripts/restore.js <backup-path>');
    console.log('\nExample:');
    console.log('  node scripts/restore.js ../backups/duo-backup-2026-01-01T12-00-00');
    process.exit(1);
}

const absoluteBackupPath = path.resolve(backupPath);

if (!fs.existsSync(absoluteBackupPath)) {
    console.error('❌ Backup not found:', absoluteBackupPath);
    process.exit(1);
}

console.log('🔄 Starting restore...\n');
console.log(`📦 Backup: ${absoluteBackupPath}`);
console.log(`💾 Target: ${PROJECT_ROOT}\n`);

// Читаем backup info
const backupInfoPath = path.join(absoluteBackupPath, 'backup-info.json');
if (fs.existsSync(backupInfoPath)) {
    const backupInfo = JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
    console.log('📋 Backup info:');
    console.log(`   Date: ${new Date(backupInfo.timestamp).toLocaleString('ru-RU')}`);
    console.log(`   Project: ${backupInfo.project}`);
    console.log(`   Database: ${backupInfo.files.database ? '✅' : '❌'}`);
    console.log(`   Environment: ${backupInfo.files.env ? '✅' : '❌'}`);
    console.log(`   Size: ${backupInfo.size.database}\n`);
}

// Подтверждение
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('⚠️  This will overwrite current data. Continue? (yes/no): ', (answer) => {
    if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Restore cancelled');
        rl.close();
        process.exit(0);
    }

    try {
        // 1. Создаем бэкап текущей БД перед восстановлением
        if (fs.existsSync(DATABASE_PATH)) {
            const backupBeforeRestore = DATABASE_PATH + '.before-restore-' + Date.now();
            fs.copyFileSync(DATABASE_PATH, backupBeforeRestore);
            console.log('✅ Current database backed up:', path.basename(backupBeforeRestore));
        }

        // 2. Восстанавливаем базу данных
        const backupDbPath = path.join(absoluteBackupPath, 'database.db');
        if (fs.existsSync(backupDbPath)) {
            const dataDir = path.dirname(DATABASE_PATH);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.copyFileSync(backupDbPath, DATABASE_PATH);
            const dbSize = (fs.statSync(DATABASE_PATH).size / 1024).toFixed(2);
            console.log(`✅ Database restored (${dbSize} KB)`);
        } else {
            console.log('⚠️  No database in backup');
        }

        // 3. Восстанавливаем .env
        const backupEnvPath = path.join(absoluteBackupPath, '.env');
        if (fs.existsSync(backupEnvPath)) {
            const currentEnvPath = path.join(PROJECT_ROOT, '.env');
            fs.copyFileSync(backupEnvPath, currentEnvPath);
            console.log('✅ Environment file restored');
        }

        // 4. Восстанавливаем package.json
        const backupPackagePath = path.join(absoluteBackupPath, 'package.json');
        if (fs.existsSync(backupPackagePath)) {
            const currentPackagePath = path.join(PROJECT_ROOT, 'package.json');
            fs.copyFileSync(backupPackagePath, currentPackagePath);
            console.log('✅ Package.json restored');
            console.log('\n⚠️  Run "npm install" to restore dependencies');
        }

        console.log('\n✅ Restore completed successfully!');
        console.log('🔄 Please restart the server: pm2 restart duo-server');

    } catch (error) {
        console.error('\n❌ Restore failed:', error.message);
        rl.close();
        process.exit(1);
    }

    rl.close();
});

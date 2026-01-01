/**
 * Backup Script
 * Создает полный бэкап проекта и базы данных
 * 
 * Usage:
 *   node scripts/backup.js [output-dir]
 * 
 * Example:
 *   node scripts/backup.js /backups
 *   node scripts/backup.js  (default: ./backups)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Конфигурация
const PROJECT_ROOT = path.join(__dirname, '..');
const DEFAULT_BACKUP_DIR = path.join(PROJECT_ROOT, '..', 'backups');
const DATABASE_PATH = path.join(PROJECT_ROOT, 'data', 'database.db');

// Получаем директорию для бэкапа из аргументов
const backupDir = process.argv[2] || DEFAULT_BACKUP_DIR;

// Создаем имя бэкапа с timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupName = `duo-backup-${timestamp}`;
const backupPath = path.join(backupDir, backupName);

console.log('🔄 Starting backup...\n');
console.log(`📦 Project: ${PROJECT_ROOT}`);
console.log(`💾 Backup to: ${backupPath}\n`);

try {
    // 1. Создаем директорию для бэкапа
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('✅ Created backup directory');
    }

    fs.mkdirSync(backupPath, { recursive: true });
    console.log('✅ Created backup folder:', backupName);

    // 2. Копируем базу данных
    if (fs.existsSync(DATABASE_PATH)) {
        const dbBackupPath = path.join(backupPath, 'database.db');
        fs.copyFileSync(DATABASE_PATH, dbBackupPath);
        const dbSize = (fs.statSync(dbBackupPath).size / 1024).toFixed(2);
        console.log(`✅ Database backed up (${dbSize} KB)`);
    } else {
        console.log('⚠️  Database not found:', DATABASE_PATH);
    }

    // 3. Копируем .env файл
    const envPath = path.join(PROJECT_ROOT, '.env');
    if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, path.join(backupPath, '.env'));
        console.log('✅ Environment file backed up');
    }

    // 4. Сохраняем package.json для восстановления зависимостей
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    if (fs.existsSync(packagePath)) {
        fs.copyFileSync(packagePath, path.join(backupPath, 'package.json'));
        console.log('✅ Package.json backed up');
    }

    // 5. Создаем архив всего проекта (без node_modules)
    console.log('\n📦 Creating archive...');
    
    const archiveName = `${backupName}.tar.gz`;
    const archivePath = path.join(backupDir, archiveName);
    
    // Файлы для исключения
    const excludeList = [
        'node_modules',
        'backups',
        '.git',
        '*.log',
        'package-lock.json'
    ];
    
    const excludeArgs = excludeList.map(item => `--exclude='${item}'`).join(' ');
    
    try {
        // Для Linux/Mac
        execSync(
            `cd ${path.dirname(PROJECT_ROOT)} && tar -czf ${archivePath} ${excludeArgs} duo/`,
            { stdio: 'inherit' }
        );
        
        const archiveSize = (fs.statSync(archivePath).size / 1024 / 1024).toFixed(2);
        console.log(`✅ Archive created: ${archiveName} (${archiveSize} MB)`);
    } catch (error) {
        console.log('⚠️  tar command failed (Windows?), skipping archive...');
    }

    // 6. Создаем backup info файл
    const backupInfo = {
        timestamp: new Date().toISOString(),
        project: 'Duo Partners',
        database: DATABASE_PATH,
        files: {
            database: fs.existsSync(DATABASE_PATH),
            env: fs.existsSync(envPath),
            package: fs.existsSync(packagePath)
        },
        size: {
            database: fs.existsSync(DATABASE_PATH) 
                ? (fs.statSync(DATABASE_PATH).size / 1024).toFixed(2) + ' KB'
                : 'N/A'
        }
    };

    fs.writeFileSync(
        path.join(backupPath, 'backup-info.json'),
        JSON.stringify(backupInfo, null, 2)
    );
    console.log('✅ Backup info saved');

    // 7. Список всех файлов в бэкапе
    console.log('\n📋 Backup contents:');
    const backupFiles = fs.readdirSync(backupPath);
    backupFiles.forEach(file => {
        const filePath = path.join(backupPath, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`   - ${file} (${size} KB)`);
    });

    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${backupPath}`);
    
    // Показываем список всех бэкапов
    console.log('\n📚 All backups:');
    const allBackups = fs.readdirSync(backupDir)
        .filter(name => name.startsWith('duo-backup-'))
        .sort()
        .reverse()
        .slice(0, 5); // Последние 5 бэкапов
    
    allBackups.forEach((backup, index) => {
        const backupFullPath = path.join(backupDir, backup);
        const stats = fs.statSync(backupFullPath);
        const date = new Date(stats.mtime).toLocaleString('ru-RU');
        console.log(`   ${index + 1}. ${backup} (${date})`);
    });

    // Очистка старых бэкапов (оставляем последние 10)
    const MAX_BACKUPS = 10;
    const allBackupsList = fs.readdirSync(backupDir)
        .filter(name => name.startsWith('duo-backup-'))
        .map(name => ({
            name,
            path: path.join(backupDir, name),
            mtime: fs.statSync(path.join(backupDir, name)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

    if (allBackupsList.length > MAX_BACKUPS) {
        console.log(`\n🧹 Cleaning old backups (keeping last ${MAX_BACKUPS})...`);
        const toDelete = allBackupsList.slice(MAX_BACKUPS);
        
        toDelete.forEach(backup => {
            try {
                fs.rmSync(backup.path, { recursive: true, force: true });
                console.log(`   ❌ Deleted: ${backup.name}`);
            } catch (err) {
                console.log(`   ⚠️  Failed to delete: ${backup.name}`);
            }
        });
    }

} catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
}

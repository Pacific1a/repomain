// Простой тестовый скрипт для проверки путей
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const projectRoot = __dirname;

console.log('🔍 Project root:', projectRoot);
console.log('');

// Проверка файлов
const filesToCheck = [
    'index.html',
    'config.js',
    'balance-api.js',
    'site/index.html',
    'site/css',
    'pages_bot/main/style.css',
    'main/index.html',
    'roll/index.html'
];

console.log('📁 Проверка существования файлов:');
filesToCheck.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('');
console.log('🌐 Настройка маршрутов:');

// Сайт партнеров
app.use('/partner', express.static(path.join(projectRoot, 'site')));
console.log('✅ /partner/ → site/');

// Статика из корня
app.use(express.static(projectRoot));
console.log('✅ / → корень проекта');

// Тестовые маршруты
app.get('/test', (req, res) => {
    res.json({
        message: 'Server works!',
        projectRoot: projectRoot,
        files: {
            botIndex: fs.existsSync(path.join(projectRoot, 'index.html')),
            siteIndex: fs.existsSync(path.join(projectRoot, 'site', 'index.html')),
            mainPage: fs.existsSync(path.join(projectRoot, 'main', 'index.html'))
        }
    });
});

// Fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API not found' });
    }
    
    if (req.path.startsWith('/partner')) {
        const siteIndex = path.join(projectRoot, 'site', 'index.html');
        if (fs.existsSync(siteIndex)) {
            return res.sendFile(siteIndex);
        }
    }
    
    const botIndex = path.join(projectRoot, 'index.html');
    if (fs.existsSync(botIndex)) {
        res.sendFile(botIndex);
    } else {
        res.status(404).send('index.html not found');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('');
    console.log('Проверьте:');
    console.log(`  Бот:       http://localhost:${PORT}/`);
    console.log(`  Партнеры:  http://localhost:${PORT}/partner/`);
    console.log(`  Test API:  http://localhost:${PORT}/test`);
    console.log(`  Игра Roll: http://localhost:${PORT}/roll/`);
    console.log(`  Main:      http://localhost:${PORT}/main/`);
    console.log('');
});

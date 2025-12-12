#!/usr/bin/env node
/**
 * Проверка конфигурации перед деплоем на Render
 * 
 * Запуск: node check-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка конфигурации для деплоя на Render...\n');

let errors = 0;
let warnings = 0;

// Проверка 1: Существование render.yaml
console.log('📄 Проверка render.yaml...');
const renderYamlPath = path.join(__dirname, 'render.yaml');
if (fs.existsSync(renderYamlPath)) {
    console.log('✅ render.yaml найден');
    
    const renderYaml = fs.readFileSync(renderYamlPath, 'utf8');
    if (renderYaml.includes('node server/server.js')) {
        console.log('✅ startCommand правильный (node server/server.js)');
    } else if (renderYaml.includes('cd server && node server.js')) {
        console.log('❌ ОШИБКА: startCommand должен быть "node server/server.js", а не "cd server && node server.js"');
        errors++;
    }
} else {
    console.log('⚠️ render.yaml не найден');
    warnings++;
}

// Проверка 2: Существование index.html
console.log('\n📄 Проверка index.html...');
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
    console.log('✅ index.html найден в корне');
} else {
    console.log('❌ ОШИБКА: index.html не найден в корне проекта');
    errors++;
}

// Проверка 3: Существование server/server.js
console.log('\n📄 Проверка server/server.js...');
const serverPath = path.join(__dirname, 'server', 'server.js');
if (fs.existsSync(serverPath)) {
    console.log('✅ server/server.js найден');
    
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Проверка конфигурации статики
    if (serverContent.includes('projectRoot') && serverContent.includes('path.join(__dirname, \'..\')')) {
        console.log('✅ Конфигурация статических файлов правильная');
    } else {
        console.log('⚠️ Конфигурация статических файлов может быть неправильной');
        warnings++;
    }
    
    // Проверка fallback маршрута
    if (serverContent.includes('app.get(\'*\'')) {
        console.log('✅ Fallback маршрут для SPA настроен');
    } else {
        console.log('⚠️ Fallback маршрут не найден');
        warnings++;
    }
} else {
    console.log('❌ ОШИБКА: server/server.js не найден');
    errors++;
}

// Проверка 4: Существование server/package.json
console.log('\n📄 Проверка server/package.json...');
const packagePath = path.join(__dirname, 'server', 'package.json');
if (fs.existsSync(packagePath)) {
    console.log('✅ server/package.json найден');
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Проверка зависимостей
    const requiredDeps = ['express', 'socket.io', 'cors'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies || !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
        console.log('✅ Все необходимые зависимости установлены');
    } else {
        console.log(`⚠️ Отсутствуют зависимости: ${missingDeps.join(', ')}`);
        warnings++;
    }
} else {
    console.log('❌ ОШИБКА: server/package.json не найден');
    errors++;
}

// Проверка 5: config.js
console.log('\n📄 Проверка config.js...');
const configPath = path.join(__dirname, 'config.js');
if (fs.existsSync(configPath)) {
    console.log('✅ config.js найден');
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    if (configContent.includes('window.location.origin')) {
        console.log('✅ Автоопределение URL настроено правильно');
    } else {
        console.log('⚠️ config.js может не правильно определять URL сервера');
        warnings++;
    }
} else {
    console.log('⚠️ config.js не найден');
    warnings++;
}

// Проверка 6: Основные JS файлы
console.log('\n📄 Проверка основных файлов...');
const requiredFiles = [
    'balance-api.js',
    'referral-system.js',
    'global-balance.js',
    'telegram-user-data.js'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file} найден`);
    } else {
        console.log(`⚠️ ${file} не найден`);
        warnings++;
    }
});

// Итоговый результат
console.log('\n' + '='.repeat(50));
console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
    console.log('✅ Все проверки пройдены!');
    console.log('🚀 Проект готов к деплою на Render!');
    console.log('\nСледующие шаги:');
    console.log('1. git add . && git commit -m "Ready for Render deploy"');
    console.log('2. git push origin main');
    console.log('3. Создайте Web Service на Render');
    console.log('4. Смотрите QUICK_START.md для инструкций');
    process.exit(0);
} else {
    if (errors > 0) {
        console.log(`❌ Найдено ${errors} критических ошибок`);
    }
    if (warnings > 0) {
        console.log(`⚠️ Найдено ${warnings} предупреждений`);
    }
    console.log('\n⚠️ Исправьте ошибки перед деплоем!');
    console.log('📖 Смотрите DEPLOY_RENDER.md для подробностей');
    process.exit(1);
}

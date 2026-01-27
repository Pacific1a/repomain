// Конфигурация для подключения к серверу
(function() {
    // Определяем URL сервера в зависимости от окружения
    
    // Для локальной разработки
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.GAME_SERVER_URL = 'http://localhost:3000';
    }
    // Для продакшена - ВСЕГДА используем duopartners.xyz
    else {
        window.GAME_SERVER_URL = 'https://duopartners.xyz';
    }
    
    console.log('🔧 Server URL:', window.GAME_SERVER_URL);
    console.log('🌍 Current hostname:', window.location.hostname);
})();

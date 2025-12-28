// ============================================
// PRELOADER INITIALIZATION - 10 СЕКУНД ПОКАЗА
// Скрипт выполняется СРАЗУ в <head> (без defer!)
// ============================================

(function() {
  'use strict';
  
  const MIN_DISPLAY_TIME = 10000; // 10 секунд минимум
  const startTime = Date.now();
  
  // КРИТИЧНО: Скрываем прелоадер только после минимального времени
  function hidePreloader() {
    const preloader = document.getElementById('page-preloader');
    if (!preloader) return;
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);
    
    // Ждём минимум 10 секунд показа
    setTimeout(() => {
      // Добавляем класс loaded к body
      document.body.classList.add('loaded');
      
      // Запускаем анимацию исчезновения
      preloader.classList.add('fade-out');
      
      // Через 500ms полностью скрываем
      setTimeout(() => {
        preloader.classList.add('hidden');
        console.log(`✅ Preloader hidden after ${Math.round((Date.now() - startTime) / 1000)}s`);
      }, 500);
    }, remaining);
  }
  
  // Ждём полной загрузки страницы
  if (document.readyState === 'complete') {
    // Страница уже загружена - но ждём минимум 10 секунд
    hidePreloader();
  } else {
    window.addEventListener('load', function() {
      // Страница загружена - проверяем прошло ли 10 секунд
      hidePreloader();
    });
  }
  
  // FALLBACK: Принудительно скрываем через 15 секунд
  setTimeout(() => {
    if (!document.body.classList.contains('loaded')) {
      console.warn('⚠️ Preloader timeout 15s - forcing hide');
      document.body.classList.add('loaded');
      const preloader = document.getElementById('page-preloader');
      if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => preloader.classList.add('hidden'), 500);
      }
    }
  }, 15000);
  
  console.log('🔄 Preloader initialized - showing for minimum 10 seconds');
})();

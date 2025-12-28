// ============================================
// PRELOADER INITIALIZATION - БЕЗ МИГАНИЯ
// Скрипт выполняется СРАЗУ в <head> (без defer!)
// ============================================

(function() {
  'use strict';
  
  // КРИТИЧНО: Скрываем прелоадер только после ПОЛНОЙ загрузки
  function hidePreloader() {
    const preloader = document.getElementById('page-preloader');
    if (!preloader) return;
    
    // Добавляем класс loaded к body
    document.body.classList.add('loaded');
    
    // Запускаем анимацию исчезновения
    preloader.classList.add('fade-out');
    
    // Через 500ms полностью скрываем
    setTimeout(() => {
      preloader.classList.add('hidden');
      console.log('✅ Preloader hidden after full page load');
    }, 500);
  }
  
  // ВАРИАНТ 1: Ждём window.load (ВСЕ ресурсы загружены)
  if (document.readyState === 'complete') {
    // Страница уже загружена
    hidePreloader();
  } else {
    window.addEventListener('load', function() {
      // Минимум 1 секунда показа прелоадера
      setTimeout(hidePreloader, 1000);
    });
  }
  
  // FALLBACK: Если что-то пошло не так - скрываем через 10 секунд
  setTimeout(() => {
    if (!document.body.classList.contains('loaded')) {
      console.warn('⚠️ Preloader timeout - forcing hide');
      hidePreloader();
    }
  }, 10000);
  
  console.log('🔄 Preloader initialized - waiting for full page load');
})();

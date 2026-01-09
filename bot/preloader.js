// Preloader system - показывает спиннер пока грузятся изображения
// Работает только 1 раз за сессию мини-аппа (пока пользователь не закроет Telegram WebView)

(function() {
  'use strict';

  // Общий ключ для ВСЕЙ сессии мини-аппа (не зависит от страницы)
  const STORAGE_KEY = 'initialLoadComplete';
  const SPINNER_MIN_DURATION = 500; // Минимальное время показа спиннера (0.5 секунды)

  // Проверяем - была ли уже первая загрузка в этой сессии мини-аппа
  function wasInitialLoadComplete() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  // Сохраняем флаг первой загрузки в sessionStorage
  function markInitialLoadComplete() {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      console.log('📝 Первая загрузка завершена, loader не будет показываться в этой сессии');
    } catch (e) {
      console.warn('SessionStorage недоступен');
    }
  }

  // Получаем ТОЛЬКО критичные изображения для предзагрузки
  function getImagesToPreload() {
    const images = [];
    
    // ТОЛЬКО изображения из <link rel="preload">
    document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) images.push(href);
    });

    // Убираем дубликаты
    return [...new Set(images)];
  }

  // Загружаем одно изображение
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        img.onabort = null;
      };

      img.onload = () => {
        cleanup();
        resolve({ src, success: true });
      };

      img.onerror = () => {
        cleanup();
        console.warn('Не удалось загрузить:', src);
        resolve({ src, success: false });
      };

      img.onabort = () => {
        cleanup();
        resolve({ src, success: false });
      };

      // Таймаут для зависших изображений
      setTimeout(() => {
        cleanup();
        resolve({ src, success: false, timeout: true });
      }, 5000); // 5 секунд на изображение

      img.src = src;
    });
  }

  // Загружаем все изображения
  function preloadImages(images) {
    console.log(`🖼️ Загружаю ${images.length} изображений...`);
    return Promise.all(images.map(src => loadImage(src)));
  }

  // Показываем спиннер
  function showSpinner() {
    const spinner = document.getElementById('page-preloader');
    if (spinner) {
      spinner.style.display = 'flex';
      spinner.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Скрываем спиннер с анимацией
  function hideSpinner() {
    const spinner = document.getElementById('page-preloader');
    if (spinner) {
      spinner.classList.add('fade-out');
      
      setTimeout(() => {
        spinner.style.display = 'none';
        spinner.classList.remove('active', 'fade-out');
        document.body.style.overflow = '';
      }, 400); // Время fade-out анимации
    }
  }

  // Основная функция загрузки
  async function initPreloader() {
    // Если первая загрузка уже была в этой сессии мини-аппа - скрываем loader
    if (wasInitialLoadComplete()) {
      console.log('✅ Первая загрузка уже выполнена в этой сессии, loader не показываем');
      hideSpinner();
      return;
    }

    console.log('🎬 Первая загрузка мини-аппа, показываем loader...');

    const startTime = Date.now();
    showSpinner();

    try {
      // Ждем загрузки DOM
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }

      // Собираем все изображения
      const images = getImagesToPreload();
      
      if (images.length === 0) {
        console.log('⚠️ Изображения для загрузки не найдены');
      } else {
        // Загружаем изображения
        const results = await preloadImages(images);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Загружено: ${successful}/${images.length}`);
        if (failed > 0) {
          console.warn(`⚠️ Не загружено: ${failed} изображений`);
        }
      }

      // Минимальное время показа спиннера
      const elapsed = Date.now() - startTime;
      if (elapsed < SPINNER_MIN_DURATION) {
        await new Promise(resolve => setTimeout(resolve, SPINNER_MIN_DURATION - elapsed));
      }

    } catch (error) {
      console.error('❌ Ошибка при предзагрузке:', error);
    } finally {
      // Скрываем спиннер и сохраняем флаг первой загрузки
      hideSpinner();
      markInitialLoadComplete();
      console.log('🎉 Первая загрузка завершена! При навигации loader не будет показываться.');
    }
  }

  // Запускаем предзагрузку как можно раньше
  if (document.readyState === 'loading') {
    // DOM еще не загружен - ждем
    document.addEventListener('DOMContentLoaded', initPreloader);
  } else {
    // DOM уже загружен - запускаем сразу
    initPreloader();
  }

})();

// Preloader system - показывает спиннер пока грузятся изображения
// Работает только 1 раз за сессию (пока пользователь не закроет браузер)

(function() {
  'use strict';

  const STORAGE_KEY = 'mainPageLoaded';
  const SPINNER_MIN_DURATION = 2000; // Минимальное время показа спиннера (2 секунды)

  // Проверяем - была ли уже загрузка в этой сессии
  function wasLoadedInSession() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  // Сохраняем флаг загрузки в sessionStorage
  function markAsLoaded() {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('SessionStorage недоступен');
    }
  }

  // Получаем все изображения для предзагрузки
  function getImagesToPreload() {
    const images = [];
    
    // 1. Изображения из <link rel="preload">
    document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) images.push(href);
    });

    // 2. Изображения из CSS (background-image) - основные элементы
    const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
    elementsWithBg.forEach(el => {
      const style = el.style.backgroundImage;
      const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1]) images.push(match[1]);
    });

    // 3. Все <img> на странице
    document.querySelectorAll('img').forEach(img => {
      if (img.src) images.push(img.src);
      if (img.dataset.src) images.push(img.dataset.src);
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
      }, 10000); // 10 секунд на изображение

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
    // Если уже загружали в этой сессии - не показываем спиннер
    if (wasLoadedInSession()) {
      console.log('✅ Страница уже загружена в этой сессии');
      return;
    }

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
      // Скрываем спиннер и сохраняем флаг
      hideSpinner();
      markAsLoaded();
      console.log('🎉 Предзагрузка завершена!');
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

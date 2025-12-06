// ========== АВТОМАТИЧЕСКИЙ SKELETON LOADER ==========

class SkeletonLoader {
  constructor() {
    this.activeSkeletons = new Map();
    this.loadingElements = new Set();
    this.config = {
      autoDetect: true,
      fadeInDuration: 300,
      minDisplayTime: 300,
      imageObserver: true
    };
    
    this.init();
  }

  init() {
    if (this.config.autoDetect) {
      this.interceptFetch();
      this.setupImageObserver();
      this.autoDetectContainers();
    }
  }

  // Перехватываем fetch для автоматического показа скелетонов
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0];
      const startTime = Date.now();
      
      // Показываем скелетон для API запросов
      if (typeof url === 'string' && url.includes('/api/')) {
        const container = this.findContainerForAPI(url);
        if (container) {
          this.showForContainer(container);
        }
      }
      
      try {
        const response = await originalFetch(...args);
        
        // Минимальное время показа скелетона
        const elapsed = Date.now() - startTime;
        if (elapsed < this.config.minDisplayTime) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.minDisplayTime - elapsed)
          );
        }
        
        return response;
      } catch (error) {
        throw error;
      } finally {
        // Скрываем скелетон
        if (typeof url === 'string' && url.includes('/api/')) {
          const container = this.findContainerForAPI(url);
          if (container) {
            setTimeout(() => this.hideForContainer(container), 50);
          }
        }
      }
    };
  }

  // Находим контейнер по API endpoint
  findContainerForAPI(url) {
    const mappings = {
      '/api/referral': '.refferal-info, .referral-list',
      '/api/balance': '.balance-display, .profile-balance',
      '/api/games': '.games-grid, .game-list',
      '/api/transactions': '.transactions-list',
      '/api/user': '.profile-section',
      '/api/telegram-user': '.user-info'
    };
    
    for (const [endpoint, selector] of Object.entries(mappings)) {
      if (url.includes(endpoint)) {
        return document.querySelector(selector);
      }
    }
    
    return null;
  }

  // Автоматическое определение контейнеров
  autoDetectContainers() {
    // Контейнеры которые нужно отслеживать
    const selectors = [
      '.games-grid',
      '.game-list', 
      '.transactions-list',
      '.referral-list',
      '.profile-section',
      '.balance-display'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!el.dataset.skeletonReady) {
          this.prepareContainer(el);
          el.dataset.skeletonReady = 'true';
        }
      });
    });
  }

  // Подготовить контейнер
  prepareContainer(container) {
    const type = this.detectContainerType(container);
    const skeleton = this.createSkeletonForType(type);
    skeleton.style.display = 'none';
    
    if (container.firstChild) {
      container.insertBefore(skeleton, container.firstChild);
    } else {
      container.appendChild(skeleton);
    }
    
    this.activeSkeletons.set(container, skeleton);
  }

  // Определить тип контейнера
  detectContainerType(container) {
    if (container.classList.contains('games-grid')) return 'grid';
    if (container.classList.contains('transactions-list')) return 'list';
    if (container.classList.contains('referral-list')) return 'list';
    if (container.classList.contains('profile-section')) return 'profile';
    if (container.classList.contains('balance-display')) return 'text';
    return 'card';
  }

  // Создать скелетон по типу
  createSkeletonForType(type) {
    const wrapper = document.createElement('div');
    wrapper.className = 'skeleton-wrapper';
    
    switch(type) {
      case 'grid':
        wrapper.innerHTML = this.createGridSkeleton(6);
        break;
      case 'list':
        wrapper.innerHTML = this.createListSkeleton(5);
        break;
      case 'profile':
        wrapper.innerHTML = this.createProfileSkeletonHTML();
        break;
      case 'card':
        wrapper.innerHTML = this.createCardSkeletonHTML();
        break;
      case 'text':
        wrapper.innerHTML = '<div class="skeleton skeleton-text"></div>';
        break;
    }
    
    return wrapper;
  }

  createGridSkeleton(count) {
    let html = '<div class="skeleton-grid">';
    for (let i = 0; i < count; i++) {
      html += this.createCardSkeletonHTML();
    }
    html += '</div>';
    return html;
  }

  createListSkeleton(count) {
    let html = '<div class="skeleton-list">';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-list-item">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-profile-info">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text-short"></div>
          </div>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  createCardSkeletonHTML() {
    return `
      <div class="skeleton skeleton-card-full">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton skeleton-heading"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text-short"></div>
        </div>
      </div>
    `;
  }

  createProfileSkeletonHTML() {
    return `
      <div class="skeleton-profile">
        <div class="skeleton skeleton-avatar-large"></div>
        <div class="skeleton-profile-info">
          <div class="skeleton skeleton-heading"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text-short"></div>
        </div>
      </div>
    `;
  }

  // Показать скелетон для контейнера
  showForContainer(container) {
    if (!container) return;
    
    const skeleton = this.activeSkeletons.get(container);
    if (skeleton) {
      // Скрываем реальный контент
      Array.from(container.children).forEach(child => {
        if (child !== skeleton) {
          child.style.display = 'none';
        }
      });
      
      // Показываем скелетон
      skeleton.style.display = 'block';
      this.loadingElements.add(container);
    }
  }

  // Скрыть скелетон для контейнера
  hideForContainer(container) {
    if (!container) return;
    
    const skeleton = this.activeSkeletons.get(container);
    if (skeleton) {
      // Скрываем скелетон
      skeleton.style.display = 'none';
      
      // Показываем реальный контент с анимацией
      Array.from(container.children).forEach(child => {
        if (child !== skeleton && child.style.display === 'none') {
          child.style.display = '';
          child.classList.add('content-loaded');
        }
      });
      
      this.loadingElements.delete(container);
    }
  }

  // Setup IntersectionObserver для изображений
  setupImageObserver() {
    if (!this.config.imageObserver) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    // Отслеживаем новые изображения
    const observeImages = () => {
      document.querySelectorAll('img[data-src], img[loading="lazy"]').forEach(img => {
        if (!img.dataset.skeletonObserved) {
          observer.observe(img);
          img.dataset.skeletonObserved = 'true';
        }
      });
    };
    
    // Наблюдаем за изменениями DOM
    const mutationObserver = new MutationObserver(observeImages);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Первый запуск
    observeImages();
  }

  // Загрузка изображения со скелетоном
  loadImage(img) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-image';
    skeleton.style.width = img.offsetWidth ? `${img.offsetWidth}px` : '100%';
    skeleton.style.height = img.offsetHeight ? `${img.offsetHeight}px` : '200px';
    skeleton.style.position = 'absolute';
    skeleton.style.top = '0';
    skeleton.style.left = '0';
    
    img.style.position = 'relative';
    img.parentElement.style.position = 'relative';
    img.parentElement.insertBefore(skeleton, img);
    img.style.opacity = '0';
    
    const src = img.dataset.src || img.src;
    
    const loadImg = new Image();
    loadImg.onload = () => {
      img.src = src;
      img.style.opacity = '';
      img.classList.add('content-loaded');
      skeleton.remove();
    };
    
    loadImg.onerror = () => {
      skeleton.remove();
    };
    
    loadImg.src = src;
  }

  // Публичные методы для ручного управления
  show(selector) {
    const container = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;
    this.showForContainer(container);
  }

  hide(selector) {
    const container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
    this.hideForContainer(container);
  }

  hideAll() {
    this.loadingElements.forEach(container => {
      this.hideForContainer(container);
    });
  }

  // Обертка для fetch с автоматическим скелетоном
  fetchWithSkeleton(url, container, options = {}) {
    const cont = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (cont && !this.activeSkeletons.has(cont)) {
      this.prepareContainer(cont);
    }
    
    this.showForContainer(cont);
    
    return fetch(url, options)
      .then(response => response.json())
      .then(data => {
        this.hideForContainer(cont);
        return data;
      })
      .catch(error => {
        this.hideForContainer(cont);
        throw error;
      });
  }

  // Создать скелетон для изображения
  createImageSkeleton(container, options = {}) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-image';
    
    if (options.width) skeleton.style.width = options.width;
    if (options.height) skeleton.style.height = options.height;
    if (options.className) skeleton.className += ` ${options.className}`;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.appendChild(skeleton);
      this.activeSkeletons.add(skeleton);
    }
    
    return skeleton;
  }

  // Создать скелетон карточки
  createCardSkeleton(container, options = {}) {
    const card = document.createElement('div');
    card.className = 'skeleton skeleton-card-full';
    
    card.innerHTML = `
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton skeleton-heading"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-short"></div>
        <div class="skeleton skeleton-button" style="margin-top: 12px;"></div>
      </div>
    `;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.appendChild(card);
      this.activeSkeletons.add(card);
    }
    
    return card;
  }

  // Создать скелетон профиля
  createProfileSkeleton(container) {
    const profile = document.createElement('div');
    profile.className = 'skeleton-profile';
    
    profile.innerHTML = `
      <div class="skeleton skeleton-avatar-large"></div>
      <div class="skeleton-profile-info">
        <div class="skeleton skeleton-heading"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-short"></div>
      </div>
    `;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.appendChild(profile);
      this.activeSkeletons.add(profile);
    }
    
    return profile;
  }

  // Создать скелетон списка
  createListSkeletons(container, count = 5) {
    const list = document.createElement('div');
    list.className = 'skeleton-list';
    
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-list-item';
      
      item.innerHTML = `
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-profile-info">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text-short"></div>
        </div>
      `;
      
      list.appendChild(item);
    }
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.appendChild(list);
      this.activeSkeletons.add(list);
    }
    
    return list;
  }

  // Создать сетку скелетонов карточек
  createCardGrid(container, count = 6) {
    const grid = document.createElement('div');
    grid.className = 'skeleton-grid';
    
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton skeleton-card-full';
      
      card.innerHTML = `
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton skeleton-heading"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text-medium"></div>
          <div class="skeleton skeleton-button" style="margin-top: 12px;"></div>
        </div>
      `;
      
      grid.appendChild(card);
    }
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.appendChild(grid);
      this.activeSkeletons.add(grid);
    }
    
    return grid;
  }

  // Автоматическое применение к элементам с data-атрибутом
  autoApply() {
    // Найти все элементы с data-skeleton
    const elements = document.querySelectorAll('[data-skeleton]');
    
    elements.forEach(element => {
      const type = element.getAttribute('data-skeleton');
      
      switch(type) {
        case 'image':
          element.classList.add('skeleton', 'skeleton-image');
          break;
        case 'heading':
          element.classList.add('skeleton', 'skeleton-heading');
          break;
        case 'text':
          element.classList.add('skeleton', 'skeleton-text');
          break;
        case 'button':
          element.classList.add('skeleton', 'skeleton-button');
          break;
        case 'card':
          element.classList.add('skeleton', 'skeleton-card');
          break;
        case 'avatar':
          element.classList.add('skeleton', 'skeleton-avatar');
          break;
        default:
          element.classList.add('skeleton');
      }
      
      this.activeSkeletons.add(element);
    });
  }

  // Показать скелетон пока загружается изображение
  wrapImage(imgElement) {
    if (typeof imgElement === 'string') {
      imgElement = document.querySelector(imgElement);
    }
    
    if (!imgElement) return;
    
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-image';
    skeleton.style.width = imgElement.width ? `${imgElement.width}px` : '100%';
    skeleton.style.height = imgElement.height ? `${imgElement.height}px` : '200px';
    
    imgElement.parentNode.insertBefore(skeleton, imgElement);
    imgElement.style.display = 'none';
    
    this.activeSkeletons.add(skeleton);
    
    imgElement.addEventListener('load', () => {
      skeleton.remove();
      imgElement.style.display = '';
      imgElement.classList.add('content-loaded');
      this.activeSkeletons.delete(skeleton);
    });
    
    imgElement.addEventListener('error', () => {
      skeleton.remove();
      this.activeSkeletons.delete(skeleton);
    });
  }
}

}

// ========== ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР ==========

window.SkeletonLoader = new SkeletonLoader();

// ========== ХЕЛПЕРЫ ДЛЯ БЫСТРОГО ИСПОЛЬЗОВАНИЯ ==========

// Обертка для fetch
window.fetchWithSkeleton = (url, container, options) => {
  return window.SkeletonLoader.fetchWithSkeleton(url, container, options);
};

// Показать/скрыть
window.showSkeleton = (selector) => window.SkeletonLoader.show(selector);
window.hideSkeleton = (selector) => window.SkeletonLoader.hide(selector);

// ========== ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМ КОДОМ ==========

// Автоматический запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Skeleton Loader активирован');
  });
} else {
  console.log('✅ Skeleton Loader активирован');
}

// Переопределяем console для автоопределения контейнеров после изменений
const originalLog = console.log;
console.log = function(...args) {
  originalLog.apply(console, args);
  
  // Проверяем новые контейнеры после каждого лога (оптимизировано)
  if (window.SkeletonLoader && Math.random() < 0.1) {
    setTimeout(() => window.SkeletonLoader.autoDetectContainers(), 100);
  }
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkeletonLoader;
}

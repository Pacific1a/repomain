// ========== SKELETON LOADER УПРАВЛЕНИЕ ==========

class SkeletonLoader {
  constructor() {
    this.activeSkeletons = new Set();
  }

  // Показать скелетон
  show(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (element) {
      element.classList.remove('skeleton-hidden');
      element.classList.add('skeleton');
      this.activeSkeletons.add(element);
    }
  }

  // Скрыть скелетон и показать контент
  hide(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (element) {
      element.classList.add('skeleton-hidden');
      element.classList.remove('skeleton');
      this.activeSkeletons.delete(element);
      
      // Добавить анимацию появления контенту
      const content = element.nextElementSibling;
      if (content) {
        content.classList.add('content-loaded');
      }
    }
  }

  // Скрыть все скелетоны
  hideAll() {
    this.activeSkeletons.forEach(skeleton => {
      this.hide(skeleton);
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

// Глобальный экземпляр
window.SkeletonLoader = new SkeletonLoader();

// Автоматическое применение при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  window.SkeletonLoader.autoApply();
});

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkeletonLoader;
}

# 🎨 Skeleton Loader - Руководство

## Что это?

Skeleton Loader с **shimmer-анимацией** и **эффектом стеклянного блика** для элементов, загружающихся с сервера.

---

## ✨ Возможности

- ✅ Shimmer-анимация (волновой эффект)
- ✅ Эффект стеклянного блика
- ✅ Готовые компоненты для разных типов контента
- ✅ Автоматическое применение через data-атрибуты
- ✅ JavaScript API для управления
- ✅ Адаптивный дизайн

---

## 🚀 Быстрый старт

### Вариант 1: HTML с data-атрибутами

```html
<!-- Скелетон автоматически применится -->
<div data-skeleton="image" style="width: 300px; height: 200px;"></div>
<h1 data-skeleton="heading">Заголовок загружается...</h1>
<p data-skeleton="text">Текст загружается...</p>
<button data-skeleton="button">Кнопка</button>
```

### Вариант 2: CSS классы

```html
<div class="skeleton skeleton-image"></div>
<div class="skeleton skeleton-heading"></div>
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-button"></div>
```

### Вариант 3: JavaScript API

```javascript
// Показать скелетон
SkeletonLoader.show('.my-element');

// Скрыть скелетон после загрузки
fetch('/api/data')
  .then(response => response.json())
  .then(data => {
    // Обновить контент
    updateContent(data);
    // Скрыть скелетон
    SkeletonLoader.hide('.my-element');
  });
```

---

## 📦 Типы скелетонов

### 1. Изображения

```html
<!-- Обычное изображение -->
<div class="skeleton skeleton-image"></div>

<!-- Кастомный размер -->
<div class="skeleton skeleton-image" style="width: 400px; height: 300px;"></div>
```

```javascript
// Через JS
SkeletonLoader.createImageSkeleton('.container', {
  width: '400px',
  height: '300px'
});
```

### 2. Заголовки

```html
<!-- Обычный заголовок -->
<div class="skeleton skeleton-heading"></div>

<!-- Большой заголовок -->
<div class="skeleton skeleton-heading-large"></div>
```

### 3. Текст

```html
<!-- Полная ширина -->
<div class="skeleton skeleton-text"></div>

<!-- Короткий текст (60%) -->
<div class="skeleton skeleton-text-short"></div>

<!-- Средний текст (80%) -->
<div class="skeleton skeleton-text-medium"></div>
```

### 4. Кнопки

```html
<!-- Обычная кнопка -->
<div class="skeleton skeleton-button"></div>

<!-- Маленькая кнопка -->
<div class="skeleton skeleton-button-small"></div>
```

### 5. Аватары

```html
<!-- Обычный аватар -->
<div class="skeleton skeleton-avatar"></div>

<!-- Большой аватар -->
<div class="skeleton skeleton-avatar-large"></div>
```

### 6. Карточки

```html
<div class="skeleton skeleton-card-full">
  <div class="skeleton skeleton-image"></div>
  <div class="skeleton-content">
    <div class="skeleton skeleton-heading"></div>
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text-short"></div>
    <div class="skeleton skeleton-button"></div>
  </div>
</div>
```

```javascript
// Через JS
SkeletonLoader.createCardSkeleton('.container');
```

---

## 🎯 Готовые компоненты

### Сетка карточек

```javascript
// Создать сетку из 6 карточек
SkeletonLoader.createCardGrid('.container', 6);
```

### Профиль

```javascript
// Создать скелетон профиля
SkeletonLoader.createProfileSkeleton('.profile-container');
```

### Список

```javascript
// Создать список из 5 элементов
SkeletonLoader.createListSkeletons('.list-container', 5);
```

---

## 💻 JavaScript API

### Показать/скрыть скелетоны

```javascript
// Показать скелетон
SkeletonLoader.show('#my-element');

// Скрыть скелетон
SkeletonLoader.hide('#my-element');

// Скрыть все скелетоны
SkeletonLoader.hideAll();
```

### Обертка для изображений

```javascript
// Автоматически показать скелетон пока загружается изображение
const img = document.querySelector('img');
SkeletonLoader.wrapImage(img);
```

### Создание скелетонов

```javascript
// Карточка
SkeletonLoader.createCardSkeleton('.container');

// Изображение
SkeletonLoader.createImageSkeleton('.container', {
  width: '300px',
  height: '200px'
});

// Профиль
SkeletonLoader.createProfileSkeleton('.container');

// Список
SkeletonLoader.createListSkeletons('.container', 5);

// Сетка карточек
SkeletonLoader.createCardGrid('.container', 6);
```

---

## 🎨 Специальные эффекты

### Пульсация

```html
<div class="skeleton skeleton-pulse skeleton-heading"></div>
```

### Волновой эффект

```html
<div class="skeleton skeleton-wave skeleton-text"></div>
```

---

## 📱 Примеры использования

### Пример 1: Загрузка карточек товаров

```javascript
// Показать скелетоны
const container = document.querySelector('.products-grid');
SkeletonLoader.createCardGrid(container, 8);

// Загрузить данные
fetch('/api/products')
  .then(response => response.json())
  .then(products => {
    // Очистить скелетоны
    container.innerHTML = '';
    
    // Отобразить товары
    products.forEach(product => {
      const card = createProductCard(product);
      container.appendChild(card);
      card.classList.add('content-loaded');
    });
  });
```

### Пример 2: Загрузка профиля

```javascript
// Показать скелетон профиля
SkeletonLoader.createProfileSkeleton('.profile-container');

// Загрузить данные профиля
fetch('/api/user/profile')
  .then(response => response.json())
  .then(user => {
    // Скрыть скелетон
    SkeletonLoader.hideAll();
    
    // Отобразить профиль
    displayProfile(user);
  });
```

### Пример 3: Изображения с lazy loading

```html
<img src="image.jpg" alt="Product" class="product-image">

<script>
  const images = document.querySelectorAll('.product-image');
  images.forEach(img => {
    SkeletonLoader.wrapImage(img);
  });
</script>
```

### Пример 4: Список транзакций

```javascript
// Показать скелетоны списка
SkeletonLoader.createListSkeletons('.transactions-list', 10);

// Загрузить транзакции
fetch('/api/transactions')
  .then(response => response.json())
  .then(transactions => {
    const list = document.querySelector('.transactions-list');
    list.innerHTML = '';
    
    transactions.forEach(transaction => {
      const item = createTransactionItem(transaction);
      list.appendChild(item);
      item.classList.add('content-loaded');
    });
  });
```

---

## 🎭 Кастомизация

### Изменение цветов

```css
/* Изменить базовый цвет скелетона */
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(YOUR_COLOR, 0.05) 0%,
    rgba(YOUR_COLOR, 0.15) 50%,
    rgba(YOUR_COLOR, 0.05) 100%
  );
}

/* Изменить цвет стеклянного блика */
.skeleton::before {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(YOUR_COLOR, 0.3),
    transparent
  );
}
```

### Изменение скорости анимации

```css
.skeleton {
  animation: shimmer 2s ease-in-out infinite; /* Было 1.5s */
}

.skeleton::before {
  animation: glass-shine 3s ease-in-out infinite; /* Было 2s */
}
```

---

## ⚙️ Интеграция с существующими страницами

### main/index.html (Главная)

```javascript
// При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Показать скелетоны для карточек игр
  SkeletonLoader.createCardGrid('.games-grid', 6);
  
  // Загрузить игры
  loadGames().then(() => {
    SkeletonLoader.hideAll();
  });
});
```

### profile/ (Профиль)

```javascript
// Показать скелетон профиля
SkeletonLoader.createProfileSkeleton('.profile-section');

// Загрузить данные
loadUserProfile().then(() => {
  SkeletonLoader.hide('.profile-section .skeleton-profile');
});
```

### refferall/ (Реферальная система)

```javascript
// Показать скелетоны для списка рефералов
SkeletonLoader.createListSkeletons('.referrals-list', 5);

// Загрузить рефералов
loadReferrals().then(() => {
  SkeletonLoader.hideAll();
});
```

---

## 🔧 Troubleshooting

### Скелетон не исчезает

```javascript
// Убедитесь что вызываете hide после загрузки
SkeletonLoader.hide('.my-element');

// Или скройте все
SkeletonLoader.hideAll();
```

### Анимация не работает

```css
/* Проверьте что CSS файл подключен */
<link rel="stylesheet" href="skeleton.css" />

/* И что элемент имеет класс .skeleton */
<div class="skeleton skeleton-image"></div>
```

### Скелетон не применяется автоматически

```html
<!-- Убедитесь что используете правильный data-атрибут -->
<div data-skeleton="image"></div>

<!-- И что JS скрипт загружен -->
<script src="skeleton.js"></script>
```

---

## 📊 Performance Tips

1. **Используйте CSS классы вместо JS** когда возможно (быстрее)
2. **Ограничьте количество скелетонов** на странице (рекомендуется до 20)
3. **Используйте `will-change`** для критичных анимаций:

```css
.skeleton {
  will-change: background-position;
}
```

---

## 🎉 Готовые шаблоны

Все файлы уже подключены в `index.html`:
- `skeleton.css` - стили
- `skeleton.js` - логика

Просто используйте классы или API!

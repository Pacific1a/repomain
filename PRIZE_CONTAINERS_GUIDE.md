# 📦 Гайд по добавлению своих изображений призов

Изображения призов полностью убраны из кода. Вместо них созданы **пустые контейнеры** с `data-` атрибутами.

---

## 🎯 Где находятся контейнеры

### 1️⃣ **Preview (превью призов в модальном окне)**

**Класс:** `.prize-preview-container`

**Атрибуты:**
- `data-prize` - значение приза (50, 100, 200, etc.)
- `data-is-chips` - `true` (фишки) или `false` (рубли)

**Размер:** 110x110px

---

### 2️⃣ **Spin (карусель при открытии кейса)**

**Класс:** `.prize-spin-container`

**Атрибуты:**
- `data-prize` - значение приза
- `data-is-chips` - `true` или `false`

**Размер:** 110x110px

---

### 3️⃣ **Win (окно выигрыша)**

**Класс:** `.prize-win-container`

**Атрибуты:**
- `data-prize` - значение приза
- `data-is-chips` - `true` или `false`
- `data-color` - цвет приза (`red`, `blue`, `purple`, `yellow`, `gray`)

**Размер:** 110x110px

---

## 💡 Как добавить свои изображения

### Вариант 1: Через JavaScript (после загрузки страницы)

```javascript
// В файле bot/main/case-opener.js или отдельном скрипте

// Для Preview
document.querySelectorAll('.prize-preview-container').forEach(container => {
  const prize = container.getAttribute('data-prize');
  const isChips = container.getAttribute('data-is-chips') === 'true';
  
  container.innerHTML = `<img src="/images/prizes/${prize}.png" alt="${prize}" style="width: 110px; height: 110px;" />`;
});

// Для Spin
document.querySelectorAll('.prize-spin-container').forEach(container => {
  const prize = container.getAttribute('data-prize');
  const isChips = container.getAttribute('data-is-chips') === 'true';
  
  container.innerHTML = `<img src="/images/prizes/${prize}.png" alt="${prize}" style="width: 110px; height: 110px;" />`;
});

// Для Win
document.querySelectorAll('.prize-win-container').forEach(container => {
  const prize = container.getAttribute('data-prize');
  const color = container.getAttribute('data-color');
  const isChips = container.getAttribute('data-is-chips') === 'true';
  
  container.innerHTML = `<img src="/images/prizes/${prize}-${color}.png" alt="WIN ${prize}" style="width: 110px; height: 110px;" />`;
});
```

---

### Вариант 2: Модификация case-opener.js напрямую

#### **Preview (строка ~207)**

```javascript
const container = document.createElement('div');
container.className = 'prize-preview-container';
container.setAttribute('data-prize', prize);
container.setAttribute('data-is-chips', isChips);
container.style.width = '110px';
container.style.height = '110px';

// ДОБАВЬТЕ ЗДЕСЬ:
container.innerHTML = `<img src="/images/prizes/${prize}.png" style="width: 110px; height: 110px;" />`;

itemPreview.appendChild(container);
```

#### **Spin карусель (строка ~249)**

```javascript
const containerItem = document.createElement('div');
containerItem.className = 'prize-spin-container';
containerItem.setAttribute('data-prize', prize);
containerItem.setAttribute('data-is-chips', isChipsCase);
containerItem.style.width = '110px';
containerItem.style.height = '110px';

// ДОБАВЬТЕ ЗДЕСЬ:
containerItem.innerHTML = `<img src="/images/prizes/${prize}.png" style="width: 110px; height: 110px;" />`;

container.appendChild(containerItem);
```

#### **Win окно (строка ~536)**

```javascript
const winContainer = document.createElement('div');
winContainer.className = 'prize-win-container';
winContainer.setAttribute('data-prize', wonPrize);
winContainer.setAttribute('data-is-chips', currentCase.isChipsCase);
winContainer.setAttribute('data-color', window.winningColor || 'gray');
winContainer.style.width = '110px';
winContainer.style.height = '110px';

// ДОБАВЬТЕ ЗДЕСЬ:
const color = window.winningColor || 'gray';
winContainer.innerHTML = `<img src="/images/prizes/${wonPrize}-${color}.png" style="width: 110px; height: 110px;" />`;

winItem.appendChild(winContainer);
```

---

## 🎨 Примеры HTML контента

### Простая картинка
```javascript
container.innerHTML = `<img src="/images/${prize}.png" style="width: 110px; height: 110px;" />`;
```

### С текстом
```javascript
container.innerHTML = `
  <div style="width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 12px; color: white; font-size: 24px;">
    ${prize}₽
  </div>
`;
```

### С SVG
```javascript
container.innerHTML = `
  <svg width="110" height="110" viewBox="0 0 110 110">
    <circle cx="55" cy="55" r="50" fill="#FFD700" />
    <text x="55" y="60" text-anchor="middle" font-size="24" fill="#000">${prize}</text>
  </svg>
`;
```

### С CSS классами
```javascript
container.innerHTML = `
  <div class="my-prize-card" data-value="${prize}">
    <img src="/images/${prize}.png" />
    <span>${prize}₽</span>
  </div>
`;
```

---

## 📂 Структура файлов изображений (пример)

```
bot/
  images/
    prizes/
      50.png
      100.png
      200.png
      ...
      5000-red.png
      4000-blue.png
      3000-purple.png
      ...
```

---

## 🔧 Как вернуть загрузку с GitHub

Если захотите вернуть загрузку изображений с GitHub:

В `bot/main/case-opener.js` (строка 5):
```javascript
const ENABLE_PRIZE_IMAGES = true; // Было: false
```

---

## ❓ FAQ

**Q: Где хранить изображения?**  
A: Локально в папке `bot/images/` или на CDN (Cloudinary, imgix, etc.)

**Q: Какой размер изображений нужен?**  
A: 110x110px для обычных экранов, 220x220px для Retina (2x), 330x330px для высокой четкости (3x)

**Q: Можно ли использовать разные форматы?**  
A: Да! PNG, JPG, WebP, SVG - любые форматы поддерживаются

**Q: Можно ли добавить анимацию?**  
A: Да! Используйте GIF или CSS анимации через классы

---

✅ **Готово! Теперь вы можете добавлять любой HTML контент в контейнеры призов!**

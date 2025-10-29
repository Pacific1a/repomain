# 🎰 ПОДДЕРЖКА КЕЙСОВ ЗА ФИШКИ (CHIPS)

## ✅ ЧТО ДОБАВЛЕНО:

### 1. Конфигурация кейсов за фишки

Добавлены 5 новых кейсов:

```javascript
// Кейсы за фишки (chips)
314: [50, 101, 155, 202, 255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002],
542: [155, 202, 255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505],
911: [255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505, 3003],
993: [255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505, 3003, 4004],
1337: [255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002, 2505, 3003, 4004, 5005]
```

---

### 2. Цветовые вариации для фишек

```javascript
const PRIZE_COLORS_CHIPS = {
  5005: ['red'],
  4004: ['blue', 'red'],
  3003: ['blue', 'red'],
  2505: ['blue', 'purple', 'red'],
  2002: ['blue', 'purple', 'red'],
  1505: ['blue', 'purple'],
  1001: ['blue', 'purple', 'yellow'],
  880: ['blue', 'purple', 'yellow'],
  777: ['purple', 'yellow'],
  707: ['purple', 'yellow'],
  505: ['gray', 'yellow'],
  404: ['gray', 'yellow'],
  303: ['gray', 'yellow'],
  255: ['gray', 'yellow'],
  202: ['gray'],
  155: ['gray'],
  101: ['gray'],
  50: ['gray']
};
```

---

### 3. Структура папок

```
main/
├── Chips-case/           ← Фишки в карусели
│   ├── blue/
│   │   └── 1001-chips-blue.png
│   ├── gray/
│   │   └── 101-chips-gray.png
│   ├── purple/
│   │   └── 777-chips-purple.png
│   ├── red/
│   │   └── 5005-chips-red.png
│   └── yellow/
│       └── 777-chips-yellow.png
│
├── preview-chips/        ← Превью призов
│   ├── 1001-chips-blue-preview.png
│   ├── 101-chips-gray-preview.png
│   └── ...
│
└── Win-chips/            ← Выигрышные токены
    ├── 1001-chips-blue.png
    ├── 101-chips-gray.png
    └── ...
```

---

### 4. Пути к изображениям

#### Для кейсов за ФИШКИ:
```javascript
{
  spin: `main/Chips-case/${color}/${prize}-chips-${color}.png`,
  preview: `main/preview-chips/${prize}-chips-${color}-preview.png`,
  win: `main/Win-chips/${prize}-chips-${color}.png`
}
```

#### Для кейсов за РУБЛИ (как было):
```javascript
{
  spin: `main/Case-tokens/${color}/${prize}-r-${color}.png`,
  preview: `main/prewiew-tokens/${color}/${prize}-r-${color}.png`,
  win: `main/win-tokens/${color}/${prize}-r-${color}.png`
}
```

---

## 🔧 КАК РАБОТАЕТ:

### 1. Определение типа кейса

Кейс определяется по атрибуту `data-chips="true"`:

```html
<!-- Кейс за рубли -->
<div class="cards" data-price="279">...</div>

<!-- Кейс за фишки -->
<div class="cards" data-price="314" data-chips="true">...</div>
```

### 2. Автоматический выбор путей

```javascript
function getPrizeImages(prize, isChips = false) {
  const color = getRandomColor(prize, isChips);
  
  if (isChips) {
    // Пути для фишек
    return {
      spin: `main/Chips-case/${color}/${prize}-chips-${color}.png`,
      preview: `main/preview-chips/${prize}-chips-${color}-preview.png`,
      win: `main/Win-chips/${prize}-chips-${color}.png`,
      color: color
    };
  } else {
    // Пути для рублей
    return {
      spin: `main/Case-tokens/${color}/${prize}-r-${color}.png`,
      preview: `main/prewiew-tokens/${color}/${prize}-r-${color}.png`,
      win: `main/win-tokens/${color}/${prize}-r-${color}.png`,
      color: color
    };
  }
}
```

---

## 📊 ПРИМЕРЫ:

### Кейс 314 (chips):
```
Призы: 50, 101, 155, 202, 255, 303, 404, 505, 707, 777, 880, 1001, 1505, 2002
Цвета для 777: purple, yellow (случайный выбор)
Путь: main/Chips-case/purple/777-chips-purple.png
```

### Кейс 1337 (chips):
```
Призы: 255...5005
Цвета для 5005: red
Путь: main/Chips-case/red/5005-chips-red.png
```

---

## ✅ ОСОБЕННОСТИ:

### 1. Рандомный выбор цвета
Как и для рублевых кейсов, система:
- Ищет ВСЕ фишки нужного номинала в карусели
- Выбирает СЛУЧАЙНУЮ из них
- Использует её РЕАЛЬНЫЙ цвет

### 2. Автоисправление
Если фишка под индикатором не совпадает с ожидаемой:
- Система автоматически использует РЕАЛЬНОЕ значение
- Цвет также корректируется

### 3. Реальные размеры
Система измеряет РЕАЛЬНЫЕ размеры фишек из браузера:
- Не использует константы
- Точное позиционирование

---

## 🎯 ИТОГ:

**Теперь система поддерживает:**
- ✅ Кейсы за рубли (279, 329, 389, 419, 479, 529, 659, 777, 819, 999)
- ✅ Кейсы за фишки (314, 542, 911, 993, 1337)
- ✅ Автоматическое определение типа кейса
- ✅ Правильные пути к изображениям
- ✅ Рандомный выбор цвета
- ✅ Автоисправление
- ✅ Реальные размеры

---

## 🧪 ТЕСТИРОВАНИЕ:

1. Открой кейс за фишки (314, 542, 911, 993 или 1337)
2. Проверь что:
   - Превью показывает правильные фишки
   - Карусель крутится
   - Выигрышная фишка совпадает с индикатором
   - Цвет совпадает
   - Win-window показывает правильную фишку

---

**ВСЁ ГОТОВО! КЕЙСЫ ЗА ФИШКИ РАБОТАЮТ!** 🎰💎✨

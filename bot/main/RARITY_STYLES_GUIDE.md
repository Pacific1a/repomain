# 🎨 ГАЙД ПО СТИЛЯМ СИСТЕМЫ РЕДКОСТИ

## 📁 Где Находятся Стили

**Основной файл стилей:**
```
bot/main/rarity-system.css
```

**Фоновое изображение:**
```
bot/main/assets/bgs-case.png
```

---

## 🖼️ Настройка Фонового Изображения

### **Локация в CSS:** Строки 5-15

```css
.prize-card {
  /* === ФОНОВОЕ ИЗОБРАЖЕНИЕ === */
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)),  /* Затемнение */
    url('../assets/bgs-case.png');                             /* Фон */
  background-size: cover;          /* Заполняет всю карточку */
  background-position: center;     /* Центрирование */
  background-repeat: no-repeat;    /* Не повторяется */
}
```

### **Что можно менять:**

#### 1. **Затемнение фона:**
```css
/* Текущее: */
linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8))

/* Сильнее затемнить: */
linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.95))

/* Слабее затемнить: */
linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5))

/* Убрать затемнение: */
/* Просто удали эту строку */
```

#### 2. **Размер фона:**
```css
/* Текущее: */
background-size: cover;  /* Заполняет всю карточку */

/* Альтернативы: */
background-size: contain;     /* Фон полностью виден */
background-size: 100% 100%;   /* Растянуть */
background-size: 80%;         /* Меньше фон */
```

#### 3. **Позиция фона:**
```css
/* Текущее: */
background-position: center;

/* Альтернативы: */
background-position: top;        /* Сверху */
background-position: bottom;     /* Снизу */
background-position: left;       /* Слева */
background-position: 50% 30%;    /* Точная позиция */
```

#### 4. **Другой фон:**
```css
/* Замени путь: */
url('../assets/bgs-case.png')

/* На другой файл: */
url('../assets/другой-фон.png')

/* Или градиент вместо картинки: */
background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
```

---

## 🎨 Настройка Градиента Редкости

### **Локация в CSS:** Строки 22-35

```css
.prize-card::before {
  /* === ГРАДИЕНТ СНИЗУ ВВЕРХ === */
  background: linear-gradient(
    to top,                          /* Направление */
    var(--rarity-color) 0%,         /* Цвет редкости */
    transparent 60%                  /* Прозрачность */
  );
  opacity: 0.1;                      /* Сила градиента */
}
```

### **Что можно менять:**

#### 1. **Направление градиента:**
```css
/* Текущее: */
to top        /* Снизу вверх */

/* Альтернативы: */
to bottom     /* Сверху вниз */
to right      /* Слева направо */
to top right  /* Диагональ */
135deg        /* Угол в градусах */
```

#### 2. **Высота градиента:**
```css
/* Текущее: */
transparent 60%    /* Градиент до 60% высоты */

/* Альтернативы: */
transparent 40%    /* Короче */
transparent 80%    /* Длиннее */
transparent 50%    /* Половина */
```

#### 3. **Сила свечения:**
```css
/* Текущее: */
opacity: 0.1;      /* Слабое свечение */

/* Альтернативы: */
opacity: 0.2;      /* Сильнее */
opacity: 0.05;     /* Еще слабее */
opacity: 0.3;      /* Яркое */
```

---

## 🔲 Настройка Обводки

### **Локация в CSS:** Строки 39-62

```css
.prize-card::after {
  /* === ОБВОДКА ПО РЕДКОСТИ === */
  border: 1.5px solid var(--rarity-color);
  opacity: 0.4;
  box-shadow: 
    inset 0 0 15px rgba(0, 0, 0, 0.3),     /* Внутренняя тень */
    0 0 8px var(--rarity-color);           /* Внешнее свечение */
}
```

### **Что можно менять:**

#### 1. **Толщина обводки:**
```css
/* Текущее: */
border: 1.5px solid var(--rarity-color);

/* Альтернативы: */
border: 1px solid var(--rarity-color);     /* Тоньше */
border: 2px solid var(--rarity-color);     /* Толще */
border: 3px solid var(--rarity-color);     /* Жирная */
```

#### 2. **Прозрачность обводки:**
```css
/* Текущее: */
opacity: 0.4;      /* Слабая */

/* Альтернативы: */
opacity: 0.6;      /* Средняя */
opacity: 0.8;      /* Яркая */
opacity: 1;        /* Максимальная */
```

#### 3. **Свечение обводки:**
```css
/* Текущее: */
0 0 8px var(--rarity-color)      /* Слабое */

/* Альтернативы: */
0 0 15px var(--rarity-color)     /* Среднее */
0 0 25px var(--rarity-color)     /* Сильное */
0 0 0px var(--rarity-color)      /* Без свечения */
```

---

## 💎 Настройка Badge Цены

### **Локация в CSS:** Строки 105-150

```css
.prize-price-badge {
  /* === ПОЗИЦИЯ === */
  top: 6px;
  left: 6px;
  
  /* === РАЗМЕР === */
  padding: 3px 6px;
  
  /* === ФОН === */
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
```

### **Что можно менять:**

#### 1. **Позиция:**
```css
/* Текущее: верхний левый угол */
top: 6px;
left: 6px;

/* Верхний правый: */
top: 6px;
right: 6px;
left: auto;

/* Нижний левый: */
bottom: 6px;
left: 6px;
top: auto;

/* Центр сверху: */
top: 6px;
left: 50%;
transform: translateX(-50%);
```

#### 2. **Размер:**
```css
/* Текущее: */
padding: 3px 6px;
font-size: 11px;

/* Крупнее: */
padding: 5px 10px;
font-size: 13px;

/* Меньше: */
padding: 2px 4px;
font-size: 9px;
```

#### 3. **Прозрачность фона:**
```css
/* Текущее: */
background: rgba(0, 0, 0, 0.7);     /* 70% непрозрачности */

/* Альтернативы: */
background: rgba(0, 0, 0, 0.9);     /* Темнее */
background: rgba(0, 0, 0, 0.5);     /* Прозрачнее */
background: rgba(0, 0, 0, 1);       /* Полностью черный */
```

#### 4. **Цвет иконки рубля:**
```css
/* Текущее: */
color: #ffd700;      /* Золотой */

/* Альтернативы: */
color: #ffffff;      /* Белый */
color: #4fb3ff;      /* Голубой */
color: #ff6b6b;      /* Красный */
```

---

## 🎨 Цвета Редкости

### **Локация в CSS:** Строки 65-95

```css
/* === БОЖЕСТВЕННЫЙ === */
.prize-card[data-rarity="divine"] {
  --rarity-color: #da8f4a;  /* Золотой */
}

/* === МИФИЧЕСКИЙ === */
.prize-card[data-rarity="mythical"] {
  --rarity-color: #be3a41;  /* Красный */
}

/* === ЛЕГЕНДАРНЫЙ === */
.prize-card[data-rarity="legendary"] {
  --rarity-color: #c32f80;  /* Розовый */
}

/* === ЭПИЧЕСКИЙ === */
.prize-card[data-rarity="epic"] {
  --rarity-color: #8e4dde;  /* Фиолетовый */
}

/* === РАРНЫЙ === */
.prize-card[data-rarity="rare"] {
  --rarity-color: #4f66e3;  /* Синий */
}

/* === ОБЫЧНЫЙ === */
.prize-card[data-rarity="common"] {
  --rarity-color: #7c94ae;  /* Серый */
}
```

### **Как поменять цвета:**

Просто замени hex-код на нужный:
```css
.prize-card[data-rarity="divine"] {
  --rarity-color: #ff0000;  /* Теперь красный */
}
```

---

## 📐 Размер Карточки

### **Локация в CSS:** Строки 5-15

```css
.prize-card {
  width: 110px;      /* Ширина */
  height: 140px;     /* Высота */
  border-radius: 12px;  /* Скругление углов */
}
```

### **Как изменить:**

```css
/* Крупнее: */
width: 130px;
height: 160px;

/* Меньше: */
width: 90px;
height: 120px;

/* Квадратная: */
width: 120px;
height: 120px;
```

---

## 🎬 Анимации

### **Локация в CSS:** Строки 175-200

```css
/* Появление карточки */
@keyframes prizeCardAppear {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### **Как настроить:**

```css
/* Быстрее появление: */
.prize-card {
  animation: prizeCardAppear 0.2s ease both;  /* Было 0.4s */
}

/* Другая анимация: */
@keyframes prizeCardAppear {
  from {
    opacity: 0;
    transform: rotateY(180deg);  /* Переворот */
  }
  to {
    opacity: 1;
    transform: rotateY(0);
  }
}
```

---

## 📝 Быстрая Шпаргалка

### **Основные правки:**

| Что изменить | Строка | Свойство |
|--------------|--------|----------|
| Фоновое изображение | 8 | `background-image` |
| Затемнение фона | 7 | `linear-gradient` |
| Градиент редкости | 30-35 | `.prize-card::before` |
| Обводка | 40-62 | `.prize-card::after` |
| Позиция цены | 108-109 | `top`, `left` |
| Размер цены | 113 | `padding`, `font-size` |
| Цвет рубля | 131 | `color` |
| Размер карточки | 6-7 | `width`, `height` |
| Цвета редкости | 65-95 | `--rarity-color` |

---

## ⚠️ ВАЖНО!

После изменений в `rarity-system.css`:
1. Сохрани файл (Ctrl+S)
2. Обнови тестовую страницу (F5)
3. Если на сервере - очисти кеш Telegram

---

## 🛠️ Примеры Готовых Конфигов

### **Конфиг 1: Яркие карточки**
```css
.prize-card {
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)),
    url('../assets/bgs-case.png');
}
.prize-card::before {
  opacity: 0.2;  /* Ярче градиент */
}
.prize-card::after {
  opacity: 0.8;  /* Яркая обводка */
  border: 2px solid var(--rarity-color);
}
```

### **Конфиг 2: Минималистичный**
```css
.prize-card {
  background: rgba(20, 20, 20, 0.95);  /* Без картинки */
}
.prize-card::before {
  opacity: 0.05;  /* Еле видимый градиент */
}
.prize-card::after {
  opacity: 0.3;  /* Слабая обводка */
  border: 1px solid var(--rarity-color);
  box-shadow: none;  /* Без свечения */
}
```

### **Конфиг 3: Неоновый**
```css
.prize-card::after {
  opacity: 1;
  border: 2px solid var(--rarity-color);
  box-shadow: 
    inset 0 0 20px var(--rarity-color),
    0 0 30px var(--rarity-color),
    0 0 50px var(--rarity-color);  /* Мощное свечение! */
}
```

---

**Готово! Все стили в одном файле: `bot/main/rarity-system.css`** 🎨

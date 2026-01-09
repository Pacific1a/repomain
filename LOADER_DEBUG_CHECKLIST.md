# 🔧 LOADER DEBUG CHECKLIST

## ✅ ИСПРАВЛЕНИЯ (ВЫПОЛНЕНО)

### **Commit 9dfad16: CRITICAL - Missing `</head>` tag**

**ПРОБЛЕМА:**
```html
<head>
  <style>...</style>
  <link .../>
  <!-- НЕТ </head> !!! -->
  <style>...</style>
<body>
```

**Без закрывающего `</head>` тега:**
- Браузер не знает где заканчивается head и начинается body
- Может игнорировать стили или применять с задержкой
- Второй `<style>` блок находится ВНЕ `<head>` (invalid HTML)

**ИСПРАВЛЕНО:**
```html
<head>
  <style>...</style>
  <link .../>
  <style>...</style>
</head>
<body>
```

---

## 🧪 ТЕСТИРОВАНИЕ

### **Шаг 1: Очистить кеш**
```
1. Открыть DevTools (F12)
2. Application → Storage → Clear site data
3. Или: sessionStorage.clear() в Console
```

### **Шаг 2: Открыть бота**
```
1. Закрыть Telegram полностью
2. Открыть @TwinUpBot
3. Запустить /start
```

### **Шаг 3: Проверить Console (F12)**
```
Ожидаемые логи:

🔍 Inline script check: {hasFlag: false, value: null, willShowLoader: true}
⏳ Inline: Флага нет, loader ВИДЕН из CSS
```

### **Шаг 4: Проверить элемент #page-preloader**
```
F12 → Elements → найти:
<div id="page-preloader">

Computed styles должны быть:
- display: flex ✅
- position: fixed ✅
- background-color: rgb(21, 20, 20) ✅
- opacity: 1 ✅
- z-index: 999999 ✅
```

---

## 🚨 ЕСЛИ LOADER ВСЁ ЕЩЁ НЕ ПОКАЗЫВАЕТСЯ

### **Возможные причины:**

#### **1. Шрифты Montserrat не загрузились**
**Симптом:** Контейнер виден, но текста нет

**Проверка:**
```
F12 → Network → Filter: Font
Должны загрузиться: Montserrat-SemiBold, Montserrat-Medium
```

**Fallback:** В critical CSS уже есть:
```css
font-family: "Montserrat-SemiBold", Helvetica, Arial, sans-serif;
```
Если Montserrat не загрузился, должен использоваться Helvetica или Arial.

---

#### **2. SVG изображение токена не загрузилось**
**Симптом:** Текст виден, но SVG токена нет

**Проверка:**
```html
<svg class="token">
  <rect fill="url(#pattern0_31_111)"/>
  <pattern id="pattern0_31_111">
    <image href="https://github.com/Pacific1a/img/blob/main/imgALL/Group%208.png?raw=true"/>
  </pattern>
</svg>
```

SVG использует ВНЕШНЕЕ изображение через pattern.
Если изображение не загрузилось → SVG невидим

**Проверка загрузки:**
```
F12 → Network → найти:
Group%208.png?raw=true
Status должен быть: 200 OK
```

---

#### **3. CSS переопределяется другими стилями**
**Симптом:** Элемент есть в DOM, computed styles неправильные

**Проверка:**
```
F12 → Elements → #page-preloader → Styles

Если display НЕ flex, проверить:
- Какой CSS файл переопределяет
- Есть ли !important
- Порядок загрузки CSS
```

**Critical CSS использует `!important`:**
```css
#page-preloader {
  display: flex !important;
  opacity: 1 !important;
}
```

---

#### **4. JavaScript прячет loader ДО показа**
**Симптом:** Loader создается но сразу прячется

**Проверка:**
```
F12 → Console → логи

НЕ должно быть:
❌ "Флаг TRUE, прячем loader"
❌ body.loader-complete добавлен сразу
```

**Inline script ДОЛЖЕН:**
```javascript
if (sessionStorage.getItem('initialLoadComplete') === 'true') {
  // Прячем loader ТОЛЬКО если флаг === 'true'
  document.body.classList.add('loader-complete');
}
```

---

#### **5. Telegram WebView блокирует стили**
**Симптом:** В обычном браузере работает, в Telegram нет

**Проверка:**
```
Открыть в обычном браузере:
https://twincasino-official.ru/bot/

Если там работает → проблема в Telegram WebView
```

**Решение:**
- Добавить inline стили ПРЯМО на элементе:
```html
<div id="page-preloader" style="display:flex; position:fixed; ...">
```

---

## 📊 ТЕКУЩАЯ АРХИТЕКТУРА

### **HTML структура (ПРАВИЛЬНАЯ):**
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Critical CSS для loader -->
  <style>
    #page-preloader { display: flex !important; ... }
    .loading { ... }
    .token { ... }
    /* и т.д. */
  </style>
  
  <!-- Внешние CSS -->
  <link rel="stylesheet" href="main/globals.css" />
  <link rel="stylesheet" href="preloader.css" />
  
  <!-- Preload изображений -->
  <link rel="preload" as="image" href="Group%208.png" />
  
  <!-- CLS оптимизация -->
  <style>
    /* Shimmer, animations, etc */
  </style>
</head>
<body>
  <!-- Inline script проверяет флаг -->
  <script>
    if (sessionStorage.getItem('initialLoadComplete') === 'true') {
      document.body.classList.add('loader-complete');
    }
  </script>
  
  <!-- Loader элемент -->
  <div id="page-preloader">
    <main class="loading">
      <svg class="token">...</svg>
      <h1 class="text-wrapper">Best Money Cases</h1>
      <p class="div">Developed in 2025</p>
      <div class="load-icon">
        <div class="icon">
          <svg><!-- Spinning icon --></svg>
        </div>
      </div>
      <p class="authentication">Authentication successful</p>
      <div class="bot">
        <p class="text-wrapper-3">@TwinUpBot</p>
      </div>
    </main>
  </div>
  
  <!-- Контент приложения -->
  <div id="app">...</div>
</body>
</html>
```

### **CSS Cascade:**
```
1. Critical CSS (inline в <head>) → применяется СРАЗУ
   └─ #page-preloader { display: flex !important; }
   
2. CLS CSS (inline в <head>) → применяется СРАЗУ
   └─ Shimmer, animations, reservations
   
3. Внешние CSS (async загрузка) → применяются ПОСЛЕ
   └─ preloader.css, globals.css, style.css, etc
```

### **JavaScript выполнение:**
```
1. Inline script (в <body>) → выполняется СРАЗУ
   └─ Проверяет sessionStorage флаг
   └─ Если 'true' → добавляет .loader-complete (прячет loader)
   
2. preloader.js загружается ПОСЛЕ
   └─ Проверяет флаг СНОВА
   └─ Если нет флага → показывает loader 10s, загружает изображения
   └─ Устанавливает флаг 'initialLoadComplete' = 'true'
```

---

## 🎯 ОЖИДАЕМОЕ ПОВЕДЕНИЕ

### **Первое открытие (флага нет):**
```
0ms:    HTML парсится
        └─ <style> в <head> применяется
        └─ #page-preloader { display: flex } ✅

10ms:   <body> создается
        └─ Inline script: флаг = null
        └─ Loader ВИДЕН (из CSS) ✅

50ms:   #page-preloader создан в DOM
        └─ ВСЕ элементы ВИДИМЫ ✅
        └─ SVG, текст, спиннер ✅

100ms:  preloader.js загружен
        └─ Начинает загружать изображения
        
10100ms: preloader.js завершает
        └─ Устанавливает флаг 'true'
        └─ Прячет loader
        └─ Показывает #app
```

### **Повторное открытие (флаг есть):**
```
0ms:    HTML парсится
        └─ <style> в <head> применяется

10ms:   <body> создается
        └─ Inline script: флаг = 'true'
        └─ Добавляет .loader-complete ✅
        └─ Loader СКРЫТ сразу ✅
        └─ #app ВИДЕН ✅

50ms:   preloader.js загружен
        └─ Проверяет флаг: 'true'
        └─ Выходит сразу (не показывает loader)
```

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [x] Добавлен `</head>` тег (commit 9dfad16)
- [x] Critical CSS в `<head>` для #page-preloader
- [x] Critical CSS в `<head>` для ВСЕХ внутренних элементов
- [x] Inline script проверяет флаг правильно
- [x] `!important` для критичных стилей
- [x] Fallback шрифты (Helvetica, Arial)

---

## 🚀 ДЕПЛОЙ

```bash
cd /var/www/duo
git pull origin main
```

**Проверить коммит:**
```bash
git log --oneline -1
# 9dfad16 CRITICAL FIX: Add missing </head> tag
```

---

## 📞 ЕСЛИ ПРОБЛЕМА ОСТАЕТСЯ

**Создать простой тест БЕЗ зависимостей:**

```html
<div id="page-preloader" style="
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: red;
  z-index: 999999;
  align-items: center;
  justify-content: center;
  font-family: Arial;
  color: white;
  font-size: 50px;
">
  TEST LOADER
</div>
```

Если ЭТОТ loader виден → проблема в шрифтах/изображениях
Если НЕ виден → проблема в Telegram WebView или другом месте

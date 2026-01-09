# 🔄 LOADER - ОДНА ЗАГРУЗКА ЗА СЕССИЮ MINI APP

## ✅ РЕАЛИЗОВАННОЕ ПОВЕДЕНИЕ

### **Правило:** Loader показывается **ОДИН РАЗ** при первом открытии мини-аппа в Telegram

```
┌─────────────────────────────────────────┐
│ 1. Пользователь открывает @TwinUpBot   │
│    → Loader показывается (0.5s)         │
│    → Загружаются критичные изображения  │
│    → sessionStorage['initialLoadComplete'] = 'true'
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. Навигация: main → upgrade → games    │
│    → Loader НЕ показывается             │
│    → sessionStorage сохранён            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Пользователь закрывает мини-апп      │
│    → sessionStorage очищается браузером │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. Открывает @TwinUpBot снова           │
│    → Loader показывается опять          │
│    → Цикл повторяется                   │
└─────────────────────────────────────────┘
```

---

## 🔑 КЛЮЧ sessionStorage

### **ДО (неправильно):**
```javascript
const STORAGE_KEY = 'pageLoaded_' + window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_');

// Примеры:
// /bot/index.html       → 'pageLoaded__bot_index_html'
// /bot/upgrade/index.html → 'pageLoaded__bot_upgrade_index_html'
// /bot/gamee/index.html → 'pageLoaded__bot_gamee_index_html'
```

**Проблема:**
- Каждая страница имела СВОЙ ключ
- Loader показывался на каждой странице отдельно

### **ПОСЛЕ (правильно):**
```javascript
const STORAGE_KEY = 'initialLoadComplete';

// ОДИН ключ для ВСЕГО мини-аппа
// Не зависит от страницы
```

**Результат:**
- ОДИН ключ на весь мини-апп
- Loader показывается только при первом открытии

---

## 📝 КОД РЕАЛИЗАЦИИ

### **Проверка флага:**
```javascript
function wasInitialLoadComplete() {
  try {
    return sessionStorage.getItem('initialLoadComplete') === 'true';
  } catch (e) {
    return false;
  }
}
```

### **Сохранение флага:**
```javascript
function markInitialLoadComplete() {
  try {
    sessionStorage.setItem('initialLoadComplete', 'true');
    console.log('📝 Первая загрузка завершена, loader не будет показываться в этой сессии');
  } catch (e) {
    console.warn('SessionStorage недоступен');
  }
}
```

### **Логика показа:**
```javascript
async function initPreloader() {
  // Если первая загрузка уже была - скрываем loader
  if (wasInitialLoadComplete()) {
    console.log('✅ Первая загрузка уже выполнена в этой сессии, loader не показываем');
    hideSpinner();
    return;
  }

  console.log('🎬 Первая загрузка мини-аппа, показываем loader...');

  // ...загрузка изображений...

  // Скрываем loader и сохраняем флаг
  hideSpinner();
  markInitialLoadComplete();
  console.log('🎉 Первая загрузка завершена! При навигации loader не будет показываться.');
}
```

---

## 🧪 ТЕСТИРОВАНИЕ

### **Тест 1: Первое открытие**
```
1. Открой Telegram
2. Открой @TwinUpBot
3. Ожидаемый результат:
   ✅ Loader показывается
   ✅ Через ~0.5s скрывается
   ✅ В консоли: "🎬 Первая загрузка мини-аппа, показываем loader..."
```

### **Тест 2: Навигация**
```
1. Открой upgrade
2. Вернись на main
3. Открой games
4. Ожидаемый результат:
   ✅ Loader НЕ показывается ни разу
   ✅ В консоли: "✅ Первая загрузка уже выполнена в этой сессии, loader не показываем"
```

### **Тест 3: Повторное открытие**
```
1. Закрой мини-апп (свайп вниз или кнопка назад)
2. Открой @TwinUpBot снова
3. Ожидаемый результат:
   ✅ Loader показывается опять
   ✅ sessionStorage был очищен при закрытии
```

### **Тест 4: sessionStorage проверка**
```javascript
// В DevTools Console:

// После первой загрузки:
sessionStorage.getItem('initialLoadComplete')
// Ожидаемый результат: "true"

// Очистить флаг (для теста):
sessionStorage.removeItem('initialLoadComplete')
location.reload()
// Ожидаемый результат: loader показывается снова
```

---

## 🔍 ОТЛАДКА

### **Console логи:**

**Первая загрузка:**
```
🎬 Первая загрузка мини-аппа, показываем loader...
🖼️ Загружаю 2 изображений...
✅ Загружено: 2/2
🎉 Первая загрузка завершена! При навигации loader не будет показываться.
📝 Первая загрузка завершена, loader не будет показываться в этой сессии
```

**Повторные визиты:**
```
✅ Первая загрузка уже выполнена в этой сессии, loader не показываем
```

**Ошибка загрузки:**
```
❌ Ошибка при предзагрузке: [error details]
🎉 Первая загрузка завершена! При навигации loader не будет показываться.
```

### **DevTools проверка:**

**Application → Storage → Session Storage:**
```
Key: initialLoadComplete
Value: true
```

---

## 📊 СРАВНЕНИЕ ДО/ПОСЛЕ

### **ДО (неправильно):**
```
main (1-й визит)    → Loader ✅
upgrade (1-й визит) → Loader ✅ ❌ (не должен!)
main (2-й визит)    → Loader НЕТ ✅
upgrade (2-й визит) → Loader НЕТ ✅
games (1-й визит)   → Loader ✅ ❌ (не должен!)
```

### **ПОСЛЕ (правильно):**
```
main (1-й визит)    → Loader ✅
upgrade (1-й визит) → Loader НЕТ ✅
main (2-й визит)    → Loader НЕТ ✅
upgrade (2-й визит) → Loader НЕТ ✅
games (1-й визит)   → Loader НЕТ ✅

(закрыл и открыл мини-апп)

main (1-й визит)    → Loader ✅
```

---

## 💡 ВАЖНЫЕ ДЕТАЛИ

### **sessionStorage vs localStorage:**

**Используем sessionStorage:**
- ✅ Очищается при закрытии Telegram WebView
- ✅ При повторном открытии мини-аппа - loader показывается
- ✅ Правильное поведение для мини-аппа

**НЕ используем localStorage:**
- ❌ Сохраняется между сессиями
- ❌ При повторном открытии мини-аппа - loader НЕ показывается
- ❌ Неправильное поведение

### **Критичные изображения:**

Загружаются ТОЛЬКО из `<link rel="preload">`:
```html
<link rel="preload" as="image" href="Group%208.png" />
<link rel="preload" as="image" href="Group%209.png" />
```

**Не загружаются:**
- Все `<img>` на странице (используют lazy loading)
- CSS background-image
- Изображения ниже fold

---

## 🚀 ДЕПЛОЙ

```bash
cd /var/www/duo
git pull origin main
```

**Проверить:**
```bash
git log --oneline -3
# 8ac7340 feat: Loader shows once per Telegram Mini App session
# 396d5fa fix: Fix loader stuck on screen when session cached
# 1363bab asd
```

---

## ✅ ИТОГ

**Что реализовано:**
1. ✅ Loader показывается **ОДИН РАЗ** при первом открытии мини-аппа
2. ✅ При навигации между страницами - **НЕ показывается**
3. ✅ После закрытия и открытия мини-аппа - **показывается снова**
4. ✅ Использует **sessionStorage** (очищается при закрытии)
5. ✅ Загружает **ТОЛЬКО 2 критичных** изображения
6. ✅ Не блокирует навигацию

**Ключевые изменения:**
- Ключ: `'pageLoaded_' + pathname` → `'initialLoadComplete'`
- Функции: `wasLoadedInSession()` → `wasInitialLoadComplete()`
- Функции: `markAsLoaded()` → `markInitialLoadComplete()`

**Результат:** Loader работает как задумано для Telegram Mini App! 🎉

# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ - ПРИЗ НЕ ПОКАЗЫВАЕТСЯ

## 🐛 ПРОБЛЕМА:
```
❌ .win-window-item not found!
winWindowItem: false
```

**Элемент `.win-window-item` отсутствует в HTML на сервере!**

---

## ✅ РЕШЕНИЕ (ВЫПОЛНИ ПО ПОРЯДКУ):

### **1. SSH В СЕРВЕР:**
```bash
ssh root@77.239.125.70
```

### **2. ПУЛЛ ПОСЛЕДНИХ ИЗМЕНЕНИЙ:**
```bash
cd /var/www/duo
git pull origin main
```

**Должно скачать:**
```
From https://github.com/Pacific1a/repomain
   f6b5425..3d10383  main -> main
Updating f6b5425..3d10383
Fast-forward
 bot/index.html                     | 4 +---
 bot/main/content-case/529/1.png    | Bin 0 -> 23665 bytes
 bot/main/content-case/529/2.png    | Bin 0 -> 28637 bytes
 ... (11 files)
```

### **3. ПРОВЕРЬ ЧТО ФАЙЛ ОБНОВИЛСЯ:**
```bash
grep -A2 'class="win-window"' bot/index.html
```

**Должно быть:**
```html
<div class="win-window">
  <div class="win-window-item"></div>
</div>
```

**НЕ ДОЛЖНО БЫТЬ:**
```html
<div class="win-window">
  <div class="win-window-item">
    <!-- пустые строки -->
  </div>
</div>
```

### **4. РЕСТАРТ СЕРВЕРА:**
```bash
pm2 restart duo-server
pm2 logs duo-server --lines 20
```

---

## 🔄 ОЧИСТКА КЭША БРАУЗЕРА:

### **Chrome Desktop:**
1. Открой DevTools (F12)
2. Правый клик на кнопке обновления
3. Выбери "Empty Cache and Hard Reload"

### **Telegram Desktop:**
1. Закрой бот
2. Ctrl+Shift+Delete
3. Очисти кэш
4. Перезапусти Telegram

### **Мобильный Telegram:**
1. Settings → Apps → Telegram
2. Storage → Clear Cache
3. ИЛИ просто переустанови Telegram

---

## 🧪 ПРОВЕРКА:

### **Открой консоль (F12) и смотри логи:**

**ДОЛЖНО БЫТЬ:**
```javascript
🎁 Creating prize display: {
  winWindow: true,
  winWindowItem: true,     ← ТЕПЕРЬ TRUE!!!
  prizeSrc: "...",
  prizePrice: 300
}

📸 Prize image added to DOM

✅ Prize image loaded: ...

🖼️ Image element: {
  naturalWidth: 512,
  naturalHeight: 512,
  width: 400,
  height: 400
}

📦 Parent element: {
  display: "flex",
  width: 600,
  height: 300,
  children: 1
}
```

**НЕ ДОЛЖНО БЫТЬ:**
```javascript
❌ .win-window-item not found!
```

---

## 🎯 ЕСЛИ ВСЁ РАВНО НЕ РАБОТАЕТ:

### **Проверь версию файла на сервере:**
```bash
cd /var/www/duo
git log --oneline -1 bot/index.html
```

**Должно быть:**
```
3d10383 fix: Add missing win-window-item element and case 529 images
```

### **Если НЕТ - принудительный сброс:**
```bash
git fetch origin
git reset --hard origin/main
pm2 restart duo-server
```

---

## 📞 СКИНЬ МНЕ:

1. **Вывод команды:** `git log --oneline -3`
2. **Вывод команды:** `grep -A2 'win-window' bot/index.html`
3. **Логи из консоли** после открытия кейса (особенно строку с `Creating prize display`)
4. **Скриншот** DevTools Elements с `.win-window` элементом

---

**ВЫПОЛНИ ВСЁ ПО ПОРЯДКУ И СКИНЬ РЕЗУЛЬТАТЫ!** 🔥

# 🔥 КРИТИЧЕСКАЯ ПРОБЛЕМА: БАЗА ДАННЫХ НЕ СОХРАНЯЕТСЯ

## 🎯 ROOT CAUSE - НАЙДЕНА ОСНОВНАЯ ПРИЧИНА

### Строка 85 в `site/server/server.js`:

```javascript
const db = new sqlite3.Database('./database.db', (err) => {
```

**ЭТО ГЛАВНАЯ ПРОБЛЕМА!**

### ⚠️ ЧТО НЕ ТАК:

`./database.db` создает файл базы данных в **текущей директории**, которая на Render является **EPHEMERAL** (временной).

### 📊 ЧТО ПРОИСХОДИТ:

```
1. Deploy → Создается ./database.db в /opt/render/project/src/site/server/
2. Пользователь регистрируется → Данные записаны в ./database.db ✅
3. Пользователь логинится → JWT токен создан с userId=1 ✅
4. REDEPLOY → Файловая система УДАЛЯЕТСЯ ❌
5. Новый ./database.db создается ПУСТОЙ ❌
6. JWT токен содержит userId=1, но пользователя НЕТ в БД! ❌
7. GET /api/user → 404 "Пользователь не найден" ❌
8. GET /api/2fa/status → 404 "Пользователь не найден" ❌
```

### 🔍 ПОЧЕМУ СТАТИСТИКА НЕ ОБНОВЛЯЕТСЯ:

```
1. Python бот: POST /api/referral/register
2. Header: X-API-Secret ✅
3. Body: {userId: 1889923046, referrerId: "1"} ✅
4. Сервер: Ищет partner с id=1 или telegram=1
5. НО! База пустая после редеплоя!
6. Partner не найден → возврат ошибки или clicks не обновляется
7. clicks = 0 ❌
```

---

## 🔧 РЕШЕНИЕ

### 1. Изменить путь к БД на PERSISTENT STORAGE

**В `site/server/server.js` строка 85:**

```javascript
// БЫЛО (НЕПРАВИЛЬНО):
const db = new sqlite3.Database('./database.db', (err) => {

// ДОЛЖНО БЫТЬ (ПРАВИЛЬНО):
const path = require('path');
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'database.db');

// Создаем папку data если её нет
const dataDir = path.join(__dirname, 'data');
if (!require('fs').existsSync(dataDir)) {
    require('fs').mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err);
    } else {
        console.log('✅ Connected to SQLite database at:', dbPath);
        initDatabase();
    }
});
```

### 2. Настроить Persistent Disk на Render

**Dashboard → duo-partner → Settings → Disks:**

1. **Add Disk**
2. **Name:** database
3. **Mount Path:** `/opt/render/project/src/site/server/data`
4. **Size:** 1 GB (бесплатно на Free tier)
5. **Save**

### 3. Установить переменную окружения

**Dashboard → duo-partner → Environment:**

```
DATABASE_PATH=/opt/render/project/src/site/server/data/database.db
```

### 4. Обновить все helper скрипты

**Файлы для обновления:**
- `site/server/create-admin.js`
- `site/server/reset-2fa.js`
- `site/server/init-materials.js`
- `site/server/add-role-column.js`

**Изменить в каждом:**

```javascript
// БЫЛО:
const db = new sqlite3.Database('./database.db', (err) => {

// ДОЛЖНО БЫТЬ:
const path = require('path');
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to database at:', dbPath);
    }
});
```

---

## 🧪 ПРОВЕРКА ПРОБЛЕМЫ

### Проверь логи сервера на Render:

1. Dashboard → duo-partner → Logs
2. Найди:

```
✅ Connected to SQLite database
📥 Referral registration request: userId=1889923046, referrerId=1
❌ Partner not found OR
❌ Пользователь не найден
```

### Проверь что база НЕ persistent:

```bash
# На Render
ls -la /opt/render/project/src/site/server/
# Должно быть:
database.db (создается каждый раз при старте)

# После редеплоя:
database.db (новый файл, старые данные ПОТЕРЯНЫ)
```

---

## 📝 АНАЛИЗ ЦЕПОЧКИ ОШИБОК

### Проблема 1: 404 для /api/user

```
GET /api/user
Headers: Authorization: Bearer <JWT_TOKEN>
↓
authMiddleware декодирует токен → userId = 1
↓
db.get('SELECT ... FROM users WHERE id = 1')
↓
База пустая (редеплой) → user = undefined
↓
if (!user) return 404 ❌
```

**Причина:** База данных сбрасывается после редеплоя

### Проблема 2: 404 для /api/2fa/status

```
GET /api/2fa/status
Headers: Authorization: Bearer <JWT_TOKEN>
↓
authMiddleware → userId = 1
↓
db.get('SELECT twofa_enabled FROM users WHERE id = 1')
↓
База пустая → user = undefined
↓
if (!user) return 404 ❌
```

**Причина:** База данных сбрасывается после редеплоя

### Проблема 3: clicks не обновляется

```
POST /api/referral/register
Body: {userId: "1889923046", referrerId: "1"}
↓
db.prepare('SELECT * FROM users WHERE id = ? OR telegram = ?')
  .get(referrerId, referrerId)  // ищем id=1 OR telegram=1
↓
База пустая → partner = undefined
↓
if (!partner) {
    console.log('❌ Partner not found');
    return res.status(404).json({...});
}
↓
Код обновления clicks НЕ ВЫПОЛНЯЕТСЯ ❌
```

**Причина:** База данных пустая, партнёр не найден

---

## ✅ ПОСЛЕ ИСПРАВЛЕНИЯ

### 1. База данных в persistent storage

```
/opt/render/project/src/site/server/data/database.db
← Этот путь монтирован на Persistent Disk
← Данные НЕ ТЕРЯЮТСЯ после редеплоя ✅
```

### 2. Пользователи сохраняются

```
Регистрация → INSERT INTO users → Persistent DB ✅
Редеплой → База НЕ СБРАСЫВАЕТСЯ ✅
Логин → JWT токен с userId=1 ✅
GET /api/user → Пользователь НАЙДЕН ✅
```

### 3. Статистика работает

```
POST /api/referral/register
↓
db.get('SELECT * FROM users WHERE id = 1')
↓
partner = {id: 1, telegram: 1, ...} ✅
↓
UPDATE referral_stats SET clicks = clicks + 1
↓
clicks увеличивается! ✅
```

---

## 🚀 ШАГИ ДЛЯ ИСПРАВЛЕНИЯ

### Шаг 1: Обновить код

1. Изменить `server.js` строка 85
2. Изменить все helper скрипты
3. Закоммитить и запушить

### Шаг 2: Настроить Render

1. Добавить Persistent Disk
2. Добавить DATABASE_PATH в Environment
3. Редеплой

### Шаг 3: Создать админа

```bash
# После редеплоя
cd /opt/render/project/src/site/server
node create-admin.js
```

### Шаг 4: Тест

1. Логин в панель
2. /start ref_CODE в боте
3. Проверить clicks обновился
4. Редеплой
5. Логин снова работает!

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

✅ **База данных НЕ СБРАСЫВАЕТСЯ** после редеплоя  
✅ **Пользователи сохраняются** навсегда  
✅ **JWT токены валидны** после редеплоя  
✅ **GET /api/user** → 200 OK  
✅ **GET /api/2fa/status** → 200 OK  
✅ **clicks обновляется** при каждом переходе  
✅ **Статистика работает** корректно  

**ВСЁ БУДЕТ РАБОТАТЬ!** 🚀

# ⚠️ ПРОБЛЕМА: Render не сохраняет файлы

## 🔴 Обнаружена критическая проблема:

### Файловая система Render - **EPHEMERAL** (временная)

При каждом деплое **ВСЕ файлы сбрасываются**!

```
Deploy → referrals.json создается пустым
Регистрация → данные пишутся
Новый Deploy → referrals.json снова пустой! ❌
```

## 📊 Что происходит:

1. **Локально:** Файлы сохраняются ✅
2. **На Render:** Файлы теряются при каждом деплое ❌

## 🔧 РЕШЕНИЯ:

### Вариант 1: MongoDB (РЕКОМЕНДУЕТСЯ)

У вас уже есть поддержка MongoDB в коде:

```javascript
const MONGODB_URI = process.env.MONGODB_URI || '';
```

**Шаги:**

1. **Создайте MongoDB Atlas аккаунт:**
   - https://www.mongodb.com/cloud/atlas/register
   - Бесплатный tier: 512 MB

2. **Создайте кластер:**
   - Выберите FREE tier
   - Region: ближайший к вам
   - Создайте пользователя БД

3. **Получите connection string:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/dbname
   ```

4. **Добавьте в Render:**
   - Dashboard → Your Service → Environment
   - Добавьте переменную:
     ```
     MONGODB_URI=mongodb+srv://...
     ```

5. **Редеплой:**
   - Manual Deploy
   - Данные будут сохраняться в MongoDB

### Вариант 2: PostgreSQL (встроенная БД Render)

1. **Создайте PostgreSQL БД:**
   - Render Dashboard → New → PostgreSQL
   - Бесплатно: 1 GB

2. **Подключите к сервису:**
   - Получите Internal Connection String
   - Добавьте в Environment Variables

3. **Используйте ORM:**
   - Установите: `npm install pg`
   - Измените код для работы с PostgreSQL

### Вариант 3: Redis (быстрое решение)

1. **Бесплатный Redis:**
   - https://redis.com/try-free/
   - Или используйте Render Redis

2. **Добавьте в код:**
   ```javascript
   const redis = require('redis');
   const client = redis.createClient(process.env.REDIS_URL);
   ```

### Вариант 4: Render Disk (ПЛАТНО $0.25/GB/месяц)

1. **Добавьте Persistent Disk:**
   - Dashboard → Service → Disks → Add Disk
   - Mount path: `/data`
   - Size: 1 GB

2. **Измените пути в коде:**
   ```javascript
   const DATA_DIR = '/data';
   ```

## 🎯 ВРЕМЕННОЕ РЕШЕНИЕ:

### Используем MongoDB которая уже в коде:

Код уже готов к работе с MongoDB:

```javascript
// В server.js уже есть:
if (MONGODB_URI && MONGODB_URI.trim() !== '') {
  // Использует MongoDB
} else {
  // Использует JSON (проблема!)
}
```

**Просто добавьте MONGODB_URI в Environment!**

## 📝 Пошаговая инструкция для MongoDB:

### 1. Регистрация:
- https://www.mongodb.com/cloud/atlas/register
- Войдите через Google/GitHub

### 2. Создание кластера:
- Create → M0 (Free)
- Provider: AWS
- Region: eu-central-1 (Frankfurt) или us-east-1
- Cluster Name: любое имя
- Create Cluster

### 3. Database Access:
- Database Access → Add New Database User
- Username: `botuser`
- Password: сгенерировать сложный
- Database User Privileges: Read and write to any database
- Add User

### 4. Network Access:
- Network Access → Add IP Address
- **0.0.0.0/0** (Allow access from anywhere)
- Confirm

### 5. Получить Connection String:
- Clusters → Connect → Connect your application
- Driver: Node.js
- Version: 4.1 or later
- Copy connection string:
  ```
  mongodb+srv://botuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Замените `<password>` на ваш пароль

### 6. Добавить в Render:
- Dashboard → bot-websocket-server → Environment
- Add Environment Variable:
  - Key: `MONGODB_URI`
  - Value: ваша connection string
- Save Changes

### 7. Manual Deploy:
- Manual Deploy → Deploy latest commit
- Подождите 5 минут

### 8. Проверка:
В логах должно быть:
```
🗄️ MongoDB: Настроена
✅ Подключение к MongoDB установлено
```

## ✅ После настройки MongoDB:

Все данные будут сохраняться **навсегда**:
- Рефералы
- Балансы  
- Транзакции
- Комнаты игр

И не будут теряться при деплое!

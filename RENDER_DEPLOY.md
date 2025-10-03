# 🚀 Деплой на Render

## Проблема с MongoDB

Если вы видите ошибку:
```
❌ MongoDB ошибка: MongooseServerSelectionError: connect ECONNREFUSED
```

Это означает, что сервер пытается подключиться к локальному MongoDB, которого нет на Render.

## Решение

### Вариант 1: Работа без MongoDB (рекомендуется для начала)

1. **В Render Dashboard** → Environment Variables:
   - Удалите переменную `MONGODB_URI` или оставьте её пустой
   - Или установите: `MONGODB_URI=` (пустое значение)

2. Сервер автоматически переключится на JSON хранилище в папке `server/data/`

3. Перезапустите деплой

### Вариант 2: Подключение MongoDB Atlas (для продакшена)

1. **Создайте бесплатный кластер на MongoDB Atlas:**
   - Перейдите на https://www.mongodb.com/cloud/atlas
   - Зарегистрируйтесь и создайте бесплатный кластер (M0)
   - Создайте пользователя БД
   - Добавьте IP адрес `0.0.0.0/0` в Network Access (для доступа из любого места)

2. **Получите Connection String:**
   - В Atlas нажмите "Connect" → "Connect your application"
   - Скопируйте строку подключения (примерно так):
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/telegram_games
     ```

3. **В Render Dashboard** → Environment Variables:
   - Добавьте переменную `MONGODB_URI` со значением вашей строки подключения
   - Замените `<password>` на реальный пароль
   - Замените `telegram_games` на имя вашей БД

4. Перезапустите деплой

## Текущая конфигурация

Сервер поддерживает работу **БЕЗ MongoDB**:
- ✅ Все данные сохраняются в JSON файлы (`server/data/`)
- ✅ Комнаты, игроки, история - всё работает
- ✅ Автосохранение каждые 30 секунд
- ✅ Восстановление данных при перезапуске

## Проверка

После исправления вы должны увидеть:
```
✅ MongoDB подключена
```
или
```
⚠️ MongoDB не настроена (работает без БД - используется JSON хранилище)
```

**Без ошибок!** ✨

## Переменные окружения для Render

Минимальные настройки:
```
PORT=10000
NODE_ENV=production
MONGODB_URI=
ALLOWED_ORIGINS=*
```

С MongoDB Atlas:
```
PORT=10000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telegram_games
ALLOWED_ORIGINS=*
```

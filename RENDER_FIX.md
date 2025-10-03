# ⚡ Быстрое исправление ошибки MongoDB на Render

## Проблема
```
❌ MongoDB ошибка: MongooseServerSelectionError: connect ECONNREFUSED
```

## Решение за 2 минуты

### Шаг 1: Откройте Render Dashboard
1. Перейдите на https://dashboard.render.com
2. Выберите ваш сервис (Web Service)

### Шаг 2: Измените переменную окружения
1. Нажмите **Environment** в левом меню
2. Найдите переменную `MONGODB_URI`
3. **Удалите её** или измените значение на пустую строку: `MONGODB_URI=`
4. Нажмите **Save Changes**

### Шаг 3: Перезапустите сервис
1. Нажмите **Manual Deploy** → **Deploy latest commit**
2. Или просто подождите автоматического деплоя

## Результат

Вы должны увидеть в логах:
```
✅ Сервер запущен на порту 10000
📡 WebSocket готов к подключениям
💾 Персистентное хранилище: /opt/render/project/src/server/data
🗄️ MongoDB: Отключена (используется JSON)
```

**БЕЗ ОШИБОК!** ✨

## Что происходит?

- ✅ Сервер работает **без MongoDB**
- ✅ Все данные сохраняются в **JSON файлы**
- ✅ Игры, комнаты, пользователи - всё работает
- ✅ Автосохранение каждые 30 секунд

## Если нужна MongoDB в будущем

Используйте **MongoDB Atlas** (бесплатный план):
1. Создайте кластер на https://www.mongodb.com/cloud/atlas
2. Получите connection string
3. Добавьте в Render: `MONGODB_URI=mongodb+srv://...`

Подробнее в файле `RENDER_DEPLOY.md`

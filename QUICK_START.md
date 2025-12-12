# ⚡ Быстрый старт - Деплой на Render

## 🎯 Что нужно сделать

Ваш проект **УЖЕ НАСТРОЕН** для деплоя! Просто следуйте этим шагам:

## 1️⃣ Подготовка (локально)

```bash
# Убедитесь что все изменения закоммичены
cd C:\Users\dev_fenomen\Desktop\bot
git add .
git commit -m "Configure Render deployment with static files and API"
git push origin main
```

## 2️⃣ Создание сервиса на Render

### Через веб-интерфейс:

1. Зайдите на https://render.com
2. Нажмите **"New"** → **"Web Service"**
3. Подключите ваш GitHub репозиторий
4. Заполните настройки:
   ```
   Name: telegram-games
   Environment: Node
   Build Command: cd server && npm install
   Start Command: node server/server.js
   ```
5. Нажмите **"Create Web Service"**

### Через Blueprint (автоматически):

1. В Render нажмите **"New"** → **"Blueprint"**
2. Подключите репозиторий
3. Render найдет `render.yaml` и создаст всё автоматически!

## 3️⃣ Получите ваш URL

После деплоя Render даст вам URL типа:
```
https://telegram-games-xxxx.onrender.com
```

## 4️⃣ Обновите бота

Измените в `autoshop/tgbot/data/config.py`:

```python
SERVER_API_URL = os.getenv('SERVER_URL', 'https://telegram-games-xxxx.onrender.com')
```

Или запускайте с переменной окружения:
```powershell
$env:SERVER_URL="https://telegram-games-xxxx.onrender.com"
python autoshop/main.py
```

## 5️⃣ Проверьте работу

Откройте в браузере:
- `https://telegram-games-xxxx.onrender.com` → должен открыться сайт
- `https://telegram-games-xxxx.onrender.com/api/balance/123` → должен вернуть JSON

## ✅ Готово!

Теперь:
- ✅ Сайт (index.html) работает на Render
- ✅ API сервер работает на том же домене
- ✅ WebSocket подключения работают
- ✅ Бот может подключаться к серверу

## 🐛 Если что-то не работает

**Проблема:** 404 на главной странице
```bash
# Проверьте логи Render - должно быть:
✅ Found index.html at: /opt/render/project/src/index.html
```

**Проблема:** API не работает
```bash
# Проверьте что URL правильный:
curl https://telegram-games-xxxx.onrender.com/api/balance/123
```

**Проблема:** Сервер не отвечает
- Render Free tier "засыпает" - первый запрос займет 30-60 секунд

## 📖 Полная документация

Смотрите `DEPLOY_RENDER.md` для детальных инструкций и решения проблем.

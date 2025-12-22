# 🔍 АНАЛИЗ ПРОБЛЕМ

## 1️⃣ Авторизация (Frontend → Backend)

### Проблема:
```
POST http://localhost:10000/api/login
net::ERR_CONNECTION_REFUSED
```

### Причина:
- ✅ **ИСПРАВЛЕНО** в `site/js/api.js`
- Изменен порт: `3000` → `10000`
- Добавлен автоопределение протокола (HTTPS на Render)

### Решение:
✅ Коммит сделан, нужен передеплой на Render

---

## 2️⃣ Реферальная система (Python Bot → Backend)

### Проблема:
```python
# Бот отправляет:
POST {SERVER_API_URL}/api/referral/register
{
    "userId": "1889923046",
    "referrerId": "1"
}

# Результат:
❌ Timeout - server did not respond in 10 seconds
```

### Причина:
**ENDPOINT НЕ СУЩЕСТВУЕТ!**

На сервере есть:
```javascript
// site/server/server.js:874
POST /api/referral/register-referral  ← ДРУГОЕ НАЗВАНИЕ!
{
    "referralCode": "...",
    "referralUserId": "...",
    "depositAmount": ...
}
```

### Конфигурация бота:
```python
# bot/autoshop/tgbot/data/config.py:22
SERVER_API_URL = 'https://telegram-games-plkj.onrender.com'  ← НЕПРАВИЛЬНЫЙ URL!
```

**Бот обращается к игровому серверу, а не к серверу партнёров!**

Должно быть:
```python
SERVER_API_URL = 'https://duo-partner.onrender.com'  ← СЕРВЕР ПАРТНЁРОВ
```

### Решение:
1. ✅ Создать endpoint `/api/referral/register` на сервере партнёров
2. ✅ Изменить `SERVER_API_URL` в боте на правильный URL
3. ✅ Добавить логирование регистрации

---

## 3️⃣ Реферальная ссылка на сайте

### Текущее состояние:
```javascript
// site/js/referral.js:74
const botUsername = window.BOT_USERNAME || 'aasasdasdadsddasdbot';
this.referralLink = `https://t.me/${botUsername}?start=ref_${shortCode}`;
```

### Проблемы:
1. ❌ `window.BOT_USERNAME` не установлен
2. ❌ Используется дефолтный бот `aasasdasdadsddasdbot` (вероятно неправильный)

### Решение:
✅ Установить правильное имя бота в config

---

## 4️⃣ Копирование ссылки (множественные уведомления)

### Проблема:
```javascript
// site/js/referral.js:100
const copyButtons = document.querySelectorAll('.ref_program .btn_parnters button, .sub_partner .btn_parnters button');

copyButtons.forEach(button => {
    button.addEventListener('click', () => {
        this.copyReferralLink();  ← Вызывается много раз!
    });
});
```

### Причина:
- Обработчик навешивается КАЖДЫЙ РАЗ при вызове `setupUI()`
- Если вызвать `init()` несколько раз → множественные обработчики
- При клике на кнопку → все обработчики срабатывают → много Toast'ов

### Решение:
✅ Добавить проверку на повторное навешивание обработчиков
✅ Использовать `once: true` или флаг

---

## 5️⃣ Передача статистики в панель

### Текущие endpoint'ы на сервере:

```javascript
// site/server/server.js
POST /api/referral/click           ← Для кликов (нужен webhookAuth)
POST /api/referral/register-referral ← Для регистрации (нужен webhookAuth)
POST /api/referral/add-earnings     ← Для начисления % (нужен webhookAuth)
GET  /api/referral/partner/stats    ← Для загрузки статистики (JWT auth)
```

### Проблема:
Python бот пытается вызвать несуществующий `/api/referral/register`

### Решение:
✅ Создать endpoint `/api/referral/register` который:
1. Проверяет webhookAuth
2. Регистрирует реферала
3. Увеличивает счетчик кликов
4. Возвращает успех

---

## 6️⃣ Итоговая архитектура (КАК ДОЛЖНО БЫТЬ)

```
┌─────────────────────────────────────────────────────┐
│  САЙТ ПАРТНЁРОВ (duo-partner.onrender.com)         │
│  - Регистрация партнёров                            │
│  - Генерация реферальных ссылок                     │
│  - Панель со статистикой                            │
└─────────────────────────────────────────────────────┘
                    ↓ Партнёр копирует ссылку
          https://t.me/BOTNAME?start=ref_CODE
                    ↓
┌─────────────────────────────────────────────────────┐
│  TELEGRAM BOT (Python)                              │
│  - Принимает /start ref_CODE                        │
│  - Извлекает partner_id из кода                     │
│  - Отправляет POST /api/referral/register           │
│    {userId, referrerId}                             │
└─────────────────────────────────────────────────────┘
                    ↓ HTTP POST
┌─────────────────────────────────────────────────────┐
│  СЕРВЕР ПАРТНЁРОВ (duo-partner.onrender.com)       │
│  - Принимает /api/referral/register                 │
│  - Проверяет webhookAuth                            │
│  - Сохраняет связь user → partner                   │
│  - Увеличивает clicks++                             │
│  - Возвращает success: true                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  ИГРОВОЙ СЕРВЕР (telegram-games-plkj.onrender.com) │
│  - Игры (Roll, Crash, etc)                          │
│  - При проигрыше → webhook на duo-partner           │
│  - POST /api/referral/add-earnings                  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ ПЛАН ИСПРАВЛЕНИЙ

### Шаг 1: Сервер партнёров (site/server/server.js)
- [ ] Создать `/api/referral/register` endpoint
- [ ] Добавить логирование

### Шаг 2: Python бот (bot/autoshop)
- [ ] Изменить SERVER_API_URL на duo-partner.onrender.com
- [ ] Обновить .env файл

### Шаг 3: Сайт (site/js)
- [ ] Установить правильный BOT_USERNAME
- [ ] Исправить множественные обработчики копирования

### Шаг 4: Тестирование
- [ ] Передеплой всех сервисов
- [ ] Тест: регистрация партнёра
- [ ] Тест: генерация ссылки
- [ ] Тест: переход по ссылке
- [ ] Тест: статистика обновляется

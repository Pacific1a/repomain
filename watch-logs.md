# 🔍 Как смотреть логи в реальном времени

## 🚀 **ИНСТРУКЦИЯ:**

### **Шаг 1: Подключись к серверу**
```bash
ssh root@77.239.125.70
```

### **Шаг 2: Смотри логи в реальном времени**
```bash
pm2 logs duo-server --lines 100
```

**Это покажет:**
- ✅ Все запросы к API
- ✅ Telegram ID пользователей
- ✅ Баланс до и после операций
- ✅ Ошибки если есть

---

## 📋 **ЧТО ИСКАТЬ В ЛОГАХ:**

### **Когда открываешь бот:**
```
📥 GET /api/balance/1889923046
✅ Balance loaded: 50000₽
```

### **Когда открываешь кейс:**
```
🔍 Balance check (from server):
  telegramId: 1889923046
  balance: 50000
  casePrice: 777
  enough: true
  
📥 POST /api/balance/1889923046/subtract
  rubles: 777
  reason: case_opening
  
✅ Balance subtracted: 1889923046 -777₽
📡 WebSocket sent: balance_updated_1889923046
```

### **Когда нажимаешь Keep it:**
```
📥 POST /api/balance/1889923046/add
  rubles: 250
  source: case_win
  
✅ Balance added: 1889923046 +250₽
📡 WebSocket sent: balance_updated_1889923046
```

---

## ⚠️ **ЕСЛИ ВИДИШЬ ОШИБКИ:**

### **404 Not Found:**
```
GET /api/balance/1889923046 → 404
```
**Проблема:** Роут не найден - нужен git pull

### **Telegram ID не найден:**
```
⚠️ No real Telegram ID found, using default
Telegram ID: 1889923046
```
**Проблема:** Telegram WebApp не передал ID

### **Недостаточно средств:**
```
Balance: 0₽, Case price: 777₽
❌ Insufficient balance
```
**Проблема:** Баланс не загрузился или очищен

---

## 🛠️ **ПОЛЕЗНЫЕ КОМАНДЫ:**

### **Последние 50 строк логов:**
```bash
pm2 logs duo-server --lines 50 --nostream
```

### **Только ошибки:**
```bash
pm2 logs duo-server --err
```

### **Очистить логи:**
```bash
pm2 flush duo-server
```

### **Статус сервера:**
```bash
pm2 status
pm2 info duo-server
```

---

## 📱 **ТЕСТИРОВАНИЕ:**

1. **Открой SSH в одном окне** - смотри логи:
   ```bash
   ssh root@77.239.125.70
   pm2 logs duo-server
   ```

2. **В другом окне** - открывай бот с телефона/ПК

3. **Смотри что происходит** в логах в реальном времени

4. **Скопируй проблемные строки** если что-то не работает

---

## 🎯 **ЧТО ДОЛЖНО БЫТЬ:**

✅ `GET /api/balance/1889923046` → 200 OK  
✅ `Balance loaded: 50000₽`  
✅ `POST /api/balance/.../subtract` → 200 OK  
✅ `Balance subtracted: -777₽`  
✅ `WebSocket sent: balance_updated_...`  
✅ `POST /api/balance/.../add` → 200 OK  
✅ `Balance added: +250₽`  

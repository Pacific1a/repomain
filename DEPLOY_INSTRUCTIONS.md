# 🚀 ИНСТРУКЦИЯ ПО ДЕПЛОЮ

## ❗ ПРОБЛЕМА
Endpoints `/api/balance/admin/clear` и `/api/balance/admin/set` возвращают 404 Not Found.

Это значит что **код НЕ задеплоен** на сервер или **сервер НЕ перезапущен**.

---

## ✅ РЕШЕНИЕ

### **Вариант 1: SSH в браузере или PuTTY**

1. **Подключись к серверу:**
   ```
   Хост: 77.239.125.70
   Порт: 22
   Логин: root
   Пароль: (из SERVER_COMPLETE_GUIDE.md)
   ```

2. **Выполни команды:**
   ```bash
   cd /var/www/duo
   git pull origin main
   pm2 restart duo-server
   pm2 logs duo-server --lines 20
   ```

3. **Проверь что увидишь:**
   ```
   ✅ Balance routes loaded
   ```

---

### **Вариант 2: Если SSH не работает**

Используй **Hetzner Cloud Console** (веб-терминал):
1. Зайди на https://console.hetzner.cloud
2. Выбери сервер
3. Нажми "Console" (веб-терминал)
4. Выполни те же команды

---

## 🧪 ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### **Запусти тест:**
```powershell
cd C:\Users\dev_fenomen\Desktop\duo
.\test-endpoints.ps1
```

Должен показать: `✅ Endpoint exists (403 Forbidden - correct!)`

---

## 💰 УСТАНОВКА БАЛАНСА

После успешного деплоя:

```powershell
cd C:\Users\dev_fenomen\Desktop\duo
.\reset-balance.ps1
```

Или вручную:
```powershell
# Очистить все балансы
$clearBody = @{adminKey="G3ce12soSjWJK38jyGq"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://duopartners.xyz/api/balance/admin/clear" -Method Post -Body $clearBody -ContentType "application/json"

# Установить баланс для ID 1889923046
$setBody = @{adminKey="G3ce12soSjWJK38jyGq";telegramId="1889923046";rubles=50000;chips=0} | ConvertTo-Json
Invoke-RestMethod -Uri "https://duopartners.xyz/api/balance/admin/set" -Method Post -Body $setBody -ContentType "application/json"
```

---

## 📋 ТЕКУЩИЙ СТАТУС КОММИТОВ

```
c8f5edf - feat: Add admin endpoints for balance management ✅
ca903f7 - fix: CRITICAL - Fix balance WebSocket updates ✅
cacbc67 - feat: Redesign case win screen ✅
```

**Все коммиты в GitHub, нужно только задеплоить на сервер!** 🚀

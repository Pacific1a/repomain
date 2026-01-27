# 📱 Как тестировать с телефона и видеть логи

## 🔥 **ПРОБЛЕМА:**
С телефона/ПК в мини-аппе пишет "недостаточно средств", нужно видеть что происходит.

---

## ✅ **РЕШЕНИЕ - 2 ОКНА:**

### **Окно 1 - SSH (смотрим логи):**

```bash
ssh root@77.239.125.70
cd /var/www/duo
pm2 logs duo-server --lines 50
```

**Оставь это окно открытым!** Здесь будешь видеть все запросы.

---

### **Окно 2 - Telegram (тестируем):**

1. **Открой бот** на телефоне или ПК
2. **Смотри в окно 1** - должен появиться:
   ```
   📥 GET /api/balance/ТВОЙ_ID
   ```

3. **Попробуй открыть кейс**
4. **Смотри в окно 1** - что происходит

---

## 🔍 **ЧТО ПРОВЕРИТЬ В ЛОГАХ:**

### **✅ ХОРОШО - всё работает:**
```
GET /api/balance/1889923046 200
Balance loaded: {rubles: 50000, chips: 0}
POST /api/balance/1889923046/subtract 200
Balance subtracted: -777₽
```

### **❌ ПЛОХО - баланс 0:**
```
GET /api/balance/1889923046 200
Balance loaded: {rubles: 0, chips: 0}  ← ПРОБЛЕМА!
```
**Причина:** Баланс не установлен для этого ID

### **❌ ПЛОХО - 404:**
```
GET /api/balance/1889923046 404
```
**Причина:** Код не задеплоен

### **❌ ПЛОХО - неправильный ID:**
```
GET /api/balance/undefined 404
или
GET /api/balance/test 404
```
**Причина:** Telegram не передал ID

---

## 🛠️ **ЕСЛИ БАЛАНС 0 - УСТАНОВИ:**

```powershell
# На локальном ПК (Windows)
cd C:\Users\dev_fenomen\Desktop\duo

# Установи баланс для ТВОЕГО ID
$body = @{
  adminKey="G3ce12soSjWJK38jyGq"
  telegramId="ТВОЙ_TELEGRAM_ID"  # ← Замени на ID из логов!
  rubles=50000
  chips=0
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://duopartners.xyz/api/balance/admin/set" `
  -Method Post -Body $body -ContentType "application/json"
```

---

## 📋 **ПОШАГОВЫЙ ПЛАН:**

1. ✅ **Деплой код:**
   ```bash
   ssh root@77.239.125.70
   cd /var/www/duo
   git pull origin main
   pm2 restart duo-server
   ```

2. ✅ **Открой логи:**
   ```bash
   pm2 logs duo-server
   ```

3. ✅ **Открой бот** с телефона

4. ✅ **Найди свой Telegram ID** в логах:
   ```
   GET /api/balance/123456789  ← Это твой ID!
   ```

5. ✅ **Проверь баланс** в логах:
   ```
   Balance loaded: {rubles: ???, chips: ???}
   ```

6. ✅ **Если баланс 0** - установи через PowerShell (см. выше)

7. ✅ **Попробуй открыть кейс** снова

8. ✅ **Скопируй логи** если не работает

---

## 💡 **БЫСТРАЯ ПРОВЕРКА:**

Вместо телефона можешь проверить через curl:

```bash
# На сервере
curl https://duopartners.xyz/api/balance/1889923046

# Должен вернуть:
{"success":true,"telegramId":1889923046,"balance":50000,"chips":0,"rubles":50000}
```

Если возвращает `{"rubles":0}` - нужно установить баланс!

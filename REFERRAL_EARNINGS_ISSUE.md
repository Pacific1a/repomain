# 🐛 ПРОБЛЕМА: Профит не начисляется партнёру

## Текущая ситуация:
✅ Реферальная система работает (регистрация, карточки)
❌ При выигрыше друга профит НЕ начисляется тому кто привёл

## Как должно работать:

### 1. Игрок выигрывает
```javascript
// В игре вызывается:
BalanceAPI.addChips(1000, 'crash', 'Win x2.5');
```

### 2. referral-integration.js перехватывает
```javascript
window.BalanceAPI.addChips = async function(amount, source) {
    const result = await originalAddChips(amount, source);
    
    // Начисляем процент рефереру
    if (source === 'crash') {
        await window.ReferralSystem.addReferralEarnings(
            window.BalanceAPI.telegramId,  // ID выигравшего
            amount  // Сумма выигрыша
        );
    }
    
    return result;
};
```

### 3. ReferralSystem отправляет на сервер
```javascript
async addReferralEarnings(userId, amount) {
    const response = await fetch('/api/referral/add-earnings', {
        method: 'POST',
        body: JSON.stringify({
            userId: userId,    // Кто выиграл
            amount: amount     // Сколько
        })
    });
}
```

### 4. Сервер обновляет данные
```javascript
app.post('/api/referral/add-earnings', (req, res) => {
    const { userId, amount } = req.body;
    
    // Находим реферера этого пользователя
    const referrer = findReferrer(userId);
    
    // Начисляем 10% от выигрыша
    referrer.referrals[userId].totalWinnings += amount;
    referrer.referrals[userId].totalEarnings += amount * 0.10;
    referrer.referralBalance += amount * 0.10;
    
    saveData();
});
```

### 5. UI обновляется
После этого при обновлении страницы должно показать:
```
(U) User4906
    Deposited | 1000.00₽    100.00 ₽
```

## 🔍 Где проблема?

### Возможные причины:

#### 1. **referral-integration.js не подключен**
Проверьте в `/refferall/index.html`:
```html
<script src="../referral-integration.js"></script>
```
Должен быть ПОСЛЕ referral-system.js

#### 2. **Перехват не работает**
В консоли должны быть логи:
```
✅ Referral integration installed on BalanceAPI
🎰 Win detected: 1000 chips from crash
```

Если НЕТ - значит перехват не сработал.

#### 3. **Метод addReferralEarnings не вызывается**
В консоли должно быть:
```
🎁 Adding referral earnings for 7781554906: 1000
```

Если НЕТ - проблема в referral-system.js

#### 4. **Запрос не отправляется на сервер**
В Network (F12 → Network):
```
POST /api/referral/add-earnings
Status: 200
Response: {success: true, ...}
```

Если НЕТ - проблема с fetch запросом.

#### 5. **Сервер не обрабатывает запрос**
Логи сервера должны показать:
```
POST /api/referral/add-earnings
User 7781554906 earned 1000, referrer 1889923046 gets 100
```

Если НЕТ - проблема на сервере.

#### 6. **Данные не сохраняются**
После запроса проверьте файл:
```
server/referrals.json
```

Должно быть:
```json
{
  "1889923046": {
    "referralCode": "1889923046",
    "referralBalance": 100,
    "referrals": [
      {
        "userId": "7781554906",
        "totalWinnings": 1000,
        "totalEarnings": 100
      }
    ]
  }
}
```

## 🧪 Как протестировать:

### Вариант 1: Через консоль браузера
```javascript
// 1. Проверить что ReferralSystem загружен
console.log(window.ReferralSystem);

// 2. Вызвать вручную
await window.ReferralSystem.addReferralEarnings('7781554906', 1000);

// 3. Проверить ответ
// Должно вывести: {success: true, ...}

// 4. Обновить страницу и проверить UI
```

### Вариант 2: Через глобальную функцию
```javascript
await window.addReferralBonus('7781554906', 1000);
```

### Вариант 3: Сыграть в игру
1. Зайти под пользователем `7781554906`
2. Сыграть в Crash
3. Выиграть
4. Проверить логи в Console
5. Обновить страницу рефералов под `1889923046`

## 🔧 Быстрое решение:

Добавьте логирование в referral-system.js:

```javascript
async addReferralEarnings(userId, amount) {
    console.log(`🎁 Adding referral earnings for ${userId}: ${amount}`);
    
    try {
        const response = await fetch(`${SERVER_URL}/api/referral/add-earnings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount })
        });
        
        const data = await response.json();
        console.log('📡 Server response:', data);
        
        if (data.success) {
            console.log('✅ Earnings added successfully');
            return true;
        }
    } catch (error) {
        console.error('❌ Error adding earnings:', error);
    }
    
    return false;
}
```

## 📊 Что проверить СЕЙЧАС:

1. **Откройте страницу игры** (crash, mines, etc)
2. **Откройте Console** (F12)
3. **Сыграйте и выиграйте**
4. **Посмотрите логи:**
   - `🎰 Win detected` - должно быть
   - `🎁 Adding referral earnings` - должно быть
   - `📡 Server response` - должно быть
5. **Обновите страницу рефералов**
6. **Проверьте карточку** - totalWinnings и totalEarnings должны увеличиться

---

**Текущий статус:** Откатились к рабочей версии (только Deposited), ждём деплоя 5 минут.

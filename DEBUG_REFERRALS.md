# 🐛 Отладка реферальной системы

## Проблемы:
1. В кнопке `.text-wrapper-4` показывается баланс вместо "Invite a friend"
2. Счетчик рефералов не обновляется
3. Карточка реферала не создается

## 🔍 Что проверить в консоли браузера:

Откройте DevTools (F12) → Console и проверьте:

### 1. Загрузка системы:
```
✅ Referral System initializing...
✅ Telegram ID: 1889923046
📊 Реферальные данные: {referralCode: "...", referrals: [...]}
📊 Количество рефералов: 1
✅ Referral System ready
```

### 2. Обновление UI:
```
🔄 Обновление UI, рефералов: 1
✅ Обновлен реферальный баланс: 0
✅ Обновлен счетчик рефералов: 1
🔄 Обновление списка рефералов: 1 шт.
✅ Отображаем рефералов: [{userId: "...", ...}]
```

### 3. Защита текста кнопки:
```
Если видите частые перезаписи - MutationObserver работает
```

## 📊 Проверка элементов:

В Console выполните:

```javascript
// Проверка кнопки
document.querySelector('.invite-button .text-wrapper-4').textContent

// Проверка счетчика
document.querySelector('.invidet-amount .text-wrapper-9').textContent

// Проверка контейнера рефералов
document.querySelector('.invited-info')

// Проверка карточек
document.querySelectorAll('.refferal-info')

// Проверка данных
window.ReferralSystem.referrals
```

## 🔧 Исправления:

### 1. Добавлен MutationObserver
Защищает текст кнопки от перезаписи другими скриптами:
```javascript
protectInviteButtonText() {
    // Следит за изменениями
    // Если текст стал числом - возвращает "Invite a friend"
}
```

### 2. Улучшено логирование
Теперь видно где именно проблема:
```javascript
console.log('🔄 Обновление UI, рефералов:', this.referrals.length);
console.warn('⚠️ Элемент не найден');
```

### 3. Использование шаблона
Клонирует существующий HTML:
```javascript
const card = template.cloneNode(true);
template.parentNode.insertBefore(card, template.nextSibling);
```

## 📝 Порядок загрузки скриптов:

ВАЖНО! Порядок в HTML:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
<script src="../balance-api.js"></script>           ← Может перезаписывать текст!
<script src="../players-system.js"></script>
<script src="../telegram-user-data.js"></script>
<script src="../referral-system.js"></script>        ← Должен быть последним!
<script src="../referral-integration.js"></script>
```

## ⚠️ Если balance-api.js перезаписывает:

Проверьте в balance-api.js:
```javascript
// Ищите строки которые обновляют .text-wrapper-4
// Возможно там универсальный обработчик который обновляет ВСЕ .text-wrapper-4
```

Решение - добавить проверку в balance-api.js:
```javascript
// Не обновлять text-wrapper-4 внутри .invite-button
const element = document.querySelector('.some-selector .text-wrapper-4');
if (element && !element.closest('.invite-button')) {
    element.textContent = balance;
}
```

## 🎯 Быстрая проверка:

### Вариант 1: Отключите balance-api.js временно

В index.html закомментируйте:
```html
<!-- <script src="../balance-api.js"></script> -->
```

Обновите страницу. Если кнопка теперь показывает "Invite a friend" - проблема в balance-api.js.

### Вариант 2: Проверьте через setTimeout

В Console:
```javascript
setTimeout(() => {
    document.querySelector('.invite-button .text-wrapper-4').textContent = 'TEST';
}, 2000);
```

Если через 2 секунды текст снова становится числом - есть другой скрипт который перезаписывает.

## 📍 Проверка селекторов:

```javascript
// Должны существовать:
document.querySelector('.invite-button')             // ✅
document.querySelector('.invite-button .text-wrapper-4')  // ✅
document.querySelector('.invidet-amount')            // ✅
document.querySelector('.invidet-amount .text-wrapper-9') // ✅
document.querySelector('.invited-info')              // ✅
document.querySelector('.refferal-info')             // ✅ (шаблон)
```

## 🚀 После деплоя:

1. Откройте страницу
2. F12 → Console
3. Обновите страницу (Ctrl+Shift+R)
4. Скопируйте ВСЕ логи из Console
5. Отправьте мне - я увижу где проблема!

## 💡 Временное решение:

Если ничего не помогает, добавьте setInterval:
```javascript
// В конец referral-system.js
setInterval(() => {
    const btn = document.querySelector('.invite-button .text-wrapper-4');
    if (btn && !window.ReferralSystem.referralLink) {
        const text = btn.textContent;
        if (!isNaN(parseFloat(text))) {
            btn.textContent = 'Invite a friend';
        }
    }
}, 100);
```

Это грубо, но точно сработает.

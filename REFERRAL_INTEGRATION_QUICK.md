# 🔗 ИНТЕГРАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ В БОТ

## ❌ ТЕКУЩАЯ СИТУАЦИЯ:

**Бот отправляет:** ✅ Переходы по ссылке `/start ref_CODE`  
**Бот НЕ отправляет:** ❌ Депозиты, ❌ Проигрыши

**Поэтому статистика пустая!**

---

## ✅ ЧТО НУЖНО ДОБАВИТЬ:

### 1. ПЕРВЫЙ ДЕПОЗИТ (пополнение)

Когда пользователь **ВПЕРВЫЕ** пополняет баланс:

**Endpoint:** `POST /api/referral/register-referral`

**Где:** В файле обработки платежей (найдите где баланс пополняется)

**Код Python:**

```python
import aiohttp

async def on_first_deposit(user_id: str, amount: float, referrer_code: str):
    """Вызывать когда пользователь делает первый депозит"""
    
    if not referrer_code:
        return  # Пользователь не пришёл по реферальной ссылке
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{SERVER_API_URL}/api/referral/register-referral",
                json={
                    "referralCode": referrer_code,
                    "referralUserId": user_id,
                    "depositAmount": amount
                },
                headers={'X-API-Secret': PARTNER_API_SECRET},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    print(f"✅ First deposit registered: {user_id} → {amount}₽")
        except Exception as e:
            print(f"❌ Error registering deposit: {e}")
```

### 2. ПОВТОРНЫЕ ДЕПОЗИТЫ

Когда пользователь пополняет баланс **НЕ ПЕРВЫЙ РАЗ**:

**Endpoint:** `POST /api/referral/update-deposit`

**Код:**

```python
async def on_repeated_deposit(user_id: str, amount: float, referrer_code: str):
    """Вызывать при повторных пополнениях"""
    
    if not referrer_code:
        return
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{SERVER_API_URL}/api/referral/update-deposit",
                json={
                    "referralCode": referrer_code,
                    "referralUserId": user_id,
                    "depositAmount": amount
                },
                headers={'X-API-Secret': PARTNER_API_SECRET},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    print(f"✅ Deposit updated: {user_id} → {amount}₽")
        except Exception as e:
            print(f"❌ Error updating deposit: {e}")
```

### 3. ПРОИГРЫШИ В ИГРАХ (60% ПАРТНЁРУ!)

Когда пользователь **ПРОИГРЫВАЕТ** в любой игре:

**Endpoint:** `POST /api/referral/add-earnings`

**Где:** В конце каждой игры (crash, blackjack, roll, mine, speedCASH)

**Код:**

```python
async def on_game_loss(user_id: str, loss_amount: float, referrer_code: str):
    """Вызывать когда пользователь проигрывает в игре"""
    
    if not referrer_code or loss_amount <= 0:
        return
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{SERVER_API_URL}/api/referral/add-earnings",
                json={
                    "referralCode": referrer_code,
                    "referralUserId": user_id,
                    "lossAmount": loss_amount
                },
                headers={'X-API-Secret': PARTNER_API_SECRET},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    partner_earnings = result.get('earnings', 0)
                    print(f"✅ Earnings: loss={loss_amount}₽, partner_gets={partner_earnings}₽ (60%)")
        except Exception as e:
            print(f"❌ Error adding earnings: {e}")
```

---

## 📋 КАК ХРАНИТЬ referrer_code?

Нужно **сохранять** кто пригласил пользователя!

### В файле `main_start.py` (строка ~165):

```python
# После успешного ответа сервера
if resp.status == 200 and result.get('success'):
    # ДОБАВИТЬ: Сохранить в БД что этот пользователь пришёл от referrer_id
    # Например:
    # await db.save_user_referrer(user_id, referrer_id)
    # или
    # await Userx.update_referrer(user_id, referrer_id)
    
    await message.answer(
        "🎁 Вы перешли по реферальной ссылке!\n"
        "Ваш партнёр будет получать 60% от ваших проигрышей."
    )
```

### Функция получения referrer_code:

```python
async def get_user_referrer_code(user_id: str) -> str:
    """Получить реферальный код пригласившего"""
    # TODO: Реализовать получение из вашей БД
    # Например:
    # user = await Userx.get(user_id)
    # return user.referrer_code if user else None
    pass
```

---

## 🎯 ПЛАН ДЕЙСТВИЙ:

1. **Создать таблицу/поле в БД** для хранения `referrer_code` у каждого пользователя
2. **Сохранять referrer_code** при переходе по ссылке (в `main_start.py`)
3. **Добавить вызов** `on_first_deposit()` при первом пополнении
4. **Добавить вызов** `on_repeated_deposit()` при повторных пополнениях
5. **Добавить вызов** `on_game_loss()` во всех играх при проигрыше

---

## 🧪 ТЕСТИРОВАНИЕ:

После добавления кода:

```bash
# 1. Перейти по реферальной ссылке в боте
/start ref_CODE

# 2. Пополнить баланс
# Должно появиться в логах:
✅ First deposit registered: USER_ID → AMOUNT₽

# 3. Проиграть в игре
# Должно появиться:
✅ Earnings: loss=AMOUNT₽, partner_gets=60%₽

# 4. Проверить в дашборде партнёра
# Статистика должна обновиться!
```

---

**После интеграции всё заработает!** 🎉

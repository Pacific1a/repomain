# - *- coding: utf- 8 - *-
from typing import Union

from aiogram import Router, Bot, F
from aiogram.filters import StateFilter
from aiogram.types import CallbackQuery, Message

from tgbot.database.db_payments import Paymentsx
from tgbot.database.db_refill import Refillx
from tgbot.database.db_users import Userx
from tgbot.keyboards.inline_user import refill_bill_finl, refill_method_finl
from tgbot.services.api_qiwi import QiwiAPI
from tgbot.services.api_yoomoney import YoomoneyAPI
from tgbot.services.api_cactuspay import CactusPayAPI
from tgbot.utils.const_functions import is_number, to_number, gen_id
from tgbot.utils.misc.bot_models import FSM, ARS
from tgbot.utils.misc_functions import send_admins

min_refill_rub = 100  # Минимальная сумма пополнения в рублях

router = Router(name=__name__)


################################################################################
############################ 🧪 ТЕСТОВОЕ ПОПОЛНЕНИЕ ############################
# Команда для тестового пополнения (только для админов)
@router.message(F.text.in_(('/test_balance', '/test', '🧪 ТЕСТ')))
async def test_refill_balance(message: Message, bot: Bot, state: FSM, arSession: ARS):
    from tgbot.data.config import get_admins
    
    # Только для админов
    if message.from_user.id not in get_admins():
        return await message.answer("⛔ Эта команда доступна только администраторам.")
    
    get_user = Userx.get(user_id=message.from_user.id)
    
    # Тестовая сумма
    test_amount = 10000.0
    
    # Обновляем баланс в боте
    Userx.update(
        message.from_user.id,
        user_balance=round(get_user.user_balance + test_amount, 2),
        user_refill=round(get_user.user_refill + test_amount, 2),
    )
    
    # ✅ ОБНОВЛЯЕМ БАЛАНС В MINI APP
    await update_miniapp_balance(message.from_user.id, test_amount)
    
    new_balance = round(get_user.user_balance + test_amount, 2)
    
    await message.answer(
        f"<b>🧪 ТЕСТ: Баланс пополнен!</b>\n\n"
        f"➕ Добавлено: <code>{test_amount}₽</code>\n"
        f"💰 Теперь баланс: <code>{new_balance}₽</code>\n\n"
        f"✅ Mini App баланс обновлен!\n"
        f"📱 Откройте приложение чтобы проверить визуальное обновление.",
        parse_mode="html"
    )
    
    print(f"🧪 TEST: Added {test_amount}₽ to user {message.from_user.id}")


################################################################################
################################# ПОПОЛНЕНИЕ ###################################


# Выбор способа пополнения
@router.callback_query(F.data == "user_refill")
async def refill_method(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    get_payment = Paymentsx.get()

    if get_payment.way_qiwi == "False" and get_payment.way_yoomoney == "False" and get_payment.way_cactuspay == "False":
        return await call.answer("❗️ Пополнения временно недоступны", True)

    await call.message.edit_text(
        "<b>💰 Выберите способ пополнения</b>",
        reply_markup=refill_method_finl(),
    )


# Выбор способа пополнения
@router.callback_query(F.data.startswith("user_refill_method:"))
async def refill_method_select(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    pay_method = call.data.split(":")[1]

    await state.update_data(here_pay_method=pay_method)

    await state.set_state("here_refill_amount")
    await call.message.edit_text("<b>💰 Введите сумму пополнения</b>")


################################################################################
################################### ВВОД СУММЫ #################################
# Принятие суммы для пополнения средств
@router.message(F.text, StateFilter("here_refill_amount"))
async def refill_amount_get(message: Message, bot: Bot, state: FSM, arSession: ARS):
    if not is_number(message.text):
        return await message.answer(
            "<b>❌ Данные были введены неверно.</b>\n"
            "💰 Введите сумму для пополнения средств",
        )

    if to_number(message.text) < min_refill_rub or to_number(message.text) > 100_000:
        return await message.answer(
            f"<b>❌ Неверная сумма пополнения</b>\n"
            f"❗️ Cумма не должна быть меньше <code>{min_refill_rub}₽</code> и больше <code>100 000₽</code>\n"
            f"💰 Введите сумму для пополнения средств",
        )

    cache_message = await message.answer("<b>♻️ Подождите, платёж генерируется...</b>")

    pay_amount  = to_number(message.text)
    pay_method  = (await state.get_data())['here_pay_method']
    await state.clear()

    if pay_method == "QIWI":
        bill_message, bill_link, bill_receipt = await (
            QiwiAPI(
                bot=bot,
                arSession=arSession,
            )
        ).bill(pay_amount)

    elif pay_method == "Yoomoney":
        bill_message, bill_link, bill_receipt = await (
            YoomoneyAPI(
                bot=bot,
                arSession=arSession,
            )
        ).bill(pay_amount)

    elif pay_method == "CactusPay":
        bill_message, bill_link, bill_receipt = await(
            CactusPayAPI(
                bot=bot,
                arSession=arSession,
            )
        ).bill(pay_amount)

    if bill_message:
        # Если bill_link равен None, значит произошла ошибка
        if bill_link is None:
            await cache_message.edit_text(
                bill_message,
                reply_markup=refill_open_finl(pay_method),
            )
        else:
            await cache_message.edit_text(
                bill_message,
                reply_markup=refill_bill_finl(bill_link, bill_receipt, pay_method),
            )


################################################################################
############################### ПРОВЕРКА ПЛАТЕЖЕЙ ##############################

# Проверка оплаты - CactusPay
@router.callback_query(F.data.startswith('Pay:CactusPay'))
async def refill_check_cactuspay(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    pay_way         = call.data.split(":")[1]
    pay_receipt     = call.data.split(":")[2]

    pay_status, pay_amount, payment_method = await (
        CactusPayAPI(
            bot=bot,
            arSession=arSession,
        )
    ).bill_check(pay_receipt)

    if pay_status == 0:
        # Платеж успешно оплачен
        get_refill = Refillx.get(refill_receipt=pay_receipt)

        if get_refill is None:
            await refill_success(
                bot=bot,
                call=call,
                pay_way=pay_way,
                pay_amount=pay_amount,
                pay_receipt=pay_receipt,
                pay_comment=pay_receipt,
                payment_method=payment_method,
            )
        else:
            await call.answer("❗ Ваше пополнение уже зачислено.", True, cache_time=60)
    elif pay_status == 1:
        # Ошибка при проверке
        await call.answer("❗️ Не удалось проверить платёж. Попробуйте позже", True, cache_time=5)
    elif pay_status == 2:
        # Платеж ожидает оплаты
        await call.answer("⏳ Платёж создан, но еще не оплачен. Пожалуйста, завершите оплату и проверьте снова.", True, cache_time=5)
    elif pay_status == 3:
        # Неверная валюта
        await call.answer("❗️ Оплата была произведена не в рублях", True, cache_time=5)
    elif pay_status == 4:
        # Платеж отменен
        await call.answer("❌ Платёж был отменен. Создайте новый платёж.", True, cache_time=5)
    else:
        await call.answer(f"❗ Неизвестная ошибка {pay_status}. Обратитесь в поддержку.", True, cache_time=5)

# Проверка оплаты - ЮMoney
@router.callback_query(F.data.startswith('Pay:Yoomoney'))
async def refill_check_yoomoney(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    pay_way = call.data.split(":")[1]
    pay_receipt = call.data.split(":")[2]

    pay_status, pay_amount = await (
        YoomoneyAPI(
            bot=bot,
            arSession=arSession,
        )
    ).bill_check(pay_receipt)

    if pay_status == 0:
        get_refill = Refillx.get(refill_receipt=pay_receipt)

        if get_refill is None:
            await refill_success(
                bot=bot,
                call=call,
                pay_way=pay_way,
                pay_amount=pay_amount,
                pay_receipt=pay_receipt,
                pay_comment=pay_receipt,
            )
        else:
            await call.answer("❗ Ваше пополнение уже зачислено.", True, cache_time=60)
    elif pay_status == 1:
        await call.answer("❗️ Не удалось проверить платёж. Попробуйте позже", True, cache_time=5)
    elif pay_status == 2:
        await call.answer("❗️ Платёж не был найден. Попробуйте позже", True, cache_time=5)
    elif pay_status == 3:
        await call.answer("❗️ Оплата была произведена не в рублях", True, cache_time=5)
    else:
        await call.answer(f"❗ Неизвестная ошибка {pay_status}. Обратитесь в поддержку.", True, cache_time=5)


# Проверка оплаты - QIWI
@router.callback_query(F.data.startswith('Pay:QIWI'))
async def refill_check_qiwi(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    pay_way = call.data.split(":")[1]
    pay_receipt = call.data.split(":")[2]

    pay_status, pay_amount = await (
        QiwiAPI(
            bot=bot,
            arSession=arSession,
        )
    ).bill_check(pay_receipt)

    if pay_status == 0:
        get_refill = Refillx.get(refill_receipt=pay_receipt)

        if get_refill is None:
            await refill_success(
                bot=bot,
                call=call,
                pay_way=pay_way,
                pay_amount=pay_amount,
                pay_receipt=pay_receipt,
                pay_comment=pay_receipt,
            )
        else:
            await call.answer("❗ Ваше пополнение уже зачислено.", True, cache_time=60)
    elif pay_status == 1:
        await call.answer("❗️ Не удалось проверить платёж. Попробуйте позже", True, cache_time=5)
    elif pay_status == 2:
        await call.answer("❗ Платёж не был найден. Попробуйте позже.", True, cache_time=5)
    elif pay_status == 3:
        await call.answer("❗ Оплата была произведена не в рублях.", True, cache_time=5)
    else:
        await call.answer(f"❗ Неизвестная ошибка {pay_status}. Обратитесь в поддержку.", True, cache_time=5)


################################################################################
#################################### ПРОЧЕЕ ####################################
# Обновление баланса на сервере Mini App
async def create_transaction(user_id: int, amount: float, transaction_type: str, source: str, description: str):
    """Создает транзакцию на сервере Mini App"""
    import aiohttp
    from tgbot.data.config import SERVER_API_URL
    
    SERVER_URL = SERVER_API_URL
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{SERVER_URL}/api/transactions/{user_id}",
                json={
                    "type": transaction_type,
                    "amount": float(amount),
                    "source": source,
                    "description": description
                },
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    print(f"✅ Транзакция создана для {user_id}: {description}")
                    return True
                else:
                    print(f"⚠️ Не удалось создать транзакцию: {response.status}")
                    return False
    except Exception as e:
        print(f"⚠️ Ошибка создания транзакции (некритичная): {e}")
        return False

async def update_miniapp_balance(user_id: int, amount: float):
    """Отправляет обновление баланса на сервер Mini App (необязательная операция)"""
    import aiohttp
    from tgbot.data.config import SERVER_API_URL
    from tgbot.database.db_users import Userx
    
    # URL вашего сервера Mini App
    SERVER_URL = SERVER_API_URL
    
    # Выводим URL для диагностики
    print(f"🔄 Синхронизация баланса с {SERVER_URL} для пользователя {user_id}")
    
    try:
        # Получаем актуальный баланс из базы бота
        get_user = Userx.get(user_id=user_id)
        if not get_user:
            print(f"⚠️ Пользователь {user_id} не найден в БД")
            return False
        
        total_rubles = get_user.user_balance
        
        async with aiohttp.ClientSession() as session:
            # Отправляем полный баланс на сервер (не добавляем, а устанавливаем)
            async with session.post(
                f"{SERVER_URL}/api/balance/{user_id}",
                json={"rubles": float(total_rubles), "chips": 0},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Баланс синхронизирован на сервере для {user_id}: {data['rubles']}₽")
                    return True
                else:
                    print(f"⚠️ Не удалось синхронизировать баланс: {response.status}")
                    return False
    except aiohttp.ClientConnectorError:
        print(f"⚠️ Сервер Mini App недоступен, синхронизация пропущена")
        return True  # Не считаем это критичной ошибкой
    except Exception as e:
        print(f"⚠️ Ошибка синхронизации баланса (некритичная): {e}")
        return True  # Продолжаем работу даже если синхронизация не удалась

# Зачисление средств
async def refill_success(
        bot: Bot,
        call: CallbackQuery,
        pay_way: str,
        pay_amount: float,
        pay_receipt: Union[str, int] = None,
        pay_comment: str = None,
        payment_method: str = None,
):
    get_user = Userx.get(user_id=call.from_user.id)

    if pay_receipt is None:
        pay_receipt = gen_id()
    if pay_comment is None:
        pay_comment = ""

    # Формируем описание метода оплаты
    if payment_method:
        method_description = f"CactusPay ({payment_method})"
    else:
        method_description = "CactusPay"

    Refillx.add(
        user_id=get_user.user_id,
        refill_comment=pay_comment,
        refill_amount=pay_amount,
        refill_receipt=pay_receipt,
        refill_method=pay_way,
    )

    Userx.update(
        call.from_user.id,
        user_balance=round(get_user.user_balance + pay_amount, 2),
        user_refill=round(get_user.user_refill + pay_amount, 2),
    )
    
    # ✅ ОБНОВЛЯЕМ БАЛАНС В MINI APP
    await update_miniapp_balance(call.from_user.id, pay_amount)
    
    # ✅ СОЗДАЕМ ТРАНЗАКЦИЮ НА СЕРВЕРЕ
    await create_transaction(
        call.from_user.id, 
        pay_amount, 
        'add', 
        'bot', 
        f"Пополнение через {method_description}"
    )
    
    # ✅ ОТПРАВИТЬ ДЕПОЗИТ В РЕФЕРАЛЬНУЮ СИСТЕМУ
    if get_user.user_referrer:
        from tgbot.services.referral_service import ReferralService
        
        # Проверить это первый депозит или нет
        is_first_deposit = (get_user.user_refill == 0)  # До добавления было 0
        
        if is_first_deposit:
            await ReferralService.register_first_deposit(
                str(call.from_user.id),
                get_user.user_referrer,
                pay_amount
            )
        else:
            await ReferralService.register_repeated_deposit(
                str(call.from_user.id),
                get_user.user_referrer,
                pay_amount
            )

    await call.message.edit_text(
        f"<b>💰 Вы пополнили баланс на сумму <code>{pay_amount}₽</code>. Удачи ❤️\n"
        f"🧾 Чек: <code>#{pay_receipt}</code></b>",
    )

    await send_admins(
        bot,
        f"👤 Пользователь: <b>@{get_user.user_login}</b> | <a href='tg://user?id={get_user.user_id}'>{get_user.user_name}</a> | <code>{get_user.user_id}</code>\n"
        f"💰 Сумма пополнения: <code>{pay_amount}₽</code>\n"
        f"🧾 Чек: <code>#{pay_receipt}</code>"
    )

# - *- coding: utf- 8 - *-
from aiogram import Router, Bot, F
from aiogram.filters import StateFilter
from aiogram.types import Message, CallbackQuery

from tgbot.database.db_settings import Settingsx
from tgbot.keyboards.inline_user import user_support_finl
from tgbot.keyboards.reply_main import menu_frep
from tgbot.utils.const_functions import ded
from tgbot.utils.misc.bot_filters import IsBuy, IsRefill, IsWork
from tgbot.utils.misc.bot_models import FSM, ARS

# Игнор-колбэки покупок
prohibit_buy = [
    'buy_category_swipe',
    'buy_category_open',
    'buy_position_swipe',
    'buy_position_open',
    'buy_item_open',
    'buy_item_confirm',
]

# Игнор-колбэки пополнений
prohibit_refill = [
    'user_refill',
    'user_refill_method',
    'Pay:',
    'Pay:QIWI',
    'Pay:Yoomoney',
]

router = Router(name=__name__)


################################################################################
########################### СТАТУС ТЕХНИЧЕСКИХ РАБОТ ###########################
# Фильтр на технические работы - сообщение
@router.message(IsWork())
async def filter_work_message(message: Message, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()

    get_settings = Settingsx.get()

    if get_settings.misc_support != "None":
        return await message.answer(
            "<b>⛔ Бот находится на технических работах.</b>",
            reply_markup=user_support_finl(get_settings.misc_support),
        )

    await message.answer("<b>⛔ Бот находится на технических работах.</b>")


# Фильтр на технические работы - колбэк
@router.callback_query(IsWork())
async def filter_work_callback(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()

    await call.answer("⛔ Бот находится на технических работах.", True)


################################################################################
################################# СТАТУС ПОКУПОК ###############################
# Фильтр на доступность покупок - сообщение
@router.message(IsBuy(), F.text == "🎁 Купить")
@router.message(IsBuy(), StateFilter('here_item_count'))
async def filter_buy_message(message: Message, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()

    await message.answer("<b>⛔ Покупки временно отключены.</b>")


# Фильтр на доступность покупок - колбэк
@router.callback_query(IsBuy(), F.text.startswith(prohibit_buy))
async def filter_buy_callback(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()

    await call.answer("⛔ Покупки временно отключены.", True)


################################################################################
############################### СТАТУС ПОПОЛНЕНИЙ ##############################
# Фильтр на доступность пополнения - сообщение
@router.message(IsRefill(), StateFilter('here_pay_amount'))
async def filter_refill_message(message: Message, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()

    await message.answer("<b>⛔ Пополнение временно отключено.</b>")


# Фильтр на доступность пополнения - колбэк
@router.callback_query(IsRefill(), F.text.startswith(prohibit_refill))
async def filter_refill_callback(call: CallbackQuery, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()

    await call.answer("⛔ Пополнение временно отключено.", True)


################################################################################
#################################### ПРОЧЕЕ ####################################
# Открытие главного меню  
@router.message(F.text.regexp(r'^(/start|🔙 Главное меню)'))
async def main_start(message: Message, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()
    
    # Обработка реферальной ссылки
    if message.text.startswith('/start'):
        parts = message.text.split(maxsplit=1)
        
        if len(parts) > 1:  # Есть параметр
            args = parts[1].strip()
            
            try:
                # Декодируем короткий код base36 в telegram ID
                referrer_id = str(int(args, 36))
                user_id = str(message.from_user.id)
                
                print(f"🔍 Referral link detected: code={args}, decoded={referrer_id}, user={user_id}")
                
                # Проверяем, что пользователь не пытается пригласить сам себя
                if referrer_id != user_id:
                    # Отправляем на сервер для регистрации
                    import aiohttp
                    SERVER_URL = "https://telegram-games-plkj.onrender.com"
                    
                    async with aiohttp.ClientSession() as session:
                        try:
                            async with session.post(
                                f"{SERVER_URL}/api/referral/register",
                                json={
                                    "userId": user_id,
                                    "referrerId": referrer_id
                                },
                                timeout=aiohttp.ClientTimeout(total=10)
                            ) as resp:
                                result = await resp.json()
                                print(f"📡 Server response: {result}")
                                
                                if resp.status == 200 and result.get('success'):
                                    await message.answer(
                                        "🎁 Вы перешли по реферальной ссылке!\n"
                                        "Ваш друг будет получать 10% от ваших выигрышей."
                                    )
                                    print(f"✅ Referral registered: {user_id} -> {referrer_id}")
                        except Exception as e:
                            print(f"❌ Error registering referral: {e}")
                else:
                    print(f"⚠️ User tried to refer themselves: {user_id}")
            except ValueError as e:
                # Невалидный код - игнорируем
                print(f"⚠️ Invalid referral code: {args} - {e}")

    await message.answer(
        ded("""
            🔸 Бот готов к использованию.
            🔸 Если не появились вспомогательные кнопки
            🔸 Введите /start
        """),
        reply_markup=menu_frep(message.from_user.id),
    )

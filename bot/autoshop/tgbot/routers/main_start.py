# - *- coding: utf- 8 - *-
from aiogram import Router, Bot, F
from aiogram.filters import StateFilter, Command
from aiogram.types import Message, CallbackQuery
import aiohttp
import asyncio

from tgbot.data.config import SERVER_API_URL, PARTNER_API_SECRET
from tgbot.database.db_settings import Settingsx
from tgbot.keyboards.inline_user import user_support_finl, user_welcome_finl, user_profile_finl
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
# Пополнение баланса
@router.message(Command('deposit'))
async def deposit_command(message: Message, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()
    await message.answer(
        "<b>💰 Пополнение баланса</b>\n\nНажмите кнопку ниже и выберите способ пополнения.",
        reply_markup=user_profile_finl(),
        parse_mode="html"
    )

# Открытие главного меню  
@router.message(F.text.regexp(r'^(/start|🔙 Главное меню)'))
async def main_start(message: Message, bot: Bot, state: FSM, arSession: ARS):
    await state.clear()
    
    # Обработка реферальной ссылки
    if message.text.startswith('/start'):
        parts = message.text.split(maxsplit=1)
        
        if len(parts) > 1:  # Есть параметр
            args = parts[1].strip()

            if args.lower() == 'deposit':
                await message.answer(
                    "<b>💰 Пополнение баланса</b>\n\nНажмите кнопку ниже и выберите способ пополнения.",
                    reply_markup=user_profile_finl(),
                    parse_mode="html"
                )
                return
            
            try:
                # Убираем префикс 'ref_' если есть
                referral_code = args
                if args.startswith('ref_'):
                    referral_code = args[4:]  # Убираем 'ref_'
                
                # Проверяем формат кода
                # Формат может быть: ${userId}_${timestamp}${random} (например: 3_MJ3FLZNWEE3U9)
                # Или просто base36 от userId (например: 1OKI95B)
                if '_' in referral_code:
                    # Формат ${userId}_${timestamp}${random} - извлекаем userId
                    referrer_id = referral_code.split('_')[0]
                    print(f"🔍 Referral link detected: full_code={args}, extracted_user_id={referrer_id}, new_user={message.from_user.id}")
                else:
                    # Формат base36 - декодируем
                    referrer_id = str(int(referral_code, 36))
                    print(f"🔍 Referral link detected: code={args}, decoded_user_id={referrer_id}, new_user={message.from_user.id}")
                
                user_id = str(message.from_user.id)
                
                # Проверяем, что пользователь не пытается пригласить сам себя
                if referrer_id != user_id:
                    # Получить данные пользователя
                    user_nickname = message.from_user.username or None
                    user_full_name = message.from_user.full_name or f"User{message.from_user.id}"
                    
                    # Попробовать получить фото профиля
                    user_photo_url = None
                    try:
                        photos = await bot.get_user_profile_photos(message.from_user.id, limit=1)
                        if photos.total_count > 0:
                            file_id = photos.photos[0][-1].file_id
                            file = await bot.get_file(file_id)
                            user_photo_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"
                    except Exception as photo_err:
                        print(f"⚠️ Could not get user photo: {photo_err}")
                    
                    print(f"👤 User info: nickname={user_nickname or user_full_name}, photo={bool(user_photo_url)}")
                    
                    # Отправляем на сервер для регистрации
                    async with aiohttp.ClientSession() as session:
                        try:
                            async with session.post(
                                f"{SERVER_API_URL}/api/referral/register",
                                json={
                                    "userId": user_id,
                                    "referrerId": referrer_id,
                                    "nickname": user_nickname or user_full_name,
                                    "photoUrl": user_photo_url
                                },
                                headers={
                                    'X-API-Secret': PARTNER_API_SECRET
                                },
                                timeout=aiohttp.ClientTimeout(total=10)
                            ) as resp:
                                print(f"📡 Server response status: {resp.status}")
                                
                                # Читаем ответ как текст сначала для отладки
                                response_text = await resp.text()
                                print(f"📡 Server response text: {response_text[:200]}")
                                
                                try:
                                    import json
                                    result = json.loads(response_text)
                                except Exception as json_err:
                                    print(f"❌ Error parsing JSON response: {json_err}")
                                    print(f"Response was: {response_text}")
                                    result = {}
                                
                                if resp.status == 200 and result.get('success'):
                                    # ✅ СОХРАНИТЬ referrer_code в БД
                                    from tgbot.database.db_users import Userx
                                    try:
                                        Userx.update(message.from_user.id, user_referrer=referral_code)
                                        print(f"💾 Saved referrer code '{referral_code}' for user {user_id}")
                                    except Exception as db_err:
                                        print(f"❌ Error saving referrer to DB: {db_err}")
                                    
                                    # Убрали сообщение - только логирование
                                    print(f"✅ Referral registered: {user_id} -> {referrer_id}")
                                    # НЕ делаем return - пользователь увидит обычное приветствие
                                elif result.get('message') == 'Already referred':
                                    # Убрали сообщение - пользователь уже знает
                                    print(f"ℹ️ User {user_id} already referred")
                                else:
                                    print(f"⚠️ Unexpected response: status={resp.status}, result={result}")
                        except aiohttp.ClientError as e:
                            print(f"❌ Network error registering referral: {type(e).__name__}: {str(e)}")
                        except asyncio.TimeoutError:
                            print(f"❌ Timeout registering referral - server did not respond in 10 seconds")
                        except Exception as e:
                            print(f"❌ Error registering referral: {type(e).__name__}: {str(e)}")
                else:
                    print(f"⚠️ User tried to refer themselves: {user_id}")
            except ValueError as e:
                # Невалидный код - игнорируем
                print(f"⚠️ Invalid referral code: {args} - {e}")



    # Получаем username бота для Web App
    bot_info = await bot.get_me()
    bot_username = bot_info.username
    
    # Приветственное сообщение с баннером и inline-кнопками
    welcome_text = "🔥 Добро пожаловать в TwinsUp! 🍀"
    
    # Путь к локальному баннеру
    import os
    banner_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'banner', 'welcome.jpg')
    
    try:
        # Отправляем фото из локального файла
        from aiogram.types import FSInputFile
        photo = FSInputFile(banner_path)
        await bot.send_photo(
            chat_id=message.from_user.id,
            photo=photo,
            caption=welcome_text,
            reply_markup=user_welcome_finl(bot_username)
        )
    except Exception as e:
        # Если баннер не загружается, отправляем просто текст
        print(f"⚠️ Error sending photo: {e}")
        await message.answer(
            welcome_text,
            reply_markup=user_welcome_finl(bot_username)
        )

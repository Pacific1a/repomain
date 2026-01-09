# - *- coding: utf- 8 - *-
"""
ПРОСМОТР РЕФЕРАЛОВ В БОТЕ
Показывает партнёру список приглашенных пользователей
"""
from aiogram import Router, Bot, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
import aiohttp

from tgbot.data.config import SERVER_API_URL, PARTNER_API_SECRET
from tgbot.database.db_users import Userx
from tgbot.keyboards.inline_user import user_referrals_kb
from tgbot.utils.const_functions import ded

router = Router(name=__name__)


@router.message(Command("my_referrals", "referrals"))
async def cmd_my_referrals(message: Message, bot: Bot):
    """
    Команда /my_referrals - показать список рефералов
    """
    user_id = str(message.from_user.id)
    
    # Получить список рефералов с сервера
    async with aiohttp.ClientSession() as session:
        try:
            # Запрос к Node.js API
            async with session.get(
                f"{SERVER_API_URL}/api/referral/{user_id}",
                headers={'X-API-Secret': PARTNER_API_SECRET},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    referrals = data.get('referrals', [])
                    stats = data.get('stats', {})
                    
                    if len(referrals) == 0:
                        return await message.answer(
                            "📋 <b>Мои рефералы</b>\n\n"
                            "У вас пока нет приглашенных пользователей.\n"
                            "Поделитесь своей реферальной ссылкой чтобы начать зарабатывать!"
                        )
                    
                    # Форматируем список
                    text = f"📋 <b>Мои рефералы ({len(referrals)})</b>\n\n"
                    
                    for i, ref in enumerate(referrals[:20], 1):  # Показываем первых 20
                        nickname = ref.get('nickname') or f"User{ref.get('userId')}"
                        
                        # Получаем первую букву для "аватарки"
                        initial = nickname[0].upper() if nickname else "U"
                        
                        # Эмодзи "аватарка" на основе первой буквы
                        emoji_avatar = get_emoji_avatar(initial)
                        
                        deposits = ref.get('totalDeposits', 0)
                        losses = ref.get('totalLosses', 0)
                        
                        text += f"{emoji_avatar} <b>{nickname}</b>\n"
                        text += f"   💰 Депозиты: {deposits}₽\n"
                        text += f"   📉 Проигрыши: {losses}₽\n"
                        
                        if i < len(referrals):
                            text += "\n"
                    
                    if len(referrals) > 20:
                        text += f"\n<i>... и еще {len(referrals) - 20}</i>"
                    
                    # Добавляем общую статистику
                    total_earnings = stats.get('earnings', 0)
                    text += f"\n\n💵 <b>Ваш заработок: {total_earnings}₽</b>"
                    
                    await message.answer(text, parse_mode="HTML")
                    
                else:
                    await message.answer(
                        "❌ Не удалось загрузить список рефералов.\n"
                        "Попробуйте позже."
                    )
                    
        except Exception as e:
            print(f"❌ Error loading referrals: {e}")
            await message.answer(
                "❌ Ошибка при загрузке данных.\n"
                "Попробуйте позже."
            )


@router.callback_query(F.data == "user_referrals")
async def cb_user_referrals(call: CallbackQuery, bot: Bot):
    """
    Кнопка "Мои рефералы" в меню
    """
    await call.answer()
    
    user_id = str(call.from_user.id)
    
    # Получить список рефералов с сервера
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                f"{SERVER_API_URL}/api/referral/{user_id}",
                headers={'X-API-Secret': PARTNER_API_SECRET},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    referrals = data.get('referrals', [])
                    stats = data.get('stats', {})
                    
                    if len(referrals) == 0:
                        return await call.message.answer(
                            "📋 <b>Мои рефералы</b>\n\n"
                            "У вас пока нет приглашенных пользователей.\n"
                            "Поделитесь своей реферальной ссылкой!"
                        )
                    
                    # Форматируем список
                    text = f"📋 <b>Мои рефералы ({len(referrals)})</b>\n\n"
                    
                    for i, ref in enumerate(referrals[:20], 1):
                        nickname = ref.get('nickname') or f"User{ref.get('userId')}"
                        initial = nickname[0].upper() if nickname else "U"
                        emoji_avatar = get_emoji_avatar(initial)
                        
                        deposits = ref.get('totalDeposits', 0)
                        losses = ref.get('totalLosses', 0)
                        
                        text += f"{emoji_avatar} <b>{nickname}</b>\n"
                        text += f"   💰 Депозиты: {deposits}₽\n"
                        text += f"   📉 Проигрыши: {losses}₽\n"
                        
                        if i < len(referrals):
                            text += "\n"
                    
                    if len(referrals) > 20:
                        text += f"\n<i>... и еще {len(referrals) - 20}</i>"
                    
                    total_earnings = stats.get('earnings', 0)
                    text += f"\n\n💵 <b>Ваш заработок: {total_earnings}₽</b>"
                    
                    await call.message.answer(text, parse_mode="HTML")
                    
                else:
                    await call.message.answer(
                        "❌ Не удалось загрузить список рефералов."
                    )
                    
        except Exception as e:
            print(f"❌ Error loading referrals: {e}")
            await call.message.answer("❌ Ошибка при загрузке данных.")


def get_emoji_avatar(letter):
    """
    Возвращает эмодзи "аватарку" на основе первой буквы
    """
    emoji_map = {
        'A': '🔵', 'B': '🟢', 'C': '🟡', 'D': '🟠', 
        'E': '🔴', 'F': '🟣', 'G': '🟤', 'H': '⚫',
        'I': '🔵', 'J': '🟢', 'K': '🟡', 'L': '🟠',
        'M': '🔴', 'N': '🟣', 'O': '🟤', 'P': '⚫',
        'Q': '🔵', 'R': '🟢', 'S': '🟡', 'T': '🟠',
        'U': '🔴', 'V': '🟣', 'W': '🟤', 'X': '⚫',
        'Y': '🔵', 'Z': '🟢',
        # Кириллица
        'А': '🔵', 'Б': '🟢', 'В': '🟡', 'Г': '🟠',
        'Д': '🔴', 'Е': '🟣', 'Ё': '🟤', 'Ж': '⚫',
        'З': '🔵', 'И': '🟢', 'Й': '🟡', 'К': '🟠',
        'Л': '🔴', 'М': '🟣', 'Н': '🟤', 'О': '⚫',
        'П': '🔵', 'Р': '🟢', 'С': '🟡', 'Т': '🟠',
        'У': '🔴', 'Ф': '🟣', 'Х': '🟤', 'Ц': '⚫',
        'Ч': '🔵', 'Ш': '🟢', 'Щ': '🟡', 'Ъ': '🟠',
        'Ы': '🔴', 'Ь': '🟣', 'Э': '🟤', 'Ю': '⚫',
        'Я': '🔵',
    }
    
    return emoji_map.get(letter.upper(), '⚪')

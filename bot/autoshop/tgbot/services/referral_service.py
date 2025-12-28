# - *- coding: utf- 8 - *-
"""
Сервис для интеграции с реферальной системой партнёрской программы
"""
import aiohttp
import asyncio
from typing import Optional

from tgbot.data.config import SERVER_API_URL, PARTNER_API_SECRET


class ReferralService:
    """Сервис для работы с реферальной системой"""
    
    @staticmethod
    async def register_click(user_id: str, referrer_code: str) -> bool:
        """
        Зарегистрировать переход по реферальной ссылке
        
        Args:
            user_id: Telegram ID пользователя
            referrer_code: Реферальный код (userId или userId_CODE)
        
        Returns:
            True если успешно, False если ошибка
        """
        try:
            # Извлечь userId из referrer_code если формат userId_CODE
            if '_' in referrer_code:
                referrer_id = referrer_code.split('_')[0]
            else:
                # Декодировать из base36 (если используется)
                try:
                    referrer_id = str(int(referrer_code, 36))
                except:
                    referrer_id = referrer_code
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{SERVER_API_URL}/api/referral/register",
                    json={
                        "userId": user_id,
                        "referrerId": referrer_id
                    },
                    headers={'X-API-Secret': PARTNER_API_SECRET},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    
                    if resp.status == 200 and result.get('success'):
                        print(f"✅ Referral click registered: {user_id} → {referrer_id}")
                        return True
                    else:
                        print(f"⚠️ Referral click failed: {result.get('message', 'Unknown error')}")
                        return False
                        
        except asyncio.TimeoutError:
            print(f"❌ Timeout registering referral click")
            return False
        except Exception as e:
            print(f"❌ Error registering referral click: {e}")
            return False
    
    @staticmethod
    async def register_first_deposit(user_id: str, referrer_code: str, amount: float) -> bool:
        """
        Зарегистрировать первый депозит пользователя
        
        Args:
            user_id: Telegram ID пользователя
            referrer_code: Реферальный код партнёра
            amount: Сумма пополнения
        
        Returns:
            True если успешно
        """
        if not referrer_code or amount <= 0:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{SERVER_API_URL}/api/referral/register-referral",
                    json={
                        "referralCode": referrer_code,
                        "referralUserId": str(user_id),
                        "depositAmount": amount
                    },
                    headers={'X-API-Secret': PARTNER_API_SECRET},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    
                    if resp.status == 200:
                        print(f"✅ First deposit registered: {user_id} → {amount}₽")
                        return True
                    else:
                        print(f"⚠️ First deposit failed: {result.get('message')}")
                        return False
                        
        except Exception as e:
            print(f"❌ Error registering first deposit: {e}")
            return False
    
    @staticmethod
    async def register_repeated_deposit(user_id: str, referrer_code: str, amount: float) -> bool:
        """
        Зарегистрировать повторное пополнение
        
        Args:
            user_id: Telegram ID пользователя
            referrer_code: Реферальный код партнёра
            amount: Сумма пополнения
        
        Returns:
            True если успешно
        """
        if not referrer_code or amount <= 0:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{SERVER_API_URL}/api/referral/update-deposit",
                    json={
                        "referralCode": referrer_code,
                        "referralUserId": str(user_id),
                        "depositAmount": amount
                    },
                    headers={'X-API-Secret': PARTNER_API_SECRET},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        print(f"✅ Deposit updated: {user_id} → {amount}₽")
                        return True
                    else:
                        result = await resp.json()
                        print(f"⚠️ Deposit update failed: {result.get('message')}")
                        return False
                        
        except Exception as e:
            print(f"❌ Error updating deposit: {e}")
            return False
    
    @staticmethod
    async def register_game_loss(user_id: str, referrer_code: str, loss_amount: float, game_name: str = "unknown") -> bool:
        """
        Зарегистрировать проигрыш в игре (партнёр получает 60%)
        
        Args:
            user_id: Telegram ID пользователя
            referrer_code: Реферальный код партнёра
            loss_amount: Сумма проигрыша
            game_name: Название игры (для логов)
        
        Returns:
            True если успешно
        """
        if not referrer_code or loss_amount <= 0:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{SERVER_API_URL}/api/referral/add-earnings",
                    json={
                        "referralCode": referrer_code,
                        "referralUserId": str(user_id),
                        "lossAmount": loss_amount
                    },
                    headers={'X-API-Secret': PARTNER_API_SECRET},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    result = await resp.json()
                    
                    if resp.status == 200:
                        partner_earnings = result.get('earnings', 0)
                        print(f"✅ Earnings added [{game_name}]: loss={loss_amount}₽, partner_gets={partner_earnings}₽ (60%)")
                        return True
                    else:
                        print(f"⚠️ Earnings failed [{game_name}]: {result.get('message')}")
                        return False
                        
        except Exception as e:
            print(f"❌ Error adding earnings [{game_name}]: {e}")
            return False

# - *- coding: utf- 8 - *-
import json
from typing import Union

from aiogram import Bot
from aiogram.types import Message, CallbackQuery
from aiohttp import ClientConnectorCertificateError

from tgbot.database.db_payments import Paymentsx
from tgbot.utils.const_functions import ded, send_errors, gen_id
from tgbot.utils.misc.bot_models import ARS
from tgbot.utils.misc_functions import send_admins


# Апи работы с QIWI
class CactusPayAPI:
    def __init__(
            self,
            bot: Bot,
            arSession: ARS,
            update: Union[Message, CallbackQuery] = None,
            token: str = None,
            skipping_error: bool = False,
    ):
        if token is not None:
            self.token = token
        else:
            get_payment = Paymentsx.get()
            self.token = get_payment.cactuspay_token

        self.headers = {
            'Content-Type': 'application/json',
        }

        self.bot = bot
        self.arSession = arSession
        self.update = update
        self.skipping_error = skipping_error

    # Запрос платежа
    async def get_payment_url(self, pay_amount, bill_receipt):
        session         = await self.arSession.get_session()
        url             = f"https://lk.cactuspay.pro/api/?method=create"
        response        = await session.post(url, json={"token": self.token, "amount": pay_amount, "order_id": bill_receipt}, ssl=True)
        
        try:
            response_data = json.loads((await response.read()).decode())
            print(f"🔍 CactusPay create response: {response_data}")
            
            # Проверяем разные форматы ответа
            if isinstance(response_data, dict):
                # Вариант 1: {"response": {"url": "..."}}
                if 'response' in response_data and isinstance(response_data['response'], dict):
                    return response_data['response'].get('url', None)
                # Вариант 2: {"url": "..."}
                elif 'url' in response_data:
                    return response_data['url']
                # Вариант 3: {"payment_url": "..."}
                elif 'payment_url' in response_data:
                    return response_data['payment_url']
            
            print(f"❌ Unexpected CactusPay response format: {response_data}")
            return None
        except Exception as e:
            print(f"❌ Error parsing CactusPay response: {e}")
            try:
                response_text = (await response.read()).decode()
                print(f"❌ Raw response: {response_text}")
            except:
                pass
            return None

    # Генерация платежа
    async def bill(self, pay_amount: float) -> tuple[str, str, int]:
        bill_receipt    = gen_id()
        bill_url        = await self.get_payment_url(pay_amount, bill_receipt)
        
        if not bill_url:
            # Если не получили URL - возвращаем ошибку
            return "❌ Ошибка создания платежа. Обратитесь в поддержку.", None, None
        bill_message    = ded(f"""
            <b>💰 Пополнение баланса</b>
            ➖➖➖➖➖➖➖➖➖➖
            ▪️ Для пополнения баланса, нажмите на кнопку ниже 
            <code>Перейти к оплате</code> и оплатите выставленный вам счёт
            ▪️ Комментарий: <code>{bill_receipt}</code>
            ▪️ Сумма пополнения: <code>{pay_amount}₽</code>
            ➖➖➖➖➖➖➖➖➖➖
            ❗️ После оплаты, нажмите на <code>Проверить оплату</code>
        """)

        return bill_message, bill_url, bill_receipt

    # Проверка платежа
    async def bill_check(self, receipt: Union[str, int]) -> tuple[int, float]:

        session         = await self.arSession.get_session()
        url             = f"https://lk.cactuspay.pro/api/?method=get"
        response        = await session.post(url, json={"token": self.token, "order_id": receipt}, ssl=True)
        
        try:
            response_data = json.loads((await response.read()).decode())
            print(f"🔍 CactusPay check response: {response_data}")
            
            pay_status      = 1
            pay_amount      = None

            # Проверяем формат ответа
            if isinstance(response_data, dict):
                # Проверяем статус
                if 'status' in response_data and response_data['status']:
                    pay_status = 2  # Pending
                    
                    # Вариант 1: {"response": {"status": "ACCEPT", "amount": 100}}
                    if 'response' in response_data and isinstance(response_data['response'], dict):
                        if response_data['response'].get('status') == "ACCEPT":
                            pay_amount = int(float(response_data['response'].get('amount', 0)))
                            pay_status = 0
                    # Вариант 2: {"status": "ACCEPT", "amount": 100}
                    elif response_data.get('status') == "ACCEPT":
                        pay_amount = int(float(response_data.get('amount', 0)))
                        pay_status = 0

            return pay_status, pay_amount
        except Exception as e:
            print(f"❌ Error checking CactusPay payment: {e}")
            return 1, None
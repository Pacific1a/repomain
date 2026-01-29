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
    async def bill(self, pay_amount: float, user_id: Union[str, int] = None) -> tuple[str, str, str]:
        # Проверяем минимальную сумму CactusPay
        if pay_amount < 100:
            error_msg = ded(f"""
                <b>❌ Ошибка создания платежа</b>
                ➖➖➖➖➖➖➖➖➖➖
                ▪️ CactusPay принимает платежи от 100₽
                ▪️ Ваша сумма: <code>{pay_amount}₽</code>
                ➖➖➖➖➖➖➖➖➖➖
                💡 Пожалуйста, выберите сумму от 100₽
            """)
            return error_msg, None, None
            
        base_receipt = str(gen_id())
        bill_receipt = f"{user_id}_{base_receipt}" if user_id is not None else base_receipt
        bill_url        = await self.get_payment_url(pay_amount, bill_receipt)
        
        if not bill_url:
            # Если не получили URL - возвращаем ошибку
            error_msg = ded(f"""
                <b>❌ Ошибка создания платежа</b>
                ➖➖➖➖➖➖➖➖➖➖
                ▪️ Не удалось создать платеж
                ▪️ Попробуйте позже или обратитесь в поддержку
            """)
            return error_msg, None, None
            
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
    async def bill_check(self, receipt: Union[str, int]) -> tuple[int, float, str]:

        session         = await self.arSession.get_session()
        url             = f"https://lk.cactuspay.pro/api/?method=get"
        response        = await session.post(url, json={"token": self.token, "order_id": receipt}, ssl=True)
        
        try:
            response_data = json.loads((await response.read()).decode())
            print(f"🔍 CactusPay check response: {response_data}")
            
            pay_status      = 1  # По умолчанию: ошибка
            pay_amount      = None
            payment_method  = None

            # Проверяем формат ответа
            if isinstance(response_data, dict) and 'response' in response_data:
                payment_info = response_data['response']
                
                if isinstance(payment_info, dict):
                    payment_status = payment_info.get('status', '').upper()
                    amount_str = payment_info.get('amount', '0')
                    
                    # Извлекаем информацию о методе оплаты
                    # CactusPay может возвращать разные поля: method, bank, payment_method, wallet, card
                    payment_method = (
                        payment_info.get('bank') or 
                        payment_info.get('method') or 
                        payment_info.get('payment_method') or
                        payment_info.get('wallet') or
                        payment_info.get('card_type') or
                        payment_info.get('service')
                    )
                    
                    print(f"📊 Статус платежа: {payment_status}, Сумма: {amount_str}, Метод: {payment_method}")
                    
                    # Обрабатываем разные статусы
                    if payment_status == 'ACCEPT' or payment_status == 'PAID' or payment_status == 'SUCCESS':
                        # Платеж успешно оплачен
                        pay_amount = int(float(amount_str))
                        pay_status = 0  # Успех
                        print(f"✅ Платеж успешен: {pay_amount}₽ через {payment_method}")
                    elif payment_status == 'WAIT' or payment_status == 'PENDING':
                        # Платеж ожидает оплаты
                        pay_status = 2  # Ожидание
                        print(f"⏳ Платеж ожидает оплаты")
                    elif payment_status == 'CANCEL' or payment_status == 'CANCELLED':
                        # Платеж отменен
                        pay_status = 4  # Отменен
                        print(f"❌ Платеж отменен")
                    else:
                        # Неизвестный статус
                        pay_status = 1  # Ошибка
                        print(f"⚠️ Неизвестный статус: {payment_status}")
                else:
                    print(f"⚠️ response не является dict: {payment_info}")
            else:
                print(f"⚠️ Неожиданный формат ответа: {response_data}")

            return pay_status, pay_amount, payment_method
        except Exception as e:
            print(f"❌ Error checking CactusPay payment: {e}")
            import traceback
            traceback.print_exc()
            return 1, None, None

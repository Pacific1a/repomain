/**
 * Telegram бот для обработки заявок на вывод средств
 * Ручная система выплат
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

// Конфигурация
const BOT_TOKEN = process.env.WITHDRAWAL_BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim()));
const CHAT_ID = parseInt(process.env.CHAT_ID || '0'); // ID группового чата
const BOT_SECRET = process.env.BOT_SECRET || 'your-secret-key-here';
const SERVER_API_URL = process.env.SERVER_API_URL || 'http://localhost:3001';
const PORT = process.env.PORT || 3002;

if (!BOT_TOKEN) {
    console.error('❌ WITHDRAWAL_BOT_TOKEN не найден в .env');
    process.exit(1);
}

if (ADMIN_IDS.length === 0 || ADMIN_IDS[0] === 0) {
    console.error('❌ ADMIN_IDS не настроены в .env');
    process.exit(1);
}

if (!CHAT_ID || CHAT_ID === 0) {
    console.error('❌ CHAT_ID не настроен в .env');
    process.exit(1);
}

// Создаём бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Express сервер для приёма заявок
const app = express();
app.use(express.json());

console.log('🤖 Withdrawal Bot запущен!');
console.log(`👥 Админы: ${ADMIN_IDS.join(', ')}`);
console.log(`💬 Чат для заявок: ${CHAT_ID}`);

/**
 * Приём заявки от партнёрского сервера
 */
app.post('/api/withdrawal', async (req, res) => {
    try {
        // Проверка секрета
        const secret = req.headers['x-bot-secret'];
        if (secret !== BOT_SECRET) {
            return res.status(403).json({ error: 'Invalid secret' });
        }

        const {
            requestId,
            userId,
            email,
            telegram,
            amount,
            usdtAddress,
            referralsCount,
            totalEarnings
        } = req.body;

        // Формируем красивое сообщение
        const message = `
🆕 <b>НОВАЯ ЗАЯВКА НА ВЫВОД</b>

💰 <b>Сумма:</b> ${amount}₽

👤 <b>Информация о пользователе:</b>
├ ID: <code>${userId}</code>
├ Email: <code>${email}</code>
├ Telegram: ${telegram || 'не указан'}

📊 <b>Статистика:</b>
├ Рефералов: ${referralsCount}
├ Заработано: ${totalEarnings}₽

💳 <b>USDT TRC20 адрес:</b>
<code>${usdtAddress}</code>

🆔 <b>Заявка #${requestId}</b>
`;

        // Кнопки для обработки
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Одобрить', callback_data: `approve_${requestId}` },
                    { text: '❌ Отклонить', callback_data: `reject_${requestId}` }
                ]
            ]
        };

        // Отправляем в групповой чат
        try {
            await bot.sendMessage(CHAT_ID, message, {
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            console.log(`✅ Заявка #${requestId} отправлена в чат ${CHAT_ID}`);
        } catch (error) {
            console.error(`❌ Ошибка отправки в чат ${CHAT_ID}:`, error.message);
            return res.status(500).json({ error: 'Failed to send to chat', details: error.message });
        }

        res.json({ success: true, message: 'Sent to chat' });

    } catch (error) {
        console.error('Ошибка обработки заявки:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Обработка нажатий на кнопки
 */
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const data = query.data;

    // Проверяем что это админ (по ID пользователя, не чата)
    if (!ADMIN_IDS.includes(userId)) {
        await bot.answerCallbackQuery(query.id, {
            text: '❌ У вас нет прав для этого действия',
            show_alert: true
        });
        console.log(`❌ Попытка доступа от не-админа: ${userId} (@${query.from.username || 'unknown'})`);
        return;
    }

    try {
        // Парсим action и requestId
        const [action, requestId] = data.split('_');

        if (action === 'approve') {
            // Одобрение заявки
            await approveWithdrawal(requestId, query.from.username || query.from.first_name);

            // Обновляем сообщение
            const newText = query.message.text + '\n\n✅ <b>ОДОБРЕНО</b>\n👤 ' + (query.from.username ? `@${query.from.username}` : query.from.first_name);
            await bot.editMessageText(newText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });

            // Убираем кнопки
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: chatId,
                message_id: messageId
            });

            await bot.answerCallbackQuery(query.id, {
                text: '✅ Заявка одобрена! Баланс пользователя обнулён.',
                show_alert: true
            });

        } else if (action === 'reject') {
            // Отклонение заявки - запрашиваем причину
            await bot.answerCallbackQuery(query.id, {
                text: '❌ Отклонение заявки. Введите причину в следующем сообщении.',
                show_alert: true
            });

            // Сохраняем состояние ожидания причины
            global.waitingForReason = global.waitingForReason || {};
            global.waitingForReason[userId] = {
                requestId,
                chatId,
                messageId,
                adminName: query.from.username || query.from.first_name
            };

            // Отправляем запрос причины
            await bot.sendMessage(chatId, `💬 Введите причину отклонения заявки #${requestId}:`, {
                reply_to_message_id: messageId
            });
        }

    } catch (error) {
        console.error('Ошибка обработки callback:', error);
        await bot.answerCallbackQuery(query.id, {
            text: '❌ Ошибка обработки заявки',
            show_alert: true
        });
    }
});

/**
 * Одобрение заявки - обнуление баланса
 */
async function approveWithdrawal(requestId, adminName) {
    try {
        await axios.post(`${SERVER_API_URL}/api/withdrawal/approve`, {
            requestId,
            adminName
        }, {
            headers: {
                'X-Bot-Secret': BOT_SECRET
            }
        });
    } catch (error) {
        console.error('Ошибка одобрения заявки:', error.message);
        throw error;
    }
}

/**
 * Отклонение заявки
 */
async function rejectWithdrawal(requestId, adminName, comment) {
    try {
        await axios.post(`${SERVER_API_URL}/api/withdrawal/reject`, {
            requestId,
            adminName,
            comment
        }, {
            headers: {
                'X-Bot-Secret': BOT_SECRET
            }
        });
    } catch (error) {
        console.error('Ошибка отклонения заявки:', error.message);
        throw error;
    }
}

/**
 * Обработка текстовых сообщений (для причины отклонения)
 */
bot.on('message', async (msg) => {
    // Игнорируем команды
    if (msg.text && msg.text.startsWith('/')) return;
    
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    // Проверяем есть ли ожидание причины от этого админа
    if (global.waitingForReason && global.waitingForReason[userId]) {
        const { requestId, chatId: originalChatId, messageId, adminName } = global.waitingForReason[userId];
        const reason = msg.text;
        
        // Удаляем состояние ожидания
        delete global.waitingForReason[userId];
        
        try {
            // Отклоняем заявку с причиной
            await rejectWithdrawal(requestId, adminName, reason);
            
            // Обновляем исходное сообщение
            const updatedText = `${msg.reply_to_message?.text || ''}\n\n❌ <b>ОТКЛОНЕНО</b>\n👤 ${adminName}\n📝 Причина: <i>${reason}</i>`;
            
            await bot.editMessageText(updatedText, {
                chat_id: originalChatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });
            
            // Убираем кнопки
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                chat_id: originalChatId,
                message_id: messageId
            });
            
            // Удаляем сообщение с запросом причины
            try {
                await bot.deleteMessage(chatId, msg.reply_to_message?.message_id);
            } catch {}
            
            // Удаляем сообщение с причиной
            try {
                await bot.deleteMessage(chatId, msg.message_id);
            } catch {}
            
            // Подтверждение
            await bot.sendMessage(chatId, `✅ Заявка #${requestId} отклонена с причиной: "${reason}"`);
            
        } catch (error) {
            console.error('Ошибка отклонения с причиной:', error);
            await bot.sendMessage(chatId, `❌ Ошибка отклонения заявки: ${error.message}`);
        }
    }
});

/**
 * Команда /start
 */
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    if (ADMIN_IDS.includes(chatId)) {
        await bot.sendMessage(chatId, '👋 Привет, админ! Я буду присылать сюда заявки на вывод средств.');
    } else {
        await bot.sendMessage(chatId, '❌ У вас нет доступа к этому боту.');
    }
});

/**
 * Express сервер
 */
app.listen(PORT, () => {
    console.log(`🌐 API сервер запущен на порту ${PORT}`);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('SIGINT', () => {
    console.log('\n👋 Бот остановлен');
    process.exit(0);
});

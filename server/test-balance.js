// Тестовый скрипт для проверки чтения баланса из базы данных бота
const Database = require('better-sqlite3');
const path = require('path');

const BOT_DB_PATH = path.join(__dirname, '..', 'autoshop', 'tgbot', 'data', 'database.db');

console.log('📁 Путь к базе данных:', BOT_DB_PATH);

try {
  const db = new Database(BOT_DB_PATH, { readonly: true });
  
  // Получаем всех пользователей
  const users = db.prepare('SELECT user_id, user_name, user_balance FROM storage_users').all();
  
  console.log(`\n👥 Найдено пользователей: ${users.length}\n`);
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.user_id}, Имя: ${user.user_name}, Баланс: ${user.user_balance}₽`);
  });
  
  db.close();
  console.log('\n✅ Тест успешно завершен!');
} catch (error) {
  console.error('❌ Ошибка:', error);
}

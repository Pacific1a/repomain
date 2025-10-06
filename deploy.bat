@echo off
echo 🚀 Деплой Telegram Games Platform
echo.

echo 📦 Добавляем изменения в Git...
git add .

echo 💬 Введите сообщение коммита:
set /p commit_msg="Commit message: "

git commit -m "%commit_msg%"

echo 📤 Пушим в GitHub...
git push

echo ✅ Деплой завершен!
echo.
echo 🌐 Vercel автоматически задеплоит фронтенд
echo 🌐 Render автоматически задеплоит сервер
echo.
pause

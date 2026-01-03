document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.sign-in .group');
    const emailInput = form.querySelector('.email[type="email"]');
    const passwordInputs = form.querySelectorAll('.password');
    const usernameInput = form.querySelector('.email[type="username"]');
    const checkbox = form.querySelector('input[type="checkbox"]');
    const registerButton = form.querySelector('.login-button');
    
    // Получаем реферальный код партнёра из URL (?partner=CODE)
    const urlParams = new URLSearchParams(window.location.search);
    const partnerCode = urlParams.get('partner');
    
    if (partnerCode) {
        console.log('🔗 Регистрация по партнёрской ссылке:', partnerCode);
    }
    
    registerButton.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInputs[0].value;
        const passwordConfirm = passwordInputs[1].value;
        const telegram = usernameInput.value.trim();
        
        if (!email || !password || !passwordConfirm || !telegram) {
            Toast.warning('Заполните все обязательные поля');
            return;
        }
        
        // Проверка email (только английские буквы)
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            Toast.error('Недопустимый формат Email. Используйте только латиницу');
            return;
        }
        
        // Проверка пароля (только английские буквы и цифры)
        const passwordRegex = /^[a-zA-Z0-9]+$/;
        if (!passwordRegex.test(password)) {
            Toast.error('Недопустимые символы в пароле. Разрешены только латинские буквы и цифры');
            return;
        }
        
        if (password.length < 6) {
            Toast.error('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        if (password !== passwordConfirm) {
            Toast.error('Пароли не совпадают');
            return;
        }
        
        // Проверка Telegram username (должна быть хотя бы одна буква)
        const telegramRegex = /^@?(?=.*[a-zA-Z])[a-zA-Z0-9_]{5,32}$/;
        if (!telegramRegex.test(telegram)) {
            Toast.error('Некорректный Telegram username. Требования: 5-32 символа, минимум одна латинская буква, допускаются цифры и подчеркивание');
            return;
        }
        
        if (!checkbox.checked) {
            Toast.warning('Необходимо принять условия пользовательского соглашения');
            return;
        }
        
        const login = email.split('@')[0];
        
        // Передаём partnerCode как referralCode для привязки к супер-партнёру
        const result = await API.register(email, login, password, telegram, partnerCode);
        
        if (result.success) {
            Toast.success('Регистрация успешно завершена');
            setTimeout(() => {
                window.location.href = '../../dashboard/index.html';
            }, 1000);
        } else {
            // Проверяем если аккаунт уже существует
            if (result.message && result.message.includes('already exists')) {
                Toast.error('Учётная запись с указанным Email или логином уже зарегистрирована в системе', 5000);
            } else {
                const errorMsg = result.errors 
                    ? result.errors.map(e => e.msg).join('<br>')
                    : result.message;
                Toast.error('Ошибка регистрации: ' + errorMsg, 5000);
            }
        }
    });
});

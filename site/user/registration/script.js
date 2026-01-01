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
            Toast.warning('Пожалуйста, заполните все поля');
            return;
        }
        
        if (password !== passwordConfirm) {
            Toast.error('Пароли не совпадают');
            return;
        }
        
        if (!checkbox.checked) {
            Toast.warning('Необходимо принять правила');
            return;
        }
        
        const login = email.split('@')[0];
        
        // Передаём partnerCode как referralCode для привязки к супер-партнёру
        const result = await API.register(email, login, password, telegram, partnerCode);
        
        if (result.success) {
            Toast.success('Регистрация успешна! Перенаправление...');
            setTimeout(() => {
                window.location.href = '../../dashboard/index.html';
            }, 1000);
        } else {
            const errorMsg = result.errors 
                ? result.errors.map(e => e.msg).join('<br>')
                : result.message;
            Toast.error('Ошибка регистрации: ' + errorMsg, 5000);
        }
    });
});

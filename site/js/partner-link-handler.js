// ============================================
// PARTNER LINK HANDLER
// Сохраняет partner code из URL при переходе на сайт
// ============================================

(function() {
    // Читаем параметр ?partner=CODE из URL
    const urlParams = new URLSearchParams(window.location.search);
    const partnerCode = urlParams.get('partner');
    
    if (partnerCode) {
        console.log('🔗 Обнаружен партнёрский код:', partnerCode);
        
        // Сохраняем в localStorage (срок действия: 30 дней)
        const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        localStorage.setItem('partnerCode', partnerCode);
        localStorage.setItem('partnerCodeExpiry', expirationTime);
        
        console.log('💾 Партнёрский код сохранён в localStorage');
    } else {
        // Проверяем есть ли сохранённый код
        const savedCode = localStorage.getItem('partnerCode');
        const expiry = localStorage.getItem('partnerCodeExpiry');
        
        if (savedCode && expiry) {
            const now = Date.now();
            
            if (now < parseInt(expiry)) {
                console.log('🔗 Найден сохранённый партнёрский код:', savedCode);
            } else {
                console.log('⏰ Партнёрский код истёк');
                localStorage.removeItem('partnerCode');
                localStorage.removeItem('partnerCodeExpiry');
            }
        }
    }
    
    // Обработчик для ссылок на регистрацию
    document.addEventListener('DOMContentLoaded', function() {
        const registrationLinks = document.querySelectorAll('a[href*="registration"]');
        
        registrationLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const savedCode = localStorage.getItem('partnerCode');
                const expiry = localStorage.getItem('partnerCodeExpiry');
                
                if (savedCode && expiry && Date.now() < parseInt(expiry)) {
                    // Добавляем параметр к ссылке
                    const href = this.getAttribute('href');
                    
                    if (href && !href.includes('?partner=')) {
                        const separator = href.includes('?') ? '&' : '?';
                        const newHref = href + separator + 'partner=' + savedCode;
                        this.setAttribute('href', newHref);
                        
                        console.log('🔗 Добавлен partner к ссылке:', newHref);
                    }
                }
            });
        });
    });
})();

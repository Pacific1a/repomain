// ============================================
// ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА
// ============================================
(function() {
    'use strict';
    
    function createLanguageSwitcher() {
        // Проверяем, не создан ли уже переключатель
        if (document.querySelector('.language-switcher')) {
            return;
        }
        
        // Создаем HTML для переключателя
        const switcherHTML = `
            <div class="language-switcher">
                <button class="lang-btn" data-lang="ru" title="Русский">
                    <span class="flag">🇷🇺</span>
                </button>
                <button class="lang-btn" data-lang="en" title="English">
                    <span class="flag">🇬🇧</span>
                </button>
            </div>
        `;
        
        // Вставляем стили
        const style = document.createElement('style');
        style.textContent = `
            .language-switcher {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                gap: 8px;
                z-index: 1000;
                background: rgba(28, 26, 26, 0.95);
                padding: 6px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .lang-btn {
                all: unset;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s ease;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid transparent;
            }
            
            .lang-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: scale(1.05);
            }
            
            .lang-btn.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-color: rgba(255, 255, 255, 0.3);
                box-shadow: 0 0 12px rgba(102, 126, 234, 0.5);
            }
            
            .lang-btn .flag {
                font-size: 20px;
                line-height: 1;
            }
            
            /* Адаптация для мобильных */
            @media (max-width: 768px) {
                .language-switcher {
                    top: 10px;
                    right: 10px;
                    padding: 4px;
                }
                
                .lang-btn {
                    width: 32px;
                    height: 32px;
                }
                
                .lang-btn .flag {
                    font-size: 18px;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Вставляем переключатель в body
        const div = document.createElement('div');
        div.innerHTML = switcherHTML;
        document.body.appendChild(div.firstElementChild);
        
        // Получаем кнопки
        const buttons = document.querySelectorAll('.lang-btn');
        
        // Устанавливаем активную кнопку
        function updateActiveButton() {
            const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'ru';
            buttons.forEach(btn => {
                const lang = btn.getAttribute('data-lang');
                if (lang === currentLang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        // Обработчики кликов
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const lang = button.getAttribute('data-lang');
                
                if (window.i18n) {
                    const success = window.i18n.setLanguage(lang);
                    if (success) {
                        updateActiveButton();
                        
                        // Показываем уведомление (если есть функция showToast)
                        if (typeof showToast === 'function') {
                            showToast(window.i18n.t('language_changed'));
                        }
                    }
                } else {
                    console.error('❌ i18n not loaded');
                }
            });
        });
        
        // Устанавливаем начальное состояние
        updateActiveButton();
        
        console.log('✅ Language switcher created');
    }
    
    // Создаем переключатель после загрузки i18n
    if (window.i18n) {
        createLanguageSwitcher();
    } else {
        // Ждем загрузки i18n
        const checkI18n = setInterval(() => {
            if (window.i18n) {
                clearInterval(checkI18n);
                createLanguageSwitcher();
            }
        }, 100);
        
        // Таймаут на случай если i18n не загрузится
        setTimeout(() => clearInterval(checkI18n), 5000);
    }
})();

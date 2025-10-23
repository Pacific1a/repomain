// Case opening logic with balance integration
(function() {
  'use strict';

  // Ждем загрузки DOM и GlobalBalance
  function initCaseOpener() {
    const cards = document.querySelectorAll('.case-card .cards');
    
    if (!cards.length) {
      console.warn('Cases not found on page');
      return;
    }

    cards.forEach(card => {
      card.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Получаем данные кейса
        const price = parseFloat(card.getAttribute('data-price')) || 0;
        const isChipsCase = card.getAttribute('data-chips') === 'true';
        const caseName = card.querySelector('.text-block h4')?.textContent || 'Case';
        
        // Определяем валюту
        const currency = isChipsCase ? 'chips' : 'rubles';
        const currencySymbol = isChipsCase ? 'chips' : '₽';
        
        console.log(`Opening case: ${caseName}, Price: ${price} ${currency}`);
        
        // Проверяем наличие API
        if (!window.GameBalanceAPI) {
          alert('Система баланса не загружена. Попробуйте перезагрузить страницу.');
          return;
        }
        
        // Проверяем баланс
        if (!window.GameBalanceAPI.canPlaceBet(price, currency)) {
          alert(`Недостаточно средств! Требуется: ${price} ${currencySymbol}`);
          return;
        }
        
        // Подтверждение
        const confirmed = confirm(`Открыть кейс "${caseName}" за ${price} ${currencySymbol}?`);
        if (!confirmed) return;
        
        // Списываем баланс
        const success = await window.GameBalanceAPI.placeBet(price, currency);
        if (!success) {
          alert('Ошибка при списании средств');
          return;
        }
        
        console.log(`✅ Case opened: ${caseName}, ${price} ${currency} deducted`);
        
        // TODO: Здесь должна быть логика открытия кейса и выдачи приза
        // Пока просто показываем уведомление
        showCaseOpenAnimation(card, caseName, price, currencySymbol);
      });
    });
    
    console.log(`✅ Case opener initialized for ${cards.length} cases`);
  }

  // Анимация открытия кейса (заглушка)
  function showCaseOpenAnimation(card, caseName, price, currencySymbol) {
    // Добавляем визуальный эффект
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0.7';
    
    setTimeout(() => {
      card.style.transform = '';
      card.style.opacity = '';
      
      // Показываем результат (в будущем здесь будет настоящая логика)
      alert(`🎉 Кейс "${caseName}" открыт!\n\nВы потратили: ${price} ${currencySymbol}\n\n(Логика выдачи приза будет добавлена позже)`);
    }, 300);
  }

  // Инициализация после загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCaseOpener);
  } else {
    initCaseOpener();
  }
})();

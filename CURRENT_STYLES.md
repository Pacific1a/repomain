# 🎨 ТЕКУЩИЕ СТИЛИ ПОЛЬЗОВАТЕЛЯ (СОХРАНЕНО В ПАМЯТИ)

## ✅ PRIZE CARD (карточка приза):
```css
.prize-card {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  padding: 8px;
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0)),
    url('./assets/bgs-case.svg');
  background-size: cover;
  border: 2.2px solid var(--rarity-color);
}
```

## ✅ PRIZE-PRICE-BADGE (значок цены):
```css
.prize-price-badge {
  position: absolute;
  top: 3px;
  left: 3px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
  height: 1.3em;
  padding: 4px;
  width: 3em;
  border-radius: 9px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.prize-price-badge::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgb(255 255 255 / 28%), rgba(255, 255, 255, 0.05));
  pointer-events: none;
}
```

## ✅ PREVIEW (сетка призов):
```javascript
container.style.display = 'grid';
container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
container.style.gap = '2px';
container.style.padding = '4px';
container.style.justifyItems = 'center';
container.style.justifyContent = 'center';
```

## ✅ CAROUSEL (карусель):
```javascript
carousel.style.gap = '6px';
```

## ⚠️ НЕ ТРОГАТЬ:
- Badge стили (gradient, размеры, позиция)
- Иконка рубля (rubles.png)
- Размер карточек (100x100px)
- Фон карточек (bgs-case.svg)
- Border карточек (2.2px)

## 🎯 НОВЫЕ ТРЕБОВАНИЯ:
1. ✅ Центрировать последнюю карточку если она одна в ряду
2. ✅ Сортировка призов: легендарные → обычные (дорогие → дешевые)

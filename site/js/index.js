

document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const body = item.querySelector(".accordion-body");
  
      if (item.classList.contains("active")) {
        // закрытие
        body.style.maxHeight = body.scrollHeight + "px"; // фиксируем текущую высоту
        requestAnimationFrame(() => {
          body.style.maxHeight = "0";
          body.style.opacity = "0";
          body.style.padding = "0 26px";
        });
        item.classList.remove("active");
      } else {
        // открытие
        body.style.maxHeight = body.scrollHeight + "px";
        body.style.opacity = "1";
        body.style.padding = "16px 26px";
        item.classList.add("active");
      }
    });
  });


// Плавный скролл теперь работает через CSS: scroll-behavior: smooth
// Удален автоматический переход к секциям - теперь только обычная прокрутка
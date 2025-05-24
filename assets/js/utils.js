const Utils = (function () {
  function createElement(type, className, attributes = {}) {
    const element = document.createElement(type);
    if (className) {
      if (Array.isArray(className)) {
        element.classList.add(...className);
      } else {
        element.className = className;
      }
    }

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "text" || key === "textContent") {
        element.textContent = value;
      } else if (key === "html" || key === "innerHTML") {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    return element;
  }

  function formatStatValue(value) {
    if (typeof value === "number") {
      return value.toFixed(2).replace(/\.00$/, "");
    }
    return value;
  }

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  function updateVisibility(element, isVisible) {
    if (!element) return;
    element.style.display = isVisible ? "" : "none";
  }

  function createButton(text, className, clickHandler) {
    const button = createElement("button", className, { text });
    if (clickHandler) {
      button.addEventListener("click", clickHandler);
    }
    return button;
  }

  return {
    createElement,
    formatStatValue,
    debounce,
    updateVisibility,
    createButton,
  };
})();

window.Utils = Utils;

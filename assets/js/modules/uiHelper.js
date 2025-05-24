const UIHelper = {
  showLoading: function () {
    const loader = document.createElement("div");
    loader.className = "loading-overlay";
    loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-circle"></div>
                <div class="loading-text">로딩 중...</div>
            </div>
        `;
    document.body.appendChild(loader);
  },

  hideLoading: function () {
    const loader = document.querySelector(".loading-overlay");
    if (loader) {
      loader.remove();
    }
  },

  setupHelpTooltip: function () {
    const helpBtn = document.getElementById("helpBtn");
    const helpTooltip = document.getElementById("helpTooltip");
    const closeHelp = document.getElementById("closeHelp");

    if (helpBtn && helpTooltip) {
      helpBtn.addEventListener("click", function () {
        helpTooltip.style.display =
          helpTooltip.style.display === "block" ? "none" : "block";
      });

      if (closeHelp) {
        closeHelp.addEventListener("click", function () {
          helpTooltip.style.display = "none";
        });
      }

      document.addEventListener("click", function (event) {
        const isClickInsideHelp =
          helpTooltip.contains(event.target) || helpBtn.contains(event.target);
        if (!isClickInsideHelp && helpTooltip.style.display === "block") {
          helpTooltip.style.display = "none";
        }
      });
    }
  },

  init: function () {
    this.setupHelpTooltip();
  },
};

window.UIHelper = UIHelper;

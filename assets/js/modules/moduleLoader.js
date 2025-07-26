// assets/js/modules/moduleLoader.js
const ModuleLoader = {
  modules: {},
  dependencies: {
    info: ["FirebaseHandler", "DataManager", "UIRenderer"],
    bondCalculator: ["FirebaseHandler", "BondCalculatorApp"],
    rankingManager: ["FirebaseHandler", "RankingManager"],
    soulCalculator: ["SoulCalculatorApp"],
    chak: ["ChakApp"],
  },

  waitForModules: function (moduleName, callback, maxWait = 5000) {
    if (!this.dependencies[moduleName]) {
      console.warn(`No dependencies defined for module: ${moduleName}`);
      callback();
      return;
    }

    const dependencies = this.dependencies[moduleName];
    let attempts = 0;
    const checkInterval = 100; // 100ms
    const maxAttempts = maxWait / checkInterval;

    const checkDependencies = () => {
      attempts++;

      const allLoaded = dependencies.every(
        (dep) => typeof window[dep] !== "undefined"
      );

      if (allLoaded) {
        // console.log(`All dependencies for ${moduleName} loaded successfully`);
        callback();
        return true;
      } else if (attempts >= maxAttempts) {
        console.error(
          `Dependencies for ${moduleName} failed to load within timeout period`
        );
        const missing = dependencies.filter(
          (dep) => typeof window[dep] === "undefined"
        );
        console.error(`Missing dependencies: ${missing.join(", ")}`);
        return true;
      }

      return false;
    };

    if (!checkDependencies()) {
      const interval = setInterval(() => {
        if (checkDependencies()) {
          clearInterval(interval);
        }
      }, checkInterval);
    }
  },

  initPage: function () {
    const pageName =
      window.location.pathname.split("/").pop().replace(".html", "") || "info";

    // 모듈 로딩 프로세스 시작
    this.waitForModules(pageName, () => {
      const appObject =
        window[pageName.charAt(0).toUpperCase() + pageName.slice(1) + "App"];
      if (appObject && typeof appObject.initialize === "function") {
        // console.log(`Initializing ${pageName} application...`);
        appObject.initialize();
      } else {
        console.warn(`No initialization method found for ${pageName}`);
      }

      // 화면 크기 감지 설정
      this.setupResponsiveHandling();

      // 도움말 툴팁 설정 (기존 로직 활용)
      if (window.UIHelper) {
        UIHelper.setupHelpTooltip();
      } else {
        this.setupHelpTooltip();
      }
    });
  },

  setupResponsiveHandling: function () {
    var isMobile = window.innerWidth <= 768;
    localStorage.setItem("isMobileView", isMobile);

    window.addEventListener(
      "resize",
      this.debounce(function () {
        var wasMobile = localStorage.getItem("isMobileView") === "true";
        var isMobile = window.innerWidth <= 768;

        if (wasMobile !== isMobile) {
          localStorage.setItem("isMobileView", isMobile);
          location.reload();
        }
      }, 250)
    );
  },

  setupHelpTooltip: function () {
    const helpBtn = document.getElementById("helpBtn");
    const helpTooltip = document.getElementById("helpTooltip");
    const closeHelp = document.getElementById("closeHelp");

    if (helpBtn && helpTooltip && closeHelp) {
      helpBtn.addEventListener("click", function () {
        helpTooltip.style.display =
          helpTooltip.style.display === "block" ? "none" : "block";
      });

      closeHelp.addEventListener("click", function () {
        helpTooltip.style.display = "none";
      });

      document.addEventListener("click", function (event) {
        const isClickInsideHelp =
          helpTooltip.contains(event.target) || helpBtn.contains(event.target);
        if (!isClickInsideHelp && helpTooltip.style.display === "block") {
          helpTooltip.style.display = "none";
        }
      });
    }
  },

  debounce: function (func, wait) {
    var timeout;
    return function () {
      var context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        func.apply(context, args);
      }, wait);
    };
  },
};

// 전역으로 사용 가능하게 설정
window.ModuleLoader = ModuleLoader;

// 공통 함수들 - 기존 코드와 호환성 유지
function openReportSheet() {
  window.open("https://forms.gle/v1F41Dq2GxhbJKmBA", "_blank");
}

function setMaxBatchLevel(inputId) {
  document.getElementById(inputId).value = 25;
  if (
    typeof BondCalculatorApp !== "undefined" &&
    BondCalculatorApp.applyBatchLevel
  ) {
    BondCalculatorApp.applyBatchLevel(inputId);
  }
}

function debounce(func, wait) {
  return ModuleLoader.debounce(func, wait);
}

// 문서 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  ModuleLoader.initPage();
});

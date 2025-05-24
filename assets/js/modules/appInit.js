document.addEventListener("DOMContentLoaded", function () {
  function checkDependencies() {
    const requiredDeps = [
      "FirebaseHandler",
      "ComponentLoader",
      "AdManager",
      "UIHelper",
    ];
    const missingDeps = requiredDeps.filter(
      (dep) => typeof window[dep] === "undefined"
    );

    if (missingDeps.length > 0) {
      console.warn(
        `필요한 모듈이 로드되지 않았습니다: ${missingDeps.join(", ")}`
      );
      return false;
    }

    return true;
  }

  function initApp() {
    if (!checkDependencies()) {
      console.warn(
        "필요한 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다."
      );
      setTimeout(initApp, 100);
      return;
    }

    console.log("모든 모듈이 준비되었습니다. 애플리케이션을 초기화합니다.");

    ComponentLoader.init();
    UIHelper.init();
    AdManager.init();

    const currentPage =
      window.location.pathname.split("/").pop().replace(".html", "") || "info";

    switch (currentPage) {
      case "bondCalculator":
        if (
          typeof BondCalculatorApp !== "undefined" &&
          BondCalculatorApp.initialize
        ) {
          BondCalculatorApp.initialize();
        }
        break;
      case "rankingManager":
        if (typeof RankingViewer !== "undefined" && RankingViewer.initialize) {
          RankingViewer.initialize();
        }
        break;
      case "soulCalculator":
        if (
          typeof SoulCalculatorApp !== "undefined" &&
          SoulCalculatorApp.initialize
        ) {
          SoulCalculatorApp.initialize();
        }
        break;
      case "chak":
        if (typeof ChakApp !== "undefined" && ChakApp.initialize) {
          ChakApp.initialize();
        }
        break;
      case "info":
      default:
        if (typeof InfoApp !== "undefined" && InfoApp.initialize) {
          InfoApp.initialize();
        }
        break;
    }
  }

  setTimeout(initApp, 10);
});

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
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      func.apply(context, args);
    }, wait);
  };
}

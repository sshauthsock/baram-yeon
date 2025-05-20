document.addEventListener("DOMContentLoaded", function () {
  // FirebaseHandler와 BondCalculatorApp이 로드될 때까지 기다리기
  waitForDependencies(["FirebaseHandler", "BondCalculatorApp"], function () {
    console.log("All dependencies loaded for Bond Calculator");

    FirebaseHandler.initFirebase();
    FirebaseHandler.testFirebaseConnectivity()
      .then(() => {
        console.log("Firebase connectivity verified, initializing app...");
        BondCalculatorApp.initialize();
      })
      .catch((err) => {
        console.warn("Firebase connectivity test failed:", err);
        console.log("Proceeding with app initialization anyway...");
        BondCalculatorApp.initialize();
      });
  });

  // 모바일 뷰 상태 저장
  var isMobile = window.innerWidth <= 768;
  localStorage.setItem("isMobileView", isMobile);

  // 도움말 툴팁 설정
  setupHelpTooltip();

  // 반응형 처리
  window.addEventListener("resize", debounce(handleResize, 250));
});

// 의존성이 로드될 때까지 기다리기
function waitForDependencies(deps, callback) {
  const checkDeps = () => {
    for (let dep of deps) {
      if (typeof window[dep] === "undefined") {
        return false;
      }
    }
    return true;
  };

  if (checkDeps()) {
    callback();
  } else {
    let attempts = 0;
    const maxAttempts = 50; // 5초 타임아웃

    const interval = setInterval(() => {
      attempts++;
      if (checkDeps()) {
        clearInterval(interval);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error(
          "Dependencies failed to load within timeout period:",
          deps
        );
      }
    }, 100);
  }
}

// 도움말 툴팁 설정
function setupHelpTooltip() {
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
}

// 반응형 처리
function handleResize() {
  var wasMobile = localStorage.getItem("isMobileView") === "true";
  var isMobile = window.innerWidth <= 768;

  if (wasMobile !== isMobile) {
    localStorage.setItem("isMobileView", isMobile);
    location.reload();
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

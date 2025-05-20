document.addEventListener("DOMContentLoaded", function () {
  function initializeApp() {
    if (
      typeof FirebaseHandler !== "undefined" &&
      typeof FirebaseHandler.initFirebase === "function"
    ) {
      FirebaseHandler.initFirebase();
      FirebaseHandler.testFirebaseConnectivity().then(() => {
        if (
          typeof BondCalculatorApp !== "undefined" &&
          BondCalculatorApp.initialize
        ) {
          BondCalculatorApp.initialize();
        } else {
          console.error(
            "BondCalculatorApp is not available after Firebase initialization"
          );
        }
      });
    } else {
      if (
        typeof BondCalculatorApp !== "undefined" &&
        BondCalculatorApp.initialize
      ) {
        BondCalculatorApp.initialize();
      } else {
        console.error("BondCalculatorApp is not available");
      }
    }
  }

  // BondCalculatorApp이 로드될 때까지 기다리기
  if (
    typeof BondCalculatorApp !== "undefined" &&
    BondCalculatorApp.initialize
  ) {
    initializeApp();
  } else {
    // 일정 시간마다 BondCalculatorApp이 로드됐는지 확인
    let attempts = 0;
    const maxAttempts = 50; // 최대 5초(50 * 100ms) 동안 시도

    const checkInterval = setInterval(function () {
      attempts++;
      if (
        typeof BondCalculatorApp !== "undefined" &&
        BondCalculatorApp.initialize
      ) {
        clearInterval(checkInterval);
        console.log("BondCalculatorApp loaded successfully");
        initializeApp();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error("BondCalculatorApp failed to load within timeout period");
      }
    }, 100);
  }

  var isMobile = window.innerWidth <= 768;
  localStorage.setItem("isMobileView", isMobile);

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

  window.addEventListener(
    "resize",
    debounce(function () {
      var wasMobile = localStorage.getItem("isMobileView") === "true";
      var isMobile = window.innerWidth <= 768;

      if (wasMobile !== isMobile) {
        localStorage.setItem("isMobileView", isMobile);
        location.reload();
      }
    }, 250)
  );
});

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

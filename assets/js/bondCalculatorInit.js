document.addEventListener("DOMContentLoaded", function () {
  waitForDependencies(["FirebaseHandler", "BondCalculatorApp"], function () {
    console.log("All dependencies loaded for Bond Calculator");

    FirebaseHandler.initFirebase();
    FirebaseHandler.testFirebaseConnectivity()
      .then(() => {
        // console.log("Firebase connectivity verified, initializing app...");
        BondCalculatorApp.initialize();
      })
      .catch((err) => {
        console.warn("Firebase connectivity test failed:", err);
        // console.log("Proceeding with app initialization anyway...");
        BondCalculatorApp.initialize();
      });
  });

  var isMobile = window.innerWidth <= 768;
  localStorage.setItem("isMobileView", isMobile);

  setupHelpTooltip();

  window.addEventListener("resize", debounce(handleResize, 250));
});

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
    const maxAttempts = 50;

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

function setupHelpTooltip() {
  const helpBtn = document.getElementById("helpBtn");
  const helpTooltip = document.getElementById("helpTooltip");
  const closeHelp = document.getElementById("closeHelp");

  // console.log("Elements found:", {
  //   helpBtn: !!helpBtn,
  //   helpTooltip: !!helpTooltip,
  //   closeHelp: !!closeHelp,
  // });

  if (helpBtn && helpTooltip && closeHelp) {
    helpTooltip.style.display = "none";

    helpBtn.addEventListener("click", function (event) {
      // console.log("Help button clicked");
      helpTooltip.style.display =
        helpTooltip.style.display === "block" ? "none" : "block";
      event.stopPropagation();
    });

    closeHelp.addEventListener("click", function () {
      helpTooltip.style.display = "none";
    });

    document.addEventListener("click", function (event) {
      // console.log("Click event detected");
      const isClickInsideHelp =
        helpTooltip.contains(event.target) || helpBtn.contains(event.target);
      if (!isClickInsideHelp && helpTooltip.style.display === "block") {
        helpTooltip.style.display = "none";
      }
    });
  } else {
    console.error("Required elements for help tooltip not found in DOM");
  }
}

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

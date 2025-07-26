const InfoApp = (function () {
  function initialize() {
    // FirebaseHandler 의존성 확인
    if (typeof FirebaseHandler === "undefined") {
      console.warn("FirebaseHandler not loaded yet, retrying in 100ms");
      setTimeout(initialize, 100);
      return;
    }

    if (!checkRequiredData()) {
      handleInitError("필수 정보가 누락되었습니다.");
      return;
    }

    // UIHelper가 있으면 로딩 표시
    if (window.UIHelper) {
      window.UIHelper.showLoading();
    }

    FirebaseHandler.initFirebase();
    FirebaseHandler.testFirebaseConnectivity().finally(() => {
      window.DataManager.loadCategoryData().then(() => {
        window.UIRenderer.initUIEvents();
        window.UIRenderer.showCategory("수호");

        // 로딩 숨기기
        if (window.UIHelper) {
          window.UIHelper.hideLoading();
        }
      });
    });
  }

  function checkRequiredData() {
    return (
      typeof window.CommonData !== "undefined" &&
      window.CommonData.FACTION_ICONS &&
      window.CommonData.STATS_MAPPING &&
      window.CommonData.STATS_ORDER &&
      window.CommonData.DOCUMENT_MAP &&
      window.CommonData.CATEGORY_FILE_MAP
    );
  }

  function handleInitError(message) {
    const container = document.getElementById("imageContainer");
    if (container)
      container.innerHTML =
        '<p style="color: red; text-align: center; padding: 20px;">데이터 초기화 오류. ' +
        message +
        "</p>";
  }

  function openReportSheet() {
    window.open("https://forms.gle/v1F41Dq2GxhbJKmBA", "_blank");
  }

  return {
    initialize,
    checkRequiredData,
    openReportSheet,
  };
})();

// 문서 준비 확인 및 초기화 시작
function startInitialization() {
  // 모든 필수 스크립트가 로드되었는지 확인
  if (
    typeof FirebaseHandler === "undefined" ||
    typeof window.DataManager === "undefined" ||
    typeof window.UIRenderer === "undefined"
  ) {
    console.log(
      "필요한 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다."
    );
    setTimeout(startInitialization, 100);
    return;
  }

  // 모든 의존성이 로드되었으므로 초기화 시작
  InfoApp.initialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    // DOMContentLoaded 이벤트에서 시작하되, 필요한 모듈이 로드될 때까지 기다림
    setTimeout(startInitialization, 10);
  });
} else {
  // 이미 DOM이 로드되었다면 바로 시작 시도
  setTimeout(startInitialization, 10);
}

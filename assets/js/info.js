const InfoApp = (function () {
  function initialize() {
    if (!checkRequiredData()) {
      handleInitError("필수 정보가 누락되었습니다.");
      return;
    }

    FirebaseHandler.initFirebase();
    FirebaseHandler.testFirebaseConnectivity().finally(() => {
      window.DataManager.loadCategoryData().then(() => {
        window.UIRenderer.initUIEvents();
        window.UIRenderer.showCategory("수호");
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

  return {
    initialize,
    checkRequiredData,
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", InfoApp.initialize);
} else {
  InfoApp.initialize();
}

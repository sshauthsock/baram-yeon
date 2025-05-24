// 애플리케이션 초기화 모듈
const App = (function () {
  // 현재 페이지 식별
  const getCurrentPage = () => {
    const path = window.location.pathname;
    if (path.includes("info")) return "info";
    if (path.includes("bondCalculator")) return "bond";
    if (path.includes("rankingManager")) return "ranking";
    if (path.includes("soulCalculator")) return "soul";
    if (path.includes("chak")) return "chak";
    return "info"; // 기본값
  };

  // 페이지별 초기화
  const initPage = () => {
    const page = getCurrentPage();

    // 공통 모듈 초기화
    Navigation.init(page);
    AdManager.init();

    // 페이지별 모듈 초기화
    switch (page) {
      case "info":
        InfoPage.init();
        break;
      case "bond":
        BondPage.init();
        break;
      case "ranking":
        RankingPage.init();
        break;
      case "soul":
        SoulPage.init();
        break;
      case "chak":
        ChakPage.init();
        break;
    }
  };

  return {
    init: initPage,
  };
})();

// DOM 로드 완료 시 애플리케이션 초기화
document.addEventListener("DOMContentLoaded", App.init);

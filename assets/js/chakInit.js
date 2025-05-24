document.addEventListener("DOMContentLoaded", function () {
  const tutorialShown = localStorage.getItem("chakTutorialShown");
  if (!tutorialShown && document.getElementById("tutorial-tip")) {
    document.getElementById("tutorial-tip").style.display = "flex";
    document.getElementById("close-tip").addEventListener("click", function () {
      document.getElementById("tutorial-tip").style.display = "none";
      localStorage.setItem("chakTutorialShown", "true");
    });
  }

  // ChakApp 초기화 및 데이터 로드
  ChakApp.loadChakData();

  // 검색 버튼에 이벤트 리스너 추가
  const searchButton = document.getElementById("search-button");
  if (searchButton) {
    searchButton.addEventListener("click", ChakApp.searchStats);
  }

  // 모바일 뷰 확인 및 설정
  var isMobile = window.innerWidth <= 768;
  localStorage.setItem("isMobileView", isMobile);

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

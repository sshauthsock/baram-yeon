const AdInitializer = (function () {
  let initializationInProgress = false;

  function safelyInitializeAds(container) {
    try {
      const adElements = container.querySelectorAll(".kakao_ad_area");
      adElements.forEach((ad) => {
        if (ad) ad.style.display = "";
      });

      if (typeof kakao !== "undefined" && typeof kakao.adfit !== "undefined") {
        kakao.adfit.render();
      } else if (typeof kakaoDotCom !== "undefined" && kakaoDotCom.adFit) {
        kakaoDotCom.adFit.render();
      } else {
        loadAdScript();
      }
    } catch (error) {
      console.log("광고 초기화 오류(무시됨):", error);
    }
  }

  function loadAdScript() {
    if (document.getElementById("kakao-ad-script")) {
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-ad-script";
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";

    script.onerror = function () {
      console.log("광고 스크립트 로드 실패");
    };

    document.head.appendChild(script);
  }

  function addAdsToModalContent(container) {
    // 기존 광고 요소 제거
    container
      .querySelectorAll(".ad-row, .mobile-ad")
      .forEach((el) => el.remove());

    // 모달에 광고 요소 추가
    const adRow = document.createElement("div");
    adRow.className = "ad-row";
    adRow.innerHTML = `
      <div class="ad-container-left">
        <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-sgK0ytXrL3f7EHRF"
            data-ad-width="728" data-ad-height="90"></ins>
      </div>
    `;

    const mobileAd = document.createElement("div");
    mobileAd.className = "ad-container mobile-ad";
    mobileAd.innerHTML = `
      <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-TPesUrzJaxJ008Lm"
          data-ad-width="320" data-ad-height="50"></ins>
    `;

    // 컨테이너에 광고 추가
    if (container.firstChild) {
      container.insertBefore(mobileAd, container.firstChild);
      container.insertBefore(adRow, container.firstChild);
    } else {
      container.appendChild(adRow);
      container.appendChild(mobileAd);
    }

    return container;
  }

  function initializeAdsInModal(container) {
    if (initializationInProgress) return;

    initializationInProgress = true;

    try {
      // 바로 첫 실행
      safelyInitializeAds(container);

      // 약간의 지연 후 다시 실행 (렌더링 지연 문제 대응)
      setTimeout(() => {
        safelyInitializeAds(container);
        initializationInProgress = false;
      }, 500);
    } catch (e) {
      console.log("광고 초기화 중 오류:", e);
      initializationInProgress = false;
    }
  }

  function safelyInitializeAds(container) {
    try {
      // 광고 영역 표시
      const adElements = container.querySelectorAll(".kakao_ad_area");
      adElements.forEach((ad) => {
        if (ad) ad.style.display = "";
      });

      // 카카오 광고 스크립트 로드 확인 및 렌더링
      if (typeof kakao !== "undefined" && typeof kakao.adfit !== "undefined") {
        kakao.adfit.render();
      } else if (typeof kakaoDotCom !== "undefined" && kakaoDotCom.adFit) {
        kakaoDotCom.adFit.render();
      } else {
        loadAdScript();
      }
    } catch (error) {
      console.log("광고 초기화 오류(무시됨):", error);
    }
  }

  return {
    initializeAdsInModal,
    addAdsToModalContent,
    safelyInitializeAds,
  };
})();

window.AdInitializer = AdInitializer;

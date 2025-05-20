const AdManager = {
  initAds: function () {
    if (document.querySelectorAll(".kakao_ad_area").length > 0) {
      this.initKakaoAds();
    }
  },

  initKakaoAds: function () {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);

    setTimeout(() => {
      document.querySelectorAll(".kakao_ad_area").forEach((ad) => {
        ad.style.display = "block";
      });
    }, 500);
  },

  retryAdsOnVisibilityChange: function () {
    let adRetries = 0;
    const maxRetries = 5;

    const checkAdsVisibility = () => {
      let adElements = document.querySelectorAll(".kakao_ad_area");
      let anyVisible = false;

      adElements.forEach(function (ad) {
        if (ad.offsetHeight > 1 && ad.innerHTML !== "") {
          anyVisible = true;
        }
      });

      if (!anyVisible && adRetries < maxRetries) {
        this.initKakaoAds();
        adRetries++;
        setTimeout(checkAdsVisibility, 2000);
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.initKakaoAds();
        setTimeout(checkAdsVisibility, 1000);
      }
    });

    window.addEventListener("load", () => {
      setTimeout(checkAdsVisibility, 1000);
    });

    window.addEventListener("focus", () => {
      this.initKakaoAds();
    });
  },

  init: function () {
    this.initAds();
    this.retryAdsOnVisibilityChange();
  },
};

window.AdManager = AdManager;

const LoadingIndicator = (function () {
  const styleId = "loading-indicator-style";
  let loadingOverlay = null;
  let pageLoadingActive = true;
  let pendingImageCount = 0;
  let imageRegistry = new Map(); // 이미지 로딩 상태 추적을 위한 레지스트리
  let debug = true; // 디버그 모드 기본 활성화
  let lastCheckTime = 0;
  let isLoadingVisible = false;
  let periodicCheckTimer = null;

  function log(...args) {
    // if (debug) console.log("[LoadingIndicator]", ...args);
  }

  function initStyles() {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
          .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(3px);
            transition: opacity 0.3s ease;
          }
          
          .loading-container {
            background-color: #ffffff;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            width: 90%;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% {
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            }
            50% {
              box-shadow: 0 10px 40px rgba(52, 152, 219, 0.4);
            }
            100% {
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            }
          }
          
          .loading-spinner {
            border: 5px solid rgba(0, 0, 0, 0.1);
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border-left-color: #3498db;
            margin: 0 auto 20px;
            animation: spin 1.5s linear infinite;
          }
          
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          
          .loading-text {
            margin: 15px 0;
            color: #333;
            font-size: 20px;
            font-weight: bold;
          }
          
          .loading-subtext {
            color: #666;
            font-size: 14px;
            margin-bottom: 5px;
          }
          
          .loading-progress-bar {
            width: 100%;
            height: 6px;
            background-color: #e0e0e0;
            border-radius: 3px;
            margin: 20px 0;
            overflow: hidden;
            position: relative;
          }
          
          .loading-progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #3498db, #2980b9);
            position: absolute;
            top: 0;
            left: 0;
            transition: width 0.3s ease;
          }
          
          .loading-progress-fill.animated {
            animation: fillProgress 2s infinite alternate;
          }
          
          @keyframes fillProgress {
            0% {
              background-position: 0% 50%;
              width: 10%;
            }
            100% {
              background-position: 100% 50%;
              width: 90%;
            }
          }
          
          .img-loading-placeholder {
            background-color: #eaeaea;
            position: relative;
            overflow: hidden;
          }
          
          .img-loading-placeholder::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: shimmer 1.5s infinite;
          }
          
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `;
      document.head.appendChild(style);
    }
  }

  function createLoadingOverlay() {
    if (loadingOverlay) return loadingOverlay;

    loadingOverlay = document.createElement("div");
    loadingOverlay.className = "loading-overlay";
    loadingOverlay.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">로딩 중...</div>
          <div class="loading-subtext">잠시만 기다려주세요</div>
          <div class="loading-progress-bar">
            <div class="loading-progress-fill animated"></div>
          </div>
        </div>
      `;
    document.body.appendChild(loadingOverlay);
    return loadingOverlay;
  }

  function showLoading(options = {}) {
    initStyles();
    const overlay = createLoadingOverlay();

    if (options.text) {
      overlay.querySelector(".loading-text").textContent = options.text;
    }

    if (options.subText) {
      overlay.querySelector(".loading-subtext").textContent = options.subText;
    }

    const progressFill = overlay.querySelector(".loading-progress-fill");
    if (options.progress !== undefined) {
      progressFill.style.width = `${options.progress * 100}%`;
      progressFill.classList.remove("animated");
    } else {
      progressFill.classList.add("animated");
    }

    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    isLoadingVisible = true;
  }

  function hideLoading(force = false) {
    if (!loadingOverlay) return;

    if (force || (!pageLoadingActive && pendingImageCount <= 0)) {
      log(
        `로딩 숨김 실행 (force: ${force}, pageLoading: ${pageLoadingActive}, pendingImages: ${pendingImageCount})`
      );

      isLoadingVisible = false;
      loadingOverlay.style.opacity = "0";

      setTimeout(() => {
        if (!isLoadingVisible) {
          // 중간에 다시 표시되지 않았는지 확인
          loadingOverlay.style.display = "none";
          loadingOverlay.style.opacity = "1";
          document.body.style.overflow = "auto";
        }
      }, 300);

      // 주기적 체크 중단
      if (periodicCheckTimer) {
        clearInterval(periodicCheckTimer);
        periodicCheckTimer = null;
      }
    } else {
      log(
        `로딩 숨김 요청 무시됨 (pageLoading: ${pageLoadingActive}, pendingImages: ${pendingImageCount})`
      );
    }
  }

  function updateLoadingText(text, subText) {
    if (loadingOverlay) {
      const textElement = loadingOverlay.querySelector(".loading-text");
      if (textElement && text) {
        textElement.textContent = text;
      }

      if (subText) {
        const subTextElement = loadingOverlay.querySelector(".loading-subtext");
        if (subTextElement) {
          subTextElement.textContent = subText;
        }
      }
    }
  }

  function updateProgress(progress) {
    if (loadingOverlay) {
      const progressFill = loadingOverlay.querySelector(
        ".loading-progress-fill"
      );
      if (progressFill) {
        progressFill.classList.remove("animated");
        progressFill.style.width = `${progress * 100}%`;
      }
    }
  }

  function initPageLoading() {
    pageLoadingActive = true;
    pendingImageCount = 0;
    imageRegistry.clear();
    lastCheckTime = Date.now();

    showLoading({
      text: "페이지 로드 중...",
      subText: "콘텐츠를 불러오고 있습니다",
    });

    // 페이지 로드 완료 이벤트 핸들링
    window.addEventListener("load", pageLoadComplete);

    // 로드 타임아웃 안전장치 (30초 후 강제 종료)
    setTimeout(() => {
      if (pageLoadingActive) {
        log("페이지 로드 타임아웃");
        pageLoadingActive = false;
        refreshLoadingStatus();
      }
    }, 30000);

    // 주기적으로 이미지 로딩 상태 확인 (2초마다)
    periodicCheckTimer = setInterval(periodicCheck, 2000);
  }

  function pageLoadComplete() {
    log("윈도우 로드 이벤트 발생");

    // 페이지 로드 완료 플래그 설정
    setTimeout(() => {
      pageLoadingActive = false;

      // 모든 이미지에 로딩 처리 적용
      processAllImages();

      // 로딩 상태 갱신
      refreshLoadingStatus();

      // 3초 후 다시 한번 확인 (늦게 추가되는 이미지들 감지)
      setTimeout(processAllImages, 3000);
    }, 500);
  }

  function processAllImages() {
    // 현재 페이지의 모든 이미지 처리
    const images = document.querySelectorAll("img:not([data-loading-tracked])");
    const imageCount = images.length;

    log(`이미지 처리 실행: ${imageCount}개 발견`);

    if (imageCount > 0) {
      images.forEach(trackImage);
    } else {
      log("처리할 새 이미지 없음");
    }

    refreshLoadingStatus();
  }

  function trackImage(img) {
    // 이미 추적 중이면 무시
    if (img.hasAttribute("data-loading-tracked")) return;

    // 추적 마킹
    img.setAttribute("data-loading-tracked", "true");
    const imgId = `img_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    img.setAttribute("data-loading-id", imgId);

    // 유효한 src 확인
    if (!img.src || img.src === window.location.href || img.src === "") {
      log("유효하지 않은 이미지 소스 감지됨:", img);
      return;
    }

    // 이미지 로딩 상태 추적
    if (!img.complete) {
      pendingImageCount++;
      imageRegistry.set(imgId, {
        element: img,
        src: img.src,
        startTime: Date.now(),
        status: "loading",
      });

      log(
        `이미지 로딩 추적 시작: ${img.src}, ID: ${imgId}, 총 ${pendingImageCount}개`
      );

      // 로딩 플레이스홀더 생성
      applyLoadingPlaceholder(img, imgId);

      // 이미지 이벤트 리스너
      img.addEventListener("load", () => imageLoaded(imgId));
      img.addEventListener("error", () => imageError(imgId));

      // 타임아웃 안전장치 (15초 후 에러로 처리)
      setTimeout(() => {
        const imgInfo = imageRegistry.get(imgId);
        if (imgInfo && imgInfo.status === "loading") {
          log(`이미지 로드 타임아웃: ${img.src}, ID: ${imgId}`);
          imageError(imgId);
        }
      }, 15000);

      // 로딩 상태 UI 갱신
      refreshLoadingStatus();
    } else {
      log(`이미지 이미 로드됨: ${img.src}`);
    }
  }

  function applyLoadingPlaceholder(img, imgId) {
    // 이미지가 표시되고 있는 경우에만 플레이스홀더 적용
    if (!img.parentNode || img.style.display === "none") return;

    // 원래 스타일 백업
    const originalDisplay = img.style.display;
    const originalVisibility = img.style.visibility;
    const originalWidth = img.width || img.getAttribute("width");
    const originalHeight = img.height || img.getAttribute("height");

    // 이미지 정보 갱신
    const imgInfo = imageRegistry.get(imgId);
    if (imgInfo) {
      imgInfo.originalDisplay = originalDisplay;
      imgInfo.originalVisibility = originalVisibility;
      imageRegistry.set(imgId, imgInfo);
    }

    // 플레이스홀더 크기 계산
    let placeholderWidth = "100px";
    let placeholderHeight = "100px";

    if (originalWidth) placeholderWidth = `${originalWidth}px`;
    if (originalHeight) placeholderHeight = `${originalHeight}px`;

    // 플레이스홀더 생성 및 삽입
    const placeholder = document.createElement("div");
    placeholder.className = "img-loading-placeholder";
    placeholder.id = `placeholder-${imgId}`;
    placeholder.style.width = placeholderWidth;
    placeholder.style.height = placeholderHeight;

    img.style.display = "none";

    if (img.parentNode) {
      img.parentNode.insertBefore(placeholder, img);
    }
  }

  function imageLoaded(imgId) {
    const imgInfo = imageRegistry.get(imgId);
    if (!imgInfo) return;

    const { element: img } = imgInfo;
    log(`이미지 로드 완료: ${img.src}, ID: ${imgId}`);

    // 카운터 감소
    pendingImageCount = Math.max(0, pendingImageCount - 1);

    // 상태 업데이트
    imgInfo.status = "loaded";
    imgInfo.endTime = Date.now();
    imageRegistry.set(imgId, imgInfo);

    // 플레이스홀더 제거
    removePlaceholder(imgId, img);

    // 로딩 상태 업데이트
    refreshLoadingStatus();
  }

  function imageError(imgId) {
    const imgInfo = imageRegistry.get(imgId);
    if (!imgInfo) return;

    const { element: img } = imgInfo;
    log(`이미지 로드 에러: ${img.src}, ID: ${imgId}`);

    // 카운터 감소
    pendingImageCount = Math.max(0, pendingImageCount - 1);

    // 상태 업데이트
    imgInfo.status = "error";
    imgInfo.endTime = Date.now();
    imageRegistry.set(imgId, imgInfo);

    // 플레이스홀더 제거
    removePlaceholder(imgId, img);

    // 로딩 상태 업데이트
    refreshLoadingStatus();
  }

  function removePlaceholder(imgId, img) {
    // 이미지 원래 상태로 복원
    img.style.display = "";

    // 플레이스홀더 제거
    const placeholder = document.getElementById(`placeholder-${imgId}`);
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
  }

  function refreshLoadingStatus() {
    // 로딩 중인 이미지가 있는지, 페이지 로딩이 완료되었는지 확인
    const shouldHideLoading = !pageLoadingActive && pendingImageCount <= 0;
    const loadingImagesCount = pendingImageCount;

    log(
      `로딩 상태 갱신: 페이지로딩=${pageLoadingActive}, 로딩이미지=${loadingImagesCount}`
    );

    if (shouldHideLoading) {
      // 모든 로딩 완료, 로딩 UI 숨기기
      hideLoading(false);
    } else if (pendingImageCount > 0) {
      // 아직 로딩 중인 이미지가 있음
      showLoading({
        text: "이미지 로딩 중...",
        subText: `${pendingImageCount}개의 이미지를 로드 중입니다`,
      });
      updateProgress(0.1); // 기본 진행 표시
    }

    // 마지막 체크 시간 갱신
    lastCheckTime = Date.now();
  }

  function periodicCheck() {
    // 주기적으로 이미지를 다시 검색하고 상태 갱신
    log("주기적 체크 실행");
    processAllImages();

    // 5분(300초) 이상 로딩이 지속되면 안전장치 가동
    const currentTime = Date.now();
    if (currentTime - lastCheckTime > 300000) {
      log("로딩 시간 초과, 강제 종료");
      pendingImageCount = 0;
      pageLoadingActive = false;
      hideLoading(true);

      if (periodicCheckTimer) {
        clearInterval(periodicCheckTimer);
        periodicCheckTimer = null;
      }
    }
  }

  function startImageObserver() {
    if (window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        mutations.forEach((mutation) => {
          // 노드 추가 감지
          if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
              // 이미지 태그 직접 추가된 경우
              if (node.nodeName === "IMG") {
                shouldProcess = true;
              }
              // DOM 트리에 추가된 경우
              else if (node.querySelectorAll) {
                const images = node.querySelectorAll(
                  "img:not([data-loading-tracked])"
                );
                if (images.length > 0) shouldProcess = true;
              }
            });
          }

          // 속성 변경 감지 (src 변경 등)
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "src" &&
            mutation.target.nodeName === "IMG"
          ) {
            const img = mutation.target;
            const oldTrackId = img.getAttribute("data-loading-id");

            // 이미 추적 중인 이미지의 src가 변경된 경우
            if (oldTrackId && imageRegistry.has(oldTrackId)) {
              // 기존 추적 정보 삭제
              imageRegistry.delete(oldTrackId);
              img.removeAttribute("data-loading-tracked");
              img.removeAttribute("data-loading-id");
              shouldProcess = true;
            }
          }
        });

        // 변경사항이 있으면 이미지 처리 실행
        if (shouldProcess) {
          setTimeout(processAllImages, 10);
        }
      });

      // DOM 전체를 감시
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"],
      });

      log("DOM 감시자 등록 완료");
    }
  }

  function init() {
    initStyles();
    initPageLoading();
    startImageObserver();

    // 초기 이미지 처리
    setTimeout(processAllImages, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    showLoading,
    hideLoading,
    updateLoadingText,
    updateProgress,
    checkImages: processAllImages,
    setDebug: function (value) {
      debug = value;
    },
  };
})();

window.LoadingIndicator = LoadingIndicator;

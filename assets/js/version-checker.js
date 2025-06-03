const VersionChecker = (function () {
  // 설정
  const VERSION_CHECK_INTERVAL = 3600000; // 1시간마다 확인 (ms)
  const VERSION_KEY = "bhy_app_version";
  const LAST_CHECK_KEY = "bhy_last_version_check";
  let newVersionDetected = false;

  // 버전 확인 함수
  async function checkVersion() {
    try {
      // 마지막 체크 시간 확인
      const now = Date.now();
      const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || "0");

      // 너무 자주 확인하지 않도록 제한
      if (now - lastCheck < VERSION_CHECK_INTERVAL && lastCheck !== 0) {
        displayVersionInfo(); // 버전 정보는 항상 표시
        return false; // 최근에 이미 확인했음
      }

      // 캐시 방지를 위해 쿼리 파라미터 추가
      const response = await fetch(`/version.json?t=${now}`);
      if (!response.ok) throw new Error("버전 정보를 가져올 수 없습니다");

      const data = await response.json();
      const currentVersion = localStorage.getItem(VERSION_KEY);

      // 최신 체크 시간 기록
      localStorage.setItem(LAST_CHECK_KEY, now.toString());

      // 버전 정보 표시 (UI)
      displayVersionInfo(data);

      // 버전이 같으면 업데이트 불필요
      if (currentVersion === data.version) {
        return false;
      }

      // 새 버전 발견: 업데이트 진행
      console.log(
        `새 버전 발견: ${currentVersion || "없음"} → ${data.version}`
      );
      newVersionDetected = true;

      // 서비스 워커 업데이트 (있는 경우)
      updateServiceWorker();

      // 캐시 정리 (필요한 경우)
      if (data.purgeCache) {
        clearCache();
      }

      // 새 버전 저장
      localStorage.setItem(VERSION_KEY, data.version);

      // 변경 로그 표시 (선택사항)
      if (data.changelog && currentVersion) {
        // 첫 방문이 아닌 경우에만
        showChangelog(data.changelog);
      }

      // 필수 업데이트면 즉시 새로고침
      if (data.mandatory) {
        window.location.reload(true);
        return true;
      }

      // 선택적 업데이트면 사용자에게 알림
      return await promptForRefresh(data);
    } catch (error) {
      console.error("버전 확인 중 오류:", error);
      displayVersionInfo(); // 오류가 있어도 UI에 버전 표시 시도
      return false;
    }
  }

  // 캐시 정리 함수
  function clearCache() {
    // 보존할 항목 목록
    const keysToKeep = [
      VERSION_KEY,
      LAST_CHECK_KEY,
      "user_settings",
      "user_preferences",
    ];

    // localStorage 정리
    Object.keys(localStorage).forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // sessionStorage 정리
    sessionStorage.clear();

    console.log("캐시가 정리되었습니다");
  }

  // 변경 로그 표시 함수
  function showChangelog(changelog) {
    // 이미 존재하는 알림 창이 있으면 제거
    const existingAlert = document.getElementById("version-alert");
    if (existingAlert) existingAlert.remove();

    // 새 알림 창 생성
    const alert = document.createElement("div");
    alert.id = "version-alert";
    alert.className = "version-changelog";
    alert.innerHTML = `
      <div class="changelog-header">
        <h3>${changelog.title || "업데이트 안내"}</h3>
        <button class="close-changelog">&times;</button>
      </div>
      <div class="changelog-body">
        <p>${changelog.description || "새 버전이 설치되었습니다."}</p>
        ${
          changelog.details
            ? `
          <ul>
            ${changelog.details.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        `
            : ""
        }
      </div>
    `;

    document.body.appendChild(alert);

    // 닫기 버튼 이벤트 리스너
    alert.querySelector(".close-changelog").addEventListener("click", () => {
      alert.remove();
    });

    // 5초 후 자동으로 사라짐
    setTimeout(() => {
      if (alert.parentNode) {
        alert.classList.add("fade-out");
        setTimeout(() => alert.remove(), 500);
      }
    }, 5000);
  }

  // 사용자에게 새로고침 묻는 함수
  function promptForRefresh(data) {
    return new Promise((resolve) => {
      const shouldRefresh = confirm(
        `새 버전(${data.version})이 있습니다. 지금 업데이트하시겠습니까?`
      );

      if (shouldRefresh) {
        window.location.reload(true);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  // UI에 버전 정보 표시 함수
  function displayVersionInfo(versionData) {
    // 이미 버전 정보가 표시되어 있다면 제거
    const existingInfo = document.querySelector(".version-info");
    if (existingInfo) existingInfo.remove();

    // 버전 정보가 있으면 사용, 없으면 localStorage에서 가져옴
    let version = "알 수 없음";
    let releaseDate = "";

    if (versionData) {
      version = versionData.version;
      releaseDate = versionData.releaseDate;
    } else {
      // 저장된 버전 사용
      version = localStorage.getItem(VERSION_KEY) || "알 수 없음";

      // 버전 정보를 API에서 가져오기 시도
      fetch("/version.json")
        .then((response) => response.json())
        .then((data) => {
          updateVersionDisplay(data.version, data.releaseDate);
        })
        .catch((err) => console.log("버전 정보를 가져올 수 없습니다", err));
    }

    updateVersionDisplay(version, releaseDate);
  }

  // 버전 정보 UI 업데이트 함수
  function updateVersionDisplay(version, releaseDate) {
    const footer = document.querySelector(".site-footer");
    if (!footer) return;

    // 푸터의 마지막 div (copyright 포함) 찾기
    const copyrightDiv = footer.querySelector(".footer-copyright");

    if (copyrightDiv) {
      const versionInfo = document.createElement("div");
      versionInfo.className = "version-info";
      versionInfo.textContent = releaseDate
        ? `버전: ${version} (${releaseDate})`
        : `버전: ${version}`;

      // 스타일 추가
      versionInfo.style.marginTop = "10px";
      versionInfo.style.fontSize = "0.9em";
      versionInfo.style.opacity = "0.7";

      // 기존 버전 정보 확인 및 제거
      const existingVersion = copyrightDiv.querySelector(".version-info");
      if (existingVersion) existingVersion.remove();

      // copyright div 끝에 버전 정보 추가
      copyrightDiv.appendChild(versionInfo);
    }
  }

  // 서비스 워커 등록 및 업데이트 함수
  function updateServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/assets/js/service-worker.js")
        .then((registration) => {
          console.log("서비스 워커 등록 성공:", registration.scope);

          // 새 버전이 감지되면 서비스 워커 업데이트
          if (newVersionDetected) {
            registration.update().then(() => {
              console.log("서비스 워커 업데이트됨");
            });
          }
        })
        .catch((error) => {
          console.log("서비스 워커 등록 실패:", error);
        });
    }
  }

  // 초기화 및 최초 실행
  function init() {
    // 페이지 로드 시 버전 체크
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        checkVersion();
        // 서비스 워커 등록 시도
        updateServiceWorker();
      });
    } else {
      checkVersion();
      updateServiceWorker();
    }

    // 주기적 버전 체크 (탭 활성화될 때)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    });
  }

  // CSS 스타일 추가
  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .version-changelog {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: #fff;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border-radius: 8px;
        z-index: 9999;
        overflow: hidden;
        animation: slide-in 0.3s ease-out;
      }
      
      .changelog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #4a6fff;
        color: white;
        padding: 10px 15px;
      }
      
      .changelog-header h3 {
        margin: 0;
        font-size: 16px;
      }
      
      .close-changelog {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
      }
      
      .changelog-body {
        padding: 15px;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .changelog-body ul {
        margin: 10px 0;
        padding-left: 20px;
      }
      
      .fade-out {
        animation: fade-out 0.5s ease-out forwards;
      }
      
      @keyframes slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .version-info {
        margin-top: 10px;
        font-size: 0.9em;
        opacity: 0.8;
      }
    `;

    document.head.appendChild(style);
  }

  // 스타일 추가 및 초기화
  addStyles();
  init();

  // 공개 메서드
  return {
    checkVersion,
    clearCache,
    displayVersionInfo,
    updateServiceWorker,
  };
})();

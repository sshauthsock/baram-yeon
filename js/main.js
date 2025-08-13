import * as api from "./api.js";
import { setAllSpirits } from "./state.js";
import { showLoading, hideLoading } from "./loadingIndicator.js";

// 페이지 모듈들을 맵으로 관리
const pageModules = {
  spiritInfo: () => import("./pages/spiritInfo.js"),
  bondCalculator: () => import("./pages/bondCalculator.js"),
  spiritRanking: () => import("./pages/spiritRanking.js"),
  soulCalculator: () => import("./pages/soulCalculator.js"),
  chakCalculator: () => import("./pages/chakCalculator.js"),
};

const appContainer = document.getElementById("app-container");
const mainTabs = document.getElementById("mainTabs");
let currentPageModule = null; // 현재 활성화된 페이지 모듈을 추적

/**
 * URL 해시 또는 탭 클릭에 따라 페이지를 라우팅하고 렌더링합니다.
 */
async function route() {
  const activeTab = mainTabs.querySelector(".tab.active");
  // 활성화된 탭이 없으면 기본 페이지(spiritInfo)로 설정
  const pageName = activeTab ? activeTab.dataset.page : "spiritInfo";

  // 이전 페이지 모듈이 있다면 정리 함수 실행
  if (currentPageModule?.cleanup) {
    try {
      currentPageModule.cleanup();
      console.log(`[Router] Cleaned up previous page.`);
    } catch (e) {
      console.error("[Router] Error during page cleanup:", e);
    }
  }

  // 페이지 컨테이너 비우기
  appContainer.innerHTML = "";
  // 새 페이지 로딩 시작 시 로딩 인디케이터 표시
  showLoading(
    appContainer,
    "페이지 로딩 중...",
    "필요한 모듈을 불러오고 있습니다..."
  );

  try {
    const moduleLoader = pageModules[pageName];
    if (!moduleLoader) {
      throw new Error(`'${pageName}' 페이지를 찾을 수 없습니다.`);
    }

    // 동적으로 페이지 모듈 로드
    const pageModule = await moduleLoader();
    currentPageModule = pageModule;

    // 페이지 초기화 함수 실행
    if (pageModule.init) {
      await pageModule.init(appContainer);
      console.log(`[Router] Initialized page: ${pageName}`);
    } else {
      console.warn(
        `Page module '${pageName}' does not have an init() function.`
      );
      appContainer.innerHTML = `<p class="error-message">페이지를 초기화할 수 없습니다. (init 함수 없음)</p>`;
    }
  } catch (error) {
    console.error(
      `[Router] Failed to load or initialize page '${pageName}':`,
      error
    );
    appContainer.innerHTML = `<p class="error-message">페이지를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
  } finally {
    hideLoading(); // 로딩 성공/실패와 관계없이 로딩 인디케이터 숨김
  }
}

// 메인 탭 클릭 이벤트 리스너
mainTabs.addEventListener("click", (e) => {
  if (e.target.matches(".tab") && !e.target.classList.contains("active")) {
    // 기존 활성 탭 비활성화
    mainTabs.querySelector(".tab.active")?.classList.remove("active");
    // 새 탭 활성화
    e.target.classList.add("active");
    // 라우트 실행
    route();
  }
});

/**
 * 애플리케이션 초기화 (최초 데이터 로드 및 초기 페이지 렌더링)
 */
async function initializeApp() {
  // 앱 시작 시 전체 화면 로딩 인디케이터 표시 (app-container에 오버레이)
  showLoading(
    appContainer,
    "초기 데이터 로딩 중",
    "서버에서 환수 정보를 불러오고 있습니다..."
  );

  try {
    // 모든 환수 데이터 미리 로드 (앱 전체에서 사용될 수 있음)
    const allSpirits = await api.fetchAllSpirits();
    setAllSpirits(allSpirits); // 전역 상태에 저장

    // 초기 라우트 실행 (기본적으로 '환수 정보' 탭)
    await route();
  } catch (error) {
    console.error("애플리케이션 초기화 실패:", error);
    // 데이터 로드 실패 시 사용자에게 오류 메시지 표시
    appContainer.innerHTML = `<p class="error-message">애플리케이션 초기화 실패: 데이터를 불러오는 데 실패했습니다. (${error.message})</p>`;
  } finally {
    hideLoading(); // 초기 로딩 인디케이터 숨김
  }
}

// 애플리케이션 시작
initializeApp();

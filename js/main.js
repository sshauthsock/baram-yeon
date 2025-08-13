import * as api from "./api.js";
import { setAllSpirits } from "./state.js";
import { showLoading, hideLoading } from "./loadingIndicator.js";

const pageModules = {
  spiritInfo: () => import("./pages/spiritInfo.js"),
  bondCalculator: () => import("./pages/bondCalculator.js"),
  spiritRanking: () => import("./pages/spiritRanking.js"),
  soulCalculator: () => import("./pages/soulCalculator.js"),
  chakCalculator: () => import("./pages/chakCalculator.js"),
};

const appContainer = document.getElementById("app-container");
const mainTabs = document.getElementById("mainTabs");
let currentPageModule = null;

async function route() {
  const activeTab = mainTabs.querySelector(".tab.active");
  if (!activeTab) return;
  const pageName = activeTab.dataset.page;

  if (currentPageModule?.cleanup) {
    currentPageModule.cleanup();
  }

  appContainer.innerHTML = "";

  try {
    const moduleLoader = pageModules[pageName];
    if (!moduleLoader)
      throw new Error(`'${pageName}' 페이지를 찾을 수 없습니다.`);

    const pageModule = await moduleLoader();
    currentPageModule = pageModule;

    await pageModule.init(appContainer);
  } catch (error) {
    console.error("페이지 로딩 실패:", error);
    hideLoading();
    appContainer.innerHTML = `<p class="error-message">페이지를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
  }
}

mainTabs.addEventListener("click", (e) => {
  if (e.target.matches(".tab") && !e.target.classList.contains("active")) {
    mainTabs.querySelector(".tab.active")?.classList.remove("active");
    e.target.classList.add("active");
    route();
  }
});

async function initializeApp() {
  // [핵심 수정] appContainer를 명시적으로 전달
  showLoading(
    appContainer,
    "데이터 로딩 중",
    "초기 데이터를 불러오고 있습니다..."
  );

  try {
    const allSpirits = await api.fetchAllSpirits();
    setAllSpirits(allSpirits);
    await route();
  } catch (error) {
    console.error("애플리케이션 초기화 실패:", error);
    appContainer.innerHTML = `<p class="error-message">데이터를 불러오는 데 실패했습니다. (${error.message})</p>`;
  } finally {
    hideLoading();
  }
}

initializeApp();

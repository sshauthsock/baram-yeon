import { state as globalState } from "../state.js";
import { createElement } from "../utils.js";
import { fetchRankings } from "../api.js";
import { showInfo as showSpiritInfoModal } from "../modalHandler.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import { STATS_MAPPING } from "../constants.js";

const pageState = {
  currentCategory: "수호",
  currentRankingType: "bond",
  currentStatKey: "bind",
};
const elements = {};

if (!window.rankingCache) window.rankingCache = {};

function getHTML() {
  return `
    <div class="sub-tabs" id="rankingCategoryTabs">
        <div class="tab active" data-category="수호">수호</div>
        <div class="tab" data-category="탑승">탑승</div>
        <div class="tab" data-category="변신">변신</div>
    </div>
    <div class="filters-container">
        <div class="filter-section">
            <div class="filter-label">랭킹 종류:</div>
            <div class="filter-buttons ranking-type-selector">
                <button class="filter-btn active" data-type="bond">결속 랭킹</button>
                <button class="filter-btn" data-type="stat">능력치 랭킹</button>
            </div>
        </div>
        <div class="filter-section" id="statSelectorContainer" style="display: none;">
            <label for="statSelector" class="filter-label">능력치:</label>
            <select id="statSelector" class="stat-selector"></select>
        </div>
    </div>
    <div class="ranking-container">
        <h1 class="ranking-title">환수 <span id="rankingCategoryTitle">수호</span> <span id="rankingTypeTitle">결속</span> 랭킹</h1>
        <div id="rankingsContainer" class="rankings-list"></div>
    </div>
  `;
}

async function loadAndRenderRankings() {
  const cacheKey = `${pageState.currentCategory}_${
    pageState.currentRankingType
  }_${pageState.currentRankingType === "stat" ? pageState.currentStatKey : ""}`;

  if (window.rankingCache[cacheKey]) {
    renderRankings(window.rankingCache[cacheKey]);
    return;
  }

  showLoading(
    elements.rankingsContainer,
    "랭킹 데이터 로딩 중",
    `${pageState.currentCategory} 랭킹을 불러오고 있습니다.`
  );
  try {
    const data = await fetchRankings(
      pageState.currentCategory,
      pageState.currentRankingType,
      pageState.currentStatKey
    );
    const rankings = data.rankings || [];
    window.rankingCache[cacheKey] = rankings;
    renderRankings(rankings);
  } catch (error) {
    console.error("랭킹 데이터 로드 실패:", error);
    elements.rankingsContainer.innerHTML = `<p class="error-message">랭킹 데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
  } finally {
    hideLoading();
  }
}

function renderRankings(rankingsData) {
  if (pageState.currentRankingType === "bond") {
    renderBondRankings(rankingsData);
  } else {
    renderStatRankings(rankingsData);
  }
}

function renderBondRankings(rankings) {
  const container = elements.rankingsContainer;
  if (!container) return;
  if (rankings.length === 0) {
    container.innerHTML = `<p class="no-data-message">결속 랭킹 데이터가 없습니다.</p>`;
    return;
  }
  const tableHtml = `
    <div class="ranking-table-container">
      <table class="ranking-table">
        <thead><tr><th>순위</th><th>조합</th><th>등급/세력</th><th>환산 점수</th></tr></thead>
        <tbody>
          ${rankings
            .map(
              (ranking, index) => `
            <tr class="ranking-row">
              <td class="rank-column"><div class="rank-badge rank-${
                index + 1
              }">${index + 1}</div></td>
              <td class="spirits-column"><div class="spirits-container">${ranking.spirits
                .map(
                  (spirit) =>
                    `<img src="/${spirit.image}" alt="${spirit.name}" title="${spirit.name}" class="spirit-image">`
                )
                .join("")}</div></td>
              <td class="faction-column"><div class="faction-tags">${renderSetInfo(
                ranking
              )}</div></td>
              <td class="score-column">
                <div class="total-score">${Math.round(
                  ranking.scoreWithBind
                )}</div>
                <div class="score-breakdown">(등급: ${Math.round(
                  ranking.gradeScore
                )} | 세력: ${Math.round(
                ranking.factionScore
              )} | 장착: ${Math.round(ranking.bindScore)})</div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
  container.innerHTML = tableHtml;
}

function renderStatRankings(rankings) {
  const container = elements.rankingsContainer;
  if (!container) return;
  if (rankings.length === 0) {
    container.innerHTML = `<p class="no-data-message">능력치 랭킹 데이터가 없습니다.</p>`;
    return;
  }
  const statDisplayName = elements.statSelector.selectedOptions[0].text;
  let html = `<h3 class="stat-ranking-title">${statDisplayName} 랭킹</h3><div class="stat-grid-container">`;
  rankings.forEach((ranking, index) => {
    html += `
      <div class="stat-card" data-name="${ranking.name}">
        <div class="rank-number">${index + 1}</div>
        <div class="spirit-image-container"><img src="/${ranking.image}" alt="${
      ranking.name
    }" class="spirit-image"></div>
        <div class="spirit-name">${ranking.name}</div>
        <div class="spirit-stat">${ranking.value}</div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderSetInfo(ranking) {
  let info = "";
  if (ranking.gradeCounts) {
    info += Object.entries(ranking.gradeCounts)
      .filter(([, count]) => count >= 2)
      .map(
        ([grade, count]) => `<span class="grade-tag">${grade} x${count}</span>`
      )
      .join(" ");
  }
  if (ranking.factionCounts) {
    info += Object.entries(ranking.factionCounts)
      .filter(([, count]) => count >= 2)
      .map(
        ([faction, count]) =>
          `<span class="faction-tag">${faction} x${count}</span>`
      )
      .join(" ");
  }
  return info;
}

function initStatFilter() {
  const statSelector = elements.statSelector;
  statSelector.innerHTML = "";
  const mainStats = {
    bind: "장착효과(환산)",
    registration: "등록효과(환산)",
    ...STATS_MAPPING,
  };
  Object.entries(mainStats).forEach(([key, name]) => {
    statSelector.appendChild(
      createElement("option", "", { value: key, text: name })
    );
  });
}

function setupEventListeners() {
  elements.container.addEventListener("click", handleContainerClick);
  elements.statSelector.addEventListener("change", handleStatChange);
}

function handleContainerClick(e) {
  const subTab = e.target.closest("#rankingCategoryTabs .tab");
  if (subTab && !subTab.classList.contains("active")) {
    elements.subTabs.querySelector(".tab.active").classList.remove("active");
    subTab.classList.add("active");
    pageState.currentCategory = subTab.dataset.category;
    document.getElementById("rankingCategoryTitle").textContent =
      pageState.currentCategory;
    loadAndRenderRankings();
    return;
  }
  const typeBtn = e.target.closest(".ranking-type-selector .filter-btn");
  if (typeBtn && !typeBtn.classList.contains("active")) {
    elements.container
      .querySelector(".ranking-type-selector .filter-btn.active")
      .classList.remove("active");
    typeBtn.classList.add("active");
    pageState.currentRankingType = typeBtn.dataset.type;
    elements.statSelectorContainer.style.display =
      pageState.currentRankingType === "stat" ? "flex" : "none";
    document.getElementById("rankingTypeTitle").textContent =
      typeBtn.textContent;
    loadAndRenderRankings();
    return;
  }
  const spiritImage = e.target.closest(".spirit-image, .stat-card");
  if (spiritImage) {
    const spiritName = spiritImage.alt || spiritImage.dataset.name;
    const spiritData = globalState.allSpirits.find(
      (s) => s.name === spiritName
    );
    if (spiritData) {
      showSpiritInfoModal(spiritData, null, true);
    }
  }
}

function handleStatChange(e) {
  pageState.currentStatKey = e.target.value;
  loadAndRenderRankings();
}

export async function init(container) {
  container.innerHTML = getHTML();

  elements.container = container;
  elements.subTabs = container.querySelector("#rankingCategoryTabs");
  elements.rankingsContainer = container.querySelector("#rankingsContainer");
  elements.statSelectorContainer = container.querySelector(
    "#statSelectorContainer"
  );
  elements.statSelector = container.querySelector("#statSelector");

  initStatFilter();
  setupEventListeners();

  await loadAndRenderRankings();

  console.log("환수 랭킹 페이지 초기화 완료.");
}

export function cleanup() {
  if (elements.container) {
    elements.container.removeEventListener("click", handleContainerClick);
  }
  if (elements.statSelector) {
    elements.statSelector.removeEventListener("change", handleStatChange);
  }
  console.log("환수 랭킹 페이지 정리 완료.");
}

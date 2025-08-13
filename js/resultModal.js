import { createElement } from "./utils.js";
import { getHistoryForCategory } from "./historyManager.js";
import { state as globalState } from "./state.js";
import { FACTION_ICONS, STATS_MAPPING } from "./constants.js";

let activeModal = null;

function ensureNumber(value) {
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

function createBaseModal() {
  removeAllModals();
  const modal = createElement("div", "modal-overlay", { id: "optimalModal" });
  const content = createElement("div", "modal-content", {
    id: "optimalModalContent",
  });
  const closeButton = createElement("button", "modal-close", {
    id: "closeOptimalModal",
    text: "✕",
  });
  content.appendChild(closeButton);
  modal.appendChild(content);
  document.body.appendChild(modal);
  closeButton.onclick = removeAllModals;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) removeAllModals();
  });
  const escListener = (e) => {
    if (e.key === "Escape") removeAllModals();
  };
  document.addEventListener("keydown", escListener);
  modal._escListener = escListener;
  activeModal = modal;
  return { modal, content };
}

export function showResultModal(result) {
  if (
    !result ||
    !Array.isArray(result.combination) ||
    result.combination.length === 0
  ) {
    alert("계산 결과 데이터가 올바르지 않습니다.");
    return;
  }
  const { modal, content } = createBaseModal();
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  renderResultContent(result, content);
}

function renderResultContent(result, container) {
  container.innerHTML = "";
  const closeButton = createElement("button", "modal-close", { text: "✕" });
  closeButton.onclick = removeAllModals;
  const title = createElement("h3", "modal-title", {
    text: `📊 ${result.spirits[0].type} 결속 최적 조합`,
  });
  const headerDiv = createElement("div", "optimal-header", {
    id: "optimalHeader",
  });
  const historyContainer = createElement("div", "history-tabs-container", {
    id: "historyContainer",
  });
  const combinationContainer = createElement(
    "div",
    "combination-results-container",
    { id: "combinationResultsContainer" }
  );
  const resultsContainer = createElement("div", "results-container");
  resultsContainer.innerHTML = `<div class="results-section-wrapper"><div class="results-section" id="optimalGradeEffects"></div></div><div class="results-section-wrapper"><div class="results-section" id="optimalFactionEffects"></div></div><div class="results-section-wrapper"><div class="results-section" id="optimalBindEffects"></div></div>`;
  const detailsContainer = createElement("div", "spirit-details-container", {
    id: "optimalSpiritsDetails",
  });
  container.append(
    closeButton,
    title,
    headerDiv,
    historyContainer,
    combinationContainer,
    resultsContainer,
    detailsContainer
  );
  updateResultView(result);
  renderHistoryTabs(result.spirits[0].type);
}

/**
 * [핵심 수정] combinationContainer의 innerHTML을 올바르게 생성합니다.
 */
function updateResultView(result) {
  const {
    gradeScore,
    factionScore,
    bindScore,
    gradeEffects,
    factionEffects,
    bindStats,
    spirits,
  } = result;

  const gradeCounts = spirits.reduce((acc, spirit) => {
    acc[spirit.grade] = (acc[spirit.grade] || 0) + 1;
    return acc;
  }, {});
  const factionCounts = spirits.reduce((acc, spirit) => {
    if (spirit.influence)
      acc[spirit.influence] = (acc[spirit.influence] || 0) + 1;
    return acc;
  }, {});

  const combinedScore = Math.round(
    ensureNumber(gradeScore) +
      ensureNumber(factionScore) +
      ensureNumber(bindScore)
  );

  document.getElementById("optimalHeader").innerHTML = `
        <div class="optimal-score-card">
            <div class="score-title">종합 환산 점수</div>
            <div class="score-value">${combinedScore}</div>
            <div class="score-breakdown">(등급: ${Math.round(
              ensureNumber(gradeScore)
            )} + 세력: ${Math.round(
    ensureNumber(factionScore)
  )} + 장착: ${Math.round(ensureNumber(bindScore))})</div>
        </div>
    `;

  // 이 부분이 수정되었습니다.
  document.getElementById("combinationResultsContainer").innerHTML = `
        <div class="spirit-combination-card">
            <div class="spirits-grid-container">${spirits
              .map(
                (spirit) => `
                <div class="spirit-info-item" title="${spirit.name} (Lv.${
                  spirit.level || 25
                })">
                    <img src="/${spirit.image}" alt="${spirit.name}">
                    <div class="spirit-info-name">${spirit.name}</div>
                </div>`
              )
              .join("")}
            </div>
        </div>
    `;

  renderEffects(
    "optimalGradeEffects",
    "👑 등급 효과",
    gradeEffects,
    gradeScore,
    { gradeCounts }
  );
  renderEffects(
    "optimalFactionEffects",
    "🚩 세력 효과",
    factionEffects,
    factionScore,
    { factionCounts }
  );
  renderEffects("optimalBindEffects", "🔗 장착 효과", bindStats, bindScore);
  renderSpiritDetailsTable(spirits);
}

function renderEffects(elementId, title, effects, score, counts = {}) {
  const container = document.getElementById(elementId);
  if (!container) return;
  let setInfoHtml = "";
  if (counts.gradeCounts) {
    setInfoHtml = Object.entries(counts.gradeCounts)
      .filter(([, count]) => count >= 2)
      .map(
        ([grade, count]) =>
          `<span class="grade-tag grade-tag-${
            grade === "전설" ? "legend" : "immortal"
          }">${grade} X ${count}</span>`
      )
      .join(" ");
  }
  if (counts.factionCounts) {
    setInfoHtml = Object.entries(counts.factionCounts)
      .filter(([, count]) => count >= 2)
      .map(([faction, count]) => {
        const iconPath = FACTION_ICONS[faction] || "";
        return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
      })
      .join(" ");
  }
  let effectsListHtml = '<p class="no-effects">적용된 효과가 없습니다.</p>';
  if (effects && Array.isArray(effects) && effects.length > 0) {
    effectsListHtml = `<ul class="effects-list">${effects
      .map(
        (stat) =>
          `<li><span class="stat-name">${stat.name}</span><span class="stat-value">${stat.value}</span></li>`
      )
      .join("")}</ul>`;
  }
  container.innerHTML = `
        <h4>${title} <span class="section-score">${Math.round(
    ensureNumber(score)
  )}</span></h4>
        ${setInfoHtml ? `<div class="set-info">${setInfoHtml}</div>` : ""}
        <div class="effects-content">${effectsListHtml}</div>
    `;
}

function renderHistoryTabs(category) {
  const history = getHistoryForCategory(category);
  const container = document.getElementById("historyContainer");
  if (!container || history.length === 0) {
    if (container)
      container.innerHTML = `<p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>`;
    return;
  }
  let highestScore = -1,
    highestScoreId = null;
  history.forEach((entry) => {
    const score = Math.round(
      ensureNumber(entry.gradeScore) +
        ensureNumber(entry.factionScore) +
        ensureNumber(entry.bindScore)
    );
    if (score > highestScore) {
      highestScore = score;
      highestScoreId = entry.id;
    }
  });
  const newestId = history.reduce((a, b) => (a.id > b.id ? a : b)).id;
  const tabsHtml = Array(5)
    .fill(null)
    .map((_, index) => {
      const entry = history[index];
      if (!entry) return `<div class="history-tab-placeholder"></div>`;
      const score = Math.round(
        ensureNumber(entry.gradeScore) +
          ensureNumber(entry.factionScore) +
          ensureNumber(entry.bindScore)
      );
      const isNewest = entry.id === newestId;
      const isBest = entry.id === highestScoreId;
      return `<button class="history-tab ${isBest ? "best" : ""} ${
        isNewest ? "newest" : ""
      }" data-history-index="${index}">
            <div class="tab-indicators">
                ${isNewest ? '<span class="current-marker">최신</span>' : ""}
                ${isBest ? '<span class="best-marker">최고</span>' : ""}
            </div>
            <div class="tab-score">${score}</div>
        </button>`;
    })
    .join("");
  container.innerHTML = `<div class="history-tabs">${tabsHtml}</div>`;
  container.querySelectorAll(".history-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      container
        .querySelectorAll(".history-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const index = parseInt(tab.dataset.historyIndex, 10);
      updateResultView(history[index]);
    });
  });
  container.querySelector(".history-tab.newest")?.classList.add("active");
}

function renderSpiritDetailsTable(spirits) {
  const container = document.getElementById("optimalSpiritsDetails");
  if (!container) return;
  const allStatKeys = new Set();
  spirits.forEach((spirit) => {
    const fullSpiritData = globalState.allSpirits.find(
      (s) => s.name === spirit.name
    );
    if (!fullSpiritData) return;
    const levelStats = fullSpiritData.stats.find(
      (s) => s.level === (spirit.level || 25)
    );
    if (levelStats?.bindStat)
      Object.keys(levelStats.bindStat).forEach((key) => allStatKeys.add(key));
  });
  if (allStatKeys.size === 0) {
    container.innerHTML =
      "<h4>상세 스탯 비교</h4><p>결속 스탯 정보가 없습니다.</p>";
    return;
  }
  const sortedStatKeys = [...allStatKeys].sort();
  let tableHtml = `<h4>상세 스탯 비교</h4><div class="table-wrapper"><table class="spirits-stats-table"><thead><tr><th>능력치</th>${spirits
    .map(
      (s) =>
        `<th><img src="/${s.image}" class="spirit-thumbnail" alt="${s.name}" title="${s.name}"><br>${s.name}</th>`
    )
    .join("")}</tr></thead><tbody>`;
  sortedStatKeys.forEach((statKey) => {
    tableHtml += `<tr><th>${STATS_MAPPING[statKey] || statKey}</th>`;
    spirits.forEach((spirit) => {
      const fullSpiritData = globalState.allSpirits.find(
        (s) => s.name === spirit.name
      );
      const levelStats = fullSpiritData?.stats.find(
        (s) => s.level === (spirit.level || 25)
      );
      const value = levelStats?.bindStat?.[statKey] || 0;
      tableHtml += `<td>${value}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</tbody></table></div>`;
  container.innerHTML = tableHtml;
}

export function removeAllModals() {
  if (activeModal) {
    document.removeEventListener("keydown", activeModal._escListener);
    activeModal.remove();
    activeModal = null;
  }
  document.body.style.overflow = "auto";
}

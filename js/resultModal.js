import { createElement } from "./utils.js";
import { getHistoryForCategory } from "./historyManager.js";
import { state as globalState } from "./state.js";
import { FACTION_ICONS, STATS_MAPPING, PERCENT_STATS } from "./constants.js"; // PERCENT_STATS 임포트

let activeModal = null; // 현재 활성화된 모달을 추적

// 콤마가 포함된 문자열 숫자나 기타 타입을 float로 안전하게 변환
function ensureNumber(value) {
  if (value === undefined || value === null) return 0;
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * 기본 모달 오버레이 및 콘텐츠 구조를 생성합니다.
 */
function createBaseModal() {
  removeAllModals(); // 기존 모달이 있다면 닫기
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

  closeButton.onclick = removeAllModals; // 닫기 버튼 클릭 이벤트
  modal.addEventListener("click", (e) => {
    if (e.target === modal) removeAllModals(); // 모달 외부 클릭 시 닫기
  });

  // ESC 키로 모달 닫기
  const escListener = (e) => {
    if (e.key === "Escape") removeAllModals();
  };
  document.addEventListener("keydown", escListener);
  modal._escListener = escListener; // 이벤트 리스너 참조 저장

  activeModal = modal; // 현재 활성화된 모달로 설정
  return { modal, content };
}

/**
 * 최적 조합 계산 결과를 표시하는 모달을 띄웁니다.
 * @param {object} result - 계산 결과 데이터 객체
 */
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
  modal.style.display = "flex"; // 모달 표시
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지
  renderResultContent(result, content); // 모달 콘텐츠 렌더링
}

/**
 * 모달의 내부 콘텐츠를 렌더링합니다.
 * @param {object} result - 계산 결과 데이터
 * @param {HTMLElement} container - 콘텐츠가 렌더링될 부모 요소
 */
function renderResultContent(result, container) {
  container.innerHTML = ""; // 기존 콘텐츠 초기화

  const closeButton = createElement("button", "modal-close", { text: "✕" });
  closeButton.onclick = removeAllModals;

  const title = createElement("h3", "modal-title", {
    text: `📊 ${result.spirits[0].type} 결속 최적 조합`,
  });

  // 주요 점수 및 조합 이미지 표시 영역
  const headerDiv = createElement("div", "optimal-header", {
    id: "optimalHeader",
  });
  const combinationContainer = createElement(
    "div",
    "combination-results-container",
    { id: "combinationResultsContainer" }
  );

  // 세트 효과 및 장착 효과 표시 영역
  const resultsContainer = createElement("div", "results-container");
  resultsContainer.innerHTML = `
        <div class="results-section-wrapper"><div class="results-section" id="optimalGradeEffects"></div></div>
        <div class="results-section-wrapper"><div class="results-section" id="optimalFactionEffects"></div></div>
        <div class="results-section-wrapper"><div class="results-section" id="optimalBindEffects"></div></div>
    `;

  // 환수별 상세 스탯 테이블 영역
  const detailsContainer = createElement("div", "spirit-details-container", {
    id: "optimalSpiritsDetails",
  });

  // 기록 탭 영역
  const historyContainer = createElement("div", "history-tabs-container", {
    id: "historyContainer",
  });

  container.append(
    closeButton,
    title,
    headerDiv,
    historyContainer, // 기록 탭을 헤더 아래에 배치
    combinationContainer,
    resultsContainer,
    detailsContainer
  );

  // 결과 UI 업데이트
  updateResultView(result);
  // 기록 탭 렌더링 (최초 로딩 시 현재 결과 탭이 활성화되도록)
  renderHistoryTabs(result.spirits[0].type);
}

/**
 * 계산 결과 데이터를 기반으로 UI를 업데이트합니다.
 * 이 함수는 초기 렌더링 및 기록 탭 클릭 시 재사용됩니다.
 * @param {object} result - 계산 결과 데이터
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

  // 등급 및 세력별 개수 집계 (세트 효과 정보 표시용)
  const gradeCounts = spirits.reduce((acc, spirit) => {
    acc[spirit.grade] = (acc[spirit.grade] || 0) + 1;
    return acc;
  }, {});
  const factionCounts = spirits.reduce((acc, spirit) => {
    if (spirit.influence)
      acc[spirit.influence] = (acc[spirit.influence] || 0) + 1;
    return acc;
  }, {});

  // 종합 환산 점수 계산 및 표시
  const combinedScore = Math.round(
    ensureNumber(gradeScore) +
      ensureNumber(factionScore) +
      ensureNumber(bindScore)
  );

  document.getElementById("optimalHeader").innerHTML = `
        <div class="optimal-score-card">
            <div class="score-title">종합 환산 점수</div>
            <div class="score-value">${combinedScore}</div>
            <div class="score-breakdown">
                (등급: ${Math.round(ensureNumber(gradeScore))} 
                + 세력: ${Math.round(ensureNumber(factionScore))} 
                + 장착: ${Math.round(ensureNumber(bindScore))})
            </div>
        </div>
    `;

  // 선택된 환수 조합 이미지 그리드 렌더링
  document.getElementById("combinationResultsContainer").innerHTML = `
        <div class="spirit-combination-card">
            <div class="spirits-grid-container">${spirits
              .map(
                (spirit) => `
                <div class="spirit-info-item" title="${spirit.name} (Lv.${
                  spirit.stats?.[0]?.level || 25
                })">
                    <img src="/${spirit.image}" alt="${spirit.name}">
                    <div class="spirit-info-name">${spirit.name}</div>
                    <div class="spirit-info-level">Lv.${
                      spirit.stats?.[0]?.level || 25
                    }</div>
                </div>`
              )
              .join("")}
            </div>
        </div>
    `;

  // 각 효과 섹션 렌더링
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
  // BindStats는 모든 스탯의 합계이므로, 별도의 카운트는 불필요
  renderEffects("optimalBindEffects", "🔗 장착 효과", bindStats, bindScore);

  // 환수별 상세 스탯 테이블 렌더링
  renderSpiritDetailsTable(spirits);
}

/**
 * 등급, 세력, 장착 효과 섹션을 렌더링합니다.
 * @param {string} elementId - 렌더링할 HTML 요소의 ID
 * @param {string} title - 섹션 제목
 * @param {Array<object>} effects - 스탯 효과 배열
 * @param {number} score - 해당 섹션의 점수
 * @param {object} [counts={}] - 등급 또는 세력별 카운트 (세트 효과 정보 표시용)
 */
function renderEffects(elementId, title, effects, score, counts = {}) {
  const container = document.getElementById(elementId);
  if (!container) return;

  let setInfoHtml = "";
  if (counts.gradeCounts) {
    // 등급 세트 효과 정보
    setInfoHtml = Object.entries(counts.gradeCounts)
      .filter(([, count]) => count >= 2)
      .map(
        ([grade, count]) =>
          `<span class="grade-tag grade-tag-${
            grade === "전설" ? "legend" : "immortal"
          }">${grade} X ${count}</span>`
      )
      .join(" ");
  } else if (counts.factionCounts) {
    // 세력 세트 효과 정보
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
      .map((stat) => {
        const isPercent = PERCENT_STATS.includes(stat.key); // constants.js의 PERCENT_STATS 사용
        const displayValue = isPercent
          ? `${ensureNumber(stat.value)}%`
          : ensureNumber(stat.value);
        return `<li><span class="stat-name">${stat.name}</span><span class="stat-value">${displayValue}</span></li>`;
      })
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

/**
 * 저장된 기록 탭을 렌더링하고 이벤트 리스너를 부착합니다.
 * @param {string} category - 현재 환수 카테고리 (수호, 탑승, 변신)
 */
function renderHistoryTabs(category) {
  const history = getHistoryForCategory(category); // historyManager에서 기록 가져오기
  const container = document.getElementById("historyContainer");

  if (!container) return; // 컨테이너 없으면 종료

  if (history.length === 0) {
    container.innerHTML = `<p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>`;
    return;
  }

  // 가장 높은 점수 및 가장 최신 항목 찾기
  let highestScore = -1,
    highestScoreId = null;
  let newestId = null;
  if (history.length > 0) {
    newestId = history[0].id; // getHistoryForCategory는 최신순으로 정렬됨
  }

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

  // 탭 버튼 HTML 생성
  const tabsHtml = Array(5) // MAX_HISTORY가 5이므로 5개의 탭을 만듦
    .fill(null)
    .map((_, index) => {
      // history는 최신순 정렬이므로 인덱스를 역으로 사용하거나,
      // 순환 버퍼처럼 사용되는 historyManager의 인덱스에 매핑하여 표시
      const entry = history.find((h, i) => {
        // historyManager.js에서 저장된 순서에 따라 탭 번호 매기기 (0~4)
        // 이 부분은 historyManager의 내부 저장 방식과 연동되어야 합니다.
        // 현재 historyManager는 단순 배열을 MAX_HISTORY만큼 덮어쓰므로,
        // 가장 최근에 저장된 5개를 최신순으로 가져오는 것으로 가정합니다.
        // 따라서 history[index]를 바로 사용하면 됩니다.
        // (가장 최근에 저장된 것이 history[0]이 됨)
        return i === index;
      });

      if (!entry) return `<div class="history-tab-placeholder"></div>`; // 빈 탭 자리

      const score = Math.round(
        ensureNumber(entry.gradeScore) +
          ensureNumber(entry.factionScore) +
          ensureNumber(entry.bindScore)
      );
      const isNewest = entry.id === newestId;
      const isBest = entry.id === highestScoreId;

      return `<button class="history-tab ${isBest ? "best" : ""} ${
        isNewest ? "newest" : ""
      }" data-history-id="${entry.id}" data-history-index="${index}">
            <div class="tab-indicators">
                ${isNewest ? '<span class="current-marker">최신</span>' : ""}
                ${isBest ? '<span class="best-marker">최고</span>' : ""}
            </div>
            <div class="tab-score">${score}</div>
            <div class="tab-content"><span>${
              entry.timestamp.split(" ")[0]
            }</span></div>
        </button>`;
    })
    .join("");

  container.innerHTML = `<div class="history-tabs">${tabsHtml}</div>`;

  // 탭 클릭 이벤트 리스너 부착
  container.querySelectorAll(".history-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      // 모든 탭의 'active' 클래스 제거
      container
        .querySelectorAll(".history-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active"); // 클릭된 탭 활성화

      const clickedId = parseInt(tab.dataset.historyId, 10);
      const selectedEntry = history.find((entry) => entry.id === clickedId);
      if (selectedEntry) {
        updateResultView(selectedEntry); // 해당 기록으로 UI 업데이트
      }
    });
  });

  // 페이지 로드 시 가장 최신 탭을 활성화
  container.querySelector(".history-tab.newest")?.classList.add("active");
}

/**
 * 선택된 환수들의 상세 스탯 비교 테이블을 렌더링합니다.
 * @param {Array<object>} spirits - 선택된 환수 목록 (계산 결과에 포함된 spirits)
 */
function renderSpiritDetailsTable(spirits) {
  const container = document.getElementById("optimalSpiritsDetails");
  if (!container) return;

  // 모든 환수가 가진 스탯 키를 모으고 정렬
  const allStatKeys = new Set();
  spirits.forEach((spirit) => {
    // globalState.allSpirits에서 전체 환수 데이터를 찾아야 정확한 레벨25 스탯을 가져올 수 있음
    const fullSpiritData = globalState.allSpirits.find(
      (s) => s.name === spirit.name && s.type === spirit.type
    );
    if (!fullSpiritData) return;

    // 계산 시 사용된 레벨 (result.spirits[].stats[0].level)을 사용하거나, 랭킹이라면 25 고정
    const actualLevel = spirit.stats?.[0]?.level || 25;
    const levelStats = fullSpiritData.stats.find(
      (s) => s.level === actualLevel
    );

    if (levelStats?.bindStat)
      Object.keys(levelStats.bindStat).forEach((key) => allStatKeys.add(key));
    // 등록 효과 스탯도 포함할 수 있음, 필요에 따라 추가
    // if (levelStats?.registrationStat) Object.keys(levelStats.registrationStat).forEach((key) => allStatKeys.add(key));
  });

  if (allStatKeys.size === 0) {
    container.innerHTML =
      "<h4>상세 스탯 비교</h4><p>선택된 환수의 장착 효과 스탯 정보가 없습니다.</p>";
    return;
  }

  const sortedStatKeys = [...allStatKeys].sort();

  // 테이블 헤더 생성
  let tableHtml = `
        <h4>상세 스탯 비교</h4>
        <div class="table-wrapper">
            <table class="spirits-stats-table">
                <thead>
                    <tr>
                        <th>능력치</th>
                        ${spirits
                          .map(
                            (s) =>
                              `<th><img src="/${
                                s.image
                              }" class="spirit-thumbnail" alt="${
                                s.name
                              }" title="${s.name}"><br>${s.name} (Lv.${
                                s.stats?.[0]?.level || 25
                              })</th>`
                          )
                          .join("")}
                    </tr>
                </thead>
                <tbody>
    `;

  // 테이블 행 생성
  sortedStatKeys.forEach((statKey) => {
    tableHtml += `<tr><th>${STATS_MAPPING[statKey] || statKey}</th>`;
    spirits.forEach((spirit) => {
      const fullSpiritData = globalState.allSpirits.find(
        (s) => s.name === spirit.name && s.type === spirit.type
      );
      const actualLevel = spirit.stats?.[0]?.level || 25;
      const levelStats = fullSpiritData?.stats.find(
        (s) => s.level === actualLevel
      );

      // 해당 스탯의 값 가져오기 (bindStat에서만)
      const value = ensureNumber(levelStats?.bindStat?.[statKey]);

      // 퍼센트 스탯 여부 확인 및 포맷팅
      const displayValue = PERCENT_STATS.includes(statKey)
        ? `${value}%`
        : value;

      tableHtml += `<td>${displayValue}</td>`;
    });
    tableHtml += `</tr>`;
  });

  tableHtml += `</tbody></table></div>`;
  container.innerHTML = tableHtml;
}

/**
 * 모든 모달을 DOM에서 제거하고 배경 스크롤을 복원합니다.
 */
export function removeAllModals() {
  if (activeModal) {
    document.removeEventListener("keydown", activeModal._escListener);
    activeModal.remove();
    activeModal = null;
  }
  document.body.style.overflow = "auto";
}

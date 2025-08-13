import { state as globalState } from "../state.js";
import { calculateOptimalCombination } from "../api.js";
import { createElement } from "../utils.js";
import { showResultModal as showOptimalResultModal } from "../resultModal.js";
import { addResult as addHistory } from "../historyManager.js";
import { renderSpiritGrid } from "../components/spritGrid.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import { checkSpiritStats } from "../utils.js";
import { INFLUENCE_ROWS, GRADE_ORDER, STATS_MAPPING } from "../constants.js";

const pageState = {
  currentCategory: "수호",
  selectedSpirits: new Map(),
  groupByInfluence: false,
  currentStatFilter: "",
};
const elements = {};

function getHTML() {
  return `
    <div class="sub-tabs" id="bondCategoryTabs"><div class="tab active" data-category="수호">수호</div><div class="tab" data-category="탑승">탑승</div><div class="tab" data-category="변신">변신</div></div>
    <div class="view-toggle-container"><label class="toggle-switch"><input type="checkbox" id="influenceToggle"><span class="slider round"></span></label><span class="toggle-label">세력별 보기</span><div class="stat-filter-container"></div></div>
    <div class="bond-container"><div class="main-content"><div class="left-panel"><h2>전체 환수 목록</h2><div id="spiritListContainer" class="spirit-selection"></div></div><div class="right-panel"><div class="selected-spirits-container"><div class="selected-spirits-header"><h3>선택된 환수 (<span id="selectedCount">0</span>)</h3><button id="clearSelectionBtn" class="clear-selection-btn">현재 탭 전체 해제</button></div><div id="selectedSpiritsList" class="selected-spirits"></div><div class="header-controls"><div class="level-batch-control"><label>일괄 레벨:</label><input type="number" id="batchLevelInput" min="0" max="25" value="0"><button id="applyBatchLevelBtn" class="btn btn-primary">적용</button></div><div class="calculate-btn-small"><button id="findOptimalBtn" class="btn btn-secondary">최적 조합 찾기</button></div></div></div></div></div></div>`;
}

function renderAll() {
  renderSpiritList();
  renderSelectedList();
  saveStateToStorage();
}

function renderSpiritList() {
  let spirits = getSpiritsForCurrentState();
  if (pageState.currentStatFilter) {
    spirits = filterSpiritsByStat(spirits, pageState.currentStatFilter);
  }

  renderSpiritGrid({
    container: elements.spiritListContainer,
    spirits: spirits,
    onSpiritClick: handleSpiritSelect,
    getSpiritState: (spirit) => {
      const { hasFullRegistration, hasFullBind } = checkSpiritStats(spirit);
      return {
        selected: pageState.selectedSpirits.has(spirit.name),
        registrationCompleted: hasFullRegistration,
        bondCompleted: hasFullBind,
      };
    },
    groupByInfluence: pageState.groupByInfluence,
  });
}

function getSpiritsForCurrentState() {
  const extractNumber = (path) =>
    path ? parseInt(path.match(/\d+/)?.[0] || "999", 10) : 999;
  const filtered = globalState.allSpirits.filter(
    (s) => s.type === pageState.currentCategory
  );
  filtered.sort((a, b) => {
    const orderA = GRADE_ORDER[a.grade] || 99;
    const orderB = GRADE_ORDER[b.grade] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return extractNumber(a.image) - extractNumber(b.image);
  });
  return filtered;
}

function filterSpiritsByStat(spirits, statKey) {
  if (!statKey) return spirits;
  return spirits.filter((spirit) => checkItemForStatEffect(spirit, statKey));
}

function checkItemForStatEffect(item, statKey) {
  if (!item?.stats) return false;
  for (const stat of item.stats) {
    if (stat?.registrationStat?.[statKey] || stat?.bindStat?.[statKey])
      return true;
  }
  return false;
}

function renderSelectedList() {
  const container = elements.selectedSpiritsList;
  container.innerHTML = "";
  const currentCategorySpirits = [...pageState.selectedSpirits.values()].filter(
    (s) => s.type === pageState.currentCategory
  );
  elements.selectedCount.textContent = currentCategorySpirits.length;
  if (currentCategorySpirits.length === 0) {
    container.innerHTML = "<p>선택된 환수가 없습니다.</p>";
    return;
  }
  currentCategorySpirits.forEach((spirit) => {
    const card = createElement("div", "selected-spirit-card", {
      "data-spirit-name": spirit.name,
    });
    card.innerHTML = `
        <button class="remove-spirit" data-action="remove">X</button>
        <div class="selected-spirit-header"><img src="/${spirit.image}" alt="${spirit.name}"><div class="spirit-info"><div class="spirit-name">${spirit.name}</div></div></div>
        <div class="spirit-level-control">
            <button class="level-btn min-btn" data-action="min-level">m</button>
            <button class="level-btn minus-btn" data-action="level-down">-</button>
            <input type="number" class="level-input" min="0" max="25" value="${spirit.level}">
            <button class="level-btn plus-btn" data-action="level-up">+</button>
            <button class="level-btn max-btn" data-action="max-level">M</button>
        </div>`;
    container.appendChild(card);
  });
}

function saveStateToStorage() {
  localStorage.setItem(
    "bondCalculatorState",
    JSON.stringify({
      category: pageState.currentCategory,
      spirits: [...pageState.selectedSpirits.values()],
    })
  );
}

function loadStateFromStorage() {
  const savedState = localStorage.getItem("bondCalculatorState");
  if (savedState) {
    try {
      const data = JSON.parse(savedState);
      pageState.currentCategory = data.category || "수호";
      pageState.selectedSpirits = new Map(data.spirits.map((s) => [s.name, s]));
    } catch (e) {
      console.error("Error loading state from storage:", e);
      pageState.selectedSpirits = new Map();
    }
  }
}

function initStatFilter() {
  const filterContainer = elements.container.querySelector(
    ".stat-filter-container"
  );
  filterContainer.innerHTML = "";
  const statFilter = createElement("select", "stat-filter", {
    id: "statFilter",
  });
  statFilter.appendChild(
    createElement("option", "", { value: "", text: "능력치 필터" })
  );
  const clearBtn = createElement("button", "clear-filter-btn", {
    text: "초기화",
  });
  clearBtn.style.display = "none";
  filterContainer.append(statFilter, clearBtn);
  elements.statFilter = statFilter;
  elements.clearFilterBtn = clearBtn;
  populateStatOptions(statFilter);
  statFilter.addEventListener("change", function () {
    pageState.currentStatFilter = this.value;
    elements.clearFilterBtn.style.display = this.value ? "block" : "none";
    renderSpiritList();
  });
  clearBtn.addEventListener("click", () => {
    statFilter.value = "";
    pageState.currentStatFilter = "";
    elements.clearFilterBtn.style.display = "none";
    renderSpiritList();
  });
}

function populateStatOptions(selectElement) {
  const allStats = new Set();
  globalState.allSpirits.forEach((s) =>
    s.stats.forEach((stat) => {
      if (stat.bindStat)
        Object.keys(stat.bindStat).forEach((key) => allStats.add(key));
      if (stat.registrationStat)
        Object.keys(stat.registrationStat).forEach((key) => allStats.add(key));
    })
  );
  [...allStats].sort().forEach((key) =>
    selectElement.appendChild(
      createElement("option", "", {
        value: key,
        text: STATS_MAPPING[key] || key,
      })
    )
  );
}

function setupEventListeners() {
  elements.container.addEventListener("click", handleContainerClick);
  elements.influenceToggle.addEventListener("change", handleToggleChange);
  elements.selectedSpiritsList.addEventListener(
    "change",
    handleLevelInputChange
  );
}

function handleContainerClick(e) {
  const subTab = e.target.closest("#bondCategoryTabs .tab");
  if (subTab && !subTab.classList.contains("active")) {
    elements.bondCategoryTabs
      .querySelector(".tab.active")
      .classList.remove("active");
    subTab.classList.add("active");
    pageState.currentCategory = subTab.dataset.category;
    renderAll();
    return;
  }
  const rightPanel = e.target.closest(".right-panel");
  if (rightPanel) {
    handleRightPanelClick(e);
  }
}

function handleSpiritSelect(spirit) {
  if (!spirit) return;
  const spiritName = spirit.name;
  if (pageState.selectedSpirits.has(spiritName)) {
    pageState.selectedSpirits.delete(spiritName);
  } else {
    if (
      [...pageState.selectedSpirits.values()].filter(
        (s) => s.type === pageState.currentCategory
      ).length >= 40
    ) {
      alert(
        `${pageState.currentCategory} 카테고리는 최대 40개까지만 선택할 수 있습니다.`
      );
      return;
    }
    pageState.selectedSpirits.set(spiritName, { ...spirit, level: 0 });
  }
  renderAll();
}

function handleToggleChange(e) {
  pageState.groupByInfluence = e.target.checked;
  renderSpiritList();
}

function handleRightPanelClick(e) {
  const target = e.target;
  if (target.matches("#clearSelectionBtn")) handleClearSelection();
  else if (target.matches("#applyBatchLevelBtn")) handleBatchLevel();
  else if (target.matches("#findOptimalBtn")) handleFindOptimal();

  const card = target.closest(".selected-spirit-card");
  if (!card) return;
  const spiritName = card.dataset.spiritName;
  const spirit = pageState.selectedSpirits.get(spiritName);
  if (!spirit) return;

  const action = target.dataset.action;
  if (action === "remove") pageState.selectedSpirits.delete(spiritName);
  else if (action === "level-down")
    spirit.level = Math.max(0, spirit.level - 1);
  else if (action === "level-up") spirit.level = Math.min(25, spirit.level + 1);
  else if (action === "min-level") spirit.level = 0;
  else if (action === "max-level") spirit.level = 25;
  renderAll();
}

function handleLevelInputChange(e) {
  if (e.target.matches(".level-input")) {
    const card = e.target.closest(".selected-spirit-card");
    const spirit = pageState.selectedSpirits.get(card.dataset.spiritName);
    if (spirit) {
      let newLevel = parseInt(e.target.value, 10);
      if (isNaN(newLevel) || newLevel < 0) newLevel = 0;
      if (newLevel > 25) newLevel = 25;
      spirit.level = newLevel;
      e.target.value = newLevel;
      saveStateToStorage();
    }
  }
}

function handleClearSelection() {
  [...pageState.selectedSpirits.values()]
    .filter((s) => s.type === pageState.currentCategory)
    .forEach((s) => pageState.selectedSpirits.delete(s.name));
  renderAll();
}

function handleBatchLevel() {
  const batchLevel = parseInt(elements.batchLevelInput.value, 10);
  if (isNaN(batchLevel) || batchLevel < 0 || batchLevel > 25) {
    alert("0에서 25 사이의 레벨을 입력해주세요.");
    return;
  }
  pageState.selectedSpirits.forEach((s) => {
    if (s.type === pageState.currentCategory) s.level = batchLevel;
  });
  renderAll();
}

async function handleFindOptimal() {
  const creaturesForCalc = [...pageState.selectedSpirits.values()]
    .filter((s) => s.type === pageState.currentCategory)
    .map((c) => ({ name: c.name, level: c.level }));
  if (creaturesForCalc.length === 0) {
    alert("현재 탭에서 선택된 환수가 없습니다.");
    return;
  }

  // [핵심 수정] 로딩 인디케이터를 app-container 내부에 표시
  const appContainer = document.getElementById("app-container");
  showLoading(
    appContainer,
    "최적 조합 계산 중",
    "유전 알고리즘이 실행 중입니다..."
  );
  try {
    const result = await calculateOptimalCombination(creaturesForCalc);
    if (!result || !result.spirits)
      throw new Error("API에서 유효한 응답을 받지 못했습니다.");
    addHistory(result);
    showOptimalResultModal(result);
  } catch (error) {
    alert(`계산 오류: ${error.message}`);
  } finally {
    hideLoading();
  }
}

export function init(container) {
  container.innerHTML = getHTML();

  const el = elements;
  el.container = container;
  el.bondCategoryTabs = container.querySelector("#bondCategoryTabs");
  el.spiritListContainer = container.querySelector("#spiritListContainer");
  el.selectedSpiritsList = container.querySelector("#selectedSpiritsList");
  el.selectedCount = container.querySelector("#selectedCount");
  el.clearSelectionBtn = container.querySelector("#clearSelectionBtn");
  el.batchLevelInput = container.querySelector("#batchLevelInput");
  el.applyBatchLevelBtn = container.querySelector("#applyBatchLevelBtn");
  el.findOptimalBtn = container.querySelector("#findOptimalBtn");
  el.influenceToggle = container.querySelector("#influenceToggle");

  loadStateFromStorage();

  container.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.category === pageState.currentCategory
    );
  });

  setupEventListeners();
  initStatFilter();
  renderAll();
  console.log("환수 결속 페이지 초기화 완료.");
}

export function cleanup() {
  if (elements.container) {
    elements.container.removeEventListener("click", handleContainerClick);
  }
  if (elements.influenceToggle) {
    elements.influenceToggle.removeEventListener("change", handleToggleChange);
  }
  if (elements.selectedSpiritsList) {
    elements.selectedSpiritsList.removeEventListener(
      "change",
      handleLevelInputChange
    );
  }
  console.log("환수 결속 페이지 정리 완료.");
}

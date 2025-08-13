import { state as globalState } from "../state.js";
import { createElement, checkSpiritStats } from "../utils.js"; // [수정] checkSpiritStats 임포트
import { showInfo as showSpiritInfoModal } from "../modalHandler.js";
import { renderSpiritGrid } from "../components/spritGrid.js";
import { INFLUENCE_ROWS, STATS_MAPPING } from "../constants.js";

const pageState = {
  currentCategory: "수호",
  groupByInfluence: false,
  currentStatFilter: "",
};
const elements = {};

function getHTML() {
  return `
    <div class="sub-tabs" id="spiritInfoSubTabs">
        <div class="tab active" data-category="수호">수호</div>
        <div class="tab" data-category="탑승">탑승</div>
        <div class="tab" data-category="변신">변신</div>
    </div>
    <div class="view-toggle-container">
        <label class="toggle-switch">
            <input type="checkbox" id="influenceToggle">
            <span class="slider round"></span>
        </label>
        <span class="toggle-label">세력별 보기</span>
    </div>
    <div id="spiritGridContainer"></div>`;
}

function extractNumberFromImage(imagePath) {
  if (!imagePath) return Infinity;
  const match = imagePath.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}

function render() {
  let spiritsToDisplay = getSpiritsForCurrentState();
  if (pageState.currentStatFilter) {
    spiritsToDisplay = filterSpiritsByStat(
      spiritsToDisplay,
      pageState.currentStatFilter
    );
  }

  renderSpiritGrid({
    container: elements.spiritGridContainer,
    spirits: spiritsToDisplay,
    onSpiritClick: handleSpiritClick,
    getSpiritState: getSpiritVisualState,
    groupByInfluence: pageState.groupByInfluence,
  });
}

function handleSpiritClick(spirit) {
  if (spirit) {
    showSpiritInfoModal(spirit, pageState.currentStatFilter);
  }
}

function getSpiritVisualState(spirit) {
  // [수정] utils에서 가져온 함수 사용
  const { hasFullRegistration, hasFullBind } = checkSpiritStats(spirit);
  return {
    selected: false,
    registrationCompleted: hasFullRegistration,
    bondCompleted: hasFullBind,
  };
}

// [삭제] checkSpiritStats 함수는 utils.js로 이동했으므로 여기서 제거합니다.

function getSpiritsForCurrentState() {
  const filteredSpirits = globalState.allSpirits.filter(
    (s) => s.type === pageState.currentCategory
  );
  const gradeOrder = { 전설: 1, 불멸: 2 };
  filteredSpirits.sort((a, b) => {
    const orderA = gradeOrder[a.grade] || 99;
    const orderB = gradeOrder[b.grade] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return extractNumberFromImage(a.image) - extractNumberFromImage(b.image);
  });
  return filteredSpirits;
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

function handleContainerClick(e) {
  const tab = e.target.closest(".sub-tabs .tab");
  if (tab && !tab.classList.contains("active")) {
    elements.subTabs.querySelector(".tab.active").classList.remove("active");
    tab.classList.add("active");
    pageState.currentCategory = tab.dataset.category;
    render();
  }
}

function handleToggleChange(e) {
  pageState.groupByInfluence = e.target.checked;
  render();
}

function initStatFilter() {
  const filterContainer = createElement("div", "stat-filter-container");
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
  elements.viewToggleContainer.appendChild(filterContainer);

  elements.statFilter = statFilter;
  elements.clearFilterBtn = clearBtn;

  populateStatOptions(statFilter);

  statFilter.addEventListener("change", function () {
    pageState.currentStatFilter = this.value;
    clearBtn.style.display = this.value ? "block" : "none";
    render();
  });
  clearBtn.addEventListener("click", () => {
    statFilter.value = "";
    pageState.currentStatFilter = "";
    clearBtn.style.display = "none";
    render();
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

export function init(container) {
  container.innerHTML = getHTML();

  elements.container = container;
  elements.subTabs = container.querySelector("#spiritInfoSubTabs");
  elements.influenceToggle = container.querySelector("#influenceToggle");
  elements.viewToggleContainer = container.querySelector(
    ".view-toggle-container"
  );
  elements.spiritGridContainer = container.querySelector(
    "#spiritGridContainer"
  );

  elements.container.addEventListener("click", handleContainerClick);
  elements.influenceToggle.addEventListener("change", handleToggleChange);

  initStatFilter();
  render();
  console.log("환수 정보 페이지 초기화 완료.");
}

export function cleanup() {
  if (elements.container) {
    elements.container.removeEventListener("click", handleContainerClick);
  }
  if (elements.influenceToggle) {
    elements.influenceToggle.removeEventListener("change", handleToggleChange);
  }
  console.log("환수 정보 페이지 정리 완료.");
}

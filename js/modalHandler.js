import { createElement } from "./utils.js";
import { state as globalState } from "./state.js";
import { FACTION_ICONS, STATS_MAPPING } from "./constants.js";

// --- 모듈 내부 변수 및 상태 ---
let activeModal = null;
const PERCENT_STATS = [
  "pvpDamagePercent",
  "pvpDefensePercent",
  "criticalPowerPercent",
];

// --- 헬퍼 함수 ---
function ensureNumber(value) {
  if (value === undefined || value === null) return 0;
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

// =================================================================
// ===                  모달 생성 및 구조화                       ===
// =================================================================

function createBaseModal() {
  removeAllModals();
  const modal = createElement("div", "spirit-modal-overlay", {
    id: "spirit-info-modal",
  });
  const content = createElement("div", "spirit-modal-content");
  modal.appendChild(content);
  document.body.appendChild(modal);
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

/**
 * 모달을 생성하고 화면에 표시하는 메인 함수
 * @param {object} spiritData - 표시할 환수의 전체 데이터 객체
 * @param {string} [highlightStat=null] - 특정 스탯을 하이라이트할 경우 그 키
 * @param {boolean} [isRankingMode=false] - 랭킹 모드 여부 (레벨 고정)
 */
export function showInfo(
  spiritData,
  highlightStat = null,
  isRankingMode = false
) {
  if (!spiritData) {
    console.error("모달을 표시할 환수 데이터가 없습니다.");
    return;
  }

  removeAllModals();
  const { modal, content } = createBaseModal();

  activeModal = modal;
  document.body.style.overflow = "hidden";

  const startLevel = isRankingMode ? 25 : 0;
  renderSpiritInfo(
    content,
    spiritData,
    startLevel,
    highlightStat,
    isRankingMode
  );

  modal.style.display = "flex";
}

/**
 * 모달의 콘텐츠를 렌더링하는 함수
 */
function renderSpiritInfo(
  container,
  spiritData,
  level,
  highlightStat,
  isRankingMode
) {
  container.innerHTML = "";

  const closeBtn = createElement("button", "modal-close-btn", { text: "✕" });
  closeBtn.addEventListener("click", removeAllModals);
  container.appendChild(closeBtn);

  const header = createElement("div", "spirit-modal-header");
  const img = createElement("img", "spirit-modal-image", {
    src: `/${spiritData.image}`,
    alt: spiritData.name,
  });
  header.appendChild(img);

  const titleSection = createElement("div", "spirit-modal-title-section");
  const title = createElement("h3", "", { text: spiritData.name });
  titleSection.appendChild(title);

  const levelControl = isRankingMode
    ? createFixedLevelControl()
    : createEditableLevelControl(container, spiritData, level, highlightStat);

  titleSection.appendChild(levelControl);
  header.appendChild(titleSection);
  container.appendChild(header);

  const statsContainer = createElement("div", "stats-container");
  const registrationCol = createStatsColumn(
    "📌 등록 효과",
    "registrationList",
    "registration-sum"
  );
  const bindCol = createStatsColumn("🧷 장착 효과", "bindList", "bind-sum");
  statsContainer.appendChild(registrationCol);
  statsContainer.appendChild(bindCol);
  container.appendChild(statsContainer);

  displayStats(spiritData, level, highlightStat);
}

// 25레벨 고정 UI를 생성하는 함수
function createFixedLevelControl() {
  const levelControl = createElement("div", "level-control");
  const levelDisplay = createElement("div", "fixed-level-display");
  levelDisplay.innerHTML = `<strong>레벨: 25</strong> (랭킹 기준)`;
  levelControl.appendChild(levelDisplay);
  return levelControl;
}

// 레벨 수정 UI를 생성하는 함수
function createEditableLevelControl(
  container,
  spiritData,
  level,
  highlightStat
) {
  const levelControl = createElement("div", "level-control");
  const levelInputContainer = createElement("div", "level-input-container");
  levelInputContainer.innerHTML = `
        <button class="level-btn minus-btn">-</button>
        <input type="number" min="0" max="25" value="${level}" class="level-input">
        <button class="level-btn plus-btn">+</button>
    `;
  levelControl.appendChild(levelInputContainer);
  const input = levelInputContainer.querySelector(".level-input");
  const update = (newLevel) =>
    renderSpiritInfo(container, spiritData, newLevel, highlightStat, false);
  levelInputContainer
    .querySelector(".minus-btn")
    .addEventListener("click", () =>
      update(Math.max(0, parseInt(input.value) - 1))
    );
  levelInputContainer
    .querySelector(".plus-btn")
    .addEventListener("click", () =>
      update(Math.min(25, parseInt(input.value) + 1))
    );
  input.addEventListener("change", () => {
    let newLvl = parseInt(input.value);
    if (isNaN(newLvl) || newLvl < 0) newLvl = 0;
    if (newLvl > 25) newLvl = 25;
    update(newLvl);
  });
  return levelControl;
}

function createStatsColumn(title, listId, sumId) {
  const column = createElement("div", "stats-column");
  column.innerHTML = `
        <div class="stats-header">
            ${title}
            <span id="${sumId}" class="stats-sum">합산: 0</span>
        </div>
        <ul id="${listId}" class="stats-list"></ul>
    `;
  return column;
}

function displayStats(spiritData, level, highlightStat) {
  const registrationList = document.getElementById("registrationList");
  const bindList = document.getElementById("bindList");
  if (!registrationList || !bindList) return;

  const levelStat = spiritData.stats.find((s) => s.level === level);

  const regStats = levelStat?.registrationStat || {};
  const bindStats = levelStat?.bindStat || {};

  displayStatDetails(registrationList, regStats, highlightStat);
  displayStatDetails(bindList, bindStats, highlightStat);

  document.getElementById(
    "registration-sum"
  ).textContent = `합산: ${calculateStatsSum(regStats)}`;
  document.getElementById("bind-sum").textContent = `합산: ${calculateStatsSum(
    bindStats
  )}`;
}

function displayStatDetails(listElement, stats, highlightStat) {
  listElement.innerHTML = "";
  const statEntries = Object.entries(stats);

  if (statEntries.length === 0) {
    listElement.innerHTML = "<li>효과 없음</li>";
    return;
  }

  statEntries
    .sort((a, b) =>
      (STATS_MAPPING[a[0]] || a[0]).localeCompare(STATS_MAPPING[b[0]] || b[0])
    )
    .forEach(([key, value]) => {
      const displayKey = STATS_MAPPING[key] || key;
      const isPercent = PERCENT_STATS.includes(key);
      const displayValue = isPercent ? `${value}%` : value;

      const li = createElement("li");
      if (highlightStat && key === highlightStat) {
        li.className = "stat-highlight";
      }
      li.innerHTML = `
        <span class="stat-key">${displayKey}</span>
        <span class="stat-value">${displayValue}</span>
      `;
      listElement.appendChild(li);
    });
}

function calculateStatsSum(stats) {
  if (!stats) return 0;
  const resistance = parseFloat(stats.damageResistance || 0);
  const penetration = parseFloat(stats.damageResistancePenetration || 0);
  return Math.round(resistance + penetration);
}

export function removeAllModals() {
  if (activeModal) {
    document.removeEventListener("keydown", activeModal._escListener);
    activeModal.remove();
    activeModal = null;
  }
  document.body.style.overflow = "auto";
}

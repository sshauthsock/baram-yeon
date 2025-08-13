import { createElement } from "../utils.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import { fetchChakData, calculateChak } from "../api.js";

const pageState = {
  chakData: null,
  selectedPart: null,
  selectedLevel: null,
  userResources: { goldButton: 10000, colorBall: 10000 },
  statState: {},
  allAvailableStats: [],
  selectedStats: [],
};
const elements = {};

function getHTML() {
  return `
    <div class="layout-container chak-container">
      <div class="equipment-section">
        <div class="panel equipment-panel">
          <h3>장비 부위</h3>
          <div id="equipment-selector" class="button-grid"></div>
        </div>
      </div>
      <div class="level-info-section">
        <div class="panel level-panel">
          <h3>강화 레벨</h3>
          <div id="level-selector" class="level-buttons"></div>
        </div>
        <div class="panel enhancement-panel">
          <h3>능력치 정보</h3>
          <div id="stats-display" class="stats-grid"></div>
        </div>
      </div>
      <div class="panel summary-panel">
        <div class="tool-section">
            <div class="preset-section">
                <button id="boss-preset-btn" class="btn btn-secondary boss-btn">보스용 조합</button>
                <button id="pvp-preset-btn" class="btn btn-primary pvp-btn">피빕용 조합</button>
            </div>
            <div class="search-section">
                <div class="search-input-container">
                    <input id="search-input" placeholder="능력치 검색..." class="search-input">
                    <button id="search-button" class="search-btn">검색</button>
                </div>
                <div class="dropdown-container">
                    <div id="stat-options" class="stat-options"></div>
                </div>
                <div class="selected-stats" id="selected-stats"></div>
            </div>
        </div>
        <h3>능력치 합계</h3>
        <div class="resources-section">
          <label class="resource-label">보유 수량</label>
          <div class="resource-inputs">
            <div class="resource-input">
              <img src="/assets/img/gold-button.jpg" alt="황금단추" class="resource-icon-img">
              <input type="number" id="gold-button" value="10000" min="0">
            </div>
            <div class="resource-input">
              <img src="/assets/img/fivecolored-beads.jpg" alt="오색구슬" class="resource-icon-img">
              <input type="number" id="color-ball" value="10000" min="0">
            </div>
          </div>
          <div class="resource-status">
            <div id="resource-summary"></div>
          </div>
        </div>
        <div id="summary-display" class="summary-box">
          <p>합계 계산 버튼을 눌러주세요.</p>
        </div>
      </div>
    </div>
    <div id="chak-results-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="chak-modal-title">결과</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div id="chak-modal-body" class="modal-body"></div>
        </div>
    </div>
  `;
}

async function init(container) {
  container.innerHTML = getHTML();
  elements.container = container;
  elements.equipmentSelector = container.querySelector("#equipment-selector");
  elements.levelSelector = container.querySelector("#level-selector");
  elements.statsDisplay = container.querySelector("#stats-display");
  elements.summaryDisplay = container.querySelector("#summary-display");
  elements.goldButton = container.querySelector("#gold-button");
  elements.colorBall = container.querySelector("#color-ball");
  elements.bossPresetBtn = container.querySelector("#boss-preset-btn");
  elements.pvpPresetBtn = container.querySelector("#pvp-preset-btn");
  elements.searchInput = container.querySelector("#search-input");
  elements.searchButton = container.querySelector("#search-button");
  elements.statOptions = container.querySelector("#stat-options");
  elements.selectedStats = container.querySelector("#selected-stats");
  elements.resourceSummary = container.querySelector("#resource-summary");
  elements.modal = container.querySelector("#chak-results-modal");
  elements.modalTitle = container.querySelector("#chak-modal-title");
  elements.modalBody = container.querySelector("#chak-modal-body");
  elements.modalClose = container.querySelector(".close-modal");

  showLoading(container, "착 데이터 로딩 중...");
  try {
    pageState.chakData = await fetchChakData();
    collectAllStatNames();
    populateStatOptions();
    renderSelectors();
    renderStatCards();
    renderSummary();

    elements.equipmentSelector.addEventListener("click", handleSelectorClick);
    elements.levelSelector.addEventListener("click", handleSelectorClick);
    elements.statsDisplay.addEventListener("click", handleStatAction);
    elements.goldButton.addEventListener("input", handleResourceChange);
    elements.colorBall.addEventListener("input", handleResourceChange);
    elements.bossPresetBtn.addEventListener("click", () =>
      optimizeStats("boss")
    );
    elements.pvpPresetBtn.addEventListener("click", () => optimizeStats("pvp"));
    setupSearchEventListeners();

    elements.modalClose.addEventListener("click", closeModal);
    elements.modal.addEventListener("click", (e) => {
      if (e.target === elements.modal) closeModal();
    });

    console.log("착 계산 페이지 초기화 완료.");
  } catch (error) {
    console.error("Chak page init error:", error);
    container.innerHTML = `<p class="error-message">착 데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
  } finally {
    hideLoading();
  }
}

function cleanup() {
  console.log("착 계산 페이지 정리 완료.");
}

function renderSelectors() {
  const { parts, levels } = pageState.chakData.constants;
  pageState.selectedPart = `${parts[0]}_0`;
  pageState.selectedLevel = levels[0];

  elements.equipmentSelector.innerHTML = "";
  elements.levelSelector.innerHTML = "";

  parts.forEach((part, index) => {
    const uniquePartId = `${part}_${index}`;
    const btn = createElement("button", "selector-btn equip-btn", {
      text: part,
      "data-part-id": uniquePartId,
    });
    elements.equipmentSelector.appendChild(btn);
  });

  levels.forEach((level) => {
    const btn = createElement("button", "selector-btn level-btn", {
      "data-level": level,
    });
    btn.innerHTML = `
            <div class="level-text">${level}</div>
            <div class="level-progress-container">
                <div class="level-status"></div>
                <div class="level-progress-bar empty" style="width: 0%;"></div>
            </div>
            <div class="progress-dots">
                ${[...Array(4)]
                  .map(() => `<span class="progress-dot gray"></span>`)
                  .join("")}
            </div>
        `;
    elements.levelSelector.appendChild(btn);
  });

  updateActiveSelectors();
}

function renderStatCards() {
  if (!pageState.selectedPart || !pageState.selectedLevel) return;

  const dataKeyPart = pageState.selectedPart.split("_")[0];
  const levelKey = `lv${pageState.selectedLevel.replace("+", "")}`;
  const stats = pageState.chakData.equipment[dataKeyPart]?.[levelKey] || {};

  elements.statsDisplay.innerHTML = "";
  let statIndex = 0;
  Object.entries(stats).forEach(([statName, maxValue]) => {
    const cardId = `${statName}_${pageState.selectedPart}_${pageState.selectedLevel}_${statIndex}`;
    const state = pageState.statState[cardId] || {
      level: 0,
      value: 0,
      isUnlocked: false,
      isFirst: false,
    };

    const card = createStatCard(statName, maxValue, state, cardId, statIndex);
    elements.statsDisplay.appendChild(card);
    statIndex++;
  });
  updateAllButtonStates();
  updateLevelButtonIndicators();
}

function createStatCard(statName, maxValue, state, cardId, statIndex) {
  const displayStatName = statName.replace(/\d+$/, "");
  const card = createElement("div", "stat-card", {
    "data-card-id": cardId,
    "data-stat-index": statIndex,
    "data-stat-name": statName,
  });
  card.innerHTML = `
        <div class="card-header">
            <h3>${displayStatName}</h3>
            <button class="redistribute-btn" title="초기화">↻</button>
        </div>
        <p class="value-display">${state.value} / ${maxValue}</p>
        <div class="progress-container">
            <div class="progress-dots"></div>
            <p class="progress-display">강화 단계: ${state.level}/3</p>
        </div>
        <button class="action-btn"></button>
    `;
  updateStatCardUI(card, state, maxValue);
  return card;
}

function updateStatCardUI(card, state, maxValue) {
  card.querySelector(
    ".value-display"
  ).textContent = `${state.value} / ${maxValue}`;
  card.querySelector(
    ".progress-display"
  ).textContent = `강화 단계: ${state.level}/3`;

  const dotsContainer = card.querySelector(".progress-dots");
  dotsContainer.innerHTML = [...Array(3)]
    .map((_, i) => {
      let dotClass = "gray";
      if (state.isUnlocked) {
        dotClass = i < state.level ? "blue" : "yellow";
      }
      return `<span class="progress-dot ${dotClass}"></span>`;
    })
    .join("");

  updateButtonState(card, state);
}

function updateAllButtonStates() {
  const hasFirstUnlocked = Object.values(pageState.statState).some(
    (s) =>
      s.part === pageState.selectedPart &&
      s.partLevel === pageState.selectedLevel &&
      s.isFirst
  );

  elements.statsDisplay.querySelectorAll(".stat-card").forEach((card) => {
    const cardId = card.dataset.cardId;
    const state = pageState.statState[cardId] || {
      level: 0,
      isUnlocked: false,
      isFirst: false,
    };
    updateButtonState(card, state, hasFirstUnlocked);
  });
}

function updateButtonState(card, state, hasFirstUnlockedOverride = null) {
  const button = card.querySelector(".action-btn");
  button.disabled = false;

  const hasFirstUnlocked =
    hasFirstUnlockedOverride ??
    Object.values(pageState.statState).some(
      (s) =>
        s.part === pageState.selectedPart &&
        s.partLevel === pageState.selectedLevel &&
        s.isFirst
    );

  if (state.isUnlocked) {
    if (state.level >= 3) {
      button.innerHTML = `<span>완료</span>`;
      button.disabled = true;
    } else {
      const costKey = state.isFirst
        ? "upgradeFirst"
        : `upgradeOther${state.level}`;
      const cost = pageState.chakData.costs[costKey];
      button.innerHTML = `<img src="/assets/img/fivecolored-beads.jpg" class="btn-icon"> <span>강화 ${cost}</span>`;
    }
  } else {
    const costKey = hasFirstUnlocked ? "unlockOther" : "unlockFirst";
    const cost = pageState.chakData.costs[costKey];
    const icon = hasFirstUnlocked ? "gold-button.jpg" : "fivecolored-beads.jpg";
    button.innerHTML = `<img src="/assets/img/${icon}" class="btn-icon"> <span>선택 ${cost}</span>`;
  }
}

function updateActiveSelectors() {
  elements.equipmentSelector
    .querySelectorAll(".selector-btn")
    .forEach((btn) => {
      const isActive = btn.dataset.partId === pageState.selectedPart;
      btn.classList.toggle("active", isActive);
    });
  elements.levelSelector.querySelectorAll(".selector-btn").forEach((btn) => {
    const isActive = btn.dataset.level === pageState.selectedLevel;
    btn.classList.toggle("active", isActive);
  });
}

function updateLevelButtonIndicators() {
  elements.levelSelector.querySelectorAll(".level-btn").forEach((btn) => {
    const level = btn.dataset.level;
    const dataKeyPart = pageState.selectedPart.split("_")[0];
    const levelKey = `lv${level.replace("+", "")}`;
    const statsForLevel =
      pageState.chakData.equipment[dataKeyPart]?.[levelKey] || {};

    const dotsContainer = btn.querySelector(".progress-dots");
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";

    const statEntries = Object.entries(statsForLevel);
    const maxDots = Math.min(4, statEntries.length);

    for (let i = 0; i < maxDots; i++) {
      const [statName] = statEntries[i];
      const cardId = `${statName}_${pageState.selectedPart}_${level}_${i}`;
      const state = pageState.statState[cardId] || {
        isUnlocked: false,
        level: 0,
      };
      const dot = createElement("span", "progress-dot");
      if (state.isUnlocked) {
        dot.classList.add(state.level === 3 ? "blue" : "yellow");
      } else {
        dot.classList.add("gray");
      }
      dotsContainer.appendChild(dot);
    }
    updateLevelProgressBar(btn, Object.values(statsForLevel).length);
  });
}

function updateLevelProgressBar(btn, totalStats) {
  const level = btn.dataset.level;
  const progressBar = btn.querySelector(".level-progress-bar");
  const statusText = btn.querySelector(".level-status");

  if (!progressBar || !statusText || totalStats === 0) return;

  let totalPoints = 0;
  let unlockedCount = 0;

  Object.values(pageState.statState).forEach((state) => {
    if (
      state.part === pageState.selectedPart &&
      state.partLevel === level &&
      state.isUnlocked
    ) {
      totalPoints += state.level;
      unlockedCount++;
    }
  });

  const totalMaxPoints = totalStats * 3;
  const percent =
    totalMaxPoints > 0 ? Math.round((totalPoints / totalMaxPoints) * 100) : 0;

  progressBar.style.width = `${percent}%`;
  progressBar.className = "level-progress-bar";
  if (percent === 0) progressBar.classList.add("empty");
  else if (percent < 100) progressBar.classList.add("partial");
  else progressBar.classList.add("complete");

  statusText.textContent =
    unlockedCount > 0 ? `${unlockedCount}/${totalStats} (${percent}%)` : "";
}

async function renderSummary() {
  showLoading(elements.summaryDisplay, "계산 중...");
  try {
    const result = await calculateChak({
      statState: pageState.statState,
      userResources: pageState.userResources,
    });
    const { summary, resources } = result;
    let statHtml =
      Object.keys(summary).length > 0
        ? `<div class="summary-section"><div class="stat-list">${Object.entries(
            summary
          )
            .sort((a, b) => b[1] - a[1])
            .map(
              ([stat, value]) =>
                `<div class="stat-item"><span class="stat-name">${stat}</span><span class="stat-value">+${value}</span></div>`
            )
            .join("")}</div></div>`
        : "<p>능력치가 개방되지 않았습니다.</p>";

    elements.summaryDisplay.innerHTML = statHtml;

    elements.resourceSummary.innerHTML = `
            <div class="resource-summary-item">
                <img src="/assets/img/gold-button.jpg" class="resource-icon-img">
                <span class="resource-details">
                    <span class="${
                      resources.goldButton.remaining < 0
                        ? "resource-negative"
                        : ""
                    }">${resources.goldButton.remaining.toLocaleString()}</span> 보유 / <span>${resources.goldButton.consumed.toLocaleString()}</span> 소모
                </span>
            </div>
            <div class="resource-summary-item">
                <img src="/assets/img/fivecolored-beads.jpg" class="resource-icon-img">
                <span class="resource-details">
                    <span class="${
                      resources.colorBall.remaining < 0
                        ? "resource-negative"
                        : ""
                    }">${resources.colorBall.remaining.toLocaleString()}</span> 보유 / <span>${resources.colorBall.consumed.toLocaleString()}</span> 소모
                </span>
            </div>
        `;
  } catch (error) {
    alert(`합계 계산 오류: ${error.message}`);
    elements.summaryDisplay.innerHTML = `<p class="error-message">계산 중 오류가 발생했습니다.</p>`;
  } finally {
    hideLoading();
  }
}

function handleSelectorClick(e) {
  const btn = e.target.closest(".selector-btn");
  if (!btn) return;

  if (btn.classList.contains("equip-btn")) {
    pageState.selectedPart = btn.dataset.partId;
  } else if (btn.classList.contains("level-btn")) {
    pageState.selectedLevel = btn.dataset.level;
  }
  updateActiveSelectors();
  renderStatCards();
}

function handleStatAction(e) {
  const card = e.target.closest(".stat-card");
  if (!card) return;

  const cardId = card.dataset.cardId;
  const statName = card.dataset.statName;
  if (!statName) return;

  const dataKeyPart = pageState.selectedPart.split("_")[0];
  const levelKey = `lv${pageState.selectedLevel.replace("+", "")}`;
  const maxValue = (pageState.chakData.equipment[dataKeyPart]?.[levelKey] ||
    {})[statName];
  if (maxValue === undefined) return;

  let state = JSON.parse(
    JSON.stringify(
      pageState.statState[cardId] || {
        level: 0,
        value: 0,
        isUnlocked: false,
        isFirst: false,
        part: pageState.selectedPart,
        partLevel: pageState.selectedLevel,
        statName: statName,
        maxValue: maxValue,
      }
    )
  );

  if (e.target.closest(".action-btn")) {
    if (state.level >= 3) return;
    if (!state.isUnlocked) {
      const hasFirst = Object.values(pageState.statState).some(
        (s) =>
          s.part === pageState.selectedPart &&
          s.partLevel === pageState.selectedLevel &&
          s.isFirst
      );
      state.isFirst = !hasFirst;
      state.isUnlocked = true;
    } else {
      state.level++;
    }
  } else if (e.target.closest(".redistribute-btn")) {
    delete pageState.statState[cardId];
    renderStatCards();
    renderSummary();
    return;
  } else {
    return;
  }

  if (state.isUnlocked) {
    if (state.isFirst) {
      state.value = Math.floor((state.maxValue / 3) * state.level);
    } else {
      if (state.level === 0) state.value = 0;
      else if (state.level === 1)
        state.value =
          Math.floor(state.maxValue / 15) + Math.floor(state.maxValue / 3);
      else
        state.value =
          Math.floor(state.maxValue / 15) +
          Math.floor(state.maxValue / 3) * state.level;
    }
    if (state.value > state.maxValue) state.value = state.maxValue;
  } else {
    state.value = 0;
  }

  pageState.statState[cardId] = state;

  updateStatCardUI(card, state, maxValue);
  updateAllButtonStates();
  updateLevelButtonIndicators();
  renderSummary();
}

function handleResourceChange() {
  pageState.userResources = {
    goldButton: parseInt(elements.goldButton.value) || 0,
    colorBall: parseInt(elements.colorBall.value) || 0,
  };
  renderSummary();
}

function collectAllStatNames() {
  const stats = new Set();
  for (const part in pageState.chakData.equipment) {
    for (const level in pageState.chakData.equipment[part]) {
      for (const statName in pageState.chakData.equipment[part][level]) {
        stats.add(statName.replace(/\d+$/, ""));
      }
    }
  }
  pageState.allAvailableStats = Array.from(stats).sort();
}

function populateStatOptions() {
  elements.statOptions.innerHTML = "";
  pageState.allAvailableStats.forEach((stat) => {
    const option = createElement("div", "stat-option", { text: stat });
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleStatSelection(stat);
    });
    elements.statOptions.appendChild(option);
  });
}

function setupSearchEventListeners() {
  elements.searchInput.addEventListener("click", (e) => {
    e.stopPropagation();
    elements.statOptions.style.display = "block";
  });
  elements.searchInput.addEventListener("input", () =>
    filterStatOptions(elements.searchInput.value)
  );
  elements.searchButton.addEventListener("click", searchStats);
  document.addEventListener("click", () => {
    elements.statOptions.style.display = "none";
  });
}

function filterStatOptions(filterText) {
  const options = elements.statOptions.querySelectorAll(".stat-option");
  filterText = filterText.toLowerCase();
  options.forEach((option) => {
    option.style.display = option.textContent.toLowerCase().includes(filterText)
      ? "flex"
      : "none";
  });
}

function toggleStatSelection(stat) {
  const index = pageState.selectedStats.indexOf(stat);
  if (index === -1) {
    pageState.selectedStats.push(stat);
  } else {
    pageState.selectedStats.splice(index, 1);
  }
  updateSelectedStatsDisplay();
  elements.statOptions.style.display = "none";
  elements.searchInput.value = "";
  filterStatOptions("");
}

function updateSelectedStatsDisplay() {
  elements.selectedStats.innerHTML = "";
  pageState.selectedStats.forEach((stat) => {
    const chip = createElement("div", "stat-chip", {
      html: `${stat} <span class="remove-stat">×</span>`,
    });
    chip
      .querySelector(".remove-stat")
      .addEventListener("click", () => toggleStatSelection(stat));
    elements.selectedStats.appendChild(chip);
  });
}

function optimizeStats(type) {
  const BOSS_STATS = ["피해저항관통", "보스몬스터추가피해", "치명위력%"];
  const PVP_STATS = ["피해저항관통", "피해저항", "대인방어", "대인피해"];

  const targetStats = type === "boss" ? BOSS_STATS : PVP_STATS;
  const title = type === "boss" ? "보스용 추천 조합" : "PvP용 추천 조합";

  showModalWithResults(title, targetStats);
}

function searchStats() {
  if (pageState.selectedStats.length === 0) {
    alert("검색할 능력치를 선택해주세요.");
    return;
  }
  showModalWithResults("검색 결과", pageState.selectedStats);
}

function showModalWithResults(title, statsToFind) {
  elements.modalTitle.textContent = title;

  const results = {};

  pageState.chakData.constants.parts.forEach((partId, index) => {
    const dataKeyPart = partId.split("_")[0];
    pageState.chakData.constants.levels.forEach((level) => {
      const levelKey = `lv${level.replace("+", "")}`;
      const statsOnItem =
        pageState.chakData.equipment[dataKeyPart]?.[levelKey] || {};

      Object.entries(statsOnItem).forEach(([statName, maxValue]) => {
        const displayName = statName.replace(/\d+$/, "");
        if (statsToFind.includes(displayName)) {
          if (!results[displayName]) results[displayName] = [];
          results[displayName].push({
            part: partId,
            level: level,
            statName,
            maxValue,
            cardId: `${statName}_${partId}_${level}_${index}`,
          });
        }
      });
    });
  });

  let modalHtml = "";
  statsToFind.forEach((stat) => {
    const foundItems = results[stat] || [];
    modalHtml += `
            <div class="result-group">
                <h4 class="stat-group-title">${stat} (${
      foundItems.length
    }곳)</h4>
                <div class="stat-locations">
                    ${foundItems
                      .map(
                        (item) => `
                        <div class="stat-location" data-part-id="${
                          item.part
                        }" data-level="${item.level}">
                            <div class="location-part">${item.part.replace(
                              /_\d+$/,
                              ""
                            )}</div>
                            <div class="location-level">${item.level} (+${
                          item.maxValue
                        })</div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  });

  elements.modalBody.innerHTML =
    modalHtml || "<p>조건에 맞는 능력치를 찾을 수 없습니다.</p>";

  elements.modalBody.querySelectorAll(".stat-location").forEach((el) => {
    el.addEventListener("click", () => {
      pageState.selectedPart = el.dataset.partId;
      pageState.selectedLevel = el.dataset.level;
      updateActiveSelectors();
      renderStatCards();
      closeModal();
    });
  });

  elements.modal.style.display = "flex";
}

function closeModal() {
  elements.modal.style.display = "none";
  elements.modalBody.innerHTML = "";
}

export { init, cleanup };

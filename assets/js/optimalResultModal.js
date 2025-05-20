const OptimalResultModal = (function () {
  const FACTION_ICONS = window.CommonData.FACTION_ICONS || {};

  function createBaseModal() {
    let optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.innerHTML = "";
    } else {
      optimalModal = document.createElement("div");
      optimalModal.id = "optimalModal";
      optimalModal.className = "modal-overlay";
      optimalModal.style.cssText = `
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: none;
        justify-content: center;
        align-items: center;
      `;
      document.body.appendChild(optimalModal);
    }

    const modalContent = document.createElement("div");
    modalContent.id = "optimalModalContent";
    modalContent.className = "modal-content";
    modalContent.style.cssText = `
      background-color: white;
      border-radius: 12px;
      width: 90%;
      max-width: 800px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 25px;
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;
    optimalModal.appendChild(modalContent);

    const closeButton = document.createElement("button");
    closeButton.id = "closeOptimalModal";
    closeButton.className = "modal-close";
    closeButton.innerHTML = "✕";
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      font-size: 24px;
      background: none;
      border: none;
      cursor: pointer;
      color: #555;
      z-index: 10002;
    `;
    closeButton.onclick = function () {
      optimalModal.style.display = "none";
      document.body.style.overflow = "auto";
    };
    modalContent.appendChild(closeButton);

    const modalTitle = document.createElement("h3");
    modalTitle.className = "modal-title";
    modalTitle.textContent = "환수 결속 상세 정보";
    modalContent.appendChild(modalTitle);

    return {
      modal: optimalModal,
      content: modalContent,
      title: modalTitle,
    };
  }

  function prepareModalStructure(modalType = "bond") {
    const baseModal = createBaseModal();
    const modalContent = baseModal.content;

    // 1. Ad Row
    const adRow = document.createElement("div");
    adRow.className = "ad-row";
    adRow.innerHTML = `
      <div class="ad-container-left">
        <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-sgK0ytXrL3f7EHRF"
            data-ad-width="728" data-ad-height="90"></ins>
      </div>
    `;
    modalContent.appendChild(adRow);

    // 2. Mobile Ad
    const mobileAd = document.createElement("div");
    mobileAd.className = "ad-container mobile-ad";
    mobileAd.innerHTML = `
      <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-TPesUrzJaxJ008Lm"
          data-ad-width="320" data-ad-height="50"></ins>
    `;
    modalContent.appendChild(mobileAd);

    // 3. Header
    const headerDiv = document.createElement("div");
    headerDiv.id = "optimalHeader";
    headerDiv.className = "optimal-header";

    const scoreDiv = document.createElement("div");
    scoreDiv.className = "optimal-score";
    scoreDiv.innerHTML = `
      <h4>환산합산: <span id="optimalScore">0</span> <span id="optimalScoreBind" class="bind-score">(장착효과: 0)</span></h4>
      <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small><br />
      <small>환산 합산은 등급 결속 효과 + 세력 결속 효과 + 장착 효과 능력치입니다.</small>
    `;
    headerDiv.appendChild(scoreDiv);
    modalContent.appendChild(headerDiv);

    // 4. Action Buttons
    if (modalType === "bond") {
      const actionButtons = document.createElement("div");
      actionButtons.className = "action-buttons";
      actionButtons.innerHTML = `
        <button id="clearHistoryButton" class="clear-history-btn">기록 삭제</button>
      `;
      modalContent.appendChild(actionButtons);
    }

    // 5. 히스토리 탭 컨테이너 (bond 모드에서만)
    if (modalType === "bond") {
      const spiritsList = document.createElement("div");
      spiritsList.id = "optimalSpiritsList";
      spiritsList.className = "selected-spirits-info";
      modalContent.appendChild(spiritsList);
    }

    // 6. 결과 컨테이너 (combinationResultsContainer) - 히스토리 탭 아래에 위치
    const combinationContainer = document.createElement("div");
    combinationContainer.id = "combinationResultsContainer";
    combinationContainer.className = "combination-results-container";
    modalContent.appendChild(combinationContainer);

    // 7. 결과 컨테이너
    const resultsContainer = document.createElement("div");
    resultsContainer.className = "results-container";

    // Grade Effects
    const gradeSection = document.createElement("div");
    gradeSection.className = "results-section";
    const gradeEffects = document.createElement("div");
    gradeEffects.id = "optimalGradeEffects";
    gradeEffects.className = "effects-list";
    gradeSection.appendChild(gradeEffects);
    resultsContainer.appendChild(gradeSection);

    // Faction Effects
    const factionSection = document.createElement("div");
    factionSection.className = "results-section";
    const factionEffects = document.createElement("div");
    factionEffects.id = "optimalFactionEffects";
    factionEffects.className = "effects-list";
    factionSection.appendChild(factionEffects);
    resultsContainer.appendChild(factionSection);

    // Bind Effects
    const bindSection = document.createElement("div");
    bindSection.className = "results-section";
    const bindEffects = document.createElement("div");
    bindEffects.id = "optimalBindEffects";
    bindEffects.className = "effects-list";
    bindSection.appendChild(bindEffects);
    resultsContainer.appendChild(bindSection);

    modalContent.appendChild(resultsContainer);

    // 8. 상세 정보 컨테이너
    const detailsContainer = document.createElement("div");
    detailsContainer.id = "optimalSpiritsDetails";
    detailsContainer.className = "spirit-details-container";
    const detailsTitle = document.createElement("h4");
    detailsTitle.textContent = "선택된 환수 상세 스탯";
    detailsContainer.appendChild(detailsTitle);

    const statsGrid = document.createElement("div");
    statsGrid.id = "spiritStatsDetails";
    statsGrid.className = "spirit-stats-grid";
    detailsContainer.appendChild(statsGrid);

    modalContent.appendChild(detailsContainer);

    return true;
  }

  function showResultModal(result, modalType = "bond") {
    if (
      !result ||
      !result.spirits ||
      !Array.isArray(result.spirits) ||
      result.spirits.length === 0
    ) {
      console.warn("Invalid result data provided to modal");
      return;
    }

    prepareModalStructure(modalType);

    const optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    const modalTitle = document.querySelector(".modal-title");
    if (modalTitle) {
      const category = result.spirits[0]?.category || "환수";
      modalTitle.textContent = `${category} 결속 상세 정보`;
    }

    const {
      spirits,
      gradeScore,
      factionScore,
      bindScore,
      gradeCounts,
      factionCounts,
      gradeEffects,
      factionEffects,
      bindStats,
      missingDataSpirits,
      missingBindDataSpirits,
    } = result;

    const combinedScoreWithoutReg = Math.round(
      SpiritUtils.ensureNumber(gradeScore) +
        SpiritUtils.ensureNumber(factionScore) +
        SpiritUtils.ensureNumber(bindScore)
    );

    const displayGradeScore = Math.round(SpiritUtils.ensureNumber(gradeScore));
    const displayFactionScore = Math.round(
      SpiritUtils.ensureNumber(factionScore)
    );
    const displayBindScore = Math.round(SpiritUtils.ensureNumber(bindScore));

    const optimalScoreEl = document.getElementById("optimalScore");
    if (optimalScoreEl) {
      optimalScoreEl.textContent = `${combinedScoreWithoutReg} (등급: ${displayGradeScore} 세력: ${displayFactionScore} 장착효과: ${displayBindScore})`;
    }

    const optimalScoreBindEl = document.getElementById("optimalScoreBind");
    if (optimalScoreBindEl) {
      optimalScoreBindEl.style.display = "none";
    }

    // 결과 렌더링을 위한 임시 컨테이너 생성
    const tempContainer = document.createElement("div");
    tempContainer.style.display = "none";
    document.body.appendChild(tempContainer);

    // 정보 안내 박스
    const infoBox = document.createElement("div");
    infoBox.className = "data-submission-request";
    infoBox.innerHTML =
      "해당 환수 레벨에 대한 장착/등록 스탯 데이터가 없는 경우 계산에서 제외됩니다.<br>" +
      "해당 레벨에 대해 정보가 있으신가요? 제보해주시면 바로 반영하겠습니다.";
    tempContainer.appendChild(infoBox);

    // 데이터 누락 경고
    if (
      (missingDataSpirits && missingDataSpirits.length > 0) ||
      (missingBindDataSpirits && missingBindDataSpirits.length > 0)
    ) {
      const warningBox = document.createElement("div");
      warningBox.className = "data-warning-box";

      let warningContent = "<h4>⚠️ 데이터 누락 경고</h4>";

      if (missingDataSpirits && missingDataSpirits.length > 0) {
        warningContent += `<p><strong>등록 스탯 데이터가 없는 환수 (${
          missingDataSpirits.length
        }개):</strong> 
                           ${missingDataSpirits.join(", ")}</p>`;
      }

      if (missingBindDataSpirits && missingBindDataSpirits.length > 0) {
        warningContent += `<p><strong>결속 스탯 데이터가 없는 환수 (${
          missingBindDataSpirits.length
        }개):</strong> 
                           ${missingBindDataSpirits.join(", ")}</p>`;
      }

      warningContent +=
        "<p>위 환수들은 데이터가 없어 계산에 정확히 반영되지 않았습니다. 환수 레벨을 변경하거나 다른 환수를 선택하는 것이 좋습니다.</p>";

      warningBox.innerHTML = warningContent;
      tempContainer.appendChild(warningBox);
    }

    // 영혼 그리드 표시
    const spiritsGridWrapper = document.createElement("div");
    spiritsGridWrapper.innerHTML = `
      <h4>조합 환수 정보</h4>
      <div class="spirits-grid-container">
        ${spirits
          .map(
            (spirit) => `
          <div class="spirit-info-item">
            <img src="${spirit.image}" alt="${spirit.name}">
            <div class="spirit-info-details">
              <div class="spirit-info-name">${spirit.name}</div>
              <div class="spirit-info-level">레벨: ${spirit.level}</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    tempContainer.appendChild(spiritsGridWrapper);

    // 준비된 내용을 combinationResultsContainer에 복사
    const combinationContainer = document.getElementById(
      "combinationResultsContainer"
    );
    if (combinationContainer) {
      combinationContainer.innerHTML = tempContainer.innerHTML;
    }

    // 임시 컨테이너 제거
    tempContainer.remove();

    // Bond 모달 타입인 경우 히스토리 탭 렌더링
    if (modalType === "bond") {
      const spiritsList = document.getElementById("optimalSpiritsList");
      if (spiritsList) {
        spiritsList.innerHTML = ""; // 초기화
      }

      if (
        result.spirits &&
        result.spirits.length > 0 &&
        window.HistoryManager &&
        typeof window.HistoryManager.renderHistoryTabs === "function"
      ) {
        const category = result.spirits[0].category;

        setTimeout(() => {
          try {
            window.HistoryManager.renderHistoryTabs(
              category,
              document.getElementById("optimalSpiritsList"),
              (historyResult) => {
                // 다른 결과로 전환하기 위한 함수
                renderNewResult(historyResult);
              }
            );

            const clearButton = document.getElementById("clearHistoryButton");
            if (clearButton) {
              clearButton.onclick = function () {
                if (
                  window.OptimalCombinationFinder &&
                  typeof window.OptimalCombinationFinder
                    .clearSavedOptimalCombinations === "function"
                ) {
                  window.OptimalCombinationFinder.clearSavedOptimalCombinations(
                    category
                  );
                }
              };
            }
          } catch (e) {
            console.error("Failed to render history tabs:", e);
          }
        }, 100);
      }
    }

    renderEffects(
      gradeEffects,
      factionEffects,
      bindStats,
      displayGradeScore,
      displayFactionScore,
      displayBindScore,
      gradeCounts,
      factionCounts
    );

    renderSpiritDetailsTable(spirits);

    initModalStyles();

    if (
      window.AdInitializer &&
      typeof window.AdInitializer.initializeAdsInModal === "function"
    ) {
      window.AdInitializer.initializeAdsInModal(optimalModal);
    }

    setTimeout(() => {
      document.querySelectorAll(".info-icon").forEach((icon) => {
        icon.addEventListener("click", function () {
          document
            .querySelectorAll(".info-icon")
            .forEach((i) => i.classList.remove("show-tooltip"));
          this.classList.toggle("show-tooltip");
          setTimeout(() => {
            this.classList.remove("show-tooltip");
          }, 3000);
        });
      });
    }, 500);
  }

  // 하나의 결과를 다른 결과로 전환하는 함수 (깜박임 방지)
  function renderNewResult(result) {
    if (!result) return;

    const {
      spirits,
      gradeScore,
      factionScore,
      bindScore,
      gradeCounts,
      factionCounts,
      gradeEffects,
      factionEffects,
      bindStats,
      missingDataSpirits,
      missingBindDataSpirits,
    } = result;

    // 점수 업데이트
    const combinedScoreWithoutReg = Math.round(
      SpiritUtils.ensureNumber(gradeScore) +
        SpiritUtils.ensureNumber(factionScore) +
        SpiritUtils.ensureNumber(bindScore)
    );

    const displayGradeScore = Math.round(SpiritUtils.ensureNumber(gradeScore));
    const displayFactionScore = Math.round(
      SpiritUtils.ensureNumber(factionScore)
    );
    const displayBindScore = Math.round(SpiritUtils.ensureNumber(bindScore));

    const optimalScoreEl = document.getElementById("optimalScore");
    if (optimalScoreEl) {
      optimalScoreEl.textContent = `${combinedScoreWithoutReg} (등급: ${displayGradeScore} 세력: ${displayFactionScore} 장착효과: ${displayBindScore})`;
    }

    // 결과 렌더링을 위한 임시 컨테이너 생성
    const tempContainer = document.createElement("div");

    // 정보 안내 박스
    const infoBox = document.createElement("div");
    infoBox.className = "data-submission-request";
    infoBox.innerHTML =
      "해당 환수 레벨에 대한 장착/등록 스탯 데이터가 없는 경우 계산에서 제외됩니다.<br>" +
      "해당 레벨에 대해 정보가 있으신가요? 제보해주시면 바로 반영하겠습니다.";
    tempContainer.appendChild(infoBox);

    // 데이터 누락 경고
    if (
      (missingDataSpirits && missingDataSpirits.length > 0) ||
      (missingBindDataSpirits && missingBindDataSpirits.length > 0)
    ) {
      const warningBox = document.createElement("div");
      warningBox.className = "data-warning-box";

      let warningContent = "<h4>⚠️ 데이터 누락 경고</h4>";

      if (missingDataSpirits && missingDataSpirits.length > 0) {
        warningContent += `<p><strong>등록 스탯 데이터가 없는 환수 (${
          missingDataSpirits.length
        }개):</strong> 
                         ${missingDataSpirits.join(", ")}</p>`;
      }

      if (missingBindDataSpirits && missingBindDataSpirits.length > 0) {
        warningContent += `<p><strong>결속 스탯 데이터가 없는 환수 (${
          missingBindDataSpirits.length
        }개):</strong> 
                         ${missingBindDataSpirits.join(", ")}</p>`;
      }

      warningContent +=
        "<p>위 환수들은 데이터가 없어 계산에 정확히 반영되지 않았습니다. 환수 레벨을 변경하거나 다른 환수를 선택하는 것이 좋습니다.</p>";

      warningBox.innerHTML = warningContent;
      tempContainer.appendChild(warningBox);
    }

    // 영혼 그리드 표시
    const spiritsGridWrapper = document.createElement("div");
    spiritsGridWrapper.innerHTML = `
      <h4>조합 환수 정보</h4>
      <div class="spirits-grid-container">
        ${spirits
          .map(
            (spirit) => `
          <div class="spirit-info-item">
            <img src="${spirit.image}" alt="${spirit.name}">
            <div class="spirit-info-details">
              <div class="spirit-info-name">${spirit.name}</div>
              <div class="spirit-info-level">레벨: ${spirit.level}</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    tempContainer.appendChild(spiritsGridWrapper);

    // content DOM 업데이트를 기다리지 않고 효과를 먼저 업데이트
    renderEffects(
      gradeEffects,
      factionEffects,
      bindStats,
      displayGradeScore,
      displayFactionScore,
      displayBindScore,
      gradeCounts,
      factionCounts
    );

    renderSpiritDetailsTable(spirits);

    // 준비된 내용을 combinationResultsContainer에 복사
    const combinationContainer = document.getElementById(
      "combinationResultsContainer"
    );
    if (combinationContainer) {
      // requestAnimationFrame을 사용하여 부드럽게 DOM 업데이트
      requestAnimationFrame(() => {
        combinationContainer.innerHTML = tempContainer.innerHTML;
      });
    }
  }

  window.HistoryManager = window.HistoryManager || {};
  window.HistoryManager.getHistoryTabsHTML = function (category, onTabChange) {
    const historyManager = window.HistoryManager;
    if (!historyManager || !historyManager.loadSavedCombinations) {
      return "";
    }

    const { savedOptimalCombinations, categoryState } =
      historyManager.loadSavedCombinations();
    let currentActiveIndex = categoryState[category].activeIndex;
    const categoryCombinations = savedOptimalCombinations[category] || [];

    if (categoryCombinations.length === 0) {
      return `
        <div class="history-tabs-container">
          <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
        </div>
      `;
    }

    let highestScoreIndex = 0;
    let highestScore = 0;
    for (let i = 0; i < categoryCombinations.length; i++) {
      const combo = categoryCombinations[i];
      const currentScore =
        SpiritUtils.ensureNumber(combo.gradeScore) +
        SpiritUtils.ensureNumber(combo.factionScore) +
        SpiritUtils.ensureNumber(combo.bindScore);

      if (currentScore > highestScore) {
        highestScore = currentScore;
        highestScoreIndex = i;
      }
    }

    let newestIndex = 0;
    let newestTime = categoryCombinations[0].addedAt || 0;
    for (let i = 1; i < categoryCombinations.length; i++) {
      const addedTime = categoryCombinations[i].addedAt || 0;
      if (addedTime > newestTime) {
        newestTime = addedTime;
        newestIndex = i;
      }
    }

    if (
      currentActiveIndex < 0 ||
      currentActiveIndex >= categoryCombinations.length
    ) {
      currentActiveIndex = newestIndex;
      categoryState[category].activeIndex = newestIndex;
    }

    const tabsHtml = `
      <div class="history-tabs-container">
        <div class="history-tabs">
          ${Array(5)
            .fill()
            .map((_, index) => {
              const combo = categoryCombinations[index];
              if (!combo) {
                return `<div class="history-tab-placeholder"></div>`;
              }

              const totalScore = Math.round(
                SpiritUtils.ensureNumber(combo.gradeScore || 0) +
                  SpiritUtils.ensureNumber(combo.factionScore || 0) +
                  SpiritUtils.ensureNumber(combo.bindScore || 0)
              );

              return `
              <button class="history-tab ${
                index === currentActiveIndex ? "active" : ""
              }
                ${index === highestScoreIndex ? "best" : ""}"
                data-index="${index}">
                <div class="tab-content">
                  <div class="tab-indicators">
                    ${
                      index === newestIndex
                        ? '<span class="current-marker">최신</span>'
                        : ""
                    }
                    ${
                      index === highestScoreIndex
                        ? '<span class="best-marker">최고</span>'
                        : ""
                    }
                  </div>
                  <span class="combo-name">${
                    combo.combinationName || `조합 ${index + 1}`
                  }</span>
                  <span class="tab-score">${totalScore}</span>
                </div>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
      <div id="selected-tab-info" class="history-info">
        ${
          categoryCombinations[currentActiveIndex]
            ? `
          <span class="timestamp">계산 시간: ${
            categoryCombinations[currentActiveIndex].timestamp
          }</span>
          ${
            currentActiveIndex === highestScoreIndex
              ? '<span class="best-notice">(최고 점수입니다!)</span>'
              : ""
          }
        `
            : ""
        }
      </div>
    `;

    return tabsHtml;
  };

  window.HistoryManager.renderHistoryTabs = function (
    category,
    container,
    onTabChange
  ) {
    if (!container) return;

    // HTML 생성
    const tabsHtml = this.getHistoryTabsHTML(category, onTabChange);

    // 컨테이너에 HTML 삽입
    container.innerHTML = tabsHtml;

    // 탭 이벤트 리스너 등록
    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        // 이전 탭 비활성화
        document
          .querySelectorAll(".history-tab")
          .forEach((t) => t.classList.remove("active"));

        // 클릭한 탭 활성화
        this.classList.add("active");

        const comboIndex = parseInt(this.dataset.index);
        const { savedOptimalCombinations, categoryState } =
          window.HistoryManager.loadSavedCombinations();
        categoryState[category].activeIndex = comboIndex;
        const result = savedOptimalCombinations[category][comboIndex];

        if (typeof onTabChange === "function") {
          // 콜백 실행 (새 결과 렌더링)
          onTabChange(
            result,
            comboIndex === window.HistoryManager.getHighestScoreIndex(category)
          );
        }

        const tabInfoElement = document.getElementById("selected-tab-info");
        if (tabInfoElement && result) {
          tabInfoElement.innerHTML = `
            <span class="timestamp">계산 시간: ${result.timestamp}</span>
            ${
              comboIndex ===
              window.HistoryManager.getHighestScoreIndex(category)
                ? '<span class="best-notice">(최고 점수입니다!)</span>'
                : ""
            }
          `;
        }
      });
    });
  };

  window.HistoryManager.getCombination = function (category, index) {
    const historyManager = window.HistoryManager;
    if (!historyManager || !historyManager.loadSavedCombinations) {
      return null;
    }

    const { savedOptimalCombinations } = historyManager.loadSavedCombinations();
    const categoryCombinations = savedOptimalCombinations[category] || [];

    if (index >= 0 && index < categoryCombinations.length) {
      if (historyManager.setActiveIndex) {
        historyManager.setActiveIndex(category, index);
      }
      return categoryCombinations[index];
    }

    return null;
  };

  window.HistoryManager.getHighestScoreIndex = function (category) {
    const { savedOptimalCombinations } = this.loadSavedCombinations();
    const categoryCombinations = savedOptimalCombinations[category] || [];

    let highestScoreIndex = 0;
    let highestScore = 0;

    for (let i = 0; i < categoryCombinations.length; i++) {
      const combo = categoryCombinations[i];
      const currentScore =
        SpiritUtils.ensureNumber(combo.gradeScore) +
        SpiritUtils.ensureNumber(combo.factionScore) +
        SpiritUtils.ensureNumber(combo.bindScore);

      if (currentScore > highestScore) {
        highestScore = currentScore;
        highestScoreIndex = i;
      }
    }

    return highestScoreIndex;
  };

  function renderGradeSetInfo(gradeCounts) {
    if (!gradeCounts) return "";

    let html = "";

    for (const [category, grades] of Object.entries(gradeCounts || {})) {
      for (const [grade, count] of Object.entries(grades)) {
        if (count >= 2) {
          const gradeClass =
            grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
          html += `<span class="grade-tag ${gradeClass}">${grade} X ${count}</span> `;
        }
      }
    }

    return html;
  }

  function renderFactionSetInfo(factionCounts) {
    if (!factionCounts) return "";

    let html = "";

    for (const [category, factions] of Object.entries(factionCounts || {})) {
      const factionTags = Object.entries(factions)
        .filter(([_, count]) => count >= 2)
        .map(([faction, count]) => {
          const iconPath =
            FACTION_ICONS[faction] || "assets/img/bond/default.jpg";
          return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
        })
        .join(" ");

      if (factionTags) {
        html += factionTags;
      }
    }

    return html;
  }

  function renderEffects(
    gradeEffects,
    factionEffects,
    bindStats,
    displayGradeScore,
    displayFactionScore,
    displayBindScore,
    gradeCounts,
    factionCounts
  ) {
    const gradeEffectsContainer = document.getElementById(
      "optimalGradeEffects"
    );
    if (gradeEffectsContainer) {
      const gradeSetInfo = renderGradeSetInfo(gradeCounts);
      gradeEffectsContainer.innerHTML = `
        <h4>등급 결속 효과 <span class="section-score">(${displayGradeScore})</span></h4>
        <div class="set-info">${gradeSetInfo}</div>
        <div class="effects-content">
          ${
            Object.keys(gradeEffects || {}).length > 0
              ? CalculationUtils.renderEffectsList(gradeEffects || {}, "", true)
              : "<p>적용된 효과가 없습니다.</p>"
          }
        </div>
      `;
    }

    const factionEffectsContainer = document.getElementById(
      "optimalFactionEffects"
    );
    if (factionEffectsContainer) {
      const factionSetInfo = renderFactionSetInfo(factionCounts);
      factionEffectsContainer.innerHTML = `
        <h4>세력 결속 효과 <span class="section-score">(${displayFactionScore})</span></h4>
        <div class="set-info">${factionSetInfo}</div>
        <div class="effects-content">
          ${
            Object.keys(factionEffects || {}).length > 0
              ? CalculationUtils.renderEffectsList(
                  factionEffects || {},
                  "",
                  true
                )
              : "<p>적용된 효과가 없습니다.</p>"
          }
        </div>
      `;
    }

    const bindEffectsContainer = document.getElementById("optimalBindEffects");
    if (bindEffectsContainer) {
      if (bindStats && Object.keys(bindStats).length > 0) {
        bindEffectsContainer.innerHTML = `
          <h4>장착 효과 <span class="section-score">(${displayBindScore})</span>
            <span class="info-icon" title="각인효과를 제외한 수치입니다">ⓘ</span>
          </h4>
          <div class="effects-content">
            ${CalculationUtils.renderEffectsList(bindStats, "", true)}
          </div>
        `;
      } else {
        bindEffectsContainer.innerHTML = `
          <h4>장착 효과 <span class="section-score">(0)</span>
            <span class="info-icon" title="각인효과를 제외한 수치입니다">ⓘ</span>
          </h4>
          <p>사용 가능한 결속 스탯이 없습니다.</p>
        `;
      }
    }
  }

  function renderSpiritDetailsTable(spirits) {
    const STATS_MAPPING = window.CommonData.STATS_MAPPING || {};
    const STAT_COLOR_MAP = window.CommonData.STAT_COLOR_MAP || {};
    const PERCENT_STATS = window.CommonData.PERCENT_STATS || [];

    const container = document.getElementById("spiritStatsDetails");
    if (!container) return;

    container.innerHTML = "";

    if (!spirits || !Array.isArray(spirits) || spirits.length === 0) {
      container.innerHTML = "<p>표시할 환수 정보가 없습니다.</p>";
      return;
    }

    const allStatKeys = new Set();

    spirits.forEach((spirit) => {
      if (!spirit || !spirit.stats || !Array.isArray(spirit.stats)) return;

      const levelStats = spirit.stats.find(
        (s) => s && s.level === spirit.level
      );
      if (levelStats && levelStats.registrationStat) {
        Object.keys(levelStats.registrationStat).forEach((key) => {
          if (key) allStatKeys.add(SpiritUtils.normalizeStatKey(key));
        });
      }

      let bindStatData = null;

      if (levelStats && levelStats.bindStat) {
        bindStatData = levelStats.bindStat;
      } else if (spirit.hasLevel25Bind) {
        const level25Stat = spirit.stats.find((s) => s && s.level === 25);
        if (level25Stat && level25Stat.bindStat) {
          bindStatData = level25Stat.bindStat;
        }
      }

      if (bindStatData) {
        Object.keys(bindStatData).forEach((key) => {
          if (key) allStatKeys.add(SpiritUtils.normalizeStatKey(key));
        });
      }
    });

    if (allStatKeys.size === 0) {
      container.innerHTML = "<p>표시할 스탯 정보가 없습니다.</p>";
      return;
    }

    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
    ];

    const sortedStatKeys = Array.from(allStatKeys).sort((a, b) => {
      const aPriority = priorityStats.indexOf(a);
      const bPriority = priorityStats.indexOf(b);

      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      } else if (aPriority !== -1) {
        return -1;
      } else if (bPriority !== -1) {
        return 1;
      } else {
        return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
      }
    });

    const table = document.createElement("table");
    table.className = "spirits-stats-table";

    const headerRow = document.createElement("tr");
    const emptyHeader = document.createElement("th");
    emptyHeader.textContent = "환수";
    headerRow.appendChild(emptyHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const spiritHeader = document.createElement("th");
      spiritHeader.innerHTML = `
        <img src="${spirit.image || ""}" alt="${spirit.name || "환수"}"
             class="spirit-thumbnail"><br>${spirit.name || "환수"}
      `;
      headerRow.appendChild(spiritHeader);
    });
    table.appendChild(headerRow);

    const scoreRow = document.createElement("tr");
    const scoreHeader = document.createElement("th");
    scoreHeader.textContent = "환산합산";
    scoreHeader.style.backgroundColor = "#e3f2fd";
    scoreRow.appendChild(scoreHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const scoreCell = document.createElement("td");
      scoreCell.style.backgroundColor = "#e3f2fd";
      scoreCell.style.fontWeight = "bold";

      let totalScore = 0;

      try {
        if (spirit.stats && Array.isArray(spirit.stats)) {
          const levelStat = spirit.stats.find(
            (s) => s && s.level === spirit.level
          );

          if (levelStat && levelStat.registrationStat) {
            const stats = levelStat.registrationStat;

            const penResist = parseFloat(
              stats.damageResistancePenetration || 0
            );
            const resist = parseFloat(stats.damageResistance || 0);
            const pvpDmg = parseFloat(stats.pvpDamagePercent || 0) * 10;
            const pvpDef = parseFloat(stats.pvpDefensePercent || 0) * 10;

            totalScore = penResist + resist + pvpDmg + pvpDef;
          }

          let bindStat = null;

          if (levelStat && levelStat.bindStat) {
            bindStat = levelStat.bindStat;
          } else if (spirit.hasLevel25Bind) {
            const level25Stat = spirit.stats.find((s) => s && s.level === 25);
            if (level25Stat && level25Stat.bindStat) {
              bindStat = level25Stat.bindStat;
            }
          }

          if (bindStat) {
            const bindPenResist = parseFloat(
              bindStat.damageResistancePenetration || 0
            );
            const bindResist = parseFloat(bindStat.damageResistance || 0);
            const bindPvpDmg = parseFloat(bindStat.pvpDamagePercent || 0) * 10;
            const bindPvpDef = parseFloat(bindStat.pvpDefensePercent || 0) * 10;

            const bindScore =
              bindPenResist + bindResist + bindPvpDmg + bindPvpDef;

            if (bindScore > 0) {
              scoreCell.innerHTML = `<span style="color:#e67e22; font-size:0.85em;">${Math.round(
                bindScore
              )}</span>`;
              scoreRow.appendChild(scoreCell);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("점수 계산 중 오류 발생:", e);
      }

      scoreCell.textContent = Math.round(totalScore);
      scoreRow.appendChild(scoreCell);
    });

    table.appendChild(scoreRow);

    const levelRow = document.createElement("tr");
    const levelHeader = document.createElement("th");
    levelHeader.textContent = "레벨";
    levelRow.appendChild(levelHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const levelCell = document.createElement("td");
      levelCell.textContent = spirit.level || 0;
      levelRow.appendChild(levelCell);
    });
    table.appendChild(levelRow);

    const factionRow = document.createElement("tr");
    const factionHeader = document.createElement("th");
    factionHeader.textContent = "세력";
    factionRow.appendChild(factionHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const factionCell = document.createElement("td");
      factionCell.textContent = spirit.influence || spirit.faction || "결의";
      factionRow.appendChild(factionCell);
    });
    table.appendChild(factionRow);

    sortedStatKeys.forEach((statKey) => {
      const row = document.createElement("tr");
      const statHeader = document.createElement("th");
      statHeader.textContent = STATS_MAPPING[statKey] || statKey;

      const colorClass = (STAT_COLOR_MAP && STAT_COLOR_MAP[statKey]) || "";
      if (colorClass) {
        statHeader.className = colorClass;
      }
      row.appendChild(statHeader);

      spirits.forEach((spirit) => {
        if (!spirit) return;

        const statCell = document.createElement("td");
        if (colorClass) {
          statCell.className = colorClass;
        }

        let statValue = 0;
        let bindValue = 0;

        try {
          if (spirit.stats && Array.isArray(spirit.stats)) {
            const levelStat = spirit.stats.find(
              (s) => s && s.level === spirit.level
            );
            if (levelStat && levelStat.registrationStat) {
              for (const [key, value] of Object.entries(
                levelStat.registrationStat
              )) {
                if (SpiritUtils.normalizeStatKey(key) === statKey) {
                  statValue = value || 0;
                  break;
                }
              }
            }

            let bindStat = null;

            if (levelStat && levelStat.bindStat) {
              bindStat = levelStat.bindStat;
            } else if (spirit.hasLevel25Bind) {
              const level25Stat = spirit.stats.find((s) => s && s.level === 25);
              if (level25Stat && level25Stat.bindStat) {
                bindStat = level25Stat.bindStat;
              }
            }

            if (bindStat) {
              for (const [key, value] of Object.entries(bindStat)) {
                if (SpiritUtils.normalizeStatKey(key) === statKey) {
                  bindValue = value || 0;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn("스탯 접근 중 오류 발생:", e);
          statValue = 0;
          bindValue = 0;
        }

        const isPercentStat = PERCENT_STATS.includes(statKey);

        if (bindValue > 0) {
          statCell.innerHTML = isPercentStat
            ? `<span style="color:#e67e22; font-size:0.85em;">${bindValue}%</span>`
            : `<span style="color:#e67e22; font-size:0.85em;">${bindValue}</span>`;
        } else {
          statCell.textContent = isPercentStat ? `${statValue}%` : statValue;
        }

        row.appendChild(statCell);
      });

      table.appendChild(row);
    });

    container.appendChild(table);

    const style = document.createElement("style");
    style.textContent = `
      .spirits-stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 0.85rem;
      }
      
      .spirits-stats-table th, .spirits-stats-table td {
        padding: 6px 4px;
        text-align: center;
        border: 1px solid #dee2e6;
      }
      
      .spirits-stats-table th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      
      .spirits-stats-table .spirit-thumbnail {
        width: 30px;
        height: 30px;
        object-fit: contain;
        margin-bottom: 2px;
      }
      
      @media (max-width: 768px) {
        .spirits-stats-table {
          font-size: 0.75rem;
        }
        
        .spirits-stats-table th, .spirits-stats-table td {
          padding: 4px 2px;
        }
        
        .spirits-stats-table .spirit-thumbnail {
          width: 25px;
          height: 25px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function initModalStyles() {
    const existingStyle = document.getElementById("optimal-modal-styles");
    if (existingStyle) return;

    const style = document.createElement("style");
    style.id = "optimal-modal-styles";
    style.textContent = `
      #optimalModal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0, 0, 0, 0.7) !important;
        z-index: 10000 !important;
        display: none;
        justify-content: center !important;
        align-items: center !important;
        -webkit-overflow-scrolling: touch;
      }
      
      #optimalModalContent {
        background: #fff !important;
        width: 90% !important;
        max-width: 800px !important;
        padding: 20px !important;
        border-radius: 12px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        position: relative !important;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3) !important;
        display: block !important;
        z-index: 10001 !important;
        margin: 0 auto !important;
      }
      
      #closeOptimalModal {
        position: absolute;
        right: 15px;
        top: 15px;
        font-size: 24px;
        color: #555;
        background: none;
        border: none;
        cursor: pointer;
        z-index: 10002;
      }
      
      #closeOptimalModal:hover {
        color: #000;
      }
  
      #combinationResultsContainer {
        min-height: 200px;
        position: relative;
        will-change: contents;
        contain: layout;
        padding: 10px 0;
      }
  
      .history-tabs-container {
        width: 100%;
        overflow-x: hidden;
        padding-bottom: 5px;
        margin-top: 15px;
        contain: content;
      }
  
      .history-tabs {
        display: grid;
        grid-template-columns: repeat(5, 1fr) !important;
        width: 100%;
        margin-bottom: 12px;
        gap: 4px;
      }
  
      .history-tab, .history-tab-placeholder {
        border-radius: 6px;
        padding: 28px 2px 5px !important;
        margin: 0;
        position: relative;
        min-height: 65px;
      }
  
      .history-tab {
        border: 1px solid #ddd;
        background-color: #f8f8f8;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
        overflow: hidden;
      }
  
      .tab-indicators {
        position: absolute;
        top: 2px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 2px;
        z-index: 2;
      }
  
      .current-marker, .best-marker {
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: normal;
        z-index: 2;
      }
  
      .current-marker {
        background: #3498db;
        color: white;
      }
  
      .best-marker {
        background: #e74c3c;
        color: white;
      }
  
      .combo-name {
        font-weight: bold;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 5px;
        padding: 0 5px;
        z-index: 1;
      }
  
      .tab-score {
        font-size: 11px;
        font-weight: bold;
        margin-top: 3px;
        display: block;
        text-align: center;
        z-index: 1;
      }
  
      .best-notice {
        margin-left: 10px;
        color: #e74c3c;
        font-weight: bold;
      }
  
      .history-tab.active {
        border: 2px solid #3498db;
        background-color: #ebf5fb;
      }
  
      .history-tab.best {
        border: 2px solid #e74c3c;
        background-color: #fdedec;
      }
  
      .history-tab.active.best {
        background: linear-gradient(135deg, #ebf5fb 0%, #fdedec 100%);
      }
      
      .clear-history-btn {
        background-color: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s;
        margin: 0;
        font-size: 0.9em;
      }
      
      .clear-history-btn:hover {
        background-color: #c0392b;
      }
      
      .action-buttons {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 5px;
      }
  
      .spirits-grid-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        grid-gap: 8px;
        margin-top: 10px;
      }
      
      .spirit-info-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        border-radius: 8px;
        background-color: #f8f8f8;
        border: 1px solid #e0e0e0;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .spirit-info-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
      
      .spirit-info-item img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        margin-bottom: 5px;
      }
      
      .spirit-info-details {
        width: 100%;
        text-align: center;
      }
      
      .spirit-info-name {
        font-weight: bold;
        font-size: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .spirit-info-level {
        font-size: 8px;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
  
      @media (min-width: 768px) {
        .spirits-grid-container {
          grid-template-columns: repeat(6, 1fr);
        }
      }
      
      .no-flicker {
        backface-visibility: hidden;
        transform: translateZ(0);
        perspective: 1000;
      }
    `;
    document.head.appendChild(style);
  }

  function closeOptimalModal() {
    const modal = document.getElementById("optimalModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  return {
    showResultModal,
    renderNewResult,
    renderSpiritDetailsTable,
    initModalStyles,
    prepareModalStructure,
    closeOptimalModal,
  };
})();

window.OptimalResultModal = OptimalResultModal;

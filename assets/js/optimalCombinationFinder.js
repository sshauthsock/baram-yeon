const OptimalCombinationFinder = (function () {
  let isCalculationCancelled = false;
  let isProcessing = false;
  let currentCategory = ""; // 전역 변수로 현재 카테고리 추가
  let bestResultOverall = null; // 전역 최적 결과
  let calculationWorker = null; // 계산 작업자

  function findOptimalCombination(selectedSpirits, lastActiveCategory) {
    currentCategory = lastActiveCategory; // 전역 변수에 저장
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    if (categorySpirits.length === 0) {
      alert(`${currentCategory} 최적 조합을 찾으려면 환수를 선택하세요.`);
      return;
    }

    isProcessing = true;
    isCalculationCancelled = false;
    bestResultOverall = null;

    // 이전 Worker가 있다면 정리
    if (calculationWorker) {
      calculationWorker.terminate();
      calculationWorker = null;
    }

    OptimalResultModal.prepareModalStructure();
    OptimalResultModal.initModalStyles();

    const optimalModal = document.getElementById("optimalModal");
    const modalContent = document.getElementById("optimalModalContent");

    modalContent.innerHTML = `
      <div class="calculating-wrapper">
        <div class="calculating-box">
          <div class="calculating-spinner"></div>
          <h3>${currentCategory} 최적 조합 계산 중...</h3>
          <p>환수 조합을 계산하고 있습니다. 환수 수에 따라 시간이 걸릴 수 있습니다.</p>
          <button id="cancelCalcBtn" class="cancel-calc-btn">계산 취소</button>
        </div>
      </div>
    `;

    optimalModal.style.display = "flex";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      const cancelCalcBtn = document.getElementById("cancelCalcBtn");
      if (cancelCalcBtn) {
        cancelCalcBtn.addEventListener("click", function () {
          isCalculationCancelled = true;
          if (calculationWorker) {
            calculationWorker.terminate();
            calculationWorker = null;
          }
          document.querySelector(".calculating-box h3").textContent =
            "계산이 취소되었습니다";
        });
      }
    }, 10);

    const calcStyle = document.createElement("style");
    calcStyle.id = "calc-style";
    calcStyle.textContent = `
        .calculating-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
        }
        .calculating-box {
          text-align: center;
          padding: 30px;
          background: #f8f8f8;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .calculating-spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .cancel-calc-btn {
          margin-top: 20px;
          padding: 10px 20px;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }
      `;
    document.head.appendChild(calcStyle);

    setTimeout(() => {
      try {
        const {
          invalidSpirits,
          invalidBindSpirits,
          spiritsWithSuggestions,
          spiritsWithBindSuggestions,
        } = checkSpiritLevelData(selectedSpirits, lastActiveCategory);

        if (invalidSpirits.length > 0 || invalidBindSpirits.length > 0) {
          const warning = showLevelDataWarning(
            invalidSpirits,
            spiritsWithSuggestions,
            invalidBindSpirits,
            spiritsWithBindSuggestions,
            currentCategory
          );

          if (warning) {
            document.getElementById("optimalModalContent").innerHTML = `
                <div class="warning-dialog">
                  <h3>데이터 경고</h3>
                  <div class="warning-content">${warning}</div>
                  <div class="warning-buttons">
                    <button id="continueBtn" class="continue-btn">계속 진행</button>
                    <button id="cancelBtn" class="cancel-btn">취소</button>
                  </div>
                </div>
              `;

            const warningStyle = document.createElement("style");
            warningStyle.textContent = `
                .warning-dialog {
                  padding: 20px;
                  background: #fff;
                  border-radius: 10px;
                  max-width: 600px;
                  margin: 0 auto;
                }
                .warning-content {
                  margin: 20px 0;
                  padding: 15px;
                  background: #fff3cd;
                  border-left: 5px solid #ffc107;
                }
                .warning-buttons {
                  display: flex;
                  justify-content: center;
                  gap: 15px;
                }
                .continue-btn, .cancel-btn {
                  padding: 8px 16px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-weight: bold;
                }
                .continue-btn {
                  background: #4caf50;
                  color: white;
                }
                .cancel-btn {
                  background: #f44336;
                  color: white;
                }
              `;
            document.head.appendChild(warningStyle);

            document
              .getElementById("continueBtn")
              .addEventListener("click", function () {
                setTimeout(
                  () =>
                    runActualCalculation(selectedSpirits, lastActiveCategory),
                  100
                );
              });

            document
              .getElementById("cancelBtn")
              .addEventListener("click", function () {
                closeOptimalModal();
                isProcessing = false;
              });
          } else {
            runActualCalculation(selectedSpirits, lastActiveCategory);
          }
        } else {
          runActualCalculation(selectedSpirits, lastActiveCategory);
        }
      } catch (error) {
        console.error("Error starting calculation:", error);
        document.getElementById("optimalModalContent").innerHTML = `
            <div class="error-message">
              <h3>오류 발생</h3>
              <p>계산 준비 중 오류가 발생했습니다: ${
                error.message || "알 수 없는 오류"
              }</p>
              <button onclick="BondCalculatorApp.closeOptimalModal()" class="close-btn">닫기</button>
            </div>
          `;
        isProcessing = false;
      }
    }, 100);

    return { isProcessing };
  }

  function checkSpiritLevelData(selectedSpirits, lastActiveCategory) {
    const currentCategory = lastActiveCategory;

    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    const invalidSpirits = [];
    const invalidBindSpirits = [];
    const spiritsWithSuggestions = [];
    const spiritsWithBindSuggestions = [];

    for (const spirit of categorySpirits) {
      const name = spirit.name;
      const level = spirit.level || 0;
      const availableLevels = [];
      const availableBindLevels = [];

      if (spirit.stats && Array.isArray(spirit.stats)) {
        spirit.stats.forEach((stat) => {
          if (
            stat.registrationStat &&
            Object.keys(stat.registrationStat).length > 0
          ) {
            availableLevels.push(stat.level);
          }

          if (stat.bindStat && Object.keys(stat.bindStat).length > 0) {
            availableBindLevels.push(stat.level);
          }
        });
      }

      if (!availableLevels.includes(level)) {
        invalidSpirits.push({
          name,
          level,
          availableLevels,
          category: currentCategory,
        });

        if (availableLevels.length > 0) {
          spiritsWithSuggestions.push({
            name,
            level,
            availableLevels,
            category: currentCategory,
          });
        }
      }

      if (
        !availableBindLevels.includes(level) &&
        !availableBindLevels.includes(25)
      ) {
        invalidBindSpirits.push({
          name,
          level,
          availableBindLevels,
          category: currentCategory,
        });

        if (availableBindLevels.length > 0) {
          spiritsWithBindSuggestions.push({
            name,
            level,
            availableBindLevels,
            category: currentCategory,
          });
        }
      }
    }

    return {
      invalidSpirits,
      invalidBindSpirits,
      spiritsWithSuggestions,
      spiritsWithBindSuggestions,
    };
  }

  function showLevelDataWarning(
    invalidSpirits,
    spiritsWithSuggestions,
    invalidBindSpirits,
    spiritsWithBindSuggestions,
    currentCategory
  ) {
    let message = "";

    if (invalidSpirits.length > 0) {
      message += `<strong>${currentCategory} 등록 스탯 데이터 누락 경고:</strong><br><br>`;

      invalidSpirits.forEach((spirit) => {
        message += `- <strong>${spirit.name}</strong>: ${spirit.level}레벨에 등록 스탯 데이터가 없습니다.`;

        if (spirit.availableLevels.length > 0) {
          message += ` 다음 레벨에는 데이터가 있습니다: ${spirit.availableLevels.join(
            ", "
          )}`;
        } else {
          message += " (사용 가능한 데이터가 없습니다)";
        }

        message += "<br>";
      });

      if (spiritsWithSuggestions.length > 0) {
        message +=
          '<br>권장 조치: 각 환수의 레벨을 데이터가 있는 레벨로 변경하시거나 "MAX" 버튼을 눌러 최대 레벨로 설정하세요.<br><br>';
      }
    }

    if (invalidBindSpirits.length > 0) {
      message += `<strong>${currentCategory} 결속 스탯 데이터 누락 경고:</strong><br><br>`;

      invalidBindSpirits.forEach((spirit) => {
        message += `- <strong>${spirit.name}</strong>: ${spirit.level}레벨에 결속 스탯 데이터가 없습니다.`;

        if (spirit.availableBindLevels.length > 0) {
          message += ` 다음 레벨에는 결속 스탯이 있습니다: ${spirit.availableBindLevels.join(
            ", "
          )}`;
        } else {
          message += " (사용 가능한 결속 스탯 데이터가 없습니다)";
        }

        message += "<br>";
      });

      if (spiritsWithBindSuggestions.length > 0) {
        message +=
          "<br>권장 조치: 각 환수의 레벨을 결속 스탯 데이터가 있는 레벨로 변경하시거나, 25레벨 결속 스탯을 사용할 수 있는 환수의 경우 자동으로 적용됩니다.";
      }
    }

    return message;
  }

  function runActualCalculation(selectedSpirits, lastActiveCategory) {
    currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    document.getElementById("optimalModalContent").innerHTML = `
    <h3 class="modal-title">${currentCategory} 최적 결속 조합 결과 (최대 6개)</h3>
    <div class="modal-content">
      <div class="ad-row">
        <div class="ad-container-left">
            <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-sgK0ytXrL3f7EHRF"
                data-ad-width="728" data-ad-height="90"></ins>
        </div>
      </div>
      <div class="ad-container mobile-ad">
        <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-TPesUrzJaxJ008Lm"
            data-ad-width="320" data-ad-height="50"></ins>
      </div>
      <div id="optimalHeader" class="optimal-header">
        <div class="optimal-score">
          <h4>환산합산: <span id="optimalScore">계산 중...</span> <span id="optimalScoreBind" class="bind-score">(장착효과: 계산 중...)</span></h4>
          <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small><br />
          <small>환산 합산은 등급 결속 효과 + 세력 결속 효과 + 장착 효과 능력치입니다.</small>
        </div>
      </div>

      <div class="action-buttons">
        <button id="clearHistoryButton" class="clear-history-btn">
          ${currentCategory} 기록 삭제
        </button>
      </div>

      <div id="optimalSpiritsList" class="selected-spirits-info">
        <div class='processing-message'>
          <div class="calculating-spinner-small"></div>
          최적 조합을 찾는 중입니다... (0%)
          <div style="margin-top: 10px;">
            <button id="cancelCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
          </div>
        </div>
      </div>

      <div class="results-container">
        <div class="results-section">
          <div id="optimalGradeEffects" class="effects-list"></div>
        </div>
        <div class="results-section">
          <div id="optimalFactionEffects" class="effects-list"></div>
        </div>
        <div class="results-section">
          <div id="optimalBindEffects" class="effects-list"></div>
        </div>
      </div>

      <div id="optimalSpiritsDetails" class="spirit-details-container">
        <h4>선택된 환수 상세 스탯 (결속 수치)</h4>
        <div id="spiritStatsDetails" class="spirit-stats-grid"></div>
      </div>
    </div>
  `;

    const style = document.createElement("style");
    style.textContent = `
      .calculating {
        padding: 10px;
        background-color: #f1f8fe;
        color: #3498db;
        border-left: 3px solid #3498db;
        font-style: italic;
        text-align: center;
        margin: 10px 0;
      }
      .processing-message {
        text-align: center;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 15px;
        font-weight: bold;
        color: #3498db;
      }
      .calculating-spinner-small {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
      }
      .warning-message {
        padding: 15px;
        background-color: #fff3cd;
        border-left: 3px solid #ffc107;
        color: #856404;
        margin: 10px 0;
        border-radius: 4px;
      }
      .no-effects {
        color: #6c757d;
        font-style: italic;
        padding: 10px;
        text-align: center;
      }
      .bind-score {
        font-size: 0.85em;
        color: #e67e22;
        margin-left: 5px;
      }
      .smart-filtering-info {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      }
      .filtering-phases {
          display: flex;
          justify-content: space-between;
          margin: 15px 0;
      }
      .phase {
          flex: 1;
          text-align: center;
          padding: 10px;
          border-radius: 5px;
          background-color: #e9ecef;
          margin: 0 5px;
          color: #6c757d;
          font-size: 14px;
          position: relative;
      }
      .phase::after {
          content: '';
          position: absolute;
          right: -15px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-left: 10px solid #e9ecef;
          border-bottom: 6px solid transparent;
      }
      .phase:last-child::after {
          display: none;
      }
      .phase.active {
          background-color: #007bff;
          color: white;
          font-weight: bold;
      }
      .phase.active::after {
          border-left-color: #007bff;
      }
      .phase.completed {
          background-color: #28a745;
          color: white;
      }
      .phase.completed::after {
          border-left-color: #28a745;
      }
      .spirit-category-counts {
          display: flex;
          justify-content: space-around;
          margin: 15px 0;
          flex-wrap: wrap;
      }
      .spirit-count {
          background-color: #e3f2fd;
          padding: 8px 15px;
          border-radius: 20px;
          font-weight: bold;
          margin: 5px;
      }
      .filtering-info {
          background-color: #fff3cd;
          padding: 10px;
          border-radius: 5px;
          font-style: italic;
          text-align: center;
          margin: 10px 0;
      }
      
      .data-warning-box {
        margin: 10px 0 20px;
        padding: 15px;
        background-color: #fff3cd;
        border-left: 5px solid #ffc107;
        border-radius: 4px;
        font-size: 0.9em;
      }
      
      .data-warning-box h4 {
        margin-top: 0;
        color: #856404;
      }
      
      .data-warning-box p {
        margin: 5px 0;
      }
      
      .data-submission-request {
        margin: 15px 0;
        padding: 12px 15px;
        background-color: #e8f4f8;
        border: 2px solid #3498db;
        border-radius: 5px;
        font-style: italic;
        font-size: 12px;
        color: #333;
        text-align: center;
        font-weight: bold;
      }
      
      .no-bind-warning {
        margin: 10px 0;
        padding: 10px 15px;
        background-color: #f8f9fa;
        border-left: 3px solid #6c757d;
        font-size: 0.9em;
        color: #555;
      }
      
      .has-bind-bonus {
        color: #2ecc71 !important;
        font-weight: bold;
      }
      
      .history-tab .tab-score {
        font-size: 11px;
        font-weight: bold;
        margin-top: 3px;
        display: block;
        text-align: center;
      }
      
      .cancel-calculation-btn {
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
      }
      
      .cancel-calculation-btn:hover {
        background: #c0392b;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    document
      .getElementById("cancelCalculationBtn")
      .addEventListener("click", function () {
        cancelCalculation();
      });

    const clearHistoryBtn = document.getElementById("clearHistoryButton");
    if (clearHistoryBtn) {
      const newBtn = clearHistoryBtn.cloneNode(true);
      clearHistoryBtn.parentNode.replaceChild(newBtn, clearHistoryBtn);

      newBtn.addEventListener("click", function () {
        clearHistory(currentCategory);
      });
    }

    const historyData = HistoryManager.loadSavedCombinations();
    const { savedOptimalCombinations, categoryState } = historyData;

    HistoryManager.renderHistoryTabs(
      currentCategory,
      document.getElementById("optimalSpiritsList"),
      (result, isBest) => {
        OptimalResultModal.showResultModal(result);
      }
    );

    if (
      savedOptimalCombinations[currentCategory] &&
      savedOptimalCombinations[currentCategory].length > 0
    ) {
      const currentActiveIndex = categoryState[currentCategory].activeIndex;
      OptimalResultModal.showResultModal(
        savedOptimalCombinations[currentCategory][currentActiveIndex]
      );
    }

    if (typeof SearchManager !== "undefined" && SearchManager.initializeAds) {
      SearchManager.initializeAds(optimalModal);
    }

    setTimeout(() => {
      try {
        const validSpirits = categorySpirits
          .map((spirit) => {
            const copy = JSON.parse(JSON.stringify(spirit));
            copy.category = spirit.category;
            copy.grade = spirit.grade || "전설";
            copy.faction = spirit.influence || spirit.faction || "결의";
            return copy;
          })
          .filter((spirit) => {
            const hasValidLevel =
              spirit.level !== undefined && spirit.level !== null;
            const hasLevelStats = spirit.stats?.some(
              (s) =>
                s.level === spirit.level &&
                s.registrationStat &&
                Object.keys(s.registrationStat).length > 0
            );
            return hasValidLevel && hasLevelStats;
          });

        if (validSpirits.length === 0) {
          throw new Error(
            "유효한 환수 데이터가 없습니다. 환수들의 레벨을 확인해주세요."
          );
        }

        runGeneticAlgorithm(validSpirits);
      } catch (error) {
        console.error("Error finding optimal combination:", error);
        document.getElementById("optimalSpiritsList").innerHTML = `
          <div class='warning-message'>${
            error.message || "조합을 찾는 중 오류가 발생했습니다."
          }</div>`;
        document.getElementById("optimalScore").textContent = "오류";
        isProcessing = false;
      }
    }, 100);
  }

  function clearHistory(category) {
    if (!category) {
      category = currentCategory; // 인자가 없으면 전역 변수 사용
    }

    if (
      confirm(
        `${category} 카테고리의 저장된 모든 조합 기록을 삭제하시겠습니까?`
      )
    ) {
      try {
        // console.log(`${category} 기록 삭제 시작`);

        const savedDataKey = "savedOptimalCombinations";
        const savedStateKey = "categoryState";
        let savedData = {};
        let categoryState = {};

        try {
          const savedDataStr = localStorage.getItem(savedDataKey);
          if (savedDataStr) {
            savedData = JSON.parse(savedDataStr);
          }

          const savedStateStr = localStorage.getItem(savedStateKey);
          if (savedStateStr) {
            categoryState = JSON.parse(savedStateStr);
          }
        } catch (e) {
          console.error("로컬 스토리지에서 데이터를 불러오는 중 오류:", e);
        }

        if (savedData[category]) {
          delete savedData[category];
        }

        if (categoryState[category]) {
          categoryState[category] = {
            activeIndex: 0,
            lastUpdated: new Date().toISOString(),
          };
        }

        localStorage.setItem(savedDataKey, JSON.stringify(savedData));
        localStorage.setItem(savedStateKey, JSON.stringify(categoryState));

        // console.log(`localStorage ${category} 기록 삭제 완료`);

        if (window.HistoryManager) {
          if (window.HistoryManager._savedCombinations) {
            window.HistoryManager._savedCombinations = null;
          }
        }

        const elementsToEmpty = [
          "optimalGradeEffects",
          "optimalFactionEffects",
          "optimalBindEffects",
          "optimalTotalEffects",
          "spiritStatsDetails",
          "combinationResultsContainer",
        ];

        elementsToEmpty.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = "";
        });

        // 4. 점수 표시 초기화
        const scoreEl = document.getElementById("optimalScore");
        if (scoreEl) scoreEl.textContent = "0";

        const scoreBindEl = document.getElementById("optimalScoreBind");
        if (scoreBindEl) scoreBindEl.textContent = "(장착효과: 0)";

        // 5. history-tab 영역 직접 초기화
        const spiritsList = document.getElementById("optimalSpiritsList");
        if (spiritsList) {
          spiritsList.innerHTML = `<div class="history-tabs-container">
          <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
        </div>`;
        }

        // 6. HistoryManager 통해 history-tab 새로 렌더링
        if (
          window.HistoryManager &&
          typeof window.HistoryManager.renderHistoryTabs === "function"
        ) {
          setTimeout(() => {
            window.HistoryManager.renderHistoryTabs(
              category,
              document.getElementById("optimalSpiritsList"),
              (result) => {
                if (
                  window.OptimalResultModal &&
                  typeof window.OptimalResultModal.showResultModal ===
                    "function"
                ) {
                  window.OptimalResultModal.showResultModal(result);
                }
              }
            );
          }, 100);
        }

        alert(`${category} 조합 기록이 모두 삭제되었습니다.`);
      } catch (error) {
        console.error("기록 삭제 중 오류 발생:", error);
        alert(
          "기록 삭제 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인하세요."
        );
      }
    }
  }

  // 계산 취소 함수
  function cancelCalculation() {
    isCalculationCancelled = true;

    // Worker 종료
    if (calculationWorker) {
      calculationWorker.terminate();
      calculationWorker = null;
    }

    document.getElementById("optimalSpiritsList").innerHTML =
      "<div class='warning-message'>계산이 중단되었습니다. 현재까지 찾은 최적 조합이 있으면 표시합니다.</div>";

    // 현재까지 찾은 최적 결과 표시
    if (bestResultOverall) {
      // 결과 출력
      finishCalculation(bestResultOverall);
    } else {
      document.getElementById("optimalScore").textContent = "계산 취소됨";
    }
  }

  function evaluateSpiritCombination(spirits) {
    try {
      // 스탯 계산을 위해 CalculationUtils 사용
      const result = CalculationUtils.calculateEffectsForSpirits(spirits);

      // 추정치 처리
      if (result.bindStats) {
        let hasEstimatedValues = false;
        for (const [key, value] of Object.entries(result.bindStats)) {
          if (typeof value === "string" && value.includes("(추정)")) {
            hasEstimatedValues = true;
            result.bindStats[key] =
              parseFloat(OptimalResultModal.cleanEstimatedValue(value)) || 0;
          }
        }

        if (hasEstimatedValues) {
          result.bindScore = parseInt(
            CalculationUtils.calculateScore(result.bindStats)
          );
          result.usesEstimatedValues = true;
        }
      }

      // 정확한 점수 계산
      result.gradeScore = parseInt(result.gradeScore || 0);
      result.factionScore = parseInt(result.factionScore || 0);
      result.bindScore = parseInt(result.bindScore || 0);

      // 환산합산 계산
      result.scoreWithBind =
        result.gradeScore + result.factionScore + result.bindScore;

      return result;
    } catch (error) {
      console.error("조합 평가 중 오류:", error);
      return {
        spirits: spirits,
        scoreWithBind: 0,
        gradeScore: 0,
        factionScore: 0,
        bindScore: 0,
      };
    }
  }

  // 유전 알고리즘 구현
  function runGeneticAlgorithm(validSpirits) {
    // UI 준비
    const filteringInfoContainer = document.createElement("div");
    filteringInfoContainer.className = "smart-filtering-info";
    filteringInfoContainer.innerHTML = `
      <h4>유전 알고리즘을 사용한 최적 조합 계산</h4>
      <div class="filtering-info">학습 기반 알고리즘으로 최적 조합을 빠르게 찾습니다</div>
      <div class="progress-container">
        <div class="progress-bar-container">
          <div class="progress-bar" id="calculation-progress-bar" style="width:0%"></div>
          <div class="progress-character" id="progress-character"></div>
        </div>
      </div>
      <div id="calculation-status">초기 인구 생성 중...</div>
      <div class="control-buttons">
        <button id="stopCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
      </div>
    `;

    document.getElementById("optimalSpiritsList").innerHTML = "";
    document
      .getElementById("optimalSpiritsList")
      .appendChild(filteringInfoContainer);

    // 중지 버튼 이벤트 연결
    document
      .getElementById("stopCalculationBtn")
      .addEventListener("click", cancelCalculation);

    // 유전 알고리즘 설정
    const populationSize = 100; // 인구 크기
    const maxGenerations = 30; // 최대 세대 수
    const targetSize = Math.min(6, validSpirits.length); // 조합 크기 (최대 6개)
    const mutationRate = 0.2; // 돌연변이 확률 (20%)
    const eliteSize = 10; // 상위 n개는 그대로 다음 세대로
    let currentGeneration = 1; // 현재 세대
    bestResultOverall = null; // 전체 최적 결과

    // 초기 인구 생성
    let population = generateInitialPopulation(
      validSpirits,
      targetSize,
      populationSize
    );

    // 진행 상황 업데이트
    updateProgressWithCharacter(0);
    document.getElementById(
      "calculation-status"
    ).textContent = `세대 1/${maxGenerations}: 초기 인구 평가 중...`;

    // 다음 세대 계산 함수 (비동기로 진행)
    function evolveNextGeneration() {
      if (isCalculationCancelled || currentGeneration > maxGenerations) {
        finishCalculation(bestResultOverall);
        return;
      }

      try {
        // 1. 현재 인구 평가
        let fitness = [];
        for (let i = 0; i < population.length; i++) {
          const result = evaluateSpiritCombination(population[i]);
          fitness.push({
            index: i,
            combination: population[i],
            result: result,
            score: result.scoreWithBind,
          });
        }

        fitness.sort((a, b) => b.score - a.score);

        if (
          !bestResultOverall ||
          fitness[0].score > bestResultOverall.scoreWithBind
        ) {
          bestResultOverall = fitness[0].result;

          document.getElementById("optimalScore").textContent = `${
            bestResultOverall.scoreWithBind
          } (등급: ${bestResultOverall.gradeScore} 세력: ${
            bestResultOverall.factionScore
          } 장착: ${bestResultOverall.bindScore || 0})`;

          // console.log(
          //   `새로운 최고 조합 발견! 세대 ${currentGeneration}, 점수: ${bestResultOverall.scoreWithBind}`
          // );
        }

        const nextGeneration = [];
        for (let i = 0; i < eliteSize && i < fitness.length; i++) {
          nextGeneration.push(fitness[i].combination);
        }

        while (nextGeneration.length < populationSize) {
          const parent1 = tournamentSelection(fitness, 5);
          const parent2 = tournamentSelection(fitness, 5);

          const child = crossover(parent1, parent2, targetSize);

          if (Math.random() < mutationRate) {
            mutate(child, validSpirits);
          }

          nextGeneration.push(child);
        }

        population = nextGeneration;
        currentGeneration++;

        updateProgressWithCharacter(currentGeneration / maxGenerations);
        document.getElementById(
          "calculation-status"
        ).textContent = `세대 ${currentGeneration}/${maxGenerations}: 최고 점수 ${
          bestResultOverall ? bestResultOverall.scoreWithBind : "계산 중"
        }`;

        setTimeout(evolveNextGeneration, 0);
      } catch (error) {
        console.error("유전 알고리즘 오류:", error);
        document.getElementById("calculation-status").textContent =
          "계산 오류 발생";
        finishCalculation(bestResultOverall);
      }
    }

    setTimeout(evolveNextGeneration, 100);
  }

  function tournamentSelection(fitness, tournamentSize) {
    const selected = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * fitness.length);
      selected.push(fitness[randomIndex]);
    }

    selected.sort((a, b) => b.score - a.score);
    return selected[0].combination;
  }

  function crossover(parent1, parent2, targetSize) {
    const child = [];
    const used = new Set();

    const midpoint = Math.floor(targetSize / 2);
    for (let i = 0; i < midpoint; i++) {
      child.push(parent1[i]);
      used.add(parent1[i].name);
    }

    for (let i = 0; i < parent2.length && child.length < targetSize; i++) {
      if (!used.has(parent2[i].name)) {
        child.push(parent2[i]);
        used.add(parent2[i].name);
      }
    }

    if (child.length < targetSize) {
      for (
        let i = midpoint;
        i < parent1.length && child.length < targetSize;
        i++
      ) {
        if (!used.has(parent1[i].name)) {
          child.push(parent1[i]);
          used.add(parent1[i].name);
        }
      }
    }

    return child;
  }

  function mutate(combination, allSpirits) {
    const replaceIndex = Math.floor(Math.random() * combination.length);
    const used = new Set(combination.map((spirit) => spirit.name));

    const unusedSpirits = allSpirits.filter((spirit) => !used.has(spirit.name));

    if (unusedSpirits.length > 0) {
      const newSpiritIndex = Math.floor(Math.random() * unusedSpirits.length);
      combination[replaceIndex] = unusedSpirits[newSpiritIndex];
    }
  }

  function generateInitialPopulation(spirits, targetSize, populationSize) {
    const population = [];

    if (spirits.length <= targetSize) {
      population.push(spirits);
      return population;
    }

    const immortalSpirits = spirits.filter((s) => s.grade === "불멸");
    const legendSpirits = spirits.filter((s) => s.grade !== "불멸");

    if (immortalSpirits.length > 0) {
      const immortalFirst = [...immortalSpirits];
      while (immortalFirst.length < targetSize && legendSpirits.length > 0) {
        const randomIndex = Math.floor(Math.random() * legendSpirits.length);
        immortalFirst.push(legendSpirits[randomIndex]);
        legendSpirits.splice(randomIndex, 1);
      }
      if (immortalFirst.length === targetSize) {
        population.push(immortalFirst);
      }
    }

    const resistanceSpirits = spirits.filter((s) => {
      const stats =
        s.stats?.find((stat) => stat.level === s.level)?.registrationStat || {};
      return (
        stats.damageResistance > 0 || stats.damageResistancePenetration > 0
      );
    });

    if (resistanceSpirits.length >= targetSize) {
      const resistanceCombo = resistanceSpirits.slice(0, targetSize);
      population.push(resistanceCombo);
    }

    const pvpSpirits = spirits.filter((s) => {
      const stats =
        s.stats?.find((stat) => stat.level === s.level)?.registrationStat || {};
      return stats.pvpDamagePercent > 0 || stats.pvpDefensePercent > 0;
    });

    if (pvpSpirits.length >= targetSize) {
      const pvpCombo = pvpSpirits.slice(0, targetSize);
      population.push(pvpCombo);
    }

    const factions = {};
    spirits.forEach((s) => {
      const faction = s.faction;
      if (!factions[faction]) factions[faction] = [];
      factions[faction].push(s);
    });

    for (const faction in factions) {
      if (factions[faction].length >= targetSize) {
        population.push(factions[faction].slice(0, targetSize));
      }
    }

    while (population.length < populationSize) {
      const combination = generateRandomCombination(spirits, targetSize);
      population.push(combination);
    }

    return population;
  }

  function generateRandomCombination(spirits, size) {
    const combination = [];
    const available = [...spirits];

    while (combination.length < size && available.length > 0) {
      const index = Math.floor(Math.random() * available.length);
      combination.push(available[index]);
      available.splice(index, 1);
    }

    return combination;
  }

  function updateProgressWithCharacter(progress) {
    const progressBar = document.getElementById("calculation-progress-bar");
    const progressCharacter = document.getElementById("progress-character");

    if (progressBar && progressCharacter) {
      const percentage = Math.round(progress * 100);
      progressBar.style.width = `${percentage}%`;

      const containerWidth = progressBar.parentElement.offsetWidth;
      const characterWidth = progressCharacter.offsetWidth;

      const maxLeft = containerWidth - characterWidth;
      const left = Math.max(
        0,
        (containerWidth - characterWidth) * (percentage / 100)
      );
      progressCharacter.style.left = `${Math.min(left, maxLeft)}px`;
    }
  }

  function finishCalculation(bestResult) {
    const calcStatus = document.getElementById("calculation-status");
    if (calcStatus) {
      calcStatus.innerHTML = isCalculationCancelled
        ? "계산이 중단되었습니다."
        : '계산 완료! <span class="calculation-complete-icon">✓</span>';
    }

    if (bestResult) {
      bestResult.gradeScore = parseInt(bestResult.gradeScore || 0);
      bestResult.factionScore = parseInt(bestResult.factionScore || 0);
      bestResult.bindScore = parseInt(bestResult.bindScore || 0);
      bestResult.scoreWithBind =
        bestResult.gradeScore + bestResult.factionScore + bestResult.bindScore;

      // console.log(
      //   `최종 결과: 등급=${bestResult.gradeScore} 세력=${bestResult.factionScore} 장착=${bestResult.bindScore} 합산=${bestResult.scoreWithBind}`
      // );

      const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));

      try {
        window.HistoryManager.addNewCombination(deepCopiedResult);
      } catch (e) {
        console.error("HistoryManager 오류:", e);
      }

      try {
        window.OptimalResultModal.showResultModal(bestResult);
      } catch (e) {
        console.error("OptimalResultModal 오류:", e);
      }

      try {
        window.HistoryManager.renderHistoryTabs(
          currentCategory,
          document.getElementById("optimalSpiritsList"),
          (result) => {
            if (result) {
              result.gradeScore = parseInt(result.gradeScore || 0);
              result.factionScore = parseInt(result.factionScore || 0);
              result.bindScore = parseInt(result.bindScore || 0);
              result.scoreWithBind =
                result.gradeScore + result.factionScore + result.bindScore;
            }

            window.OptimalResultModal.showResultModal(result);
          }
        );
      } catch (e) {
        console.error("HistoryManager renderHistoryTabs 오류:", e);
      }
    } else {
      document.getElementById("optimalSpiritsList").innerHTML =
        "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
    }

    isProcessing = false;
  }

  function binomialCoefficient(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let res = 1;
    k = Math.min(k, n - k);

    for (let i = 0; i < k; i++) {
      res *= n - i;
      res /= i + 1;
    }

    return Math.round(res);
  }

  function closeOptimalModal() {
    const optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.style.display = "none";
      document.body.style.overflow = "auto";

      isCalculationCancelled = true;
      if (calculationWorker) {
        calculationWorker.terminate();
        calculationWorker = null;
      }

      isProcessing = false;
    }
  }

  return {
    findOptimalCombination,
    closeOptimalModal,
    clearHistory,
    cancelCalculation,
  };
})();

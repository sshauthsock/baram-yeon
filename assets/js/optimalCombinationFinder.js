const OptimalCombinationFinder = (function () {
  let isCalculationCancelled = false;
  let isProcessing = false;

  function findOptimalCombination(selectedSpirits, lastActiveCategory) {
    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    if (categorySpirits.length === 0) {
      alert(`${currentCategory} 최적 조합을 찾으려면 환수를 선택하세요.`);
      return;
    }

    isProcessing = true;
    isCalculationCancelled = false;

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
    const currentCategory = lastActiveCategory;
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
          <button id="clearHistoryButton" class="clear-history-btn">${currentCategory} 기록 삭제</button>
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
  
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
    document.head.appendChild(style);

    document
      .getElementById("cancelCalculationBtn")
      .addEventListener("click", function () {
        isCalculationCancelled = true;
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>계산이 중단되었습니다. 현재까지 찾은 최적 조합을 표시합니다.</div>";
      });

    document
      .getElementById("clearHistoryButton")
      .addEventListener("click", function () {
        clearSavedOptimalCombinations(currentCategory);
      });

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

    SearchManager.initializeAds(optimalModal);

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

        if (validSpirits.length <= 20) {
          runMethodA(validSpirits);
        } else {
          runMethodB(validSpirits);
        }
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

  function runMethodA(validSpirits) {
    const targetCombinationSize = Math.min(6, validSpirits.length);
    let totalCombinations = CalculationUtils.binomialCoefficient(
      validSpirits.length,
      targetCombinationSize
    );

    let processedCombinations = 0;
    let bestResult = null;

    const updateProgress = (progress) => {
      if (!isCalculationCancelled) {
        document.getElementById(
          "optimalSpiritsList"
        ).innerHTML = `<div class='processing-message'>
                <div class="calculating-spinner-small"></div>
                최적 조합을 찾는 중입니다... (${Math.round(progress * 100)}%)
                <div style="margin-top: 10px;">
                  <button id="cancelCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
                </div>
              </div>`;

        document
          .getElementById("cancelCalculationBtn")
          .addEventListener("click", function () {
            isCalculationCancelled = true;
            document.getElementById("optimalSpiritsList").innerHTML =
              "<div class='warning-message'>계산이 중단되었습니다. 현재까지 찾은 최적 조합을 표시합니다.</div>";
          });
      }
    };

    function processInBatches(
      combinationIndex,
      batchSize,
      validSpirits,
      combinations
    ) {
      if (combinationIndex === 0) {
        combinations = CalculationUtils.generateCombinations(
          validSpirits,
          targetCombinationSize
        );
      }

      if (combinationIndex >= combinations.length || isCalculationCancelled) {
        if (bestResult) {
          const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
          HistoryManager.addNewCombination(deepCopiedResult);

          const category =
            bestResult.spirits[0]?.category || lastActiveCategory;
          OptimalResultModal.showResultModal(bestResult);
          HistoryManager.renderHistoryTabs(
            category,
            document.getElementById("optimalSpiritsList"),
            (result) => {
              OptimalResultModal.showResultModal(result);
            }
          );
        } else {
          document.getElementById("optimalSpiritsList").innerHTML =
            "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
        }
        isProcessing = false;
        return;
      }

      const endIndex = Math.min(
        combinationIndex + batchSize,
        combinations.length
      );

      for (let i = combinationIndex; i < endIndex; i++) {
        const combination = combinations[i];
        const result = CalculationUtils.calculateEffectsForSpirits(combination);

        processedCombinations++;

        if (processedCombinations % 20 === 0) {
          updateProgress(processedCombinations / totalCombinations);
        }

        if (!bestResult || result.scoreWithBind > bestResult.scoreWithBind) {
          bestResult = result;
        } else if (result.scoreWithBind === bestResult.scoreWithBind) {
          const resultBindCount = SpiritUtils.countSpiritsWithBindStats(result);
          const bestBindCount =
            SpiritUtils.countSpiritsWithBindStats(bestResult);

          if (resultBindCount > bestBindCount) {
            bestResult = result;
          } else if (resultBindCount === bestBindCount) {
            const currentImmortalCount = SpiritUtils.countGradeInResult(
              result,
              "불멸"
            );
            const bestImmortalCount = SpiritUtils.countGradeInResult(
              bestResult,
              "불멸"
            );

            if (currentImmortalCount > bestImmortalCount) {
              bestResult = result;
            } else if (currentImmortalCount === bestImmortalCount) {
              const currentGradeTypes =
                SpiritUtils.countGradeTypesInResult(result);
              const bestGradeTypes =
                SpiritUtils.countGradeTypesInResult(bestResult);

              if (currentGradeTypes > bestGradeTypes) {
                bestResult = result;
              }
            }
          }
        }
      }

      if (endIndex < combinations.length) {
        setTimeout(() => {
          processInBatches(endIndex, batchSize, validSpirits, combinations);
        }, 0);
      } else {
        setTimeout(() => {
          if (bestResult) {
            const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
            const { resultWithTimestamp, index } =
              HistoryManager.addNewCombination(deepCopiedResult);

            const category =
              bestResult.spirits[0]?.category || lastActiveCategory;
            OptimalResultModal.showResultModal(bestResult);
            HistoryManager.renderHistoryTabs(
              category,
              document.getElementById("optimalSpiritsList"),
              (result) => {
                OptimalResultModal.showResultModal(result);
              }
            );
          } else {
            document.getElementById("optimalSpiritsList").innerHTML =
              "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
          }
          isProcessing = false;
        }, 0);
      }
    }

    const batchSize = 50;
    processInBatches(0, batchSize, validSpirits, null);
  }

  function runMethodB(validSpirits) {
    const filteringInfoContainer = document.createElement("div");
    filteringInfoContainer.className = "smart-filtering-info";
    filteringInfoContainer.innerHTML = `
        <h4>스마트 필터링으로 계산 중</h4>
        <div class="filtering-info">환수 수가 많아 효율적인 스마트 필터링을 적용합니다</div>
        <div class="filtering-phases">
          <div class="phase active" id="phase1">1. 환수 평가</div>
          <div class="phase" id="phase2">2. 후보군 선정</div>
          <div class="phase" id="phase3">3. 조합 최적화</div>
          <div class="phase" id="phase4">4. 최종 검증</div>
        </div>
        <div id="phaseDescription" class="filtering-info">
          환수 개별 성능을 평가 중입니다...
        </div>
      `;

    document.getElementById("optimalSpiritsList").innerHTML = "";
    document
      .getElementById("optimalSpiritsList")
      .appendChild(filteringInfoContainer);

    const formattedSpirits = validSpirits.map((spirit) => ({
      name: spirit.name,
      image: spirit.image,
      category: spirit.category,
      grade: spirit.grade || "전설",
      faction: spirit.influence || spirit.faction || "결의",
      level: spirit.level,
      stats: spirit.stats,
      isFixedLevel: spirit.isFixedLevel,
      hasLevel25Bind: spirit.hasLevel25Bind,
    }));

    updatePhase("phase1", "환수 개별 성능을 평가 중입니다...");
    setTimeout(() => {
      const rankedSpirits = rankSpirits(formattedSpirits);
      displayInitialSpiritRanking(rankedSpirits);

      updatePhase("phase2", "최적 조합 후보군을 선정 중입니다...");

      setTimeout(() => {
        updatePhase("phase3", "후보 조합을 최적화 중입니다...");

        setTimeout(() => {
          if (window.Worker) {
            optimizeWithSmartFiltering(rankedSpirits);
          } else {
            optimizeWithoutWorkerSmartFiltering(rankedSpirits);
          }
        }, 300);
      }, 300);
    }, 300);
  }

  function updatePhase(currentPhaseId, description) {
    document.querySelectorAll(".filtering-phases .phase").forEach((phase) => {
      phase.classList.remove("active");
      phase.classList.remove("completed");
    });

    const phaseElement = document.getElementById(currentPhaseId);
    if (phaseElement) {
      phaseElement.classList.add("active");

      const phaseNumber = parseInt(currentPhaseId.replace("phase", ""));
      for (let i = 1; i < phaseNumber; i++) {
        const prevPhase = document.getElementById(`phase${i}`);
        if (prevPhase) {
          prevPhase.classList.add("completed");
        }
      }
    }

    const descriptionElement = document.getElementById("phaseDescription");
    if (descriptionElement && description) {
      descriptionElement.textContent = description;
    }
  }

  function rankSpirits(spirits) {
    return spirits
      .map((spirit) => {
        const levelStat =
          spirit.stats?.find((s) => s.level === spirit.level)
            ?.registrationStat || {};

        let bindStat = spirit.stats?.find(
          (s) => s.level === spirit.level
        )?.bindStat;

        if (!bindStat && spirit.hasLevel25Bind) {
          bindStat = spirit.stats?.find((s) => s.level === 25)?.bindStat;
        }

        bindStat = bindStat || {};

        const regScore =
          (levelStat.damageResistancePenetration || 0) +
          (levelStat.damageResistance || 0) +
          (levelStat.pvpDamagePercent || 0) * 10 +
          (levelStat.pvpDefensePercent || 0) * 10;

        const bindScore =
          (bindStat.damageResistancePenetration || 0) +
          (bindStat.damageResistance || 0) +
          (bindStat.pvpDamagePercent || 0) * 10 +
          (bindStat.pvpDefensePercent || 0) * 10;

        return {
          ...spirit,
          score: regScore,
          bindScore: bindScore,
          totalScore: regScore + bindScore,
          calculatedStats: levelStat,
          calculatedBindStats: bindStat,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  function displayInitialSpiritRanking(rankedSpirits) {
    const pvpSpirits = rankedSpirits.filter((spirit) =>
      hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
    );

    const resistanceSpirits = rankedSpirits.filter(
      (spirit) =>
        !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"]) &&
        hasCriticalStat(spirit, [
          "damageResistancePenetration",
          "damageResistance",
        ])
    );

    const otherSpirits = rankedSpirits.filter(
      (spirit) =>
        !hasCriticalStat(spirit, [
          "pvpDamagePercent",
          "pvpDefensePercent",
          "damageResistancePenetration",
          "damageResistance",
        ])
    );

    const infoHTML = `
      <div class="smart-filtering-info">
          <h4>스마트 필터링 준비 완료 (20개 초과 선택 시 작동)</h4>
          <p><strong>선택된 환수:</strong> ${rankedSpirits.length}개</p>
          <div class="spirit-category-counts">
              <div class="spirit-count">대피/대방% 환수: ${pvpSpirits.length}개</div>
              <div class="spirit-count">피저/피저관 환수: ${resistanceSpirits.length}개</div>
              <div class="spirit-count">기타 환수: ${otherSpirits.length}개</div>
          </div>
          <p class="filtering-info">환수들을 기여도에 따라 분석하여 모든 환수를 고려한 최적화된 계산을 수행합니다.</p>
          <div class="filtering-phases">
              <div class="phase active" id="phase0">준비 완료</div>
              <div class="phase" id="phase1">1단계: 상위 점수 환수 분석</div>
              <div class="phase" id="phase2">2단계: 균형 환수 분석</div>
              <div class="phase" id="phase3">3단계: 전체 환수 분석</div>
          </div>
          <div class="progress-container">
              <div class="progress-bar-container">
                  <div class="progress-bar" id="calculation-progress-bar" style="width:0%"></div>
                  <div class="progress-character" id="progress-character"></div>
              </div>
          </div>
          <div id="calculation-status">계산 시작 준비 완료</div>
      </div>
    `;

    document.getElementById("optimalSpiritsList").innerHTML = infoHTML;

    const animStyle = document.getElementById("progress-animation-style");
    if (!animStyle) {
      const style = document.createElement("style");
      style.id = "progress-animation-style";
      style.textContent = `
        .progress-container {
          position: relative;
          margin: 15px 0;
        }
        
        .progress-bar-container {
          position: relative;
          height: 30px;
          background-color: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, rgba(16, 59, 69, 1), rgba(16, 59, 69, 1)); 
          border-radius: 10px;
          transition: width 0.3s;
          z-index: 1;
        }
        
        .progress-character {
          position: absolute;
          top: 0;
          left: 0;
          width: 30px;
          height: 30px;
          background-image: url('assets/img/walking.gif');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          z-index: 2;
          transition: left 0.3s;
        }
        
        @media (max-width: 480px) {
          .progress-character {
            width: 20px;
            height: 20px;
          }
          .progress-bar-container {
            height: 20px;
          }
        }
      `;
      document.head.appendChild(style);
    }
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

  function updateCalculationPhase(phaseIndex) {
    document.querySelectorAll(".phase").forEach((el, idx) => {
      el.classList.remove("active", "completed");
      if (idx < phaseIndex) {
        el.classList.add("completed");
      } else if (idx === phaseIndex) {
        el.classList.add("active");
      }
    });

    const statusText = document.getElementById("calculation-status");
    if (statusText) {
      switch (phaseIndex) {
        case 0:
          statusText.textContent = "계산 시작 준비 완료";
          break;
        case 1:
          statusText.textContent = "1단계: 상위 점수 환수 분석 중...";
          break;
        case 2:
          statusText.textContent = "2단계: 균형 환수 조합 분석 중...";
          break;
        case 3:
          statusText.textContent = "3단계: 전체 환수 분석 중...";
          break;
        case 4:
          statusText.textContent = "계산 완료!";
          break;
        default:
          statusText.textContent = "계산 진행 중...";
      }
    }
  }

  function hasCriticalStat(spirit, statKeys) {
    if (spirit.stats && Array.isArray(spirit.stats)) {
      const levelStat = spirit.stats.find((s) => s.level === spirit.level);
      if (levelStat && levelStat.registrationStat) {
        const stats = levelStat.registrationStat;
        if (
          statKeys.some((key) => {
            const value = parseFloat(stats[key] || 0);
            return value > 0;
          })
        ) {
          return true;
        }
      }
    }

    if (spirit.stats && Array.isArray(spirit.stats)) {
      const levelStat = spirit.stats.find((s) => s.level === spirit.level);
      if (levelStat && levelStat.bindStat) {
        const stats = levelStat.bindStat;
        if (
          statKeys.some((key) => {
            const value = parseFloat(stats[key] || 0);
            return value > 0;
          })
        ) {
          return true;
        }
      }

      if (spirit.hasLevel25Bind) {
        const level25Stat = spirit.stats.find((s) => s.level === 25);
        if (level25Stat && level25Stat.bindStat) {
          const stats = level25Stat.bindStat;
          return statKeys.some((key) => {
            const value = parseFloat(stats[key] || 0);
            return value > 0;
          });
        }
      }
    }

    return false;
  }

  function optimizeWithSmartFiltering(rankedSpirits) {
    const totalSpirits = rankedSpirits.length;
    let bestResultOverall = null;
    let processedResultCount = 0;

    updateCalculationPhase(0);

    const topRankedSpirits = rankedSpirits.slice(0, Math.min(25, totalSpirits));

    const pvpSpirits = rankedSpirits
      .filter((spirit) =>
        hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
      )
      .slice(0, 15);

    const resistanceSpirits = rankedSpirits
      .filter(
        (spirit) =>
          hasCriticalStat(spirit, [
            "damageResistancePenetration",
            "damageResistance",
          ]) &&
          !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
      )
      .slice(0, 15);

    const otherSpirits = rankedSpirits
      .filter(
        (spirit) =>
          !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"]) &&
          !hasCriticalStat(spirit, [
            "damageResistancePenetration",
            "damageResistance",
          ])
      )
      .slice(0, 15);

    const mixedSpirits = [
      ...new Set([...pvpSpirits, ...resistanceSpirits, ...otherSpirits]),
    ];

    const phases = [
      {
        spirits: topRankedSpirits,
        maxSize: 6,
        name: "상위 점수 환수",
        phaseId: "phase1",
      },
      {
        spirits: mixedSpirits,
        maxSize: 6,
        name: "균형 환수 조합",
        phaseId: "phase2",
      },
      {
        spirits: rankedSpirits.slice(0, Math.min(40, totalSpirits)),
        maxSize: 6,
        name: "전체 환수",
        phaseId: "phase3",
      },
    ];

    let currentPhase = 0;
    processNextPhase();

    function processNextPhase() {
      if (currentPhase >= phases.length || isCalculationCancelled) {
        finishCalculation();
        return;
      }

      updateCalculationPhase(currentPhase + 1);
      const phase = phases[currentPhase];

      const statusText = document.getElementById("calculation-status");
      if (statusText) {
        statusText.textContent = `${phase.name} 분석 중...`;
      }

      const targetSize = Math.min(phase.maxSize, phase.spirits.length);
      const combinations = CalculationUtils.generateCombinations(
        phase.spirits,
        targetSize
      );
      const totalCombos = combinations.length;

      let bestPhaseResult = null;
      let processedCount = 0;

      function processBatch(startIndex, batchSize) {
        if (startIndex >= totalCombos || isCalculationCancelled) {
          currentPhase++;
          processNextPhase();
          return;
        }

        const endIndex = Math.min(startIndex + batchSize, totalCombos);

        for (let i = startIndex; i < endIndex; i++) {
          const result = CalculationUtils.calculateEffectsForSpirits(
            combinations[i]
          );

          if (
            !bestPhaseResult ||
            result.scoreWithBind > bestPhaseResult.scoreWithBind
          ) {
            bestPhaseResult = result;
          }

          if (
            !bestResultOverall ||
            result.scoreWithBind > bestResultOverall.scoreWithBind
          ) {
            bestResultOverall = result;

            document.getElementById("optimalScore").textContent = `${
              bestResultOverall.scoreWithBind
            } (등록효과: ${bestResultOverall.score} 장착효과: ${
              bestResultOverall.bindScore || 0
            })`;

            const bindScoreEl = document.getElementById("optimalScoreBind");
            if (bindScoreEl) bindScoreEl.style.display = "none";
          }
        }

        processedCount += endIndex - startIndex;
        updateProgressWithCharacter(processedCount / totalCombos);

        setTimeout(() => {
          processBatch(endIndex, batchSize);
        }, 0);
      }

      // Start processing with appropriate batch size
      const batchSize = Math.min(
        50,
        Math.max(10, Math.floor(totalCombos / 100))
      );
      processBatch(0, batchSize);
    }

    function finishCalculation() {
      updateCalculationPhase(4);

      const calcStatus = document.getElementById("calculation-status");
      if (calcStatus) {
        calcStatus.innerHTML =
          '계산 완료! <span class="calculation-complete-icon">✓</span>';
        calcStatus.classList.add("calculation-complete");
      }

      if (bestResultOverall) {
        const deepCopiedResult = JSON.parse(JSON.stringify(bestResultOverall));
        HistoryManager.addNewCombination(deepCopiedResult);

        const category =
          bestResultOverall.spirits[0]?.category || lastActiveCategory;
        OptimalResultModal.showResultModal(bestResultOverall);
        HistoryManager.renderHistoryTabs(
          category,
          document.getElementById("optimalSpiritsList"),
          (result) => {
            OptimalResultModal.showResultModal(result);
          }
        );
      } else {
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
      }

      isProcessing = false;
    }
  }

  function optimizeWithoutWorkerSmartFiltering(rankedSpirits) {
    const totalSpirits = rankedSpirits.length;
    let bestResult = null;

    const topSpirits = rankedSpirits.slice(0, Math.min(15, totalSpirits));

    document.getElementById("calculation-status").textContent =
      "웹 워커를 지원하지 않습니다. 상위 환수만 계산합니다...";

    setTimeout(() => {
      const targetSize = Math.min(6, topSpirits.length);
      const combinations = CalculationUtils.generateCombinations(
        topSpirits,
        targetSize
      );

      combinations.forEach((combination, index) => {
        const result = CalculationUtils.calculateEffectsForSpirits(combination);

        if (!bestResult || result.scoreWithBind > bestResult.scoreWithBind) {
          bestResult = result;
        }

        if (index % 100 === 0) {
          const progress = (index / combinations.length) * 100;
          const progressBar = document.getElementById(
            "calculation-progress-bar"
          );
          if (progressBar) {
            progressBar.style.width = `${Math.round(progress)}%`;
          }
        }
      });

      if (bestResult) {
        HistoryManager.addNewCombination(bestResult);

        const category = bestResult.spirits[0]?.category || lastActiveCategory;
        OptimalResultModal.showResultModal(bestResult);
        HistoryManager.renderHistoryTabs(
          category,
          document.getElementById("optimalSpiritsList"),
          (result) => {
            OptimalResultModal.showResultModal(result);
          }
        );
      } else {
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
      }

      isProcessing = false;
    }, 100);
  }

  function clearSavedOptimalCombinations(category) {
    if (
      confirm(
        `${category} 카테고리의 저장된 모든 조합 기록을 삭제하시겠습니까?`
      )
    ) {
      HistoryManager.clearCombinations(category);

      document.getElementById("optimalGradeEffects").innerHTML = "";
      document.getElementById("optimalFactionEffects").innerHTML = "";
      document.getElementById("optimalBindEffects").innerHTML = "";
      document.getElementById("optimalTotalEffects").innerHTML = "";
      document.getElementById("spiritStatsDetails").innerHTML = "";
      document.getElementById("combinationResultsContainer").innerHTML = "";
      document.getElementById("optimalScore").textContent = "0";
      document.getElementById("optimalScoreBind").textContent = "(장착효과: 0)";

      HistoryManager.renderHistoryTabs(
        category,
        document.getElementById("optimalSpiritsList"),
        (result) => {
          OptimalResultModal.showResultModal(result);
        }
      );

      alert(`${category} 조합 기록이 모두 삭제되었습니다.`);
    }
  }

  function closeOptimalModal() {
    document.getElementById("optimalModal").style.display = "none";
    document.body.style.overflow = "auto";
    isProcessing = false;
  }

  return {
    findOptimalCombination,
    closeOptimalModal,
    clearSavedOptimalCombinations,
  };
})();

window.OptimalCombinationFinder = OptimalCombinationFinder;

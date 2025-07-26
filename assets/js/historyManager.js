const HistoryManager = (function () {
  let savedOptimalCombinations = { 수호: [], 탑승: [], 변신: [] };
  let combinationCounter = { 수호: 0, 탑승: 0, 변신: 0 };
  let categoryState = {
    수호: { activeIndex: -1 },
    탑승: { activeIndex: -1 },
    변신: { activeIndex: -1 },
  };

  function loadSavedCombinations() {
    const savedCombos = localStorage.getItem("savedOptimalCombinations");
    if (savedCombos) {
      try {
        const parsed = JSON.parse(savedCombos);
        if (Array.isArray(parsed)) {
          savedOptimalCombinations = { 수호: [], 탑승: [], 변신: [] };
        } else {
          savedOptimalCombinations = parsed;
        }

        if (!savedOptimalCombinations.수호) savedOptimalCombinations.수호 = [];
        if (!savedOptimalCombinations.탑승) savedOptimalCombinations.탑승 = [];
        if (!savedOptimalCombinations.변신) savedOptimalCombinations.변신 = [];
      } catch (e) {
        console.error("저장된 최적 조합 데이터를 불러오는 중 오류 발생:", e);
        savedOptimalCombinations = { 수호: [], 탑승: [], 변신: [] };
      }
    }

    const savedCounter = localStorage.getItem("combinationCounter");
    if (savedCounter) {
      try {
        combinationCounter = JSON.parse(savedCounter);
      } catch (e) {
        console.error("저장된 조합 카운터 데이터를 불러오는 중 오류 발생:", e);
        combinationCounter = { 수호: 0, 탑승: 0, 변신: 0 };
      }
    } else {
      combinationCounter = { 수호: 0, 탑승: 0, 변신: 0 };
    }

    Object.keys(savedOptimalCombinations).forEach((category) => {
      if (savedOptimalCombinations[category].length > 0) {
        categoryState[category].activeIndex =
          savedOptimalCombinations[category].length - 1;
      } else {
        categoryState[category].activeIndex = -1;
      }
    });

    return { savedOptimalCombinations, categoryState };
  }

  function saveCombinations() {
    localStorage.setItem(
      "savedOptimalCombinations",
      JSON.stringify(savedOptimalCombinations)
    );
    localStorage.setItem(
      "combinationCounter",
      JSON.stringify(combinationCounter)
    );
  }

  function addNewCombination(result) {
    const timestamp = new Date().toLocaleString();
    const category = result.spirits[0]?.category || "수호";

    if (!savedOptimalCombinations[category]) {
      savedOptimalCombinations[category] = [];
    }

    if (combinationCounter[category] === undefined) {
      combinationCounter[category] = 0;
    }

    const MAX_TABS = 5;
    combinationCounter[category]++;
    const index = (combinationCounter[category] - 1) % MAX_TABS;

    const resultWithTimestamp = {
      ...result,
      timestamp,
      combinationName: `조합 ${index + 1}`,
      addedAt: Date.now(),
    };

    if (index < savedOptimalCombinations[category].length) {
      savedOptimalCombinations[category][index] = resultWithTimestamp;
    } else {
      savedOptimalCombinations[category].push(resultWithTimestamp);
    }

    categoryState[category].activeIndex = index;
    saveCombinations();

    return { resultWithTimestamp, index };
  }

  function clearCombinations(category) {
    savedOptimalCombinations[category] = [];
    combinationCounter[category] = 0;
    categoryState[category].activeIndex = -1;
    saveCombinations();
  }

  function getCombinations(category) {
    return savedOptimalCombinations[category] || [];
  }

  function getActiveIndex(category) {
    return categoryState[category].activeIndex;
  }

  function setActiveIndex(category, index) {
    categoryState[category].activeIndex = index;
  }

  function renderHistoryTabs(category, container, onTabChange) {
    let currentActiveIndex = categoryState[category].activeIndex;
    const categoryCombinations = savedOptimalCombinations[category] || [];

    if (categoryCombinations.length === 0) {
      container.innerHTML = `
        <div class="history-tabs-container">
          <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
        </div>
      `;
      return;
    }

    let highestScoreIndex = 0;
    let highestScore = 0;

    for (let i = 0; i < categoryCombinations.length; i++) {
      const combo = categoryCombinations[i];
      const currentScore =
        SpiritUtils.ensureNumber(combo.gradeScore || 0) +
        SpiritUtils.ensureNumber(combo.factionScore || 0) +
        SpiritUtils.ensureNumber(combo.bindScore || 0);

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

    // *** 중요 변경: combinationResultsContainer 제거 ***
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

    container.innerHTML = tabsHtml;

    // 최초 로드 시 컨텐츠 표시를 위한 코드
    const currentResult = categoryCombinations[currentActiveIndex];
    if (currentResult && typeof onTabChange === "function") {
      // combinationResultsContainer가 있는지 확인하고 없으면 생성
      let resultsContainer = document.getElementById(
        "combinationResultsContainer"
      );
      if (!resultsContainer) {
        resultsContainer = document.createElement("div");
        resultsContainer.id = "combinationResultsContainer";
        resultsContainer.className = "combination-results-container no-flicker";
        // 컨테이너를 historyTabs 다음에 배치
        container.parentNode.insertBefore(
          resultsContainer,
          container.nextSibling
        );
      }

      // 초기 내용을 비우고 현재 선택된 탭의 결과를 표시
      resultsContainer.innerHTML = "";
      onTabChange(
        currentResult,
        currentActiveIndex === highestScoreIndex,
        resultsContainer
      );
    }

    // 탭 클릭 이벤트 처리
    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        document
          .querySelectorAll(".history-tab")
          .forEach((t) => t.classList.remove("active"));

        this.classList.add("active");

        const comboIndex = parseInt(this.dataset.index);
        categoryState[category].activeIndex = comboIndex;
        const result = categoryCombinations[comboIndex];

        if (typeof onTabChange === "function") {
          // 기존 컨테이너를 찾음
          let resultsContainer = document.getElementById(
            "combinationResultsContainer"
          );

          // 컨테이너가 없으면 생성 (보통은 이미 존재함)
          if (!resultsContainer) {
            resultsContainer = document.createElement("div");
            resultsContainer.id = "combinationResultsContainer";
            resultsContainer.className =
              "combination-results-container no-flicker";
            container.parentNode.insertBefore(
              resultsContainer,
              container.nextSibling
            );
          }

          // 컨테이너를 비우고 새 결과 렌더링
          resultsContainer.innerHTML = "";
          onTabChange(
            result,
            comboIndex === window.HistoryManager.getHighestScoreIndex(category),
            resultsContainer
          );
        }

        document.getElementById("selected-tab-info").innerHTML = `
          <span class="timestamp">계산 시간: ${result.timestamp}</span>
          ${
            comboIndex === window.HistoryManager.getHighestScoreIndex(category)
              ? '<span class="best-notice">(최고 점수입니다!)</span>'
              : ""
          }
        `;
      });
    });
  }

  return {
    loadSavedCombinations,
    saveCombinations,
    addNewCombination,
    clearCombinations,
    getCombinations,
    getActiveIndex,
    setActiveIndex,
    renderHistoryTabs,
  };
})();

window.HistoryManager = HistoryManager;

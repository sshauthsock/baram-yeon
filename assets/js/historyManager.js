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
        <div id="combinationResultsContainer"></div>
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
      <div id="combinationResultsContainer" class="no-flicker"></div>
    `;

    container.innerHTML = tabsHtml;

    // 클론 컨테이너 생성 - 깜박임 방지
    const hiddenCloneContainer = document.createElement("div");
    hiddenCloneContainer.style.position = "absolute";
    hiddenCloneContainer.style.left = "-9999px";
    hiddenCloneContainer.style.visibility = "hidden";
    document.body.appendChild(hiddenCloneContainer);

    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        // 이전 탭 비활성화
        document
          .querySelectorAll(".history-tab")
          .forEach((t) => t.classList.remove("active"));

        // 클릭한 탭 활성화
        this.classList.add("active");

        const comboIndex = parseInt(this.dataset.index);
        categoryState[category].activeIndex = comboIndex;
        const result = categoryCombinations[comboIndex];

        // 먼저 숨겨진 컨테이너에 내용 렌더링
        hiddenCloneContainer.innerHTML = "";

        if (typeof onTabChange === "function") {
          // 클론에 렌더링
          const tempResultContainer = document.createElement("div");
          hiddenCloneContainer.appendChild(tempResultContainer);

          // 콜백에서 클론 컨테이너에 렌더링하도록 함
          onTabChange(
            result,
            comboIndex === highestScoreIndex,
            tempResultContainer
          );

          // 내용 준비 완료 후 실제 컨테이너로 이동
          requestAnimationFrame(() => {
            const resultsContainer = document.getElementById(
              "combinationResultsContainer"
            );
            if (resultsContainer) {
              resultsContainer.innerHTML = tempResultContainer.innerHTML;
            }
          });
        }

        document.getElementById("selected-tab-info").innerHTML = `
          <span class="timestamp">계산 시간: ${result.timestamp}</span>
          ${
            comboIndex === highestScoreIndex
              ? '<span class="best-notice">(최고 점수입니다!)</span>'
              : ""
          }
        `;
      });
    });

    // 클린업
    setTimeout(() => {
      if (document.body.contains(hiddenCloneContainer)) {
        document.body.removeChild(hiddenCloneContainer);
      }
    }, 2000);
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

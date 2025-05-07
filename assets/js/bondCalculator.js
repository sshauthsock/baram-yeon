const BondCalculatorApp = (function () {
  const STATS_MAPPING = window.CommonData.STATS_MAPPING;
  const STAT_COLOR_MAP = window.CommonData.STAT_COLOR_MAP;
  const PERCENT_STATS = window.CommonData.PERCENT_STATS;
  const FACTION_ICONS = window.CommonData.FACTION_ICONS;
  const FIXED_LEVEL25_SPIRITS = window.CommonData.FIXED_LEVEL25_SPIRITS;
  const gradeSetEffects = window.CommonData.GRADE_SET_EFFECTS || {};
  const factionSetEffects = window.CommonData.FACTION_SET_EFFECTS || {};

  let selectedSpirits = [];

  let isCalculationCancelled = false;
  let isModalOpen = false;
  let savedOptimalCombinations = { 수호: [], 탑승: [], 변신: [] };
  let currentActiveIndex = -1;
  let combinationCounter = { 수호: 0, 탑승: 0, 변신: 0 };
  let allStatNames = [];
  let selectedSearchStats = [];
  let lastActiveCategory = "수호";
  let currentScrollY = 0;

  function showCategory(category, resetSelection = false) {
    const prevCategory = lastActiveCategory;
    lastActiveCategory = category;
    localStorage.setItem("lastActiveCategory", category);

    if (isModalOpen) {
      if (document.getElementById("optimalModal").style.display === "flex") {
        renderHistoryTabs(category);

        if (
          savedOptimalCombinations[category] &&
          savedOptimalCombinations[category].length > 0
        ) {
          currentActiveIndex = savedOptimalCombinations[category].length - 1;
          showSingleOptimalResult(
            savedOptimalCombinations[category][currentActiveIndex]
          );
        } else {
          document.getElementById("optimalGradeEffects").innerHTML = "";
          document.getElementById("optimalFactionEffects").innerHTML = "";
          document.getElementById("optimalTotalEffects").innerHTML = "";
          document.getElementById("spiritStatsDetails").innerHTML = "";
          document.getElementById("combinationResultsContainer").innerHTML = "";
          document.getElementById("optimalScore").textContent = "0";
        }
      }
      return;
    }

    const savedScrollY = window.scrollY;

    if (resetSelection) {
      selectedSpirits = selectedSpirits.filter(
        (spirit) => spirit.category !== category
      );
      updateSelectedCount();
      updateSelectedSpiritsPanel();
      saveSelectedSpiritsToStorage();
    }

    // console.log(
    //   "BondCalculator: Showing category",
    //   category,
    //   "with selection mode"
    // );

    const handleSpiritSelection = (spirit, category) => {
      const savedScrollY = window.scrollY;
      // console.log("Spirit selected in BondCalculator:", spirit.name);

      const isSelected = selectedSpirits.some(
        (s) => s.image === spirit.image && s.category === category
      );

      if (isSelected) {
        const indexToRemove = selectedSpirits.findIndex(
          (s) => s.image === spirit.image && s.category === category
        );
        if (indexToRemove !== -1) {
          selectedSpirits.splice(indexToRemove, 1);
        }
      } else {
        const categorySpirits = selectedSpirits.filter(
          (s) => s.category === category
        );
        if (categorySpirits.length >= 40) {
          alert(`${category} 카테고리는 최대 40개까지만 선택할 수 있습니다.`);
          return;
        }

        const faction = spirit.influence || spirit.faction || "결의";
        const isFixed = isFixedLevelSpirit(spirit.name);
        const spiritLevel = isFixed ? 25 : 0;

        const spiritData = {
          ...spirit,
          category: category,
          level: spiritLevel,
          grade: spirit.grade || "전설",
          faction: faction,
          isFixedLevel: isFixed,
          hasLevel25Bind: window.ImageHandler.hasLevel25BindStats(spirit),
        };
        selectedSpirits.push(spiritData);
      }

      updateSelectedCount();
      updateSelectedSpiritsPanel();
      updateMobilePanel();
      saveSelectedSpiritsToStorage();
      applySelectedState();
      window.scrollTo(0, savedScrollY);
    };

    if (prevCategory !== category) {
      // console.log(
      //   `Tab changed from ${prevCategory} to ${category}, forcing count update`
      // );
      updateSelectedCount(category);
    }

    if (window.UIRenderer) {
      window.UIRenderer.showCategory(category, {
        selectMode: true,
        onSelect: handleSpiritSelection,
      });

      applySelectedState();
    } else {
      console.error("UIRenderer is not available!");
    }

    updateSelectedCount(category);
    updateSelectedSpiritsPanel(category);
    updateMobilePanel();

    if (resetSelection) {
      window.scrollTo(0, savedScrollY);
    }
  }

  function removeSpirit(index) {
    currentScrollY = window.scrollY;
    const spirit = selectedSpirits[index];
    selectedSpirits.splice(index, 1);
    applySelectedState();
    updateSelectedCount();
    updateSelectedSpiritsPanel();
    updateMobilePanel();
    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function clearAllSelections() {
    currentScrollY = window.scrollY;
    const currentCategory = lastActiveCategory;
    selectedSpirits = selectedSpirits.filter(
      (spirit) => spirit.category !== currentCategory
    );
    applySelectedState();
    updateSelectedCount();
    updateSelectedSpiritsPanel();
    updateMobilePanel();
    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function loadSelectedSpiritsFromStorage() {
    const savedSpirits = localStorage.getItem("selectedSpirits");
    if (savedSpirits) {
      try {
        selectedSpirits = JSON.parse(savedSpirits);
        updateSelectedCount();

        setTimeout(() => {
          applySelectedState();
          updateSelectedSpiritsPanel();
        }, 200);
      } catch (e) {
        console.error("저장된 환수 데이터를 불러오는 중 오류 발생:", e);
        selectedSpirits = [];
      }
    }
  }

  function applySelectedState() {
    const currentCategory = lastActiveCategory;
    // console.log(`Applying selection state for category: ${currentCategory}`);

    const currentCategorySelections = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    // console.log(
    //   `Found ${currentCategorySelections.length} selected spirits in ${currentCategory}`
    // );

    // const allWrappers = document.querySelectorAll(".img-wrapper");
    const allWrappers = document.querySelectorAll("img.selected");

    allWrappers.forEach((wrapper) => {
      wrapper.classList.remove("selected");
    });

    if (currentCategorySelections.length === 0) return;

    currentCategorySelections.forEach((spirit) => {
      const imagePath = spirit.image;
      const imageNameMatch = imagePath.match(
        /[^/\\&?]+\.\w{3,4}(?=([?&].*$|$))/
      );
      const imageName = imageNameMatch ? imageNameMatch[0] : imagePath;

      // console.log(`Looking for image with path containing: ${imageName}`);

      document.querySelectorAll(".img-wrapper img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        const srcFilename = src.split("/").pop();
        const imageFilename = imagePath.split("/").pop();

        if (src === spirit.image || srcFilename === imageFilename) {
          // console.log("img = ", img);

          const wrapper = img.closest(".img-wrapper");
          // console.log("wrapper = ", wrapper);
          // if (wrapper) {
          //   wrapper.classList.add("selected");
          // }
          if (img) {
            img.classList.add("selected");
          }
        }
      });
    });
  }

  function updateSelectedSpiritsPanel(forceCategory = null) {
    const currentCategory = forceCategory || lastActiveCategory;
    // console.log(`Updating spirit panel for category: ${currentCategory}`);

    const containerSelectors = [
      "#selectedSpirits",
      "#panelToggleContainer .selected-spirits",
    ];

    containerSelectors.forEach((selector) => {
      const container = document.querySelector(selector);
      if (!container) return;

      container.innerHTML = "";

      const filteredSpirits = selectedSpirits.filter(
        (spirit) => spirit.category === currentCategory
      );

      if (filteredSpirits.length === 0) {
        container.innerHTML =
          "<p>선택된 환수가 없습니다. 위에서 환수를 선택해주세요.</p>";
        return;
      }

      filteredSpirits.forEach((spirit) => {
        const originalIndex = selectedSpirits.findIndex(
          (s) => s.image === spirit.image && s.category === spirit.category
        );

        const card = document.createElement("div");
        card.className = `selected-spirit-card spirit-grade-${
          spirit.grade === "불멸" ? "immortal" : "legend"
        }`;
        card.id = `selected-spirit-${spirit.name.replace(/\s+/g, "-")}`;

        const isFixed = spirit.isFixedLevel;
        const categoryBadge = `<div class="spirit-category-badge">${spirit.category}</div>`;

        const level25BindIndicator = spirit.hasLevel25Bind
          ? '<div class="level25-indicator">25</div>'
          : "";

        const levelControls = isFixed
          ? `<div class="spirit-level-control">
             <input type="number" value="25" readonly class="fixed-level" title="이 환수는 25레벨만 사용 가능합니다">
           </div>`
          : `<div class="spirit-level-control">
             <button onclick="BondCalculatorApp.changeLevel(${originalIndex}, -1)">-</button>
             <input type="number" min="0" max="25" value="${spirit.level || 0}"
               onchange="BondCalculatorApp.updateSpiritLevel(${originalIndex}, this.value)" id="level-input-${originalIndex}">
             <button onclick="BondCalculatorApp.changeLevel(${originalIndex}, 1)">+</button>
             <button class="max-btn" onclick="BondCalculatorApp.setMaxLevel(${originalIndex})">M</button>
           </div>`;

        card.innerHTML += `
        <button class="remove-spirit" onclick="BondCalculatorApp.removeSpirit(${originalIndex})">X</button>
        ${categoryBadge}
        <div class="selected-spirit-header">
          <img src="${spirit.image}" alt="${spirit.name}" title="${
          spirit.name
        }">
          <div class="spirit-info">
            <div class="spirit-name">${spirit.name}</div>
            ${isFixed ? '<div class="fixed-level-badge">고정 25</div>' : ""}
            ${level25BindIndicator}
          </div>
        </div>
         ${isFixed ? "" : levelControls}
      `;

        container.appendChild(card);
      });
    });
  }

  function updateMobilePanel() {
    const toggleContainer = document.getElementById("panelToggleContainer");
    if (!toggleContainer) return;

    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    // console.log(
    //   `현재 카테고리 ${currentCategory}에 선택된 환수: ${categorySpirits.length}개`
    // );

    if (window.innerWidth <= 768) {
      if (categorySpirits.length === 0) {
        toggleContainer.style.display = "none";
        // console.log("모바일 패널 숨김: 선택된 환수 없음");
      } else {
        toggleContainer.style.display = "flex";
        // console.log("모바일 패널 표시: 선택된 환수 있음");

        const mobileCountElement = document.getElementById(
          "mobileSelectedCount"
        );
        if (mobileCountElement) {
          mobileCountElement.textContent = categorySpirits.length;
        }
      }
    } else {
      toggleContainer.style.display = "none";
    }
  }

  function updateSelectedCount(forceCategory = null) {
    const currentCategory = forceCategory || lastActiveCategory;
    // console.log(`Updating count for category: ${currentCategory}`);

    if (!currentCategory) {
      console.warn("No active category for count update");
      return;
    }

    const filteredCount = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    ).length;

    // console.log(`Selected ${filteredCount} spirits in ${currentCategory}`);

    const countElements = [
      document.getElementById("selectedCount"),
      document.getElementById("selectedCountPanel"),
      document.getElementById("mobileSelectedCount"),
    ];

    countElements.forEach((element) => {
      if (element) {
        element.textContent = filteredCount;
      }
    });
  }

  function populateStatOptions() {
    const containers = [
      document.getElementById("stat-options"),
      document.getElementById("mobile-stat-options"),
    ];

    containers.forEach((container) => {
      if (!container) return;

      container.innerHTML = "";

      allStatNames.forEach((stat) => {
        const option = document.createElement("div");
        option.className = "stat-option";
        option.textContent = stat;
        option.addEventListener("click", function (e) {
          e.stopPropagation();
          toggleStatSelection(stat);
        });
        container.appendChild(option);
      });
    });
  }

  function toggleStatSelection(stat) {
    const index = selectedSearchStats.indexOf(stat);

    if (index === -1) {
      selectedSearchStats.push(stat);
    } else {
      selectedSearchStats.splice(index, 1);
    }

    updateSelectedStatsDisplay();
    toggleStatOptions(false);
    toggleStatOptions(false, true);
  }

  function updateSelectedStatsDisplay() {
    const containers = [
      document.getElementById("selected-stats"),
      document.getElementById("mobile-selected-stats"),
    ];

    containers.forEach((container) => {
      if (!container) return;

      container.innerHTML = "";

      selectedSearchStats.forEach((stat) => {
        const chip = document.createElement("div");
        chip.className = "stat-chip";
        chip.innerHTML = `${stat} <span class="remove-stat" onclick="BondCalculatorApp.removeSelectedStat('${stat}')">×</span>`;
        container.appendChild(chip);
      });
    });
  }

  function toggleStatOptions(show, isMobile = false) {
    const statOptions = isMobile
      ? document.getElementById("mobile-stat-options")
      : document.getElementById("stat-options");

    if (statOptions) {
      statOptions.style.display = show ? "block" : "none";

      if (show) {
        statOptions.scrollTop = 0;
      }
    }
  }

  function filterStatOptions(filterText, isMobile = false) {
    const statOptions = isMobile
      ? document.getElementById("mobile-stat-options")
      : document.getElementById("stat-options");

    const options = statOptions.querySelectorAll(".stat-option");

    filterText = filterText.toLowerCase();
    let visibleCount = 0;

    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      const isVisible = text.includes(filterText);

      option.style.display = isVisible ? "block" : "none";
      if (isVisible) visibleCount++;
    });

    const noMatches = statOptions.querySelector(".no-matches");
    if (visibleCount === 0) {
      if (!noMatches) {
        const noMatchesElement = document.createElement("div");
        noMatchesElement.className = "no-matches";
        noMatchesElement.textContent = "일치하는 항목 없음";
        statOptions.appendChild(noMatchesElement);
      }
    } else {
      if (noMatches) noMatches.remove();
    }

    toggleStatOptions(true, isMobile);
  }

  function searchSpirits(fromMobile) {
    const input = fromMobile
      ? document.getElementById("mobile-search-input")
      : document.getElementById("search-input");

    const searchText = input ? input.value.trim().toLowerCase() : "";

    if (!searchText && selectedSearchStats.length === 0) {
      alert("검색어를 입력하거나 능력치를 선택해주세요.");
      return;
    }

    if (searchText) {
      const matchingStats = allStatNames.filter((stat) =>
        stat.toLowerCase().includes(searchText)
      );

      if (matchingStats.length === 0) {
        alert("일치하는 능력치가 없습니다.");
        return;
      }

      matchingStats.forEach((stat) => {
        if (!selectedSearchStats.includes(stat)) {
          selectedSearchStats.push(stat);
        }
      });

      updateSelectedStatsDisplay();

      const inputs = [
        document.getElementById("search-input"),
        document.getElementById("mobile-search-input"),
      ];

      inputs.forEach((input) => {
        if (input) input.value = "";
      });
    }

    showSearchResults();
    toggleStatOptions(false);
    toggleStatOptions(false, true);
  }

  function showSearchResults() {
    if (selectedSearchStats.length === 0) {
      alert("검색할 능력치를 선택해주세요.");
      return;
    }

    const currentCategory = lastActiveCategory;

    let modal = document.getElementById("search-results-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "search-results-modal";
      modal.className = "search-results-modal";
      modal.innerHTML = `
        <div class="search-results-content">
          <div class="search-results-header">
            <h3 class="search-results-title">${currentCategory} 검색 결과</h3>
            <div class="search-results-actions">
              <button class="done-selecting-btn" onclick="BondCalculatorApp.closeSearchResults()">선택 완료</button>
              <button class="close-search-results" onclick="BondCalculatorApp.closeSearchResults()">×</button>
            </div>
          </div>
        <div class="ad-row">
          <div class="ad-container-left">
              <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-BpPJ5iZcTpecgtmc"
                  data-ad-width="728" data-ad-height="90"></ins>
          </div>
        </div>
        <div class="ad-container mobile-ad">
          <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-ds4FVmwpdYggDkDM"
              data-ad-width="320" data-ad-height="50"></ins>
        </div>
          <div id="search-results-list"></div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      const titleElement = modal.querySelector(".search-results-title");
      if (titleElement) {
        titleElement.textContent = `${currentCategory} 검색 결과`;
      }
    }

    const resultsContainer = document.getElementById("search-results-list");
    let matchedSpirits = [];

    const itemsInCategory = window.DataManager.getData(currentCategory);
    if (itemsInCategory && Array.isArray(itemsInCategory)) {
      itemsInCategory.forEach((spirit) => {
        if (spiritHasStats(spirit, selectedSearchStats)) {
          matchedSpirits.push({
            ...spirit,
            category: currentCategory,
            stats: getSpiritStats(spirit),
            isSelected: selectedSpirits.some(
              (s) => s.image === spirit.image && s.category === currentCategory
            ),
          });
        }
      });
    }

    if (matchedSpirits.length === 0) {
      resultsContainer.innerHTML = `<div class="no-results">선택한 능력치를 가진 ${currentCategory} 환수가 없습니다.</div>`;
      modal.style.display = "block";
      return;
    }

    resultsContainer.innerHTML = `
      <p>총 ${matchedSpirits.length}개의 ${currentCategory} 환수가 검색되었습니다. (클릭하여 여러 환수 선택 가능)</p>
      <div class="search-results-grid"></div>
    `;

    const grid = resultsContainer.querySelector(".search-results-grid");

    matchedSpirits.forEach((spirit) => {
      const card = document.createElement("div");
      card.className = `search-result-card ${
        spirit.isSelected ? "selected-spirit-card" : ""
      }`;
      card.dataset.spiritName = spirit.name;
      card.dataset.spiritImage = spirit.image;
      card.dataset.spiritCategory = spirit.category;
      card.onclick = () => selectSpiritFromSearch(spirit, card);

      const statsHtml = Object.entries(spirit.stats)
        .map(
          ([stat, data]) =>
            `<div class="stat-match">${stat} ${data.value} (Lv.${data.level})</div>`
        )
        .join("");

      card.innerHTML = `
        ${spirit.isSelected ? '<div class="selected-indicator">✓</div>' : ""}
        <img src="${spirit.image}" alt="${
        spirit.name
      }" class="search-result-image">
        <div class="search-result-name">${spirit.name}</div>
        <div class="search-result-stats">${statsHtml}</div>
      `;

      grid.appendChild(card);
    });

    initializeAds(modal);
    modal.style.display = "block";
  }

  function selectSpiritFromSearch(spirit, cardElement) {
    const category = spirit.category;
    const originalSpirit = window.DataManager.getData(category)?.find(
      (s) => s.name === spirit.name
    );

    if (originalSpirit) {
      const isSelected = selectedSpirits.some(
        (s) => s.image === spirit.image && s.category === category
      );

      if (isSelected) {
        const indexToRemove = selectedSpirits.findIndex(
          (s) => s.image === spirit.image && s.category === category
        );

        if (indexToRemove !== -1) {
          selectedSpirits.splice(indexToRemove, 1);
        }

        const imageElement = document.querySelector(
          `img[data-image="${spirit.image}"][data-category="${category}"]`
        );

        if (imageElement) {
          imageElement.classList.remove("selected");
        }

        if (cardElement) {
          cardElement.classList.remove("selected-spirit-card");
          const indicator = cardElement.querySelector(".selected-indicator");
          if (indicator) {
            indicator.remove();
          }
        }
      } else {
        const categorySpirits = selectedSpirits.filter(
          (s) => s.category === category
        );

        if (categorySpirits.length >= 40) {
          alert(`${category} 카테고리는 최대 40개까지만 선택할 수 있습니다.`);
          return;
        }

        const faction =
          originalSpirit.influence || originalSpirit.faction || "결의";
        const isFixed = isFixedLevelSpirit(originalSpirit.name);
        const spiritLevel = isFixed ? 25 : 0;

        const spiritData = {
          ...originalSpirit,
          category,
          level: spiritLevel,
          grade: originalSpirit.grade || "전설",
          faction: faction,
          isFixedLevel: isFixed,
        };
        selectedSpirits.push(spiritData);

        const imageElement = document.querySelector(
          `img[data-image="${spirit.image}"][data-category="${category}"]`
        );

        // console.log("imageElement = ", imageElement);
        // console.log("imageElement.title = ", imageElement.title);
        // const wrapper = imageElement.closest(".img-wrapper");
        // console.log("cardElement = ", cardElement);
        // console.log("wrapper in selectSpiritFromSearch = ", wrapper);
        if (imageElement) {
          imageElement.classList.add("selected");
        }

        // if (wrapper) {
        //   wrapper.classList.add("selected");
        // }

        if (cardElement) {
          cardElement.classList.add("selected-spirit-card");
          if (!cardElement.querySelector(".selected-indicator")) {
            const indicator = document.createElement("div");
            indicator.className = "selected-indicator";
            indicator.textContent = "✓";
            cardElement.prepend(indicator);
          }
        }
      }

      updateSelectedCount();
      updateSelectedSpiritsPanel();
      updateMobilePanel();
      saveSelectedSpiritsToStorage();
    }
  }

  function closeSearchResults() {
    const modal = document.getElementById("search-results-modal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function updateSpiritLevel(index, value) {
    currentScrollY = window.scrollY;
    const spirit = selectedSpirits[index];

    if (spirit.isFixedLevel) {
      alert(`${spirit.name}은(는) 25레벨만 사용 가능합니다.`);

      const levelInput = document.getElementById(`level-input-${index}`);
      if (levelInput) {
        levelInput.value = 25;
      }
      return;
    }

    let level = parseInt(value);
    if (isNaN(level)) level = 0;
    if (level > 25) level = 25;
    if (level < 0) level = 0;

    spirit.level = level;

    const levelInputs = document.querySelectorAll(`#level-input-${index}`);
    levelInputs.forEach((input) => {
      input.value = level;
    });

    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function setMaxLevel(index) {
    currentScrollY = window.scrollY;
    selectedSpirits[index].level = 25;

    const levelInputs = document.querySelectorAll(`#level-input-${index}`);
    levelInputs.forEach((input) => {
      input.value = 25;
    });

    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function changeLevel(index, diff) {
    currentScrollY = window.scrollY;
    const spirit = selectedSpirits[index];

    if (spirit.isFixedLevel) {
      alert(`${spirit.name}은(는) 25레벨만 사용 가능합니다.`);
      return;
    }

    let newLevel = (spirit.level || 0) + diff;
    if (newLevel < 0) newLevel = 0;
    if (newLevel > 25) newLevel = 25;

    spirit.level = newLevel;

    const levelInputs = document.querySelectorAll(`#level-input-${index}`);
    levelInputs.forEach((input) => {
      input.value = newLevel;
    });

    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function applyBatchLevel(inputId) {
    currentScrollY = window.scrollY;
    const level = parseInt(document.getElementById(inputId).value);

    if (isNaN(level) || level < 0) {
      alert("올바른 레벨을 입력하세요.");
      return;
    }

    if (level > 25) {
      alert("최대 레벨은 25입니다.");
      document.getElementById(inputId).value = 25;
      return;
    }

    const currentCategory = lastActiveCategory;
    selectedSpirits.forEach((spirit, index) => {
      if (!spirit.isFixedLevel && spirit.category === currentCategory) {
        spirit.level = level;
      }
    });

    document.getElementById("batchLevel").value = level;
    document.getElementById("mobileBatchLevel").value = level;

    updateSelectedSpiritsPanel();
    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function removeSelectedStat(stat) {
    const index = selectedSearchStats.indexOf(stat);
    if (index !== -1) {
      selectedSearchStats.splice(index, 1);
    }
    updateSelectedStatsDisplay();
  }

  function saveSelectedSpiritsToStorage() {
    localStorage.setItem("selectedSpirits", JSON.stringify(selectedSpirits));
  }

  function saveSavedOptimalCombinations() {
    localStorage.setItem(
      "savedOptimalCombinations",
      JSON.stringify(savedOptimalCombinations)
    );
    localStorage.setItem(
      "combinationCounter",
      JSON.stringify(combinationCounter)
    );
  }

  function loadSavedOptimalCombinations() {
    const savedCombos = localStorage.getItem("savedOptimalCombinations");
    if (savedCombos) {
      try {
        const parsed = JSON.parse(savedCombos);
        if (Array.isArray(parsed)) {
          savedOptimalCombinations = {
            수호: [],
            탑승: [],
            변신: [],
          };
        } else {
          savedOptimalCombinations = parsed;
        }

        if (!savedOptimalCombinations.수호) savedOptimalCombinations.수호 = [];
        if (!savedOptimalCombinations.탑승) savedOptimalCombinations.탑승 = [];
        if (!savedOptimalCombinations.변신) savedOptimalCombinations.변신 = [];
      } catch (e) {
        console.error("저장된 최적 조합 데이터를 불러오는 중 오류 발생:", e);
        savedOptimalCombinations = {
          수호: [],
          탑승: [],
          변신: [],
        };
      }
    } else {
      savedOptimalCombinations = {
        수호: [],
        탑승: [],
        변신: [],
      };
    }

    const savedCounter = localStorage.getItem("combinationCounter");
    if (savedCounter) {
      try {
        combinationCounter = JSON.parse(savedCounter);
      } catch (e) {
        console.error("저장된 조합 카운터 데이터를 불러오는 중 오류 발생:", e);
        combinationCounter = {
          수호: 0,
          탑승: 0,
          변신: 0,
        };
      }
    } else {
      combinationCounter = {
        수호: 0,
        탑승: 0,
        변신: 0,
      };
    }
  }

  function calculateEffectsForSpirits(spirits) {
    const registrationStats = {};
    const missingDataSpirits = [];
    const categoryGradeCount = {};
    const categoryFactionCount = {};

    spirits.forEach((spirit) => {
      const levelStats = spirit.stats?.find(
        (s) => s.level === spirit.level
      )?.registrationStat;

      if (levelStats) {
        Object.entries(levelStats).forEach(([stat, value]) => {
          const numValue = parseFloat(String(value).replace(/,/g, ""));
          if (!isNaN(numValue)) {
            const normalizedStat = normalizeStatKey(stat);
            registrationStats[normalizedStat] =
              (registrationStats[normalizedStat] || 0) + numValue;
          }
        });
      } else {
        missingDataSpirits.push(spirit.name);
      }

      const category = spirit.category;
      const grade = spirit.grade || "전설";
      const faction = spirit.influence || spirit.faction || "결의";

      if (!categoryGradeCount[category]) categoryGradeCount[category] = {};
      if (!categoryGradeCount[category][grade])
        categoryGradeCount[category][grade] = 0;
      categoryGradeCount[category][grade]++;

      if (!categoryFactionCount[category]) categoryFactionCount[category] = {};
      if (!categoryFactionCount[category][faction])
        categoryFactionCount[category][faction] = 0;
      categoryFactionCount[category][faction]++;
    });

    const gradeEffects = calculateGradeSetEffects(categoryGradeCount);
    const factionEffects = calculateFactionSetEffects(categoryFactionCount);

    const combinedEffects = { ...registrationStats };

    Object.entries(gradeEffects).forEach(([stat, value]) => {
      combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
    });

    Object.entries(factionEffects).forEach(([stat, value]) => {
      combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
    });

    const score = calculateScore(combinedEffects);

    return {
      spirits,
      gradeEffects,
      factionEffects,
      combinedEffects,
      missingDataSpirits,
      score,
      gradeCounts: categoryGradeCount,
      factionCounts: categoryFactionCount,
    };
  }

  function calculateGradeSetEffects(categoryGradeCount) {
    const effects = {};

    if (!categoryGradeCount || typeof categoryGradeCount !== "object") {
      return effects;
    }

    // console.log("등급 결속 효과 데이터:", gradeSetEffects);
    // console.log("카테고리-등급 카운트:", categoryGradeCount);

    for (const category in categoryGradeCount) {
      const categoryEffects = gradeSetEffects[category];
      if (!categoryEffects) {
        console.log(`카테고리 ${category}에 대한 등급 효과 데이터 없음`);
        continue;
      }

      const grades = categoryGradeCount[category];
      for (const grade in grades) {
        const count = grades[grade];
        if (count < 2) continue;

        const gradeEffects = categoryEffects[grade];
        if (!gradeEffects) {
          console.log(`${grade} 등급에 대한 효과 데이터 없음`);
          continue;
        }

        let highestStep = 0;
        for (let step = 2; step <= Math.min(6, count); step++) {
          const stepStr = step.toString();
          if (gradeEffects[stepStr]) {
            highestStep = step;
          }
        }

        if (highestStep > 0) {
          const stepEffects = gradeEffects[highestStep.toString()];
          // console.log(
          //   `${category} ${grade} ${highestStep}개 효과 적용:`,
          //   stepEffects
          // );

          for (const stat in stepEffects) {
            const value = parseFloat(
              String(stepEffects[stat]).replace(/,/g, "")
            );
            if (!isNaN(value)) {
              effects[stat] = (effects[stat] || 0) + value;
            }
          }
        }
      }
    }

    // console.log("계산된 등급 효과:", effects);

    return effects;
  }

  function calculateFactionSetEffects(categoryFactionCount) {
    const effects = {};

    // console.log("세력 결속 효과 데이터:", factionSetEffects);
    // console.log("카테고리-세력 카운트:", categoryFactionCount);

    for (const category in categoryFactionCount) {
      if (!factionSetEffects[category]) {
        // console.log(
        //   `${category} 카테고리의 세력 효과 데이터 없음, 기본값 사용`
        // );

        const factions = categoryFactionCount[category];
        for (const faction in factions) {
          const count = factions[faction];

          if (count >= 2) {
            if (faction === "결의" && count >= 3) {
              effects.pvpDamagePercent = (effects.pvpDamagePercent || 0) + 5;
            }
            if (faction === "고요" && count >= 3) {
              effects.pvpDefensePercent = (effects.pvpDefensePercent || 0) + 5;
            }
            if (faction === "냉정" && count >= 3) {
              effects.damageResistancePenetration =
                (effects.damageResistancePenetration || 0) + 50;
            }
            if (faction === "침착" && count >= 3) {
              effects.damageResistance = (effects.damageResistance || 0) + 50;
            }

            effects.power = (effects.power || 0) + count * 10;
          }
        }
        continue;
      }

      // console.log(`카테고리 ${category}의 세력 효과 데이터 찾음`);
      const factions = categoryFactionCount[category];

      for (const faction in factions) {
        const count = factions[faction];

        if (count < 2 || !factionSetEffects[category][faction]) {
          // console.log(
          //   `${faction} 세력은 ${count}개로 효과 발동 안됨 또는 데이터 없음`
          // );
          continue;
        }

        // console.log(`${faction} 세력 ${count}개에 대한 효과 찾는 중`);
        let maxEffectCount = 0;
        let maxEffect = null;

        for (const effect of factionSetEffects[category][faction]) {
          if (!effect || typeof effect !== "object") continue;

          const requiredCount = parseInt(effect["개수"] || "0");
          if (
            !isNaN(requiredCount) &&
            count >= requiredCount &&
            requiredCount > maxEffectCount
          ) {
            maxEffectCount = requiredCount;
            maxEffect = effect;
          }
        }

        if (maxEffect) {
          // console.log(
          //   `${faction} 세력 ${maxEffectCount}개 효과 적용:`,
          //   maxEffect
          // );

          for (const stat in maxEffect) {
            if (stat === "개수") continue;

            const numValue = parseFloat(
              String(maxEffect[stat]).replace(/,/g, "")
            );
            if (!isNaN(numValue)) {
              const normalizedStat = normalizeStatKey(stat);
              effects[normalizedStat] =
                (effects[normalizedStat] || 0) + numValue;
            }
          }
        }
      }
    }

    // console.log("계산된 세력 효과:", effects);

    return effects;
  }

  function calculateScore(effects) {
    const damageResistancePenetration = parseFloat(
      effects.damageResistancePenetration || 0
    );
    const damageResistance = parseFloat(effects.damageResistance || 0);
    const pvpDamagePercent = parseFloat(effects.pvpDamagePercent || 0) * 10;
    const pvpDefensePercent = parseFloat(effects.pvpDefensePercent || 0) * 10;

    return (
      damageResistancePenetration +
      damageResistance +
      pvpDamagePercent +
      pvpDefensePercent
    );
  }

  function findOptimalCombination() {
    // console.log("selectedSpirits = ", selectedSpirits);
    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    if (categorySpirits.length === 0) {
      alert("최적 조합을 찾으려면 환수를 선택하세요.");
      return;
    }

    isProcessing = true;
    isCalculationCancelled = false;

    const optimalModal = document.getElementById("optimalModal");
    optimalModal.style.display = "flex";
    document.body.style.overflow = "hidden";
    isModalOpen = true;

    document.getElementById("optimalModalContent").innerHTML = `
      <div class="calculating-wrapper">
        <div class="calculating-box">
          <div class="calculating-spinner"></div>
          <h3>최적 조합 계산 중...</h3>
          <p>환수 조합을 계산하고 있습니다. 환수 수에 따라 시간이 걸릴 수 있습니다.</p>
          <button id="cancelCalcBtn" class="cancel-calc-btn">계산 취소</button>
        </div>
      </div>
    `;

    document
      .getElementById("cancelCalcBtn")
      .addEventListener("click", function () {
        isCalculationCancelled = true;
        document.querySelector(".calculating-box h3").textContent =
          "계산이 취소되었습니다";
      });

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
        const { invalidSpirits, spiritsWithSuggestions } =
          checkSpiritLevelData();
        if (invalidSpirits.length > 0) {
          const warning = showLevelDataWarning(
            invalidSpirits,
            spiritsWithSuggestions
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
                setTimeout(runActualCalculation, 100);
              });

            document
              .getElementById("cancelBtn")
              .addEventListener("click", function () {
                closeOptimalModal();
                isProcessing = false;
              });
          } else {
            runActualCalculation();
          }
        } else {
          runActualCalculation();
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
  }

  function runActualCalculation() {
    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    document.getElementById("optimalModalContent").innerHTML = `
      <h3 class="modal-title">최적 결속 조합 결과 (최대 6개)</h3>
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
            <h4>환산합산: <span id="optimalScore">계산 중...</span></h4>
            <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small><br />
            <small>환산 합산은 등급 결속 효과 + 세력 결속 효과 + 각 환수 능력치이며 장착효과는 포함하지 않습니다.</small>
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
            <h4>등급 결속 효과</h4>
            <div id="optimalGradeEffects" class="effects-list">
              <div class="calculating">계산 중...</div>
            </div>
          </div>
          <div class="results-section">
            <h4>세력 결속 효과</h4>
            <div id="optimalFactionEffects" class="effects-list">
              <div class="calculating">계산 중...</div>
            </div>
          </div>
          <div class="results-section">
            <h4>총 결속 효과 (*장착효과 제외)</h4>
            <div id="optimalTotalEffects" class="effects-list">
              <div class="calculating">계산 중...</div>
            </div>
          </div>
        </div>

        <div id="optimalSpiritsDetails" class="spirit-details-container">
          <h4>선택된 환수 상세 스탯</h4>
          <div id="spiritStatsDetails" class="spirit-stats-grid">
            <div class="calculating">계산 중...</div>
          </div>
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
        clearSavedOptimalCombinations();
      });

    renderHistoryTabs(currentCategory);

    if (
      savedOptimalCombinations[currentCategory] &&
      savedOptimalCombinations[currentCategory].length > 0
    ) {
      currentActiveIndex = savedOptimalCombinations[currentCategory].length - 1;
      showSingleOptimalResult(
        savedOptimalCombinations[currentCategory][currentActiveIndex]
      );
    }

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      document
        .querySelectorAll("#optimalModal .mobile-ad .kakao_ad_area")
        .forEach((ad) => {
          ad.style.display = "block";
        });
      document
        .querySelectorAll(
          "#optimalModal .ad-container-left .kakao_ad_area, #optimalModal .ad-container-right .kakao_ad_area"
        )
        .forEach((ad) => {
          ad.style.display = "none";
        });
    } else {
      document
        .querySelectorAll("#optimalModal .ad-container-left .kakao_ad_area")
        .forEach((ad) => {
          ad.style.display = "block";
        });
      document
        .querySelectorAll(
          "#optimalModal .mobile-ad .kakao_ad_area, #optimalModal .ad-container-right .kakao_ad_area"
        )
        .forEach((ad) => {
          ad.style.display = "none";
        });
    }

    if (window.adfit) {
      window.adfit();
    } else {
      const adScript = document.createElement("script");
      adScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
      adScript.async = true;
      document.body.appendChild(adScript);
    }

    setTimeout(() => {
      try {
        const validSpirits = categorySpirits
          .filter((spirit) => {
            const levelStats = spirit.stats?.find(
              (s) => s.level === spirit.level
            )?.registrationStat;
            return levelStats !== undefined;
          })
          .map((spirit) => {
            const copy = JSON.parse(JSON.stringify(spirit));
            copy.category = spirit.category;
            copy.grade = spirit.grade || "전설";
            copy.faction = spirit.influence || spirit.faction || "결의";
            return copy;
          });

        if (validSpirits.length === 0) {
          throw new Error("유효한 환수 데이터가 없습니다.");
        }

        if (validSpirits.length <= 20) {
          console.log(`환수 ${validSpirits.length}개: 완전 탐색 방식(A) 사용`);
          runMethodA(validSpirits);
        } else {
          console.log(
            `환수 ${validSpirits.length}개: 스마트 필터링 방식(B) 사용`
          );
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
    const maxCombinationSize = Math.min(6, validSpirits.length);
    let totalCombinations = 0;
    for (let size = 1; size <= maxCombinationSize; size++) {
      totalCombinations += binomialCoefficient(validSpirits.length, size);
    }

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
      sizeIndex,
      combinationIndex,
      batchSize,
      validSpirits,
      sizes,
      combinations
    ) {
      if (sizeIndex >= sizes.length || isCalculationCancelled) {
        if (bestResult) {
          const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
          addNewOptimalCombination(deepCopiedResult);
          saveSavedOptimalCombinations();
          const category = bestResult.spirits[0]?.category || currentCategory;
          currentActiveIndex = savedOptimalCombinations[category].length - 1;
          renderHistoryTabs(category);
          showSingleOptimalResult(bestResult);
        } else {
          document.getElementById("optimalSpiritsList").innerHTML =
            "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
        }
        isProcessing = false;
        return;
      }

      const size = sizes[sizeIndex];
      if (combinationIndex === 0) {
        combinations = generateCombinations(validSpirits, size);
      }

      const endIndex = Math.min(
        combinationIndex + batchSize,
        combinations.length
      );

      for (let i = combinationIndex; i < endIndex; i++) {
        const combination = combinations[i];
        const result = calculateEffectsForSpirits(combination);

        processedCombinations++;

        if (processedCombinations % 20 === 0) {
          updateProgress(processedCombinations / totalCombinations);
        }

        if (!bestResult || result.score > bestResult.score) {
          bestResult = result;
        } else if (result.score === bestResult.score) {
          const currentImmortalCount = countGradeInResult(result, "불멸");
          const bestImmortalCount = countGradeInResult(bestResult, "불멸");

          if (currentImmortalCount > bestImmortalCount) {
            bestResult = result;
          } else if (currentImmortalCount === bestImmortalCount) {
            const currentGradeTypes = countGradeTypesInResult(result);
            const bestGradeTypes = countGradeTypesInResult(bestResult);

            if (currentGradeTypes > bestGradeTypes) {
              bestResult = result;
            }
          }
        }
      }

      if (endIndex < combinations.length) {
        setTimeout(() => {
          processInBatches(
            sizeIndex,
            endIndex,
            batchSize,
            validSpirits,
            sizes,
            combinations
          );
        }, 0);
      } else {
        setTimeout(() => {
          processInBatches(
            sizeIndex + 1,
            0,
            batchSize,
            validSpirits,
            sizes,
            null
          );
        }, 0);
      }
    }

    const sizes = [];
    for (let size = maxCombinationSize; size >= 1; size--) {
      sizes.push(size);
    }

    const batchSize = 50;
    processInBatches(0, 0, batchSize, validSpirits, sizes, null);
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

        const score =
          (levelStat.damageResistancePenetration || 0) +
          (levelStat.damageResistance || 0) +
          (levelStat.pvpDamagePercent || 0) * 10 +
          (levelStat.pvpDefensePercent || 0) * 10;

        return {
          ...spirit,
          score: score,
          calculatedStats: levelStat,
        };
      })
      .sort((a, b) => b.score - a.score);
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
          <div class="progress-bar-container">
              <div class="progress-bar" id="calculation-progress-bar" style="width:0%"></div>
          </div>
          <div id="calculation-status">계산 시작 준비 완료</div>
      </div>
    `;

    document.getElementById("optimalSpiritsList").innerHTML = infoHTML;
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
    if (!spirit.stats || !Array.isArray(spirit.stats)) return false;

    const levelStat = spirit.stats.find((s) => s.level === spirit.level);
    if (!levelStat || !levelStat.registrationStat) return false;

    const stats = levelStat.registrationStat;
    return statKeys.some((key) => {
      const value = parseFloat(stats[key] || 0);
      return value > 0;
    });
  }

  function optimizeWithSmartFiltering(rankedSpirits) {
    console.log("=== 스마트 필터링 시작 ===");
    console.log(`총 환수 수: ${rankedSpirits.length}개`);

    const totalSpirits = rankedSpirits.length;
    let bestResultOverall = null;
    let processedResultCount = 0;

    updateCalculationPhase(0);

    const topRankedSpirits = rankedSpirits.slice(0, Math.min(25, totalSpirits));
    console.log(`상위 점수 환수: ${topRankedSpirits.length}개 선택됨`);

    const pvpSpirits = rankedSpirits
      .filter((spirit) =>
        hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
      )
      .slice(0, 15);
    console.log(`대피/대방% 환수: ${pvpSpirits.length}개`);

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
    console.log(`피저/피저관 환수: ${resistanceSpirits.length}개`);

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
    console.log(`기타 환수: ${otherSpirits.length}개`);

    const mixedSpirits = [
      ...new Set([...pvpSpirits, ...resistanceSpirits, ...otherSpirits]),
    ];
    console.log(`균형 그룹 환수: ${mixedSpirits.length}개 (중복 제거)`);

    const workerBlob = new Blob([getWorkerCode()], {
      type: "application/javascript",
    });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);

    let currentPhase = 1;
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

    worker.onmessage = function (e) {
      const { type, results, progress, processedCount, error, message } =
        e.data;

      if (type === "log") {
        console.log(`[Worker] ${message}`);
        return;
      }

      if (type === "error") {
        console.error("Worker error:", error);
        document.getElementById(
          "calculation-status"
        ).textContent = `오류 발생: ${error.substring(0, 50)}...`;
        finishCalculation();
        return;
      }

      if (type === "progress") {
        const progressBar = document.getElementById("calculation-progress-bar");
        const statusText = document.getElementById("calculation-status");
        const currentPhaseName = phases[currentPhase - 1].name;

        if (progressBar && statusText) {
          const percentage = Math.round(progress * 100);
          progressBar.style.width = `${percentage}%`;
          statusText.textContent = `${currentPhaseName} 분석 중 (${percentage}%)`;

          if (percentage % 20 === 0) {
            console.log(`${currentPhaseName} 분석: ${percentage}% 완료`);
          }
        }

        processedResultCount += processedCount || 0;
      } else if (type === "result") {
        console.log(`=== ${phases[currentPhase - 1].name} 분석 완료 ===`);

        if (Array.isArray(results) && results.length > 0) {
          console.log(`- 분석된 조합 수: ${results.length}`);

          let bestPhaseResult = results[0];
          for (let i = 1; i < results.length; i++) {
            if (results[i].score > bestPhaseResult.score) {
              bestPhaseResult = results[i];
            }
          }

          bestPhaseResult.phaseName = phases[currentPhase - 1].name;
          bestPhaseResult.phaseId = phases[currentPhase - 1].phaseId;

          console.log(`- 현재 단계 최고 점수: ${bestPhaseResult.score}`);
          console.log(`- 환수 구성: ${bestPhaseResult.spirits.length}개`);

          if (
            !bestResultOverall ||
            bestPhaseResult.score > bestResultOverall.score
          ) {
            console.log(`- 새 최적 조합 발견! 점수: ${bestPhaseResult.score}`);
            bestResultOverall = bestPhaseResult;
            document.getElementById("optimalScore").textContent =
              bestPhaseResult.score;
          }
        } else {
          console.log(`- 결과 없음`);
        }

        currentPhase++;
        updateCalculationPhase(currentPhase);

        if (currentPhase <= phases.length && !isCalculationCancelled) {
          const phaseIndex = currentPhase - 1;
          console.log(
            `\n=== ${phases[phaseIndex].name} 분석 시작 (phase ${currentPhase}) ===`
          );
          console.log(`- 환수 수: ${phases[phaseIndex].spirits.length}`);
          console.log(`- 최대 조합 크기: ${phases[phaseIndex].maxSize}`);

          worker.postMessage({
            spirits: phases[phaseIndex].spirits,
            maxCombinationSize: phases[phaseIndex].maxSize,
            factionSetEffects: factionSetEffects,
          });
        } else {
          finishCalculation();
        }
      }
    };

    console.log(`=== ${phases[0].name} 분석 시작 (phase 1) ===`);
    console.log(`- 환수 수: ${phases[0].spirits.length}개`);
    console.log(`- 최대 조합 크기: ${phases[0].maxSize}`);

    worker.postMessage({
      spirits: phases[0].spirits,
      maxCombinationSize: phases[0].maxSize,
      factionSetEffects: factionSetEffects,
    });

    function finishCalculation() {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      console.log("웹 워커 종료됨");

      updateCalculationPhase(4);

      const calcStatus = document.getElementById("calculation-status");
      if (calcStatus) {
        calcStatus.innerHTML =
          '계산 완료! <span class="calculation-complete-icon">✓</span>';
        calcStatus.classList.add("calculation-complete");
      }

      if (bestResultOverall) {
        console.log("\n=== 최종 결과 ===");
        console.log(`- 최종 점수: ${bestResultOverall.score}`);
        console.log(`- 최적 환수 수: ${bestResultOverall.spirits.length}개`);
        console.log(
          `- 선택된 환수: ${bestResultOverall.spirits
            .map((s) => s.name)
            .join(", ")}`
        );

        const deepCopiedResult = JSON.parse(JSON.stringify(bestResultOverall));
        addNewOptimalCombination(deepCopiedResult);
        saveSavedOptimalCombinations();

        const category =
          bestResultOverall.spirits[0]?.category || lastActiveCategory;
        currentActiveIndex = savedOptimalCombinations[category].length - 1;
        renderHistoryTabs(category);
        showSingleOptimalResult(bestResultOverall);
      } else {
        console.log("=== 최적 조합을 찾을 수 없음 ===");
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
      }

      console.log("=== 스마트 필터링 종료 ===");
      isProcessing = false;
    }
  }

  function optimizeWithoutWorkerSmartFiltering(rankedSpirits) {
    console.log("=== 스마트 필터링 시작 (워커 미지원) ===");
    console.log(`총 환수 수: ${rankedSpirits.length}개`);

    const totalSpirits = rankedSpirits.length;
    let bestResult = null;

    const topSpirits = rankedSpirits.slice(0, Math.min(15, totalSpirits));
    console.log(`상위 점수 환수: ${topSpirits.length}개 선택됨`);

    document.getElementById("calculation-status").textContent =
      "웹 워커를 지원하지 않습니다. 상위 환수만 계산합니다...";

    setTimeout(() => {
      console.log("조합 생성 시작");
      const combinations = generateCombinations(
        topSpirits,
        Math.min(6, topSpirits.length)
      );
      console.log(`생성된 조합 수: ${combinations.length}개`);

      console.log("조합 분석 시작");
      combinations.forEach((combination, index) => {
        const result = calculateEffectsForSpirits(combination);

        if (!bestResult || result.score > bestResult.score) {
          console.log(
            `새 최적 조합 발견: 점수 ${result.score} (환수 ${combination.length}개)`
          );
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

          if (index % 500 === 0) {
            console.log(
              `분석 진행 중: ${Math.round(progress)}% 완료 (${index}/${
                combinations.length
              })`
            );
          }
        }
      });

      console.log("조합 분석 완료");

      if (bestResult) {
        console.log("\n=== 최종 결과 ===");
        console.log(`- 최종 점수: ${bestResult.score}`);
        console.log(`- 최적 환수 수: ${bestResult.spirits.length}개`);
        console.log(
          `- 선택된 환수: ${bestResult.spirits.map((s) => s.name).join(", ")}`
        );

        addNewOptimalCombination(bestResult);
        saveSavedOptimalCombinations();

        const category = bestResult.spirits[0]?.category || lastActiveCategory;
        currentActiveIndex = savedOptimalCombinations[category].length - 1;
        renderHistoryTabs(category);
        showSingleOptimalResult(bestResult);
      } else {
        console.log("최적 조합을 찾을 수 없음");
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
      }

      console.log("=== 스마트 필터링 종료 (워커 미지원) ===");
      isProcessing = false;
    }, 100);
  }

  function fixAdContainerStyles() {
    const existingStyle = document.getElementById("ad-container-fix-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement("style");
    style.id = "ad-container-fix-style";
    style.textContent = `
      .ad-container-left, .ad-container-right, .ad-container.mobile-ad {
        position: relative;
        overflow: hidden;
        width: 100%;
        max-width: 100%;
        text-align: center;
      }

      .kakao_ad_area {
        display: inline-block !important;
        max-width: 100%;
      }

      @media (max-width: 728px) {
        .ad-container-left ins, .ad-container-right ins {
          transform: scale(0.9);
          transform-origin: center;
          max-width: 100%;
        }
      }

      @media (max-width: 375px) {
        .ad-container.mobile-ad ins {
          transform: scale(0.9);
          transform-origin: left top;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function initializeAds(container) {
    fixAdContainerStyles();

    let adElements;

    if (container instanceof NodeList) {
      adElements = container;
    } else if (container && typeof container.querySelectorAll === "function") {
      adElements = container.querySelectorAll(".kakao_ad_area");
    } else {
      adElements = document.querySelectorAll(".kakao_ad_area");
    }

    adElements.forEach((ad) => {
      if (ad) {
        ad.style.display = "inline-block";
      }
    });

    if (typeof window.adfit !== "undefined") {
      window.adfit();
    } else {
      const reloadScript = document.createElement("script");
      reloadScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
      reloadScript.async = true;
      document.body.appendChild(reloadScript);
    }
  }

  function getWorkerCode() {
    return `
      let factionSetEffectsData = {};

      function logToMain(message) {
        self.postMessage({
          type: 'log',
          message: message
        });
      }

      self.onmessage = async function(e) {
        const { spirits, maxCombinationSize, factionSetEffects } = e.data;

        logToMain(\`계산 작업 시작: \${spirits.length}개 환수, 최대 조합 크기: \${maxCombinationSize}\`);

        if (factionSetEffects) {
          factionSetEffectsData = factionSetEffects;
        }

        let heartbeatInterval;

        try {
          if (!spirits || !Array.isArray(spirits) || spirits.length === 0) {
            throw new Error("유효한 환수 데이터가 없습니다");
          }

          const maxSize = maxCombinationSize || 6;

          logToMain("조합 생성 시작");
          const combinations = generateCombinationsNonRecursive(spirits, maxSize);
          const totalCombinations = combinations.length;
          logToMain(\`총 \${totalCombinations}개 조합 생성됨\`);

          let processedCount = 0;
          const batchSize = Math.min(50, Math.ceil(totalCombinations / 100));
          const results = [];

          heartbeatInterval = setInterval(() => {
            self.postMessage({
              type: 'progress',
              progress: processedCount / totalCombinations,
              processedCount: 0,
              heartbeat: true
            });
          }, 2000);

          function reportProgress() {
            self.postMessage({
              type: 'progress',
              progress: processedCount / totalCombinations,
              processedCount: batchSize
            });
          }

          try {
            logToMain("조합 분석 시작");

            for (let i = 0; i < combinations.length; i += batchSize) {
              const endIdx = Math.min(i + batchSize, combinations.length);
              const batch = combinations.slice(i, endIdx);

              batch.forEach(combination => {
                const result = calculateEffectsForSpirits(combination);
                if (result) {
                  results.push(result);
                }
              });

              processedCount += batch.length;
              reportProgress();

              if (Math.floor((i / combinations.length) * 10) !==
                  Math.floor(((i - batchSize) / combinations.length) * 10)) {
                const percent = Math.floor((i / combinations.length) * 100);
                logToMain(\`분석 진행 중: \${percent}% 완료 (\${i}/\${combinations.length})\`);
              }

              if (i + batchSize < combinations.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }

              if (i % (batchSize * 5) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }

            logToMain(\`조합 분석 완료: \${processedCount}개 조합 처리\`);

            if (results.length > 0) {
              let bestScore = results[0].score;
              let bestSpiritCount = results[0].spirits.length;

              results.forEach(result => {
                if (result.score > bestScore) {
                  bestScore = result.score;
                  bestSpiritCount = result.spirits.length;
                }
              });

              logToMain(\`최고 점수 조합: \${bestScore} 점 (환수 \${bestSpiritCount}개)\`);
            }
          } finally {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          }

          self.postMessage({
            type: 'result',
            results: results
          });
        } catch (error) {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          logToMain(\`오류 발생: \${error.toString()}\`);
          self.postMessage({
            type: 'error',
            error: error.toString(),
            stack: error.stack
          });
        }
      };

      function generateCombinationsNonRecursive(arr, maxSize) {
        const result = [];

        for (let size = Math.min(maxSize, arr.length); size >= 1; size--) {
          if (size > 1) {
            const estimatedCombinations = estimateCombinations(arr.length, size);
            if (estimatedCombinations > 1000000) {
              console.warn(\`너무 많은 조합: \${estimatedCombinations}개. 계산을 건너뜁니다.\`);
              continue;
            }
          }

          const indices = [];
          for (let i = 0; i < size; i++) {
            indices.push(i);
          }

          result.push(indices.map(i => arr[i]));

          while (true) {
            let i = size - 1;
            while (i >= 0 && indices[i] === arr.length - size + i) {
              i--;
            }

            if (i < 0) break;

            indices[i]++;
            for (let j = i + 1; j < size; j++) {
              indices[j] = indices[j-1] + 1;
            }

            result.push(indices.map(i => arr[i]));
          }
        }

        return result;
      }

      function estimateCombinations(n, k) {
        let result = 1;
        for (let i = 1; i <= k; i++) {
          result *= (n - (i - 1)) / i;
        }
        return Math.round(result);
      }

      function calculateEffectsForSpirits(spirits) {
        const registrationStats = {};
        const gradeCounts = {};
        const factionCounts = {};

        spirits.forEach(spirit => {
          const levelStats = findSpiritStats(spirit);

          if (levelStats) {
            Object.entries(levelStats).forEach(([stat, value]) => {
              const numValue = parseFloat(String(value).replace(/,/g, ""));
              if (!isNaN(numValue)) {
                const normalizedStat = normalizeStatKey(stat);
                registrationStats[normalizedStat] = (registrationStats[normalizedStat] || 0) + numValue;
              }
            });
          }

          const category = spirit.category;
          const grade = spirit.grade || "전설";
          const faction = spirit.faction || spirit.influence || "결의";

          if (!gradeCounts[category]) gradeCounts[category] = {};
          if (!gradeCounts[category][grade]) gradeCounts[category][grade] = 0;
          gradeCounts[category][grade]++;

          if (!factionCounts[category]) factionCounts[category] = {};
          if (!factionCounts[category][faction]) factionCounts[category][faction] = 0;
          factionCounts[category][faction]++;
        });

        const gradeEffects = calculateGradeSetEffects(gradeCounts);
        const factionEffects = calculateFactionSetEffects(factionCounts);

        const combinedEffects = { ...registrationStats };

        Object.entries(gradeEffects).forEach(([stat, value]) => {
          combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
        });

        Object.entries(factionEffects).forEach(([stat, value]) => {
          combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
        });

        const score = calculateScore(combinedEffects);

        return {
          spirits,
          gradeEffects,
          factionEffects,
          combinedEffects,
          score,
          gradeCounts,
          factionCounts
        };
      }

      function findSpiritStats(spirit) {
        if (!spirit) return null;
        if (!spirit.stats || !Array.isArray(spirit.stats)) return null;

        const level = spirit.level || 0;
        let levelStat = null;

        try {
          levelStat = spirit.stats.find(s => s && s.level === level);
          if (levelStat && levelStat.registrationStat) {
            return levelStat.registrationStat;
          }
        } catch (e) {
          return {};
        }

        return {};
      }

      function normalizeStatKey(key) {
        return key.replace(/\\d+$/, "");
      }

      function calculateScore(effects) {
        const damageResistancePenetration = parseFloat(effects.damageResistancePenetration || 0);
        const damageResistance = parseFloat(effects.damageResistance || 0);
        const pvpDamagePercent = parseFloat(effects.pvpDamagePercent || 0) * 10;
        const pvpDefensePercent = parseFloat(effects.pvpDefensePercent || 0) * 10;

        return damageResistancePenetration + damageResistance + pvpDamagePercent + pvpDefensePercent;
      }

      function calculateGradeSetEffects(categoryGradeCount) {
        const effects = {};

        const guardianEffects = {
          전설: {
            2: { power: 150 },
            3: { power: 150, experienceGainIncrease: 10 },
            4: { power: 150, experienceGainIncrease: 10, damageResistancePenetration: 100 },
            5: { power: 150, experienceGainIncrease: 10, damageResistancePenetration: 100, statusEffectResistance: 150 },
            6: { power: 150, experienceGainIncrease: 10, damageResistancePenetration: 100, statusEffectResistance: 150, damageResistance: 100 }
          },
          불멸: {
            2: { damageResistancePenetration: 200 },
            3: { damageResistancePenetration: 200, damageResistance: 150 },
            4: { damageResistancePenetration: 200, damageResistance: 150, experienceGainIncrease: 15 },
            5: { damageResistancePenetration: 200, damageResistance: 150, experienceGainIncrease: 15, pvpDamagePercent: 20 },
            6: { damageResistancePenetration: 200, damageResistance: 150, experienceGainIncrease: 15, pvpDamagePercent: 20, pvpDefensePercent: 20 }
          }
        };

        const rideEffects = {
          전설: {
            2: { normalMonsterAdditionalDamage: 50 },
            3: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50 },
            4: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50, damageResistancePenetration: 50 },
            5: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50, damageResistancePenetration: 50, statusEffectAccuracy: 50 },
            6: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50, damageResistancePenetration: 50, statusEffectAccuracy: 50, damageResistance: 50 }
          },
          불멸: {
            2: { damageResistancePenetration: 150 },
            3: { damageResistancePenetration: 150, damageResistance: 150 },
            4: { damageResistancePenetration: 150, damageResistance: 150, movementSpeed: 5 },
            5: { damageResistancePenetration: 150, damageResistance: 150, movementSpeed: 5, pvpDamagePercent: 20 },
            6: { damageResistancePenetration: 150, damageResistance: 150, movementSpeed: 5, pvpDamagePercent: 20, pvpDefensePercent: 20 }
          }
        };

        const transformEffects = {
          전설: {
            2: { magicIncreasePercent: 3 },
            3: { magicIncreasePercent: 3, healthIncreasePercent: 3 },
            4: { magicIncreasePercent: 3, healthIncreasePercent: 3, damageResistancePenetration: 100 },
            5: { magicIncreasePercent: 3, healthIncreasePercent: 3, damageResistancePenetration: 100, movementSpeed: 3 },
            6: { magicIncreasePercent: 3, healthIncreasePercent: 3, damageResistancePenetration: 100, movementSpeed: 3, damageResistance: 100 }
          },
          불멸: {
            2: { damageResistancePenetration: 150 },
            3: { damageResistancePenetration: 150, damageResistance: 150 },
            4: { damageResistancePenetration: 150, damageResistance: 150, criticalPowerPercent: 30 },
            5: { damageResistancePenetration: 150, damageResistance: 150, criticalPowerPercent: 30, pvpDamagePercent: 20 },
            6: { damageResistancePenetration: 150, damageResistance: 150, criticalPowerPercent: 30, pvpDamagePercent: 20, pvpDefensePercent: 20 }
          }
        };

        const gradeEffectsByCategory = {
          수호: guardianEffects,
          탑승: rideEffects,
          변신: transformEffects
        };

        for (const category in categoryGradeCount) {
          const categoryEffects = gradeEffectsByCategory[category];
          if (!categoryEffects) continue;

          const grades = categoryGradeCount[category];
          for (const grade in grades) {
            const count = grades[grade];
            if (count < 2) continue;

            const gradeEffects = categoryEffects[grade];
            if (!gradeEffects) continue;

            let highestStep = 0;
            for (let step = 2; step <= Math.min(6, count); step++) {
              if (gradeEffects[step.toString()]) {
                highestStep = step;
              }
            }

            if (highestStep > 0) {
              const stepEffects = gradeEffects[highestStep.toString()];
              for (const stat in stepEffects) {
                const value = parseFloat(String(stepEffects[stat]).replace(/,/g, ""));
                if (!isNaN(value)) {
                  effects[stat] = (effects[stat] || 0) + value;
                }
              }
            }
          }
        }

        return effects;
      }

      function calculateFactionSetEffects(categoryFactionCount) {
        const effects = {};

        for (const category in categoryFactionCount) {
          if (!factionSetEffectsData[category]) {
            const factions = categoryFactionCount[category];
            for (const faction in factions) {
              const count = factions[faction];

              if (count >= 2) {
                if (faction === "결의" && count >= 3) {
                  effects.pvpDamagePercent = (effects.pvpDamagePercent || 0) + 5;
                }
                if (faction === "고요" && count >= 3) {
                  effects.pvpDefensePercent = (effects.pvpDefensePercent || 0) + 5;
                }
                if (faction === "냉정" && count >= 3) {
                  effects.damageResistancePenetration = (effects.damageResistancePenetration || 0) + 50;
                }
                if (faction === "침착" && count >= 3) {
                  effects.damageResistance = (effects.damageResistance || 0) + 50;
                }

                effects.power = (effects.power || 0) + count * 10;
              }
            }
            continue;
          }

          const factions = categoryFactionCount[category];
          for (const faction in factions) {
            const count = factions[faction];

            if (count < 2 || !factionSetEffectsData[category][faction]) continue;

            let maxEffectCount = 0;
            let maxEffect = null;

            for (const effect of factionSetEffectsData[category][faction]) {
              if (!effect || typeof effect !== "object") continue;

              const requiredCount = parseInt(effect["개수"] || "0");
              if (
                !isNaN(requiredCount) &&
                count >= requiredCount &&
                requiredCount > maxEffectCount
              ) {
                maxEffectCount = requiredCount;
                maxEffect = effect;
              }
            }

            if (maxEffect) {
              for (const stat in maxEffect) {
                if (stat === "개수") continue;

                const numValue = parseFloat(
                  String(maxEffect[stat]).replace(/,/g, "")
                );
                if (!isNaN(numValue)) {
                  const normalizedStat = normalizeStatKey(stat);
                  effects[normalizedStat] = (effects[normalizedStat] || 0) + numValue;
                }
              }
            }
          }
        }

        return effects;
      }
    `;
  }

  function checkSpiritLevelData() {
    const invalidSpirits = [];
    const spiritsWithSuggestions = [];

    for (const spirit of selectedSpirits) {
      const name = spirit.name;
      const level = spirit.level || 0;
      const availableLevels = [];

      if (spirit.stats && Array.isArray(spirit.stats)) {
        spirit.stats.forEach((stat) => {
          if (
            stat.registrationStat &&
            Object.keys(stat.registrationStat).length > 0
          ) {
            availableLevels.push(stat.level);
          }
        });
      }

      if (!availableLevels.includes(level)) {
        invalidSpirits.push({
          name,
          level,
          availableLevels,
        });

        if (availableLevels.length > 0) {
          spiritsWithSuggestions.push({
            name,
            level,
            availableLevels,
          });
        }
      }
    }

    return { invalidSpirits, spiritsWithSuggestions };
  }

  function showLevelDataWarning(invalidSpirits, spiritsWithSuggestions) {
    let message = "";

    if (invalidSpirits.length > 0) {
      message += "<strong>데이터 누락 경고:</strong><br><br>";

      invalidSpirits.forEach((spirit) => {
        message += `- <strong>${spirit.name}</strong>: ${spirit.level}레벨에 데이터가 없습니다.`;

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
          '<br>권장 조치: 각 환수의 레벨을 데이터가 있는 레벨로 변경하시거나 "MAX" 버튼을 눌러 최대 레벨로 설정하세요.';
      }
    }

    return message;
  }

  function closeOptimalModal() {
    document.getElementById("optimalModal").style.display = "none";
    document.body.style.overflow = "auto";
    isModalOpen = false;
  }

  function renderEffectsList(
    effectsData,
    setInfo = "",
    includePercentWithNormal = true
  ) {
    if (!effectsData) effectsData = {};

    if (Object.keys(effectsData).length === 0) {
      if (setInfo) {
        return `<div class="set-info">${setInfo}</div><p>적용된 효과가 없습니다.</p>`;
      }
      return "<p>적용된 효과가 없습니다.</p>";
    }

    let html = "";
    if (setInfo) {
      html += `<div class="set-info">${setInfo}</div>`;
    }

    const percentStats = PERCENT_STATS || [];

    if (includePercentWithNormal) {
      for (const [stat, value] of Object.entries(effectsData)) {
        if (!stat) continue;

        const normalizedStat = normalizeStatKey(stat);
        const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

        const isPercentStat =
          Array.isArray(percentStats) && percentStats.includes(normalizedStat);

        const displayValue = isPercentStat
          ? `${Math.round(value * 100) / 100}%`
          : Math.round(value * 100) / 100;

        const colorClass =
          (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
        const cssClass = isPercentStat
          ? `effect-item effect-item-percent ${colorClass}`
          : `effect-item ${colorClass}`;

        html += `<div class="${cssClass}"><span>${statName}</span><span>${displayValue}</span></div>`;
      }
    } else {
      const normalEffects = {};
      const percentEffects = {};

      for (const [stat, value] of Object.entries(effectsData)) {
        if (!stat) continue;

        const normalizedStat = normalizeStatKey(stat);

        if (
          Array.isArray(percentStats) &&
          percentStats.includes(normalizedStat)
        ) {
          percentEffects[normalizedStat] = value;
        } else {
          normalEffects[normalizedStat] = value;
        }
      }

      if (Object.keys(normalEffects).length > 0) {
        for (const [stat, value] of Object.entries(normalEffects)) {
          const normalizedStat = normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item ${colorClass}"><span>${statName}</span><span>${
            Math.round(value * 100) / 100
          }</span></div>`;
        }
      }

      if (Object.keys(percentEffects).length > 0) {
        html += `<div class="section-header">퍼센트 효과</div>`;
        for (const [stat, value] of Object.entries(percentEffects)) {
          const normalizedStat = normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item effect-item-percent ${colorClass}"><span>${statName}</span><span>${
            Math.round(value * 100) / 100
          }%</span></div>`;
        }
      }
    }

    return html;
  }

  function clearSavedOptimalCombinations() {
    const currentCategory = lastActiveCategory;

    if (
      confirm(
        `${currentCategory} 카테고리의 저장된 모든 조합 기록을 삭제하시겠습니까?`
      )
    ) {
      savedOptimalCombinations[currentCategory] = [];
      combinationCounter[currentCategory] = 0;
      saveSavedOptimalCombinations();
      renderHistoryTabs(currentCategory);
      document.getElementById("optimalGradeEffects").innerHTML = "";
      document.getElementById("optimalFactionEffects").innerHTML = "";
      document.getElementById("optimalTotalEffects").innerHTML = "";
      document.getElementById("spiritStatsDetails").innerHTML = "";
      document.getElementById("combinationResultsContainer").innerHTML = "";
      document.getElementById("optimalScore").textContent = "0";
      alert(`${currentCategory} 조합 기록이 모두 삭제되었습니다.`);
    }
  }

  function addNewOptimalCombination(result) {
    const timestamp = new Date().toLocaleString();
    const category = result.spirits[0]?.category || lastActiveCategory;

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
  }

  function renderHistoryTabs(category) {
    const categoryCombinations = savedOptimalCombinations[category] || [];

    if (categoryCombinations.length === 0) {
      document.getElementById("optimalSpiritsList").innerHTML = `
        <div class="history-tabs-container">
          <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
        </div>
        <div id="combinationResultsContainer"></div>
      `;
      return;
    }

    let highestScoreIndex = 0;
    let highestScore = categoryCombinations[0].score;

    for (let i = 1; i < categoryCombinations.length; i++) {
      if (categoryCombinations[i].score > highestScore) {
        highestScore = categoryCombinations[i].score;
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
                  <span class="tab-score">${combo.score}</span>
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
      <div id="combinationResultsContainer"></div>
    `;

    document.getElementById("optimalSpiritsList").innerHTML = tabsHtml;

    const oldStyle = document.getElementById("history-tab-styles");
    if (oldStyle) {
      oldStyle.remove();
    }

    const style = document.createElement("style");
    style.id = "history-tab-styles";
    style.textContent = `
      .history-tabs-container {
        width: 100%;
        overflow-x: hidden;
        padding-bottom: 5px;
      }

      .history-tabs {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        width: 100%;
        margin-bottom: 12px;
        gap: 4px;
      }

      .history-tab, .history-tab-placeholder {
        border-radius: 6px;
        padding: 20px 2px 5px;
        margin: 0;
        position: relative;
        min-height: 65px;
      }

      .history-tab {
        border: 1px solid #ddd;
        background-color: #f8f8f8;
        cursor: pointer;
        transition: all 0.2s;
        overflow: hidden;
      }

      .history-tab-placeholder {
        background-color: transparent;
        border: 1px dashed #eee;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .combo-name {
        font-weight: bold;
        font-size: 12px;
        white-space: nowrap;
      }

      .tab-indicators {
        position: absolute;
        top: 2px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 2px;
      }

      .current-marker, .best-marker {
        font-size: 9px;
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: normal;
      }

      .current-marker {
        background: #3498db;
        color: white;
      }

      .best-marker {
        background: #e74c3c;
        color: white;
      }

      .tab-score {
        font-size: 11px;
        font-weight: bold;
        margin-top: 3px;
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

      @media (max-width: 480px) {
        .history-tab, .history-tab-placeholder {
          padding: 18px 2px 5px;
          min-height: 58px;
        }

        .combo-name {
          font-size: 10px;
        }

        .current-marker, .best-marker {
          font-size: 8px;
          padding: 0px 2px;
        }

        .tab-score {
          font-size: 10px;
        }

        .best-notice {
          display: block;
          margin-top: 5px;
          margin-left: 0;
          font-size: 11px;
        }

        .timestamp {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);

    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        document
          .querySelectorAll(".history-tab")
          .forEach((t) => t.classList.remove("active"));
        this.classList.add("active");

        const comboIndex = parseInt(this.dataset.index);
        currentActiveIndex = comboIndex;
        const result = categoryCombinations[comboIndex];
        showSingleOptimalResult(result);

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

    if (categoryCombinations[currentActiveIndex]) {
      showSingleOptimalResult(categoryCombinations[currentActiveIndex]);
    }
  }

  function showSingleOptimalResult(result) {
    if (
      !result ||
      !result.spirits ||
      !Array.isArray(result.spirits) ||
      result.spirits.length === 0
    ) {
      document.getElementById("optimalSpiritsList").innerHTML =
        "<div class='warning-message'>표시할 결과가 없습니다.</div>";
      return;
    }

    const { spirits, score, gradeCounts, factionCounts } = result;

    document.getElementById("optimalScore").textContent = score;

    const resultsContainer = document.getElementById(
      "combinationResultsContainer"
    );
    resultsContainer.innerHTML = "";

    spirits.forEach((spirit) => {
      const spiritInfo = document.createElement("div");
      spiritInfo.className = "spirit-info-item";

      const img = document.createElement("img");
      img.src = spirit.image;
      img.alt = spirit.name;

      const details = document.createElement("div");
      details.className = "spirit-info-details";

      const name = document.createElement("div");
      name.className = "spirit-info-name";
      name.textContent = spirit.name;

      const faction = spirit.influence || spirit.faction || "결의";

      const level = document.createElement("div");
      level.className = "spirit-info-level";
      level.textContent = `레벨: ${spirit.level}, ${spirit.category}, ${spirit.grade}, ${faction}`;

      details.appendChild(name);
      details.appendChild(level);

      spiritInfo.appendChild(img);
      spiritInfo.appendChild(details);

      resultsContainer.appendChild(spiritInfo);
    });

    let gradeSetInfo = "";
    for (const [category, grades] of Object.entries(gradeCounts || {})) {
      for (const [grade, count] of Object.entries(grades)) {
        if (count >= 2) {
          const gradeClass =
            grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
          gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
        }
      }
    }

    let factionSetInfo = "";
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
        factionSetInfo += `<div>${category}: ${factionTags}</div>`;
      }
    }

    // 결속 효과 처리 부분 수정
    let gradeEffects = {};
    let factionEffects = {};
    let combinedEffects = {};

    // 1. 결과에서 효과 데이터 가져오기
    if (result.gradeEffects && Object.keys(result.gradeEffects).length > 0) {
      gradeEffects = result.gradeEffects;
    } else {
      // 효과 데이터가 없으면 직접 계산
      gradeEffects = calculateGradeSetEffects(gradeCounts || {});
    }

    if (
      result.factionEffects &&
      Object.keys(result.factionEffects).length > 0
    ) {
      factionEffects = result.factionEffects;
    } else {
      // 효과 데이터가 없으면 직접 계산
      factionEffects = calculateFactionSetEffects(factionCounts || {});
    }

    if (
      result.combinedEffects &&
      Object.keys(result.combinedEffects).length > 0
    ) {
      combinedEffects = result.combinedEffects;
    } else {
      // 개별 환수 스탯 수집
      const registrationStats = {};
      spirits.forEach((spirit) => {
        const levelStats = spirit.stats?.find(
          (s) => s.level === spirit.level
        )?.registrationStat;
        if (levelStats) {
          Object.entries(levelStats).forEach(([stat, value]) => {
            const numValue = parseFloat(String(value).replace(/,/g, ""));
            if (!isNaN(numValue)) {
              const normalizedStat = normalizeStatKey(stat);
              registrationStats[normalizedStat] =
                (registrationStats[normalizedStat] || 0) + numValue;
            }
          });
        }
      });

      // 모든 효과 병합
      combinedEffects = { ...registrationStats };
      Object.entries(gradeEffects).forEach(([stat, value]) => {
        combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
      });
      Object.entries(factionEffects).forEach(([stat, value]) => {
        combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
      });
    }

    // 컨테이너에 렌더링
    const gradeEffectsContainer = document.getElementById(
      "optimalGradeEffects"
    );
    const factionEffectsContainer = document.getElementById(
      "optimalFactionEffects"
    );
    const totalEffectsContainer = document.getElementById(
      "optimalTotalEffects"
    );

    if (gradeEffectsContainer) {
      gradeEffectsContainer.innerHTML = renderEffectsList(
        gradeEffects,
        gradeSetInfo,
        true
      );
    }

    if (factionEffectsContainer) {
      factionEffectsContainer.innerHTML = renderEffectsList(
        factionEffects,
        factionSetInfo,
        true
      );
    }

    if (totalEffectsContainer) {
      totalEffectsContainer.innerHTML = renderEffectsList(
        combinedEffects,
        "",
        true
      );
    }

    renderSpiritDetailsTable(spirits);
    initializeAds(document.getElementById("optimalModal"));
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // function findOptimalCombination() {
  //   const currentCategory = lastActiveCategory;
  //   const categorySpirits = selectedSpirits.filter(
  //     (spirit) => spirit.category === currentCategory
  //   );

  //   if (categorySpirits.length === 0) {
  //     alert("최적 조합을 찾으려면 환수를 선택하세요.");
  //     return;
  //   }

  //   isProcessing = true;
  //   isCalculationCancelled = false;

  //   const optimalModal = document.getElementById("optimalModal");
  //   optimalModal.style.display = "flex";
  //   document.body.style.overflow = "hidden";
  //   isModalOpen = true;

  //   document.getElementById("optimalModalContent").innerHTML = `
  //     <div class="calculating-wrapper">
  //       <div class="calculating-box">
  //         <div class="calculating-spinner"></div>
  //         <h3>최적 조합 계산 중...</h3>
  //         <p>환수 조합을 계산하고 있습니다. 환수 수에 따라 시간이 걸릴 수 있습니다.</p>
  //         <button id="cancelCalcBtn" class="cancel-calc-btn">계산 취소</button>
  //       </div>
  //     </div>
  //   `;

  //   document
  //     .getElementById("cancelCalcBtn")
  //     .addEventListener("click", function () {
  //       isCalculationCancelled = true;
  //       document.querySelector(".calculating-box h3").textContent =
  //         "계산이 취소되었습니다";
  //     });

  //   const calcStyle = document.createElement("style");
  //   calcStyle.id = "calc-style";
  //   calcStyle.textContent = `
  //     .calculating-wrapper {
  //       display: flex;
  //       justify-content: center;
  //       align-items: center;
  //       min-height: 300px;
  //     }
  //     .calculating-box {
  //       text-align: center;
  //       padding: 30px;
  //       background: #f8f8f8;
  //       border-radius: 10px;
  //       box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  //       max-width: 400px;
  //     }
  //     .calculating-spinner {
  //       border: 5px solid #f3f3f3;
  //       border-top: 5px solid #3498db;
  //       border-radius: 50%;
  //       width: 50px;
  //       height: 50px;
  //       animation: spin 1s linear infinite;
  //       margin: 0 auto 20px;
  //     }
  //     @keyframes spin {
  //       0% { transform: rotate(0deg); }
  //       100% { transform: rotate(360deg); }
  //     }
  //     .cancel-calc-btn {
  //       margin-top: 20px;
  //       padding: 10px 20px;
  //       background: #e74c3c;
  //       color: white;
  //       border: none;
  //       border-radius: 5px;
  //       cursor: pointer;
  //       font-weight: bold;
  //     }
  //   `;
  //   document.head.appendChild(calcStyle);

  //   setTimeout(() => {
  //     try {
  //       const { invalidSpirits, spiritsWithSuggestions } =
  //         checkSpiritLevelData();
  //       if (invalidSpirits.length > 0) {
  //         const warning = showLevelDataWarning(
  //           invalidSpirits,
  //           spiritsWithSuggestions
  //         );
  //         if (warning) {
  //           document.getElementById("optimalModalContent").innerHTML = `
  //             <div class="warning-dialog">
  //               <h3>데이터 경고</h3>
  //               <div class="warning-content">${warning}</div>
  //               <div class="warning-buttons">
  //                 <button id="continueBtn" class="continue-btn">계속 진행</button>
  //                 <button id="cancelBtn" class="cancel-btn">취소</button>
  //               </div>
  //             </div>
  //           `;

  //           const warningStyle = document.createElement("style");
  //           warningStyle.textContent = `
  //             .warning-dialog {
  //               padding: 20px;
  //               background: #fff;
  //               border-radius: 10px;
  //               max-width: 600px;
  //               margin: 0 auto;
  //             }
  //             .warning-content {
  //               margin: 20px 0;
  //               padding: 15px;
  //               background: #fff3cd;
  //               border-left: 5px solid #ffc107;
  //             }
  //             .warning-buttons {
  //               display: flex;
  //               justify-content: center;
  //               gap: 15px;
  //             }
  //             .continue-btn, .cancel-btn {
  //               padding: 8px 16px;
  //               border: none;
  //               border-radius: 4px;
  //               cursor: pointer;
  //               font-weight: bold;
  //             }
  //             .continue-btn {
  //               background: #4caf50;
  //               color: white;
  //             }
  //             .cancel-btn {
  //               background: #f44336;
  //               color: white;
  //             }
  //           `;
  //           document.head.appendChild(warningStyle);

  //           document
  //             .getElementById("continueBtn")
  //             .addEventListener("click", function () {
  //               setTimeout(runActualCalculation, 100);
  //             });

  //           document
  //             .getElementById("cancelBtn")
  //             .addEventListener("click", function () {
  //               closeOptimalModal();
  //               isProcessing = false;
  //             });
  //         } else {
  //           runActualCalculation();
  //         }
  //       } else {
  //         runActualCalculation();
  //       }
  //     } catch (error) {
  //       console.error("Error starting calculation:", error);
  //       document.getElementById("optimalModalContent").innerHTML = `
  //         <div class="error-message">
  //           <h3>오류 발생</h3>
  //           <p>계산 준비 중 오류가 발생했습니다: ${
  //             error.message || "알 수 없는 오류"
  //           }</p>
  //           <button onclick="BondCalculatorApp.closeOptimalModal()" class="close-btn">닫기</button>
  //         </div>
  //       `;
  //       isProcessing = false;
  //     }
  //   }, 100);
  // }

  // function runActualCalculation() {
  //   const currentCategory = lastActiveCategory;
  //   const categorySpirits = selectedSpirits.filter(
  //     (spirit) => spirit.category === currentCategory
  //   );

  //   document.getElementById("optimalModalContent").innerHTML = `
  //     <h3 class="modal-title">최적 결속 조합 결과 (최대 6개)</h3>
  //     <div class="modal-content">
  //       <div class="ad-row">
  //         <div class="ad-container-left">
  //             <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-sgK0ytXrL3f7EHRF"
  //                 data-ad-width="728" data-ad-height="90"></ins>
  //         </div>
  //       </div>
  //       <div class="ad-container mobile-ad">
  //         <ins class="kakao_ad_area" style="display:none;" data-ad-unit="DAN-TPesUrzJaxJ008Lm"
  //             data-ad-width="320" data-ad-height="50"></ins>
  //         </div>
  //       <div id="optimalHeader" class="optimal-header">
  //         <div class="optimal-score">
  //           <h4>환산합산: <span id="optimalScore">계산 중...</span></h4>
  //           <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small><br />
  //           <small>환산 합산은 등급 결속 효과 + 세력 결속 효과 + 각 환수 능력치이며 장착효과는 포함하지 않습니다.</small>
  //         </div>
  //       </div>

  //       <div class="action-buttons">
  //         <button id="clearHistoryButton" class="clear-history-btn">${currentCategory} 기록 삭제</button>
  //       </div>

  //       <div id="optimalSpiritsList" class="selected-spirits-info">
  //         <div class='processing-message'>
  //           <div class="calculating-spinner-small"></div>
  //           최적 조합을 찾는 중입니다... (0%)
  //           <div style="margin-top: 10px;">
  //             <button id="cancelCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
  //           </div>
  //         </div>
  //       </div>

  //       <div class="results-container">
  //         <div class="results-section">
  //           <h4>등급 결속 효과</h4>
  //           <div id="optimalGradeEffects" class="effects-list">
  //             <div class="calculating">계산 중...</div>
  //           </div>
  //         </div>
  //         <div class="results-section">
  //           <h4>세력 결속 효과</h4>
  //           <div id="optimalFactionEffects" class="effects-list">
  //             <div class="calculating">계산 중...</div>
  //           </div>
  //         </div>
  //         <div class="results-section">
  //           <h4>총 결속 효과 (*장착효과 제외)</h4>
  //           <div id="optimalTotalEffects" class="effects-list">
  //             <div class="calculating">계산 중...</div>
  //           </div>
  //         </div>
  //       </div>

  //       <div id="optimalSpiritsDetails" class="spirit-details-container">
  //         <h4>선택된 환수 상세 스탯</h4>
  //         <div id="spiritStatsDetails" class="spirit-stats-grid">
  //           <div class="calculating">계산 중...</div>
  //         </div>
  //       </div>
  //     </div>
  //   `;

  //   const style = document.createElement("style");
  //   style.textContent = `
  //     .calculating {
  //       padding: 10px;
  //       background-color: #f1f8fe;
  //       color: #3498db;
  //       border-left: 3px solid #3498db;
  //       font-style: italic;
  //       text-align: center;
  //       margin: 10px 0;
  //     }
  //     .processing-message {
  //       text-align: center;
  //       padding: 20px;
  //       background-color: #f8f9fa;
  //       border-radius: 8px;
  //       margin-bottom: 15px;
  //       font-weight: bold;
  //       color: #3498db;
  //     }
  //     .calculating-spinner-small {
  //       border: 4px solid #f3f3f3;
  //       border-top: 4px solid #3498db;
  //       border-radius: 50%;
  //       width: 20px;
  //       height: 20px;
  //       animation: spin 1s linear infinite;
  //       margin: 0 auto 10px;
  //     }
  //     .warning-message {
  //       padding: 15px;
  //       background-color: #fff3cd;
  //       border-left: 3px solid #ffc107;
  //       color: #856404;
  //       margin: 10px 0;
  //       border-radius: 4px;
  //     }
  //     .no-effects {
  //       color: #6c757d;
  //       font-style: italic;
  //       padding: 10px;
  //       text-align: center;
  //     }

  //     .smart-filtering-info {
  //         background-color: #f8f9fa;
  //         padding: 20px;
  //         border-radius: 8px;
  //         margin-bottom: 20px;
  //         box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  //     }
  //     .filtering-phases {
  //         display: flex;
  //         justify-content: space-between;
  //         margin: 15px 0;
  //     }
  //     .phase {
  //         flex: 1;
  //         text-align: center;
  //         padding: 10px;
  //         border-radius: 5px;
  //         background-color: #e9ecef;
  //         margin: 0 5px;
  //         color: #6c757d;
  //         font-size: 14px;
  //         position: relative;
  //     }
  //     .phase::after {
  //         content: '';
  //         position: absolute;
  //         right: -15px;
  //         top: 50%;
  //         transform: translateY(-50%);
  //         width: 0;
  //         height: 0;
  //         border-top: 6px solid transparent;
  //         border-left: 10px solid #e9ecef;
  //         border-bottom: 6px solid transparent;
  //     }
  //     .phase:last-child::after {
  //         display: none;
  //     }
  //     .phase.active {
  //         background-color: #007bff;
  //         color: white;
  //         font-weight: bold;
  //     }
  //     .phase.active::after {
  //         border-left-color: #007bff;
  //     }
  //     .phase.completed {
  //         background-color: #28a745;
  //         color: white;
  //     }
  //     .phase.completed::after {
  //         border-left-color: #28a745;
  //     }
  //     .spirit-category-counts {
  //         display: flex;
  //         justify-content: space-around;
  //         margin: 15px 0;
  //         flex-wrap: wrap;
  //     }
  //     .spirit-count {
  //         background-color: #e3f2fd;
  //         padding: 8px 15px;
  //         border-radius: 20px;
  //         font-weight: bold;
  //         margin: 5px;
  //     }
  //     .filtering-info {
  //         background-color: #fff3cd;
  //         padding: 10px;
  //         border-radius: 5px;
  //         font-style: italic;
  //         text-align: center;
  //         margin: 10px 0;
  //     }

  //     @keyframes spin {
  //       0% { transform: rotate(0deg); }
  //       100% { transform: rotate(360deg); }
  //     }
  //   `;
  //   document.head.appendChild(style);

  //   document
  //     .getElementById("cancelCalculationBtn")
  //     .addEventListener("click", function () {
  //       isCalculationCancelled = true;
  //       document.getElementById("optimalSpiritsList").innerHTML =
  //         "<div class='warning-message'>계산이 중단되었습니다. 현재까지 찾은 최적 조합을 표시합니다.</div>";
  //     });

  //   document
  //     .getElementById("clearHistoryButton")
  //     .addEventListener("click", function () {
  //       clearSavedOptimalCombinations();
  //     });

  //   renderHistoryTabs(currentCategory);

  //   if (
  //     savedOptimalCombinations[currentCategory] &&
  //     savedOptimalCombinations[currentCategory].length > 0
  //   ) {
  //     currentActiveIndex = savedOptimalCombinations[currentCategory].length - 1;
  //     showSingleOptimalResult(
  //       savedOptimalCombinations[currentCategory][currentActiveIndex]
  //     );
  //   }

  //   const isMobile = window.innerWidth <= 768;
  //   if (isMobile) {
  //     document
  //       .querySelectorAll("#optimalModal .mobile-ad .kakao_ad_area")
  //       .forEach((ad) => {
  //         ad.style.display = "block";
  //       });
  //     document
  //       .querySelectorAll(
  //         "#optimalModal .ad-container-left .kakao_ad_area, #optimalModal .ad-container-right .kakao_ad_area"
  //       )
  //       .forEach((ad) => {
  //         ad.style.display = "none";
  //       });
  //   } else {
  //     document
  //       .querySelectorAll("#optimalModal .ad-container-left .kakao_ad_area")
  //       .forEach((ad) => {
  //         ad.style.display = "block";
  //       });
  //     document
  //       .querySelectorAll(
  //         "#optimalModal .mobile-ad .kakao_ad_area, #optimalModal .ad-container-right .kakao_ad_area"
  //       )
  //       .forEach((ad) => {
  //         ad.style.display = "none";
  //       });
  //   }

  //   if (window.adfit) {
  //     window.adfit();
  //   } else {
  //     const adScript = document.createElement("script");
  //     adScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
  //     adScript.async = true;
  //     document.body.appendChild(adScript);
  //   }

  //   setTimeout(() => {
  //     try {
  //       const validSpirits = categorySpirits
  //         .filter((spirit) => {
  //           const levelStats = spirit.stats?.find(
  //             (s) => s.level === spirit.level
  //           )?.registrationStat;
  //           return levelStats !== undefined;
  //         })
  //         .map((spirit) => {
  //           const copy = JSON.parse(JSON.stringify(spirit));
  //           copy.category = spirit.category;
  //           copy.grade = spirit.grade || "전설";
  //           copy.faction = spirit.influence || spirit.faction || "결의";
  //           return copy;
  //         });

  //       if (validSpirits.length === 0) {
  //         throw new Error("유효한 환수 데이터가 없습니다.");
  //       }

  //       if (validSpirits.length <= 20) {
  //         console.log(`환수 ${validSpirits.length}개: 완전 탐색 방식(A) 사용`);
  //         runMethodA(validSpirits);
  //       } else {
  //         console.log(
  //           `환수 ${validSpirits.length}개: 스마트 필터링 방식(B) 사용`
  //         );
  //         runMethodB(validSpirits);
  //       }
  //     } catch (error) {
  //       console.error("Error finding optimal combination:", error);
  //       document.getElementById(
  //         "optimalSpiritsList"
  //       ).innerHTML = `<div class='warning-message'>${
  //         error.message || "조합을 찾는 중 오류가 발생했습니다."
  //       }</div>`;
  //       document.getElementById("optimalScore").textContent = "오류";
  //       isProcessing = false;
  //     }
  //   }, 100);
  // }

  // function runMethodA(validSpirits) {
  //   const maxCombinationSize = Math.min(6, validSpirits.length);
  //   let totalCombinations = 0;
  //   for (let size = 1; size <= maxCombinationSize; size++) {
  //     totalCombinations += binomialCoefficient(validSpirits.length, size);
  //   }

  //   let processedCombinations = 0;
  //   let bestResult = null;

  //   const updateProgress = (progress) => {
  //     if (!isCalculationCancelled) {
  //       document.getElementById(
  //         "optimalSpiritsList"
  //       ).innerHTML = `<div class='processing-message'>
  //           <div class="calculating-spinner-small"></div>
  //           최적 조합을 찾는 중입니다... (${Math.round(progress * 100)}%)
  //           <div style="margin-top: 10px;">
  //             <button id="cancelCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
  //           </div>
  //         </div>`;

  //       document
  //         .getElementById("cancelCalculationBtn")
  //         .addEventListener("click", function () {
  //           isCalculationCancelled = true;
  //           document.getElementById("optimalSpiritsList").innerHTML =
  //             "<div class='warning-message'>계산이 중단되었습니다. 현재까지 찾은 최적 조합을 표시합니다.</div>";
  //         });
  //     }
  //   };

  //   function processInBatches(
  //     sizeIndex,
  //     combinationIndex,
  //     batchSize,
  //     validSpirits,
  //     sizes,
  //     combinations
  //   ) {
  //     if (sizeIndex >= sizes.length || isCalculationCancelled) {
  //       if (bestResult) {
  //         const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
  //         addNewOptimalCombination(deepCopiedResult);
  //         saveSavedOptimalCombinations();
  //         const category = bestResult.spirits[0]?.category || currentCategory;
  //         currentActiveIndex = savedOptimalCombinations[category].length - 1;
  //         renderHistoryTabs(category);
  //         showSingleOptimalResult(bestResult);
  //       } else {
  //         document.getElementById("optimalSpiritsList").innerHTML =
  //           "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
  //       }
  //       isProcessing = false;
  //       return;
  //     }

  //     const size = sizes[sizeIndex];
  //     if (combinationIndex === 0) {
  //       combinations = generateCombinations(validSpirits, size);
  //     }

  //     const endIndex = Math.min(
  //       combinationIndex + batchSize,
  //       combinations.length
  //     );

  //     for (let i = combinationIndex; i < endIndex; i++) {
  //       const combination = combinations[i];
  //       const result = calculateEffectsForSpirits(combination);

  //       processedCombinations++;

  //       if (processedCombinations % 20 === 0) {
  //         updateProgress(processedCombinations / totalCombinations);
  //       }

  //       if (!bestResult || result.score > bestResult.score) {
  //         bestResult = result;
  //       } else if (result.score === bestResult.score) {
  //         const currentImmortalCount = countGradeInResult(result, "불멸");
  //         const bestImmortalCount = countGradeInResult(bestResult, "불멸");

  //         if (currentImmortalCount > bestImmortalCount) {
  //           bestResult = result;
  //         } else if (currentImmortalCount === bestImmortalCount) {
  //           const currentGradeTypes = countGradeTypesInResult(result);
  //           const bestGradeTypes = countGradeTypesInResult(bestResult);

  //           if (currentGradeTypes > bestGradeTypes) {
  //             bestResult = result;
  //           }
  //         }
  //       }
  //     }

  //     if (endIndex < combinations.length) {
  //       setTimeout(() => {
  //         processInBatches(
  //           sizeIndex,
  //           endIndex,
  //           batchSize,
  //           validSpirits,
  //           sizes,
  //           combinations
  //         );
  //       }, 0);
  //     } else {
  //       setTimeout(() => {
  //         processInBatches(
  //           sizeIndex + 1,
  //           0,
  //           batchSize,
  //           validSpirits,
  //           sizes,
  //           null
  //         );
  //       }, 0);
  //     }
  //   }

  //   const sizes = [];
  //   for (let size = maxCombinationSize; size >= 1; size--) {
  //     sizes.push(size);
  //   }

  //   const batchSize = 50;
  //   processInBatches(0, 0, batchSize, validSpirits, sizes, null);
  // }

  // function runMethodB(validSpirits) {
  //   const filteringInfoContainer = document.createElement("div");
  //   filteringInfoContainer.className = "smart-filtering-info";
  //   filteringInfoContainer.innerHTML = `
  //     <h4>스마트 필터링으로 계산 중</h4>
  //     <div class="filtering-info">환수 수가 많아 효율적인 스마트 필터링을 적용합니다</div>
  //     <div class="filtering-phases">
  //       <div class="phase active" id="phase1">1. 환수 평가</div>
  //       <div class="phase" id="phase2">2. 후보군 선정</div>
  //       <div class="phase" id="phase3">3. 조합 최적화</div>
  //       <div class="phase" id="phase4">4. 최종 검증</div>
  //     </div>
  //     <div id="phaseDescription" class="filtering-info">
  //       환수 개별 성능을 평가 중입니다...
  //     </div>
  //   `;

  //   document.getElementById("optimalSpiritsList").innerHTML = "";
  //   document
  //     .getElementById("optimalSpiritsList")
  //     .appendChild(filteringInfoContainer);

  //   const formattedSpirits = validSpirits.map((spirit) => ({
  //     name: spirit.name,
  //     image: spirit.image,
  //     category: spirit.category,
  //     grade: spirit.grade || "전설",
  //     faction: spirit.influence || spirit.faction || "결의",
  //     level: spirit.level,
  //     stats: spirit.stats,
  //     isFixedLevel: spirit.isFixedLevel,
  //   }));

  //   updatePhase("phase1", "환수 개별 성능을 평가 중입니다...");
  //   setTimeout(() => {
  //     const rankedSpirits = rankSpirits(formattedSpirits);
  //     displayInitialSpiritRanking(rankedSpirits);

  //     updatePhase("phase2", "최적 조합 후보군을 선정 중입니다...");

  //     setTimeout(() => {
  //       updatePhase("phase3", "후보 조합을 최적화 중입니다...");

  //       setTimeout(() => {
  //         if (window.Worker) {
  //           optimizeWithSmartFiltering(rankedSpirits);
  //         } else {
  //           optimizeWithoutWorkerSmartFiltering(rankedSpirits);
  //         }
  //       }, 300);
  //     }, 300);
  //   }, 300);
  // }

  // function updatePhase(currentPhaseId, description) {
  //   document.querySelectorAll(".filtering-phases .phase").forEach((phase) => {
  //     phase.classList.remove("active");
  //     phase.classList.remove("completed");
  //   });

  //   const phaseElement = document.getElementById(currentPhaseId);
  //   if (phaseElement) {
  //     phaseElement.classList.add("active");

  //     const phaseNumber = parseInt(currentPhaseId.replace("phase", ""));
  //     for (let i = 1; i < phaseNumber; i++) {
  //       const prevPhase = document.getElementById(`phase${i}`);
  //       if (prevPhase) {
  //         prevPhase.classList.add("completed");
  //       }
  //     }
  //   }

  //   const descriptionElement = document.getElementById("phaseDescription");
  //   if (descriptionElement && description) {
  //     descriptionElement.textContent = description;
  //   }
  // }

  // function rankSpirits(spirits) {
  //   return spirits
  //     .map((spirit) => {
  //       const levelStat =
  //         spirit.stats?.find((s) => s.level === spirit.level)
  //           ?.registrationStat || {};

  //       const score =
  //         (levelStat.damageResistancePenetration || 0) +
  //         (levelStat.damageResistance || 0) +
  //         (levelStat.pvpDamagePercent || 0) * 10 +
  //         (levelStat.pvpDefensePercent || 0) * 10;

  //       return {
  //         ...spirit,
  //         score: score,
  //         calculatedStats: levelStat,
  //       };
  //     })
  //     .sort((a, b) => b.score - a.score);
  // }

  // function displayInitialSpiritRanking(rankedSpirits) {
  //   const pvpSpirits = rankedSpirits.filter((spirit) =>
  //     hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
  //   );

  //   const resistanceSpirits = rankedSpirits.filter(
  //     (spirit) =>
  //       !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"]) &&
  //       hasCriticalStat(spirit, [
  //         "damageResistancePenetration",
  //         "damageResistance",
  //       ])
  //   );

  //   const otherSpirits = rankedSpirits.filter(
  //     (spirit) =>
  //       !hasCriticalStat(spirit, [
  //         "pvpDamagePercent",
  //         "pvpDefensePercent",
  //         "damageResistancePenetration",
  //         "damageResistance",
  //       ])
  //   );

  //   const infoHTML = `
  //     <div class="smart-filtering-info">
  //         <h4>스마트 필터링 준비 완료 (20개 초과 선택 시 작동)</h4>
  //         <p><strong>선택된 환수:</strong> ${rankedSpirits.length}개</p>
  //         <div class="spirit-category-counts">
  //             <div class="spirit-count">대피/대방% 환수: ${pvpSpirits.length}개</div>
  //             <div class="spirit-count">피저/피저관 환수: ${resistanceSpirits.length}개</div>
  //             <div class="spirit-count">기타 환수: ${otherSpirits.length}개</div>
  //         </div>
  //         <p class="filtering-info">환수들을 기여도에 따라 분석하여 모든 환수를 고려한 최적화된 계산을 수행합니다.</p>
  //         <div class="filtering-phases">
  //             <div class="phase active" id="phase0">준비 완료</div>
  //             <div class="phase" id="phase1">1단계: 상위 점수 환수 분석</div>
  //             <div class="phase" id="phase2">2단계: 균형 환수 분석</div>
  //             <div class="phase" id="phase3">3단계: 전체 환수 분석</div>
  //         </div>
  //         <div class="progress-bar-container">
  //             <div class="progress-bar" id="calculation-progress-bar" style="width:0%"></div>
  //         </div>
  //         <div id="calculation-status">계산 시작 준비 완료</div>
  //     </div>
  //   `;

  //   document.getElementById("optimalSpiritsList").innerHTML = infoHTML;
  // }

  // function updateCalculationPhase(phaseIndex) {
  //   document.querySelectorAll(".phase").forEach((el, idx) => {
  //     el.classList.remove("active", "completed");
  //     if (idx < phaseIndex) {
  //       el.classList.add("completed");
  //     } else if (idx === phaseIndex) {
  //       el.classList.add("active");
  //     }
  //   });

  //   const statusText = document.getElementById("calculation-status");
  //   if (statusText) {
  //     switch (phaseIndex) {
  //       case 0:
  //         statusText.textContent = "계산 시작 준비 완료";
  //         break;
  //       case 1:
  //         statusText.textContent = "1단계: 상위 점수 환수 분석 중...";
  //         break;
  //       case 2:
  //         statusText.textContent = "2단계: 균형 환수 조합 분석 중...";
  //         break;
  //       case 3:
  //         statusText.textContent = "3단계: 전체 환수 분석 중...";
  //         break;
  //       case 4:
  //         statusText.textContent = "계산 완료!";
  //         break;
  //       default:
  //         statusText.textContent = "계산 진행 중...";
  //     }
  //   }
  // }

  // function hasCriticalStat(spirit, statKeys) {
  //   if (!spirit.stats || !Array.isArray(spirit.stats)) return false;

  //   const levelStat = spirit.stats.find((s) => s.level === spirit.level);
  //   if (!levelStat || !levelStat.registrationStat) return false;

  //   const stats = levelStat.registrationStat;
  //   return statKeys.some((key) => {
  //     const value = parseFloat(stats[key] || 0);
  //     return value > 0;
  //   });
  // }

  // function optimizeWithSmartFiltering(rankedSpirits) {
  //   console.log("=== 스마트 필터링 시작 ===");
  //   console.log(`총 환수 수: ${rankedSpirits.length}개`);

  //   const totalSpirits = rankedSpirits.length;
  //   let bestResultOverall = null;
  //   let processedResultCount = 0;

  //   updateCalculationPhase(0);

  //   const topRankedSpirits = rankedSpirits.slice(0, Math.min(25, totalSpirits));
  //   console.log(`상위 점수 환수: ${topRankedSpirits.length}개 선택됨`);

  //   const pvpSpirits = rankedSpirits
  //     .filter((spirit) =>
  //       hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
  //     )
  //     .slice(0, 15);
  //   console.log(`대피/대방% 환수: ${pvpSpirits.length}개`);

  //   const resistanceSpirits = rankedSpirits
  //     .filter(
  //       (spirit) =>
  //         hasCriticalStat(spirit, [
  //           "damageResistancePenetration",
  //           "damageResistance",
  //         ]) &&
  //         !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
  //     )
  //     .slice(0, 15);
  //   console.log(`피저/피저관 환수: ${resistanceSpirits.length}개`);

  //   const otherSpirits = rankedSpirits
  //     .filter(
  //       (spirit) =>
  //         !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"]) &&
  //         !hasCriticalStat(spirit, [
  //           "damageResistancePenetration",
  //           "damageResistance",
  //         ])
  //     )
  //     .slice(0, 15);
  //   console.log(`기타 환수: ${otherSpirits.length}개`);

  //   const mixedSpirits = [
  //     ...new Set([...pvpSpirits, ...resistanceSpirits, ...otherSpirits]),
  //   ];
  //   console.log(`균형 그룹 환수: ${mixedSpirits.length}개 (중복 제거)`);

  //   const workerBlob = new Blob([getWorkerCode()], {
  //     type: "application/javascript",
  //   });
  //   const workerUrl = URL.createObjectURL(workerBlob);
  //   const worker = new Worker(workerUrl);

  //   let currentPhase = 1;
  //   const phases = [
  //     {
  //       spirits: topRankedSpirits,
  //       maxSize: 6,
  //       name: "상위 점수 환수",
  //       phaseId: "phase1",
  //     },
  //     {
  //       spirits: mixedSpirits,
  //       maxSize: 6,
  //       name: "균형 환수 조합",
  //       phaseId: "phase2",
  //     },
  //     {
  //       spirits: rankedSpirits.slice(0, Math.min(40, totalSpirits)),
  //       maxSize: 6,
  //       name: "전체 환수",
  //       phaseId: "phase3",
  //     },
  //   ];

  //   worker.onmessage = function (e) {
  //     const { type, results, progress, processedCount, error, message } =
  //       e.data;

  //     if (type === "log") {
  //       console.log(`[Worker] ${message}`);
  //       return;
  //     }

  //     if (type === "error") {
  //       console.error("Worker error:", error);
  //       document.getElementById(
  //         "calculation-status"
  //       ).textContent = `오류 발생: ${error.substring(0, 50)}...`;
  //       finishCalculation();
  //       return;
  //     }

  //     if (type === "progress") {
  //       const progressBar = document.getElementById("calculation-progress-bar");
  //       const statusText = document.getElementById("calculation-status");
  //       const currentPhaseName = phases[currentPhase - 1].name;

  //       if (progressBar && statusText) {
  //         const percentage = Math.round(progress * 100);
  //         progressBar.style.width = `${percentage}%`;
  //         statusText.textContent = `${currentPhaseName} 분석 중 (${percentage}%)`;

  //         if (percentage % 20 === 0) {
  //           console.log(`${currentPhaseName} 분석: ${percentage}% 완료`);
  //         }
  //       }

  //       processedResultCount += processedCount || 0;
  //     } else if (type === "result") {
  //       console.log(`=== ${phases[currentPhase - 1].name} 분석 완료 ===`);

  //       if (Array.isArray(results) && results.length > 0) {
  //         console.log(`- 분석된 조합 수: ${results.length}`);

  //         let bestPhaseResult = results[0];
  //         for (let i = 1; i < results.length; i++) {
  //           if (results[i].score > bestPhaseResult.score) {
  //             bestPhaseResult = results[i];
  //           }
  //         }

  //         bestPhaseResult.phaseName = phases[currentPhase - 1].name;
  //         bestPhaseResult.phaseId = phases[currentPhase - 1].phaseId;

  //         console.log(`- 현재 단계 최고 점수: ${bestPhaseResult.score}`);
  //         console.log(`- 환수 구성: ${bestPhaseResult.spirits.length}개`);

  //         if (
  //           !bestResultOverall ||
  //           bestPhaseResult.score > bestResultOverall.score
  //         ) {
  //           console.log(`- 새 최적 조합 발견! 점수: ${bestPhaseResult.score}`);
  //           bestResultOverall = bestPhaseResult;
  //           document.getElementById("optimalScore").textContent =
  //             bestPhaseResult.score;
  //         }
  //       } else {
  //         console.log(`- 결과 없음`);
  //       }

  //       currentPhase++;
  //       updateCalculationPhase(currentPhase);

  //       if (currentPhase <= phases.length && !isCalculationCancelled) {
  //         const phaseIndex = currentPhase - 1;
  //         console.log(
  //           `\n=== ${phases[phaseIndex].name} 분석 시작 (phase ${currentPhase}) ===`
  //         );
  //         console.log(`- 환수 수: ${phases[phaseIndex].spirits.length}`);
  //         console.log(`- 최대 조합 크기: ${phases[phaseIndex].maxSize}`);

  //         worker.postMessage({
  //           spirits: phases[phaseIndex].spirits,
  //           maxCombinationSize: phases[phaseIndex].maxSize,
  //           factionSetEffects: factionSetEffects,
  //         });
  //       } else {
  //         finishCalculation();
  //       }
  //     }
  //   };

  //   console.log(`=== ${phases[0].name} 분석 시작 (phase 1) ===`);
  //   console.log(`- 환수 수: ${phases[0].spirits.length}개`);
  //   console.log(`- 최대 조합 크기: ${phases[0].maxSize}`);

  //   worker.postMessage({
  //     spirits: phases[0].spirits,
  //     maxCombinationSize: phases[0].maxSize,
  //     factionSetEffects: factionSetEffects,
  //   });

  //   function finishCalculation() {
  //     worker.terminate();
  //     URL.revokeObjectURL(workerUrl);
  //     console.log("웹 워커 종료됨");

  //     updateCalculationPhase(4);

  //     const calcStatus = document.getElementById("calculation-status");
  //     if (calcStatus) {
  //       calcStatus.innerHTML =
  //         '계산 완료! <span class="calculation-complete-icon">✓</span>';
  //       calcStatus.classList.add("calculation-complete");
  //     }

  //     if (bestResultOverall) {
  //       console.log("\n=== 최종 결과 ===");
  //       console.log(`- 최종 점수: ${bestResultOverall.score}`);
  //       console.log(`- 최적 환수 수: ${bestResultOverall.spirits.length}개`);
  //       console.log(
  //         `- 선택된 환수: ${bestResultOverall.spirits
  //           .map((s) => s.name)
  //           .join(", ")}`
  //       );

  //       const deepCopiedResult = JSON.parse(JSON.stringify(bestResultOverall));
  //       addNewOptimalCombination(deepCopiedResult);
  //       saveSavedOptimalCombinations();

  //       const category =
  //         bestResultOverall.spirits[0]?.category || lastActiveCategory;
  //       currentActiveIndex = savedOptimalCombinations[category].length - 1;
  //       renderHistoryTabs(category);
  //       showSingleOptimalResult(bestResultOverall);
  //     } else {
  //       console.log("=== 최적 조합을 찾을 수 없음 ===");
  //       document.getElementById("optimalSpiritsList").innerHTML =
  //         "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
  //     }

  //     console.log("=== 스마트 필터링 종료 ===");
  //     isProcessing = false;
  //   }
  // }

  // function optimizeWithoutWorkerSmartFiltering(rankedSpirits) {
  //   console.log("=== 스마트 필터링 시작 (워커 미지원) ===");
  //   console.log(`총 환수 수: ${rankedSpirits.length}개`);

  //   const totalSpirits = rankedSpirits.length;
  //   let bestResult = null;

  //   const topSpirits = rankedSpirits.slice(0, Math.min(15, totalSpirits));
  //   console.log(`상위 점수 환수: ${topSpirits.length}개 선택됨`);

  //   document.getElementById("calculation-status").textContent =
  //     "웹 워커를 지원하지 않습니다. 상위 환수만 계산합니다...";

  //   setTimeout(() => {
  //     console.log("조합 생성 시작");
  //     const combinations = generateCombinations(
  //       topSpirits,
  //       Math.min(6, topSpirits.length)
  //     );
  //     console.log(`생성된 조합 수: ${combinations.length}개`);

  //     console.log("조합 분석 시작");
  //     combinations.forEach((combination, index) => {
  //       const result = calculateEffectsForSpirits(combination);

  //       if (!bestResult || result.score > bestResult.score) {
  //         console.log(
  //           `새 최적 조합 발견: 점수 ${result.score} (환수 ${combination.length}개)`
  //         );
  //         bestResult = result;
  //       }

  //       if (index % 100 === 0) {
  //         const progress = (index / combinations.length) * 100;
  //         const progressBar = document.getElementById(
  //           "calculation-progress-bar"
  //         );
  //         if (progressBar) {
  //           progressBar.style.width = `${Math.round(progress)}%`;
  //         }

  //         if (index % 500 === 0) {
  //           console.log(
  //             `분석 진행 중: ${Math.round(progress)}% 완료 (${index}/${
  //               combinations.length
  //             })`
  //           );
  //         }
  //       }
  //     });

  //     console.log("조합 분석 완료");

  //     if (bestResult) {
  //       console.log("\n=== 최종 결과 ===");
  //       console.log(`- 최종 점수: ${bestResult.score}`);
  //       console.log(`- 최적 환수 수: ${bestResult.spirits.length}개`);
  //       console.log(
  //         `- 선택된 환수: ${bestResult.spirits.map((s) => s.name).join(", ")}`
  //       );

  //       addNewOptimalCombination(bestResult);
  //       saveSavedOptimalCombinations();

  //       const category = bestResult.spirits[0]?.category || lastActiveCategory;
  //       currentActiveIndex = savedOptimalCombinations[category].length - 1;
  //       renderHistoryTabs(category);
  //       showSingleOptimalResult(bestResult);
  //     } else {
  //       console.log("최적 조합을 찾을 수 없음");
  //       document.getElementById("optimalSpiritsList").innerHTML =
  //         "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
  //     }

  //     console.log("=== 스마트 필터링 종료 (워커 미지원) ===");
  //     isProcessing = false;
  //   }, 100);
  // }

  // function findValidCombinations(spirits) {
  //   const maxSize = Math.min(6, spirits.length);
  //   let validCombinations = [];

  //   const topSpirits = spirits.slice(0, Math.min(30, spirits.length));

  //   for (let size = maxSize; size >= 1; size--) {
  //     const combinations = generateCombinations(topSpirits, size);
  //     validCombinations = validCombinations.concat(combinations.slice(0, 100));
  //   }

  //   return validCombinations;
  // }

  // function findBestCombination(combinations) {
  //   let bestResult = null;

  //   combinations.forEach((combination, index) => {
  //     const result = calculateEffectsForSpirits(combination);

  //     if (index % 10 === 0) {
  //       updatePhase(
  //         "phase3",
  //         `최적 조합을 검색 중입니다... (${Math.round(
  //           (index / combinations.length) * 100
  //         )}%)`
  //       );
  //     }

  //     if (!bestResult || result.score > bestResult.score) {
  //       bestResult = result;
  //     } else if (result.score === bestResult.score) {
  //       const currentImmortalCount = countGradeInResult(result, "불멸");
  //       const bestImmortalCount = countGradeInResult(bestResult, "불멸");

  //       if (currentImmortalCount > bestImmortalCount) {
  //         bestResult = result;
  //       } else if (currentImmortalCount === bestImmortalCount) {
  //         const currentGradeTypes = countGradeTypesInResult(result);
  //         const bestGradeTypes = countGradeTypesInResult(bestResult);

  //         if (currentGradeTypes > bestGradeTypes) {
  //           bestResult = result;
  //         }
  //       }
  //     }
  //   });

  //   return bestResult;
  // }

  // function getWorkerCode() {
  //   return `
  //     let factionSetEffectsData = {};

  //     function logToMain(message) {
  //       self.postMessage({
  //         type: 'log',
  //         message: message
  //       });
  //     }

  //     self.onmessage = async function(e) {
  //       const { spirits, maxCombinationSize, factionSetEffects } = e.data;

  //       logToMain(\`계산 작업 시작: \${spirits.length}개 환수, 최대 조합 크기: \${maxCombinationSize}\`);

  //       if (factionSetEffects) {
  //         factionSetEffectsData = factionSetEffects;
  //       }

  //       let heartbeatInterval;

  //       try {
  //         if (!spirits || !Array.isArray(spirits) || spirits.length === 0) {
  //           throw new Error("유효한 환수 데이터가 없습니다");
  //         }

  //         const maxSize = maxCombinationSize || 6;

  //         logToMain("조합 생성 시작");
  //         const combinations = generateCombinationsNonRecursive(spirits, maxSize);
  //         const totalCombinations = combinations.length;
  //         logToMain(\`총 \${totalCombinations}개 조합 생성됨\`);

  //         let processedCount = 0;
  //         const batchSize = Math.min(50, Math.ceil(totalCombinations / 100));
  //         const results = [];

  //         heartbeatInterval = setInterval(() => {
  //           self.postMessage({
  //             type: 'progress',
  //             progress: processedCount / totalCombinations,
  //             processedCount: 0,
  //             heartbeat: true
  //           });
  //         }, 2000);

  //         function reportProgress() {
  //           self.postMessage({
  //             type: 'progress',
  //             progress: processedCount / totalCombinations,
  //             processedCount: batchSize
  //           });
  //         }

  //         try {
  //           logToMain("조합 분석 시작");

  //           for (let i = 0; i < combinations.length; i += batchSize) {
  //             const endIdx = Math.min(i + batchSize, combinations.length);
  //             const batch = combinations.slice(i, endIdx);

  //             batch.forEach(combination => {
  //               const result = calculateEffectsForSpirits(combination);
  //               if (result) {
  //                 results.push(result);
  //               }
  //             });

  //             processedCount += batch.length;
  //             reportProgress();

  //             if (Math.floor((i / combinations.length) * 10) !==
  //                 Math.floor(((i - batchSize) / combinations.length) * 10)) {
  //               const percent = Math.floor((i / combinations.length) * 100);
  //               logToMain(\`분석 진행 중: \${percent}% 완료 (\${i}/\${combinations.length})\`);
  //             }

  //             if (i + batchSize < combinations.length) {
  //               await new Promise(resolve => setTimeout(resolve, 0));
  //             }

  //             if (i % (batchSize * 5) === 0) {
  //               await new Promise(resolve => setTimeout(resolve, 0));
  //             }
  //           }

  //           logToMain(\`조합 분석 완료: \${processedCount}개 조합 처리\`);

  //           if (results.length > 0) {
  //             let bestScore = results[0].score;
  //             let bestSpiritCount = results[0].spirits.length;

  //             results.forEach(result => {
  //               if (result.score > bestScore) {
  //                 bestScore = result.score;
  //                 bestSpiritCount = result.spirits.length;
  //               }
  //             });

  //             logToMain(\`최고 점수 조합: \${bestScore} 점 (환수 \${bestSpiritCount}개)\`);
  //           }
  //         } finally {
  //           if (heartbeatInterval) {
  //             clearInterval(heartbeatInterval);
  //           }
  //         }

  //         self.postMessage({
  //           type: 'result',
  //           results: results
  //         });
  //       } catch (error) {
  //         if (heartbeatInterval) {
  //           clearInterval(heartbeatInterval);
  //         }
  //         logToMain(\`오류 발생: \${error.toString()}\`);
  //         self.postMessage({
  //           type: 'error',
  //           error: error.toString(),
  //           stack: error.stack
  //         });
  //       }
  //     };

  //     function generateCombinationsNonRecursive(arr, maxSize) {
  //       const result = [];

  //       for (let size = Math.min(maxSize, arr.length); size >= 1; size--) {
  //         if (size > 1) {
  //           const estimatedCombinations = estimateCombinations(arr.length, size);
  //           if (estimatedCombinations > 1000000) {
  //             console.warn(\`너무 많은 조합: \${estimatedCombinations}개. 계산을 건너뜁니다.\`);
  //             continue;
  //           }
  //         }

  //         const indices = [];
  //         for (let i = 0; i < size; i++) {
  //           indices.push(i);
  //         }

  //         result.push(indices.map(i => arr[i]));

  //         while (true) {
  //           let i = size - 1;
  //           while (i >= 0 && indices[i] === arr.length - size + i) {
  //             i--;
  //           }

  //           if (i < 0) break;

  //           indices[i]++;
  //           for (let j = i + 1; j < size; j++) {
  //             indices[j] = indices[j-1] + 1;
  //           }

  //           result.push(indices.map(i => arr[i]));
  //         }
  //       }

  //       return result;
  //     }

  //     function estimateCombinations(n, k) {
  //       let result = 1;
  //       for (let i = 1; i <= k; i++) {
  //         result *= (n - (i - 1)) / i;
  //       }
  //       return Math.round(result);
  //     }

  //     function calculateEffectsForSpirits(spirits) {
  //       const registrationStats = {};
  //       const gradeCounts = {};
  //       const factionCounts = {};

  //       spirits.forEach(spirit => {
  //         const levelStats = findSpiritStats(spirit);

  //         if (levelStats) {
  //           Object.entries(levelStats).forEach(([stat, value]) => {
  //             const numValue = parseFloat(String(value).replace(/,/g, ""));
  //             if (!isNaN(numValue)) {
  //               const normalizedStat = normalizeStatKey(stat);
  //               registrationStats[normalizedStat] = (registrationStats[normalizedStat] || 0) + numValue;
  //             }
  //           });
  //         }

  //         const category = spirit.category;
  //         const grade = spirit.grade || "전설";
  //         const faction = spirit.faction || spirit.influence || "결의";

  //         if (!gradeCounts[category]) gradeCounts[category] = {};
  //         if (!gradeCounts[category][grade]) gradeCounts[category][grade] = 0;
  //         gradeCounts[category][grade]++;

  //         if (!factionCounts[category]) factionCounts[category] = {};
  //         if (!factionCounts[category][faction]) factionCounts[category][faction] = 0;
  //         factionCounts[category][faction]++;
  //       });

  //       const gradeEffects = calculateGradeSetEffects(gradeCounts);
  //       const factionEffects = calculateFactionSetEffects(factionCounts);

  //       const combinedEffects = { ...registrationStats };

  //       Object.entries(gradeEffects).forEach(([stat, value]) => {
  //         combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
  //       });

  //       Object.entries(factionEffects).forEach(([stat, value]) => {
  //         combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
  //       });

  //       const score = calculateScore(combinedEffects);

  //       return {
  //         spirits,
  //         gradeEffects,
  //         factionEffects,
  //         combinedEffects,
  //         score,
  //         gradeCounts,
  //         factionCounts
  //       };
  //     }

  //     function findSpiritStats(spirit) {
  //       if (!spirit) return null;
  //       if (!spirit.stats || !Array.isArray(spirit.stats)) return null;

  //       const level = spirit.level || 0;
  //       let levelStat = null;

  //       try {
  //         levelStat = spirit.stats.find(s => s && s.level === level);
  //         if (levelStat && levelStat.registrationStat) {
  //           return levelStat.registrationStat;
  //         }
  //       } catch (e) {
  //         return {};
  //       }

  //       return {};
  //     }

  //     function normalizeStatKey(key) {
  //       return key.replace(/\\d+$/, "");
  //     }

  //     function calculateScore(effects) {
  //       const damageResistancePenetration = parseFloat(effects.damageResistancePenetration || 0);
  //       const damageResistance = parseFloat(effects.damageResistance || 0);
  //       const pvpDamagePercent = parseFloat(effects.pvpDamagePercent || 0) * 10;
  //       const pvpDefensePercent = parseFloat(effects.pvpDefensePercent || 0) * 10;

  //       return damageResistancePenetration + damageResistance + pvpDamagePercent + pvpDefensePercent;
  //     }

  //     function calculateGradeSetEffects(categoryGradeCount) {
  //       const effects = {};

  //       const guardianEffects = {
  //         전설: {
  //           2: { power: 150 },
  //           3: { power: 150, experienceGainIncrease: 10 },
  //           4: { power: 150, experienceGainIncrease: 10, damageResistancePenetration: 100 },
  //           5: { power: 150, experienceGainIncrease: 10, damageResistancePenetration: 100, statusEffectResistance: 150 },
  //           6: { power: 150, experienceGainIncrease: 10, damageResistancePenetration: 100, statusEffectResistance: 150, damageResistance: 100 }
  //         },
  //         불멸: {
  //           2: { damageResistancePenetration: 200 },
  //           3: { damageResistancePenetration: 200, damageResistance: 150 },
  //           4: { damageResistancePenetration: 200, damageResistance: 150, experienceGainIncrease: 15 },
  //           5: { damageResistancePenetration: 200, damageResistance: 150, experienceGainIncrease: 15, pvpDamagePercent: 20 },
  //           6: { damageResistancePenetration: 200, damageResistance: 150, experienceGainIncrease: 15, pvpDamagePercent: 20, pvpDefensePercent: 20 }
  //         }
  //       };

  //       const rideEffects = {
  //         전설: {
  //           2: { normalMonsterAdditionalDamage: 50 },
  //           3: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50 },
  //           4: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50, damageResistancePenetration: 50 },
  //           5: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50, damageResistancePenetration: 50, statusEffectAccuracy: 50 },
  //           6: { normalMonsterAdditionalDamage: 50, bossMonsterAdditionalDamage: 50, damageResistancePenetration: 50, statusEffectAccuracy: 50, damageResistance: 50 }
  //         },
  //         불멸: {
  //           2: { damageResistancePenetration: 150 },
  //           3: { damageResistancePenetration: 150, damageResistance: 150 },
  //           4: { damageResistancePenetration: 150, damageResistance: 150, movementSpeed: 5 },
  //           5: { damageResistancePenetration: 150, damageResistance: 150, movementSpeed: 5, pvpDamagePercent: 20 },
  //           6: { damageResistancePenetration: 150, damageResistance: 150, movementSpeed: 5, pvpDamagePercent: 20, pvpDefensePercent: 20 }
  //         }
  //       };

  //       const transformEffects = {
  //         전설: {
  //           2: { magicIncreasePercent: 3 },
  //           3: { magicIncreasePercent: 3, healthIncreasePercent: 3 },
  //           4: { magicIncreasePercent: 3, healthIncreasePercent: 3, damageResistancePenetration: 100 },
  //           5: { magicIncreasePercent: 3, healthIncreasePercent: 3, damageResistancePenetration: 100, movementSpeed: 3 },
  //           6: { magicIncreasePercent: 3, healthIncreasePercent: 3, damageResistancePenetration: 100, movementSpeed: 3, damageResistance: 100 }
  //         },
  //         불멸: {
  //           2: { damageResistancePenetration: 150 },
  //           3: { damageResistancePenetration: 150, damageResistance: 150 },
  //           4: { damageResistancePenetration: 150, damageResistance: 150, criticalPowerPercent: 30 },
  //           5: { damageResistancePenetration: 150, damageResistance: 150, criticalPowerPercent: 30, pvpDamagePercent: 20 },
  //           6: { damageResistancePenetration: 150, damageResistance: 150, criticalPowerPercent: 30, pvpDamagePercent: 20, pvpDefensePercent: 20 }
  //         }
  //       };

  //       const gradeEffectsByCategory = {
  //         수호: guardianEffects,
  //         탑승: rideEffects,
  //         변신: transformEffects
  //       };

  //       for (const category in categoryGradeCount) {
  //         const categoryEffects = gradeEffectsByCategory[category];
  //         if (!categoryEffects) continue;

  //         const grades = categoryGradeCount[category];
  //         for (const grade in grades) {
  //           const count = grades[grade];
  //           if (count < 2) continue;

  //           const gradeEffects = categoryEffects[grade];
  //           if (!gradeEffects) continue;

  //           let highestStep = 0;
  //           for (let step = 2; step <= Math.min(6, count); step++) {
  //             if (gradeEffects[step.toString()]) {
  //               highestStep = step;
  //             }
  //           }

  //           if (highestStep > 0) {
  //             const stepEffects = gradeEffects[highestStep.toString()];
  //             for (const stat in stepEffects) {
  //               const value = parseFloat(String(stepEffects[stat]).replace(/,/g, ""));
  //               if (!isNaN(value)) {
  //                 effects[stat] = (effects[stat] || 0) + value;
  //               }
  //             }
  //           }
  //         }
  //       }

  //       return effects;
  //     }

  //     function calculateFactionSetEffects(categoryFactionCount) {
  //       const effects = {};

  //       for (const category in categoryFactionCount) {
  //         if (!factionSetEffectsData[category]) {
  //           const factions = categoryFactionCount[category];
  //           for (const faction in factions) {
  //             const count = factions[faction];

  //             if (count >= 2) {
  //               if (faction === "결의" && count >= 3) {
  //                 effects.pvpDamagePercent = (effects.pvpDamagePercent || 0) + 5;
  //               }
  //               if (faction === "고요" && count >= 3) {
  //                 effects.pvpDefensePercent = (effects.pvpDefensePercent || 0) + 5;
  //               }
  //               if (faction === "냉정" && count >= 3) {
  //                 effects.damageResistancePenetration = (effects.damageResistancePenetration || 0) + 50;
  //               }
  //               if (faction === "침착" && count >= 3) {
  //                 effects.damageResistance = (effects.damageResistance || 0) + 50;
  //               }

  //               effects.power = (effects.power || 0) + count * 10;
  //             }
  //           }
  //           continue;
  //         }

  //         const factions = categoryFactionCount[category];
  //         for (const faction in factions) {
  //           const count = factions[faction];

  //           if (count < 2 || !factionSetEffectsData[category][faction]) continue;

  //           let maxEffectCount = 0;
  //           let maxEffect = null;

  //           for (const effect of factionSetEffectsData[category][faction]) {
  //             if (!effect || typeof effect !== "object") continue;

  //             const requiredCount = parseInt(effect["개수"] || "0");
  //             if (
  //               !isNaN(requiredCount) &&
  //               count >= requiredCount &&
  //               requiredCount > maxEffectCount
  //             ) {
  //               maxEffectCount = requiredCount;
  //               maxEffect = effect;
  //             }
  //           }

  //           if (maxEffect) {
  //             for (const stat in maxEffect) {
  //               if (stat === "개수") continue;

  //               const numValue = parseFloat(
  //                 String(maxEffect[stat]).replace(/,/g, "")
  //               );
  //               if (!isNaN(numValue)) {
  //                 const normalizedStat = normalizeStatKey(stat);
  //                 effects[normalizedStat] = (effects[normalizedStat] || 0) + numValue;
  //               }
  //             }
  //           }
  //         }
  //       }

  //       return effects;
  //     }
  //   `;
  // }

  // function checkSpiritLevelData() {
  //   const invalidSpirits = [];
  //   const spiritsWithSuggestions = [];

  //   for (const spirit of selectedSpirits) {
  //     const name = spirit.name;
  //     const level = spirit.level || 0;
  //     const availableLevels = [];

  //     if (spirit.stats && Array.isArray(spirit.stats)) {
  //       spirit.stats.forEach((stat) => {
  //         if (
  //           stat.registrationStat &&
  //           Object.keys(stat.registrationStat).length > 0
  //         ) {
  //           availableLevels.push(stat.level);
  //         }
  //       });
  //     }

  //     if (!availableLevels.includes(level)) {
  //       invalidSpirits.push({
  //         name,
  //         level,
  //         availableLevels,
  //       });

  //       if (availableLevels.length > 0) {
  //         spiritsWithSuggestions.push({
  //           name,
  //           level,
  //           availableLevels,
  //         });
  //       }
  //     }
  //   }

  //   return { invalidSpirits, spiritsWithSuggestions };
  // }

  // function showLevelDataWarning(invalidSpirits, spiritsWithSuggestions) {
  //   let message = "";

  //   if (invalidSpirits.length > 0) {
  //     message += "<strong>데이터 누락 경고:</strong><br><br>";

  //     invalidSpirits.forEach((spirit) => {
  //       message += `- <strong>${spirit.name}</strong>: ${spirit.level}레벨에 데이터가 없습니다.`;

  //       if (spirit.availableLevels.length > 0) {
  //         message += ` 다음 레벨에는 데이터가 있습니다: ${spirit.availableLevels.join(
  //           ", "
  //         )}`;
  //       } else {
  //         message += " (사용 가능한 데이터가 없습니다)";
  //       }

  //       message += "<br>";
  //     });

  //     if (spiritsWithSuggestions.length > 0) {
  //       message +=
  //         '<br>권장 조치: 각 환수의 레벨을 데이터가 있는 레벨로 변경하시거나 "MAX" 버튼을 눌러 최대 레벨로 설정하세요.';
  //     }
  //   }

  //   return message;
  // }

  // function showResultsInModal(result) {
  //   const {
  //     spirits,
  //     gradeEffects,
  //     factionEffects,
  //     combinedEffects,
  //     missingDataSpirits,
  //     score,
  //     gradeCounts,
  //     factionCounts,
  //   } = result;
  //   const modal = document.getElementById("resultModal");

  //   const spiritsInfoElement = document.getElementById("spiritsInfoList");
  //   spiritsInfoElement.innerHTML = "";

  //   spirits.forEach((spirit) => {
  //     const spiritInfo = document.createElement("div");
  //     spiritInfo.className = "spirit-info-item";

  //     const img = document.createElement("img");
  //     img.src = spirit.image;
  //     img.alt = spirit.name;

  //     const details = document.createElement("div");
  //     details.className = "spirit-info-details";

  //     const name = document.createElement("div");
  //     name.className = "spirit-info-name";
  //     name.textContent = spirit.name;

  //     const faction = spirit.influence || spirit.faction || "결의";

  //     const level = document.createElement("div");
  //     level.className = "spirit-info-level";
  //     level.textContent = `레벨: ${spirit.level} / ${spirit.category} / ${spirit.grade} / ${faction}`;

  //     details.appendChild(name);
  //     details.appendChild(level);

  //     spiritInfo.appendChild(img);
  //     spiritInfo.appendChild(details);

  //     spiritsInfoElement.appendChild(spiritInfo);
  //   });

  //   let gradeSetInfo = "";
  //   for (const [category, grades] of Object.entries(gradeCounts)) {
  //     for (const [grade, count] of Object.entries(grades)) {
  //       if (count >= 2) {
  //         const gradeClass =
  //           grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
  //         gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
  //       }
  //     }
  //   }

  //   let factionSetInfo = "";
  //   for (const [category, factions] of Object.entries(factionCounts)) {
  //     const factionTags = Object.entries(factions)
  //       .filter(([_, count]) => count >= 2)
  //       .map(([faction, count]) => {
  //         const iconPath =
  //           FACTION_ICONS[faction] || "assets/img/bond/default.jpg";
  //         return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
  //       })
  //       .join(" ");

  //     if (factionTags) {
  //       factionSetInfo += `<div>${category}: ${factionTags}</div>`;
  //     }
  //   }

  //   document.getElementById("gradeEffects").innerHTML = renderEffectsList(
  //     gradeEffects,
  //     gradeSetInfo,
  //     true
  //   );
  //   document.getElementById("factionEffects").innerHTML = renderEffectsList(
  //     factionEffects,
  //     factionSetInfo,
  //     true
  //   );
  //   document.getElementById("totalEffects").innerHTML = renderEffectsList(
  //     combinedEffects,
  //     "",
  //     true
  //   );
  //   document.getElementById("weightedScore").textContent = score;

  //   const warningElement = document.getElementById("missingDataWarning");
  //   if (missingDataSpirits.length > 0) {
  //     warningElement.innerHTML = `<strong>주의:</strong> 다음 환수들의 데이터가 없어 계산에서 제외되었습니다: ${missingDataSpirits.join(
  //       ", "
  //     )}`;
  //     warningElement.style.display = "block";
  //   } else {
  //     warningElement.style.display = "none";
  //   }

  //   modal.style.display = "flex";
  //   document.body.style.overflow = "hidden";

  //   const isMobile = window.innerWidth <= 768;

  //   if (isMobile) {
  //     modal.querySelectorAll(".mobile-ad .kakao_ad_area").forEach((ad) => {
  //       ad.style.display = "block";
  //     });
  //     modal
  //       .querySelectorAll(
  //         ".ad-container-left .kakao_ad_area, .ad-container-right .kakao_ad_area"
  //       )
  //       .forEach((ad) => {
  //         ad.style.display = "none";
  //       });
  //   } else {
  //     modal
  //       .querySelectorAll(".ad-container-left .kakao_ad_area")
  //       .forEach((ad) => {
  //         ad.style.display = "block";
  //       });
  //     modal
  //       .querySelectorAll(
  //         ".mobile-ad .kakao_ad_area, .ad-container-right .kakao_ad_area"
  //       )
  //       .forEach((ad) => {
  //         ad.style.display = "none";
  //       });
  //   }

  //   if (window.adfit) {
  //     window.adfit();
  //   } else {
  //     const existingScript = document.querySelector(
  //       'script[src*="t1.daumcdn.net/kas/static/ba.min.js"]'
  //     );

  //     if (!existingScript) {
  //       const adScript = document.createElement("script");
  //       adScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
  //       adScript.async = true;
  //       document.body.appendChild(adScript);
  //     } else {
  //       const newScript = document.createElement("script");
  //       newScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
  //       newScript.async = true;
  //       existingScript.parentNode.replaceChild(newScript, existingScript);
  //     }
  //   }
  // }

  // function closeResultModal() {
  //   document.getElementById("resultModal").style.display = "none";
  //   document.body.style.overflow = "auto";
  // }

  // function closeOptimalModal() {
  //   document.getElementById("optimalModal").style.display = "none";
  //   document.body.style.overflow = "auto";
  //   isModalOpen = false;
  // }

  // function renderEffectsList(
  //   effectsData,
  //   setInfo = "",
  //   includePercentWithNormal = true
  // ) {
  //   if (!effectsData) effectsData = {};

  //   if (Object.keys(effectsData).length === 0) {
  //     if (setInfo) {
  //       return `<div class="set-info">${setInfo}</div><p>적용된 효과가 없습니다.</p>`;
  //     }
  //     return "<p>적용된 효과가 없습니다.</p>";
  //   }

  //   let html = "";
  //   if (setInfo) {
  //     html += `<div class="set-info">${setInfo}</div>`;
  //   }

  //   const percentStats = PERCENT_STATS || [];

  //   if (includePercentWithNormal) {
  //     for (const [stat, value] of Object.entries(effectsData)) {
  //       if (!stat) continue;

  //       const normalizedStat = normalizeStatKey(stat);
  //       const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

  //       const isPercentStat =
  //         Array.isArray(percentStats) && percentStats.includes(normalizedStat);

  //       const displayValue = isPercentStat
  //         ? `${Math.round(value * 100) / 100}%`
  //         : Math.round(value * 100) / 100;

  //       const colorClass =
  //         (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //       const cssClass = isPercentStat
  //         ? `effect-item effect-item-percent ${colorClass}`
  //         : `effect-item ${colorClass}`;

  //       html += `<div class="${cssClass}"><span>${statName}</span><span>${displayValue}</span></div>`;
  //     }
  //   } else {
  //     const normalEffects = {};
  //     const percentEffects = {};

  //     for (const [stat, value] of Object.entries(effectsData)) {
  //       if (!stat) continue;

  //       const normalizedStat = normalizeStatKey(stat);

  //       if (
  //         Array.isArray(percentStats) &&
  //         percentStats.includes(normalizedStat)
  //       ) {
  //         percentEffects[normalizedStat] = value;
  //       } else {
  //         normalEffects[normalizedStat] = value;
  //       }
  //     }

  //     if (Object.keys(normalEffects).length > 0) {
  //       for (const [stat, value] of Object.entries(normalEffects)) {
  //         const normalizedStat = normalizeStatKey(stat);
  //         const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
  //         const colorClass =
  //           (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //         html += `<div class="effect-item ${colorClass}"><span>${statName}</span><span>${
  //           Math.round(value * 100) / 100
  //         }</span></div>`;
  //       }
  //     }

  //     if (Object.keys(percentEffects).length > 0) {
  //       html += `<div class="section-header">퍼센트 효과</div>`;
  //       for (const [stat, value] of Object.entries(percentEffects)) {
  //         const normalizedStat = normalizeStatKey(stat);
  //         const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
  //         const colorClass =
  //           (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //         html += `<div class="effect-item effect-item-percent ${colorClass}"><span>${statName}</span><span>${
  //           Math.round(value * 100) / 100
  //         }%</span></div>`;
  //       }
  //     }
  //   }

  //   return html;
  // }

  // function clearSavedOptimalCombinations() {
  //   const currentCategory = lastActiveCategory;

  //   if (
  //     confirm(
  //       `${currentCategory} 카테고리의 저장된 모든 조합 기록을 삭제하시겠습니까?`
  //     )
  //   ) {
  //     savedOptimalCombinations[currentCategory] = [];
  //     combinationCounter[currentCategory] = 0;
  //     saveSavedOptimalCombinations();
  //     renderHistoryTabs(currentCategory);
  //     document.getElementById("optimalGradeEffects").innerHTML = "";
  //     document.getElementById("optimalFactionEffects").innerHTML = "";
  //     document.getElementById("optimalTotalEffects").innerHTML = "";
  //     document.getElementById("spiritStatsDetails").innerHTML = "";
  //     document.getElementById("combinationResultsContainer").innerHTML = "";
  //     document.getElementById("optimalScore").textContent = "0";
  //     alert(`${currentCategory} 조합 기록이 모두 삭제되었습니다.`);
  //   }
  // }

  // function addNewOptimalCombination(result) {
  //   const timestamp = new Date().toLocaleString();
  //   const category = result.spirits[0]?.category || lastActiveCategory;

  //   if (!savedOptimalCombinations[category]) {
  //     savedOptimalCombinations[category] = [];
  //   }

  //   if (combinationCounter[category] === undefined) {
  //     combinationCounter[category] = 0;
  //   }

  //   const MAX_TABS = 5;
  //   combinationCounter[category]++;
  //   const index = (combinationCounter[category] - 1) % MAX_TABS;

  //   const resultWithTimestamp = {
  //     ...result,
  //     timestamp,
  //     combinationName: `조합 ${index + 1}`,
  //     addedAt: Date.now(),
  //   };

  //   if (index < savedOptimalCombinations[category].length) {
  //     savedOptimalCombinations[category][index] = resultWithTimestamp;
  //   } else {
  //     savedOptimalCombinations[category].push(resultWithTimestamp);
  //   }
  // }

  // function renderHistoryTabs(category) {
  //   const categoryCombinations = savedOptimalCombinations[category] || [];

  //   if (categoryCombinations.length === 0) {
  //     document.getElementById("optimalSpiritsList").innerHTML = `
  //       <div class="history-tabs-container">
  //         <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
  //       </div>
  //       <div id="combinationResultsContainer"></div>
  //     `;
  //     return;
  //   }

  //   let highestScoreIndex = 0;
  //   let highestScore = categoryCombinations[0].score;

  //   for (let i = 1; i < categoryCombinations.length; i++) {
  //     if (categoryCombinations[i].score > highestScore) {
  //       highestScore = categoryCombinations[i].score;
  //       highestScoreIndex = i;
  //     }
  //   }

  //   let newestIndex = 0;
  //   let newestTime = categoryCombinations[0].addedAt || 0;

  //   for (let i = 1; i < categoryCombinations.length; i++) {
  //     const addedTime = categoryCombinations[i].addedAt || 0;
  //     if (addedTime > newestTime) {
  //       newestTime = addedTime;
  //       newestIndex = i;
  //     }
  //   }

  //   if (
  //     currentActiveIndex < 0 ||
  //     currentActiveIndex >= categoryCombinations.length
  //   ) {
  //     currentActiveIndex = newestIndex;
  //   }

  //   const tabsHtml = `
  //     <div class="history-tabs-container">
  //       <div class="history-tabs">
  //         ${Array(5)
  //           .fill()
  //           .map((_, index) => {
  //             const combo = categoryCombinations[index];
  //             if (!combo) {
  //               return `<div class="history-tab-placeholder"></div>`;
  //             }

  //             return `
  //             <button class="history-tab ${
  //               index === currentActiveIndex ? "active" : ""
  //             }
  //               ${index === highestScoreIndex ? "best" : ""}"
  //               data-index="${index}">
  //               <div class="tab-content">
  //                 <div class="tab-indicators">
  //                   ${
  //                     index === newestIndex
  //                       ? '<span class="current-marker">최신</span>'
  //                       : ""
  //                   }
  //                   ${
  //                     index === highestScoreIndex
  //                       ? '<span class="best-marker">최고</span>'
  //                       : ""
  //                   }
  //                 </div>
  //                 <span class="combo-name">${
  //                   combo.combinationName || `조합 ${index + 1}`
  //                 }</span>
  //                 <span class="tab-score">${combo.score}</span>
  //               </div>
  //             </button>
  //           `;
  //           })
  //           .join("")}
  //       </div>
  //     </div>
  //     <div id="selected-tab-info" class="history-info">
  //       ${
  //         categoryCombinations[currentActiveIndex]
  //           ? `
  //         <span class="timestamp">계산 시간: ${
  //           categoryCombinations[currentActiveIndex].timestamp
  //         }</span>
  //         ${
  //           currentActiveIndex === highestScoreIndex
  //             ? '<span class="best-notice">(최고 점수입니다!)</span>'
  //             : ""
  //         }
  //       `
  //           : ""
  //       }
  //     </div>
  //     <div id="combinationResultsContainer"></div>
  //   `;

  //   document.getElementById("optimalSpiritsList").innerHTML = tabsHtml;

  //   const oldStyle = document.getElementById("history-tab-styles");
  //   if (oldStyle) {
  //     oldStyle.remove();
  //   }

  //   const style = document.createElement("style");
  //   style.id = "history-tab-styles";
  //   style.textContent = `
  //     .history-tabs-container {
  //       width: 100%;
  //       overflow-x: hidden;
  //       padding-bottom: 5px;
  //     }

  //     .history-tabs {
  //       display: grid;
  //       grid-template-columns: repeat(5, 1fr);
  //       width: 100%;
  //       margin-bottom: 12px;
  //       gap: 4px;
  //     }

  //     .history-tab, .history-tab-placeholder {
  //       border-radius: 6px;
  //       padding: 20px 2px 5px;
  //       margin: 0;
  //       position: relative;
  //       min-height: 65px;
  //     }

  //     .history-tab {
  //       border: 1px solid #ddd;
  //       background-color: #f8f8f8;
  //       cursor: pointer;
  //       transition: all 0.2s;
  //       overflow: hidden;
  //     }

  //     .history-tab-placeholder {
  //       background-color: transparent;
  //       border: 1px dashed #eee;
  //     }

  //     .tab-content {
  //       display: flex;
  //       flex-direction: column;
  //       align-items: center;
  //     }

  //     .combo-name {
  //       font-weight: bold;
  //       font-size: 12px;
  //       white-space: nowrap;
  //     }

  //     .tab-indicators {
  //       position: absolute;
  //       top: 2px;
  //       left: 0;
  //       right: 0;
  //       display: flex;
  //       justify-content: center;
  //       gap: 2px;
  //     }

  //     .current-marker, .best-marker {
  //       font-size: 9px;
  //       padding: 1px 4px;
  //       border-radius: 2px;
  //       font-weight: normal;
  //     }

  //     .current-marker {
  //       background: #3498db;
  //       color: white;
  //     }

  //     .best-marker {
  //       background: #e74c3c;
  //       color: white;
  //     }

  //     .tab-score {
  //       font-size: 11px;
  //       font-weight: bold;
  //       margin-top: 3px;
  //     }

  //     .best-notice {
  //       margin-left: 10px;
  //       color: #e74c3c;
  //       font-weight: bold;
  //     }

  //     .history-tab.active {
  //       border: 2px solid #3498db;
  //       background-color: #ebf5fb;
  //     }

  //     .history-tab.best {
  //       border: 2px solid #e74c3c;
  //       background-color: #fdedec;
  //     }

  //     .history-tab.active.best {
  //       background: linear-gradient(135deg, #ebf5fb 0%, #fdedec 100%);
  //     }

  //     @media (max-width: 480px) {
  //       .history-tab, .history-tab-placeholder {
  //         padding: 18px 2px 5px;
  //         min-height: 58px;
  //       }

  //       .combo-name {
  //         font-size: 10px;
  //       }

  //       .current-marker, .best-marker {
  //         font-size: 8px;
  //         padding: 0px 2px;
  //       }

  //       .tab-score {
  //         font-size: 10px;
  //       }

  //       .best-notice {
  //         display: block;
  //         margin-top: 5px;
  //         margin-left: 0;
  //         font-size: 11px;
  //       }

  //       .timestamp {
  //         font-size: 11px;
  //       }
  //     }
  //   `;
  //   document.head.appendChild(style);

  //   document.querySelectorAll(".history-tab").forEach((tab) => {
  //     tab.addEventListener("click", function () {
  //       document
  //         .querySelectorAll(".history-tab")
  //         .forEach((t) => t.classList.remove("active"));
  //       this.classList.add("active");

  //       const comboIndex = parseInt(this.dataset.index);
  //       currentActiveIndex = comboIndex;
  //       const result = categoryCombinations[comboIndex];
  //       showSingleOptimalResult(result);

  //       document.getElementById("selected-tab-info").innerHTML = `
  //         <span class="timestamp">계산 시간: ${result.timestamp}</span>
  //         ${
  //           comboIndex === highestScoreIndex
  //             ? '<span class="best-notice">(최고 점수입니다!)</span>'
  //             : ""
  //         }
  //       `;
  //     });
  //   });

  //   if (categoryCombinations[currentActiveIndex]) {
  //     showSingleOptimalResult(categoryCombinations[currentActiveIndex]);
  //   }
  // }

  // function showSingleOptimalResult(result) {
  //   if (
  //     !result ||
  //     !result.spirits ||
  //     !Array.isArray(result.spirits) ||
  //     result.spirits.length === 0
  //   ) {
  //     document.getElementById("optimalSpiritsList").innerHTML =
  //       "<div class='warning-message'>표시할 결과가 없습니다.</div>";
  //     return;
  //   }

  //   const { spirits, score, gradeCounts, factionCounts } = result;

  //   document.getElementById("optimalScore").textContent = score;

  //   const resultsContainer = document.getElementById(
  //     "combinationResultsContainer"
  //   );
  //   resultsContainer.innerHTML = "";

  //   spirits.forEach((spirit) => {
  //     const spiritInfo = document.createElement("div");
  //     spiritInfo.className = "spirit-info-item";

  //     const img = document.createElement("img");
  //     img.src = spirit.image;
  //     img.alt = spirit.name;

  //     const details = document.createElement("div");
  //     details.className = "spirit-info-details";

  //     const name = document.createElement("div");
  //     name.className = "spirit-info-name";
  //     name.textContent = spirit.name;

  //     const faction = spirit.influence || spirit.faction || "결의";

  //     const level = document.createElement("div");
  //     level.className = "spirit-info-level";
  //     level.textContent = `레벨: ${spirit.level}, ${spirit.category}, ${spirit.grade}, ${faction}`;

  //     details.appendChild(name);
  //     details.appendChild(level);

  //     spiritInfo.appendChild(img);
  //     spiritInfo.appendChild(details);

  //     resultsContainer.appendChild(spiritInfo);
  //   });

  //   let gradeSetInfo = "";
  //   for (const [category, grades] of Object.entries(gradeCounts || {})) {
  //     for (const [grade, count] of Object.entries(grades)) {
  //       if (count >= 2) {
  //         const gradeClass =
  //           grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
  //         gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
  //       }
  //     }
  //   }

  //   let factionSetInfo = "";
  //   for (const [category, factions] of Object.entries(factionCounts)) {
  //     const factionTags = Object.entries(factions)
  //       .filter(([_, count]) => count >= 2)
  //       .map(([faction, count]) => {
  //         const iconPath =
  //           FACTION_ICONS[faction] || "assets/img/bond/default.jpg";
  //         return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
  //       })
  //       .join(" ");

  //     if (factionTags) {
  //       factionSetInfo += `<div>${category}: ${factionTags}</div>`;
  //     }
  //   }

  //   document.getElementById("gradeEffects").innerHTML = renderEffectsList(
  //     gradeEffects,
  //     gradeSetInfo,
  //     true
  //   );
  //   document.getElementById("factionEffects").innerHTML = renderEffectsList(
  //     factionEffects,
  //     factionSetInfo,
  //     true
  //   );
  //   document.getElementById("totalEffects").innerHTML = renderEffectsList(
  //     combinedEffects,
  //     "",
  //     true
  //   );
  //   document.getElementById("weightedScore").textContent = score;

  //   const warningElement = document.getElementById("missingDataWarning");
  //   if (missingDataSpirits.length > 0) {
  //     warningElement.innerHTML = `<strong>주의:</strong> 다음 환수들의 데이터가 없어 계산에서 제외되었습니다: ${missingDataSpirits.join(
  //       ", "
  //     )}`;
  //     warningElement.style.display = "block";
  //   } else {
  //     warningElement.style.display = "none";
  //   }

  //   modal.style.display = "flex";
  //   document.body.style.overflow = "hidden";

  //   const isMobile = window.innerWidth <= 768;

  //   if (isMobile) {
  //     modal.querySelectorAll(".mobile-ad .kakao_ad_area").forEach((ad) => {
  //       ad.style.display = "block";
  //     });
  //     modal
  //       .querySelectorAll(
  //         ".ad-container-left .kakao_ad_area, .ad-container-right .kakao_ad_area"
  //       )
  //       .forEach((ad) => {
  //         ad.style.display = "none";
  //       });
  //   } else {
  //     modal
  //       .querySelectorAll(".ad-container-left .kakao_ad_area")
  //       .forEach((ad) => {
  //         ad.style.display = "block";
  //       });
  //     modal
  //       .querySelectorAll(
  //         ".mobile-ad .kakao_ad_area, .ad-container-right .kakao_ad_area"
  //       )
  //       .forEach((ad) => {
  //         ad.style.display = "none";
  //       });
  //   }

  //   if (window.adfit) {
  //     window.adfit();
  //   } else {
  //     const existingScript = document.querySelector(
  //       'script[src*="t1.daumcdn.net/kas/static/ba.min.js"]'
  //     );

  //     if (!existingScript) {
  //       const adScript = document.createElement("script");
  //       adScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
  //       adScript.async = true;
  //       document.body.appendChild(adScript);
  //     } else {
  //       const newScript = document.createElement("script");
  //       newScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
  //       newScript.async = true;
  //       existingScript.parentNode.replaceChild(newScript, existingScript);
  //     }
  //   }
  // }

  // function closeResultModal() {
  //   document.getElementById("resultModal").style.display = "none";
  //   document.body.style.overflow = "auto";
  // }

  // function closeOptimalModal() {
  //   document.getElementById("optimalModal").style.display = "none";
  //   document.body.style.overflow = "auto";
  //   isModalOpen = false;
  // }

  // function renderEffectsList(
  //   effectsData,
  //   setInfo = "",
  //   includePercentWithNormal = true
  // ) {
  //   if (!effectsData) effectsData = {};

  //   if (Object.keys(effectsData).length === 0) {
  //     if (setInfo) {
  //       return `<div class="set-info">${setInfo}</div><p>적용된 효과가 없습니다.</p>`;
  //     }
  //     return "<p>적용된 효과가 없습니다.</p>";
  //   }

  //   let html = "";
  //   if (setInfo) {
  //     html += `<div class="set-info">${setInfo}</div>`;
  //   }

  //   const percentStats = PERCENT_STATS || [];

  //   if (includePercentWithNormal) {
  //     for (const [stat, value] of Object.entries(effectsData)) {
  //       if (!stat) continue;

  //       const normalizedStat = normalizeStatKey(stat);
  //       const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

  //       const isPercentStat =
  //         Array.isArray(percentStats) && percentStats.includes(normalizedStat);

  //       const displayValue = isPercentStat
  //         ? `${Math.round(value * 100) / 100}%`
  //         : Math.round(value * 100) / 100;

  //       const colorClass =
  //         (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //       const cssClass = isPercentStat
  //         ? `effect-item effect-item-percent ${colorClass}`
  //         : `effect-item ${colorClass}`;

  //       html += `<div class="${cssClass}"><span>${statName}</span><span>${displayValue}</span></div>`;
  //     }
  //   } else {
  //     const normalEffects = {};
  //     const percentEffects = {};

  //     for (const [stat, value] of Object.entries(effectsData)) {
  //       if (!stat) continue;

  //       const normalizedStat = normalizeStatKey(stat);

  //       if (
  //         Array.isArray(percentStats) &&
  //         percentStats.includes(normalizedStat)
  //       ) {
  //         percentEffects[normalizedStat] = value;
  //       } else {
  //         normalEffects[normalizedStat] = value;
  //       }
  //     }

  //     if (Object.keys(normalEffects).length > 0) {
  //       for (const [stat, value] of Object.entries(normalEffects)) {
  //         const normalizedStat = normalizeStatKey(stat);
  //         const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
  //         const colorClass =
  //           (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //         html += `<div class="effect-item ${colorClass}"><span>${statName}</span><span>${
  //           Math.round(value * 100) / 100
  //         }</span></div>`;
  //       }
  //     }

  //     if (Object.keys(percentEffects).length > 0) {
  //       html += `<div class="section-header">퍼센트 효과</div>`;
  //       for (const [stat, value] of Object.entries(percentEffects)) {
  //         const normalizedStat = normalizeStatKey(stat);
  //         const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
  //         const colorClass =
  //           (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //         html += `<div class="effect-item effect-item-percent ${colorClass}"><span>${statName}</span><span>${
  //           Math.round(value * 100) / 100
  //         }%</span></div>`;
  //       }
  //     }
  //   }

  //   return html;
  // }

  // function clearSavedOptimalCombinations() {
  //   const currentCategory = lastActiveCategory;

  //   if (
  //     confirm(
  //       `${currentCategory} 카테고리의 저장된 모든 조합 기록을 삭제하시겠습니까?`
  //     )
  //   ) {
  //     savedOptimalCombinations[currentCategory] = [];
  //     combinationCounter[currentCategory] = 0;
  //     saveSavedOptimalCombinations();
  //     renderHistoryTabs(currentCategory);
  //     document.getElementById("optimalGradeEffects").innerHTML = "";
  //     document.getElementById("optimalFactionEffects").innerHTML = "";
  //     document.getElementById("optimalTotalEffects").innerHTML = "";
  //     document.getElementById("spiritStatsDetails").innerHTML = "";
  //     document.getElementById("combinationResultsContainer").innerHTML = "";
  //     document.getElementById("optimalScore").textContent = "0";
  //     alert(`${currentCategory} 조합 기록이 모두 삭제되었습니다.`);
  //   }
  // }

  // function addNewOptimalCombination(result) {
  //   const timestamp = new Date().toLocaleString();
  //   const category = result.spirits[0]?.category || lastActiveCategory;

  //   if (!savedOptimalCombinations[category]) {
  //     savedOptimalCombinations[category] = [];
  //   }

  //   if (combinationCounter[category] === undefined) {
  //     combinationCounter[category] = 0;
  //   }

  //   const MAX_TABS = 5;
  //   combinationCounter[category]++;
  //   const index = (combinationCounter[category] - 1) % MAX_TABS;

  //   const resultWithTimestamp = {
  //     ...result,
  //     timestamp,
  //     combinationName: `조합 ${index + 1}`,
  //     addedAt: Date.now(),
  //   };

  //   if (index < savedOptimalCombinations[category].length) {
  //     savedOptimalCombinations[category][index] = resultWithTimestamp;
  //   } else {
  //     savedOptimalCombinations[category].push(resultWithTimestamp);
  //   }
  // }

  // function renderHistoryTabs(category) {
  //   const categoryCombinations = savedOptimalCombinations[category] || [];

  //   if (categoryCombinations.length === 0) {
  //     document.getElementById("optimalSpiritsList").innerHTML = `
  //       <div class="history-tabs-container">
  //         <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
  //       </div>
  //       <div id="combinationResultsContainer"></div>
  //     `;
  //     return;
  //   }

  //   let highestScoreIndex = 0;
  //   let highestScore = categoryCombinations[0].score;

  //   for (let i = 1; i < categoryCombinations.length; i++) {
  //     if (categoryCombinations[i].score > highestScore) {
  //       highestScore = categoryCombinations[i].score;
  //       highestScoreIndex = i;
  //     }
  //   }

  //   let newestIndex = 0;
  //   let newestTime = categoryCombinations[0].addedAt || 0;

  //   for (let i = 1; i < categoryCombinations.length; i++) {
  //     const addedTime = categoryCombinations[i].addedAt || 0;
  //     if (addedTime > newestTime) {
  //       newestTime = addedTime;
  //       newestIndex = i;
  //     }
  //   }

  //   if (
  //     currentActiveIndex < 0 ||
  //     currentActiveIndex >= categoryCombinations.length
  //   ) {
  //     currentActiveIndex = newestIndex;
  //   }

  //   const tabsHtml = `
  //     <div class="history-tabs-container">
  //       <div class="history-tabs">
  //         ${Array(5)
  //           .fill()
  //           .map((_, index) => {
  //             const combo = categoryCombinations[index];
  //             if (!combo) {
  //               return `<div class="history-tab-placeholder"></div>`;
  //             }

  //             return `
  //             <button class="history-tab ${
  //               index === currentActiveIndex ? "active" : ""
  //             }
  //               ${index === highestScoreIndex ? "best" : ""}"
  //               data-index="${index}">
  //               <div class="tab-content">
  //                 <div class="tab-indicators">
  //                   ${
  //                     index === newestIndex
  //                       ? '<span class="current-marker">최신</span>'
  //                       : ""
  //                   }
  //                   ${
  //                     index === highestScoreIndex
  //                       ? '<span class="best-marker">최고</span>'
  //                       : ""
  //                   }
  //                 </div>
  //                 <span class="combo-name">${
  //                   combo.combinationName || `조합 ${index + 1}`
  //                 }</span>
  //                 <span class="tab-score">${combo.score}</span>
  //               </div>
  //             </button>
  //           `;
  //           })
  //           .join("")}
  //       </div>
  //     </div>
  //     <div id="selected-tab-info" class="history-info">
  //       ${
  //         categoryCombinations[currentActiveIndex]
  //           ? `
  //         <span class="timestamp">계산 시간: ${
  //           categoryCombinations[currentActiveIndex].timestamp
  //         }</span>
  //         ${
  //           currentActiveIndex === highestScoreIndex
  //             ? '<span class="best-notice">(최고 점수입니다!)</span>'
  //             : ""
  //         }
  //       `
  //           : ""
  //       }
  //     </div>
  //     <div id="combinationResultsContainer"></div>
  //   `;

  //   document.getElementById("optimalSpiritsList").innerHTML = tabsHtml;

  //   const oldStyle = document.getElementById("history-tab-styles");
  //   if (oldStyle) {
  //     oldStyle.remove();
  //   }

  //   const style = document.createElement("style");
  //   style.id = "history-tab-styles";
  //   style.textContent = `
  //     .history-tabs-container {
  //       width: 100%;
  //       overflow-x: hidden;
  //       padding-bottom: 5px;
  //     }

  //     .history-tabs {
  //       display: grid;
  //       grid-template-columns: repeat(5, 1fr);
  //       width: 100%;
  //       margin-bottom: 12px;
  //       gap: 4px;
  //     }

  //     .history-tab, .history-tab-placeholder {
  //       border-radius: 6px;
  //       padding: 20px 2px 5px;
  //       margin: 0;
  //       position: relative;
  //       min-height: 65px;
  //     }

  //     .history-tab {
  //       border: 1px solid #ddd;
  //       background-color: #f8f8f8;
  //       cursor: pointer;
  //       transition: all 0.2s;
  //       overflow: hidden;
  //     }

  //     .history-tab-placeholder {
  //       background-color: transparent;
  //       border: 1px dashed #eee;
  //     }

  //     .tab-content {
  //       display: flex;
  //       flex-direction: column;
  //       align-items: center;
  //     }

  //     .combo-name {
  //       font-weight: bold;
  //       font-size: 12px;
  //       white-space: nowrap;
  //     }

  //     .tab-indicators {
  //       position: absolute;
  //       top: 2px;
  //       left: 0;
  //       right: 0;
  //       display: flex;
  //       justify-content: center;
  //       gap: 2px;
  //     }

  //     .current-marker, .best-marker {
  //       font-size: 9px;
  //       padding: 1px 4px;
  //       border-radius: 2px;
  //       font-weight: normal;
  //     }

  //     .current-marker {
  //       background: #3498db;
  //       color: white;
  //     }

  //     .best-marker {
  //       background: #e74c3c;
  //       color: white;
  //     }

  //     .tab-score {
  //       font-size: 11px;
  //       font-weight: bold;
  //       margin-top: 3px;
  //     }

  //     .best-notice {
  //       margin-left: 10px;
  //       color: #e74c3c;
  //       font-weight: bold;
  //     }

  //     .history-tab.active {
  //       border: 2px solid #3498db;
  //       background-color: #ebf5fb;
  //     }

  //     .history-tab.best {
  //       border: 2px solid #e74c3c;
  //       background-color: #fdedec;
  //     }

  //     .history-tab.active.best {
  //       background: linear-gradient(135deg, #ebf5fb 0%, #fdedec 100%);
  //     }

  //     @media (max-width: 480px) {
  //       .history-tab, .history-tab-placeholder {
  //         padding: 18px 2px 5px;
  //         min-height: 58px;
  //       }

  //       .combo-name {
  //         font-size: 10px;
  //       }

  //       .current-marker, .best-marker {
  //         font-size: 8px;
  //         padding: 0px 2px;
  //       }

  //       .tab-score {
  //         font-size: 10px;
  //       }

  //       .best-notice {
  //         display: block;
  //         margin-top: 5px;
  //         margin-left: 0;
  //         font-size: 11px;
  //       }

  //       .timestamp {
  //         font-size: 11px;
  //       }
  //     }
  //   `;
  //   document.head.appendChild(style);

  //   document.querySelectorAll(".history-tab").forEach((tab) => {
  //     tab.addEventListener("click", function () {
  //       document
  //         .querySelectorAll(".history-tab")
  //         .forEach((t) => t.classList.remove("active"));
  //       this.classList.add("active");

  //       const comboIndex = parseInt(this.dataset.index);
  //       currentActiveIndex = comboIndex;
  //       const result = categoryCombinations[comboIndex];
  //       showSingleOptimalResult(result);

  //       document.getElementById("selected-tab-info").innerHTML = `
  //         <span class="timestamp">계산 시간: ${result.timestamp}</span>
  //         ${
  //           comboIndex === highestScoreIndex
  //             ? '<span class="best-notice">(최고 점수입니다!)</span>'
  //             : ""
  //         }
  //       `;
  //     });
  //   });

  //   if (categoryCombinations[currentActiveIndex]) {
  //     showSingleOptimalResult(categoryCombinations[currentActiveIndex]);
  //   }
  // }

  // function showSingleOptimalResult(result) {
  //   if (
  //     !result ||
  //     !result.spirits ||
  //     !Array.isArray(result.spirits) ||
  //     result.spirits.length === 0
  //   ) {
  //     document.getElementById("optimalSpiritsList").innerHTML =
  //       "<div class='warning-message'>표시할 결과가 없습니다.</div>";
  //     return;
  //   }

  //   const { spirits, score, gradeCounts, factionCounts } = result;

  //   document.getElementById("optimalScore").textContent = score;

  //   const resultsContainer = document.getElementById(
  //     "combinationResultsContainer"
  //   );
  //   resultsContainer.innerHTML = "";

  //   spirits.forEach((spirit) => {
  //     const spiritInfo = document.createElement("div");
  //     spiritInfo.className = "spirit-info-item";

  //     const img = document.createElement("img");
  //     img.src = spirit.image;
  //     img.alt = spirit.name;

  //     const details = document.createElement("div");
  //     details.className = "spirit-info-details";

  //     const name = document.createElement("div");
  //     name.className = "spirit-info-name";
  //     name.textContent = spirit.name;

  //     const faction = spirit.influence || spirit.faction || "결의";

  //     const level = document.createElement("div");
  //     level.className = "spirit-info-level";
  //     level.textContent = `레벨: ${spirit.level}, ${spirit.category}, ${spirit.grade}, ${faction}`;

  //     details.appendChild(name);
  //     details.appendChild(level);

  //     spiritInfo.appendChild(img);
  //     spiritInfo.appendChild(details);

  //     resultsContainer.appendChild(spiritInfo);
  //   });

  //   let gradeSetInfo = "";
  //   for (const [category, grades] of Object.entries(gradeCounts || {})) {
  //     for (const [grade, count] of Object.entries(grades)) {
  //       if (count >= 2) {
  //         const gradeClass =
  //           grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
  //         gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
  //       }
  //     }
  //   }

  //   let factionSetInfo = "";
  //   for (const [category, factions] of Object.entries(factionCounts || {})) {
  //     const factionTags = Object.entries(factions)
  //       .filter(([_, count]) => count >= 2)
  //       .map(([faction, count]) => {
  //         const iconPath =
  //           FACTION_ICONS[faction] || "assets/img/bond/default.jpg";
  //         return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
  //       })
  //       .join(" ");

  //     if (factionTags) {
  //       factionSetInfo += `<div>${category}: ${factionTags}</div>`;
  //     }
  //   }

  //   let gradeEffects = result.gradeEffects || {};
  //   let factionEffects = result.factionEffects || {};
  //   let combinedEffects = result.combinedEffects || {};

  //   if (!gradeEffects || Object.keys(gradeEffects).length === 0) {
  //     gradeEffects = calculateGradeSetEffects(gradeCounts || {});
  //   }

  //   if (!combinedEffects || Object.keys(combinedEffects).length === 0) {
  //     const registrationStats = {};
  //     spirits.forEach((spirit) => {
  //       const levelStats = spirit.stats?.find(
  //         (s) => s.level === spirit.level
  //       )?.registrationStat;
  //       if (levelStats) {
  //         Object.entries(levelStats).forEach(([stat, value]) => {
  //           const numValue = parseFloat(String(value).replace(/,/g, ""));
  //           if (!isNaN(numValue)) {
  //             const normalizedStat = normalizeStatKey(stat);
  //             registrationStats[normalizedStat] =
  //               (registrationStats[normalizedStat] || 0) + numValue;
  //           }
  //         });
  //       }
  //     });

  //     combinedEffects = { ...registrationStats };
  //     Object.entries(gradeEffects).forEach(([stat, value]) => {
  //       combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
  //     });
  //     Object.entries(factionEffects).forEach(([stat, value]) => {
  //       combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
  //     });
  //   }

  //   const gradeEffectsContainer = document.getElementById(
  //     "optimalGradeEffects"
  //   );
  //   const factionEffectsContainer = document.getElementById(
  //     "optimalFactionEffects"
  //   );
  //   const totalEffectsContainer = document.getElementById(
  //     "optimalTotalEffects"
  //   );

  //   if (gradeEffectsContainer) {
  //     gradeEffectsContainer.innerHTML = renderEffectsList(
  //       gradeEffects,
  //       gradeSetInfo,
  //       true
  //     );
  //   }

  //   if (factionEffectsContainer) {
  //     factionEffectsContainer.innerHTML = renderEffectsList(
  //       factionEffects,
  //       factionSetInfo,
  //       true
  //     );
  //   }

  //   if (totalEffectsContainer) {
  //     totalEffectsContainer.innerHTML = renderEffectsList(
  //       combinedEffects,
  //       "",
  //       true
  //     );
  //   }

  //   renderSpiritDetailsTable(spirits);

  //   const adElements = document.querySelectorAll(
  //     "#optimalModal .kakao_ad_area"
  //   );
  //   adElements.forEach((ad) => {
  //     ad.style.display = "block";
  //   });

  //   if (typeof window.adfit !== "undefined") {
  //     window.adfit();
  //   } else {
  //     const reloadScript = document.createElement("script");
  //     reloadScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
  //     reloadScript.async = true;
  //     document.body.appendChild(reloadScript);
  //   }
  // }
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function renderSpiritDetailsTable(spirits) {
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
      if (!levelStats || !levelStats.registrationStat) return;

      Object.keys(levelStats.registrationStat).forEach((key) => {
        if (key) allStatKeys.add(normalizeStatKey(key));
      });
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

        try {
          if (spirit.stats && Array.isArray(spirit.stats)) {
            const levelStat = spirit.stats.find(
              (s) => s && s.level === spirit.level
            );
            if (levelStat && levelStat.registrationStat) {
              for (const [key, value] of Object.entries(
                levelStat.registrationStat
              )) {
                if (normalizeStatKey(key) === statKey) {
                  statValue = value || 0;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn("스탯 접근 중 오류 발생:", e);
          statValue = 0;
        }

        const isPercentStat =
          Array.isArray(PERCENT_STATS) && PERCENT_STATS.includes(statKey);
        statCell.textContent = isPercentStat ? `${statValue}%` : statValue;

        row.appendChild(statCell);
      });

      table.appendChild(row);
    });

    container.appendChild(table);
  }

  function isFixedLevelSpirit(spiritName) {
    return FIXED_LEVEL25_SPIRITS.includes(spiritName);
  }

  function normalizeStatKey(key) {
    return key.replace(/\d+$/, "");
  }

  function spiritHasStats(spirit, statNames) {
    if (!spirit.stats || !Array.isArray(spirit.stats)) return false;

    for (const levelStat of spirit.stats) {
      if (!levelStat.registrationStat) continue;

      for (const stat in levelStat.registrationStat) {
        const normalizedStat = normalizeStatKey(stat);
        const displayName = STATS_MAPPING[normalizedStat] || normalizedStat;

        if (statNames.includes(displayName)) {
          return true;
        }
      }
    }

    return false;
  }

  function getSpiritStats(spirit) {
    const stats = {};

    if (!spirit.stats || !Array.isArray(spirit.stats)) return stats;

    for (const levelStat of spirit.stats) {
      if (!levelStat.registrationStat) continue;

      for (const stat in levelStat.registrationStat) {
        const normalizedStat = normalizeStatKey(stat);
        const displayName = STATS_MAPPING[normalizedStat] || normalizedStat;
        const value = levelStat.registrationStat[stat];

        if (selectedSearchStats.includes(displayName)) {
          stats[displayName] = stats[displayName] || {
            value: value,
            level: levelStat.level,
          };
        }
      }
    }

    return stats;
  }

  function countGradeInResult(result, grade) {
    let count = 0;
    if (result && result.spirits) {
      result.spirits.forEach((spirit) => {
        if (spirit.grade === grade) count++;
      });
    }
    return count;
  }

  function countGradeTypesInResult(result) {
    const gradeTypes = new Set();
    if (result && result.spirits) {
      result.spirits.forEach((spirit) => {
        gradeTypes.add(spirit.grade);
      });
    }
    return gradeTypes.size;
  }

  function generateCombinations(array, size) {
    if (size > array.length) return [];
    if (size === 0) return [[]];

    const result = [];

    for (let i = 0; i <= array.length - size; i++) {
      const spirit = array[i];
      const spiritCopy = {
        ...JSON.parse(JSON.stringify(spirit)),
        category: spirit.category,
        grade: spirit.grade,
        faction: spirit.faction,
        influence: spirit.influence,
      };

      const head = [spiritCopy];
      const tailCombinations = generateCombinations(
        array.slice(i + 1),
        size - 1
      );

      for (const tailCombo of tailCombinations) {
        result.push([...head, ...tailCombo]);
      }
    }

    return result;
  }

  function binomialCoefficient(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= n - (i - 1);
      result /= i;
    }
    return Math.round(result);
  }

  function handleResponsiveLayout() {
    const toggleContainer = document.getElementById("panelToggleContainer");
    const mainRightPanel = document.querySelector(".main-content .right-panel");

    const activeTab = document.querySelector(".sub-tabs .tab.active");
    if (activeTab) {
      lastActiveCategory = activeTab.textContent;
      localStorage.setItem("lastActiveCategory", lastActiveCategory);
    }

    if (toggleContainer) {
      if (window.innerWidth <= 768) {
        const currentCategory = lastActiveCategory;
        const categorySpirits = selectedSpirits.filter(
          (spirit) => spirit.category === currentCategory
        );

        if (categorySpirits.length === 0) {
          toggleContainer.style.display = "none";
        } else {
          toggleContainer.style.display = "flex";
        }
      } else {
        toggleContainer.style.display = "none";
      }
    }

    if (mainRightPanel) {
      if (window.innerWidth <= 768) {
        mainRightPanel.style.display = "none";
      } else {
        mainRightPanel.style.display = "block";
      }
    }

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.toggle("active", tab.textContent === lastActiveCategory);
    });

    updateSelectedCount();
    updateSelectedSpiritsPanel();
  }

  function initBondCalculatorEvents() {
    const toggleContainer = document.getElementById("panelToggleContainer");
    const rightPanel = toggleContainer?.querySelector(".right-panel");
    const panelToggleBtn = document.getElementById("panelToggleBtn");

    if (panelToggleBtn && rightPanel) {
      if (window.innerWidth <= 768) {
        rightPanel.classList.add("collapsed");
      }

      panelToggleBtn.removeEventListener("click", mobilePanelToggle);
      panelToggleBtn.addEventListener("click", mobilePanelToggle);
    }

    const closeResultModalFn = function () {
      const modal = document.getElementById("resultModal");
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    };

    const closeOptimalModalFn = function () {
      const modal = document.getElementById("optimalModal");
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        isModalOpen = false;
      }
    };

    const resultModal = document.getElementById("resultModal");
    if (resultModal) {
      resultModal.addEventListener("click", function (e) {
        if (e.target === this) closeResultModalFn();
      });
    }

    const optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.addEventListener("click", function (e) {
        if (e.target === this) closeOptimalModalFn();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (resultModal) {
          resultModal.style.display = "none";
          document.body.style.overflow = "auto";
        }
        if (optimalModal) {
          optimalModal.style.display = "none";
          document.body.style.overflow = "auto";
          isModalOpen = false;
        }
      }
    });
  }

  function mobilePanelToggle(e) {
    e.preventDefault();
    e.stopPropagation();

    const mobilePanel = document.querySelector(
      "#panelToggleContainer .right-panel"
    );
    const toggleIcon = document.querySelector("#panelToggleBtn .toggle-icon");

    if (!mobilePanel) return;

    console.log("모바일 패널 토글 클릭됨");

    if (mobilePanel.classList.contains("collapsed")) {
      mobilePanel.classList.remove("collapsed");
      mobilePanel.style.display = "block";
      mobilePanel.style.maxHeight = "80vh";
      console.log("모바일 패널 펼침");

      if (toggleIcon) {
        toggleIcon.textContent = "▼";
        toggleIcon.style.transform = "rotate(180deg)";
      }
    } else {
      mobilePanel.classList.add("collapsed");
      mobilePanel.style.maxHeight = "0";
      console.log("모바일 패널 접음");

      if (toggleIcon) {
        toggleIcon.textContent = "▲";
        toggleIcon.style.transform = "rotate(0deg)";
      }
    }
  }

  function syncSearchInputs() {
    const desktopInput = document.getElementById("search-input");
    const mobileInput = document.getElementById("mobile-search-input");
    const mobileSearchButton = document.getElementById("mobile-search-button");

    if (desktopInput && mobileInput) {
      desktopInput.addEventListener("input", function () {
        mobileInput.value = this.value;
      });

      mobileInput.addEventListener("input", function () {
        desktopInput.value = this.value;
      });
    }

    if (mobileSearchButton) {
      mobileSearchButton.onclick = function () {
        searchSpirits(true);
      };
    }

    if (mobileInput) {
      mobileInput.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleStatOptions(true, true);
      });

      mobileInput.addEventListener("focus", function () {
        toggleStatOptions(true, true);
      });

      mobileInput.addEventListener("input", function () {
        filterStatOptions(this.value, true);
      });

      mobileInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          searchSpirits(true);
        }
      });
    }

    document.addEventListener("click", function (e) {
      const statOptions = [
        document.getElementById("stat-options"),
        document.getElementById("mobile-stat-options"),
      ];
      const searchInputs = [
        document.getElementById("search-input"),
        document.getElementById("mobile-search-input"),
      ];

      let clickedInsideInput = false;
      let clickedInsideOptions = false;

      searchInputs.forEach((input) => {
        if (input && input.contains(e.target)) {
          clickedInsideInput = true;
        }
      });

      statOptions.forEach((options) => {
        if (options && options.contains(e.target)) {
          clickedInsideOptions = true;
        }
      });

      if (!clickedInsideInput && !clickedInsideOptions) {
        toggleStatOptions(false);
        toggleStatOptions(false, true);
      }
    });
  }

  function collectAllStatNames() {
    const stats = new Set();
    const categories = ["수호", "탑승", "변신"];

    for (const category of categories) {
      const categoryData = window.DataManager.getData(category);

      if (!categoryData || !Array.isArray(categoryData)) continue;

      categoryData.forEach((spirit) => {
        if (!spirit.stats || !Array.isArray(spirit.stats)) return;

        spirit.stats.forEach((levelStat) => {
          if (!levelStat.registrationStat) return;

          Object.keys(levelStat.registrationStat).forEach((stat) => {
            const normalizedStat = normalizeStatKey(stat);
            stats.add(STATS_MAPPING[normalizedStat] || normalizedStat);
          });
        });
      });
    }

    return Array.from(stats).sort();
  }

  function initialize() {
    const savedCategory = localStorage.getItem("lastActiveCategory");
    if (savedCategory) {
      lastActiveCategory = savedCategory;
    } else {
      lastActiveCategory = "수호";
    }

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.toggle("active", tab.textContent === lastActiveCategory);
    });

    if (
      window.UIRenderer &&
      typeof window.UIRenderer.initUIEvents === "function"
    ) {
      window.UIRenderer.initUIEvents();
    } else {
      console.warn("UIRenderer가 초기화되지 않았습니다.");
    }

    initBondCalculatorEvents();

    if (window.innerWidth <= 768) {
      const mainRightPanel = document.querySelector(
        ".main-content .right-panel"
      );
      if (mainRightPanel) {
        mainRightPanel.style.display = "none";
      }
    }

    window.UIRenderer.initUIEvents();

    if (
      window.DataManager &&
      typeof window.DataManager.loadCategoryData === "function"
    ) {
      window.DataManager.loadCategoryData().then(() => {
        allStatNames = collectAllStatNames();
        populateStatOptions();
        loadSelectedSpiritsFromStorage();
        showCategory(lastActiveCategory, false);
      });
    } else {
      console.error(
        "DataManager not available or loadCategoryData method missing"
      );
    }

    loadSavedOptimalCombinations();

    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      handleResponsiveLayout();
    } else {
      window.addEventListener("DOMContentLoaded", handleResponsiveLayout);
    }

    syncSearchInputs();

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleStatOptions(true);
      });

      searchInput.addEventListener("focus", function () {
        toggleStatOptions(true);
      });

      searchInput.addEventListener("input", function () {
        filterStatOptions(this.value);
      });

      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          searchSpirits();
        }
      });
    }

    document.addEventListener("click", function (e) {
      const statOptions = document.getElementById("stat-options");
      const searchInput = document.getElementById("search-input");

      if (statOptions && searchInput) {
        if (
          !searchInput.contains(e.target) &&
          !statOptions.contains(e.target)
        ) {
          toggleStatOptions(false);
        }
      }
    });

    window.addEventListener("resize", handleResponsiveLayout);
  }

  return {
    initialize,
    showCategory,
    updateSpiritLevel,
    setMaxLevel,
    removeSpirit,
    changeLevel,
    applyBatchLevel,
    clearAllSelections,
    removeSelectedStat,
    findOptimalCombination,
    closeOptimalModal,
    closeSearchResults,
    searchSpirits,
    applySelectedState,
    updateSelectedCount,
    updateMobilePanel,
  };
})();

window.BondCalculatorApp = BondCalculatorApp;

document.addEventListener("DOMContentLoaded", function () {
  BondCalculatorApp.initialize();
});

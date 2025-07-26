const SearchManager = (function () {
  let allStatNames = [];
  let selectedSearchStats = [];

  function collectAllStatNames() {
    const stats = new Set();
    const categories = ["수호", "탑승", "변신"];
    const STATS_MAPPING = window.CommonData.STATS_MAPPING || {};

    for (const category of categories) {
      const categoryData = window.DataManager.getData(category);

      if (!categoryData || !Array.isArray(categoryData)) continue;

      categoryData.forEach((spirit) => {
        if (!spirit.stats || !Array.isArray(spirit.stats)) return;

        spirit.stats.forEach((levelStat) => {
          if (!levelStat.registrationStat) return;

          Object.keys(levelStat.registrationStat).forEach((stat) => {
            const normalizedStat = SpiritUtils.normalizeStatKey(stat);
            stats.add(STATS_MAPPING[normalizedStat] || normalizedStat);
          });
        });
      });
    }

    return Array.from(stats).sort();
  }

  function toggleStatSelection(stat) {
    const index = selectedSearchStats.indexOf(stat);

    if (index === -1) {
      selectedSearchStats.push(stat);
    } else {
      selectedSearchStats.splice(index, 1);
    }

    updateSelectedStatsDisplay();
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
        chip.innerHTML = `${stat} <span class="remove-stat" onclick="SearchManager.removeSelectedStat('${stat}')">×</span>`;
        container.appendChild(chip);
      });
    });
  }

  function removeSelectedStat(stat) {
    const index = selectedSearchStats.indexOf(stat);
    if (index !== -1) {
      selectedSearchStats.splice(index, 1);
    }
    updateSelectedStatsDisplay();
  }

  function populateStatOptions(selectElement) {
    allStatNames = collectAllStatNames();

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

  function showSearchResults(
    lastActiveCategory,
    selectedSpirits,
    handleSelectSpirit
  ) {
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
                <button class="done-selecting-btn" onclick="SearchManager.closeSearchResults()">선택 완료</button>
                <button class="close-search-results" onclick="SearchManager.closeSearchResults()">×</button>
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
        if (SpiritUtils.checkSpiritData(spirit, selectedSearchStats)) {
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
      card.onclick = () => handleSelectSpirit(spirit, card);

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

  function getSpiritStats(spirit) {
    const STATS_MAPPING = window.CommonData.STATS_MAPPING || {};
    const stats = {};

    if (!spirit.stats || !Array.isArray(spirit.stats)) return stats;

    for (const levelStat of spirit.stats) {
      if (!levelStat.registrationStat) continue;

      for (const stat in levelStat.registrationStat) {
        const normalizedStat = SpiritUtils.normalizeStatKey(stat);
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

  function closeSearchResults() {
    const modal = document.getElementById("search-results-modal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  function initializeAds(container) {
    try {
      let adElements;

      if (container instanceof NodeList) {
        adElements = container;
      } else if (
        container &&
        typeof container.querySelectorAll === "function"
      ) {
        adElements = container.querySelectorAll(".kakao_ad_area");
      } else {
        adElements = document.querySelectorAll(".kakao_ad_area");
      }

      // 유효한 광고 유닛 ID가 있는지 확인
      adElements.forEach((ad) => {
        if (ad) {
          const adUnit = ad.getAttribute("data-ad-unit");
          if (adUnit && adUnit.trim() !== "") {
            ad.style.display = "inline-block";
          } else {
            console.warn("Empty or invalid ad unit ID");
            // 광고 유닛 ID가 없으면 표시하지 않음
            ad.style.display = "none";
          }
        }
      });

      // 애드핏 스크립트 로드 또는 새로고침
      if (typeof window.adfit === "function") {
        // 이미 로드된 경우 함수 호출
        try {
          window.adfit();
        } catch (e) {
          console.warn("Error calling adfit function:", e);
        }
      } else {
        // 스크립트 로드
        const existingScript = document.querySelector(
          'script[src="//t1.daumcdn.net/kas/static/ba.min.js"]'
        );
        if (!existingScript) {
          const reloadScript = document.createElement("script");
          reloadScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
          reloadScript.async = true;
          reloadScript.onerror = function () {
            console.warn("Failed to load Kakao ad script");
          };
          document.body.appendChild(reloadScript);
        }
      }
    } catch (e) {
      console.error("Error initializing ads:", e);
    }
  }

  return {
    initializeAds,
    collectAllStatNames,
    toggleStatSelection,
    updateSelectedStatsDisplay,
    removeSelectedStat,
    populateStatOptions,
    toggleStatOptions,
    filterStatOptions,
    showSearchResults,
    closeSearchResults,
    getSpiritStats,
  };
})();

window.SearchManager = SearchManager;

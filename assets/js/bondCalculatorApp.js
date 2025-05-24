const BondCalculatorApp = (function () {
  const FIXED_LEVEL25_SPIRITS = window.CommonData.FIXED_LEVEL25_SPIRITS || [];

  let selectedSpirits = [];
  let lastActiveCategory = "수호";
  let currentScrollY = 0;

  function initialize() {
    const container = document.getElementById("imageContainer");
    if (container) {
      container.innerHTML =
        '<div class="loading-indicator">데이터 로딩 중...</div>';
    }

    const savedCategory = localStorage.getItem("lastActiveCategory");
    if (savedCategory) {
      lastActiveCategory = savedCategory;
    } else {
      lastActiveCategory = "수호";
    }

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.toggle("active", tab.textContent === lastActiveCategory);

      tab.addEventListener("click", function () {
        const category = this.getAttribute("data-category");
        showCategory(category);
      });
    });

    const toggle = document.getElementById("influenceToggle");
    if (toggle) {
      toggle.addEventListener("change", function () {
        const groupByInfluence = toggle.checked;

        if (window.UIRenderer) {
          window.UIRenderer.showCategory(lastActiveCategory, {
            selectMode: true,
            onSelect: handleSpiritSelection,
          });
        }

        setTimeout(() => {
          applySelectedState();
        }, 100);
      });
    }

    // initHelpTooltip();
    initPanelToggle();

    if (
      window.UIRenderer &&
      typeof window.UIRenderer.initUIEvents === "function"
    ) {
      window.UIRenderer.initUIEvents();
    } else {
      console.warn("UIRenderer가 초기화되지 않았습니다.");
    }

    if (
      window.DataManager &&
      typeof window.DataManager.loadCategoryData === "function"
    ) {
      window.DataManager.loadCategoryData()
        .then(() => {
          loadSelectedSpiritsFromStorage();
          showCategory(lastActiveCategory, false);
        })
        .catch((error) => {
          console.error("Failed to load category data:", error);
          if (container) {
            container.innerHTML =
              '<div class="error-message">데이터를 불러오는 데 실패했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.</div>';
          }
        });
    }

    OptimalResultModal.initModalStyles();

    window.addEventListener("resize", handleResponsiveLayout);
    window.addEventListener("DOMContentLoaded", function () {
      handleResponsiveLayout();
      updateMobilePanel();

      setTimeout(() => {
        updateMobilePanel();
      }, 500);
    });

    const optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeOptimalModal();
        }
      });
    } else {
      const newModal = document.createElement("div");
      newModal.id = "optimalModal";
      newModal.className = "modal-overlay";
      newModal.style.display = "none";
      document.body.appendChild(newModal);

      newModal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeOptimalModal();
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeOptimalModal();
      }
    });

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = "bond-calculator.css";
    // document.head.appendChild(link);
  }

  function initHelpTooltip() {
    const helpBtn = document.getElementById("helpBtn");
    const helpTooltip = document.getElementById("helpTooltip");
    const closeHelpBtn = document.getElementById("closeHelp");

    if (helpBtn && helpTooltip && closeHelpBtn) {
      helpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        helpTooltip.style.display =
          helpTooltip.style.display === "block" ? "none" : "block";
      });

      closeHelpBtn.addEventListener("click", () => {
        helpTooltip.style.display = "none";
      });

      document.addEventListener("click", (event) => {
        if (
          helpTooltip.style.display === "block" &&
          !helpTooltip.contains(event.target) &&
          !helpBtn.contains(event.target)
        ) {
          helpTooltip.style.display = "none";
        }
      });
    }
  }

  function initPanelToggle() {
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
  }

  function mobilePanelToggle(e) {
    e.preventDefault();
    e.stopPropagation();

    const mobilePanel = document.querySelector(
      "#panelToggleContainer .right-panel"
    );
    const toggleIcon = document.querySelector("#panelToggleBtn .toggle-icon");

    if (!mobilePanel) {
      return;
    }

    if (mobilePanel.classList.contains("collapsed")) {
      mobilePanel.classList.remove("collapsed");
      mobilePanel.style.display = "block";
      mobilePanel.style.maxHeight = "80vh";

      if (toggleIcon) {
        toggleIcon.textContent = "▼";
        toggleIcon.style.transform = "rotate(0deg)";
      }
    } else {
      mobilePanel.classList.add("collapsed");
      mobilePanel.style.maxHeight = "0";

      if (toggleIcon) {
        toggleIcon.textContent = "▲";
        toggleIcon.style.transform = "rotate(360deg)";
      }
    }
  }

  function handleResponsiveLayout() {
    const toggleContainer = document.getElementById("panelToggleContainer");
    const mainRightPanel = document.querySelector(".main-content .right-panel");

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.remove("active");
      if (tab.getAttribute("data-category") === lastActiveCategory) {
        tab.classList.add("active");
      }
    });

    const isMobile = screen.width <= 768 || window.innerWidth <= 768;

    if (toggleContainer) {
      if (isMobile) {
        const categorySpirits = selectedSpirits.filter(
          (spirit) => spirit.category === lastActiveCategory
        );

        if (categorySpirits.length > 0) {
          toggleContainer.style.display = "flex";

          const mobileCountElement = document.getElementById(
            "mobileSelectedCount"
          );
          if (mobileCountElement) {
            mobileCountElement.textContent = categorySpirits.length;
          }
        } else {
          toggleContainer.style.display = "none";
        }
      } else {
        toggleContainer.style.display = "none";
      }
    }

    if (mainRightPanel) {
      if (isMobile) {
        mainRightPanel.style.display = "none";
      } else {
        mainRightPanel.style.display = "block";
      }
    }

    updateSelectedCount();
    updateSelectedSpiritsPanel();
  }

  function showCategory(category, resetSelection = false) {
    const prevCategory = lastActiveCategory;
    lastActiveCategory = category;
    localStorage.setItem("lastActiveCategory", category);

    const savedScrollY = window.scrollY;

    if (resetSelection) {
      selectedSpirits = selectedSpirits.filter(
        (spirit) => spirit.category !== category
      );
      updateSelectedCount();
      updateSelectedSpiritsPanel();
      saveSelectedSpiritsToStorage();
    }

    if (window.UIRenderer) {
      window.UIRenderer.setSelectionMode(true, handleSpiritSelection);
      window.UIRenderer.showCategory(category);
    }

    if (prevCategory !== category) {
      updateSelectedCount(category);
    }

    applySelectedState();
    updateSelectedCount(category);
    updateSelectedSpiritsPanel(category);
    updateMobilePanel();

    if (resetSelection) {
      window.scrollTo(0, savedScrollY);
    }
  }

  function handleSpiritSelection(spirit, category) {
    const savedScrollY = window.scrollY;

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
      const isFixed = SpiritUtils.isFixedLevelSpirit(spirit.name);
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
  }

  function applySelectedState() {
    document.querySelectorAll("img.selected").forEach((img) => {
      img.classList.remove("selected");
    });

    document.querySelectorAll(".center-check-mark").forEach((marker) => {
      marker.remove();
    });

    const currentCategorySelections = selectedSpirits.filter(
      (spirit) => spirit.category === lastActiveCategory
    );

    if (currentCategorySelections.length === 0) return;

    currentCategorySelections.forEach((spirit) => {
      const imagePath = spirit.image;
      const imageNameMatch = imagePath.match(
        /[^/\\&?]+\.\w{3,4}(?=([?&].*$|$))/
      );
      const imageName = imageNameMatch ? imageNameMatch[0] : imagePath;

      document.querySelectorAll(".img-wrapper img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        const srcFilename = src.split("/").pop();
        const imageFilename = imagePath.split("/").pop();

        if (src === spirit.image || srcFilename === imageFilename) {
          img.classList.add("selected");

          const imgWrapper = img.closest(".img-wrapper");
          if (imgWrapper && !imgWrapper.querySelector(".center-check-mark")) {
            const existingCheckMarks =
              imgWrapper.querySelectorAll(".center-check-mark");
            existingCheckMarks.forEach((mark) => mark.remove());

            const checkMark = document.createElement("div");
            checkMark.className = "center-check-mark";
            checkMark.innerHTML = "✓";

            imgWrapper.style.position = "relative";
            imgWrapper.appendChild(checkMark);
          }
        }
      });
    });
  }

  function updateSelectedSpiritsPanel(forceCategory = null) {
    const currentCategory = forceCategory || lastActiveCategory;
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
               <button class="min-btn" onclick="BondCalculatorApp.setMinLevel(${originalIndex})">m</button>
               <button onclick="BondCalculatorApp.changeLevel(${originalIndex}, -1)">-</button>
               <input type="number" min="0" max="25" value="${
                 spirit.level || 0
               }"
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

  function setMinLevel(index) {
    currentScrollY = window.scrollY;
    selectedSpirits[index].level = 0;

    const levelInputs = document.querySelectorAll(`#level-input-${index}`);
    levelInputs.forEach((input) => {
      input.value = 0;
    });

    saveSelectedSpiritsToStorage();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function updateMobilePanel() {
    const toggleContainer = document.getElementById("panelToggleContainer");
    if (!toggleContainer) {
      return;
    }

    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    if (screen.width <= 768 || window.innerWidth <= 768) {
      if (categorySpirits.length > 0) {
        toggleContainer.style.display = "flex";
        const mobileCountElement = document.getElementById(
          "mobileSelectedCount"
        );
        if (mobileCountElement) {
          mobileCountElement.textContent = categorySpirits.length;
        }
      } else {
        toggleContainer.style.display = "none";
      }
    } else {
      toggleContainer.style.display = "none";
    }
  }

  function updateSelectedCount(forceCategory = null) {
    const currentCategory = forceCategory || lastActiveCategory;

    if (!currentCategory) {
      return;
    }

    const filteredCount = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    ).length;

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
    selectedSpirits.forEach((spirit) => {
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

  function setMaxBatchLevel(inputId) {
    document.getElementById(inputId).value = "25";
    applyBatchLevel(inputId);
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

  function saveSelectedSpiritsToStorage() {
    localStorage.setItem("selectedSpirits", JSON.stringify(selectedSpirits));
    updateMobilePanel();
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

  function findOptimalCombination() {
    return OptimalCombinationFinder.findOptimalCombination(
      selectedSpirits,
      lastActiveCategory
    );
  }

  function closeOptimalModal() {
    OptimalCombinationFinder.closeOptimalModal();
  }

  return {
    initialize,
    showCategory,
    updateSpiritLevel,
    setMaxLevel,
    setMinLevel,
    changeLevel,
    applyBatchLevel,
    setMaxBatchLevel,
    removeSpirit,
    clearAllSelections,
    findOptimalCombination,
    closeOptimalModal,
    applySelectedState,
    updateSelectedCount,
    updateMobilePanel,
  };
})();

window.BondCalculatorApp = BondCalculatorApp;

document.addEventListener("DOMContentLoaded", function () {
  BondCalculatorApp.initialize();
});

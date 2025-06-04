window.UIRenderer = (function () {
  const localUtils = {
    createElement: function (type, className, attributes = {}) {
      const element = document.createElement(type);
      if (className) {
        if (Array.isArray(className)) {
          element.classList.add(...className);
        } else {
          element.className = className;
        }
      }

      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "text" || key === "textContent") {
          element.textContent = value;
        } else if (key === "html" || key === "innerHTML") {
          element.innerHTML = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      return element;
    },
    debounce: function (func, wait) {
      let timeout;
      return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    },
    updateVisibility: function (element, isVisible) {
      if (!element) return;
      element.style.display = isVisible ? "" : "none";
    },
    createButton: function (text, className, clickHandler) {
      const button = this.createElement("button", className, { text });
      if (clickHandler) {
        button.addEventListener("click", clickHandler);
      }
      return button;
    },
  };

  const Utils = window.Utils || localUtils;

  let currentCategory = "수호";
  let groupByInfluence = false;
  let selectionMode = false;
  let selectionCallback = null;
  let isAdjusting = false;
  let currentStatFilter = "";
  let resizeTimer = null;

  function initUIEvents() {
    setupTabEvents();
    setupToggleEvents();
    initHelpTooltip();
    initStatFilter();
    initTipToolTip();

    window.addEventListener("resize", Utils.debounce(adjustIndicatorSize, 100));
    setTimeout(adjustIndicatorSize, 200);
  }

  function setupTabEvents() {
    const subTabs = document.querySelectorAll(".sub-tabs .tab");
    subTabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        const newCategory = tab.getAttribute("data-category");
        currentCategory = newCategory;

        showCategory(currentCategory);

        if (window.BondCalculatorApp) {
          if (typeof window.BondCalculatorApp.showCategory === "function") {
            window.BondCalculatorApp.showCategory(currentCategory, false);
          }

          if (
            typeof window.BondCalculatorApp.updateSelectedCount === "function"
          ) {
            setTimeout(
              () =>
                window.BondCalculatorApp.updateSelectedCount(currentCategory),
              50
            );
          }
        }
      });
    });
  }

  function setupToggleEvents() {
    const toggle = document.getElementById("influenceToggle");
    if (toggle) {
      toggle.addEventListener("change", function () {
        document.querySelectorAll(".level25-indicator").forEach((ind) => {
          ind.style.opacity = "0";
        });

        groupByInfluence = toggle.checked;

        showCategory(currentCategory, {
          selectMode: selectionMode,
          onSelect: selectionCallback,
        });

        if (window.BondCalculatorApp) {
          setTimeout(() => {
            if (
              typeof window.BondCalculatorApp.applySelectedState === "function"
            ) {
              window.BondCalculatorApp.applySelectedState();
            }
          }, 100);
        }
      });
      toggle.checked = groupByInfluence;
    }
  }

  function initTipToolTip() {
    const tipBtn = document.getElementById("tipBtn");
    const tipTooltip = document.getElementById("tipTooltip");
    const closeTip = document.getElementById("closeTip");

    if (tipBtn) {
      tipBtn.addEventListener("click", function () {
        tipTooltip.style.display =
          tipTooltip.style.display === "block" ? "none" : "block";
      });

      closeTip?.addEventListener("click", function () {
        tipTooltip.style.display = "none";
      });

      document.addEventListener("click", function (event) {
        if (
          !tipBtn.contains(event.target) &&
          !tipTooltip.contains(event.target)
        ) {
          tipTooltip.style.display = "none";
        }
      });
    }
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

  function initStatFilter() {
    const viewToggleContainer = document.querySelector(
      ".view-toggle-container"
    );
    if (!viewToggleContainer) return;

    const existingFilter = document.querySelector(".stat-filter-container");
    if (existingFilter) {
      existingFilter.remove();
    }

    const filterContainer = Utils.createElement("div", "stat-filter-container");
    const statFilter = Utils.createElement("select", "stat-filter", {
      id: "statFilter",
    });
    const defaultOption = Utils.createElement("option", "", {
      value: "",
      text: "능력치 필터",
    });
    statFilter.appendChild(defaultOption);

    const clearBtn = Utils.createButton("초기화", "clear-filter-btn", () => {
      statFilter.value = "";
      currentStatFilter = "";
      clearBtn.style.display = "none";
      showCategory(currentCategory, {
        selectMode: selectionMode,
        onSelect: selectionCallback,
      });
    });
    clearBtn.id = "clearFilter";
    clearBtn.style.display = "none";

    filterContainer.appendChild(statFilter);
    filterContainer.appendChild(clearBtn);
    viewToggleContainer.appendChild(filterContainer);

    populateStatOptions(statFilter);

    statFilter.addEventListener("change", function () {
      const selectedStat = this.value;
      currentStatFilter = selectedStat;
      clearBtn.style.display = selectedStat ? "block" : "none";
      showCategory(currentCategory, {
        selectMode: selectionMode,
        onSelect: selectionCallback,
        statFilter: selectedStat,
      });
    });
  }

  function populateStatOptions(selectElement) {
    const statsMapping = window.CommonData.STATS_MAPPING;
    const statsOrder = window.CommonData.STATS_ORDER || [];

    if (!statsMapping || typeof statsMapping !== "object") return;

    const statNames = new Set();

    if (Array.isArray(statsOrder)) {
      statsOrder.forEach((statKey) => {
        if (statsMapping[statKey]) {
          statNames.add(statKey);
        }
      });
    }

    Object.keys(statsMapping).forEach((statKey) => {
      statNames.add(statKey);
    });

    statNames.forEach((statKey) => {
      const option = Utils.createElement("option", "", {
        value: statKey,
        text: statsMapping[statKey] || statKey,
      });
      selectElement.appendChild(option);
    });
  }

  function showCategory(category, options = {}) {
    const prevCategory = currentCategory;
    currentCategory = category;

    if (options.selectMode !== undefined) {
      selectionMode = options.selectMode;
    }

    if (typeof options.onSelect === "function") {
      selectionCallback = options.onSelect;
    }

    const container = document.getElementById("imageContainer");
    if (!container) {
      console.error("Image container not found!");
      return;
    }
    container.innerHTML = "";

    updateActiveTab(category);

    if (groupByInfluence) {
      displayPetsByInfluence(category, container);
    } else {
      displayAllPets(category, container);
    }

    if (options.statFilter || currentStatFilter) {
      filterItemsByStat(options.statFilter || currentStatFilter);
    }

    if (
      prevCategory !== category &&
      window.BondCalculatorApp &&
      typeof window.BondCalculatorApp.updateSelectedCount === "function"
    ) {
      setTimeout(
        () => window.BondCalculatorApp.updateSelectedCount(category),
        0
      );
    }

    setTimeout(adjustIndicatorSize, 50);
  }

  function updateActiveTab(category) {
    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.remove("active");
      if (tab.getAttribute("data-category") === category) {
        tab.classList.add("active");
      }
    });
  }

  function filterItemsByStat(statKey) {
    if (!statKey) return;

    const category = currentCategory;
    const allItems = window.DataManager.getData(category);

    const imgWrappers = document.querySelectorAll(".img-wrapper");
    imgWrappers.forEach((wrapper) => {
      const img = wrapper.querySelector("img");
      if (!img) return;

      const itemName = img.alt;
      const item = allItems.find((i) => i && i.name === itemName);

      if (!item) {
        Utils.updateVisibility(wrapper, false);
        return;
      }

      const hasStatEffect = checkItemForStatEffect(item, statKey);
      Utils.updateVisibility(wrapper, hasStatEffect);
    });

    updateGroupVisibility();
  }

  function checkItemForStatEffect(item, statKey) {
    if (!item || !Array.isArray(item.stats)) return false;

    for (const stat of item.stats) {
      if (stat && stat.registrationStat && stat.registrationStat[statKey])
        return true;
      if (stat && stat.bindStat && stat.bindStat[statKey]) return true;
    }

    return false;
  }

  function updateGroupVisibility() {
    if (!groupByInfluence) return;

    const influenceGroups = document.querySelectorAll(".influence-group");
    influenceGroups.forEach((group) => {
      const visibleItems = group.querySelectorAll(
        '.img-wrapper[style="display: ;"], .img-wrapper:not([style*="display"])'
      );
      Utils.updateVisibility(group, visibleItems.length > 0);
    });

    const rows = document.querySelectorAll(".influence-row");
    rows.forEach((row) => {
      const visibleGroups = row.querySelectorAll(
        '.influence-group[style="display: ;"], .influence-group:not([style*="display"])'
      );
      Utils.updateVisibility(row, visibleGroups.length > 0);
    });
  }

  function adjustIndicatorSize() {
    if (isAdjusting) return;
    isAdjusting = true;

    const imgBoxes = document.querySelectorAll(".img-box");
    let pendingImages = 0;

    imgBoxes.forEach((box) => {
      const img = box.querySelector("img");
      const indicator = box.querySelector(".level25-indicator");

      if (img && indicator) {
        if (img.complete) {
          updateIndicator(img, indicator);
        } else {
          pendingImages++;
          img.onload = function () {
            updateIndicator(img, indicator);
            pendingImages--;
            if (pendingImages === 0) {
              isAdjusting = false;
            }
          };
        }
      }
    });

    if (pendingImages === 0) {
      isAdjusting = false;
    }
  }

  function updateIndicator(img, indicator) {
    const imgWidth = img.offsetWidth;
    const indicatorSize = Math.max(
      10,
      Math.min(Math.round(imgWidth * 0.28), 30)
    );
    const fontSize = Math.max(6, Math.round(indicatorSize * 0.65));

    indicator.style.width = indicatorSize + "px";
    indicator.style.height = indicatorSize + "px";

    const span = indicator.querySelector("span");
    if (span) {
      span.style.fontSize = fontSize + "px";
    }

    const margin = Math.max(3, Math.min(Math.round(imgWidth * 0.02), 6));
    indicator.style.right = margin + 2 + "px";
    indicator.style.bottom = margin + "px";

    indicator.style.opacity = "1";
  }

  function displayAllPets(category, container) {
    container.className = "image-container-grid";

    const itemsInCategory = window.DataManager.getData(category);
    if (
      !itemsInCategory ||
      !Array.isArray(itemsInCategory) ||
      itemsInCategory.length === 0
    ) {
      renderEmptyState(container, `표시할 ${category} 환수 정보가 없습니다.`);
      return;
    }

    itemsInCategory.forEach((item) => {
      if (!item || !item.image || !item.name) return;
      const imgWrapper = createImageWrapper(item, category);
      container.appendChild(imgWrapper);
    });

    if (
      selectionMode &&
      window.BondCalculatorApp &&
      typeof window.BondCalculatorApp.applySelectedState === "function"
    ) {
      setTimeout(() => window.BondCalculatorApp.applySelectedState(), 50);
    }
  }

  function displayPetsByInfluence(category, container) {
    container.className = "image-container-grouped";

    const firstRowInfluences = ["결의", "고요", "의지"];
    const secondRowInfluences = ["침착", "냉정", "활력"];

    const itemsInCategory = window.DataManager.getData(category);
    if (
      !itemsInCategory ||
      !Array.isArray(itemsInCategory) ||
      itemsInCategory.length === 0
    ) {
      renderEmptyState(container, `표시할 ${category} 환수 정보가 없습니다.`);
      return;
    }

    const firstRow = Utils.createElement("div", "influence-row");
    let firstRowHasContent = false;

    firstRowInfluences.forEach((influence) => {
      const groupWrapper = createInfluenceGroup(
        category,
        influence,
        itemsInCategory
      );
      if (groupWrapper) {
        firstRow.appendChild(groupWrapper);
        firstRowHasContent = true;
      }
    });

    if (firstRowHasContent) container.appendChild(firstRow);

    const secondRow = Utils.createElement("div", "influence-row");
    let secondRowHasContent = false;

    secondRowInfluences.forEach((influence) => {
      const groupWrapper = createInfluenceGroup(
        category,
        influence,
        itemsInCategory
      );
      if (groupWrapper) {
        secondRow.appendChild(groupWrapper);
        secondRowHasContent = true;
      }
    });

    if (secondRowHasContent) container.appendChild(secondRow);

    const itemsWithoutInfluence = itemsInCategory.filter(
      (item) =>
        !item.influence ||
        (!firstRowInfluences.includes(item.influence) &&
          !secondRowInfluences.includes(item.influence))
    );

    if (itemsWithoutInfluence.length > 0) {
      const unknownRow = Utils.createElement("div", "influence-row");
      const unknownGroup = Utils.createElement("div", "influence-group");

      const headerWrapper = Utils.createElement("div", "header-wrapper");
      const header = Utils.createElement("h3", "influence-header", {
        text: "기타",
      });
      const countSpan = Utils.createElement("span", "influence-count", {
        text: ` (${itemsWithoutInfluence.length})`,
      });
      header.appendChild(countSpan);
      headerWrapper.appendChild(header);
      unknownGroup.appendChild(headerWrapper);

      const itemsWrapper = Utils.createElement("div", "influence-items");

      itemsWithoutInfluence.forEach((item) => {
        if (!item || !item.image || !item.name) return;
        const imgWrapper = createImageWrapper(item, category);
        itemsWrapper.appendChild(imgWrapper);
      });

      unknownGroup.appendChild(itemsWrapper);
      unknownRow.appendChild(unknownGroup);
      container.appendChild(unknownRow);
    }

    if (
      selectionMode &&
      window.BondCalculatorApp &&
      typeof window.BondCalculatorApp.applySelectedState === "function"
    ) {
      setTimeout(() => window.BondCalculatorApp.applySelectedState(), 100);
    }
  }

  function renderEmptyState(container, message) {
    container.innerHTML = `<p>${message}</p>`;
  }

  function createInfluenceGroup(category, influence, itemsInCategory) {
    if (!window.DataManager.FACTION_ICONS) {
      console.error("FACTION_ICONS is not available!");
      return null;
    }

    const itemsForInfluence = itemsInCategory.filter(
      (item) => item && item.influence === influence
    );

    if (itemsForInfluence.length === 0) {
      return null;
    }

    const groupWrapper = Utils.createElement("div", "influence-group");
    const headerWrapper = Utils.createElement("div", "header-wrapper");

    const iconSrc = window.DataManager.FACTION_ICONS[influence];
    if (iconSrc) {
      const influenceIcon = Utils.createElement("img", "influence-icon", {
        src: iconSrc,
        alt: `${influence} 아이콘`,
      });
      headerWrapper.appendChild(influenceIcon);
    }

    const header = Utils.createElement("h3", "influence-header", {
      text: influence,
    });
    const countSpan = Utils.createElement("span", "influence-count", {
      text: ` (${itemsForInfluence.length})`,
    });
    header.appendChild(countSpan);
    headerWrapper.appendChild(header);
    groupWrapper.appendChild(headerWrapper);

    const itemsWrapper = Utils.createElement("div", "influence-items");

    itemsForInfluence.forEach((item) => {
      if (!item || !item.image || !item.name) return;
      const imgWrapper = createImageWrapper(item, category);
      itemsWrapper.appendChild(imgWrapper);
    });

    groupWrapper.appendChild(itemsWrapper);
    return groupWrapper;
  }

  function createImageWrapper(item, category) {
    const imgWrapper = Utils.createElement("div", "img-wrapper");
    const imgBox = Utils.createElement("div", "img-box");
    imgWrapper.appendChild(imgBox);

    const { hasFullRegistration, hasFullBind } =
      window.DataManager.checkSpiritStats(item);

    const img = createImageElement(item, category);
    imgBox.appendChild(img);

    updateRibbonIndicators(imgBox, item, hasFullRegistration, hasFullBind);
    setupImageClickEvent(imgBox, item, category);

    const nameLabel = Utils.createElement("small", "img-name", {
      text: item.name,
    });
    imgWrapper.appendChild(nameLabel);

    return imgWrapper;
  }

  function createImageElement(item, category) {
    return Utils.createElement("img", "", {
      src: item.image,
      alt: item.name,
      title: item.name,
      loading: "lazy",
      "data-category": category,
      "data-image": item.image,
      "data-influence": item.influence || "",
    });
  }

  function updateRibbonIndicators(
    imgBox,
    item,
    hasFullRegistration,
    hasFullBind
  ) {
    if (hasFullRegistration) {
      imgBox.classList.add("registration-completed");
    }

    if (hasFullBind) {
      imgBox.classList.add("bond-completed");
    }

    if (window.DataManager.hasLevel25BindStats(item)) {
      const level25Indicator = Utils.createElement("div", "level25-indicator", {
        title: "25레벨 결속 효과 보유",
      });
      level25Indicator.innerHTML = "<span>25</span>";
      imgBox.appendChild(level25Indicator);
    }
  }

  function setupImageClickEvent(imgBox, item, category) {
    if (selectionMode && selectionCallback) {
      imgBox.addEventListener("click", () => {
        selectionCallback(item, category);
      });
    } else {
      imgBox.addEventListener("click", () => {
        // console.log("이미지 클릭됨:", item.name);

        const statFilter = document.getElementById("statFilter");
        const highlightStat = statFilter?.value || currentStatFilter || null;

        if (ModalHandler && typeof ModalHandler.showInfo === "function") {
          // console.log("ModalHandler.showInfo 호출 (필터:", highlightStat, ")");
          ModalHandler.showInfo(
            category,
            item.image,
            item.influence,
            highlightStat,
            item.name
          );
        } else {
          console.error(
            "ModalHandler가 정의되지 않았거나 showInfo 함수가 없습니다"
          );
        }
      });
    }
    imgBox.style.cursor = "pointer";
  }

  function setSelectionMode(isEnabled, callback) {
    selectionMode = isEnabled === true;
    selectionCallback = typeof callback === "function" ? callback : null;
    showCategory(currentCategory, {
      selectMode: selectionMode,
      onSelect: selectionCallback,
    });
    return selectionMode;
  }

  function getCurrentCategory() {
    return currentCategory;
  }

  return {
    initUIEvents,
    showCategory,
    displayAllPets,
    displayPetsByInfluence,
    createInfluenceGroup,
    setSelectionMode,
    getCurrentCategory,
    adjustIndicatorSize,
  };
})();

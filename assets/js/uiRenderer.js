window.UIRenderer =
  window.UIRenderer ||
  (function () {
    let currentCategory = "수호";
    let groupByInfluence = false;
    let selectionMode = false;
    let selectionCallback = null;
    let isAdjusting = false;
    let currentStatFilter = "";

    function initUIEvents() {
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
                typeof window.BondCalculatorApp.applySelectedState ===
                "function"
              ) {
                window.BondCalculatorApp.applySelectedState();
              }
            }, 100);
          }
        });
        toggle.checked = groupByInfluence;
      } else {
        console.warn("Influence toggle switch not found in the DOM.");
      }

      initHelpTooltip();
      initStatFilter();

      window.addEventListener("resize", function () {
        if (!isAdjusting) {
          clearTimeout(initUIEvents.resizeTimer);
          initUIEvents.resizeTimer = setTimeout(adjustIndicatorSize, 100);
        }
      });

      setTimeout(adjustIndicatorSize, 200);
    }
    initUIEvents.resizeTimer = null;

    function initStatFilter() {
      const viewToggleContainer = document.querySelector(
        ".view-toggle-container"
      );
      if (!viewToggleContainer) {
        console.error("View toggle container not found");
        return;
      }

      const existingFilter = document.querySelector(".stat-filter-container");
      if (existingFilter) {
        existingFilter.remove();
      }

      const filterContainer = document.createElement("div");
      filterContainer.className = "stat-filter-container";

      const statFilter = document.createElement("select");
      statFilter.id = "statFilter";
      statFilter.className = "stat-filter";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "능력치 필터";
      statFilter.appendChild(defaultOption);

      const clearBtn = document.createElement("button");
      clearBtn.id = "clearFilter";
      clearBtn.className = "clear-filter-btn";
      clearBtn.textContent = "초기화";
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

      clearBtn.addEventListener("click", function () {
        statFilter.value = "";
        currentStatFilter = "";
        this.style.display = "none";

        showCategory(currentCategory, {
          selectMode: selectionMode,
          onSelect: selectionCallback,
        });
      });
    }

    function populateStatOptions(selectElement) {
      const statsMapping = window.CommonData.STATS_MAPPING;
      const statsOrder = window.CommonData.STATS_ORDER || [];

      if (!statsMapping || typeof statsMapping !== "object") {
        console.error("STATS_MAPPING is not available or not an object");
        return;
      }

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
        const option = document.createElement("option");
        option.value = statKey;
        option.textContent = statsMapping[statKey] || statKey;
        selectElement.appendChild(option);
      });
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

      document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
        tab.classList.remove("active");
        if (tab.getAttribute("data-category") === category) {
          tab.classList.add("active");
        }
      });

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
          wrapper.style.display = "none";
          return;
        }

        let hasStatEffect = false;

        if (item.stats && Array.isArray(item.stats)) {
          for (const stat of item.stats) {
            if (
              stat &&
              stat.registrationStat &&
              stat.registrationStat[statKey]
            ) {
              hasStatEffect = true;
              break;
            }
            if (stat && stat.bindStat && stat.bindStat[statKey]) {
              hasStatEffect = true;
              break;
            }
          }
        }

        wrapper.style.display = hasStatEffect ? "" : "none";
      });

      if (groupByInfluence) {
        const influenceGroups = document.querySelectorAll(".influence-group");
        influenceGroups.forEach((group) => {
          const visibleItems = group.querySelectorAll(
            '.img-wrapper[style="display: ;"], .img-wrapper:not([style*="display"])'
          );
          if (visibleItems.length === 0) {
            group.style.display = "none";
          } else {
            group.style.display = "";
          }
        });

        const rows = document.querySelectorAll(".influence-row");
        rows.forEach((row) => {
          const visibleGroups = row.querySelectorAll(
            '.influence-group[style="display: ;"], .influence-group:not([style*="display"])'
          );
          if (visibleGroups.length === 0) {
            row.style.display = "none";
          } else {
            row.style.display = "";
          }
        });
      }
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
    }

    function displayAllPets(category, container) {
      container.className = "image-container-grid";

      const itemsInCategory = window.DataManager.getData(category);
      if (
        !itemsInCategory ||
        !Array.isArray(itemsInCategory) ||
        itemsInCategory.length === 0
      ) {
        container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
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
        container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
        return;
      }

      const firstRow = document.createElement("div");
      firstRow.className = "influence-row";
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

      const secondRow = document.createElement("div");
      secondRow.className = "influence-row";
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

      if (
        !firstRowHasContent &&
        !secondRowHasContent &&
        itemsInCategory.length > 0
      ) {
        container.innerHTML = `<p>알려진 세력에 속하지 않는 ${category} 환수가 있습니다.</p>`;
      } else if (!firstRowHasContent && !secondRowHasContent) {
        container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
      }

      if (
        selectionMode &&
        window.BondCalculatorApp &&
        typeof window.BondCalculatorApp.applySelectedState === "function"
      ) {
        setTimeout(() => window.BondCalculatorApp.applySelectedState(), 100);
      }
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

      const groupWrapper = document.createElement("div");
      groupWrapper.className = "influence-group";

      const headerWrapper = document.createElement("div");
      headerWrapper.className = "header-wrapper";

      const influenceIcon = document.createElement("img");
      const iconSrc = window.DataManager.FACTION_ICONS[influence];
      if (iconSrc) {
        influenceIcon.src = iconSrc;
        influenceIcon.alt = `${influence} 아이콘`;
        influenceIcon.className = "influence-icon";
        headerWrapper.appendChild(influenceIcon);
      } else {
        console.warn(`Icon not found for influence: ${influence}.`);
      }

      const header = document.createElement("h3");
      header.className = "influence-header";
      header.textContent = influence;
      const countSpan = document.createElement("span");
      countSpan.className = "influence-count";
      countSpan.textContent = ` (${itemsForInfluence.length})`;
      header.appendChild(countSpan);
      headerWrapper.appendChild(header);
      groupWrapper.appendChild(headerWrapper);

      const itemsWrapper = document.createElement("div");
      itemsWrapper.className = "influence-items";

      itemsForInfluence.forEach((item) => {
        if (!item || !item.image || !item.name) return;

        const imgWrapper = createImageWrapper(item, category);
        itemsWrapper.appendChild(imgWrapper);
      });

      groupWrapper.appendChild(itemsWrapper);
      return groupWrapper;
    }

    function createImageWrapper(item, category) {
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "img-wrapper";

      const imgBox = document.createElement("div");
      imgBox.className = "img-box";
      imgWrapper.appendChild(imgBox);

      const { hasFullRegistration, hasFullBind } =
        window.DataManager.checkSpiritStats(item);

      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      img.title = item.name;
      img.loading = "lazy";
      img.dataset.category = category;
      img.dataset.image = item.image;
      img.dataset.influence = item.influence || "";

      imgBox.appendChild(img);

      if (hasFullRegistration) {
        imgBox.classList.add("registration-completed");
      }
      if (hasFullBind) {
        imgBox.classList.add("bond-completed");
      }

      if (window.DataManager.hasLevel25BindStats(item)) {
        const level25Indicator = document.createElement("div");
        level25Indicator.className = "level25-indicator";
        level25Indicator.innerHTML = "<span>25</span>";
        level25Indicator.title = "25레벨 결속 효과 보유";
        imgBox.appendChild(level25Indicator);
      }

      if (selectionMode && selectionCallback) {
        imgBox.addEventListener("click", function () {
          selectionCallback(item, category);
        });
        imgBox.style.cursor = "pointer";
      } else {
        imgBox.addEventListener("click", function () {
          if (window.ModalHandler) {
            window.ModalHandler.showInfo(category, item.image, item.influence);
          }
        });
        imgBox.style.cursor = "pointer";
      }

      const nameLabel = document.createElement("small");
      nameLabel.className = "img-name";
      nameLabel.textContent = item.name;
      imgWrapper.appendChild(nameLabel);

      return imgWrapper;
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

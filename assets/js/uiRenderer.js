const UIRenderer = (function () {
  let currentCategory = "수호";
  let groupByInfluence = false;
  let selectionMode = false;
  let selectionCallback = null;

  function initUIEvents() {
    const subTabs = document.querySelectorAll(".sub-tabs .tab");
    subTabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        const newCategory = tab.getAttribute("data-category");
        currentCategory = newCategory;

        showCategory(currentCategory);

        // 중요: BondCalculator에게 탭 변경을 명확히 알리고 카운트 업데이트 요청
        if (window.BondCalculatorApp) {
          if (typeof window.BondCalculatorApp.showCategory === "function") {
            window.BondCalculatorApp.showCategory(currentCategory, false);
          }

          // 별도로 updateSelectedCount 명시적 호출 추가
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
        groupByInfluence = toggle.checked;

        // 토글 전환 시 현재 선택 모드와 콜백을 유지하며 showCategory 호출
        showCategory(currentCategory, {
          selectMode: selectionMode,
          onSelect: selectionCallback,
        });

        // 중요: 토글 후 BondCalculatorApp에게 선택 상태를 다시 적용하도록 알림
        if (window.BondCalculatorApp) {
          // 토글 변경 후 약간의 지연을 주고 선택 상태 다시 적용
          setTimeout(() => {
            if (
              typeof window.BondCalculatorApp.applySelectedState === "function"
            ) {
              window.BondCalculatorApp.applySelectedState();
            }
          }, 100);
        }

        console.log(
          "Toggled influence view with selection mode:",
          selectionMode
        );
      });
      toggle.checked = groupByInfluence;
    } else {
      console.warn("Influence toggle switch not found in the DOM.");
    }

    initHelpTooltip();
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

    // // 디버깅을 위한 로그
    // console.log(
    //   "UIRenderer: Showing category",
    //   category,
    //   "with selection mode:",
    //   selectionMode
    // );

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
  function hasLevel25BindStats(item) {
    if (!item || !Array.isArray(item.stats)) return false;
    const level25Stat = item.stats.find((s) => s && s.level === 25);
    return (
      level25Stat &&
      level25Stat.bindStat &&
      typeof level25Stat.bindStat === "object" &&
      Object.keys(level25Stat.bindStat).length > 0
    );
  }
  function createImageWrapper(item, category) {
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "img-wrapper";

    const { hasFullRegistration, hasFullBind } =
      window.DataManager.checkSpiritStats(item);
    if (hasFullRegistration) {
      const ribbonLeft = document.createElement("div");
      ribbonLeft.className = "ribbon-left";
      ribbonLeft.innerHTML = "<span>R</span>";
      ribbonLeft.title = "등록 효과 전체 보유";
      imgWrapper.appendChild(ribbonLeft);
    }

    if (hasFullBind) {
      const ribbonRight = document.createElement("div");
      ribbonRight.className = "ribbon-right";
      ribbonRight.innerHTML = "<span>B</span>";
      ribbonRight.title = "결속 효과 전체 보유";
      imgWrapper.appendChild(ribbonRight);
    }

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.title = item.name;
    img.loading = "lazy";
    img.dataset.category = category;
    img.dataset.image = item.image;

    imgWrapper.appendChild(img);

    if (hasLevel25BindStats(item)) {
      const level25Indicator = document.createElement("div");
      level25Indicator.className = "level25-indicator";
      level25Indicator.innerHTML = "<span>25</span>";
      level25Indicator.title = "25레벨 결속 효과 보유";
      imgWrapper.appendChild(level25Indicator);
    }

    // console.log("Creating image wrapper with selection mode:", selectionMode);

    if (selectionMode && selectionCallback) {
      // 이미지 클릭만으로 콜백 호출, e.preventDefault() 제거
      img.addEventListener("click", function () {
        selectionCallback(item, category);
      });
      img.style.cursor = "pointer";
    } else {
      // 기존 모달 표시 동작
      img.addEventListener("click", () => {
        if (window.ModalHandler) {
          window.ModalHandler.showInfo(category, item.image, item.influence);
        }
      });
    }

    const nameLabel = document.createElement("small");
    nameLabel.className = "img-name";
    nameLabel.textContent = item.name;

    imgWrapper.appendChild(nameLabel);

    return imgWrapper;
  }

  // 선택 모드 설정 함수 (외부에서 선택 모드만 변경할 때 사용)
  function setSelectionMode(isEnabled, callback) {
    selectionMode = isEnabled === true;
    selectionCallback = typeof callback === "function" ? callback : null;
    // 현재 표시된 카테고리 다시 그리기
    showCategory(currentCategory, {
      selectMode: selectionMode,
      onSelect: selectionCallback,
    });
    console.log("Selection mode set to:", selectionMode);
    return selectionMode;
  }

  // 현재 카테고리 반환
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
    getCurrentCategory: function () {
      return currentCategory;
    },
  };
})();

// 전역 스코프에 노출
window.UIRenderer = UIRenderer;

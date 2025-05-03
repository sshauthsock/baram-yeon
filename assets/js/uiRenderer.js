// // uiRenderer.js
// const UIRenderer = (function () {
//   let currentCategory = "수호";
//   let groupByInfluence = false;

//   function initUIEvents() {
//     const subTabs = document.querySelectorAll(".sub-tabs .tab");
//     subTabs.forEach((tab) => {
//       tab.addEventListener("click", function () {
//         currentCategory = tab.getAttribute("data-category");
//         showCategory(currentCategory);
//       });
//     });

//     const toggle = document.getElementById("influenceToggle");
//     if (toggle) {
//       toggle.addEventListener("change", function () {
//         groupByInfluence = toggle.checked;
//         showCategory(currentCategory);
//       });
//       toggle.checked = groupByInfluence;
//     } else {
//       console.warn("Influence toggle switch not found in the DOM.");
//     }

//     initHelpTooltip();
//   }

//   function initHelpTooltip() {
//     const helpBtn = document.getElementById("helpBtn");
//     const helpTooltip = document.getElementById("helpTooltip");
//     const closeHelpBtn = document.getElementById("closeHelp");

//     if (helpBtn && helpTooltip && closeHelpBtn) {
//       helpBtn.addEventListener("click", (e) => {
//         e.stopPropagation();
//         helpTooltip.style.display =
//           helpTooltip.style.display === "block" ? "none" : "block";
//       });

//       closeHelpBtn.addEventListener("click", () => {
//         helpTooltip.style.display = "none";
//       });

//       document.addEventListener("click", (event) => {
//         if (
//           helpTooltip.style.display === "block" &&
//           !helpTooltip.contains(event.target) &&
//           !helpBtn.contains(event.target)
//         ) {
//           helpTooltip.style.display = "none";
//         }
//       });
//     }
//   }

//   function showCategory(category) {
//     currentCategory = category;
//     const container = document.getElementById("imageContainer");
//     if (!container) {
//       console.error("Image container not found!");
//       return;
//     }
//     container.innerHTML = "";

//     document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
//       tab.classList.remove("active");
//       if (tab.getAttribute("data-category") === category) {
//         tab.classList.add("active");
//       }
//     });

//     if (groupByInfluence) {
//       displayPetsByInfluence(category, container);
//     } else {
//       displayAllPets(category, container);
//     }
//   }

//   function displayAllPets(category, container) {
//     container.className = "image-container-grid";

//     const itemsInCategory = window.DataManager.getData(category);
//     if (
//       !itemsInCategory ||
//       !Array.isArray(itemsInCategory) ||
//       itemsInCategory.length === 0
//     ) {
//       container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
//       return;
//     }

//     itemsInCategory.forEach((item) => {
//       if (!item || !item.image || !item.name) return;

//       const imgWrapper = createImageWrapper(item, category);
//       container.appendChild(imgWrapper);
//     });
//   }

//   function displayPetsByInfluence(category, container) {
//     container.className = "image-container-grouped";

//     const firstRowInfluences = ["결의", "고요", "의지"];
//     const secondRowInfluences = ["침착", "냉정", "활력"];

//     const itemsInCategory = window.DataManager.getData(category);
//     if (
//       !itemsInCategory ||
//       !Array.isArray(itemsInCategory) ||
//       itemsInCategory.length === 0
//     ) {
//       container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
//       return;
//     }

//     const firstRow = document.createElement("div");
//     firstRow.className = "influence-row";
//     let firstRowHasContent = false;

//     firstRowInfluences.forEach((influence) => {
//       const groupWrapper = createInfluenceGroup(
//         category,
//         influence,
//         itemsInCategory
//       );
//       if (groupWrapper) {
//         firstRow.appendChild(groupWrapper);
//         firstRowHasContent = true;
//       }
//     });

//     if (firstRowHasContent) container.appendChild(firstRow);

//     const secondRow = document.createElement("div");
//     secondRow.className = "influence-row";
//     let secondRowHasContent = false;

//     secondRowInfluences.forEach((influence) => {
//       const groupWrapper = createInfluenceGroup(
//         category,
//         influence,
//         itemsInCategory
//       );
//       if (groupWrapper) {
//         secondRow.appendChild(groupWrapper);
//         secondRowHasContent = true;
//       }
//     });

//     if (secondRowHasContent) container.appendChild(secondRow);

//     if (
//       !firstRowHasContent &&
//       !secondRowHasContent &&
//       itemsInCategory.length > 0
//     ) {
//       container.innerHTML = `<p>알려진 세력에 속하지 않는 ${category} 환수가 있습니다.</p>`;
//     } else if (!firstRowHasContent && !secondRowHasContent) {
//       container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
//     }
//   }

//   function createInfluenceGroup(category, influence, itemsInCategory) {
//     if (!window.DataManager.FACTION_ICONS) {
//       console.error("FACTION_ICONS is not available!");
//       return null;
//     }

//     const itemsForInfluence = itemsInCategory.filter(
//       (item) => item && item.influence === influence
//     );

//     if (itemsForInfluence.length === 0) {
//       return null;
//     }

//     const groupWrapper = document.createElement("div");
//     groupWrapper.className = "influence-group";

//     const headerWrapper = document.createElement("div");
//     headerWrapper.className = "header-wrapper";

//     const influenceIcon = document.createElement("img");
//     const iconSrc = window.DataManager.FACTION_ICONS[influence];
//     if (iconSrc) {
//       influenceIcon.src = iconSrc;
//       influenceIcon.alt = `${influence} 아이콘`;
//       influenceIcon.className = "influence-icon";
//       headerWrapper.appendChild(influenceIcon);
//     } else {
//       console.warn(`Icon not found for influence: ${influence}.`);
//     }

//     const header = document.createElement("h3");
//     header.className = "influence-header";
//     header.textContent = influence;
//     const countSpan = document.createElement("span");
//     countSpan.className = "influence-count";
//     countSpan.textContent = ` (${itemsForInfluence.length})`;
//     header.appendChild(countSpan);
//     headerWrapper.appendChild(header);
//     groupWrapper.appendChild(headerWrapper);

//     const itemsWrapper = document.createElement("div");
//     itemsWrapper.className = "influence-items";

//     itemsForInfluence.forEach((item) => {
//       if (!item || !item.image || !item.name) return;

//       const imgWrapper = createImageWrapper(item, category);
//       itemsWrapper.appendChild(imgWrapper);
//     });

//     groupWrapper.appendChild(itemsWrapper);
//     return groupWrapper;
//   }

//   function createImageWrapper(item, category) {
//     const imgWrapper = document.createElement("div");
//     imgWrapper.className = "img-wrapper";

//     const { hasFullRegistration, hasFullBind } =
//       window.DataManager.checkSpiritStats(item);
//     if (hasFullRegistration) {
//       const ribbonLeft = document.createElement("div");
//       ribbonLeft.className = "ribbon-left";
//       ribbonLeft.innerHTML = "<span>R</span>";
//       ribbonLeft.title = "등록 효과 전체 보유";
//       imgWrapper.appendChild(ribbonLeft);
//     }

//     if (hasFullBind) {
//       const ribbonRight = document.createElement("div");
//       ribbonRight.className = "ribbon-right";
//       ribbonRight.innerHTML = "<span>B</span>";
//       ribbonRight.title = "결속 효과 전체 보유";
//       imgWrapper.appendChild(ribbonRight);
//     }

//     const img = document.createElement("img");
//     img.src = item.image;
//     img.alt = item.name;
//     img.title = item.name;
//     img.loading = "lazy";
//     img.addEventListener("click", () =>
//       window.ModalHandler.showInfo(category, item.image, item.influence)
//     );

//     const nameLabel = document.createElement("small");
//     nameLabel.className = "img-name";
//     nameLabel.textContent = item.name;

//     imgWrapper.appendChild(img);
//     imgWrapper.appendChild(nameLabel);

//     return imgWrapper;
//   }

//   return {
//     initUIEvents,
//     showCategory,
//     displayAllPets,
//     displayPetsByInfluence,
//     createInfluenceGroup,
//   };
// })();

// // 전역 스코프에 노출
// window.UIRenderer = UIRenderer;

// uiRenderer.js
const UIRenderer = (function () {
  let currentCategory = "수호";
  let groupByInfluence = false;
  let selectionMode = false;
  let selectionCallback = null;

  function initUIEvents() {
    const subTabs = document.querySelectorAll(".sub-tabs .tab");
    subTabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        currentCategory = tab.getAttribute("data-category");
        showCategory(currentCategory);
      });
    });

    const toggle = document.getElementById("influenceToggle");
    if (toggle) {
      toggle.addEventListener("change", function () {
        groupByInfluence = toggle.checked;
        showCategory(currentCategory);
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

  /**
   * 카테고리를 표시하고 필요에 따라 선택 모드를 활성화
   * @param {string} category - 표시할 카테고리 이름
   * @param {Object} options - 추가 옵션
   * @param {boolean} options.selectMode - 선택 모드 활성화 여부 (true인 경우 클릭 시 모달 대신 선택 기능 작동)
   * @param {Function} options.onSelect - 아이템 선택 시 호출될 콜백 함수
   */
  function showCategory(category, options = {}) {
    currentCategory = category;

    // 선택 모드 설정
    selectionMode = options.selectMode === true;
    selectionCallback =
      typeof options.onSelect === "function" ? options.onSelect : null;

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

    // 선택 모드에 따라 다른 클릭 이벤트 처리
    if (selectionMode && selectionCallback) {
      img.addEventListener("click", () => {
        // 선택 시 콜백 함수 호출 (아이템 정보 전달)
        selectionCallback(item, category);

        // 선택된 이미지에 시각적 표시 추가
        document.querySelectorAll(".img-wrapper").forEach((wrapper) => {
          wrapper.classList.remove("selected");
        });
        imgWrapper.classList.add("selected");
      });
      img.style.cursor = "pointer";
    } else {
      // 기존 모달 표시 동작
      img.addEventListener("click", () =>
        window.ModalHandler.showInfo(category, item.image, item.influence)
      );
    }

    const nameLabel = document.createElement("small");
    nameLabel.className = "img-name";
    nameLabel.textContent = item.name;

    imgWrapper.appendChild(img);
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
    getCurrentCategory,
  };
})();

// 전역 스코프에 노출
window.UIRenderer = UIRenderer;

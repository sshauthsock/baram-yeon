// const ImageHandler = (function () {
//   const CATEGORY_FILE_MAP = window.CommonData.CATEGORY_FILE_MAP;
//   let mobData = { 수호: [], 탑승: [], 변신: [] };
//   const FACTION_ICONS = window.CommonData.FACTION_ICONS;
//   let groupByInfluence = false;
//   let currentCategory = "수호";
//   const STATS_MAPPING = window.CommonData.STATS_MAPPING;
//   const STATS_ORDER = window.CommonData.STATS_ORDER || [];
//   const SPECIAL_STAT_CLASSES = window.CommonData.SPECIAL_STAT_CLASSES;

//   async function loadCategoryData() {
//     console.log("Loading category data...");
//     let allLoaded = true;
//     for (const [category, files] of Object.entries(CATEGORY_FILE_MAP)) {
//       console.log(`Processing category: ${category}`);
//       try {
//         let registrationData = await FirebaseHandler.getFirestoreDocument(
//           files.registration
//         );
//         let bindData = await FirebaseHandler.getFirestoreDocument(files.bind);

//         let registrationArray = Array.isArray(registrationData)
//           ? registrationData
//           : registrationData?.data || [];
//         let bindArray = Array.isArray(bindData)
//           ? bindData
//           : bindData?.data || [];

//         if (!Array.isArray(registrationArray)) {
//           console.error(
//             `Invalid registration data format for ${category}: Expected array, got ${typeof registrationArray}. Using empty array.`
//           );
//           registrationArray = [];
//           allLoaded = false;
//         }
//         if (!Array.isArray(bindArray)) {
//           console.error(
//             `Invalid bind data format for ${category}: Expected array, got ${typeof bindArray}. Using empty array.`
//           );
//           bindArray = [];
//           allLoaded = false;
//         }

//         if (registrationArray.length === 0 && files.registration) {
//           console.warn(
//             `No registration data loaded for category: ${category} from file ${files.registration}.json`
//           );
//         }

//         const mergedData = registrationArray
//           .map((regItem) => {
//             if (!regItem || typeof regItem !== "object" || !regItem.name) {
//               return null;
//             }

//             const bindItem = bindArray.find(
//               (b) => b && b.name === regItem.name
//             );
//             const regStats = Array.isArray(regItem.stats) ? regItem.stats : [];
//             const bindStats =
//               bindItem && Array.isArray(bindItem.stats) ? bindItem.stats : [];

//             const mergedStats = Array.from({ length: 26 }, (_, i) => {
//               const level = i;
//               const regLevelStat = regStats.find((s) => s && s.level === level);
//               const bindLevelStat = bindStats.find(
//                 (s) => s && s.level === level
//               );

//               return {
//                 level: level,
//                 registrationStat: regLevelStat?.registrationStat || {},
//                 bindStat: bindLevelStat?.bindStat || {},
//               };
//             });

//             return {
//               ...regItem,
//               stats: mergedStats,
//               influence: regItem.influence || "정보없음",
//             };
//           })
//           .filter((item) => item !== null);

//         mobData[category] = mergedData;
//         console.log(
//           `Finished processing category: ${category}. Merged ${mergedData.length} items.`
//         );
//       } catch (err) {
//         console.error(
//           `Failed to load or process data for category ${category}:`,
//           err
//         );
//         mobData[category] = [];
//         allLoaded = false;
//       }
//     }

//     if (!allLoaded) {
//       console.error("One or more categories failed to load data properly.");
//     }

//     if (!FACTION_ICONS) {
//       console.error("FACTION_ICONS data is missing from CommonData!");
//     }

//     initUIEvents();
//     showCategory(currentCategory);
//     console.log("Category data loading process complete.");
//   }
//   function initUIEvents() {
//     const subTabs = document.querySelectorAll(".sub-tabs .tab");
//     subTabs.forEach((tab) => {
//       tab.addEventListener("click", function () {
//         currentCategory = this.getAttribute("data-category");
//         showCategory(currentCategory);
//       });
//     });

//     const toggle = document.getElementById("influenceToggle");
//     if (toggle) {
//       toggle.addEventListener("change", function () {
//         groupByInfluence = this.checked;
//         showCategory(currentCategory);
//       });
//       toggle.checked = groupByInfluence;
//     } else {
//       console.warn("Influence toggle switch not found in the DOM.");
//     }

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

//     const itemsInCategory = mobData[category];
//     if (
//       !itemsInCategory ||
//       !Array.isArray(itemsInCategory) ||
//       itemsInCategory.length === 0
//     ) {
//       container.innerHTML = `<p>표시할 ${category} 환수 정보가 없습니다.</p>`;
//       return;
//     }

//     itemsInCategory.forEach((item) => {
//       if (!item || !item.image || !item.name) {
//         return;
//       }
//       const imgWrapper = document.createElement("div");
//       imgWrapper.className = "img-wrapper";

//       const { hasFullRegistration, hasFullBind } = checkSpiritStats(item);
//       if (hasFullRegistration) {
//         const ribbonLeft = document.createElement("div");
//         ribbonLeft.className = "ribbon-left";
//         ribbonLeft.innerHTML = "<span>R</span>";
//         ribbonLeft.title = "등록 효과 전체 보유";
//         imgWrapper.appendChild(ribbonLeft);
//       }
//       if (hasFullBind) {
//         const ribbonRight = document.createElement("div");
//         ribbonRight.className = "ribbon-right";
//         ribbonRight.innerHTML = "<span>B</span>";
//         ribbonRight.title = "결속 효과 전체 보유";
//         imgWrapper.appendChild(ribbonRight);
//       }

//       const img = document.createElement("img");
//       img.src = item.image;
//       img.alt = item.name;
//       img.title = item.name;
//       img.loading = "lazy";
//       img.addEventListener("click", () =>
//         showInfo(category, item.image, item.influence)
//       );

//       const nameLabel = document.createElement("small");
//       nameLabel.className = "img-name";
//       nameLabel.textContent = item.name;

//       imgWrapper.appendChild(img);
//       imgWrapper.appendChild(nameLabel);
//       container.appendChild(imgWrapper);
//     });
//   }

//   function displayPetsByInfluence(category, container) {
//     container.className = "image-container-grouped";

//     const firstRowInfluences = ["결의", "고요", "의지"];
//     const secondRowInfluences = ["침착", "냉정", "활력"];

//     const itemsInCategory = mobData[category];
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
//     if (!FACTION_ICONS) {
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
//     const iconSrc = FACTION_ICONS[influence];
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
//       const imgWrapper = document.createElement("div");
//       imgWrapper.className = "img-wrapper";

//       const { hasFullRegistration, hasFullBind } = checkSpiritStats(item);
//       if (hasFullRegistration) {
//         const ribbonLeft = document.createElement("div");
//         ribbonLeft.className = "ribbon-left";
//         ribbonLeft.innerHTML = "<span>R</span>";
//         ribbonLeft.title = "등록 효과 전체 보유";
//         imgWrapper.appendChild(ribbonLeft);
//       }
//       if (hasFullBind) {
//         const ribbonRight = document.createElement("div");
//         ribbonRight.className = "ribbon-right";
//         ribbonRight.innerHTML = "<span>B</span>";
//         ribbonRight.title = "결속 효과 전체 보유";
//         imgWrapper.appendChild(ribbonRight);
//       }

//       const img = document.createElement("img");
//       img.src = item.image;
//       img.alt = item.name;
//       img.title = item.name;
//       img.loading = "lazy";
//       img.addEventListener("click", () =>
//         showInfo(category, item.image, item.influence)
//       );

//       const nameLabel = document.createElement("small");
//       nameLabel.className = "img-name";
//       nameLabel.textContent = item.name;

//       imgWrapper.appendChild(img);
//       imgWrapper.appendChild(nameLabel);
//       itemsWrapper.appendChild(imgWrapper);
//     });

//     groupWrapper.appendChild(itemsWrapper);
//     return groupWrapper;
//   }
//   function checkSpiritStats(spirit) {
//     if (!spirit || !spirit.stats)
//       return { hasFullRegistration: false, hasFullBind: false };
//     const hasFullRegistration = checkAllLevelsHaveEffect(
//       spirit.stats,
//       "registrationStat"
//     );
//     const hasFullBind = checkAllLevelsHaveEffect(spirit.stats, "bindStat");
//     return { hasFullRegistration, hasFullBind };
//   }
//   function checkAllLevelsHaveEffect(stats, effectType) {
//     if (!stats || !Array.isArray(stats) || stats.length === 0) return false;
//     for (let i = 0; i <= 25; i++) {
//       const levelStat = stats.find((s) => s && s.level === i);
//       if (
//         !levelStat ||
//         !levelStat[effectType] ||
//         typeof levelStat[effectType] !== "object" ||
//         Object.keys(levelStat[effectType]).length === 0
//       ) {
//         return false;
//       }
//     }
//     return true;
//   }
//   function showInfo(category, imagePath, influence) {
//     showInfoInModal(category, imagePath, influence);
//   }

//   function showInfoInModal(category, imagePath, influence) {
//     modalElement = createModal();
//     const modal = modalElement.container;
//     const modalOverlay = modalElement.overlay;

//     modal.innerHTML = "";

//     const closeButton = document.createElement("button");
//     closeButton.className = "modal-close";
//     closeButton.innerHTML = "✕";
//     closeButton.setAttribute("aria-label", "닫기");
//     closeButton.onclick = closeModal;
//     modal.appendChild(closeButton);

//     const categoryData = mobData[category];
//     if (!categoryData || !Array.isArray(categoryData)) {
//       modal.innerHTML += "<p>정보를 표시할 수 없습니다.</p>";
//       modalOverlay.style.display = "flex";
//       document.body.style.overflow = "hidden";
//       return;
//     }
//     const matched = categoryData.find(
//       (item) => item && item.image === imagePath
//     );

//     if (!matched) {
//       modal.innerHTML += "<p>선택한 환수 정보를 찾을 수 없습니다.</p>";
//       modalOverlay.style.display = "flex";
//       document.body.style.overflow = "hidden";
//       return;
//     }

//     currentStats = Array.isArray(matched.stats) ? matched.stats : [];
//     currentLevel = 0;
//     currentName = matched.name || "이름 없음";
//     currentInfluence = influence || matched.influence || "";

//     const modalHeader = document.createElement("div");
//     modalHeader.className = "modal-header";
//     const imgPreview = document.createElement("img");
//     imgPreview.src = imagePath;
//     imgPreview.alt = currentName;
//     imgPreview.className = "modal-img-preview";
//     const titleArea = document.createElement("div");
//     titleArea.className = "title-area";
//     const title = document.createElement("h3");
//     title.textContent = currentName + " ";

//     if (currentInfluence && FACTION_ICONS && FACTION_ICONS[currentInfluence]) {
//       const influenceIcon = document.createElement("img");
//       influenceIcon.src = FACTION_ICONS[currentInfluence];
//       influenceIcon.alt = `${currentInfluence} 아이콘`;
//       influenceIcon.title = currentInfluence;
//       influenceIcon.className = "influence-icon";
//       title.appendChild(influenceIcon);
//     } else if (currentInfluence && currentInfluence !== "정보없음") {
//       const influenceText = document.createElement("span");
//       influenceText.textContent = `(${currentInfluence})`;
//       influenceText.style.fontSize = "0.8em";
//       influenceText.style.marginLeft = "5px";
//       title.appendChild(influenceText);
//     }

//     const levelControls = document.createElement("div");
//     levelControls.classList.add("level-controls");
//     const levelMinusButton = document.createElement("button");
//     levelMinusButton.innerText = "-";
//     levelMinusButton.setAttribute("aria-label", "레벨 감소");
//     levelMinusButton.addEventListener("click", () => changeLevel(-1));
//     const levelInput = document.createElement("input");
//     levelInput.type = "number";
//     levelInput.min = "0";
//     levelInput.max = "25";
//     levelInput.value = currentLevel;
//     levelInput.classList.add("level-input");
//     levelInput.setAttribute("aria-label", "환수 레벨");
//     levelInput.addEventListener("input", function () {
//       let value = parseInt(this.value, 10);
//       if (isNaN(value) || value < 0) value = 0;
//       if (value > 25) value = 25;
//       this.value = value;
//       currentLevel = value;
//       const statForLevel =
//         currentStats.find((s) => s && s.level === currentLevel) || null;
//       updateStatsInModal(statForLevel);
//     });
//     levelInput.addEventListener("keypress", (e) => {
//       if (!/\d/.test(e.key)) e.preventDefault();
//     });
//     const levelPlusButton = document.createElement("button");
//     levelPlusButton.innerText = "+";
//     levelPlusButton.setAttribute("aria-label", "레벨 증가");
//     levelPlusButton.addEventListener("click", () => changeLevel(1));
//     const maxButton = document.createElement("button");
//     maxButton.innerText = "MAX";
//     maxButton.classList.add("max-button");
//     maxButton.setAttribute("aria-label", "최대 레벨 설정");
//     maxButton.addEventListener("click", () => {
//       currentLevel = 25;
//       levelInput.value = currentLevel;
//       const statForLevel =
//         currentStats.find((s) => s && s.level === currentLevel) || null;
//       updateStatsInModal(statForLevel);
//     });
//     levelControls.appendChild(levelMinusButton);
//     levelControls.appendChild(levelInput);
//     levelControls.appendChild(levelPlusButton);
//     levelControls.appendChild(maxButton);

//     titleArea.appendChild(title);
//     titleArea.appendChild(levelControls);
//     modalHeader.appendChild(imgPreview);
//     modalHeader.appendChild(titleArea);

//     const statsContainer = document.createElement("div");
//     statsContainer.className = "stats-container";
//     const leftColumn = document.createElement("div");
//     leftColumn.className = "stats-column";
//     const registrationHeader = document.createElement("b");
//     registrationHeader.innerText = "📌 등록 효과:";
//     const registrationList = document.createElement("ul");
//     registrationList.id = "registrationList";
//     leftColumn.appendChild(registrationHeader);
//     leftColumn.appendChild(registrationList);
//     const rightColumn = document.createElement("div");
//     rightColumn.className = "stats-column";
//     const bindHeader = document.createElement("b");
//     bindHeader.innerText = "🧷 결속 효과:";
//     const bindList = document.createElement("ul");
//     bindList.id = "bindList";
//     rightColumn.appendChild(bindHeader);
//     rightColumn.appendChild(bindList);
//     statsContainer.appendChild(leftColumn);
//     statsContainer.appendChild(rightColumn);

//     modal.appendChild(modalHeader);
//     modal.appendChild(statsContainer);

//     const initialStat =
//       currentStats.find((s) => s && s.level === currentLevel) || null;
//     updateStatsInModal(initialStat);

//     modalOverlay.style.display = "flex";
//     document.body.style.overflow = "hidden";
//   }
//   function changeLevel(diff) {
//     const newLevel = currentLevel + diff;
//     if (newLevel < 0 || newLevel > 25) return;
//     currentLevel = newLevel;
//     const levelInput = document.querySelector(".level-input");
//     if (levelInput) levelInput.value = currentLevel;
//     const stat = currentStats.find((s) => s && s.level === currentLevel);
//     updateStatsInModal(stat || null);
//   }

//   function updateStatsInModal(stat) {
//     const registrationList = document.getElementById("registrationList");
//     const bindList = document.getElementById("bindList");
//     if (!registrationList || !bindList) return;

//     registrationList.innerHTML = "";
//     bindList.innerHTML = "";
//     const registrationColumn = registrationList.parentNode;
//     const bindColumn = bindList.parentNode;
//     registrationColumn
//       ?.querySelectorAll(".level25-notice")
//       .forEach((n) => n.remove());
//     bindColumn?.querySelectorAll(".level25-notice").forEach((n) => n.remove());

//     const level25Stat = currentStats.find((s) => s && s.level === 25);
//     const hasRegEffectAt25 =
//       level25Stat?.registrationStat &&
//       Object.keys(level25Stat.registrationStat).length > 0;
//     const hasBindEffectAt25 =
//       level25Stat?.bindStat && Object.keys(level25Stat.bindStat).length > 0;

//     if (
//       stat?.registrationStat &&
//       Object.keys(stat.registrationStat).length > 0
//     ) {
//       displayStatsInOrder(registrationList, stat.registrationStat);
//     } else {
//       if (currentLevel !== 25 && hasRegEffectAt25) {
//         registrationList.innerHTML = `<li>현재 레벨(${currentLevel})에는 등록 효과가 없습니다.</li>`;
//         const notice = document.createElement("div");
//         notice.className = "level25-notice";
//         notice.textContent = "※ 등록 효과는 25레벨 달성 시 적용됩니다.";
//         registrationColumn?.appendChild(notice);
//       } else {
//         registrationList.innerHTML = `<li>레벨 ${currentLevel}: 등록 효과 정보 없음</li>`;
//       }
//     }

//     if (stat?.bindStat && Object.keys(stat.bindStat).length > 0) {
//       displayStatsInOrder(bindList, stat.bindStat);
//     } else {
//       if (currentLevel !== 25 && hasBindEffectAt25) {
//         bindList.innerHTML = `<li>현재 레벨(${currentLevel})에는 결속 효과가 없습니다.</li>`;
//         const notice = document.createElement("div");
//         notice.className = "level25-notice";
//         notice.textContent = "※ 결속 효과는 25레벨 달성 시 적용됩니다.";
//         bindColumn?.appendChild(notice);
//       } else {
//         bindList.innerHTML = `<li>레벨 ${currentLevel}: 결속 효과 정보 없음</li>`;
//       }
//     }
//   }

//   function displayStatsInOrder(listElement, statsObj) {
//     if (
//       !statsObj ||
//       typeof statsObj !== "object" ||
//       Object.keys(statsObj).length === 0
//     ) {
//       listElement.innerHTML = "<li>정보 없음</li>";
//       return;
//     }

//     const groupedStats = {};
//     Object.entries(statsObj).forEach(([key, val]) => {
//       if (
//         key === null ||
//         key === undefined ||
//         val === null ||
//         val === undefined
//       )
//         return;
//       const statName = STATS_MAPPING[key] || key.toString();
//       const valueStr = val.toString();
//       if (groupedStats[statName]) {
//         const currentValNum = parseFloat(groupedStats[statName].val);
//         const newValNum = parseFloat(valueStr);
//         if (!isNaN(currentValNum) && !isNaN(newValNum)) {
//           groupedStats[statName].val = (currentValNum + newValNum).toString();
//         }
//       } else {
//         groupedStats[statName] = {
//           key: key,
//           val: valueStr,
//           order: STATS_ORDER.indexOf(key),
//         };
//       }
//     });

//     const sortedStats = Object.entries(groupedStats).sort(([, a], [, b]) => {
//       const orderA = a.order;
//       const orderB = b.order;
//       if (orderA !== -1 && orderB !== -1) return orderA - orderB;
//       if (orderA !== -1) return -1;
//       if (orderB !== -1) return 1;
//       return a.key.localeCompare(b.key);
//     });

//     listElement.innerHTML = "";
//     if (sortedStats.length === 0) {
//       listElement.innerHTML = "<li>표시할 능력치 없음</li>";
//       return;
//     }
//     sortedStats.forEach(([statName, info]) => {
//       const li = document.createElement("li");
//       const displayValue = info.val;
//       const specialClass = SPECIAL_STAT_CLASSES[statName] || "";
//       if (specialClass) {
//         li.innerHTML = `<span class="${specialClass}">${statName}: ${displayValue}</span>`;
//       } else {
//         li.textContent = `${statName}: ${displayValue}`;
//       }
//       listElement.appendChild(li);
//     });
//   }
//   function createModal() {
//     let modalOverlay = document.querySelector(".modal-overlay");
//     if (modalOverlay) {
//       modalElement = {
//         overlay: modalOverlay,
//         container: modalOverlay.querySelector(".modal"),
//       };
//       if (!modalElement.container) {
//         modalOverlay.remove();
//         modalOverlay = null;
//       } else {
//         return modalElement;
//       }
//     }

//     modalOverlay = document.createElement("div");
//     modalOverlay.className = "modal-overlay";
//     const modalContainer = document.createElement("div");
//     modalContainer.className = "modal";
//     const closeButton = document.createElement("button");
//     closeButton.className = "modal-close";
//     closeButton.innerHTML = "✕";
//     closeButton.setAttribute("aria-label", "닫기");
//     closeButton.onclick = closeModal;

//     modalContainer.appendChild(closeButton);
//     modalOverlay.appendChild(modalContainer);
//     document.body.appendChild(modalOverlay);

//     document.addEventListener("keydown", handleEscKey);
//     modalOverlay.addEventListener("click", handleOverlayClick);

//     modalElement = {
//       overlay: modalOverlay,
//       container: modalContainer,
//     };
//     return modalElement;
//   }

//   function handleEscKey(e) {
//     if (e.key === "Escape" && modalElement?.overlay.style.display === "flex") {
//       closeModal();
//     }
//   }

//   function handleOverlayClick(e) {
//     if (
//       e.target === modalElement?.overlay &&
//       modalElement?.overlay.style.display === "flex"
//     ) {
//       closeModal();
//     }
//   }

//   function closeModal() {
//     if (modalElement && modalElement.overlay) {
//       modalElement.overlay.style.display = "none";
//       document.body.style.overflow = "auto";
//     }
//   }
//   return {
//     loadCategoryData,
//     initUIEvents,
//     showCategory,
//     displayAllPets,
//     displayPetsByInfluence,
//     createInfluenceGroup,
//     checkSpiritStats,
//     checkAllLevelsHaveEffect,
//   };
// })();

// imageHandler.js
// const ImageHandler = (function () {
//   async function init() {
//     await window.DataManager.loadCategoryData();
//     window.UIRenderer.initUIEvents();
//     window.UIRenderer.showCategory("수호");
//     console.log("ImageHandler initialized successfully.");
//   }

//   return {
//     init,
//     // 필요한 경우 다른 모듈의 함수를 여기에 노출할 수 있습니다
//     loadCategoryData: window.DataManager.loadCategoryData,
//     showCategory: window.UIRenderer.showCategory,
//   };
// })();

// // 페이지 로드 시 초기화
// document.addEventListener("DOMContentLoaded", () => {
//   ImageHandler.init().catch((err) => {
//     console.error("Failed to initialize ImageHandler:", err);
//   });
// });

// imageHandler.js
const ImageHandler = (function () {
  async function init() {
    await window.DataManager.loadCategoryData();
    window.UIRenderer.initUIEvents();
    window.UIRenderer.showCategory("수호");
    console.log("ImageHandler initialized successfully.");
  }

  function showCategory(category, options = {}) {
    window.UIRenderer.showCategory(category, options);
  }

  function setSelectionMode(isEnabled, callback) {
    window.UIRenderer.setSelectionMode(isEnabled, callback);
  }

  function getCurrentCategory() {
    return window.UIRenderer.getCurrentCategory();
  }

  return {
    init,
    loadCategoryData: window.DataManager.loadCategoryData,
    showCategory,
    setSelectionMode,
    getCurrentCategory,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  ImageHandler.init().catch((err) => {
    console.error("Failed to initialize ImageHandler:", err);
  });
});

window.ImageHandler = ImageHandler;

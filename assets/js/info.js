const InfoApp = (function () {
  const STATS_MAPPING = window.CommonData.STATS_MAPPING;
  const SPECIAL_STAT_CLASSES = window.CommonData.SPECIAL_STAT_CLASSES;
  const CATEGORY_FILE_MAP = window.CommonData.CATEGORY_FILE_MAP;

  let mobData = { 수호: [], 탑승: [], 변신: [] };
  let currentStats = [];
  let currentLevel = 0;
  let currentName = "";
  let modalElement = null;
  let db = null;

  function initFirebase() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
  }

  async function checkFirebaseConnection() {
    if (!firebase.apps.length) {
      console.error("Firebase가 초기화되지 않았습니다!");
      return false;
    }

    try {
      return db
        .collection("jsonData")
        .doc("data-1745203971906")
        .get()
        .then((doc) => {
          if (doc.exists) {
            return true;
          } else {
            console.error("Firebase에 연결되었으나 문서를 찾을 수 없습니다!");
            return false;
          }
        })
        .catch((error) => {
          console.error("Firebase 연결 오류:", error);
          return false;
        });
    } catch (e) {
      console.error("Firebase 테스트 실패:", e);
      return false;
    }
  }

  async function testFirebaseConnectivity() {
    const isConnected = await checkFirebaseConnection();

    if (!isConnected) {
      console.log("경고: Firebase 연결 실패, 대신 로컬 파일을 사용합니다");
    }

    try {
      const snapshot = await db.collection("jsonData").get();
      snapshot.forEach((doc) => {});
    } catch (e) {
      console.error("문서 목록 조회 오류:", e);
    }
  }

  async function getCachedData(key, fetchFunction, expiryHours = 24) {
    const cachedData = localStorage.getItem(key);
    const cachedTime = localStorage.getItem(`${key}_time`);

    const now = new Date().getTime();
    const expiryTime = expiryHours * 60 * 60 * 1000;

    if (cachedData && cachedTime && now - parseInt(cachedTime) < expiryTime) {
      return JSON.parse(cachedData);
    }

    const freshData = await fetchFunction();

    localStorage.setItem(key, JSON.stringify(freshData));
    localStorage.setItem(`${key}_time`, now.toString());

    return freshData;
  }

  async function getFirestoreDocument(fileName) {
    try {
      const documentMap = window.CommonData.DOCUMENT_MAP;

      const docId = documentMap[fileName + ".json"];

      if (!docId) {
        const response = await fetch(`output/${fileName}.json`);
        return await response.json();
      }

      const cachedKey = `firestore_${fileName}`;
      const cachedData = localStorage.getItem(cachedKey);
      const cachedTime = localStorage.getItem(`${cachedKey}_time`);

      if (
        cachedData &&
        cachedTime &&
        Date.now() - parseInt(cachedTime) < 24 * 60 * 60 * 1000
      ) {
        return JSON.parse(cachedData);
      }

      const docRef = await db.collection("jsonData").doc(docId).get();

      if (!docRef.exists) {
        console.warn(
          `Firestore에서 ${docId} 문서를 찾을 수 없습니다. 로컬 파일 사용`
        );
        const response = await fetch(`output/${fileName}.json`);
        const data = await response.json();

        localStorage.setItem(cachedKey, JSON.stringify(data));
        localStorage.setItem(`${cachedKey}_time`, Date.now().toString());

        return data;
      }

      const data = docRef.data();

      if (!data) {
        throw new Error(`문서 ${docId}는 존재하지만 데이터가 없습니다`);
      }

      localStorage.setItem(cachedKey, JSON.stringify(data));
      localStorage.setItem(`${cachedKey}_time`, Date.now().toString());

      return data;
    } catch (error) {
      console.error(`${fileName}에 대한 Firestore 오류:`, error);
      const response = await fetch(`output/${fileName}.json`);
      return await response.json();
    }
  }

  async function loadCategoryData() {
    for (const [category, files] of Object.entries(CATEGORY_FILE_MAP)) {
      try {
        let registrationData = await getFirestoreDocument(files.registration);
        let bindData = await getFirestoreDocument(files.bind);

        let registrationArray = [];
        if (
          registrationData &&
          registrationData.data &&
          Array.isArray(registrationData.data)
        ) {
          registrationArray = registrationData.data;
        } else if (Array.isArray(registrationData)) {
          registrationArray = registrationData;
        }

        let bindArray = [];
        if (bindData && bindData.data && Array.isArray(bindData.data)) {
          bindArray = bindData.data;
        } else if (Array.isArray(bindData)) {
          bindArray = bindData;
        }

        if (!registrationArray.length) {
          mobData[category] = [];
          continue;
        }

        const mergedData = registrationArray.map((regItem) => {
          const bindItem = bindArray.find((b) => b && b.name === regItem.name);
          if (bindItem) {
            const mergedStats = regItem.stats.map((regStat, index) => {
              const bindStat = bindItem.stats && bindItem.stats[index];
              return {
                level: regStat.level,
                registrationStat: regStat.registrationStat,
                bindStat: bindStat ? bindStat.bindStat : {},
              };
            });

            return {
              ...regItem,
              stats: mergedStats,
            };
          }
          return regItem;
        });

        mobData[category] = mergedData;
      } catch (err) {
        try {
          const registrationResponse = await fetch(
            `output/${files.registration}.json`
          );
          let registrationData = await registrationResponse.json();

          const bindResponse = await fetch(`output/${files.bind}.json`);
          let bindData = await bindResponse.json();

          if (registrationData.data && Array.isArray(registrationData.data)) {
            registrationData = registrationData.data;
          }

          if (bindData.data && Array.isArray(bindData.data)) {
            bindData = bindData.data;
          }

          const mergedData = registrationData.map((regItem) => {
            const bindItem = bindData.find((b) => b.name === regItem.name);
            if (bindItem) {
              const mergedStats = regItem.stats.map((regStat, index) => {
                const bindStat = bindItem.stats[index];
                return {
                  level: regStat.level,
                  registrationStat: regStat.registrationStat,
                  bindStat: bindStat ? bindStat.bindStat : {},
                };
              });

              return {
                ...regItem,
                stats: mergedStats,
              };
            }
            return regItem;
          });

          mobData[category] = mergedData;
        } catch (fallbackErr) {
          mobData[category] = [];
        }
      }
    }

    const defaultTab = document.querySelector(".sub-tabs .tab");
    if (defaultTab) defaultTab.classList.add("active");

    showCategory("수호");
    initUIEvents();
  }

  function initUIEvents() {
    const subTabs = document.querySelectorAll(".sub-tabs .tab");
    subTabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        const category = this.getAttribute("data-category");
        showCategory(category);
      });
    });
  }

  function checkAllLevelsHaveEffect(stats, effectType) {
    if (!stats || !Array.isArray(stats) || stats.length === 0) {
      return false;
    }

    const levels = new Set(stats.map((stat) => stat.level));
    if (levels.size !== 26) {
      return false;
    }

    for (let i = 0; i <= 25; i++) {
      const levelStat = stats.find((s) => s.level === i);
      if (
        !levelStat ||
        !levelStat[effectType] ||
        Object.keys(levelStat[effectType]).length === 0
      ) {
        return false;
      }
    }

    return true;
  }
  function checkSpiritStats(spirit) {
    const hasFullRegistration = checkAllLevelsHaveEffect(
      spirit.stats,
      "registrationStat"
    );
    const hasFullBind = checkAllLevelsHaveEffect(spirit.stats, "bindStat");

    return { hasFullRegistration, hasFullBind };
  }

  function showCategory(category) {
    const container = document.getElementById("imageContainer");
    container.innerHTML = "";

    if (!mobData[category] || mobData[category].length === 0) {
      container.innerHTML = `<p>이미지 데이터가 없습니다.</p>`;
      return;
    }

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.remove("active");
      if (tab.getAttribute("data-category") === category) {
        tab.classList.add("active");
      }
    });

    mobData[category].forEach((item) => {
      const imgContainer = document.createElement("div");
      imgContainer.className = "img-wrapper";

      const { hasFullRegistration, hasFullBind } = checkSpiritStats(item);
      if (hasFullRegistration) {
        const ribbonLeft = document.createElement("div");
        ribbonLeft.className = "ribbon-left";
        ribbonLeft.innerHTML = "<span>R</span>";
        ribbonLeft.title = "등록 효과 있음";
        imgContainer.appendChild(ribbonLeft);
      }

      if (hasFullBind) {
        const ribbonRight = document.createElement("div");
        ribbonRight.className = "ribbon-right";
        ribbonRight.innerHTML = "<span>B</span>";
        ribbonRight.title = "결속 효과 있음";
        imgContainer.appendChild(ribbonRight);
      }
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.name;
      img.title = item.name;
      img.loading = "lazy";
      img.addEventListener("click", () => showInfo(category, item.image));

      const nameLabel = document.createElement("small");
      nameLabel.textContent = item.name;
      nameLabel.className = "img-name";

      imgContainer.appendChild(img);
      imgContainer.appendChild(nameLabel);
      container.appendChild(imgContainer);
    });
  }

  function createModal() {
    const modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";

    const modalContainer = document.createElement("div");
    modalContainer.className = "modal";

    const closeButton = document.createElement("button");
    closeButton.className = "modal-close";
    closeButton.innerHTML = "✕";
    closeButton.onclick = closeModal;

    modalContainer.appendChild(closeButton);
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) closeModal();
    });

    modalElement = {
      overlay: modalOverlay,
      container: modalContainer,
    };

    return modalElement;
  }

  function closeModal() {
    document.querySelector(".modal-overlay").style.display = "none";
    document.body.style.overflow = "auto";
  }

  function showInfo(category, imagePath) {
    showInfoInModal(category, imagePath);
  }

  function showInfoInModal(category, imagePath) {
    if (!modalElement) modalElement = createModal();
    const modal = modalElement.container;
    const modalOverlay = modalElement.overlay;

    modal.innerHTML = "";

    const closeButton = document.createElement("button");
    closeButton.className = "modal-close";
    closeButton.innerHTML = "✕";
    closeButton.onclick = closeModal;
    modal.appendChild(closeButton);

    const categoryData = mobData[category];
    const matched = categoryData.find((item) => item.image === imagePath);

    if (!matched) {
      modal.innerHTML += "<p>데이터를 찾을 수 없습니다.</p>";
      modalOverlay.style.display = "flex";
      document.body.style.overflow = "hidden";
      return;
    }

    currentStats = matched.stats || [];
    currentLevel = 0;
    currentName = matched.name || "이름 없음";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";

    const imgPreview = document.createElement("img");
    imgPreview.src = imagePath;
    imgPreview.alt = currentName;
    imgPreview.className = "modal-img-preview";

    const titleArea = document.createElement("div");
    titleArea.className = "title-area";

    const title = document.createElement("h3");
    title.textContent = currentName;

    const influenceIcon = document.createElement("span");
    influenceIcon.className = "influence-icon";
    influenceIcon.innerHTML = "★";
    influenceIcon.title = "인플루언스";
    title.appendChild(influenceIcon);

    const levelControls = document.createElement("div");
    levelControls.classList.add("level-controls");

    const levelMinusButton = document.createElement("button");
    levelMinusButton.innerText = "-";
    levelMinusButton.addEventListener("click", () => changeLevel(-1));

    const levelInput = document.createElement("input");
    levelInput.type = "number";
    levelInput.min = "0";
    levelInput.max = "25";
    levelInput.value = currentLevel;
    levelInput.classList.add("level-input");
    levelInput.addEventListener("input", function () {
      let value = parseInt(this.value);
      if (isNaN(value)) value = 0;
      if (value > 25) value = 25;
      if (value < 0) value = 0;
      this.value = value;
      currentLevel = value;
      updateStatsInModal(
        currentStats.find((s) => s.level === currentLevel) || null
      );
    });

    const levelPlusButton = document.createElement("button");
    levelPlusButton.innerText = "+";
    levelPlusButton.addEventListener("click", () => changeLevel(1));

    const maxButton = document.createElement("button");
    maxButton.innerText = "MAX";
    maxButton.classList.add("level-controls", "max-button");
    maxButton.addEventListener("click", () => {
      currentLevel = 25;
      levelInput.value = currentLevel;
      updateStatsInModal(
        currentStats.find((s) => s.level === currentLevel) || null
      );
    });

    levelControls.appendChild(levelMinusButton);
    levelControls.appendChild(levelInput);
    levelControls.appendChild(levelPlusButton);
    levelControls.appendChild(maxButton);

    titleArea.appendChild(title);
    titleArea.appendChild(levelControls);

    modalHeader.appendChild(imgPreview);
    modalHeader.appendChild(titleArea);

    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";

    const leftColumn = document.createElement("div");
    leftColumn.className = "stats-column";
    const registrationHeader = document.createElement("b");
    registrationHeader.innerText = "📌 등록 효과:";
    const registrationList = document.createElement("ul");
    registrationList.id = "registrationList";
    leftColumn.appendChild(registrationHeader);
    leftColumn.appendChild(registrationList);

    const rightColumn = document.createElement("div");
    rightColumn.className = "stats-column";
    const bindHeader = document.createElement("b");
    bindHeader.innerText = "🧷 결속 효과:";
    const bindList = document.createElement("ul");
    bindList.id = "bindList";
    rightColumn.appendChild(bindHeader);
    rightColumn.appendChild(bindList);

    modal.appendChild(modalHeader);
    modal.appendChild(statsContainer);
    statsContainer.appendChild(leftColumn);
    statsContainer.appendChild(rightColumn);

    const initialStat =
      currentStats.find((s) => s.level === currentLevel) || null;
    updateStatsInModal(initialStat);

    modalOverlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function changeLevel(diff) {
    const newLevel = currentLevel + diff;
    if (newLevel < 0 || newLevel > 25) return;

    currentLevel = newLevel;
    const levelInput = document.querySelector(".level-input");
    if (levelInput) levelInput.value = currentLevel;

    const stat = currentStats.find((s) => s.level === currentLevel);
    updateStatsInModal(stat);
  }

  function updateStatsInModal(stat) {
    const registrationList = document.getElementById("registrationList");
    const bindList = document.getElementById("bindList");

    if (!registrationList || !bindList) return;

    registrationList.innerHTML = "";
    bindList.innerHTML = "";

    const existingNotices = document.querySelectorAll(".level25-notice");
    existingNotices.forEach((notice) => notice.remove());

    if (!stat) {
      const level25Stat = currentStats.find((s) => s.level === 25);

      if (currentLevel !== 25 && level25Stat) {
        if (
          level25Stat.registrationStat &&
          Object.keys(level25Stat.registrationStat).length > 0
        ) {
          registrationList.innerHTML = `<li>현재 레벨에는 등록 효과가 없습니다</li>`;
          const regNoticeDiv = document.createElement("div");
          regNoticeDiv.className = "level25-notice";
          regNoticeDiv.textContent = "※ 등록 효과는 25레벨에 있습니다";
          registrationList.parentNode.appendChild(regNoticeDiv);
        } else {
          registrationList.innerHTML = `<li>등록 효과 정보 없음</li>`;
        }

        if (
          level25Stat.bindStat &&
          Object.keys(level25Stat.bindStat).length > 0
        ) {
          bindList.innerHTML = `<li>현재 레벨에는 결속 효과가 없습니다</li>`;
          const bindNoticeDiv = document.createElement("div");
          bindNoticeDiv.className = "level25-notice";
          bindNoticeDiv.textContent = "※ 결속 효과는 25레벨에 있습니다";
          bindList.parentNode.appendChild(bindNoticeDiv);
        } else {
          bindList.innerHTML = `<li>결속 효과 정보 없음</li>`;
        }
      } else {
        registrationList.innerHTML = `<li>레벨 ${currentLevel} 정보 없음</li>`;
        bindList.innerHTML = `<li>레벨 ${currentLevel} 정보 없음</li>`;
      }
      return;
    }

    if (
      stat.registrationStat &&
      Object.keys(stat.registrationStat).length > 0
    ) {
      displayStatsInOrder(registrationList, stat.registrationStat);
    } else {
      const level25Stat = currentStats.find((s) => s.level === 25);
      if (
        currentLevel !== 25 &&
        level25Stat &&
        level25Stat.registrationStat &&
        Object.keys(level25Stat.registrationStat).length > 0
      ) {
        registrationList.innerHTML = `<li>레벨 ${currentLevel}에는 등록 효과가 없습니다</li>`;
        const regNoticeDiv = document.createElement("div");
        regNoticeDiv.className = "level25-notice";
        regNoticeDiv.textContent = "※ 등록 효과는 25레벨에 있습니다";
        registrationList.parentNode.appendChild(regNoticeDiv);
      } else {
        registrationList.innerHTML = `<li>레벨 ${currentLevel} 등록 효과 없음</li>`;
      }
    }

    if (stat.bindStat && Object.keys(stat.bindStat).length > 0) {
      displayStatsInOrder(bindList, stat.bindStat);
    } else {
      const level25Stat = currentStats.find((s) => s.level === 25);
      if (
        currentLevel !== 25 &&
        level25Stat &&
        level25Stat.bindStat &&
        Object.keys(level25Stat.bindStat).length > 0
      ) {
        bindList.innerHTML = `<li>레벨 ${currentLevel}에는 결속 효과가 없습니다</li>`;
        const bindNoticeDiv = document.createElement("div");
        bindNoticeDiv.className = "level25-notice";
        bindNoticeDiv.textContent = "※ 결속 효과는 25레벨에 있습니다";
        bindList.parentNode.appendChild(bindNoticeDiv);
      } else {
        bindList.innerHTML = `<li>레벨 ${currentLevel} 결속 효과 없음</li>`;
      }
    }
  }

  function displayStatsInOrder(listElement, statsObj) {
    if (!statsObj || Object.keys(statsObj).length === 0) return;

    const STATS_ORDER = window.CommonData.STATS_ORDER || [];

    const groupedStats = {};
    Object.entries(statsObj).forEach(([key, val]) => {
      const statName = STATS_MAPPING[key] || key;

      if (groupedStats[statName]) {
        if (
          !isNaN(parseFloat(val)) &&
          !isNaN(parseFloat(groupedStats[statName].val))
        ) {
          groupedStats[statName].val = (
            parseFloat(groupedStats[statName].val) + parseFloat(val)
          ).toString();
        } else {
          groupedStats[statName].val = val;
        }
      } else {
        groupedStats[statName] = {
          key: key,
          val: val,
          order: STATS_ORDER.indexOf(key),
        };
      }
    });

    const sortedStats = Object.entries(groupedStats).sort((a, b) => {
      const orderA = a[1].order;
      const orderB = b[1].order;

      if (orderA >= 0 && orderB >= 0) {
        return orderA - orderB;
      } else if (orderA >= 0) {
        return -1;
      } else if (orderB >= 0) {
        return 1;
      }

      return a[0].localeCompare(b[0]);
    });

    sortedStats.forEach(([statName, info]) => {
      const li = document.createElement("li");

      if (SPECIAL_STAT_CLASSES[statName]) {
        li.innerHTML = `<span class="${SPECIAL_STAT_CLASSES[statName]}">${statName}: ${info.val}</span>`;
      } else {
        li.textContent = `${statName}: ${info.val}`;
      }

      listElement.appendChild(li);
    });
  }

  function initialize() {
    initFirebase();
    testFirebaseConnectivity().then(() => {
      loadCategoryData();
    });
  }
  return {
    initialize,
    showCategory,
    closeModal,
  };
})();

document.addEventListener("DOMContentLoaded", function () {
  const helpBtn = document.getElementById("helpBtn");
  const helpTooltip = document.getElementById("helpTooltip");
  const closeHelp = document.getElementById("closeHelp");

  helpBtn.addEventListener("click", function () {
    helpTooltip.style.display =
      helpTooltip.style.display === "block" ? "none" : "block";
  });

  closeHelp.addEventListener("click", function () {
    helpTooltip.style.display = "none";
  });

  document.addEventListener("click", function (event) {
    const isClickInsideHelp =
      helpTooltip.contains(event.target) || helpBtn.contains(event.target);
    if (!isClickInsideHelp && helpTooltip.style.display === "block") {
      helpTooltip.style.display = "none";
    }
  });
});

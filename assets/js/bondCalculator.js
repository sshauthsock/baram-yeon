const statsMapping = {
  criticalPower: "치명위력",
  normalMonsterAdditionalDamage: "일반몬스터추가피해",
  normalMonsterPenetration: "일반몬스터관통",
  healthIncrease: "체력증가",
  healthIncreasePercent: "체력증가%",
  strength: "힘",
  agility: "민첩",
  intelligence: "지력",
  damageAbsorption: "피해흡수",
  damageResistancePenetration: "피해저항관통",
  magicIncrease: "마력증가",
  magicIncreasePercent: "마력증가%",
  damageResistance: "피해저항",
  healthPotionEnhancement: "체력시약향상",
  healthRecoveryImprovement: "체력회복향상",
  damageIncrease: "피해증가",
  magicRecoveryImprovement: "마력회복향상",
  criticalChance: "치명확률",
  bossMonsterAdditionalDamage: "보스몬스터추가피해",
  bossMonsterPenetration: "보스몬스터관통",
  power: "위력",
  magicPotionEnhancement: "마력시약향상",
  pvpDamage: "대인피해",
  pvpDefense: "대인방어",
  statusEffectAccuracy: "상태이상적중",
  statusEffectResistance: "상태이상저항",
  criticalPowerPercent: "치명위력%",
  pvpDamagePercent: "대인피해%",
  pvpDefensePercent: "대인방어%",
  criticalDamageResistance: "치명피해저항",
  criticalResistance: "치명저항",
  movementSpeed: "이동속도",
  destructionPowerIncrease: "파괴력증가",
  destructionPowerPercent: "파괴력증가%",
  armorStrength: "무장도",
  lootAcquisitionIncrease: "전리품획득증가",
  experienceGainIncrease: "경험치획득증가",
};

let mobData = { 수호: [], 탑승: [], 변신: [] };
let selectedSpirits = [];
let gradeSetEffects = {};
let factionSetEffects = {};
let isProcessing = false;
let isCalculationCancelled = false;
let savedOptimalCombinations = {
  수호: [],
  탑승: [],
  변신: [],
};
let currentActiveIndex = -1;
let combinationCounter = {
  수호: 0,
  탑승: 0,
  변신: 0,
};

const percentStats = [
  "healthIncreasePercent",
  "magicIncreasePercent",
  "criticalPowerPercent",
  "pvpDamagePercent",
  "pvpDefensePercent",
  "destructionPowerPercent",
];

const factionIcons = {
  결의: "assets/img/bond/결의.jpg",
  고요: "assets/img/bond/고요.jpg",
  냉정: "assets/img/bond/냉정.jpg",
  의지: "assets/img/bond/의지.jpg",
  침착: "assets/img/bond/침착.jpg",
  활력: "assets/img/bond/활력.jpg",
};

const statColorMap = {
  damageResistance: "stat-damage-resistance",
  damageResistancePenetration: "stat-damage-resistance-penetration",
  pvpDefensePercent: "stat-pvp-defense-percent",
  pvpDamagePercent: "stat-pvp-damage-percent",
  healthIncreasePercent: "stat-health-increase-percent",
  criticalPowerPercent: "stat-critical-power-percent",
  magicIncreasePercent: "stat-magic-increase-percent",
  destructionPowerPercent: "stat-destruction-power-percent",
  criticalChance: "stat-critical-chance",
  bossMonsterAdditionalDamage: "stat-boss-monster-additional-damage",
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.innerWidth <= 768) {
    const mainRightPanel = document.querySelector(".main-content .right-panel");
    if (mainRightPanel) {
      mainRightPanel.style.display = "none";
    }
  }

  loadAllData().then(() => {
    loadSelectedSpiritsFromStorage();
  });

  loadSavedOptimalCombinations();
  initializeUIEvents();
  handleResponsiveLayout();

  const images = document.querySelectorAll("img");
  if ("loading" in HTMLImageElement.prototype) {
    images.forEach((img) => {
      if (img.getAttribute("loading") !== "lazy") {
        img.setAttribute("loading", "lazy");
      }
    });
  }

  document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const category = this.textContent;

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
    });
  });

  window.addEventListener("resize", handleResponsiveLayout);
});

function handleResponsiveLayout() {
  const toggleContainer = document.getElementById("panelToggleContainer");
  const mainRightPanel = document.querySelector(".main-content .right-panel");

  if (window.innerWidth <= 768) {
    if (selectedSpirits.length === 0) {
      toggleContainer.style.display = "none";
    } else {
      toggleContainer.style.display = "flex";
    }

    if (mainRightPanel) {
      mainRightPanel.style.display = "none";
    }
  } else {
    toggleContainer.style.display = "none";

    if (mainRightPanel) {
      mainRightPanel.style.display = "block";
    }
  }
}

function initializeUIEvents() {
  const toggleContainer = document.getElementById("panelToggleContainer");
  const rightPanel = toggleContainer.querySelector(".right-panel");
  const panelToggleBtn = document.getElementById("panelToggleBtn");

  if (panelToggleBtn && rightPanel) {
    const toggleIcon = panelToggleBtn.querySelector(".toggle-icon");
    toggleIcon.textContent = "▲";
    panelToggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      rightPanel.classList.toggle("collapsed");

      if (rightPanel.classList.contains("collapsed")) {
        toggleIcon.style.transform = "rotate(0)";
        toggleIcon.textContent = "▲";
      } else {
        toggleIcon.style.transform = "rotate(360deg)";
        toggleIcon.textContent = "▼";
      }
    });

    document.addEventListener("click", function (e) {
      if (
        window.innerWidth <= 768 &&
        !rightPanel.classList.contains("collapsed") &&
        !rightPanel.contains(e.target) &&
        e.target !== panelToggleBtn
      ) {
        rightPanel.classList.add("collapsed");

        toggleIcon.style.transform = "rotate(0)";
        toggleIcon.textContent = "▲";
      }
    });

    rightPanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  document
    .getElementById("resultModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) closeResultModal();
    });

  document
    .getElementById("optimalModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) closeOptimalModal();
    });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeResultModal();
      closeOptimalModal();
    }
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBWBbe8carOdeIzP6hQsarDOz5H0TuEj9A",
  authDomain: "baram-yeon.firebaseapp.com",
  projectId: "baram-yeon",
  storageBucket: "baram-yeon.firebasestorage.app",
  messagingSenderId: "924298156656",
  appId: "1:924298156656:web:845c94e771625fbd24b2b5",
  measurementId: "G-F2BT2T7HCL",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function bulkLoadFirestoreDocuments() {
  try {
    const snapshot = await db.collection("jsonData").get();
    const documents = {};

    snapshot.forEach((doc) => {
      documents[doc.id] = doc.data();
    });

    return documents;
  } catch (error) {
    console.error("Error bulk loading documents:", error);
    return {};
  }
}

let cachedFirestoreDocuments = null;

async function getFirestoreDocument(fileName) {
  try {
    const documentMap = {
      "guardian-bind-stats": "data-1744895158504",
      "guardian-registration-stats": "data-1744895164886",
      "ride-bind-stats": "data-1744895170256",
      "ride-registration-stats": "data-1744895175627",
      "transform-bind-stats": "data-1744895179894",
      "transform-registration-stats": "data-1744895184028",
      gradeSetEffects: "data-1744943824244",
      factionSetEffects: "data-1744943824244",
    };

    const docId = documentMap[fileName];

    if (!docId) {
      throw new Error(`No mapping for ${fileName}`);
    }

    const cachedKey = `firestore_${fileName}`;
    const cachedData = localStorage.getItem(cachedKey);
    const cachedTime = localStorage.getItem(`${cachedKey}_time`);

    // 24시간 내 캐싱된 데이터 사용
    if (
      cachedData &&
      cachedTime &&
      Date.now() - parseInt(cachedTime) < 24 * 60 * 60 * 1000
    ) {
      return JSON.parse(cachedData);
    }

    const docRef = await db.collection("jsonData").doc(docId).get();

    if (!docRef.exists) {
      throw new Error(`Document ${docId} not found`);
    }

    const data = docRef.data();

    if (!data) {
      throw new Error(`Document ${docId} exists but has no data`);
    }

    // Firestore 데이터 캐싱
    localStorage.setItem(cachedKey, JSON.stringify(data));
    localStorage.setItem(`${cachedKey}_time`, Date.now().toString());

    return data;
  } catch (error) {
    console.error(`Firestore error for ${fileName}:`, error);
    const response = await fetch(`output/${fileName}.json`);
    return await response.json();
  }
}

// loadAllData 함수 수정
async function loadAllData() {
  const categoryFileMap = {
    수호: {
      registration: "guardian-registration-stats",
      bind: "guardian-bind-stats",
    },
    탑승: {
      registration: "ride-registration-stats",
      bind: "ride-bind-stats",
    },
    변신: {
      registration: "transform-registration-stats",
      bind: "transform-bind-stats",
    },
  };

  for (const [category, files] of Object.entries(categoryFileMap)) {
    try {
      // Firestore에서 데이터 불러오기
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
      console.error(`Error loading ${category} data:`, err);
      try {
        // 로컬 파일로 폴백
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
        console.error(
          `Fallback loading also failed for ${category}:`,
          fallbackErr
        );
        mobData[category] = [];
      }
    }
  }

  try {
    // Firestore에서 등급 효과 불러오기
    let gradeData = await getFirestoreDocument("gradeSetEffects");

    if (!gradeData || typeof gradeData !== "object") {
      gradeSetEffects = {};
    } else if (gradeData.data) {
      gradeSetEffects = gradeData.data;
    } else {
      gradeSetEffects = gradeData;
    }

    // Firestore에서 세력 효과 불러오기
    let factionData = await getFirestoreDocument("factionSetEffects");

    if (!factionData || typeof factionData !== "object") {
      factionSetEffects = {};
    } else if (factionData.data) {
      factionSetEffects = factionData.data;
    } else {
      factionSetEffects = factionData;
    }
  } catch (err) {
    console.error("Error loading set effects:", err);
    try {
      // 로컬 파일로 폴백
      const gradeResponse = await fetch("output/gradeSetEffects.json");
      let gradeData = await gradeResponse.json();

      if (!gradeData || typeof gradeData !== "object") {
        gradeSetEffects = {};
      } else if (gradeData.data) {
        gradeSetEffects = gradeData.data;
      } else {
        gradeSetEffects = gradeData;
      }

      const factionResponse = await fetch("output/factionSetEffects.json");
      let factionData = await factionResponse.json();

      if (!factionData || typeof factionData !== "object") {
        factionSetEffects = {};
      } else if (factionData.data) {
        factionSetEffects = factionData.data;
      } else {
        factionSetEffects = factionData;
      }
    } catch (fallbackErr) {
      console.error(
        "Fallback loading for set effects also failed:",
        fallbackErr
      );
      gradeSetEffects = {};
      factionSetEffects = {};
    }
  }

  showCategory("수호", false);
}

function normalizeStatKey(key) {
  return key.replace(/\d+$/, "");
}

function showCategory(category, resetSelection = false) {
  const container = document.getElementById("imageContainer");
  container.innerHTML = "";

  document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
    tab.classList.remove("active");
    if (tab.innerText === category) tab.classList.add("active");
  });

  if (resetSelection) {
    selectedSpirits = [];
    updateSelectedCount();
    renderSelectedSpirits();
    saveSelectedSpiritsToStorage();
  }

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

  if (!mobData[category] || mobData[category].length === 0) {
    container.innerHTML = `<p>이미지 데이터가 없습니다.</p>`;
    return;
  }

  mobData[category].forEach((item) => {
    const imgContainer = document.createElement("div");
    imgContainer.className = "img-wrapper";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.title = item.name;
    img.loading = "lazy";
    img.dataset.category = category;
    img.dataset.name = item.name;
    img.dataset.image = item.image;

    const isSelected = selectedSpirits.some((s) => s.image === item.image);
    if (isSelected) {
      img.classList.add("selected");
    }

    img.onclick = () => toggleSpiritSelection(item, category);

    const nameLabel = document.createElement("small");
    nameLabel.textContent = item.name;
    nameLabel.className = "img-name";

    imgContainer.appendChild(img);
    imgContainer.appendChild(nameLabel);
    container.appendChild(imgContainer);
  });
}

function saveSelectedSpiritsToStorage() {
  localStorage.setItem("selectedSpirits", JSON.stringify(selectedSpirits));
}

function loadSelectedSpiritsFromStorage() {
  const savedSpirits = localStorage.getItem("selectedSpirits");
  if (savedSpirits) {
    try {
      selectedSpirits = JSON.parse(savedSpirits);
      updateSelectedCount();
      renderSelectedSpirits();

      const images = document.querySelectorAll("#imageContainer img");
      images.forEach((img) => {
        const isSelected = selectedSpirits.some(
          (s) => s.image === img.dataset.image
        );
        if (isSelected) {
          img.classList.add("selected");
        }
      });
    } catch (e) {
      console.error("저장된 환수 데이터를 불러오는 중 오류 발생:", e);
    }
  }
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

function clearSavedOptimalCombinations() {
  const activeTab = document.querySelector(".sub-tabs .tab.active");
  const currentCategory = activeTab ? activeTab.textContent : "수호";

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

function toggleSpiritSelection(spirit, category) {
  const existingIndex = selectedSpirits.findIndex(
    (s) => s.image === spirit.image
  );

  if (existingIndex !== -1) {
    selectedSpirits.splice(existingIndex, 1);
  } else {
    if (selectedSpirits.length >= 20) {
      alert("최대 20개의 환수만 선택할 수 있습니다.");
      return;
    }

    const faction = spirit.influence || spirit.faction || "결의";

    const spiritData = {
      ...spirit,
      category,
      level: 0,
      grade: spirit.grade || "전설",
      faction: faction,
    };
    selectedSpirits.push(spiritData);
  }

  updateSelectedCount();
  updateSpiritSelectionUI(spirit.image);
  renderSelectedSpirits();
  handleResponsiveLayout();
  saveSelectedSpiritsToStorage();
}

function updateSpiritSelectionUI(spiritImage) {
  const images = document.querySelectorAll("#imageContainer img");
  images.forEach((img) => {
    if (img.dataset.image === spiritImage) {
      img.classList.toggle("selected");
    }
  });
}

function updateSelectedCount() {
  const count = selectedSpirits.length;
  document.getElementById("selectedCount").textContent = count;

  const mobileCountElement = document.getElementById("mobileSelectedCount");
  if (mobileCountElement) {
    mobileCountElement.textContent = count;
  }

  handleResponsiveLayout();
}

function renderSelectedSpirits() {
  const containerSelectors = [
    "#selectedSpirits",
    "#panelToggleContainer .selected-spirits",
  ];

  containerSelectors.forEach((selector) => {
    const container = document.querySelector(selector);
    if (!container) return;

    container.innerHTML = "";

    if (selectedSpirits.length === 0) {
      container.innerHTML =
        "<p>선택된 환수가 없습니다. 위에서 환수를 선택해주세요.</p>";
      return;
    }

    const fragment = document.createDocumentFragment();

    selectedSpirits.forEach((spirit, index) => {
      const card = document.createElement("div");
      card.className = "selected-spirit-card";

      card.innerHTML = `
        <div class="selected-spirit-header">
          <img src="${spirit.image}" alt="${spirit.name}">
          <div class="spirit-info">
            <div class="spirit-name">${spirit.name}</div>
          </div>
        </div>
        <div class="spirit-level-control">
          <button onclick="changeLevel(${index}, -1)">-</button>
          <input type="number" min="0" max="25" value="${spirit.level}"
            onchange="updateSpiritLevel(${index}, this.value)">
          <button onclick="changeLevel(${index}, 1)">+</button>
        </div>
        <button class="remove-spirit" onclick="removeSpirit(${index})">제거</button>
      `;

      fragment.appendChild(card.cloneNode(true));
    });

    container.appendChild(fragment);
  });
}

function updateSpiritLevel(index, value) {
  let level = parseInt(value);
  if (isNaN(level)) level = 0;
  if (level > 25) level = 25;
  if (level < 0) level = 0;
  selectedSpirits[index].level = level;
  saveSelectedSpiritsToStorage();
}

function removeSpirit(index) {
  selectedSpirits.splice(index, 1);
  updateSelectedCount();
  renderSelectedSpirits();
  showCategory(document.querySelector(".sub-tabs .tab.active").textContent);
  handleResponsiveLayout();
  saveSelectedSpiritsToStorage();
}

function changeLevel(index, diff) {
  const spirit = selectedSpirits[index];
  let newLevel = spirit.level + diff;

  if (newLevel < 0) newLevel = 0;
  if (newLevel > 25) newLevel = 25;

  spirit.level = newLevel;
  renderSelectedSpirits();
  saveSelectedSpiritsToStorage();
}

function applyBatchLevel(inputId) {
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

  selectedSpirits.forEach((spirit) => {
    spirit.level = level;
  });

  document.getElementById("batchLevel").value = level;
  document.getElementById("mobileBatchLevel").value = level;

  renderSelectedSpirits();
  saveSelectedSpiritsToStorage();
}

const calculateBondEffects = debounce(function () {
  if (selectedSpirits.length === 0) {
    alert("결속 효과를 계산하려면 환수를 선택하세요.");
    return;
  }

  const result = calculateEffectsForSpirits(selectedSpirits);
  showResultsInModal(result);
}, 300);

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
      for (const [stat, value] of Object.entries(levelStats)) {
        const numValue = parseFloat(String(value).replace(/,/g, ""));
        if (!isNaN(numValue)) {
          const normalizedStat = normalizeStatKey(stat);
          registrationStats[normalizedStat] =
            (registrationStats[normalizedStat] || 0) + numValue;
        }
      }
    } else {
      missingDataSpirits.push(spirit.name);
    }

    const category = spirit.category;
    const grade = spirit.grade || "전설";

    const faction = spirit.influence || spirit.faction || "결의";

    if (!categoryGradeCount[category]) {
      categoryGradeCount[category] = {};
    }
    if (!categoryGradeCount[category][grade]) {
      categoryGradeCount[category][grade] = 0;
    }
    categoryGradeCount[category][grade]++;

    if (!categoryFactionCount[category]) {
      categoryFactionCount[category] = {};
    }
    if (!categoryFactionCount[category][faction]) {
      categoryFactionCount[category][faction] = 0;
    }
    categoryFactionCount[category][faction]++;
  });

  const gradeEffects = calculateGradeSetEffects(categoryGradeCount);
  const factionEffects = calculateFactionSetEffects(categoryFactionCount);
  const combinedEffects = {};

  for (const [stat, value] of Object.entries(registrationStats)) {
    combinedEffects[stat] = value;
  }

  for (const [stat, value] of Object.entries(gradeEffects)) {
    if (combinedEffects[stat]) {
      combinedEffects[stat] += value;
    } else {
      combinedEffects[stat] = value;
    }
  }

  for (const [stat, value] of Object.entries(factionEffects)) {
    if (combinedEffects[stat]) {
      combinedEffects[stat] += value;
    } else {
      combinedEffects[stat] = value;
    }
  }

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

  for (const [category, grades] of Object.entries(categoryGradeCount)) {
    for (const [grade, count] of Object.entries(grades)) {
      if (count < 2 || !gradeSetEffects[category]?.[grade]) continue;

      let highestStepNumber = 0;
      let highestStepEffects = null;

      for (let step = 2; step <= Math.min(6, count); step++) {
        if (gradeSetEffects[category][grade][step.toString()]) {
          highestStepNumber = step;
          highestStepEffects =
            gradeSetEffects[category][grade][step.toString()];
        }
      }

      if (highestStepEffects) {
        for (const [stat, value] of Object.entries(highestStepEffects)) {
          const numValue = parseFloat(String(value).replace(/,/g, ""));
          if (!isNaN(numValue)) {
            const normalizedStat = normalizeStatKey(stat);
            if (effects[normalizedStat]) {
              effects[normalizedStat] += numValue;
            } else {
              effects[normalizedStat] = numValue;
            }
          }
        }
      }
    }
  }

  return effects;
}

function calculateFactionSetEffects(categoryFactionCount) {
  const effects = {};

  for (const [category, factions] of Object.entries(categoryFactionCount)) {
    if (!factionSetEffects[category]) {
      continue;
    }

    for (const [faction, count] of Object.entries(factions)) {
      if (count < 2 || !factionSetEffects[category][faction]) {
        continue;
      }

      let maxCount = 0;
      let maxEffect = null;

      for (const effect of factionSetEffects[category][faction]) {
        if (typeof effect === "object" && effect !== null) {
          const requiredCount = parseInt(effect["개수"] || "0");

          if (
            !isNaN(requiredCount) &&
            count >= requiredCount &&
            requiredCount > maxCount
          ) {
            maxCount = requiredCount;
            maxEffect = effect;
          }
        }
      }

      if (maxEffect) {
        for (const [stat, value] of Object.entries(maxEffect)) {
          if (stat !== "개수") {
            const numValue = parseFloat(String(value).replace(/,/g, ""));
            if (!isNaN(numValue)) {
              const normalizedStat = normalizeStatKey(stat);
              if (effects[normalizedStat]) {
                effects[normalizedStat] += numValue;
              } else {
                effects[normalizedStat] = numValue;
              }
            }
          }
        }
      }
    }
  }

  return effects;
}

function showResultsInModal(result) {
  const {
    spirits,
    gradeEffects,
    factionEffects,
    combinedEffects,
    missingDataSpirits,
    score,
    gradeCounts,
    factionCounts,
  } = result;
  const modal = document.getElementById("resultModal");

  const spiritsInfoElement = document.getElementById("spiritsInfoList");
  spiritsInfoElement.innerHTML = "";

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
    level.textContent = `레벨: ${spirit.level} / ${spirit.category} / ${spirit.grade} / ${faction}`;

    details.appendChild(name);
    details.appendChild(level);

    spiritInfo.appendChild(img);
    spiritInfo.appendChild(details);

    spiritsInfoElement.appendChild(spiritInfo);
  });

  let gradeSetInfo = "";
  for (const [category, grades] of Object.entries(gradeCounts)) {
    for (const [grade, count] of Object.entries(grades)) {
      if (count >= 2) {
        const gradeClass =
          grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
        gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
      }
    }
  }

  let factionSetInfo = "";
  for (const [category, factions] of Object.entries(factionCounts)) {
    const factionTags = Object.entries(factions)
      .filter(([_, count]) => count >= 2)
      .map(([faction, count]) => {
        const iconPath = factionIcons[faction] || "assets/img/bond/default.jpg";
        return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
      })
      .join(" ");

    if (factionTags) {
      factionSetInfo += `<div>${category}: ${factionTags}</div>`;
    }
  }

  document.getElementById("gradeEffects").innerHTML = renderEffectsList(
    gradeEffects,
    gradeSetInfo,
    true
  );
  document.getElementById("factionEffects").innerHTML = renderEffectsList(
    factionEffects,
    factionSetInfo,
    true
  );
  document.getElementById("totalEffects").innerHTML = renderEffectsList(
    combinedEffects,
    "",
    true
  );
  document.getElementById("weightedScore").textContent = score;

  const warningElement = document.getElementById("missingDataWarning");
  if (missingDataSpirits.length > 0) {
    warningElement.innerHTML = `<strong>주의:</strong> 다음 환수들의 데이터가 없어 계산에서 제외되었습니다: ${missingDataSpirits.join(
      ", "
    )}`;
    warningElement.style.display = "block";
  } else {
    warningElement.style.display = "none";
  }

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeResultModal() {
  document.getElementById("resultModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function closeOptimalModal() {
  document.getElementById("optimalModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function renderEffectsList(
  effects,
  setInfo = "",
  includePercentWithNormal = true
) {
  if (Object.keys(effects).length === 0) {
    if (setInfo) {
      return `<div class="set-info">${setInfo}</div><p>적용된 효과가 없습니다.</p>`;
    }
    return "<p>적용된 효과가 없습니다.</p>";
  }

  let html = "";
  if (setInfo) {
    html += `<div class="set-info">${setInfo}</div>`;
  }

  if (includePercentWithNormal) {
    for (const [stat, value] of Object.entries(effects)) {
      const normalizedStat = normalizeStatKey(stat);
      const statName = statsMapping[normalizedStat] || normalizedStat;
      const displayValue = percentStats.includes(normalizedStat)
        ? `${Math.round(value * 100) / 100}%`
        : Math.round(value * 100) / 100;

      const colorClass = statColorMap[normalizedStat] || "";
      const cssClass = percentStats.includes(normalizedStat)
        ? `effect-item effect-item-percent ${colorClass}`
        : `effect-item ${colorClass}`;

      html += `<div class="${cssClass}"><span>${statName}</span><span>${displayValue}</span></div>`;
    }
  } else {
    const normalEffects = {};
    const percentEffects = {};

    for (const [stat, value] of Object.entries(effects)) {
      const normalizedStat = normalizeStatKey(stat);
      if (percentStats.includes(normalizedStat)) {
        percentEffects[normalizedStat] = value;
      } else {
        normalEffects[normalizedStat] = value;
      }
    }

    if (Object.keys(normalEffects).length > 0) {
      for (const [stat, value] of Object.entries(normalEffects)) {
        const normalizedStat = normalizeStatKey(stat);
        const statName = statsMapping[normalizedStat] || normalizedStat;
        const colorClass = statColorMap[normalizedStat] || "";
        html += `<div class="effect-item ${colorClass}"><span>${statName}</span><span>${
          Math.round(value * 100) / 100
        }</span></div>`;
      }
    }

    if (Object.keys(percentEffects).length > 0) {
      html += `<div class="section-header">퍼센트 효과</div>`;
      for (const [stat, value] of Object.entries(percentEffects)) {
        const normalizedStat = normalizeStatKey(stat);
        const statName = statsMapping[normalizedStat] || normalizedStat;
        const colorClass = statColorMap[normalizedStat] || "";
        html += `<div class="effect-item effect-item-percent ${colorClass}"><span>${statName}</span><span>${
          Math.round(value * 100) / 100
        }%</span></div>`;
      }
    }
  }

  return html;
}

function findOptimalCombination() {
  if (selectedSpirits.length === 0) {
    alert("최적 조합을 찾으려면 환수를 선택하세요.");
    return;
  }

  if (isProcessing) {
    alert("이미 조합을 계산 중입니다. 잠시만 기다려주세요.");
    return;
  }

  isProcessing = true;
  isCalculationCancelled = false;

  const activeTab = document.querySelector(".sub-tabs .tab.active");
  const currentCategory = activeTab ? activeTab.textContent : "수호";

  const optimalModal = document.getElementById("optimalModal");
  optimalModal.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.getElementById("optimalModalContent").innerHTML = `
    <h3 class="modal-title">최적 결속 조합 결과 (최대 6개)</h3>
    <div class="modal-content">
      <div id="optimalHeader" class="optimal-header">
        <div class="optimal-score">
          <h4>환산합산: <span id="optimalScore">계산 중...</span></h4>
          <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small>
        </div>
      </div>
      
      <div class="action-buttons">
        <button id="clearHistoryButton" class="clear-history-btn">${currentCategory} 기록 삭제</button>
      </div>
      
      <div id="optimalSpiritsList" class="selected-spirits-info">
        <div class='processing-message'>
          최적 조합을 찾는 중입니다... (0%)
          <div style="margin-top: 10px;">
            <button id="cancelCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
          </div>
        </div>
      </div>
      
      <div class="results-container">
        <div class="results-section">
          <h4>등급 결속 효과</h4>
          <div id="optimalGradeEffects" class="effects-list"></div>
        </div>
        <div class="results-section">
          <h4>세력 결속 효과</h4>
          <div id="optimalFactionEffects" class="effects-list"></div>
        </div>
        <div class="results-section">
          <h4>총 결속 효과</h4>
          <div id="optimalTotalEffects" class="effects-list"></div>
        </div>
      </div>

      <div id="optimalSpiritsDetails" class="spirit-details-container">
        <h4>선택된 환수 상세 스탯</h4>
        <div id="spiritStatsDetails" class="spirit-stats-grid"></div>
      </div>
    </div>
  `;

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

  setTimeout(() => {
    try {
      // Create deep copies of spirits to prevent reference issues
      const validSpirits = selectedSpirits
        .filter((spirit) => {
          const levelStats = spirit.stats?.find(
            (s) => s.level === spirit.level
          )?.registrationStat;
          return levelStats !== undefined;
        })
        .map((spirit) => JSON.parse(JSON.stringify(spirit)));

      if (validSpirits.length === 0) {
        throw new Error("유효한 환수 데이터가 없습니다.");
      }

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

      for (let size = 1; size <= maxCombinationSize; size++) {
        const combinations = generateCombinations(validSpirits, size);

        for (let i = 0; i < combinations.length; i++) {
          if (isCalculationCancelled && bestResult !== null) {
            break;
          }

          const combination = combinations[i];
          const result = calculateEffectsForSpirits(combination);

          processedCombinations++;

          if (processedCombinations % 40 === 0) {
            updateProgress(processedCombinations / totalCombinations);
          }

          if (!bestResult || result.score > bestResult.score) {
            bestResult = result;
          }
        }

        if (isCalculationCancelled && bestResult !== null) {
          break;
        }
      }

      if (bestResult) {
        // Deep copy the best result before saving
        const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
        addNewOptimalCombination(deepCopiedResult);
        saveSavedOptimalCombinations();
        const category = bestResult.spirits[0]?.category || "수호";
        currentActiveIndex = savedOptimalCombinations[category].length - 1;
        renderHistoryTabs(category);
        showSingleOptimalResult(bestResult);
      }
    } catch (error) {
      console.error("Error finding optimal combination:", error);
      document.getElementById(
        "optimalSpiritsList"
      ).innerHTML = `<div class='warning-message'>${
        error.message || "조합을 찾는 중 오류가 발생했습니다."
      }</div>`;
      document.getElementById("optimalScore").textContent = "오류";
    } finally {
      isProcessing = false;
    }
  }, 100);
}

function addNewOptimalCombination(result) {
  const timestamp = new Date().toLocaleString();
  const category = result.spirits[0]?.category || "수호";

  if (!savedOptimalCombinations[category]) {
    savedOptimalCombinations[category] = [];
  }

  if (combinationCounter[category] === undefined) {
    combinationCounter[category] = 0;
  }

  const MAX_COMBINATIONS = 5;

  combinationCounter[category]++;

  const index = (combinationCounter[category] - 1) % MAX_COMBINATIONS;

  const resultWithTimestamp = {
    ...result, // No need for deep copy here since we already did it before
    timestamp,
    combinationName: `조합 ${index + 1}`,
    addedAt: Date.now(),
  };

  if (savedOptimalCombinations[category].length < MAX_COMBINATIONS) {
    savedOptimalCombinations[category].push(resultWithTimestamp);
  } else {
    savedOptimalCombinations[category][index] = resultWithTimestamp;
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

  currentActiveIndex = newestIndex;

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
                <span class="combo-name">${combo.combinationName}</span>
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
            ? '<span class="best-notice">(이 조합이 최고 점수입니다!)</span>'
            : ""
        }
      `;
    });
  });
}

function showSingleOptimalResult(result) {
  const {
    spirits,
    gradeEffects,
    factionEffects,
    combinedEffects,
    score,
    gradeCounts,
    factionCounts,
    timestamp,
  } = result;

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
  for (const [category, grades] of Object.entries(gradeCounts)) {
    for (const [grade, count] of Object.entries(grades)) {
      if (count >= 2) {
        const gradeClass =
          grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
        gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
      }
    }
  }

  let factionSetInfo = "";
  for (const [category, factions] of Object.entries(factionCounts)) {
    const factionTags = Object.entries(factions)
      .filter(([_, count]) => count >= 2)
      .map(([faction, count]) => {
        const iconPath = factionIcons[faction] || "assets/img/bond/default.jpg";
        return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
      })
      .join(" ");

    if (factionTags) {
      factionSetInfo += `<div>${category}: ${factionTags}</div>`;
    }
  }

  document.getElementById("optimalGradeEffects").innerHTML = renderEffectsList(
    gradeEffects,
    gradeSetInfo,
    true
  );
  document.getElementById("optimalFactionEffects").innerHTML =
    renderEffectsList(factionEffects, factionSetInfo, true);
  document.getElementById("optimalTotalEffects").innerHTML = renderEffectsList(
    combinedEffects,
    "",
    true
  );

  renderSpiritDetailsTable(spirits);
}

function renderSpiritDetailsTable(spirits) {
  const container = document.getElementById("spiritStatsDetails");
  container.innerHTML = "";

  if (spirits.length === 0) {
    container.innerHTML = "<p>표시할 환수 정보가 없습니다.</p>";
    return;
  }

  const allStatKeys = new Set();

  spirits.forEach((spirit) => {
    const levelStats = spirit.stats?.find(
      (s) => s.level === spirit.level
    )?.registrationStat;
    if (levelStats) {
      Object.keys(levelStats).forEach((key) =>
        allStatKeys.add(normalizeStatKey(key))
      );
    }
  });

  const sortedStatKeys = Array.from(allStatKeys).sort((a, b) => {
    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
    ];
    const aPriority = priorityStats.indexOf(a);
    const bPriority = priorityStats.indexOf(b);

    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    } else if (aPriority !== -1) {
      return -1;
    } else if (bPriority !== -1) {
      return 1;
    } else {
      return (statsMapping[a] || a).localeCompare(statsMapping[b] || b);
    }
  });

  const table = document.createElement("table");
  table.className = "spirits-stats-table";

  const headerRow = document.createElement("tr");

  const emptyHeader = document.createElement("th");
  emptyHeader.textContent = "스탯";
  headerRow.appendChild(emptyHeader);

  spirits.forEach((spirit) => {
    const spiritHeader = document.createElement("th");
    spiritHeader.innerHTML = `<img src="${spirit.image}" alt="${spirit.name}" class="spirit-thumbnail"><br>${spirit.name}`;
    headerRow.appendChild(spiritHeader);
  });

  table.appendChild(headerRow);

  const levelRow = document.createElement("tr");
  const levelHeader = document.createElement("th");
  levelHeader.textContent = "레벨";
  levelRow.appendChild(levelHeader);

  spirits.forEach((spirit) => {
    const levelCell = document.createElement("td");
    levelCell.textContent = spirit.level;
    levelRow.appendChild(levelCell);
  });
  table.appendChild(levelRow);

  const factionRow = document.createElement("tr");
  const factionHeader = document.createElement("th");
  factionHeader.textContent = "세력";
  factionRow.appendChild(factionHeader);

  spirits.forEach((spirit) => {
    const factionCell = document.createElement("td");
    factionCell.textContent = spirit.influence || spirit.faction || "결의";
    factionRow.appendChild(factionCell);
  });
  table.appendChild(factionRow);

  sortedStatKeys.forEach((statKey) => {
    const row = document.createElement("tr");

    const statHeader = document.createElement("th");
    statHeader.textContent = statsMapping[statKey] || statKey;
    const colorClass = statColorMap[statKey] || "";
    if (colorClass) {
      statHeader.className = colorClass;
    }
    row.appendChild(statHeader);

    spirits.forEach((spirit) => {
      const statCell = document.createElement("td");
      if (colorClass) {
        statCell.className = colorClass;
      }

      const levelStats =
        spirit.stats?.find((s) => s.level === spirit.level)?.registrationStat ||
        {};

      let statValue = 0;
      for (const [key, value] of Object.entries(levelStats)) {
        if (normalizeStatKey(key) === statKey) {
          statValue = value;
          break;
        }
      }

      if (percentStats.includes(statKey)) {
        statCell.textContent = `${statValue}%`;
      } else {
        statCell.textContent = statValue;
      }

      row.appendChild(statCell);
    });

    table.appendChild(row);
  });

  container.appendChild(table);
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

function generateCombinations(array, size) {
  if (size > array.length) return [];
  if (size === 0) return [[]];

  const result = [];

  for (let i = 0; i <= array.length - size; i++) {
    const head = [JSON.parse(JSON.stringify(array[i]))];
    const tailCombinations = generateCombinations(array.slice(i + 1), size - 1);

    for (const tailCombo of tailCombinations) {
      result.push([...head, ...tailCombo]);
    }
  }

  return result;
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

function clearAllSelections() {
  selectedSpirits = [];
  updateSelectedCount();
  renderSelectedSpirits();
  showCategory(
    document.querySelector(".sub-tabs .tab.active").textContent,
    false
  );
  handleResponsiveLayout();
  saveSelectedSpiritsToStorage();
}

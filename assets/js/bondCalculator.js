const BondCalculatorApp = (function () {
  const STATS_MAPPING = {
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
    magicRecoveryImprovement: "마나회복향상",
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

  const STAT_COLOR_MAP = {
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

  const PERCENT_STATS = [
    "healthIncreasePercent",
    "magicIncreasePercent",
    "criticalPowerPercent",
    "pvpDamagePercent",
    "pvpDefensePercent",
    "destructionPowerPercent",
  ];

  const FACTION_ICONS = {
    결의: "assets/img/bond/결의.jpg",
    고요: "assets/img/bond/고요.jpg",
    냉정: "assets/img/bond/냉정.jpg",
    의지: "assets/img/bond/의지.jpg",
    침착: "assets/img/bond/침착.jpg",
    활력: "assets/img/bond/활력.jpg",
  };

  const FIXED_LEVEL25_SPIRITS = [
    "결의의 탑승",
    "결의의 수호",
    "결의의 변신",
    "의지의 탑승",
    "의지의 수호",
    "의지의 변신",
    "냉정의 탑승",
    "냉정의 수호",
    "냉정의 변신",
    "침착의 탑승",
    "침착의 수호",
    "침착의 변신",
    "고요의 탑승",
    "고요의 수호",
    "고요의 변신",
    "활력의 탑승",
    "활력의 수호",
    "활력의 변신",
  ];

  const CATEGORY_FILE_MAP = {
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

  // State variables
  let mobData = { 수호: [], 탑승: [], 변신: [] };
  let selectedSpirits = [];
  let gradeSetEffects = {};
  let factionSetEffects = {};
  let isProcessing = false;
  let isCalculationCancelled = false;
  let isModalOpen = false;
  let savedOptimalCombinations = { 수호: [], 탑승: [], 변신: [] };
  let currentActiveIndex = -1;
  let combinationCounter = { 수호: 0, 탑승: 0, 변신: 0 };
  let allStatNames = [];
  let selectedSearchStats = [];
  let lastActiveCategory = "수호";
  let currentScrollY = 0;
  let db = null;

  // Firebase connection functions
  function initFirebase() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
  }

  async function getFirestoreDocument(fileName) {
    try {
      const documentMap = {
        "guardian-bind-stats.json": "data-1745203971906",
        "guardian-registration-stats.json": "data-1745203990701",
        "ride-bind-stats.json": "data-1745204015994",
        "ride-registration-stats.json": "data-1745204029836",
        "transform-bind-stats.json": "data-1745204045512",
        "transform-registration-stats.json": "data-1745204058405",
        "gradeSetEffects.json": "data-1745204079667",
        "factionSetEffects.json": "data-1745204094503",
        "chak.json": "data-1745204108850",
      };

      const docId = documentMap[fileName + ".json"];

      if (!docId) {
        throw new Error(`No mapping for ${fileName}`);
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
        throw new Error(`Document ${docId} not found`);
      }

      const data = docRef.data();

      if (!data) {
        throw new Error(`Document ${docId} exists but has no data`);
      }

      localStorage.setItem(cachedKey, JSON.stringify(data));
      localStorage.setItem(`${cachedKey}_time`, Date.now().toString());

      return data;
    } catch (error) {
      console.error(`Firestore error for ${fileName}:`, error);
      const response = await fetch(`output/${fileName}.json`);
      return await response.json();
    }
  }

  // Data loading functions
  async function loadAllData() {
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
        console.error(`Error loading ${category} data:`, err);
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
          console.error(
            `Fallback loading also failed for ${category}:`,
            fallbackErr
          );
          mobData[category] = [];
        }
      }
    }

    try {
      let gradeData = await getFirestoreDocument("gradeSetEffects");

      if (!gradeData || typeof gradeData !== "object") {
        gradeSetEffects = getDefaultGradeSetEffects();
      } else if (gradeData.data) {
        gradeSetEffects = gradeData.data;
      } else {
        gradeSetEffects = gradeData;
      }

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
        const gradeResponse = await fetch("output/gradeSetEffects.json");
        let gradeData = await gradeResponse.json();

        if (!gradeData || typeof gradeData !== "object") {
          gradeSetEffects = getDefaultGradeSetEffects();
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
        gradeSetEffects = getDefaultGradeSetEffects();
        factionSetEffects = {};
      }
    }

    allStatNames = collectAllStatNames();
    populateStatOptions();
    showCategory(lastActiveCategory, false);
  }

  function getDefaultGradeSetEffects() {
    return {
      수호: {
        전설: {
          2: { power: 150 },
          3: { power: 150, experienceGainIncrease: 10 },
          4: {
            power: 150,
            experienceGainIncrease: 10,
            damageResistancePenetration: 100,
          },
          5: {
            power: 150,
            experienceGainIncrease: 10,
            damageResistancePenetration: 100,
            statusEffectResistance: 150,
          },
          6: {
            power: 150,
            experienceGainIncrease: 10,
            damageResistancePenetration: 100,
            statusEffectResistance: 150,
            damageResistance: 100,
          },
        },
        불멸: {
          2: { damageResistancePenetration: 200 },
          3: { damageResistancePenetration: 200, damageResistance: 150 },
          4: {
            damageResistancePenetration: 200,
            damageResistance: 150,
            experienceGainIncrease: 15,
          },
          5: {
            damageResistancePenetration: 200,
            damageResistance: 150,
            experienceGainIncrease: 15,
            pvpDamagePercent: 20,
          },
          6: {
            damageResistancePenetration: 200,
            damageResistance: 150,
            experienceGainIncrease: 15,
            pvpDamagePercent: 20,
            pvpDefensePercent: 20,
          },
        },
      },
      탑승: {
        전설: {
          2: { normalMonsterAdditionalDamage: 50 },
          3: {
            normalMonsterAdditionalDamage: 50,
            bossMonsterAdditionalDamage: 50,
          },
          4: {
            normalMonsterAdditionalDamage: 50,
            bossMonsterAdditionalDamage: 50,
            damageResistancePenetration: 50,
          },
          5: {
            normalMonsterAdditionalDamage: 50,
            bossMonsterAdditionalDamage: 50,
            damageResistancePenetration: 50,
            statusEffectAccuracy: 50,
          },
          6: {
            normalMonsterAdditionalDamage: 50,
            bossMonsterAdditionalDamage: 50,
            damageResistancePenetration: 50,
            statusEffectAccuracy: 50,
            damageResistance: 50,
          },
        },
        불멸: {
          2: { damageResistancePenetration: 150 },
          3: { damageResistancePenetration: 150, damageResistance: 150 },
          4: {
            damageResistancePenetration: 150,
            damageResistance: 150,
            movementSpeed: 5,
          },
          5: {
            damageResistancePenetration: 150,
            damageResistance: 150,
            movementSpeed: 5,
            pvpDamagePercent: 20,
          },
          6: {
            damageResistancePenetration: 150,
            damageResistance: 150,
            movementSpeed: 5,
            pvpDamagePercent: 20,
            pvpDefensePercent: 20,
          },
        },
      },
      변신: {
        전설: {
          2: { magicIncreasePercent: 3 },
          3: { magicIncreasePercent: 3, healthIncreasePercent: 3 },
          4: {
            magicIncreasePercent: 3,
            healthIncreasePercent: 3,
            damageResistancePenetration: 100,
          },
          5: {
            magicIncreasePercent: 3,
            healthIncreasePercent: 3,
            damageResistancePenetration: 100,
            movementSpeed: 3,
          },
          6: {
            magicIncreasePercent: 3,
            healthIncreasePercent: 3,
            damageResistancePenetration: 100,
            movementSpeed: 3,
            damageResistance: 100,
          },
        },
        불멸: {
          2: { damageResistancePenetration: 150 },
          3: { damageResistancePenetration: 150, damageResistance: 150 },
          4: {
            damageResistancePenetration: 150,
            damageResistance: 150,
            criticalPowerPercent: 30,
          },
          5: {
            damageResistancePenetration: 150,
            damageResistance: 150,
            criticalPowerPercent: 30,
            pvpDamagePercent: 20,
          },
          6: {
            damageResistancePenetration: 150,
            damageResistance: 150,
            criticalPowerPercent: 30,
            pvpDamagePercent: 20,
            pvpDefensePercent: 20,
          },
        },
      },
    };
  }

  function collectAllStatNames() {
    const stats = new Set();

    for (const category in mobData) {
      if (!mobData[category] || !Array.isArray(mobData[category])) continue;

      mobData[category].forEach((spirit) => {
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

  // UI-related functions
  function showCategory(category, resetSelection = false) {
    lastActiveCategory = category;
    localStorage.setItem("lastActiveCategory", category);

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.remove("active");
      if (tab.innerText === category) tab.classList.add("active");
    });

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

    currentScrollY = window.scrollY;

    const container = document.getElementById("imageContainer");
    container.innerHTML = "";

    if (resetSelection) {
      selectedSpirits = selectedSpirits.filter(
        (spirit) => spirit.category !== category
      );
      updateSelectedCount();
      updateSelectedSpiritsPanel();
      saveSelectedSpiritsToStorage();
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
      img.id = `spirit-img-${item.name.replace(/\s+/g, "-")}`;

      const isSelected = selectedSpirits.some(
        (s) => s.image === item.image && s.category === category
      );

      if (isSelected) {
        img.classList.add("selected");
      }

      img.onclick = function (e) {
        e.preventDefault();
        currentScrollY = window.scrollY;

        const isCurrentlySelected = this.classList.contains("selected");
        if (isCurrentlySelected) {
          this.classList.remove("selected");
          const indexToRemove = selectedSpirits.findIndex(
            (s) => s.image === item.image && s.category === category
          );
          if (indexToRemove !== -1) {
            selectedSpirits.splice(indexToRemove, 1);
          }
        } else {
          const categorySpirits = selectedSpirits.filter(
            (s) => s.category === category
          );
          if (categorySpirits.length >= 20) {
            alert(`${category} 카테고리는 최대 20개까지만 선택할 수 있습니다.`);
            return;
          }

          this.classList.add("selected");

          const faction = item.influence || item.faction || "결의";
          const isFixed = isFixedLevelSpirit(item.name);
          const spiritLevel = isFixed ? 25 : 0;

          const spiritData = {
            ...item,
            category,
            level: spiritLevel,
            grade: item.grade || "전설",
            faction: faction,
            isFixedLevel: isFixed,
          };
          selectedSpirits.push(spiritData);
        }

        updateSelectedCount();
        updateSelectedSpiritsPanel();
        updateMobilePanel();
        saveSelectedSpiritsToStorage();

        setTimeout(() => {
          window.scrollTo(0, currentScrollY);
        }, 10);
      };

      const nameLabel = document.createElement("small");
      nameLabel.textContent = item.name;
      nameLabel.className = "img-name";

      imgContainer.appendChild(img);
      imgContainer.appendChild(nameLabel);
      container.appendChild(imgContainer);
    });

    updateSelectedSpiritsPanel();

    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }

  function updateSelectedSpiritsPanel() {
    const containerSelectors = [
      "#selectedSpirits",
      "#panelToggleContainer .selected-spirits",
    ];
    const currentCategory = lastActiveCategory;

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

        const levelControls = isFixed
          ? `<div class="spirit-level-control">
               <input type="number" value="25" readonly class="fixed-level" title="이 환수는 25레벨만 사용 가능합니다">
             </div>`
          : `<div class="spirit-level-control">
               <button onclick="BondCalculatorApp.changeLevel(${originalIndex}, -1)">-</button>
               <input type="number" min="0" max="25" value="${
                 spirit.level || 0
               }"
                 onchange="BondCalculatorApp.updateSpiritLevel(${originalIndex}, this.value)" id="level-input-${originalIndex}">
               <button onclick="BondCalculatorApp.changeLevel(${originalIndex}, 1)">+</button>
               <button class="max-btn" onclick="BondCalculatorApp.setMaxLevel(${originalIndex})">M</button>
             </div>`;

        card.innerHTML = `
          <button class="remove-spirit" onclick="BondCalculatorApp.removeSpirit(${originalIndex})">X</button>
          ${categoryBadge}
          <div class="selected-spirit-header">
            <img src="${spirit.image}" alt="${spirit.name}" title="${
          spirit.name
        }">
            <div class="spirit-info">
              <div class="spirit-name">${spirit.name}</div>
              ${isFixed ? '<div class="fixed-level-badge">고정 25</div>' : ""}
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

    if (window.innerWidth <= 768) {
      if (categorySpirits.length === 0) {
        toggleContainer.style.display = "none";
      } else {
        toggleContainer.style.display = "flex";
      }
    }
  }

  function updateSelectedCount() {
    const currentCategory = lastActiveCategory;

    const filteredCount = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    ).length;

    document.getElementById("selectedCount").textContent = filteredCount;

    const mobileCountElement = document.getElementById("mobileSelectedCount");
    if (mobileCountElement) {
      mobileCountElement.textContent = filteredCount;
    }
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

    if (mobData[currentCategory] && Array.isArray(mobData[currentCategory])) {
      mobData[currentCategory].forEach((spirit) => {
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

    const adElements = document.querySelectorAll(
      "#search-results-modal .kakao_ad_area"
    );
    adElements.forEach((ad) => {
      ad.style.display = "block";
    });

    if (typeof window.adfit !== "undefined") {
      window.adfit();
    } else {
      const reloadScript = document.createElement("script");
      reloadScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
      reloadScript.async = true;
      document.body.appendChild(reloadScript);
    }

    modal.style.display = "block";
  }

  function selectSpiritFromSearch(spirit, cardElement) {
    const category = spirit.category;
    const originalSpirit = mobData[category]?.find(
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
        if (categorySpirits.length >= 20) {
          alert(`${category} 카테고리는 최대 20개까지만 선택할 수 있습니다.`);
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
        if (imageElement) {
          imageElement.classList.add("selected");
        }

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

  // Spirit management functions
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

  function removeSpirit(index) {
    currentScrollY = window.scrollY;

    const spirit = selectedSpirits[index];

    const img = document.querySelector(
      `img[data-image="${spirit.image}"][data-category="${spirit.category}"]`
    );
    if (img) {
      img.classList.remove("selected");
    }

    selectedSpirits.splice(index, 1);

    updateSelectedCount();
    updateSelectedSpiritsPanel();
    updateMobilePanel();
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

  function clearAllSelections() {
    currentScrollY = window.scrollY;

    const currentCategory = lastActiveCategory;

    const images = document.querySelectorAll(
      `img[data-category="${currentCategory}"]`
    );
    images.forEach((img) => {
      img.classList.remove("selected");
    });

    selectedSpirits = selectedSpirits.filter(
      (spirit) => spirit.category !== currentCategory
    );

    updateSelectedCount();
    updateSelectedSpiritsPanel();
    updateMobilePanel();
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

  // Storage functions
  function saveSelectedSpiritsToStorage() {
    localStorage.setItem("selectedSpirits", JSON.stringify(selectedSpirits));
  }

  function loadSelectedSpiritsFromStorage() {
    const savedSpirits = localStorage.getItem("selectedSpirits");
    if (savedSpirits) {
      try {
        selectedSpirits = JSON.parse(savedSpirits);
        updateSelectedCount();

        const images = document.querySelectorAll("#imageContainer img");
        images.forEach((img) => {
          const isSelected = selectedSpirits.some(
            (s) =>
              s.image === img.dataset.image &&
              s.category === img.dataset.category
          );
          img.classList.toggle("selected", isSelected);
        });

        updateSelectedSpiritsPanel();
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

  // Calculation related functions
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

    for (const category in categoryGradeCount) {
      const categoryEffects = gradeSetEffects[category];
      if (!categoryEffects) continue;

      const grades = categoryGradeCount[category];
      for (const grade in grades) {
        const count = grades[grade];
        if (count < 2) continue;

        const gradeEffects = categoryEffects[grade];
        if (!gradeEffects) continue;

        let highestStep = 0;
        for (let step = 2; step <= Math.min(6, count); step++) {
          const stepStr = step.toString();
          if (gradeEffects[stepStr]) {
            highestStep = step;
          }
        }

        if (highestStep > 0) {
          const stepEffects = gradeEffects[highestStep.toString()];

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

    return effects;
  }

  function calculateFactionSetEffects(categoryFactionCount) {
    const effects = {};

    for (const category in categoryFactionCount) {
      if (!factionSetEffects[category]) continue;

      const factions = categoryFactionCount[category];
      for (const faction in factions) {
        const count = factions[faction];

        if (count < 2 || !factionSetEffects[category][faction]) continue;

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
              const category =
                bestResult.spirits[0]?.category || currentCategory;
              currentActiveIndex =
                savedOptimalCombinations[category].length - 1;
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
      } catch (error) {
        console.error("Error finding optimal combination:", error);
        document.getElementById(
          "optimalSpiritsList"
        ).innerHTML = `<div class='warning-message'>${
          error.message || "조합을 찾는 중 오류가 발생했습니다."
        }</div>`;
        document.getElementById("optimalScore").textContent = "오류";
        isProcessing = false;
      }
    }, 100);
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

  // Modal related functions
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
          const iconPath =
            FACTION_ICONS[faction] || "assets/img/bond/default.jpg";
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

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      modal.querySelectorAll(".mobile-ad .kakao_ad_area").forEach((ad) => {
        ad.style.display = "block";
      });
      modal
        .querySelectorAll(
          ".ad-container-left .kakao_ad_area, .ad-container-right .kakao_ad_area"
        )
        .forEach((ad) => {
          ad.style.display = "none";
        });
    } else {
      modal
        .querySelectorAll(".ad-container-left .kakao_ad_area")
        .forEach((ad) => {
          ad.style.display = "block";
        });
      modal
        .querySelectorAll(
          ".mobile-ad .kakao_ad_area, .ad-container-right .kakao_ad_area"
        )
        .forEach((ad) => {
          ad.style.display = "none";
        });
    }

    if (window.adfit) {
      window.adfit();
    } else {
      const existingScript = document.querySelector(
        'script[src*="t1.daumcdn.net/kas/static/ba.min.js"]'
      );

      if (!existingScript) {
        const adScript = document.createElement("script");
        adScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
        adScript.async = true;
        document.body.appendChild(adScript);
      } else {
        const newScript = document.createElement("script");
        newScript.src = "//t1.daumcdn.net/kas/static/ba.min.js";
        newScript.async = true;
        existingScript.parentNode.replaceChild(newScript, existingScript);
      }
    }
  }

  function closeResultModal() {
    document.getElementById("resultModal").style.display = "none";
    document.body.style.overflow = "auto";
  }

  function closeOptimalModal() {
    document.getElementById("optimalModal").style.display = "none";
    document.body.style.overflow = "auto";
    isModalOpen = false;
  }

  function renderEffectsList(
    effects,
    setInfo = "",
    includePercentWithNormal = true
  ) {
    effects = effects || {};

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
        const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
        const displayValue = PERCENT_STATS.includes(normalizedStat)
          ? `${Math.round(value * 100) / 100}%`
          : Math.round(value * 100) / 100;

        const colorClass = STAT_COLOR_MAP[normalizedStat] || "";
        const cssClass = PERCENT_STATS.includes(normalizedStat)
          ? `effect-item effect-item-percent ${colorClass}`
          : `effect-item ${colorClass}`;

        html += `<div class="${cssClass}"><span>${statName}</span><span>${displayValue}</span></div>`;
      }
    } else {
      const normalEffects = {};
      const percentEffects = {};

      for (const [stat, value] of Object.entries(effects)) {
        const normalizedStat = normalizeStatKey(stat);
        if (PERCENT_STATS.includes(normalizedStat)) {
          percentEffects[normalizedStat] = value;
        } else {
          normalEffects[normalizedStat] = value;
        }
      }

      if (Object.keys(normalEffects).length > 0) {
        for (const [stat, value] of Object.entries(normalEffects)) {
          const normalizedStat = normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass = STAT_COLOR_MAP[normalizedStat] || "";
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
          const colorClass = STAT_COLOR_MAP[normalizedStat] || "";
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

    const MAX_COMBINATIONS = 5;
    combinationCounter[category]++;
    const index = (combinationCounter[category] - 1) % MAX_COMBINATIONS;

    if (!result.gradeEffects || Object.keys(result.gradeEffects).length === 0) {
      result.gradeEffects = calculateGradeSetEffects(result.gradeCounts || {});
    }

    const resultWithTimestamp = {
      ...result,
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

    let gradeEffects = result.gradeEffects;
    if (!gradeEffects || Object.keys(gradeEffects).length === 0) {
      gradeEffects = calculateGradeSetEffects(gradeCounts || {});
    }

    let factionEffects = result.factionEffects || {};
    let combinedEffects = result.combinedEffects || {};

    if (!combinedEffects || Object.keys(combinedEffects).length === 0) {
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

      combinedEffects = { ...registrationStats };

      Object.entries(gradeEffects).forEach(([stat, value]) => {
        combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
      });

      Object.entries(factionEffects).forEach(([stat, value]) => {
        combinedEffects[stat] = (combinedEffects[stat] || 0) + value;
      });
    }

    document.getElementById("optimalGradeEffects").innerHTML =
      renderEffectsList(gradeEffects, gradeSetInfo, true);
    document.getElementById("optimalFactionEffects").innerHTML =
      renderEffectsList(factionEffects, factionSetInfo, true);
    document.getElementById("optimalTotalEffects").innerHTML =
      renderEffectsList(combinedEffects, "", true);

    renderSpiritDetailsTable(spirits);
    const adElements = document.querySelectorAll(
      "#optimalModal .kakao_ad_area"
    );
    adElements.forEach((ad) => {
      ad.style.display = "block";
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
        return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
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
      statHeader.textContent = STATS_MAPPING[statKey] || statKey;
      const colorClass = STAT_COLOR_MAP[statKey] || "";
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
          spirit.stats?.find((s) => s.level === spirit.level)
            ?.registrationStat || {};

        let statValue = 0;
        for (const [key, value] of Object.entries(levelStats)) {
          if (normalizeStatKey(key) === statKey) {
            statValue = value;
            break;
          }
        }

        if (PERCENT_STATS.includes(statKey)) {
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

  // Utility functions
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

      if (mainRightPanel) {
        mainRightPanel.style.display = "none";
      }
    } else {
      toggleContainer.style.display = "none";

      if (mainRightPanel) {
        mainRightPanel.style.display = "block";
      }
    }

    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.classList.toggle("active", tab.textContent === lastActiveCategory);
    });

    updateSelectedCount();
    updateSelectedSpiritsPanel();
  }

  function initUIEvents() {
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

  // Initialize the application
  function initialize() {
    const savedCategory = localStorage.getItem("lastActiveCategory");
    if (savedCategory) {
      lastActiveCategory = savedCategory;
      document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
        tab.classList.toggle("active", tab.textContent === lastActiveCategory);
      });
    }

    if (window.innerWidth <= 768) {
      const mainRightPanel = document.querySelector(
        ".main-content .right-panel"
      );
      if (mainRightPanel) {
        mainRightPanel.style.display = "none";
      }
    }

    initFirebase();

    loadAllData().then(() => {
      loadSelectedSpiritsFromStorage();
    });

    loadSavedOptimalCombinations();
    initUIEvents();
    handleResponsiveLayout();
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
  }

  // Public API
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
    closeResultModal,
    closeSearchResults,
    searchSpirits,
  };
})();

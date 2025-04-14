let mobData = { 수호: [], 탑승: [], 변신: [] };
let selectedSpirits = [];
let gradeSetEffects = {};
let factionSetEffects = {};
let isProcessing = false;
let isCalculationCancelled = false;

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
  loadAllData();

  const rightPanel = document.querySelector(".right-panel");
  const selectedSpiritsHeader = document.querySelector(
    ".selected-spirits-header"
  );

  if (window.innerWidth <= 768) {
    const indicator = document.createElement("span");
    indicator.className = "selected-spirits-collapse-indicator";
    indicator.innerHTML = "▲";
    selectedSpiritsHeader.appendChild(indicator);

    rightPanel.classList.add("collapsed");

    selectedSpiritsHeader.addEventListener("click", function () {
      rightPanel.classList.toggle("collapsed");
      indicator.innerHTML = rightPanel.classList.contains("collapsed")
        ? "▲"
        : "▼";
    });

    setTimeout(() => {
      rightPanel.classList.add("collapsed");
      indicator.innerHTML = "▲";
    }, 500);
  }

  const images = document.querySelectorAll("img");
  if ("loading" in HTMLImageElement.prototype) {
    images.forEach((img) => {
      if (img.getAttribute("loading") !== "lazy") {
        img.setAttribute("loading", "lazy");
      }
    });
  }
});

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function loadAllData() {
  for (const [category, filePath] of Object.entries({
    수호: "output/guardian.json",
    탑승: "output/ride.json",
    변신: "output/transform.json",
  })) {
    try {
      const response = await fetch(filePath);
      mobData[category] = await response.json();
    } catch (err) {
      console.error(`Error loading ${category} data:`, err);
    }
  }

  try {
    const gradeResponse = await fetch("output/gradeSetEffects.json");
    gradeSetEffects = await gradeResponse.json();

    const factionResponse = await fetch("output/factionSetEffects.json");
    factionSetEffects = await factionResponse.json();
  } catch (err) {
    console.error("Error loading set effects:", err);
  }

  showCategory("수호", false);

  document
    .getElementById("resultModal")
    .addEventListener("click", function (e) {
      if (e.target === this) closeResultModal();
    });

  document
    .getElementById("optimalModal")
    .addEventListener("click", function (e) {
      if (e.target === this) closeOptimalModal();
    });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeResultModal();
      closeOptimalModal();
    }
  });
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
  document.getElementById("selectedCount").textContent = selectedSpirits.length;
}

function renderSelectedSpirits() {
  const container = document.getElementById("selectedSpirits");

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
          <div class="spirit-grade">${spirit.grade || "전설"}</div>
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

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function updateSpiritLevel(index, value) {
  let level = parseInt(value);
  if (isNaN(level)) level = 0;
  if (level > 25) level = 25;
  if (level < 0) level = 0;
  selectedSpirits[index].level = level;
}

function removeSpirit(index) {
  selectedSpirits.splice(index, 1);
  updateSelectedCount();
  renderSelectedSpirits();
  showCategory(document.querySelector(".sub-tabs .tab.active").textContent);
}

function changeLevel(index, diff) {
  const spirit = selectedSpirits[index];
  let newLevel = spirit.level + diff;

  if (newLevel < 0) newLevel = 0;
  if (newLevel > 25) newLevel = 25;

  spirit.level = newLevel;
  renderSelectedSpirits();
}

function applyBatchLevel() {
  const level = parseInt(document.getElementById("batchLevel").value);
  if (isNaN(level) || level < 0) {
    alert("올바른 레벨을 입력하세요.");
    return;
  }

  if (level > 25) {
    alert("최대 레벨은 25입니다.");
    document.getElementById("batchLevel").value = 25;
    return;
  }

  selectedSpirits.forEach((spirit) => {
    spirit.level = level;
  });

  renderSelectedSpirits();
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
        const numValue = parseFloat(value);
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
          const numValue = parseFloat(value);
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
            const numValue = parseFloat(value);
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

  const optimalModal = document.getElementById("optimalModal");
  optimalModal.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.getElementById(
    "optimalSpiritsList"
  ).innerHTML = `<div class='processing-message'>
      최적 조합을 찾는 중입니다... (0%)
      <div style="margin-top: 10px;">
        <button id="cancelCalculationBtn" class="cancel-calculation-btn">계산 중단</button>
      </div>
    </div>`;
  document.getElementById("optimalScore").textContent = "계산 중...";
  document.getElementById("optimalGradeEffects").innerHTML = "";
  document.getElementById("optimalFactionEffects").innerHTML = "";
  document.getElementById("optimalTotalEffects").innerHTML = "";
  document.getElementById("spiritStatsDetails").innerHTML = "";

  document
    .getElementById("cancelCalculationBtn")
    .addEventListener("click", function () {
      isCalculationCancelled = true;
      document.getElementById("optimalSpiritsList").innerHTML =
        "<div class='warning-message'>계산이 중단되었습니다. 현재까지 찾은 최적 조합을 표시합니다.</div>";
    });

  setTimeout(() => {
    try {
      const validSpirits = selectedSpirits.filter((spirit) => {
        const levelStats = spirit.stats?.find(
          (s) => s.level === spirit.level
        )?.registrationStat;
        return levelStats !== undefined;
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
      let bestCombination = null;
      let bestScore = -1;
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
          if (isCalculationCancelled && bestCombination !== null) {
            break;
          }

          const combination = combinations[i];
          const result = calculateEffectsForSpirits(combination);
          const score = result.score;

          processedCombinations++;

          if (processedCombinations % 40 === 0) {
            updateProgress(processedCombinations / totalCombinations);
          }

          if (score > bestScore) {
            bestScore = score;
            bestCombination = combination;
            bestResult = result;
          }
        }

        if (isCalculationCancelled && bestCombination !== null) {
          break;
        }
      }

      showOptimalResults(bestResult);
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
    const head = array.slice(i, i + 1);
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

function showOptimalResults(result) {
  if (!result) {
    document.getElementById("optimalSpiritsList").innerHTML =
      "<p>최적 조합을 찾을 수 없습니다.</p>";
    document.getElementById("optimalScore").textContent = "0";
    return;
  }

  const {
    spirits,
    gradeEffects,
    factionEffects,
    combinedEffects,
    score,
    gradeCounts,
    factionCounts,
  } = result;

  document.getElementById("optimalScore").textContent = score;

  const spiritsListElement = document.getElementById("optimalSpiritsList");
  spiritsListElement.innerHTML = "";

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

    spiritsListElement.appendChild(spiritInfo);
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

  const table = document.createElement("table");
  table.className = "spirits-stats-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const nameHeader = document.createElement("th");
  nameHeader.textContent = "환수";
  headerRow.appendChild(nameHeader);

  const levelHeader = document.createElement("th");
  levelHeader.textContent = "레벨";
  headerRow.appendChild(levelHeader);

  const factionHeader = document.createElement("th");
  factionHeader.textContent = "세력";
  headerRow.appendChild(factionHeader);

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

  sortedStatKeys.forEach((statKey) => {
    const statHeader = document.createElement("th");
    statHeader.textContent = statsMapping[statKey] || statKey;
    const colorClass = statColorMap[statKey] || "";
    if (colorClass) {
      statHeader.className = colorClass;
    }
    headerRow.appendChild(statHeader);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  spirits.forEach((spirit) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.innerHTML = `<img src="${spirit.image}" alt="${spirit.name}" class="spirit-thumbnail"> ${spirit.name}`;
    row.appendChild(nameCell);

    const levelCell = document.createElement("td");
    levelCell.textContent = spirit.level;
    row.appendChild(levelCell);

    const factionCell = document.createElement("td");
    factionCell.textContent = spirit.influence || spirit.faction || "결의";
    row.appendChild(factionCell);

    const levelStats =
      spirit.stats?.find((s) => s.level === spirit.level)?.registrationStat ||
      {};

    sortedStatKeys.forEach((statKey) => {
      const statCell = document.createElement("td");
      const colorClass = statColorMap[statKey] || "";
      if (colorClass) {
        statCell.className = colorClass;
      }

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

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

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

function clearAllSelections() {
  selectedSpirits = [];
  updateSelectedCount();
  renderSelectedSpirits();
  showCategory(
    document.querySelector(".sub-tabs .tab.active").textContent,
    false
  );
}

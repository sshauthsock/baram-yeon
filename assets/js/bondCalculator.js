let mobData = { 수호: [], 탑승: [], 변신: [] };
let selectedSpirits = [];
let gradeSetEffects = {};
let factionSetEffects = {};
let isProcessing = false;

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

document.addEventListener("DOMContentLoaded", function () {
  loadAllData();
});

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

    console.log("Loaded factionSetEffects:", factionSetEffects);
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
    if (selectedSpirits.length >= 12) {
      alert("최대 12개의 환수만 선택할 수 있습니다.");
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
  container.innerHTML = "";

  if (selectedSpirits.length === 0) {
    container.innerHTML =
      "<p>선택된 환수가 없습니다. 위에서 환수를 선택해주세요.</p>";
    return;
  }

  selectedSpirits.forEach((spirit, index) => {
    const card = document.createElement("div");
    card.className = "selected-spirit-card";

    const header = document.createElement("div");
    header.className = "selected-spirit-header";

    const img = document.createElement("img");
    img.src = spirit.image;
    img.alt = spirit.name;

    const info = document.createElement("div");
    info.className = "spirit-info";

    const name = document.createElement("div");
    name.className = "spirit-name";
    name.textContent = spirit.name;

    const grade = document.createElement("div");
    grade.className = "spirit-grade";
    grade.textContent = spirit.grade || "전설";

    info.appendChild(name);
    info.appendChild(grade);

    header.appendChild(img);
    header.appendChild(info);

    const levelControl = document.createElement("div");
    levelControl.className = "spirit-level-control";

    const minusBtn = document.createElement("button");
    minusBtn.innerHTML = "-";
    minusBtn.onclick = () => changeLevel(index, -1);

    const levelInput = document.createElement("input");
    levelInput.type = "number";
    levelInput.min = "0";
    levelInput.max = "25";
    levelInput.value = spirit.level;
    levelInput.onchange = (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value)) value = 0;
      if (value > 25) value = 25;
      if (value < 0) value = 0;
      selectedSpirits[index].level = value;
    };

    const plusBtn = document.createElement("button");
    plusBtn.innerHTML = "+";
    plusBtn.onclick = () => changeLevel(index, 1);

    levelControl.appendChild(minusBtn);
    levelControl.appendChild(levelInput);
    levelControl.appendChild(plusBtn);

    card.appendChild(header);
    card.appendChild(levelControl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-spirit";
    removeBtn.textContent = "제거";
    removeBtn.onclick = () => {
      selectedSpirits.splice(index, 1);
      updateSelectedCount();
      renderSelectedSpirits();
      showCategory(document.querySelector(".sub-tabs .tab.active").textContent);
    };

    card.appendChild(removeBtn);
    container.appendChild(card);
  });
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

function calculateBondEffects() {
  if (selectedSpirits.length === 0) {
    alert("결속 효과를 계산하려면 환수를 선택하세요.");
    return;
  }

  const result = calculateEffectsForSpirits(selectedSpirits);

  showResultsInModal(result);
}

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

  console.log("Category faction counts:", categoryFactionCount);

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

  console.log("Starting faction effects calculation");

  for (const [category, factions] of Object.entries(categoryFactionCount)) {
    console.log(`Processing category: ${category} with factions:`, factions);

    if (!factionSetEffects[category]) {
      console.log(`No faction set effects defined for category: ${category}`);
      continue;
    }

    for (const [faction, count] of Object.entries(factions)) {
      console.log(`Checking faction: ${faction} with count: ${count}`);

      if (count < 2 || !factionSetEffects[category][faction]) {
        console.log(
          `Skipping faction ${faction}: count < 2 or no effects defined`
        );
        continue;
      }

      console.log(
        `Found faction effects for ${faction}:`,
        factionSetEffects[category][faction]
      );

      let maxCount = 0;
      let maxEffect = null;

      for (const effect of factionSetEffects[category][faction]) {
        if (typeof effect === "object" && effect !== null) {
          const requiredCount = parseInt(effect["개수"] || "0");
          console.log(
            `Effect requires ${requiredCount} spirits, we have ${count}`
          );

          if (
            !isNaN(requiredCount) &&
            count >= requiredCount &&
            requiredCount > maxCount
          ) {
            maxCount = requiredCount;
            maxEffect = effect;
            console.log(`Found new max effect with count ${maxCount}`);
          }
        }
      }

      if (maxEffect) {
        console.log(`Applying max effect for ${faction}:`, maxEffect);
        for (const [stat, value] of Object.entries(maxEffect)) {
          if (stat !== "개수") {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              const normalizedStat = normalizeStatKey(stat);
              if (effects[normalizedStat]) {
                effects[normalizedStat] += numValue;
                console.log(
                  `Added ${numValue} to ${normalizedStat}, total now: ${effects[normalizedStat]}`
                );
              } else {
                effects[normalizedStat] = numValue;
                console.log(`Set ${normalizedStat} to ${numValue}`);
              }
            }
          }
        }
      } else {
        console.log(`No applicable effect found for ${faction}`);
      }
    }
  }

  console.log("Final faction effects:", effects);
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

      const cssClass = percentStats.includes(normalizedStat)
        ? "effect-item effect-item-percent"
        : "effect-item";

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
        html += `<div class="effect-item"><span>${statName}</span><span>${
          Math.round(value * 100) / 100
        }</span></div>`;
      }
    }

    if (Object.keys(percentEffects).length > 0) {
      html += `<div class="section-header">퍼센트 효과</div>`;
      for (const [stat, value] of Object.entries(percentEffects)) {
        const normalizedStat = normalizeStatKey(stat);
        const statName = statsMapping[normalizedStat] || normalizedStat;
        html += `<div class="effect-item effect-item-percent"><span>${statName}</span><span>${
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

  const optimalModal = document.getElementById("optimalModal");
  optimalModal.style.display = "flex";
  document.body.style.overflow = "hidden";

  document.getElementById("optimalSpiritsList").innerHTML =
    "<div class='processing-message'>최적 조합을 찾는 중입니다...</div>";
  document.getElementById("optimalScore").textContent = "계산 중...";
  document.getElementById("optimalGradeEffects").innerHTML = "";
  document.getElementById("optimalFactionEffects").innerHTML = "";
  document.getElementById("optimalTotalEffects").innerHTML = "";
  document.getElementById("spiritStatsDetails").innerHTML = "";

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
      let bestCombination = null;
      let bestScore = -1;
      let bestResult = null;

      for (let size = 1; size <= maxCombinationSize; size++) {
        const combinations = generateCombinations(validSpirits, size);

        for (const combination of combinations) {
          const result = calculateEffectsForSpirits(combination);
          const score = result.score;

          if (score > bestScore) {
            bestScore = score;
            bestCombination = combination;
            bestResult = result;
          }
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
  manaRecoveryImprovement: "마나회복향상",
  criticalChance: "치명확률",
  bossMonsterAdditionalDamage: "보스몬스터추가피해",
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

// 0414 testing

// let mobData = { 수호: [], 탑승: [], 변신: [] };
// let selectedSpirits = [];
// let gradeSetEffects = {};
// let factionSetEffects = {};
// let isProcessing = false;

// const percentStats = [
//   "healthIncreasePercent",
//   "magicIncreasePercent",
//   "criticalPowerPercent",
//   "pvpDamagePercent",
//   "pvpDefensePercent",
//   "destructionPowerPercent",
// ];

// const factionIcons = {
//   결의: "assets/img/bond/결의.jpg",
//   고요: "assets/img/bond/고요.jpg",
//   냉정: "assets/img/bond/냉정.jpg",
//   의지: "assets/img/bond/의지.jpg",
//   침착: "assets/img/bond/침착.jpg",
//   활력: "assets/img/bond/활력.jpg",
// };

// document.addEventListener("DOMContentLoaded", function () {
//   loadAllData();
// });

// async function loadAllData() {
//   for (const [category, filePath] of Object.entries({
//     수호: "output/guardian.json",
//     탑승: "output/ride.json",
//     변신: "output/transform.json",
//   })) {
//     try {
//       const response = await fetch(filePath);
//       mobData[category] = await response.json();
//     } catch (err) {
//       console.error(`Error loading ${category} data:`, err);
//     }
//   }

//   try {
//     const gradeResponse = await fetch("output/gradeSetEffects.json");
//     gradeSetEffects = await gradeResponse.json();

//     const factionResponse = await fetch("output/factionSetEffects.json");
//     factionSetEffects = await factionResponse.json();

//     console.log("Loaded factionSetEffects:", factionSetEffects);
//   } catch (err) {
//     console.error("Error loading set effects:", err);
//   }

//   showCategory("수호", false);

//   document
//     .getElementById("resultModal")
//     .addEventListener("click", function (e) {
//       if (e.target === this) closeResultModal();
//     });

//   document.addEventListener("keydown", function (e) {
//     if (e.key === "Escape") {
//       closeResultModal();
//     }
//   });
// }

// function normalizeStatKey(key) {
//   return key.replace(/\d+$/, "");
// }

// function showCategory(category, resetSelection = false) {
//   const container = document.getElementById("imageContainer");
//   container.innerHTML = "";

//   document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
//     tab.classList.remove("active");
//     if (tab.innerText === category) tab.classList.add("active");
//   });

//   if (resetSelection) {
//     selectedSpirits = [];
//     updateSelectedCount();
//     renderSelectedSpirits();
//   }

//   if (!mobData[category] || mobData[category].length === 0) {
//     container.innerHTML = `<p>이미지 데이터가 없습니다.</p>`;
//     return;
//   }

//   mobData[category].forEach((item) => {
//     const imgContainer = document.createElement("div");
//     imgContainer.className = "img-wrapper";

//     const img = document.createElement("img");
//     img.src = item.image;
//     img.alt = item.name;
//     img.title = item.name;
//     img.loading = "lazy";
//     img.dataset.category = category;
//     img.dataset.name = item.name;
//     img.dataset.image = item.image;

//     const isSelected = selectedSpirits.some((s) => s.image === item.image);
//     if (isSelected) {
//       img.classList.add("selected");
//     }

//     img.onclick = () => toggleSpiritSelection(item, category);

//     const nameLabel = document.createElement("small");
//     nameLabel.textContent = item.name;
//     nameLabel.className = "img-name";

//     imgContainer.appendChild(img);
//     imgContainer.appendChild(nameLabel);
//     container.appendChild(imgContainer);
//   });
// }

// function toggleSpiritSelection(spirit, category) {
//   const existingIndex = selectedSpirits.findIndex(
//     (s) => s.image === spirit.image
//   );

//   if (existingIndex !== -1) {
//     selectedSpirits.splice(existingIndex, 1);
//   } else {
//     if (selectedSpirits.length >= 12) {
//       alert("최대 12개의 환수만 선택할 수 있습니다.");
//       return;
//     }

//     const faction = spirit.influence || spirit.faction || "결의";

//     const spiritData = {
//       ...spirit,
//       category,
//       level: 0,
//       grade: spirit.grade || "전설",
//       faction: faction,
//     };
//     selectedSpirits.push(spiritData);
//   }

//   updateSelectedCount();
//   updateSpiritSelectionUI(spirit.image);
//   renderSelectedSpirits();
// }

// function updateSpiritSelectionUI(spiritImage) {
//   const images = document.querySelectorAll("#imageContainer img");
//   images.forEach((img) => {
//     if (img.dataset.image === spiritImage) {
//       img.classList.toggle("selected");
//     }
//   });
// }

// function updateSelectedCount() {
//   document.getElementById("selectedCount").textContent = selectedSpirits.length;
// }

// function renderSelectedSpirits() {
//   const container = document.getElementById("selectedSpirits");
//   if (!container) return;

//   container.innerHTML = "";

//   if (selectedSpirits.length === 0) {
//     container.innerHTML =
//       "<p>선택된 환수가 없습니다. 위에서 환수를 선택해주세요.</p>";
//     return;
//   }

//   selectedSpirits.forEach((spirit, index) => {
//     const card = document.createElement("div");
//     card.className = "selected-spirit-card";

//     const header = document.createElement("div");
//     header.className = "selected-spirit-header";

//     const img = document.createElement("img");
//     img.src = spirit.image;
//     img.alt = spirit.name;

//     const info = document.createElement("div");
//     info.className = "spirit-info";

//     const name = document.createElement("div");
//     name.className = "spirit-name";
//     name.textContent = spirit.name;

//     const grade = document.createElement("div");
//     grade.className = "spirit-grade";
//     grade.textContent = spirit.grade || "전설";

//     info.appendChild(name);
//     info.appendChild(grade);

//     header.appendChild(img);
//     header.appendChild(info);

//     const levelControl = document.createElement("div");
//     levelControl.className = "spirit-level-control";

//     const minusBtn = document.createElement("button");
//     minusBtn.innerHTML = "-";
//     minusBtn.onclick = () => changeLevel(index, -1);

//     const levelInput = document.createElement("input");
//     levelInput.type = "number";
//     levelInput.min = "0";
//     levelInput.max = "25";
//     levelInput.value = spirit.level;
//     levelInput.onchange = (e) => {
//       let value = parseInt(e.target.value);
//       if (isNaN(value)) value = 0;
//       if (value > 25) value = 25;
//       if (value < 0) value = 0;
//       selectedSpirits[index].level = value;
//     };

//     const plusBtn = document.createElement("button");
//     plusBtn.innerHTML = "+";
//     plusBtn.onclick = () => changeLevel(index, 1);

//     levelControl.appendChild(minusBtn);
//     levelControl.appendChild(levelInput);
//     levelControl.appendChild(plusBtn);

//     card.appendChild(header);
//     card.appendChild(levelControl);

//     const removeBtn = document.createElement("button");
//     removeBtn.className = "remove-spirit";
//     removeBtn.textContent = "제거";
//     removeBtn.onclick = () => {
//       selectedSpirits.splice(index, 1);
//       updateSelectedCount();
//       renderSelectedSpirits();
//       showCategory(document.querySelector(".sub-tabs .tab.active").textContent);
//     };

//     card.appendChild(removeBtn);
//     container.appendChild(card);
//   });
// }

// function changeLevel(index, diff) {
//   const spirit = selectedSpirits[index];
//   let newLevel = spirit.level + diff;

//   if (newLevel < 0) newLevel = 0;
//   if (newLevel > 25) newLevel = 25;

//   spirit.level = newLevel;
//   renderSelectedSpirits();
// }

// function applyBatchLevel() {
//   const level = parseInt(document.getElementById("batchLevel").value);
//   if (isNaN(level) || level < 0) {
//     alert("올바른 레벨을 입력하세요.");
//     return;
//   }

//   if (level > 25) {
//     alert("최대 레벨은 25입니다.");
//     document.getElementById("batchLevel").value = 25;
//     return;
//   }

//   selectedSpirits.forEach((spirit) => {
//     spirit.level = level;
//   });

//   renderSelectedSpirits();
// }

// function calculateBondEffects() {
//   if (selectedSpirits.length === 0) {
//     alert("결속 효과를 계산하려면 환수를 선택하세요.");
//     return;
//   }

//   openModal();
//   showInitialView();
//   renderSelectedSpirits();
// }

// function openModal() {
//   const modal = document.getElementById("resultModal");
//   modal.style.display = "flex";
//   document.body.style.overflow = "hidden";
// }

// function closeResultModal() {
//   document.getElementById("resultModal").style.display = "none";
//   document.body.style.overflow = "auto";
// }

// function showInitialView() {
//   hideAllViews();
//   document.getElementById("initialView").style.display = "block";
// }

// function showResultView() {
//   if (selectedSpirits.length === 0) {
//     alert("결속 효과를 계산하려면 환수를 선택하세요.");
//     return;
//   }

//   hideAllViews();
//   document.getElementById("resultView").style.display = "block";

//   const result = calculateEffectsForSpirits(selectedSpirits);
//   updateResultView(result);
// }

// function showOptimalView() {
//   hideAllViews();
//   document.getElementById("optimalView").style.display = "block";
// }

// function hideAllViews() {
//   document.querySelectorAll(".modal-view").forEach((view) => {
//     view.style.display = "none";
//   });
// }

// function updateResultView(result) {
//   const {
//     spirits,
//     gradeEffects,
//     factionEffects,
//     combinedEffects,
//     missingDataSpirits,
//     score,
//     gradeCounts,
//     factionCounts,
//   } = result;

//   const spiritsInfoElement = document.getElementById("spiritsInfoList");
//   spiritsInfoElement.innerHTML = "";

//   spirits.forEach((spirit) => {
//     const spiritInfo = document.createElement("div");
//     spiritInfo.className = "spirit-info-item";

//     const img = document.createElement("img");
//     img.src = spirit.image;
//     img.alt = spirit.name;

//     const details = document.createElement("div");
//     details.className = "spirit-info-details";

//     const name = document.createElement("div");
//     name.className = "spirit-info-name";
//     name.textContent = spirit.name;

//     const faction = spirit.influence || spirit.faction || "결의";

//     const level = document.createElement("div");
//     level.className = "spirit-info-level";
//     level.textContent = `레벨: ${spirit.level} / ${spirit.category} / ${spirit.grade} / ${faction}`;

//     details.appendChild(name);
//     details.appendChild(level);

//     spiritInfo.appendChild(img);
//     spiritInfo.appendChild(details);

//     spiritsInfoElement.appendChild(spiritInfo);
//   });

//   // 등급별 세트 정보 표시
//   let gradeSetInfo = "";
//   for (const [category, grades] of Object.entries(gradeCounts)) {
//     for (const [grade, count] of Object.entries(grades)) {
//       if (count >= 2) {
//         const gradeClass =
//           grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
//         gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
//       }
//     }
//   }

//   // 세력별 세트 정보 표시
//   let factionSetInfo = "";
//   for (const [category, factions] of Object.entries(factionCounts)) {
//     const factionTags = Object.entries(factions)
//       .filter(([_, count]) => count >= 2)
//       .map(([faction, count]) => {
//         const iconPath =
//           factionIcons[faction] || "assets/img/bond/default.jpg";
//         return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
//       })
//       .join(" ");

//     if (factionTags) {
//       factionSetInfo += `<div>${category}: ${factionTags}</div>`;
//     }
//   }

//   document.getElementById("gradeEffects").innerHTML = renderEffectsList(
//     gradeEffects,
//     gradeSetInfo,
//     true
//   );
//   document.getElementById("factionEffects").innerHTML = renderEffectsList(
//     factionEffects,
//     factionSetInfo,
//     true
//   );
//   document.getElementById("totalEffects").innerHTML = renderEffectsList(
//     combinedEffects,
//     "",
//     true
//   );
//   document.getElementById("weightedScore").textContent = score;

//   const warningElement = document.getElementById("missingDataWarning");
//   if (missingDataSpirits.length > 0) {
//     warningElement.innerHTML = `<strong>주의:</strong> 다음 환수들의 데이터가 없어 계산에서 제외되었습니다: ${missingDataSpirits.join(
//       ", "
//     )}`;
//     warningElement.style.display = "block";
//   } else {
//     warningElement.style.display = "none";
//   }
// }

// function calculateEffectsForSpirits(spirits) {
//   const registrationStats = {};
//   const missingDataSpirits = [];

//   // 환수 정보 수집
//   const categoryGradeCount = {};
//   const categoryFactionCount = {};

//   spirits.forEach((spirit) => {
//     // 등록 효과 계산
//     const levelStats = spirit.stats?.find(
//       (s) => s.level === spirit.level
//     )?.registrationStat;
//     if (levelStats) {
//       for (const [stat, value] of Object.entries(levelStats)) {
//         const numValue = parseFloat(value);
//         if (!isNaN(numValue)) {
//           const normalizedStat = normalizeStatKey(stat);
//           registrationStats[normalizedStat] =
//             (registrationStats[normalizedStat] || 0) + numValue;
//         }
//       }
//     } else {
//       missingDataSpirits.push(spirit.name);
//     }

//     // 등급과 세력 정보 저장
//     const category = spirit.category;
//     const grade = spirit.grade || "전설";

//     // Use influence field if available, otherwise fallback to faction
//     const faction = spirit.influence || spirit.faction || "결의";

//     // 카테고리별 등급 카운트
//     if (!categoryGradeCount[category]) {
//       categoryGradeCount[category] = {};
//     }
//     if (!categoryGradeCount[category][grade]) {
//       categoryGradeCount[category][grade] = 0;
//     }
//     categoryGradeCount[category][grade]++;

//     // 카테고리별 세력 카운트
//     if (!categoryFactionCount[category]) {
//       categoryFactionCount[category] = {};
//     }
//     if (!categoryFactionCount[category][faction]) {
//       categoryFactionCount[category][faction] = 0;
//     }
//     categoryFactionCount[category][faction]++;
//   });

//   console.log("Category faction counts:", categoryFactionCount);

//   // 등급 결속 효과 계산
//   const gradeEffects = calculateGradeSetEffects(categoryGradeCount);

//   // 세력 결속 효과 계산
//   const factionEffects = calculateFactionSetEffects(categoryFactionCount);

//   // 모든 효과를 합친 결과
//   const combinedEffects = {};

//   // 등록 효과 복사
//   for (const [stat, value] of Object.entries(registrationStats)) {
//     combinedEffects[stat] = value;
//   }

//   // 등급 결속 효과 추가
//   for (const [stat, value] of Object.entries(gradeEffects)) {
//     if (combinedEffects[stat]) {
//       combinedEffects[stat] += value;
//     } else {
//       combinedEffects[stat] = value;
//     }
//   }

//   // 세력 결속 효과 추가
//   for (const [stat, value] of Object.entries(factionEffects)) {
//     if (combinedEffects[stat]) {
//       combinedEffects[stat] += value;
//     } else {
//       combinedEffects[stat] = value;
//     }
//   }

//   // 환산합산 점수 계산
//   const score = calculateScore(combinedEffects);

//   return {
//     spirits,
//     gradeEffects,
//     factionEffects,
//     combinedEffects,
//     missingDataSpirits,
//     score,
//     gradeCounts: categoryGradeCount,
//     factionCounts: categoryFactionCount,
//   };
// }

// function calculateGradeSetEffects(categoryGradeCount) {
//   const effects = {};

//   // 카테고리별로 등급 세트 효과 계산
//   for (const [category, grades] of Object.entries(categoryGradeCount)) {
//     for (const [grade, count] of Object.entries(grades)) {
//       if (count < 2 || !gradeSetEffects[category]?.[grade]) continue;

//       // 해당 카테고리와 등급에 대한 가장 높은 단계 효과 적용
//       let highestStepNumber = 0;
//       let highestStepEffects = null;

//       for (let step = 2; step <= Math.min(6, count); step++) {
//         if (gradeSetEffects[category][grade][step.toString()]) {
//           highestStepNumber = step;
//           highestStepEffects =
//             gradeSetEffects[category][grade][step.toString()];
//         }
//       }

//       if (highestStepEffects) {
//         for (const [stat, value] of Object.entries(highestStepEffects)) {
//           const numValue = parseFloat(value);
//           if (!isNaN(numValue)) {
//             const normalizedStat = normalizeStatKey(stat);
//             if (effects[normalizedStat]) {
//               effects[normalizedStat] += numValue;
//             } else {
//               effects[normalizedStat] = numValue;
//             }
//           }
//         }
//       }
//     }
//   }

//   return effects;
// }

// function calculateFactionSetEffects(categoryFactionCount) {
//   const effects = {};

//   console.log("Starting faction effects calculation");

//   // 카테고리별로 세력 세트 효과 계산
//   for (const [category, factions] of Object.entries(categoryFactionCount)) {
//     console.log(`Processing category: ${category} with factions:`, factions);

//     // 해당 카테고리에 대한 세력 효과 체크
//     if (!factionSetEffects[category]) {
//       console.log(`No faction set effects defined for category: ${category}`);
//       continue;
//     }

//     for (const [faction, count] of Object.entries(factions)) {
//       console.log(`Checking faction: ${faction} with count: ${count}`);

//       // 해당 세력에 대한 효과 존재 여부 체크
//       if (count < 2 || !factionSetEffects[category][faction]) {
//         console.log(
//           `Skipping faction ${faction}: count < 2 or no effects defined`
//         );
//         continue;
//       }

//       console.log(
//         `Found faction effects for ${faction}:`,
//         factionSetEffects[category][faction]
//       );

//       // 해당 세력의 최대 적용 가능 효과 찾기
//       let maxCount = 0;
//       let maxEffect = null;

//       // factionSetEffects의 구조 확인 및 적절히 처리
//       for (const effect of factionSetEffects[category][faction]) {
//         if (typeof effect === "object" && effect !== null) {
//           const requiredCount = parseInt(effect["개수"] || "0");
//           console.log(
//             `Effect requires ${requiredCount} spirits, we have ${count}`
//           );

//           if (
//             !isNaN(requiredCount) &&
//             count >= requiredCount &&
//             requiredCount > maxCount
//           ) {
//             maxCount = requiredCount;
//             maxEffect = effect;
//             console.log(`Found new max effect with count ${maxCount}`);
//           }
//         }
//       }

//       if (maxEffect) {
//         console.log(`Applying max effect for ${faction}:`, maxEffect);
//         for (const [stat, value] of Object.entries(maxEffect)) {
//           if (stat !== "개수") {
//             const numValue = parseFloat(value);
//             if (!isNaN(numValue)) {
//               const normalizedStat = normalizeStatKey(stat);
//               if (effects[normalizedStat]) {
//                 effects[normalizedStat] += numValue;
//                 console.log(
//                   `Added ${numValue} to ${normalizedStat}, total now: ${effects[normalizedStat]}`
//                 );
//               } else {
//                 effects[normalizedStat] = numValue;
//                 console.log(`Set ${normalizedStat} to ${numValue}`);
//               }
//             }
//           }
//         }
//       } else {
//         console.log(`No applicable effect found for ${faction}`);
//       }
//     }
//   }

//   console.log("Final faction effects:", effects);
//   return effects;
// }

// function findOptimalCombination() {
//   if (selectedSpirits.length === 0) {
//     alert("최적 조합을 찾으려면 환수를 선택하세요.");
//     return;
//   }

//   if (isProcessing) {
//     alert("이미 조합을 계산 중입니다. 잠시만 기다려주세요.");
//     return;
//   }

//   isProcessing = true;
//   showOptimalView();

//   document.getElementById("optimalSpiritsList").innerHTML =
//     "<div class='processing-message'>최적 조합을 찾는 중입니다...</div>";
//   document.getElementById("optimalScore").textContent = "계산 중...";
//   document.getElementById("optimalGradeEffects").innerHTML = "";
//   document.getElementById("optimalFactionEffects").innerHTML = "";
//   document.getElementById("optimalTotalEffects").innerHTML = "";
//   document.getElementById("spiritStatsDetails").innerHTML = "";

//   setTimeout(() => {
//     try {
//       const validSpirits = selectedSpirits.filter((spirit) => {
//         const levelStats = spirit.stats?.find(
//           (s) => s.level === spirit.level
//         )?.registrationStat;
//         return levelStats !== undefined;
//       });

//       if (validSpirits.length === 0) {
//         throw new Error("유효한 환수 데이터가 없습니다.");
//       }

//       const maxCombinationSize = Math.min(6, validSpirits.length);
//       let bestCombination = null;
//       let bestScore = -1;
//       let bestResult = null;

//       for (let size = 1; size <= maxCombinationSize; size++) {
//         const combinations = generateCombinations(validSpirits, size);

//         for (const combination of combinations) {
//           const result = calculateEffectsForSpirits(combination);
//           const score = result.score;

//           if (score > bestScore) {
//             bestScore = score;
//             bestCombination = combination;
//             bestResult = result;
//           }
//         }
//       }

//       updateOptimalView(bestResult);
//     } catch (error) {
//       console.error("Error finding optimal combination:", error);
//       document.getElementById(
//         "optimalSpiritsList"
//       ).innerHTML = `<div class='warning-message'>${
//         error.message || "조합을 찾는 중 오류가 발생했습니다."
//       }</div>`;
//       document.getElementById("optimalScore").textContent = "오류";
//     } finally {
//       isProcessing = false;
//     }
//   }, 100);
// }

// function renderEffectsList(
//   effects,
//   setInfo = "",
//   includePercentWithNormal = true
// ) {
//   if (Object.keys(effects).length === 0) {
//     if (setInfo) {
//       return `<div class="set-info">${setInfo}</div><p>적용된 효과가 없습니다.</p>`;
//     }
//     return "<p>적용된 효과가 없습니다.</p>";
//   }

//   let html = "";
//   if (setInfo) {
//     html += `<div class="set-info">${setInfo}</div>`;
//   }

//   if (includePercentWithNormal) {
//     // 모든 효과를 함께 렌더링
//     for (const [stat, value] of Object.entries(effects)) {
//       const normalizedStat = normalizeStatKey(stat);
//       const statName = statsMapping[normalizedStat] || normalizedStat;
//       const displayValue = percentStats.includes(normalizedStat)
//         ? `${Math.round(value * 100) / 100}%`
//         : Math.round(value * 100) / 100;

//       const cssClass = percentStats.includes(normalizedStat)
//         ? "effect-item effect-item-percent"
//         : "effect-item";

//       html += `<div class="${cssClass}"><span>${statName}</span><span>${displayValue}</span></div>`;
//     }
//   } else {
//     // 일반 효과와 퍼센트 효과 분리
//     const normalEffects = {};
//     const percentEffects = {};

//     for (const [stat, value] of Object.entries(effects)) {
//       const normalizedStat = normalizeStatKey(stat);
//       if (percentStats.includes(normalizedStat)) {
//         percentEffects[normalizedStat] = value;
//       } else {
//         normalEffects[normalizedStat] = value;
//       }
//     }

//     // 일반 효과 렌더링
//     if (Object.keys(normalEffects).length > 0) {
//       for (const [stat, value] of Object.entries(normalEffects)) {
//         const normalizedStat = normalizeStatKey(stat);
//         const statName = statsMapping[normalizedStat] || normalizedStat;
//         html += `<div class="effect-item"><span>${statName}</span><span>${
//           Math.round(value * 100) / 100
//         }</span></div>`;
//       }
//     }

//     // 퍼센트 효과 렌더링
//     if (Object.keys(percentEffects).length > 0) {
//       html += `<div class="section-header">퍼센트 효과</div>`;
//       for (const [stat, value] of Object.entries(percentEffects)) {
//         const normalizedStat = normalizeStatKey(stat);
//         const statName = statsMapping[normalizedStat] || normalizedStat;
//         html += `<div class="effect-item effect-item-percent"><span>${statName}</span><span>${
//           Math.round(value * 100) / 100
//         }%</span></div>`;
//       }
//     }
//   }

//   return html;
// }

// function generateCombinations(array, size) {
//   if (size > array.length) return [];
//   if (size === 0) return [[]];

//   const result = [];

//   for (let i = 0; i <= array.length - size; i++) {
//     const head = array.slice(i, i + 1);
//     const tailCombinations = generateCombinations(array.slice(i + 1), size - 1);

//     for (const tailCombo of tailCombinations) {
//       result.push([...head, ...tailCombo]);
//     }
//   }

//   return result;
// }

// function calculateScore(effects) {
//   const damageResistancePenetration = parseFloat(
//     effects.damageResistancePenetration || 0
//   );
//   const damageResistance = parseFloat(effects.damageResistance || 0);
//   const pvpDamagePercent = parseFloat(effects.pvpDamagePercent || 0) * 10;
//   const pvpDefensePercent = parseFloat(effects.pvpDefensePercent || 0) * 10;

//   return (
//     damageResistancePenetration +
//     damageResistance +
//     pvpDamagePercent +
//     pvpDefensePercent
//   );
// }

// function updateOptimalView(result) {
//   if (!result) {
//     document.getElementById("optimalSpiritsList").innerHTML =
//       "<p>최적 조합을 찾을 수 없습니다.</p>";
//     document.getElementById("optimalScore").textContent = "0";
//     return;
//   }

//   const {
//     spirits,
//     gradeEffects,
//     factionEffects,
//     combinedEffects,
//     score,
//     gradeCounts,
//     factionCounts,
//   } = result;

//   document.getElementById("optimalScore").textContent = score;

//   const spiritsListElement = document.getElementById("optimalSpiritsList");
//   spiritsListElement.innerHTML = "";

//   spirits.forEach((spirit) => {
//     const spiritInfo = document.createElement("div");
//     spiritInfo.className = "spirit-info-item";

//     const img = document.createElement("img");
//     img.src = spirit.image;
//     img.alt = spirit.name;

//     const details = document.createElement("div");
//     details.className = "spirit-info-details";

//     const name = document.createElement("div");
//     name.className = "spirit-info-name";
//     name.textContent = spirit.name;

//     // Use influence field if available, otherwise fallback to faction
//     const faction = spirit.influence || spirit.faction || "결의";

//     const level = document.createElement("div");
//     level.className = "spirit-info-level";
//     level.textContent = `레벨: ${spirit.level}, ${spirit.category}, ${spirit.grade}, ${faction}`;

//     details.appendChild(name);
//     details.appendChild(level);

//     spiritInfo.appendChild(img);
//     spiritInfo.appendChild(details);

//     spiritsListElement.appendChild(spiritInfo);
//   });

//   // 등급별 세트 정보 표시 - 태그 스타일로 변경
//   let gradeSetInfo = "";
//   for (const [category, grades] of Object.entries(gradeCounts)) {
//     for (const [grade, count] of Object.entries(grades)) {
//       if (count >= 2) {
//         const gradeClass =
//           grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
//         gradeSetInfo += `<span class="grade-tag ${gradeClass}">${category} ${grade} X ${count}</span> `;
//       }
//     }
//   }

//   // 세력별 세트 정보 표시 - 아이콘 이미지로 변경
//   let factionSetInfo = "";
//   for (const [category, factions] of Object.entries(factionCounts)) {
//     const factionTags = Object.entries(factions)
//       .filter(([_, count]) => count >= 2)
//       .map(([faction, count]) => {
//         const iconPath =
//           factionIcons[faction] || "assets/img/bond/default.jpg";
//         return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
//       })
//       .join(" ");

//     if (factionTags) {
//       factionSetInfo += `<div>${category}: ${factionTags}</div>`;
//     }
//   }

//   document.getElementById("optimalGradeEffects").innerHTML = renderEffectsList(
//     gradeEffects,
//     gradeSetInfo,
//     true
//   );
//   document.getElementById("optimalFactionEffects").innerHTML =
//     renderEffectsList(factionEffects, factionSetInfo, true);
//   document.getElementById("optimalTotalEffects").innerHTML = renderEffectsList(
//     combinedEffects,
//     "",
//     true
//   );

//   // 각 환수의 상세 스탯 정보를 그리드로 렌더링
//   renderSpiritDetailsTable(spirits);
// }

// function renderSpiritDetailsTable(spirits) {
//   const container = document.getElementById("spiritStatsDetails");
//   container.innerHTML = "";

//   if (spirits.length === 0) {
//     container.innerHTML = "<p>표시할 환수 정보가 없습니다.</p>";
//     return;
//   }

//   // 모든 환수의 스탯 키를 수집
//   const allStatKeys = new Set();

//   spirits.forEach((spirit) => {
//     const levelStats = spirit.stats?.find(
//       (s) => s.level === spirit.level
//     )?.registrationStat;
//     if (levelStats) {
//       Object.keys(levelStats).forEach((key) =>
//         allStatKeys.add(normalizeStatKey(key))
//       );
//     }
//   });

//   // 테이블 생성
//   const table = document.createElement("table");
//   table.className = "spirits-stats-table";

//   // 테이블 헤더 생성
//   const thead = document.createElement("thead");
//   const headerRow = document.createElement("tr");

//   const nameHeader = document.createElement("th");
//   nameHeader.textContent = "환수";
//   headerRow.appendChild(nameHeader);

//   const levelHeader = document.createElement("th");
//   levelHeader.textContent = "레벨";
//   headerRow.appendChild(levelHeader);

//   const factionHeader = document.createElement("th");
//   factionHeader.textContent = "세력";
//   headerRow.appendChild(factionHeader);

//   // 모든 스탯 키에 대한 헤더 추가
//   const sortedStatKeys = Array.from(allStatKeys).sort((a, b) => {
//     // 중요 스탯을 우선 정렬
//     const priorityStats = [
//       "damageResistancePenetration",
//       "damageResistance",
//       "pvpDamagePercent",
//       "pvpDefensePercent",
//     ];
//     const aPriority = priorityStats.indexOf(a);
//     const bPriority = priorityStats.indexOf(b);

//     if (aPriority !== -1 && bPriority !== -1) {
//       return aPriority - bPriority;
//     } else if (aPriority !== -1) {
//       return -1;
//     } else if (bPriority !== -1) {
//       return 1;
//     } else {
//       return (statsMapping[a] || a).localeCompare(statsMapping[b] || b);
//     }
//   });

//   sortedStatKeys.forEach((statKey) => {
//     const statHeader = document.createElement("th");
//     statHeader.textContent = statsMapping[statKey] || statKey;
//     headerRow.appendChild(statHeader);
//   });

//   thead.appendChild(headerRow);
//   table.appendChild(thead);

//   // 테이블 바디 생성
//   const tbody = document.createElement("tbody");

//   spirits.forEach((spirit) => {
//     const row = document.createElement("tr");

//     // 환수 정보 컬럼
//     const nameCell = document.createElement("td");
//     nameCell.innerHTML = `<img src="${spirit.image}" alt="${spirit.name}" class="spirit-thumbnail"> ${spirit.name}`;
//     row.appendChild(nameCell);

//     // 레벨 컬럼
//     const levelCell = document.createElement("td");
//     levelCell.textContent = spirit.level;
//     row.appendChild(levelCell);

//     // 세력 컬럼 - influence 필드 사용
//     const factionCell = document.createElement("td");
//     factionCell.textContent = spirit.influence || spirit.faction || "결의";
//     row.appendChild(factionCell);

//     // 스탯 컬럼 추가
//     const levelStats =
//       spirit.stats?.find((s) => s.level === spirit.level)?.registrationStat ||
//       {};

//     sortedStatKeys.forEach((statKey) => {
//       const statCell = document.createElement("td");

//       // 해당 환수의 스탯값 찾기
//       let statValue = 0;
//       for (const [key, value] of Object.entries(levelStats)) {
//         if (normalizeStatKey(key) === statKey) {
//           statValue = value;
//           break;
//         }
//       }

//       // 퍼센트 스탯인 경우 % 표시 추가
//       if (percentStats.includes(statKey)) {
//         statCell.textContent = `${statValue}%`;
//       } else {
//         statCell.textContent = statValue;
//       }

//       row.appendChild(statCell);
//     });

//     tbody.appendChild(row);
//   });

//   table.appendChild(tbody);
//   container.appendChild(table);
// }

// const statsMapping = {
//   criticalPower: "치명위력",
//   normalMonsterAdditionalDamage: "일반몬스터추가피해",
//   healthIncrease: "체력증가",
//   healthIncreasePercent: "체력증가%",
//   strength: "힘",
//   agility: "민첩",
//   intelligence: "지력",
//   damageAbsorption: "피해흡수",
//   damageResistancePenetration: "피해저항관통",
//   magicIncrease: "마력증가",
//   magicIncreasePercent: "마력증가%",
//   damageResistance: "피해저항",
//   healthPotionEnhancement: "체력시약향상",
//   criticalChance: "치명확률",
//   bossMonsterAdditionalDamage: "보스몬스터추가피해",
//   power: "위력",
//   magicPotionEnhancement: "마력시약향상",
//   pvpDamage: "대인피해",
//   pvpDefense: "대인방어",
//   statusEffectAccuracy: "상태이상적중",
//   statusEffectResistance: "상태이상저항",
//   criticalPowerPercent: "치명위력%",
//   pvpDamagePercent: "대인피해%",
//   pvpDefensePercent: "대인방어%",
//   criticalDamageResistance: "치명피해저항",
//   criticalResistance: "치명저항",
//   movementSpeed: "이동속도",
//   destructionPowerIncrease: "파괴력증가",
//   destructionPowerPercent: "파괴력증가%",
//   armorStrength: "무장도",
//   lootAcquisitionIncrease: "전리품획득증가",
//   experienceGainIncrease: "경험치획득증가",
// };

// 0414 testing

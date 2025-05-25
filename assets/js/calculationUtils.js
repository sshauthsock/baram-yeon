const CalculationUtils = (function () {
  const PERCENT_STATS = window.CommonData.PERCENT_STATS || [];
  const gradeSetEffects = window.CommonData.GRADE_SET_EFFECTS || {};
  const factionSetEffects = window.CommonData.FACTION_SET_EFFECTS || {};

  function calculateEffectsForSpirits(spirits) {
    const registrationStats = {};
    const bindStats = {};
    const missingDataSpirits = [];
    const missingBindDataSpirits = [];
    const categoryGradeCount = {};
    const categoryFactionCount = {};

    spirits.forEach((spirit) => {
      const levelStats = spirit.stats?.find(
        (s) => s.level === spirit.level
      )?.registrationStat;

      if (levelStats) {
        Object.entries(levelStats).forEach(([stat, value]) => {
          const numValue = SpiritUtils.ensureNumber(value);
          if (numValue !== 0) {
            const normalizedStat = SpiritUtils.normalizeStatKey(stat);
            registrationStats[normalizedStat] =
              (registrationStats[normalizedStat] || 0) + numValue;
          }
        });
      } else {
        missingDataSpirits.push(spirit.name);
      }

      let bindLevelStats = null;
      bindLevelStats = spirit.stats?.find(
        (s) => s.level === spirit.level
      )?.bindStat;

      if (!bindLevelStats && spirit.hasLevel25Bind) {
        bindLevelStats = spirit.stats?.find((s) => s.level === 25)?.bindStat;
      }

      if (bindLevelStats) {
        Object.entries(bindLevelStats).forEach(([stat, value]) => {
          // 추정치 처리 - 문자열 형태의 추정치에서 숫자만 추출
          let numValue;
          if (typeof value === "string" && value.includes("(추정)")) {
            numValue = parseFloat(value.replace(/\(추정\)/g, "").trim()) || 0;
          } else {
            numValue = SpiritUtils.ensureNumber(value);
          }

          if (numValue !== 0) {
            const normalizedStat = SpiritUtils.normalizeStatKey(stat);
            bindStats[normalizedStat] =
              (bindStats[normalizedStat] || 0) + numValue;
          }
        });
      } else {
        missingBindDataSpirits.push(spirit.name);
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

    const registrationOnly = { ...registrationStats };

    const combinedEffects = { ...registrationStats };

    Object.entries(gradeEffects).forEach(([stat, value]) => {
      combinedEffects[stat] =
        SpiritUtils.ensureNumber(combinedEffects[stat]) +
        SpiritUtils.ensureNumber(value);
    });

    Object.entries(factionEffects).forEach(([stat, value]) => {
      combinedEffects[stat] =
        SpiritUtils.ensureNumber(combinedEffects[stat]) +
        SpiritUtils.ensureNumber(value);
    });

    const combinedEffectsWithBind = { ...combinedEffects };

    Object.entries(bindStats).forEach(([stat, value]) => {
      combinedEffectsWithBind[stat] =
        SpiritUtils.ensureNumber(combinedEffectsWithBind[stat]) +
        SpiritUtils.ensureNumber(value);
    });

    const regScore = calculateScore(registrationOnly);
    const gradeScore = calculateScore(gradeEffects);
    const factionScore = calculateScore(factionEffects);
    const bindScore = calculateScore(bindStats);
    const score = calculateScore(combinedEffects);
    const scoreWithBind = calculateScore(combinedEffectsWithBind);

    return {
      spirits,
      gradeEffects,
      factionEffects,
      bindStats,
      registrationOnly,
      combinedEffects,
      combinedEffectsWithBind,
      missingDataSpirits,
      missingBindDataSpirits,
      regScore,
      gradeScore,
      factionScore,
      score,
      scoreWithBind,
      bindScore,
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
      if (!factionSetEffects[category]) {
        const factions = categoryFactionCount[category];
        for (const faction in factions) {
          const count = factions[faction];

          if (count >= 2) {
            if (faction === "결의" && count >= 3) {
              effects.pvpDamagePercent = (effects.pvpDamagePercent || 0) + 5;
            }
            if (faction === "고요" && count >= 3) {
              effects.pvpDefensePercent = (effects.pvpDefensePercent || 0) + 5;
            }
            if (faction === "냉정" && count >= 3) {
              effects.damageResistancePenetration =
                (effects.damageResistancePenetration || 0) + 50;
            }
            if (faction === "침착" && count >= 3) {
              effects.damageResistance = (effects.damageResistance || 0) + 50;
            }

            effects.power = (effects.power || 0) + count * 10;
          }
        }
        continue;
      }

      const factions = categoryFactionCount[category];

      for (const faction in factions) {
        const count = factions[faction];

        if (count < 2 || !factionSetEffects[category][faction]) {
          continue;
        }

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
              const normalizedStat = SpiritUtils.normalizeStatKey(stat);
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
    const damageResistancePenetration = SpiritUtils.ensureNumber(
      effects.damageResistancePenetration
    );
    const damageResistance = SpiritUtils.ensureNumber(effects.damageResistance);
    const pvpDamagePercent =
      SpiritUtils.ensureNumber(effects.pvpDamagePercent) * 10;
    const pvpDefensePercent =
      SpiritUtils.ensureNumber(effects.pvpDefensePercent) * 10;

    return (
      damageResistancePenetration +
      damageResistance +
      pvpDamagePercent +
      pvpDefensePercent
    );
  }

  function renderEffectsList(
    effectsData,
    setInfo = "",
    includePercentWithNormal = true,
    originalValues = {} // 추정치 원본값 추가
  ) {
    if (!effectsData) effectsData = {};

    const STATS_MAPPING = window.CommonData.STATS_MAPPING || {};
    const STAT_COLOR_MAP = window.CommonData.STAT_COLOR_MAP || {};
    const PERCENT_STATS = window.CommonData.PERCENT_STATS || [];

    let html = "";

    if (Object.keys(effectsData).length === 0) {
      return html + "<p>적용된 효과가 없습니다.</p>";
    }

    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
      "power",
      "movementSpeed",
      "criticalPowerPercent",
      "statusEffectResistance",
      "statusEffectAccuracy",
    ];

    let sortedStatKeys = Object.keys(effectsData).sort((a, b) => {
      const aPriority = priorityStats.indexOf(SpiritUtils.normalizeStatKey(a));
      const bPriority = priorityStats.indexOf(SpiritUtils.normalizeStatKey(b));

      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      } else if (aPriority !== -1) {
        return -1;
      } else if (bPriority !== -1) {
        return 1;
      } else {
        return (
          STATS_MAPPING[SpiritUtils.normalizeStatKey(a)] || a
        ).localeCompare(STATS_MAPPING[SpiritUtils.normalizeStatKey(b)] || b);
      }
    });

    if (includePercentWithNormal) {
      for (const stat of sortedStatKeys) {
        if (!stat) continue;
        let value = effectsData[stat];

        const normalizedStat = SpiritUtils.normalizeStatKey(stat);
        const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

        // 추정치 확인
        const isEstimated =
          originalValues && originalValues[stat] ? true : false;
        const originalValueAttr = isEstimated
          ? ` title="원본 값: ${originalValues[stat]}"`
          : "";

        // 모든 값에 대해 추정치 확인
        if (typeof value === "string" && value.includes("(추정)")) {
          value = parseFloat(value.replace(/\(추정\)/g, "").trim()) || 0;
        }

        const isPercentStat = PERCENT_STATS.includes(normalizedStat);

        const displayValue = isPercentStat
          ? `${Math.round(value * 100) / 100}%`
          : Math.round(value * 100) / 100;

        const colorClass =
          (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
        const cssClass = isPercentStat
          ? `effect-item effect-item-percent ${colorClass}`
          : `effect-item ${colorClass}`;

        // 추정치 표시 추가
        const estimatedMark = isEstimated
          ? '<span class="estimated-marker" title="추정값">*</span>'
          : "";

        html += `<div class="${cssClass}" data-stat="${normalizedStat}"><span>${statName}</span><span${originalValueAttr}>${displayValue}${estimatedMark}</span></div>`;
      }
    } else {
      const normalEffects = {};
      const percentEffects = {};

      for (const stat of sortedStatKeys) {
        if (!stat) continue;

        const normalizedStat = SpiritUtils.normalizeStatKey(stat);
        let value = effectsData[stat];

        // 모든 값에 대해 추정치 확인
        if (typeof value === "string" && value.includes("(추정)")) {
          value = parseFloat(value.replace(/\(추정\)/g, "").trim()) || 0;
        }

        // 추정치 확인
        const isEstimated =
          originalValues && originalValues[stat] ? true : false;

        if (PERCENT_STATS.includes(normalizedStat)) {
          percentEffects[normalizedStat] = value;
        } else {
          normalEffects[normalizedStat] = value;
        }
      }

      const normalStatKeys = Object.keys(normalEffects).sort((a, b) => {
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

      if (normalStatKeys.length > 0) {
        for (const stat of normalStatKeys) {
          let value = normalEffects[stat];
          const normalizedStat = SpiritUtils.normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

          // 추정치 확인
          const isEstimated =
            originalValues && originalValues[stat] ? true : false;
          const originalValueAttr = isEstimated
            ? ` title="원본 값: ${originalValues[stat]}"`
            : "";

          // 추정치 표시 추가
          const estimatedMark = isEstimated
            ? '<span class="estimated-marker" title="추정값">*</span>'
            : "";

          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span${originalValueAttr}>${
            Math.round(value * 100) / 100
          }${estimatedMark}</span></div>`;
        }
      }

      const percentStatKeys = Object.keys(percentEffects).sort((a, b) => {
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

      if (percentStatKeys.length > 0) {
        html += `<div class="section-header">퍼센트 효과</div>`;
        for (const stat of percentStatKeys) {
          let value = percentEffects[stat];
          const normalizedStat = SpiritUtils.normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

          // 추정치 확인
          const isEstimated =
            originalValues && originalValues[stat] ? true : false;
          const originalValueAttr = isEstimated
            ? ` title="원본 값: ${originalValues[stat]}"`
            : "";

          // 추정치 표시 추가
          const estimatedMark = isEstimated
            ? '<span class="estimated-marker" title="추정값">*</span>'
            : "";

          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item effect-item-percent ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span${originalValueAttr}>${
            Math.round(value * 100) / 100
          }%${estimatedMark}</span></div>`;
        }
      }
    }

    // 추정치 관련 스타일 추가
    if (!document.getElementById("estimated-style")) {
      const style = document.createElement("style");
      style.id = "estimated-style";
      style.textContent = `
        .estimated-marker {
          color: #dc3545;
          font-weight: bold;
          margin-left: 2px;
          vertical-align: super;
          font-size: 0.8em;
        }
        .estimation-warning {
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          border-left: 4px solid #ffc107;
          padding: 10px 15px;
          margin: 10px 0;
          color: #856404;
          font-size: 0.9em;
          border-radius: 4px;
        }
      `;
      document.head.appendChild(style);
    }

    return html;
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
        hasLevel25Bind: spirit.hasLevel25Bind,
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

  return {
    calculateEffectsForSpirits,
    calculateGradeSetEffects,
    calculateFactionSetEffects,
    calculateScore,
    renderEffectsList,
    generateCombinations,
    binomialCoefficient,
  };
})();

window.CalculationUtils = CalculationUtils;

// optimalResultModal.js
const OptimalResultModal = (function () {
  const FACTION_ICONS = window.CommonData.FACTION_ICONS || {};

  // 추정값 처리 함수
  function cleanEstimatedValue(value) {
    if (value === undefined || value === null) return 0;

    if (typeof value === "string") {
      if (value.includes("(추정)")) {
        const numericValue = value.replace(/\(추정\)/g, "").trim();
        return parseFloat(numericValue) || 0;
      }
      return parseFloat(value) || 0;
    }
    return value || 0;
  }

  function hasEstimatedValues(stats) {
    if (!stats) return false;

    return Object.values(stats).some(
      (value) => typeof value === "string" && value.includes("(추정)")
    );
  }

  // 환산합산 점수 계산
  function calculateScore(effects) {
    if (!effects) return 0;

    const damageResistancePenetration = ensureNumber(
      cleanEstimatedValue(effects.damageResistancePenetration)
    );
    const damageResistance = ensureNumber(
      cleanEstimatedValue(effects.damageResistance)
    );
    const pvpDamagePercent =
      ensureNumber(cleanEstimatedValue(effects.pvpDamagePercent)) * 10;
    const pvpDefensePercent =
      ensureNumber(cleanEstimatedValue(effects.pvpDefensePercent)) * 10;

    return Math.round(
      damageResistancePenetration +
        damageResistance +
        pvpDamagePercent +
        pvpDefensePercent
    );
  }

  function ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  function createBaseModal() {
    let optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.innerHTML = "";
    } else {
      optimalModal = document.createElement("div");
      optimalModal.id = "optimalModal";
      optimalModal.className = "modal-overlay";
      optimalModal.style.cssText = `
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: none;
        justify-content: center;
        align-items: center;
      `;
      document.body.appendChild(optimalModal);
    }

    const modalContent = document.createElement("div");
    modalContent.id = "optimalModalContent";
    modalContent.className = "modal-content";
    modalContent.style.cssText = `
      background-color: white;
      border-radius: 12px;
      width: 90%;
      max-width: 800px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 25px;
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `;
    optimalModal.appendChild(modalContent);

    const closeButton = document.createElement("button");
    closeButton.id = "closeOptimalModal";
    closeButton.className = "modal-close";
    closeButton.innerHTML = "✕";
    closeButton.style.cssText = `
      position: absolute;
      right: 15px;
      top: 15px;
      font-size: 24px;
      background: none;
      border: none;
      cursor: pointer;
      color: #555;
      z-index: 10002;
    `;
    closeButton.onclick = function () {
      optimalModal.style.display = "none";
      document.body.style.overflow = "auto";
    };
    modalContent.appendChild(closeButton);

    const modalTitle = document.createElement("h3");
    modalTitle.className = "modal-title";
    modalTitle.textContent = "환수 결속 상세 정보";
    modalContent.appendChild(modalTitle);

    return {
      modal: optimalModal,
      content: modalContent,
      title: modalTitle,
    };
  }

  function prepareModalStructure(modalType = "bond") {
    const baseModal = createBaseModal();
    const modalContent = baseModal.content;

    const adRow = document.createElement("div");
    adRow.className = "ad-row";
    adRow.innerHTML = `
      <div class="ad-container-left">
        <ins class="kakao_ad_area" style="display:block;" data-ad-unit="DAN-sgK0ytXrL3f7EHRF"
            data-ad-width="728" data-ad-height="90"></ins>
      </div>
    `;
    modalContent.appendChild(adRow);

    const mobileAd = document.createElement("div");
    mobileAd.className = "ad-container mobile-ad";
    mobileAd.innerHTML = `
      <ins class="kakao_ad_area" style="display:block;" data-ad-unit="DAN-TPesUrzJaxJ008Lm"
          data-ad-width="320" data-ad-height="50"></ins>
    `;
    modalContent.appendChild(mobileAd);

    const headerDiv = document.createElement("div");
    headerDiv.id = "optimalHeader";
    headerDiv.className = "optimal-header";

    const scoreDiv = document.createElement("div");
    scoreDiv.className = "optimal-score";
    scoreDiv.innerHTML = `
      <h4>환산합산: <span id="optimalScore">0</span> <span id="optimalScoreBind" class="bind-score">(장착효과: 0)</span></h4>
      <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small><br />
      <small>환산 합산은 등급 결속 효과 + 세력 결속 효과 + 장착 효과 능력치입니다.</small>
    `;
    headerDiv.appendChild(scoreDiv);
    modalContent.appendChild(headerDiv);

    if (modalType === "bond") {
      const actionButtons = document.createElement("div");
      actionButtons.className = "action-buttons";
      actionButtons.innerHTML = `
        <button id="clearHistoryButton" class="clear-history-btn">기록 삭제</button>
      `;
      modalContent.appendChild(actionButtons);
    }

    if (modalType === "bond") {
      const spiritsList = document.createElement("div");
      spiritsList.id = "optimalSpiritsList";
      spiritsList.className = "selected-spirits-info";
      modalContent.appendChild(spiritsList);
    }

    const combinationContainer = document.createElement("div");
    combinationContainer.id = "combinationResultsContainer";
    combinationContainer.className = "combination-results-container";
    modalContent.appendChild(combinationContainer);

    const resultsContainer = document.createElement("div");
    resultsContainer.className = "results-container";

    const gradeSection = document.createElement("div");
    gradeSection.className = "results-section";
    const gradeEffects = document.createElement("div");
    gradeEffects.id = "optimalGradeEffects";
    gradeEffects.className = "effects-list";
    gradeSection.appendChild(gradeEffects);
    resultsContainer.appendChild(gradeSection);

    const factionSection = document.createElement("div");
    factionSection.className = "results-section";
    const factionEffects = document.createElement("div");
    factionEffects.id = "optimalFactionEffects";
    factionEffects.className = "effects-list";
    factionSection.appendChild(factionEffects);
    resultsContainer.appendChild(factionSection);

    const bindSection = document.createElement("div");
    bindSection.className = "results-section";
    const bindEffects = document.createElement("div");
    bindEffects.id = "optimalBindEffects";
    bindEffects.className = "effects-list";
    bindSection.appendChild(bindEffects);
    resultsContainer.appendChild(bindSection);

    modalContent.appendChild(resultsContainer);

    const detailsContainer = document.createElement("div");
    detailsContainer.id = "optimalSpiritsDetails";
    detailsContainer.className = "spirit-details-container";
    const detailsTitle = document.createElement("h4");
    detailsTitle.textContent = "선택된 환수 상세 스탯 (결속 수치)";
    detailsContainer.appendChild(detailsTitle);

    const statsGrid = document.createElement("div");
    statsGrid.id = "spiritStatsDetails";
    statsGrid.className = "spirit-stats-grid";
    detailsContainer.appendChild(statsGrid);

    modalContent.appendChild(detailsContainer);

    return true;
  }

  function showResultModal(result, modalType = "bond") {
    if (
      !result ||
      !result.spirits ||
      !Array.isArray(result.spirits) ||
      result.spirits.length === 0
    ) {
      console.warn("Invalid result data provided to modal");
      return;
    }

    prepareModalStructure(modalType);

    const optimalModal = document.getElementById("optimalModal");
    if (optimalModal) {
      optimalModal.style.display = "flex";
      document.body.style.overflow = "hidden";

      initKakaoAds();
    }

    const modalTitle = document.querySelector(".modal-title");
    if (modalTitle) {
      const category = result.spirits[0]?.category || "환수";
      modalTitle.textContent = `${category} 결속 상세 정보`;
    }

    // 추정치 처리를 위한 복사본 생성
    const processedResult = JSON.parse(JSON.stringify(result));

    // 추정치가 있는지 확인
    let hasEstimatedValues = false;
    let originalBindStats = {};

    if (processedResult.bindStats) {
      for (const [key, value] of Object.entries(processedResult.bindStats)) {
        if (typeof value === "string" && value.includes("(추정)")) {
          hasEstimatedValues = true;
          originalBindStats[key] = value; // 원본 값 저장
          processedResult.bindStats[key] = cleanEstimatedValue(value); // 숫자값만 추출
        }
      }

      // 추정치가 있는 경우 점수 재계산
      if (hasEstimatedValues) {
        processedResult.bindScore = calculateScore(processedResult.bindStats);
        processedResult.scoreWithBind =
          (processedResult.gradeScore || 0) +
          (processedResult.factionScore || 0) +
          processedResult.bindScore;
      }
    }

    // 수정된 데이터 사용 - processedResult에서 값을 가져옴
    const {
      spirits,
      gradeScore,
      factionScore,
      bindScore,
      gradeCounts,
      factionCounts,
      gradeEffects,
      factionEffects,
      bindStats,
      missingDataSpirits,
      missingBindDataSpirits,
      usesEstimatedValues,
    } = processedResult;

    const combinedScoreWithoutReg = Math.round(
      ensureNumber(gradeScore) +
        ensureNumber(factionScore) +
        ensureNumber(bindScore)
    );

    const displayGradeScore = Math.round(ensureNumber(gradeScore));
    const displayFactionScore = Math.round(ensureNumber(factionScore));
    const displayBindScore = Math.round(ensureNumber(bindScore));

    const optimalScoreEl = document.getElementById("optimalScore");
    if (optimalScoreEl) {
      optimalScoreEl.textContent = `${combinedScoreWithoutReg} (등급: ${displayGradeScore} 세력: ${displayFactionScore} 장착효과: ${displayBindScore})`;
    }

    const optimalScoreBindEl = document.getElementById("optimalScoreBind");
    if (optimalScoreBindEl) {
      optimalScoreBindEl.style.display = "none";
    }

    const tempContainer = document.createElement("div");
    tempContainer.style.display = "none";
    document.body.appendChild(tempContainer);

    const infoBox = document.createElement("div");
    infoBox.className = "data-submission-request";
    infoBox.innerHTML =
      "해당 환수 레벨에 대한 장착/등록 스탯 데이터가 없는 경우 계산에서 제외됩니다.<br>" +
      "해당 레벨에 대해 정보가 있으신가요? 제보해주시면 바로 반영하겠습니다.";
    tempContainer.appendChild(infoBox);

    if (
      (missingDataSpirits && missingDataSpirits.length > 0) ||
      (missingBindDataSpirits && missingBindDataSpirits.length > 0)
    ) {
      const warningBox = document.createElement("div");
      warningBox.className = "data-warning-box";

      let warningContent = "<h4>⚠️ 데이터 누락 경고</h4>";

      if (missingDataSpirits && missingDataSpirits.length > 0) {
        warningContent += `<p><strong>등록 스탯 데이터가 없는 환수 (${
          missingDataSpirits.length
        }개):</strong> 
                           ${missingDataSpirits.join(", ")}</p>`;
      }

      if (missingBindDataSpirits && missingBindDataSpirits.length > 0) {
        warningContent += `<p><strong>결속 스탯 데이터가 없는 환수 (${
          missingBindDataSpirits.length
        }개):</strong> 
                           ${missingBindDataSpirits.join(", ")}</p>`;
      }

      warningContent +=
        "<p>위 환수들은 데이터가 없어 계산에 정확히 반영되지 않았습니다. 환수 레벨을 변경하거나 다른 환수를 선택하는 것이 좋습니다.</p>";

      warningBox.innerHTML = warningContent;
      tempContainer.appendChild(warningBox);
    }

    // 추정치 경고 표시 추가
    if (hasEstimatedValues || usesEstimatedValues) {
      const estimationWarning = document.createElement("div");
      estimationWarning.className = "estimation-warning";
      estimationWarning.innerHTML =
        "⚠️ 일부 결속 수치는 추정값을 사용하여 계산되었습니다.";
      tempContainer.appendChild(estimationWarning);
    }

    const spiritsGridWrapper = document.createElement("div");
    spiritsGridWrapper.innerHTML = `
      <h4>조합 환수 정보</h4>
      <div class="spirits-grid-container">
        ${spirits
          .map(
            (spirit) => `
          <div class="spirit-info-item">
            <img src="${spirit.image}" alt="${spirit.name}">
            <div class="spirit-info-details">
              <div class="spirit-info-name">${spirit.name}</div>
              <div class="spirit-info-level">레벨: ${spirit.level}</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    tempContainer.appendChild(spiritsGridWrapper);

    const combinationContainer = document.getElementById(
      "combinationResultsContainer"
    );
    if (combinationContainer) {
      combinationContainer.innerHTML = tempContainer.innerHTML;
    }

    tempContainer.remove();

    if (modalType === "bond") {
      const spiritsList = document.getElementById("optimalSpiritsList");
      if (spiritsList) {
        spiritsList.innerHTML = "";
      }

      if (
        result.spirits &&
        result.spirits.length > 0 &&
        window.HistoryManager &&
        typeof window.HistoryManager.renderHistoryTabs === "function"
      ) {
        const category = result.spirits[0].category;

        setTimeout(() => {
          try {
            window.HistoryManager.renderHistoryTabs(
              category,
              document.getElementById("optimalSpiritsList"),
              (historyResult) => {
                renderNewResult(historyResult);
              }
            );

            const clearButton = document.getElementById("clearHistoryButton");
            if (clearButton) {
              clearButton.onclick = function () {
                if (
                  window.OptimalCombinationFinder &&
                  typeof window.OptimalCombinationFinder
                    .clearSavedOptimalCombinations === "function"
                ) {
                  window.OptimalCombinationFinder.clearSavedOptimalCombinations(
                    category
                  );
                }
              };
            }
          } catch (e) {
            console.error("Failed to render history tabs:", e);
          }
        }, 100);
      }
    }

    renderEffects(
      gradeEffects,
      factionEffects,
      bindStats,
      displayGradeScore,
      displayFactionScore,
      displayBindScore,
      gradeCounts,
      factionCounts,
      usesEstimatedValues || hasEstimatedValues,
      originalBindStats
    );

    renderSpiritDetailsTable(spirits);

    initModalStyles();

    setTimeout(() => {
      document.querySelectorAll(".info-icon").forEach((icon) => {
        icon.addEventListener("click", function () {
          document
            .querySelectorAll(".info-icon")
            .forEach((i) => i.classList.remove("show-tooltip"));
          this.classList.toggle("show-tooltip");
          setTimeout(() => {
            this.classList.remove("show-tooltip");
          }, 3000);
        });
      });
    }, 500);
  }

  function initKakaoAds() {
    if (typeof window.kakaoPixel === "function") {
      refreshKakaoAds();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    script.onload = function () {
      refreshKakaoAds();
    };
    document.body.appendChild(script);
  }

  function refreshKakaoAds() {
    const adElements = document.querySelectorAll(".kakao_ad_area");
    adElements.forEach((ad) => {
      ad.style.display = "block";
    });

    if (window.kakaoPixel) {
      if (typeof window.kakaoPixel.refresh === "function") {
        window.kakaoPixel.refresh();
      }
    }
  }

  function renderNewResult(result) {
    if (!result) return;

    // 추정치 처리를 위한 복사본 생성
    const processedResult = JSON.parse(JSON.stringify(result));

    // 추정치가 있는지 확인
    let hasEstimatedValues = false;
    let originalBindStats = {};

    if (processedResult.bindStats) {
      for (const [key, value] of Object.entries(processedResult.bindStats)) {
        if (typeof value === "string" && value.includes("(추정)")) {
          hasEstimatedValues = true;
          originalBindStats[key] = value; // 원본 값 저장
          processedResult.bindStats[key] = cleanEstimatedValue(value); // 숫자값만 추출
        }
      }

      // 추정치가 있는 경우 점수 재계산
      if (hasEstimatedValues) {
        processedResult.bindScore = calculateScore(processedResult.bindStats);
        processedResult.scoreWithBind =
          (processedResult.gradeScore || 0) +
          (processedResult.factionScore || 0) +
          processedResult.bindScore;
      }
    }

    const {
      spirits,
      gradeScore,
      factionScore,
      bindScore,
      gradeCounts,
      factionCounts,
      gradeEffects,
      factionEffects,
      bindStats,
      missingDataSpirits,
      missingBindDataSpirits,
      usesEstimatedValues,
    } = processedResult;

    const combinedScoreWithoutReg = Math.round(
      ensureNumber(gradeScore) +
        ensureNumber(factionScore) +
        ensureNumber(bindScore)
    );

    const displayGradeScore = Math.round(ensureNumber(gradeScore));
    const displayFactionScore = Math.round(ensureNumber(factionScore));
    const displayBindScore = Math.round(ensureNumber(bindScore));

    const optimalScoreEl = document.getElementById("optimalScore");
    if (optimalScoreEl) {
      optimalScoreEl.textContent = `${combinedScoreWithoutReg} (등급: ${displayGradeScore} 세력: ${displayFactionScore} 장착효과: ${displayBindScore})`;
    }

    const tempContainer = document.createElement("div");

    const infoBox = document.createElement("div");
    infoBox.className = "data-submission-request";
    infoBox.innerHTML =
      "해당 환수 레벨에 대한 장착/등록 스탯 데이터가 없는 경우 계산에서 제외됩니다.<br>" +
      "해당 레벨에 대해 정보가 있으신가요? 제보해주시면 바로 반영하겠습니다.";
    tempContainer.appendChild(infoBox);

    if (
      (missingDataSpirits && missingDataSpirits.length > 0) ||
      (missingBindDataSpirits && missingBindDataSpirits.length > 0)
    ) {
      const warningBox = document.createElement("div");
      warningBox.className = "data-warning-box";

      let warningContent = "<h4>⚠️ 데이터 누락 경고</h4>";

      if (missingDataSpirits && missingDataSpirits.length > 0) {
        warningContent += `<p><strong>등록 스탯 데이터가 없는 환수 (${
          missingDataSpirits.length
        }개):</strong> 
                         ${missingDataSpirits.join(", ")}</p>`;
      }

      if (missingBindDataSpirits && missingBindDataSpirits.length > 0) {
        warningContent += `<p><strong>결속 스탯 데이터가 없는 환수 (${
          missingBindDataSpirits.length
        }개):</strong> 
                         ${missingBindDataSpirits.join(", ")}</p>`;
      }

      warningContent +=
        "<p>위 환수들은 데이터가 없어 계산에 정확히 반영되지 않았습니다. 환수 레벨을 변경하거나 다른 환수를 선택하는 것이 좋습니다.</p>";

      warningBox.innerHTML = warningContent;
      tempContainer.appendChild(warningBox);
    }

    // 추정치 경고 표시 추가
    if (hasEstimatedValues || usesEstimatedValues) {
      const estimationWarning = document.createElement("div");
      estimationWarning.className = "estimation-warning";
      estimationWarning.innerHTML =
        "⚠️ 일부 결속 수치는 추정값을 사용하여 계산되었습니다.";
      tempContainer.appendChild(estimationWarning);
    }

    const spiritsGridWrapper = document.createElement("div");
    spiritsGridWrapper.innerHTML = `
      <h4>조합 환수 정보</h4>
      <div class="spirits-grid-container">
        ${spirits
          .map(
            (spirit) => `
          <div class="spirit-info-item">
            <img src="${spirit.image}" alt="${spirit.name}">
            <div class="spirit-info-details">
              <div class="spirit-info-name">${spirit.name}</div>
              <div class="spirit-info-level">레벨: ${spirit.level}</div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    tempContainer.appendChild(spiritsGridWrapper);

    renderEffects(
      gradeEffects,
      factionEffects,
      bindStats,
      displayGradeScore,
      displayFactionScore,
      displayBindScore,
      gradeCounts,
      factionCounts,
      usesEstimatedValues || hasEstimatedValues,
      originalBindStats
    );

    renderSpiritDetailsTable(spirits);

    const combinationContainer = document.getElementById(
      "combinationResultsContainer"
    );
    if (combinationContainer) {
      requestAnimationFrame(() => {
        combinationContainer.innerHTML = tempContainer.innerHTML;
      });
    }
  }

  window.HistoryManager = window.HistoryManager || {};

  window.HistoryManager.getHistoryTabsHTML = function (category, onTabChange) {
    const historyManager = window.HistoryManager;
    if (!historyManager || !historyManager.loadSavedCombinations) {
      return "";
    }

    const { savedOptimalCombinations, categoryState } =
      historyManager.loadSavedCombinations();
    let currentActiveIndex = categoryState[category].activeIndex;
    const categoryCombinations = savedOptimalCombinations[category] || [];

    if (categoryCombinations.length === 0) {
      return `
        <div class="history-tabs-container">
          <p class="no-history-message">${category} 카테고리에 저장된 조합 기록이 없습니다.</p>
        </div>
      `;
    }

    let highestScoreIndex = 0;
    let highestScore = 0;
    for (let i = 0; i < categoryCombinations.length; i++) {
      const combo = categoryCombinations[i];
      // 추정치가 있는 경우 처리
      let bindScore = combo.bindScore;
      if (combo.bindStats) {
        const processedBindStats = {};
        let hasEstimatedValues = false;

        for (const [key, value] of Object.entries(combo.bindStats)) {
          if (typeof value === "string" && value.includes("(추정)")) {
            hasEstimatedValues = true;
            processedBindStats[key] = cleanEstimatedValue(value);
          } else {
            processedBindStats[key] = value;
          }
        }

        if (hasEstimatedValues) {
          bindScore = calculateScore(processedBindStats);
        }
      }

      const currentScore =
        ensureNumber(combo.gradeScore) +
        ensureNumber(combo.factionScore) +
        ensureNumber(bindScore);

      if (currentScore > highestScore) {
        highestScore = currentScore;
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

    if (
      currentActiveIndex < 0 ||
      currentActiveIndex >= categoryCombinations.length
    ) {
      currentActiveIndex = newestIndex;
      categoryState[category].activeIndex = newestIndex;
    }

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

              // 추정치가 있는 경우 처리
              let bindScore = combo.bindScore;
              if (combo.bindStats) {
                const processedBindStats = {};
                let hasEstimatedValues = false;

                for (const [key, value] of Object.entries(combo.bindStats)) {
                  if (typeof value === "string" && value.includes("(추정)")) {
                    hasEstimatedValues = true;
                    processedBindStats[key] = cleanEstimatedValue(value);
                  } else {
                    processedBindStats[key] = value;
                  }
                }

                if (hasEstimatedValues) {
                  bindScore = calculateScore(processedBindStats);
                }
              }

              const totalScore = Math.round(
                ensureNumber(combo.gradeScore || 0) +
                  ensureNumber(combo.factionScore || 0) +
                  ensureNumber(bindScore || 0)
              );

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
                  <span class="combo-name">${
                    combo.combinationName || `조합 ${index + 1}`
                  }</span>
                  <span class="tab-score">${totalScore}</span>
                </div>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>
      <div id="selected-tab-info" class="history-info" style="font-size: 0.9em; margin-bottom: 5px;">
        ${
          categoryCombinations[currentActiveIndex]
            ? `
          <span class="timestamp">계산 시간: ${
            categoryCombinations[currentActiveIndex].timestamp
          }</span>
          ${
            currentActiveIndex === highestScoreIndex
              ? '<span class="best-notice">(최고 점수)</span>'
              : ""
          }
        `
            : ""
        }
      </div>
    `;

    return tabsHtml;
  };

  window.HistoryManager.renderHistoryTabs = function (
    category,
    container,
    onTabChange
  ) {
    if (!container) return;

    const tabsHtml = this.getHistoryTabsHTML(category, onTabChange);

    container.innerHTML = tabsHtml;

    document.querySelectorAll(".history-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        document
          .querySelectorAll(".history-tab")
          .forEach((t) => t.classList.remove("active"));

        this.classList.add("active");

        const comboIndex = parseInt(this.dataset.index);
        const { savedOptimalCombinations, categoryState } =
          window.HistoryManager.loadSavedCombinations();
        categoryState[category].activeIndex = comboIndex;
        const result = savedOptimalCombinations[category][comboIndex];

        if (typeof onTabChange === "function") {
          onTabChange(
            result,
            comboIndex === window.HistoryManager.getHighestScoreIndex(category)
          );
        }

        const tabInfoElement = document.getElementById("selected-tab-info");
        if (tabInfoElement && result) {
          tabInfoElement.innerHTML = `
            <span class="timestamp">계산 시간: ${result.timestamp}</span>
            ${
              comboIndex ===
              window.HistoryManager.getHighestScoreIndex(category)
                ? '<span class="best-notice">(최고 점수입니다!)</span>'
                : ""
            }
          `;
        }
      });
    });
  };

  window.HistoryManager.getCombination = function (category, index) {
    const historyManager = window.HistoryManager;
    if (!historyManager || !historyManager.loadSavedCombinations) {
      return null;
    }

    const { savedOptimalCombinations } = historyManager.loadSavedCombinations();
    const categoryCombinations = savedOptimalCombinations[category] || [];

    if (index >= 0 && index < categoryCombinations.length) {
      if (historyManager.setActiveIndex) {
        historyManager.setActiveIndex(category, index);
      }
      return categoryCombinations[index];
    }

    return null;
  };

  window.HistoryManager.getHighestScoreIndex = function (category) {
    const { savedOptimalCombinations } = this.loadSavedCombinations();
    const categoryCombinations = savedOptimalCombinations[category] || [];

    let highestScoreIndex = 0;
    let highestScore = 0;

    for (let i = 0; i < categoryCombinations.length; i++) {
      const combo = categoryCombinations[i];

      // 추정치가 있는 경우 처리
      let bindScore = combo.bindScore;
      if (combo.bindStats) {
        const processedBindStats = {};
        let hasEstimatedValues = false;

        for (const [key, value] of Object.entries(combo.bindStats)) {
          if (typeof value === "string" && value.includes("(추정)")) {
            hasEstimatedValues = true;
            processedBindStats[key] = cleanEstimatedValue(value);
          } else {
            processedBindStats[key] = value;
          }
        }

        if (hasEstimatedValues) {
          bindScore = calculateScore(processedBindStats);
        }
      }

      const currentScore =
        ensureNumber(combo.gradeScore) +
        ensureNumber(combo.factionScore) +
        ensureNumber(bindScore);

      if (currentScore > highestScore) {
        highestScore = currentScore;
        highestScoreIndex = i;
      }
    }

    return highestScoreIndex;
  };

  function renderGradeSetInfo(gradeCounts) {
    if (!gradeCounts) return "";

    let html = "";

    for (const [category, grades] of Object.entries(gradeCounts || {})) {
      for (const [grade, count] of Object.entries(grades)) {
        if (count >= 2) {
          const gradeClass =
            grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
          html += `<span class="grade-tag ${gradeClass}">${grade} X ${count}</span> `;
        }
      }
    }

    return html;
  }

  function renderFactionSetInfo(factionCounts) {
    if (!factionCounts) return "";

    let html = "";

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
        html += factionTags;
      }
    }

    return html;
  }

  function renderEffects(
    gradeEffects,
    factionEffects,
    bindStats,
    displayGradeScore,
    displayFactionScore,
    displayBindScore,
    gradeCounts,
    factionCounts,
    usesEstimatedValues,
    originalBindStats = {}
  ) {
    const gradeEffectsContainer = document.getElementById(
      "optimalGradeEffects"
    );
    if (gradeEffectsContainer) {
      const gradeSetInfo = renderGradeSetInfo(gradeCounts);
      gradeEffectsContainer.innerHTML = `
        <h4>등급 결속 효과 <span class="section-score">(${displayGradeScore})</span></h4>
        <div class="set-info">${gradeSetInfo}</div>
        <div class="effects-content">
          ${
            Object.keys(gradeEffects || {}).length > 0
              ? CalculationUtils.renderEffectsList(gradeEffects || {}, "", true)
              : "<p>적용된 효과가 없습니다.</p>"
          }
        </div>
      `;
    }

    const factionEffectsContainer = document.getElementById(
      "optimalFactionEffects"
    );
    if (factionEffectsContainer) {
      const factionSetInfo = renderFactionSetInfo(factionCounts);
      factionEffectsContainer.innerHTML = `
        <h4>세력 결속 효과 <span class="section-score">(${displayFactionScore})</span></h4>
        <div class="set-info">${factionSetInfo}</div>
        <div class="effects-content">
          ${
            Object.keys(factionEffects || {}).length > 0
              ? CalculationUtils.renderEffectsList(
                  factionEffects || {},
                  "",
                  true
                )
              : "<p>적용된 효과가 없습니다.</p>"
          }
        </div>
      `;
    }

    const bindEffectsContainer = document.getElementById("optimalBindEffects");
    if (bindEffectsContainer) {
      if (bindStats && Object.keys(bindStats).length > 0) {
        // 추정치를 처리하기 위해 복사본 생성
        const processedBindStats = {};
        let hasEstimated = false;

        // bindStats의 추정치 처리
        for (const [key, value] of Object.entries(bindStats)) {
          if (typeof value === "string" && value.includes("(추정)")) {
            hasEstimated = true;
            processedBindStats[key] = cleanEstimatedValue(value);
          } else {
            processedBindStats[key] = value;
          }
        }

        // 추정치가 있으면 점수 재계산
        let recalculatedScore = displayBindScore;
        if (hasEstimated) {
          recalculatedScore = calculateScore(processedBindStats);
        }

        bindEffectsContainer.innerHTML = `
          <h4>장착 효과 <span class="section-score">(${recalculatedScore})</span>
            <span class="info-icon" title="각인효과를 제외한 수치입니다">ⓘ</span>
          </h4>
          <div class="effects-content">
            ${CalculationUtils.renderEffectsList(
              processedBindStats, // 추정치가 처리된 값을 전달
              "",
              true,
              originalBindStats // 원본 값도 함께 전달
            )}
            ${
              usesEstimatedValues || hasEstimated
                ? '<div class="estimation-warning">⚠️ 일부 결속 수치는 추정값을 사용하여 계산되었습니다.</div>'
                : ""
            }
          </div>
        `;
      } else {
        bindEffectsContainer.innerHTML = `
          <h4>장착 효과 <span class="section-score">(0)</span>
            <span class="info-icon" title="각인효과를 제외한 수치입니다">ⓘ</span>
          </h4>
          <p>사용 가능한 결속 스탯이 없습니다.</p>
        `;
      }
    }
  }

  function renderSpiritDetailsTable(spirits) {
    const STATS_MAPPING = window.CommonData.STATS_MAPPING || {};
    const STAT_COLOR_MAP = window.CommonData.STAT_COLOR_MAP || {};
    const PERCENT_STATS = window.CommonData.PERCENT_STATS || [];

    function parseNumericValue(value) {
      if (value === undefined || value === null) return 0;

      // 추정치 처리
      if (typeof value === "string" && value.includes("(추정)")) {
        const numericValue = value.replace(/\(추정\)/g, "").trim();
        return parseFloat(numericValue) || 0;
      }

      if (typeof value !== "string") return parseFloat(value) || 0;
      return parseFloat(value.replace(/,/g, "")) || 0;
    }

    const container = document.getElementById("spiritStatsDetails");
    if (!container) return;

    container.innerHTML = "";

    if (!spirits || !Array.isArray(spirits) || spirits.length === 0) {
      container.innerHTML = "<p>표시할 환수 정보가 없습니다.</p>";
      return;
    }

    const allStatKeys = new Set();
    let hasAnyEstimatedValue = false;

    spirits.forEach((spirit) => {
      if (!spirit || !spirit.stats || !Array.isArray(spirit.stats)) return;

      const levelStats = spirit.stats.find(
        (s) => s && s.level === spirit.level
      );
      if (levelStats && levelStats.registrationStat) {
        Object.keys(levelStats.registrationStat).forEach((key) => {
          if (key) allStatKeys.add(SpiritUtils.normalizeStatKey(key));
        });
      }

      let bindStatData = null;

      if (levelStats && levelStats.bindStat) {
        bindStatData = levelStats.bindStat;
      } else if (spirit.hasLevel25Bind) {
        const level25Stat = spirit.stats.find((s) => s && s.level === 25);
        if (level25Stat && level25Stat.bindStat) {
          bindStatData = level25Stat.bindStat;
        }
      }

      if (bindStatData) {
        Object.keys(bindStatData).forEach((key) => {
          if (key) allStatKeys.add(SpiritUtils.normalizeStatKey(key));

          const value = bindStatData[key];
          if (typeof value === "string" && value.includes("(추정)")) {
            hasAnyEstimatedValue = true;
          }
        });
      }
    });

    if (allStatKeys.size === 0) {
      container.innerHTML = "<p>표시할 스탯 정보가 없습니다.</p>";
      return;
    }

    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
    ];

    const sortedStatKeys = Array.from(allStatKeys).sort((a, b) => {
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
    emptyHeader.textContent = "환수";
    headerRow.appendChild(emptyHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const spiritHeader = document.createElement("th");
      spiritHeader.innerHTML = `
        <img src="${spirit.image || ""}" alt="${spirit.name || "환수"}"
             class="spirit-thumbnail"><br>${spirit.name || "환수"}
      `;
      headerRow.appendChild(spiritHeader);
    });
    table.appendChild(headerRow);

    const scoreRow = document.createElement("tr");
    const scoreHeader = document.createElement("th");
    scoreHeader.textContent = "환산합산";
    scoreHeader.style.backgroundColor = "#e3f2fd";
    scoreRow.appendChild(scoreHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const scoreCell = document.createElement("td");
      scoreCell.style.backgroundColor = "#e3f2fd";
      scoreCell.style.fontWeight = "bold";

      let bindScore = 0;

      try {
        if (spirit.stats && Array.isArray(spirit.stats)) {
          const levelStat = spirit.stats.find(
            (s) => s && s.level === spirit.level
          );

          let bindStat = null;

          if (levelStat && levelStat.bindStat) {
            bindStat = levelStat.bindStat;
          } else if (spirit.hasLevel25Bind) {
            const level25Stat = spirit.stats.find((s) => s && s.level === 25);
            if (level25Stat && level25Stat.bindStat) {
              bindStat = level25Stat.bindStat;
            }
          }

          if (bindStat) {
            const bindPenResist = parseNumericValue(
              bindStat.damageResistancePenetration
            );
            const bindResist = parseNumericValue(bindStat.damageResistance);
            const bindPvpDmg =
              parseNumericValue(bindStat.pvpDamagePercent) * 10;
            const bindPvpDef =
              parseNumericValue(bindStat.pvpDefensePercent) * 10;

            bindScore = bindPenResist + bindResist + bindPvpDmg + bindPvpDef;
          }
        }
      } catch (e) {
        console.warn("점수 계산 중 오류 발생:", e);
        bindScore = 0;
      }

      if (bindScore > 0) {
        scoreCell.innerHTML = `<span class="bind-effect">${Math.round(
          bindScore
        )}</span>`;
      } else {
        scoreCell.textContent = "0";
      }

      scoreRow.appendChild(scoreCell);
    });

    table.appendChild(scoreRow);

    const levelRow = document.createElement("tr");
    const levelHeader = document.createElement("th");
    levelHeader.textContent = "레벨";
    levelRow.appendChild(levelHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const levelCell = document.createElement("td");
      levelCell.textContent = spirit.level || 0;
      levelRow.appendChild(levelCell);
    });
    table.appendChild(levelRow);

    const factionRow = document.createElement("tr");
    const factionHeader = document.createElement("th");
    factionHeader.textContent = "세력";
    factionRow.appendChild(factionHeader);

    spirits.forEach((spirit) => {
      if (!spirit) return;

      const factionCell = document.createElement("td");
      factionCell.textContent = spirit.influence || spirit.faction || "결의";
      factionRow.appendChild(factionCell);
    });
    table.appendChild(factionRow);

    sortedStatKeys.forEach((statKey) => {
      const row = document.createElement("tr");
      const statHeader = document.createElement("th");
      statHeader.textContent = STATS_MAPPING[statKey] || statKey;

      const colorClass = (STAT_COLOR_MAP && STAT_COLOR_MAP[statKey]) || "";
      if (colorClass) {
        statHeader.className = colorClass;
      }
      row.appendChild(statHeader);

      spirits.forEach((spirit) => {
        if (!spirit) return;

        const statCell = document.createElement("td");
        if (colorClass) {
          statCell.className = colorClass;
        }

        let bindValue = 0;
        let isEstimated = false;
        let originalValue = null;

        try {
          if (spirit.stats && Array.isArray(spirit.stats)) {
            const levelStat = spirit.stats.find(
              (s) => s && s.level === spirit.level
            );

            let bindStat = null;

            if (levelStat && levelStat.bindStat) {
              bindStat = levelStat.bindStat;
            } else if (spirit.hasLevel25Bind) {
              const level25Stat = spirit.stats.find((s) => s && s.level === 25);
              if (level25Stat && level25Stat.bindStat) {
                bindStat = level25Stat.bindStat;
              }
            }

            if (bindStat) {
              for (const [key, value] of Object.entries(bindStat)) {
                if (SpiritUtils.normalizeStatKey(key) === statKey) {
                  originalValue = value;
                  isEstimated =
                    typeof value === "string" && value.includes("(추정)");

                  if (isEstimated) {
                    bindValue = parseNumericValue(value);
                  } else {
                    bindValue = parseNumericValue(value);
                  }
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn("스탯 접근 중 오류 발생:", e);
          bindValue = 0;
        }

        const isPercentStat = PERCENT_STATS.includes(statKey);

        if (bindValue > 0) {
          let displayValue = isPercentStat ? `${bindValue}%` : `${bindValue}`;

          if (isEstimated) {
            statCell.innerHTML = `<span class="bind-effect estimated-value" title="추정값: ${originalValue}">${displayValue}</span>`;
          } else {
            statCell.innerHTML = `<span class="bind-effect">${displayValue}</span>`;
          }
        } else if (isEstimated && originalValue) {
          statCell.innerHTML = `<span class="bind-effect estimated-value" title="추정값">${originalValue}</span>`;
        } else {
          statCell.textContent = "0";
        }

        row.appendChild(statCell);
      });

      table.appendChild(row);
    });

    container.appendChild(table);

    if (hasAnyEstimatedValue) {
      const estimatedInfoDiv = document.createElement("div");
      estimatedInfoDiv.className = "estimated-value-info";
      estimatedInfoDiv.innerHTML = "* 표시된 값은 추정치입니다.";
      container.appendChild(estimatedInfoDiv);
    }

    const style = document.createElement("style");
    style.textContent = `
      .spirits-stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 0.85rem;
      }
      
      .spirits-stats-table th, .spirits-stats-table td {
        padding: 6px 4px;
        text-align: center;
        border: 1px solid #dee2e6;
      }
      
      .spirits-stats-table th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      
      .spirits-stats-table .spirit-thumbnail {
        width: 30px;
        height: 30px;
        object-fit: contain;
        margin-bottom: 2px;
      }
      
      .bind-effect {
        color: #e67e22;
        font-weight: bold;
      }
      
      .estimated-value {
        position: relative;
      }
      
      .estimated-value:after {
        content: "*";
        position: relative;
        top: -0.5em;
        font-size: 0.8em;
        color: #e74c3c;
      }
      
      .estimated-value-info {
        font-size: 0.8em;
        color: #e74c3c;
        margin-top: 8px;
        font-style: italic;
        text-align: right;
      }
      
      .estimation-warning {
        background-color: #fff3cd;
        border-left: 3px solid #ffc107;
        padding: 10px;
        margin: 10px 0;
        font-size: 0.9em;
        color: #856404;
      }
      
      @media (max-width: 768px) {
        .spirits-stats-table {
          font-size: 0.75rem;
        }
        
        .spirits-stats-table th, .spirits-stats-table td {
          padding: 4px 2px;
        }
        
        .spirits-stats-table .spirit-thumbnail {
          width: 25px;
          height: 25px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function initModalStyles() {
    const existingStyle = document.getElementById("optimal-modal-styles");
    if (existingStyle) return;

    const style = document.createElement("style");
    style.id = "optimal-modal-styles";

    style.textContent = `
  #optimalModal {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background-color: rgba(0, 0, 0, 0.7) !important;
    z-index: 10000 !important;
    display: none;
    justify-content: center !important;
    align-items: center !important;
    -webkit-overflow-scrolling: touch;
  }
  
  #optimalModalContent {
    background: #fff !important;
    width: 90% !important;
    max-width: 800px !important;
    padding: 20px !important;
    border-radius: 12px !important;
    max-height: 85vh !important;
    overflow-y: auto !important;
    position: relative !important;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3) !important;
    display: block !important;
    z-index: 10001 !important;
    margin: 0 auto !important;
  }
  
  #closeOptimalModal {
    position: absolute;
    right: 15px;
    top: 15px;
    font-size: 24px;
    color: #555;
    background: none;
    border: none;
    cursor: pointer;
    z-index: 10002;
  }
  
  #closeOptimalModal:hover {
    color: #000;
  }
  
  .ad-row {
    width: 100%;
    display: flex;
    justify-content: center;
    margin: 10px 0;
    overflow: hidden;
  }

  .ad-container-left {
    width: 100%;
    max-width: 728px;
    margin: 0 auto;
    text-align: center;
  }

  .mobile-ad {
    display: none;
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }
  
  .history-tabs-container {
    width: 90%;
    max-width: 600px;
    margin: 10px auto;
    overflow-x: hidden;
    padding-bottom: 3px;
    contain: content;
  }

  .history-tabs {
    display: grid;
    grid-template-columns: repeat(5, 1fr) !important;
    width: 100%;
    margin-bottom: 8px;
    gap: 3px;
  }

  .history-tab, .history-tab-placeholder {
    border-radius: 5px;
    padding: 20px 2px 5px !important;
    margin: 0;
    position: relative;
    min-height: 50px;
  }

  .history-tab {
    border: 1px solid #ddd;
    background-color: #f8f8f8;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
    overflow: hidden;
  }

  .tab-indicators {
    position: absolute;
    top: 2px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 2px;
    z-index: 2;
  }

  .current-marker, .best-marker {
    font-size: 8px;
    padding: 1px 3px;
    border-radius: 2px;
    font-weight: normal;
    z-index: 2;
  }

  .current-marker {
    background: #3498db;
    color: white;
  }

  .best-marker {
    background: #e74c3c;
    color: white;
  }

  .combo-name {
    font-weight: bold;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 5px;
    padding: 0 5px;
    z-index: 1;
  }

  .tab-score {
    font-size: 10px;
    font-weight: bold;
    margin-top: 3px;
    display: block;
    text-align: center;
    z-index: 1;
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
  
  .clear-history-btn {
    background-color: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
    margin: 0;
    font-size: 0.9em;
  }
  
  .clear-history-btn:hover {
    background-color: #c0392b;
  }
  
  .action-buttons {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 5px;
  }
  
  .spirits-grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    grid-gap: 6px;
    margin-top: 8px;
    margin-bottom: 8px;
  }
  
  .spirit-info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    border-radius: 6px;
    background-color: #f8f8f8;
    border: 1px solid #e0e0e0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .spirit-info-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  .spirit-info-item img {
    width: 40px;
    height: 40px;
    object-fit: contain;
    margin-bottom: 4px;
  }
  
  .spirit-info-details {
    width: 100%;
    text-align: center;
  }
  
  .spirit-info-name {
    font-weight: bold;
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .spirit-info-level {
    font-size: 7px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .timestamp {
    font-size: 0.75em;
    color: #777;
  }
  
  .history-info {
    font-size: 0.85em;
    margin-bottom: 4px;
  }

  .estimated-value {
    position: relative;
  }
  
  .estimated-value:after {
    content: "*";
    position: relative;
    top: -0.5em;
    font-size: 0.8em;
    color: #e74c3c;
  }
  
  .estimated-value-info {
    font-size: 0.8em;
    color: #e74c3c;
    margin-top: 8px;
    font-style: italic;
    text-align: right;
  }
  
  .estimation-warning {
    background-color: #fff3cd;
    border-left: 3px solid #ffc107;
    padding: 10px;
    margin: 10px 0;
    font-size: 0.9em;
    color: #856404;
  }
  
  .estimated-marker {
    color: #dc3545;
    font-weight: bold;
    margin-left: 2px;
    vertical-align: super;
    font-size: 0.8em;
  }

  @media (min-width: 768px) {
    .spirits-grid-container {
      grid-template-columns: repeat(6, 1fr);
    }
  }
  
  @media (max-width: 768px) {
    .ad-container-left {
      display: none;
    }
    
    .mobile-ad {
      display: block;
    }
  }
  
  .no-flicker {
    backface-visibility: hidden;
    transform: translateZ(0);
    perspective: 1000;
  }
`;

    document.head.appendChild(style);
  }

  function closeOptimalModal() {
    const modal = document.getElementById("optimalModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  return {
    showResultModal,
    renderNewResult,
    renderSpiritDetailsTable,
    initModalStyles,
    prepareModalStructure,
    closeOptimalModal,
    initKakaoAds,
    cleanEstimatedValue,
    hasEstimatedValues,
  };
})();

window.OptimalResultModal = OptimalResultModal;

// optimalCombinationFinder.js
const OptimalCombinationFinder = (function () {
  let isCalculationCancelled = false;
  let isProcessing = false;

  function findOptimalCombination(selectedSpirits, lastActiveCategory) {
    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    if (categorySpirits.length === 0) {
      alert(`${currentCategory} 최적 조합을 찾으려면 환수를 선택하세요.`);
      return;
    }

    isProcessing = true;
    isCalculationCancelled = false;

    OptimalResultModal.prepareModalStructure();
    OptimalResultModal.initModalStyles();

    const optimalModal = document.getElementById("optimalModal");
    const modalContent = document.getElementById("optimalModalContent");

    modalContent.innerHTML = `
      <div class="calculating-wrapper">
        <div class="calculating-box">
          <div class="calculating-spinner"></div>
          <h3>${currentCategory} 최적 조합 계산 중...</h3>
          <p>환수 조합을 계산하고 있습니다. 환수 수에 따라 시간이 걸릴 수 있습니다.</p>
          <button id="cancelCalcBtn" class="cancel-calc-btn">계산 취소</button>
        </div>
      </div>
    `;

    optimalModal.style.display = "flex";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      const cancelCalcBtn = document.getElementById("cancelCalcBtn");
      if (cancelCalcBtn) {
        cancelCalcBtn.addEventListener("click", function () {
          isCalculationCancelled = true;
          document.querySelector(".calculating-box h3").textContent =
            "계산이 취소되었습니다";
        });
      }
    }, 10);

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
        const {
          invalidSpirits,
          invalidBindSpirits,
          spiritsWithSuggestions,
          spiritsWithBindSuggestions,
        } = checkSpiritLevelData(selectedSpirits, lastActiveCategory);

        if (invalidSpirits.length > 0 || invalidBindSpirits.length > 0) {
          const warning = showLevelDataWarning(
            invalidSpirits,
            spiritsWithSuggestions,
            invalidBindSpirits,
            spiritsWithBindSuggestions,
            currentCategory
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
                setTimeout(
                  () =>
                    runActualCalculation(selectedSpirits, lastActiveCategory),
                  100
                );
              });

            document
              .getElementById("cancelBtn")
              .addEventListener("click", function () {
                closeOptimalModal();
                isProcessing = false;
              });
          } else {
            runActualCalculation(selectedSpirits, lastActiveCategory);
          }
        } else {
          runActualCalculation(selectedSpirits, lastActiveCategory);
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

    return { isProcessing };
  }

  function checkSpiritLevelData(selectedSpirits, lastActiveCategory) {
    const currentCategory = lastActiveCategory;

    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    const invalidSpirits = [];
    const invalidBindSpirits = [];
    const spiritsWithSuggestions = [];
    const spiritsWithBindSuggestions = [];

    for (const spirit of categorySpirits) {
      const name = spirit.name;
      const level = spirit.level || 0;
      const availableLevels = [];
      const availableBindLevels = [];

      if (spirit.stats && Array.isArray(spirit.stats)) {
        spirit.stats.forEach((stat) => {
          if (
            stat.registrationStat &&
            Object.keys(stat.registrationStat).length > 0
          ) {
            availableLevels.push(stat.level);
          }

          if (stat.bindStat && Object.keys(stat.bindStat).length > 0) {
            availableBindLevels.push(stat.level);
          }
        });
      }

      if (!availableLevels.includes(level)) {
        invalidSpirits.push({
          name,
          level,
          availableLevels,
          category: currentCategory,
        });

        if (availableLevels.length > 0) {
          spiritsWithSuggestions.push({
            name,
            level,
            availableLevels,
            category: currentCategory,
          });
        }
      }

      if (
        !availableBindLevels.includes(level) &&
        !availableBindLevels.includes(25)
      ) {
        invalidBindSpirits.push({
          name,
          level,
          availableBindLevels,
          category: currentCategory,
        });

        if (availableBindLevels.length > 0) {
          spiritsWithBindSuggestions.push({
            name,
            level,
            availableBindLevels,
            category: currentCategory,
          });
        }
      }
    }

    return {
      invalidSpirits,
      invalidBindSpirits,
      spiritsWithSuggestions,
      spiritsWithBindSuggestions,
    };
  }

  function showLevelDataWarning(
    invalidSpirits,
    spiritsWithSuggestions,
    invalidBindSpirits,
    spiritsWithBindSuggestions,
    currentCategory
  ) {
    let message = "";

    if (invalidSpirits.length > 0) {
      message += `<strong>${currentCategory} 등록 스탯 데이터 누락 경고:</strong><br><br>`;

      invalidSpirits.forEach((spirit) => {
        message += `- <strong>${spirit.name}</strong>: ${spirit.level}레벨에 등록 스탯 데이터가 없습니다.`;

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
          '<br>권장 조치: 각 환수의 레벨을 데이터가 있는 레벨로 변경하시거나 "MAX" 버튼을 눌러 최대 레벨로 설정하세요.<br><br>';
      }
    }

    if (invalidBindSpirits.length > 0) {
      message += `<strong>${currentCategory} 결속 스탯 데이터 누락 경고:</strong><br><br>`;

      invalidBindSpirits.forEach((spirit) => {
        message += `- <strong>${spirit.name}</strong>: ${spirit.level}레벨에 결속 스탯 데이터가 없습니다.`;

        if (spirit.availableBindLevels.length > 0) {
          message += ` 다음 레벨에는 결속 스탯이 있습니다: ${spirit.availableBindLevels.join(
            ", "
          )}`;
        } else {
          message += " (사용 가능한 결속 스탯 데이터가 없습니다)";
        }

        message += "<br>";
      });

      if (spiritsWithBindSuggestions.length > 0) {
        message +=
          "<br>권장 조치: 각 환수의 레벨을 결속 스탯 데이터가 있는 레벨로 변경하시거나, 25레벨 결속 스탯을 사용할 수 있는 환수의 경우 자동으로 적용됩니다.";
      }
    }

    return message;
  }

  function runActualCalculation(selectedSpirits, lastActiveCategory) {
    const currentCategory = lastActiveCategory;
    const categorySpirits = selectedSpirits.filter(
      (spirit) => spirit.category === currentCategory
    );

    document.getElementById("optimalModalContent").innerHTML = `
      <h3 class="modal-title">${currentCategory} 최적 결속 조합 결과 (최대 6개)</h3>
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
            <h4>환산합산: <span id="optimalScore">계산 중...</span> <span id="optimalScoreBind" class="bind-score">(장착효과: 계산 중...)</span></h4>
            <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small><br />
            <small>환산 합산은 등급 결속 효과 + 세력 결속 효과 + 장착 효과 능력치입니다.</small>
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
            <div id="optimalGradeEffects" class="effects-list"></div>
          </div>
          <div class="results-section">
            <div id="optimalFactionEffects" class="effects-list"></div>
          </div>
          <div class="results-section">
            <div id="optimalBindEffects" class="effects-list"></div>
          </div>
        </div>
  
        <div id="optimalSpiritsDetails" class="spirit-details-container">
          <h4>선택된 환수 상세 스탯 (결속 수치)</h4>
          <div id="spiritStatsDetails" class="spirit-stats-grid"></div>
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
        .warning-message {
          padding: 15px;
          background-color: #fff3cd;
          border-left: 3px solid #ffc107;
          color: #856404;
          margin: 10px 0;
          border-radius: 4px;
        }
        .no-effects {
          color: #6c757d;
          font-style: italic;
          padding: 10px;
          text-align: center;
        }
        .bind-score {
          font-size: 0.85em;
          color: #e67e22;
          margin-left: 5px;
        }
        .smart-filtering-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .filtering-phases {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
        }
        .phase {
            flex: 1;
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            background-color: #e9ecef;
            margin: 0 5px;
            color: #6c757d;
            font-size: 14px;
            position: relative;
        }
        .phase::after {
            content: '';
            position: absolute;
            right: -15px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-top: 6px solid transparent;
            border-left: 10px solid #e9ecef;
            border-bottom: 6px solid transparent;
        }
        .phase:last-child::after {
            display: none;
        }
        .phase.active {
            background-color: #007bff;
            color: white;
            font-weight: bold;
        }
        .phase.active::after {
            border-left-color: #007bff;
        }
        .phase.completed {
            background-color: #28a745;
            color: white;
        }
        .phase.completed::after {
            border-left-color: #28a745;
        }
        .spirit-category-counts {
            display: flex;
            justify-content: space-around;
            margin: 15px 0;
            flex-wrap: wrap;
        }
        .spirit-count {
            background-color: #e3f2fd;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin: 5px;
        }
        .filtering-info {
            background-color: #fff3cd;
            padding: 10px;
            border-radius: 5px;
            font-style: italic;
            text-align: center;
            margin: 10px 0;
        }
        
        .data-warning-box {
          margin: 10px 0 20px;
          padding: 15px;
          background-color: #fff3cd;
          border-left: 5px solid #ffc107;
          border-radius: 4px;
          font-size: 0.9em;
        }
        
        .data-warning-box h4 {
          margin-top: 0;
          color: #856404;
        }
        
        .data-warning-box p {
          margin: 5px 0;
        }
        
        .data-submission-request {
          margin: 15px 0;
          padding: 12px 15px;
          background-color: #e8f4f8;
          border: 2px solid #3498db;
          border-radius: 5px;
          font-style: italic;
          font-size: 12px;
          color: #333;
          text-align: center;
          font-weight: bold;
        }
        
        .no-bind-warning {
          margin: 10px 0;
          padding: 10px 15px;
          background-color: #f8f9fa;
          border-left: 3px solid #6c757d;
          font-size: 0.9em;
          color: #555;
        }
        
        .has-bind-bonus {
          color: #2ecc71 !important;
          font-weight: bold;
        }
        
        .history-tab .tab-score {
          font-size: 11px;
          font-weight: bold;
          margin-top: 3px;
          display: block;
          text-align: center;
        }
  
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        clearSavedOptimalCombinations(currentCategory);
      });

    const historyData = HistoryManager.loadSavedCombinations();
    const { savedOptimalCombinations, categoryState } = historyData;

    HistoryManager.renderHistoryTabs(
      currentCategory,
      document.getElementById("optimalSpiritsList"),
      (result, isBest) => {
        OptimalResultModal.showResultModal(result);
      }
    );

    if (
      savedOptimalCombinations[currentCategory] &&
      savedOptimalCombinations[currentCategory].length > 0
    ) {
      const currentActiveIndex = categoryState[currentCategory].activeIndex;
      OptimalResultModal.showResultModal(
        savedOptimalCombinations[currentCategory][currentActiveIndex]
      );
    }

    SearchManager.initializeAds(optimalModal);

    setTimeout(() => {
      try {
        const validSpirits = categorySpirits
          .map((spirit) => {
            const copy = JSON.parse(JSON.stringify(spirit));
            copy.category = spirit.category;
            copy.grade = spirit.grade || "전설";
            copy.faction = spirit.influence || spirit.faction || "결의";
            return copy;
          })
          .filter((spirit) => {
            const hasValidLevel =
              spirit.level !== undefined && spirit.level !== null;
            const hasLevelStats = spirit.stats?.some(
              (s) =>
                s.level === spirit.level &&
                s.registrationStat &&
                Object.keys(s.registrationStat).length > 0
            );
            return hasValidLevel && hasLevelStats;
          });

        if (validSpirits.length === 0) {
          throw new Error(
            "유효한 환수 데이터가 없습니다. 환수들의 레벨을 확인해주세요."
          );
        }

        if (validSpirits.length <= 20) {
          runMethodA(validSpirits);
        } else {
          runMethodB(validSpirits);
        }
      } catch (error) {
        console.error("Error finding optimal combination:", error);
        document.getElementById("optimalSpiritsList").innerHTML = `
            <div class='warning-message'>${
              error.message || "조합을 찾는 중 오류가 발생했습니다."
            }</div>`;
        document.getElementById("optimalScore").textContent = "오류";
        isProcessing = false;
      }
    }, 100);
  }

  function runMethodA(validSpirits) {
    const targetCombinationSize = Math.min(6, validSpirits.length);
    let totalCombinations = CalculationUtils.binomialCoefficient(
      validSpirits.length,
      targetCombinationSize
    );

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
      combinationIndex,
      batchSize,
      validSpirits,
      combinations
    ) {
      if (combinationIndex === 0) {
        combinations = CalculationUtils.generateCombinations(
          validSpirits,
          targetCombinationSize
        );
      }

      if (combinationIndex >= combinations.length || isCalculationCancelled) {
        if (bestResult) {
          const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
          HistoryManager.addNewCombination(deepCopiedResult);

          const category =
            bestResult.spirits[0]?.category || lastActiveCategory;
          OptimalResultModal.showResultModal(bestResult);
          HistoryManager.renderHistoryTabs(
            category,
            document.getElementById("optimalSpiritsList"),
            (result) => {
              OptimalResultModal.showResultModal(result);
            }
          );
        } else {
          document.getElementById("optimalSpiritsList").innerHTML =
            "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
        }
        isProcessing = false;
        return;
      }

      const endIndex = Math.min(
        combinationIndex + batchSize,
        combinations.length
      );

      for (let i = combinationIndex; i < endIndex; i++) {
        const combination = combinations[i];
        const result = CalculationUtils.calculateEffectsForSpirits(combination);

        // 추정치 처리 - 모든 조합 계산 시 추정치를 처리
        if (result.bindStats) {
          let hasEstimatedValues = false;
          for (const [key, value] of Object.entries(result.bindStats)) {
            if (typeof value === "string" && value.includes("(추정)")) {
              hasEstimatedValues = true;
              // cleanEstimatedValue로 숫자만 추출해서 재설정
              result.bindStats[key] =
                OptimalResultModal.cleanEstimatedValue(value);
            }
          }

          // 추정치가 있는 경우 bindScore와 scoreWithBind 재계산
          if (hasEstimatedValues) {
            result.bindScore = CalculationUtils.calculateScore(
              result.bindStats
            );
            result.scoreWithBind = result.score + result.bindScore;
            result.usesEstimatedValues = true;
          }
        }

        processedCombinations++;

        if (processedCombinations % 20 === 0) {
          updateProgress(processedCombinations / totalCombinations);
        }

        if (!bestResult || result.scoreWithBind > bestResult.scoreWithBind) {
          bestResult = result;
        } else if (result.scoreWithBind === bestResult.scoreWithBind) {
          const resultBindCount = SpiritUtils.countSpiritsWithBindStats(result);
          const bestBindCount =
            SpiritUtils.countSpiritsWithBindStats(bestResult);

          if (resultBindCount > bestBindCount) {
            bestResult = result;
          } else if (resultBindCount === bestBindCount) {
            const currentImmortalCount = SpiritUtils.countGradeInResult(
              result,
              "불멸"
            );
            const bestImmortalCount = SpiritUtils.countGradeInResult(
              bestResult,
              "불멸"
            );

            if (currentImmortalCount > bestImmortalCount) {
              bestResult = result;
            } else if (currentImmortalCount === bestImmortalCount) {
              const currentGradeTypes =
                SpiritUtils.countGradeTypesInResult(result);
              const bestGradeTypes =
                SpiritUtils.countGradeTypesInResult(bestResult);

              if (currentGradeTypes > bestGradeTypes) {
                bestResult = result;
              }
            }
          }
        }
      }

      if (endIndex < combinations.length) {
        setTimeout(() => {
          processInBatches(endIndex, batchSize, validSpirits, combinations);
        }, 0);
      } else {
        setTimeout(() => {
          if (bestResult) {
            const deepCopiedResult = JSON.parse(JSON.stringify(bestResult));
            const { resultWithTimestamp, index } =
              HistoryManager.addNewCombination(deepCopiedResult);

            const category =
              bestResult.spirits[0]?.category || lastActiveCategory;
            OptimalResultModal.showResultModal(bestResult);
            HistoryManager.renderHistoryTabs(
              category,
              document.getElementById("optimalSpiritsList"),
              (result) => {
                OptimalResultModal.showResultModal(result);
              }
            );
          } else {
            document.getElementById("optimalSpiritsList").innerHTML =
              "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
          }
          isProcessing = false;
        }, 0);
      }
    }

    const batchSize = 50;
    processInBatches(0, batchSize, validSpirits, null);
  }

  function runMethodB(validSpirits) {
    const filteringInfoContainer = document.createElement("div");
    filteringInfoContainer.className = "smart-filtering-info";
    filteringInfoContainer.innerHTML = `
        <h4>스마트 필터링으로 계산 중</h4>
        <div class="filtering-info">환수 수가 많아 효율적인 스마트 필터링을 적용합니다</div>
        <div class="filtering-phases">
          <div class="phase active" id="phase1">1. 환수 평가</div>
          <div class="phase" id="phase2">2. 후보군 선정</div>
          <div class="phase" id="phase3">3. 조합 최적화</div>
          <div class="phase" id="phase4">4. 최종 검증</div>
        </div>
        <div id="phaseDescription" class="filtering-info">
          환수 개별 성능을 평가 중입니다...
        </div>
      `;

    document.getElementById("optimalSpiritsList").innerHTML = "";
    document
      .getElementById("optimalSpiritsList")
      .appendChild(filteringInfoContainer);

    const formattedSpirits = validSpirits.map((spirit) => ({
      name: spirit.name,
      image: spirit.image,
      category: spirit.category,
      grade: spirit.grade || "전설",
      faction: spirit.influence || spirit.faction || "결의",
      level: spirit.level,
      stats: spirit.stats,
      isFixedLevel: spirit.isFixedLevel,
      hasLevel25Bind: spirit.hasLevel25Bind,
    }));

    updatePhase("phase1", "환수 개별 성능을 평가 중입니다...");
    setTimeout(() => {
      const rankedSpirits = rankSpirits(formattedSpirits);
      displayInitialSpiritRanking(rankedSpirits);

      updatePhase("phase2", "최적 조합 후보군을 선정 중입니다...");

      setTimeout(() => {
        updatePhase("phase3", "후보 조합을 최적화 중입니다...");

        setTimeout(() => {
          if (window.Worker) {
            optimizeWithSmartFiltering(rankedSpirits);
          } else {
            optimizeWithoutWorkerSmartFiltering(rankedSpirits);
          }
        }, 300);
      }, 300);
    }, 300);
  }

  function updatePhase(currentPhaseId, description) {
    document.querySelectorAll(".filtering-phases .phase").forEach((phase) => {
      phase.classList.remove("active");
      phase.classList.remove("completed");
    });

    const phaseElement = document.getElementById(currentPhaseId);
    if (phaseElement) {
      phaseElement.classList.add("active");

      const phaseNumber = parseInt(currentPhaseId.replace("phase", ""));
      for (let i = 1; i < phaseNumber; i++) {
        const prevPhase = document.getElementById(`phase${i}`);
        if (prevPhase) {
          prevPhase.classList.add("completed");
        }
      }
    }

    const descriptionElement = document.getElementById("phaseDescription");
    if (descriptionElement && description) {
      descriptionElement.textContent = description;
    }
  }

  function rankSpirits(spirits) {
    return spirits
      .map((spirit) => {
        const levelStat =
          spirit.stats?.find((s) => s.level === spirit.level)
            ?.registrationStat || {};

        let bindStat = spirit.stats?.find(
          (s) => s.level === spirit.level
        )?.bindStat;

        if (!bindStat && spirit.hasLevel25Bind) {
          bindStat = spirit.stats?.find((s) => s.level === 25)?.bindStat;
        }

        // 처리된 bindStat - 추정치 처리
        const processedBindStat = {};
        let hasEstimatedValues = false;

        if (bindStat) {
          for (const [key, value] of Object.entries(bindStat)) {
            if (typeof value === "string" && value.includes("(추정)")) {
              hasEstimatedValues = true;
              processedBindStat[key] =
                OptimalResultModal.cleanEstimatedValue(value);
            } else {
              processedBindStat[key] = value;
            }
          }
        }

        const regScore =
          (levelStat.damageResistancePenetration || 0) +
          (levelStat.damageResistance || 0) +
          (levelStat.pvpDamagePercent || 0) * 10 +
          (levelStat.pvpDefensePercent || 0) * 10;

        // 추정치가 처리된 bindScore 계산
        const bindScore =
          (processedBindStat.damageResistancePenetration || 0) +
          (processedBindStat.damageResistance || 0) +
          (processedBindStat.pvpDamagePercent || 0) * 10 +
          (processedBindStat.pvpDefensePercent || 0) * 10;

        return {
          ...spirit,
          score: regScore,
          bindScore: bindScore,
          totalScore: regScore + bindScore,
          calculatedStats: levelStat,
          calculatedBindStats: hasEstimatedValues
            ? processedBindStat
            : bindStat,
          usesEstimatedValues: hasEstimatedValues,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  function displayInitialSpiritRanking(rankedSpirits) {
    const pvpSpirits = rankedSpirits.filter((spirit) =>
      hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
    );

    const resistanceSpirits = rankedSpirits.filter(
      (spirit) =>
        !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"]) &&
        hasCriticalStat(spirit, [
          "damageResistancePenetration",
          "damageResistance",
        ])
    );

    const otherSpirits = rankedSpirits.filter(
      (spirit) =>
        !hasCriticalStat(spirit, [
          "pvpDamagePercent",
          "pvpDefensePercent",
          "damageResistancePenetration",
          "damageResistance",
        ])
    );

    const infoHTML = `
      <div class="smart-filtering-info">
          <h4>스마트 필터링 준비 완료 (20개 초과 선택 시 작동)</h4>
          <p><strong>선택된 환수:</strong> ${rankedSpirits.length}개</p>
          <div class="spirit-category-counts">
              <div class="spirit-count">대피/대방% 환수: ${pvpSpirits.length}개</div>
              <div class="spirit-count">피저/피저관 환수: ${resistanceSpirits.length}개</div>
              <div class="spirit-count">기타 환수: ${otherSpirits.length}개</div>
          </div>
          <p class="filtering-info">환수들을 기여도에 따라 분석하여 모든 환수를 고려한 최적화된 계산을 수행합니다.</p>
          <div class="filtering-phases">
              <div class="phase active" id="phase0">준비 완료</div>
              <div class="phase" id="phase1">1단계: 상위 점수 환수 분석</div>
              <div class="phase" id="phase2">2단계: 균형 환수 분석</div>
              <div class="phase" id="phase3">3단계: 전체 환수 분석</div>
          </div>
          <div class="progress-container">
              <div class="progress-bar-container">
                  <div class="progress-bar" id="calculation-progress-bar" style="width:0%"></div>
                  <div class="progress-character" id="progress-character"></div>
              </div>
          </div>
          <div id="calculation-status">계산 시작 준비 완료</div>
      </div>
    `;

    document.getElementById("optimalSpiritsList").innerHTML = infoHTML;

    const animStyle = document.getElementById("progress-animation-style");
    if (!animStyle) {
      const style = document.createElement("style");
      style.id = "progress-animation-style";
      style.textContent = `
        .progress-container {
          position: relative;
          margin: 15px 0;
        }
        
        .progress-bar-container {
          position: relative;
          height: 30px;
          background-color: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, rgba(16, 59, 69, 1), rgba(16, 59, 69, 1)); 
          border-radius: 10px;
          transition: width 0.3s;
          z-index: 1;
        }
        
        .progress-character {
          position: absolute;
          top: 0;
          left: 0;
          width: 30px;
          height: 30px;
          background-image: url('assets/img/walking.gif');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          z-index: 2;
          transition: left 0.3s;
        }
        
        @media (max-width: 480px) {
          .progress-character {
            width: 20px;
            height: 20px;
          }
          .progress-bar-container {
            height: 20px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function updateProgressWithCharacter(progress) {
    const progressBar = document.getElementById("calculation-progress-bar");
    const progressCharacter = document.getElementById("progress-character");

    if (progressBar && progressCharacter) {
      const percentage = Math.round(progress * 100);
      progressBar.style.width = `${percentage}%`;

      const containerWidth = progressBar.parentElement.offsetWidth;
      const characterWidth = progressCharacter.offsetWidth;

      const maxLeft = containerWidth - characterWidth;
      const left = Math.max(
        0,
        (containerWidth - characterWidth) * (percentage / 100)
      );
      progressCharacter.style.left = `${Math.min(left, maxLeft)}px`;
    }
  }

  function updateCalculationPhase(phaseIndex) {
    document.querySelectorAll(".phase").forEach((el, idx) => {
      el.classList.remove("active", "completed");
      if (idx < phaseIndex) {
        el.classList.add("completed");
      } else if (idx === phaseIndex) {
        el.classList.add("active");
      }
    });

    const statusText = document.getElementById("calculation-status");
    if (statusText) {
      switch (phaseIndex) {
        case 0:
          statusText.textContent = "계산 시작 준비 완료";
          break;
        case 1:
          statusText.textContent = "1단계: 상위 점수 환수 분석 중...";
          break;
        case 2:
          statusText.textContent = "2단계: 균형 환수 조합 분석 중...";
          break;
        case 3:
          statusText.textContent = "3단계: 전체 환수 분석 중...";
          break;
        case 4:
          statusText.textContent = "계산 완료!";
          break;
        default:
          statusText.textContent = "계산 진행 중...";
      }
    }
  }

  function hasCriticalStat(spirit, statKeys) {
    if (spirit.stats && Array.isArray(spirit.stats)) {
      const levelStat = spirit.stats.find((s) => s.level === spirit.level);
      if (levelStat && levelStat.registrationStat) {
        const stats = levelStat.registrationStat;
        if (
          statKeys.some((key) => {
            const value = parseFloat(stats[key] || 0);
            return value > 0;
          })
        ) {
          return true;
        }
      }
    }

    if (spirit.stats && Array.isArray(spirit.stats)) {
      const levelStat = spirit.stats.find((s) => s.level === spirit.level);
      if (levelStat && levelStat.bindStat) {
        const stats = levelStat.bindStat;
        if (
          statKeys.some((key) => {
            // 추정치 처리
            let value;
            if (
              typeof stats[key] === "string" &&
              stats[key].includes("(추정)")
            ) {
              value = OptimalResultModal.cleanEstimatedValue(stats[key]);
            } else {
              value = parseFloat(stats[key] || 0);
            }
            return value > 0;
          })
        ) {
          return true;
        }
      }

      if (spirit.hasLevel25Bind) {
        const level25Stat = spirit.stats.find((s) => s.level === 25);
        if (level25Stat && level25Stat.bindStat) {
          const stats = level25Stat.bindStat;
          return statKeys.some((key) => {
            // 추정치 처리
            let value;
            if (
              typeof stats[key] === "string" &&
              stats[key].includes("(추정)")
            ) {
              value = OptimalResultModal.cleanEstimatedValue(stats[key]);
            } else {
              value = parseFloat(stats[key] || 0);
            }
            return value > 0;
          });
        }
      }
    }

    return false;
  }

  function optimizeWithSmartFiltering(rankedSpirits) {
    const totalSpirits = rankedSpirits.length;
    let bestResultOverall = null;
    let processedResultCount = 0;

    updateCalculationPhase(0);

    const topRankedSpirits = rankedSpirits.slice(0, Math.min(25, totalSpirits));

    const pvpSpirits = rankedSpirits
      .filter((spirit) =>
        hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
      )
      .slice(0, 15);

    const resistanceSpirits = rankedSpirits
      .filter(
        (spirit) =>
          hasCriticalStat(spirit, [
            "damageResistancePenetration",
            "damageResistance",
          ]) &&
          !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"])
      )
      .slice(0, 15);

    const otherSpirits = rankedSpirits
      .filter(
        (spirit) =>
          !hasCriticalStat(spirit, ["pvpDamagePercent", "pvpDefensePercent"]) &&
          !hasCriticalStat(spirit, [
            "damageResistancePenetration",
            "damageResistance",
          ])
      )
      .slice(0, 15);

    const mixedSpirits = [
      ...new Set([...pvpSpirits, ...resistanceSpirits, ...otherSpirits]),
    ];

    const phases = [
      {
        spirits: topRankedSpirits,
        maxSize: 6,
        name: "상위 점수 환수",
        phaseId: "phase1",
      },
      {
        spirits: mixedSpirits,
        maxSize: 6,
        name: "균형 환수 조합",
        phaseId: "phase2",
      },
      {
        spirits: rankedSpirits.slice(0, Math.min(40, totalSpirits)),
        maxSize: 6,
        name: "전체 환수",
        phaseId: "phase3",
      },
    ];

    let currentPhase = 0;
    processNextPhase();

    function processNextPhase() {
      if (currentPhase >= phases.length || isCalculationCancelled) {
        finishCalculation();
        return;
      }

      updateCalculationPhase(currentPhase + 1);
      const phase = phases[currentPhase];

      const statusText = document.getElementById("calculation-status");
      if (statusText) {
        statusText.textContent = `${phase.name} 분석 중...`;
      }

      const targetSize = Math.min(phase.maxSize, phase.spirits.length);
      const combinations = CalculationUtils.generateCombinations(
        phase.spirits,
        targetSize
      );
      const totalCombos = combinations.length;

      let bestPhaseResult = null;
      let processedCount = 0;

      function processBatch(startIndex, batchSize) {
        if (startIndex >= totalCombos || isCalculationCancelled) {
          currentPhase++;
          processNextPhase();
          return;
        }

        const endIndex = Math.min(startIndex + batchSize, totalCombos);

        for (let i = startIndex; i < endIndex; i++) {
          const result = CalculationUtils.calculateEffectsForSpirits(
            combinations[i]
          );

          // 추정치 처리 - 모든 조합 계산 시 추정치를 처리
          if (result.bindStats) {
            let hasEstimatedValues = false;
            for (const [key, value] of Object.entries(result.bindStats)) {
              if (typeof value === "string" && value.includes("(추정)")) {
                hasEstimatedValues = true;
                // cleanEstimatedValue로 숫자만 추출해서 재설정
                result.bindStats[key] =
                  OptimalResultModal.cleanEstimatedValue(value);
              }
            }

            // 추정치가 있는 경우 bindScore와 scoreWithBind 재계산
            if (hasEstimatedValues) {
              result.bindScore = CalculationUtils.calculateScore(
                result.bindStats
              );
              result.scoreWithBind = result.score + result.bindScore;
              result.usesEstimatedValues = true;
            }
          }

          if (
            !bestPhaseResult ||
            result.scoreWithBind > bestPhaseResult.scoreWithBind
          ) {
            bestPhaseResult = result;
          }

          if (
            !bestResultOverall ||
            result.scoreWithBind > bestResultOverall.scoreWithBind
          ) {
            bestResultOverall = result;

            document.getElementById("optimalScore").textContent = `${
              bestResultOverall.scoreWithBind
            } (등록효과: ${bestResultOverall.score} 장착효과: ${
              bestResultOverall.bindScore || 0
            })`;

            const bindScoreEl = document.getElementById("optimalScoreBind");
            if (bindScoreEl) bindScoreEl.style.display = "none";
          }
        }

        processedCount += endIndex - startIndex;
        updateProgressWithCharacter(processedCount / totalCombos);

        setTimeout(() => {
          processBatch(endIndex, batchSize);
        }, 0);
      }

      // Start processing with appropriate batch size
      const batchSize = Math.min(
        50,
        Math.max(10, Math.floor(totalCombos / 100))
      );
      processBatch(0, batchSize);
    }

    function finishCalculation() {
      updateCalculationPhase(4);

      const calcStatus = document.getElementById("calculation-status");
      if (calcStatus) {
        calcStatus.innerHTML =
          '계산 완료! <span class="calculation-complete-icon">✓</span>';
        calcStatus.classList.add("calculation-complete");
      }

      if (bestResultOverall) {
        const deepCopiedResult = JSON.parse(JSON.stringify(bestResultOverall));
        HistoryManager.addNewCombination(deepCopiedResult);

        const category =
          bestResultOverall.spirits[0]?.category || lastActiveCategory;
        OptimalResultModal.showResultModal(bestResultOverall);
        HistoryManager.renderHistoryTabs(
          category,
          document.getElementById("optimalSpiritsList"),
          (result) => {
            OptimalResultModal.showResultModal(result);
          }
        );
      } else {
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
      }

      isProcessing = false;
    }
  }

  function optimizeWithoutWorkerSmartFiltering(rankedSpirits) {
    const totalSpirits = rankedSpirits.length;
    let bestResult = null;

    const topSpirits = rankedSpirits.slice(0, Math.min(15, totalSpirits));

    document.getElementById("calculation-status").textContent =
      "웹 워커를 지원하지 않습니다. 상위 환수만 계산합니다...";

    setTimeout(() => {
      const targetSize = Math.min(6, topSpirits.length);
      const combinations = CalculationUtils.generateCombinations(
        topSpirits,
        targetSize
      );

      combinations.forEach((combination, index) => {
        const result = CalculationUtils.calculateEffectsForSpirits(combination);

        // 추정치 처리
        if (result.bindStats) {
          let hasEstimatedValues = false;
          for (const [key, value] of Object.entries(result.bindStats)) {
            if (typeof value === "string" && value.includes("(추정)")) {
              hasEstimatedValues = true;
              // cleanEstimatedValue로 숫자만 추출해서 재설정
              result.bindStats[key] =
                OptimalResultModal.cleanEstimatedValue(value);
            }
          }

          // 추정치가 있는 경우 bindScore와 scoreWithBind 재계산
          if (hasEstimatedValues) {
            result.bindScore = CalculationUtils.calculateScore(
              result.bindStats
            );
            result.scoreWithBind = result.score + result.bindScore;
            result.usesEstimatedValues = true;
          }
        }

        if (!bestResult || result.scoreWithBind > bestResult.scoreWithBind) {
          bestResult = result;
        }

        if (index % 100 === 0) {
          const progress = (index / combinations.length) * 100;
          const progressBar = document.getElementById(
            "calculation-progress-bar"
          );
          if (progressBar) {
            progressBar.style.width = `${Math.round(progress)}%`;
          }
        }
      });

      if (bestResult) {
        HistoryManager.addNewCombination(bestResult);

        const category = bestResult.spirits[0]?.category || lastActiveCategory;
        OptimalResultModal.showResultModal(bestResult);
        HistoryManager.renderHistoryTabs(
          category,
          document.getElementById("optimalSpiritsList"),
          (result) => {
            OptimalResultModal.showResultModal(result);
          }
        );
      } else {
        document.getElementById("optimalSpiritsList").innerHTML =
          "<div class='warning-message'>최적 조합을 찾을 수 없습니다.</div>";
      }

      isProcessing = false;
    }, 100);
  }

  function clearSavedOptimalCombinations(category) {
    if (
      confirm(
        `${category} 카테고리의 저장된 모든 조합 기록을 삭제하시겠습니까?`
      )
    ) {
      HistoryManager.clearCombinations(category);

      document.getElementById("optimalGradeEffects").innerHTML = "";
      document.getElementById("optimalFactionEffects").innerHTML = "";
      document.getElementById("optimalBindEffects").innerHTML = "";
      document.getElementById("optimalTotalEffects").innerHTML = "";
      document.getElementById("spiritStatsDetails").innerHTML = "";
      document.getElementById("combinationResultsContainer").innerHTML = "";
      document.getElementById("optimalScore").textContent = "0";
      document.getElementById("optimalScoreBind").textContent = "(장착효과: 0)";

      HistoryManager.renderHistoryTabs(
        category,
        document.getElementById("optimalSpiritsList"),
        (result) => {
          OptimalResultModal.showResultModal(result);
        }
      );

      alert(`${category} 조합 기록이 모두 삭제되었습니다.`);
    }
  }

  function closeOptimalModal() {
    document.getElementById("optimalModal").style.display = "none";
    document.body.style.overflow = "auto";
    isProcessing = false;
  }

  return {
    findOptimalCombination,
    closeOptimalModal,
    clearSavedOptimalCombinations,
  };
})();

window.OptimalCombinationFinder = OptimalCombinationFinder;

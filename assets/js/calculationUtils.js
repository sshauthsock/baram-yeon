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
    // 중요: scoreWithBind를 직접 gradeScore + factionScore + bindScore로 계산
    const scoreWithBind = gradeScore + factionScore + bindScore;

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

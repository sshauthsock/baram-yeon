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
          const numValue = SpiritUtils.ensureNumber(value);
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
    includePercentWithNormal = true
  ) {
    if (!effectsData) effectsData = {};

    const STATS_MAPPING = window.CommonData.STATS_MAPPING || {};
    const STAT_COLOR_MAP = window.CommonData.STAT_COLOR_MAP || {};

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
        const value = effectsData[stat];

        const normalizedStat = SpiritUtils.normalizeStatKey(stat);
        const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

        const isPercentStat = PERCENT_STATS.includes(normalizedStat);

        const displayValue = isPercentStat
          ? `${Math.round(value * 100) / 100}%`
          : Math.round(value * 100) / 100;

        const colorClass =
          (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
        const cssClass = isPercentStat
          ? `effect-item effect-item-percent ${colorClass}`
          : `effect-item ${colorClass}`;

        html += `<div class="${cssClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${displayValue}</span></div>`;
      }
    } else {
      const normalEffects = {};
      const percentEffects = {};

      for (const stat of sortedStatKeys) {
        if (!stat) continue;

        const normalizedStat = SpiritUtils.normalizeStatKey(stat);
        const value = effectsData[stat];

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
          const value = normalEffects[stat];
          const normalizedStat = SpiritUtils.normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${
            Math.round(value * 100) / 100
          }</span></div>`;
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
          const value = percentEffects[stat];
          const normalizedStat = SpiritUtils.normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item effect-item-percent ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${
            Math.round(value * 100) / 100
          }%</span></div>`;
        }
      }
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

const RankingCalculator = (function () {
  const STATS_MAPPING = window.CommonData.STATS_MAPPING;
  const PERCENT_STATS = window.CommonData.PERCENT_STATS;
  const GRADE_SET_EFFECTS = window.CommonData.GRADE_SET_EFFECTS;
  const FACTION_SET_EFFECTS = window.CommonData.FACTION_SET_EFFECTS;

  let mobData = { 수호: [], 탑승: [], 변신: [] };
  let rankingData = {
    bond: {
      수호: [],
      탑승: [],
      변신: [],
    },
    stat: {
      수호: {},
      탑승: {},
      변신: {},
    },
  };

  let rankingMeta = {
    lastUpdated: new Date().toISOString(),
    categories: ["수호", "탑승", "변신"],
    bondRankings: {
      수호: { count: 0, updatedAt: null },
      탑승: { count: 0, updatedAt: null },
      변신: { count: 0, updatedAt: null },
    },
    statRankings: {
      수호: { statCount: 0, updatedAt: null },
      탑승: { statCount: 0, updatedAt: null },
      변신: { statCount: 0, updatedAt: null },
    },
  };

  function optimizeDataForStorage(data) {
    if (!data || !data.rankings) {
      return data;
    }

    if (Array.isArray(data.rankings)) {
      const optimizedRankings = data.rankings.map((rankingItem) => {
        if (!rankingItem.spirits) return rankingItem;

        const optimizedSpirits = rankingItem.spirits.map((spirit) => {
          const optimizedSpirit = {
            name: spirit.name,
            image: spirit.image,
            category: spirit.category,
            grade: spirit.grade,
            faction: spirit.faction || spirit.influence || "결의",
            level: 25,
          };

          if (spirit.stats && Array.isArray(spirit.stats)) {
            const level25Stat = spirit.stats.find(
              (stat) => stat && stat.level === 25
            );
            if (level25Stat) {
              optimizedSpirit.stats = [
                {
                  level: 25,
                  registrationStat: level25Stat.registrationStat,
                  bindStat: level25Stat.bindStat,
                },
              ];
            }
          }

          return optimizedSpirit;
        });

        return {
          spirits: optimizedSpirits,
          gradeEffects: rankingItem.gradeEffects,
          factionEffects: rankingItem.factionEffects,
          bindStats: rankingItem.bindStats,
          registrationOnly: rankingItem.registrationOnly,
          combinedEffects: rankingItem.combinedEffects,
          combinedEffectsWithBind: rankingItem.combinedEffectsWithBind,
          regScore: rankingItem.regScore,
          gradeScore: rankingItem.gradeScore,
          factionScore: rankingItem.factionScore,
          score: rankingItem.score,
          scoreWithBind: rankingItem.scoreWithBind,
          bindScore: rankingItem.bindScore,
          gradeCounts: rankingItem.gradeCounts,
          factionCounts: rankingItem.factionCounts,
        };
      });

      return {
        ...data,
        rankings: optimizedRankings,
      };
    } else {
      const optimizedRankings = {};

      for (const statKey in data.rankings) {
        if (Array.isArray(data.rankings[statKey])) {
          optimizedRankings[statKey] = data.rankings[statKey].map((item) => ({
            name: item.name,
            image: item.image,
            influence: item.influence,
            grade: item.grade,
            value: item.value,
          }));
        }
      }

      return {
        ...data,
        rankings: optimizedRankings,
      };
    }
  }

  function ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  function normalizeStatKey(key) {
    return key.replace(/\d+$/, "");
  }

  async function loadAllData() {
    try {
      const data = await window.DataManager.loadCategoryData();
      mobData = data;
      return true;
    } catch (error) {
      console.error("Failed to load spirit data:", error);
      return false;
    }
  }

  function generateCombinations(arr, k, startIdx = 0, current = []) {
    if (current.length === k) {
      return [current];
    }

    if (startIdx >= arr.length) {
      return [];
    }

    const withCurrent = generateCombinations(arr, k, startIdx + 1, [
      ...current,
      arr[startIdx],
    ]);

    const withoutCurrent = generateCombinations(arr, k, startIdx + 1, current);

    return [...withCurrent, ...withoutCurrent];
  }

  async function calculateBondRankings(category, progressCallback = null) {
    if (!mobData[category] || !Array.isArray(mobData[category])) {
      throw new Error(`Invalid data for category: ${category}`);
    }

    const spirits = mobData[category].map((spirit) => {
      const spiritCopy = JSON.parse(JSON.stringify(spirit));
      if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
        const level25Stat = spiritCopy.stats.find(
          (stat) => stat && stat.level === 25
        );
        spiritCopy.stats = level25Stat ? [level25Stat] : [];
      }

      return {
        ...spiritCopy,
        level: 25,
        category: category,
        grade: spiritCopy.grade || "전설",
        faction: spiritCopy.influence || spiritCopy.faction || "결의",
      };
    });

    if (spirits.length === 0) {
      throw new Error(`No spirits found for category: ${category}`);
    }

    if (progressCallback) {
      progressCallback(5, `${category} 결속 랭킹: 환수 데이터 준비 완료`);
    }

    const MAX_COMBINATIONS = 100000;

    const startTime = Date.now();
    let combinations = [];

    if (spirits.length > 30) {
      const rankedSpirits = rankSpirits(spirits);
      const topSpirits = rankedSpirits.slice(0, 35);

      if (progressCallback) {
        progressCallback(10, `${category} 결속 랭킹: 상위 35개 환수 선택 완료`);
      }

      combinations = generateCombinationsWithLimit(
        topSpirits,
        6,
        MAX_COMBINATIONS
      );
    } else {
      combinations = generateCombinationsWithLimit(
        spirits,
        6,
        MAX_COMBINATIONS
      );
    }

    const totalCombinations = combinations.length;

    if (progressCallback) {
      progressCallback(
        15,
        `${category} 결속 랭킹: ${totalCombinations}개 조합 생성 완료`
      );
    }

    const results = [];
    let processedCount = 0;

    for (const combination of combinations) {
      const result = calculateEffectsForSpirits(combination);
      if (result) {
        results.push(result);
      }

      processedCount++;
      if (processedCount % 1000 === 0 && progressCallback) {
        const percentComplete =
          15 + Math.floor((processedCount / totalCombinations) * 80);
        progressCallback(
          percentComplete,
          `${category} 결속 랭킹: ${processedCount}/${totalCombinations} 조합 계산 중`
        );
      }
    }

    results.sort((a, b) => b.scoreWithBind - a.scoreWithBind);

    const topResults = results.slice(0, 50);

    if (progressCallback) {
      progressCallback(95, `${category} 결속 랭킹: 상위 50개 결과 선택 완료`);
    }

    rankingData.bond[category] = topResults;

    rankingMeta.bondRankings[category] = {
      count: topResults.length,
      updatedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime,
    };
    rankingMeta.lastUpdated = new Date().toISOString();

    if (progressCallback) {
      progressCallback(100, `${category} 결속 랭킹: 계산 완료`);
    }

    return {
      success: true,
      count: topResults.length,
      fileName: getCategoryFileName(category, "bond"),
    };
  }

  function generateCombinationsWithLimit(array, size, limit) {
    if (array.length > 20) {
      return generateNonRecursiveCombinations(array, size, limit);
    }

    function combine(start, current) {
      if (current.length === size) {
        return [current.slice()];
      }

      if (start >= array.length) {
        return [];
      }

      if (array.length - start < size - current.length) {
        return [];
      }

      if (result.length >= limit) {
        return [];
      }

      current.push(array[start]);
      const withCurrent = combine(start + 1, current);
      current.pop();

      const withoutCurrent = combine(start + 1, current);

      return [...withCurrent, ...withoutCurrent];
    }

    let result = [];
    const maxCombinations = Math.min(
      limit,
      binomialCoefficient(array.length, size)
    );

    if (maxCombinations > 10000) {
      return generateNonRecursiveCombinations(array, size, limit);
    }

    result = combine(0, []);
    return result.slice(0, limit);
  }

  function generateNonRecursiveCombinations(array, size, limit) {
    const result = [];
    const n = array.length;

    const indices = Array(size)
      .fill(0)
      .map((_, i) => i);

    result.push(indices.map((i) => array[i]));

    while (result.length < limit) {
      let i = size - 1;
      while (i >= 0 && indices[i] == i + n - size) {
        i--;
      }

      if (i < 0) break;

      indices[i]++;

      for (let j = i + 1; j < size; j++) {
        indices[j] = indices[j - 1] + 1;
      }

      result.push(indices.map((idx) => array[idx]));
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
    return Math.floor(result);
  }

  async function calculateLegendaryBondRankings(
    category,
    progressCallback = null
  ) {
    if (!mobData[category] || !Array.isArray(mobData[category])) {
      throw new Error(`Invalid data for category: ${category}`);
    }

    const legendarySpirits = mobData[category]
      .filter(
        (spirit) =>
          spirit.grade === "전설" ||
          (spirit.grade && spirit.grade.includes("전설"))
      )
      .map((spirit) => {
        const spiritCopy = JSON.parse(JSON.stringify(spirit));
        if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
          const level25Stat = spiritCopy.stats.find(
            (stat) => stat && stat.level === 25
          );
          spiritCopy.stats = level25Stat ? [level25Stat] : [];
        }

        return {
          ...spiritCopy,
          level: 25,
          category: category,
          grade: "전설",
          faction: spiritCopy.influence || spiritCopy.faction || "결의",
        };
      });

    if (legendarySpirits.length === 0) {
      throw new Error(`No legendary spirits found for category: ${category}`);
    }

    if (progressCallback) {
      progressCallback(
        5,
        `${category} 전설 환수 결속 랭킹: ${legendarySpirits.length}개 전설 환수 준비 완료`
      );
    }

    const MAX_COMBINATIONS = 100000;

    const startTime = Date.now();
    let combinations = [];

    if (legendarySpirits.length > 30) {
      const rankedSpirits = rankSpirits(legendarySpirits);
      const topSpirits = rankedSpirits.slice(0, 35);

      if (progressCallback) {
        progressCallback(
          10,
          `${category} 전설 환수 결속 랭킹: 상위 35개 전설 환수 선택 완료`
        );
      }

      combinations = generateCombinationsWithLimit(
        topSpirits,
        6,
        MAX_COMBINATIONS
      );
    } else {
      combinations = generateCombinationsWithLimit(
        legendarySpirits,
        6,
        MAX_COMBINATIONS
      );
    }

    const totalCombinations = combinations.length;

    if (progressCallback) {
      progressCallback(
        15,
        `${category} 전설 환수 결속 랭킹: ${totalCombinations}개 조합 생성 완료`
      );
    }

    const results = [];
    let processedCount = 0;

    for (const combination of combinations) {
      const result = calculateEffectsForSpirits(combination);
      if (result) {
        results.push(result);
      }

      processedCount++;
      if (processedCount % 1000 === 0 && progressCallback) {
        const percentComplete =
          15 + Math.floor((processedCount / totalCombinations) * 80);
        progressCallback(
          percentComplete,
          `${category} 전설 환수 결속 랭킹: ${processedCount}/${totalCombinations} 조합 계산 중`
        );
      }
    }

    results.sort((a, b) => b.scoreWithBind - a.scoreWithBind);

    const topResults = results.slice(0, 50);

    if (progressCallback) {
      progressCallback(
        95,
        `${category} 전설 환수 결속 랭킹: 상위 50개 결과 선택 완료`
      );
    }

    const categoryName = getCategoryFileName(category, "bond").replace(
      "bond-rankings-",
      ""
    );
    const fileName = `legendary-bond-rankings-${categoryName}`;

    const jsonData = {
      category: category,
      type: "legendary-only",
      updatedAt: new Date().toISOString(),
      rankings: topResults,
    };

    downloadJsonFile(jsonData, fileName);

    if (progressCallback) {
      progressCallback(100, `${category} 전설 환수 결속 랭킹: 계산 완료`);
    }

    return {
      success: true,
      count: topResults.length,
      fileName: fileName,
    };
  }

  async function calculateAndStoreLegendaryBondRankings(
    category,
    progressCallback
  ) {
    try {
      const result = await calculateLegendaryBondRankings(
        category,
        progressCallback
      );

      return {
        success: true,
        count: result.count,
        fileName: result.fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing legendary bond rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async function calculateStatRankings(category, progressCallback = null) {
    if (!mobData[category] || !Array.isArray(mobData[category])) {
      throw new Error(`Invalid data for category: ${category}`);
    }

    const spirits = mobData[category]
      .filter((spirit) => spirit && spirit.stats && Array.isArray(spirit.stats))
      .map((spirit) => {
        const spiritCopy = { ...spirit };
        if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
          const level25Stat = spiritCopy.stats.find(
            (stat) => stat && stat.level === 25
          );
          spiritCopy.stats = level25Stat ? [level25Stat] : [];
        }
        return spiritCopy;
      });

    if (spirits.length === 0) {
      throw new Error(`No valid spirits found for category: ${category}`);
    }

    if (progressCallback) {
      progressCallback(10, `${category} 능력치 랭킹: 환수 데이터 준비 완료`);
    }

    const statTypes = new Set();

    spirits.forEach((spirit) => {
      const level25Stat = spirit.stats?.[0];
      if (level25Stat) {
        if (level25Stat.registrationStat) {
          Object.keys(level25Stat.registrationStat).forEach((key) => {
            const normalizedKey = normalizeStatKey(key);
            statTypes.add(normalizedKey);
          });
        }

        if (level25Stat.bindStat) {
          Object.keys(level25Stat.bindStat).forEach((key) => {
            const normalizedKey = normalizeStatKey(key);
            statTypes.add(normalizedKey);
          });
        }
      }
    });

    const statArray = Array.from(statTypes);

    if (progressCallback) {
      progressCallback(
        20,
        `${category} 능력치 랭킹: ${statArray.length}개 능력치 유형 감지됨`
      );
    }

    const statRankings = {};
    let processedStats = 0;
    const totalStats = statArray.length;

    for (const statType of statArray) {
      const spiritRankings = [];

      spirits.forEach((spirit) => {
        const level25Stat = spirit.stats?.[0];
        if (!level25Stat) return;

        let statValue = 0;

        if (level25Stat.registrationStat) {
          for (const [key, value] of Object.entries(
            level25Stat.registrationStat
          )) {
            if (normalizeStatKey(key) === statType) {
              statValue += ensureNumber(value);
            }
          }
        }

        if (level25Stat.bindStat) {
          for (const [key, value] of Object.entries(level25Stat.bindStat)) {
            if (normalizeStatKey(key) === statType) {
              statValue += ensureNumber(value);
            }
          }
        }

        if (statValue > 0) {
          spiritRankings.push({
            name: spirit.name,
            image: spirit.image,
            influence: spirit.influence || spirit.faction || "결의",
            grade: spirit.grade || "전설",
            value: statValue,
          });
        }
      });

      spiritRankings.sort((a, b) => b.value - a.value);

      if (spiritRankings.length > 0) {
        statRankings[statType] = spiritRankings;
      }

      processedStats++;
      if (progressCallback) {
        const percentComplete =
          20 + Math.floor((processedStats / totalStats) * 75);
        progressCallback(
          percentComplete,
          `${category} 능력치 랭킹: ${processedStats}/${totalStats} 능력치 계산 중`
        );
      }
    }

    rankingData.stat[category] = statRankings;

    rankingMeta.statRankings[category] = {
      statCount: Object.keys(statRankings).length,
      updatedAt: new Date().toISOString(),
    };
    rankingMeta.lastUpdated = new Date().toISOString();

    if (progressCallback) {
      progressCallback(100, `${category} 능력치 랭킹: 계산 완료`);
    }

    return {
      success: true,
      stats: Object.keys(statRankings).length,
      fileName: getCategoryFileName(category, "stat"),
    };
  }

  function calculateEffectsForSpirits(spirits) {
    const registrationStats = {};
    const bindStats = {};
    const missingDataSpirits = [];
    const missingBindDataSpirits = [];
    const categoryGradeCount = {};
    const categoryFactionCount = {};

    spirits.forEach((spirit) => {
      const levelStats = spirit.stats?.[0]?.registrationStat;

      if (levelStats) {
        Object.entries(levelStats).forEach(([stat, value]) => {
          const numValue = ensureNumber(value);
          if (numValue !== 0) {
            const normalizedStat = normalizeStatKey(stat);
            registrationStats[normalizedStat] =
              (registrationStats[normalizedStat] || 0) + numValue;
          }
        });
      } else {
        missingDataSpirits.push(spirit.name);
      }

      let bindLevelStats = null;
      bindLevelStats = spirit.stats?.[0]?.bindStat;

      if (bindLevelStats) {
        Object.entries(bindLevelStats).forEach(([stat, value]) => {
          const numValue = ensureNumber(value);
          if (numValue !== 0) {
            const normalizedStat = normalizeStatKey(stat);
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
        ensureNumber(combinedEffects[stat]) + ensureNumber(value);
    });

    Object.entries(factionEffects).forEach(([stat, value]) => {
      combinedEffects[stat] =
        ensureNumber(combinedEffects[stat]) + ensureNumber(value);
    });

    const combinedEffectsWithBind = { ...combinedEffects };

    Object.entries(bindStats).forEach(([stat, value]) => {
      combinedEffectsWithBind[stat] =
        ensureNumber(combinedEffectsWithBind[stat]) + ensureNumber(value);
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
      const categoryEffects = GRADE_SET_EFFECTS[category];
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
      if (!FACTION_SET_EFFECTS[category]) {
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

        if (count < 2 || !FACTION_SET_EFFECTS[category][faction]) {
          continue;
        }

        let maxEffectCount = 0;
        let maxEffect = null;

        for (const effect of FACTION_SET_EFFECTS[category][faction]) {
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
    const damageResistancePenetration = ensureNumber(
      effects.damageResistancePenetration
    );
    const damageResistance = ensureNumber(effects.damageResistance);
    const pvpDamagePercent = ensureNumber(effects.pvpDamagePercent) * 10;
    const pvpDefensePercent = ensureNumber(effects.pvpDefensePercent) * 10;

    return (
      damageResistancePenetration +
      damageResistance +
      pvpDamagePercent +
      pvpDefensePercent
    );
  }

  function rankSpirits(spirits) {
    return spirits
      .map((spirit) => {
        const level25Stat = spirit.stats?.[0];
        let regStats = level25Stat?.registrationStat || {};
        let bindStats = level25Stat?.bindStat || {};

        const dpr =
          ensureNumber(regStats.damageResistancePenetration) +
          ensureNumber(bindStats.damageResistancePenetration);
        const dr =
          ensureNumber(regStats.damageResistance) +
          ensureNumber(bindStats.damageResistance);
        const pvpDmg =
          ensureNumber(regStats.pvpDamagePercent) * 10 +
          ensureNumber(bindStats.pvpDamagePercent) * 10;
        const pvpDef =
          ensureNumber(regStats.pvpDefensePercent) * 10 +
          ensureNumber(bindStats.pvpDefensePercent) * 10;

        const score = dpr + dr + pvpDmg + pvpDef;

        return {
          ...spirit,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async function calculateAllRankings(progressCallback = null) {
    const categories = ["수호", "탑승", "변신"];
    let results = [];

    for (const category of categories) {
      try {
        await calculateBondRankings(category, (percent, message) => {
          if (progressCallback) {
            progressCallback(percent, `${category} 결속 랭킹: ${message}`);
          }
        });

        results.push({
          category,
          type: "bond",
          success: true,
        });
      } catch (error) {
        console.error(
          `Error calculating bond rankings for ${category}:`,
          error
        );
        results.push({
          category,
          type: "bond",
          success: false,
          error: error.message,
        });
      }

      try {
        await calculateStatRankings(category, (percent, message) => {
          if (progressCallback) {
            progressCallback(percent, `${category} 능력치 랭킹: ${message}`);
          }
        });

        results.push({
          category,
          type: "stat",
          success: true,
        });
      } catch (error) {
        console.error(
          `Error calculating stat rankings for ${category}:`,
          error
        );
        results.push({
          category,
          type: "stat",
          success: false,
          error: error.message,
        });
      }
    }

    await saveRankingData();

    return results;
  }

  async function saveToFirebase(data, fileName) {
    try {
      if (
        typeof firebase === "undefined" ||
        !firebase.apps ||
        !firebase.apps.length
      ) {
        console.warn("Firebase not available for saving data");
        return false;
      }

      const optimizedData = optimizeDataForStorage(data);

      const jsonSize = JSON.stringify(optimizedData).length;
      if (jsonSize > 1000000) {
        if (window.addLogEntry) {
          window.addLogEntry(
            `경고: 최적화 후에도 데이터 크기가 큽니다: ${(
              jsonSize /
              1024 /
              1024
            ).toFixed(2)}MB`,
            "warning"
          );
        }

        if (optimizedData.rankings && Array.isArray(optimizedData.rankings)) {
          let reducedCount = optimizedData.rankings.length;
          while (
            JSON.stringify({
              ...optimizedData,
              rankings: optimizedData.rankings.slice(0, reducedCount),
            }).length > 1000000 &&
            reducedCount > 10
          ) {
            reducedCount = Math.floor(reducedCount * 0.8);
          }

          optimizedData.rankings = optimizedData.rankings.slice(
            0,
            reducedCount
          );
          if (window.addLogEntry) {
            window.addLogEntry(
              `Firebase 크기 제한으로 인해 랭킹이 ${reducedCount}개로 제한됨`,
              "warning"
            );
          }
        }
      }

      const db = firebase.firestore();

      try {
        const docRef = db.collection("mobRankingData").doc(fileName);
        await docRef.set(optimizedData);
        if (window.addLogEntry) {
          window.addLogEntry(
            `${fileName} Firebase에 저장 성공 (최적화됨)`,
            "success"
          );
        }
        return true;
      } catch (error) {
        if (window.addLogEntry) {
          window.addLogEntry(`Firebase 저장 오류: ${error.message}`, "error");
        }

        if (error.message.includes("exceeds the maximum allowed size")) {
          if (window.addLogEntry) {
            window.addLogEntry(
              "크기 제한으로 인해 추가 최적화 시도 중...",
              "warning"
            );
          }

          if (optimizedData.rankings && optimizedData.rankings.length > 10) {
            optimizedData.rankings = optimizedData.rankings.slice(0, 10);
            optimizedData.limitedDueToSize = true;

            try {
              await db
                .collection("mobRankingData")
                .doc(fileName)
                .set(optimizedData);
              if (window.addLogEntry) {
                window.addLogEntry(
                  `${fileName} 상위 10개 결과만 Firebase에 저장됨`,
                  "success"
                );
              }
              return true;
            } catch (innerError) {
              if (window.addLogEntry) {
                window.addLogEntry(
                  `최종 시도도 실패: ${innerError.message}`,
                  "error"
                );
              }
            }
          }
        }

        return false;
      }
    } catch (error) {
      console.error(`Error saving ${fileName} to Firebase:`, error);
      return false;
    }
  }

  async function saveRankingData() {
    const categories = ["수호", "탑승", "변신"];

    downloadJsonFile(rankingMeta, "rankings-meta");
    saveToFirebase(rankingMeta, "rankings-meta");

    for (const category of categories) {
      const fileName = getCategoryFileName(category, "bond");
      const data = {
        category: category,
        updatedAt: rankingMeta.bondRankings[category].updatedAt,
        rankings: rankingData.bond[category] || [],
      };

      downloadJsonFile(data, fileName);
      saveToFirebase(data, fileName);
    }

    for (const category of categories) {
      const fileName = getCategoryFileName(category, "stat");
      const data = {
        category: category,
        updatedAt: rankingMeta.statRankings[category].updatedAt,
        rankings: rankingData.stat[category] || {},
      };

      downloadJsonFile(data, fileName);
      saveToFirebase(data, fileName);
    }
  }

  function getCategoryFileName(category, type) {
    const categoryMap = {
      수호: "guardian",
      탑승: "ride",
      변신: "transform",
    };

    const prefix = type === "bond" ? "bond-rankings" : "stat-rankings";
    return `${prefix}-${categoryMap[category]}`;
  }

  function downloadJsonFile(data, fileName) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 100);

    saveToFirebase(data, fileName).then((success) => {
      if (success) {
        if (window.addLogEntry) {
          window.addLogEntry(`${fileName} Firebase에 저장 완료`, "success");
        }
      } else {
        if (window.addLogEntry) {
          window.addLogEntry(`${fileName} Firebase 저장 실패`, "warning");
        }
      }
    });
  }

  async function calculateAndStoreBondRankings(category, progressCallback) {
    try {
      await calculateBondRankings(category, progressCallback);

      const fileName = getCategoryFileName(category, "bond");
      const data = {
        category: category,
        updatedAt: rankingMeta.bondRankings[category].updatedAt,
        rankings: rankingData.bond[category] || [],
      };

      downloadJsonFile(data, fileName);
      // console.log(
      //   `Storing ${rankingData.bond[category].length} rankings for ${category}`
      // );
      return {
        success: true,
        count: rankingData.bond[category].length,
        fileName: fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing bond rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async function calculateAndStoreStatRankings(category, progressCallback) {
    try {
      await calculateStatRankings(category, progressCallback);

      const fileName = getCategoryFileName(category, "stat");
      const data = {
        category: category,
        updatedAt: rankingMeta.statRankings[category].updatedAt,
        rankings: rankingData.stat[category] || {},
      };

      downloadJsonFile(data, fileName);

      return {
        success: true,
        stats: Object.keys(rankingData.stat[category]).length,
        fileName: fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing stat rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async function downloadAllRankingsAsZip() {
    try {
      const zip = new JSZip();

      zip.file("rankings-meta.json", JSON.stringify(rankingMeta, null, 2));
      saveToFirebase(rankingMeta, "rankings-meta");

      for (const category of ["수호", "탑승", "변신"]) {
        const fileName = `${getCategoryFileName(category, "bond")}.json`;
        const data = {
          category: category,
          updatedAt: rankingMeta.bondRankings[category].updatedAt,
          rankings: rankingData.bond[category] || [],
        };

        zip.file(fileName, JSON.stringify(data, null, 2));
        saveToFirebase(data, getCategoryFileName(category, "bond"));
      }

      for (const category of ["수호", "탑승", "변신"]) {
        const fileName = `${getCategoryFileName(category, "stat")}.json`;
        const data = {
          category: category,
          updatedAt: rankingMeta.statRankings[category].updatedAt,
          rankings: rankingData.stat[category] || {},
        };

        zip.file(fileName, JSON.stringify(data, null, 2));
        saveToFirebase(data, getCategoryFileName(category, "stat"));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `spirit-rankings-${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      if (window.addLogEntry) {
        window.addLogEntry(
          "모든 랭킹 데이터가 Firebase에 저장되었습니다",
          "success"
        );
      }

      return true;
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      return false;
    }
  }

  return {
    loadAllData,
    calculateBondRankings,
    calculateStatRankings,
    calculateAllRankings,
    calculateAndStoreBondRankings,
    calculateAndStoreStatRankings,
    calculateLegendaryBondRankings,
    calculateAndStoreLegendaryBondRankings,
    downloadAllRankingsAsZip,
    saveRankingData,
  };
})();

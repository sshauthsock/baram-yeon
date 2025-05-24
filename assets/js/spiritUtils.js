const SpiritUtils = (function () {
  const FIXED_LEVEL25_SPIRITS = window.CommonData.FIXED_LEVEL25_SPIRITS || [];

  function ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  function normalizeStatKey(key) {
    return key.replace(/\d+$/, "");
  }

  function hasAnyBindStats(spirit) {
    if (!spirit || !spirit.stats || !Array.isArray(spirit.stats)) return false;

    const levelStat = spirit.stats.find((s) => s && s.level === spirit.level);
    if (
      levelStat &&
      levelStat.bindStat &&
      Object.keys(levelStat.bindStat).length > 0
    ) {
      return true;
    }

    if (spirit.hasLevel25Bind) {
      const level25Stat = spirit.stats.find((s) => s && s.level === 25);
      if (
        level25Stat &&
        level25Stat.bindStat &&
        Object.keys(level25Stat.bindStat).length > 0
      ) {
        return true;
      }
    }

    return false;
  }

  function countSpiritsWithBindStats(result) {
    if (!result || !result.spirits) return 0;
    return result.spirits.filter((spirit) => hasAnyBindStats(spirit)).length;
  }

  function isFixedLevelSpirit(spiritName) {
    return FIXED_LEVEL25_SPIRITS.includes(spiritName);
  }

  function checkSpiritData(spirit, statNames) {
    if (!spirit || !spirit.stats || !Array.isArray(spirit.stats)) return false;

    for (const levelStat of spirit.stats) {
      if (!levelStat.registrationStat) continue;

      for (const stat in levelStat.registrationStat) {
        const normalizedStat = normalizeStatKey(stat);
        const displayName =
          window.CommonData.STATS_MAPPING[normalizedStat] || normalizedStat;

        if (statNames.includes(displayName)) {
          return true;
        }
      }
    }

    return false;
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

  return {
    ensureNumber,
    normalizeStatKey,
    hasAnyBindStats,
    countSpiritsWithBindStats,
    isFixedLevelSpirit,
    checkSpiritData,
    countGradeInResult,
    countGradeTypesInResult,
  };
})();

window.SpiritUtils = SpiritUtils;

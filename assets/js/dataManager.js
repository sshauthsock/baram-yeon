const DataManager = (function () {
  const CATEGORY_FILE_MAP = window.CommonData.CATEGORY_FILE_MAP;
  const FACTION_ICONS = window.CommonData.FACTION_ICONS;
  const STATS_MAPPING = window.CommonData.STATS_MAPPING;
  const STATS_ORDER = window.CommonData.STATS_ORDER || [];
  const SPECIAL_STAT_CLASSES = window.CommonData.SPECIAL_STAT_CLASSES;
  let mobData = { 수호: [], 탑승: [], 변신: [] };

  async function loadCategoryData() {
    let allLoaded = true;

    for (const [category, files] of Object.entries(CATEGORY_FILE_MAP)) {
      try {
        const registrationData = await loadRegistrationData(files.registration);
        const bindData = await loadBindData(files.bind);

        if (
          !validateData(registrationData, "registration", category) ||
          !validateData(bindData, "bind", category)
        ) {
          allLoaded = false;
          continue;
        }

        const mergedData = mergeData(registrationData, bindData);
        mobData[category] = mergedData;
      } catch (err) {
        console.error(
          `Failed to load or process data for category ${category}:`,
          err
        );
        mobData[category] = [];
        allLoaded = false;
      }
    }

    return mobData;
  }

  async function loadRegistrationData(fileName) {
    if (!fileName) return [];
    const data = await FirebaseHandler.getFirestoreDocument(fileName);
    return processRegistrationData(data);
  }

  async function loadBindData(fileName) {
    if (!fileName) return [];
    const data = await FirebaseHandler.getFirestoreDocument(fileName);
    return processBindData(data);
  }

  function processRegistrationData(data) {
    return Array.isArray(data) ? data : data?.data || [];
  }

  function processBindData(data) {
    return Array.isArray(data) ? data : data?.data || [];
  }

  function validateData(data, type, category) {
    if (!Array.isArray(data)) {
      console.error(
        `Invalid ${type} data format for ${category}: Expected array, got ${typeof data}. Using empty array.`
      );
      return false;
    }

    if (data.length === 0) {
      console.warn(`No ${type} data loaded for category: ${category}`);
    }

    return true;
  }

  function mergeData(registrationArray, bindArray) {
    return registrationArray
      .map((regItem) => {
        if (!isValidItem(regItem)) return null;

        const bindItem = bindArray.find((b) => b && b.name === regItem.name);
        const regStats = Array.isArray(regItem.stats) ? regItem.stats : [];
        const bindStats =
          bindItem && Array.isArray(bindItem.stats) ? bindItem.stats : [];

        const mergedStats = createMergedStats(regStats, bindStats);

        return {
          ...regItem,
          stats: mergedStats,
          influence: regItem.influence || "정보없음",
        };
      })
      .filter((item) => item !== null);
  }

  function isValidItem(item) {
    return item && typeof item === "object" && item.name;
  }

  function createMergedStats(regStats, bindStats) {
    return Array.from({ length: 26 }, (_, i) => {
      const level = i;
      const regLevelStat = regStats.find((s) => s && s.level === level);
      const bindLevelStat = bindStats.find((s) => s && s.level === level);

      return {
        level: level,
        registrationStat: regLevelStat?.registrationStat || {},
        bindStat: bindLevelStat?.bindStat || {},
      };
    });
  }

  function checkSpiritStats(spirit) {
    if (!spirit || !spirit.stats)
      return { hasFullRegistration: false, hasFullBind: false };

    const hasFullRegistration = checkAllLevelsHaveEffect(
      spirit.stats,
      "registrationStat"
    );
    const hasFullBind = checkAllLevelsHaveEffect(spirit.stats, "bindStat");

    return { hasFullRegistration, hasFullBind };
  }

  function checkAllLevelsHaveEffect(stats, effectType) {
    if (!stats || !Array.isArray(stats) || stats.length === 0) return false;

    for (let i = 0; i <= 25; i++) {
      const levelStat = stats.find((s) => s && s.level === i);
      if (!hasEffectAtLevel(levelStat, effectType)) {
        return false;
      }
    }
    return true;
  }

  function hasEffectAtLevel(levelStat, effectType) {
    return (
      levelStat &&
      levelStat[effectType] &&
      typeof levelStat[effectType] === "object" &&
      Object.keys(levelStat[effectType]).length > 0
    );
  }

  function hasLevel25BindStats(item) {
    if (!item || !Array.isArray(item.stats)) return false;

    const level25Stat = getLevelStat(item, 25);
    return hasEffectAtLevel(level25Stat, "bindStat");
  }

  function getLevelStat(item, level) {
    if (!item || !Array.isArray(item.stats)) return null;
    return item.stats.find((s) => s && s.level === level);
  }

  function getItemByName(category, name) {
    const items = mobData[category] || [];
    return items.find((item) => item && item.name === name) || null;
  }

  function getData(category) {
    return mobData[category] || [];
  }

  function getAllData() {
    return mobData;
  }

  return {
    loadCategoryData,
    getData,
    getAllData,
    checkSpiritStats,
    checkAllLevelsHaveEffect,
    hasLevel25BindStats,
    getLevelStat,
    getItemByName,
    FACTION_ICONS,
    STATS_MAPPING,
    STATS_ORDER,
    SPECIAL_STAT_CLASSES,
  };
})();

window.DataManager = DataManager;

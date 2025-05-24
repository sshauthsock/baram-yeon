const ConfigManager = (function () {
  const defaultConfig = {
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    DEFAULT_CATEGORY: "수호",
    MAX_LEVEL: 25,
    DEBUG_MODE: false,
    IMAGE_LAZY_LOAD_THRESHOLD: 100,
  };

  let currentConfig = { ...defaultConfig };

  function get(key) {
    return currentConfig[key];
  }

  function set(key, value) {
    if (key in defaultConfig) {
      currentConfig[key] = value;
      return true;
    }
    return false;
  }

  function getAll() {
    return { ...currentConfig };
  }

  function reset() {
    currentConfig = { ...defaultConfig };
  }

  function loadFromStorage() {
    try {
      const savedConfig = localStorage.getItem("app_config");
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        Object.keys(parsedConfig).forEach((key) => {
          if (key in defaultConfig) {
            currentConfig[key] = parsedConfig[key];
          }
        });
      }
    } catch (e) {
      console.error("Failed to load config from storage:", e);
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem("app_config", JSON.stringify(currentConfig));
    } catch (e) {
      console.error("Failed to save config to storage:", e);
    }
  }

  return {
    get,
    set,
    getAll,
    reset,
    loadFromStorage,
    saveToStorage,
  };
})();

window.ConfigManager = ConfigManager;

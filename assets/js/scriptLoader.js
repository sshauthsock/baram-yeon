// assets/js/scriptLoader.js
const ScriptLoader = {
  dependencies: {},
  loaded: {},

  require: function (name, deps, callback) {
    this.dependencies[name] = deps;

    // 의존성 확인 함수
    const checkDeps = () => {
      for (let dep of deps) {
        if (typeof window[dep] === "undefined") {
          return false;
        }
      }
      return true;
    };

    // 의존성 준비되면 콜백 실행
    const waitForDeps = () => {
      if (checkDeps()) {
        this.loaded[name] = true;
        if (typeof callback === "function") {
          callback();
        }
      } else {
        setTimeout(waitForDeps, 100);
      }
    };

    waitForDeps();
  },

  load: function (url, callback) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;

    script.onload = function () {
      if (typeof callback === "function") {
        callback();
      }
    };

    script.onerror = function () {
      console.error("Failed to load script:", url);
    };

    document.head.appendChild(script);
  },
};

window.ScriptLoader = ScriptLoader;

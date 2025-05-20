const ComponentLoader = {
  loadComponent: function (elementId, componentUrl) {
    const element = document.getElementById(elementId);
    if (!element) return;

    fetch(componentUrl)
      .then((response) => response.text())
      .then((html) => {
        element.innerHTML = html;
        this.activateCurrentTab();
      })
      .catch((error) => console.error("Component loading error:", error));
  },

  activateCurrentTab: function () {
    const currentPage = window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");
    const tabId = currentPage + "-tab";
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.classList.add("active");
    }
  },

  init: function () {
    this.loadComponent("header-container", "/components/header.html");
    this.loadComponent("footer-container", "/components/footer.html");
    this.loadComponent("ads-top", "/components/ad-units.html");
    this.loadComponent("ads-bottom", "/components/ad-units-bottom.html");

    if (document.getElementById("subtabs-container")) {
      this.loadComponent("subtabs-container", "/components/subtabs.html");
    }
  },
};

window.ComponentLoader = ComponentLoader;

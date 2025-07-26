const FirebaseHandlerWrapper = {
  init: function () {
    if (typeof FirebaseHandler === "undefined") {
      console.warn("FirebaseHandler not available yet, waiting...");
      setTimeout(() => this.init(), 100);
      return;
    }

    if (typeof firebaseConfig === "undefined") {
      console.warn(
        "firebaseConfig가 정의되지 않았습니다. 기본 설정을 사용합니다."
      );
      window.firebaseConfig = {
        apiKey: "placeholder-api-key",
        authDomain: "placeholder-domain.firebaseapp.com",
        projectId: "placeholder-project",
        storageBucket: "placeholder.appspot.com",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:0000000000000000000000",
      };
    }

    FirebaseHandler.initFirebase();

    FirebaseHandler.testFirebaseConnectivity()
      .then((connected) => {
        // console.log(
        //   "Firebase connectivity test result:",
        //   connected ? "Connected" : "Not connected"
        // );
        document.dispatchEvent(
          new CustomEvent("firebase:ready", { detail: { connected } })
        );
      })
      .catch((err) => {
        console.error("Firebase connectivity test failed:", err);
        document.dispatchEvent(
          new CustomEvent("firebase:error", { detail: { error: err } })
        );
      });
  },
};

document.addEventListener("DOMContentLoaded", function () {
  if (typeof FirebaseHandler !== "undefined") {
    FirebaseHandlerWrapper.init();
  } else {
    let checkInterval = setInterval(() => {
      if (typeof FirebaseHandler !== "undefined") {
        clearInterval(checkInterval);
        FirebaseHandlerWrapper.init();
      }
    }, 100);

    setTimeout(() => clearInterval(checkInterval), 5000);
  }
});

window.FirebaseHandlerWrapper = FirebaseHandlerWrapper;

const VisitCounter = {
  init: function () {
    if (!window.FirebaseHandler) return;

    const pageName =
      window.location.pathname.split("/").pop().replace(".html", "") || "info";
    this.updateVisitCount(pageName);
  },

  updateVisitCount: function (pageName) {
    if (!FirebaseHandler.db) return;

    const db = firebase.firestore();
    const counterRef = db.collection("pageVisits").doc(pageName);

    db.runTransaction((transaction) => {
      return transaction.get(counterRef).then((doc) => {
        if (!doc.exists) {
          transaction.set(counterRef, { count: 1 });
        } else {
          const newCount = doc.data().count + 1;
          transaction.update(counterRef, { count: newCount });
        }
      });
    }).catch((error) => {
      console.error("Counter update error:", error);
    });
  },
};

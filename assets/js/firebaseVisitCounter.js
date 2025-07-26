const FirebaseVisitCounter = (function () {
  firebase.initializeApp(firebaseCountConfig);

  const pageUrl = window.location.pathname;
  const sanitizedPath = pageUrl.replace(/[.#$[\]]/g, "_");
  const visitsRef = firebase.database().ref("pageviews/" + sanitizedPath);

  visitsRef.transaction(function (currentCount) {
    return (currentCount || 0) + 1;
  });

  visitsRef.on("value", function (snapshot) {
    // console.log('현재 페이지 방문수: ' + snapshot.val());
  });
})();

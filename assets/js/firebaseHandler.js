const FirebaseHandler = (function () {
  let db = null;
  const DOCUMENT_MAP = window.CommonData.DOCUMENT_MAP || {};

  function initFirebase() {
    if (typeof firebase === "undefined" || !firebase.app) {
      // console.error("Firebase SDK not loaded or initialized.");
      return;
    }
    if (!firebase.apps.length) {
      try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        // console.log("Firebase initialized successfully.");
      } catch (e) {
        // console.error("Firebase initialization error:", e);
        db = null;
      }
    } else {
      db = firebase.app().firestore();
    }
  }

  async function checkFirebaseConnection() {
    if (!db) {
      // console.warn("Firestore not available, skipping connection check.");
      return false;
    }
    if (Object.keys(DOCUMENT_MAP).length === 0) {
      // console.warn(
      //   "DOCUMENT_MAP is empty, cannot test Firebase connection effectively."
      // );
      return false;
    }
    try {
      const testDocId = Object.values(DOCUMENT_MAP)[0];
      if (!testDocId) {
        // console.warn(
        //   "No document ID found in DOCUMENT_MAP for connection test."
        // );
        return false;
      }
      const docSnap = await db
        .collection("jsonData")
        .doc(testDocId)
        .get({ source: "server" });
      // console.log(
      //   `Firebase connection test to doc ${testDocId}: Exists = ${docSnap.exists}`
      // );
      return true;
    } catch (error) {
      console.error("Firebase connection test failed:", error);
      return false;
    }
  }

  async function testFirebaseConnectivity() {
    const isConnected = await checkFirebaseConnection();
    if (!isConnected) {
      console.warn(
        "Warning: Firebase connection test failed or Firestore unavailable. Relying on cache/local files."
      );
    }
  }

  async function getFirestoreDocument(fileName) {
    const docId = DOCUMENT_MAP[fileName + ".json"];
    // console.log(`Fetching document ID for ${fileName}: ${docId}`);
    const cachedKey = `firestore_${fileName}`;
    const cachedTimeKey = `${cachedKey}_time`;
    const cacheExpiry = 24 * 60 * 60 * 1000;

    const cachedData = localStorage.getItem(cachedKey);
    const cachedTime = localStorage.getItem(cachedTimeKey);
    if (
      cachedData &&
      cachedTime &&
      Date.now() - parseInt(cachedTime) < cacheExpiry
    ) {
      try {
        // console.log(`Using cached data for ${fileName}`);
        return JSON.parse(cachedData);
      } catch (e) {
        localStorage.removeItem(cachedKey);
        localStorage.removeItem(cachedTimeKey);
      }
    }

    // console.log("Firestore is available:", db);
    // console.log("Document ID:", docId);

    if (db && docId) {
      try {
        // console.log(`Fetching ${fileName} from Firestore (docId: ${docId})`);
        const docRef = await db.collection("jsonData").doc(docId).get();

        if (docRef.exists) {
          const data = docRef.data();
          if (data) {
            // console.log(`Successfully loaded ${fileName} from Firestore`);
            localStorage.setItem(cachedKey, JSON.stringify(data));
            localStorage.setItem(cachedTimeKey, Date.now().toString());
            return data;
          }
        }

        console.warn(`Document ${docId} not found or empty`);
      } catch (error) {
        console.error(`Firestore error for ${fileName}:`, error);
      }
    }

    // Firebase에서 실패하면 빈 데이터 반환
    console.warn(`Failed to load ${fileName} from all sources`);
    return { data: [] };
  }

  return {
    initFirebase,
    testFirebaseConnectivity,
    getFirestoreDocument,
  };
})();

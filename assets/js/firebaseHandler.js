const FirebaseHandler = (function () {
  let db = null;
  const DOCUMENT_MAP = window.CommonData.DOCUMENT_MAP || {};
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

  function initFirebase() {
    if (typeof firebase === "undefined" || !firebase.app) {
      return;
    }

    if (!firebase.apps.length) {
      try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
      } catch (e) {
        handleFirestoreError("initialization", e);
        db = null;
      }
    } else {
      db = firebase.app().firestore();
    }
  }

  function checkFirebaseConnection() {
    if (!db || Object.keys(DOCUMENT_MAP).length === 0) {
      return Promise.resolve(false);
    }

    try {
      const testDocId = Object.values(DOCUMENT_MAP)[0];
      if (!testDocId) {
        return Promise.resolve(false);
      }

      return db
        .collection("jsonData")
        .doc(testDocId)
        .get({ source: "server" })
        .then((docSnap) => !!docSnap.exists)
        .catch(() => false);
    } catch (error) {
      return Promise.resolve(false);
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

  // async function getFirestoreDocument(fileName) {
  //   const cachedKey = `firestore_${fileName}`;
  //   const cachedTimeKey = `${cachedKey}_time`;

  //   const cachedData = loadCache(cachedKey);
  //   if (cachedData && isCacheValid(cachedTimeKey)) {
  //     return cachedData;
  //   }

  //   const docId = DOCUMENT_MAP[fileName + ".json"];
  //   if (db && docId) {
  //     try {
  //       const docRef = await db.collection("jsonData").doc(docId).get();

  //       if (docRef.exists) {
  //         const data = docRef.data();
  //         if (data) {
  //           saveCache(cachedKey, cachedTimeKey, data);
  //           return data;
  //         }
  //       }
  //     } catch (error) {
  //       handleFirestoreError(fileName, error);
  //     }
  //   }

  //   return { data: [] };
  // }

  // rankingManager.js - getFirestoreDocument 메소드 개선
  async function getFirestoreDocument(fileName) {
    const cachedKey = `firestore_${fileName}`;
    const cachedTimeKey = `${cachedKey}_time`;

    try {
      // 캐시된 데이터가 있고 유효한지 확인
      const cachedData = loadCache(cachedKey);
      if (cachedData && isCacheValid(cachedTimeKey)) {
        console.log(`캐시에서 ${fileName} 로드됨`);
        return cachedData;
      }

      const docId = DOCUMENT_MAP[fileName + ".json"];
      if (db && docId) {
        try {
          console.log(`Firestore에서 ${fileName} 로드 시도`);
          const docRef = await db.collection("jsonData").doc(docId).get();

          if (docRef.exists) {
            const data = docRef.data();
            if (data) {
              console.log(`Firestore에서 ${fileName} 성공적으로 로드됨`);
              saveCache(cachedKey, cachedTimeKey, data);
              return data;
            }
          }

          console.log(`Firestore에서 ${fileName} 문서가 존재하지 않음`);
        } catch (error) {
          // 에러 핸들링을 더 자세하게
          console.error(`Firestore에서 ${fileName} 로드 중 오류:`, error);
          // 네트워크 오류 시 조용히 캐시된 데이터로 폴백
          const lastCache = loadCache(cachedKey);
          if (lastCache) {
            console.log(`네트워크 오류로 인해 캐시된 ${fileName} 사용`);
            return lastCache;
          }
        }
      }

      // 파이어스토어 접근 실패 시 로컬 데이터 사용 시도
      console.log(`로컬 JSON에서 ${fileName} 로드 시도`);
      try {
        const response = await fetch(`${getBaseUrl()}output/${fileName}.json`);
        if (response.ok) {
          const data = await response.json();
          saveCache(cachedKey, cachedTimeKey, data);
          console.log(`로컬 JSON에서 ${fileName} 로드 성공`);
          return data;
        }
      } catch (localError) {
        console.warn(`로컬 JSON에서 ${fileName} 로드 실패:`, localError);
      }

      console.warn(
        `${fileName}에 대한 모든 데이터 소스 로드 실패, 빈 데이터 반환`
      );
      return { data: [] };
    } catch (e) {
      console.error(`${fileName} 데이터 로드 중 치명적 오류:`, e);
      return { data: [] };
    }
  }

  function loadCache(cacheKey) {
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) return null;

    try {
      return JSON.parse(cachedData);
    } catch {
      localStorage.removeItem(cacheKey);
      return null;
    }
  }

  function saveCache(cacheKey, timeKey, data) {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(timeKey, Date.now().toString());
  }

  function isCacheValid(timeKey) {
    const cachedTime = localStorage.getItem(timeKey);
    return cachedTime && Date.now() - parseInt(cachedTime) < CACHE_EXPIRY;
  }

  function handleFirestoreError(source, error) {
    console.error(`Firestore error for ${source}:`, error);
  }

  return {
    initFirebase,
    testFirebaseConnectivity,
    getFirestoreDocument,
    checkFirebaseConnection,
  };
})();

window.FirebaseHandler = FirebaseHandler;

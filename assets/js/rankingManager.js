window.RankingManager = (function () {
  let metadata = null;

  function getBaseUrl() {
    return "/";
  }

  async function loadMetadata() {
    try {
      if (
        typeof FirebaseHandler !== "undefined" &&
        FirebaseHandler.checkFirebaseConnection
      ) {
        const isConnected = await FirebaseHandler.checkFirebaseConnection();
        if (isConnected) {
          try {
            const db = firebase.firestore();
            const doc = await db
              .collection("mobRankingData")
              .doc("rankings-meta")
              .get();

            if (doc.exists) {
              metadata = doc.data();
              return metadata;
            }
          } catch (firebaseError) {
            console.warn("Firebase 메타데이터 접근 실패:", firebaseError);
          }
        }
      }

      const response = await fetch(`${getBaseUrl()}output/rankings-meta.json`);
      if (!response.ok) {
        return createDefaultMetadata();
      }

      const text = await response.text();
      if (!text || text.trim() === "") {
        return createDefaultMetadata();
      }

      try {
        metadata = JSON.parse(text);
        return metadata;
      } catch (parseError) {
        console.error("메타데이터 파싱 오류:", parseError);
        return createDefaultMetadata();
      }
    } catch (error) {
      console.error("랭킹 메타데이터 로드 오류:", error);
      return createDefaultMetadata();
    }
  }

  function createDefaultMetadata() {
    return {
      lastUpdated: new Date().toISOString(),
      categories: ["수호", "탑승", "변신"],
      bondRankings: {
        수호: { count: 0, updatedAt: null },
        탑승: { count: 0, updatedAt: null },
        변신: { count: 0, updatedAt: null },
      },
      statRankings: {
        수호: { statCount: 0, updatedAt: null },
        탑승: { statCount: 0, updatedAt: null },
        변신: { statCount: 0, updatedAt: null },
      },
    };
  }

  async function loadBondRankings(category) {
    const categoryMap = {
      수호: "guardian",
      탑승: "ride",
      변신: "transform",
    };

    const fileName = `bond-rankings-${categoryMap[category]}`;

    try {
      if (typeof FirebaseHandler !== "undefined") {
        try {
          const data = await FirebaseHandler.getFirestoreDocument(fileName);
          if (data && (data.rankings || data.data)) {
            return data;
          }
        } catch (firebaseError) {
          console.warn(`Firebase ${fileName} 데이터 접근 실패:`, firebaseError);
        }
      }

      const response = await fetch(`${getBaseUrl()}output/${fileName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`${category} 결속 랭킹 로드 오류:`, error);
      return {
        category: category,
        updatedAt: null,
        rankings: [],
      };
    }
  }

  async function loadStatRankings(category) {
    const categoryMap = {
      수호: "guardian",
      탑승: "ride",
      변신: "transform",
    };

    const fileName = `stat-rankings-${categoryMap[category]}`;

    try {
      if (typeof FirebaseHandler !== "undefined") {
        try {
          const data = await FirebaseHandler.getFirestoreDocument(fileName);
          if (data && (data.rankings || data.data)) {
            return data;
          }
        } catch (firebaseError) {
          console.warn(`Firebase ${fileName} 데이터 접근 실패:`, firebaseError);
        }
      }

      const response = await fetch(`${getBaseUrl()}output/${fileName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`${category} 능력치 랭킹 로드 오류:`, error);
      return {
        category: category,
        updatedAt: null,
        rankings: {},
      };
    }
  }

  async function getBondRankingsByRange(category, start, count) {
    const data = await loadBondRankings(category);
    const rankings = data?.rankings || data?.data?.rankings || [];

    if (!Array.isArray(rankings)) {
      return [];
    }

    const end = Math.min(start + count, rankings.length);
    return rankings.slice(start, end);
  }

  async function getStatRankingsByRange(category, statKey, start, count) {
    const data = await loadStatRankings(category);
    const rankings =
      data?.rankings?.[statKey] || data?.data?.rankings?.[statKey] || [];

    if (!Array.isArray(rankings)) {
      return [];
    }

    const end = Math.min(start + count, rankings.length);
    return rankings.slice(start, end);
  }

  async function getBondRankingsCount(category) {
    const data = await loadBondRankings(category);
    const rankings = data?.rankings || data?.data?.rankings || [];
    return Array.isArray(rankings) ? rankings.length : 0;
  }

  async function getStatRankingsCount(category, statKey) {
    const data = await loadStatRankings(category);
    const rankings =
      data?.rankings?.[statKey] || data?.data?.rankings?.[statKey] || [];
    return Array.isArray(rankings) ? rankings.length : 0;
  }

  async function getLastUpdateTime(category, type) {
    if (!metadata) {
      await loadMetadata();
    }

    if (!metadata) return null;

    if (
      type === "bond" &&
      metadata.bondRankings &&
      metadata.bondRankings[category]
    ) {
      return metadata.bondRankings[category].updatedAt;
    } else if (
      type === "stat" &&
      metadata.statRankings &&
      metadata.statRankings[category]
    ) {
      return metadata.statRankings[category].updatedAt;
    }

    return null;
  }

  return {
    loadMetadata,
    loadBondRankings,
    loadStatRankings,
    getBondRankingsByRange,
    getStatRankingsByRange,
    getBondRankingsCount,
    getStatRankingsCount,
    getLastUpdateTime,
  };
})();

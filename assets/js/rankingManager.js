window.RankingManager = (function () {
  let metadata = null;

  function getBaseUrl() {
    return "/";
  }

  async function loadMetadata() {
    try {
      if (
        typeof firebase !== "undefined" &&
        firebase.apps &&
        firebase.apps.length
      ) {
        try {
          const db = firebase.firestore();
          const doc = await db
            .collection("mobRankingData")
            .doc("rankings-meta")
            .get();

          if (doc.exists) {
            metadata = doc.data();
            // console.log("Loaded ranking metadata from Firebase");
            return metadata;
          }
        } catch (firebaseError) {
          console.warn("Firebase access failed:", firebaseError);
        }
      }

      const response = await fetch(`${getBaseUrl()}output/rankings-meta.json`);

      if (!response.ok) {
        console.warn(
          `Metadata file not found or server returned error: ${response.status}`
        );
        return createDefaultMetadata();
      }

      const text = await response.text();

      if (!text || text.trim() === "") {
        console.warn("Metadata file is empty");
        return createDefaultMetadata();
      }

      try {
        metadata = JSON.parse(text);
        return metadata;
      } catch (parseError) {
        console.error("Error parsing metadata JSON:", parseError);
        return createDefaultMetadata();
      }
    } catch (error) {
      console.error("Error loading ranking metadata:", error);
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
      if (
        typeof firebase !== "undefined" &&
        firebase.apps &&
        firebase.apps.length
      ) {
        try {
          const db = firebase.firestore();
          const doc = await db.collection("mobRankingData").doc(fileName).get();

          if (doc.exists) {
            return doc.data();
          }
        } catch (firebaseError) {
          console.warn(
            `Firebase access failed for ${fileName}:`,
            firebaseError
          );
        }
      }

      const response = await fetch(`${getBaseUrl()}output/${fileName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error loading bond rankings for ${category}:`, error);
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
      if (
        typeof firebase !== "undefined" &&
        firebase.apps &&
        firebase.apps.length
      ) {
        try {
          const db = firebase.firestore();
          const doc = await db.collection("mobRankingData").doc(fileName).get();

          if (doc.exists) {
            return doc.data();
          }
        } catch (firebaseError) {
          console.warn(
            `Firebase access failed for ${fileName}:`,
            firebaseError
          );
        }
      }

      const response = await fetch(`${getBaseUrl()}output/${fileName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error loading stat rankings for ${category}:`, error);
      return {
        category: category,
        updatedAt: null,
        rankings: {},
      };
    }
  }

  async function getBondRankingsByRange(category, start, count) {
    const data = await loadBondRankings(category);

    if (!data || !data.rankings || !Array.isArray(data.rankings)) {
      return [];
    }

    const end = Math.min(start + count, data.rankings.length);
    return data.rankings.slice(start, end);
  }

  async function getStatRankingsByRange(category, statKey, start, count) {
    const data = await loadStatRankings(category);

    if (
      !data ||
      !data.rankings ||
      !data.rankings[statKey] ||
      !Array.isArray(data.rankings[statKey])
    ) {
      return [];
    }

    const end = Math.min(start + count, data.rankings[statKey].length);
    return data.rankings[statKey].slice(start, end);
  }

  async function getBondRankingsCount(category) {
    const data = await loadBondRankings(category);
    return data && data.rankings ? data.rankings.length : 0;
  }

  async function getStatRankingsCount(category, statKey) {
    const data = await loadStatRankings(category);
    return data && data.rankings && data.rankings[statKey]
      ? data.rankings[statKey].length
      : 0;
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

// console.log("RankingManager loaded successfully");

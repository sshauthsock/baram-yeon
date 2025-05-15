const RankingViewer = (function () {
  let currentCategory = "수호";
  let currentRankingType = "bond";
  let currentStat = "damageResistancePenetration";
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalRankings = 0;
  let rankings = {};
  let metadata = null;
  let currentGradeFilter = "all";

  let allRankingsData = {};
  let bondRankingsContainer;
  let statRankingsContainer;
  let statSelectorContainer;
  let paginationContainer;
  let rankingNotice;

  function showSpiritModal(spiritData, category) {
    // try {
    //   if (
    //     window.ModalHandler &&
    //     typeof window.ModalHandler.showInfo === "function"
    //   ) {
    //     window.ModalHandler.showInfo(
    //       category,
    //       spiritData.image,
    //       spiritData.faction || spiritData.influence
    //     );
    //     return true;
    //   }
    //   const modalOverlay = document.createElement("div");
    //   modalOverlay.className = "modal-overlay";
    //   modalOverlay.style.position = "fixed";
    //   modalOverlay.style.top = "0";
    //   modalOverlay.style.left = "0";
    //   modalOverlay.style.width = "100%";
    //   modalOverlay.style.height = "100%";
    //   modalOverlay.style.background = "rgba(0, 0, 0, 0.7)";
    //   modalOverlay.style.display = "flex";
    //   modalOverlay.style.justifyContent = "center";
    //   modalOverlay.style.alignItems = "center";
    //   modalOverlay.style.zIndex = "1000";
    //   const modalContainer = document.createElement("div");
    //   modalContainer.className = "modal ranking-modal";
    //   modalContainer.style.background = "#fff";
    //   modalContainer.style.borderRadius = "8px";
    //   modalContainer.style.maxWidth = "90%";
    //   modalContainer.style.width = "600px";
    //   modalContainer.style.maxHeight = "90vh";
    //   modalContainer.style.overflow = "auto";
    //   modalContainer.style.position = "relative";
    //   modalContainer.style.padding = "20px";
    //   const closeButton = document.createElement("button");
    //   closeButton.innerHTML = "✕";
    //   closeButton.style.position = "absolute";
    //   closeButton.style.right = "10px";
    //   closeButton.style.top = "10px";
    //   closeButton.style.background = "none";
    //   closeButton.style.border = "none";
    //   closeButton.style.fontSize = "20px";
    //   closeButton.style.cursor = "pointer";
    //   closeButton.onclick = function () {
    //     document.body.removeChild(modalOverlay);
    //     document.body.style.overflow = "auto";
    //   };
    //   modalContainer.innerHTML = `
    //     <div style="text-align: center;">
    //       <img src="${spiritData.image}" alt="${spiritData.name}" style="width: 100px; height: 100px; object-fit: contain;">
    //       <h2>${spiritData.name}</h2>
    //       <p>상세 정보를 로드할 수 없습니다.</p>
    //     </div>
    //   `;
    //   modalContainer.appendChild(closeButton);
    //   modalOverlay.appendChild(modalContainer);
    //   document.body.appendChild(modalOverlay);
    //   return true;
    // } catch (error) {
    //   console.error("환수 모달 표시 중 오류:", error);
    //   return false;
    // }
  }

  function tryLoadSpiritData(spiritData, category, infoElement) {
    try {
      if (DataManager && typeof DataManager.getData === "function") {
        const allSpirits = DataManager.getData(category);

        if (allSpirits && Array.isArray(allSpirits) && allSpirits.length > 0) {
          const foundSpirit = allSpirits.find(
            (s) =>
              s && (s.name === spiritData.name || s.image === spiritData.image)
          );

          if (foundSpirit && foundSpirit.stats) {
            displaySpiritStats(foundSpirit, infoElement);
            return;
          }
        }
      }

      infoElement.innerHTML = `
        <p style="text-align: center; padding: 20px; color: #666; font-style: italic;">
          환수 상세 정보를 불러올 수 없습니다.
        </p>
      `;
    } catch (error) {
      console.error("환수 데이터 로드 중 오류:", error);
      infoElement.innerHTML = `
        <p style="text-align: center; padding: 20px; color: #666; font-style: italic;">
          환수 데이터 로드 중 오류가 발생했습니다.
        </p>
      `;
    }
  }

  function displaySpiritStats(spirit, element) {
    const infoHtml = `
      <div style="margin-bottom: 15px;">
        <strong>등급:</strong> ${spirit.grade || "정보 없음"}
        <br>
        <strong>세력:</strong> ${
          spirit.influence || spirit.faction || "정보 없음"
        }
      </div>
    `;

    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">레벨</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">등록 효과</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">장착 효과</th>
        </tr>
    `;

    if (spirit.stats && Array.isArray(spirit.stats)) {
      const level25Stat = spirit.stats.find((s) => s && s.level === 25);

      if (level25Stat) {
        tableHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>25</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatStatEffects(
              level25Stat.registrationStat
            )}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatStatEffects(
              level25Stat.bindStat
            )}</td>
          </tr>
        `;
      } else {
        tableHtml += `
          <tr>
            <td colspan="3" style="padding: 8px; text-align: center; border: 1px solid #ddd;">
              25레벨 데이터가 없습니다
            </td>
          </tr>
        `;
      }
    } else {
      tableHtml += `
        <tr>
          <td colspan="3" style="padding: 8px; text-align: center; border: 1px solid #ddd;">
            스탯 데이터가 없습니다
          </td>
        </tr>
      `;
    }

    tableHtml += `</table>`;

    element.innerHTML = infoHtml + tableHtml;
  }

  function formatStatEffects(statObj) {
    if (
      !statObj ||
      typeof statObj !== "object" ||
      Object.keys(statObj).length === 0
    ) {
      return "<em>효과 없음</em>";
    }

    const html = [];
    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
    ];

    for (const key of priorityStats) {
      if (statObj[key] !== undefined) {
        const statName = window.CommonData?.STATS_MAPPING?.[key] || key;
        const isPercent = key.toLowerCase().includes("percent");
        const value = statObj[key] + (isPercent ? "%" : "");
        html.push(`<div>${statName}: <strong>${value}</strong></div>`);
      }
    }

    for (const [key, value] of Object.entries(statObj)) {
      if (!priorityStats.includes(key)) {
        const statName = window.CommonData?.STATS_MAPPING?.[key] || key;
        const isPercent = key.toLowerCase().includes("percent");
        const displayValue = value + (isPercent ? "%" : "");
        html.push(`<div>${statName}: <strong>${displayValue}</strong></div>`);
      }
    }

    return html.join("");
  }

  function initialize() {
    // console.log("RankingViewer 초기화 중...");

    if (
      typeof window.CommonData === "undefined" ||
      !window.CommonData.FACTION_ICONS ||
      !window.CommonData.STATS_MAPPING ||
      !window.CommonData.STATS_ORDER ||
      !window.CommonData.DOCUMENT_MAP ||
      !window.CommonData.CATEGORY_FILE_MAP
    ) {
      console.error(
        "Critical Error: CommonData or required properties not found."
      );
      return;
    }

    if (typeof FirebaseHandler === "undefined") {
      console.error("FirebaseHandler가 누락되었습니다.");
      loadDataManagerAndInitUI();
      return;
    }

    // console.log("Firebase 초기화 시작...");
    FirebaseHandler.initFirebase();

    setTimeout(function () {
      FirebaseHandler.testFirebaseConnectivity()
        .then((result) => {
          // console.log("Firebase 연결 상태:", result);
          loadAllFirestoreData().then(() => {
            if (
              DataManager &&
              typeof DataManager.loadCategoryData === "function"
            ) {
              DataManager.loadCategoryData()
                .then(() => {
                  // console.log("환수 데이터 로드 완료");
                  loadDataManagerAndInitUI();
                })
                .catch((err) => {
                  // console.error("환수 데이터 로드 실패:", err);
                  loadDataManagerAndInitUI();
                });
            } else {
              loadDataManagerAndInitUI();
            }
          });
        })
        .catch((error) => {
          console.error("Firebase 연결 실패:", error);
          loadDataManagerAndInitUI();
        });
    }, 500);
  }

  async function loadAllFirestoreData() {
    // console.log("Firebase에서 모든 카테고리 데이터 로드 중...");

    const CATEGORY_FILE_MAP = window.CommonData.CATEGORY_FILE_MAP || {};
    const loadPromises = [];

    for (const [category, files] of Object.entries(CATEGORY_FILE_MAP)) {
      if (files.registration) {
        loadPromises.push(
          FirebaseHandler.getFirestoreDocument(files.registration)
            .then((data) => {
              // console.log(
              //   `${category} 등록 데이터 로드 완료:`,
              //   data ? "성공" : "실패"
              // );
            })
            .catch((err) =>
              console.error(`${category} 등록 데이터 로드 오류:`, err)
            )
        );
      }

      if (files.bind) {
        loadPromises.push(
          FirebaseHandler.getFirestoreDocument(files.bind)
            .then((data) => {
              // console.log(
              //   `${category} 장착 데이터 로드 완료:`,
              //   data ? "성공" : "실패"
              // );
            })
            .catch((err) =>
              console.error(`${category} 장착 데이터 로드 오류:`, err)
            )
        );
      }
    }

    try {
      await Promise.all(loadPromises);
      // console.log("모든 Firebase 데이터 로드 완료!");
    } catch (error) {
      console.error("Firebase 데이터 로드 중 오류 발생:", error);
    }
  }

  function loadDataManagerAndInitUI() {
    if (DataManager && typeof DataManager.loadCategoryData === "function") {
      // console.log("DataManager를 통해 카테고리 데이터 로드 중...");
      DataManager.loadCategoryData()
        .then(() => {
          // console.log("환수 데이터 로드 성공!");
          const cachedKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("firestore_")) {
              cachedKeys.push(key);
            }
          }
          // console.log(
          //   `localStorage에 ${cachedKeys.length}개의 캐시된 데이터가 있습니다:`,
          //   cachedKeys
          // );
          initializeUI();
        })
        .catch((error) => {
          console.error("DataManager 데이터 로드 실패:", error);
          initializeUI();
        });
    } else {
      console.error("DataManager를 찾을 수 없습니다.");
      initializeUI();
    }
  }

  function initializeUI() {
    bondRankingsContainer = document.getElementById("bondRankingsContainer");
    statRankingsContainer = document.getElementById("statRankingsContainer");
    statSelectorContainer = document.getElementById("statSelectorContainer");
    paginationContainer = document.getElementById("pagination");
    rankingNotice = document.getElementById("rankingNotice");

    if (!bondRankingsContainer) {
      console.error("필요한 DOM 요소를 찾을 수 없습니다.");
      return;
    }

    const modal = document.getElementById("rankingDetailModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target.classList.contains("modal-close") || e.target === this) {
          this.style.display = "none";
          document.body.style.overflow = "auto";
        }
      });
    }

    applyBaseStyles();
    setupEventListeners();
    loadRankingData();
  }

  function applyBaseStyles() {
    const styleElement = document.createElement("style");
    styleElement.id = "ranking-viewer-styles";
    styleElement.innerHTML = `
        #rankingNotice {
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          background-color: #f8f9fa;
          border-left: 5px solid #6c757d;
        }
        
        #rankingNotice.error {
          background-color: #f8d7da;
          border-left-color: #dc3545;
        }
        
        .no-data-message {
          padding: 20px;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 5px;
          margin: 15px 0;
        }
      `;
    document.head.appendChild(styleElement);
  }

  function setupEventListeners() {
    document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        const newCategory = this.getAttribute("data-category");
        if (newCategory !== currentCategory) {
          document
            .querySelectorAll(".sub-tabs .tab")
            .forEach((t) => t.classList.remove("active"));
          this.classList.add("active");

          currentCategory = newCategory;
          currentPage = 1;
          updateUIText();
          loadRankingData();
        }
      });
    });

    document
      .querySelectorAll(".ranking-type-selector .filter-btn")
      .forEach((btn) => {
        btn.addEventListener("click", function () {
          const newType = this.getAttribute("data-type");
          if (newType !== currentRankingType) {
            document
              .querySelectorAll(".ranking-type-selector .filter-btn")
              .forEach((b) => b.classList.remove("active"));
            this.classList.add("active");

            currentRankingType = newType;
            toggleRankingContainers();
            currentPage = 1;
            updateUIText();
            loadRankingData();
          }
        });
      });

    document
      .querySelectorAll(".grade-filter-group .filter-btn")
      .forEach((btn) => {
        btn.addEventListener("click", function () {
          const newGradeFilter = this.getAttribute("data-grade");
          if (newGradeFilter !== currentGradeFilter) {
            document
              .querySelectorAll(".grade-filter-group .filter-btn")
              .forEach((b) => b.classList.remove("active"));
            this.classList.add("active");

            currentGradeFilter = newGradeFilter;
            currentPage = 1;
            updateUIText();
            loadRankingData();
          }
        });
      });

    const statSelector = document.getElementById("statSelector");
    if (statSelector) {
      let hasWeightedOption = false;
      for (let i = 0; i < statSelector.options.length; i++) {
        if (statSelector.options[i].value === "weightedScore") {
          hasWeightedOption = true;
          break;
        }
      }

      if (!hasWeightedOption) {
        const weightedScoreOption = document.createElement("option");
        weightedScoreOption.value = "weightedScore";
        weightedScoreOption.textContent = "환산합산";
        if (statSelector.options.length > 0) {
          statSelector.insertBefore(
            weightedScoreOption,
            statSelector.options[0]
          );
        } else {
          statSelector.appendChild(weightedScoreOption);
        }
      }

      statSelector.addEventListener("change", function () {
        currentStat = this.value;
        currentPage = 1;
        loadRankingData();
      });
    }
  }

  function filterRankingsByGrade() {
    if (currentRankingType === "bond") {
      if (!allRankingsData[currentCategory]) {
        loadRankingData();
        return;
      }

      if (currentGradeFilter === "all") {
        rankings = allRankingsData[currentCategory];
      } else {
        rankings = allRankingsData[currentCategory].filter((ranking) => {
          return (
            ranking.spirits &&
            ranking.spirits.every(
              (spirit) =>
                spirit.grade === "전설" ||
                !spirit.grade ||
                spirit.grade.includes("전설")
            )
          );
        });
      }

      totalRankings = rankings.length;
      renderBondRankings();
      renderPagination();
    } else {
      loadRankingData();
    }
  }

  function toggleRankingContainers() {
    const gradeFilterContainer = document.getElementById(
      "gradeFilterContainer"
    );

    if (currentRankingType === "bond") {
      bondRankingsContainer.style.display = "block";
      statRankingsContainer.style.display = "none";
      statSelectorContainer.style.display = "none";
      paginationContainer.style.display = "block";

      if (gradeFilterContainer) {
        gradeFilterContainer.style.visibility = "visible";
        gradeFilterContainer.style.opacity = "1";
      }
    } else {
      bondRankingsContainer.style.display = "none";
      statRankingsContainer.style.display = "block";
      statSelectorContainer.style.display = "block";
      paginationContainer.style.display = "none";

      if (gradeFilterContainer) {
        gradeFilterContainer.style.visibility = "hidden";
        gradeFilterContainer.style.opacity = "0";
      }
    }
  }

  function updateUIText() {
    document.getElementById("rankingCategoryTitle").textContent =
      currentCategory;

    let typeText = currentRankingType === "bond" ? "결속" : "능력치";

    if (currentGradeFilter === "legendary" && currentRankingType === "bond") {
      typeText += " (전설환수만)";
    }

    document.getElementById("rankingTypeTitle").textContent = typeText;
  }

  async function loadRankingData() {
    showLoading();

    const savedItemsPerPage = localStorage.getItem("rankingItemsPerPage");
    if (savedItemsPerPage) {
      if (savedItemsPerPage === "all") {
        itemsPerPage = totalRankings || Number.MAX_SAFE_INTEGER;
      } else {
        itemsPerPage = parseInt(savedItemsPerPage);
      }
    }

    try {
      if (typeof firebase === "undefined" || !firebase.apps.length) {
        throw new Error(
          "Firebase is not initialized. Please check script loading order."
        );
      }

      if (!metadata) {
        try {
          const db = firebase.firestore();
          const metaDoc = await db
            .collection("mobRankingData")
            .doc("rankings-meta")
            .get();

          if (metaDoc.exists) {
            metadata = metaDoc.data();
            // console.log(
            //   "Firebase에서 랭킹 메타데이터를 성공적으로 불러왔습니다."
            // );
          } else {
            console.warn("Firebase에서 랭킹 메타데이터를 찾을 수 없습니다.");
            throw new Error("랭킹 메타데이터가 없습니다.");
          }
        } catch (firebaseError) {
          console.error("Firebase 메타데이터 로드 오류:", firebaseError);
          throw firebaseError;
        }
        updateLastUpdated();
      }

      if (currentRankingType === "bond") {
        try {
          await loadBondRankings();
        } catch (error) {
          showError(
            `${currentCategory} 결속 랭킹 데이터가 없습니다. 랭킹 생성이 필요합니다.`
          );
          console.error("Bond rankings error:", error);
        }
      } else {
        try {
          await loadStatRankings();
        } catch (error) {
          showError(
            `${currentCategory} 능력치 랭킹 데이터가 없습니다. 랭킹 생성이 필요합니다.`
          );
          console.error("Stat rankings error:", error);
        }
      }
    } catch (error) {
      showError(
        "랭킹 데이터를 불러오는 중 오류가 발생했습니다: " + error.message
      );
      console.error("Error loading ranking data:", error);
    }
  }

  function updateLastUpdated() {
    if (metadata && metadata.lastUpdated) {
      const date = new Date(metadata.lastUpdated);
      const formattedDate = date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      document.getElementById("lastUpdated").textContent = formattedDate;
    } else {
      document.getElementById("lastUpdated").textContent = "정보 없음";
    }
  }

  async function loadBondRankings() {
    if (currentCategory === "탑승") {
      bondRankingsContainer.innerHTML = `
          <div style="padding: 20px; border-radius: 5px; border-left: 5px solid #2196f3; margin: 20px 0; background-color: #e3f2fd;">
            <h3 style="margin-top: 0; color: #1565c0;">안내</h3>
            <p style="margin: 0; color: #333;">탑승 25레벨 정보가 부족합니다. 정보 취합되면 랭킹 보이도록 하겠습니다.</p>
          </div>
        `;
      hideLoading();
      paginationContainer.innerHTML = "";
      return;
    }

    const categoryMap = {
      수호: "guardian",
      탑승: "ride",
      변신: "transform",
    };

    let docName;
    let db;

    try {
      if (currentGradeFilter === "legendary") {
        docName = `legendary-bond-rankings-${categoryMap[currentCategory]}`;
      } else {
        docName = `bond-rankings-${categoryMap[currentCategory]}`;
      }

      // console.log(`Firebase에서 ${docName} 문서 로드 중...`);

      db = firebase.firestore();
      const doc = await db.collection("mobRankingData").doc(docName).get();

      if (!doc.exists) {
        if (currentGradeFilter === "legendary") {
          docName = `bond-rankings-${categoryMap[currentCategory]}`;
          const regularDoc = await db
            .collection("mobRankingData")
            .doc(docName)
            .get();

          if (!regularDoc.exists) {
            throw new Error(
              `${currentCategory} 결속 랭킹 데이터를 Firebase에서 찾을 수 없습니다.`
            );
          }

          const data = regularDoc.data();
          allRankingsData[currentCategory] = data.rankings || [];

          rankings = allRankingsData[currentCategory].filter((ranking) => {
            return (
              ranking.spirits &&
              ranking.spirits.every(
                (spirit) =>
                  spirit.grade === "전설" ||
                  !spirit.grade ||
                  spirit.grade.includes("전설")
              )
            );
          });
        } else {
          throw new Error(
            `${currentCategory} 결속 랭킹 데이터를 Firebase에서 찾을 수 없습니다.`
          );
        }
      } else {
        const data = doc.data();
        // console.log(
        //   `Firebase에서 ${docName} 로드 완료:`,
        //   data ? "성공" : "실패"
        // );

        if (!data || !data.rankings) {
          throw new Error(
            `${currentCategory} 결속 랭킹 데이터가 유효하지 않습니다.`
          );
        }

        allRankingsData[currentCategory] = data.rankings || [];

        if (currentGradeFilter === "legendary") {
          rankings = allRankingsData[currentCategory];
        } else {
          rankings = allRankingsData[currentCategory];
        }
      }

      totalRankings = rankings.length;
      // console.log(`${rankings.length}개의 결속 랭킹 로드됨`);

      renderBondRankings();
      renderPagination();
      hideLoading();
    } catch (error) {
      console.error(`Firebase에서 결속 랭킹 로드 중 오류:`, error);
      throw new Error(
        `${currentCategory} ${
          currentGradeFilter === "legendary" ? "전설환수" : ""
        } 결속 랭킹 데이터를 불러올 수 없습니다: ${error.message}`
      );
    }
  }

  async function loadStatRankings() {
    const categoryMap = {
      수호: "guardian",
      탑승: "ride",
      변신: "transform",
    };

    try {
      const docName = `stat-rankings-${categoryMap[currentCategory]}`;

      // console.log(`Firebase에서 ${docName} 문서 로드 중...`);

      const db = firebase.firestore();
      const doc = await db.collection("mobRankingData").doc(docName).get();

      if (!doc.exists) {
        throw new Error(
          `${currentCategory} 능력치 랭킹 데이터를 Firebase에서 찾을 수 없습니다.`
        );
      }

      const data = doc.data();
      // console.log(`Firebase에서 ${docName} 로드 완료:`, data ? "성공" : "실패");

      if (!data || !data.rankings) {
        throw new Error(
          `${currentCategory} 능력치 랭킹 데이터가 유효하지 않습니다.`
        );
      }

      // console.log("로드된 데이터 구조:", Object.keys(data));

      if (currentStat === "weightedScore") {
        // console.log("가중치 점수 랭킹 처리 중");

        let allRankings = [];

        if (data.rankings) {
          const keyStats = [
            "damageResistancePenetration",
            "damageResistance",
            "pvpDamagePercent",
            "pvpDefensePercent",
          ];

          const spiritMap = new Map();

          keyStats.forEach((statKey) => {
            const statRankings = data.rankings[statKey] || [];
            // console.log(`${statKey}에 대한 ${statRankings.length}개 환수 발견`);

            statRankings.forEach((spirit) => {
              if (!spiritMap.has(spirit.name)) {
                spiritMap.set(spirit.name, {
                  name: spirit.name,
                  image: spirit.image,
                  stats: {},
                });
              }

              const spiritData = spiritMap.get(spirit.name);
              spiritData.stats[statKey] = spirit.value;
            });
          });

          // console.log(
          //   `가중치 점수 계산을 위한 ${spiritMap.size}개의 고유 환수 처리 중`
          // );

          spiritMap.forEach((spirit, name) => {
            const penResist = ensureNumber(
              spirit.stats.damageResistancePenetration || 0
            );
            const resist = ensureNumber(spirit.stats.damageResistance || 0);
            const pvpDmg = ensureNumber(spirit.stats.pvpDamagePercent || 0);
            const pvpDef = ensureNumber(spirit.stats.pvpDefensePercent || 0);

            const weightedScore =
              penResist + resist + pvpDmg * 10 + pvpDef * 10;

            if (weightedScore > 0) {
              allRankings.push({
                name: spirit.name,
                image: spirit.image,
                value: Math.round(weightedScore),
                breakdown: {
                  damageResistancePenetration: Math.round(penResist),
                  damageResistance: Math.round(resist),
                  pvpDamagePercent: Math.round(pvpDmg),
                  pvpDefensePercent: Math.round(pvpDef),
                },
              });
            }
          });

          allRankings.sort((a, b) => b.value - a.value);
          // console.log(
          //   `${allRankings.length}개 항목으로 가중치 점수 랭킹 생성됨`
          // );

          rankings = allRankings;
        } else {
          console.error("로드된 파일에서 랭킹 데이터가 없습니다");
          rankings = [];
        }
      } else {
        rankings =
          data.rankings && data.rankings[currentStat]
            ? data.rankings[currentStat]
            : [];
      }

      totalRankings = rankings.length;

      // console.log(`표시할 ${rankings.length}개 항목 준비됨`);

      renderStatRankings();
      hideLoading();
    } catch (error) {
      console.error(`Firebase에서 능력치 랭킹 로드 중 오류:`, error);
      throw new Error(
        `${currentCategory} 능력치 랭킹 데이터를 불러올 수 없습니다: ${error.message}`
      );
    }
  }

  function renderBondRankings() {
    // console.log("renderBondRankings 함수 실행됨");

    if (!rankings || rankings.length === 0) {
      // console.log("랭킹 데이터 없음");
      let message = "랭킹 데이터가 없습니다.";

      if (
        currentGradeFilter === "legendary" &&
        allRankingsData[currentCategory] &&
        allRankingsData[currentCategory].length > 0
      ) {
        message =
          "전설환수로만 구성된 랭킹 데이터가 없습니다.<br>다른 조합에서는 불멸환수가 포함되어 있습니다.";
      }

      bondRankingsContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; background: #f8f8f8; border-radius: 5px;">
          ${message}
        </div>
      `;
      return;
    }

    // console.log("랭킹 데이터 있음:", rankings.length, "개");

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, rankings.length);
    const currentRankings = rankings.slice(startIndex, endIndex);

    let tableHtml = "";

    if (currentGradeFilter === "legendary") {
      tableHtml += `
        <div style="padding: 10px; margin: 10px 0; background-color: #fff3e0; border-left: 4px solid #e67e22; border-radius: 3px;">
          <p style="margin: 0; color: #333; font-size: 14px;">
            <strong>현재 전설환수로만 구성된 조합만 표시하고 있습니다.</strong> 
            (${rankings.length}개 조합 / 전체 ${allRankingsData[currentCategory].length}개 중)
          </p>
        </div>
      `;
    }

    tableHtml += `
      <div style="overflow-x: auto; margin-top: 15px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
          <thead>
            <tr style="background-color: #f5f5f5; font-weight: bold;">
              <th style="padding: 12px; text-align: center; width: 60px; border-bottom: 2px solid #ddd;">순위</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">환수</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">세력</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">환산</th>
              <th style="padding: 12px; text-align: center; width: 100px; border-bottom: 2px solid #ddd;">상세</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentRankings.forEach((ranking, index) => {
      const rank = startIndex + index + 1;
      const isTop = rank <= 3;
      const rowBgColor = isTop
        ? rank === 1
          ? "#fffde7"
          : rank === 2
          ? "#f5f5f5"
          : rank === 3
          ? "#fff3e0"
          : "#ffffff"
        : "#ffffff";

      const badgeBgColor = isTop
        ? rank === 1
          ? "#ffd700"
          : rank === 2
          ? "#c0c0c0"
          : rank === 3
          ? "#cd7f32"
          : "#3498db"
        : "#3498db";

      const badgeTextColor = rank <= 2 ? "#333" : "white";

      let spiritsHtml = "";
      if (ranking.spirits && ranking.spirits.length > 0) {
        ranking.spirits.forEach((spirit) => {
          const spiritCategory = currentCategory;
          spiritsHtml += `
            <img src="${spirit.image}" alt="${spirit.name}" title="${
            spirit.name
          }" 
                style="width: 40px; height: 40px; margin: 2px; border-radius: 3px; border: 1px solid #eee; object-fit: contain; cursor: pointer;"
                data-faction="${spirit.faction || ""}" data-influence="${
            spirit.influence || ""
          }"
                onclick="RankingViewer.showSpiritModal({name:'${
                  spirit.name
                }', image:'${spirit.image}', faction:'${
            spirit.faction || ""
          }', influence:'${spirit.influence || ""}'}, '${spiritCategory}')">
          `;
        });
      }

      let factionTagsHtml = "";
      if (ranking.gradeCounts) {
        for (const [category, grades] of Object.entries(ranking.gradeCounts)) {
          for (const [grade, count] of Object.entries(grades)) {
            if (count >= 2) {
              factionTagsHtml += `
                <span style="display: inline-block; margin: 2px; padding: 3px 6px; background: #f1f1f1; 
                      border-radius: 3px; font-size: 11px;">${grade} x${count}</span>
              `;
            }
          }
        }
      }

      if (ranking.factionCounts) {
        for (const [category, factions] of Object.entries(
          ranking.factionCounts
        )) {
          for (const [faction, count] of Object.entries(factions)) {
            if (count >= 2) {
              const iconPath =
                window.CommonData?.FACTION_ICONS?.[faction] ||
                "assets/img/bond/default.jpg";
              factionTagsHtml += `
                <span style="display: inline-block; margin: 2px; padding: 3px 6px; background: #f1f1f1; 
                      border-radius: 3px; font-size: 11px;">
                  <img src="${iconPath}" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 3px;">
                  ${faction} x${count}
                </span>
              `;
            }
          }
        }
      }

      const gradeScore = Math.round(ranking.gradeScore || 0);
      const factionScore = Math.round(ranking.factionScore || 0);
      const bindScore = Math.round(ranking.bindScore || 0);
      const totalScore = gradeScore + factionScore + bindScore;

      tableHtml += `
        <tr style="background-color: ${rowBgColor}; border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; text-align: center; vertical-align: middle;">
            <div style="display: inline-block; width: 36px; height: 36px; border-radius: 50%; 
                 background-color: ${badgeBgColor}; color: ${badgeTextColor}; 
                 line-height: 36px; text-align: center; font-weight: bold; font-size: 16px;">
              ${rank}
            </div>
          </td>
          <td style="padding: 12px; text-align: left; vertical-align: middle;">
            <div style="display: flex; flex-wrap: wrap; gap: 2px;">
              ${spiritsHtml}
            </div>
          </td>
          <td style="padding: 12px; text-align: left; vertical-align: middle;">
            <div style="display: flex; flex-wrap: wrap; gap: 3px;">
              ${factionTagsHtml}
            </div>
          </td>
          <td style="padding: 12px; text-align: left; vertical-align: middle;">
            <div>
              <div style="font-size: 16px; font-weight: bold; color: #e67e22;">
                ${totalScore}
              </div>
              <div style="font-size: 11px; color: #777;">
                (등급: ${gradeScore} | 세력: ${factionScore} | 장착: ${bindScore})
              </div>
            </div>
          </td>
          <td style="padding: 12px; text-align: center; vertical-align: middle;">
            <button onclick="RankingViewer.showDetailModal(${index})" 
                style="padding: 5px 10px; background: #3498db; color: white; border: none; 
                      border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">
              상세 보기
            </button>
          </td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </div>
    `;

    bondRankingsContainer.innerHTML = tableHtml;

    const mobileStyle = document.createElement("style");
    mobileStyle.id = "bond-rankings-mobile-style";
    mobileStyle.innerHTML = `
      @media (max-width: 768px) {
        #bondRankingsContainer table th:nth-child(3), 
        #bondRankingsContainer table td:nth-child(3) {
          display: none;
        }
      }
    `;

    const existingStyle = document.getElementById("bond-rankings-mobile-style");
    if (existingStyle) existingStyle.remove();

    document.head.appendChild(mobileStyle);

    // console.log("결속 랭킹 테이블 렌더링 완료");
  }

  function renderStatRankings() {
    if (!rankings || rankings.length === 0) {
      statRankingsContainer.innerHTML = `
          <div style="padding: 20px; text-align: center; background: #f8f8f8; border-radius: 5px;">
            랭킹 데이터가 없습니다.
          </div>
        `;
      return;
    }

    let statDisplayName =
      window.CommonData.STATS_MAPPING[currentStat] || currentStat;

    if (currentStat === "weightedScore") {
      statDisplayName = "환산합산";
    }

    const isPercentStat = window.CommonData.PERCENT_STATS.includes(currentStat);

    let html = `
        <style>
          .stat-grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 6px;
            width: 100%;
            padding: 10px 0;
          }
          
          .stat-card {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            background: #f9f9f9;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            cursor: pointer;
          }
          
          .stat-card:hover {
            transform: translateY(-2px);
            z-index: 1;
            box-shadow: 0 3px 6px rgba(0,0,0,0.15);
            transition: all 0.2s ease;
          }
          
          .stat-card.top1 {
            background: linear-gradient(to bottom, #fff9c4, #fff);
            border: 1px solid #ffd700;
          }
          
          .stat-card.top2 {
            background: linear-gradient(to bottom, #f5f5f5, #fff);
            border: 1px solid #c0c0c0;
          }
          
          .stat-card.top3 {
            background: linear-gradient(to bottom, #ffe0b2, #fff);
            border: 1px solid #cd7f32;
          }
          
          .rank-number {
            position: absolute;
            top: -6px;
            left: -6px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #3498db;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          
          .stat-card.top1 .rank-number {
            background-color: #ffd700;
            color: #333;
          }
          
          .stat-card.top2 .rank-number {
            background-color: #c0c0c0;
            color: #333;
          }
          
          .stat-card.top3 .rank-number {
            background-color: #cd7f32;
            color: white;
          }
          
          .spirit-image-container {
            width: 100%;
            height: 60px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 6px;
          }
          
          .spirit-image {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          
          .spirit-image:hover {
            transform: scale(1.1);
            box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
            transition: all 0.2s ease;
          }
          
          .spirit-name {
            font-weight: bold;
            text-align: center;
            margin: 4px 0;
            font-size: 10px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            line-height: 1.2;
          }
          
          .spirit-stat {
            font-size: 9px;
            text-align: center;
            color: #e67e22;
            font-weight: bold;
          }
        </style>
        
        <h3 style="margin-top: 15px; font-size: 16px; color: #333;">${statDisplayName} 랭킹 - 전체 ${rankings.length}개 항목</h3>
        <div class="stat-grid-container">
      `;

    rankings.forEach((ranking, index) => {
      const rank = index + 1;
      const topClass = rank <= 3 ? `top${rank}` : "";
      const value = ranking.value;
      let displayValue;

      if (currentStat === "weightedScore") {
        displayValue = value;
      } else {
        displayValue = isPercentStat ? `${value}%` : value;
      }

      let breakdownHtml = "";
      if (currentStat === "weightedScore" && ranking.breakdown) {
        const bd = ranking.breakdown;
        // breakdownHtml = `
        //     <div class="stat-breakdown">
        //       (피관: ${bd.damageResistancePenetration} | 피저: ${bd.damageResistance} |
        //       대피: ${bd.pvpDamagePercent}% × 10 | 대방: ${bd.pvpDefensePercent}% × 10)
        //     </div>
        //   `;
      }

      html += `
          <div class="stat-card ${topClass}" 
               data-faction="${ranking.faction || ""}" data-influence="${
        ranking.influence || ""
      }"
               onclick="RankingViewer.showSpiritModal({name:'${
                 ranking.name
               }', image:'${ranking.image}', faction:'${
        ranking.faction || ""
      }', influence:'${ranking.influence || ""}'}, '${currentCategory}')">
            <div class="rank-number">${rank}</div>
            <div class="spirit-image-container">
              <img src="${ranking.image}" alt="${
        ranking.name
      }" class="spirit-image" loading="lazy">
            </div>
            <div class="spirit-name">${ranking.name}</div>
            <div class="spirit-stat">${displayValue}</div>
            ${breakdownHtml}
          </div>
        `;
    });

    html += `</div>`;

    statRankingsContainer.innerHTML = html;
  }

  function renderPagination() {
    if (totalRankings <= itemsPerPage) {
      paginationContainer.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(totalRankings / itemsPerPage);

    let html = `<div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0;">`;

    html += `<div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">`;

    html += `
      <button ${currentPage === 1 ? "disabled" : ""} 
        onclick="RankingViewer.changePage(1)" 
        style="padding: 5px 10px; background: ${
          currentPage === 1 ? "#f8f9fa" : "#fff"
        }; 
        border: 1px solid #ddd; border-radius: 3px; 
        cursor: ${currentPage === 1 ? "not-allowed" : "pointer"};">
        &lt;&lt;
      </button>
    `;

    html += `
      <button ${currentPage === 1 ? "disabled" : ""} 
        onclick="RankingViewer.changePage(${currentPage - 1})" 
        style="padding: 5px 10px; background: ${
          currentPage === 1 ? "#f8f9fa" : "#fff"
        }; 
        border: 1px solid #ddd; border-radius: 3px; 
        cursor: ${currentPage === 1 ? "not-allowed" : "pointer"};">
        ◀ 이전
      </button>
    `;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="${i === currentPage ? "active" : ""}" 
          onclick="RankingViewer.changePage(${i})" 
          style="padding: 5px 10px; background: ${
            i === currentPage ? "#3498db" : "#fff"
          }; 
          color: ${i === currentPage ? "#fff" : "#333"}; 
          border: 1px solid #ddd; border-radius: 3px; 
          font-weight: ${i === currentPage ? "bold" : "normal"};">
          ${i}
        </button>
      `;
    }

    html += `
      <button ${currentPage === totalPages ? "disabled" : ""} 
        onclick="RankingViewer.changePage(${currentPage + 1})" 
        style="padding: 5px 10px; background: ${
          currentPage === totalPages ? "#f8f9fa" : "#fff"
        }; 
        border: 1px solid #ddd; border-radius: 3px; 
        cursor: ${currentPage === totalPages ? "not-allowed" : "pointer"};">
        다음 ▶
      </button>
    `;

    html += `
      <button ${currentPage === totalPages ? "disabled" : ""} 
        onclick="RankingViewer.changePage(${totalPages})" 
        style="padding: 5px 10px; background: ${
          currentPage === totalPages ? "#f8f9fa" : "#fff"
        }; 
        border: 1px solid #ddd; border-radius: 3px; 
        cursor: ${currentPage === totalPages ? "not-allowed" : "pointer"};">
        &gt;&gt;
      </button>
    `;

    html += `<span style="margin-left: 10px; font-size: 14px; color: #666;">${currentPage} / ${totalPages}</span>`;

    html += `</div>`;

    html += `
      <div style="display: flex; align-items: center;">
        <label for="itemsPerPageSelect" style="margin-left: 18px; color: #333; font-size: 14px;">
          페이지당 항목 수:
        </label>
        <select id="itemsPerPageSelect" style="padding: 5px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">
          <option value="5" ${itemsPerPage === 5 ? "selected" : ""}>5개</option>
          <option value="10" ${
            itemsPerPage === 10 ? "selected" : ""
          }>10개</option>
          <option value="20" ${
            itemsPerPage === 20 ? "selected" : ""
          }>20개</option>
          <option value="all" ${
            itemsPerPage > 20 ? "selected" : ""
          }>전체 보기</option>
        </select>
      </div>
    `;

    html += `</div>`;

    paginationContainer.innerHTML = html;

    const selector = document.getElementById("itemsPerPageSelect");
    if (selector) {
      selector.addEventListener("change", function () {
        const value = this.value;
        if (value === "all") {
          itemsPerPage = totalRankings;
        } else {
          itemsPerPage = parseInt(value);
        }
        currentPage = 1;
        localStorage.setItem("rankingItemsPerPage", value);
        if (currentRankingType === "bond") {
          renderBondRankings();
        } else {
          renderStatRankings();
        }
        renderPagination();
      });
    }
  }

  function renderItemsPerPageSelector() {
    const container = document.createElement("div");
    container.style =
      "display: flex; justify-content: flex-end; align-items: center; margin-top: 15px;";
    container.innerHTML = `
      <label for="itemsPerPageSelect" style="margin-left: 18px; color: #333; font-size: 14px;">
        페이지당 항목 수:
      </label>
      <select id="itemsPerPageSelect" style="padding: 5px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer;">
        <option value="5" ${itemsPerPage === 5 ? "selected" : ""}>5개</option>
        <option value="10" ${
          itemsPerPage === 10 ? "selected" : ""
        }>10개</option>
        <option value="20" ${
          itemsPerPage === 20 ? "selected" : ""
        }>20개</option>
        <option value="all">전체 보기</option>
      </select>
    `;

    const selector = container.querySelector("#itemsPerPageSelect");
    selector.addEventListener("change", function () {
      let value = this.value;
      if (value === "all") {
        itemsPerPage = totalRankings;
      } else {
        itemsPerPage = parseInt(value);
      }
      currentPage = 1;
      localStorage.setItem("rankingItemsPerPage", value);
      loadRankingData();
    });

    return container;
  }

  function changePage(page) {
    if (
      page < 1 ||
      page > Math.ceil(totalRankings / itemsPerPage) ||
      page === currentPage
    ) {
      return;
    }

    currentPage = page;
    if (currentRankingType === "bond") {
      renderBondRankings();
    } else {
      renderStatRankings();
    }
    renderPagination();

    document
      .querySelector(".ranking-container")
      .scrollIntoView({ behavior: "smooth" });
  }

  function showDetailModal(index) {
    // console.log("showDetailModal called with index:", index);

    if (!rankings || !rankings[index]) {
      console.error("Rankings data not found for index:", index);
      return;
    }

    const ranking = rankings[index];
    const rank = (currentPage - 1) * itemsPerPage + index + 1;

    const modal = document.getElementById("rankingDetailModal");
    if (!modal) {
      console.error("랭킹 상세 모달을 찾을 수 없습니다.");
      alert("모달 요소를 찾을 수 없습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    const displayGradeScore = Math.round(ensureNumber(ranking.gradeScore || 0));
    const displayFactionScore = Math.round(
      ensureNumber(ranking.factionScore || 0)
    );
    const displayBindScore = Math.round(ensureNumber(ranking.bindScore || 0));

    // 세 가지 효과 점수의 합계로 환산합산 계산
    const combinedScore =
      displayGradeScore + displayFactionScore + displayBindScore;

    let gradeSetInfo = "";
    if (ranking.gradeCounts) {
      for (const [category, grades] of Object.entries(ranking.gradeCounts)) {
        for (const [grade, count] of Object.entries(grades)) {
          if (count >= 2) {
            const gradeClass =
              grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
            gradeSetInfo += `<span class="grade-tag ${gradeClass}">${grade} X ${count}</span> `;
          }
        }
      }
    }

    let factionSetInfo = "";
    if (ranking.factionCounts) {
      for (const [category, factions] of Object.entries(
        ranking.factionCounts
      )) {
        const factionTags = Object.entries(factions)
          .filter(([_, count]) => count >= 2)
          .map(([faction, count]) => {
            const iconPath =
              window.CommonData?.FACTION_ICONS?.[faction] ||
              "assets/img/bond/default.jpg";
            return `<span class="faction-tag"><img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} X ${count}</span>`;
          })
          .join(" ");

        if (factionTags) {
          factionSetInfo += factionTags;
        }
      }
    }

    const modalContent = `
      <div class="modal">
        <button class="modal-close">✕</button>
  
        <h3 class="modal-title">${currentCategory} 결속 랭킹 #${rank} 상세정보</h3>
        
        <div class="modal-content">
          <div class="weighted-score">
            <h4>환산합산: <span id="weightedScore">${combinedScore}</span></h4>
            <small>(피해저항관통 + 피해저항 + 대인피해% *10 + 대인방어% *10)</small>
          </div>
  
          <div id="selectedSpiritsInfo" class="selected-spirits-info">
            <h4>조합 환수 정보</h4>
            <div id="spiritsInfoList" class="spirits-info-list">
              ${ranking.spirits
                .map(
                  (spirit) => `
                <div class="spirit-info-item">
                  <img src="${spirit.image}" alt="${
                    spirit.name
                  }" onclick="RankingViewer.showSpiritModal({name:'${
                    spirit.name
                  }', image:'${spirit.image}', faction:'${
                    spirit.faction || ""
                  }', influence:'${
                    spirit.influence || ""
                  }'}, '${currentCategory}')">
                  <div class="spirit-info-details">
                    <div class="spirit-info-name">${spirit.name}</div>
                    <div class="spirit-info-level">
                      ${spirit.level ? "Lv." + spirit.level + ", " : ""}${
                    spirit.grade
                  }, ${spirit.faction || spirit.influence || "결의"}
                    </div>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
  
          <div class="results-container">
            <div class="results-section">
              <h4>등급 결속 효과 <span class="section-score">(${displayGradeScore})</span></h4>
              <div class="set-info">${gradeSetInfo}</div>
              <div id="gradeEffects" class="effects-list">
                ${renderDetailEffectsList(ranking.gradeEffects || {})}
              </div>
            </div>
            
            <div class="results-section">
              <h4>세력 결속 효과 <span class="section-score">(${displayFactionScore})</span></h4>
              <div class="set-info">${factionSetInfo}</div>
              <div id="factionEffects" class="effects-list">
                ${renderDetailEffectsList(ranking.factionEffects || {})}
              </div>
            </div>
            
            <div class="results-section">
              <h4>장착 효과 <span class="section-score">(${displayBindScore})</span>
                <span class="info-icon" title="각인효과를 제외한 수치입니다">ⓘ</span>
              </h4>
              <div id="bindEffects" class="effects-list">
                ${renderDetailEffectsList(ranking.bindStats || {})}
              </div>
            </div>
          </div>
          
          <div id="optimalSpiritsDetails" class="spirit-details-container">
            <h4>환수 상세 스탯</h4>
            <div id="spiritStatsDetails" class="spirit-stats-grid">
              ${renderDetailSpiritTable(ranking.spirits)}
            </div>
          </div>
        </div>
      </div>
    `;

    modal.innerHTML = modalContent;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // console.log("모달 표시됨");
  }

  function renderDetailEffectsList(effects) {
    if (!effects || Object.keys(effects).length === 0) {
      return "<p style='color: #999; font-style: italic; padding: 10px;'>적용된 효과가 없습니다.</p>";
    }

    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
      "power",
    ];

    const percentStats = window.CommonData.PERCENT_STATS || [];

    let html = `<div style="display: flex; flex-direction: column; gap: 5px;">`;

    const sortedStats = Object.keys(effects).sort((a, b) => {
      const aIndex = priorityStats.indexOf(a);
      const bIndex = priorityStats.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      const aName = window.CommonData.STATS_MAPPING[a] || a;
      const bName = window.CommonData.STATS_MAPPING[b] || b;
      return aName.localeCompare(bName);
    });

    sortedStats.forEach((stat) => {
      const value = effects[stat];
      const statName = window.CommonData.STATS_MAPPING[stat] || stat;
      const isPercentStat = percentStats.includes(stat);
      const displayValue = isPercentStat ? `${value}%` : value;
      const colorClass = window.CommonData.STAT_COLOR_MAP?.[stat] || "";

      html += `
          <div style="display: flex; justify-content: space-between; padding: 3px 8px; border-radius: 3px; background: #f8f9fa;">
            <span style="color: ${colorClass || "#333"}">${statName}</span>
            <span style="font-weight: bold; color: ${
              colorClass || "#333"
            }">${displayValue}</span>
          </div>
        `;
    });

    html += `</div>`;
    return html;
  }

  ///////////////////

  // function renderSpiritDetailsTable(spirits) {
  //   const container = document.getElementById("spiritStatsDetails");
  //   if (!container) return;

  //   container.innerHTML = "";

  //   if (!spirits || !Array.isArray(spirits) || spirits.length === 0) {
  //     container.innerHTML = "<p>표시할 환수 정보가 없습니다.</p>";
  //     return;
  //   }

  //   const allStatKeys = new Set();

  //   spirits.forEach((spirit) => {
  //     if (!spirit || !spirit.stats || !Array.isArray(spirit.stats)) return;

  //     const levelStats = spirit.stats.find(
  //       (s) => s && s.level === spirit.level
  //     );
  //     if (levelStats && levelStats.registrationStat) {
  //       Object.keys(levelStats.registrationStat).forEach((key) => {
  //         if (key) allStatKeys.add(normalizeStatKey(key));
  //       });
  //     }

  //     let bindStatData = null;

  //     if (levelStats && levelStats.bindStat) {
  //       bindStatData = levelStats.bindStat;
  //     } else if (spirit.hasLevel25Bind) {
  //       const level25Stat = spirit.stats.find((s) => s && s.level === 25);
  //       if (level25Stat && level25Stat.bindStat) {
  //         bindStatData = level25Stat.bindStat;
  //       }
  //     }

  //     if (bindStatData) {
  //       Object.keys(bindStatData).forEach((key) => {
  //         if (key) allStatKeys.add(normalizeStatKey(key));
  //       });
  //     }
  //   });

  //   if (allStatKeys.size === 0) {
  //     container.innerHTML = "<p>표시할 스탯 정보가 없습니다.</p>";
  //     return;
  //   }

  //   const priorityStats = [
  //     "damageResistancePenetration",
  //     "damageResistance",
  //     "pvpDamagePercent",
  //     "pvpDefensePercent",
  //   ];

  //   const sortedStatKeys = Array.from(allStatKeys).sort((a, b) => {
  //     const aPriority = priorityStats.indexOf(a);
  //     const bPriority = priorityStats.indexOf(b);

  //     if (aPriority !== -1 && bPriority !== -1) {
  //       return aPriority - bPriority;
  //     } else if (aPriority !== -1) {
  //       return -1;
  //     } else if (bPriority !== -1) {
  //       return 1;
  //     } else {
  //       return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
  //     }
  //   });

  //   const table = document.createElement("table");
  //   table.className = "spirits-stats-table";

  //   const headerRow = document.createElement("tr");
  //   const emptyHeader = document.createElement("th");
  //   emptyHeader.textContent = "환수";
  //   headerRow.appendChild(emptyHeader);

  //   spirits.forEach((spirit) => {
  //     if (!spirit) return;

  //     const spiritHeader = document.createElement("th");
  //     spiritHeader.innerHTML = `
  //       <img src="${spirit.image || ""}" alt="${spirit.name || "환수"}"
  //            class="spirit-thumbnail"><br>${spirit.name || "환수"}
  //     `;
  //     headerRow.appendChild(spiritHeader);
  //   });
  //   table.appendChild(headerRow);

  //   const scoreRow = document.createElement("tr");
  //   const scoreHeader = document.createElement("th");
  //   scoreHeader.textContent = "환산합산";
  //   scoreHeader.style.backgroundColor = "#e3f2fd";
  //   scoreRow.appendChild(scoreHeader);

  //   spirits.forEach((spirit) => {
  //     if (!spirit) return;

  //     const scoreCell = document.createElement("td");
  //     scoreCell.style.backgroundColor = "#e3f2fd";
  //     scoreCell.style.fontWeight = "bold";

  //     let totalScore = 0;

  //     try {
  //       if (spirit.stats && Array.isArray(spirit.stats)) {
  //         const levelStat = spirit.stats.find(
  //           (s) => s && s.level === spirit.level
  //         );

  //         if (levelStat && levelStat.registrationStat) {
  //           const stats = levelStat.registrationStat;

  //           const penResist = parseFloat(
  //             stats.damageResistancePenetration || 0
  //           );
  //           const resist = parseFloat(stats.damageResistance || 0);
  //           const pvpDmg = parseFloat(stats.pvpDamagePercent || 0) * 10;
  //           const pvpDef = parseFloat(stats.pvpDefensePercent || 0) * 10;

  //           totalScore = penResist + resist + pvpDmg + pvpDef;
  //         }

  //         let bindStat = null;

  //         if (levelStat && levelStat.bindStat) {
  //           bindStat = levelStat.bindStat;
  //         } else if (spirit.hasLevel25Bind) {
  //           const level25Stat = spirit.stats.find((s) => s && s.level === 25);
  //           if (level25Stat && level25Stat.bindStat) {
  //             bindStat = level25Stat.bindStat;
  //           }
  //         }

  //         if (bindStat) {
  //           const bindPenResist = parseFloat(
  //             bindStat.damageResistancePenetration || 0
  //           );
  //           const bindResist = parseFloat(bindStat.damageResistance || 0);
  //           const bindPvpDmg = parseFloat(bindStat.pvpDamagePercent || 0) * 10;
  //           const bindPvpDef = parseFloat(bindStat.pvpDefensePercent || 0) * 10;

  //           const bindScore =
  //             bindPenResist + bindResist + bindPvpDmg + bindPvpDef;

  //           if (bindScore > 0) {
  //             // scoreCell.innerHTML = `${Math.round(
  //             //   totalScore
  //             // )}<br><span style="color:#e67e22; font-size:0.85em;">(+${Math.round(
  //             //   bindScore
  //             // )})</span>`;

  //             scoreCell.innerHTML = `<span style="color:#e67e22; font-size:0.85em;">${Math.round(
  //               bindScore
  //             )}</span>`;
  //             scoreRow.appendChild(scoreCell);
  //             return;
  //           }
  //         }
  //       }
  //     } catch (e) {
  //       console.warn("점수 계산 중 오류 발생:", e);
  //     }

  //     scoreCell.textContent = Math.round(totalScore);
  //     scoreRow.appendChild(scoreCell);
  //   });

  //   table.appendChild(scoreRow);

  //   const levelRow = document.createElement("tr");
  //   const levelHeader = document.createElement("th");
  //   levelHeader.textContent = "레벨";
  //   levelRow.appendChild(levelHeader);

  //   spirits.forEach((spirit) => {
  //     if (!spirit) return;

  //     const levelCell = document.createElement("td");
  //     levelCell.textContent = spirit.level || 0;
  //     levelRow.appendChild(levelCell);
  //   });
  //   table.appendChild(levelRow);

  //   const factionRow = document.createElement("tr");
  //   const factionHeader = document.createElement("th");
  //   factionHeader.textContent = "세력";
  //   factionRow.appendChild(factionHeader);

  //   spirits.forEach((spirit) => {
  //     if (!spirit) return;

  //     const factionCell = document.createElement("td");
  //     factionCell.textContent = spirit.influence || spirit.faction || "결의";
  //     factionRow.appendChild(factionCell);
  //   });
  //   table.appendChild(factionRow);

  //   sortedStatKeys.forEach((statKey) => {
  //     const row = document.createElement("tr");
  //     const statHeader = document.createElement("th");
  //     statHeader.textContent = STATS_MAPPING[statKey] || statKey;

  //     const colorClass = (STAT_COLOR_MAP && STAT_COLOR_MAP[statKey]) || "";
  //     if (colorClass) {
  //       statHeader.className = colorClass;
  //     }
  //     row.appendChild(statHeader);

  //     spirits.forEach((spirit) => {
  //       if (!spirit) return;

  //       const statCell = document.createElement("td");
  //       if (colorClass) {
  //         statCell.className = colorClass;
  //       }

  //       let statValue = 0;
  //       let bindValue = 0;

  //       try {
  //         if (spirit.stats && Array.isArray(spirit.stats)) {
  //           const levelStat = spirit.stats.find(
  //             (s) => s && s.level === spirit.level
  //           );
  //           if (levelStat && levelStat.registrationStat) {
  //             for (const [key, value] of Object.entries(
  //               levelStat.registrationStat
  //             )) {
  //               if (normalizeStatKey(key) === statKey) {
  //                 statValue = value || 0;
  //                 break;
  //               }
  //             }
  //           }

  //           let bindStat = null;

  //           if (levelStat && levelStat.bindStat) {
  //             bindStat = levelStat.bindStat;
  //           } else if (spirit.hasLevel25Bind) {
  //             const level25Stat = spirit.stats.find((s) => s && s.level === 25);
  //             if (level25Stat && level25Stat.bindStat) {
  //               bindStat = level25Stat.bindStat;
  //             }
  //           }

  //           if (bindStat) {
  //             for (const [key, value] of Object.entries(bindStat)) {
  //               if (normalizeStatKey(key) === statKey) {
  //                 bindValue = value || 0;
  //                 break;
  //               }
  //             }
  //           }
  //         }
  //       } catch (e) {
  //         console.warn("스탯 접근 중 오류 발생:", e);
  //         statValue = 0;
  //         bindValue = 0;
  //       }

  //       const isPercentStat =
  //         Array.isArray(PERCENT_STATS) && PERCENT_STATS.includes(statKey);

  //       if (bindValue > 0) {
  //         // statCell.innerHTML = isPercentStat
  //         //   ? `${statValue}%<br><span style="color:#e67e22; font-size:0.85em;">(+${bindValue}%)</span>`
  //         //   : `${statValue}<br><span style="color:#e67e22; font-size:0.85em;">(+${bindValue})</span>`;
  //         statCell.innerHTML = isPercentStat
  //           ? `<span style="color:#e67e22; font-size:0.85em;">${bindValue}%</span>`
  //           : `<span style="color:#e67e22; font-size:0.85em;">${bindValue}</span>`;
  //       } else {
  //         statCell.textContent = isPercentStat ? `${statValue}%` : statValue;
  //       }

  //       row.appendChild(statCell);
  //     });

  //     table.appendChild(row);
  //   });

  //   container.appendChild(table);
  // }

  function renderDetailSpiritTable(spirits) {
    if (!spirits || spirits.length === 0) {
      return "<p style='color: #999; font-style: italic; padding: 10px;'>환수 정보가 없습니다.</p>";
    }

    let html = `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">환수</th>
              ${spirits
                .map(
                  (spirit) => `
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                  <img src="${spirit.image}" alt="${
                    spirit.name
                  }" style="width: 32px; height: 32px; display: block; margin: 0 auto; cursor: pointer;"
                       onclick="RankingViewer.showSpiritModal({name:'${
                         spirit.name
                       }', image:'${spirit.image}', faction:'${
                    spirit.faction || ""
                  }', influence:'${
                    spirit.influence || ""
                  }'}, '${currentCategory}')">
                  <div style="margin-top: 5px; font-size: 12px;">${
                    spirit.name
                  }</div>
                </th>
              `
                )
                .join("")}
            </tr>
            <tr>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">레벨</th>
              ${spirits
                .map(
                  (spirit) => `
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${
                  spirit.level || 0
                }</td>
              `
                )
                .join("")}
            </tr>
            <tr>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">세력</th>
              ${spirits
                .map(
                  (spirit) => `
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${
                  spirit.faction || spirit.influence || "결의"
                }</td>
              `
                )
                .join("")}
            </tr>
            <tr style="background-color: #e3f2fd;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">환산합산</th>
              ${spirits
                .map((spirit) => {
                  const score = calculateSpiritScore(spirit);
                  return `
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd; font-weight: bold;">
                    ${
                      score.bindScore > 0
                        ? `<span style="color: #e67e22; font-size: 11px;">${score.bindScore}</span>`
                        : ""
                    }
                  </td>
                `;
                })
                .join("")}
            </tr>

            <tr>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">피해저항관통</th>
              ${spirits
                .map((spirit) => {
                  const stats = getSpiritStatValues(
                    spirit,
                    "damageResistancePenetration"
                  );
                  return `
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    ${
                      stats.bindValue > 0
                        ? `<span style="color: #e67e22; font-size: 11px;">${stats.bindValue}</span>`
                        : ""
                    }
                  </td>
                `;
                })
                .join("")}
            </tr>
            <tr>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">피해저항</th>
              ${spirits
                .map((spirit) => {
                  const stats = getSpiritStatValues(spirit, "damageResistance");
                  return `
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    ${
                      stats.bindValue > 0
                        ? `<br><span style="color: #e67e22; font-size: 11px;">${stats.bindValue}</span>`
                        : ""
                    }
                  </td>
                `;
                })
                .join("")}
            </tr>
            <tr>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">대인피해%</th>
              ${spirits
                .map((spirit) => {
                  const stats = getSpiritStatValues(spirit, "pvpDamagePercent");
                  return `
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    ${
                      stats.bindValue > 0
                        ? `<span style="color: #e67e22; font-size: 11px;">${stats.bindValue}%</span>`
                        : ""
                    }
                  </td>
                `;
                })
                .join("")}
            </tr>
            <tr>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">대인방어%</th>
              ${spirits
                .map((spirit) => {
                  const stats = getSpiritStatValues(
                    spirit,
                    "pvpDefensePercent"
                  );
                  return `
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    ${
                      stats.bindValue > 0
                        ? `<span style="color: #e67e22; font-size: 11px;">${stats.bindValue}%</span>`
                        : ""
                    }
                  </td>
                `;
                })
                .join("")}
            </tr>
          </table>
        </div>
      `;

    return html;
  }

  function calculateSpiritScore(spirit) {
    let regScore = 0;
    let bindScore = 0;

    if (spirit.stats && Array.isArray(spirit.stats)) {
      const levelStat = spirit.stats.find((s) => s && s.level === spirit.level);
      if (levelStat && levelStat.registrationStat) {
        const stats = levelStat.registrationStat;
        regScore += ensureNumber(stats.damageResistancePenetration) || 0;
        regScore += ensureNumber(stats.damageResistance) || 0;
        regScore += (ensureNumber(stats.pvpDamagePercent) || 0) * 10;
        regScore += (ensureNumber(stats.pvpDefensePercent) || 0) * 10;
      }

      let bindStat = null;
      if (levelStat && levelStat.bindStat) {
        bindStat = levelStat.bindStat;
      } else if (spirit.hasLevel25Bind) {
        const level25Stat = spirit.stats.find((s) => s && s.level === 25);
        if (level25Stat && level25Stat.bindStat) {
          bindStat = level25Stat.bindStat;
        }
      }

      if (bindStat) {
        bindScore += ensureNumber(bindStat.damageResistancePenetration) || 0;
        bindScore += ensureNumber(bindStat.damageResistance) || 0;
        bindScore += (ensureNumber(bindStat.pvpDamagePercent) || 0) * 10;
        bindScore += (ensureNumber(bindStat.pvpDefensePercent) || 0) * 10;
      }
    }

    return {
      reg: Math.round(regScore),
      bind: Math.round(bindScore),
      total: Math.round(regScore + bindScore),
      bindScore: Math.round(bindScore),
    };
  }

  function getSpiritStatValues(spirit, statKey) {
    let regValue = 0;
    let bindValue = 0;

    if (spirit.stats && Array.isArray(spirit.stats)) {
      const levelStat = spirit.stats.find((s) => s && s.level === spirit.level);
      if (levelStat && levelStat.registrationStat) {
        regValue = ensureNumber(levelStat.registrationStat[statKey]) || 0;
      }

      let bindStat = null;
      if (levelStat && levelStat.bindStat) {
        bindStat = levelStat.bindStat;
      } else if (spirit.hasLevel25Bind) {
        const level25Stat = spirit.stats.find((s) => s && s.level === 25);
        if (level25Stat && level25Stat.bindStat) {
          bindStat = level25Stat.bindStat;
        }
      }

      if (bindStat) {
        bindValue = ensureNumber(bindStat[statKey]) || 0;
      }
    }

    return { regValue, bindValue };
  }

  function ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  function showLoading() {
    rankingNotice.style.display = "block";
    rankingNotice.innerHTML = "<p>랭킹 데이터를 불러오는 중입니다...</p>";
  }

  function hideLoading() {
    rankingNotice.style.display = "none";
  }

  function showError(message) {
    rankingNotice.style.display = "block";
    rankingNotice.classList.add("error");
    rankingNotice.innerHTML = `<p class="error-message">${message}</p>`;
  }

  document.addEventListener("DOMContentLoaded", initialize);

  return {
    changePage,
    loadRankingData,
    showDetailModal,
    showSpiritModal,
  };
})();

window.RankingViewer = RankingViewer;

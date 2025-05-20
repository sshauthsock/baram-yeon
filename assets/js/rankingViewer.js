const RankingViewer = (function () {
  let currentCategory = "수호";
  let currentRankingType = "bond";
  let currentStat = "bind";
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalRankings = 0;
  let rankings = [];
  let metadata = null;
  let currentGradeFilter = "all";
  let allRankingsData = {};

  let bondRankingsContainer;
  let statRankingsContainer;
  let statSelectorContainer;
  let paginationContainer;
  let rankingNotice;

  function initialize() {
    bondRankingsContainer = document.getElementById("bondRankingsContainer");
    statRankingsContainer = document.getElementById("statRankingsContainer");
    statSelectorContainer = document.getElementById("statSelectorContainer");
    paginationContainer = document.getElementById("pagination");
    rankingNotice = document.getElementById("rankingNotice");

    if (!bondRankingsContainer) {
      console.error("필수 DOM 요소를 찾을 수 없습니다");
      return;
    }

    setupModalEvents();
    setupEventListeners();
    initStyles();

    if (
      typeof FirebaseHandler !== "undefined" &&
      FirebaseHandler.initFirebase
    ) {
      FirebaseHandler.initFirebase();
      FirebaseHandler.testFirebaseConnectivity().then(() => {
        if (DataManager && typeof DataManager.loadCategoryData === "function") {
          DataManager.loadCategoryData()
            .then(() => {
              loadRankingData();
            })
            .catch(() => loadRankingData());
        } else {
          loadRankingData();
        }
      });
    } else {
      loadRankingData();
    }

    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("spirit-image")) {
        if (!e.target.hasAttribute("data-image")) {
          const img = e.target;
          const imgUrl = img.getAttribute("src");
          const category = currentCategory;
          const spiritName = img.getAttribute("alt") || null;

          console.log("이미지 직접 클릭 감지:", imgUrl);
          showSpiritModal(imgUrl, category, "", spiritName);
        }
      }
    });
  }

  function initStyles() {
    const styleElement = document.createElement("style");
    styleElement.id = "ranking-viewer-styles";
    styleElement.textContent = `
      .calculating-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 300px;
      }
      .calculating-box {
        text-align: center;
        padding: 30px;
        background: #f8f8f8;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 400px;
      }
      .calculating-spinner {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .section-title {
        font-weight: bold;
        margin-bottom: 10px;
        color: #333;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }
      .section-score {
        color: #e67e22;
        font-weight: bold;
      }
      .info-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: #3498db;
        color: white;
        font-size: 11px;
        cursor: pointer;
        margin-left: 5px;
        font-weight: bold;
        vertical-align: middle;
        position: relative;
      }
      
      .data-warning-box {
        margin: 10px 0 20px;
        padding: 15px;
        background-color: #fff3cd;
        border-left: 5px solid #ffc107;
        border-radius: 4px;
        font-size: 0.9em;
      }
      
      .data-warning-box h4 {
        margin-top: 0;
        color: #856404;
      }
      
      .data-warning-box p {
        margin: 5px 0;
      }
      
      .data-submission-request {
        margin: 15px 0;
        padding: 12px 15px;
        background-color: #e8f4f8;
        border: 2px solid #3498db;
        border-radius: 5px;
        font-style: italic;
        font-size: 12px;
        color: #333;
        text-align: center;
        font-weight: bold;
      }
      
      .spirits-grid-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: 6px;
        margin-top: 12px;
      }
      
      .spirit-info-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 5px;
        border-radius: 5px;
        background-color: #f9f9f9;
        border: 1px solid #eee;
        height: 100%;
      }
      
      .spirit-info-item img {
        width: 45px;
        height: 45px;
        object-fit: contain;
        margin-bottom: 3px;
      }
      
      .spirit-info-details {
        width: 100%;
        text-align: center;
      }
      
      .spirit-info-name {
        font-weight: bold;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .spirit-info-level {
        font-size: 9px;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .spirits-stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 0.85rem;
      }
      
      .spirits-stats-table th, .spirits-stats-table td {
        padding: 6px 4px;
        text-align: center;
        border: 1px solid #dee2e6;
      }
      
      .spirits-stats-table th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      
      .spirits-stats-table .spirit-thumbnail {
        width: 30px;
        height: 30px;
        object-fit: contain;
        margin-bottom: 2px;
      }
      
      .stat-highlight {
        background-color: #fff3cd !important;
        font-weight: bold !important;
        box-shadow: 0 0 5px rgba(230, 126, 34, 0.5) !important;
        border-left: 3px solid #e67e22 !important;
        padding-left: 5px !important;
      }
    `;
    document.head.appendChild(styleElement);
  }

  function setupModalEvents() {
    const modal = document.getElementById("rankingDetailModal");
    if (modal) {
      const closeBtn = modal.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          closeRankingModal();
        });
      }

      modal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeRankingModal();
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeRankingModal();
      }
    });
  }

  function closeRankingModal() {
    const modal = document.getElementById("rankingDetailModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  function handleModalOutsideClick(e) {
    if (e.target === this) {
      closeModal();
    }
  }

  function handleEscKeypress(e) {
    if (e.key === "Escape") {
      closeModal();
    }
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
      statSelector.addEventListener("change", function () {
        currentStat = this.value;
        currentPage = 1;
        loadRankingData();
      });
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

  function loadRankingData() {
    showLoading();

    const savedItemsPerPage = localStorage.getItem("rankingItemsPerPage");
    if (savedItemsPerPage) {
      if (savedItemsPerPage === "all") {
        itemsPerPage = Number.MAX_SAFE_INTEGER;
      } else {
        itemsPerPage = parseInt(savedItemsPerPage);
      }
    }

    try {
      if (!metadata) {
        RankingManager.loadMetadata()
          .then((data) => {
            metadata = data;
            updateLastUpdated();
            continueLoading();
          })
          .catch((error) => {
            showError(
              "랭킹 데이터를 불러오는 중 오류가 발생했습니다: " + error.message
            );
            console.error("랭킹 데이터 로드 오류:", error);
          });
      } else {
        continueLoading();
      }
    } catch (error) {
      showError(
        "랭킹 데이터를 불러오는 중 오류가 발생했습니다: " + error.message
      );
      console.error("랭킹 데이터 로드 오류:", error);
    }

    function continueLoading() {
      if (currentRankingType === "bond") {
        loadBondRankings().then(() => {
          attachSpiritImageClickEvents();
        });
      } else {
        loadStatRankings();
      }
    }
  }

  async function loadBondRankings() {
    if (currentCategory === "탑승") {
      bondRankingsContainer.innerHTML = `
        <div class="info-message">
          <h3>안내</h3>
          <p>탑승 25레벨 정보가 부족합니다. 정보 취합되면 랭킹을 보여드리겠습니다.</p>
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

    try {
      let docName =
        currentGradeFilter === "legendary"
          ? `legendary-bond-rankings-${categoryMap[currentCategory]}`
          : `bond-rankings-${categoryMap[currentCategory]}`;

      let rankingData;

      try {
        if (typeof firebase !== "undefined" && firebase.apps.length) {
          const db = firebase.firestore();
          const doc = await db.collection("mobRankingData").doc(docName).get();

          if (doc.exists) {
            rankingData = doc.data();
          } else if (currentGradeFilter === "legendary") {
            docName = `bond-rankings-${categoryMap[currentCategory]}`;
            const regularDoc = await db
              .collection("mobRankingData")
              .doc(docName)
              .get();

            if (regularDoc.exists) {
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

              totalRankings = rankings.length;
              renderBondRankings();
              renderPagination();
              hideLoading();
              return;
            }
          }
        }

        if (!rankingData) {
          rankingData = await RankingManager.loadBondRankings(currentCategory);
        }
      } catch (error) {
        console.error("Firebase에서 랭킹 로드 실패:", error);
        rankingData = await RankingManager.loadBondRankings(currentCategory);
      }

      if (!rankingData?.rankings && !rankingData?.data?.rankings) {
        throw new Error(
          `${currentCategory} 결속 랭킹 데이터를 찾을 수 없습니다`
        );
      }

      allRankingsData[currentCategory] =
        rankingData.rankings || rankingData.data.rankings || [];

      if (currentGradeFilter === "legendary") {
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
        rankings = allRankingsData[currentCategory];
      }

      totalRankings = rankings.length;

      renderBondRankings();
      renderPagination();
      hideLoading();
    } catch (error) {
      console.error(`결속 랭킹 로드 중 오류:`, error);
      throw new Error(
        `${currentCategory} ${
          currentGradeFilter === "legendary" ? "전설환수" : ""
        } 결속 랭킹을 불러올 수 없습니다: ${error.message}`
      );
    }
  }

  async function loadStatRankings() {
    try {
      showLoading();

      const allSpirits = window.DataManager.getData(currentCategory);

      if (!allSpirits || allSpirits.length === 0) {
        throw new Error(`${currentCategory} 환수 데이터를 찾을 수 없습니다`);
      }

      console.log(
        `${currentCategory} 카테고리에서 ${allSpirits.length}개의 환수 데이터를 로드했습니다.`
      );

      let calculatedRankings = [];

      allSpirits.forEach((spirit) => {
        if (!spirit || !spirit.stats || !Array.isArray(spirit.stats)) return;

        const level25Stat = spirit.stats.find((s) => s && s.level === 25);
        if (!level25Stat) return;

        let regValue = 0;
        let bindValue = 0;
        let sortValue = 0;
        let hasValue = false;

        if (currentStat === "registration") {
          if (level25Stat.registrationStat) {
            regValue = calculateWeightedScore(level25Stat.registrationStat);
            hasValue = regValue > 0;
            sortValue = regValue;
          }
        } else if (currentStat === "bind") {
          if (level25Stat.bindStat) {
            bindValue = calculateWeightedScore(level25Stat.bindStat);
            hasValue = bindValue > 0;
            sortValue = bindValue;
          }
        } else {
          if (
            level25Stat.registrationStat &&
            level25Stat.registrationStat[currentStat] !== undefined
          ) {
            regValue = SpiritUtils.ensureNumber(
              level25Stat.registrationStat[currentStat]
            );
            hasValue = true;
          }

          if (
            level25Stat.bindStat &&
            level25Stat.bindStat[currentStat] !== undefined
          ) {
            bindValue = SpiritUtils.ensureNumber(
              level25Stat.bindStat[currentStat]
            );
            hasValue = bindValue > 0 || regValue > 0;
          }

          sortValue = regValue + bindValue;
        }

        if (hasValue) {
          calculatedRankings.push({
            name: spirit.name,
            image: spirit.image,
            faction: spirit.influence || spirit.faction,
            influence: spirit.influence || spirit.faction,
            value: sortValue,
            regValue: regValue,
            bindValue: bindValue,
            isPercent: window.CommonData?.PERCENT_STATS?.includes(currentStat),
          });
        }
      });

      calculatedRankings.sort((a, b) => b.value - a.value);

      console.log(`${calculatedRankings.length}개의 환수 랭킹을 계산했습니다.`);

      rankings = calculatedRankings;
      totalRankings = calculatedRankings.length;

      renderStatRankings();
      hideLoading();
    } catch (error) {
      console.error(`능력치 랭킹 로드 중 오류:`, error);
      showError(
        `${currentCategory} 능력치 랭킹을 불러올 수 없습니다: ${error.message}`
      );
    }
  }

  function calculateWeightedScore(stats) {
    if (!stats) return 0;

    const penResist = SpiritUtils.ensureNumber(
      stats.damageResistancePenetration || 0
    );
    const resist = SpiritUtils.ensureNumber(stats.damageResistance || 0);
    const pvpDmg = SpiritUtils.ensureNumber(stats.pvpDamagePercent || 0) * 10;
    const pvpDef = SpiritUtils.ensureNumber(stats.pvpDefensePercent || 0) * 10;

    return penResist + resist + pvpDmg + pvpDef;
  }

  function renderBondRankings() {
    if (!rankings || rankings.length === 0) {
      let message = "랭킹 데이터가 없습니다.";

      if (
        currentGradeFilter === "legendary" &&
        allRankingsData[currentCategory] &&
        allRankingsData[currentCategory].length > 0
      ) {
        message =
          "전설환수로만 구성된 랭킹 데이터가 없습니다.<br>다른 조합에서는 불멸환수가 포함되어 있습니다.";
      }

      bondRankingsContainer.innerHTML = `<div class="no-data-message">${message}</div>`;
      return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, rankings.length);
    const currentRankings = rankings.slice(startIndex, endIndex);

    let tableHtml = "";

    if (currentGradeFilter === "legendary") {
      tableHtml += `
        <div class="filter-notice">
          <p><strong>현재 전설환수로만 구성된 조합만 표시하고 있습니다.</strong> 
          (${rankings.length}개 조합 / 전체 ${allRankingsData[currentCategory].length}개 중)</p>
        </div>
      `;
    }

    tableHtml += `
      <div class="ranking-table-container">
        <table class="ranking-table">
          <thead>
            <tr>
              <th class="rank-column">순위</th>
              <th>환수</th>
              <th class="faction-column">세력</th>
              <th>환산</th>
              <th class="action-column">상세</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentRankings.forEach((ranking, index) => {
      const rank = startIndex + index + 1;
      const isTop = rank <= 3;

      let spiritsHtml = "";
      if (ranking.spirits && ranking.spirits.length > 0) {
        spiritsHtml = ranking.spirits
          .map(
            (spirit) => `
          <img src="${spirit.image}" alt="${spirit.name}" title="${
              spirit.name
            }" 
              class="spirit-image ${isTop ? "top-rank" : ""}"
              data-image="${spirit.image}"
              data-category="${spirit.category || currentCategory}"
              data-influence="${spirit.faction || spirit.influence || ""}"
              data-name="${spirit.name}">
        `
          )
          .join("");
      }

      let factionTagsHtml = "";

      if (ranking.gradeCounts) {
        Object.entries(ranking.gradeCounts).forEach(([category, grades]) => {
          Object.entries(grades).forEach(([grade, count]) => {
            if (count >= 2) {
              const gradeClass =
                grade === "전설" ? "grade-tag-legend" : "grade-tag-immortal";
              factionTagsHtml += `<span class="grade-tag ${gradeClass}">${grade} x${count}</span>`;
            }
          });
        });
      }

      if (ranking.factionCounts) {
        Object.entries(ranking.factionCounts).forEach(
          ([category, factions]) => {
            Object.entries(factions).forEach(([faction, count]) => {
              if (count >= 2) {
                const iconPath =
                  window.CommonData?.FACTION_ICONS?.[faction] ||
                  "assets/img/bond/default.jpg";
                factionTagsHtml += `
                <span class="faction-tag">
                  <img src="${iconPath}" class="faction-icon" alt="${faction}"> ${faction} x${count}
                </span>
              `;
              }
            });
          }
        );
      }

      const gradeScore = Math.round(
        SpiritUtils.ensureNumber(ranking.gradeScore || 0)
      );
      const factionScore = Math.round(
        SpiritUtils.ensureNumber(ranking.factionScore || 0)
      );
      const bindScore = Math.round(
        SpiritUtils.ensureNumber(ranking.bindScore || 0)
      );
      const totalScore = gradeScore + factionScore + bindScore;

      const rankClass = isTop ? `top-${rank}` : "";

      tableHtml += `
        <tr class="ranking-row ${rankClass}">
          <td class="rank-column">
            <div class="rank-badge rank-${rank}">${rank}</div>
          </td>
          <td class="spirits-column">
            <div class="spirits-container">${spiritsHtml}</div>
          </td>
          <td class="faction-column">
            <div class="faction-tags">${factionTagsHtml}</div>
          </td>
          <td class="score-column">
            <div class="total-score">${totalScore}</div>
            <div class="score-breakdown">
              (등급: ${gradeScore} | 세력: ${factionScore} | 장착: ${bindScore})
            </div>
          </td>
          <td class="action-column">
            <button class="detail-button" onclick="RankingViewer.showDetailModal(${index})">상세 보기</button>
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

    attachSpiritImageClickEvents();

    const mobileStyle = document.getElementById("bond-rankings-mobile-style");
    if (mobileStyle) mobileStyle.remove();

    const newMobileStyle = document.createElement("style");
    newMobileStyle.id = "bond-rankings-mobile-style";
    newMobileStyle.innerHTML = `
      @media (max-width: 768px) {
        .ranking-table .faction-column { display: none; }
      }
    `;
    document.head.appendChild(newMobileStyle);
  }

  function attachSpiritImageClickEvents() {
    document.querySelectorAll(".spirit-image").forEach((img) => {
      img.removeEventListener("click", handleSpiritImageClick);
      img.addEventListener("click", handleSpiritImageClick);
    });
  }

  function handleSpiritImageClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const img = e.currentTarget;
    const imageUrl = img.getAttribute("data-image");
    const category = img.getAttribute("data-category") || currentCategory;
    const influence = img.getAttribute("data-influence") || "";
    const spiritName = img.getAttribute("data-name") || "";

    console.log("환수 이미지 클릭:", {
      imageUrl,
      category,
      influence,
      spiritName,
    });

    if (imageUrl) {
      showSpiritModal(imageUrl, category, influence, spiritName);
    } else {
      console.error("이미지 URL을 찾을 수 없습니다");
    }
  }

  function renderStatRankings() {
    if (!rankings || rankings.length === 0) {
      statRankingsContainer.innerHTML = `
        <div class="no-data-message">랭킹 데이터가 없습니다.</div>
      `;
      return;
    }

    let statDisplayName = currentStat;

    if (currentStat === "registration") {
      statDisplayName = "등록효과";
    } else if (currentStat === "bind") {
      statDisplayName = "장착효과";
    } else {
      statDisplayName =
        window.CommonData?.STATS_MAPPING?.[currentStat] || currentStat;
    }

    const isPercentStat =
      window.CommonData?.PERCENT_STATS?.includes(currentStat);

    let html = `
      <h3 class="stat-ranking-title">${statDisplayName} 랭킹 - 전체 ${rankings.length}개 항목</h3>
    `;

    if (currentStat !== "registration" && currentStat !== "bind") {
      html += `
        <div class="stat-format-info">
          <p class="stat-info">표시 형식: 등록효과 (장착효과)</p>
        </div>
      `;
    }

    html += `<div class="stat-grid-container">`;

    rankings.forEach((ranking, index) => {
      const rank = index + 1;
      const topClass = rank <= 3 ? `top-${rank}` : "";

      let displayValue = "";

      if (currentStat === "registration") {
        displayValue = ranking.isPercent
          ? `${ranking.regValue}%`
          : ranking.regValue;
      } else if (currentStat === "bind") {
        displayValue = ranking.isPercent
          ? `${ranking.bindValue}%`
          : ranking.bindValue;
      } else {
        const regValue = ranking.regValue;
        const bindValue = ranking.bindValue;

        if (ranking.isPercent) {
          displayValue = `${regValue}% (${bindValue}%)`;
        } else {
          displayValue = `${regValue} (${bindValue})`;
        }
      }

      html += `
        <div class="stat-card ${topClass}" 
             data-image="${ranking.image}"
             data-category="${currentCategory}"
             data-influence="${ranking.faction || ranking.influence || ""}"
             data-name="${ranking.name}">
          <div class="rank-number">${rank}</div>
          <div class="spirit-image-container">
            <img src="${ranking.image}" alt="${
        ranking.name
      }" class="spirit-image" loading="lazy">
          </div>
          <div class="spirit-name">${ranking.name}</div>
          <div class="spirit-stat">${displayValue}</div>
        </div>
      `;
    });

    html += `</div>`;
    statRankingsContainer.innerHTML = html;

    document.querySelectorAll(".stat-card").forEach((card) => {
      card.removeEventListener("click", handleStatCardClick);
      card.addEventListener("click", handleStatCardClick);
    });

    const existingStyle = document.getElementById("stat-grid-style");
    if (existingStyle) existingStyle.remove();

    const gridStyle = document.createElement("style");
    gridStyle.id = "stat-grid-style";
    gridStyle.textContent = `
        .stat-grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 6px;
            margin-top: 10px;
        }
        
        .stat-card {
            padding: 8px 5px;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            text-align: center;
            position: relative;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.2s;
            height: auto;
            min-height: 130px;
            cursor: pointer;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .spirit-image-container {
            position: relative;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 5px;
            height: 60px;
            overflow: hidden;
        }
        
        .spirit-image {
            max-width: 80%;
            max-height: 55px;
            object-fit: contain;
        }
        
        .spirit-name {
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 4px 0;
        }
        
        .spirit-stat {
            font-size: 11px;
            color: #3498db;
        }
        
        .rank-number {
            position: absolute;
            top: 0;
            left: 0;
            background-color: #3498db;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 5px;
            border-radius: 3px 0 3px 0;
        }
        
        .top-1 .rank-number {
            background-color: #f39c12;
        }
        
        .top-2 .rank-number {
            background-color: #95a5a6;
        }
        
        .top-3 .rank-number {
            background-color: #d35400;
        }
    `;
    document.head.appendChild(gridStyle);
  }

  function handleStatCardClick(e) {
    const card = e.currentTarget;
    const imageUrl = card.getAttribute("data-image");
    const category = card.getAttribute("data-category") || currentCategory;
    const influence = card.getAttribute("data-influence") || "";
    const spiritName = card.getAttribute("data-name") || "";

    console.log("능력치 랭킹 카드 클릭:", {
      imageUrl,
      category,
      influence,
      spiritName,
    });

    if (imageUrl) {
      showSpiritModal(imageUrl, category, influence, spiritName);
    } else {
      console.error("이미지 URL을 찾을 수 없습니다");
    }
  }

  function renderPagination() {
    if (totalRankings <= itemsPerPage) {
      paginationContainer.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(totalRankings / itemsPerPage);
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let html = `<div class="pagination-controls">`;

    html += `
      <button class="pagination-button ${currentPage === 1 ? "disabled" : ""}" 
              onclick="RankingViewer.changePage(1)" ${
                currentPage === 1 ? "disabled" : ""
              }>
        &lt;&lt;
      </button>
      <button class="pagination-button ${currentPage === 1 ? "disabled" : ""}" 
              onclick="RankingViewer.changePage(${currentPage - 1})" ${
      currentPage === 1 ? "disabled" : ""
    }>
        ◀ 이전
      </button>
    `;

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="pagination-button ${i === currentPage ? "active" : ""}" 
                onclick="RankingViewer.changePage(${i})">
          ${i}
        </button>
      `;
    }

    html += `
      <button class="pagination-button ${
        currentPage === totalPages ? "disabled" : ""
      }" 
              onclick="RankingViewer.changePage(${currentPage + 1})" ${
      currentPage === totalPages ? "disabled" : ""
    }>
        다음 ▶
      </button>
      <button class="pagination-button ${
        currentPage === totalPages ? "disabled" : ""
      }" 
              onclick="RankingViewer.changePage(${totalPages})" ${
      currentPage === totalPages ? "disabled" : ""
    }>
        &gt;&gt;
      </button>
      <span class="pagination-info">${currentPage} / ${totalPages}</span>
    `;

    html += `</div>`;

    html += `
      <div class="items-per-page">
        <label for="itemsPerPageSelect">페이지당 항목 수:</label>
        <select id="itemsPerPageSelect">
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
        renderBondRankings();
        renderPagination();
      });
    }
  }

  function showSpiritModal(imageUrl, category, influence, spiritName = null) {
    console.log("랭킹 뷰어: 환수 모달 표시 요청", {
      imageUrl,
      category,
      influence,
      spiritName,
    });

    // 기존 모달 닫기
    if (typeof window.ModalHandler !== "undefined") {
      if (typeof window.ModalHandler.removeAllModals === "function") {
        window.ModalHandler.removeAllModals();
      } else if (typeof window.ModalHandler.closeModal === "function") {
        window.ModalHandler.closeModal();
      }
    }

    // 로딩 표시
    const loadingOverlay = document.createElement("div");
    loadingOverlay.className = "temp-loading-overlay";
    loadingOverlay.style = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    loadingOverlay.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 5px;">
        <div style="text-align: center;">
          <div class="calculating-spinner-small" style="margin: 0 auto 10px;"></div>
          환수 정보 로딩 중...
        </div>
      </div>
    `;
    document.body.appendChild(loadingOverlay);

    // 능력치 하이라이트 설정
    const highlightStat =
      currentRankingType === "stat" &&
      currentStat !== "bind" &&
      currentStat !== "registration"
        ? currentStat
        : null;

    // 환수 이름 찾기
    if (!spiritName) {
      spiritName = findSpiritNameInRankings(imageUrl);
    }

    // 데이터 로드 후 모달 표시
    window.DataManager.loadCategoryData()
      .then(() => {
        removeLoadingOverlay();

        if (window.ModalHandler) {
          try {
            window.ModalHandler.showRankingSpiritInfo(
              imageUrl,
              category,
              influence,
              highlightStat,
              spiritName
            );
          } catch (error) {
            console.error("모달 표시 중 오류 발생:", error);
            alert("환수 정보를 표시하는 중 오류가 발생했습니다.");
          }
        } else {
          alert(
            "환수 정보를 표시할 수 없습니다. ModalHandler를 찾을 수 없습니다."
          );
        }
      })
      .catch((err) => {
        removeLoadingOverlay();
        console.error("데이터 로드 중 오류:", err);
        alert("환수 정보를 불러오는데 실패했습니다.");
      });

    function removeLoadingOverlay() {
      if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }
  }

  function closeRankingModal() {
    if (typeof window.ModalHandler !== "undefined") {
      if (typeof window.ModalHandler.removeAllModals === "function") {
        window.ModalHandler.removeAllModals();
      } else if (typeof window.ModalHandler.closeModal === "function") {
        window.ModalHandler.closeModal();
      }
    }
  }

  function setupModalEvents() {
    const modal = document.getElementById("rankingDetailModal");
    if (modal) {
      const closeBtn = modal.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", closeRankingModal);
      }

      modal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeRankingModal();
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeRankingModal();
      }
    });
  }

  function showDetailModal(index) {
    if (!rankings || !rankings[index]) {
      console.error("Rankings data not found for index:", index);
      return;
    }

    const ranking = rankings[index];

    if (window.OptimalResultModal) {
      if (window.OptimalResultModal.prepareModalStructure("ranking")) {
        window.OptimalResultModal.showResultModal(ranking, "ranking");
      } else {
        console.error("Failed to prepare modal structure");
        alert("모달 구성 요소 준비에 실패했습니다.");
      }
    } else {
      console.error("OptimalResultModal not available");
      alert(
        "상세 정보를 표시할 수 없습니다. OptimalResultModal을 찾을 수 없습니다."
      );
    }
  }

  function filterStatOptions(filterText, isMobile = false) {
    const statOptions = isMobile
      ? document.getElementById("mobile-stat-options")
      : document.getElementById("stat-options");

    const options = statOptions.querySelectorAll(".stat-option");

    filterText = filterText.toLowerCase();
    let visibleCount = 0;

    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      const isVisible = text.includes(filterText);

      option.style.display = isVisible ? "block" : "none";
      if (isVisible) visibleCount++;
    });

    const noMatches = statOptions.querySelector(".no-matches");
    if (visibleCount === 0) {
      if (!noMatches) {
        const noMatchesElement = document.createElement("div");
        noMatchesElement.className = "no-matches";
        noMatchesElement.textContent = "일치하는 항목 없음";
        statOptions.appendChild(noMatchesElement);
      }
    } else {
      if (noMatches) noMatches.remove();
    }

    toggleStatOptions(true, isMobile);
  }

  function toggleStatOptions(show, isMobile = false) {
    const statOptions = isMobile
      ? document.getElementById("mobile-stat-options")
      : document.getElementById("stat-options");

    if (statOptions) {
      statOptions.style.display = show ? "block" : "none";

      if (show) {
        statOptions.scrollTop = 0;
      }
    }
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
    renderBondRankings();
    renderPagination();

    document
      .querySelector(".ranking-container")
      .scrollIntoView({ behavior: "smooth" });
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

  function showLoading() {
    rankingNotice.style.display = "block";
  }

  function hideLoading() {
    rankingNotice.style.display = "none";
  }

  function showError(message) {
    rankingNotice.style.display = "block";
    rankingNotice.innerHTML = `
      <div class="calculating-wrapper">
        <div class="calculating-box" style="background-color: #fff3cd; border-left: 5px solid #ffc107;">
          <h3 style="color: #856404;">오류 발생</h3>
          <p>${message}</p>
        </div>
      </div>
    `;
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

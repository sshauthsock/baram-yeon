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
  let initStarted = false;
  let initComplete = false;

  async function waitForDependencies() {
    console.log("RankingViewer: 의존성 로드 대기 시작");
    const requiredDeps = [
      "FirebaseHandler",
      "DataManager",
      "RankingManager",
      "SpiritUtils",
    ];
    let attempts = 0;
    const maxAttempts = 50; // 5초 (100ms × 50)

    return new Promise((resolve) => {
      function checkDependencies() {
        const missingDeps = requiredDeps.filter(
          (dep) => typeof window[dep] === "undefined"
        );

        if (missingDeps.length === 0) {
          console.log("RankingViewer: 모든 의존성 로드 완료");
          return resolve(true);
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.warn(
            `RankingViewer: 의존성 로드 시간 초과. 누락된 의존성: ${missingDeps.join(
              ", "
            )}`
          );
          return resolve(false);
        }

        console.log(
          `RankingViewer: 의존성 대기 중... (${attempts}/${maxAttempts}), 누락: ${missingDeps.join(
            ", "
          )}`
        );
        setTimeout(checkDependencies, 100);
      }

      checkDependencies();
    });
  }

  async function initialize() {
    // 이중 초기화 방지
    if (initStarted) {
      console.log("RankingViewer: 이미 초기화 진행 중");
      return;
    }

    initStarted = true;
    console.log("RankingViewer: 초기화 시작");

    // DOM 요소 참조 가져오기
    bondRankingsContainer = document.getElementById("bondRankingsContainer");
    statRankingsContainer = document.getElementById("statRankingsContainer");
    statSelectorContainer = document.getElementById("statSelectorContainer");
    paginationContainer = document.getElementById("pagination");
    rankingNotice = document.getElementById("rankingNotice");

    if (!bondRankingsContainer || !rankingNotice) {
      console.error("RankingViewer: 필수 DOM 요소를 찾을 수 없습니다");
      showError("페이지 요소를 찾을 수 없습니다. 페이지를 새로고침하세요.");
      return;
    }

    // 의존성이 로드될 때까지 대기
    const depsLoaded = await waitForDependencies();
    if (!depsLoaded) {
      showError(
        "필요한 모듈을 로드할 수 없습니다. 페이지를 새로고침해 주세요."
      );
      return;
    }

    // 이벤트 리스너 설정
    setupModalEvents();
    setupEventListeners();

    // Firebase 초기화
    if (
      typeof FirebaseHandler !== "undefined" &&
      FirebaseHandler.initFirebase
    ) {
      try {
        console.log("RankingViewer: Firebase 초기화 중");
        FirebaseHandler.initFirebase();
        await FirebaseHandler.testFirebaseConnectivity();
        console.log("RankingViewer: Firebase 연결 확인됨");
      } catch (err) {
        console.warn("RankingViewer: Firebase 연결 테스트 실패", err);
      }
    } else {
      console.warn(
        "RankingViewer: FirebaseHandler를 찾을 수 없거나 initFirebase 메소드가 없습니다"
      );
    }

    // 데이터 로드
    if (typeof DataManager !== "undefined" && DataManager.loadCategoryData) {
      try {
        console.log("RankingViewer: 카테고리 데이터 로드 중");
        await DataManager.loadCategoryData();
        console.log("RankingViewer: 카테고리 데이터 로드 완료");
      } catch (err) {
        console.warn("RankingViewer: 카테고리 데이터 로드 실패", err);
      }
    } else {
      console.warn(
        "RankingViewer: DataManager를 찾을 수 없거나, loadCategoryData 메소드가 없습니다"
      );
    }

    // 환수 이미지 클릭 이벤트 대리자(delegate) 설정
    document.addEventListener("click", function (e) {
      if (e.target.classList.contains("spirit-image")) {
        if (!e.target.hasAttribute("data-image")) {
          const img = e.target;
          const imgUrl = img.getAttribute("src");
          const category = currentCategory;
          const spiritName = img.getAttribute("alt") || null;
          showSpiritModal(imgUrl, category, "", spiritName);
        }
      }
    });

    // 랭킹 데이터 로드
    loadRankingData();

    initComplete = true;
    console.log("RankingViewer: 초기화 완료");
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
    if (!initComplete && !initStarted) {
      console.log(
        "RankingViewer: 초기화 완료 전에 loadRankingData 호출됨, 초기화 시작"
      );
      initialize();
      return;
    }

    showLoading();

    const savedItemsPerPage = localStorage.getItem("rankingItemsPerPage");
    if (savedItemsPerPage) {
      if (savedItemsPerPage === "all") {
        itemsPerPage = Number.MAX_SAFE_INTEGER;
      } else {
        itemsPerPage = parseInt(savedItemsPerPage);
      }
    }

    // RankingManager 의존성 체크
    if (typeof window.RankingManager === "undefined") {
      showError("RankingManager 모듈을 찾을 수 없습니다");
      return;
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
        loadBondRankings()
          .then(() => {
            attachSpiritImageClickEvents();
          })
          .catch((err) => {
            showError("결속 랭킹 로드 중 오류: " + err.message);
          });
      } else {
        loadStatRankings().catch((err) => {
          showError("능력치 랭킹 로드 중 오류: " + err.message);
        });
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

      if (typeof window.DataManager === "undefined") {
        throw new Error("DataManager를 찾을 수 없습니다");
      }

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

  function findSpiritNameInRankings(imageUrl) {
    if (!rankings || !imageUrl) return null;

    // 결속 랭킹에서 검색
    if (currentRankingType === "bond") {
      for (const ranking of rankings) {
        if (ranking.spirits) {
          for (const spirit of ranking.spirits) {
            if (spirit.image === imageUrl) {
              return spirit.name;
            }
          }
        }
      }
    }
    // 능력치 랭킹에서 검색
    else {
      for (const ranking of rankings) {
        if (ranking.image === imageUrl) {
          return ranking.name;
        }
      }
    }

    return null;
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
    loadingOverlay.style.position = "fixed";
    loadingOverlay.style.top = "0";
    loadingOverlay.style.left = "0";
    loadingOverlay.style.width = "100%";
    loadingOverlay.style.height = "100%";
    loadingOverlay.style.backgroundColor = "rgba(0,0,0,0.5)";
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.alignItems = "center";
    loadingOverlay.style.justifyContent = "center";
    loadingOverlay.style.zIndex = "9999";

    loadingOverlay.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 5px;">
        <div style="text-align: center;">
          <div class="calculating-spinner-small"></div>
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
    if (
      window.DataManager &&
      typeof window.DataManager.loadCategoryData === "function"
    ) {
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
    } else {
      removeLoadingOverlay();
      alert("데이터를 로드할 수 없습니다. DataManager를 찾을 수 없습니다.");
    }

    function removeLoadingOverlay() {
      if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }
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
    if (rankingNotice) {
      rankingNotice.style.display = "block";
    }
  }

  function hideLoading() {
    if (rankingNotice) {
      rankingNotice.style.display = "none";
    }
  }

  function showError(message) {
    if (rankingNotice) {
      rankingNotice.style.display = "block";
      rankingNotice.innerHTML = `
        <div class="calculating-wrapper">
          <div class="calculating-box" style="background-color: #fff3cd; border-left: 5px solid #ffc107;">
            <h3 style="color: #856404;">오류 발생</h3>
            <p>${message}</p>
          </div>
        </div>
      `;
    } else {
      console.error("rankingNotice 요소를 찾을 수 없음");
      alert(message);
    }
  }

  // DOMContentLoaded 이벤트에서 초기화 시작
  document.addEventListener("DOMContentLoaded", function () {
    console.log("RankingViewer: DOMContentLoaded 이벤트 발생");
    // 약간의 지연을 두고 초기화 시작 - 다른 스크립트의 로딩 시간 확보
    setTimeout(initialize, 10);
  });

  // 외부에 노출할 메소드들
  return {
    changePage,
    loadRankingData,
    showDetailModal,
    showSpiritModal,
    initialize,
  };
})();

// 전역 객체에 등록
window.RankingViewer = RankingViewer;

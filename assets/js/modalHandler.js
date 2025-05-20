const ModalHandler = (function () {
  let currentData = null;
  let isRankingMode = false;
  let activeModal = null;

  // 스탯 색상 매핑
  const STAT_COLORS = {
    damageResistance: "#3498db", // 피해저항 - 파란색
    damageResistancePenetration: "#e74c3c", // 피해저항관통 - 빨간색
    pvpDamagePercent: "#e67e22", // 대인피해% - 주황색
    pvpDefensePercent: "#27ae60", // 대인방어% - 초록색
    statusEffectAccuracy: "#9b59b6", // 상태이상적중 - 보라색
    statusEffectResistance: "#2980b9", // 상태이상저항 - 짙은 파란색
    criticalPowerPercent: "#f39c12", // 치명위력% - 노란색
  };

  // CSS 파일 로드 함수
  function loadCSS() {
    if (document.getElementById("modalHandlerCSS")) return;

    const link = document.createElement("link");
    link.id = "modalHandlerCSS";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = "modalHandler.css";
    document.head.appendChild(link);
  }

  // 모달 요소를 완전히 생성하고 DOM에 추가
  function createModal(
    category,
    imagePath,
    influence,
    startLevel,
    highlightStat,
    spiritName
  ) {
    removeAllModals();

    // CSS 로드
    loadCSS();

    const modal = document.createElement("div");
    modal.className = "spirit-modal-overlay";
    modal.id = "spirit-info-modal";

    const content = document.createElement("div");
    content.className = "spirit-modal-content";

    modal.appendChild(content);
    document.body.appendChild(modal);

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.className = "modal-close-btn";
    closeBtn.addEventListener("click", removeAllModals);
    content.appendChild(closeBtn);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) removeAllModals();
    });

    const escListener = function (e) {
      if (e.key === "Escape") removeAllModals();
    };
    document.addEventListener("keydown", escListener);

    modal._escListener = escListener;
    activeModal = modal;

    return { modal, content };
  }

  function showInfoInModal(
    category,
    imagePath,
    influence,
    startLevel,
    highlightStat,
    spiritName
  ) {
    console.log(
      `showInfoInModal 호출: ${category}, ${imagePath}, 레벨=${startLevel}, 하이라이트=${highlightStat}, 이름=${spiritName}`
    );

    const { modal, content } = createModal(
      category,
      imagePath,
      influence,
      startLevel,
      highlightStat,
      spiritName
    );

    content.innerHTML = `
      <div class="loading-indicator">
        <div class="loading-spinner"></div>
        <p style="margin: 0; color: #666;">환수 정보를 불러오는 중...</p>
      </div>
    `;

    document.body.style.overflow = "hidden";

    findSpiritData(category, imagePath, spiritName)
      .then((itemData) => {
        if (!itemData) {
          content.innerHTML = `
            <div class="error-message">
              <h3>환수 정보를 찾을 수 없습니다</h3>
              <p>선택한 환수의 데이터가 존재하지 않거나 불러오는 중 오류가 발생했습니다.</p>
              <button class="modal-close-btn">닫기</button>
            </div>
          `;

          const closeBtn = content.querySelector(".modal-close-btn");
          if (closeBtn) {
            closeBtn.addEventListener("click", removeAllModals);
          }

          return;
        }

        currentData = {
          item: itemData,
          category: category,
          influence: influence || itemData.influence || "",
          level: startLevel,
          isRankingMode: startLevel === 25,
          highlightStat: highlightStat,
        };

        renderSpiritInfo(
          content,
          itemData,
          influence,
          startLevel,
          highlightStat
        );
      })
      .catch((error) => {
        console.error("환수 정보 로드 오류:", error);
        content.innerHTML = `
          <div class="error-message">
            <h3>오류 발생</h3>
            <p>환수 정보를 불러오는 중 오류가 발생했습니다.</p>
            <p style="font-size: 14px; color: #555;">상세 오류: ${
              error.message || "알 수 없는 오류"
            }</p>
            <button class="modal-close-btn">닫기</button>
          </div>
        `;

        const closeBtn = content.querySelector(".modal-close-btn");
        if (closeBtn) {
          closeBtn.addEventListener("click", removeAllModals);
        }
      });

    return modal;
  }

  function renderSpiritInfo(
    container,
    itemData,
    influence,
    level,
    highlightStat
  ) {
    if (!itemData || !container) return;

    container.innerHTML = "";

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.className = "modal-close-btn";
    closeBtn.addEventListener("click", removeAllModals);
    container.appendChild(closeBtn);

    // 헤더 생성
    const header = document.createElement("div");
    header.className = "spirit-modal-header";

    // 이미지
    const img = document.createElement("img");
    img.src = itemData.image;
    img.alt = itemData.name;
    img.className = "spirit-modal-image";
    header.appendChild(img);

    // 제목 및 레벨 컨트롤
    const titleSection = document.createElement("div");
    titleSection.className = "spirit-modal-title-section";

    const title = document.createElement("h3");
    title.textContent = itemData.name;

    // 세력 아이콘 추가
    const spiritInfluence = influence || itemData.influence || "";
    if (
      spiritInfluence &&
      window.DataManager &&
      window.DataManager.FACTION_ICONS
    ) {
      const icon = document.createElement("img");
      icon.src = window.DataManager.FACTION_ICONS[spiritInfluence] || "";
      icon.className = "influence-icon";
      icon.alt = spiritInfluence;
      title.appendChild(icon);
    }

    titleSection.appendChild(title);

    // 레벨 컨트롤
    const levelControl = document.createElement("div");
    levelControl.className = "level-control";

    if (level === 25) {
      const levelDisplay = document.createElement("div");
      levelDisplay.innerHTML = "<strong>레벨: 25</strong> (고정)";
      levelDisplay.className = "fixed-level-display";
      levelControl.appendChild(levelDisplay);
    } else {
      const levelInput = document.createElement("div");
      levelInput.className = "level-input-container";
      levelInput.innerHTML = `
        <button class="level-btn min-btn">최소</button>
        <button class="level-btn minus-btn">-</button>
        <input type="number" min="0" max="25" value="${level}" class="level-input">
        <button class="level-btn plus-btn">+</button>
        <button class="level-btn max-btn">최대</button>
      `;
      levelControl.appendChild(levelInput);

      // 레벨 컨트롤 이벤트 추가
      const input = levelInput.querySelector(".level-input");
      levelInput
        .querySelector(".min-btn")
        .addEventListener("click", () =>
          updateLevel(container, itemData, 0, highlightStat)
        );
      levelInput.querySelector(".minus-btn").addEventListener("click", () => {
        if (parseInt(input.value) > 0) {
          updateLevel(
            container,
            itemData,
            parseInt(input.value) - 1,
            highlightStat
          );
        }
      });
      levelInput.querySelector(".plus-btn").addEventListener("click", () => {
        if (parseInt(input.value) < 25) {
          updateLevel(
            container,
            itemData,
            parseInt(input.value) + 1,
            highlightStat
          );
        }
      });
      levelInput
        .querySelector(".max-btn")
        .addEventListener("click", () =>
          updateLevel(container, itemData, 25, highlightStat)
        );

      input.addEventListener("change", () => {
        let newLevel = parseInt(input.value);
        if (isNaN(newLevel) || newLevel < 0) newLevel = 0;
        if (newLevel > 25) newLevel = 25;
        updateLevel(container, itemData, newLevel, highlightStat);
      });
    }

    titleSection.appendChild(levelControl);
    header.appendChild(titleSection);
    container.appendChild(header);

    // 광고 영역
    const adContainer = document.createElement("div");
    adContainer.className = "ad-container";
    container.appendChild(adContainer);

    // 등록/장착 효과 표시
    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";

    const registrationCol = document.createElement("div");
    registrationCol.className = "stats-column";
    registrationCol.innerHTML = `
      <div class="stats-header">
        📌 등록 효과
        <span id="registration-sum" class="stats-sum">합산: 0</span>
      </div>
      <ul id="registrationList" class="stats-list"></ul>
    `;

    const bindCol = document.createElement("div");
    bindCol.className = "stats-column";
    bindCol.innerHTML = `
      <div class="stats-header">
        🧷 장착 효과
        <span id="bind-sum" class="stats-sum">합산: 0</span>
      </div>
      <ul id="bindList" class="stats-list"></ul>
    `;

    statsContainer.appendChild(registrationCol);
    statsContainer.appendChild(bindCol);
    container.appendChild(statsContainer);

    // 스탯 정보 표시
    if (itemData.stats && Array.isArray(itemData.stats)) {
      const levelStat = itemData.stats.find((s) => s && s.level === level);
      displayStats(levelStat, highlightStat);
    } else {
      document.getElementById("registrationList").innerHTML =
        "<li>등록 효과 정보가 없습니다.</li>";
      document.getElementById("bindList").innerHTML =
        "<li>장착 효과 정보가 없습니다.</li>";

      document.getElementById("registration-sum").textContent = "합산: 0";
      document.getElementById("bind-sum").textContent = "합산: 0";
    }

    // 광고 초기화
    if (
      window.AdInitializer &&
      typeof window.AdInitializer.addAdsToModalContent === "function"
    ) {
      window.AdInitializer.addAdsToModalContent(adContainer);
      window.AdInitializer.initializeAdsInModal(container);
    }
  }

  function displayStats(levelStat, highlightStat) {
    const registrationList = document.getElementById("registrationList");
    const bindList = document.getElementById("bindList");

    if (!registrationList || !bindList) return;

    registrationList.innerHTML = "";
    bindList.innerHTML = "";

    let regSum = 0;
    let bindSum = 0;

    if (
      levelStat &&
      levelStat.registrationStat &&
      Object.keys(levelStat.registrationStat).length > 0
    ) {
      regSum = calculateStatsSum(levelStat.registrationStat);
      displayStatDetails(
        registrationList,
        levelStat.registrationStat,
        highlightStat
      );
    } else {
      registrationList.innerHTML =
        "<li>현재 레벨에서는 등록 효과가 없습니다.</li>";
    }

    if (
      levelStat &&
      levelStat.bindStat &&
      Object.keys(levelStat.bindStat).length > 0
    ) {
      bindSum = calculateStatsSum(levelStat.bindStat);
      displayStatDetails(bindList, levelStat.bindStat, highlightStat);
    } else {
      bindList.innerHTML = "<li>현재 레벨에서는 장착 효과가 없습니다.</li>";
    }

    // 합산 표시 업데이트
    document.getElementById("registration-sum").textContent = `합산: ${regSum}`;
    document.getElementById("bind-sum").textContent = `합산: ${bindSum}`;
  }

  // 스탯 합계 계산 함수
  function calculateStatsSum(stats) {
    if (!stats || typeof stats !== "object") return 0;

    const resistance = parseFloat(stats.damageResistance || 0);
    const penetration = parseFloat(stats.damageResistancePenetration || 0);
    const pvpDamage = parseFloat(stats.pvpDamagePercent || 0) * 10;
    const pvpDefense = parseFloat(stats.pvpDefensePercent || 0) * 10;

    return Math.round(resistance + penetration + pvpDamage + pvpDefense);
  }

  function displayStatDetails(listElement, stats, highlightStat) {
    if (!stats || typeof stats !== "object") {
      listElement.innerHTML = "<li>정보 없음</li>";
      return;
    }

    const STATS_MAPPING = window.CommonData?.STATS_MAPPING || {};
    const PERCENT_STATS = window.CommonData?.PERCENT_STATS || [];

    // 먼저 주요 스탯을 정렬
    const primaryStats = [
      "damageResistance",
      "damageResistancePenetration",
      "pvpDamagePercent",
      "pvpDefensePercent",
      "statusEffectAccuracy",
      "statusEffectResistance",
      "criticalPowerPercent",
      "movementSpeed",
    ];

    // 주요 스탯과 기타 스탯으로 분리
    const statEntries = Object.entries(stats);
    const primaryEntries = [];
    const otherEntries = [];

    statEntries.forEach((entry) => {
      if (primaryStats.includes(entry[0])) {
        primaryEntries.push(entry);
      } else {
        otherEntries.push(entry);
      }
    });

    // 주요 스탯 먼저 정렬 후 기타 스탯 알파벳순 정렬
    primaryEntries.sort((a, b) => {
      return primaryStats.indexOf(a[0]) - primaryStats.indexOf(b[0]);
    });

    otherEntries.sort((a, b) => {
      const keyA = STATS_MAPPING[a[0]] || a[0];
      const keyB = STATS_MAPPING[b[0]] || b[0];
      return keyA.localeCompare(keyB);
    });

    // 결합된 정렬 결과
    const sortedStats = [...primaryEntries, ...otherEntries];

    if (sortedStats.length === 0) {
      listElement.innerHTML = "<li>표시할 능력치 없음</li>";
      return;
    }

    sortedStats.forEach(([key, value]) => {
      const displayKey = STATS_MAPPING[key] || key;
      const isPercent = PERCENT_STATS.includes(key);
      const displayValue = isPercent ? `${value}%` : value;

      const li = document.createElement("li");

      // 주요 스탯에 대한 색상 적용
      let statClass = "";
      if (STAT_COLORS[key]) {
        statClass = `stat-${key}`;
      }

      // 하이라이트 적용
      if (highlightStat && key === highlightStat) {
        li.className = "stat-highlight";
      }

      li.innerHTML = `
        <span class="stat-key ${statClass}">${displayKey}</span>
        <span class="stat-value ${statClass}">${displayValue}</span>
      `;

      listElement.appendChild(li);
    });
  }

  function updateLevel(container, itemData, newLevel, highlightStat) {
    currentData.level = newLevel;
    const levelInput = container.querySelector(".level-input");
    if (levelInput) levelInput.value = newLevel;

    if (itemData.stats && Array.isArray(itemData.stats)) {
      const levelStat = itemData.stats.find((s) => s && s.level === newLevel);
      displayStats(levelStat, highlightStat);
    }
  }

  function removeAllModals() {
    if (activeModal) {
      document.removeEventListener("keydown", activeModal._escListener);
      activeModal.remove();
      activeModal = null;
    }

    document
      .querySelectorAll(
        ".spirit-modal-overlay, .modal-overlay, #optimalModal, #rankingDetailModal, #spirit-info-modal"
      )
      .forEach((modal) => {
        if (modal) modal.remove();
      });

    document.body.style.overflow = "auto";
    currentData = null;
  }

  async function findSpiritData(category, imagePath, spiritName) {
    if (!window.DataManager || !window.DataManager.getData) {
      try {
        await loadCategoryData();
      } catch (error) {
        console.error("카테고리 데이터 로드 실패:", error);
        return null;
      }
    }

    if (spiritName) {
      const categories = ["수호", "탑승", "변신"];
      for (const cat of categories) {
        const catData = window.DataManager.getData(cat);
        if (catData && Array.isArray(catData)) {
          const found = catData.find((item) => item?.name === spiritName);
          if (found) return found;
        }
      }
    }

    const categoryData = window.DataManager.getData(category);
    if (categoryData && Array.isArray(categoryData)) {
      const exactMatch = categoryData.find((item) => item?.image === imagePath);
      if (exactMatch) return exactMatch;

      const fileName = getFileName(imagePath);
      if (fileName) {
        const fileMatch = categoryData.find((item) => {
          const itemFileName = getFileName(item?.image);
          return itemFileName === fileName;
        });
        if (fileMatch) return fileMatch;
      }

      const partialMatch = categoryData.find(
        (item) =>
          item?.image?.includes(imagePath) || imagePath.includes(item?.image)
      );
      if (partialMatch) return partialMatch;
    }

    const otherCategories = ["수호", "탑승", "변신"].filter(
      (cat) => cat !== category
    );
    for (const cat of otherCategories) {
      const catData = window.DataManager.getData(cat);
      if (!catData || !Array.isArray(catData)) continue;

      const match = catData.find((item) => {
        if (!item?.image) return false;
        return (
          item.image === imagePath ||
          getFileName(item.image) === getFileName(imagePath) ||
          item.image.includes(imagePath) ||
          imagePath.includes(item.image)
        );
      });

      if (match) return match;
    }

    return null;
  }

  function getFileName(path) {
    if (!path) return "";
    const cleanPath = path.split("?")[0];
    return cleanPath.split("/").pop()?.toLowerCase() || "";
  }

  async function loadCategoryData() {
    if (!window.DataManager || !window.DataManager.loadCategoryData) {
      throw new Error("DataManager를 찾을 수 없습니다");
    }
    return window.DataManager.loadCategoryData();
  }

  function showInfo(
    category,
    imagePath,
    influence,
    highlightStat = null,
    spiritName = null
  ) {
    return showInfoInModal(
      category,
      imagePath,
      influence,
      0,
      highlightStat,
      spiritName
    );
  }

  function showRankingInfo(
    category,
    imagePath,
    influence,
    highlightStat = null,
    spiritName = null
  ) {
    return showInfoInModal(
      category,
      imagePath,
      influence,
      25,
      highlightStat,
      spiritName
    );
  }

  function showSpiritInfo(
    imagePath,
    category,
    influence,
    highlightStat = null,
    spiritName = null
  ) {
    return showInfoInModal(
      category,
      imagePath,
      influence,
      0,
      highlightStat,
      spiritName
    );
  }

  function showRankingSpiritInfo(
    imagePath,
    category,
    influence,
    highlightStat = null,
    spiritName = null
  ) {
    return showInfoInModal(
      category,
      imagePath,
      influence,
      25,
      highlightStat,
      spiritName
    );
  }

  function closeModal() {
    removeAllModals();
  }

  return {
    showInfo,
    showRankingInfo,
    showInfoInModal,
    closeModal,
    showSpiritInfo,
    showRankingSpiritInfo,
    removeAllModals,
  };
})();

window.ModalHandler = ModalHandler;

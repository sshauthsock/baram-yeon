// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBWBbe8carOdeIzP6hQsarDOz5H0TuEj9A",
  authDomain: "baram-yeon.firebaseapp.com",
  projectId: "baram-yeon",
  storageBucket: "baram-yeon.firebasestorage.app",
  messagingSenderId: "924298156656",
  appId: "1:924298156656:web:845c94e771625fbd24b2b5",
  measurementId: "G-F2BT2T7HCL",
};

const statsMapping = {
  criticalPower: "치명위력",
  normalMonsterAdditionalDamage: "일반몬스터추가피해",
  normalMonsterPenetration: "일반몬스터관통",
  healthIncrease: "체력증가",
  healthIncreasePercent: "체력증가%",
  strength: "힘",
  agility: "민첩",
  intelligence: "지력",
  damageAbsorption: "피해흡수",
  damageResistancePenetration: "피해저항관통",
  magicIncrease: "마력증가",
  magicIncreasePercent: "마력증가%",
  damageResistance: "피해저항",
  healthPotionEnhancement: "체력시약향상",
  healthRecoveryImprovement: "체력회복향상",
  damageIncrease: "피해증가",
  magicRecoveryImprovement: "마나회복향상",
  criticalChance: "치명확률",
  bossMonsterAdditionalDamage: "보스몬스터추가피해",
  bossMonsterPenetration: "보스몬스터관통",
  power: "위력",
  magicPotionEnhancement: "마력시약향상",
  magicRecoveryImprovement: "마력회복향상",
  pvpDamage: "대인피해",
  pvpDefense: "대인방어",
  statusEffectAccuracy: "상태이상적중",
  statusEffectResistance: "상태이상저항",
  criticalPowerPercent: "치명위력%",
  pvpDamagePercent: "대인피해%",
  pvpDefensePercent: "대인방어%",
  criticalDamageResistance: "치명피해저항",
  criticalResistance: "치명저항",
  movementSpeed: "이동속도",
  destructionPowerIncrease: "파괴력증가",
  destructionPowerPercent: "파괴력증가%",
  armorStrength: "무장도",
  lootAcquisitionIncrease: "전리품획득증가",
  experienceGainIncrease: "경험치획득증가",
};

const specialStatClasses = {
  피해저항: "stat-damage-resistance",
  피해저항관통: "stat-damage-resistance-penetration",
  "대인방어%": "stat-pvp-defense-percent",
  "대인피해%": "stat-pvp-damage-percent",
};

let currentStats = [];
let currentLevel = 0;
let currentName = "";
let modalElement = null;

function checkFirebaseConnection() {
  // console.log("Firebase 연결 확인 중...");
  // console.log("Firebase 설정:", firebaseConfig);

  if (!firebase.apps.length) {
    console.error("Firebase가 초기화되지 않았습니다!");
    return false;
  }

  try {
    return db
      .collection("jsonData")
      .doc("data-1745203971906")
      .get()
      .then((doc) => {
        if (doc.exists) {
          // console.log("Firebase 연결 성공! 샘플 데이터:", doc.data());
          return true;
        } else {
          console.error("Firebase에 연결되었으나 문서를 찾을 수 없습니다!");
          return false;
        }
      })
      .catch((error) => {
        console.error("Firebase 연결 오류:", error);
        return false;
      });
  } catch (e) {
    console.error("Firebase 테스트 실패:", e);
    return false;
  }
}

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabGroup = this.parentElement;
      tabGroup
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
    });
  });

  createModal();

  testFirebaseConnectivity().then(() => {
    loadCategoryData();
  });
});

async function testFirebaseConnectivity() {
  const isConnected = await checkFirebaseConnection();
  // console.log("Firebase 연결 테스트 결과:", isConnected);

  if (!isConnected) {
    console.log("경고: Firebase 연결 실패, 대신 로컬 파일을 사용합니다");
  }

  try {
    const snapshot = await db.collection("jsonData").get();
    // console.log(`jsonData 컬렉션에서 ${snapshot.size}개의 문서를 찾았습니다`);
    snapshot.forEach((doc) => {
      // console.log(`문서 ID: ${doc.id}, 데이터 있음: ${!!doc.data()}`);
    });
  } catch (e) {
    console.error("문서 목록 조회 오류:", e);
  }
}

const categoryFileMap = {
  수호: {
    registration: "guardian-registration-stats",
    bind: "guardian-bind-stats",
  },
  탑승: {
    registration: "ride-registration-stats",
    bind: "ride-bind-stats",
  },
  변신: {
    registration: "transform-registration-stats",
    bind: "transform-bind-stats",
  },
};

let mobData = { 수호: [], 탑승: [], 변신: [] };

async function bulkLoadFirestoreDocuments() {
  try {
    const snapshot = await db.collection("jsonData").get();
    const documents = {};

    snapshot.forEach((doc) => {
      documents[doc.id] = doc.data();
    });

    return documents;
  } catch (error) {
    console.error("Error bulk loading documents:", error);
    return {};
  }
}

let cachedFirestoreDocuments = null;
async function getCachedData(key, fetchFunction, expiryHours = 24) {
  const cachedData = localStorage.getItem(key);
  const cachedTime = localStorage.getItem(`${key}_time`);

  const now = new Date().getTime();
  const expiryTime = expiryHours * 60 * 60 * 1000;

  if (cachedData && cachedTime && now - parseInt(cachedTime) < expiryTime) {
    return JSON.parse(cachedData);
  }

  const freshData = await fetchFunction();

  localStorage.setItem(key, JSON.stringify(freshData));
  localStorage.setItem(`${key}_time`, now.toString());

  return freshData;
}

async function getFirestoreDocument(fileName) {
  // console.log(`Firestore에서 ${fileName} 가져오기 시도 중...`);
  try {
    const documentMap = {
      "guardian-bind-stats.json": "data-1745203971906",
      "guardian-registration-stats.json": "data-1745203990701",
      "ride-bind-stats.json": "data-1745204015994",
      "ride-registration-stats.json": "data-1745204029836",
      "transform-bind-stats.json": "data-1745204045512",
      "transform-registration-stats.json": "data-1745204058405",
      "gradeSetEffects.json": "data-1745204079667",
      "factionSetEffects.json": "data-1745204094503",
      "chak.json": "data-1745204108850",
    };

    const docId = documentMap[fileName + ".json"];
    // console.log(`${fileName}의 문서 ID: ${docId}`);

    if (!docId) {
      // console.log(`${fileName}에 대한 문서 매핑이 없습니다. 로컬 파일 사용`);
      const response = await fetch(`output/${fileName}.json`);
      return await response.json();
    }

    const cachedKey = `firestore_${fileName}`;
    const cachedData = localStorage.getItem(cachedKey);
    const cachedTime = localStorage.getItem(`${cachedKey}_time`);

    if (
      cachedData &&
      cachedTime &&
      Date.now() - parseInt(cachedTime) < 24 * 60 * 60 * 1000
    ) {
      // console.log(`${fileName}에 대한 캐시된 데이터 사용`);
      return JSON.parse(cachedData);
    }

    // console.log(`Firestore에서 ${docId} 가져오는 중...`);
    const docRef = await db.collection("jsonData").doc(docId).get();
    // console.log(`문서 존재 여부: ${docRef.exists}`);

    if (!docRef.exists) {
      console.warn(
        `Firestore에서 ${docId} 문서를 찾을 수 없습니다. 로컬 파일 사용`
      );
      const response = await fetch(`output/${fileName}.json`);
      const data = await response.json();

      localStorage.setItem(cachedKey, JSON.stringify(data));
      localStorage.setItem(`${cachedKey}_time`, Date.now().toString());

      return data;
    }

    const data = docRef.data();
    // console.log(`${fileName}에 대한 데이터 검색:`, data ? "성공" : "비어있음");

    if (!data) {
      throw new Error(`문서 ${docId}는 존재하지만 데이터가 없습니다`);
    }

    localStorage.setItem(cachedKey, JSON.stringify(data));
    localStorage.setItem(`${cachedKey}_time`, Date.now().toString());

    return data;
  } catch (error) {
    console.error(`${fileName}에 대한 Firestore 오류:`, error);
    // console.log(`${fileName}에 대한 로컬 파일로 대체`);
    const response = await fetch(`output/${fileName}.json`);
    return await response.json();
  }
}

async function loadCategoryData() {
  for (const [category, files] of Object.entries(categoryFileMap)) {
    try {
      let registrationData = await getFirestoreDocument(files.registration);
      let bindData = await getFirestoreDocument(files.bind);

      let registrationArray = [];
      if (
        registrationData &&
        registrationData.data &&
        Array.isArray(registrationData.data)
      ) {
        registrationArray = registrationData.data;
      } else if (Array.isArray(registrationData)) {
        registrationArray = registrationData;
      }

      let bindArray = [];
      if (bindData && bindData.data && Array.isArray(bindData.data)) {
        bindArray = bindData.data;
      } else if (Array.isArray(bindData)) {
        bindArray = bindData;
      }

      if (!registrationArray.length) {
        mobData[category] = [];
        continue;
      }

      const mergedData = registrationArray.map((regItem) => {
        const bindItem = bindArray.find((b) => b && b.name === regItem.name);
        if (bindItem) {
          const mergedStats = regItem.stats.map((regStat, index) => {
            const bindStat = bindItem.stats && bindItem.stats[index];
            return {
              level: regStat.level,
              registrationStat: regStat.registrationStat,
              bindStat: bindStat ? bindStat.bindStat : {},
            };
          });

          return {
            ...regItem,
            stats: mergedStats,
          };
        }
        return regItem;
      });

      mobData[category] = mergedData;
    } catch (err) {
      try {
        const registrationResponse = await fetch(
          `output/${files.registration}.json`
        );
        let registrationData = await registrationResponse.json();

        const bindResponse = await fetch(`output/${files.bind}.json`);
        let bindData = await bindResponse.json();

        if (registrationData.data && Array.isArray(registrationData.data)) {
          registrationData = registrationData.data;
        }

        if (bindData.data && Array.isArray(bindData.data)) {
          bindData = bindData.data;
        }

        const mergedData = registrationData.map((regItem) => {
          const bindItem = bindData.find((b) => b.name === regItem.name);
          if (bindItem) {
            const mergedStats = regItem.stats.map((regStat, index) => {
              const bindStat = bindItem.stats[index];
              return {
                level: regStat.level,
                registrationStat: regStat.registrationStat,
                bindStat: bindStat ? bindStat.bindStat : {},
              };
            });

            return {
              ...regItem,
              stats: mergedStats,
            };
          }
          return regItem;
        });

        mobData[category] = mergedData;
      } catch (fallbackErr) {
        mobData[category] = [];
      }
    }
  }

  document.querySelector(".sub-tabs .tab").classList.add("active");
  showCategory("수호");
}

function openTab(page) {
  const showSub = page === "환수정보" || page === "결속추천";
  document.getElementById("subTabs").style.display = showSub ? "flex" : "none";
  document.getElementById("imageContainer").style.display = showSub
    ? "flex"
    : "none";

  if (showSub) showCategory("수호");
}

function showCategory(category) {
  const container = document.getElementById("imageContainer");
  container.innerHTML = "";

  if (!mobData[category] || mobData[category].length === 0) {
    container.innerHTML = `<p>이미지 데이터가 없습니다.</p>`;
    return;
  }

  document.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
    tab.classList.remove("active");
    if (tab.innerText === category) tab.classList.add("active");
  });

  mobData[category].forEach((item) => {
    const imgContainer = document.createElement("div");
    imgContainer.className = "img-wrapper";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.title = item.name;
    img.loading = "lazy";
    img.onclick = () => showInfo(category, item.image);

    const nameLabel = document.createElement("small");
    nameLabel.textContent = item.name;
    nameLabel.className = "img-name";

    imgContainer.appendChild(img);
    imgContainer.appendChild(nameLabel);
    container.appendChild(imgContainer);
  });
}

function createModal() {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";

  const modalContainer = document.createElement("div");
  modalContainer.className = "modal";

  const closeButton = document.createElement("button");
  closeButton.className = "modal-close";
  closeButton.innerHTML = "✕";
  closeButton.onclick = closeModal;

  modalContainer.appendChild(closeButton);
  modalOverlay.appendChild(modalContainer);
  document.body.appendChild(modalOverlay);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  modalOverlay.addEventListener("click", function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  modalElement = {
    overlay: modalOverlay,
    container: modalContainer,
  };

  return modalElement;
}

function closeModal() {
  document.querySelector(".modal-overlay").style.display = "none";
  document.body.style.overflow = "auto";
}

function showInfo(category, imagePath) {
  showInfoInModal(category, imagePath);
}

function showInfoInModal(category, imagePath) {
  if (!modalElement) modalElement = createModal();
  const modal = modalElement.container;
  const modalOverlay = modalElement.overlay;

  modal.innerHTML = "";

  const closeButton = document.createElement("button");
  closeButton.className = "modal-close";
  closeButton.innerHTML = "✕";
  closeButton.onclick = closeModal;
  modal.appendChild(closeButton);

  const categoryData = mobData[category];
  const matched = categoryData.find((item) => item.image === imagePath);

  if (!matched) {
    modal.innerHTML += "<p>데이터를 찾을 수 없습니다.</p>";
    modalOverlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    return;
  }

  currentStats = matched.stats || [];
  currentLevel = 0;
  currentName = matched.name || "이름 없음";

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";

  const imgPreview = document.createElement("img");
  imgPreview.src = imagePath;
  imgPreview.alt = currentName;
  imgPreview.className = "modal-img-preview";

  const titleArea = document.createElement("div");
  titleArea.className = "title-area";

  const title = document.createElement("h3");
  title.textContent = currentName;

  const influenceIcon = document.createElement("span");
  influenceIcon.className = "influence-icon";
  influenceIcon.innerHTML = "★";
  influenceIcon.title = "인플루언스";
  title.appendChild(influenceIcon);

  const levelControls = document.createElement("div");
  levelControls.classList.add("level-controls");

  const levelMinusButton = document.createElement("button");
  levelMinusButton.innerText = "-";
  levelMinusButton.onclick = () => changeLevel(-1);

  const levelInput = document.createElement("input");
  levelInput.type = "number";
  levelInput.min = "0";
  levelInput.max = "25";
  levelInput.value = currentLevel;
  levelInput.classList.add("level-input");
  levelInput.addEventListener("input", function () {
    let value = parseInt(this.value);
    if (isNaN(value)) value = 0;
    if (value > 25) value = 25;
    if (value < 0) value = 0;
    this.value = value;
    currentLevel = value;
    updateStatsInModal(
      currentStats.find((s) => s.level === currentLevel) || null
    );
  });

  const levelPlusButton = document.createElement("button");
  levelPlusButton.innerText = "+";
  levelPlusButton.onclick = () => changeLevel(1);

  const maxButton = document.createElement("button");
  maxButton.innerText = "MAX";
  maxButton.classList.add("level-controls", "max-button");
  maxButton.onclick = () => {
    currentLevel = 25;
    levelInput.value = currentLevel;
    updateStatsInModal(
      currentStats.find((s) => s.level === currentLevel) || null
    );
  };

  levelControls.appendChild(levelMinusButton);
  levelControls.appendChild(levelInput);
  levelControls.appendChild(levelPlusButton);
  levelControls.appendChild(maxButton);

  titleArea.appendChild(title);
  titleArea.appendChild(levelControls);

  modalHeader.appendChild(imgPreview);
  modalHeader.appendChild(titleArea);

  const statsContainer = document.createElement("div");
  statsContainer.className = "stats-container";

  const leftColumn = document.createElement("div");
  leftColumn.className = "stats-column";
  const registrationHeader = document.createElement("b");
  registrationHeader.innerText = "📌 등록 효과:";
  const registrationList = document.createElement("ul");
  registrationList.id = "registrationList";
  leftColumn.appendChild(registrationHeader);
  leftColumn.appendChild(registrationList);

  const rightColumn = document.createElement("div");
  rightColumn.className = "stats-column";
  const bindHeader = document.createElement("b");
  bindHeader.innerText = "🧷 결속 효과:";
  const bindList = document.createElement("ul");
  bindList.id = "bindList";
  rightColumn.appendChild(bindHeader);
  rightColumn.appendChild(bindList);

  modal.appendChild(modalHeader);
  modal.appendChild(statsContainer);
  statsContainer.appendChild(leftColumn);
  statsContainer.appendChild(rightColumn);

  const initialStat =
    currentStats.find((s) => s.level === currentLevel) || null;
  updateStatsInModal(initialStat);

  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function changeLevel(diff) {
  const newLevel = currentLevel + diff;
  if (newLevel < 0 || newLevel > 25) return;

  currentLevel = newLevel;
  const levelInput = document.querySelector(".level-input");
  if (levelInput) levelInput.value = currentLevel;

  const stat = currentStats.find((s) => s.level === currentLevel);
  updateStatsInModal(stat);
}

function updateStatsInModal(stat) {
  const registrationList = document.getElementById("registrationList");
  const bindList = document.getElementById("bindList");

  if (!registrationList || !bindList) return;

  registrationList.innerHTML = "";
  bindList.innerHTML = "";

  const existingNotices = document.querySelectorAll(".level25-notice");
  existingNotices.forEach((notice) => notice.remove());

  if (!stat) {
    const level25Stat = currentStats.find((s) => s.level === 25);

    if (currentLevel !== 25 && level25Stat) {
      if (
        level25Stat.registrationStat &&
        Object.keys(level25Stat.registrationStat).length > 0
      ) {
        registrationList.innerHTML = `<li>현재 레벨에는 등록 효과가 없습니다</li>`;
        const regNoticeDiv = document.createElement("div");
        regNoticeDiv.className = "level25-notice";
        regNoticeDiv.textContent = "※ 등록 효과는 25레벨에 있습니다";
        registrationList.parentNode.appendChild(regNoticeDiv);
      } else {
        registrationList.innerHTML = `<li>등록 효과 정보 없음</li>`;
      }

      if (
        level25Stat.bindStat &&
        Object.keys(level25Stat.bindStat).length > 0
      ) {
        bindList.innerHTML = `<li>현재 레벨에는 결속 효과가 없습니다</li>`;
        const bindNoticeDiv = document.createElement("div");
        bindNoticeDiv.className = "level25-notice";
        bindNoticeDiv.textContent = "※ 결속 효과는 25레벨에 있습니다";
        bindList.parentNode.appendChild(bindNoticeDiv);
      } else {
        bindList.innerHTML = `<li>결속 효과 정보 없음</li>`;
      }
    } else {
      registrationList.innerHTML = `<li>레벨 ${currentLevel} 정보 없음</li>`;
      bindList.innerHTML = `<li>레벨 ${currentLevel} 정보 없음</li>`;
    }
    return;
  }

  Object.entries(stat.registrationStat || {}).forEach(([key, val]) => {
    const statName = statsMapping[key] || key;
    const li = document.createElement("li");

    if (specialStatClasses[statName]) {
      li.innerHTML = `<span class="${specialStatClasses[statName]}">${statName}: ${val}</span>`;
    } else {
      li.textContent = `${statName}: ${val}`;
    }

    registrationList.appendChild(li);
  });

  Object.entries(stat.bindStat || {}).forEach(([key, val]) => {
    const statName = statsMapping[key] || key;
    const li = document.createElement("li");

    if (specialStatClasses[statName]) {
      li.innerHTML = `<span class="${specialStatClasses[statName]}">${statName}: ${val}</span>`;
    } else {
      li.textContent = `${statName}: ${val}`;
    }

    bindList.appendChild(li);
  });

  if (!registrationList.children.length) {
    registrationList.innerHTML = `<li>등록 효과 정보 없음</li>`;
  }

  if (!bindList.children.length) {
    if (currentLevel < 25) {
      const level25Stat = currentStats.find((s) => s.level === 25);
      if (
        level25Stat &&
        level25Stat.bindStat &&
        Object.keys(level25Stat.bindStat).length > 0
      ) {
        const noticeDiv = document.createElement("div");
        noticeDiv.className = "level25-notice";
        noticeDiv.textContent = "※ 결속 효과는 25레벨에 있습니다";
        bindList.innerHTML = `<li>현재 레벨에는 결속 효과가 없습니다</li>`;
        bindList.parentNode.appendChild(noticeDiv);
      } else {
        bindList.innerHTML = `<li>결속 효과 정보 없음</li>`;
      }
    } else {
      bindList.innerHTML = `<li>결속 효과 정보 없음</li>`;
    }
  }
}

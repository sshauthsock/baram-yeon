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

let currentStats = [];
let currentLevel = 0;
let currentName = "";
let modalElement = null;

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
  loadCategoryData();
});

const categoryToFileMap = {
  수호: "output/guardian.json",
  탑승: "output/ride.json",
  변신: "output/transform.json",
};

let mobData = { 수호: [], 탑승: [], 변신: [] };

async function loadCategoryData() {
  for (const [category, filePath] of Object.entries(categoryToFileMap)) {
    try {
      const response = await fetch(filePath);
      const jsonData = await response.json();
      mobData[category] = jsonData;
    } catch (err) {
      console.error(`Error fetching data for category "${category}":`, err);
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

  levelControls.appendChild(levelMinusButton);
  levelControls.appendChild(levelInput);
  levelControls.appendChild(levelPlusButton);

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

  if (!stat) {
    registrationList.innerHTML = `<li>레벨 ${currentLevel} 정보 없음</li>`;
    bindList.innerHTML = `<li>레벨 ${currentLevel} 정보 없음</li>`;
    return;
  }

  Object.entries(stat.registrationStat || {}).forEach(([key, val]) => {
    const statName = statsMapping[key] || key;
    const li = document.createElement("li");
    li.textContent = `${statName}: ${val}`;
    registrationList.appendChild(li);
  });

  Object.entries(stat.bindStat || {}).forEach(([key, val]) => {
    const statName = statsMapping[key] || key;
    const li = document.createElement("li");
    li.textContent = `${statName}: ${val}`;
    bindList.appendChild(li);
  });

  if (!registrationList.children.length) {
    registrationList.innerHTML = `<li>등록 효과 정보 없음</li>`;
  }

  if (!bindList.children.length) {
    bindList.innerHTML = `<li>결속 효과 정보 없음</li>`;
  }
}

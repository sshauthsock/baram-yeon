import { createElement } from "../utils.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import { fetchSoulExpTable, calculateSoul } from "../api.js";

const pageState = {
  expTable: null,
  currentType: "legend",
  currentLevel: 0,
  targetLevel: 1,
  souls: { high: 0, mid: 0, low: 0 },
};
const elements = {};

function getHTML() {
  return `
    <div class="container soul-container">
      <div class="left card">
        <h3>환수 성장 경험치 테이블</h3>
        <div class="exp-type-tabs">
          <div class="exp-tab active" data-type="legend">전설</div>
          <div class="exp-tab" data-type="immortal">불멸</div>
        </div>
        <div class="tables-container">
          <div class="table-half">
            <table>
              <thead><tr><th>Lv</th><th>경험치</th></tr></thead>
              <tbody id="expTableLeft"></tbody>
            </table>
          </div>
          <div class="table-half">
            <table>
              <thead><tr><th>Lv</th><th>경험치</th></tr></thead>
              <tbody id="expTableRight"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="right card">
        <h2>환수혼 계산기</h2>
        <div class="calculator-form">
          <div class="input-row">
            <div class="input-group type-select">
              <label>종류:</label>
              <select id="expType" class="form-control">
                <option value="legend">전설</option>
                <option value="immortal">불멸</option>
              </select>
            </div>
            <div class="input-group">
              <label>현재:</label>
              <input type="number" id="currentLevel" min="0" max="24" value="0" class="form-control">
            </div>
            <div class="input-group">
              <label>목표:</label>
              <input type="number" id="targetLevel" min="1" max="25" value="1" class="form-control">
            </div>
          </div>
          <div class="soul-panel">
            <div class="soul-item">
              <img src="/assets/img/high-soul.jpg" alt="최상급">
              <label>최상급 (1000)</label>
              <input type="number" id="highSoul" min="0" value="0" class="form-control">
            </div>
            <div class="soul-item">
              <img src="/assets/img/mid-soul.jpg" alt="상급">
              <label>상급 (100)</label>
              <input type="number" id="midSoul" min="0" value="0" class="form-control">
            </div>
            <div class="soul-item">
              <img src="/assets/img/low-soul.jpg" alt="하급">
              <label>하급 (10)</label>
              <input type="number" id="lowSoul" min="0" value="0" class="form-control">
            </div>
          </div>
          <div class="calc-btn">
            <button id="calculateBtn" class="btn btn-primary">계산</button>
          </div>
        </div>
        <div class="results-panel hidden" id="resultsPanel">
        </div>
      </div>
    </div>
  `;
}

function renderExpTable() {
  if (!pageState.expTable || !elements.expTableLeft) return;
  const expData = pageState.expTable[pageState.currentType];
  if (!expData) return;

  elements.expTableLeft.innerHTML = "";
  elements.expTableRight.innerHTML = "";

  expData.forEach((exp, lv) => {
    const row = createElement("tr", "", {
      html: `<td>${lv}</td><td>${exp.toLocaleString()}</td>`,
    });
    if (lv <= 13) {
      elements.expTableLeft.appendChild(row);
    } else {
      elements.expTableRight.appendChild(row);
    }
  });
  highlightTableRows();
}

// [핵심 수정] 렌더링 함수 안정성 및 가독성 개선
function renderCalculationResult(result) {
  if (!result || !result.required || !result.maxLevelInfo) {
    elements.resultsPanel.innerHTML = `<p class="error-message">잘못된 계산 결과입니다.</p>`;
    elements.resultsPanel.classList.remove("hidden");
    return;
  }

  const { required, maxLevelInfo } = result;
  const typeName =
    { legend: "전설", immortal: "불멸" }[pageState.currentType] || "알 수 없음";

  const formatNumber = (num) => (Number(num) || 0).toLocaleString();

  let neededHtml = "";
  if (!required.isSufficient && required.needed) {
    neededHtml = `
            <div class="sub-title">추가 필요 (최적 조합)</div>
            <div class="data-row"><span><img src="/assets/img/high-soul.jpg" class="soul-icon">최상급</span><span class="data-value">${formatNumber(
              required.needed.high
            )}개</span></div>
            <div class="data-row"><span><img src="/assets/img/mid-soul.jpg" class="soul-icon">상급</span><span class="data-value">${formatNumber(
              required.needed.mid
            )}개</span></div>
            <div class="data-row"><span><img src="/assets/img/low-soul.jpg" class="soul-icon">하급</span><span class="data-value">${formatNumber(
              required.needed.low
            )}개</span></div>
        `;
  } else {
    neededHtml = `<div class="sub-title sufficient">보유한 환수혼으로 충분합니다!</div>`;
  }

  let maxLevelProgressHtml = "";
  if (maxLevelInfo.level < 25) {
    maxLevelProgressHtml = `
            <div class="data-row"><span>다음 레벨 진행도</span><span class="data-value">${
              maxLevelInfo.progressPercent || 0
            }%</span></div>
            <div class="data-row"><span>남은 경험치</span><span class="data-value">${formatNumber(
              maxLevelInfo.remainingExp
            )} / ${formatNumber(maxLevelInfo.nextLevelExp)}</span></div>
        `;
  }

  const targetStatusHtml = maxLevelInfo.isTargetReachable
    ? `<span class="sufficient">목표 레벨 ${pageState.targetLevel} 달성 가능!</span>`
    : `<span class="insufficient">목표 레벨 ${
        pageState.targetLevel
      }까지 ${formatNumber(maxLevelInfo.expShortage)} 경험치 부족</span>`;

  elements.resultsPanel.innerHTML = `
        <div class="result-column">
            <div class="result-box">
                <div class="result-title required-title">필요 환수혼 <span class="type-badge">${typeName}</span></div>
                <div class="result-section">
                    <div class="data-row">
                        <span>레벨 ${pageState.currentLevel} → ${
    pageState.targetLevel
  }</span>
                        <span class="data-value highlight">${formatNumber(
                          required.exp
                        )}exp</span>
                    </div>
                </div>
                <div class="sub-title">총 필요 환수혼</div>
                <div class="data-row"><span><img src="/assets/img/high-soul.jpg" class="soul-icon">최상급</span><span class="data-value">${formatNumber(
                  required.souls.high
                )}개</span></div>
                <div class="data-row"><span><img src="/assets/img/mid-soul.jpg" class="soul-icon">상급</span><span class="data-value">${formatNumber(
                  required.souls.mid
                )}개</span></div>
                <div class="data-row"><span><img src="/assets/img/low-soul.jpg" class="soul-icon">하급</span><span class="data-value">${formatNumber(
                  required.souls.low
                )}개</span></div>
                ${neededHtml}
            </div>
        </div>
        <div class="result-column">
            <div class="result-box">
                <div class="result-title max-title">도달 가능 레벨 <span class="type-badge">${typeName}</span></div>
                <div class="result-section">
                    <div class="data-row"><span>보유 환수혼</span><span class="data-value highlight">${formatNumber(
                      maxLevelInfo.ownedExp
                    )}exp</span></div>
                </div>
                <div class="result-section">
                    <div class="data-row"><span>최대 도달 레벨</span><span class="data-value highlight">${
                      maxLevelInfo.level
                    }</span></div>
                    ${maxLevelProgressHtml}
                </div>
                <div class="result-section">${targetStatusHtml}</div>
            </div>
        </div>
    `;
  elements.resultsPanel.classList.remove("hidden");
}

function highlightTableRows() {
  if (!elements.container) return;
  const allRows = elements.container.querySelectorAll(
    "#expTableLeft tr, #expTableRight tr"
  );
  allRows.forEach((row) =>
    row.classList.remove("current-level", "target-level")
  );

  const current = pageState.currentLevel;
  const target = pageState.targetLevel;

  if (allRows[current]) allRows[current].classList.add("current-level");
  if (allRows[target]) allRows[target].classList.add("target-level");
}

function handleTypeChange(newType) {
  pageState.currentType = newType;
  elements.expType.value = newType;

  elements.container.querySelectorAll(".exp-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.type === newType);
  });

  renderExpTable();
}

function validateInputs() {
  let current = parseInt(elements.currentLevel.value, 10);
  let target = parseInt(elements.targetLevel.value, 10);

  if (isNaN(current) || current < 0) current = 0;
  if (current > 24) current = 24;

  if (isNaN(target) || target < 1) target = 1;
  if (target > 25) target = 25;

  if (target <= current) {
    target = current + 1;
    if (target > 25) target = 25;
  }

  elements.currentLevel.value = current;
  elements.targetLevel.value = target;

  pageState.currentLevel = current;
  pageState.targetLevel = target;
  highlightTableRows();
}

async function handleCalculate() {
  validateInputs();
  pageState.souls = {
    high: parseInt(elements.highSoul.value, 10) || 0,
    mid: parseInt(elements.midSoul.value, 10) || 0,
    low: parseInt(elements.lowSoul.value, 10) || 0,
  };

  showLoading(elements.resultsPanel, "계산 중...");
  try {
    const result = await calculateSoul({
      type: pageState.currentType,
      currentLevel: pageState.currentLevel,
      targetLevel: pageState.targetLevel,
      ownedSouls: pageState.souls,
    });
    renderCalculationResult(result);
  } catch (error) {
    alert(`계산 오류: ${error.message}`);
    elements.resultsPanel.classList.add("hidden");
  } finally {
    hideLoading();
  }
}

function setupEventListeners() {
  elements.expType.addEventListener("change", (e) =>
    handleTypeChange(e.target.value)
  );

  elements.container.querySelectorAll(".exp-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      handleTypeChange(e.currentTarget.dataset.type);
    });
  });

  elements.currentLevel.addEventListener("change", validateInputs);
  elements.targetLevel.addEventListener("change", validateInputs);
  elements.calculateBtn.addEventListener("click", handleCalculate);
}

export async function init(container) {
  container.innerHTML = getHTML();

  elements.container = container;
  elements.expTableLeft = container.querySelector("#expTableLeft");
  elements.expTableRight = container.querySelector("#expTableRight");
  elements.expType = container.querySelector("#expType");
  elements.currentLevel = container.querySelector("#currentLevel");
  elements.targetLevel = container.querySelector("#targetLevel");
  elements.highSoul = container.querySelector("#highSoul");
  elements.midSoul = container.querySelector("#midSoul");
  elements.lowSoul = container.querySelector("#lowSoul");
  elements.calculateBtn = container.querySelector("#calculateBtn");
  elements.resultsPanel = container.querySelector("#resultsPanel");

  setupEventListeners();

  showLoading(container, "경험치 테이블 로딩 중...");
  try {
    pageState.expTable = await fetchSoulExpTable();
    renderExpTable();
  } catch (error) {
    container.innerHTML = `<p class="error-message">경험치 데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
  } finally {
    hideLoading();
  }

  console.log("환수혼 계산 페이지 초기화 완료.");
}

export function cleanup() {
  console.log("환수혼 계산 페이지 정리 완료.");
}

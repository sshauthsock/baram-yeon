const HISTORY_KEY = "savedOptimalCombinations";
const COUNTER_KEY = "combinationCounter";
const MAX_HISTORY = 5;

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    const history = saved
      ? JSON.parse(saved)
      : { 수호: [], 탑승: [], 변신: [] };
    // 데이터 구조 보정
    if (!history.수호) history.수호 = [];
    if (!history.탑승) history.탑승 = [];
    if (!history.변신) history.변신 = [];
    return history;
  } catch (e) {
    return { 수호: [], 탑승: [], 변신: [] };
  }
}

function loadCounter() {
  try {
    const saved = localStorage.getItem(COUNTER_KEY);
    const counter = saved ? JSON.parse(saved) : { 수호: 0, 탑승: 0, 변신: 0 };
    return counter;
  } catch (e) {
    return { 수호: 0, 탑승: 0, 변신: 0 };
  }
}

function saveHistory(history, counter) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(COUNTER_KEY, JSON.stringify(counter));
  } catch (e) {
    console.error("기록 저장 실패:", e);
  }
}

export function addResult(result) {
  if (!result || !result.spirits || result.spirits.length === 0) return;

  const category = result.spirits[0].type;
  if (!category) return;

  const history = loadHistory();
  const counter = loadCounter();

  if (counter[category] === undefined) counter[category] = 0;
  counter[category]++;

  const index = (counter[category] - 1) % MAX_HISTORY;

  const newEntry = {
    ...result,
    timestamp: new Date().toLocaleString("ko-KR"),
    id: Date.now(),
  };

  history[category][index] = newEntry;

  saveHistory(history, counter);
}

export function getHistoryForCategory(category) {
  const history = loadHistory();
  return history[category] || [];
}

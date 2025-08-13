const BASE_URL = "http://localhost:8080";

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "서버 응답을 읽을 수 없습니다." }));
    throw new Error(errorData.error || `서버 오류: ${response.statusText}`);
  }
  return response.json();
}

/**
 * sessionStorage를 이용한 캐싱 기능이 포함된 fetch 헬퍼 함수
 * @param {string} key - 캐시를 위한 sessionStorage 키
 * @param {string} url - fetch를 요청할 URL
 * @returns {Promise<any>}
 */
async function fetchWithCache(key, url) {
  const cachedItem = sessionStorage.getItem(key);
  if (cachedItem) {
    try {
      console.log(`[Cache] Using cached data for key: ${key}`);
      return JSON.parse(cachedItem);
    } catch (e) {
      console.error("Failed to parse cached data, fetching fresh.", e);
      sessionStorage.removeItem(key);
    }
  }

  console.log(`[API] Fetching fresh data for key: ${key}`);
  const response = await fetch(url);
  const data = await handleResponse(response);

  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to sessionStorage", e);
  }

  return data;
}

export async function fetchAllSpirits() {
  const response = await fetch(`${BASE_URL}/api/alldata`);
  return handleResponse(response);
}

export async function calculateOptimalCombination(creatures) {
  const response = await fetch(`${BASE_URL}/api/calculate/bond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatures }),
  });
  return handleResponse(response);
}

export async function fetchRankings(category, type, statKey = "") {
  let url = `${BASE_URL}/api/rankings?category=${encodeURIComponent(
    category
  )}&type=${encodeURIComponent(type)}`;
  if (type === "stat" && statKey) {
    url += `&statKey=${encodeURIComponent(statKey)}`;
  }
  // 랭킹 데이터는 용량이 크므로 세션/로컬 스토리지 캐시를 사용하지 않고 직접 호출
  const response = await fetch(url);
  return handleResponse(response);
}

export async function fetchSoulExpTable() {
  return fetchWithCache("soulExpTable", `${BASE_URL}/api/soul/exp-table`);
}

export async function calculateSoul(data) {
  const response = await fetch(`${BASE_URL}/api/calculate/soul`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function fetchChakData() {
  return fetchWithCache("chakData", `${BASE_URL}/api/chak/data`);
}

export async function calculateChak(data) {
  const response = await fetch(`${BASE_URL}/api/calculate/chak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

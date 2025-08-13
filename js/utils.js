/**
 * 지정된 태그, 클래스, 속성을 가진 HTML 요소를 생성합니다.
 */
export function createElement(tag, className, attributes = {}) {
  const element = document.createElement(tag);
  if (className) {
    if (Array.isArray(className)) {
      element.classList.add(...className);
    } else {
      element.className = className;
    }
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "text" || key === "textContent") {
      element.textContent = value;
    } else if (key === "html" || key === "innerHTML") {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
}

/**
 * 함수가 마지막으로 호출된 후 일정 시간이 지나면 실행되도록 하는 디바운스 함수입니다.
 */
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * 환수의 등록/장착 효과가 25레벨까지 모두 있는지 확인합니다.
 * @param {object} spirit - 확인할 환수 데이터
 * @returns {{hasFullRegistration: boolean, hasFullBind: boolean}}
 */
export function checkSpiritStats(spirit) {
  if (!spirit || !Array.isArray(spirit.stats)) {
    return { hasFullRegistration: false, hasFullBind: false };
  }
  const level25Stat = spirit.stats.find((s) => s.level === 25);
  const hasFullBind = !!(
    level25Stat?.bindStat && Object.keys(level25Stat.bindStat).length > 0
  );
  const hasFullRegistration = !!(
    level25Stat?.registrationStat &&
    Object.keys(level25Stat.registrationStat).length > 0
  );
  return { hasFullRegistration, hasFullBind };
}

export function getNextMonthLastThursday() {
  const now = new Date();
  // 다음 달 1일로 설정
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 그 다음 달 1일에서 하루를 빼서 다음 달의 마지막 날을 구함
  const lastDayOfNextMonth = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  );

  let lastThursday = lastDayOfNextMonth;

  // 마지막 날부터 거꾸로 탐색하며 목요일(요일 인덱스 4)을 찾음
  while (lastThursday.getDay() !== 4) {
    lastThursday.setDate(lastThursday.getDate() - 1);
  }

  // 자정으로 시간 설정
  lastThursday.setHours(0, 0, 0, 0);

  return lastThursday;
}

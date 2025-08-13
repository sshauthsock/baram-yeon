// js/components/spiritGrid.js

import { createElement } from "../utils.js";
import { INFLUENCE_ROWS } from "../constants.js";

/**
 * 환수 이미지 래퍼를 생성합니다.
 * @param {object} spirit - 환수 데이터
 * @param {function} getSpiritState - 환수의 현재 상태(e.g., selected, completed)를 반환하는 함수
 * @returns {HTMLElement} 생성된 div.img-wrapper 요소
 */
function createImageWrapper(spirit, getSpiritState) {
  const state = getSpiritState(spirit); // { selected: bool, registrationCompleted: bool, bondCompleted: bool }

  const wrapperClasses = ["img-wrapper"];
  if (state.selected) {
    wrapperClasses.push("selected");
  }

  const wrapper = createElement("div", wrapperClasses, {
    "data-spirit-name": spirit.name,
  });

  const imgBox = createElement("div", "img-box");
  wrapper.appendChild(imgBox);

  if (state.selected) {
    const checkMark = createElement("div", "center-check-mark", { text: "✓" });
    imgBox.appendChild(checkMark);
  }

  // spiritInfo 페이지의 리본 표시를 위한 클래스 추가
  if (state.registrationCompleted)
    imgBox.classList.add("registration-completed");
  if (state.bondCompleted) imgBox.classList.add("bond-completed");

  const img = createElement("img", "", {
    src: `/${spirit.image}`,
    alt: spirit.name,
    loading: "lazy",
  });
  const nameLabel = createElement("small", "img-name", { text: spirit.name });

  imgBox.appendChild(img);
  wrapper.appendChild(nameLabel);

  return wrapper;
}

/**
 * 모든 환수를 하나의 그리드에 표시합니다.
 * @param {Array<object>} spirits - 표시할 환수 목록
 * @param {function} onSpiritClick - 환수 클릭 시 실행될 콜백 함수
 * @param {function} getSpiritState - 환수 상태 조회 함수
 * @returns {HTMLElement} 생성된 그리드 컨테이너
 */
function displayAllPets(spirits, onSpiritClick, getSpiritState) {
  const grid = createElement("div", "image-container-grid");
  spirits.forEach((spirit) => {
    const wrapper = createImageWrapper(spirit, getSpiritState);
    wrapper.addEventListener("click", () => onSpiritClick(spirit));
    grid.appendChild(wrapper);
  });
  return grid;
}

/**
 * 세력별로 그룹화된 환수 목록을 표시합니다.
 * @param {Array<object>} spirits - 표시할 환수 목록
 * @param {function} onSpiritClick - 환수 클릭 시 실행될 콜백 함수
 * @param {function} getSpiritState - 환수 상태 조회 함수
 * @returns {HTMLElement} 생성된 그룹 컨테이너
 */
function displayPetsByInfluence(spirits, onSpiritClick, getSpiritState) {
  const container = createElement("div", "image-container-grouped");
  const grouped = spirits.reduce((acc, spirit) => {
    (acc[spirit.influence || "기타"] =
      acc[spirit.influence || "기타"] || []).push(spirit);
    return acc;
  }, {});

  const createInfluenceGroup = (influence, items) => {
    const group = createElement("div", "influence-group");
    const header = createElement("h3", "influence-header", {
      text: `${influence} (${items.length})`,
    });
    const itemsWrapper = createElement("div", "influence-items");
    items.forEach((item) => {
      const wrapper = createImageWrapper(item, getSpiritState);
      wrapper.addEventListener("click", () => onSpiritClick(item));
      itemsWrapper.appendChild(wrapper);
    });
    group.append(header, itemsWrapper);
    return group;
  };

  const processed = new Set();
  INFLUENCE_ROWS.forEach((rowInfluences) => {
    const rowEl = createElement("div", "influence-row");
    let hasContent = false;
    rowInfluences.forEach((inf) => {
      if (grouped[inf]) {
        rowEl.appendChild(createInfluenceGroup(inf, grouped[inf]));
        processed.add(inf);
        hasContent = true;
      }
    });
    if (hasContent) container.appendChild(rowEl);
  });

  const others = Object.keys(grouped)
    .filter((inf) => !processed.has(inf))
    .sort();
  if (others.length > 0) {
    const otherRow = createElement("div", "influence-row");
    others.forEach((inf) =>
      otherRow.appendChild(createInfluenceGroup(inf, grouped[inf]))
    );
    container.appendChild(otherRow);
  }
  return container;
}

/**
 * 환수 목록 그리드를 렌더링하는 메인 함수
 * @param {object} options
 * @param {HTMLElement} options.container - 그리드가 렌더링될 부모 요소
 * @param {Array<object>} options.spirits - 표시할 환수 데이터 배열
 * @param {function} options.onSpiritClick - 각 환수 아이템 클릭 시 호출될 함수
 * @param {function} options.getSpiritState - 각 환수의 상태(선택 여부 등)를 반환하는 함수
 * @param {boolean} options.groupByInfluence - 세력별로 그룹화할지 여부
 */
export function renderSpiritGrid({
  container,
  spirits,
  onSpiritClick,
  getSpiritState,
  groupByInfluence,
}) {
  container.innerHTML = ""; // 이전 내용 초기화

  if (spirits.length === 0) {
    container.innerHTML = `<p class="empty-state-message">조건에 맞는 환수가 없습니다.</p>`;
    return;
  }

  let gridElement;
  if (groupByInfluence) {
    gridElement = displayPetsByInfluence(
      spirits,
      onSpiritClick,
      getSpiritState
    );
  } else {
    gridElement = displayAllPets(spirits, onSpiritClick, getSpiritState);
  }
  container.appendChild(gridElement);
}

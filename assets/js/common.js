// 탭 클릭 시 해당 탭 렌더링
document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });
});

function openTab(name) {
  alert(`"${name}" 탭은 구현되지 않았습니다.\n필요 시 페이지를 연결하세요.`);
}

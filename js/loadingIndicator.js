const styleId = "loading-indicator-style";
let loadingOverlay = null;

function initStyles() {
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
        .loading-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex; justify-content: center; align-items: center;
            z-index: 10000; backdrop-filter: blur(4px);
            opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s;
        }
        .loading-overlay.visible { opacity: 1; visibility: visible; }
        .loading-container {
            background-color: #ffffff; border-radius: 15px; padding: 30px;
            text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            max-width: 400px; width: 90%;
        }
        .loading-spinner {
            border: 5px solid #e0e0e0; width: 60px; height: 60px;
            border-radius: 50%; border-top-color: #3498db;
            margin: 0 auto 20px; animation: spin 1.2s linear infinite;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading-text { margin: 15px 0; color: #333; font-size: 20px; font-weight: bold; }
        .loading-subtext { color: #666; font-size: 14px; margin-bottom: 5px; }
    `;
  document.head.appendChild(style);
}

function createLoadingOverlay(container) {
  if (loadingOverlay) loadingOverlay.remove();
  initStyles();
  loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay";
  loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">로딩 중...</div>
            <div class="loading-subtext">잠시만 기다려주세요</div>
        </div>
    `;
  container.appendChild(loadingOverlay);
}

export function showLoading(
  container,
  text = "처리 중...",
  subText = "잠시만 기다려주세요."
) {
  if (!container) return;
  createLoadingOverlay(container);
  loadingOverlay.querySelector(".loading-text").textContent = text;
  loadingOverlay.querySelector(".loading-subtext").textContent = subText;
  requestAnimationFrame(() => {
    loadingOverlay?.classList.add("visible");
  });
}

export function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove("visible");
    // [핵심 수정] 전환 효과를 기다리지 않고 즉시 제거하도록 변경
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}

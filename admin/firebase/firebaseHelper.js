// const FirestoreManager = (function () {
//   const DOCUMENT_MAP = CommonData.DOCUMENT_MAP;
//   const STATS_MAPPING = CommonData.STATS_MAPPING;

//   const TYPE_TO_PATH = {
//     수호: "guardian",
//     탑승: "ride",
//     변신: "transform",
//   };

//   let db;
//   let currentDocument = null;
//   let selectedDocumentId = null;
//   let lastImageNumbers = {};
//   let editingJson = null;
//   let currentEditMode = "json";
//   let draggedItem = null;
//   let previousGuardianData = null;
//   let updatedGuardianData = null;
//   let selectedGuardian = null;
//   let selectedGuardianIndex = -1;
//   let selectedStats = [];
//   let currentLevel = 0;
//   let levelStats = {};
//   let draggedStatKey = null;
//   let draggedInputGroup = null;

//   const reverseDocumentMap = {};
//   for (const [fileName, docId] of Object.entries(DOCUMENT_MAP)) {
//     reverseDocumentMap[docId] = fileName;
//   }

//   function initFirebase() {
//     try {
//       updateLoadingStatus("Firebase 설정 로드 중...");

//       if (typeof firebaseConfig === "undefined") {
//         return loadFirebaseConfig()
//           .then(() => {
//             updateLoadingStatus("Firebase 초기화 중...");
//             firebase.initializeApp(firebaseConfig);
//             db = firebase.firestore();

//             const connectionStatusDiv =
//               document.getElementById("connectionStatus");
//             if (connectionStatusDiv) {
//               connectionStatusDiv.className = "success";
//               connectionStatusDiv.textContent = "Firebase에 연결되었습니다.";
//             }
//             updateLoadingStatus("Firebase 연결 성공!");
//             return true;
//           })
//           .catch((error) => {
//             console.error("Firebase 설정 로드 실패:", error);
//             const connectionStatusDiv =
//               document.getElementById("connectionStatus");
//             if (connectionStatusDiv) {
//               connectionStatusDiv.className = "error";
//               connectionStatusDiv.textContent = `Firebase 설정 로드 실패: ${error.message}`;
//             }
//             updateLoadingStatus("Firebase 설정 로드 실패", true);
//             return false;
//           });
//       } else {
//         updateLoadingStatus("Firebase 초기화 중...");
//         firebase.initializeApp(firebaseConfig);
//         db = firebase.firestore();

//         const connectionStatusDiv = document.getElementById("connectionStatus");
//         if (connectionStatusDiv) {
//           connectionStatusDiv.className = "success";
//           connectionStatusDiv.textContent = "Firebase에 연결되었습니다.";
//         }
//         updateLoadingStatus("Firebase 연결 성공!");
//         return Promise.resolve(true);
//       }
//     } catch (error) {
//       console.error("Firebase 초기화 오류:", error);
//       const connectionStatusDiv = document.getElementById("connectionStatus");
//       if (connectionStatusDiv) {
//         connectionStatusDiv.className = "error";
//         connectionStatusDiv.textContent = `Firebase 연결 오류: ${error.message}`;
//       }
//       updateLoadingStatus("Firebase 초기화 오류", true);
//       return Promise.resolve(false);
//     }
//   }

//   async function initialize() {
//     updateLoadingStatus("Firebase 연결 시도 중...");
//     const isConnected = await initFirebase();

//     if (isConnected) {
//       updateLoadingStatus("문서 목록 로드 중...");
//       await refreshDocumentList();
//       updateLoadingStatus("이미지 정보 로드 중...");
//       await loadImageNumbers();
//       updateLoadingStatus("이벤트 설정 중...");
//       setupEventListeners();
//       initStatDropdown();
//       updateLoadingStatus("초기화 완료!");

//       setTimeout(hideLoadingOverlay, 500);
//     } else {
//       console.error("Firebase 초기화 실패");
//       updateLoadingStatus(
//         "Firebase 초기화 실패. 새로고침 후 다시 시도하세요.",
//         true
//       );
//     }
//   }

//   function updateLoadingStatus(message, isError = false) {
//     const statusElement = document.getElementById("loadingStatus");
//     if (statusElement) {
//       statusElement.textContent = message;
//       if (isError) {
//         statusElement.style.backgroundColor = "#f8d7da";
//         statusElement.style.color = "#721c24";
//       }
//     }
//   }

//   function hideLoadingOverlay() {
//     const overlay = document.getElementById("loadingOverlay");
//     const tabContainer = document.querySelector(".tab-container");

//     if (overlay) {
//       overlay.style.opacity = "0";
//       setTimeout(() => {
//         overlay.style.display = "none";
//       }, 500);
//     }

//     if (tabContainer) {
//       tabContainer.classList.remove("disabled");
//     }
//   }

//   function loadFirebaseConfig() {
//     return new Promise((resolve, reject) => {
//       const script = document.createElement("script");
//       script.src = "assets/js/firebaseConfig.js";
//       script.onload = () => {
//         if (typeof firebaseConfig !== "undefined") {
//           resolve();
//         } else {
//           reject(
//             new Error("firebaseConfig가 로드된 스크립트에 정의되지 않았습니다.")
//           );
//         }
//       };
//       script.onerror = () => reject(new Error("firebaseConfig.js 로드 실패"));
//       document.head.appendChild(script);
//     });
//   }

//   async function testConnection() {
//     if (!db) return false;

//     try {
//       const docRef = db.collection("jsonData").doc("data-1745203971906");
//       const docSnapshot = await docRef.get();
//       return docSnapshot.exists;
//     } catch (error) {
//       console.error("Firebase 연결 테스트 실패:", error);
//       return false;
//     }
//   }

//   function filterDocumentList() {
//     const searchInput = document
//       .getElementById("documentSearchInput")
//       .value.toLowerCase();
//     const typeFilter = document.getElementById("documentTypeFilter").value;
//     const documentItems = document.querySelectorAll(".document-item");
//     let visibleCount = 0;

//     documentItems.forEach((item) => {
//       const docName = item
//         .querySelector(".document-name")
//         .textContent.toLowerCase();
//       const docId = item.querySelector(".document-id").textContent;
//       let docType = "";

//       if (docName.includes("guardian")) docType = "guardian";
//       else if (docName.includes("ride")) docType = "ride";
//       else if (docName.includes("transform")) docType = "transform";
//       else docType = "other";

//       const matchesSearch =
//         docName.includes(searchInput) || docId.includes(searchInput);
//       const matchesType = typeFilter === "" || docType === typeFilter;

//       if (matchesSearch && matchesType) {
//         item.style.display = "flex";
//         visibleCount++;
//       } else {
//         item.style.display = "none";
//       }
//     });

//     document.getElementById("documentCount").textContent = `(${visibleCount})`;
//   }

//   function filterGuardiansList() {
//     const searchInput = document
//       .getElementById("guardianSearchInput")
//       .value.toLowerCase();
//     const guardianItems = document.querySelectorAll(".guardian-item");

//     guardianItems.forEach((item) => {
//       const guardianName = item.textContent.toLowerCase();
//       if (guardianName.includes(searchInput)) {
//         item.style.display = "block";
//       } else {
//         item.style.display = "none";
//       }
//     });
//   }

//   async function refreshDocumentList() {
//     const documentListDiv = document.getElementById("documentList");
//     if (!documentListDiv) return;

//     documentListDiv.innerHTML =
//       "<p class='loading-message'>문서를 로딩 중입니다...</p>";

//     try {
//       const snapshot = await db.collection("jsonData").get();

//       if (snapshot.empty) {
//         documentListDiv.innerHTML =
//           "<p class='loading-message'>문서가 없습니다.</p>";
//         document.getElementById("documentCount").textContent = "(0)";
//         return;
//       }

//       let listHTML = "";
//       let docCount = 0;

//       snapshot.forEach((doc) => {
//         docCount++;
//         const docId = doc.id;
//         const fileName = reverseDocumentMap[docId] || docId;
//         const isSelected = selectedDocumentId === docId ? "selected" : "";
//         let docIcon = "📄";

//         if (fileName.includes("guardian")) docIcon = "🛡️";
//         else if (fileName.includes("ride")) docIcon = "🐎";
//         else if (fileName.includes("transform")) docIcon = "✨";

//         listHTML += `
//             <div class="document-item ${isSelected}" onclick="FirestoreManager.viewDocument('${docId}')">
//                 <span class="document-icon">${docIcon}</span>
//                 <div class="document-info">
//                     <span class="document-name">${fileName}</span>
//                     <span class="document-id">${docId}</span>
//                 </div>
//             </div>
//         `;
//       });

//       documentListDiv.innerHTML = listHTML;
//       document.getElementById("documentCount").textContent = `(${docCount})`;

//       document
//         .getElementById("documentSearchInput")
//         ?.addEventListener("input", filterDocumentList);
//       document
//         .getElementById("documentTypeFilter")
//         ?.addEventListener("change", filterDocumentList);
//     } catch (error) {
//       documentListDiv.innerHTML = `<p class="error">문서 목록 로드 오류: ${error.message}</p>`;
//       console.error("문서 목록 로드 오류:", error);
//     }
//   }

//   function loadGuardianData(guardian, index) {
//     selectedGuardian = guardian;
//     selectedGuardianIndex = index;
//     levelStats = {};

//     const selectedGuardianNameEl = document.getElementById(
//       "selectedGuardianName"
//     );
//     if (selectedGuardianNameEl) {
//       selectedGuardianNameEl.textContent = `${guardian.name} ${
//         guardian.grade ? `[${guardian.grade}]` : ""
//       } ${guardian.type ? `(${guardian.type})` : ""}`;
//     }

//     const infoContainer = document.getElementById("guardianInfoContainer");
//     const levelTabsContainer = document.getElementById("levelTabsContainer");

//     infoContainer.style.display = "none";
//     levelTabsContainer.style.display = "block";

//     const fileName = reverseDocumentMap[selectedDocumentId] || "";
//     const statType = fileName.includes("-bind-")
//       ? "bindStat"
//       : "registrationStat";

//     selectedStats = [];

//     if (guardian.stats) {
//       guardian.stats.forEach((levelData) => {
//         if (levelData[statType]) {
//           const levelStats = levelData[statType];
//           Object.keys(levelStats).forEach((statKey) => {
//             if (!selectedStats.includes(statKey)) {
//               selectedStats.push(statKey);
//             }
//           });
//         }
//       });
//     }

//     if (guardian.stats) {
//       guardian.stats.forEach((levelData) => {
//         const level = levelData.level;
//         if (!levelStats[level]) levelStats[level] = {};

//         if (levelData[statType]) {
//           Object.entries(levelData[statType]).forEach(([key, value]) => {
//             levelStats[level][key] = value;
//           });
//         }
//       });
//     }

//     updateSelectedStatsDisplay();

//     initLevelTabs();

//     currentLevel = 0;
//     updateLevelContentForm(currentLevel);
//   }

//   function setupKeyboardShortcuts() {
//     document
//       .getElementById("jsonEditor")
//       ?.addEventListener("keydown", function (e) {
//         if (e.ctrlKey && e.key === "s") {
//           e.preventDefault();
//           FirestoreManager.saveJsonChanges();
//         }

//         if (e.ctrlKey && e.key === "f") {
//           e.preventDefault();
//           FirestoreManager.formatJson();
//         }
//       });

//     document
//       .getElementById("guardianSearchInput")
//       ?.addEventListener("input", filterGuardiansList);
//   }

//   async function viewDocument(documentId) {
//     selectedDocumentId = documentId;
//     const selectedDocumentDiv = document.getElementById("selectedDocument");
//     if (!selectedDocumentDiv) return;

//     const documentToolbar = document.getElementById("documentToolbar");
//     const jsonEditorContainer = document.getElementById("jsonEditorContainer");

//     document.querySelectorAll(".document-item").forEach((item) => {
//       item.classList.remove("selected");
//       if (item.querySelector(".document-id").textContent === documentId) {
//         item.classList.add("selected");
//       }
//     });

//     try {
//       selectedDocumentDiv.innerHTML =
//         "<p class='loading-message'>문서를 로딩 중입니다...</p>";
//       jsonEditorContainer.style.display = "none";
//       documentToolbar.style.display = "none";

//       const docRef = db.collection("jsonData").doc(documentId);
//       const docSnapshot = await docRef.get();

//       if (docSnapshot.exists) {
//         const data = docSnapshot.data();
//         editingJson = data;
//         const fileName = reverseDocumentMap[documentId] || documentId;

//         selectedDocumentDiv.innerHTML = `
//                 <h4 class="document-title">파일명: ${fileName}</h4>
//                 <div class="document-meta">문서 ID: ${documentId}</div>
//                 <hr>
//                 <pre class="json-preview">${JSON.stringify(data, null, 2)}</pre>
//             `;

//         documentToolbar.style.display = "flex";
//       } else {
//         selectedDocumentDiv.innerHTML =
//           "<p class='select-message'>문서가 존재하지 않습니다.</p>";
//         documentToolbar.style.display = "none";
//         editingJson = null;
//       }
//     } catch (error) {
//       selectedDocumentDiv.innerHTML = `<p class="error">문서 로드 오류: ${error.message}</p>`;
//       console.error("문서 로드 오류:", error);
//       documentToolbar.style.display = "none";
//       editingJson = null;
//     }
//   }

//   async function checkDocument() {
//     const documentName = document.getElementById("documentName").value;
//     const documentInfo = document.getElementById("documentInfo");
//     const documentPreview = document.getElementById("documentPreview");
//     const statusDiv = document.getElementById("status");

//     if (!documentName) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "문서 이름을 입력해주세요.";
//       documentInfo.style.display = "none";
//       documentPreview.style.display = "none";
//       return;
//     }

//     statusDiv.className = "info";
//     statusDiv.textContent = "문서 확인 중...";

//     try {
//       const docRef = db.collection("jsonData").doc(documentName);
//       const docSnapshot = await docRef.get();

//       if (docSnapshot.exists) {
//         currentDocument = docSnapshot.data();
//         const fileName = reverseDocumentMap[documentName] || documentName;

//         documentInfo.style.display = "block";
//         documentInfo.textContent = `문서가 존재합니다: ${fileName} (ID: ${documentName})`;

//         documentPreview.style.display = "block";
//         documentPreview.innerHTML =
//           "<h4>현재 문서 내용:</h4><pre>" +
//           JSON.stringify(currentDocument, null, 2) +
//           "</pre>";

//         document.querySelector(
//           'input[name="uploadMode"][value="merge"]'
//         ).checked = true;

//         statusDiv.className = "success";
//         statusDiv.textContent = "문서를 찾았습니다.";
//       } else {
//         documentInfo.style.display = "block";
//         documentInfo.textContent = `문서가 존재하지 않습니다: ${documentName}`;
//         documentPreview.style.display = "none";
//         currentDocument = null;

//         document.querySelector(
//           'input[name="uploadMode"][value="create"]'
//         ).checked = true;

//         statusDiv.className = "info";
//         statusDiv.textContent = "새 문서를 생성할 수 있습니다.";
//       }
//     } catch (error) {
//       documentInfo.style.display = "none";
//       documentPreview.style.display = "none";
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("문서 확인 오류:", error);
//     }

//     const updateMode = document.querySelector(
//       'input[name="uploadMode"]:checked'
//     ).value;
//     document.getElementById("updateFieldsContainer").style.display =
//       updateMode === "update" ? "block" : "none";
//   }

//   function uploadJson() {
//     const fileInput = document.getElementById("jsonFileInput");
//     const documentName = document.getElementById("documentName").value;
//     const statusDiv = document.getElementById("status");
//     const uploadMode = document.querySelector(
//       'input[name="uploadMode"]:checked'
//     ).value;

//     if (!documentName) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "문서 이름을 입력해주세요.";
//       return;
//     }

//     if (!fileInput.files.length) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "파일을 선택해주세요.";
//       return;
//     }

//     const file = fileInput.files[0];
//     if (file.size > 1000000) {
//       statusDiv.className = "error";
//       statusDiv.textContent =
//         "파일이 너무 큽니다. Firestore 문서 크기 제한은 1MB입니다.";
//       return;
//     }

//     const reader = new FileReader();
//     reader.onload = function (e) {
//       try {
//         const jsonData = JSON.parse(e.target.result);
//         statusDiv.className = "info";
//         statusDiv.textContent = "업로드 중...";

//         switch (uploadMode) {
//           case "create":
//             createDocument(documentName, jsonData);
//             break;
//           case "overwrite":
//             overwriteDocument(documentName, jsonData);
//             break;
//           case "merge":
//             mergeDocument(documentName, jsonData);
//             break;
//           case "update":
//             updateSpecificFields(documentName, jsonData);
//             break;
//         }

//         if (uploadMode === "create" && !reverseDocumentMap[documentName]) {
//           reverseDocumentMap[documentName] = file.name;
//         }
//       } catch (error) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `JSON 파싱 오류: ${error.message}`;
//       }
//     };

//     reader.readAsText(file);
//   }

//   async function createDocument(documentName, jsonData) {
//     const statusDiv = document.getElementById("status");

//     try {
//       const docSnapshot = await db
//         .collection("jsonData")
//         .doc(documentName)
//         .get();

//       if (docSnapshot.exists) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `문서가 이미 존재합니다. 다른 이름을 사용하거나 다른 업로드 모드를 선택하세요.`;
//       } else {
//         await db.collection("jsonData").doc(documentName).set(jsonData);

//         const fileName = document.getElementById("jsonFileInput").files[0].name;
//         reverseDocumentMap[documentName] = fileName;

//         statusDiv.className = "success";
//         statusDiv.textContent = `새 문서가 생성되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}`;

//         checkDocument();
//         refreshDocumentList();
//       }
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("업로드 오류:", error);
//     }
//   }

//   async function overwriteDocument(documentName, jsonData) {
//     const statusDiv = document.getElementById("status");

//     try {
//       await db.collection("jsonData").doc(documentName).set(jsonData);
//       const fileName = reverseDocumentMap[documentName] || documentName;

//       statusDiv.className = "success";
//       statusDiv.textContent = `문서가 덮어쓰기 되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}`;

//       checkDocument();
//       refreshDocumentList();
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("덮어쓰기 오류:", error);
//     }
//   }

//   async function mergeDocument(documentName, jsonData) {
//     const statusDiv = document.getElementById("status");

//     try {
//       await db
//         .collection("jsonData")
//         .doc(documentName)
//         .set(jsonData, { merge: true });
//       const fileName = reverseDocumentMap[documentName] || documentName;

//       statusDiv.className = "success";
//       statusDiv.textContent = `문서가 병합되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}`;

//       checkDocument();
//       refreshDocumentList();
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("병합 오류:", error);
//     }
//   }

//   async function updateSpecificFields(documentName, jsonData) {
//     const statusDiv = document.getElementById("status");
//     const updateFields = document.getElementById("updateFields").value.trim();

//     if (!updateFields) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "업데이트할 필드를 지정해주세요.";
//       return;
//     }

//     try {
//       const fields = updateFields.split(",").map((f) => f.trim());
//       const updateData = {};

//       for (const field of fields) {
//         const parts = field.split(".");
//         let value = jsonData;
//         let valid = true;

//         for (const part of parts) {
//           if (value && typeof value === "object" && part in value) {
//             value = value[part];
//           } else {
//             valid = false;
//             break;
//           }
//         }

//         if (valid) {
//           if (parts.length === 1) {
//             updateData[field] = value;
//           } else {
//             let currentObj = updateData;
//             for (let i = 0; i < parts.length - 1; i++) {
//               if (!currentObj[parts[i]]) {
//                 currentObj[parts[i]] = {};
//               }
//               currentObj = currentObj[parts[i]];
//             }
//             currentObj[parts[parts.length - 1]] = value;
//           }
//         } else {
//           statusDiv.className = "error";
//           statusDiv.textContent = `필드 경로를 찾을 수 없습니다: ${field}`;
//           return;
//         }
//       }

//       await db.collection("jsonData").doc(documentName).update(updateData);
//       const fileName = reverseDocumentMap[documentName] || documentName;

//       statusDiv.className = "success";
//       statusDiv.textContent = `선택한 필드가 업데이트되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}, 필드: ${updateFields}`;

//       checkDocument();
//       refreshDocumentList();
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("업데이트 오류:", error);
//     }
//   }

//   async function loadImageNumbers() {
//     try {
//       for (const docFileName in DOCUMENT_MAP) {
//         const docId = DOCUMENT_MAP[docFileName];
//         const docRef = db.collection("jsonData").doc(docId);
//         const docSnapshot = await docRef.get();

//         if (docSnapshot.exists) {
//           const data = docSnapshot.data();
//           if (data.data && Array.isArray(data.data)) {
//             const type = docFileName.split("-")[0];

//             let lastNormal = 0;
//             let lastImmortal = 0;

//             data.data.forEach((item) => {
//               if (item.image) {
//                 const normalMatch = item.image.match(
//                   new RegExp(`images/${type}/${type}_(\\d+)\\.jpg`)
//                 );
//                 if (normalMatch && normalMatch[1]) {
//                   const num = parseInt(normalMatch[1]);
//                   if (num > lastNormal) {
//                     lastNormal = num;
//                   }
//                 }

//                 const immortalMatch = item.image.match(
//                   new RegExp(`images/${type}/${type}_i(\\d+)\\.jpg`)
//                 );
//                 if (immortalMatch && immortalMatch[1]) {
//                   const num = parseInt(immortalMatch[1]);
//                   if (num > lastImmortal) {
//                     lastImmortal = num;
//                   }
//                 }
//               }
//             });

//             if (!lastImageNumbers[docFileName]) {
//               lastImageNumbers[docFileName] = {};
//             }
//             lastImageNumbers[docFileName].normal = lastNormal;
//             lastImageNumbers[docFileName].immortal = lastImmortal;
//           }
//         }
//       }
//       console.log("이미지 번호 로딩 완료:", lastImageNumbers);
//       updateImagePath();
//     } catch (error) {
//       console.error("이미지 번호 로딩 오류:", error);
//     }
//   }

//   function updateImagePath() {
//     const docFileName = document.getElementById(
//       "newGuardianDocumentSelect"
//     )?.value;
//     const type = document.getElementById("newGuardianType")?.value;
//     const grade = document.getElementById("newGuardianGrade")?.value;
//     const imageInput = document.getElementById("newGuardianImage");

//     if (!type || !imageInput) return;

//     const typeForPath = TYPE_TO_PATH[type];
//     const isImmortal = grade === "불멸";

//     let nextNumber = 1;

//     if (docFileName && lastImageNumbers[docFileName]) {
//       if (isImmortal) {
//         nextNumber = (lastImageNumbers[docFileName].immortal || 0) + 1;
//       } else {
//         nextNumber = (lastImageNumbers[docFileName].normal || 0) + 1;
//       }
//     }

//     let prefix = `images/${typeForPath}/${typeForPath}_`;
//     if (isImmortal) {
//       prefix += "i";
//     }

//     imageInput.value = `${prefix}${nextNumber}.jpg`;
//   }

//   function prepareEditSelectedDocument() {
//     if (!selectedDocumentId || !editingJson) return;

//     document.getElementById("selectedDocument").style.display = "none";
//     document.getElementById("documentToolbar").style.display = "none";

//     const jsonEditorContainer = document.getElementById("jsonEditorContainer");
//     jsonEditorContainer.style.display = "block";

//     const jsonEditor = document.getElementById("jsonEditor");
//     jsonEditor.value = JSON.stringify(editingJson, null, 2);

//     switchEditMode("json");
//   }

//   function switchEditMode(mode) {
//     currentEditMode = mode;

//     document.querySelectorAll(".edit-mode-tab").forEach((tab) => {
//       tab.classList.remove("active");
//     });

//     document
//       .querySelector(`.edit-mode-tab[onclick*="${mode}"]`)
//       .classList.add("active");

//     if (mode === "json") {
//       document.getElementById("jsonEditMode").style.display = "block";
//       document.getElementById("arrayEditMode").style.display = "none";
//       document.getElementById("dataEditMode").style.display = "none";
//     } else if (mode === "array") {
//       document.getElementById("jsonEditMode").style.display = "none";
//       document.getElementById("arrayEditMode").style.display = "block";
//       document.getElementById("dataEditMode").style.display = "none";
//       renderDataItems();
//     } else if (mode === "data") {
//       document.getElementById("jsonEditMode").style.display = "none";
//       document.getElementById("arrayEditMode").style.display = "none";
//       document.getElementById("dataEditMode").style.display = "block";
//       renderGuardiansList();
//       initStatDropdown();
//     }
//   }

//   function renderDataItems() {
//     const container = document.getElementById("dataItemsContainer");
//     container.innerHTML = "";

//     try {
//       const jsonData = JSON.parse(document.getElementById("jsonEditor").value);

//       if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
//         jsonData.data.forEach((item, index) => {
//           const div = document.createElement("div");
//           div.className = "data-item";
//           div.setAttribute("draggable", "true");
//           div.setAttribute("data-index", index);

//           let displayText = "";
//           if (item.name) {
//             displayText += `<strong>${item.name}</strong>`;
//           } else {
//             displayText += `<strong>항목 ${index + 1}</strong>`;
//           }

//           if (item.type) displayText += ` (${item.type})`;
//           if (item.grade) displayText += ` [${item.grade}]`;

//           div.innerHTML = displayText;

//           div.addEventListener("dragstart", handleDragStart);
//           div.addEventListener("dragover", handleDragOver);
//           div.addEventListener("drop", handleDrop);
//           div.addEventListener("dragend", handleDragEnd);

//           container.appendChild(div);
//         });
//       } else {
//         container.innerHTML =
//           "<p>데이터 배열을 찾을 수 없거나 유효하지 않은 JSON입니다.</p>";
//       }
//     } catch (error) {
//       container.innerHTML = `<p class="error">JSON 파싱 오류: ${error.message}</p>`;
//     }
//   }

//   function handleDragStart(e) {
//     draggedItem = this;
//     this.style.opacity = "0.4";
//     e.dataTransfer.effectAllowed = "move";
//   }

//   function handleDragOver(e) {
//     if (e.preventDefault) {
//       e.preventDefault();
//     }
//     e.dataTransfer.dropEffect = "move";
//     return false;
//   }

//   function handleDrop(e) {
//     if (e.stopPropagation) {
//       e.stopPropagation();
//     }

//     if (draggedItem !== this) {
//       const container = document.getElementById("dataItemsContainer");
//       const items = Array.from(container.querySelectorAll(".data-item"));
//       const fromIndex = parseInt(draggedItem.getAttribute("data-index"));
//       const toIndex = parseInt(this.getAttribute("data-index"));

//       try {
//         const jsonData = JSON.parse(
//           document.getElementById("jsonEditor").value
//         );

//         if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
//           const [movedItem] = jsonData.data.splice(fromIndex, 1);
//           jsonData.data.splice(toIndex, 0, movedItem);

//           document.getElementById("jsonEditor").value = JSON.stringify(
//             jsonData,
//             null,
//             2
//           );

//           renderDataItems();
//         }
//       } catch (error) {
//         console.error("항목 이동 오류:", error);
//       }
//     }

//     return false;
//   }

//   function handleDragEnd() {
//     this.style.opacity = "1";
//     draggedItem = null;
//   }

//   function formatJson() {
//     try {
//       const jsonEditor = document.getElementById("jsonEditor");
//       const json = JSON.parse(jsonEditor.value);
//       jsonEditor.value = JSON.stringify(json, null, 2);
//     } catch (error) {
//       alert(`JSON 포맷팅 오류: ${error.message}`);
//     }
//   }

//   async function saveJsonChanges() {
//     if (!selectedDocumentId) return;

//     try {
//       const jsonEditor = document.getElementById("jsonEditor");
//       const newData = JSON.parse(jsonEditor.value);

//       if (confirm("문서의 내용을 변경하시겠습니까?")) {
//         await db.collection("jsonData").doc(selectedDocumentId).set(newData);
//         alert("문서가 성공적으로 업데이트되었습니다!");

//         cancelEditing();
//         viewDocument(selectedDocumentId);
//       }
//     } catch (error) {
//       alert(`저장 오류: ${error.message}`);
//       console.error("문서 저장 오류:", error);
//     }
//   }

//   async function saveArrayOrder() {
//     if (!selectedDocumentId) return;

//     try {
//       const jsonEditor = document.getElementById("jsonEditor");
//       const newData = JSON.parse(jsonEditor.value);

//       if (confirm("변경된 배열 순서를 저장하시겠습니까?")) {
//         await db.collection("jsonData").doc(selectedDocumentId).set(newData);
//         alert("문서가 성공적으로 업데이트되었습니다!");

//         cancelEditing();
//         viewDocument(selectedDocumentId);
//       }
//     } catch (error) {
//       alert(`저장 오류: ${error.message}`);
//       console.error("문서 저장 오류:", error);
//     }
//   }

//   function updateSelectedStatsDisplay() {
//     const container = document.getElementById("selectedStatsContainer");
//     if (!container) return;

//     container.innerHTML = "";

//     selectedStats.forEach((statKey) => {
//       const statElement = document.createElement("div");
//       statElement.className = "selected-stat";
//       statElement.setAttribute("draggable", "true");
//       statElement.setAttribute("data-stat-key", statKey);
//       statElement.innerHTML = `
//         <span class="drag-handle">⋮⋮</span>
//         ${STATS_MAPPING[statKey] || statKey} (${statKey})
//         <span class="remove-stat" onclick="FirestoreManager.removeSelectedStat('${statKey}')">×</span>
//       `;

//       statElement.addEventListener("dragstart", handleStatDragStart);
//       statElement.addEventListener("dragover", handleStatDragOver);
//       statElement.addEventListener("drop", handleStatDrop);
//       statElement.addEventListener("dragend", handleStatDragEnd);

//       container.appendChild(statElement);
//     });
//   }

//   function handleStatDragStart(e) {
//     draggedStatKey = this.getAttribute("data-stat-key");
//     this.style.opacity = "0.4";
//     e.dataTransfer.effectAllowed = "move";
//   }

//   function handleStatDragOver(e) {
//     if (e.preventDefault) {
//       e.preventDefault();
//     }
//     e.dataTransfer.dropEffect = "move";
//     return false;
//   }

//   function handleStatDrop(e) {
//     if (e.stopPropagation) {
//       e.stopPropagation();
//     }

//     if (draggedStatKey !== this.getAttribute("data-stat-key")) {
//       const fromIndex = selectedStats.indexOf(draggedStatKey);
//       const toIndex = selectedStats.indexOf(this.getAttribute("data-stat-key"));

//       if (fromIndex !== -1 && toIndex !== -1) {
//         selectedStats.splice(fromIndex, 1);
//         selectedStats.splice(toIndex, 0, draggedStatKey);

//         updateSelectedStatsDisplay();
//         updateLevelContentForm(currentLevel);

//         showStatsOrderNotification();
//       }
//     }

//     return false;
//   }

//   function handleStatDragEnd() {
//     this.style.opacity = "1";
//     draggedStatKey = null;
//   }

//   function showStatsOrderNotification() {
//     const notification = document.createElement("div");
//     notification.className = "stat-order-notification";
//     notification.innerHTML = `
//       <span>능력치 순서가 변경되었습니다.</span>
//       <span class="note">변경사항은 저장 시 모든 레벨에 적용됩니다.</span>
//     `;

//     const existingNotification = document.querySelector(
//       ".stat-order-notification"
//     );
//     if (existingNotification) {
//       existingNotification.remove();
//     }

//     const container = document.querySelector(".stat-actions");
//     if (container) {
//       container.insertBefore(notification, container.firstChild);

//       setTimeout(() => {
//         notification.remove();
//       }, 5000);
//     }
//   }

//   function handleInputGroupDragStart(e) {
//     draggedInputGroup = this;
//     draggedStatKey = this.getAttribute("data-stat-key");
//     this.style.opacity = "0.4";
//     e.dataTransfer.effectAllowed = "move";
//   }

//   function handleInputGroupDragOver(e) {
//     if (e.preventDefault) {
//       e.preventDefault();
//     }
//     e.dataTransfer.dropEffect = "move";
//     return false;
//   }

//   function handleInputGroupDrop(e) {
//     if (e.stopPropagation) {
//       e.stopPropagation();
//     }

//     if (draggedInputGroup !== this) {
//       const targetStatKey = this.getAttribute("data-stat-key");
//       const fromIndex = selectedStats.indexOf(draggedStatKey);
//       const toIndex = selectedStats.indexOf(targetStatKey);

//       if (fromIndex !== -1 && toIndex !== -1) {
//         selectedStats.splice(fromIndex, 1);
//         selectedStats.splice(toIndex, 0, draggedStatKey);

//         updateSelectedStatsDisplay();
//         updateLevelContentForm(currentLevel);

//         showStatsOrderNotification();
//       }
//     }

//     return false;
//   }

//   function handleInputGroupDragEnd() {
//     this.style.opacity = "1";
//     draggedInputGroup = null;
//     draggedStatKey = null;
//   }

//   async function saveDataChanges() {
//     if (!selectedDocumentId || !selectedGuardian) return;

//     try {
//       saveCurrentLevelInputs();

//       const jsonData = JSON.parse(document.getElementById("jsonEditor").value);

//       if (!jsonData.data || !Array.isArray(jsonData.data)) {
//         alert("데이터 형식이 올바르지 않습니다.");
//         return;
//       }

//       const fileName = reverseDocumentMap[selectedDocumentId] || "";
//       const statType = fileName.includes("-bind-")
//         ? "bindStat"
//         : "registrationStat";

//       if (selectedGuardianIndex !== -1) {
//         const guardian = jsonData.data[selectedGuardianIndex];

//         while (guardian.stats.length <= 25) {
//           guardian.stats.push({
//             level: guardian.stats.length,
//             [statType]: {},
//           });
//         }

//         Object.keys(levelStats).forEach((level) => {
//           const levelInt = parseInt(level);

//           if (!guardian.stats[levelInt][statType]) {
//             guardian.stats[levelInt][statType] = {};
//           }

//           const orderedStats = {};

//           selectedStats.forEach((statKey) => {
//             if (levelStats[level] && levelStats[level][statKey] !== undefined) {
//               orderedStats[statKey] = levelStats[level][statKey];
//             }
//           });

//           guardian.stats[levelInt][statType] = orderedStats;
//         });

//         document.getElementById("jsonEditor").value = JSON.stringify(
//           jsonData,
//           null,
//           2
//         );

//         if (
//           confirm(
//             "환수 스탯 변경사항을 저장하시겠습니까? (능력치 순서 변경 포함)"
//           )
//         ) {
//           await db.collection("jsonData").doc(selectedDocumentId).set(jsonData);
//           alert("환수 스탯이 성공적으로 업데이트되었습니다!");
//           viewDocument(selectedDocumentId);
//         }
//       }
//     } catch (error) {
//       alert(`저장 오류: ${error.message}`);
//       console.error("환수 스탯 저장 오류:", error);
//     }
//   }

//   function cancelEditing() {
//     document.getElementById("selectedDocument").style.display = "block";
//     document.getElementById("documentToolbar").style.display = "flex";
//     document.getElementById("jsonEditorContainer").style.display = "none";

//     selectedGuardian = null;
//     selectedGuardianIndex = -1;
//     selectedStats = [];
//     currentLevel = 0;
//     levelStats = {};
//   }

//   async function deleteSelectedDocument() {
//     if (!selectedDocumentId) return;

//     const fileName =
//       reverseDocumentMap[selectedDocumentId] || selectedDocumentId;

//     if (
//       confirm(
//         `문서 "${fileName}" (ID: ${selectedDocumentId})을(를) 삭제하시겠습니까?`
//       )
//     ) {
//       try {
//         await db.collection("jsonData").doc(selectedDocumentId).delete();
//         alert(`문서 "${fileName}"이(가) 삭제되었습니다.`);
//         selectedDocumentId = null;

//         refreshDocumentList();
//         document.getElementById("selectedDocument").innerHTML =
//           "<p>문서를 선택해주세요.</p>";
//         document.getElementById("documentToolbar").style.display = "none";
//       } catch (error) {
//         alert(`문서 삭제 오류: ${error.message}`);
//         console.error("문서 삭제 오류:", error);
//       }
//     }
//   }

//   function renderGuardiansList() {
//     const container = document.getElementById("guardiansList");
//     if (!container) return;

//     container.innerHTML = "";

//     try {
//       const jsonData = JSON.parse(document.getElementById("jsonEditor").value);

//       if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
//         jsonData.data.forEach((item, index) => {
//           if (item.name) {
//             const div = document.createElement("div");
//             div.className = "guardian-item";
//             div.setAttribute("data-index", index);
//             div.textContent = `${item.name} ${
//               item.grade ? `[${item.grade}]` : ""
//             } ${item.type ? `(${item.type})` : ""}`;

//             div.addEventListener("click", function () {
//               document.querySelectorAll(".guardian-item").forEach((item) => {
//                 item.classList.remove("active");
//               });

//               this.classList.add("active");

//               loadGuardianData(jsonData.data[index], index);
//             });

//             container.appendChild(div);
//           }
//         });
//       } else {
//         container.innerHTML = "<p>환수 데이터를 찾을 수 없습니다.</p>";
//       }
//     } catch (error) {
//       container.innerHTML = `<p class="error">환수 데이터 로드 오류: ${error.message}</p>`;
//     }
//   }

//   function updateLevelContentForm(level) {
//     const contentDiv = document.getElementById(`level-content-${level}`);
//     if (!contentDiv) return;

//     contentDiv.innerHTML = `<h4>레벨 ${level} 능력치</h4>`;

//     selectedStats.forEach((statKey) => {
//       const koreanName = STATS_MAPPING[statKey] || statKey;
//       const value =
//         levelStats[level] && levelStats[level][statKey]
//           ? levelStats[level][statKey]
//           : "";

//       const inputGroup = document.createElement("div");
//       inputGroup.className = "stat-input-group";
//       inputGroup.setAttribute("draggable", "true");
//       inputGroup.setAttribute("data-stat-key", statKey);

//       inputGroup.innerHTML = `
//         <span class="drag-handle">⋮⋮</span>
//         <label for="stat-${level}-${statKey}">${koreanName}:</label>
//         <input type="text" id="stat-${level}-${statKey}" value="${value}" placeholder="값 입력">
//       `;

//       inputGroup.addEventListener("dragstart", handleInputGroupDragStart);
//       inputGroup.addEventListener("dragover", handleInputGroupDragOver);
//       inputGroup.addEventListener("drop", handleInputGroupDrop);
//       inputGroup.addEventListener("dragend", handleInputGroupDragEnd);

//       contentDiv.appendChild(inputGroup);
//     });
//   }

//   function initStatDropdown() {
//     const dropdown = document.getElementById("statSearchDropdown");
//     if (!dropdown) return;

//     dropdown.innerHTML = '<option value="">-- 추가할 능력치 선택 --</option>';

//     Object.entries(STATS_MAPPING).forEach(([engKey, korName]) => {
//       const option = document.createElement("option");
//       option.value = engKey;
//       option.textContent = `${korName} (${engKey})`;
//       dropdown.appendChild(option);
//     });
//   }

//   function addSelectedStat() {
//     const dropdown = document.getElementById("statSearchDropdown");

//     if (!dropdown || dropdown.value === "") return;

//     const engKey = dropdown.value;

//     if (selectedStats.includes(engKey)) {
//       alert(`이미 추가된 능력치입니다: ${STATS_MAPPING[engKey] || engKey}`);
//       return;
//     }

//     selectedStats.push(engKey);

//     updateSelectedStatsDisplay();

//     updateLevelContentForm(currentLevel);
//   }

//   function removeSelectedStat(engKey) {
//     selectedStats = selectedStats.filter((key) => key !== engKey);

//     updateSelectedStatsDisplay();

//     Object.keys(levelStats).forEach((level) => {
//       if (levelStats[level] && levelStats[level][engKey]) {
//         delete levelStats[level][engKey];
//       }
//     });

//     updateLevelContentForm(currentLevel);
//   }

//   function initLevelTabs() {
//     const tabsContainer = document.querySelector(".level-tabs");
//     const contentContainer = document.querySelector(".level-content-container");

//     if (!tabsContainer || !contentContainer) return;

//     tabsContainer.innerHTML = "";
//     contentContainer.innerHTML = "";

//     for (let i = 0; i <= 25; i++) {
//       const tabButton = document.createElement("div");
//       tabButton.className = `level-tab ${i === 0 ? "active" : ""}`;
//       tabButton.textContent = `레벨 ${i}`;
//       tabButton.onclick = function () {
//         saveCurrentLevelInputs();
//         activateLevel(i);
//       };
//       tabsContainer.appendChild(tabButton);

//       const contentDiv = document.createElement("div");
//       contentDiv.className = `level-content ${i === 0 ? "active" : ""}`;
//       contentDiv.id = `level-content-${i}`;
//       contentContainer.appendChild(contentDiv);
//     }
//   }

//   function saveCurrentLevelInputs() {
//     if (!levelStats[currentLevel]) {
//       levelStats[currentLevel] = {};
//     }

//     selectedStats.forEach((statKey) => {
//       const input = document.getElementById(`stat-${currentLevel}-${statKey}`);
//       if (input && input.value.trim() !== "") {
//         levelStats[currentLevel][statKey] = input.value.trim();
//       }
//     });
//   }

//   function activateLevel(level) {
//     document
//       .querySelectorAll(".level-tab")
//       .forEach((tab) => tab.classList.remove("active"));
//     document
//       .querySelectorAll(".level-content")
//       .forEach((content) => content.classList.remove("active"));

//     const tabs = document.querySelectorAll(".level-tab");
//     if (tabs[level]) {
//       tabs[level].classList.add("active");
//     }

//     const contentDiv = document.getElementById(`level-content-${level}`);
//     if (contentDiv) {
//       contentDiv.classList.add("active");
//     }

//     currentLevel = level;

//     updateLevelContentForm(level);
//   }

//   function goToPreviousLevel() {
//     if (currentLevel > 0) {
//       saveCurrentLevelInputs();
//       activateLevel(currentLevel - 1);
//     }
//   }

//   function goToNextLevel() {
//     if (currentLevel < 25) {
//       saveCurrentLevelInputs();
//       activateLevel(currentLevel + 1);
//     }
//   }

//   function copyPreviousLevelStats() {
//     if (currentLevel > 0) {
//       saveCurrentLevelInputs();

//       const prevLevel = currentLevel - 1;
//       if (levelStats[prevLevel]) {
//         levelStats[currentLevel] = { ...levelStats[prevLevel] };

//         updateLevelContentForm(currentLevel);
//       }
//     }
//   }

//   function parseInput(input) {
//     const result = {
//       parseSteps: [],
//       success: false,
//       guardianName: "",
//       level: null,
//       stats: {},
//       errors: [],
//       statMappingDetails: [],
//     };

//     try {
//       if (!input.trim()) {
//         result.errors.push("입력이 비어있습니다.");
//         return result;
//       }

//       const lines = input
//         .trim()
//         .split(/\n+/)
//         .filter((line) => line.trim() !== "");
//       result.parseSteps.push({
//         step: "입력 분리",
//         value: lines,
//       });

//       if (lines.length < 1) {
//         result.errors.push("입력이 비어있습니다.");
//         return result;
//       }

//       result.guardianName = lines[0].trim();
//       result.parseSteps.push({
//         step: "환수 이름 추출",
//         value: result.guardianName,
//       });

//       if (!result.guardianName) {
//         result.errors.push("환수 이름을 추출할 수 없습니다.");
//         return result;
//       }

//       let levelLine = lines.length > 1 ? lines[1].trim() : "";
//       let statsText = "";
//       let lineIndex = 2;

//       const levelMatch = levelLine.match(/(\d+)\s*레벨/);
//       if (levelMatch) {
//         result.level = parseInt(levelMatch[1]);
//         result.parseSteps.push({
//           step: "레벨 추출",
//           value: result.level,
//         });

//         statsText = levelLine.substring(levelMatch[0].length).trim();

//         if (statsText) {
//           result.parseSteps.push({
//             step: "한 줄 스탯 정보 감지",
//             value: statsText,
//           });

//           parseStatsFromText(statsText, result);
//         }
//       } else {
//         const simpleLevelMatch = levelLine.match(/^(\d+)/);
//         if (simpleLevelMatch) {
//           result.level = parseInt(simpleLevelMatch[1]);
//           result.parseSteps.push({
//             step: "레벨 추출",
//             value: result.level,
//           });

//           statsText = levelLine.substring(simpleLevelMatch[0].length).trim();

//           if (statsText) {
//             result.parseSteps.push({
//               step: "한 줄 스탯 정보 감지",
//               value: statsText,
//             });

//             parseStatsFromText(statsText, result);
//           }
//         } else if (lines.length === 1) {
//           result.level = 0;
//           parseStatsFromText(lines[0], result);
//           lineIndex = 1;
//         }
//       }

//       if (result.level === null) {
//         result.level = 0;
//         result.parseSteps.push({
//           step: "레벨 기본값 설정",
//           value: result.level,
//         });
//       }

//       for (let i = lineIndex; i < lines.length; i++) {
//         parseStatsFromLine(lines[i], result);
//       }

//       result.parseSteps.push({
//         step: "스탯 추출 완료",
//         value: result.stats,
//       });

//       result.success = true;
//       return result;
//     } catch (error) {
//       result.errors.push(`파싱 오류: ${error.message}`);
//       return result;
//     }
//   }

//   function parseStatsFromText(text, result) {
//     const korToEng = {};
//     for (const [engKey, korName] of Object.entries(STATS_MAPPING)) {
//       korToEng[korName] = engKey;
//       korToEng[korName.replace(/\s+/g, "")] = engKey;
//     }

//     const sortedStatNames = Object.keys(korToEng).sort(
//       (a, b) => b.length - a.length
//     );

//     let remainingText = text;
//     let matchFound = true;

//     while (remainingText && matchFound) {
//       matchFound = false;

//       for (const korStatName of sortedStatNames) {
//         const pattern = new RegExp(
//           `${korStatName}\\s*(\\d+(?:,\\d+)?(?:\\.\\d+)?)`,
//           "i"
//         );
//         const match = remainingText.match(pattern);

//         if (match) {
//           const statValue = match[1].replace(/,/g, "");
//           const engKey =
//             korToEng[korStatName] || korToEng[korStatName.replace(/\s+/g, "")];

//           if (engKey) {
//             result.stats[engKey] = statValue;
//             result.statMappingDetails.push({
//               korean: korStatName,
//               english: engKey,
//               value: statValue,
//               method: "텍스트 내 패턴 매칭",
//             });

//             remainingText = remainingText.replace(match[0], "").trim();
//             matchFound = true;
//             break;
//           }
//         }
//       }

//       if (!matchFound && remainingText) {
//         const generalMatch = remainingText.match(
//           /([가-힣%\s]+)(\d+(?:,\d+)?(?:\.\d+)?)/
//         );
//         if (generalMatch) {
//           const korStatName = generalMatch[1].trim();
//           const statValue = generalMatch[2].replace(/,/g, "");

//           let engKey = korToEng[korStatName];
//           let matchMethod = "정확한 매칭";

//           if (!engKey) {
//             const noSpaceName = korStatName.replace(/\s+/g, "");
//             engKey = korToEng[noSpaceName];
//             if (engKey) matchMethod = "공백 제거 후 매칭";
//           }

//           if (!engKey) {
//             for (const [korName, eng] of Object.entries(korToEng)) {
//               if (
//                 korName.includes(korStatName) ||
//                 korStatName.includes(korName)
//               ) {
//                 engKey = eng;
//                 matchMethod = `부분 문자열 매칭: ${korName}`;
//                 break;
//               }

//               const noSpaceName = korStatName.replace(/\s+/g, "");
//               const noSpaceKorName = korName.replace(/\s+/g, "");
//               if (
//                 noSpaceName === noSpaceKorName ||
//                 noSpaceKorName.includes(noSpaceName) ||
//                 noSpaceName.includes(noSpaceKorName)
//               ) {
//                 engKey = eng;
//                 matchMethod = `공백 제거 후 부분 매칭: ${korName}`;
//                 break;
//               }
//             }
//           }

//           if (engKey) {
//             result.stats[engKey] = statValue;
//             result.statMappingDetails.push({
//               korean: korStatName,
//               english: engKey,
//               value: statValue,
//               method: matchMethod,
//             });

//             remainingText = remainingText.replace(generalMatch[0], "").trim();
//             matchFound = true;
//           } else {
//             result.parseSteps.push({
//               step: "매핑 실패",
//               value: `스탯 "${korStatName}" 매핑 실패`,
//             });
//             remainingText = remainingText.replace(generalMatch[0], "").trim();
//             matchFound = true;
//           }
//         }
//       }
//     }
//   }

//   function parseStatsFromLine(line, result) {
//     const match = line.match(/^(.*?)(\d+(?:,\d+)?(?:\.\d+)?)$/);
//     if (!match) return;

//     const korStatName = match[1].trim();
//     const statValue = match[2].replace(/,/g, "");

//     let engKey = null;
//     let matchMethod = null;

//     for (const [eng, kor] of Object.entries(STATS_MAPPING)) {
//       if (kor === korStatName) {
//         engKey = eng;
//         matchMethod = "정확한 매칭";
//         break;
//       }

//       if (kor.replace(/\s+/g, "") === korStatName.replace(/\s+/g, "")) {
//         engKey = eng;
//         matchMethod = "공백 제거 후 매칭";
//         break;
//       }

//       if (kor.includes(korStatName) || korStatName.includes(kor)) {
//         engKey = eng;
//         matchMethod = `부분 문자열 매칭: ${kor}`;
//         break;
//       }

//       const noSpaceName = korStatName.replace(/\s+/g, "");
//       const noSpaceKor = kor.replace(/\s+/g, "");
//       if (
//         noSpaceName === noSpaceKor ||
//         noSpaceKor.includes(noSpaceName) ||
//         noSpaceName.includes(noSpaceKor)
//       ) {
//         engKey = eng;
//         matchMethod = `공백 제거 후 부분 매칭: ${kor}`;
//         break;
//       }
//     }

//     if (engKey) {
//       result.stats[engKey] = statValue;
//       result.statMappingDetails.push({
//         korean: korStatName,
//         english: engKey,
//         value: statValue,
//         method: matchMethod,
//       });
//     } else {
//       result.parseSteps.push({
//         step: "매핑 실패",
//         value: `스탯 "${korStatName}" 매핑 실패`,
//       });
//     }
//   }

//   function parseStatsSeriesInput(input) {
//     const result = {
//       success: false,
//       guardianName: "",
//       statSeries: {},
//       errors: [],
//     };

//     try {
//       const lines = input
//         .split("\n")
//         .map((line) => line.trim())
//         .filter((line) => line);
//       if (lines.length === 0) {
//         result.errors.push("입력이 비어있습니다.");
//         return result;
//       }

//       const firstLineParts = lines[0].split("\t");
//       result.guardianName = firstLineParts[0].trim();

//       let lastStatName = null;

//       for (let i = 0; i < lines.length; i++) {
//         const line = lines[i];
//         const parts = line.split("\t");

//         const startIdx = i === 0 ? 1 : 0;

//         for (let j = startIdx; j < parts.length; j++) {
//           const part = parts[j].replace(/"/g, "").trim();
//           if (!part) continue;

//           if (part.match(/^\d+(?:,\d+)*,?$/)) {
//             if (lastStatName) {
//               const values = part
//                 .split(",")
//                 .map((v) => v.trim())
//                 .filter((v) => v !== "");

//               const normalizedStatName = lastStatName.replace(/\s+/g, "");
//               let foundKey = null;

//               for (const [engKey, korName] of Object.entries(STATS_MAPPING)) {
//                 if (korName.replace(/\s+/g, "") === normalizedStatName) {
//                   foundKey = engKey;
//                   break;
//                 }
//               }

//               if (foundKey) {
//                 result.statSeries[foundKey] = values;
//                 console.log(
//                   `Mapped '${lastStatName}' to '${foundKey}' with ${values.length} values`
//                 );
//               } else {
//                 console.warn(
//                   `Could not find mapping for stat: '${lastStatName}'`
//                 );
//               }

//               lastStatName = null;
//             }
//           } else {
//             lastStatName = part;
//           }
//         }
//       }

//       if (Object.keys(result.statSeries).length === 0) {
//         result.errors.push("스탯 정보를 추출할 수 없습니다.");
//         return result;
//       }

//       result.success = true;
//       return result;
//     } catch (error) {
//       result.errors.push(`파싱 오류: ${error.message}`);
//       console.error("Parsing error:", error);
//       return result;
//     }
//   }

//   function previewStatsSeries() {
//     const input = document.getElementById("statInput").value.trim();
//     const previewDiv = document.getElementById("parsingPreview");
//     const statusDiv = document.getElementById("statUpdateStatus");
//     const docFileName = document.getElementById("documentSelect").value;

//     statusDiv.style.display = "none";

//     if (!input) {
//       previewDiv.innerHTML = '<p class="error">입력이 비어있습니다.</p>';
//       previewDiv.style.display = "block";
//       return;
//     }

//     const result = parseStatsSeriesInput(input);
//     let html = "<h3>레벨별 스탯 파싱 결과</h3>";

//     html += `
//       <details style="margin-bottom: 15px;">
//         <summary style="cursor: pointer; padding: 8px; background-color: #f2f2f2; border-radius: 4px;">디버그 정보 보기</summary>
//         <div style="padding: 10px; border: 1px solid #ddd; border-radius: 0 0 4px 4px; margin-top: 5px; background-color: #f9f9f9;">
//           <h4>파싱 단계:</h4>
//           <ul>
//             ${
//               result.debug
//                 ? result.debug.map((d) => `<li>${d}</li>`).join("")
//                 : ""
//             }
//           </ul>
//         </div>
//       </details>
//     `;

//     if (result.success) {
//       html += `
//           <div class="parsing-step">
//             <div class="key-value">
//               <div class="key">환수 이름:</div>
//               <div class="value">${result.guardianName}</div>
//             </div>
//             <div class="key-value">
//               <div class="key">스탯 개수:</div>
//               <div class="value">${Object.keys(result.statSeries).length}</div>
//             </div>
//           </div>
//         `;

//       const isBindStat = docFileName.includes("-bind-");
//       const statKey = isBindStat ? "bindStat" : "registrationStat";

//       const statsObject = {};
//       const maxLevel = Math.max(
//         ...Object.values(result.statSeries).map((arr) => arr.length - 1)
//       );

//       for (let level = 0; level <= maxLevel; level++) {
//         const statsForLevel = {};
//         let hasStatsForLevel = false;

//         for (const [statKey, values] of Object.entries(result.statSeries)) {
//           if (level < values.length && values[level] !== "") {
//             statsForLevel[statKey] = values[level];
//             hasStatsForLevel = true;
//           }
//         }

//         if (hasStatsForLevel) {
//           statsObject[level] = statsForLevel;
//         }
//       }

//       const jsonObj = {};
//       jsonObj[statKey] = statsObject;
//       jsonObj["name"] = result.guardianName;

//       const jsonStr = JSON.stringify(jsonObj, null, 2).replace(/'/g, "\\'");
//       html += `
//           <div class="parsing-step" style="background-color: #f0f8ff; border: 1px solid #4285f4; margin-bottom: 15px;">
//             <h4 style="margin-top: 0; color: #4285f4;">
//               JSON 형식 미리보기 (${statKey})
//               <button onclick="FirestoreManager.copyToClipboard('${jsonStr.replace(
//                 /"/g,
//                 '\\"'
//               )}');" style="margin-left: 10px; padding: 3px 8px; font-size: 0.8em;">클립보드에 복사</button>
//             </h4>
//             <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px;">${jsonStr}</pre>
//           </div>
//         `;

//       html += `<div class="parsing-step" style="background-color: #f0f8ff; border: 1px solid #4285f4;">
//           <h4 style="margin-top: 0; color: #4285f4;">파싱된 레벨별 스탯 정보</h4>
//           <div style="max-height: 400px; overflow-y: auto;">
//         `;

//       for (const [statKey, values] of Object.entries(result.statSeries)) {
//         const koreanName = STATS_MAPPING[statKey] || statKey;

//         html += `<div style="margin-bottom: 15px;">
//             <h5>${koreanName} (${statKey})</h5>
//             <table style="width: 100%; border-collapse: collapse;">
//               <tr style="background-color: #e6f2ff;">
//                 <th style="padding: 5px; border: 1px solid #b8daff;">레벨</th>
//                 <th style="padding: 5px; border: 1px solid #b8daff;">값</th>
//               </tr>
//           `;

//         values.forEach((value, index) => {
//           html += `
//               <tr>
//                 <td style="padding: 5px; border: 1px solid #b8daff; text-align: center;">${index}</td>
//                 <td style="padding: 5px; border: 1px solid #b8daff; text-align: center;">${
//                   value || "-"
//                 }</td>
//               </tr>
//             `;
//         });

//         html += `</table></div>`;
//       }

//       html += `</div></div>`;

//       html += `
//           <div class="success" style="margin-top: 15px; padding: 10px;">
//             <strong>파싱 성공!</strong><br>
//             환수 이름: ${result.guardianName}<br>
//             스탯 종류: ${Object.keys(result.statSeries).length}개<br>
//             레벨 범위: 0-${maxLevel}<br>
//             스탯 타입: ${statKey}
//           </div>
//         `;
//     } else {
//       html += `<div class="error" style="margin-top: 15px; padding: 10px;">
//           <strong>오류:</strong><br>
//           ${result.errors.map((err) => `- ${err}`).join("<br>")}
//         </div>`;
//     }

//     previewDiv.innerHTML = html;
//     previewDiv.style.display = "block";
//   }

//   async function updateStatsSeries() {
//     const input = document.getElementById("statInput").value.trim();
//     const docFileName = document.getElementById("documentSelect").value;
//     const statusDiv = document.getElementById("statUpdateStatus");
//     const resultsDiv = document.getElementById("updateResults");
//     const previewDiv = document.getElementById("parsingPreview");

//     previewDiv.style.display = "none";
//     statusDiv.style.display = "block";
//     statusDiv.className = "info";
//     statusDiv.textContent = "레벨별 스탯 정보 처리 중...";
//     resultsDiv.innerHTML = "";

//     if (!input) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "스탯 정보를 입력해주세요.";
//       return;
//     }

//     if (!docFileName) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "대상 문서를 선택해주세요.";
//       return;
//     }

//     const docId = DOCUMENT_MAP[docFileName];
//     if (!docId) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "유효하지 않은 문서입니다.";
//       return;
//     }

//     try {
//       console.log("Input data:", input);
//       const parsedResult = parseStatsSeriesInput(input);
//       console.log("Parsed result:", parsedResult);

//       if (!parsedResult.success) {
//         statusDiv.className = "error";
//         statusDiv.textContent =
//           "입력 파싱에 실패했습니다: " + parsedResult.errors.join(", ");
//         return;
//       }

//       const { guardianName, statSeries } = parsedResult;

//       const docRef = db.collection("jsonData").doc(docId);
//       const docSnapshot = await docRef.get();

//       if (!docSnapshot.exists) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName} (ID: ${docId})`;
//         return;
//       }

//       const data = docSnapshot.data();
//       if (!data.data || !Array.isArray(data.data)) {
//         statusDiv.className = "error";
//         statusDiv.textContent = "문서 형식이 올바르지 않습니다.";
//         return;
//       }

//       console.log(
//         `문서 ${docFileName} (ID: ${docId})에서 환수 "${guardianName}" 찾는 중...`
//       );
//       console.log(
//         `문서에 있는 환수 목록:`,
//         data.data.map((g) => g.name)
//       );

//       let foundGuardian = null;
//       let guardianIndex = -1;

//       for (let i = 0; i < data.data.length; i++) {
//         if (data.data[i].name === guardianName) {
//           foundGuardian = data.data[i];
//           guardianIndex = i;
//           console.log(
//             `환수를 찾았습니다! 인덱스: ${i}, 이름: ${data.data[i].name}`
//           );
//           break;
//         } else {
//           console.log(
//             `환수 이름 불일치: "${data.data[i].name}" !== "${guardianName}"`
//           );
//         }
//       }

//       if (guardianIndex === -1) {
//         statusDiv.className = "error";
//         let errorMsg = `문서 "${docFileName}" (ID: ${docId})에서 환수 "${guardianName}"를 찾을 수 없습니다.`;

//         errorMsg += "<br><br><strong>현재 문서에 있는 환수 목록:</strong><br>";
//         errorMsg +=
//           '<div style="max-height: 200px; overflow-y: auto; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">';
//         if (data.data.length > 0) {
//           errorMsg += '<ul style="padding-left: 20px;">';
//           data.data.forEach((guardian) => {
//             errorMsg += `<li>${guardian.name}</li>`;
//           });
//           errorMsg += "</ul>";
//         } else {
//           errorMsg += "<p>문서에 환수 데이터가 없습니다.</p>";
//         }
//         errorMsg += "</div>";

//         errorMsg += "<p>정확한 이름으로 다시 시도해주세요.</p>";

//         statusDiv.innerHTML = errorMsg;
//         return;
//       }

//       previousGuardianData = JSON.parse(JSON.stringify(foundGuardian));
//       const statType = docFileName.includes("-bind-")
//         ? "bindStat"
//         : "registrationStat";

//       const existingLevels = [];
//       const maxLevel = Math.max(
//         ...Object.values(statSeries).map((values) => values.length - 1)
//       );

//       for (let level = 0; level <= maxLevel; level++) {
//         let hasDataForLevel = false;
//         for (const [statKey, values] of Object.entries(statSeries)) {
//           if (level < values.length && values[level] && values[level] !== "") {
//             hasDataForLevel = true;
//             break;
//           }
//         }

//         if (
//           hasDataForLevel &&
//           foundGuardian.stats &&
//           foundGuardian.stats[level] &&
//           foundGuardian.stats[level][statType] &&
//           Object.keys(foundGuardian.stats[level][statType]).length > 0
//         ) {
//           existingLevels.push(level);
//         }
//       }

//       resultsDiv.innerHTML = `
//         <div class="doc-info" style="margin-bottom: 15px; padding: 10px; background-color: #f0f8ff; border-left: 4px solid #1e88e5; border-radius: 4px;">
//           <h4 style="margin-top: 0;">현재 작업 정보</h4>
//           <p><strong>문서:</strong> ${docFileName} (ID: ${docId})</p>
//           <p><strong>환수:</strong> ${foundGuardian.name} (${
//         foundGuardian.grade || ""
//       } ${foundGuardian.type || ""})</p>
//           <p><strong>스탯 타입:</strong> ${
//             statType === "bindStat" ? "장착 스탯" : "등록 스탯"
//           }</p>
//           <p><strong>업데이트할 레벨:</strong> 0 ~ ${maxLevel}</p>
//           ${
//             existingLevels.length > 0
//               ? `<p><strong>기존 데이터가 있는 레벨:</strong> ${existingLevels.join(
//                   ", "
//                 )}</p>`
//               : ""
//           }
//         </div>
//       `;

//       if (existingLevels.length > 0) {
//         const modalHTML = `
//           <div id="updateConfirmModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
//               background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: center; align-items: center;">
//             <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow-y: auto;">
//               <h3>기존 데이터가 있는 레벨이 발견되었습니다</h3>
//               <p>환수 <strong>${
//                 foundGuardian.name
//               }</strong>의 다음 레벨에 이미 스탯 정보가 있습니다:</p>
//               <div style="max-height: 200px; overflow-y: auto; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
//                 ${existingLevels
//                   .map((level) => {
//                     const levelStats = foundGuardian.stats[level][statType];
//                     return `
//                     <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
//                       <strong>레벨 ${level}:</strong>
//                       ${Object.entries(levelStats)
//                         .map(
//                           ([key, value]) =>
//                             `${STATS_MAPPING[key] || key}: ${value}`
//                         )
//                         .join(", ")}
//                     </div>
//                   `;
//                   })
//                   .join("")}
//               </div>
//               <p>어떻게 진행하시겠습니까?</p>
//               <div style="display: flex; justify-content: space-between; margin-top: 15px;">
//                 <button id="overwriteAll" style="padding: 8px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
//                   모두 덮어쓰기
//                 </button>
//                 <button id="skipExisting" style="padding: 8px 12px; background-color: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
//                   기존 데이터 유지 (충돌하는 레벨 건너뛰기)
//                 </button>
//                 <button id="mergeData" style="padding: 8px 12px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
//                   데이터 병합 (기존 + 신규)
//                 </button>
//                 <button id="cancelUpdate" style="padding: 8px 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
//                   취소
//                 </button>
//               </div>
//             </div>
//           </div>
//         `;

//         document.body.insertAdjacentHTML("beforeend", modalHTML);

//         const userChoice = await new Promise((resolve) => {
//           document
//             .getElementById("overwriteAll")
//             .addEventListener("click", () => {
//               document.getElementById("updateConfirmModal").remove();
//               resolve("overwrite");
//             });

//           document
//             .getElementById("skipExisting")
//             .addEventListener("click", () => {
//               document.getElementById("updateConfirmModal").remove();
//               resolve("skip");
//             });

//           document.getElementById("mergeData").addEventListener("click", () => {
//             document.getElementById("updateConfirmModal").remove();
//             resolve("merge");
//           });

//           document
//             .getElementById("cancelUpdate")
//             .addEventListener("click", () => {
//               document.getElementById("updateConfirmModal").remove();
//               resolve("cancel");
//             });
//         });

//         if (userChoice === "cancel") {
//           statusDiv.className = "info";
//           statusDiv.textContent = "업데이트가 취소되었습니다.";
//           return;
//         }

//         await updateGuardianStats(
//           docRef,
//           data,
//           guardianIndex,
//           foundGuardian.name,
//           statSeries,
//           statType,
//           userChoice,
//           existingLevels
//         );
//       } else {
//         await updateGuardianStats(
//           docRef,
//           data,
//           guardianIndex,
//           foundGuardian.name,
//           statSeries,
//           statType,
//           "overwrite",
//           []
//         );
//       }
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("레벨별 스탯 업데이트 오류:", error);
//     }
//   }

//   async function updateGuardianStats(
//     docRef,
//     data,
//     guardianIndex,
//     guardianName,
//     statSeries,
//     statType,
//     updateMode,
//     existingLevels
//   ) {
//     const statusDiv = document.getElementById("statUpdateStatus");
//     const resultsDiv = document.getElementById("updateResults");

//     try {
//       const updatedData = JSON.parse(JSON.stringify(data));
//       const changes = { added: {}, modified: {}, removed: {}, skipped: {} };

//       const maxLevel = Math.max(
//         ...Object.values(statSeries).map((values) => values.length - 1)
//       );

//       if (!updatedData.data[guardianIndex].stats) {
//         updatedData.data[guardianIndex].stats = [];
//       }

//       while (updatedData.data[guardianIndex].stats.length <= maxLevel) {
//         const level = updatedData.data[guardianIndex].stats.length;
//         updatedData.data[guardianIndex].stats.push({
//           level: level,
//           [statType]: {},
//         });
//       }

//       for (let level = 0; level <= maxLevel; level++) {
//         if (updateMode === "skip" && existingLevels.includes(level)) {
//           changes.skipped[level] = {
//             ...updatedData.data[guardianIndex].stats[level][statType],
//           };
//           continue;
//         }

//         if (!updatedData.data[guardianIndex].stats[level][statType]) {
//           updatedData.data[guardianIndex].stats[level][statType] = {};
//         }

//         if (updateMode !== "merge") {
//           const existingStats = {
//             ...updatedData.data[guardianIndex].stats[level][statType],
//           };
//           if (Object.keys(existingStats).length > 0) {
//             for (const key in existingStats) {
//               if (!changes.removed[level]) changes.removed[level] = {};
//               changes.removed[level][key] = existingStats[key];
//             }
//           }

//           updatedData.data[guardianIndex].stats[level][statType] = {};
//         }

//         let hasDataForLevel = false;
//         for (const [statKey, values] of Object.entries(statSeries)) {
//           if (level < values.length && values[level] && values[level] !== "") {
//             const oldValue =
//               updatedData.data[guardianIndex].stats[level][statType][statKey];

//             if (!oldValue) {
//               if (!changes.added[level]) changes.added[level] = {};
//               changes.added[level][statKey] = values[level];
//             } else if (oldValue !== values[level]) {
//               if (!changes.modified[level]) changes.modified[level] = {};
//               changes.modified[level][statKey] = {
//                 from: oldValue,
//                 to: values[level],
//               };
//             }

//             updatedData.data[guardianIndex].stats[level][statType][statKey] =
//               values[level];
//             hasDataForLevel = true;
//           }
//         }
//       }

//       await docRef.set(updatedData);
//       updatedGuardianData = updatedData.data[guardianIndex];

//       statusDiv.className = "success";
//       if (updateMode === "overwrite") {
//         statusDiv.textContent = `환수 "${guardianName}"의 모든 레벨별 스탯이 덮어쓰기 되었습니다.`;
//       } else if (updateMode === "skip") {
//         statusDiv.textContent = `환수 "${guardianName}"의 스탯이 업데이트되었습니다. (${existingLevels.length}개 레벨은 건너뛰었습니다)`;
//       } else {
//         statusDiv.textContent = `환수 "${guardianName}"의 레벨별 스탯이 병합되었습니다.`;
//       }

//       displayDiff(changes, guardianName, statType, updateMode, existingLevels);
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `스탯 업데이트 오류: ${error.message}`;
//       throw error;
//     }
//   }

//   function displayDiff(
//     changes,
//     guardianName,
//     statType,
//     updateMode,
//     existingLevels
//   ) {
//     const resultsDiv = document.getElementById("updateResults");

//     let html = `
//       <div class="diff-container" style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
//         <h4>변경 내역: ${guardianName} (${
//       statType === "bindStat" ? "장착 스탯" : "등록 스탯"
//     })</h4>
//         <button onclick="FirestoreManager.revertChanges()" class="warning" style="margin-bottom: 10px;">변경 사항 되돌리기</button>

//         <div class="update-mode-info" style="margin: 10px 0; padding: 8px; background-color: #f8f9fa; border-left: 4px solid #6c757d;">
//           <strong>업데이트 모드:</strong> ${
//             updateMode === "overwrite"
//               ? "모두 덮어쓰기"
//               : updateMode === "skip"
//               ? "기존 데이터 유지 (충돌하는 레벨 건너뛰기)"
//               : "데이터 병합 (기존 + 신규)"
//           }
//           ${
//             existingLevels.length > 0
//               ? `<br><strong>충돌 레벨:</strong> ${existingLevels.join(", ")}`
//               : ""
//           }
//         </div>
//     `;

//     if (Object.keys(changes.skipped).length > 0) {
//       html += `<div class="skipped-stats" style="margin-top: 15px;">
//         <h5 style="color: #6c757d;">건너뛴 레벨 (기존 데이터 유지)</h5>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr style="background-color: #f8f9fa;">
//             <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">레벨</th>
//             <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">스탯</th>
//           </tr>`;

//       for (const [level, stats] of Object.entries(changes.skipped)) {
//         html += `
//           <tr>
//             <td style="padding: 8px; border: 1px solid #dee2e6; vertical-align: top;">${level}</td>
//             <td style="padding: 8px; border: 1px solid #dee2e6;">
//               ${Object.entries(stats)
//                 .map(([statKey, value]) => {
//                   const koreanName = STATS_MAPPING[statKey] || statKey;
//                   return `<div>${koreanName} (${statKey}): ${value}</div>`;
//                 })
//                 .join("")}
//             </td>
//           </tr>
//         `;
//       }

//       html += `</table></div>`;
//     }

//     if (Object.keys(changes.added).length > 0) {
//       html += `<div class="added-stats" style="margin-top: 15px;">
//         <h5 style="color: #28a745;">추가된 스탯</h5>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr style="background-color: #e8f5e9;">
//             <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">레벨</th>
//             <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">스탯</th>
//             <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">값</th>
//           </tr>`;

//       for (const [level, stats] of Object.entries(changes.added)) {
//         for (const [statKey, value] of Object.entries(stats)) {
//           const koreanName = STATS_MAPPING[statKey] || statKey;
//           html += `
//             <tr>
//               <td style="padding: 8px; border: 1px solid #c8e6c9;">${level}</td>
//               <td style="padding: 8px; border: 1px solid #c8e6c9;">${koreanName} (${statKey})</td>
//               <td style="padding: 8px; border: 1px solid #c8e6c9; background-color: #e8f5e9;">${value}</td>
//             </tr>
//           `;
//         }
//       }

//       html += `</table></div>`;
//     }

//     if (Object.keys(changes.modified).length > 0) {
//       html += `<div class="modified-stats" style="margin-top: 15px;">
//         <h5 style="color: #007bff;">수정된 스탯</h5>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr style="background-color: #e3f2fd;">
//             <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">레벨</th>
//             <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">스탯</th>
//             <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">이전 값</th>
//             <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">새 값</th>
//           </tr>`;

//       for (const [level, stats] of Object.entries(changes.modified)) {
//         for (const [statKey, change] of Object.entries(stats)) {
//           const koreanName = STATS_MAPPING[statKey] || statKey;
//           html += `
//             <tr>
//               <td style="padding: 8px; border: 1px solid #bbdefb;">${level}</td>
//               <td style="padding: 8px; border: 1px solid #bbdefb;">${koreanName} (${statKey})</td>
//               <td style="padding: 8px; border: 1px solid #bbdefb; text-decoration: line-through;">${change.from}</td>
//               <td style="padding: 8px; border: 1px solid #bbdefb; background-color: #e3f2fd;">${change.to}</td>
//             </tr>
//           `;
//         }
//       }

//       html += `</table></div>`;
//     }

//     if (Object.keys(changes.removed).length > 0) {
//       html += `<div class="removed-stats" style="margin-top: 15px;">
//         <h5 style="color: #dc3545;">제거된 스탯</h5>
//         <table style="width: 100%; border-collapse: collapse;">
//           <tr style="background-color: #f8d7da;">
//             <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">레벨</th>
//             <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">스탯</th>
//             <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">값</th>
//           </tr>`;

//       for (const [level, stats] of Object.entries(changes.removed)) {
//         for (const [statKey, value] of Object.entries(stats)) {
//           const koreanName = STATS_MAPPING[statKey] || statKey;
//           html += `
//             <tr>
//               <td style="padding: 8px; border: 1px solid #f5c6cb;">${level}</td>
//               <td style="padding: 8px; border: 1px solid #f5c6cb;">${koreanName} (${statKey})</td>
//               <td style="padding: 8px; border: 1px solid #f5c6cb; text-decoration: line-through;">${value}</td>
//             </tr>
//           `;
//         }
//       }

//       html += `</table></div>`;
//     }

//     if (
//       Object.keys(changes.added).length === 0 &&
//       Object.keys(changes.modified).length === 0 &&
//       Object.keys(changes.removed).length === 0 &&
//       Object.keys(changes.skipped).length === 0
//     ) {
//       html += `
//         <div class="info" style="padding: 10px; background-color: #e2f3f8;">
//           <p>변경된 사항이 없습니다.</p>
//         </div>
//       `;
//     }

//     html += `</div>`;
//     resultsDiv.innerHTML = html;
//   }

//   function displaySingleLevelDiff(changes, guardianName, level, statType) {
//     const resultsDiv = document.getElementById("updateResults");

//     let html = `
//         <div class="diff-container" style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
//           <h4>변경 내역: ${guardianName} (${level}레벨 ${statType})</h4>
//           <button onclick="FirestoreManager.revertChanges()" class="warning" style="margin-bottom: 10px;">변경 사항 되돌리기</button>
//       `;

//     if (Object.keys(changes.added).length > 0) {
//       html += `<div class="added-stats" style="margin-top: 15px;">
//           <h5 style="color: #28a745;">추가된 스탯</h5>
//           <table style="width: 100%; border-collapse: collapse;">
//             <tr style="background-color: #e8f5e9;">
//               <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">스탯</th>
//               <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">값</th>
//             </tr>`;

//       for (const [statKey, value] of Object.entries(changes.added)) {
//         const koreanName = STATS_MAPPING[statKey] || statKey;
//         html += `
//             <tr>
//               <td style="padding: 8px; border: 1px solid #c8e6c9;">${koreanName} (${statKey})</td>
//               <td style="padding: 8px; border: 1px solid #c8e6c9; background-color: #e8f5e9;">${value}</td>
//             </tr>
//           `;
//       }

//       html += `</table></div>`;
//     }

//     if (Object.keys(changes.modified).length > 0) {
//       html += `<div class="modified-stats" style="margin-top: 15px;">
//           <h5 style="color: #007bff;">수정된 스탯</h5>
//           <table style="width: 100%; border-collapse: collapse;">
//             <tr style="background-color: #e3f2fd;">
//               <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">스탯</th>
//               <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">이전 값</th>
//               <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">새 값</th>
//             </tr>`;

//       for (const [statKey, change] of Object.entries(changes.modified)) {
//         const koreanName = STATS_MAPPING[statKey] || statKey;
//         html += `
//             <tr>
//               <td style="padding: 8px; border: 1px solid #bbdefb;">${koreanName} (${statKey})</td>
//               <td style="padding: 8px; border: 1px solid #bbdefb; text-decoration: line-through;">${change.from}</td>
//               <td style="padding: 8px; border: 1px solid #bbdefb; background-color: #e3f2fd;">${change.to}</td>
//             </tr>
//           `;
//       }

//       html += `</table></div>`;
//     }

//     if (Object.keys(changes.removed).length > 0) {
//       html += `<div class="removed-stats" style="margin-top: 15px;">
//           <h5 style="color: #dc3545;">제거된 스탯</h5>
//           <table style="width: 100%; border-collapse: collapse;">
//             <tr style="background-color: #f8d7da;">
//               <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">스탯</th>
//               <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">값</th>
//             </tr>`;

//       for (const [statKey, value] of Object.entries(changes.removed)) {
//         const koreanName = STATS_MAPPING[statKey] || statKey;
//         html += `
//             <tr>
//               <td style="padding: 8px; border: 1px solid #f5c6cb;">${koreanName} (${statKey})</td>
//               <td style="padding: 8px; border: 1px solid #f5c6cb; text-decoration: line-through;">${value}</td>
//             </tr>
//           `;
//       }

//       html += `</table></div>`;
//     }

//     if (
//       Object.keys(changes.added).length === 0 &&
//       Object.keys(changes.modified).length === 0 &&
//       Object.keys(changes.removed).length === 0
//     ) {
//       html += `
//           <div class="info" style="padding: 10px; background-color: #e2f3f8;">
//             <p>변경된 사항이 없습니다.</p>
//           </div>
//         `;
//     }

//     html += `</div>`;
//     resultsDiv.innerHTML = html;
//   }

//   async function revertChanges() {
//     if (!previousGuardianData) {
//       alert("되돌릴 변경 사항이 없습니다.");
//       return;
//     }

//     try {
//       const docFileName = document.getElementById("documentSelect").value;
//       const docId = DOCUMENT_MAP[docFileName];
//       const statusDiv = document.getElementById("statUpdateStatus");

//       statusDiv.className = "info";
//       statusDiv.textContent = "변경 사항을 되돌리는 중...";

//       const docRef = db.collection("jsonData").doc(docId);
//       const docSnapshot = await docRef.get();

//       if (!docSnapshot.exists) {
//         statusDiv.className = "error";
//         statusDiv.textContent = "문서를 찾을 수 없습니다.";
//         return;
//       }

//       const data = docSnapshot.data();
//       const guardianName = previousGuardianData.name;

//       let guardianIndex = -1;
//       for (let i = 0; i < data.data.length; i++) {
//         if (data.data[i].name === guardianName) {
//           guardianIndex = i;
//           break;
//         }
//       }

//       if (guardianIndex === -1) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `환수 "${guardianName}"를 찾을 수 없습니다.`;
//         return;
//       }

//       const updatedData = JSON.parse(JSON.stringify(data));
//       updatedData.data[guardianIndex] = previousGuardianData;

//       await docRef.set(updatedData);

//       statusDiv.className = "success";
//       statusDiv.textContent = `환수 "${guardianName}"의 변경 사항이 성공적으로 되돌려졌습니다.`;

//       document.getElementById("updateResults").innerHTML = `
//           <div class="success" style="padding: 10px;">
//             <h4>변경 사항 되돌리기 성공</h4>
//             <p>환수 "${guardianName}"의 데이터가 업데이트 이전 상태로 복원되었습니다.</p>
//           </div>
//         `;

//       previousGuardianData = null;
//       updatedGuardianData = null;
//     } catch (error) {
//       const statusDiv = document.getElementById("statUpdateStatus");
//       statusDiv.className = "error";
//       statusDiv.textContent = `되돌리기 오류: ${error.message}`;
//       console.error("되돌리기 오류:", error);
//     }
//   }

//   function previewParsing() {
//     const input = document.getElementById("statInput").value.trim();
//     const previewDiv = document.getElementById("parsingPreview");
//     const statusDiv = document.getElementById("statUpdateStatus");

//     statusDiv.style.display = "none";

//     if (!input) {
//       previewDiv.innerHTML = '<p class="error">입력이 비어있습니다.</p>';
//       previewDiv.style.display = "block";
//       return;
//     }

//     const result = parseInput(input);
//     let html = "<h3>파싱 결과</h3>";

//     html += `<div class="parsing-step">
//         <div class="key-value">
//           <div class="key">환수 이름:</div>
//           <div class="value">${result.guardianName || "추출 실패"}</div>
//         </div>
//         <div class="key-value">
//           <div class="key">레벨:</div>
//           <div class="value">${result.level || "추출 실패"}</div>
//         </div>
//       </div>`;

//     html += `<div class="parsing-step" style="background-color: #f0f8ff; border: 1px solid #4285f4;">
//         <h4 style="margin-top: 0; color: #4285f4;">영어로 변환된 스탯 정보</h4>`;

//     if (Object.keys(result.stats).length > 0) {
//       html += `<table style="width:100%; border-collapse: collapse; margin-top: 10px;">
//           <tr style="background-color: #e6f2ff;">
//             <th style="padding: 8px; border: 1px solid #b8daff; text-align: left; width: 35%;">영어 키</th>
//             <th style="padding: 8px; border: 1px solid #b8daff; text-align: left; width: 15%;">값</th>
//             <th style="padding: 8px; border: 1px solid #b8daff; text-align: left; width: 50%;">한글 이름</th>
//           </tr>`;

//       for (const [engKey, value] of Object.entries(result.stats)) {
//         html += `<tr>
//             <td style="padding: 8px; border: 1px solid #b8daff; font-family: monospace;">${engKey}</td>
//             <td style="padding: 8px; border: 1px solid #b8daff; font-weight: bold;">${value}</td>
//             <td style="padding: 8px; border: 1px solid #b8daff;">${
//               STATS_MAPPING[engKey] || "매핑 없음"
//             }</td>
//           </tr>`;
//       }

//       html += `</table>`;

//       const jsonStr = JSON.stringify(result.stats).replace(/'/g, "\\'");
//       html += `<div style="margin-top: 15px;">
//           <h4 style="margin-top: 0; color: #4285f4;">
//             JSON 형식
//             <button onclick="FirestoreManager.copyToClipboard('${jsonStr}');" style="margin-left: 10px; padding: 3px 8px; font-size: 0.8em;">클립보드에 복사</button>
//           </h4>
//           <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(
//             result.stats,
//             null,
//             2
//           )}</pre>
//         </div>`;
//     } else {
//       html += `<p>스탯 정보를 추출하지 못했습니다.</p>`;
//     }
//     html += `</div>`;

//     if (result.statMappingDetails && result.statMappingDetails.length > 0) {
//       html += `<div class="parsing-step">
//           <h4 style="margin-top: 0;">스탯 매핑 세부 정보</h4>
//           <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
//             <tr style="background-color: #f2f2f2;">
//               <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">입력된 한글</th>
//               <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">영어 키</th>
//               <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">값</th>
//               <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">매칭 방법</th>
//             </tr>`;

//       for (const detail of result.statMappingDetails) {
//         html += `<tr>
//             <td style="padding: 8px; border: 1px solid #ddd;">${detail.korean}</td>
//             <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${detail.english}</td>
//             <td style="padding: 8px; border: 1px solid #ddd;">${detail.value}</td>
//             <td style="padding: 8px; border: 1px solid #ddd;">${detail.method}</td>
//           </tr>`;
//       }

//       html += `</table></div>`;
//     }

//     html += `<details style="margin-top: 15px;">
//         <summary style="cursor: pointer; padding: 8px; background-color: #f2f2f2; border-radius: 4px;">원본 파싱 단계 보기</summary>
//         <div style="padding: 10px; border: 1px solid #ddd; border-radius: 0 0 4px 4px; margin-top: 5px;">`;

//     for (const step of result.parseSteps) {
//       html += `<div class="parsing-step">
//           <div class="key-value">
//             <div class="key">단계:</div>
//             <div class="value">${step.step}</div>
//           </div>`;

//       if (step.step === "입력 분리") {
//         html += `<div class="key-value">
//             <div class="key">분리된 줄:</div>
//             <div class="value">${step.value
//               .map((l) => `"${l}"`)
//               .join("<br>")}</div>
//           </div>`;
//       } else {
//         html += `<div class="key-value">
//             <div class="key">결과:</div>
//             <div class="value">${
//               typeof step.value === "object"
//                 ? JSON.stringify(step.value)
//                 : step.value
//             }</div>
//           </div>`;
//       }

//       html += `</div>`;
//     }

//     html += `</div></details>`;

//     if (result.errors.length) {
//       html += `<div class="error" style="margin-top: 15px; padding: 10px;">
//           <strong>오류:</strong><br>
//           ${result.errors.map((err) => `- ${err}`).join("<br>")}
//         </div>`;
//     } else {
//       html += `<div class="success" style="margin-top: 15px; padding: 10px;">
//           <strong>파싱 성공!</strong><br>
//           환수 이름: ${result.guardianName}<br>
//           레벨: ${result.level}<br>
//           스탯 수: ${Object.keys(result.stats).length}
//         </div>`;
//     }

//     previewDiv.innerHTML = html;
//     previewDiv.style.display = "block";
//   }

//   async function updateStats() {
//     const input = document.getElementById("statInput").value.trim();
//     const docFileName = document.getElementById("documentSelect").value;
//     const statusDiv = document.getElementById("statUpdateStatus");
//     const resultsDiv = document.getElementById("updateResults");
//     const previewDiv = document.getElementById("parsingPreview");

//     previewDiv.style.display = "none";
//     statusDiv.style.display = "block";
//     statusDiv.className = "info";
//     statusDiv.textContent = "스탯 정보 처리 중...";
//     resultsDiv.innerHTML = "";

//     if (!input) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "스탯 정보를 입력해주세요.";
//       return;
//     }

//     if (!docFileName) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "대상 문서를 선택해주세요.";
//       return;
//     }

//     const docId = DOCUMENT_MAP[docFileName];
//     if (!docId) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "유효하지 않은 문서입니다.";
//       return;
//     }

//     try {
//       const parsedResult = parseInput(input);

//       if (!parsedResult.success) {
//         statusDiv.className = "error";
//         statusDiv.textContent =
//           "입력 파싱에 실패했습니다: " + parsedResult.errors.join(", ");
//         return;
//       }

//       const { guardianName, level, stats } = parsedResult;

//       const docRef = db.collection("jsonData").doc(docId);
//       const docSnapshot = await docRef.get();

//       if (!docSnapshot.exists) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName}`;
//         return;
//       }

//       const data = docSnapshot.data();
//       if (!data.data || !Array.isArray(data.data)) {
//         statusDiv.className = "error";
//         statusDiv.textContent = "문서 형식이 올바르지 않습니다.";
//         return;
//       }

//       let foundGuardian = null;
//       let guardianIndex = -1;

//       for (let i = 0; i < data.data.length; i++) {
//         if (data.data[i].name === guardianName) {
//           foundGuardian = data.data[i];
//           guardianIndex = i;
//           break;
//         }
//       }

//       if (guardianIndex === -1) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `환수 "${guardianName}"를 찾을 수 없습니다.`;
//         return;
//       }

//       if (!foundGuardian.stats || foundGuardian.stats.length <= level) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `환수 "${guardianName}"의 ${level}레벨 정보가 존재하지 않습니다.`;
//         return;
//       }

//       const statType = docFileName.includes("-bind-")
//         ? "bindStat"
//         : "registrationStat";

//       previousGuardianData = JSON.parse(JSON.stringify(foundGuardian));

//       const oldStats = foundGuardian.stats[level][statType] || {};
//       const changes = {
//         added: {},
//         modified: {},
//         removed: {},
//       };

//       for (const [statKey, value] of Object.entries(stats)) {
//         if (!oldStats[statKey]) {
//           changes.added[statKey] = value;
//         } else if (oldStats[statKey] !== value) {
//           changes.modified[statKey] = {
//             from: oldStats[statKey],
//             to: value,
//           };
//         }
//       }

//       for (const [statKey, value] of Object.entries(oldStats)) {
//         if (!stats[statKey]) {
//           changes.removed[statKey] = value;
//         }
//       }

//       const updatedData = JSON.parse(JSON.stringify(data));
//       updatedData.data[guardianIndex].stats[level][statType] = stats;
//       updatedGuardianData = updatedData.data[guardianIndex];

//       await docRef.update(updatedData);

//       statusDiv.className = "success";
//       statusDiv.textContent = `환수 "${guardianName}"의 ${level}레벨 스탯이 업데이트되었습니다.`;

//       displaySingleLevelDiff(changes, guardianName, level, statType);
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("스탯 업데이트 오류:", error);
//     }
//   }

//   function clearStatInput() {
//     document.getElementById("statInput").value = "";
//     document.getElementById("parsingPreview").style.display = "none";
//     document.getElementById("statUpdateStatus").style.display = "none";
//     document.getElementById("updateResults").innerHTML = "";
//   }

//   async function downloadDocument() {
//     if (!selectedDocumentId) {
//       alert("다운로드할 문서를 먼저 선택해주세요.");
//       return;
//     }

//     try {
//       const docSnapshot = await db
//         .collection("jsonData")
//         .doc(selectedDocumentId)
//         .get();

//       if (docSnapshot.exists) {
//         const data = docSnapshot.data();
//         const fileName =
//           reverseDocumentMap[selectedDocumentId] ||
//           `document-${selectedDocumentId}.json`;

//         const dataStr = JSON.stringify(data, null, 2);
//         const dataBlob = new Blob([dataStr], { type: "application/json" });

//         const downloadLink = document.createElement("a");
//         downloadLink.href = URL.createObjectURL(dataBlob);
//         downloadLink.download = fileName;

//         document.body.appendChild(downloadLink);
//         downloadLink.click();
//         document.body.removeChild(downloadLink);

//         URL.revokeObjectURL(downloadLink.href);
//       } else {
//         alert("문서를 찾을 수 없습니다.");
//       }
//     } catch (error) {
//       alert(`다운로드 오류: ${error.message}`);
//       console.error("문서 다운로드 오류:", error);
//     }
//   }

//   async function copyDocumentToClipboard() {
//     if (!selectedDocumentId) {
//       alert("복사할 문서를 먼저 선택해주세요.");
//       return;
//     }

//     try {
//       const docSnapshot = await db
//         .collection("jsonData")
//         .doc(selectedDocumentId)
//         .get();

//       if (docSnapshot.exists) {
//         const data = docSnapshot.data();
//         const dataStr = JSON.stringify(data, null, 2);
//         copyToClipboard(dataStr);
//       } else {
//         alert("문서를 찾을 수 없습니다.");
//       }
//     } catch (error) {
//       alert(`복사 오류: ${error.message}`);
//       console.error("문서 복사 오류:", error);
//     }
//   }

//   function copyToClipboard(text) {
//     if (navigator.clipboard && window.isSecureContext) {
//       navigator.clipboard
//         .writeText(text)
//         .then(() => {
//           const notification = document.createElement("div");
//           notification.textContent = "클립보드에 복사되었습니다!";
//           notification.style.cssText = `
//               position: fixed;
//               bottom: 20px;
//               left: 50%;
//               transform: translateX(-50%);
//               background-color: #4285f4;
//               color: white;
//               padding: 10px 20px;
//               border-radius: 4px;
//               z-index: 1000;
//               box-shadow: 0 2px 5px rgba(0,0,0,0.2);
//             `;
//           document.body.appendChild(notification);

//           setTimeout(() => {
//             document.body.removeChild(notification);
//           }, 2000);
//         })
//         .catch((err) => {
//           console.error("클립보드 API 복사 실패:", err);
//           fallbackCopyToClipboard(text);
//         });
//     } else {
//       fallbackCopyToClipboard(text);
//     }
//   }

//   function fallbackCopyToClipboard(text) {
//     try {
//       const textArea = document.createElement("textarea");
//       textArea.value = text;

//       textArea.style.position = "fixed";
//       textArea.style.top = "0";
//       textArea.style.left = "-9999px";

//       document.body.appendChild(textArea);
//       textArea.focus();
//       textArea.select();

//       const successful = document.execCommand("copy");
//       document.body.removeChild(textArea);

//       if (successful) {
//         alert("클립보드에 복사되었습니다!");
//       } else {
//         alert("복사에 실패했습니다. 수동으로 복사해주세요.");
//       }
//     } catch (err) {
//       console.error("대체 복사 방법 실패:", err);
//       alert("복사에 실패했습니다. 수동으로 복사해주세요.");
//     }
//   }

//   function clearNewGuardianForm() {
//     document.getElementById("newGuardianDocumentSelect").selectedIndex = 0;
//     document.getElementById("newGuardianName").value = "";
//     document.getElementById("newGuardianImage").value = "";
//     document.getElementById("newGuardianInfluence").selectedIndex = 0;
//     document.getElementById("newGuardianType").selectedIndex = 0;
//     document.getElementById("newGuardianGrade").selectedIndex = 0;
//     document.getElementById("newGuardianJsonPreview").style.display = "none";
//     document.getElementById("newGuardianStatus").style.display = "none";

//     selectedGuardian = null;
//     selectedGuardianIndex = -1;
//     selectedStats = [];
//     currentLevel = 0;
//     levelStats = {};

//     const selectedStatsContainer = document.getElementById(
//       "selectedStatsContainer"
//     );
//     if (selectedStatsContainer) {
//       selectedStatsContainer.innerHTML = "";
//     }
//     document.getElementById("levelTabsContainer").style.display = "none";
//   }

//   function previewNewGuardian() {
//     const name = document.getElementById("newGuardianName").value.trim();
//     const image = document.getElementById("newGuardianImage").value.trim();
//     const influence = document.getElementById("newGuardianInfluence").value;
//     const type = document.getElementById("newGuardianType").value;
//     const grade = document.getElementById("newGuardianGrade").value;
//     const docFileName = document.getElementById(
//       "newGuardianDocumentSelect"
//     ).value;
//     const previewDiv = document.getElementById("newGuardianJsonPreview");

//     if (!name) {
//       alert("환수 이름을 입력해주세요.");
//       return;
//     }

//     if (!docFileName) {
//       alert("대상 문서를 선택해주세요.");
//       return;
//     }

//     const statType = docFileName.includes("-bind-")
//       ? "bindStat"
//       : "registrationStat";

//     saveCurrentLevelInputs();

//     const newGuardian = {
//       name: name,
//       image:
//         image ||
//         `images/${TYPE_TO_PATH[type]}/${TYPE_TO_PATH[type]}_default.jpg`,
//       influence: influence,
//       type: type,
//       grade: grade,
//       stats: [],
//     };

//     for (let i = 0; i <= 25; i++) {
//       const levelStat = {
//         level: i,
//       };
//       levelStat[statType] = {};

//       if (levelStats[i]) {
//         levelStat[statType] = { ...levelStats[i] };
//       }

//       newGuardian.stats.push(levelStat);
//     }

//     previewDiv.style.display = "block";
//     previewDiv.innerHTML = `<h4>추가될 환수 데이터 미리보기:</h4>
//         <pre>${JSON.stringify(newGuardian, null, 2)}</pre>
//         <div class="success" style="margin-top: 15px; padding: 10px;">
//           <p><strong>추가 문서:</strong> ${docFileName}</p>
//           <p><strong>스탯 타입:</strong> ${
//             statType === "bindStat" ? "장착 스탯" : "등록 스탯"
//           }</p>
//           <p><strong>입력된 레벨 수:</strong> ${
//             Object.keys(levelStats).length
//           }개</p>
//         </div>`;
//   }

//   async function addNewGuardian() {
//     const name = document.getElementById("newGuardianName").value.trim();
//     const image = document.getElementById("newGuardianImage").value.trim();
//     const influence = document.getElementById("newGuardianInfluence").value;
//     const type = document.getElementById("newGuardianType").value;
//     const grade = document.getElementById("newGuardianGrade").value;
//     const docFileName = document.getElementById(
//       "newGuardianDocumentSelect"
//     ).value;

//     const statusDiv = document.getElementById("newGuardianStatus");
//     statusDiv.style.display = "block";

//     if (!name) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "환수 이름을 입력해주세요.";
//       return;
//     }

//     if (!docFileName) {
//       statusDiv.className = "error";
//       statusDiv.textContent = "대상 문서를 선택해주세요.";
//       return;
//     }

//     const docId = DOCUMENT_MAP[docFileName];
//     if (!docId) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName}`;
//       return;
//     }

//     try {
//       statusDiv.className = "info";
//       statusDiv.textContent = "환수 추가 중...";

//       saveCurrentLevelInputs();

//       const docRef = db.collection("jsonData").doc(docId);
//       const docSnapshot = await docRef.get();

//       if (!docSnapshot.exists) {
//         statusDiv.className = "error";
//         statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName}`;
//         return;
//       }

//       const data = docSnapshot.data();
//       if (!data.data || !Array.isArray(data.data)) {
//         statusDiv.className = "error";
//         statusDiv.textContent = "문서 형식이 올바르지 않습니다.";
//         return;
//       }

//       const existingIndex = data.data.findIndex(
//         (guardian) => guardian.name === name
//       );
//       if (existingIndex !== -1) {
//         statusDiv.className = "warning";
//         statusDiv.textContent = `같은 이름의 환수가 이미 존재합니다: ${name}`;
//         if (
//           !confirm("같은 이름의 환수가 이미 존재합니다. 계속 진행하시겠습니까?")
//         ) {
//           return;
//         }
//       }

//       const statType = docFileName.includes("-bind-")
//         ? "bindStat"
//         : "registrationStat";

//       const newGuardian = {
//         name: name,
//         image:
//           image ||
//           `images/${TYPE_TO_PATH[type]}/${TYPE_TO_PATH[type]}_default.jpg`,
//         influence: influence,
//         type: type,
//         grade: grade,
//         stats: [],
//       };

//       for (let i = 0; i <= 25; i++) {
//         const levelStat = {
//           level: i,
//         };
//         levelStat[statType] = {};

//         if (levelStats[i]) {
//           levelStat[statType] = { ...levelStats[i] };
//         }

//         newGuardian.stats.push(levelStat);
//       }

//       const updatedData = JSON.parse(JSON.stringify(data));

//       if (existingIndex !== -1) {
//         updatedData.data[existingIndex] = newGuardian;
//       } else {
//         updatedData.data.push(newGuardian);
//       }

//       await docRef.set(updatedData);

//       if (grade === "불멸") {
//         if (lastImageNumbers[docFileName]) {
//           lastImageNumbers[docFileName].immortal++;
//         }
//       } else {
//         if (lastImageNumbers[docFileName]) {
//           lastImageNumbers[docFileName].normal++;
//         }
//       }

//       statusDiv.className = "success";
//       statusDiv.innerHTML = `
//           <p>환수 "${name}"이(가) 성공적으로 ${
//         existingIndex !== -1 ? "업데이트" : "추가"
//       }되었습니다.</p>
//           <p><strong>추가된 문서:</strong> ${docFileName}</p>
//           <p><strong>문서 ID:</strong> ${docId}</p>
//           <p><strong>환수 타입:</strong> ${type}</p>
//           <p><strong>스탯 타입:</strong> ${
//             statType === "bindStat" ? "장착 스탯" : "등록 스탯"
//           }</p>
//           <p><strong>스탯 입력된 레벨 수:</strong> ${
//             Object.keys(levelStats).length
//           }개</p>
//         `;

//       clearNewGuardianForm();
//     } catch (error) {
//       statusDiv.className = "error";
//       statusDiv.textContent = `오류 발생: ${error.message}`;
//       console.error("환수 추가 오류:", error);
//     }
//   }

//   function setupEventListeners() {
//     document.querySelectorAll(".tab").forEach((tab) => {
//       tab.addEventListener("click", function () {
//         document
//           .querySelectorAll(".tab")
//           .forEach((t) => t.classList.remove("active"));
//         this.classList.add("active");

//         document
//           .querySelectorAll(".tab-content")
//           .forEach((content) => content.classList.remove("active"));
//         document.getElementById(this.dataset.tab).classList.add("active");

//         if (this.dataset.tab === "document-browser") {
//           refreshDocumentList();
//         }

//         if (this.dataset.tab === "new-guardian") {
//           updateImagePath();
//           initStatDropdown();
//         }
//       });
//     });

//     document.querySelectorAll('input[name="uploadMode"]').forEach((radio) => {
//       radio.addEventListener("change", function () {
//         document.getElementById("updateFieldsContainer").style.display =
//           this.value === "update" ? "block" : "none";
//       });
//     });

//     const newGuardianDocSelect = document.getElementById(
//       "newGuardianDocumentSelect"
//     );
//     if (newGuardianDocSelect) {
//       newGuardianDocSelect.addEventListener("change", function () {
//         const selectedDoc = this.value;
//         if (selectedDoc) {
//           const type = selectedDoc.split("-")[0];
//           document.getElementById("newGuardianType").value =
//             type === "guardian" ? "수호" : type === "ride" ? "탑승" : "변신";
//           updateImagePath();
//         }
//       });
//     }

//     const newGuardianGrade = document.getElementById("newGuardianGrade");
//     if (newGuardianGrade) {
//       newGuardianGrade.addEventListener("change", updateImagePath);
//     }

//     setupKeyboardShortcuts();

//     document
//       .getElementById("documentSearchInput")
//       ?.addEventListener("input", filterDocumentList);
//     document
//       .getElementById("documentTypeFilter")
//       ?.addEventListener("change", filterDocumentList);

//     document
//       .getElementById("guardianSearchInput")
//       ?.addEventListener("input", filterGuardiansList);
//   }

//   document.addEventListener("DOMContentLoaded", function () {
//     if (typeof firebaseConfig !== "undefined") {
//       initialize();
//     } else {
//       const existingScript = document.querySelector(
//         'script[src="assets/js/firebaseConfig.js"]'
//       );

//       if (existingScript) {
//         existingScript.onload = initialize;
//         existingScript.onerror = function () {
//           console.error("기존 firebaseConfig.js 로드 실패");
//           initialize();
//         };
//       } else {
//         loadFirebaseConfig()
//           .then(initialize)
//           .catch((err) => {
//             console.error("firebaseConfig.js 동적 로드 실패:", err);
//             alert(
//               "Firebase 설정을 로드할 수 없습니다. 페이지를 새로고침하거나 관리자에게 문의하세요."
//             );
//           });
//       }
//     }
//   });

//   return {
//     initialize,
//     refreshDocumentList,
//     viewDocument,
//     checkDocument,
//     uploadJson,
//     prepareEditSelectedDocument,
//     switchEditMode,
//     formatJson,
//     saveJsonChanges,
//     saveArrayOrder,
//     saveDataChanges,
//     cancelEditing,
//     deleteSelectedDocument,
//     previewParsing,
//     updateStats,
//     clearStatInput,
//     downloadDocument,
//     copyDocumentToClipboard,
//     copyToClipboard,
//     clearNewGuardianForm,
//     previewNewGuardian,
//     addNewGuardian,
//     parseStatsSeriesInput,
//     previewStatsSeries,
//     updateStatsSeries,
//     revertChanges,
//     displayDiff,
//     displaySingleLevelDiff,
//     filterDocumentList,
//     filterGuardiansList,

//     initStatDropdown,
//     addSelectedStat,
//     removeSelectedStat,
//     initLevelTabs,
//     updateLevelContentForm,
//     saveCurrentLevelInputs,
//     activateLevel,
//     goToPreviousLevel,
//     goToNextLevel,
//     copyPreviousLevelStats,

//     handleStatDragStart,
//     handleStatDragOver,
//     handleStatDrop,
//     handleStatDragEnd,
//   };
// })();

const FirestoreManager = (function () {
  // 상수 정의
  const DOCUMENT_MAP = CommonData.DOCUMENT_MAP;
  const STATS_MAPPING = CommonData.STATS_MAPPING;
  const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시
  const TYPE_TO_PATH = {
    수호: "guardian",
    탑승: "ride",
    변신: "transform",
  };

  // 상태 객체
  let state = {
    db: null,
    currentDocument: null,
    selectedDocumentId: null,
    editingJson: null,
    currentEditMode: "json",
    isInitialized: false,
    isLoading: false,
  };

  // 드래그 관련 상태 변수
  let draggedItem = null;
  let draggedStatKey = null;
  let draggedInputGroup = null;

  // 환수 데이터 관련 상태 변수
  let selectedGuardian = null;
  let selectedGuardianIndex = -1;
  let selectedStats = [];
  let currentLevel = 0;
  let levelStats = {};
  let previousGuardianData = null;
  let updatedGuardianData = null;

  // 이미지 번호 캐시
  let lastImageNumbers = {};

  // 데이터 캐싱
  const cache = {
    documents: { data: [], timestamp: 0 },
    guardians: { data: {}, timestamp: 0 },
  };

  // 문서 ID - 파일명 매핑
  const reverseDocumentMap = {};
  for (const [fileName, docId] of Object.entries(DOCUMENT_MAP)) {
    reverseDocumentMap[docId] = fileName;
  }

  // 초기화 함수
  async function initialize() {
    if (state.isInitialized) return;

    state.isLoading = true;
    updateLoadingStatus("Firebase 연결 시도 중...");
    updateLoadingProgress(10);

    try {
      const isConnected = await initFirebase();

      if (isConnected) {
        updateLoadingStatus("문서 목록 로드 중...");
        updateLoadingProgress(40);
        await refreshDocumentList();

        updateLoadingStatus("이미지 정보 로드 중...");
        updateLoadingProgress(70);
        await loadImageNumbers();

        updateLoadingStatus("이벤트 설정 중...");
        updateLoadingProgress(90);
        setupEventListeners();
        initStatDropdown();

        updateLoadingStatus("초기화 완료!");
        updateLoadingProgress(100);

        setTimeout(hideLoadingOverlay, 500);
        state.isInitialized = true;
        state.isLoading = false;

        showNotification("Firebase Helper가 준비되었습니다", "success");
      } else {
        throw new Error("Firebase 초기화 실패");
      }
    } catch (error) {
      console.error("초기화 오류:", error);
      updateLoadingStatus("초기화 오류: " + error.message, true);
      showNotification("초기화에 실패했습니다: " + error.message, "error", 0);
      state.isLoading = false;
    }
  }

  function updateLoadingStatus(message, isError = false) {
    const statusElement = document.getElementById("loadingStatus");
    if (statusElement) {
      statusElement.textContent = message;
      if (isError) {
        statusElement.style.backgroundColor = "#f8d7da";
        statusElement.style.color = "#721c24";
      }
    }
  }

  function updateLoadingProgress(progress) {
    const progressBar = document.getElementById("loadingProgressBar");
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById("loadingOverlay");
    const tabContainer = document.querySelector(".tab-container");

    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.style.display = "none";
      }, 500);
    }

    if (tabContainer) {
      tabContainer.classList.remove("disabled");
    }
  }

  function showLoadingOverlay(message = "처리 중...") {
    const overlay = document.getElementById("loadingOverlay");
    const statusElement = document.getElementById("loadingStatus");
    const progressBar = document.getElementById("loadingProgressBar");

    if (overlay) {
      if (statusElement) statusElement.textContent = message;
      if (progressBar) progressBar.style.width = "0%";

      overlay.style.display = "flex";
      setTimeout(() => {
        overlay.style.opacity = "1";
      }, 10);
    }

    state.isLoading = true;
  }

  function showNotification(message, type = "info", duration = 3000) {
    // 이전 알림 제거
    document
      .querySelectorAll(".notification-toast")
      .forEach((toast) => toast.remove());

    const notification = document.createElement("div");
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
          <div class="notification-content">
              <span class="notification-icon">${getNotificationIcon(
                type
              )}</span>
              <span class="notification-message">${message}</span>
          </div>
          <button class="notification-close">&times;</button>
      `;

    document.getElementById("notificationContainer").appendChild(notification);

    // 애니메이션 추가
    setTimeout(() => notification.classList.add("show"), 10);

    // 닫기 버튼
    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
      });

    // 자동 사라짐
    if (duration) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.classList.remove("show");
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
            }
          }, 300);
        }
      }, duration);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      default:
        return "ℹ";
    }
  }

  async function initFirebase() {
    try {
      updateLoadingStatus("Firebase 설정 로드 중...");
      updateLoadingProgress(20);

      if (typeof firebaseConfig === "undefined") {
        const configLoaded = await loadFirebaseConfig();
        if (!configLoaded) {
          return false;
        }
      }

      updateLoadingStatus("Firebase 초기화 중...");
      updateLoadingProgress(30);
      firebase.initializeApp(firebaseConfig);
      state.db = firebase.firestore();

      const connectionStatusDiv = document.getElementById("connectionStatus");
      if (connectionStatusDiv) {
        connectionStatusDiv.className = "success";
        connectionStatusDiv.textContent = "Firebase에 연결되었습니다.";
      }

      return true;
    } catch (error) {
      console.error("Firebase 초기화 오류:", error);
      const connectionStatusDiv = document.getElementById("connectionStatus");
      if (connectionStatusDiv) {
        connectionStatusDiv.className = "error";
        connectionStatusDiv.textContent = `Firebase 연결 오류: ${error.message}`;
      }
      return false;
    }
  }

  function loadFirebaseConfig() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/js/firebaseConfig.js";
      script.onload = () => {
        if (typeof firebaseConfig !== "undefined") {
          resolve(true);
        } else {
          reject(
            new Error("firebaseConfig가 로드된 스크립트에 정의되지 않았습니다.")
          );
          resolve(false);
        }
      };
      script.onerror = () => {
        reject(new Error("firebaseConfig.js 로드 실패"));
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  async function testConnection() {
    if (!state.db) return false;

    try {
      const docRef = state.db.collection("jsonData").doc("data-1745203971906");
      const docSnapshot = await docRef.get();
      return docSnapshot.exists;
    } catch (error) {
      console.error("Firebase 연결 테스트 실패:", error);
      return false;
    }
  }

  function filterDocumentList() {
    const searchInput = document
      .getElementById("documentSearchInput")
      .value.toLowerCase();
    const typeFilter = document.getElementById("documentTypeFilter").value;
    const documentItems = document.querySelectorAll(".document-item");
    let visibleCount = 0;

    documentItems.forEach((item) => {
      const docName = item
        .querySelector(".document-name")
        .textContent.toLowerCase();
      const docId = item.querySelector(".document-id").textContent;
      let docType = "";

      if (docName.includes("guardian")) docType = "guardian";
      else if (docName.includes("ride")) docType = "ride";
      else if (docName.includes("transform")) docType = "transform";
      else docType = "other";

      const matchesSearch =
        docName.includes(searchInput) || docId.includes(searchInput);
      const matchesType = typeFilter === "" || docType === typeFilter;

      if (matchesSearch && matchesType) {
        item.style.display = "flex";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    document.getElementById("documentCount").textContent = `(${visibleCount})`;
  }

  function filterGuardiansList() {
    const searchInput = document
      .getElementById("guardianSearchInput")
      .value.toLowerCase();
    const guardianItems = document.querySelectorAll(".guardian-item");

    guardianItems.forEach((item) => {
      const guardianName = item.textContent.toLowerCase();
      if (guardianName.includes(searchInput)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  }

  async function refreshDocumentList() {
    const documentListDiv = document.getElementById("documentList");
    if (!documentListDiv) return;

    documentListDiv.innerHTML =
      "<p class='loading-message'>문서를 로딩 중입니다...</p>";

    try {
      // 캐시 체크
      if (
        cache.documents.timestamp &&
        Date.now() - cache.documents.timestamp < CACHE_DURATION &&
        cache.documents.data.length > 0
      ) {
        renderDocumentList(cache.documents.data);
        return;
      }

      const snapshot = await state.db.collection("jsonData").get();

      if (snapshot.empty) {
        documentListDiv.innerHTML =
          "<p class='loading-message'>문서가 없습니다.</p>";
        document.getElementById("documentCount").textContent = "(0)";
        return;
      }

      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          fileName: reverseDocumentMap[doc.id] || doc.id,
        });
      });

      // 캐시 업데이트
      cache.documents.data = documents;
      cache.documents.timestamp = Date.now();

      renderDocumentList(documents);
    } catch (error) {
      documentListDiv.innerHTML = `<p class="error">문서 목록 로드 오류: ${error.message}</p>`;
      console.error("문서 목록 로드 오류:", error);
    }
  }

  function renderDocumentList(documents) {
    const documentListDiv = document.getElementById("documentList");
    const docCount = documents.length;

    if (docCount === 0) {
      documentListDiv.innerHTML =
        "<p class='loading-message'>문서가 없습니다.</p>";
      document.getElementById("documentCount").textContent = "(0)";
      return;
    }

    const fragment = document.createDocumentFragment();

    documents.forEach((doc) => {
      const docElement = createDocumentElement(doc);
      fragment.appendChild(docElement);
    });

    documentListDiv.innerHTML = "";
    documentListDiv.appendChild(fragment);
    document.getElementById("documentCount").textContent = `(${docCount})`;
  }

  function createDocumentElement(doc) {
    const { id, fileName } = doc;
    const isSelected = state.selectedDocumentId === id;
    let docIcon = "📄";

    if (fileName.includes("guardian")) docIcon = "🛡️";
    else if (fileName.includes("ride")) docIcon = "🐎";
    else if (fileName.includes("transform")) docIcon = "✨";

    const div = document.createElement("div");
    div.className = `document-item ${isSelected ? "selected" : ""}`;
    div.onclick = () => viewDocument(id);

    div.innerHTML = `
          <span class="document-icon">${docIcon}</span>
          <div class="document-info">
              <span class="document-name">${fileName}</span>
              <span class="document-id">${id}</span>
          </div>
      `;

    return div;
  }

  function loadGuardianData(guardian, index) {
    selectedGuardian = guardian;
    selectedGuardianIndex = index;
    levelStats = {};

    const selectedGuardianNameEl = document.getElementById(
      "selectedGuardianName"
    );
    if (selectedGuardianNameEl) {
      selectedGuardianNameEl.textContent = `${guardian.name} ${
        guardian.grade ? `[${guardian.grade}]` : ""
      } ${guardian.type ? `(${guardian.type})` : ""}`;
    }

    const infoContainer = document.getElementById("guardianInfoContainer");
    const levelTabsContainer = document.getElementById("levelTabsContainer");

    infoContainer.style.display = "none";
    levelTabsContainer.style.display = "block";

    const fileName = reverseDocumentMap[state.selectedDocumentId] || "";
    const statType = fileName.includes("-bind-")
      ? "bindStat"
      : "registrationStat";

    selectedStats = [];

    if (guardian.stats) {
      guardian.stats.forEach((levelData) => {
        if (levelData[statType]) {
          const levelStats = levelData[statType];
          Object.keys(levelStats).forEach((statKey) => {
            if (!selectedStats.includes(statKey)) {
              selectedStats.push(statKey);
            }
          });
        }
      });
    }

    if (guardian.stats) {
      guardian.stats.forEach((levelData) => {
        const level = levelData.level;
        if (!levelStats[level]) levelStats[level] = {};

        if (levelData[statType]) {
          Object.entries(levelData[statType]).forEach(([key, value]) => {
            levelStats[level][key] = value;
          });
        }
      });
    }

    updateSelectedStatsDisplay();
    initLevelTabs();

    currentLevel = 0;
    updateLevelContentForm(currentLevel);
  }

  function setupKeyboardShortcuts() {
    const jsonEditor = document.getElementById("jsonEditor");
    if (jsonEditor) {
      jsonEditor.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.key === "s") {
          e.preventDefault();
          saveJsonChanges();
        }

        if (e.ctrlKey && e.key === "f") {
          e.preventDefault();
          formatJson();
        }
      });
    }

    document
      .getElementById("guardianSearchInput")
      ?.addEventListener("input", filterGuardiansList);
  }

  async function viewDocument(documentId) {
    state.selectedDocumentId = documentId;
    const selectedDocumentDiv = document.getElementById("selectedDocument");
    if (!selectedDocumentDiv) return;

    const documentToolbar = document.getElementById("documentToolbar");
    const jsonEditorContainer = document.getElementById("jsonEditorContainer");

    document.querySelectorAll(".document-item").forEach((item) => {
      item.classList.remove("selected");
      if (item.querySelector(".document-id").textContent === documentId) {
        item.classList.add("selected");
      }
    });

    try {
      selectedDocumentDiv.innerHTML =
        "<p class='loading-message'>문서를 로딩 중입니다...</p>";
      jsonEditorContainer.style.display = "none";
      documentToolbar.style.display = "none";

      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[documentId] &&
        cache.guardians[documentId].timestamp &&
        Date.now() - cache.guardians[documentId].timestamp < CACHE_DURATION
      ) {
        docData = cache.guardians[documentId].data;
      } else {
        const docRef = state.db.collection("jsonData").doc(documentId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
          docData = docSnapshot.data();

          // 캐시 업데이트
          cache.guardians[documentId] = {
            data: docData,
            timestamp: Date.now(),
          };
        }
      }

      if (docData) {
        state.editingJson = docData;
        const fileName = reverseDocumentMap[documentId] || documentId;

        const compactJson = JSON.stringify(docData);
        const formattedJson = JSON.stringify(docData, null, 2);

        let jsonPreview = formattedJson;
        if (compactJson.length > 100000) {
          // 대용량 JSON 처리
          jsonPreview = `<div class="warning" style="margin-bottom:10px">
                      파일 크기가 너무 커서 축약된 뷰를 표시합니다. 편집하려면 "편집" 버튼을 클릭하세요.
                  </div>`;

          if (docData.data && Array.isArray(docData.data)) {
            jsonPreview += `<div class="json-summary">
                          <h4>문서 요약</h4>
                          <p>배열 길이: ${docData.data.length}개 항목</p>
                          <p>첫 번째 항목:</p>
                          <pre>${JSON.stringify(
                            docData.data[0],
                            null,
                            2
                          ).substring(0, 1000)}${
              docData.data[0] &&
              JSON.stringify(docData.data[0], null, 2).length > 1000
                ? "..."
                : ""
            }</pre>
                      </div>`;
          }
        } else {
          jsonPreview = `<pre class="json-preview">${formattedJson}</pre>`;
        }

        selectedDocumentDiv.innerHTML = `
                  <h4 class="document-title">파일명: ${fileName}</h4>
                  <div class="document-meta">문서 ID: ${documentId}</div>
                  <hr>
                  ${jsonPreview}
              `;

        documentToolbar.style.display = "flex";
      } else {
        selectedDocumentDiv.innerHTML =
          "<p class='select-message'>문서가 존재하지 않습니다.</p>";
        documentToolbar.style.display = "none";
        state.editingJson = null;
      }
    } catch (error) {
      selectedDocumentDiv.innerHTML = `<p class="error">문서 로드 오류: ${error.message}</p>`;
      console.error("문서 로드 오류:", error);
      documentToolbar.style.display = "none";
      state.editingJson = null;
    }
  }

  async function checkDocument() {
    const documentName = document.getElementById("documentName").value.trim();
    const documentInfo = document.getElementById("documentInfo");
    const documentPreview = document.getElementById("documentPreview");
    const statusDiv = document.getElementById("status");

    if (!documentName) {
      statusDiv.className = "error";
      statusDiv.textContent = "문서 이름을 입력해주세요.";
      documentInfo.style.display = "none";
      documentPreview.style.display = "none";
      return;
    }

    statusDiv.className = "info";
    statusDiv.textContent = "문서 확인 중...";

    try {
      const docRef = state.db.collection("jsonData").doc(documentName);
      const docSnapshot = await docRef.get();

      if (docSnapshot.exists) {
        state.currentDocument = docSnapshot.data();
        const fileName = reverseDocumentMap[documentName] || documentName;

        documentInfo.style.display = "block";
        documentInfo.textContent = `문서가 존재합니다: ${fileName} (ID: ${documentName})`;

        documentPreview.style.display = "block";

        // 대용량 문서 처리
        const compactJson = JSON.stringify(state.currentDocument);
        if (compactJson.length > 100000) {
          documentPreview.innerHTML = `
                      <h4>현재 문서 내용:</h4>
                      <div class="warning" style="margin-bottom: 10px">
                          파일 크기가 너무 커서 요약 정보만 표시합니다.
                      </div>
                      <div class="json-summary">
                          <p>데이터 크기: 약 ${Math.round(
                            compactJson.length / 1024
                          )} KB</p>
                          ${
                            state.currentDocument.data &&
                            Array.isArray(state.currentDocument.data)
                              ? `<p>항목 수: ${state.currentDocument.data.length}개</p>`
                              : ""
                          }
                      </div>
                  `;
        } else {
          documentPreview.innerHTML =
            "<h4>현재 문서 내용:</h4><pre>" +
            JSON.stringify(state.currentDocument, null, 2) +
            "</pre>";
        }

        document.querySelector(
          'input[name="uploadMode"][value="merge"]'
        ).checked = true;
        statusDiv.className = "success";
        statusDiv.textContent = "문서를 찾았습니다.";
      } else {
        documentInfo.style.display = "block";
        documentInfo.textContent = `문서가 존재하지 않습니다: ${documentName}`;
        documentPreview.style.display = "none";
        state.currentDocument = null;

        document.querySelector(
          'input[name="uploadMode"][value="create"]'
        ).checked = true;
        statusDiv.className = "info";
        statusDiv.textContent = "새 문서를 생성할 수 있습니다.";
      }
    } catch (error) {
      documentInfo.style.display = "none";
      documentPreview.style.display = "none";
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      console.error("문서 확인 오류:", error);
    }

    const updateMode = document.querySelector(
      'input[name="uploadMode"]:checked'
    ).value;
    document.getElementById("updateFieldsContainer").style.display =
      updateMode === "update" ? "block" : "none";
  }

  function uploadJson() {
    const fileInput = document.getElementById("jsonFileInput");
    const documentName = document.getElementById("documentName").value.trim();
    const statusDiv = document.getElementById("status");
    const uploadMode = document.querySelector(
      'input[name="uploadMode"]:checked'
    ).value;

    if (!documentName) {
      showNotification("문서 이름을 입력해주세요.", "error");
      statusDiv.className = "error";
      statusDiv.textContent = "문서 이름을 입력해주세요.";
      return;
    }

    if (!fileInput.files.length) {
      showNotification("파일을 선택해주세요.", "error");
      statusDiv.className = "error";
      statusDiv.textContent = "파일을 선택해주세요.";
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 1000000) {
      showNotification(
        "파일이 너무 큽니다. 1MB 이하의 파일을 사용하세요.",
        "error"
      );
      statusDiv.className = "error";
      statusDiv.textContent =
        "파일이 너무 큽니다. Firestore 문서 크기 제한은 1MB입니다.";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const jsonData = JSON.parse(e.target.result);
        statusDiv.className = "info";
        statusDiv.textContent = "업로드 중...";
        showLoadingOverlay("JSON 파일 업로드 중...");

        switch (uploadMode) {
          case "create":
            createDocument(documentName, jsonData, file.name);
            break;
          case "overwrite":
            overwriteDocument(documentName, jsonData);
            break;
          case "merge":
            mergeDocument(documentName, jsonData);
            break;
          case "update":
            updateSpecificFields(documentName, jsonData);
            break;
        }
      } catch (error) {
        hideLoadingOverlay();
        showNotification("JSON 파싱 오류: " + error.message, "error");
        statusDiv.className = "error";
        statusDiv.textContent = `JSON 파싱 오류: ${error.message}`;
      }
    };

    reader.readAsText(file);
  }

  async function createDocument(documentName, jsonData, fileName) {
    const statusDiv = document.getElementById("status");

    try {
      const docSnapshot = await state.db
        .collection("jsonData")
        .doc(documentName)
        .get();

      if (docSnapshot.exists) {
        hideLoadingOverlay();
        showNotification(
          "문서가 이미 존재합니다. 다른 이름을 사용하거나 다른 업로드 모드를 선택하세요.",
          "error"
        );
        statusDiv.className = "error";
        statusDiv.textContent = `문서가 이미 존재합니다. 다른 이름을 사용하거나 다른 업로드 모드를 선택하세요.`;
      } else {
        await state.db.collection("jsonData").doc(documentName).set(jsonData);
        reverseDocumentMap[documentName] = fileName;

        // 캐시 업데이트
        cache.guardians[documentName] = {
          data: jsonData,
          timestamp: Date.now(),
        };
        cache.documents.timestamp = 0; // 문서 목록 캐시 무효화

        hideLoadingOverlay();
        showNotification("새 문서가 생성되었습니다!", "success");
        statusDiv.className = "success";
        statusDiv.textContent = `새 문서가 생성되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}`;

        checkDocument();
        refreshDocumentList();
      }
    } catch (error) {
      hideLoadingOverlay();
      showNotification("업로드 오류: " + error.message, "error");
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      console.error("업로드 오류:", error);
    }
  }

  async function overwriteDocument(documentName, jsonData) {
    const statusDiv = document.getElementById("status");

    try {
      await state.db.collection("jsonData").doc(documentName).set(jsonData);
      const fileName = reverseDocumentMap[documentName] || documentName;

      // 캐시 업데이트
      cache.guardians[documentName] = {
        data: jsonData,
        timestamp: Date.now(),
      };

      hideLoadingOverlay();
      showNotification("문서가 덮어쓰기 되었습니다!", "success");
      statusDiv.className = "success";
      statusDiv.textContent = `문서가 덮어쓰기 되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}`;

      checkDocument();
      refreshDocumentList();
    } catch (error) {
      hideLoadingOverlay();
      showNotification("덮어쓰기 오류: " + error.message, "error");
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      console.error("덮어쓰기 오류:", error);
    }
  }

  async function mergeDocument(documentName, jsonData) {
    const statusDiv = document.getElementById("status");

    try {
      await state.db
        .collection("jsonData")
        .doc(documentName)
        .set(jsonData, { merge: true });
      const fileName = reverseDocumentMap[documentName] || documentName;

      // 캐시 무효화
      delete cache.guardians[documentName];

      hideLoadingOverlay();
      showNotification("문서가 병합되었습니다!", "success");
      statusDiv.className = "success";
      statusDiv.textContent = `문서가 병합되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}`;

      checkDocument();
      refreshDocumentList();
    } catch (error) {
      hideLoadingOverlay();
      showNotification("병합 오류: " + error.message, "error");
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      console.error("병합 오류:", error);
    }
  }

  async function updateSpecificFields(documentName, jsonData) {
    const statusDiv = document.getElementById("status");
    const updateFields = document.getElementById("updateFields").value.trim();

    if (!updateFields) {
      hideLoadingOverlay();
      showNotification("업데이트할 필드를 지정해주세요.", "error");
      statusDiv.className = "error";
      statusDiv.textContent = "업데이트할 필드를 지정해주세요.";
      return;
    }

    try {
      const fields = updateFields.split(",").map((f) => f.trim());
      const updateData = {};

      for (const field of fields) {
        const parts = field.split(".");
        let value = jsonData;
        let valid = true;

        for (const part of parts) {
          if (value && typeof value === "object" && part in value) {
            value = value[part];
          } else {
            valid = false;
            break;
          }
        }

        if (valid) {
          if (parts.length === 1) {
            updateData[field] = value;
          } else {
            let currentObj = updateData;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!currentObj[parts[i]]) {
                currentObj[parts[i]] = {};
              }
              currentObj = currentObj[parts[i]];
            }
            currentObj[parts[parts.length - 1]] = value;
          }
        } else {
          hideLoadingOverlay();
          showNotification(`필드 경로를 찾을 수 없습니다: ${field}`, "error");
          statusDiv.className = "error";
          statusDiv.textContent = `필드 경로를 찾을 수 없습니다: ${field}`;
          return;
        }
      }

      await state.db
        .collection("jsonData")
        .doc(documentName)
        .update(updateData);
      const fileName = reverseDocumentMap[documentName] || documentName;

      // 캐시 무효화
      delete cache.guardians[documentName];

      hideLoadingOverlay();
      showNotification("선택한 필드가 업데이트되었습니다!", "success");
      statusDiv.className = "success";
      statusDiv.textContent = `선택한 필드가 업데이트되었습니다! 파일명: ${fileName}, 문서 ID: ${documentName}, 필드: ${updateFields}`;

      checkDocument();
      refreshDocumentList();
    } catch (error) {
      hideLoadingOverlay();
      showNotification("업데이트 오류: " + error.message, "error");
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      console.error("업데이트 오류:", error);
    }
  }

  async function loadImageNumbers() {
    try {
      for (const docFileName in DOCUMENT_MAP) {
        const docId = DOCUMENT_MAP[docFileName];

        // 캐시된 데이터 사용
        let data = null;
        if (cache.guardians[docId] && cache.guardians[docId].data) {
          data = cache.guardians[docId].data;
        } else {
          const docRef = state.db.collection("jsonData").doc(docId);
          const docSnapshot = await docRef.get();

          if (docSnapshot.exists) {
            data = docSnapshot.data();
            cache.guardians[docId] = {
              data: data,
              timestamp: Date.now(),
            };
          }
        }

        if (data && data.data && Array.isArray(data.data)) {
          const type = docFileName.split("-")[0];

          let lastNormal = 0;
          let lastImmortal = 0;

          data.data.forEach((item) => {
            if (item.image) {
              const normalMatch = item.image.match(
                new RegExp(`images/${type}/${type}_(\\d+)\\.jpg`)
              );
              if (normalMatch && normalMatch[1]) {
                const num = parseInt(normalMatch[1]);
                if (num > lastNormal) {
                  lastNormal = num;
                }
              }

              const immortalMatch = item.image.match(
                new RegExp(`images/${type}/${type}_i(\\d+)\\.jpg`)
              );
              if (immortalMatch && immortalMatch[1]) {
                const num = parseInt(immortalMatch[1]);
                if (num > lastImmortal) {
                  lastImmortal = num;
                }
              }
            }
          });

          if (!lastImageNumbers[docFileName]) {
            lastImageNumbers[docFileName] = {};
          }
          lastImageNumbers[docFileName].normal = lastNormal;
          lastImageNumbers[docFileName].immortal = lastImmortal;
        }
      }
      console.log("이미지 번호 로딩 완료:", lastImageNumbers);
      updateImagePath();
    } catch (error) {
      console.error("이미지 번호 로딩 오류:", error);
    }
  }

  function updateImagePath() {
    const docFileName = document.getElementById(
      "newGuardianDocumentSelect"
    )?.value;
    const type = document.getElementById("newGuardianType")?.value;
    const grade = document.getElementById("newGuardianGrade")?.value;
    const imageInput = document.getElementById("newGuardianImage");

    if (!type || !imageInput) return;

    const typeForPath = TYPE_TO_PATH[type];
    const isImmortal = grade === "불멸";

    let nextNumber = 1;

    if (docFileName && lastImageNumbers[docFileName]) {
      if (isImmortal) {
        nextNumber = (lastImageNumbers[docFileName].immortal || 0) + 1;
      } else {
        nextNumber = (lastImageNumbers[docFileName].normal || 0) + 1;
      }
    }

    let prefix = `images/${typeForPath}/${typeForPath}_`;
    if (isImmortal) {
      prefix += "i";
    }

    imageInput.value = `${prefix}${nextNumber}.jpg`;
  }

  function prepareEditSelectedDocument() {
    if (!state.selectedDocumentId || !state.editingJson) return;

    document.getElementById("selectedDocument").style.display = "none";
    document.getElementById("documentToolbar").style.display = "none";

    const jsonEditorContainer = document.getElementById("jsonEditorContainer");
    jsonEditorContainer.style.display = "block";

    const jsonEditor = document.getElementById("jsonEditor");
    jsonEditor.value = JSON.stringify(state.editingJson, null, 2);

    switchEditMode("json");
  }

  function switchEditMode(mode) {
    state.currentEditMode = mode;

    document.querySelectorAll(".edit-mode-tab").forEach((tab) => {
      tab.classList.remove("active");
    });

    document
      .querySelector(`.edit-mode-tab[onclick*="${mode}"]`)
      .classList.add("active");

    if (mode === "json") {
      document.getElementById("jsonEditMode").style.display = "block";
      document.getElementById("arrayEditMode").style.display = "none";
      document.getElementById("dataEditMode").style.display = "none";
    } else if (mode === "array") {
      document.getElementById("jsonEditMode").style.display = "none";
      document.getElementById("arrayEditMode").style.display = "block";
      document.getElementById("dataEditMode").style.display = "none";
      renderDataItems();
    } else if (mode === "data") {
      document.getElementById("jsonEditMode").style.display = "none";
      document.getElementById("arrayEditMode").style.display = "none";
      document.getElementById("dataEditMode").style.display = "block";
      renderGuardiansList();
      initStatDropdown();
    }
  }

  function renderDataItems() {
    const container = document.getElementById("dataItemsContainer");
    container.innerHTML = "";

    try {
      const jsonData = JSON.parse(document.getElementById("jsonEditor").value);

      if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
        // 가상 스크롤링 구현 (항목이 많을 경우)
        const renderItems = (startIdx, endIdx) => {
          const fragment = document.createDocumentFragment();

          for (let i = startIdx; i < endIdx && i < jsonData.data.length; i++) {
            const item = jsonData.data[i];
            const div = document.createElement("div");
            div.className = "data-item";
            div.setAttribute("draggable", "true");
            div.setAttribute("data-index", i);

            let displayText = "";
            if (item.name) {
              displayText += `<span class="drag-handle">⋮⋮</span><strong>${item.name}</strong>`;
            } else {
              displayText += `<span class="drag-handle">⋮⋮</span><strong>항목 ${
                i + 1
              }</strong>`;
            }

            if (item.type) displayText += ` (${item.type})`;
            if (item.grade) displayText += ` [${item.grade}]`;

            div.innerHTML = displayText;

            div.addEventListener("dragstart", handleDragStart);
            div.addEventListener("dragover", handleDragOver);
            div.addEventListener("drop", handleDrop);
            div.addEventListener("dragend", handleDragEnd);

            fragment.appendChild(div);
          }

          return fragment;
        };

        // 초기 렌더링 (최대 100개 항목)
        const initialLoadCount = Math.min(100, jsonData.data.length);
        container.appendChild(renderItems(0, initialLoadCount));

        if (jsonData.data.length > initialLoadCount) {
          // 스크롤 이벤트로 추가 항목 로드
          const loadMoreThreshold = 100; // 하단에서 100px 남았을 때 추가 로드
          let nextLoadIndex = initialLoadCount;
          const batchSize = 50; // 한 번에 50개씩 로드

          container.addEventListener("scroll", () => {
            if (
              container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
                loadMoreThreshold &&
              nextLoadIndex < jsonData.data.length
            ) {
              const endIndex = Math.min(
                nextLoadIndex + batchSize,
                jsonData.data.length
              );
              container.appendChild(renderItems(nextLoadIndex, endIndex));
              nextLoadIndex = endIndex;
            }
          });
        }
      } else {
        container.innerHTML =
          "<p>데이터 배열을 찾을 수 없거나 유효하지 않은 JSON입니다.</p>";
      }
    } catch (error) {
      container.innerHTML = `<p class="error">JSON 파싱 오류: ${error.message}</p>`;
      showNotification("JSON 파싱 오류: " + error.message, "error");
    }
  }

  function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = "move";
    return false;
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (draggedItem !== this) {
      const container = document.getElementById("dataItemsContainer");
      const items = Array.from(container.querySelectorAll(".data-item"));
      const fromIndex = parseInt(draggedItem.getAttribute("data-index"));
      const toIndex = parseInt(this.getAttribute("data-index"));

      try {
        const jsonData = JSON.parse(
          document.getElementById("jsonEditor").value
        );

        if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
          const [movedItem] = jsonData.data.splice(fromIndex, 1);
          jsonData.data.splice(toIndex, 0, movedItem);

          document.getElementById("jsonEditor").value = JSON.stringify(
            jsonData,
            null,
            2
          );

          renderDataItems();
        }
      } catch (error) {
        console.error("항목 이동 오류:", error);
        showNotification("항목 이동 오류: " + error.message, "error");
      }
    }

    return false;
  }

  function handleDragEnd() {
    this.style.opacity = "1";
    draggedItem = null;
  }

  function formatJson() {
    try {
      const jsonEditor = document.getElementById("jsonEditor");
      const json = JSON.parse(jsonEditor.value);
      jsonEditor.value = JSON.stringify(json, null, 2);
      showNotification("JSON 포맷팅 완료", "success");
    } catch (error) {
      showNotification("JSON 포맷팅 오류: " + error.message, "error");
    }
  }

  async function saveJsonChanges() {
    if (!state.selectedDocumentId) return;

    try {
      const jsonEditor = document.getElementById("jsonEditor");
      const newData = JSON.parse(jsonEditor.value);

      if (confirm("문서의 내용을 변경하시겠습니까?")) {
        showLoadingOverlay("문서 저장 중...");

        await state.db
          .collection("jsonData")
          .doc(state.selectedDocumentId)
          .set(newData);

        // 캐시 업데이트
        cache.guardians[state.selectedDocumentId] = {
          data: newData,
          timestamp: Date.now(),
        };

        hideLoadingOverlay();
        showNotification("문서가 성공적으로 업데이트되었습니다!", "success");

        cancelEditing();
        viewDocument(state.selectedDocumentId);
      }
    } catch (error) {
      hideLoadingOverlay();
      showNotification("저장 오류: " + error.message, "error");
      console.error("문서 저장 오류:", error);
    }
  }

  async function saveArrayOrder() {
    if (!state.selectedDocumentId) return;

    try {
      const jsonEditor = document.getElementById("jsonEditor");
      const newData = JSON.parse(jsonEditor.value);

      if (confirm("변경된 배열 순서를 저장하시겠습니까?")) {
        showLoadingOverlay("배열 순서 저장 중...");

        await state.db
          .collection("jsonData")
          .doc(state.selectedDocumentId)
          .set(newData);

        // 캐시 업데이트
        cache.guardians[state.selectedDocumentId] = {
          data: newData,
          timestamp: Date.now(),
        };

        hideLoadingOverlay();
        showNotification("배열 순서가 저장되었습니다!", "success");

        cancelEditing();
        viewDocument(state.selectedDocumentId);
      }
    } catch (error) {
      hideLoadingOverlay();
      showNotification("저장 오류: " + error.message, "error");
      console.error("문서 저장 오류:", error);
    }
  }

  function updateSelectedStatsDisplay() {
    const container = document.getElementById("selectedStatsContainer");
    if (!container) return;

    container.innerHTML = "";

    selectedStats.forEach((statKey) => {
      const statElement = document.createElement("div");
      statElement.className = "selected-stat";
      statElement.setAttribute("draggable", "true");
      statElement.setAttribute("data-stat-key", statKey);
      statElement.innerHTML = `
              <span class="drag-handle">⋮⋮</span>
              ${STATS_MAPPING[statKey] || statKey} (${statKey})
              <span class="remove-stat" onclick="FirestoreManager.removeSelectedStat('${statKey}')">×</span>
          `;

      statElement.addEventListener("dragstart", handleStatDragStart);
      statElement.addEventListener("dragover", handleStatDragOver);
      statElement.addEventListener("drop", handleStatDrop);
      statElement.addEventListener("dragend", handleStatDragEnd);

      container.appendChild(statElement);
    });
  }

  function handleStatDragStart(e) {
    draggedStatKey = this.getAttribute("data-stat-key");
    this.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
  }

  function handleStatDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = "move";
    return false;
  }

  function handleStatDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (draggedStatKey !== this.getAttribute("data-stat-key")) {
      const fromIndex = selectedStats.indexOf(draggedStatKey);
      const toIndex = selectedStats.indexOf(this.getAttribute("data-stat-key"));

      if (fromIndex !== -1 && toIndex !== -1) {
        selectedStats.splice(fromIndex, 1);
        selectedStats.splice(toIndex, 0, draggedStatKey);

        updateSelectedStatsDisplay();
        updateLevelContentForm(currentLevel);

        showStatsOrderNotification();
      }
    }

    return false;
  }

  function handleStatDragEnd() {
    this.style.opacity = "1";
    draggedStatKey = null;
  }

  function showStatsOrderNotification() {
    const notification = document.createElement("div");
    notification.className = "stat-order-notification";
    notification.innerHTML = `
          <span>능력치 순서가 변경되었습니다.</span>
          <span class="note">변경사항은 저장 시 모든 레벨에 적용됩니다.</span>
      `;

    const existingNotification = document.querySelector(
      ".stat-order-notification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    const container = document.querySelector(".stat-actions");
    if (container) {
      container.insertBefore(notification, container.firstChild);

      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
  }

  function handleInputGroupDragStart(e) {
    draggedInputGroup = this;
    draggedStatKey = this.getAttribute("data-stat-key");
    this.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
  }

  function handleInputGroupDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = "move";
    return false;
  }

  function handleInputGroupDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (draggedInputGroup !== this) {
      const targetStatKey = this.getAttribute("data-stat-key");
      const fromIndex = selectedStats.indexOf(draggedStatKey);
      const toIndex = selectedStats.indexOf(targetStatKey);

      if (fromIndex !== -1 && toIndex !== -1) {
        selectedStats.splice(fromIndex, 1);
        selectedStats.splice(toIndex, 0, draggedStatKey);

        updateSelectedStatsDisplay();
        updateLevelContentForm(currentLevel);

        showStatsOrderNotification();
      }
    }

    return false;
  }

  function handleInputGroupDragEnd() {
    this.style.opacity = "1";
    draggedInputGroup = null;
    draggedStatKey = null;
  }

  async function saveDataChanges() {
    if (!state.selectedDocumentId || !selectedGuardian) return;

    try {
      saveCurrentLevelInputs();

      showLoadingOverlay("환수 스탯 저장 중...");

      const jsonData = JSON.parse(document.getElementById("jsonEditor").value);

      if (!jsonData.data || !Array.isArray(jsonData.data)) {
        hideLoadingOverlay();
        showNotification("데이터 형식이 올바르지 않습니다.", "error");
        return;
      }

      const fileName = reverseDocumentMap[state.selectedDocumentId] || "";
      const statType = fileName.includes("-bind-")
        ? "bindStat"
        : "registrationStat";

      if (selectedGuardianIndex !== -1) {
        const guardian = jsonData.data[selectedGuardianIndex];

        while (guardian.stats.length <= 25) {
          guardian.stats.push({
            level: guardian.stats.length,
            [statType]: {},
          });
        }

        Object.keys(levelStats).forEach((level) => {
          const levelInt = parseInt(level);

          if (!guardian.stats[levelInt][statType]) {
            guardian.stats[levelInt][statType] = {};
          }

          const orderedStats = {};

          selectedStats.forEach((statKey) => {
            if (levelStats[level] && levelStats[level][statKey] !== undefined) {
              orderedStats[statKey] = levelStats[level][statKey];
            }
          });

          guardian.stats[levelInt][statType] = orderedStats;
        });

        document.getElementById("jsonEditor").value = JSON.stringify(
          jsonData,
          null,
          2
        );

        if (
          confirm(
            "환수 스탯 변경사항을 저장하시겠습니까? (능력치 순서 변경 포함)"
          )
        ) {
          await state.db
            .collection("jsonData")
            .doc(state.selectedDocumentId)
            .set(jsonData);

          // 캐시 업데이트
          cache.guardians[state.selectedDocumentId] = {
            data: jsonData,
            timestamp: Date.now(),
          };

          hideLoadingOverlay();
          showNotification("환수 스탯이 성공적으로 저장되었습니다!", "success");
          viewDocument(state.selectedDocumentId);
        } else {
          hideLoadingOverlay();
        }
      } else {
        hideLoadingOverlay();
        showNotification("환수 데이터를 찾을 수 없습니다.", "error");
      }
    } catch (error) {
      hideLoadingOverlay();
      showNotification("저장 오류: " + error.message, "error");
      console.error("환수 스탯 저장 오류:", error);
    }
  }

  function cancelEditing() {
    document.getElementById("selectedDocument").style.display = "block";
    document.getElementById("documentToolbar").style.display = "flex";
    document.getElementById("jsonEditorContainer").style.display = "none";

    selectedGuardian = null;
    selectedGuardianIndex = -1;
    selectedStats = [];
    currentLevel = 0;
    levelStats = {};
  }

  async function deleteSelectedDocument() {
    if (!state.selectedDocumentId) return;

    const fileName =
      reverseDocumentMap[state.selectedDocumentId] || state.selectedDocumentId;

    if (
      confirm(
        `문서 "${fileName}" (ID: ${state.selectedDocumentId})을(를) 삭제하시겠습니까?`
      )
    ) {
      showLoadingOverlay("문서 삭제 중...");

      try {
        await state.db
          .collection("jsonData")
          .doc(state.selectedDocumentId)
          .delete();

        // 캐시에서 제거
        delete cache.guardians[state.selectedDocumentId];
        cache.documents.timestamp = 0; // 문서 목록 캐시 무효화

        hideLoadingOverlay();
        showNotification(`문서 "${fileName}"이(가) 삭제되었습니다.`, "success");
        state.selectedDocumentId = null;

        refreshDocumentList();
        document.getElementById("selectedDocument").innerHTML =
          "<p class='select-message'>문서를 선택해주세요.</p>";
        document.getElementById("documentToolbar").style.display = "none";
      } catch (error) {
        hideLoadingOverlay();
        showNotification("문서 삭제 오류: " + error.message, "error");
        console.error("문서 삭제 오류:", error);
      }
    }
  }

  function renderGuardiansList() {
    const container = document.getElementById("guardiansList");
    if (!container) return;

    container.innerHTML = "";

    try {
      const jsonData = JSON.parse(document.getElementById("jsonEditor").value);

      if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
        const guardians = jsonData.data.filter((item) => item.name);

        if (guardians.length === 0) {
          container.innerHTML =
            "<p class='loading-message'>환수 데이터가 없습니다.</p>";
          return;
        }

        // 가상 스크롤링 구현
        const renderGuardians = (startIdx, endIdx) => {
          const fragment = document.createDocumentFragment();

          for (let i = startIdx; i < endIdx && i < guardians.length; i++) {
            const item = guardians[i];
            const index = jsonData.data.indexOf(item);

            const div = document.createElement("div");
            div.className = "guardian-item";
            div.setAttribute("data-index", index);
            div.textContent = `${item.name} ${
              item.grade ? `[${item.grade}]` : ""
            } ${item.type ? `(${item.type})` : ""}`;

            div.addEventListener("click", function () {
              document.querySelectorAll(".guardian-item").forEach((item) => {
                item.classList.remove("active");
              });

              this.classList.add("active");
              loadGuardianData(jsonData.data[index], index);
            });

            fragment.appendChild(div);
          }

          return fragment;
        };

        // 초기 렌더링 (최대 50개 항목)
        const initialLoadCount = Math.min(50, guardians.length);
        container.appendChild(renderGuardians(0, initialLoadCount));

        if (guardians.length > initialLoadCount) {
          // 스크롤 이벤트로 추가 항목 로드
          const loadMoreThreshold = 100;
          let nextLoadIndex = initialLoadCount;
          const batchSize = 20;

          container.addEventListener("scroll", () => {
            if (
              container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
                loadMoreThreshold &&
              nextLoadIndex < guardians.length
            ) {
              const endIndex = Math.min(
                nextLoadIndex + batchSize,
                guardians.length
              );
              container.appendChild(renderGuardians(nextLoadIndex, endIndex));
              nextLoadIndex = endIndex;
            }
          });
        }
      } else {
        container.innerHTML =
          "<p class='loading-message'>환수 데이터를 찾을 수 없습니다.</p>";
      }
    } catch (error) {
      container.innerHTML = `<p class="error">환수 데이터 로드 오류: ${error.message}</p>`;
      showNotification("환수 데이터 로드 오류: " + error.message, "error");
    }
  }

  function updateLevelContentForm(level) {
    const contentDiv = document.getElementById(`level-content-${level}`);
    if (!contentDiv) return;

    contentDiv.innerHTML = `<h4>레벨 ${level} 능력치</h4>`;

    selectedStats.forEach((statKey) => {
      const koreanName = STATS_MAPPING[statKey] || statKey;
      const value =
        levelStats[level] && levelStats[level][statKey]
          ? levelStats[level][statKey]
          : "";

      const inputGroup = document.createElement("div");
      inputGroup.className = "stat-input-group";
      inputGroup.setAttribute("draggable", "true");
      inputGroup.setAttribute("data-stat-key", statKey);

      inputGroup.innerHTML = `
              <span class="drag-handle">⋮⋮</span>
              <label for="stat-${level}-${statKey}">${koreanName}:</label>
              <input type="text" id="stat-${level}-${statKey}" value="${value}" placeholder="값 입력">
          `;

      inputGroup.addEventListener("dragstart", handleInputGroupDragStart);
      inputGroup.addEventListener("dragover", handleInputGroupDragOver);
      inputGroup.addEventListener("drop", handleInputGroupDrop);
      inputGroup.addEventListener("dragend", handleInputGroupDragEnd);

      contentDiv.appendChild(inputGroup);
    });
  }

  function initStatDropdown() {
    const dropdown = document.getElementById("statSearchDropdown");
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">-- 추가할 능력치 선택 --</option>';

    const statItems = Object.entries(STATS_MAPPING).sort((a, b) =>
      a[1].localeCompare(b[1], "ko")
    );

    statItems.forEach(([engKey, korName]) => {
      const option = document.createElement("option");
      option.value = engKey;
      option.textContent = `${korName} (${engKey})`;
      dropdown.appendChild(option);
    });
  }

  function addSelectedStat() {
    const dropdown = document.getElementById("statSearchDropdown");

    if (!dropdown || dropdown.value === "") return;

    const engKey = dropdown.value;

    if (selectedStats.includes(engKey)) {
      showNotification(
        `이미 추가된 능력치입니다: ${STATS_MAPPING[engKey] || engKey}`,
        "warning"
      );
      return;
    }

    selectedStats.push(engKey);
    updateSelectedStatsDisplay();
    updateLevelContentForm(currentLevel);

    showNotification(
      `능력치가 추가되었습니다: ${STATS_MAPPING[engKey] || engKey}`,
      "success",
      1500
    );
  }

  function removeSelectedStat(engKey) {
    selectedStats = selectedStats.filter((key) => key !== engKey);
    updateSelectedStatsDisplay();

    Object.keys(levelStats).forEach((level) => {
      if (levelStats[level] && levelStats[level][engKey]) {
        delete levelStats[level][engKey];
      }
    });

    updateLevelContentForm(currentLevel);
    showNotification(
      `능력치가 제거되었습니다: ${STATS_MAPPING[engKey] || engKey}`,
      "info",
      1500
    );
  }

  function initLevelTabs() {
    const tabsContainer = document.querySelector(".level-tabs");
    const contentContainer = document.querySelector(".level-content-container");

    if (!tabsContainer || !contentContainer) return;

    tabsContainer.innerHTML = "";
    contentContainer.innerHTML = "";

    for (let i = 0; i <= 25; i++) {
      const tabButton = document.createElement("div");
      tabButton.className = `level-tab ${i === 0 ? "active" : ""}`;
      tabButton.textContent = `레벨 ${i}`;
      tabButton.onclick = function () {
        saveCurrentLevelInputs();
        activateLevel(i);
      };
      tabsContainer.appendChild(tabButton);

      const contentDiv = document.createElement("div");
      contentDiv.className = `level-content ${i === 0 ? "active" : ""}`;
      contentDiv.id = `level-content-${i}`;
      contentContainer.appendChild(contentDiv);
    }
  }

  function saveCurrentLevelInputs() {
    if (!levelStats[currentLevel]) {
      levelStats[currentLevel] = {};
    }

    selectedStats.forEach((statKey) => {
      const input = document.getElementById(`stat-${currentLevel}-${statKey}`);
      if (input && input.value.trim() !== "") {
        levelStats[currentLevel][statKey] = input.value.trim();
      } else if (
        input &&
        input.value.trim() === "" &&
        levelStats[currentLevel][statKey]
      ) {
        delete levelStats[currentLevel][statKey];
      }
    });
  }

  function activateLevel(level) {
    document
      .querySelectorAll(".level-tab")
      .forEach((tab) => tab.classList.remove("active"));
    document
      .querySelectorAll(".level-content")
      .forEach((content) => content.classList.remove("active"));

    const tabs = document.querySelectorAll(".level-tab");
    if (tabs[level]) {
      tabs[level].classList.add("active");
    }

    const contentDiv = document.getElementById(`level-content-${level}`);
    if (contentDiv) {
      contentDiv.classList.add("active");
    }

    currentLevel = level;
    updateLevelContentForm(level);
  }

  function goToPreviousLevel() {
    if (currentLevel > 0) {
      saveCurrentLevelInputs();
      activateLevel(currentLevel - 1);
    }
  }

  function goToNextLevel() {
    if (currentLevel < 25) {
      saveCurrentLevelInputs();
      activateLevel(currentLevel + 1);
    }
  }

  function copyPreviousLevelStats() {
    if (currentLevel > 0) {
      saveCurrentLevelInputs();

      const prevLevel = currentLevel - 1;
      if (levelStats[prevLevel]) {
        levelStats[currentLevel] = { ...levelStats[prevLevel] };
        updateLevelContentForm(currentLevel);
        showNotification(
          `레벨 ${prevLevel}의 능력치를 복사했습니다.`,
          "success",
          1500
        );
      } else {
        showNotification(
          `레벨 ${prevLevel}에 복사할 능력치가 없습니다.`,
          "warning",
          1500
        );
      }
    } else {
      showNotification("이전 레벨이 없습니다.", "info", 1500);
    }
  }

  function parseInput(input) {
    const result = {
      parseSteps: [],
      success: false,
      guardianName: "",
      level: null,
      stats: {},
      errors: [],
      statMappingDetails: [],
    };

    try {
      if (!input.trim()) {
        result.errors.push("입력이 비어있습니다.");
        return result;
      }

      const lines = input
        .trim()
        .split(/\n+/)
        .filter((line) => line.trim() !== "");
      result.parseSteps.push({
        step: "입력 분리",
        value: lines,
      });

      if (lines.length < 1) {
        result.errors.push("입력이 비어있습니다.");
        return result;
      }

      result.guardianName = lines[0].trim();
      result.parseSteps.push({
        step: "환수 이름 추출",
        value: result.guardianName,
      });

      if (!result.guardianName) {
        result.errors.push("환수 이름을 추출할 수 없습니다.");
        return result;
      }

      let levelLine = lines.length > 1 ? lines[1].trim() : "";
      let statsText = "";
      let lineIndex = 2;

      const levelMatch = levelLine.match(/(\d+)\s*레벨/);
      if (levelMatch) {
        result.level = parseInt(levelMatch[1]);
        result.parseSteps.push({
          step: "레벨 추출",
          value: result.level,
        });

        statsText = levelLine.substring(levelMatch[0].length).trim();

        if (statsText) {
          result.parseSteps.push({
            step: "한 줄 스탯 정보 감지",
            value: statsText,
          });

          parseStatsFromText(statsText, result);
        }
      } else {
        const simpleLevelMatch = levelLine.match(/^(\d+)/);
        if (simpleLevelMatch) {
          result.level = parseInt(simpleLevelMatch[1]);
          result.parseSteps.push({
            step: "레벨 추출",
            value: result.level,
          });

          statsText = levelLine.substring(simpleLevelMatch[0].length).trim();

          if (statsText) {
            result.parseSteps.push({
              step: "한 줄 스탯 정보 감지",
              value: statsText,
            });

            parseStatsFromText(statsText, result);
          }
        } else if (lines.length === 1) {
          result.level = 0;
          parseStatsFromText(lines[0], result);
          lineIndex = 1;
        }
      }

      if (result.level === null) {
        result.level = 0;
        result.parseSteps.push({
          step: "레벨 기본값 설정",
          value: result.level,
        });
      }

      for (let i = lineIndex; i < lines.length; i++) {
        parseStatsFromLine(lines[i], result);
      }

      result.parseSteps.push({
        step: "스탯 추출 완료",
        value: result.stats,
      });

      result.success = true;
      return result;
    } catch (error) {
      result.errors.push(`파싱 오류: ${error.message}`);
      return result;
    }
  }

  function parseStatsFromText(text, result) {
    const korToEng = {};
    for (const [engKey, korName] of Object.entries(STATS_MAPPING)) {
      korToEng[korName] = engKey;
      korToEng[korName.replace(/\s+/g, "")] = engKey;
    }

    const sortedStatNames = Object.keys(korToEng).sort(
      (a, b) => b.length - a.length
    );

    let remainingText = text;
    let matchFound = true;

    while (remainingText && matchFound) {
      matchFound = false;

      for (const korStatName of sortedStatNames) {
        const pattern = new RegExp(
          `${korStatName}\\s*(\\d+(?:,\\d+)?(?:\\.\\d+)?)`,
          "i"
        );
        const match = remainingText.match(pattern);

        if (match) {
          const statValue = match[1].replace(/,/g, "");
          const engKey =
            korToEng[korStatName] || korToEng[korStatName.replace(/\s+/g, "")];

          if (engKey) {
            result.stats[engKey] = statValue;
            result.statMappingDetails.push({
              korean: korStatName,
              english: engKey,
              value: statValue,
              method: "텍스트 내 패턴 매칭",
            });

            remainingText = remainingText.replace(match[0], "").trim();
            matchFound = true;
            break;
          }
        }
      }

      if (!matchFound && remainingText) {
        const generalMatch = remainingText.match(
          /([가-힣%\s]+)(\d+(?:,\d+)?(?:\.\d+)?)/
        );
        if (generalMatch) {
          const korStatName = generalMatch[1].trim();
          const statValue = generalMatch[2].replace(/,/g, "");

          let engKey = korToEng[korStatName];
          let matchMethod = "정확한 매칭";

          if (!engKey) {
            const noSpaceName = korStatName.replace(/\s+/g, "");
            engKey = korToEng[noSpaceName];
            if (engKey) matchMethod = "공백 제거 후 매칭";
          }

          if (!engKey) {
            for (const [korName, eng] of Object.entries(korToEng)) {
              if (
                korName.includes(korStatName) ||
                korStatName.includes(korName)
              ) {
                engKey = eng;
                matchMethod = `부분 문자열 매칭: ${korName}`;
                break;
              }

              const noSpaceName = korStatName.replace(/\s+/g, "");
              const noSpaceKorName = korName.replace(/\s+/g, "");
              if (
                noSpaceName === noSpaceKorName ||
                noSpaceKorName.includes(noSpaceName) ||
                noSpaceName.includes(noSpaceKorName)
              ) {
                engKey = eng;
                matchMethod = `공백 제거 후 부분 매칭: ${korName}`;
                break;
              }
            }
          }

          if (engKey) {
            result.stats[engKey] = statValue;
            result.statMappingDetails.push({
              korean: korStatName,
              english: engKey,
              value: statValue,
              method: matchMethod,
            });

            remainingText = remainingText.replace(generalMatch[0], "").trim();
            matchFound = true;
          } else {
            result.parseSteps.push({
              step: "매핑 실패",
              value: `스탯 "${korStatName}" 매핑 실패`,
            });
            remainingText = remainingText.replace(generalMatch[0], "").trim();
            matchFound = true;
          }
        }
      }
    }
  }

  function parseStatsFromLine(line, result) {
    const match = line.match(/^(.*?)(\d+(?:,\d+)?(?:\.\d+)?)$/);
    if (!match) return;

    const korStatName = match[1].trim();
    const statValue = match[2].replace(/,/g, "");

    let engKey = null;
    let matchMethod = null;

    for (const [eng, kor] of Object.entries(STATS_MAPPING)) {
      if (kor === korStatName) {
        engKey = eng;
        matchMethod = "정확한 매칭";
        break;
      }

      if (kor.replace(/\s+/g, "") === korStatName.replace(/\s+/g, "")) {
        engKey = eng;
        matchMethod = "공백 제거 후 매칭";
        break;
      }

      if (kor.includes(korStatName) || korStatName.includes(kor)) {
        engKey = eng;
        matchMethod = `부분 문자열 매칭: ${kor}`;
        break;
      }

      const noSpaceName = korStatName.replace(/\s+/g, "");
      const noSpaceKor = kor.replace(/\s+/g, "");
      if (
        noSpaceName === noSpaceKor ||
        noSpaceKor.includes(noSpaceName) ||
        noSpaceName.includes(noSpaceKor)
      ) {
        engKey = eng;
        matchMethod = `공백 제거 후 부분 매칭: ${kor}`;
        break;
      }
    }

    if (engKey) {
      result.stats[engKey] = statValue;
      result.statMappingDetails.push({
        korean: korStatName,
        english: engKey,
        value: statValue,
        method: matchMethod,
      });
    } else {
      result.parseSteps.push({
        step: "매핑 실패",
        value: `스탯 "${korStatName}" 매핑 실패`,
      });
    }
  }

  function parseStatsSeriesInput(input) {
    const result = {
      success: false,
      guardianName: "",
      statSeries: {},
      errors: [],
      debug: [],
    };

    try {
      const lines = input
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
      if (lines.length === 0) {
        result.errors.push("입력이 비어있습니다.");
        return result;
      }

      result.debug.push("입력 줄 수: " + lines.length);
      const firstLineParts = lines[0].split("\t");
      result.guardianName = firstLineParts[0].trim();
      result.debug.push("추출된 환수 이름: " + result.guardianName);

      let lastStatName = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        result.debug.push("처리 중인 줄 " + (i + 1) + ": " + line);
        const parts = line.split("\t");
        result.debug.push("분할된 부분 수: " + parts.length);

        const startIdx = i === 0 ? 1 : 0;

        for (let j = startIdx; j < parts.length; j++) {
          const part = parts[j].replace(/"/g, "").trim();
          if (!part) {
            result.debug.push("빈 부분 건너뜀: 인덱스 " + j);
            continue;
          }
          result.debug.push("처리 중인 부분: " + part);

          if (part.match(/^\d+(?:,\d+)*,?$/)) {
            result.debug.push("값 형식 감지됨: " + part);
            if (lastStatName) {
              const values = part
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v !== "");
              result.debug.push("추출된 값 배열: " + values.join(", "));

              const normalizedStatName = lastStatName.replace(/\s+/g, "");
              result.debug.push("정규화된 스탯 이름: " + normalizedStatName);
              let foundKey = null;

              for (const [engKey, korName] of Object.entries(STATS_MAPPING)) {
                if (korName.replace(/\s+/g, "") === normalizedStatName) {
                  foundKey = engKey;
                  result.debug.push("매칭된 영어 키: " + engKey);
                  break;
                }
              }

              if (foundKey) {
                result.statSeries[foundKey] = values;
                result.debug.push(
                  "매핑 성공: '" +
                    lastStatName +
                    "' → '" +
                    foundKey +
                    "', 값 " +
                    values.length +
                    "개"
                );
              } else {
                result.debug.push(
                  "매핑 실패: '" + lastStatName + "'에 대한 매핑을 찾을 수 없음"
                );
              }

              lastStatName = null;
            } else {
              result.debug.push("이전 스탯 이름 없음, 값 무시: " + part);
            }
          } else {
            lastStatName = part;
            result.debug.push("스탯 이름으로 저장됨: " + part);
          }
        }
      }

      if (Object.keys(result.statSeries).length === 0) {
        result.errors.push("스탯 정보를 추출할 수 없습니다.");
        return result;
      }

      result.success = true;
      return result;
    } catch (error) {
      result.errors.push(`파싱 오류: ${error.message}`);
      console.error("Parsing error:", error);
      result.debug.push("에러 발생: " + error.message);
      result.debug.push("스택 트레이스: " + error.stack);
      return result;
    }
  }

  function previewStatsSeries() {
    const input = document.getElementById("statInput").value.trim();
    const previewDiv = document.getElementById("parsingPreview");
    const statusDiv = document.getElementById("statUpdateStatus");
    const docFileName = document.getElementById("documentSelect").value;

    statusDiv.style.display = "none";

    if (!input) {
      previewDiv.innerHTML = '<p class="error">입력이 비어있습니다.</p>';
      previewDiv.style.display = "block";
      return;
    }

    const result = parseStatsSeriesInput(input);
    let html = "<h3>레벨별 스탯 파싱 결과</h3>";

    html += `
          <details style="margin-bottom: 15px;">
              <summary style="cursor: pointer; padding: 8px; background-color: #f2f2f2; border-radius: 4px;">디버그 정보 보기</summary>
              <div style="padding: 10px; border: 1px solid #ddd; border-radius: 0 0 4px 4px; margin-top: 5px; background-color: #f9f9f9; max-height: 300px; overflow-y: auto;">
                  <h4>파싱 단계:</h4>
                  <ol>
                      ${
                        result.debug
                          ? result.debug.map((d) => `<li>${d}</li>`).join("")
                          : ""
                      }
                  </ol>
              </div>
          </details>
      `;

    if (result.success) {
      html += `
              <div class="parsing-step">
                  <div class="key-value">
                      <div class="key">환수 이름:</div>
                      <div class="value">${result.guardianName}</div>
                  </div>
                  <div class="key-value">
                      <div class="key">스탯 개수:</div>
                      <div class="value">${
                        Object.keys(result.statSeries).length
                      }</div>
                  </div>
              </div>
          `;

      const isBindStat = docFileName.includes("-bind-");
      const statKey = isBindStat ? "bindStat" : "registrationStat";

      const statsObject = {};
      const maxLevel = Math.max(
        ...Object.values(result.statSeries).map((arr) => arr.length - 1)
      );

      for (let level = 0; level <= maxLevel; level++) {
        const statsForLevel = {};
        let hasStatsForLevel = false;

        for (const [statKey, values] of Object.entries(result.statSeries)) {
          if (level < values.length && values[level] !== "") {
            statsForLevel[statKey] = values[level];
            hasStatsForLevel = true;
          }
        }

        if (hasStatsForLevel) {
          statsObject[level] = statsForLevel;
        }
      }

      const jsonObj = {};
      jsonObj[statKey] = statsObject;
      jsonObj["name"] = result.guardianName;

      const jsonStr = JSON.stringify(jsonObj, null, 2).replace(/'/g, "\\'");
      html += `
              <div class="parsing-step" style="background-color: #f0f8ff; border: 1px solid #4285f4; margin-bottom: 15px;">
                  <h4 style="margin-top: 0; color: #4285f4;">
                      JSON 형식 미리보기 (${statKey})
                      <button onclick="FirestoreManager.copyToClipboard('${jsonStr.replace(
                        /"/g,
                        '\\"'
                      )}');" style="margin-left: 10px; padding: 3px 8px; font-size: 0.8em;">클립보드에 복사</button>
                  </h4>
                  <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px;">${jsonStr}</pre>
              </div>
          `;

      html += `<div class="parsing-step" style="background-color: #f0f8ff; border: 1px solid #4285f4;">
              <h4 style="margin-top: 0; color: #4285f4;">파싱된 레벨별 스탯 정보</h4>
              <div style="max-height: 400px; overflow-y: auto;">
          `;

      for (const [statKey, values] of Object.entries(result.statSeries)) {
        const koreanName = STATS_MAPPING[statKey] || statKey;

        html += `<div style="margin-bottom: 15px;">
                  <h5>${koreanName} (${statKey})</h5>
                  <table style="width: 100%; border-collapse: collapse;">
                      <tr style="background-color: #e6f2ff;">
                          <th style="padding: 5px; border: 1px solid #b8daff;">레벨</th>
                          <th style="padding: 5px; border: 1px solid #b8daff;">값</th>
                      </tr>
              `;

        values.forEach((value, index) => {
          html += `
                      <tr>
                          <td style="padding: 5px; border: 1px solid #b8daff; text-align: center;">${index}</td>
                          <td style="padding: 5px; border: 1px solid #b8daff; text-align: center;">${
                            value || "-"
                          }</td>
                      </tr>
                  `;
        });

        html += `</table></div>`;
      }

      html += `</div></div>`;

      html += `
              <div class="success" style="margin-top: 15px; padding: 10px;">
                  <strong>파싱 성공!</strong><br>
                  환수 이름: ${result.guardianName}<br>
                  스탯 종류: ${Object.keys(result.statSeries).length}개<br>
                  레벨 범위: 0-${maxLevel}<br>
                  스탯 타입: ${statKey}
              </div>
          `;
    } else {
      html += `<div class="error" style="margin-top: 15px; padding: 10px;">
              <strong>오류:</strong><br>
              ${result.errors.map((err) => `- ${err}`).join("<br>")}
          </div>`;
    }

    previewDiv.innerHTML = html;
    previewDiv.style.display = "block";
  }

  async function updateStatsSeries() {
    const input = document.getElementById("statInput").value.trim();
    const docFileName = document.getElementById("documentSelect").value;
    const statusDiv = document.getElementById("statUpdateStatus");
    const resultsDiv = document.getElementById("updateResults");
    const previewDiv = document.getElementById("parsingPreview");

    previewDiv.style.display = "none";
    statusDiv.style.display = "block";
    statusDiv.className = "info";
    statusDiv.textContent = "레벨별 스탯 정보 처리 중...";
    resultsDiv.innerHTML = "";

    if (!input) {
      statusDiv.className = "error";
      statusDiv.textContent = "스탯 정보를 입력해주세요.";
      showNotification("스탯 정보를 입력해주세요.", "error");
      return;
    }

    if (!docFileName) {
      statusDiv.className = "error";
      statusDiv.textContent = "대상 문서를 선택해주세요.";
      showNotification("대상 문서를 선택해주세요.", "error");
      return;
    }

    const docId = DOCUMENT_MAP[docFileName];
    if (!docId) {
      statusDiv.className = "error";
      statusDiv.textContent = "유효하지 않은 문서입니다.";
      showNotification("유효하지 않은 문서입니다.", "error");
      return;
    }

    showLoadingOverlay("레벨별 스탯 정보 처리 중...");
    updateLoadingProgress(10);

    try {
      console.log("Input data:", input);
      const parsedResult = parseStatsSeriesInput(input);
      console.log("Parsed result:", parsedResult);
      updateLoadingProgress(30);

      if (!parsedResult.success) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent =
          "입력 파싱에 실패했습니다: " + parsedResult.errors.join(", ");
        showNotification(
          "입력 파싱에 실패했습니다: " + parsedResult.errors.join(", "),
          "error"
        );
        return;
      }

      const { guardianName, statSeries } = parsedResult;
      updateLoadingProgress(50);

      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[docId] &&
        cache.guardians[docId].timestamp &&
        Date.now() - cache.guardians[docId].timestamp < CACHE_DURATION
      ) {
        docData = cache.guardians[docId].data;
      } else {
        const docRef = state.db.collection("jsonData").doc(docId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
          docData = docSnapshot.data();

          // 캐시 업데이트
          cache.guardians[docId] = {
            data: docData,
            timestamp: Date.now(),
          };
        }
      }

      if (!docData) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName} (ID: ${docId})`;
        showNotification(`문서를 찾을 수 없습니다: ${docFileName}`, "error");
        return;
      }

      if (!docData.data || !Array.isArray(docData.data)) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = "문서 형식이 올바르지 않습니다.";
        showNotification("문서 형식이 올바르지 않습니다.", "error");
        return;
      }

      console.log(
        `문서 ${docFileName} (ID: ${docId})에서 환수 "${guardianName}" 찾는 중...`
      );
      console.log(
        `문서에 있는 환수 목록:`,
        docData.data.map((g) => g.name)
      );
      updateLoadingProgress(70);

      let foundGuardian = null;
      let guardianIndex = -1;

      for (let i = 0; i < docData.data.length; i++) {
        if (docData.data[i].name === guardianName) {
          foundGuardian = docData.data[i];
          guardianIndex = i;
          console.log(
            `환수를 찾았습니다! 인덱스: ${i}, 이름: ${docData.data[i].name}`
          );
          break;
        } else {
          console.log(
            `환수 이름 불일치: "${docData.data[i].name}" !== "${guardianName}"`
          );
        }
      }

      if (guardianIndex === -1) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        let errorMsg = `문서 "${docFileName}" (ID: ${docId})에서 환수 "${guardianName}"를 찾을 수 없습니다.`;

        errorMsg += "<br><br><strong>현재 문서에 있는 환수 목록:</strong><br>";
        errorMsg +=
          '<div style="max-height: 200px; overflow-y: auto; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">';
        if (docData.data.length > 0) {
          errorMsg += '<ul style="padding-left: 20px;">';
          docData.data.forEach((guardian) => {
            errorMsg += `<li>${guardian.name}</li>`;
          });
          errorMsg += "</ul>";
        } else {
          errorMsg += "<p>문서에 환수 데이터가 없습니다.</p>";
        }
        errorMsg += "</div>";

        errorMsg += "<p>정확한 이름으로 다시 시도해주세요.</p>";

        statusDiv.innerHTML = errorMsg;
        showNotification(`환수 "${guardianName}"를 찾을 수 없습니다.`, "error");
        return;
      }

      previousGuardianData = JSON.parse(JSON.stringify(foundGuardian));
      const statType = docFileName.includes("-bind-")
        ? "bindStat"
        : "registrationStat";

      const existingLevels = [];
      const maxLevel = Math.max(
        ...Object.values(statSeries).map((values) => values.length - 1)
      );

      for (let level = 0; level <= maxLevel; level++) {
        let hasDataForLevel = false;
        for (const [statKey, values] of Object.entries(statSeries)) {
          if (level < values.length && values[level] && values[level] !== "") {
            hasDataForLevel = true;
            break;
          }
        }

        if (
          hasDataForLevel &&
          foundGuardian.stats &&
          foundGuardian.stats[level] &&
          foundGuardian.stats[level][statType] &&
          Object.keys(foundGuardian.stats[level][statType]).length > 0
        ) {
          existingLevels.push(level);
        }
      }

      resultsDiv.innerHTML = `
              <div class="doc-info" style="margin-bottom: 15px; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #1e88e5; border-radius: 6px;">
                  <h4 style="margin-top: 0;">현재 작업 정보</h4>
                  <p><strong>문서:</strong> ${docFileName} (ID: ${docId})</p>
                  <p><strong>환수:</strong> ${foundGuardian.name} (${
        foundGuardian.grade || ""
      } ${foundGuardian.type || ""})</p>
                  <p><strong>스탯 타입:</strong> ${
                    statType === "bindStat" ? "장착 스탯" : "등록 스탯"
                  }</p>
                  <p><strong>업데이트할 레벨:</strong> 0 ~ ${maxLevel}</p>
                  ${
                    existingLevels.length > 0
                      ? `<p><strong>기존 데이터가 있는 레벨:</strong> ${existingLevels.join(
                          ", "
                        )}</p>`
                      : ""
                  }
              </div>
          `;
      updateLoadingProgress(90);

      if (existingLevels.length > 0) {
        hideLoadingOverlay();

        const modalHTML = `
                  <div id="updateConfirmModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                      background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; justify-content: center; align-items: center;">
                      <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 80%; max-height: 80%; overflow-y: auto;">
                          <h3>기존 데이터가 있는 레벨이 발견되었습니다</h3>
                          <p>환수 <strong>${
                            foundGuardian.name
                          }</strong>의 다음 레벨에 이미 스탯 정보가 있습니다:</p>
                          <div style="max-height: 200px; overflow-y: auto; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                              ${existingLevels
                                .map((level) => {
                                  const levelStats =
                                    foundGuardian.stats[level][statType];
                                  return `
                                      <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                                          <strong>레벨 ${level}:</strong> 
                                          ${Object.entries(levelStats)
                                            .map(
                                              ([key, value]) =>
                                                `${
                                                  STATS_MAPPING[key] || key
                                                }: ${value}`
                                            )
                                            .join(", ")}
                                      </div>
                                  `;
                                })
                                .join("")}
                          </div>
                          <p>어떻게 진행하시겠습니까?</p>
                          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; margin-top: 15px; gap: 10px;">
                              <button id="overwriteAll" style="padding: 10px 15px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                  모두 덮어쓰기
                              </button>
                              <button id="skipExisting" style="padding: 10px 15px; background-color: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
                                  기존 데이터 유지 (충돌하는 레벨 건너뛰기)
                              </button>
                              <button id="mergeData" style="padding: 10px 15px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                  데이터 병합 (기존 + 신규)
                              </button>
                              <button id="cancelUpdate" style="padding: 10px 15px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                  취소
                              </button>
                          </div>
                      </div>
                  </div>
              `;

        document.body.insertAdjacentHTML("beforeend", modalHTML);

        const userChoice = await new Promise((resolve) => {
          document
            .getElementById("overwriteAll")
            .addEventListener("click", () => {
              document.getElementById("updateConfirmModal").remove();
              resolve("overwrite");
            });

          document
            .getElementById("skipExisting")
            .addEventListener("click", () => {
              document.getElementById("updateConfirmModal").remove();
              resolve("skip");
            });

          document.getElementById("mergeData").addEventListener("click", () => {
            document.getElementById("updateConfirmModal").remove();
            resolve("merge");
          });

          document
            .getElementById("cancelUpdate")
            .addEventListener("click", () => {
              document.getElementById("updateConfirmModal").remove();
              resolve("cancel");
            });
        });

        if (userChoice === "cancel") {
          statusDiv.className = "info";
          statusDiv.textContent = "업데이트가 취소되었습니다.";
          showNotification("업데이트가 취소되었습니다.", "info");
          return;
        }

        showLoadingOverlay("레벨별 스탯 업데이트 중...");
        const docRef = state.db.collection("jsonData").doc(docId);
        await updateGuardianStats(
          docRef,
          docData,
          guardianIndex,
          foundGuardian.name,
          statSeries,
          statType,
          userChoice,
          existingLevels
        );
      } else {
        const docRef = state.db.collection("jsonData").doc(docId);
        await updateGuardianStats(
          docRef,
          docData,
          guardianIndex,
          foundGuardian.name,
          statSeries,
          statType,
          "overwrite",
          []
        );
      }
    } catch (error) {
      hideLoadingOverlay();
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      showNotification("오류 발생: " + error.message, "error");
      console.error("레벨별 스탯 업데이트 오류:", error);
    }
  }

  async function updateGuardianStats(
    docRef,
    data,
    guardianIndex,
    guardianName,
    statSeries,
    statType,
    updateMode,
    existingLevels
  ) {
    const statusDiv = document.getElementById("statUpdateStatus");
    const resultsDiv = document.getElementById("updateResults");

    try {
      const updatedData = JSON.parse(JSON.stringify(data));
      const changes = { added: {}, modified: {}, removed: {}, skipped: {} };

      const maxLevel = Math.max(
        ...Object.values(statSeries).map((values) => values.length - 1)
      );
      const totalSteps = maxLevel + 1;
      let currentStep = 0;

      if (!updatedData.data[guardianIndex].stats) {
        updatedData.data[guardianIndex].stats = [];
      }

      // 먼저 필요한 레벨 배열을 확장
      while (updatedData.data[guardianIndex].stats.length <= maxLevel) {
        const level = updatedData.data[guardianIndex].stats.length;
        updatedData.data[guardianIndex].stats.push({
          level: level,
          [statType]: {},
        });
      }

      updateLoadingProgress(40);

      // 청크 단위로 처리하여 UI 블로킹 방지
      const CHUNK_SIZE = 5;
      for (
        let levelChunkStart = 0;
        levelChunkStart <= maxLevel;
        levelChunkStart += CHUNK_SIZE
      ) {
        const levelChunkEnd = Math.min(
          levelChunkStart + CHUNK_SIZE - 1,
          maxLevel
        );

        // 각 레벨을 처리
        for (let level = levelChunkStart; level <= levelChunkEnd; level++) {
          if (updateMode === "skip" && existingLevels.includes(level)) {
            changes.skipped[level] = {
              ...updatedData.data[guardianIndex].stats[level][statType],
            };
            continue;
          }

          if (!updatedData.data[guardianIndex].stats[level][statType]) {
            updatedData.data[guardianIndex].stats[level][statType] = {};
          }

          if (updateMode !== "merge") {
            const existingStats = {
              ...updatedData.data[guardianIndex].stats[level][statType],
            };
            if (Object.keys(existingStats).length > 0) {
              for (const key in existingStats) {
                if (!changes.removed[level]) changes.removed[level] = {};
                changes.removed[level][key] = existingStats[key];
              }
            }

            updatedData.data[guardianIndex].stats[level][statType] = {};
          }

          let hasDataForLevel = false;
          for (const [statKey, values] of Object.entries(statSeries)) {
            if (
              level < values.length &&
              values[level] &&
              values[level] !== ""
            ) {
              const oldValue =
                updatedData.data[guardianIndex].stats[level][statType][statKey];

              if (!oldValue) {
                if (!changes.added[level]) changes.added[level] = {};
                changes.added[level][statKey] = values[level];
              } else if (oldValue !== values[level]) {
                if (!changes.modified[level]) changes.modified[level] = {};
                changes.modified[level][statKey] = {
                  from: oldValue,
                  to: values[level],
                };
              }

              updatedData.data[guardianIndex].stats[level][statType][statKey] =
                values[level];
              hasDataForLevel = true;
            }
          }

          currentStep++;
          updateLoadingProgress(
            40 + Math.floor((currentStep / totalSteps) * 50)
          );
        }

        // 각 청크 처리 후 UI 스레드에 제어권을 넘김
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // 파이어스토어에 저장
      updateLoadingProgress(95);
      await docRef.set(updatedData);

      // 캐시 업데이트
      cache.guardians[docRef.id] = {
        data: updatedData,
        timestamp: Date.now(),
      };

      updatedGuardianData = updatedData.data[guardianIndex];

      hideLoadingOverlay();

      statusDiv.className = "success";
      if (updateMode === "overwrite") {
        statusDiv.textContent = `환수 "${guardianName}"의 모든 레벨별 스탯이 덮어쓰기 되었습니다.`;
        showNotification(
          `환수 "${guardianName}"의 모든 레벨별 스탯이 덮어쓰기 되었습니다.`,
          "success"
        );
      } else if (updateMode === "skip") {
        statusDiv.textContent = `환수 "${guardianName}"의 스탯이 업데이트되었습니다. (${existingLevels.length}개 레벨은 건너뛰었습니다)`;
        showNotification(
          `환수 "${guardianName}"의 스탯이 업데이트되었습니다. (${existingLevels.length}개 레벨은 건너뛰었습니다)`,
          "success"
        );
      } else {
        statusDiv.textContent = `환수 "${guardianName}"의 레벨별 스탯이 병합되었습니다.`;
        showNotification(
          `환수 "${guardianName}"의 레벨별 스탯이 병합되었습니다.`,
          "success"
        );
      }

      displayDiff(changes, guardianName, statType, updateMode, existingLevels);
    } catch (error) {
      hideLoadingOverlay();
      statusDiv.className = "error";
      statusDiv.textContent = `스탯 업데이트 오류: ${error.message}`;
      showNotification("스탯 업데이트 오류: " + error.message, "error");
      throw error;
    }
  }

  function displayDiff(
    changes,
    guardianName,
    statType,
    updateMode,
    existingLevels
  ) {
    const resultsDiv = document.getElementById("updateResults");

    let html = `
          <div class="diff-container" style="margin-top: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background-color: white;">
              <h4>변경 내역: ${guardianName} (${
      statType === "bindStat" ? "장착 스탯" : "등록 스탯"
    })</h4>
              <button onclick="FirestoreManager.revertChanges()" class="warning" style="margin-bottom: 15px;">
                  <span class="btn-icon">↩</span> 변경 사항 되돌리기
              </button>
              
              <div class="update-mode-info" style="margin: 15px 0; padding: 12px; background-color: #f8f9fa; border-left: 4px solid #6c757d; border-radius: 4px;">
                  <strong>업데이트 모드:</strong> ${
                    updateMode === "overwrite"
                      ? "모두 덮어쓰기"
                      : updateMode === "skip"
                      ? "기존 데이터 유지 (충돌하는 레벨 건너뛰기)"
                      : "데이터 병합 (기존 + 신규)"
                  }
                  ${
                    existingLevels.length > 0
                      ? `<br><strong>충돌 레벨:</strong> ${existingLevels.join(
                          ", "
                        )}`
                      : ""
                  }
              </div>
      `;

    if (Object.keys(changes.skipped).length > 0) {
      html += `<div class="skipped-stats" style="margin-top: 15px;">
              <h5 style="color: #6c757d; border-bottom: 1px solid #dee2e6; padding-bottom: 8px;">건너뛴 레벨 (기존 데이터 유지)</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #f8f9fa;">
                      <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left; width: 80px;">레벨</th>
                      <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">스탯</th>
                  </tr>`;

      for (const [level, stats] of Object.entries(changes.skipped)) {
        html += `
                  <tr>
                      <td style="padding: 8px; border: 1px solid #dee2e6; vertical-align: top; text-align: center; font-weight: bold;">${level}</td>
                      <td style="padding: 8px; border: 1px solid #dee2e6;">
                          ${Object.entries(stats)
                            .map(([statKey, value]) => {
                              const koreanName =
                                STATS_MAPPING[statKey] || statKey;
                              return `<div class="stat-pair">${koreanName} (${statKey}): ${value}</div>`;
                            })
                            .join("")}
                      </td>
                  </tr>
              `;
      }

      html += `</table></div>`;
    }

    if (Object.keys(changes.added).length > 0) {
      html += `<div class="added-stats" style="margin-top: 15px;">
              <h5 style="color: #28a745; border-bottom: 1px solid #c8e6c9; padding-bottom: 8px;">추가된 스탯</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #e8f5e9;">
                      <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left; width: 80px;">레벨</th>
                      <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">스탯</th>
                      <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left; width: 150px;">값</th>
                  </tr>`;

      for (const [level, stats] of Object.entries(changes.added)) {
        for (const [statKey, value] of Object.entries(stats)) {
          const koreanName = STATS_MAPPING[statKey] || statKey;
          html += `
                      <tr>
                          <td style="padding: 8px; border: 1px solid #c8e6c9; text-align: center; font-weight: bold;">${level}</td>
                          <td style="padding: 8px; border: 1px solid #c8e6c9;">${koreanName} (${statKey})</td>
                          <td style="padding: 8px; border: 1px solid #c8e6c9; background-color: #e8f5e9; font-weight: bold;">${value}</td>
                      </tr>
                  `;
        }
      }

      html += `</table></div>`;
    }

    if (Object.keys(changes.modified).length > 0) {
      html += `<div class="modified-stats" style="margin-top: 15px;">
              <h5 style="color: #007bff; border-bottom: 1px solid #bbdefb; padding-bottom: 8px;">수정된 스탯</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #e3f2fd;">
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left; width: 80px;">레벨</th>
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">스탯</th>
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left; width: 150px;">이전 값</th>
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left; width: 150px;">새 값</th>
                  </tr>`;

      for (const [level, stats] of Object.entries(changes.modified)) {
        for (const [statKey, change] of Object.entries(stats)) {
          const koreanName = STATS_MAPPING[statKey] || statKey;
          html += `
                      <tr>
                          <td style="padding: 8px; border: 1px solid #bbdefb; text-align: center; font-weight: bold;">${level}</td>
                          <td style="padding: 8px; border: 1px solid #bbdefb;">${koreanName} (${statKey})</td>
                          <td style="padding: 8px; border: 1px solid #bbdefb; text-decoration: line-through; color: #666;">${change.from}</td>
                          <td style="padding: 8px; border: 1px solid #bbdefb; background-color: #e3f2fd; font-weight: bold;">${change.to}</td>
                      </tr>
                  `;
        }
      }

      html += `</table></div>`;
    }

    if (Object.keys(changes.removed).length > 0) {
      html += `<div class="removed-stats" style="margin-top: 15px;">
              <h5 style="color: #dc3545; border-bottom: 1px solid #f5c6cb; padding-bottom: 8px;">제거된 스탯</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #f8d7da;">
                      <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left; width: 80px;">레벨</th>
                      <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">스탯</th>
                      <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left; width: 150px;">값</th>
                  </tr>`;

      for (const [level, stats] of Object.entries(changes.removed)) {
        for (const [statKey, value] of Object.entries(stats)) {
          const koreanName = STATS_MAPPING[statKey] || statKey;
          html += `
                      <tr>
                          <td style="padding: 8px; border: 1px solid #f5c6cb; text-align: center; font-weight: bold;">${level}</td>
                          <td style="padding: 8px; border: 1px solid #f5c6cb;">${koreanName} (${statKey})</td>
                          <td style="padding: 8px; border: 1px solid #f5c6cb; text-decoration: line-through; color: #666;">${value}</td>
                      </tr>
                  `;
        }
      }

      html += `</table></div>`;
    }

    if (
      Object.keys(changes.added).length === 0 &&
      Object.keys(changes.modified).length === 0 &&
      Object.keys(changes.removed).length === 0 &&
      Object.keys(changes.skipped).length === 0
    ) {
      html += `
              <div class="info" style="padding: 15px; background-color: #e2f3f8; border-radius: 4px;">
                  <p>변경된 사항이 없습니다.</p>
              </div>
          `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;

    // 스크롤 애니메이션으로 결과 영역으로 이동
    setTimeout(() => {
      resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  function displaySingleLevelDiff(changes, guardianName, level, statType) {
    const resultsDiv = document.getElementById("updateResults");

    let html = `
          <div class="diff-container" style="margin-top: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background-color: white;">
              <h4>변경 내역: ${guardianName} (${level}레벨 ${
      statType === "bindStat" ? "장착 스탯" : "등록 스탯"
    })</h4>
              <button onclick="FirestoreManager.revertChanges()" class="warning" style="margin-bottom: 15px;">
                  <span class="btn-icon">↩</span> 변경 사항 되돌리기
              </button>
      `;

    if (Object.keys(changes.added).length > 0) {
      html += `<div class="added-stats" style="margin-top: 15px;">
              <h5 style="color: #28a745; border-bottom: 1px solid #c8e6c9; padding-bottom: 8px;">추가된 스탯</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #e8f5e9;">
                      <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left;">스탯</th>
                      <th style="padding: 8px; border: 1px solid #c8e6c9; text-align: left; width: 150px;">값</th>
                  </tr>`;

      for (const [statKey, value] of Object.entries(changes.added)) {
        const koreanName = STATS_MAPPING[statKey] || statKey;
        html += `
                  <tr>
                      <td style="padding: 8px; border: 1px solid #c8e6c9;">${koreanName} (${statKey})</td>
                      <td style="padding: 8px; border: 1px solid #c8e6c9; background-color: #e8f5e9; font-weight: bold;">${value}</td>
                  </tr>
              `;
      }

      html += `</table></div>`;
    }

    if (Object.keys(changes.modified).length > 0) {
      html += `<div class="modified-stats" style="margin-top: 15px;">
              <h5 style="color: #007bff; border-bottom: 1px solid #bbdefb; padding-bottom: 8px;">수정된 스탯</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #e3f2fd;">
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left;">스탯</th>
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left; width: 150px;">이전 값</th>
                      <th style="padding: 8px; border: 1px solid #bbdefb; text-align: left; width: 150px;">새 값</th>
                  </tr>`;

      for (const [statKey, change] of Object.entries(changes.modified)) {
        const koreanName = STATS_MAPPING[statKey] || statKey;
        html += `
                  <tr>
                      <td style="padding: 8px; border: 1px solid #bbdefb;">${koreanName} (${statKey})</td>
                      <td style="padding: 8px; border: 1px solid #bbdefb; text-decoration: line-through; color: #666;">${change.from}</td>
                      <td style="padding: 8px; border: 1px solid #bbdefb; background-color: #e3f2fd; font-weight: bold;">${change.to}</td>
                  </tr>
              `;
      }

      html += `</table></div>`;
    }

    if (Object.keys(changes.removed).length > 0) {
      html += `<div class="removed-stats" style="margin-top: 15px;">
              <h5 style="color: #dc3545; border-bottom: 1px solid #f5c6cb; padding-bottom: 8px;">제거된 스탯</h5>
              <table style="width: 100%; border-collapse: collapse;">
                  <tr style="background-color: #f8d7da;">
                      <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">스탯</th>
                      <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left; width: 150px;">값</th>
                  </tr>`;

      for (const [statKey, value] of Object.entries(changes.removed)) {
        const koreanName = STATS_MAPPING[statKey] || statKey;
        html += `
                  <tr>
                      <td style="padding: 8px; border: 1px solid #f5c6cb;">${koreanName} (${statKey})</td>
                      <td style="padding: 8px; border: 1px solid #f5c6cb; text-decoration: line-through; color: #666;">${value}</td>
                  </tr>
              `;
      }

      html += `</table></div>`;
    }

    if (
      Object.keys(changes.added).length === 0 &&
      Object.keys(changes.modified).length === 0 &&
      Object.keys(changes.removed).length === 0
    ) {
      html += `
              <div class="info" style="padding: 15px; background-color: #e2f3f8; border-radius: 4px;">
                  <p>변경된 사항이 없습니다.</p>
              </div>
          `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;

    // 스크롤 애니메이션으로 결과 영역으로 이동
    setTimeout(() => {
      resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  async function revertChanges() {
    if (!previousGuardianData) {
      showNotification("되돌릴 변경 사항이 없습니다.", "warning");
      return;
    }

    try {
      const docFileName = document.getElementById("documentSelect").value;
      const docId = DOCUMENT_MAP[docFileName];
      const statusDiv = document.getElementById("statUpdateStatus");

      statusDiv.className = "info";
      statusDiv.textContent = "변경 사항을 되돌리는 중...";
      showLoadingOverlay("변경 사항 되돌리는 중...");

      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[docId] &&
        cache.guardians[docId].timestamp &&
        Date.now() - cache.guardians[docId].timestamp < CACHE_DURATION
      ) {
        docData = cache.guardians[docId].data;
      } else {
        const docRef = state.db.collection("jsonData").doc(docId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
          docData = docSnapshot.data();
        }
      }

      if (!docData) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = "문서를 찾을 수 없습니다.";
        showNotification("문서를 찾을 수 없습니다.", "error");
        return;
      }

      const guardianName = previousGuardianData.name;
      let guardianIndex = -1;

      for (let i = 0; i < docData.data.length; i++) {
        if (docData.data[i].name === guardianName) {
          guardianIndex = i;
          break;
        }
      }

      if (guardianIndex === -1) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = `환수 "${guardianName}"를 찾을 수 없습니다.`;
        showNotification(`환수 "${guardianName}"를 찾을 수 없습니다.`, "error");
        return;
      }

      const updatedData = JSON.parse(JSON.stringify(docData));
      updatedData.data[guardianIndex] = previousGuardianData;

      const docRef = state.db.collection("jsonData").doc(docId);
      await docRef.set(updatedData);

      // 캐시 업데이트
      cache.guardians[docId] = {
        data: updatedData,
        timestamp: Date.now(),
      };

      hideLoadingOverlay();
      statusDiv.className = "success";
      statusDiv.textContent = `환수 "${guardianName}"의 변경 사항이 성공적으로 되돌려졌습니다.`;
      showNotification(
        `환수 "${guardianName}"의 변경 사항이 되돌려졌습니다.`,
        "success"
      );

      document.getElementById("updateResults").innerHTML = `
              <div class="success" style="padding: 15px; margin-top: 20px; border-radius: 6px;">
                  <h4>변경 사항 되돌리기 성공</h4>
                  <p>환수 "${guardianName}"의 데이터가 업데이트 이전 상태로 복원되었습니다.</p>
              </div>
          `;

      previousGuardianData = null;
      updatedGuardianData = null;
    } catch (error) {
      hideLoadingOverlay();
      const statusDiv = document.getElementById("statUpdateStatus");
      statusDiv.className = "error";
      statusDiv.textContent = `되돌리기 오류: ${error.message}`;
      showNotification("되돌리기 오류: " + error.message, "error");
      console.error("되돌리기 오류:", error);
    }
  }

  function previewParsing() {
    const input = document.getElementById("statInput").value.trim();
    const previewDiv = document.getElementById("parsingPreview");
    const statusDiv = document.getElementById("statUpdateStatus");

    statusDiv.style.display = "none";

    if (!input) {
      previewDiv.innerHTML = '<p class="error">입력이 비어있습니다.</p>';
      previewDiv.style.display = "block";
      showNotification("입력이 비어있습니다.", "warning");
      return;
    }

    const result = parseInput(input);
    let html = "<h3>파싱 결과</h3>";

    html += `<div class="parsing-step">
          <div class="key-value">
              <div class="key">환수 이름:</div>
              <div class="value">${result.guardianName || "추출 실패"}</div>
          </div>
          <div class="key-value">
              <div class="key">레벨:</div>
              <div class="value">${result.level || "추출 실패"}</div>
          </div>
      </div>`;

    html += `<div class="parsing-step" style="background-color: #f0f8ff; border: 1px solid #4285f4;">
          <h4 style="margin-top: 0; color: #4285f4;">영어로 변환된 스탯 정보</h4>`;

    if (Object.keys(result.stats).length > 0) {
      html += `<table style="width:100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #e6f2ff;">
                  <th style="padding: 8px; border: 1px solid #b8daff; text-align: left; width: 35%;">영어 키</th>
                  <th style="padding: 8px; border: 1px solid #b8daff; text-align: left; width: 15%;">값</th>
                  <th style="padding: 8px; border: 1px solid #b8daff; text-align: left; width: 50%;">한글 이름</th>
              </tr>`;

      for (const [engKey, value] of Object.entries(result.stats)) {
        html += `<tr>
                  <td style="padding: 8px; border: 1px solid #b8daff; font-family: monospace;">${engKey}</td>
                  <td style="padding: 8px; border: 1px solid #b8daff; font-weight: bold;">${value}</td>
                  <td style="padding: 8px; border: 1px solid #b8daff;">${
                    STATS_MAPPING[engKey] || "매핑 없음"
                  }</td>
              </tr>`;
      }

      html += `</table>`;

      const jsonStr = JSON.stringify(result.stats).replace(/'/g, "\\'");
      html += `<div style="margin-top: 15px;">
              <h4 style="margin-top: 0; color: #4285f4;">
                  JSON 형식
                  <button onclick="FirestoreManager.copyToClipboard('${jsonStr}');" style="margin-left: 10px; padding: 3px 8px; font-size: 0.8em;">클립보드에 복사</button>
              </h4>
              <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(
                result.stats,
                null,
                2
              )}</pre>
          </div>`;
    } else {
      html += `<p>스탯 정보를 추출하지 못했습니다.</p>`;
    }
    html += `</div>`;

    if (result.statMappingDetails && result.statMappingDetails.length > 0) {
      html += `<div class="parsing-step">
              <h4 style="margin-top: 0;">스탯 매핑 세부 정보</h4>
              <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                  <tr style="background-color: #f2f2f2;">
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">입력된 한글</th>
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">영어 키</th>
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">값</th>
                      <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">매칭 방법</th>
                  </tr>`;

      for (const detail of result.statMappingDetails) {
        html += `<tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${detail.korean}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${detail.english}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${detail.value}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${detail.method}</td>
              </tr>`;
      }

      html += `</table></div>`;
    }

    html += `<details style="margin-top: 15px;">
          <summary style="cursor: pointer; padding: 8px; background-color: #f2f2f2; border-radius: 4px;">원본 파싱 단계 보기</summary>
          <div style="padding: 10px; border: 1px solid #ddd; border-radius: 0 0 4px 4px; margin-top: 5px; max-height: 300px; overflow-y: auto;">`;

    for (const step of result.parseSteps) {
      html += `<div class="parsing-step">
              <div class="key-value">
                  <div class="key">단계:</div>
                  <div class="value">${step.step}</div>
              </div>`;

      if (step.step === "입력 분리") {
        html += `<div class="key-value">
                  <div class="key">분리된 줄:</div>
                  <div class="value">${step.value
                    .map((l) => `"${l}"`)
                    .join("<br>")}</div>
              </div>`;
      } else {
        html += `<div class="key-value">
                  <div class="key">결과:</div>
                  <div class="value">${
                    typeof step.value === "object"
                      ? JSON.stringify(step.value)
                      : step.value
                  }</div>
              </div>`;
      }

      html += `</div>`;
    }

    html += `</div></details>`;

    if (result.errors.length) {
      html += `<div class="error" style="margin-top: 15px; padding: 15px; border-radius: 6px;">
              <strong>오류:</strong><br>
              ${result.errors.map((err) => `- ${err}`).join("<br>")}
          </div>`;
      showNotification("파싱 중 오류가 발생했습니다.", "error");
    } else {
      html += `<div class="success" style="margin-top: 15px; padding: 15px; border-radius: 6px;">
              <strong>파싱 성공!</strong><br>
              환수 이름: ${result.guardianName}<br>
              레벨: ${result.level}<br>
              스탯 수: ${Object.keys(result.stats).length}
          </div>`;
      showNotification("파싱 성공!", "success");
    }

    previewDiv.innerHTML = html;
    previewDiv.style.display = "block";

    // 스크롤 애니메이션으로 결과 영역으로 이동
    setTimeout(() => {
      previewDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  async function updateStats() {
    const input = document.getElementById("statInput").value.trim();
    const docFileName = document.getElementById("documentSelect").value;
    const statusDiv = document.getElementById("statUpdateStatus");
    const resultsDiv = document.getElementById("updateResults");
    const previewDiv = document.getElementById("parsingPreview");

    previewDiv.style.display = "none";
    statusDiv.style.display = "block";
    statusDiv.className = "info";
    statusDiv.textContent = "스탯 정보 처리 중...";
    resultsDiv.innerHTML = "";

    if (!input) {
      statusDiv.className = "error";
      statusDiv.textContent = "스탯 정보를 입력해주세요.";
      showNotification("스탯 정보를 입력해주세요.", "error");
      return;
    }

    if (!docFileName) {
      statusDiv.className = "error";
      statusDiv.textContent = "대상 문서를 선택해주세요.";
      showNotification("대상 문서를 선택해주세요.", "error");
      return;
    }

    const docId = DOCUMENT_MAP[docFileName];
    if (!docId) {
      statusDiv.className = "error";
      statusDiv.textContent = "유효하지 않은 문서입니다.";
      showNotification("유효하지 않은 문서입니다.", "error");
      return;
    }

    showLoadingOverlay("스탯 정보 업데이트 중...");

    try {
      const parsedResult = parseInput(input);

      if (!parsedResult.success) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent =
          "입력 파싱에 실패했습니다: " + parsedResult.errors.join(", ");
        showNotification("입력 파싱에 실패했습니다.", "error");
        return;
      }

      const { guardianName, level, stats } = parsedResult;
      updateLoadingProgress(30);

      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[docId] &&
        cache.guardians[docId].timestamp &&
        Date.now() - cache.guardians[docId].timestamp < CACHE_DURATION
      ) {
        docData = cache.guardians[docId].data;
      } else {
        const docRef = state.db.collection("jsonData").doc(docId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
          docData = docSnapshot.data();

          // 캐시 업데이트
          cache.guardians[docId] = {
            data: docData,
            timestamp: Date.now(),
          };
        }
      }

      if (!docData) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName}`;
        showNotification(`문서를 찾을 수 없습니다: ${docFileName}`, "error");
        return;
      }

      updateLoadingProgress(50);

      if (!docData.data || !Array.isArray(docData.data)) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = "문서 형식이 올바르지 않습니다.";
        showNotification("문서 형식이 올바르지 않습니다.", "error");
        return;
      }

      let foundGuardian = null;
      let guardianIndex = -1;

      for (let i = 0; i < docData.data.length; i++) {
        if (docData.data[i].name === guardianName) {
          foundGuardian = docData.data[i];
          guardianIndex = i;
          break;
        }
      }

      if (guardianIndex === -1) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = `환수 "${guardianName}"를 찾을 수 없습니다.`;
        showNotification(`환수 "${guardianName}"를 찾을 수 없습니다.`, "error");
        return;
      }

      if (!foundGuardian.stats || foundGuardian.stats.length <= level) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = `환수 "${guardianName}"의 ${level}레벨 정보가 존재하지 않습니다.`;
        showNotification(
          `환수 "${guardianName}"의 ${level}레벨 정보가 존재하지 않습니다.`,
          "error"
        );
        return;
      }

      updateLoadingProgress(70);

      const statType = docFileName.includes("-bind-")
        ? "bindStat"
        : "registrationStat";
      previousGuardianData = JSON.parse(JSON.stringify(foundGuardian));

      const oldStats = foundGuardian.stats[level][statType] || {};
      const changes = {
        added: {},
        modified: {},
        removed: {},
      };

      for (const [statKey, value] of Object.entries(stats)) {
        if (!oldStats[statKey]) {
          changes.added[statKey] = value;
        } else if (oldStats[statKey] !== value) {
          changes.modified[statKey] = {
            from: oldStats[statKey],
            to: value,
          };
        }
      }

      for (const [statKey, value] of Object.entries(oldStats)) {
        if (!stats[statKey]) {
          changes.removed[statKey] = value;
        }
      }

      const updatedData = JSON.parse(JSON.stringify(docData));
      updatedData.data[guardianIndex].stats[level][statType] = stats;
      updatedGuardianData = updatedData.data[guardianIndex];

      updateLoadingProgress(90);

      const docRef = state.db.collection("jsonData").doc(docId);
      await docRef.set(updatedData);

      // 캐시 업데이트
      cache.guardians[docId] = {
        data: updatedData,
        timestamp: Date.now(),
      };

      hideLoadingOverlay();
      statusDiv.className = "success";
      statusDiv.textContent = `환수 "${guardianName}"의 ${level}레벨 스탯이 업데이트되었습니다.`;
      showNotification(
        `환수 "${guardianName}"의 ${level}레벨 스탯이 업데이트되었습니다.`,
        "success"
      );

      displaySingleLevelDiff(changes, guardianName, level, statType);
    } catch (error) {
      hideLoadingOverlay();
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      showNotification("오류 발생: " + error.message, "error");
      console.error("스탯 업데이트 오류:", error);
    }
  }

  function clearStatInput() {
    document.getElementById("statInput").value = "";
    document.getElementById("parsingPreview").style.display = "none";
    document.getElementById("statUpdateStatus").style.display = "none";
    document.getElementById("updateResults").innerHTML = "";
  }

  async function downloadDocument() {
    if (!state.selectedDocumentId) {
      showNotification("다운로드할 문서를 먼저 선택해주세요.", "warning");
      return;
    }

    try {
      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[state.selectedDocumentId] &&
        cache.guardians[state.selectedDocumentId].timestamp &&
        Date.now() - cache.guardians[state.selectedDocumentId].timestamp <
          CACHE_DURATION
      ) {
        docData = cache.guardians[state.selectedDocumentId].data;
      } else {
        showLoadingOverlay("문서 다운로드 준비 중...");

        const docSnapshot = await state.db
          .collection("jsonData")
          .doc(state.selectedDocumentId)
          .get();
        if (docSnapshot.exists) {
          docData = docSnapshot.data();

          // 캐시 업데이트
          cache.guardians[state.selectedDocumentId] = {
            data: docData,
            timestamp: Date.now(),
          };
        }

        hideLoadingOverlay();
      }

      if (docData) {
        const fileName =
          reverseDocumentMap[state.selectedDocumentId] ||
          `document-${state.selectedDocumentId}.json`;

        const dataStr = JSON.stringify(docData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });

        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = fileName;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(downloadLink.href);
        showNotification(
          `문서 "${fileName}" 다운로드가 시작되었습니다.`,
          "success"
        );
      } else {
        showNotification("문서를 찾을 수 없습니다.", "error");
      }
    } catch (error) {
      hideLoadingOverlay();
      showNotification("다운로드 오류: " + error.message, "error");
      console.error("문서 다운로드 오류:", error);
    }
  }

  async function copyDocumentToClipboard() {
    if (!state.selectedDocumentId) {
      showNotification("복사할 문서를 먼저 선택해주세요.", "warning");
      return;
    }

    try {
      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[state.selectedDocumentId] &&
        cache.guardians[state.selectedDocumentId].timestamp &&
        Date.now() - cache.guardians[state.selectedDocumentId].timestamp <
          CACHE_DURATION
      ) {
        docData = cache.guardians[state.selectedDocumentId].data;
      } else {
        showLoadingOverlay("문서 복사 준비 중...");

        const docSnapshot = await state.db
          .collection("jsonData")
          .doc(state.selectedDocumentId)
          .get();
        if (docSnapshot.exists) {
          docData = docSnapshot.data();

          // 캐시 업데이트
          cache.guardians[state.selectedDocumentId] = {
            data: docData,
            timestamp: Date.now(),
          };
        }

        hideLoadingOverlay();
      }

      if (docData) {
        const dataStr = JSON.stringify(docData, null, 2);
        copyToClipboard(dataStr);
      } else {
        showNotification("문서를 찾을 수 없습니다.", "error");
      }
    } catch (error) {
      hideLoadingOverlay();
      showNotification("복사 오류: " + error.message, "error");
      console.error("문서 복사 오류:", error);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showNotification("클립보드에 복사되었습니다!", "success");
        })
        .catch((err) => {
          console.error("클립보드 API 복사 실패:", err);
          fallbackCopyToClipboard(text);
        });
    } else {
      fallbackCopyToClipboard(text);
    }
  }

  function fallbackCopyToClipboard(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "-9999px";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        showNotification("클립보드에 복사되었습니다!", "success");
      } else {
        showNotification(
          "복사에 실패했습니다. 수동으로 복사해주세요.",
          "error"
        );
      }
    } catch (err) {
      console.error("대체 복사 방법 실패:", err);
      showNotification("복사에 실패했습니다. 수동으로 복사해주세요.", "error");
    }
  }

  function clearNewGuardianForm() {
    document.getElementById("newGuardianDocumentSelect").selectedIndex = 0;
    document.getElementById("newGuardianName").value = "";
    document.getElementById("newGuardianImage").value = "";
    document.getElementById("newGuardianInfluence").selectedIndex = 0;
    document.getElementById("newGuardianType").selectedIndex = 0;
    document.getElementById("newGuardianGrade").selectedIndex = 0;
    document.getElementById("newGuardianJsonPreview").style.display = "none";
    document.getElementById("newGuardianStatus").style.display = "none";

    selectedGuardian = null;
    selectedGuardianIndex = -1;
    selectedStats = [];
    currentLevel = 0;
    levelStats = {};

    const selectedStatsContainer = document.getElementById(
      "selectedStatsContainer"
    );
    if (selectedStatsContainer) {
      selectedStatsContainer.innerHTML = "";
    }

    const levelTabsContainer = document.getElementById("levelTabsContainer");
    if (levelTabsContainer) {
      levelTabsContainer.style.display = "none";
    }

    showNotification("양식이 초기화되었습니다.", "info");
  }

  function previewNewGuardian() {
    const name = document.getElementById("newGuardianName").value.trim();
    const image = document.getElementById("newGuardianImage").value.trim();
    const influence = document.getElementById("newGuardianInfluence").value;
    const type = document.getElementById("newGuardianType").value;
    const grade = document.getElementById("newGuardianGrade").value;
    const docFileName = document.getElementById(
      "newGuardianDocumentSelect"
    ).value;
    const previewDiv = document.getElementById("newGuardianJsonPreview");

    if (!name) {
      showNotification("환수 이름을 입력해주세요.", "error");
      return;
    }

    if (!docFileName) {
      showNotification("대상 문서를 선택해주세요.", "error");
      return;
    }

    const statType = docFileName.includes("-bind-")
      ? "bindStat"
      : "registrationStat";

    saveCurrentLevelInputs();

    const newGuardian = {
      name: name,
      image:
        image ||
        `images/${TYPE_TO_PATH[type]}/${TYPE_TO_PATH[type]}_default.jpg`,
      influence: influence,
      type: type,
      grade: grade,
      stats: [],
    };

    for (let i = 0; i <= 25; i++) {
      const levelStat = {
        level: i,
      };
      levelStat[statType] = {};

      if (levelStats[i]) {
        levelStat[statType] = { ...levelStats[i] };
      }

      newGuardian.stats.push(levelStat);
    }

    previewDiv.style.display = "block";
    previewDiv.innerHTML = `<h4>추가될 환수 데이터 미리보기:</h4>
          <pre>${JSON.stringify(newGuardian, null, 2)}</pre>
          <div class="success" style="margin-top: 15px; padding: 15px; border-radius: 6px;">
              <p><strong>추가 문서:</strong> ${docFileName}</p>
              <p><strong>스탯 타입:</strong> ${
                statType === "bindStat" ? "장착 스탯" : "등록 스탯"
              }</p>
              <p><strong>입력된 레벨 수:</strong> ${
                Object.keys(levelStats).length
              }개</p>
          </div>`;

    showNotification("환수 추가 미리보기가 생성되었습니다.", "success");

    // 스크롤 애니메이션으로 미리보기 영역으로 이동
    setTimeout(() => {
      previewDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  async function addNewGuardian() {
    const name = document.getElementById("newGuardianName").value.trim();
    const image = document.getElementById("newGuardianImage").value.trim();
    const influence = document.getElementById("newGuardianInfluence").value;
    const type = document.getElementById("newGuardianType").value;
    const grade = document.getElementById("newGuardianGrade").value;
    const docFileName = document.getElementById(
      "newGuardianDocumentSelect"
    ).value;

    const statusDiv = document.getElementById("newGuardianStatus");
    statusDiv.style.display = "block";

    if (!name) {
      statusDiv.className = "error";
      statusDiv.textContent = "환수 이름을 입력해주세요.";
      showNotification("환수 이름을 입력해주세요.", "error");
      return;
    }

    if (!docFileName) {
      statusDiv.className = "error";
      statusDiv.textContent = "대상 문서를 선택해주세요.";
      showNotification("대상 문서를 선택해주세요.", "error");
      return;
    }

    const docId = DOCUMENT_MAP[docFileName];
    if (!docId) {
      statusDiv.className = "error";
      statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName}`;
      showNotification(`문서를 찾을 수 없습니다: ${docFileName}`, "error");
      return;
    }

    showLoadingOverlay("환수 추가 중...");

    try {
      statusDiv.className = "info";
      statusDiv.textContent = "환수 추가 중...";

      saveCurrentLevelInputs();
      updateLoadingProgress(30);

      let docData = null;

      // 캐시 체크
      if (
        cache.guardians[docId] &&
        cache.guardians[docId].timestamp &&
        Date.now() - cache.guardians[docId].timestamp < CACHE_DURATION
      ) {
        docData = cache.guardians[docId].data;
      } else {
        const docRef = state.db.collection("jsonData").doc(docId);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
          docData = docSnapshot.data();
        }
      }

      if (!docData) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = `문서를 찾을 수 없습니다: ${docFileName}`;
        showNotification(`문서를 찾을 수 없습니다: ${docFileName}`, "error");
        return;
      }

      if (!docData.data || !Array.isArray(docData.data)) {
        hideLoadingOverlay();
        statusDiv.className = "error";
        statusDiv.textContent = "문서 형식이 올바르지 않습니다.";
        showNotification("문서 형식이 올바르지 않습니다.", "error");
        return;
      }

      updateLoadingProgress(60);

      const existingIndex = docData.data.findIndex(
        (guardian) => guardian.name === name
      );
      if (existingIndex !== -1) {
        statusDiv.className = "warning";
        statusDiv.textContent = `같은 이름의 환수가 이미 존재합니다: ${name}`;

        const userChoice = await new Promise((resolve) => {
          showNotification(
            `같은 이름의 환수가 이미 존재합니다: ${name}. 계속하시겠습니까?`,
            "warning",
            0
          );

          const notificationContainer = document.querySelector(
            ".notification-toast"
          );
          if (notificationContainer) {
            // 기존 닫기 버튼 제거
            const closeBtn = notificationContainer.querySelector(
              ".notification-close"
            );
            if (closeBtn) closeBtn.remove();

            // 확인/취소 버튼 추가
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "notification-actions";
            buttonContainer.style.marginTop = "10px";
            buttonContainer.style.display = "flex";
            buttonContainer.style.gap = "10px";

            const continueBtn = document.createElement("button");
            continueBtn.textContent = "계속";
            continueBtn.className = "button-primary";
            continueBtn.style.padding = "5px 10px";
            continueBtn.style.fontSize = "12px";

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "취소";
            cancelBtn.className = "button-secondary";
            cancelBtn.style.padding = "5px 10px";
            cancelBtn.style.fontSize = "12px";

            buttonContainer.appendChild(continueBtn);
            buttonContainer.appendChild(cancelBtn);

            notificationContainer.appendChild(buttonContainer);

            continueBtn.addEventListener("click", () => {
              notificationContainer.classList.remove("show");
              setTimeout(() => notificationContainer.remove(), 300);
              resolve(true);
            });

            cancelBtn.addEventListener("click", () => {
              notificationContainer.classList.remove("show");
              setTimeout(() => notificationContainer.remove(), 300);
              resolve(false);
            });
          }
        });

        if (!userChoice) {
          hideLoadingOverlay();
          return;
        }
      }

      const statType = docFileName.includes("-bind-")
        ? "bindStat"
        : "registrationStat";

      const newGuardian = {
        name: name,
        image:
          image ||
          `images/${TYPE_TO_PATH[type]}/${TYPE_TO_PATH[type]}_default.jpg`,
        influence: influence,
        type: type,
        grade: grade,
        stats: [],
      };

      for (let i = 0; i <= 25; i++) {
        const levelStat = {
          level: i,
        };
        levelStat[statType] = {};

        if (levelStats[i]) {
          levelStat[statType] = { ...levelStats[i] };
        }

        newGuardian.stats.push(levelStat);
      }

      updateLoadingProgress(80);

      const updatedData = JSON.parse(JSON.stringify(docData));

      if (existingIndex !== -1) {
        updatedData.data[existingIndex] = newGuardian;
      } else {
        updatedData.data.push(newGuardian);
      }

      const docRef = state.db.collection("jsonData").doc(docId);
      await docRef.set(updatedData);

      // 캐시 업데이트
      cache.guardians[docId] = {
        data: updatedData,
        timestamp: Date.now(),
      };

      if (grade === "불멸") {
        if (lastImageNumbers[docFileName]) {
          lastImageNumbers[docFileName].immortal++;
        }
      } else {
        if (lastImageNumbers[docFileName]) {
          lastImageNumbers[docFileName].normal++;
        }
      }

      hideLoadingOverlay();
      showNotification(
        `환수 "${name}"이(가) 성공적으로 ${
          existingIndex !== -1 ? "업데이트" : "추가"
        }되었습니다.`,
        "success"
      );

      statusDiv.className = "success";
      statusDiv.innerHTML = `
              <p>환수 "${name}"이(가) 성공적으로 ${
        existingIndex !== -1 ? "업데이트" : "추가"
      }되었습니다.</p>
              <p><strong>추가된 문서:</strong> ${docFileName}</p>
              <p><strong>문서 ID:</strong> ${docId}</p>
              <p><strong>환수 타입:</strong> ${type}</p>
              <p><strong>스탯 타입:</strong> ${
                statType === "bindStat" ? "장착 스탯" : "등록 스탯"
              }</p>
              <p><strong>스탯 입력된 레벨 수:</strong> ${
                Object.keys(levelStats).length
              }개</p>
          `;

      clearNewGuardianForm();
    } catch (error) {
      hideLoadingOverlay();
      statusDiv.className = "error";
      statusDiv.textContent = `오류 발생: ${error.message}`;
      showNotification("오류 발생: " + error.message, "error");
      console.error("환수 추가 오류:", error);
    }
  }

  function setupEventListeners() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        document
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("active"));
        this.classList.add("active");

        document
          .querySelectorAll(".tab-content")
          .forEach((content) => content.classList.remove("active"));
        document.getElementById(this.dataset.tab).classList.add("active");

        if (this.dataset.tab === "document-browser") {
          refreshDocumentList();
        }

        if (this.dataset.tab === "new-guardian") {
          updateImagePath();
          initStatDropdown();
        }
      });
    });

    document.querySelectorAll('input[name="uploadMode"]').forEach((radio) => {
      radio.addEventListener("change", function () {
        document.getElementById("updateFieldsContainer").style.display =
          this.value === "update" ? "block" : "none";
      });
    });

    const newGuardianDocSelect = document.getElementById(
      "newGuardianDocumentSelect"
    );
    if (newGuardianDocSelect) {
      newGuardianDocSelect.addEventListener("change", function () {
        const selectedDoc = this.value;
        if (selectedDoc) {
          const type = selectedDoc.split("-")[0];
          document.getElementById("newGuardianType").value =
            type === "guardian" ? "수호" : type === "ride" ? "탑승" : "변신";
          updateImagePath();
        }
      });
    }

    const newGuardianGrade = document.getElementById("newGuardianGrade");
    if (newGuardianGrade) {
      newGuardianGrade.addEventListener("change", updateImagePath);
    }

    // 패널 리사이징
    const panelResizer = document.getElementById("panelResizer");
    const documentListSection = document.querySelector(
      ".document-list-section"
    );

    if (panelResizer && documentListSection) {
      panelResizer.addEventListener("mousedown", function (e) {
        e.preventDefault();
        document.body.style.cursor = "col-resize";
        panelResizer.classList.add("active");

        const startX = e.clientX;
        const startWidth = documentListSection.offsetWidth;

        function onMouseMove(e) {
          const newWidth = startWidth + (e.clientX - startX);

          if (newWidth > 100 && newWidth < window.innerWidth * 0.8) {
            documentListSection.style.width = newWidth + "px";
            documentListSection.style.maxWidth = "none";
          }
        }

        function onMouseUp() {
          document.body.style.cursor = "";
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          panelResizer.classList.remove("active");
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }

    setupKeyboardShortcuts();

    document
      .getElementById("documentSearchInput")
      ?.addEventListener("input", filterDocumentList);
    document
      .getElementById("documentTypeFilter")
      ?.addEventListener("change", filterDocumentList);
    document
      .getElementById("guardianSearchInput")
      ?.addEventListener("input", filterGuardiansList);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initialize();
  });

  return {
    initialize,
    refreshDocumentList,
    viewDocument,
    checkDocument,
    uploadJson,
    prepareEditSelectedDocument,
    switchEditMode,
    formatJson,
    saveJsonChanges,
    saveArrayOrder,
    saveDataChanges,
    cancelEditing,
    deleteSelectedDocument,
    previewParsing,
    updateStats,
    clearStatInput,
    downloadDocument,
    copyDocumentToClipboard,
    copyToClipboard,
    clearNewGuardianForm,
    previewNewGuardian,
    addNewGuardian,
    parseStatsSeriesInput,
    previewStatsSeries,
    updateStatsSeries,
    revertChanges,
    displayDiff,
    displaySingleLevelDiff,
    filterDocumentList,
    filterGuardiansList,

    initStatDropdown,
    addSelectedStat,
    removeSelectedStat,
    initLevelTabs,
    updateLevelContentForm,
    saveCurrentLevelInputs,
    activateLevel,
    goToPreviousLevel,
    goToNextLevel,
    copyPreviousLevelStats,

    handleStatDragStart,
    handleStatDragOver,
    handleStatDrop,
    handleStatDragEnd,
  };
})();

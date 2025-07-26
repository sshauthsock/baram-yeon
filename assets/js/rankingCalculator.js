const RankingCalculator = (function () {
  const STATS_MAPPING = window.CommonData.STATS_MAPPING;
  const PERCENT_STATS = window.CommonData.PERCENT_STATS;
  const GRADE_SET_EFFECTS = window.CommonData.GRADE_SET_EFFECTS;
  const FACTION_SET_EFFECTS = window.CommonData.FACTION_SET_EFFECTS;
  const totalNumberOfResults = 200;

  function cleanEstimatedValue(value) {
    if (value === undefined || value === null) return 0;

    if (typeof value === "string") {
      if (value.includes("(추정)")) {
        const numericValue = value.replace(/\(추정\)/g, "").trim();
        return parseFloat(numericValue) || 0;
      }
      return parseFloat(value) || 0;
    }
    return value || 0;
  }

  function isEstimatedValue(value) {
    return typeof value === "string" && value.includes("(추정)");
  }

  function trackEstimatedValues(stats, estimatedInfo) {
    if (!stats) return false;

    let hasEstimatedValues = false;

    for (const [key, value] of Object.entries(stats)) {
      if (isEstimatedValue(value)) {
        hasEstimatedValues = true;
        if (estimatedInfo && !estimatedInfo.stats) {
          estimatedInfo.stats = {};
        }
        if (estimatedInfo && estimatedInfo.stats) {
          estimatedInfo.stats[key] = value;
        }
      }
    }

    return hasEstimatedValues;
  }

  let mobData = { 수호: [], 탑승: [], 변신: [] };
  let rankingData = {
    bond: {
      수호: [],
      탑승: [],
      변신: [],
    },
    stat: {
      수호: {},
      탑승: {},
      변신: {},
    },
  };

  let rankingMeta = {
    lastUpdated: new Date().toISOString(),
    categories: ["수호", "탑승", "변신"],
    bondRankings: {
      수호: { count: 0, updatedAt: null },
      탑승: { count: 0, updatedAt: null },
      변신: { count: 0, updatedAt: null },
    },
    statRankings: {
      수호: { statCount: 0, updatedAt: null },
      탑승: { statCount: 0, updatedAt: null },
      변신: { statCount: 0, updatedAt: null },
    },
  };

  function optimizeDataForStorage(data) {
    if (!data || !data.rankings) {
      return data;
    }

    if (Array.isArray(data.rankings)) {
      const optimizedRankings = data.rankings.map((rankingItem) => {
        if (!rankingItem.spirits) return rankingItem;

        const optimizedSpirits = rankingItem.spirits.map((spirit) => {
          const optimizedSpirit = {
            name: spirit.name,
            image: spirit.image,
            category: spirit.category,
            grade: spirit.grade,
            faction: spirit.faction || spirit.influence || "결의",
            level: 25,
          };

          if (spirit.stats && Array.isArray(spirit.stats)) {
            const level25Stat = spirit.stats.find(
              (stat) => stat && stat.level === 25
            );
            if (level25Stat) {
              optimizedSpirit.stats = [
                {
                  level: 25,
                  registrationStat: level25Stat.registrationStat,
                  bindStat: level25Stat.bindStat,
                },
              ];
            }
          }

          return optimizedSpirit;
        });

        return {
          spirits: optimizedSpirits,
          gradeEffects: rankingItem.gradeEffects,
          factionEffects: rankingItem.factionEffects,
          bindStats: rankingItem.bindStats,
          registrationOnly: rankingItem.registrationOnly,
          combinedEffects: rankingItem.combinedEffects,
          combinedEffectsWithBind: rankingItem.combinedEffectsWithBind,
          regScore: rankingItem.regScore,
          gradeScore: rankingItem.gradeScore,
          factionScore: rankingItem.factionScore,
          score: rankingItem.score,
          scoreWithBind: rankingItem.scoreWithBind,
          bindScore: rankingItem.bindScore,
          gradeCounts: rankingItem.gradeCounts,
          factionCounts: rankingItem.factionCounts,
        };
      });

      optimizedRankings.sort((a, b) => {
        const scoreA = parseFloat(a.scoreWithBind) || 0;
        const scoreB = parseFloat(b.scoreWithBind) || 0;
        return scoreB - scoreA;
      });

      return {
        ...data,
        rankings: optimizedRankings,
      };
    } else {
      const optimizedRankings = {};

      for (const statKey in data.rankings) {
        if (Array.isArray(data.rankings[statKey])) {
          optimizedRankings[statKey] = data.rankings[statKey].map((item) => ({
            name: item.name,
            image: item.image,
            influence: item.influence,
            grade: item.grade,
            value: item.value,
          }));
        }
      }

      return {
        ...data,
        rankings: optimizedRankings,
      };
    }
  }

  function ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  function normalizeStatKey(key) {
    return key.replace(/\d+$/, "");
  }

  async function loadAllData() {
    try {
      const data = await window.DataManager.loadCategoryData();
      mobData = data;
      return true;
    } catch (error) {
      console.error("Failed to load spirit data:", error);
      return false;
    }
  }

  function generateCombinations(arr, k, startIdx = 0, current = []) {
    if (current.length === k) {
      return [current];
    }

    if (startIdx >= arr.length) {
      return [];
    }

    const withCurrent = generateCombinations(arr, k, startIdx + 1, [
      ...current,
      arr[startIdx],
    ]);

    const withoutCurrent = generateCombinations(arr, k, startIdx + 1, current);

    return [...withCurrent, ...withoutCurrent];
  }

  // async function calculateBondRankings(category, progressCallback = null) {
  //   if (!mobData[category] || !Array.isArray(mobData[category])) {
  //     throw new Error(`Invalid data for category: ${category}`);
  //   }

  //   const spirits = mobData[category].map((spirit) => {
  //     const spiritCopy = JSON.parse(JSON.stringify(spirit));
  //     if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
  //       const level25Stat = spiritCopy.stats.find(
  //         (stat) => stat && stat.level === 25
  //       );
  //       spiritCopy.stats = level25Stat ? [level25Stat] : [];
  //     }

  //     return {
  //       ...spiritCopy,
  //       level: 25,
  //       category: category,
  //       grade: spiritCopy.grade || "전설",
  //       faction: spiritCopy.influence || spiritCopy.faction || "결의",
  //     };
  //   });

  //   if (spirits.length === 0) {
  //     throw new Error(`No spirits found for category: ${category}`);
  //   }

  //   if (progressCallback) {
  //     progressCallback(5, `${category} 결속 랭킹: 환수 데이터 준비 완료`);
  //   }

  //   const MAX_COMBINATIONS = 100000;

  //   const startTime = Date.now();
  //   let combinations = [];

  //   // if (spirits.length > 30) {
  //   //   const rankedSpirits = rankSpirits(spirits);
  //   //   const topSpirits = rankedSpirits.slice(0, 35);

  //   //   if (progressCallback) {
  //   //     progressCallback(10, `${category} 결속 랭킹: 상위 35개 환수 선택 완료`);
  //   //   }

  //   //   combinations = generateCombinationsWithLimit(
  //   //     topSpirits,
  //   //     6,
  //   //     MAX_COMBINATIONS
  //   //   );
  //   // } else {
  //   //   combinations = generateCombinationsWithLimit(
  //   //     spirits,
  //   //     6,
  //   //     MAX_COMBINATIONS
  //   //   );
  //   // }

  //   if (spirits.length > 30) {
  //     const rankedSpirits = rankSpirits(spirits);

  //     const legendarySpirits = rankedSpirits
  //       .filter(
  //         (s) => s.grade === "전설" || (s.grade && s.grade.includes("전설"))
  //       )
  //       .slice(0, 25);

  //     const immortalSpirits = rankedSpirits
  //       .filter(
  //         (s) => s.grade === "불멸" || (s.grade && s.grade.includes("불멸"))
  //       )
  //       .slice(0, 15);

  //     const topSpirits = [...legendarySpirits, ...immortalSpirits];

  //     if (progressCallback) {
  //       progressCallback(
  //         10,
  //         `${category} 결속 랭킹: 전설 ${legendarySpirits.length}개, 불멸 ${immortalSpirits.length}개 환수 선택 완료`
  //       );
  //     }

  //     combinations = generateCombinationsWithLimit(
  //       topSpirits,
  //       6,
  //       MAX_COMBINATIONS
  //     );
  //   } else {
  //     combinations = generateCombinationsWithLimit(
  //       spirits,
  //       6,
  //       MAX_COMBINATIONS
  //     );
  //   }

  //   const totalCombinations = combinations.length;

  //   if (progressCallback) {
  //     progressCallback(
  //       15,
  //       `${category} 결속 랭킹: ${totalCombinations}개 조합 생성 완료`
  //     );
  //   }

  //   const results = [];
  //   let processedCount = 0;

  //   for (const combination of combinations) {
  //     const result = calculateEffectsForSpirits(combination);
  //     if (result) {
  //       results.push(result);
  //     }

  //     processedCount++;
  //     if (processedCount % 1000 === 0 && progressCallback) {
  //       const percentComplete =
  //         15 + Math.floor((processedCount / totalCombinations) * 80);
  //       progressCallback(
  //         percentComplete,
  //         `${category} 결속 랭킹: ${processedCount}/${totalCombinations} 조합 계산 중`
  //       );
  //     }
  //   }

  //   // 환산합산(scoreWithBind) 값을 기준으로 명확하게 내림차순 정렬
  //   results.sort((a, b) => {
  //     const scoreA = parseFloat(a.scoreWithBind) || 0;
  //     const scoreB = parseFloat(b.scoreWithBind) || 0;
  //     if (scoreA !== scoreB) {
  //       return scoreB - scoreA;
  //     }
  //     return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
  //   });

  //   const topResults = results.slice(0, totalNumberOfResults);

  //   if (progressCallback) {
  //     progressCallback(
  //       95,
  //       `${category} 결속 랭킹: 상위 ${totalNumberOfResults}개 결과 선택 완료`
  //     );
  //   }

  //   rankingData.bond[category] = topResults;

  //   rankingMeta.bondRankings[category] = {
  //     count: topResults.length,
  //     updatedAt: new Date().toISOString(),
  //     processingTime: Date.now() - startTime,
  //   };
  //   rankingMeta.lastUpdated = new Date().toISOString();

  //   if (progressCallback) {
  //     progressCallback(100, `${category} 결속 랭킹: 계산 완료`);
  //   }

  //   return {
  //     success: true,
  //     count: topResults.length,
  //     fileName: getCategoryFileName(category, "bond"),
  //   };
  // }

  async function calculateBondRankings(category, progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback(1, `${category} 결속 랭킹: 환수 데이터 확인 중...`);
      }

      console.log(
        "현재 데이터 상태:",
        JSON.stringify({
          hasData: !!mobData,
          categories: mobData ? Object.keys(mobData) : [],
          탑승Count: mobData && mobData.탑승 ? mobData.탑승.length : 0,
        })
      );

      // 강제로 데이터를 다시 로드
      if (progressCallback) {
        progressCallback(
          2,
          `${category} 결속 랭킹: 환수 데이터 다시 로드 중...`
        );
      }

      try {
        // DataManager를 통해 데이터 직접 로드 시도
        if (
          typeof window.DataManager !== "undefined" &&
          typeof window.DataManager.loadCategoryData === "function"
        ) {
          const loadedData = await window.DataManager.loadCategoryData(true); // force reload
          if (
            loadedData &&
            loadedData[category] &&
            loadedData[category].length > 0
          ) {
            console.log(
              `DataManager로부터 ${category} 데이터 직접 로드 성공:`,
              loadedData[category].length
            );
            mobData = loadedData;
          }
        }
      } catch (loadError) {
        console.error("DataManager를 통한 데이터 로드 실패:", loadError);
      }

      // 직접 데이터 패치 시도
      if (!mobData || !mobData[category] || !mobData[category].length) {
        try {
          const response = await fetch("/assets/data/spirits.json");
          if (!response.ok)
            throw new Error(`Fetch failed with status ${response.status}`);

          const rawData = await response.json();

          // 데이터 형식 확인 및 변환
          const data = {};
          if (Array.isArray(rawData)) {
            // 배열 형태의 데이터인 경우 카테고리별로 분류
            data.수호 = rawData.filter((spirit) => spirit.category === "수호");
            data.탑승 = rawData.filter((spirit) => spirit.category === "탑승");
            data.변신 = rawData.filter((spirit) => spirit.category === "변신");
          } else if (typeof rawData === "object") {
            // 객체 형태이면 그대로 사용
            data.수호 = rawData.수호 || [];
            data.탑승 = rawData.탑승 || [];
            data.변신 = rawData.변신 || [];
          }

          console.log(`직접 패치로 데이터 로드 시도:`, {
            수호: data.수호.length,
            탑승: data.탑승.length,
            변신: data.변신.length,
          });

          if (data[category] && data[category].length > 0) {
            mobData = data;
          }
        } catch (fetchError) {
          console.error("직접 데이터 패치 실패:", fetchError);
        }
      }

      // 데이터 검증
      if (!mobData || !mobData[category]) {
        throw new Error(`카테고리 ${category}에 대한 환수 데이터가 없습니다`);
      }

      if (!Array.isArray(mobData[category]) || mobData[category].length === 0) {
        throw new Error(
          `카테고리 ${category}에 대한 환수 데이터 배열이 비었습니다`
        );
      }

      if (progressCallback) {
        progressCallback(
          5,
          `${category} 결속 랭킹: 데이터 로드 완료 (${mobData[category].length}개 환수)`
        );
      }

      console.log(`${category} 데이터 로드 완료:`, {
        count: mobData[category].length,
        sample: mobData[category][0]?.name,
      });

      // 여기서부터는 기존 코드와 동일
      const spirits = mobData[category].map((spirit) => {
        const spiritCopy = JSON.parse(JSON.stringify(spirit));
        if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
          const level25Stat = spiritCopy.stats.find(
            (stat) => stat && stat.level === 25
          );
          spiritCopy.stats = level25Stat ? [level25Stat] : [];
        }

        return {
          ...spiritCopy,
          level: 25,
          category: category,
          grade: spiritCopy.grade || "전설",
          faction: spiritCopy.influence || spiritCopy.faction || "결의",
        };
      });

      if (spirits.length === 0) {
        throw new Error(
          `카테고리 ${category}에 대한 처리 가능한 환수 데이터가 없습니다`
        );
      }

      if (progressCallback) {
        progressCallback(
          8,
          `${category} 결속 랭킹: 환수 데이터 준비 완료 (${spirits.length}개 환수)`
        );
      }

      const MAX_COMBINATIONS = 200000;
      const startTime = Date.now();
      let results = [];

      // 환수를 등급별로 분류
      const legendarySpirits = spirits.filter(
        (s) => s.grade === "전설" || (s.grade && s.grade.includes("전설"))
      );

      const immortalSpirits = spirits.filter(
        (s) => s.grade === "불멸" || (s.grade && s.grade.includes("불멸"))
      );

      console.log(`${category} 환수 분류:`, {
        총개수: spirits.length,
        전설: legendarySpirits.length,
        불멸: immortalSpirits.length,
      });

      if (progressCallback) {
        progressCallback(
          10,
          `${category} 결속 랭킹: 전설 ${legendarySpirits.length}개, 불멸 ${immortalSpirits.length}개 환수 분류 완료`
        );
      }

      // 1. 6 불멸 조합 시도 (불멸 환수가 6개 이상인 경우)
      if (immortalSpirits.length >= 6) {
        if (progressCallback) {
          progressCallback(15, `${category} 결속 랭킹: 6 불멸 조합 계산 중...`);
        }

        const immortalCombinations = generateCombinationsWithLimit(
          immortalSpirits,
          6,
          Math.min(10000, MAX_COMBINATIONS / 5)
        );

        let processedCount = 0;
        for (const combination of immortalCombinations) {
          const result = calculateEffectsForSpirits(combination);
          if (result) {
            results.push(result);
          }

          processedCount++;
          if (processedCount % 500 === 0 && progressCallback) {
            const percentComplete =
              15 +
              Math.floor((processedCount / immortalCombinations.length) * 15);
            progressCallback(
              percentComplete,
              `${category} 결속 랭킹: 6 불멸 조합 ${processedCount}/${immortalCombinations.length} 계산 중`
            );
          }
        }
      }

      // 2. 5 불멸 + 1 전설 조합 시도
      if (immortalSpirits.length >= 5 && legendarySpirits.length >= 1) {
        if (progressCallback) {
          progressCallback(
            30,
            `${category} 결속 랭킹: 5 불멸 + 1 전설 조합 계산 중...`
          );
        }

        const topLegendarySpirits = rankSpirits(legendarySpirits).slice(
          0,
          Math.min(15, legendarySpirits.length)
        );
        const immortalCombinations = generateCombinationsWithLimit(
          immortalSpirits,
          5,
          Math.min(2000, MAX_COMBINATIONS / 10)
        );

        let processedCount = 0;
        const totalCombos =
          immortalCombinations.length * topLegendarySpirits.length;

        for (const immortalCombo of immortalCombinations) {
          for (const legendarySpirit of topLegendarySpirits) {
            const combo = [...immortalCombo, legendarySpirit];
            const result = calculateEffectsForSpirits(combo);
            if (result) {
              results.push(result);
            }

            processedCount++;
            if (processedCount % 1000 === 0 && progressCallback) {
              const percentComplete =
                30 + Math.floor((processedCount / totalCombos) * 10);
              progressCallback(
                percentComplete,
                `${category} 결속 랭킹: 5+1 조합 계산 중`
              );
            }
          }
        }
      }

      // 3. 추가 다양한 조합 (점수 기반 상위 환수)
      if (progressCallback) {
        progressCallback(
          45,
          `${category} 결속 랭킹: 추가 최적 조합 계산 중...`
        );
      }

      // 상위 환수 선택
      const topImmortals = rankSpirits(immortalSpirits).slice(
        0,
        Math.min(15, immortalSpirits.length)
      );
      const topLegendaries = rankSpirits(legendarySpirits).slice(
        0,
        Math.min(25, legendarySpirits.length)
      );

      const mixedSpirits = [...topImmortals, ...topLegendaries];

      const mixedCombinations = generateCombinationsWithLimit(
        mixedSpirits,
        6,
        Math.min(50000, MAX_COMBINATIONS / 2)
      );

      let processedCount = 0;
      for (const combination of mixedCombinations) {
        const result = calculateEffectsForSpirits(combination);
        if (result) {
          results.push(result);
        }

        processedCount++;
        if (processedCount % 2000 === 0 && progressCallback) {
          const percentComplete =
            45 + Math.floor((processedCount / mixedCombinations.length) * 30);
          progressCallback(
            percentComplete,
            `${category} 결속 랭킹: 혼합 조합 ${processedCount}/${mixedCombinations.length} 계산 중`
          );
        }
      }

      // 4. 완전 등급 맞춤 조합 (4 불멸 + 2 전설, 3 불멸 + 3 전설 등)
      if (immortalSpirits.length >= 4 && legendarySpirits.length >= 2) {
        if (progressCallback) {
          progressCallback(
            75,
            `${category} 결속 랭킹: 등급 맞춤 조합 계산 중...`
          );
        }

        // 4 불멸 + 2 전설
        const immortal4Combinations = generateCombinationsWithLimit(
          immortalSpirits,
          4,
          Math.min(300, MAX_COMBINATIONS / 30)
        );

        const legendary2Combinations = generateCombinationsWithLimit(
          legendarySpirits,
          2,
          Math.min(300, MAX_COMBINATIONS / 30)
        );

        processedCount = 0;
        const totalGradeMatchCombos = Math.min(
          1000,
          immortal4Combinations.length * legendary2Combinations.length
        );
        let gradeMatchCount = 0;

        for (const immortalCombo of immortal4Combinations) {
          if (gradeMatchCount >= totalGradeMatchCombos) break;

          for (const legendaryCombo of legendary2Combinations) {
            if (gradeMatchCount >= totalGradeMatchCombos) break;

            const combo = [...immortalCombo, ...legendaryCombo];
            const result = calculateEffectsForSpirits(combo);
            if (result) {
              results.push(result);
            }

            gradeMatchCount++;
            if (gradeMatchCount % 200 === 0 && progressCallback) {
              const percentComplete =
                75 + Math.floor((gradeMatchCount / totalGradeMatchCombos) * 15);
              progressCallback(
                percentComplete,
                `${category} 결속 랭킹: 등급 맞춤 조합 ${gradeMatchCount}/${totalGradeMatchCombos} 계산 중`
              );
            }
          }
        }
      }

      if (progressCallback) {
        progressCallback(
          90,
          `${category} 결속 랭킹: 총 ${results.length}개 조합 계산 완료, 정렬 중...`
        );
      }

      // 환산합산(scoreWithBind) 값을 기준으로 내림차순 정렬
      results.sort((a, b) => {
        const scoreA = parseFloat(a.scoreWithBind) || 0;
        const scoreB = parseFloat(b.scoreWithBind) || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
      });

      // 결과 중복 제거 (동일한 환수 조합)
      const uniqueResults = [];
      const seen = new Set();

      for (const result of results) {
        // 환수 이름을 정렬하여 동일 조합 식별
        const key = result.spirits
          .map((s) => s.name)
          .sort()
          .join("|");
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResults.push(result);
        }
      }

      const topResults = uniqueResults.slice(0, totalNumberOfResults);

      if (progressCallback) {
        progressCallback(
          95,
          `${category} 결속 랭킹: 상위 ${topResults.length}개 결과 선택 완료`
        );
      }

      rankingData.bond[category] = topResults;

      rankingMeta.bondRankings[category] = {
        count: topResults.length,
        updatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      };
      rankingMeta.lastUpdated = new Date().toISOString();

      if (progressCallback) {
        progressCallback(100, `${category} 결속 랭킹: 계산 완료`);
      }

      return {
        success: true,
        count: topResults.length,
        fileName: getCategoryFileName(category, "bond"),
      };
    } catch (error) {
      console.error(`${category} 결속 랭킹 계산 중 오류:`, error);
      throw error;
    }
  }

  async function calculateAndStoreBondRankings(category, progressCallback) {
    try {
      if (progressCallback) {
        progressCallback(0, `${category} 결속 랭킹: 준비 중...`);
      }

      // 데이터가 없으면 먼저 로드 시도
      if (!mobData || !mobData[category] || !mobData[category].length) {
        if (progressCallback) {
          progressCallback(1, `${category} 결속 랭킹: 환수 데이터 로드 중...`);
        }

        await loadAllData();

        if (!mobData || !mobData[category] || !mobData[category].length) {
          console.error(`${category} 데이터 로드 실패:`, mobData);
          throw new Error(
            `${category} 환수 데이터를 로드할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.`
          );
        }

        if (progressCallback) {
          progressCallback(
            2,
            `${category} 결속 랭킹: 환수 데이터 로드 완료 (${mobData[category].length}개 환수)`
          );
        }
      }

      await calculateBondRankings(category, progressCallback);

      const fileName = getCategoryFileName(category, "bond");
      const data = {
        category: category,
        updatedAt: rankingMeta.bondRankings[category].updatedAt,
        rankings: rankingData.bond[category] || [],
      };

      // 저장 전에 다시 한 번 정렬 확인
      if (data.rankings && Array.isArray(data.rankings)) {
        data.rankings.sort((a, b) => {
          const scoreA = parseFloat(a.scoreWithBind) || 0;
          const scoreB = parseFloat(b.scoreWithBind) || 0;
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
        });
      }

      downloadJsonFile(data, fileName);
      return {
        success: true,
        count: rankingData.bond[category].length,
        fileName: fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing bond rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  function generateCombinationsWithLimit(array, size, limit) {
    if (array.length > 20) {
      return generateNonRecursiveCombinations(array, size, limit);
    }

    function combine(start, current) {
      if (current.length === size) {
        return [current.slice()];
      }

      if (start >= array.length) {
        return [];
      }

      if (array.length - start < size - current.length) {
        return [];
      }

      if (result.length >= limit) {
        return [];
      }

      current.push(array[start]);
      const withCurrent = combine(start + 1, current);
      current.pop();

      const withoutCurrent = combine(start + 1, current);

      return [...withCurrent, ...withoutCurrent];
    }

    let result = [];
    const maxCombinations = Math.min(
      limit,
      binomialCoefficient(array.length, size)
    );

    if (maxCombinations > 10000) {
      return generateNonRecursiveCombinations(array, size, limit);
    }

    result = combine(0, []);
    return result.slice(0, limit);
  }

  function generateNonRecursiveCombinations(array, size, limit) {
    const result = [];
    const n = array.length;

    const indices = Array(size)
      .fill(0)
      .map((_, i) => i);

    result.push(indices.map((i) => array[i]));

    while (result.length < limit) {
      let i = size - 1;
      while (i >= 0 && indices[i] == i + n - size) {
        i--;
      }

      if (i < 0) break;

      indices[i]++;

      for (let j = i + 1; j < size; j++) {
        indices[j] = indices[j - 1] + 1;
      }

      result.push(indices.map((idx) => array[idx]));
    }

    return result;
  }

  function binomialCoefficient(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= n - (i - 1);
      result /= i;
    }
    return Math.floor(result);
  }

  async function calculateLegendaryBondRankings(
    category,
    progressCallback = null
  ) {
    if (!mobData[category] || !Array.isArray(mobData[category])) {
      throw new Error(`Invalid data for category: ${category}`);
    }

    const legendarySpirits = mobData[category]
      .filter(
        (spirit) =>
          spirit.grade === "전설" ||
          (spirit.grade && spirit.grade.includes("전설"))
      )
      .map((spirit) => {
        const spiritCopy = JSON.parse(JSON.stringify(spirit));
        if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
          const level25Stat = spiritCopy.stats.find(
            (stat) => stat && stat.level === 25
          );
          spiritCopy.stats = level25Stat ? [level25Stat] : [];
        }

        return {
          ...spiritCopy,
          level: 25,
          category: category,
          grade: "전설",
          faction: spiritCopy.influence || spiritCopy.faction || "결의",
        };
      });

    if (legendarySpirits.length === 0) {
      throw new Error(`No legendary spirits found for category: ${category}`);
    }

    if (progressCallback) {
      progressCallback(
        5,
        `${category} 전설 환수 결속 랭킹: ${legendarySpirits.length}개 전설 환수 준비 완료`
      );
    }

    const MAX_COMBINATIONS = 100000;

    const startTime = Date.now();
    let combinations = [];

    if (legendarySpirits.length > 30) {
      const rankedSpirits = rankSpirits(legendarySpirits);
      const topSpirits = rankedSpirits.slice(0, 35);

      if (progressCallback) {
        progressCallback(
          10,
          `${category} 전설 환수 결속 랭킹: 상위 35개 전설 환수 선택 완료`
        );
      }

      combinations = generateCombinationsWithLimit(
        topSpirits,
        6,
        MAX_COMBINATIONS
      );
    } else {
      combinations = generateCombinationsWithLimit(
        legendarySpirits,
        6,
        MAX_COMBINATIONS
      );
    }

    const totalCombinations = combinations.length;

    if (progressCallback) {
      progressCallback(
        15,
        `${category} 전설 환수 결속 랭킹: ${totalCombinations}개 조합 생성 완료`
      );
    }

    const results = [];
    let processedCount = 0;

    for (const combination of combinations) {
      const result = calculateEffectsForSpirits(combination);
      if (result) {
        results.push(result);
      }

      processedCount++;
      if (processedCount % 1000 === 0 && progressCallback) {
        const percentComplete =
          15 + Math.floor((processedCount / totalCombinations) * 80);
        progressCallback(
          percentComplete,
          `${category} 전설 환수 결속 랭킹: ${processedCount}/${totalCombinations} 조합 계산 중`
        );
      }
    }

    // 환산합산(scoreWithBind) 값을 기준으로 명확하게 내림차순 정렬
    results.sort((a, b) => {
      const scoreA = parseFloat(a.scoreWithBind) || 0;
      const scoreB = parseFloat(b.scoreWithBind) || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
    });

    const topResults = results.slice(0, totalNumberOfResults);

    if (progressCallback) {
      progressCallback(
        95,
        `${category} 전설 환수 결속 랭킹: 상위 ${totalNumberOfResults}개 결과 선택 완료`
      );
    }

    const categoryName = getCategoryFileName(category, "bond").replace(
      "bond-rankings-",
      ""
    );
    const fileName = `legendary-bond-rankings-${categoryName}`;

    const jsonData = {
      category: category,
      type: "legendary-only",
      updatedAt: new Date().toISOString(),
      rankings: topResults,
    };

    downloadJsonFile(jsonData, fileName);

    if (progressCallback) {
      progressCallback(100, `${category} 전설 환수 결속 랭킹: 계산 완료`);
    }

    return {
      success: true,
      count: topResults.length,
      fileName: fileName,
    };
  }

  async function calculateAndStoreLegendaryBondRankings(
    category,
    progressCallback
  ) {
    try {
      const result = await calculateLegendaryBondRankings(
        category,
        progressCallback
      );

      return {
        success: true,
        count: result.count,
        fileName: result.fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing legendary bond rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // async function calculateStatRankings(category, progressCallback = null) {
  //   if (!mobData[category] || !Array.isArray(mobData[category])) {
  //     throw new Error(`Invalid data for category: ${category}`);
  //   }

  //   const spirits = mobData[category]
  //     .filter((spirit) => spirit && spirit.stats && Array.isArray(spirit.stats))
  //     .map((spirit) => {
  //       const spiritCopy = { ...spirit };
  //       if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
  //         const level25Stat = spiritCopy.stats.find(
  //           (stat) => stat && stat.level === 25
  //         );
  //         spiritCopy.stats = level25Stat ? [level25Stat] : [];
  //       }
  //       return spiritCopy;
  //     });

  //   if (spirits.length === 0) {
  //     throw new Error(`No valid spirits found for category: ${category}`);
  //   }

  //   if (progressCallback) {
  //     progressCallback(10, `${category} 능력치 랭킹: 환수 데이터 준비 완료`);
  //   }

  //   const statTypes = new Set();

  //   spirits.forEach((spirit) => {
  //     const level25Stat = spirit.stats?.[0];
  //     if (level25Stat) {
  //       if (level25Stat.registrationStat) {
  //         Object.keys(level25Stat.registrationStat).forEach((key) => {
  //           const normalizedKey = normalizeStatKey(key);
  //           statTypes.add(normalizedKey);
  //         });
  //       }

  //       if (level25Stat.bindStat) {
  //         Object.keys(level25Stat.bindStat).forEach((key) => {
  //           const normalizedKey = normalizeStatKey(key);
  //           statTypes.add(normalizedKey);
  //         });
  //       }
  //     }
  //   });

  //   const statArray = Array.from(statTypes);

  //   if (progressCallback) {
  //     progressCallback(
  //       20,
  //       `${category} 능력치 랭킹: ${statArray.length}개 능력치 유형 감지됨`
  //     );
  //   }

  //   const statRankings = {};
  //   let processedStats = 0;
  //   const totalStats = statArray.length;

  //   for (const statType of statArray) {
  //     const spiritRankings = [];

  //     spirits.forEach((spirit) => {
  //       const level25Stat = spirit.stats?.[0];
  //       if (!level25Stat) return;

  //       let statValue = 0;
  //       let isEstimated = false;
  //       let originalValue = null;

  //       if (level25Stat.registrationStat) {
  //         for (const [key, value] of Object.entries(
  //           level25Stat.registrationStat
  //         )) {
  //           if (normalizeStatKey(key) === statType) {
  //             if (isEstimatedValue(value)) {
  //               isEstimated = true;
  //               originalValue = value;
  //             }
  //             statValue += cleanEstimatedValue(value);
  //           }
  //         }
  //       }

  //       if (level25Stat.bindStat) {
  //         for (const [key, value] of Object.entries(level25Stat.bindStat)) {
  //           if (normalizeStatKey(key) === statType) {
  //             if (isEstimatedValue(value)) {
  //               isEstimated = true;
  //               originalValue = value;
  //             }
  //             statValue += cleanEstimatedValue(value);
  //           }
  //         }
  //       }

  //       if (statValue > 0) {
  //         spiritRankings.push({
  //           name: spirit.name,
  //           image: spirit.image,
  //           influence: spirit.influence || spirit.faction || "결의",
  //           grade: spirit.grade || "전설",
  //           value: statValue,
  //           regValue: regValue,
  //           bindValue: bindValue,
  //           isPercent: window.CommonData?.PERCENT_STATS?.includes(statType),
  //           isEstimated: isEstimated,
  //           originalValue: originalValue,
  //         });
  //       }
  //     });

  //     spiritRankings.sort((a, b) => b.value - a.value);

  //     if (spiritRankings.length > 0) {
  //       statRankings[statType] = spiritRankings;
  //     }

  //     processedStats++;
  //     if (progressCallback) {
  //       const percentComplete =
  //         20 + Math.floor((processedStats / totalStats) * 75);
  //       progressCallback(
  //         percentComplete,
  //         `${category} 능력치 랭킹: ${processedStats}/${totalStats} 능력치 계산 중`
  //       );
  //     }
  //   }

  //   rankingData.stat[category] = statRankings;

  //   rankingMeta.statRankings[category] = {
  //     statCount: Object.keys(statRankings).length,
  //     updatedAt: new Date().toISOString(),
  //   };
  //   rankingMeta.lastUpdated = new Date().toISOString();

  //   if (progressCallback) {
  //     progressCallback(100, `${category} 능력치 랭킹: 계산 완료`);
  //   }

  //   return {
  //     success: true,
  //     stats: Object.keys(statRankings).length,
  //     fileName: getCategoryFileName(category, "stat"),
  //   };
  // }

  async function calculateStatRankings(category, progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback(1, `${category} 능력치 랭킹: 환수 데이터 확인 중...`);
      }

      // 데이터가 없으면 강제 로드 시도
      if (
        !mobData ||
        !mobData[category] ||
        !Array.isArray(mobData[category]) ||
        mobData[category].length === 0
      ) {
        if (progressCallback) {
          progressCallback(
            2,
            `${category} 능력치 랭킹: 환수 데이터 다시 로드 중...`
          );
        }

        try {
          await loadAllData();
        } catch (loadError) {
          console.error("능력치 랭킹용 데이터 로드 실패:", loadError);
        }

        if (
          !mobData ||
          !mobData[category] ||
          !Array.isArray(mobData[category]) ||
          mobData[category].length === 0
        ) {
          console.error(`${category} 능력치 계산용 데이터 없음:`, mobData);
          throw new Error(`${category}에 대한 환수 데이터를 찾을 수 없습니다`);
        }
      }

      const spirits = mobData[category]
        .filter(
          (spirit) => spirit && spirit.stats && Array.isArray(spirit.stats)
        )
        .map((spirit) => {
          const spiritCopy = { ...spirit };
          if (spiritCopy.stats && Array.isArray(spiritCopy.stats)) {
            const level25Stat = spiritCopy.stats.find(
              (stat) => stat && stat.level === 25
            );
            spiritCopy.stats = level25Stat ? [level25Stat] : [];
          }
          return spiritCopy;
        });

      if (spirits.length === 0) {
        throw new Error(
          `카테고리 ${category}에 대한 처리 가능한 환수 데이터가 없습니다`
        );
      }

      if (progressCallback) {
        progressCallback(
          10,
          `${category} 능력치 랭킹: 환수 데이터 준비 완료 (${spirits.length}개 환수)`
        );
      }

      const statTypes = new Set();

      spirits.forEach((spirit) => {
        const level25Stat = spirit.stats?.[0];
        if (level25Stat) {
          if (level25Stat.registrationStat) {
            Object.keys(level25Stat.registrationStat).forEach((key) => {
              const normalizedKey = normalizeStatKey(key);
              statTypes.add(normalizedKey);
            });
          }

          if (level25Stat.bindStat) {
            Object.keys(level25Stat.bindStat).forEach((key) => {
              const normalizedKey = normalizeStatKey(key);
              statTypes.add(normalizedKey);
            });
          }
        }
      });

      const statArray = Array.from(statTypes);

      if (progressCallback) {
        progressCallback(
          20,
          `${category} 능력치 랭킹: ${statArray.length}개 능력치 유형 감지됨`
        );
      }

      const statRankings = {};
      let processedStats = 0;
      const totalStats = statArray.length;

      for (const statType of statArray) {
        const spiritRankings = [];

        spirits.forEach((spirit) => {
          const level25Stat = spirit.stats?.[0];
          if (!level25Stat) return;

          let statValue = 0;
          let regValue = 0; // 수정: 변수 초기화 추가
          let bindValue = 0; // 수정: 변수 초기화 추가
          let isEstimated = false;
          let originalValue = null;

          // 등록 효과 계산
          if (level25Stat.registrationStat) {
            for (const [key, value] of Object.entries(
              level25Stat.registrationStat
            )) {
              if (normalizeStatKey(key) === statType) {
                if (isEstimatedValue(value)) {
                  isEstimated = true;
                  originalValue = value;
                }
                const cleanValue = cleanEstimatedValue(value);
                regValue += cleanValue; // 수정: 등록 효과 누적
                statValue += cleanValue; // 수정: 총합에도 추가
              }
            }
          }

          // 장착 효과 계산
          if (level25Stat.bindStat) {
            for (const [key, value] of Object.entries(level25Stat.bindStat)) {
              if (normalizeStatKey(key) === statType) {
                if (isEstimatedValue(value)) {
                  isEstimated = true;
                  originalValue = value;
                }
                const cleanValue = cleanEstimatedValue(value);
                bindValue += cleanValue; // 수정: 장착 효과 누적
                statValue += cleanValue; // 수정: 총합에도 추가
              }
            }
          }

          // 능력치 값이 있는 경우만 추가
          if (statValue > 0) {
            spiritRankings.push({
              name: spirit.name,
              image: spirit.image,
              influence: spirit.influence || spirit.faction || "결의",
              grade: spirit.grade || "전설",
              value: statValue,
              regValue: regValue, // 수정: 정의된 변수 사용
              bindValue: bindValue, // 수정: 정의된 변수 사용
              isPercent: window.CommonData?.PERCENT_STATS?.includes(statType),
              isEstimated: isEstimated,
              originalValue: originalValue,
            });
          }
        });

        // 값을 기준으로 내림차순 정렬
        spiritRankings.sort((a, b) => b.value - a.value);

        // 결과가 있는 경우만 저장
        if (spiritRankings.length > 0) {
          statRankings[statType] = spiritRankings;
        }

        processedStats++;
        if (progressCallback) {
          const percentComplete =
            20 + Math.floor((processedStats / totalStats) * 75);
          progressCallback(
            percentComplete,
            `${category} 능력치 랭킹: ${processedStats}/${totalStats} 능력치 계산 중`
          );
        }
      }

      rankingData.stat[category] = statRankings;

      rankingMeta.statRankings[category] = {
        statCount: Object.keys(statRankings).length,
        updatedAt: new Date().toISOString(),
      };
      rankingMeta.lastUpdated = new Date().toISOString();

      if (progressCallback) {
        progressCallback(100, `${category} 능력치 랭킹: 계산 완료`);
      }

      return {
        success: true,
        stats: Object.keys(statRankings).length,
        fileName: getCategoryFileName(category, "stat"),
      };
    } catch (error) {
      console.error(`${category} 능력치 랭킹 계산 중 오류:`, error);
      throw error;
    }
  }

  async function calculateAndStoreStatRankings(category, progressCallback) {
    try {
      if (progressCallback) {
        progressCallback(0, `${category} 능력치 랭킹: 준비 중...`);
      }

      // 데이터가 없으면 먼저 로드 시도
      if (!mobData || !mobData[category] || !mobData[category].length) {
        if (progressCallback) {
          progressCallback(
            1,
            `${category} 능력치 랭킹: 환수 데이터 로드 중...`
          );
        }

        await loadAllData();

        if (!mobData || !mobData[category] || !mobData[category].length) {
          console.error(`${category} 데이터 로드 실패:`, mobData);
          throw new Error(
            `${category} 환수 데이터를 로드할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.`
          );
        }

        if (progressCallback) {
          progressCallback(
            2,
            `${category} 능력치 랭킹: 환수 데이터 로드 완료 (${mobData[category].length}개 환수)`
          );
        }
      }

      await calculateStatRankings(category, progressCallback);

      const fileName = getCategoryFileName(category, "stat");
      const data = {
        category: category,
        updatedAt: rankingMeta.statRankings[category].updatedAt,
        rankings: rankingData.stat[category] || {},
      };

      downloadJsonFile(data, fileName);

      return {
        success: true,
        stats: Object.keys(rankingData.stat[category]).length,
        fileName: fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing stat rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  function calculateEffectsForSpirits(spirits) {
    const registrationStats = {};
    const bindStats = {};
    const missingDataSpirits = [];
    const missingBindDataSpirits = [];
    const categoryGradeCount = {};
    const categoryFactionCount = {};
    const estimatedInfo = { hasEstimatedValues: false, spirits: [] };

    spirits.forEach((spirit) => {
      const levelStats = spirit.stats?.[0]?.registrationStat;
      const spiritEstimatedInfo = {
        name: spirit.name,
        hasEstimatedRegStats: false,
        hasEstimatedBindStats: false,
      };

      if (levelStats) {
        Object.entries(levelStats).forEach(([stat, value]) => {
          const normalizedStat = normalizeStatKey(stat);

          // 추정값 처리
          if (isEstimatedValue(value)) {
            spiritEstimatedInfo.hasEstimatedRegStats = true;
            estimatedInfo.hasEstimatedValues = true;
          }

          const numValue = cleanEstimatedValue(value);
          if (numValue !== 0) {
            registrationStats[normalizedStat] =
              (registrationStats[normalizedStat] || 0) + numValue;
          }
        });
      } else {
        missingDataSpirits.push(spirit.name);
      }

      let bindLevelStats = null;
      bindLevelStats = spirit.stats?.[0]?.bindStat;

      if (bindLevelStats) {
        Object.entries(bindLevelStats).forEach(([stat, value]) => {
          const normalizedStat = normalizeStatKey(stat);

          // 추정값 처리
          if (isEstimatedValue(value)) {
            spiritEstimatedInfo.hasEstimatedBindStats = true;
            estimatedInfo.hasEstimatedValues = true;
          }

          const numValue = cleanEstimatedValue(value);
          if (numValue !== 0) {
            bindStats[normalizedStat] =
              (bindStats[normalizedStat] || 0) + numValue;
          }
        });
      } else {
        missingBindDataSpirits.push(spirit.name);
      }

      const category = spirit.category;
      const grade = spirit.grade || "전설";
      const faction = spirit.influence || spirit.faction || "결의";

      if (!categoryGradeCount[category]) categoryGradeCount[category] = {};
      if (!categoryGradeCount[category][grade])
        categoryGradeCount[category][grade] = 0;
      categoryGradeCount[category][grade]++;

      if (!categoryFactionCount[category]) categoryFactionCount[category] = {};
      if (!categoryFactionCount[category][faction])
        categoryFactionCount[category][faction] = 0;
      categoryFactionCount[category][faction]++;

      // 추정값 정보 추가
      if (
        spiritEstimatedInfo.hasEstimatedRegStats ||
        spiritEstimatedInfo.hasEstimatedBindStats
      ) {
        estimatedInfo.spirits.push(spiritEstimatedInfo);
      }
    });

    const gradeEffects = calculateGradeSetEffects(categoryGradeCount);
    const factionEffects = calculateFactionSetEffects(categoryFactionCount);

    const registrationOnly = { ...registrationStats };

    const combinedEffects = { ...registrationStats };

    Object.entries(gradeEffects).forEach(([stat, value]) => {
      combinedEffects[stat] =
        ensureNumber(combinedEffects[stat]) + ensureNumber(value);
    });

    Object.entries(factionEffects).forEach(([stat, value]) => {
      combinedEffects[stat] =
        ensureNumber(combinedEffects[stat]) + ensureNumber(value);
    });

    const combinedEffectsWithBind = { ...combinedEffects };

    Object.entries(bindStats).forEach(([stat, value]) => {
      combinedEffectsWithBind[stat] =
        ensureNumber(combinedEffectsWithBind[stat]) + ensureNumber(value);
    });

    const regScore = calculateScore(registrationOnly);
    const gradeScore = calculateScore(gradeEffects);
    const factionScore = calculateScore(factionEffects);
    const bindScore = calculateScore(bindStats);
    const score = calculateScore(combinedEffects);
    const scoreWithBind = calculateScore(combinedEffectsWithBind);

    return {
      spirits,
      gradeEffects,
      factionEffects,
      bindStats,
      registrationOnly,
      combinedEffects,
      combinedEffectsWithBind,
      missingDataSpirits,
      missingBindDataSpirits,
      regScore,
      gradeScore,
      factionScore,
      score,
      scoreWithBind,
      bindScore,
      gradeCounts: categoryGradeCount,
      factionCounts: categoryFactionCount,
      usesEstimatedValues: estimatedInfo.hasEstimatedValues,
      estimatedInfo: estimatedInfo.hasEstimatedValues ? estimatedInfo : null,
    };
  }

  function calculateGradeSetEffects(categoryGradeCount) {
    const effects = {};

    if (!categoryGradeCount || typeof categoryGradeCount !== "object") {
      return effects;
    }

    for (const category in categoryGradeCount) {
      const categoryEffects = GRADE_SET_EFFECTS[category];
      if (!categoryEffects) continue;

      const grades = categoryGradeCount[category];
      for (const grade in grades) {
        const count = grades[grade];
        if (count < 2) continue;

        const gradeEffects = categoryEffects[grade];
        if (!gradeEffects) continue;

        let highestStep = 0;
        for (let step = 2; step <= Math.min(6, count); step++) {
          const stepStr = step.toString();
          if (gradeEffects[stepStr]) {
            highestStep = step;
          }
        }

        if (highestStep > 0) {
          const stepEffects = gradeEffects[highestStep.toString()];

          for (const stat in stepEffects) {
            const value = parseFloat(
              String(stepEffects[stat]).replace(/,/g, "")
            );
            if (!isNaN(value)) {
              effects[stat] = (effects[stat] || 0) + value;
            }
          }
        }
      }
    }

    return effects;
  }

  function calculateFactionSetEffects(categoryFactionCount) {
    const effects = {};

    for (const category in categoryFactionCount) {
      if (!FACTION_SET_EFFECTS[category]) {
        const factions = categoryFactionCount[category];
        for (const faction in factions) {
          const count = factions[faction];

          if (count >= 2) {
            if (faction === "결의" && count >= 3) {
              effects.pvpDamagePercent = (effects.pvpDamagePercent || 0) + 5;
            }
            if (faction === "고요" && count >= 3) {
              effects.pvpDefensePercent = (effects.pvpDefensePercent || 0) + 5;
            }
            if (faction === "냉정" && count >= 3) {
              effects.damageResistancePenetration =
                (effects.damageResistancePenetration || 0) + 50;
            }
            if (faction === "침착" && count >= 3) {
              effects.damageResistance = (effects.damageResistance || 0) + 50;
            }

            effects.power = (effects.power || 0) + count * 10;
          }
        }
        continue;
      }

      const factions = categoryFactionCount[category];

      for (const faction in factions) {
        const count = factions[faction];

        if (count < 2 || !FACTION_SET_EFFECTS[category][faction]) {
          continue;
        }

        let maxEffectCount = 0;
        let maxEffect = null;

        for (const effect of FACTION_SET_EFFECTS[category][faction]) {
          if (!effect || typeof effect !== "object") continue;

          const requiredCount = parseInt(effect["개수"] || "0");
          if (
            !isNaN(requiredCount) &&
            count >= requiredCount &&
            requiredCount > maxEffectCount
          ) {
            maxEffectCount = requiredCount;
            maxEffect = effect;
          }
        }

        if (maxEffect) {
          for (const stat in maxEffect) {
            if (stat === "개수") continue;

            const numValue = parseFloat(
              String(maxEffect[stat]).replace(/,/g, "")
            );
            if (!isNaN(numValue)) {
              const normalizedStat = normalizeStatKey(stat);
              effects[normalizedStat] =
                (effects[normalizedStat] || 0) + numValue;
            }
          }
        }
      }
    }

    return effects;
  }

  function calculateScore(effects) {
    if (!effects) return 0;

    const damageResistancePenetration = ensureNumber(
      cleanEstimatedValue(effects.damageResistancePenetration)
    );
    const damageResistance = ensureNumber(
      cleanEstimatedValue(effects.damageResistance)
    );
    const pvpDamagePercent =
      ensureNumber(cleanEstimatedValue(effects.pvpDamagePercent)) * 10;
    const pvpDefensePercent =
      ensureNumber(cleanEstimatedValue(effects.pvpDefensePercent)) * 10;

    return (
      damageResistancePenetration +
      damageResistance +
      pvpDamagePercent +
      pvpDefensePercent
    );
  }

  function rankSpirits(spirits) {
    return spirits
      .map((spirit) => {
        const level25Stat = spirit.stats?.[0];
        let regStats = level25Stat?.registrationStat || {};
        let bindStats = level25Stat?.bindStat || {};

        const dpr =
          ensureNumber(
            cleanEstimatedValue(regStats.damageResistancePenetration)
          ) +
          ensureNumber(
            cleanEstimatedValue(bindStats.damageResistancePenetration)
          );
        const dr =
          ensureNumber(cleanEstimatedValue(regStats.damageResistance)) +
          ensureNumber(cleanEstimatedValue(bindStats.damageResistance));
        const pvpDmg =
          ensureNumber(cleanEstimatedValue(regStats.pvpDamagePercent)) * 10 +
          ensureNumber(cleanEstimatedValue(bindStats.pvpDamagePercent)) * 10;
        const pvpDef =
          ensureNumber(cleanEstimatedValue(regStats.pvpDefensePercent)) * 10 +
          ensureNumber(cleanEstimatedValue(bindStats.pvpDefensePercent)) * 10;

        const score = dpr + dr + pvpDmg + pvpDef;

        return {
          ...spirit,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async function calculateAllRankings(progressCallback = null) {
    const categories = ["수호", "탑승", "변신"];
    let results = [];

    for (const category of categories) {
      try {
        await calculateBondRankings(category, (percent, message) => {
          if (progressCallback) {
            progressCallback(percent, `${category} 결속 랭킹: ${message}`);
          }
        });

        results.push({
          category,
          type: "bond",
          success: true,
        });
      } catch (error) {
        console.error(
          `Error calculating bond rankings for ${category}:`,
          error
        );
        results.push({
          category,
          type: "bond",
          success: false,
          error: error.message,
        });
      }

      try {
        await calculateStatRankings(category, (percent, message) => {
          if (progressCallback) {
            progressCallback(percent, `${category} 능력치 랭킹: ${message}`);
          }
        });

        results.push({
          category,
          type: "stat",
          success: true,
        });
      } catch (error) {
        console.error(
          `Error calculating stat rankings for ${category}:`,
          error
        );
        results.push({
          category,
          type: "stat",
          success: false,
          error: error.message,
        });
      }
    }

    await saveRankingData();

    return results;
  }

  async function saveToFirebase(data, fileName) {
    try {
      if (
        typeof firebase === "undefined" ||
        !firebase.apps ||
        !firebase.apps.length
      ) {
        console.warn("Firebase not available for saving data");
        return false;
      }

      const optimizedData = optimizeDataForStorage(data);

      if (
        fileName.includes("bond-rankings") &&
        optimizedData.rankings &&
        Array.isArray(optimizedData.rankings)
      ) {
        optimizedData.rankings.sort((a, b) => {
          const scoreA = parseFloat(a.scoreWithBind) || 0;
          const scoreB = parseFloat(b.scoreWithBind) || 0;
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
        });

        if (window.addLogEntry && optimizedData.rankings.length > 1) {
          const first = optimizedData.rankings[0]?.scoreWithBind || 0;
          const second = optimizedData.rankings[1]?.scoreWithBind || 0;
          const last =
            optimizedData.rankings[optimizedData.rankings.length - 1]
              ?.scoreWithBind || 0;
          window.addLogEntry(
            `정렬 확인: 1등 점수 ${first}, 2등 점수 ${second}, 마지막 항목 점수 ${last}`,
            "info"
          );
        }
      }

      const jsonSize = JSON.stringify(optimizedData).length;

      if (jsonSize > 1000000) {
        if (window.addLogEntry) {
          window.addLogEntry(
            `경고: 데이터 크기가 큽니다: ${(jsonSize / 1024 / 1024).toFixed(
              2
            )}MB - 추가 최적화 진행`,
            "warning"
          );
        }

        if (optimizedData.rankings && Array.isArray(optimizedData.rankings)) {
          optimizedData.rankings = optimizedData.rankings.map((item) => {
            if (item.spirits) {
              item.spirits = item.spirits.map((spirit) => ({
                name: spirit.name,
                image: spirit.image,
                category: spirit.category,
                grade: spirit.grade,
                faction: spirit.faction || spirit.influence || "결의",
              }));
            }

            return {
              spirits: item.spirits,
              gradeEffects: item.gradeEffects,
              factionEffects: item.factionEffects,
              bindStats: item.bindStats,
              scoreWithBind: item.scoreWithBind,
              score: item.score,
              gradeCounts: item.gradeCounts,
              factionCounts: item.factionCounts,
            };
          });

          let reducedCount = optimizedData.rankings.length;
          while (
            JSON.stringify({
              ...optimizedData,
              rankings: optimizedData.rankings.slice(0, reducedCount),
            }).length > 1000000 &&
            reducedCount > 50 // 최소 50개는 유지
          ) {
            reducedCount = Math.floor(reducedCount * 0.9); // 10%씩 줄이기
          }

          if (reducedCount < optimizedData.rankings.length) {
            optimizedData.rankings = optimizedData.rankings.slice(
              0,
              reducedCount
            );
            if (window.addLogEntry) {
              window.addLogEntry(
                `Firebase 크기 제한으로 인해 랭킹이 ${reducedCount}개로 제한됨`,
                "warning"
              );
            }
          }
        }
      }

      const db = firebase.firestore();

      try {
        const docRef = db.collection("mobRankingData").doc(fileName);
        await docRef.set(optimizedData);
        if (window.addLogEntry) {
          window.addLogEntry(
            `${fileName} Firebase에 저장 성공 (최적화됨)`,
            "success"
          );
        }
        return true;
      } catch (error) {
        if (window.addLogEntry) {
          window.addLogEntry(`Firebase 저장 오류: ${error.message}`, "error");
        }

        if (error.message.includes("exceeds the maximum allowed size")) {
          if (window.addLogEntry) {
            window.addLogEntry(
              "크기 제한으로 인해 추가 최적화 시도 중...",
              "warning"
            );
          }

          if (optimizedData.rankings && optimizedData.rankings.length > 10) {
            optimizedData.rankings = optimizedData.rankings.slice(0, 10);
            optimizedData.limitedDueToSize = true;

            try {
              await db
                .collection("mobRankingData")
                .doc(fileName)
                .set(optimizedData);
              if (window.addLogEntry) {
                window.addLogEntry(
                  `${fileName} 상위 10개 결과만 Firebase에 저장됨`,
                  "success"
                );
              }
              return true;
            } catch (innerError) {
              if (window.addLogEntry) {
                window.addLogEntry(
                  `최종 시도도 실패: ${innerError.message}`,
                  "error"
                );
              }
            }
          }
        }

        return false;
      }
    } catch (error) {
      console.error(`Error saving ${fileName} to Firebase:`, error);
      return false;
    }
  }

  async function saveRankingData() {
    const categories = ["수호", "탑승", "변신"];

    downloadJsonFile(rankingMeta, "rankings-meta");
    saveToFirebase(rankingMeta, "rankings-meta");

    for (const category of categories) {
      const fileName = getCategoryFileName(category, "bond");
      const data = {
        category: category,
        updatedAt: rankingMeta.bondRankings[category].updatedAt,
        rankings: rankingData.bond[category] || [],
      };

      downloadJsonFile(data, fileName);
      saveToFirebase(data, fileName);
    }

    for (const category of categories) {
      const fileName = getCategoryFileName(category, "stat");
      const data = {
        category: category,
        updatedAt: rankingMeta.statRankings[category].updatedAt,
        rankings: rankingData.stat[category] || {},
      };

      downloadJsonFile(data, fileName);
      saveToFirebase(data, fileName);
    }
  }

  function getCategoryFileName(category, type) {
    const categoryMap = {
      수호: "guardian",
      탑승: "ride",
      변신: "transform",
    };

    const prefix = type === "bond" ? "bond-rankings" : "stat-rankings";
    return `${prefix}-${categoryMap[category]}`;
  }

  function downloadJsonFile(data, fileName) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 100);

    saveToFirebase(data, fileName).then((success) => {
      if (success) {
        if (window.addLogEntry) {
          window.addLogEntry(`${fileName} Firebase에 저장 완료`, "success");
        }
      } else {
        if (window.addLogEntry) {
          window.addLogEntry(`${fileName} Firebase 저장 실패`, "warning");
        }
      }
    });
  }

  async function calculateAndStoreBondRankings(category, progressCallback) {
    try {
      await calculateBondRankings(category, progressCallback);

      const fileName = getCategoryFileName(category, "bond");
      const data = {
        category: category,
        updatedAt: rankingMeta.bondRankings[category].updatedAt,
        rankings: rankingData.bond[category] || [],
      };

      // 저장 전에 다시 한 번 정렬 확인
      if (data.rankings && Array.isArray(data.rankings)) {
        data.rankings.sort((a, b) => {
          const scoreA = parseFloat(a.scoreWithBind) || 0;
          const scoreB = parseFloat(b.scoreWithBind) || 0;
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
        });
      }

      downloadJsonFile(data, fileName);
      return {
        success: true,
        count: rankingData.bond[category].length,
        fileName: fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing bond rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async function calculateAndStoreStatRankings(category, progressCallback) {
    try {
      await calculateStatRankings(category, progressCallback);

      const fileName = getCategoryFileName(category, "stat");
      const data = {
        category: category,
        updatedAt: rankingMeta.statRankings[category].updatedAt,
        rankings: rankingData.stat[category] || {},
      };

      downloadJsonFile(data, fileName);

      return {
        success: true,
        stats: Object.keys(rankingData.stat[category]).length,
        fileName: fileName,
      };
    } catch (error) {
      console.error(
        `Error calculating and storing stat rankings for ${category}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async function downloadAllRankingsAsZip() {
    try {
      const zip = new JSZip();

      zip.file("rankings-meta.json", JSON.stringify(rankingMeta, null, 2));
      saveToFirebase(rankingMeta, "rankings-meta");

      for (const category of ["수호", "탑승", "변신"]) {
        const fileName = `${getCategoryFileName(category, "bond")}.json`;
        const data = {
          category: category,
          updatedAt: rankingMeta.bondRankings[category].updatedAt,
          rankings: rankingData.bond[category] || [],
        };

        // 저장 전에 다시 한 번 정렬 확인
        if (data.rankings && Array.isArray(data.rankings)) {
          data.rankings.sort((a, b) => {
            const scoreA = parseFloat(a.scoreWithBind) || 0;
            const scoreB = parseFloat(b.scoreWithBind) || 0;
            if (scoreA !== scoreB) {
              return scoreB - scoreA;
            }
            return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
          });
        }

        zip.file(fileName, JSON.stringify(data, null, 2));
        saveToFirebase(data, getCategoryFileName(category, "bond"));
      }

      for (const category of ["수호", "탑승", "변신"]) {
        const fileName = `${getCategoryFileName(category, "stat")}.json`;
        const data = {
          category: category,
          updatedAt: rankingMeta.statRankings[category].updatedAt,
          rankings: rankingData.stat[category] || {},
        };

        zip.file(fileName, JSON.stringify(data, null, 2));
        saveToFirebase(data, getCategoryFileName(category, "stat"));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      const url = URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `spirit-rankings-${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      if (window.addLogEntry) {
        window.addLogEntry(
          "모든 랭킹 데이터가 Firebase에 저장되었습니다",
          "success"
        );
      }

      return true;
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      return false;
    }
  }

  return {
    loadAllData,
    calculateBondRankings,
    calculateStatRankings,
    calculateAllRankings,
    calculateAndStoreBondRankings,
    calculateAndStoreStatRankings,
    calculateLegendaryBondRankings,
    calculateAndStoreLegendaryBondRankings,
    downloadAllRankingsAsZip,
    saveRankingData,
  };
})();

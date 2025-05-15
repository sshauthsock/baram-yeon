// bondUtils.js - 결속 및 랭킹 관련 공통 유틸리티 함수

window.BondUtils = (function () {
  // 의존성
  const STATS_MAPPING = window.CommonData.STATS_MAPPING;
  const PERCENT_STATS = window.CommonData.PERCENT_STATS;
  const STAT_COLOR_MAP = window.CommonData.STAT_COLOR_MAP;

  // 숫자 변환 함수
  function ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  }

  // 스탯 키 정규화
  function normalizeStatKey(key) {
    return key.replace(/\d+$/, "");
  }

  // 효과 목록 렌더링 (BondCalculator와 동일)
  // function renderEffectsList(
  //   effectsData,
  //   setInfo = "",
  //   includePercentWithNormal = true
  // ) {
  //   if (!effectsData) effectsData = {};

  //   let html = "";

  //   if (Object.keys(effectsData).length === 0) {
  //     return html + "<p>적용된 효과가 없습니다.</p>";
  //   }

  //   const priorityStats = [
  //     "damageResistancePenetration",
  //     "damageResistance",
  //     "pvpDamagePercent",
  //     "pvpDefensePercent",
  //     "power",
  //     "movementSpeed",
  //     "criticalPowerPercent",
  //     "statusEffectResistance",
  //     "statusEffectAccuracy",
  //   ];

  //   const percentStats = PERCENT_STATS || [];

  //   let sortedStatKeys = Object.keys(effectsData).sort((a, b) => {
  //     const aPriority = priorityStats.indexOf(normalizeStatKey(a));
  //     const bPriority = priorityStats.indexOf(normalizeStatKey(b));

  //     if (aPriority !== -1 && bPriority !== -1) {
  //       return aPriority - bPriority;
  //     } else if (aPriority !== -1) {
  //       return -1;
  //     } else if (bPriority !== -1) {
  //       return 1;
  //     } else {
  //       return (STATS_MAPPING[normalizeStatKey(a)] || a).localeCompare(
  //         STATS_MAPPING[normalizeStatKey(b)] || b
  //       );
  //     }
  //   });

  //   if (includePercentWithNormal) {
  //     for (const stat of sortedStatKeys) {
  //       if (!stat) continue;
  //       const value = effectsData[stat];

  //       const normalizedStat = normalizeStatKey(stat);
  //       const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

  //       const isPercentStat =
  //         Array.isArray(percentStats) && percentStats.includes(normalizedStat);

  //       const displayValue = isPercentStat
  //         ? `${Math.round(value * 100) / 100}%`
  //         : Math.round(value * 100) / 100;

  //       const colorClass =
  //         (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //       const cssClass = isPercentStat
  //         ? `effect-item effect-item-percent ${colorClass}`
  //         : `effect-item ${colorClass}`;

  //       html += `<div class="${cssClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${displayValue}</span></div>`;
  //     }
  //   } else {
  //     const normalEffects = {};
  //     const percentEffects = {};

  //     for (const stat of sortedStatKeys) {
  //       if (!stat) continue;

  //       const normalizedStat = normalizeStatKey(stat);
  //       const value = effectsData[stat];

  //       if (
  //         Array.isArray(percentStats) &&
  //         percentStats.includes(normalizedStat)
  //       ) {
  //         percentEffects[normalizedStat] = value;
  //       } else {
  //         normalEffects[normalizedStat] = value;
  //       }
  //     }

  //     const normalStatKeys = Object.keys(normalEffects).sort((a, b) => {
  //       const aPriority = priorityStats.indexOf(a);
  //       const bPriority = priorityStats.indexOf(b);

  //       if (aPriority !== -1 && bPriority !== -1) {
  //         return aPriority - bPriority;
  //       } else if (aPriority !== -1) {
  //         return -1;
  //       } else if (bPriority !== -1) {
  //         return 1;
  //       } else {
  //         return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
  //       }
  //     });

  //     if (normalStatKeys.length > 0) {
  //       for (const stat of normalStatKeys) {
  //         const value = normalEffects[stat];
  //         const normalizedStat = normalizeStatKey(stat);
  //         const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
  //         const colorClass =
  //           (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //         html += `<div class="effect-item ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${
  //           Math.round(value * 100) / 100
  //         }</span></div>`;
  //       }
  //     }

  //     const percentStatKeys = Object.keys(percentEffects).sort((a, b) => {
  //       const aPriority = priorityStats.indexOf(a);
  //       const bPriority = priorityStats.indexOf(b);

  //       if (aPriority !== -1 && bPriority !== -1) {
  //         return aPriority - bPriority;
  //       } else if (aPriority !== -1) {
  //         return -1;
  //       } else if (bPriority !== -1) {
  //         return 1;
  //       } else {
  //         return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
  //       }
  //     });

  //     if (percentStatKeys.length > 0) {
  //       html += `<div class="section-header">퍼센트 효과</div>`;
  //       for (const stat of percentStatKeys) {
  //         const value = percentEffects[stat];
  //         const normalizedStat = normalizeStatKey(stat);
  //         const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
  //         const colorClass =
  //           (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
  //         html += `<div class="effect-item effect-item-percent ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${
  //           Math.round(value * 100) / 100
  //         }%</span></div>`;
  //       }
  //     }
  //   }

  //   return html;
  // }

  function renderEffectsList(
    effectsData,
    setInfo = "",
    includePercentWithNormal = true
  ) {
    if (!effectsData) effectsData = {};

    let html = "";

    if (Object.keys(effectsData).length === 0) {
      return html + "<p>적용된 효과가 없습니다.</p>";
    }

    const priorityStats = [
      "damageResistancePenetration",
      "damageResistance",
      "pvpDamagePercent",
      "pvpDefensePercent",
      "power",
      "movementSpeed",
      "criticalPowerPercent",
      "statusEffectResistance",
      "statusEffectAccuracy",
    ];

    const percentStats = PERCENT_STATS || [];

    let sortedStatKeys = Object.keys(effectsData).sort((a, b) => {
      const aPriority = priorityStats.indexOf(normalizeStatKey(a));
      const bPriority = priorityStats.indexOf(normalizeStatKey(b));

      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      } else if (aPriority !== -1) {
        return -1;
      } else if (bPriority !== -1) {
        return 1;
      } else {
        return (STATS_MAPPING[normalizeStatKey(a)] || a).localeCompare(
          STATS_MAPPING[normalizeStatKey(b)] || b
        );
      }
    });

    if (includePercentWithNormal) {
      for (const stat of sortedStatKeys) {
        if (!stat) continue;
        const value = effectsData[stat];

        const normalizedStat = normalizeStatKey(stat);
        const statName = STATS_MAPPING[normalizedStat] || normalizedStat;

        const isPercentStat =
          Array.isArray(percentStats) && percentStats.includes(normalizedStat);

        const displayValue = isPercentStat
          ? `${Math.round(value * 100) / 100}%`
          : Math.round(value * 100) / 100;

        const colorClass =
          (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
        const cssClass = isPercentStat
          ? `effect-item effect-item-percent ${colorClass}`
          : `effect-item ${colorClass}`;

        html += `<div class="${cssClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${displayValue}</span></div>`;
      }
    } else {
      const normalEffects = {};
      const percentEffects = {};

      for (const stat of sortedStatKeys) {
        if (!stat) continue;

        const normalizedStat = normalizeStatKey(stat);
        const value = effectsData[stat];

        if (
          Array.isArray(percentStats) &&
          percentStats.includes(normalizedStat)
        ) {
          percentEffects[normalizedStat] = value;
        } else {
          normalEffects[normalizedStat] = value;
        }
      }

      const normalStatKeys = Object.keys(normalEffects).sort((a, b) => {
        const aPriority = priorityStats.indexOf(a);
        const bPriority = priorityStats.indexOf(b);

        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        } else {
          return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
        }
      });

      if (normalStatKeys.length > 0) {
        for (const stat of normalStatKeys) {
          const value = normalEffects[stat];
          const normalizedStat = normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${
            Math.round(value * 100) / 100
          }</span></div>`;
        }
      }

      const percentStatKeys = Object.keys(percentEffects).sort((a, b) => {
        const aPriority = priorityStats.indexOf(a);
        const bPriority = priorityStats.indexOf(b);

        if (aPriority !== -1 && bPriority !== -1) {
          return aPriority - bPriority;
        } else if (aPriority !== -1) {
          return -1;
        } else if (bPriority !== -1) {
          return 1;
        } else {
          return (STATS_MAPPING[a] || a).localeCompare(STATS_MAPPING[b] || b);
        }
      });

      if (percentStatKeys.length > 0) {
        html += `<div class="section-header">퍼센트 효과</div>`;
        for (const stat of percentStatKeys) {
          const value = percentEffects[stat];
          const normalizedStat = normalizeStatKey(stat);
          const statName = STATS_MAPPING[normalizedStat] || normalizedStat;
          const colorClass =
            (STAT_COLOR_MAP && STAT_COLOR_MAP[normalizedStat]) || "";
          html += `<div class="effect-item effect-item-percent ${colorClass}" data-stat="${normalizedStat}"><span>${statName}</span><span>${
            Math.round(value * 100) / 100
          }%</span></div>`;
        }
      }
    }

    return html;
  }

  // 점수 계산 함수
  function calculateScore(effects) {
    const damageResistancePenetration = ensureNumber(
      effects.damageResistancePenetration
    );
    const damageResistance = ensureNumber(effects.damageResistance);
    const pvpDamagePercent = ensureNumber(effects.pvpDamagePercent) * 10;
    const pvpDefensePercent = ensureNumber(effects.pvpDefensePercent) * 10;

    return (
      damageResistancePenetration +
      damageResistance +
      pvpDamagePercent +
      pvpDefensePercent
    );
  }

  // 모달 열기
  function openDetailModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  // 모달 닫기
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  }

  // 환수 정보 HTML 생성
  function generateSpiritsInfoHTML(spirits) {
    if (!spirits || !Array.isArray(spirits) || spirits.length === 0) {
      return "<p>환수 정보가 없습니다.</p>";
    }

    let html = "";
    spirits.forEach((spirit) => {
      html += `
                <div class="spirit-info-item">
                    <img src="${spirit.image}" alt="${spirit.name}">
                    <div class="spirit-info-details">
                        <div class="spirit-info-name">${spirit.name}</div>
                        <div class="spirit-info-level">레벨: ${spirit.level}, ${
        spirit.grade
      }, ${spirit.faction || spirit.influence || "정보 없음"}</div>
                    </div>
                </div>
            `;
    });

    return html;
  }

  // 공개 API
  return {
    ensureNumber,
    normalizeStatKey,
    renderEffectsList,
    calculateScore,
    openDetailModal,
    closeModal,
    generateSpiritsInfoHTML,
  };
})();

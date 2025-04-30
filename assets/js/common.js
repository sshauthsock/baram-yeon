window.CommonData = window.CommonData || {};

CommonData.STATS_MAPPING = {
  criticalPower: "치명위력",
  normalMonsterAdditionalDamage: "일반몬스터추가피해",
  normalMonsterPenetration: "일반몬스터관통",
  healthIncrease: "체력증가",
  healthIncreasePercent: "체력증가%",
  strength: "힘",
  agility: "민첩",
  intelligence: "지력",
  damageAbsorption: "피해흡수",
  damageResistancePenetration: "피해저항관통",
  magicIncrease: "마력증가",
  magicIncreasePercent: "마력증가%",
  damageResistance: "피해저항",
  healthPotionEnhancement: "체력시약향상",
  healthRecoveryImprovement: "체력회복향상",
  damageIncrease: "피해증가",
  magicRecoveryImprovement: "마나회복향상",
  criticalChance: "치명확률",
  bossMonsterAdditionalDamage: "보스몬스터추가피해",
  bossMonsterPenetration: "보스몬스터관통",
  power: "위력",
  magicPotionEnhancement: "마력시약향상",
  magicRecoveryImprovement: "마력회복향상",
  pvpDamage: "대인피해",
  pvpDefense: "대인방어",
  statusEffectAccuracy: "상태이상적중",
  statusEffectResistance: "상태이상저항",
  criticalPowerPercent: "치명위력%",
  pvpDamagePercent: "대인피해%",
  pvpDefensePercent: "대인방어%",
  criticalDamageResistance: "치명피해저항",
  criticalResistance: "치명저항",
  movementSpeed: "이동속도",
  destructionPowerIncrease: "파괴력증가",
  destructionPowerPercent: "파괴력증가%",
  armorStrength: "무장도",
  lootAcquisitionIncrease: "전리품획득증가",
  experienceGainIncrease: "경험치획득증가",
};

CommonData.CATEGORY_FILE_MAP = {
  수호: {
    registration: "guardian-registration-stats",
    bind: "guardian-bind-stats",
  },
  탑승: {
    registration: "ride-registration-stats",
    bind: "ride-bind-stats",
  },
  변신: {
    registration: "transform-registration-stats",
    bind: "transform-bind-stats",
  },
};

CommonData.DOCUMENT_MAP = {
  "guardian-bind-stats.json": "data-1745203971906",
  "guardian-registration-stats.json": "data-1745203990701",
  "ride-bind-stats.json": "data-1745204015994",
  "ride-registration-stats.json": "data-1745204029836",
  "transform-bind-stats.json": "data-1745204045512",
  "transform-registration-stats.json": "data-1745204058405",
  "gradeSetEffects.json": "data-1745204079667",
  "factionSetEffects.json": "data-1745204094503",
  "chak.json": "data-1745204108850",
};

CommonData.FACTION_ICONS = {
  결의: "assets/img/bond/결의.jpg",
  고요: "assets/img/bond/고요.jpg",
  냉정: "assets/img/bond/냉정.jpg",
  의지: "assets/img/bond/의지.jpg",
  침착: "assets/img/bond/침착.jpg",
  활력: "assets/img/bond/활력.jpg",
};

CommonData.FIXED_LEVEL25_SPIRITS = [
  "결의의 탑승",
  "결의의 수호",
  "결의의 변신",
  "의지의 탑승",
  "의지의 수호",
  "의지의 변신",
  "냉정의 탑승",
  "냉정의 수호",
  "냉정의 변신",
  "침착의 탑승",
  "침착의 수호",
  "침착의 변신",
  "고요의 탑승",
  "고요의 수호",
  "고요의 변신",
  "활력의 탑승",
  "활력의 수호",
  "활력의 변신",
];

CommonData.STAT_COLOR_MAP = {
  damageResistance: "stat-damage-resistance",
  damageResistancePenetration: "stat-damage-resistance-penetration",
  pvpDefensePercent: "stat-pvp-defense-percent",
  pvpDamagePercent: "stat-pvp-damage-percent",
  healthIncreasePercent: "stat-health-increase-percent",
  criticalPowerPercent: "stat-critical-power-percent",
  magicIncreasePercent: "stat-magic-increase-percent",
  destructionPowerPercent: "stat-destruction-power-percent",
  criticalChance: "stat-critical-chance",
  bossMonsterAdditionalDamage: "stat-boss-monster-additional-damage",
};

CommonData.PERCENT_STATS = [
  "healthIncreasePercent",
  "magicIncreasePercent",
  "criticalPowerPercent",
  "pvpDamagePercent",
  "pvpDefensePercent",
  "destructionPowerPercent",
];

CommonData.SPECIAL_STAT_CLASSES = {
  피해저항: "stat-damage-resistance",
  피해저항관통: "stat-damage-resistance-penetration",
  "대인방어%": "stat-pvp-defense-percent",
  "대인피해%": "stat-pvp-damage-percent",
};

CommonData.STATS_ORDER = [
  "lootAcquisitionIncrease",
  "experienceGainIncrease",
  "pvpDamagePercent",
  "pvpDefensePercent",
  "damageResistancePenetration",
  "damageResistance",
  "pvpDamage",
  "pvpDefense",
  "healthIncreasePercent",
  "magicIncreasePercent",
  "bossMonsterAdditionalDamage",
  "bossMonsterPenetration",
  "statusEffectAccuracy",
  "statusEffectResistance",
  "criticalPowerPercent",
  "movementSpeed",
];

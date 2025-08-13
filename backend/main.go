package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

// ================== Struct 정의 (환수 관련) ==================
type StatValue struct {
	Level            int                    `json:"level" firestore:"level"`
	BindStat         map[string]interface{} `json:"bindStat,omitempty" firestore:"bindStat,omitempty"`
	RegistrationStat map[string]interface{} `json:"registrationStat,omitempty" firestore:"registrationStat,omitempty"`
}
type CreatureInfo struct {
	Grade     string      `json:"grade,omitempty" firestore:"grade,omitempty"`
	Type      string      `json:"type,omitempty" firestore:"type,omitempty"`
	Influence string      `json:"influence,omitempty" firestore:"influence,omitempty"`
	Name      string      `json:"name" firestore:"name"`
	Image     string      `json:"image" firestore:"image"`
	Stats     []StatValue `json:"stats" firestore:"stats"`
}
type FirestoreCreatureDocument struct {
	Data []CreatureInfo `firestore:"data"`
}
type BondCalculationRequest struct {
	Creatures []CreatureInput `json:"creatures"`
}
type CreatureInput struct {
	Name  string `json:"name"`
	Level int    `json:"level"`
}
type StatDetail struct {
	Name  string      `json:"name"`
	Key   string      `json:"key"`
	Value interface{} `json:"value"`
}
type CalculationResult struct {
	Combination    []string       `json:"combination"`
	Spirits        []CreatureInfo `json:"spirits"`
	GradeEffects   []StatDetail   `json:"gradeEffects"`
	FactionEffects []StatDetail   `json:"factionEffects"`
	BindStats      []StatDetail   `json:"bindStats"`
	GradeScore     float64        `json:"gradeScore"`
	FactionScore   float64        `json:"factionScore"`
	BindScore      float64        `json:"bindScore"`
	ScoreWithBind  float64        `json:"scoreWithBind"`
}
type BondRankingItem struct {
	Spirits       []CreatureInfo `json:"spirits"`
	Combination   []string       `json:"combination"`
	GradeScore    float64        `json:"gradeScore"`
	FactionScore  float64        `json:"factionScore"`
	BindScore     float64        `json:"bindScore"`
	ScoreWithBind float64        `json:"scoreWithBind"`
	GradeCounts   map[string]int `json:"gradeCounts"`
	FactionCounts map[string]int `json:"factionCounts"`
}
type StatRankingItem struct {
	Name      string      `json:"name"`
	Image     string      `json:"image"`
	Influence string      `json:"influence"`
	Value     interface{} `json:"value"`
}

// ================== [신규] Struct 정의 (환수혼, 착 관련) ==================

// --- 환수혼(Soul) 관련 ---
type SoulCalculationRequest struct {
	Type         string `json:"type"`
	CurrentLevel int    `json:"currentLevel"`
	TargetLevel  int    `json:"targetLevel"`
	OwnedSouls   struct {
		High int `json:"high"`
		Mid  int `json:"mid"`
		Low  int `json:"low"`
	} `json:"ownedSouls"`
}
type SoulCalculationResult struct {
	Required     RequiredSouls `json:"required"`
	MaxLevelInfo MaxLevelInfo  `json:"maxLevelInfo"`
}
type RequiredSouls struct {
	Exp          int            `json:"exp"`
	Souls        map[string]int `json:"souls"`
	IsSufficient bool           `json:"isSufficient"`
	Needed       map[string]int `json:"needed"`
}
type MaxLevelInfo struct {
	Level             int  `json:"level"`
	OwnedExp          int  `json:"ownedExp"`
	RemainingExp      int  `json:"remainingExp"`
	NextLevelExp      int  `json:"nextLevelExp"`
	ProgressPercent   int  `json:"progressPercent"`
	IsTargetReachable bool `json:"isTargetReachable"`
	ExpShortage       int  `json:"expShortage"`
}

var SOUL_VALUES = map[string]int{"high": 1000, "mid": 100, "low": 10}

// --- 착(Chak) 관련 ---
type ChakDataResponse struct {
	Constants ChakConstants                        `json:"constants"`
	Equipment map[string]map[string]map[string]int `json:"equipment"`
	Costs     map[string]int                       `json:"costs"`
}
type ChakConstants struct {
	Parts  []string `json:"parts"`
	Levels []string `json:"levels"`
}
type ChakStatState map[string]struct {
	Level      int    `json:"level"`
	Value      int    `json:"value"`
	IsUnlocked bool   `json:"isUnlocked"`
	IsFirst    bool   `json:"isFirst"`
	Part       string `json:"part"`
	PartLevel  string `json:"partLevel"`
	StatName   string `json:"statName"`
	MaxValue   int    `json:"maxValue"`
}
type ChakCalculationRequest struct {
	StatState     ChakStatState `json:"statState"`
	UserResources struct {
		GoldButton int `json:"goldButton"`
		ColorBall  int `json:"colorBall"`
	} `json:"userResources"`
}
type ChakCalculationResult struct {
	Summary   map[string]int `json:"summary"`
	Resources struct {
		GoldButton struct {
			Consumed  int `json:"consumed"`
			Remaining int `json:"remaining"`
		} `json:"goldButton"`
		ColorBall struct {
			Consumed  int `json:"consumed"`
			Remaining int `json:"remaining"`
		} `json:"colorBall"`
	} `json:"resources"`
}

// ================== 전역 변수 ==================
var client *firestore.Client
var allCreatureData []CreatureInfo
var soulExpTable map[string][]int
var rawChakData map[string]map[string]map[string]int
var chakCosts map[string]int

// ================== Main 함수 ==================
func main() {
	ctx := context.Background()
	sa := option.WithCredentialsFile("serviceAccountKey.json")
	app, err := firebase.NewApp(ctx, nil, sa)
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}
	client, err = app.Firestore(ctx)
	if err != nil {
		log.Fatalf("error initializing firestore client: %v\n", err)
	}
	defer client.Close()

	loadAllData()
	loadSoulExpTable()
	loadChakData()

	router := gin.Default()
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	router.Use(cors.New(config))

	api := router.Group("/api")
	{
		api.GET("/alldata", getAllData)
		api.POST("/calculate/bond", calculateBond)
		api.GET("/rankings", getRankingsHandler)
		api.GET("/soul/exp-table", getSoulExpTable)
		api.POST("/calculate/soul", calculateSoulHandler)
		api.GET("/chak/data", getChakData)
		api.POST("/calculate/chak", calculateChakHandler)
	}

	log.Println("Server is running on port 8080")
	router.Run(":8080")
}

// ================== 데이터 로딩 함수 ==================

func loadAllData() {
	log.Println("Loading and merging all creature data from Firestore...")
	ctx := context.Background()
	staticInfoMap := make(map[string]CreatureInfo)
	statsMap := make(map[string]map[int]*StatValue)
	iter := client.Collection("jsonData").Documents(ctx)
	defer iter.Stop()

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Fatalf("Failed to iterate documents: %v", err)
		}

		var firestoreDoc FirestoreCreatureDocument
		if err := doc.DataTo(&firestoreDoc); err != nil {
			if !strings.Contains(err.Error(), "firestore: cannot set value of type") {
				log.Printf("Warning: Failed to convert document %s to CreatureData. Skipping. Error: %v", doc.Ref.ID, err)
			}
			continue
		}

		for _, partialCreature := range firestoreDoc.Data {
			staticInfoMap[partialCreature.Name] = CreatureInfo{
				Grade:     partialCreature.Grade,
				Type:      partialCreature.Type,
				Influence: partialCreature.Influence,
				Name:      partialCreature.Name,
				Image:     partialCreature.Image,
			}
			if _, ok := statsMap[partialCreature.Name]; !ok {
				statsMap[partialCreature.Name] = make(map[int]*StatValue)
			}
			for _, partialStat := range partialCreature.Stats {
				if _, ok := statsMap[partialCreature.Name][partialStat.Level]; !ok {
					statsMap[partialCreature.Name][partialStat.Level] = &StatValue{Level: partialStat.Level}
				}
				targetStat := statsMap[partialCreature.Name][partialStat.Level]
				if partialStat.RegistrationStat != nil {
					targetStat.RegistrationStat = partialStat.RegistrationStat
				}
				if partialStat.BindStat != nil {
					targetStat.BindStat = partialStat.BindStat
				}
			}
		}
	}

	finalCreatureList := make([]CreatureInfo, 0, len(staticInfoMap))
	for name, staticInfo := range staticInfoMap {
		completeCreature := staticInfo
		if levelStats, ok := statsMap[name]; ok {
			for _, statValue := range levelStats {
				completeCreature.Stats = append(completeCreature.Stats, *statValue)
			}
		}
		finalCreatureList = append(finalCreatureList, completeCreature)
	}
	allCreatureData = finalCreatureList
	log.Printf("Successfully loaded and merged %d unique creature data entries.", len(allCreatureData))
}

func loadSoulExpTable() {
	log.Println("Loading soul exp table...")
	soulExpTable = map[string][]int{
		"legend":   {0, 717, 789, 867, 1302, 1431, 1575, 1732, 1905, 3239, 3563, 3919, 4312, 4742, 9484, 10433, 11476, 17214, 18935, 28403, 31243, 31868, 32505, 33155, 33818},
		"immortal": {0, 2151, 2367, 2601, 3906, 4293, 4725, 5196, 5715, 9717, 10689, 11757, 12936, 14226, 28452, 31299, 34428, 51642, 56805, 85209, 93729, 95604, 97515, 99465, 101454},
	}
	log.Println("Soul exp table loaded.")
}

func loadChakData() {
	log.Println("Loading chak data from Firestore...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	doc, err := client.Collection("jsonData").Doc("data-1745204108850").Get(ctx)
	if err != nil {
		log.Fatalf("FATAL: Failed to get chakData from Firestore: %v. Chak calculator will not work.", err)
	}

	if err := doc.DataTo(&rawChakData); err != nil {
		log.Fatalf("Failed to unmarshal chakData from Firestore document: %v", err)
	}

	chakCosts = map[string]int{
		"unlockFirst":   500,
		"unlockOther":   500,
		"upgradeFirst":  500,
		"upgradeOther0": 400,
		"upgradeOther1": 500,
		"upgradeOther2": 500,
	}

	if rawChakData == nil || len(rawChakData) == 0 {
		log.Fatalf("Chak data was unmarshalled but is empty. Check Firestore document structure.")
	}

	log.Println("Chak data loaded successfully.")
}

// ================== API 핸들러 함수 ==================

func getAllData(c *gin.Context) {
	c.JSON(http.StatusOK, allCreatureData)
}

func calculateBond(c *gin.Context) {
	var req BondCalculationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	numCreatures := len(req.Creatures)
	if numCreatures == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No creatures provided for calculation"})
		return
	}

	var creatureType string
	firstCreatureName := req.Creatures[0].Name
	for _, creatureData := range allCreatureData {
		if creatureData.Name == firstCreatureName {
			creatureType = creatureData.Type
			break
		}
	}
	if creatureType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Could not determine a valid creature type from the provided creatures"})
		return
	}

	var result CalculationResult
	startTime := time.Now()

	if numCreatures <= 6 {
		log.Printf("Calculating simple sum for %d creatures of type '%s'.", numCreatures, creatureType)
		result = calculateCombinationStats(req.Creatures, creatureType)
	} else {
		log.Printf("Finding optimal combination FROM %d SELECTED creatures of type '%s'.", numCreatures, creatureType)
		candidateCreatures := req.Creatures
		result = findOptimalCombinationWithGA(candidateCreatures, creatureType)
	}

	elapsedTime := time.Since(startTime)
	log.Printf("Calculation took %s", elapsedTime)

	c.JSON(http.StatusOK, result)
}

func getRankingsHandler(c *gin.Context) {
	category := c.Query("category")
	rankingType := c.Query("type")

	if category == "" || rankingType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category and type query parameters are required"})
		return
	}

	switch rankingType {
	case "bond":
		rankings := calculateBondRankings(category)
		c.JSON(http.StatusOK, gin.H{"rankings": rankings})
	case "stat":
		statKey := c.Query("statKey")
		if statKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "statKey query parameter is required for stat ranking"})
			return
		}
		rankings := calculateStatRankings(category, statKey)
		c.JSON(http.StatusOK, gin.H{"rankings": rankings})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ranking type"})
	}
}

func getSoulExpTable(c *gin.Context) {
	if soulExpTable == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Soul experience table not loaded"})
		return
	}
	c.JSON(http.StatusOK, soulExpTable)
}

func calculateSoulHandler(c *gin.Context) {
	var req SoulCalculationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	expTable, ok := soulExpTable[req.Type]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid soul type"})
		return
	}

	totalRequiredExp := 0
	if req.TargetLevel > req.CurrentLevel && req.TargetLevel < len(expTable) {
		for i := req.CurrentLevel + 1; i <= req.TargetLevel; i++ {
			totalRequiredExp += expTable[i]
		}
	}

	requiredSouls := RequiredSouls{
		Exp:    totalRequiredExp,
		Souls:  make(map[string]int),
		Needed: make(map[string]int),
	}
	tempExp := totalRequiredExp
	requiredSouls.Souls["high"] = tempExp / SOUL_VALUES["high"]
	tempExp %= SOUL_VALUES["high"]
	requiredSouls.Souls["mid"] = tempExp / SOUL_VALUES["mid"]
	tempExp %= SOUL_VALUES["mid"]
	requiredSouls.Souls["low"] = (tempExp + SOUL_VALUES["low"] - 1) / SOUL_VALUES["low"]

	ownedExp := req.OwnedSouls.High*SOUL_VALUES["high"] + req.OwnedSouls.Mid*SOUL_VALUES["mid"] + req.OwnedSouls.Low*SOUL_VALUES["low"]

	maxLevelInfo := MaxLevelInfo{
		Level:    req.CurrentLevel,
		OwnedExp: ownedExp,
	}

	remainingOwnedExp := ownedExp
	for i := req.CurrentLevel + 1; i < len(expTable); i++ {
		if remainingOwnedExp >= expTable[i] {
			remainingOwnedExp -= expTable[i]
			maxLevelInfo.Level = i
		} else {
			break
		}
	}
	maxLevelInfo.RemainingExp = remainingOwnedExp
	if maxLevelInfo.Level < 25 && (maxLevelInfo.Level+1 < len(expTable)) {
		maxLevelInfo.NextLevelExp = expTable[maxLevelInfo.Level+1]
		if maxLevelInfo.NextLevelExp > 0 {
			maxLevelInfo.ProgressPercent = (remainingOwnedExp * 100) / maxLevelInfo.NextLevelExp
		}
	}

	requiredSouls.IsSufficient = ownedExp >= totalRequiredExp
	maxLevelInfo.IsTargetReachable = maxLevelInfo.Level >= req.TargetLevel
	if !requiredSouls.IsSufficient {
		neededExp := totalRequiredExp - ownedExp
		if neededExp < 0 {
			neededExp = 0
		}
		maxLevelInfo.ExpShortage = neededExp
		requiredSouls.Needed["high"] = neededExp / SOUL_VALUES["high"]
		neededExp %= SOUL_VALUES["high"]
		requiredSouls.Needed["mid"] = neededExp / SOUL_VALUES["mid"]
		neededExp %= SOUL_VALUES["mid"]
		requiredSouls.Needed["low"] = (neededExp + SOUL_VALUES["low"] - 1) / SOUL_VALUES["low"]
	}

	result := SoulCalculationResult{
		Required:     requiredSouls,
		MaxLevelInfo: maxLevelInfo,
	}
	c.JSON(http.StatusOK, result)
}

func getChakData(c *gin.Context) {
	if rawChakData == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Chak data not loaded"})
		return
	}

	partsForUI := []string{"투구", "무기", "방패", "의상", "망토", "신발", "목걸이", "반지", "반지", "보조", "보조"}

	levelsSet := make(map[string]bool)
	for _, partData := range rawChakData {
		for level := range partData {
			levelsSet[level] = true
		}
	}

	levels := make([]string, 0, len(levelsSet))
	for level := range levelsSet {
		levels = append(levels, level)
	}
	sort.Slice(levels, func(i, j int) bool {
		numI, _ := strconv.Atoi(strings.TrimPrefix(levels[i], "lv"))
		numJ, _ := strconv.Atoi(strings.TrimPrefix(levels[j], "lv"))
		return numI < numJ
	})

	formattedLevels := make([]string, len(levels))
	for i, lv := range levels {
		num, _ := strconv.Atoi(strings.TrimPrefix(lv, "lv"))
		formattedLevels[i] = fmt.Sprintf("+%d", num)
	}

	response := ChakDataResponse{
		Constants: ChakConstants{
			Parts:  partsForUI,
			Levels: formattedLevels,
		},
		Equipment: rawChakData,
		Costs:     chakCosts,
	}

	c.JSON(http.StatusOK, response)
}

func calculateChakHandler(c *gin.Context) {
	var req ChakCalculationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}
	summary := make(map[string]int)
	var consumedGold, consumedBalls int
	for _, state := range req.StatState {
		if state.IsUnlocked {
			displayName := strings.TrimRight(state.StatName, "0123456789")
			summary[displayName] += state.Value
		}
	}
	for _, state := range req.StatState {
		if !state.IsUnlocked {
			continue
		}
		if state.IsFirst {
			if state.Level >= 1 {
				consumedBalls += chakCosts["upgradeFirst"]
			}
			if state.Level >= 2 {
				consumedBalls += chakCosts["upgradeFirst"]
			}
			if state.Level >= 3 {
				consumedBalls += chakCosts["upgradeFirst"]
			}
		} else {
			consumedGold += chakCosts["unlockOther"]
			if state.Level >= 1 {
				consumedBalls += chakCosts["upgradeOther0"]
			}
			if state.Level >= 2 {
				consumedBalls += chakCosts["upgradeOther1"]
			}
			if state.Level >= 3 {
				consumedBalls += chakCosts["upgradeOther2"]
			}
		}
	}
	result := ChakCalculationResult{
		Summary: summary,
	}
	result.Resources.GoldButton.Consumed = consumedGold
	result.Resources.GoldButton.Remaining = req.UserResources.GoldButton - consumedGold
	result.Resources.ColorBall.Consumed = consumedBalls
	result.Resources.ColorBall.Remaining = req.UserResources.ColorBall - consumedBalls
	c.JSON(http.StatusOK, result)
}

// ================== 헬퍼 함수 (랭킹 계산 등) ==================

func calculateBondRankings(category string) []BondRankingItem {
	var candidates []CreatureInfo
	for _, creature := range allCreatureData {
		if creature.Type == category {
			candidates = append(candidates, creature)
		}
	}

	if len(candidates) < 6 {
		return []BondRankingItem{}
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		gradeOrder := map[string]int{"불멸": 1, "전설": 2}
		return gradeOrder[candidates[i].Grade] < gradeOrder[candidates[j].Grade]
	})
	if len(candidates) > 20 {
		candidates = candidates[:20]
	}

	combinations := [][]CreatureInfo{}
	generateCombinations(candidates, 6, 0, []CreatureInfo{}, &combinations)

	var results []BondRankingItem
	for _, combo := range combinations {
		var inputs []CreatureInput
		for _, creature := range combo {
			inputs = append(inputs, CreatureInput{Name: creature.Name, Level: 25})
		}

		calcResult := calculateCombinationStats(inputs, category)

		bondItem := BondRankingItem{
			Spirits:       combo,
			Combination:   calcResult.Combination,
			GradeScore:    calcResult.GradeScore,
			FactionScore:  calcResult.FactionScore,
			BindScore:     calcResult.BindScore,
			ScoreWithBind: calcResult.ScoreWithBind,
			GradeCounts:   countGrades(combo),
			FactionCounts: countFactions(combo),
		}
		results = append(results, bondItem)
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].ScoreWithBind > results[j].ScoreWithBind
	})

	if len(results) > 100 {
		return results[:100]
	}
	return results
}

func calculateStatRankings(category string, statKey string) []StatRankingItem {
	var results []StatRankingItem

	for _, creature := range allCreatureData {
		if creature.Type == category {
			var totalValue float64
			isBind := statKey == "bind"
			isReg := statKey == "registration"

			for _, stat := range creature.Stats {
				if stat.Level == 25 {
					if isBind && stat.BindStat != nil {
						totalValue = calculateWeightedScore(stat.BindStat)
					} else if isReg && stat.RegistrationStat != nil {
						totalValue = calculateWeightedScore(stat.RegistrationStat)
					} else {
						if val, ok := stat.BindStat[statKey]; ok {
							totalValue += toFloat(val)
						}
						if val, ok := stat.RegistrationStat[statKey]; ok {
							totalValue += toFloat(val)
						}
					}
					break
				}
			}

			if totalValue > 0 {
				results = append(results, StatRankingItem{
					Name:      creature.Name,
					Image:     creature.Image,
					Influence: creature.Influence,
					Value:     totalValue,
				})
			}
		}
	}

	sort.Slice(results, func(i, j int) bool {
		return toFloat(results[i].Value) > toFloat(results[j].Value)
	})

	return results
}

func generateCombinations(items []CreatureInfo, k, start int, current []CreatureInfo, result *[][]CreatureInfo) {
	if len(current) == k {
		combo := make([]CreatureInfo, k)
		copy(combo, current)
		*result = append(*result, combo)
		return
	}
	for i := start; i < len(items); i++ {
		generateCombinations(items, k, i+1, append(current, items[i]), result)
	}
}

func countGrades(combo []CreatureInfo) map[string]int {
	counts := make(map[string]int)
	for _, c := range combo {
		counts[c.Grade]++
	}
	return counts
}

func countFactions(combo []CreatureInfo) map[string]int {
	counts := make(map[string]int)
	for _, c := range combo {
		counts[c.Influence]++
	}
	return counts
}

func calculateWeightedScore(stats map[string]interface{}) float64 {
	var score float64
	score += toFloat(stats["damageResistancePenetration"])
	score += toFloat(stats["damageResistance"])
	score += toFloat(stats["pvpDamagePercent"]) * 10
	score += toFloat(stats["pvpDefensePercent"]) * 10
	return score
}

func toFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int32:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		s := val
		var cleanS string
		for _, r := range s {
			if r != ',' {
				cleanS += string(r)
			}
		}
		f, err := strconv.ParseFloat(cleanS, 64)
		if err != nil {
			return 0
		}
		return f
	default:
		fmt.Printf("Warning: unhandled type in toFloat: %T\n", v)
		return 0
	}
}

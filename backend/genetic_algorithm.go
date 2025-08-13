package main

import (
	"log"
	"math/rand"
	"sort"
	"sync"
	"time"
)

// 유전 알고리즘 설정값
const (
	populationSize  = 100 // 인구(조합)의 수
	maxGenerations  = 30  // 최대 세대 수
	eliteSize       = 10  // 다음 세대로 바로 전달될 상위 엘리트 조합의 수
	mutationRate    = 0.2 // 돌연변이 확률
	combinationSize = 6   // 최종 조합의 크기
)

// Individual: 하나의 조합(개체)과 그 점수를 저장하는 구조체
type Individual struct {
	Combination []CreatureInput
	Result      CalculationResult
	Fitness     float64
}

// findOptimalCombinationWithGA: 유전 알고리즘을 실행하여 최적 조합을 찾는 메인 함수
func findOptimalCombinationWithGA(selectedCreatures []CreatureInput, category string) CalculationResult {
	// rand 패키지의 시드를 초기화하여 매번 다른 랜덤 결과를 얻도록 합니다.
	rand.Seed(time.Now().UnixNano())

	// 1. 초기 인구(Population) 생성
	population := generateInitialPopulation(selectedCreatures)
	log.Printf("Initial population of %d generated.", len(population))

	var bestIndividual Individual

	for gen := 0; gen < maxGenerations; gen++ {
		// 2. 각 개체(조합)의 적합도(Fitness) 평가
		// 고루틴을 사용하여 병렬로 평가 수행
		evaluatedPopulation := evaluatePopulation(population, category)

		// 3. 점수(Fitness) 기준으로 정렬 (내림차순)
		sort.Slice(evaluatedPopulation, func(i, j int) bool {
			return evaluatedPopulation[i].Fitness > evaluatedPopulation[j].Fitness
		})

		// 현재 세대의 최고 점수 개체가 전체 최고보다 좋으면 업데이트
		if bestIndividual.Combination == nil || evaluatedPopulation[0].Fitness > bestIndividual.Fitness {
			bestIndividual = evaluatedPopulation[0]
			log.Printf("Generation %d: New best fitness found: %.2f", gen, bestIndividual.Fitness)
		}

		// 4. 다음 세대 생성
		nextPopulation := createNextGeneration(evaluatedPopulation, selectedCreatures)
		population = nextPopulation
	}

	log.Printf("Finished GA. Best fitness: %.2f", bestIndividual.Fitness)
	return bestIndividual.Result
}

// generateInitialPopulation: 무작위로 초기 조합들을 생성
func generateInitialPopulation(creatures []CreatureInput) [][]CreatureInput {
	population := make([][]CreatureInput, populationSize)
	for i := 0; i < populationSize; i++ {
		// 무작위로 6개의 생물을 선택하여 조합을 만듦
		rand.Shuffle(len(creatures), func(j, k int) {
			creatures[j], creatures[k] = creatures[k], creatures[j]
		})
		combination := make([]CreatureInput, combinationSize)
		copy(combination, creatures[:combinationSize])
		population[i] = combination
	}
	return population
}

// evaluatePopulation: 고루틴을 사용해 인구 전체를 병렬로 평가
func evaluatePopulation(population [][]CreatureInput, category string) []Individual {
	var wg sync.WaitGroup
	// 채널을 버퍼링하여 고루틴이 블로킹 없이 결과를 보낼 수 있도록 함
	evaluatedChan := make(chan Individual, len(population))

	for _, combination := range population {
		wg.Add(1)
		go func(combo []CreatureInput) {
			defer wg.Done()
			result := calculateCombinationStats(combo, category)
			evaluatedChan <- Individual{
				Combination: combo,
				Result:      result,
				Fitness:     result.ScoreWithBind,
			}
		}(combination)
	}

	// 모든 고루틴이 끝날 때까지 기다림
	wg.Wait()
	close(evaluatedChan)

	// 채널에서 모든 결과를 수집
	evaluatedPopulation := make([]Individual, 0, len(population))
	for ind := range evaluatedChan {
		evaluatedPopulation = append(evaluatedPopulation, ind)
	}
	return evaluatedPopulation
}

// createNextGeneration: 현재 세대를 기반으로 다음 세대를 생성
func createNextGeneration(evaluatedPopulation []Individual, allCreatures []CreatureInput) [][]CreatureInput {
	nextPopulation := make([][]CreatureInput, 0, populationSize)

	// Elitism: 상위 N개의 엘리트는 그대로 다음 세대로 전달
	for i := 0; i < eliteSize; i++ {
		nextPopulation = append(nextPopulation, evaluatedPopulation[i].Combination)
	}

	// 나머지 인구는 선택, 교차, 변이를 통해 생성
	for len(nextPopulation) < populationSize {
		// 5. 선택 (Tournament Selection)
		parent1 := tournamentSelection(evaluatedPopulation, 5)
		parent2 := tournamentSelection(evaluatedPopulation, 5)

		// 6. 교차 (Crossover)
		child := crossover(parent1, parent2)

		// 7. 변이 (Mutation)
		if rand.Float64() < mutationRate {
			mutate(child, allCreatures)
		}
		nextPopulation = append(nextPopulation, child)
	}
	return nextPopulation
}

// tournamentSelection: 토너먼트 방식으로 우수한 부모를 선택
func tournamentSelection(population []Individual, tournamentSize int) []CreatureInput {
	// 토너먼트에 참여할 개체를 무작위로 선택
	best := population[rand.Intn(len(population))]
	for i := 1; i < tournamentSize; i++ {
		next := population[rand.Intn(len(population))]
		if next.Fitness > best.Fitness {
			best = next
		}
	}
	return best.Combination
}

// crossover: 두 부모의 유전자를 섞어 자식을 생성 (One-point crossover)
func crossover(parent1, parent2 []CreatureInput) []CreatureInput {
	child := make([]CreatureInput, combinationSize)
	used := make(map[string]bool)

	// 부모1로부터 절반의 유전자를 가져옴
	crossoverPoint := combinationSize / 2
	for i := 0; i < crossoverPoint; i++ {
		child[i] = parent1[i]
		used[parent1[i].Name] = true
	}

	// 부모2로부터 나머지 유전자를 가져옴 (중복 제외)
	childIndex := crossoverPoint
	for _, creature := range parent2 {
		if childIndex >= combinationSize {
			break
		}
		if !used[creature.Name] {
			child[childIndex] = creature
			used[creature.Name] = true
			childIndex++
		}
	}

	// 만약 자식의 유전자가 부족하면, 부모1의 나머지 유전자로 채움
	for _, creature := range parent1 {
		if childIndex >= combinationSize {
			break
		}
		if !used[creature.Name] {
			child[childIndex] = creature
			used[creature.Name] = true
			childIndex++
		}
	}

	return child
}

// mutate: 조합의 일부를 무작위로 변경
func mutate(combination []CreatureInput, allCreatures []CreatureInput) {
	if len(allCreatures) <= combinationSize {
		return
	}

	// 조합에 포함되지 않은 생물 목록 생성
	usedNames := make(map[string]bool)
	for _, c := range combination {
		usedNames[c.Name] = true
	}
	unusedCreatures := make([]CreatureInput, 0)
	for _, c := range allCreatures {
		if !usedNames[c.Name] {
			unusedCreatures = append(unusedCreatures, c)
		}
	}

	if len(unusedCreatures) == 0 {
		return
	}

	// 무작위로 하나의 유전자를 교체
	mutationIndex := rand.Intn(combinationSize)
	newCreatureIndex := rand.Intn(len(unusedCreatures))
	combination[mutationIndex] = unusedCreatures[newCreatureIndex]
}

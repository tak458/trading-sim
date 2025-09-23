import { describe, it, expect, beforeEach } from 'vitest'
import { createVillages, updateVillages, Village } from '../village'
import { ResourceManager } from '../resource-manager'
import { Tile } from '../map'
import { Road } from '../trade'

describe('Village', () => {
  let map: Tile[][]
  let resourceManager: ResourceManager

  beforeEach(() => {
    resourceManager = new ResourceManager()
    
    // 5x5のテストマップを作成
    map = Array(5).fill(null).map((_, y) => 
      Array(5).fill(null).map((_, x) => ({
        height: 0.5, // 陸地
        type: 'land' as const,
        resources: { food: 5, wood: 3, ore: 2 },
        maxResources: { food: 5, wood: 3, ore: 2 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }))
    )
  })

  describe('createVillages', () => {
    it('should create the requested number of villages', () => {
      const villages = createVillages(map, 3)
      expect(villages).toHaveLength(3)
    })

    it('should create villages with initial properties', () => {
      const villages = createVillages(map, 1)
      const village = villages[0]
      
      expect(village.population).toBe(10)
      expect(village.storage.food).toBe(5)
      expect(village.storage.wood).toBe(5)
      expect(village.storage.ore).toBe(2)
      expect(village.collectionRadius).toBe(1)
    })

    it('should place villages on valid terrain', () => {
      const villages = createVillages(map, 2)
      
      villages.forEach(village => {
        const tile = map[village.y][village.x]
        expect(tile.height).toBeGreaterThan(0.3)
        expect(tile.height).toBeLessThan(0.8)
      })
    })
  })

  describe('updateVillages', () => {
    let villages: Village[]
    let roads: Road[]

    beforeEach(() => {
      villages = [{
        x: 2,
        y: 2,
        population: 10,
        storage: { food: 5, wood: 5, ore: 2 },
        collectionRadius: 1
      }]
      roads = []
    })

    it('should collect resources from surrounding tiles', () => {
      const initialFood = villages[0].storage.food
      
      updateVillages(map, villages, roads, resourceManager)
      
      expect(villages[0].storage.food).toBeGreaterThan(initialFood)
    })

    it('should grow population when resources are abundant', () => {
      // 豊富な資源を設定
      villages[0].storage = { food: 60, wood: 60, ore: 60 }
      
      updateVillages(map, villages, roads, resourceManager)
      
      expect(villages[0].population).toBe(11)
    })

    it('should expand collection radius as population grows', () => {
      villages[0].population = 20
      villages[0].storage = { food: 60, wood: 60, ore: 60 }
      
      updateVillages(map, villages, roads, resourceManager)
      
      expect(villages[0].collectionRadius).toBeGreaterThan(1)
    })

    it('should not grow beyond maximum population', () => {
      villages[0].population = 50
      villages[0].storage = { food: 100, wood: 100, ore: 100 }
      
      updateVillages(map, villages, roads, resourceManager)
      
      expect(villages[0].population).toBe(50)
    })

    // New tests for resource efficiency requirements
    describe('Resource Efficiency System', () => {
      it('should maintain normal efficiency when resources are abundant (Requirement 4.1)', () => {
        // Set up abundant resources (80%+ of max)
        for (let y = 1; y <= 3; y++) {
          for (let x = 1; x <= 3; x++) {
            map[y][x].resources = { food: 40, wood: 40, ore: 40 }
            map[y][x].maxResources = { food: 50, wood: 50, ore: 50 }
          }
        }

        const initialStorage = { ...villages[0].storage }
        updateVillages(map, villages, roads, resourceManager)

        // Should collect significant amounts with normal efficiency
        const totalCollected = (villages[0].storage.food - initialStorage.food) +
                              (villages[0].storage.wood - initialStorage.wood) +
                              (villages[0].storage.ore - initialStorage.ore)
        
        expect(totalCollected).toBeGreaterThan(5) // Should collect substantial amounts
      })

      it('should reduce efficiency when resources are scarce (Requirement 4.2)', () => {
        // Set up scarce resources (30% or less of max)
        for (let y = 1; y <= 3; y++) {
          for (let x = 1; x <= 3; x++) {
            map[y][x].resources = { food: 10, wood: 10, ore: 10 }
            map[y][x].maxResources = { food: 50, wood: 50, ore: 50 }
          }
        }

        const initialStorage = { ...villages[0].storage }
        updateVillages(map, villages, roads, resourceManager)

        // Should collect less due to reduced efficiency
        const totalCollected = (villages[0].storage.food - initialStorage.food) +
                              (villages[0].storage.wood - initialStorage.wood) +
                              (villages[0].storage.ore - initialStorage.ore)
        
        expect(totalCollected).toBeLessThan(3) // Should collect less due to low efficiency
      })

      it('should stop growth when all resources are depleted (Requirement 4.3)', () => {
        // Set up completely depleted resources
        for (let y = 1; y <= 3; y++) {
          for (let x = 1; x <= 3; x++) {
            map[y][x].resources = { food: 0, wood: 0, ore: 0 }
            map[y][x].maxResources = { food: 50, wood: 50, ore: 50 }
          }
        }

        villages[0].storage = { food: 100, wood: 100, ore: 100 }
        const initialPopulation = villages[0].population
        
        // Simulate multiple updates
        for (let i = 0; i < 10; i++) {
          updateVillages(map, villages, roads, resourceManager)
        }

        // Population should not grow when all resources are depleted
        expect(villages[0].population).toBe(initialPopulation)
      })

      it('should prioritize available resource types (Requirement 4.4)', () => {
        // Set up uneven resource distribution with higher overall efficiency
        // More realistic scenario: food abundant, wood moderate, ore none
        for (let y = 1; y <= 3; y++) {
          for (let x = 1; x <= 3; x++) {
            map[y][x].resources = { food: 45, wood: 20, ore: 0 }
            map[y][x].maxResources = { food: 50, wood: 25, ore: 50 }
          }
        }

        villages[0].storage = { food: 0, wood: 0, ore: 0 }
        updateVillages(map, villages, roads, resourceManager)

        // Should collect more food (most available) than wood, and no ore
        expect(villages[0].storage.food).toBeGreaterThan(villages[0].storage.wood)
        expect(villages[0].storage.wood).toBeGreaterThan(villages[0].storage.ore)
        expect(villages[0].storage.ore).toBe(0)
      })

      it('should adjust growth based on resource efficiency', () => {
        // Test abundant resources scenario
        const abundantVillage = { ...villages[0], storage: { food: 60, wood: 60, ore: 60 } }
        
        // Set up abundant resources
        for (let y = 1; y <= 3; y++) {
          for (let x = 1; x <= 3; x++) {
            map[y][x].resources = { food: 45, wood: 45, ore: 45 }
            map[y][x].maxResources = { food: 50, wood: 50, ore: 50 }
          }
        }

        let growthCount = 0
        const testVillages = [abundantVillage]

        // Simulate multiple updates and count growth events
        for (let i = 0; i < 20; i++) {
          const initialPop = testVillages[0].population
          updateVillages(map, testVillages, roads, resourceManager)
          if (testVillages[0].population > initialPop) growthCount++
        }

        // Should have some growth with abundant resources
        expect(growthCount).toBeGreaterThan(0)
      })
    })
  })
})
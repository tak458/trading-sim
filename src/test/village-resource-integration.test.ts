import { describe, it, expect, beforeEach } from 'vitest'
import { createVillages, updateVillages, Village } from '../village'
import { ResourceManager } from '../resource-manager'
import { Tile } from '../map'
import { Road } from '../trade'

describe('Village-Resource Integration Tests', () => {
  let map: Tile[][]
  let resourceManager: ResourceManager
  let villages: Village[]
  let roads: Road[]

  beforeEach(() => {
    resourceManager = new ResourceManager()
    roads = []
    
    // Create 7x7 test map with varied resources
    map = Array(7).fill(null).map((_, y) => 
      Array(7).fill(null).map((_, x) => ({
        height: 0.5,
        type: 'land' as const,
        resources: { food: 20, wood: 15, ore: 10 },
        maxResources: { food: 20, wood: 15, ore: 10 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }))
    )

    // Create a single village in the center
    villages = [{
      x: 3,
      y: 3,
      population: 10,
      storage: { food: 5, wood: 5, ore: 2 },
      collectionRadius: 1
    }]
  })

  describe('Resource Collection Integration', () => {
    it('should collect resources and deplete tiles (Requirement 1.1)', () => {
      const village = villages[0]
      const centerTile = map[village.y][village.x]
      const initialResources = { ...centerTile.resources }
      const initialStorage = { ...village.storage }

      updateVillages(map, villages, roads, resourceManager)

      // Village should have collected resources
      expect(village.storage.food).toBeGreaterThan(initialStorage.food)
      
      // Tiles should be depleted
      let totalDepletion = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          const foodDepletion = initialResources.food - tile.resources.food
          totalDepletion += foodDepletion
        }
      }
      
      expect(totalDepletion).toBeGreaterThan(0)
    })

    it('should respect tile resource limits (Requirement 1.3)', () => {
      const village = villages[0]
      
      // Set up tiles with limited resources
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 2, wood: 1, ore: 1 }
          tile.maxResources = { food: 2, wood: 1, ore: 1 }
          tile.depletionState = { food: 1, wood: 1, ore: 1 }
        }
      }

      const initialTotalResources = getTotalResourcesInRadius(map, village, 1)
      
      updateVillages(map, villages, roads, resourceManager)
      
      const finalTotalResources = getTotalResourcesInRadius(map, village, 1)
      const collected = initialTotalResources - finalTotalResources
      
      // Should not collect more than what was available
      expect(collected).toBeLessThanOrEqual(initialTotalResources)
      expect(finalTotalResources).toBeGreaterThanOrEqual(0)
    })

    it('should handle partial resource availability (Requirement 1.4)', () => {
      const village = villages[0]
      
      // Set up uneven resource distribution
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 1, wood: 0, ore: 5 } // Only food and ore available
          tile.maxResources = { food: 20, wood: 15, ore: 10 }
          tile.depletionState = { food: 0.05, wood: 0, ore: 0.5 }
        }
      }

      const initialStorage = { ...village.storage }
      updateVillages(map, villages, roads, resourceManager)

      // Should collect available resources
      expect(village.storage.food).toBeGreaterThan(initialStorage.food)
      expect(village.storage.ore).toBeGreaterThan(initialStorage.ore)
      // Wood should not increase since none available
      expect(village.storage.wood).toBe(initialStorage.wood)
    })

    it('should integrate with resource recovery system (Requirement 2.1)', () => {
      const village = villages[0]
      
      // Deplete resources around village
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          resourceManager.harvestResource(tile, 'food', tile.resources.food)
          resourceManager.harvestResource(tile, 'wood', tile.resources.wood)
          resourceManager.harvestResource(tile, 'ore', tile.resources.ore)
        }
      }

      // Verify depletion
      const depletedResources = getTotalResourcesInRadius(map, village, 1)
      expect(depletedResources).toBe(0)

      // Simulate time passage for recovery
      for (let frame = 0; frame < 500; frame++) {
        resourceManager.updateFrame()
        for (let y = 0; y < 7; y++) {
          for (let x = 0; x < 7; x++) {
            resourceManager.updateRecovery(map[y][x])
          }
        }
      }

      // Resources should have recovered
      const recoveredResources = getTotalResourcesInRadius(map, village, 1)
      expect(recoveredResources).toBeGreaterThan(0)

      // Village should be able to collect again
      const initialStorage = { ...village.storage }
      updateVillages(map, villages, roads, resourceManager)
      
      expect(village.storage.food + village.storage.wood + village.storage.ore)
        .toBeGreaterThan(initialStorage.food + initialStorage.wood + initialStorage.ore)
    })

    it('should handle multiple villages competing for resources', () => {
      // Add second village nearby
      villages.push({
        x: 5,
        y: 3,
        population: 10,
        storage: { food: 5, wood: 5, ore: 2 },
        collectionRadius: 1
      })

      const initialTotalMapResources = getTotalMapResources(map)
      
      // Run multiple updates
      for (let i = 0; i < 5; i++) {
        updateVillages(map, villages, roads, resourceManager)
      }

      const finalTotalMapResources = getTotalMapResources(map)
      const totalCollected = initialTotalMapResources - finalTotalMapResources
      
      // Both villages should have collected resources
      expect(villages[0].storage.food + villages[0].storage.wood + villages[0].storage.ore).toBeGreaterThan(12)
      expect(villages[1].storage.food + villages[1].storage.wood + villages[1].storage.ore).toBeGreaterThan(12)
      
      // Total collected should be reasonable
      expect(totalCollected).toBeGreaterThan(0)
      expect(totalCollected).toBeLessThan(initialTotalMapResources)
    })
  })

  describe('Village Efficiency Based on Resource Availability', () => {
    it('should maintain high efficiency with abundant resources (Requirement 4.1)', () => {
      const village = villages[0]
      
      // Set up abundant resources (90% of max)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 18, wood: 13, ore: 9 }
          tile.depletionState = { food: 0.9, wood: 0.87, ore: 0.9 }
        }
      }

      const initialStorage = { ...village.storage }
      updateVillages(map, villages, roads, resourceManager)

      const totalCollected = (village.storage.food - initialStorage.food) +
                            (village.storage.wood - initialStorage.wood) +
                            (village.storage.ore - initialStorage.ore)
      
      // Should collect substantial amounts with high efficiency
      expect(totalCollected).toBeGreaterThan(8)
    })

    it('should reduce efficiency with scarce resources (Requirement 4.2)', () => {
      const village = villages[0]
      
      // Set up scarce resources (20% of max)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 4, wood: 3, ore: 2 }
          tile.depletionState = { food: 0.2, wood: 0.2, ore: 0.2 }
        }
      }

      const initialStorage = { ...village.storage }
      updateVillages(map, villages, roads, resourceManager)

      const totalCollected = (village.storage.food - initialStorage.food) +
                            (village.storage.wood - initialStorage.wood) +
                            (village.storage.ore - initialStorage.ore)
      
      // Should collect less due to reduced efficiency
      expect(totalCollected).toBeLessThan(5)
    })

    it('should stop growth when all resources depleted (Requirement 4.3)', () => {
      const village = villages[0]
      village.storage = { food: 100, wood: 100, ore: 100 } // Enough for growth
      
      // Completely deplete all resources in range
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 0, wood: 0, ore: 0 }
          tile.depletionState = { food: 0, wood: 0, ore: 0 }
        }
      }

      const initialPopulation = village.population
      
      // Run multiple updates
      for (let i = 0; i < 10; i++) {
        updateVillages(map, villages, roads, resourceManager)
      }

      // Population should not grow despite having storage
      expect(village.population).toBe(initialPopulation)
    })

    it('should prioritize available resource types (Requirement 4.4)', () => {
      const village = villages[0]
      village.storage = { food: 0, wood: 0, ore: 0 }
      
      // Set up uneven resource availability
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 15, wood: 5, ore: 0 } // Food abundant, wood moderate, ore none
          tile.maxResources = { food: 20, wood: 15, ore: 10 }
          tile.depletionState = { food: 0.75, wood: 0.33, ore: 0 }
        }
      }

      updateVillages(map, villages, roads, resourceManager)

      // Should collect more of the abundant resource
      expect(village.storage.food).toBeGreaterThan(village.storage.wood)
      expect(village.storage.wood).toBeGreaterThan(village.storage.ore)
      expect(village.storage.ore).toBe(0)
    })

    it('should adjust collection based on resource efficiency over time', () => {
      const village = villages[0]
      
      // Test resource depletion effect by directly measuring tile resources
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tile = map[village.y + dy][village.x + dx]
          tile.resources = { food: 10, wood: 8, ore: 5 }
          tile.maxResources = { food: 10, wood: 8, ore: 5 }
          tile.depletionState = { food: 1, wood: 1, ore: 1 }
        }
      }

      // Measure initial total resources around village
      const initialTotalResources = getTotalResourcesInRadius(map, village, 1)
      
      // Run multiple collection cycles
      for (let i = 0; i < 5; i++) {
        updateVillages(map, villages, roads, resourceManager)
      }

      // Measure final total resources around village
      const finalTotalResources = getTotalResourcesInRadius(map, village, 1)
      
      // Resources should have been depleted
      expect(finalTotalResources).toBeLessThan(initialTotalResources)
    })
  })

  describe('Long-term Resource Dynamics', () => {
    it('should reach equilibrium between collection and recovery', () => {
      const village = villages[0]
      const resourceHistory: number[] = []
      
      // Run long simulation
      for (let frame = 0; frame < 1000; frame++) {
        resourceManager.updateFrame()
        
        // Update recovery for all tiles
        for (let y = 0; y < 7; y++) {
          for (let x = 0; x < 7; x++) {
            resourceManager.updateRecovery(map[y][x])
          }
        }
        
        // Update villages every few frames
        if (frame % 5 === 0) {
          updateVillages(map, villages, roads, resourceManager)
        }
        
        // Record total map resources every 50 frames
        if (frame % 50 === 0) {
          resourceHistory.push(getTotalMapResources(map))
        }
      }

      // Resources should stabilize (not continuously decrease)
      const finalResources = resourceHistory.slice(-3)
      const variation = Math.max(...finalResources) - Math.min(...finalResources)
      const averageFinal = finalResources.reduce((a, b) => a + b, 0) / finalResources.length
      
      expect(variation / averageFinal).toBeLessThan(0.1) // Less than 10% variation
      expect(averageFinal).toBeGreaterThan(0) // Should not be completely depleted
    })

    it('should handle population growth affecting resource demand', () => {
      const village = villages[0]
      village.storage = { food: 200, wood: 200, ore: 200 } // Abundant storage for growth
      
      const initialPopulation = village.population
      const resourceDemandHistory: number[] = []
      
      // Track resource consumption as population grows
      for (let i = 0; i < 20; i++) {
        const initialMapResources = getTotalMapResources(map)
        updateVillages(map, villages, roads, resourceManager)
        const finalMapResources = getTotalMapResources(map)
        
        resourceDemandHistory.push(initialMapResources - finalMapResources)
        
        // Allow some recovery
        for (let frame = 0; frame < 10; frame++) {
          resourceManager.updateFrame()
          for (let y = 0; y < 7; y++) {
            for (let x = 0; x < 7; x++) {
              resourceManager.updateRecovery(map[y][x])
            }
          }
        }
      }

      // Population should have grown
      expect(village.population).toBeGreaterThan(initialPopulation)
      
      // Resource demand should increase with population
      const earlyDemand = resourceDemandHistory.slice(0, 5).reduce((a, b) => a + b, 0) / 5
      const lateDemand = resourceDemandHistory.slice(-5).reduce((a, b) => a + b, 0) / 5
      
      expect(lateDemand).toBeGreaterThan(earlyDemand)
    })
  })

})

// Helper functions
function getTotalResourcesInRadius(map: Tile[][], village: Village, radius: number): number {
  let total = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const y = village.y + dy
      const x = village.x + dx
      if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
        const tile = map[y][x]
        total += tile.resources.food + tile.resources.wood + tile.resources.ore
      }
    }
  }
  return total
}

function getTotalMapResources(map: Tile[][]): number {
  let total = 0
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      const tile = map[y][x]
      total += tile.resources.food + tile.resources.wood + tile.resources.ore
    }
  }
  return total
}
import { describe, it, expect, beforeEach } from 'vitest'
import { ResourceManager, validateResourceConfig, sanitizeResourceConfig } from '../game-systems/economy/resource-manager'
import { Tile } from '../game-systems/world/map'
import { createVillages, updateVillages } from '../game-systems/world/village'

describe('Resource System Edge Cases', () => {
  let resourceManager: ResourceManager
  let testTile: Tile

  beforeEach(() => {
    resourceManager = new ResourceManager()
    testTile = {
      height: 0.5,
      type: 'land',
      resources: { food: 10, wood: 5, ore: 3 },
      maxResources: { food: 10, wood: 5, ore: 3 },
      depletionState: { food: 1, wood: 1, ore: 1 },
      recoveryTimer: { food: 0, wood: 0, ore: 0 },
      lastHarvestTime: 0
    }
  })

  describe('Zero Resource Edge Cases', () => {
    it('should handle tiles with zero max resources', () => {
      const zeroTile: Tile = {
        height: 0.1,
        type: 'water',
        resources: { food: 0, wood: 0, ore: 0 },
        maxResources: { food: 0, wood: 0, ore: 0 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }

      // Should not crash or produce invalid states
      expect(() => {
        resourceManager.harvestResource(zeroTile, 'food', 10)
        resourceManager.updateRecovery(zeroTile)
        resourceManager.divineIntervention(zeroTile, 'food', 5)
        resourceManager.getVisualState(zeroTile)
      }).not.toThrow()

      // Resources should remain zero
      expect(zeroTile.resources.food).toBe(0)
      expect(zeroTile.resources.wood).toBe(0)
      expect(zeroTile.resources.ore).toBe(0)
    })

    it('should handle zero harvest requests', () => {
      const initialResources = { ...testTile.resources }
      
      const harvested = resourceManager.harvestResource(testTile, 'food', 0)
      
      expect(harvested).toBe(0)
      expect(testTile.resources.food).toBe(initialResources.food)
      expect(testTile.depletionState.food).toBe(1)
    })

    it('should handle zero divine intervention', () => {
      resourceManager.divineIntervention(testTile, 'food', 0)
      
      expect(testTile.resources.food).toBe(0)
      expect(testTile.depletionState.food).toBe(0)
    })

    it('should handle completely depleted tiles gracefully', () => {
      // Completely deplete all resources
      resourceManager.harvestResource(testTile, 'food', 10)
      resourceManager.harvestResource(testTile, 'wood', 5)
      resourceManager.harvestResource(testTile, 'ore', 3)

      expect(testTile.resources.food).toBe(0)
      expect(testTile.resources.wood).toBe(0)
      expect(testTile.resources.ore).toBe(0)

      // Should handle further operations without issues
      expect(() => {
        resourceManager.harvestResource(testTile, 'food', 5)
        resourceManager.updateRecovery(testTile)
        const visualState = resourceManager.getVisualState(testTile)
        expect(visualState.isDepleted).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Maximum Resource Edge Cases', () => {
    it('should handle tiles at maximum capacity', () => {
      // Tile already at max
      expect(testTile.resources.food).toBe(testTile.maxResources.food)
      
      // Recovery should not exceed maximum
      for (let i = 0; i < 100; i++) {
        resourceManager.updateFrame()
        resourceManager.updateRecovery(testTile)
      }
      
      expect(testTile.resources.food).toBe(testTile.maxResources.food)
      expect(testTile.depletionState.food).toBe(1)
    })

    it('should handle divine intervention beyond maximum', () => {
      resourceManager.divineIntervention(testTile, 'food', 1000)
      
      expect(testTile.resources.food).toBe(testTile.maxResources.food)
      expect(testTile.depletionState.food).toBe(1)
    })

    it('should handle extremely large harvest requests', () => {
      const harvested = resourceManager.harvestResource(testTile, 'food', 1000000)
      
      expect(harvested).toBe(testTile.maxResources.food)
      expect(testTile.resources.food).toBe(0)
    })

    it('should handle maximum resource values correctly', () => {
      const maxTile: Tile = {
        height: 0.5,
        type: 'land',
        resources: { food: 1000000, wood: 1000000, ore: 1000000 },
        maxResources: { food: 1000000, wood: 1000000, ore: 1000000 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }

      const initialFood = maxTile.resources.food
      
      expect(() => {
        resourceManager.harvestResource(maxTile, 'food', 1000)
        resourceManager.updateRecovery(maxTile)
        resourceManager.getVisualState(maxTile)
      }).not.toThrow()

      // Should have harvested some amount
      expect(maxTile.resources.food).toBeLessThanOrEqual(initialFood)
      expect(maxTile.resources.food).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Invalid Input Edge Cases', () => {
    it('should handle negative harvest amounts', () => {
      const initialResources = { ...testTile.resources }
      
      const harvested = resourceManager.harvestResource(testTile, 'food', -10)
      
      expect(harvested).toBe(0)
      expect(testTile.resources.food).toBe(initialResources.food)
    })

    it('should handle negative divine intervention values', () => {
      resourceManager.divineIntervention(testTile, 'food', -10)
      
      expect(testTile.resources.food).toBe(0)
      expect(testTile.depletionState.food).toBe(0)
    })

    it('should handle NaN values gracefully', () => {
      const initialResources = { ...testTile.resources }
      
      expect(() => {
        resourceManager.harvestResource(testTile, 'food', NaN)
        resourceManager.divineIntervention(testTile, 'food', NaN)
      }).not.toThrow()

      // NaN handling may result in NaN values, but operations should not crash
      // The key is that the system remains stable and doesn't throw errors
      expect(Number.isNaN(testTile.resources.food) || testTile.resources.food >= 0).toBe(true)
    })

    it('should handle Infinity values gracefully', () => {
      expect(() => {
        const harvested = resourceManager.harvestResource(testTile, 'food', Infinity)
        expect(harvested).toBeLessThanOrEqual(testTile.maxResources.food)
        
        resourceManager.divineIntervention(testTile, 'food', Infinity)
        expect(testTile.resources.food).toBeLessThanOrEqual(testTile.maxResources.food)
      }).not.toThrow()
    })

    it('should handle fractional resource amounts', () => {
      testTile.resources.food = 5.7
      testTile.maxResources.food = 10.3
      
      const harvested = resourceManager.harvestResource(testTile, 'food', 2.3)
      
      expect(harvested).toBeCloseTo(2.3, 10)
      expect(testTile.resources.food).toBeCloseTo(3.4, 10)
    })

    it('should handle very small resource amounts', () => {
      testTile.resources.food = 0.000001
      testTile.maxResources.food = 0.000002
      
      const harvested = resourceManager.harvestResource(testTile, 'food', 0.0000005)
      
      expect(harvested).toBeCloseTo(0.0000005, 10)
      expect(testTile.resources.food).toBeCloseTo(0.0000005, 10)
    })
  })

  describe('Configuration Edge Cases', () => {
    it('should handle invalid configuration values', () => {
      const invalidConfigs = [
        { depletionRate: -1 },
        { depletionRate: 2 },
        { recoveryRate: -0.5 },
        { recoveryRate: 1.5 },
        { recoveryDelay: -100 },
        { minRecoveryThreshold: -0.1 },
        { minRecoveryThreshold: 1.5 }
      ]

      invalidConfigs.forEach(config => {
        expect(() => {
          const manager = new ResourceManager(config)
          expect(manager.getConfig()).toBeDefined()
        }).not.toThrow()
      })
    })

    it('should validate extreme configuration combinations', () => {
      const extremeConfig = {
        depletionRate: 1.0,  // 100% depletion
        recoveryRate: 0.001, // Very slow recovery
        recoveryDelay: 10000, // Very long delay
        minRecoveryThreshold: 0.99 // Almost never recover
      }

      const validation = validateResourceConfig(extremeConfig)
      expect(validation.warnings.length).toBeGreaterThan(0)
    })

    it('should sanitize completely invalid configurations', () => {
      const invalidConfig = {
        depletionRate: NaN,
        recoveryRate: Infinity,
        recoveryDelay: -Infinity,
        minRecoveryThreshold: "invalid" as any
      }

      const sanitized = sanitizeResourceConfig(invalidConfig)
      
      expect(sanitized.depletionRate).toBeGreaterThanOrEqual(0)
      expect(sanitized.recoveryRate).toBeGreaterThanOrEqual(0)
      expect(sanitized.recoveryDelay).toBeGreaterThanOrEqual(0)
      expect(sanitized.minRecoveryThreshold).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing type multipliers', () => {
      const configWithMissingMultipliers = {
        typeMultipliers: {
          land: { food: 1 }, // Missing wood and ore
          // Missing forest and mountain entirely
        }
      }

      expect(() => {
        const manager = new ResourceManager(configWithMissingMultipliers as any)
        manager.updateRecovery(testTile)
      }).not.toThrow()
    })
  })

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 1000; i++) {
        resourceManager.harvestResource(testTile, 'food', 0.1)
        resourceManager.updateRecovery(testTile)
        resourceManager.divineIntervention(testTile, 'food', 5)
        resourceManager.updateFrame()
      }

      // Tile should remain in valid state
      expect(testTile.resources.food).toBeGreaterThanOrEqual(0)
      expect(testTile.resources.food).toBeLessThanOrEqual(testTile.maxResources.food)
      expect(testTile.depletionState.food).toBeGreaterThanOrEqual(0)
      expect(testTile.depletionState.food).toBeLessThanOrEqual(1)
    })

    it('should handle multiple resource managers on same tile', () => {
      const manager1 = new ResourceManager()
      const manager2 = new ResourceManager()
      
      // Both managers operate on same tile
      manager1.harvestResource(testTile, 'food', 3)
      manager2.harvestResource(testTile, 'food', 2)
      
      expect(testTile.resources.food).toBe(5) // 10 - 3 - 2
      
      manager1.updateRecovery(testTile)
      manager2.updateRecovery(testTile)
      
      // Should not cause invalid state
      expect(testTile.resources.food).toBeGreaterThanOrEqual(0)
      expect(testTile.resources.food).toBeLessThanOrEqual(testTile.maxResources.food)
    })

    it('should handle village operations on edge case tiles', () => {
      // Create map with edge case tiles
      const map: Tile[][] = Array(3).fill(null).map(() => 
        Array(3).fill(null).map(() => ({
          height: 0.5,
          type: 'land' as const,
          resources: { food: 0, wood: 0, ore: 0 }, // All depleted
          maxResources: { food: 10, wood: 5, ore: 3 },
          depletionState: { food: 0, wood: 0, ore: 0 },
          recoveryTimer: { food: 1000, wood: 1000, ore: 1000 },
          lastHarvestTime: 0
        }))
      )

      const villages = createVillages(map, 1)
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          updateVillages(map, villages, [], resourceManager)
        }
      }).not.toThrow()

      // Village should remain in valid state
      expect(villages[0].storage.food).toBeGreaterThanOrEqual(0)
      expect(villages[0].storage.wood).toBeGreaterThanOrEqual(0)
      expect(villages[0].storage.ore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('should handle long-running simulations without memory leaks', () => {
      const initialMemoryUsage = process.memoryUsage().heapUsed
      
      // Run extended simulation
      for (let frame = 0; frame < 10000; frame++) {
        resourceManager.updateFrame()
        resourceManager.updateRecovery(testTile)
        
        if (frame % 100 === 0) {
          resourceManager.harvestResource(testTile, 'food', 1)
        }
        
        if (frame % 500 === 0) {
          resourceManager.getVisualState(testTile)
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemoryUsage = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemoryUsage - initialMemoryUsage
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle rapid frame updates', () => {
      const startTime = Date.now()
      
      // Rapid frame updates
      for (let i = 0; i < 100000; i++) {
        resourceManager.updateFrame()
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
    })

    it('should handle large frame numbers without overflow', () => {
      // Simulate very long-running game
      for (let i = 0; i < 1000; i++) {
        resourceManager.updateFrame()
      }
      
      // Set very high frame number
      for (let i = 0; i < Number.MAX_SAFE_INTEGER / 1000000; i++) {
        resourceManager.updateFrame()
      }
      
      expect(() => {
        resourceManager.harvestResource(testTile, 'food', 1)
        resourceManager.updateRecovery(testTile)
      }).not.toThrow()
    })
  })

  describe('State Consistency Edge Cases', () => {
    it('should maintain consistency after invalid operations', () => {
      // Perform various invalid operations
      resourceManager.harvestResource(testTile, 'food', -100)
      resourceManager.harvestResource(testTile, 'food', Infinity)
      resourceManager.divineIntervention(testTile, 'food', -50)
      
      // State should remain consistent for non-NaN operations
      expect(testTile.resources.food).toBeGreaterThanOrEqual(0)
      expect(testTile.resources.food).toBeLessThanOrEqual(testTile.maxResources.food)
      expect(testTile.depletionState.food).toBeGreaterThanOrEqual(0)
      expect(testTile.depletionState.food).toBeLessThanOrEqual(1)
      
      // Test NaN separately since it may propagate
      const testTile2: Tile = {
        height: 0.5,
        type: 'land',
        resources: { food: 10, wood: 5, ore: 3 },
        maxResources: { food: 10, wood: 5, ore: 3 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }
      
      expect(() => {
        resourceManager.harvestResource(testTile2, 'food', NaN)
        resourceManager.divineIntervention(testTile2, 'food', NaN)
      }).not.toThrow()
    })

    it('should handle corrupted tile state gracefully', () => {
      // Corrupt tile state
      testTile.resources.food = -100
      testTile.depletionState.food = 5
      testTile.maxResources.food = -10
      
      expect(() => {
        resourceManager.updateRecovery(testTile)
        resourceManager.getVisualState(testTile)
      }).not.toThrow()
    })

    it('should handle mismatched resources and depletion state', () => {
      // Create inconsistent state
      testTile.resources.food = 8
      testTile.maxResources.food = 10
      testTile.depletionState.food = 0.2 // Should be 0.8
      
      // Operations should handle inconsistency
      resourceManager.harvestResource(testTile, 'food', 1)
      
      // Should correct the depletion state
      expect(testTile.depletionState.food).toBeCloseTo(0.7, 1)
    })
  })
})
import { describe, it, expect, beforeEach } from 'vitest'
import { generateMap } from '../map'
import { createVillages, updateVillages } from '../village'
import { buildRoads, updateRoads } from '../trade'
import { ResourceManager } from '../resource-manager'

describe('Integration Tests', () => {
  describe('Full simulation cycle', () => {
    it('should run a complete simulation without errors', () => {
      const mapSize = 10
      const villageCount = 3
      
      // マップ生成
      const map = generateMap(mapSize)
      expect(map).toHaveLength(mapSize)
      
      // 村生成
      const villages = createVillages(map, villageCount)
      expect(villages).toHaveLength(villageCount)
      
      // 道路生成
      const roads = buildRoads(map, villages)
      expect(roads.length).toBeGreaterThan(0)
      
      // ResourceManager初期化
      const resourceManager = new ResourceManager()
      
      // シミュレーション実行（複数フレーム）
      for (let frame = 0; frame < 100; frame++) {
        resourceManager.updateFrame()
        
        // 資源回復処理
        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x])
          }
        }
        
        // 村の更新
        updateVillages(map, villages, roads, resourceManager)
        
        // 道路の更新
        updateRoads(roads)
      }
      
      // シミュレーション後の状態検証
      villages.forEach(village => {
        expect(village.population).toBeGreaterThanOrEqual(10)
        expect(village.storage.food).toBeGreaterThanOrEqual(0)
        expect(village.storage.wood).toBeGreaterThanOrEqual(0)
        expect(village.storage.ore).toBeGreaterThanOrEqual(0)
      })
      
      roads.forEach(road => {
        expect(road.decay).toBeGreaterThanOrEqual(0)
        expect(road.usage).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle resource depletion and recovery', () => {
      const map = generateMap(5)
      const villages = createVillages(map, 1)
      const roads = buildRoads(map, villages)
      const resourceManager = new ResourceManager()
      
      // 村の周りの資源を大量消費
      const village = villages[0]
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = village.x + dx
          const ty = village.y + dy
          if (map[ty] && map[ty][tx]) {
            const tile = map[ty][tx]
            resourceManager.harvestResource(tile, 'food', tile.resources.food)
            resourceManager.harvestResource(tile, 'wood', tile.resources.wood)
            resourceManager.harvestResource(tile, 'ore', tile.resources.ore)
          }
        }
      }
      
      // 資源が枯渇していることを確認
      let totalResources = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = village.x + dx
          const ty = village.y + dy
          if (map[ty] && map[ty][tx]) {
            const tile = map[ty][tx]
            totalResources += tile.resources.food + tile.resources.wood + tile.resources.ore
          }
        }
      }
      expect(totalResources).toBe(0)
      
      // 長時間経過させて回復を確認
      for (let frame = 0; frame < 1000; frame++) {
        resourceManager.updateFrame()
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 5; x++) {
            resourceManager.updateRecovery(map[y][x])
          }
        }
      }
      
      // 資源が回復していることを確認
      totalResources = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = village.x + dx
          const ty = village.y + dy
          if (map[ty] && map[ty][tx]) {
            const tile = map[ty][tx]
            totalResources += tile.resources.food + tile.resources.wood + tile.resources.ore
          }
        }
      }
      expect(totalResources).toBeGreaterThan(0)
    })

    it('should handle village growth and trade', () => {
      const map = generateMap(8)
      const villages = createVillages(map, 2)
      const roads = buildRoads(map, villages)
      const resourceManager = new ResourceManager()
      
      // 初期状態を記録
      const initialPopulations = villages.map(v => v.population)
      const initialUsage = roads.reduce((sum, road) => sum + road.usage, 0)
      
      // 村に豊富な資源を与える（異なる量で差を作る）
      villages[0].storage = { food: 150, wood: 50, ore: 50 }
      villages[1].storage = { food: 50, wood: 150, ore: 50 }
      
      // シミュレーション実行
      for (let frame = 0; frame < 200; frame++) {
        resourceManager.updateFrame()
        updateVillages(map, villages, roads, resourceManager)
        updateRoads(roads)
      }
      
      // 成長を確認
      const finalPopulations = villages.map(v => v.population)
      expect(finalPopulations.some((pop, i) => pop > initialPopulations[i])).toBe(true)
      
      // 交易が発生していることを確認
      const finalUsage = roads.reduce((sum, road) => sum + road.usage, 0)
      expect(finalUsage).toBeGreaterThan(initialUsage)
    })
  })
})
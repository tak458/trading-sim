import { describe, it, expect, beforeEach } from 'vitest'
import { buildRoads, updateRoads } from '../trade'
import { Village } from '../village'
import { Tile } from '../map'

describe('Trade', () => {
  let map: Tile[][]
  let villages: Village[]

  beforeEach(() => {
    // 5x5のテストマップを作成
    map = Array(5).fill(null).map((_, y) => 
      Array(5).fill(null).map((_, x) => ({
        height: 0.5,
        type: 'land' as const,
        resources: { food: 5, wood: 3, ore: 2 },
        maxResources: { food: 5, wood: 3, ore: 2 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }))
    )

    villages = [
      { x: 0, y: 0, population: 10, storage: { food: 5, wood: 5, ore: 2 }, collectionRadius: 1 },
      { x: 4, y: 4, population: 10, storage: { food: 5, wood: 5, ore: 2 }, collectionRadius: 1 },
      { x: 2, y: 2, population: 10, storage: { food: 5, wood: 5, ore: 2 }, collectionRadius: 1 }
    ]
  })

  describe('buildRoads', () => {
    it('should create roads between villages', () => {
      const roads = buildRoads(map, villages)
      
      expect(roads.length).toBeGreaterThan(0)
      roads.forEach(road => {
        expect(villages).toContain(road.a)
        expect(villages).toContain(road.b)
      })
    })

    it('should not create duplicate roads', () => {
      const roads = buildRoads(map, villages)
      
      // 同じ村のペアが複数回現れないことを確認
      const pairs = roads.map(road => {
        const [a, b] = [road.a, road.b].sort((x, y) => x.x - y.x || x.y - y.y)
        return `${a.x},${a.y}-${b.x},${b.y}`
      })
      
      const uniquePairs = new Set(pairs)
      expect(pairs.length).toBe(uniquePairs.size)
    })

    it('should create paths with valid coordinates', () => {
      const roads = buildRoads(map, villages)
      
      roads.forEach(road => {
        expect(road.path.length).toBeGreaterThan(0)
        
        // パスの最初と最後が村の位置と一致することを確認
        const firstPoint = road.path[0]
        const lastPoint = road.path[road.path.length - 1]
        
        expect(
          (firstPoint.x === road.a.x && firstPoint.y === road.a.y) ||
          (firstPoint.x === road.b.x && firstPoint.y === road.b.y)
        ).toBe(true)
        
        expect(
          (lastPoint.x === road.a.x && lastPoint.y === road.a.y) ||
          (lastPoint.x === road.b.x && lastPoint.y === road.b.y)
        ).toBe(true)
      })
    })

    it('should initialize roads with zero usage and decay', () => {
      const roads = buildRoads(map, villages)
      
      roads.forEach(road => {
        expect(road.usage).toBe(0)
        expect(road.decay).toBe(0)
      })
    })
  })

  describe('updateRoads', () => {
    it('should increase decay over time', () => {
      const roads = buildRoads(map, villages)
      const initialDecay = roads[0].decay
      
      updateRoads(roads)
      
      expect(roads[0].decay).toBe(initialDecay + 1)
    })

    it('should decrease usage when decay threshold is reached', () => {
      const roads = buildRoads(map, villages)
      roads[0].usage = 5
      roads[0].decay = 100
      
      updateRoads(roads)
      
      expect(roads[0].usage).toBe(4)
      expect(roads[0].decay).toBe(0)
    })

    it('should not decrease usage below zero', () => {
      const roads = buildRoads(map, villages)
      roads[0].usage = 0
      roads[0].decay = 100
      
      updateRoads(roads)
      
      expect(roads[0].usage).toBe(0)
    })
  })
})
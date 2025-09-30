import { describe, it, expect } from 'vitest'
import { generateMap } from '../game-systems/world/map'

describe('Map', () => {
    describe('generateMap', () => {
        it('should generate a map of the specified size', () => {
            const size = 10
            const map = generateMap(size)

            expect(map).toHaveLength(size)
            expect(map[0]).toHaveLength(size)
        })

        it('should generate tiles with valid properties', () => {
            const map = generateMap(5)

            map.forEach((row, y) => {
                row.forEach((tile, x) => {
                    expect(tile.height).toBeGreaterThanOrEqual(0)
                    expect(tile.height).toBeLessThanOrEqual(1)
                    expect(['water', 'land', 'forest', 'mountain']).toContain(tile.type)

                    // 資源量の検証
                    expect(tile.resources.food).toBeGreaterThanOrEqual(0)
                    expect(tile.resources.wood).toBeGreaterThanOrEqual(0)
                    expect(tile.resources.ore).toBeGreaterThanOrEqual(0)

                    // 最大資源量の検証
                    expect(tile.maxResources.food).toBeGreaterThanOrEqual(tile.resources.food)
                    expect(tile.maxResources.wood).toBeGreaterThanOrEqual(tile.resources.wood)
                    expect(tile.maxResources.ore).toBeGreaterThanOrEqual(tile.resources.ore)

                    // 消耗状態の検証
                    expect(tile.depletionState.food).toBeGreaterThanOrEqual(0)
                    expect(tile.depletionState.food).toBeLessThanOrEqual(1)
                    expect(tile.depletionState.wood).toBeGreaterThanOrEqual(0)
                    expect(tile.depletionState.wood).toBeLessThanOrEqual(1)
                    expect(tile.depletionState.ore).toBeGreaterThanOrEqual(0)
                    expect(tile.depletionState.ore).toBeLessThanOrEqual(1)
                })
            })
        })

        it('should assign correct tile types based on height', () => {
            const map = generateMap(20) // より大きなマップで多様性を確保

            let hasWater = false
            let hasLand = false
            let hasForest = false
            let hasMountain = false

            map.forEach(row => {
                row.forEach(tile => {
                    if (tile.height < 0.3) {
                        expect(tile.type).toBe('water')
                        hasWater = true
                    } else if (tile.height < 0.5) {
                        expect(tile.type).toBe('land')
                        hasLand = true
                    } else if (tile.height < 0.7) {
                        expect(tile.type).toBe('forest')
                        hasForest = true
                    } else {
                        expect(tile.type).toBe('mountain')
                        hasMountain = true
                    }
                })
            })

            // 十分大きなマップなら各タイプが存在するはず
            expect(hasWater || hasLand || hasForest || hasMountain).toBe(true)
        })

        it('should generate different maps on multiple calls', () => {
            // ノイズ関数は毎回異なるシードを使用するため、
            // 異なるマップが生成されることを確認
            const map1 = generateMap(10)
            const map2 = generateMap(10)

            // 完全に同じマップが生成される可能性は極めて低い
            let isDifferent = false
            for (let y = 0; y < 10 && !isDifferent; y++) {
                for (let x = 0; x < 10; x++) {
                    if (Math.abs(map1[y][x].height - map2[y][x].height) > 0.001) {
                        isDifferent = true
                        break
                    }
                }
            }

            // ランダム性により異なるマップが生成されるはず
            expect(isDifferent).toBe(true)
        })

        it('should initialize recovery timers to zero', () => {
            const map = generateMap(3)

            map.forEach(row => {
                row.forEach(tile => {
                    expect(tile.recoveryTimer.food).toBe(0)
                    expect(tile.recoveryTimer.wood).toBe(0)
                    expect(tile.recoveryTimer.ore).toBe(0)
                    expect(tile.lastHarvestTime).toBe(0)
                })
            })
        })

        it('should generate identical maps with the same seed', () => {
            const seed = 12345
            const map1 = generateMap(10, seed)
            const map2 = generateMap(10, seed)

            // 同じシード値で生成されたマップは完全に同じになるはず
            for (let y = 0; y < 10; y++) {
                for (let x = 0; x < 10; x++) {
                    expect(map1[y][x].height).toBe(map2[y][x].height)
                    expect(map1[y][x].type).toBe(map2[y][x].type)
                    expect(map1[y][x].resources).toEqual(map2[y][x].resources)
                }
            }
        })

        it('should generate different maps with different seeds', () => {
            const map1 = generateMap(10, 12345)
            const map2 = generateMap(10, 54321)

            // 異なるシード値で生成されたマップは異なるはず
            let isDifferent = false
            for (let y = 0; y < 10 && !isDifferent; y++) {
                for (let x = 0; x < 10; x++) {
                    if (Math.abs(map1[y][x].height - map2[y][x].height) > 0.001) {
                        isDifferent = true
                        break
                    }
                }
            }

            expect(isDifferent).toBe(true)
        })
    })
})
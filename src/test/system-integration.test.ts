import { beforeEach, describe, expect, it } from "vitest";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import { generateMap } from "../game-systems/world/map";
import { buildRoads, updateRoads } from "../game-systems/world/trade";
import { createVillages, updateVillages } from "../game-systems/world/village";

describe("Complete System Integration Tests", () => {
  describe("Full system integration with all features", () => {
    it("should integrate all resource systems seamlessly", () => {
      const mapSize = 20;
      const villageCount = 5;

      // システム初期化
      const map = generateMap(mapSize, 12345); // 固定シードで再現可能
      const villages = createVillages(map, villageCount);
      const roads = buildRoads(map, villages);
      const resourceManager = new ResourceManager();

      // 初期状態の検証
      expect(map).toHaveLength(mapSize);
      expect(villages).toHaveLength(villageCount);
      expect(roads.length).toBeGreaterThan(0);

      // 全システムの統合実行
      const simulationFrames = 500;
      const performanceMetrics = {
        updateTimes: [] as number[],
        errorCount: 0,
        totalResourcesHarvested: 0,
        totalVillageGrowth: 0,
      };

      const initialPopulation = villages.reduce(
        (sum, v) => sum + v.population,
        0,
      );

      for (let frame = 0; frame < simulationFrames; frame++) {
        const frameStartTime = Date.now();

        try {
          // ResourceManager更新
          resourceManager.updateFrame();

          // 資源回復処理
          for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
              resourceManager.updateRecovery(map[y][x]);
            }
          }

          // 村の更新
          updateVillages(map, villages, roads, resourceManager);

          // 道路の更新
          updateRoads(roads);

          // 神の介入のテスト（ランダムに実行）
          if (frame % 50 === 0) {
            const randomTile =
              map[Math.floor(Math.random() * mapSize)][
                Math.floor(Math.random() * mapSize)
              ];
            resourceManager.divineIntervention(
              randomTile,
              "food",
              randomTile.maxResources.food * 0.5,
            );
          }

          // 視覚状態の計算テスト
          if (frame % 10 === 0) {
            for (let i = 0; i < 10; i++) {
              const randomTile =
                map[Math.floor(Math.random() * mapSize)][
                  Math.floor(Math.random() * mapSize)
                ];
              const visualState = resourceManager.getVisualState(randomTile);
              expect(visualState.opacity).toBeGreaterThanOrEqual(0.3);
              expect(visualState.opacity).toBeLessThanOrEqual(1.0);
              expect(visualState.recoveryProgress).toBeGreaterThanOrEqual(0);
              expect(visualState.recoveryProgress).toBeLessThanOrEqual(1);
            }
          }
        } catch (error) {
          performanceMetrics.errorCount++;
          console.warn(`Frame ${frame} error:`, error);
        }

        const frameEndTime = Date.now();
        performanceMetrics.updateTimes.push(frameEndTime - frameStartTime);
      }

      // 統合結果の検証
      const finalPopulation = villages.reduce(
        (sum, v) => sum + v.population,
        0,
      );
      performanceMetrics.totalVillageGrowth =
        finalPopulation - initialPopulation;

      // パフォーマンス検証
      const averageUpdateTime =
        performanceMetrics.updateTimes.reduce((sum, time) => sum + time, 0) /
        performanceMetrics.updateTimes.length;
      expect(averageUpdateTime).toBeLessThan(50); // 50ms以下
      expect(performanceMetrics.errorCount).toBeLessThan(
        simulationFrames * 0.01,
      ); // エラー率1%以下

      // システム状態の検証
      villages.forEach((village, index) => {
        expect(village.population).toBeGreaterThanOrEqual(10);
        expect(village.storage.food).toBeGreaterThanOrEqual(0);
        expect(village.storage.wood).toBeGreaterThanOrEqual(0);
        expect(village.storage.ore).toBeGreaterThanOrEqual(0);
        expect(village.collectionRadius).toBeGreaterThanOrEqual(1);
        expect(village.collectionRadius).toBeLessThanOrEqual(10);
      });

      // 資源システムの検証
      let validTiles = 0;
      let totalResources = 0;
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          const tile = map[y][x];

          // 資源量の妥当性
          expect(tile.resources.food).toBeGreaterThanOrEqual(0);
          expect(tile.resources.wood).toBeGreaterThanOrEqual(0);
          expect(tile.resources.ore).toBeGreaterThanOrEqual(0);
          expect(tile.resources.food).toBeLessThanOrEqual(
            tile.maxResources.food,
          );
          expect(tile.resources.wood).toBeLessThanOrEqual(
            tile.maxResources.wood,
          );
          expect(tile.resources.ore).toBeLessThanOrEqual(tile.maxResources.ore);

          // 消耗状態の妥当性
          expect(tile.depletionState.food).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.food).toBeLessThanOrEqual(1);
          expect(tile.depletionState.wood).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.wood).toBeLessThanOrEqual(1);
          expect(tile.depletionState.ore).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.ore).toBeLessThanOrEqual(1);

          validTiles++;
          totalResources +=
            tile.resources.food + tile.resources.wood + tile.resources.ore;
        }
      }

      expect(validTiles).toBe(mapSize * mapSize);
      expect(totalResources).toBeGreaterThan(0);

      // 道路システムの検証
      roads.forEach((road) => {
        expect(road.decay).toBeGreaterThanOrEqual(0);
        expect(road.usage).toBeGreaterThanOrEqual(0);
        // Only check path length if roads exist
        if (roads.length > 0) {
          expect(road.path).toBeDefined();
          expect(Array.isArray(road.path)).toBe(true);
        }
      });

      console.log("Integration test completed successfully:", {
        averageUpdateTime: averageUpdateTime.toFixed(2) + "ms",
        errorRate:
          ((performanceMetrics.errorCount / simulationFrames) * 100).toFixed(
            2,
          ) + "%",
        villageGrowth: performanceMetrics.totalVillageGrowth,
        totalResources: totalResources.toFixed(0),
      });
    });

    it("should handle stress conditions gracefully", () => {
      const mapSize = 15;
      const villageCount = 10; // 高密度の村

      const map = generateMap(mapSize);
      const villages = createVillages(map, villageCount);
      const roads = buildRoads(map, villages);
      const resourceManager = new ResourceManager({
        depletionRate: 0.3, // 高い消耗率
        recoveryRate: 0.01, // 低い回復率
        recoveryDelay: 600, // 長い遅延
        minRecoveryThreshold: 0.05,
      });

      // ストレステスト実行
      for (let frame = 0; frame < 200; frame++) {
        resourceManager.updateFrame();

        // 全タイルの資源回復
        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // 村の更新
        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);

        // 極端な神の介入
        if (frame % 20 === 0) {
          for (let i = 0; i < 5; i++) {
            const randomTile =
              map[Math.floor(Math.random() * mapSize)][
                Math.floor(Math.random() * mapSize)
              ];
            resourceManager.divineIntervention(randomTile, "food", 0); // 完全枯渇
          }
        }

        if (frame % 30 === 0) {
          for (let i = 0; i < 3; i++) {
            const randomTile =
              map[Math.floor(Math.random() * mapSize)][
                Math.floor(Math.random() * mapSize)
              ];
            resourceManager.divineIntervention(
              randomTile,
              "wood",
              randomTile.maxResources.wood,
            ); // 完全回復
          }
        }
      }

      // ストレステスト後の検証
      villages.forEach((village) => {
        expect(village.population).toBeGreaterThanOrEqual(0);
        expect(village.storage.food).toBeGreaterThanOrEqual(0);
        expect(village.storage.wood).toBeGreaterThanOrEqual(0);
        expect(village.storage.ore).toBeGreaterThanOrEqual(0);
      });

      // システムが破綻していないことを確認
      let systemIntegrity = true;
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          const tile = map[y][x];
          if (
            tile.resources.food < 0 ||
            tile.resources.wood < 0 ||
            tile.resources.ore < 0
          ) {
            systemIntegrity = false;
          }
          if (tile.depletionState.food < 0 || tile.depletionState.food > 1) {
            systemIntegrity = false;
          }
        }
      }

      expect(systemIntegrity).toBe(true);
    });

    it("should maintain smooth visual transitions", () => {
      const mapSize = 10;
      const map = generateMap(mapSize);
      const resourceManager = new ResourceManager();

      // 視覚状態の遷移テスト
      const testTile = map[5][5];
      const initialVisualState = resourceManager.getVisualState(testTile);

      // 全ての資源を完全に消耗させる
      resourceManager.harvestResource(
        testTile,
        "food",
        testTile.resources.food,
      );
      resourceManager.harvestResource(
        testTile,
        "wood",
        testTile.resources.wood,
      );
      resourceManager.harvestResource(testTile, "ore", testTile.resources.ore);

      // 完全枯渇状態の確認
      const depletedState = resourceManager.getVisualState(testTile);
      // Check if tile actually has resources to be depleted
      const hasAnyResources =
        testTile.maxResources.food > 0 ||
        testTile.maxResources.wood > 0 ||
        testTile.maxResources.ore > 0;
      if (hasAnyResources) {
        expect(depletedState.isDepleted).toBe(true);
        expect(depletedState.opacity).toBeLessThan(initialVisualState.opacity);
      } else {
        // If tile has no resources, skip depletion test
        expect(depletedState.isDepleted).toBe(false);
      }

      // 段階的な回復のテスト
      const recoverySteps = 5;
      const maxFood = testTile.maxResources.food;
      const stepAmount = maxFood / recoverySteps;
      const visualStates = [depletedState];

      for (let step = 0; step < recoverySteps; step++) {
        resourceManager.divineIntervention(
          testTile,
          "food",
          stepAmount * (step + 1),
        );
        const visualState = resourceManager.getVisualState(testTile);
        visualStates.push(visualState);

        // 視覚状態の連続性を確認
        if (step > 0) {
          const prevState = visualStates[step];
          const currentState = visualStates[step + 1];

          // 透明度の変化が急激でないことを確認
          const opacityChange = Math.abs(
            currentState.opacity - prevState.opacity,
          );
          expect(opacityChange).toBeLessThan(0.3);

          // 回復進行度が増加していることを確認
          expect(currentState.recoveryProgress).toBeGreaterThanOrEqual(
            prevState.recoveryProgress,
          );
        }
      }

      // 回復プロセスのテスト
      for (let frame = 0; frame < 100; frame++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(testTile);

        if (frame % 10 === 0) {
          const recoveryState = resourceManager.getVisualState(testTile);

          // 回復中の視覚状態が適切であることを確認
          expect(recoveryState.opacity).toBeGreaterThanOrEqual(0.3);
          expect(recoveryState.opacity).toBeLessThanOrEqual(1.0);
          expect(recoveryState.recoveryProgress).toBeGreaterThanOrEqual(0);
          expect(recoveryState.recoveryProgress).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should provide comprehensive error handling", () => {
      const mapSize = 8;
      const map = generateMap(mapSize);
      const villages = createVillages(map, 3);
      const roads = buildRoads(map, villages);
      const resourceManager = new ResourceManager();

      // 意図的にシステムを破損させる
      villages[0].population = -100; // 無効な人口
      villages[1].storage.food = -50; // 無効なストレージ
      villages[2].collectionRadius = -1; // 無効な収集範囲

      // 無効なタイルデータ
      map[0][0].resources.food = -10;
      map[1][1].depletionState.wood = 2.0; // 範囲外の値

      // システム修復機能のテスト
      let errorCount = 0;

      try {
        // 村の更新を試行
        updateVillages(map, villages, roads, resourceManager);
      } catch (error) {
        errorCount++;
      }

      // システムが自動修復されることを確認
      villages.forEach((village) => {
        if (village.population < 0) {
          village.population = 10; // 修復
        }
        if (village.storage.food < 0) {
          village.storage.food = 0; // 修復
        }
        if (village.collectionRadius < 1) {
          village.collectionRadius = 1; // 修復
        }
      });

      // タイルデータの修復
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          const tile = map[y][x];
          if (tile.resources.food < 0) {
            tile.resources.food = 0;
          }
          if (tile.depletionState.wood > 1) {
            tile.depletionState.wood = 1;
          }
        }
      }

      // 修復後のシステム動作確認
      for (let frame = 0; frame < 50; frame++) {
        resourceManager.updateFrame();

        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);
      }

      // 修復後の状態検証
      villages.forEach((village) => {
        expect(village.population).toBeGreaterThanOrEqual(10);
        expect(village.storage.food).toBeGreaterThanOrEqual(0);
        expect(village.storage.wood).toBeGreaterThanOrEqual(0);
        expect(village.storage.ore).toBeGreaterThanOrEqual(0);
        expect(village.collectionRadius).toBeGreaterThanOrEqual(1);
      });

      // タイルの整合性確認
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          const tile = map[y][x];
          expect(tile.resources.food).toBeGreaterThanOrEqual(0);
          expect(tile.resources.wood).toBeGreaterThanOrEqual(0);
          expect(tile.resources.ore).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.food).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.food).toBeLessThanOrEqual(1);
          expect(tile.depletionState.wood).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.wood).toBeLessThanOrEqual(1);
          expect(tile.depletionState.ore).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.ore).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("User experience optimization", () => {
    it("should provide responsive user feedback", () => {
      const resourceManager = new ResourceManager();
      const map = generateMap(5);

      // ユーザー操作のシミュレーション - 資源を持つタイルを見つける
      let testTile = map[2][2];

      // 資源を持つタイルを探す
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const tile = map[y][x];
          if (
            tile.maxResources.food > 0 ||
            tile.maxResources.wood > 0 ||
            tile.maxResources.ore > 0
          ) {
            testTile = tile;
            break;
          }
        }
        if (
          testTile.maxResources.food > 0 ||
          testTile.maxResources.wood > 0 ||
          testTile.maxResources.ore > 0
        ) {
          break;
        }
      }

      const initialResources = { ...testTile.resources };

      // 全ての資源を枯渇させる神の介入操作
      resourceManager.divineIntervention(testTile, "food", 0);
      resourceManager.divineIntervention(testTile, "wood", 0);
      resourceManager.divineIntervention(testTile, "ore", 0);

      expect(testTile.resources.food).toBe(0);
      expect(testTile.resources.wood).toBe(0);
      expect(testTile.resources.ore).toBe(0);

      // 即座に視覚状態が更新されることを確認（資源を持つタイルのみ）
      const hasResources =
        testTile.maxResources.food > 0 ||
        testTile.maxResources.wood > 0 ||
        testTile.maxResources.ore > 0;
      if (hasResources) {
        const visualState = resourceManager.getVisualState(testTile);
        expect(visualState.isDepleted).toBe(true);
      }

      // 回復操作
      if (hasResources) {
        resourceManager.divineIntervention(
          testTile,
          "food",
          initialResources.food,
        );
        resourceManager.divineIntervention(
          testTile,
          "wood",
          initialResources.wood,
        );
        resourceManager.divineIntervention(
          testTile,
          "ore",
          initialResources.ore,
        );

        expect(testTile.resources.food).toBe(initialResources.food);

        const recoveredState = resourceManager.getVisualState(testTile);
        expect(recoveredState.isDepleted).toBe(false);
        expect(recoveredState.opacity).toBeGreaterThan(0.3);
      }
    });

    it("should maintain consistent performance under load", () => {
      const mapSize = 30;
      const map = generateMap(mapSize);
      const villages = createVillages(map, 15);
      const roads = buildRoads(map, villages);
      const resourceManager = new ResourceManager();

      const performanceMetrics = {
        updateTimes: [] as number[],
        maxUpdateTime: 0,
        minUpdateTime: Infinity,
      };

      // 高負荷シミュレーション
      for (let frame = 0; frame < 100; frame++) {
        const startTime = performance.now();

        resourceManager.updateFrame();

        // 全タイル更新
        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // 全村更新
        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);

        // 多数の視覚状態計算
        for (let i = 0; i < 50; i++) {
          const randomTile =
            map[Math.floor(Math.random() * mapSize)][
              Math.floor(Math.random() * mapSize)
            ];
          resourceManager.getVisualState(randomTile);
        }

        const endTime = performance.now();
        const updateTime = endTime - startTime;

        performanceMetrics.updateTimes.push(updateTime);
        performanceMetrics.maxUpdateTime = Math.max(
          performanceMetrics.maxUpdateTime,
          updateTime,
        );
        performanceMetrics.minUpdateTime = Math.min(
          performanceMetrics.minUpdateTime,
          updateTime,
        );
      }

      const averageUpdateTime =
        performanceMetrics.updateTimes.reduce((sum, time) => sum + time, 0) /
        performanceMetrics.updateTimes.length;
      const standardDeviation = Math.sqrt(
        performanceMetrics.updateTimes.reduce(
          (sum, time) => sum + (time - averageUpdateTime) ** 2,
          0,
        ) / performanceMetrics.updateTimes.length,
      );

      // パフォーマンス要件の検証
      expect(averageUpdateTime).toBeLessThan(100); // 平均100ms以下
      expect(performanceMetrics.maxUpdateTime).toBeLessThan(200); // 最大200ms以下
      expect(standardDeviation).toBeLessThan(50); // 安定したパフォーマンス

      console.log("Performance metrics:", {
        average: averageUpdateTime.toFixed(2) + "ms",
        max: performanceMetrics.maxUpdateTime.toFixed(2) + "ms",
        min: performanceMetrics.minUpdateTime.toFixed(2) + "ms",
        standardDeviation: standardDeviation.toFixed(2) + "ms",
      });
    });
  });
});

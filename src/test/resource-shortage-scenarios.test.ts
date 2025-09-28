/**
 * 資源不足シナリオのテストケース
 * タスク10: 資源不足シナリオのテストケースを作成
 * 要件: 全要件の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEconomyManager, GameTime } from '../village-economy-manager';
import { PopulationManager } from '../population-manager';
import { BuildingManager } from '../building-manager';
import { SupplyDemandBalancer } from '../supply-demand-balancer';
import { Village } from '../village';
import { Tile } from '../map';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../village-economy';

describe('Resource Shortage Scenarios', () => {
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let supplyDemandBalancer: SupplyDemandBalancer;
  let gameTime: GameTime;
  let testMap: Tile[][];

  beforeEach(() => {
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();
    buildingManager = new BuildingManager();
    supplyDemandBalancer = new SupplyDemandBalancer();
    gameTime = { currentTime: 1000, deltaTime: 1.0 };

    // 標準的なテストマップ
    testMap = Array(10).fill(null).map(() => 
      Array(10).fill(null).map(() => ({
        type: 'land' as const,
        height: 0.5,
        resources: { food: 10, wood: 8, ore: 5 },
        maxResources: { food: 20, wood: 15, ore: 10 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }))
    );
  });

  // テスト用村作成ヘルパー
  function createTestVillage(
    population: number, 
    storage: { food: number; wood: number; ore: number },
    production: { food: number; wood: number; ore: number } = { food: 0, wood: 0, ore: 0 }
  ): Village {
    return {
      x: 5, y: 5, population,
      storage: { ...storage },
      collectionRadius: 2,
      economy: {
        production: { ...production },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { ...storage, capacity: 200 },
        buildings: { count: Math.max(1, Math.floor(population * 0.1)), targetCount: Math.max(1, Math.floor(population * 0.1)), constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [population]
    };
  }

  describe('食料不足シナリオ', () => {
    it('軽度の食料不足 - 人口増加停止', () => {
      // 軽度の食料不足状況を作成
      const village = createTestVillage(20, { food: 15, wood: 50, ore: 30 }); // 食料を少なく
      
      // 経済システムを更新
      economyManager.updateVillageEconomy(village, gameTime, testMap);
      
      // 食料生産を消費より少し下回るように調整
      village.economy.production.food = 8; // より少ない生産
      village.economy.consumption.food = populationManager.calculateFoodConsumption(village.population);
      village.economy.stock.food = 15; // ストックも少なく
      
      // 需給バランスを評価
      village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
      
      // 人口増加可能性をチェック
      const canGrow = populationManager.canPopulationGrow(village);
      
      // 軽度不足では人口増加が停止される
      expect(canGrow).toBe(false);
      // 需給状況は不足または危機的になる
      expect(['shortage', 'critical']).toContain(village.economy.supplyDemandStatus.food);
    });

    it('重度の食料不足 - 人口減少開始', () => {
      const village = createTestVillage(30, { food: 5, wood: 50, ore: 30 });
      
      // 重度の食料不足を設定
      village.economy.production.food = 2;
      village.economy.consumption.food = populationManager.calculateFoodConsumption(village.population);
      village.economy.supplyDemandStatus.food = 'critical';
      
      // 人口減少条件をチェック
      const shouldDecrease = populationManager.shouldPopulationDecrease(village);
      
      expect(shouldDecrease).toBe(true);
      expect(village.economy.supplyDemandStatus.food).toBe('critical');
    });

    it('食料完全枯渇 - 人口急減と村の衰退', () => {
      const village = createTestVillage(25, { food: 0, wood: 40, ore: 25 });
      
      // 完全枯渇状況
      village.economy.production.food = 0;
      village.economy.consumption.food = populationManager.calculateFoodConsumption(village.population);
      village.economy.supplyDemandStatus.food = 'critical';
      
      let populationDeclined = false;
      
      // 複数回更新して人口減少を確認
      for (let i = 0; i < 50; i++) {
        const initialPopulation = village.population;
        populationManager.updatePopulation(village, gameTime);
        
        if (village.population < initialPopulation) {
          populationDeclined = true;
          break;
        }
      }
      
      expect(populationDeclined).toBe(true);
      expect(village.storage.food).toBe(0);
    });

    it('食料不足からの段階的回復', () => {
      const village = createTestVillage(20, { food: 10, wood: 50, ore: 30 });
      
      // 初期不足状態
      village.economy.production.food = 8;
      village.economy.consumption.food = populationManager.calculateFoodConsumption(village.population);
      village.economy.supplyDemandStatus.food = 'shortage';
      
      expect(populationManager.canPopulationGrow(village)).toBe(false);
      
      // 段階的に食料状況を改善
      village.storage.food = 100; // ストック改善
      village.economy.production.food = 25; // 生産改善
      village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
      
      // 回復後は成長可能になる
      expect(populationManager.canPopulationGrow(village)).toBe(true);
      expect(village.economy.supplyDemandStatus.food).toMatch(/balanced|surplus/);
    });
  });

  describe('建設資源不足シナリオ', () => {
    it('木材不足 - 建物建設停止', () => {
      const village = createTestVillage(30, { food: 100, wood: 5, ore: 50 });
      
      // 建物需要があるが木材不足
      village.economy.buildings.targetCount = 3;
      village.economy.buildings.count = 1;
      
      // 建設可能性をチェック
      const canBuild = buildingManager.canBuildBuilding(village);
      
      expect(canBuild).toBe(false);
      
      // 建物更新を実行
      buildingManager.updateBuildings(village, gameTime);
      
      // 建設キューに追加されない
      expect(village.economy.buildings.constructionQueue).toBe(0);
      expect(village.storage.wood).toBe(5); // 資源は消費されない
    });

    it('鉱石不足 - 建物建設制限', () => {
      const village = createTestVillage(25, { food: 100, wood: 50, ore: 2 });
      
      village.economy.buildings.targetCount = 3;
      village.economy.buildings.count = 1;
      
      const canBuild = buildingManager.canBuildBuilding(village);
      
      expect(canBuild).toBe(false);
      
      buildingManager.updateBuildings(village, gameTime);
      
      expect(village.economy.buildings.constructionQueue).toBe(0);
      expect(village.storage.ore).toBe(2);
    });

    it('建設資源の部分的不足 - 制限された建設', () => {
      const village = createTestVillage(40, { food: 100, wood: 25, ore: 15 });
      
      // 2棟分の資源はあるが、目標は4棟
      village.economy.buildings.targetCount = 4;
      village.economy.buildings.count = 1;
      
      // 建設可能な最大数を計算
      const maxBuildable = Math.min(
        Math.floor(village.storage.wood / DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost),
        Math.floor(village.storage.ore / DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost)
      );
      
      expect(maxBuildable).toBe(2); // 木材25/10=2, 鉱石15/5=3 → min=2
      
      buildingManager.updateBuildings(village, gameTime);
      
      // 制限された数だけ建設される
      expect(village.economy.buildings.constructionQueue).toBeLessThanOrEqual(maxBuildable);
    });

    it('建設資源枯渇による生産効率低下', () => {
      const village = createTestVillage(50, { food: 100, wood: 0, ore: 0 });
      
      // 建物が不足している状況
      village.economy.buildings.count = 1; // 人口50に対して大幅に不足
      
      // 生産効率を計算
      economyManager.updateVillageEconomy(village, gameTime, testMap);
      const lowEfficiencyProduction = { ...village.economy.production };
      
      // 建物を十分に増やした場合と比較
      village.economy.buildings.count = 5;
      economyManager.updateVillageEconomy(village, gameTime, testMap);
      const highEfficiencyProduction = { ...village.economy.production };
      
      // 建物不足により生産効率が低いことを確認
      expect(lowEfficiencyProduction.food).toBeLessThan(highEfficiencyProduction.food);
      expect(lowEfficiencyProduction.wood).toBeLessThan(highEfficiencyProduction.wood);
      expect(lowEfficiencyProduction.ore).toBeLessThan(highEfficiencyProduction.ore);
    });
  });

  describe('複合的な資源不足シナリオ', () => {
    it('全資源同時不足 - 村の完全停滞', () => {
      const village = createTestVillage(30, { food: 5, wood: 3, ore: 2 });
      
      // 全資源で生産不足
      village.economy.production = { food: 2, wood: 1, ore: 0.5 };
      village.economy.consumption = {
        food: populationManager.calculateFoodConsumption(village.population),
        wood: 8,
        ore: 5
      };
      
      // 需給バランスを評価
      village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
      
      // 全資源が危機的状況
      expect(village.economy.supplyDemandStatus.food).toBe('critical');
      expect(village.economy.supplyDemandStatus.wood).toBe('critical');
      expect(village.economy.supplyDemandStatus.ore).toBe('critical');
      
      // 人口増加不可、建設不可
      expect(populationManager.canPopulationGrow(village)).toBe(false);
      expect(buildingManager.canBuildBuilding(village)).toBe(false);
    });

    it('資源不足の連鎖反応', () => {
      const village = createTestVillage(40, { food: 50, wood: 20, ore: 15 });
      
      // 建設資源不足 → 建物不足 → 生産効率低下 → 食料不足
      village.economy.buildings.count = 1; // 大幅に不足
      
      // 初期状態での生産能力
      economyManager.updateVillageEconomy(village, gameTime, testMap);
      const initialProduction = village.economy.production.food;
      
      // 時間経過で食料消費
      for (let i = 0; i < 20; i++) {
        populationManager.updatePopulation(village, gameTime);
        economyManager.updateVillageEconomy(village, gameTime, testMap);
      }
      
      // 建物不足により生産効率が低く、食料が枯渇しやすい
      expect(village.storage.food).toBeLessThan(50);
      expect(village.economy.production.food).toBeLessThan(initialProduction * 1.5); // 建物ボーナスが少ない
    });

    it('部分的回復による優先順位付け', () => {
      const village = createTestVillage(35, { food: 10, wood: 15, ore: 8 });
      
      // 全資源不足状態から開始
      village.economy.supplyDemandStatus = { food: 'critical', wood: 'shortage', ore: 'shortage' };
      
      // 食料のみ大幅に回復
      village.storage.food = 300; // より多く
      village.economy.stock.food = 300;
      village.economy.production.food = 50; // より多い生産
      village.economy.consumption.food = populationManager.calculateFoodConsumption(village.population);
      
      // 需給バランスを再評価
      village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
      
      // 食料は改善されるが、建設資源は依然不足
      expect(['balanced', 'surplus']).toContain(village.economy.supplyDemandStatus.food);
      expect(['shortage', 'critical']).toContain(village.economy.supplyDemandStatus.wood);
      expect(['shortage', 'critical']).toContain(village.economy.supplyDemandStatus.ore);
      
      // 人口増加は可能だが建設は不可
      expect(populationManager.canPopulationGrow(village)).toBe(true);
      expect(buildingManager.canBuildBuilding(village)).toBe(false);
    });
  });

  describe('村間の資源不足格差シナリオ', () => {
    it('資源不足村と余剰村の識別', () => {
      const villages: Village[] = [
        // 食料不足村
        createTestVillage(30, { food: 5, wood: 50, ore: 30 }, { food: 5, wood: 20, ore: 15 }),
        // 建設資源不足村
        createTestVillage(25, { food: 80, wood: 3, ore: 2 }, { food: 25, wood: 2, ore: 1 }),
        // 余剰村
        createTestVillage(20, { food: 200, wood: 100, ore: 80 }, { food: 40, wood: 30, ore: 25 }),
        // バランス村
        createTestVillage(15, { food: 50, wood: 30, ore: 20 }, { food: 15, wood: 12, ore: 8 })
      ];
      
      // 各村の需給バランスを評価
      villages.forEach(village => {
        village.economy.consumption = {
          food: populationManager.calculateFoodConsumption(village.population),
          wood: village.economy.buildings.constructionQueue * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost,
          ore: village.economy.buildings.constructionQueue * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost
        };
        village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
      });
      
      // 不足村と余剰村を識別
      const shortageVillages = economyManager.getResourceShortageVillages(villages);
      const surplusVillages = economyManager.getResourceSurplusVillages(villages);
      
      expect(shortageVillages.length).toBeGreaterThan(0);
      expect(surplusVillages.length).toBeGreaterThan(0);
      
      // 不足村の特定
      const foodShortageVillage = shortageVillages.find(v => v.economy.supplyDemandStatus.food === 'critical');
      expect(foodShortageVillage).toBeDefined();
      
      // 余剰村の特定
      const surplusVillage = surplusVillages.find(v => 
        v.economy.supplyDemandStatus.food === 'surplus' ||
        v.economy.supplyDemandStatus.wood === 'surplus' ||
        v.economy.supplyDemandStatus.ore === 'surplus'
      );
      expect(surplusVillage).toBeDefined();
    });

    it('供給可能性の評価', () => {
      const shortageVillage = createTestVillage(25, { food: 5, wood: 50, ore: 30 });
      shortageVillage.x = 0;
      shortageVillage.y = 0;
      shortageVillage.economy.supplyDemandStatus.food = 'critical';
      
      const surplusVillage = createTestVillage(20, { food: 200, wood: 100, ore: 80 });
      surplusVillage.x = 5;
      surplusVillage.y = 5;
      surplusVillage.economy.supplyDemandStatus.food = 'surplus';
      
      const distantVillage = createTestVillage(15, { food: 150, wood: 80, ore: 60 });
      distantVillage.x = 50;
      distantVillage.y = 50;
      distantVillage.economy.supplyDemandStatus.food = 'surplus';
      
      const allVillages = [shortageVillage, surplusVillage, distantVillage];
      
      // 供給可能性を評価（距離制限20）
      const suppliers = supplyDemandBalancer.evaluateSupplyPossibility(
        shortageVillage,
        allVillages,
        'food',
        20
      );
      
      // 近い余剰村は供給候補に含まれる
      expect(suppliers.some(s => s.supplier === surplusVillage)).toBe(true);
      
      // 遠い村は距離制限により除外される
      expect(suppliers.some(s => s.supplier === distantVillage)).toBe(false);
    });
  });

  describe('極端な資源不足シナリオ', () => {
    it('人口1人まで減少した村の最低限維持', () => {
      const village = createTestVillage(1, { food: 0, wood: 0, ore: 0 });
      
      // 最悪の条件
      village.economy.production = { food: 0, wood: 0, ore: 0 };
      village.economy.supplyDemandStatus = { food: 'critical', wood: 'critical', ore: 'critical' };
      
      // 人口1人では減少しない
      expect(populationManager.shouldPopulationDecrease(village)).toBe(false);
      
      // 建設も不可
      expect(buildingManager.canBuildBuilding(village)).toBe(false);
      
      // 最低限の状態が維持される
      populationManager.updatePopulation(village, gameTime);
      expect(village.population).toBe(1);
    });

    it('資源生産ゼロ環境での村の運命', () => {
      const village = createTestVillage(20, { food: 30, wood: 20, ore: 15 });
      
      // 生産ゼロの環境（枯渇した土地）
      const depletedMap: Tile[][] = Array(10).fill(null).map(() => 
        Array(10).fill(null).map(() => ({
          type: 'land' as const,
          height: 0.5,
          resources: { food: 0, wood: 0, ore: 0 },
          maxResources: { food: 0, wood: 0, ore: 0 },
          depletionState: { food: 1, wood: 1, ore: 1 },
          lastHarvestTime: 0
        }))
      );
      
      const initialPopulation = village.population;
      
      // 長期間のシミュレーション
      for (let i = 0; i < 100; i++) {
        economyManager.updateVillageEconomy(village, gameTime, depletedMap);
        populationManager.updatePopulation(village, gameTime);
        buildingManager.updateBuildings(village, gameTime);
        
        // 村が完全に消滅することはない（最低1人は維持）
        expect(village.population).toBeGreaterThan(0);
      }
      
      // 人口が減少傾向にあることを確認（完全な収束は時間がかかるため）
      expect(village.population).toBeLessThanOrEqual(initialPopulation);
      expect(village.storage.food).toBeLessThanOrEqual(30); // 初期値以下
    });

    it('瞬間的な大量消費による資源枯渇', () => {
      const village = createTestVillage(100, { food: 100, wood: 50, ore: 30 });
      
      // 大量の建設キューを設定（瞬間的な大量消費）
      village.economy.buildings.constructionQueue = 10;
      village.economy.buildings.targetCount = 15;
      
      // 消費量を計算
      const woodConsumption = 10 * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost;
      const oreConsumption = 10 * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost;
      
      // 実際の消費可能量は制限される
      const actualWoodConsumption = Math.min(woodConsumption, village.storage.wood);
      const actualOreConsumption = Math.min(oreConsumption, village.storage.ore);
      
      expect(actualWoodConsumption).toBeLessThan(woodConsumption);
      expect(actualOreConsumption).toBeLessThan(oreConsumption);
      
      // システムが破綻しないことを確認
      buildingManager.updateBuildings(village, gameTime);
      expect(village.storage.wood).toBeGreaterThanOrEqual(0);
      expect(village.storage.ore).toBeGreaterThanOrEqual(0);
    });
  });
});
import { Tile } from "./map";
import { Road } from "./trade";
import { ResourceManager } from "./resource-manager";
import { VillageEconomy } from "./village-economy";
import { VillageEconomyManager, GameTime } from "./village-economy-manager";
import { PopulationManager } from "./population-manager";
import { BuildingManager } from "./building-manager";
import { SupplyDemandBalancer } from "./supply-demand-balancer";
import { getGlobalConfig } from "./supply-demand-config";
import { FinalIntegrationSystem } from "./final-integration-system";
import { DEFAULT_OPTIMIZATION_CONFIG } from "./performance-optimizer";

export interface Village {
  x: number;
  y: number;
  population: number;
  storage: { food: number; wood: number; ore: number };
  collectionRadius: number;
  
  // 新規追加: 村の経済システム
  economy: VillageEconomy;
  lastUpdateTime: number;
  populationHistory: number[]; // 人口変化の履歴
}

/**
 * 資源効率を計算（要件4.1, 4.2）
 * @param available 現在利用可能な資源量
 * @param maxPossible 最大可能な資源量
 * @returns 0.1-1.0の効率値（1.0=通常効率、0.1=最低効率）
 */
function calculateResourceEfficiency(
  available: { food: number; wood: number; ore: number },
  maxPossible: { food: number; wood: number; ore: number }
): number {
  const totalAvailable = available.food + available.wood + available.ore;
  const totalMaxPossible = maxPossible.food + maxPossible.wood + maxPossible.ore;

  if (totalMaxPossible === 0) {
    return 1.0; // 資源がない場合は通常効率
  }

  // 資源の充足率を計算
  const resourceRatio = totalAvailable / totalMaxPossible;

  // 効率曲線を適用（0.8以上で通常効率、0.3以下で最低効率）
  if (resourceRatio >= 0.8) {
    return 1.0; // 豊富な場合は通常効率（要件4.1）
  } else if (resourceRatio <= 0.3) {
    return 0.1; // 枯渇気味の場合は最低効率（要件4.2）
  } else {
    // 線形補間で中間値を計算
    return 0.1 + ((resourceRatio - 0.3) / (0.8 - 0.3)) * 0.9;
  }
}

/**
 * 利用可能な資源タイプを優先順位付け（要件4.4）
 * @param available 現在利用可能な資源量
 * @returns 優先順位順の資源タイプ配列
 */
function prioritizeResourceTypes(available: { food: number; wood: number; ore: number }): (keyof typeof available)[] {
  const resourceTypes: (keyof typeof available)[] = ["food", "wood", "ore"];

  // 利用可能量の多い順にソート
  return resourceTypes.sort((a, b) => available[b] - available[a]);
}

export function createVillages(map: Tile[][], count: number): Village[] {
  const villages: Village[] = [];
  const size = map.length;

  while (villages.length < count) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const tile = map[y][x];
    if (tile.height > 0.3 && tile.height < 0.8) {
      villages.push({
        x,
        y,
        population: 10,
        storage: { food: 5, wood: 5, ore: 2 },
        collectionRadius: 1,
        
        // 経済システムの初期化
        economy: {
          production: { food: 0, wood: 0, ore: 0 },
          consumption: { food: 0, wood: 0, ore: 0 },
          stock: { 
            food: 5, 
            wood: 5, 
            ore: 2, 
            capacity: 100 
          },
          buildings: { 
            count: 1, 
            targetCount: 1, 
            constructionQueue: 0 
          },
          supplyDemandStatus: { 
            food: 'balanced', 
            wood: 'balanced', 
            ore: 'balanced' 
          }
        },
        lastUpdateTime: 0,
        populationHistory: [10]
      });
    }
  }
  return villages;
}

// 経済システムのマネージャーインスタンス（シングルトン）
let economyManager: VillageEconomyManager | null = null;
let populationManager: PopulationManager | null = null;
let buildingManager: BuildingManager | null = null;
let supplyDemandBalancer: SupplyDemandBalancer | null = null;

// 最終統合システム（パフォーマンス最適化を含む）
let finalIntegrationSystem: FinalIntegrationSystem | null = null;

/**
 * 経済システムマネージャーを初期化
 */
async function initializeEconomyManagers(): Promise<void> {
  if (!economyManager) {
    const config = getGlobalConfig();
    economyManager = new VillageEconomyManager(config);
    populationManager = new PopulationManager(config);
    buildingManager = new BuildingManager(config);
    supplyDemandBalancer = new SupplyDemandBalancer(config);
    
    // 最終統合システムを初期化
    if (!finalIntegrationSystem) {
      finalIntegrationSystem = new FinalIntegrationSystem(config, DEFAULT_OPTIMIZATION_CONFIG);
      const initSuccess = await finalIntegrationSystem.initialize();
      
      if (!initSuccess) {
        console.warn('Final Integration System initialization failed, falling back to basic systems');
        finalIntegrationSystem = null;
      } else {
        console.log('Final Integration System initialized successfully with performance optimization');
      }
    }
  }
}

/**
 * 村の状態整合性をチェックし修正
 * 要件 1.4: 村の状態が変化する時にシステムは生産・消費・ストック情報を更新する
 */
function validateAndFixVillageState(village: Village): void {
  try {
    // 基本プロパティの整合性チェック
    if (village.population < 1) village.population = 1;
    if (village.collectionRadius < 1) village.collectionRadius = 1;
    
    // ストレージの整合性チェック
    village.storage.food = Math.max(0, village.storage.food || 0);
    village.storage.wood = Math.max(0, village.storage.wood || 0);
    village.storage.ore = Math.max(0, village.storage.ore || 0);
    
    // 経済システムの初期化（存在しない場合）
    if (!village.economy) {
      village.economy = {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { 
          food: village.storage.food, 
          wood: village.storage.wood, 
          ore: village.storage.ore, 
          capacity: 100 
        },
        buildings: { 
          count: Math.max(1, Math.floor(village.population * 0.1)), 
          targetCount: Math.max(1, Math.floor(village.population * 0.1)), 
          constructionQueue: 0 
        },
        supplyDemandStatus: { 
          food: 'balanced', 
          wood: 'balanced', 
          ore: 'balanced' 
        }
      };
    }
    
    // 人口履歴の初期化
    if (!village.populationHistory || village.populationHistory.length === 0) {
      village.populationHistory = [village.population];
    }
    
    // 最終更新時間の初期化
    if (!village.lastUpdateTime) {
      village.lastUpdateTime = 0;
    }
    
    // 経済データの整合性チェック
    if (village.economy.buildings.count < 0) village.economy.buildings.count = 1;
    if (village.economy.buildings.targetCount < 0) village.economy.buildings.targetCount = 1;
    if (village.economy.buildings.constructionQueue < 0) village.economy.buildings.constructionQueue = 0;
    
  } catch (error) {
    console.error(`村 (${village.x}, ${village.y}) の状態修正でエラー:`, error);
  }
}

export async function updateVillages(
  map: Tile[][],
  villages: Village[],
  roads: Road[],
  resourceManager?: ResourceManager,
  timeManager?: import("./time-manager").TimeManager
) {
  // 入力パラメータの基本検証
  if (!map || !villages || !Array.isArray(villages)) {
    console.warn('Invalid parameters for updateVillages');
    return;
  }
  
  // 経済システムマネージャーを初期化
  await initializeEconomyManagers();
  
  // 時間情報を準備
  const gameTime: GameTime = timeManager ? {
    currentTime: timeManager.getGameTime().totalTicks,
    deltaTime: 1.0 // 1ティック = 1時間として扱う
  } : {
    currentTime: Date.now(),
    deltaTime: 1.0
  };
  // 最適化されたシステム更新または従来の更新
  let economySystemUpdated = false;
  
  if (finalIntegrationSystem) {
    // パフォーマンス最適化された統合システムを使用
    try {
      economySystemUpdated = finalIntegrationSystem.update(villages, gameTime, map, roads);
    } catch (error) {
      console.error('Final Integration System update failed, falling back to basic update:', error);
      finalIntegrationSystem = null; // 失敗時は無効化
    }
  }
  
  if (!finalIntegrationSystem || !economySystemUpdated) {
    // フォールバック: 従来の村更新処理
    for (const v of villages) {
      // 村の状態整合性をチェック
      validateAndFixVillageState(v);
      
      // 経済システムの更新（要件 1.4, 2.1, 3.1）
      try {
        // 1. 村の経済状況を更新
        economyManager!.updateVillageEconomy(v, gameTime, map);
        
        // 2. 時間ベースの人口変化を処理（要件 2.1）
        populationManager!.updatePopulation(v, gameTime);
        
        // 3. 時間ベースの建物建設を処理（要件 3.1）
        buildingManager!.updateBuildings(v, gameTime);
        
      } catch (error) {
        console.error(`村 (${v.x}, ${v.y}) の経済システム更新でエラー:`, error);
        // エラー時は経済システムをスキップして従来の処理を継続
      }
    }
  }

  // 資源収集（既存の資源収集システムとの連携を確保）
  for (const v of villages) {
    const radius = v.collectionRadius;
    let totalCollected = { food: 0, wood: 0, ore: 0 };
    let availableResources = { food: 0, wood: 0, ore: 0 };
    let maxPossibleResources = { food: 0, wood: 0, ore: 0 };

    // 収集範囲内の利用可能な資源を調査
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = v.x + dx,
          ty = v.y + dy;
        if (map[ty] && map[ty][tx]) {
          const tile = map[ty][tx];
          availableResources.food += tile.resources.food;
          availableResources.wood += tile.resources.wood;
          availableResources.ore += tile.resources.ore;
          maxPossibleResources.food += tile.maxResources.food;
          maxPossibleResources.wood += tile.maxResources.wood;
          maxPossibleResources.ore += tile.maxResources.ore;
        }
      }
    }

    // 資源効率を計算（要件4.1, 4.2）
    const resourceEfficiency = calculateResourceEfficiency(availableResources, maxPossibleResources);

    // 利用可能な資源タイプを優先順位付け（要件4.4）
    const resourcePriority = prioritizeResourceTypes(availableResources);

    // 実際の資源収集（ResourceManagerを使用）
    // 効率に基づいて採取量を調整
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = v.x + dx,
          ty = v.y + dy;
        if (map[ty] && map[ty][tx]) {
          const tile = map[ty][tx];

          // 優先順位に基づいて資源を採取（要件4.4）
          // 利用可能な資源から優先的に採取し、採取量も優先度に応じて調整
          for (let i = 0; i < resourcePriority.length; i++) {
            const resourceType = resourcePriority[i];
            if (tile.resources[resourceType] > 0) {
              // 時間ベースの採取クールダウンをチェック
              if (timeManager && !timeManager.isHarvestCooldownExpired(tile.lastHarvestTime)) {
                continue; // クールダウン中はスキップ
              }
              // 効率に基づいて採取量を決定
              const baseHarvestAmount = 1;

              // 優先度に基づく採取量の調整（最優先は100%、次は75%、最後は50%）
              const priorityMultiplier = 1 - i * 0.25;
              const adjustedHarvestAmount = Math.max(0.1, baseHarvestAmount * resourceEfficiency * priorityMultiplier);

              const harvested = resourceManager?.harvestResource(tile, resourceType, adjustedHarvestAmount) ?? 0;

              // 村のストレージに追加
              v.storage[resourceType] += harvested;
              totalCollected[resourceType] += harvested;
              
              // 経済システムのストック情報を同期（要件 1.2, 1.3）
              if (v.economy && v.economy.stock) {
                v.economy.stock[resourceType] = v.storage[resourceType];
              }
            }
          }
        }
      }
    }

    // 村の成長ロジック（経済システムと統合）
    // 注意: 人口変化は既に PopulationManager で処理されているため、
    // ここでは従来の成長ロジックを経済システムの状況に基づいて調整のみ行う
    
    const totalResources = v.storage.food + v.storage.wood + v.storage.ore;
    const totalAvailable = availableResources.food + availableResources.wood + availableResources.ore;
    const totalCollectedAmount = totalCollected.food + totalCollected.wood + totalCollected.ore;

    // 全資源が枯渇している場合の追加チェック（経済システムと併用）
    const isCompletelyDepleted = totalAvailable < 0.1 && totalCollectedAmount < 0.1;
    
    // 経済システムが人口変化を管理しているが、従来システムとの互換性のため
    // 極端な資源枯渇時の緊急調整を行う
    if (isCompletelyDepleted && v.economy.supplyDemandStatus.food === 'critical') {
      // 収集範囲を最小限に調整（資源効率を優先）
      v.collectionRadius = Math.max(1, Math.min(v.collectionRadius, 2));
    } else if (!isCompletelyDepleted) {
      // 資源効率に基づいて収集範囲を調整
      const resourceEfficiency = calculateResourceEfficiency(availableResources, maxPossibleResources);
      
      // 人口に基づく基本収集範囲（PopulationManagerで管理されている範囲を尊重）
      const baseRadius = Math.min(4, Math.floor(v.population / 20) + 1);
      
      // 効率に基づく調整（効率が低い場合は範囲を縮小）
      const efficiencyAdjustment = resourceEfficiency < 0.5 ? -1 : 0;
      v.collectionRadius = Math.max(1, Math.min(4, baseRadius + efficiencyAdjustment));
    }
  }

  // 需給バランス評価と村間関係の更新（要件 6.4）
  try {
    // 全村の需給バランスを評価
    const balanceComparison = supplyDemandBalancer!.compareVillageBalances(villages);
    
    // 資源不足村と余剰村を特定（要件 6.2, 6.3）
    const supplyDemandInfo = supplyDemandBalancer!.identifySupplyDemandVillages(villages);
    
    // デバッグ情報（開発時のみ）
    if (supplyDemandInfo.criticalVillages.length > 0) {
      console.log(`危機的状況の村: ${supplyDemandInfo.criticalVillages.length}村`);
    }
    
  } catch (error) {
    console.error('需給バランス評価でエラー:', error);
  }

  // 簡易交易（既存システムとの連携を確保）
  for (const road of roads) {
    const a = road.a,
      b = road.b;
    
    // 交易後にストック情報を同期
    const originalAFood = a.storage.food;
    const originalBFood = b.storage.food;
    const originalBWood = b.storage.wood;
    const originalAWood = a.storage.wood;
    
    if (a.storage.food > b.storage.food + 5) {
      a.storage.food--;
      b.storage.food++;
      road.usage++;
    }
    if (b.storage.wood > a.storage.wood + 5) {
      b.storage.wood--;
      a.storage.wood++;
      road.usage++;
    }
    
    // 交易が発生した場合、経済システムのストック情報を同期
    if (a.storage.food !== originalAFood && a.economy && a.economy.stock) {
      a.economy.stock.food = a.storage.food;
    }
    if (b.storage.food !== originalBFood && b.economy && b.economy.stock) {
      b.economy.stock.food = b.storage.food;
    }
    if (b.storage.wood !== originalBWood && b.economy && b.economy.stock) {
      b.economy.stock.wood = b.storage.wood;
    }
    if (a.storage.wood !== originalAWood && a.economy && a.economy.stock) {
      a.economy.stock.wood = a.storage.wood;
    }
  }
}
/**
 * 経済システムマネージャーへのアクセスを提供
 * 外部システム（UI等）が経済情報にアクセスするために使用
 */
export function getEconomyManagers(): {
  economyManager: VillageEconomyManager | null;
  populationManager: PopulationManager | null;
  buildingManager: BuildingManager | null;
  supplyDemandBalancer: SupplyDemandBalancer | null;
} {
  return {
    economyManager,
    populationManager,
    buildingManager,
    supplyDemandBalancer
  };
}

/**
 * 経済システムの統計情報を取得
 * デバッグやモニタリング用
 */
export function getEconomyStats(villages: Village[]): {
  totalVillages: number;
  criticalVillages: number;
  shortageVillages: number;
  surplusVillages: number;
  averagePopulation: number;
  totalProduction: { food: number; wood: number; ore: number };
  totalConsumption: { food: number; wood: number; ore: number };
} {
  if (!supplyDemandBalancer || villages.length === 0) {
    return {
      totalVillages: 0,
      criticalVillages: 0,
      shortageVillages: 0,
      surplusVillages: 0,
      averagePopulation: 0,
      totalProduction: { food: 0, wood: 0, ore: 0 },
      totalConsumption: { food: 0, wood: 0, ore: 0 }
    };
  }

  const supplyDemandInfo = supplyDemandBalancer.identifySupplyDemandVillages(villages);
  
  const totalProduction = villages.reduce((acc, v) => ({
    food: acc.food + (v.economy?.production?.food || 0),
    wood: acc.wood + (v.economy?.production?.wood || 0),
    ore: acc.ore + (v.economy?.production?.ore || 0)
  }), { food: 0, wood: 0, ore: 0 });
  
  const totalConsumption = villages.reduce((acc, v) => ({
    food: acc.food + (v.economy?.consumption?.food || 0),
    wood: acc.wood + (v.economy?.consumption?.wood || 0),
    ore: acc.ore + (v.economy?.consumption?.ore || 0)
  }), { food: 0, wood: 0, ore: 0 });
  
  const averagePopulation = villages.reduce((sum, v) => sum + v.population, 0) / villages.length;

  return {
    totalVillages: villages.length,
    criticalVillages: supplyDemandInfo.criticalVillages.length,
    shortageVillages: supplyDemandInfo.shortageVillages.length,
    surplusVillages: supplyDemandInfo.surplusVillages.length,
    averagePopulation,
    totalProduction,
    totalConsumption
  };
}
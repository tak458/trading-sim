import { Tile } from "./map";
import { Road } from "./trade";
import { ResourceManager } from "./resource-manager";

export interface Village {
  x: number;
  y: number;
  population: number;
  storage: { food: number; wood: number; ore: number };
  collectionRadius: number;
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
    return 0.1 + (resourceRatio - 0.3) / (0.8 - 0.3) * 0.9;
  }
}

/**
 * 利用可能な資源タイプを優先順位付け（要件4.4）
 * @param available 現在利用可能な資源量
 * @returns 優先順位順の資源タイプ配列
 */
function prioritizeResourceTypes(
  available: { food: number; wood: number; ore: number }
): (keyof typeof available)[] {
  const resourceTypes: (keyof typeof available)[] = ['food', 'wood', 'ore'];
  
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
        x, y,
        population: 10,
        storage: { food: 5, wood: 5, ore: 2 },
        collectionRadius: 1
      });
    }
  }
  return villages;
}

export function updateVillages(map: Tile[][], villages: Village[], roads: Road[], resourceManager: ResourceManager) {
  // 資源収集
  for (const v of villages) {
    const radius = v.collectionRadius;
    let totalCollected = { food: 0, wood: 0, ore: 0 };
    let availableResources = { food: 0, wood: 0, ore: 0 };
    let maxPossibleResources = { food: 0, wood: 0, ore: 0 };
    
    // 収集範囲内の利用可能な資源を調査
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = v.x + dx, ty = v.y + dy;
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
        const tx = v.x + dx, ty = v.y + dy;
        if (map[ty] && map[ty][tx]) {
          const tile = map[ty][tx];
          
          // 優先順位に基づいて資源を採取（要件4.4）
          // 利用可能な資源から優先的に採取し、採取量も優先度に応じて調整
          for (let i = 0; i < resourcePriority.length; i++) {
            const resourceType = resourcePriority[i];
            if (tile.resources[resourceType] > 0) {
              // 効率に基づいて採取量を決定
              const baseHarvestAmount = 1;
              
              // 優先度に基づく採取量の調整（最優先は100%、次は75%、最後は50%）
              const priorityMultiplier = 1 - (i * 0.25);
              const adjustedHarvestAmount = Math.max(0.1, baseHarvestAmount * resourceEfficiency * priorityMultiplier);
              
              const harvested = resourceManager.harvestResource(tile, resourceType, adjustedHarvestAmount);
              
              // 村のストレージに追加
              v.storage[resourceType] += harvested;
              totalCollected[resourceType] += harvested;
            }
          }
        }
      }
    }

    // 村の成長ロジック（要件4.3 - 全資源枯渇時の成長停滞）
    const totalResources = v.storage.food + v.storage.wood + v.storage.ore;
    const totalAvailable = availableResources.food + availableResources.wood + availableResources.ore;
    const totalCollectedAmount = totalCollected.food + totalCollected.wood + totalCollected.ore;
    
    // 全資源が枯渇している場合、成長を完全に停止（要件4.3）
    const isCompletelyDepleted = totalAvailable < 0.1 && totalCollectedAmount < 0.1;
    
    if (!isCompletelyDepleted) {
      // 資源効率に基づいて成長条件を調整
      const growthThreshold = 50 * (1 / Math.max(0.1, resourceEfficiency));
      const availabilityThreshold = 10 * resourceEfficiency;
      
      // 効率が高い場合は成長しやすく、低い場合は成長しにくい
      if (totalResources > growthThreshold && v.population < 50 && totalAvailable > availabilityThreshold) {
        // 効率に基づいて成長速度を調整
        const growthChance = resourceEfficiency;
        if (Math.random() < growthChance) {
          v.population++;
          // 人口20ごとに収集範囲を1拡大（最大4まで）
          v.collectionRadius = Math.min(4, Math.floor(v.population / 20) + 2);
        }
      }
    }
    // 完全に枯渇している場合は成長処理をスキップ（成長停滞）
  }

  // 簡易交易
  for (const road of roads) {
    const a = road.a, b = road.b;
    if (a.storage.food > b.storage.food + 5) {
      a.storage.food--; b.storage.food++;
      road.usage++;
    }
    if (b.storage.wood > a.storage.wood + 5) {
      b.storage.wood--; a.storage.wood++;
      road.usage++;
    }
  }
}

/**
 * PopulationManager と VillageEconomyManager の統合テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PopulationManager } from '../population-manager';
import { VillageEconomyManager } from '../village-economy-manager';
import { Village } from '../village';
import { Tile } from '../map';

describe('PopulationManager Integration', () => {
  let populationManager: PopulationManager;
  let economyManager: VillageEconomyManager;
  let testVillage: Village;
  let testMap: Tile[][];
  let gameTime: { currentTime: number; deltaTime: number };

  beforeEach(() => {
    populationManager = new PopulationManager();
    economyManager = new VillageEconomyManager();
    gameTime = { currentTime: 100, deltaTime: 1.0 };
    
    // テスト用のマップを作成
    testMap = Array(10).fill(null).map(() => 
      Array(10).fill(null).map(() => ({
        height: 0.5,
        resources: { food: 10, wood: 5, ore: 2 },
        maxResources: { food: 20, wood: 10, ore: 5 },
        lastHarvestTime: 0
      }))
    );
    
    // テスト用の村を作成
    testVillage = {
      x: 5,
      y: 5,
      population: 10,
      storage: { food: 50, wood: 20, ore: 10 },
      collectionRadius: 2,
      economy: {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { food: 50, wood: 20, ore: 10, capacity: 100 },
        buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [10]
    };
  });

  it('経済システムと人口システムが連携して動作する', () => {
    // 経済システムを更新
    economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
    
    // 人口システムを更新
    const initialFood = testVillage.storage.food;
    populationManager.updatePopulation(testVillage, gameTime);
    
    // 食料が消費されることを確認
    expect(testVillage.storage.food).toBeLessThan(initialFood);
    
    // 経済ストックと村ストレージが同期されることを確認
    expect(testVillage.economy.stock.food).toBe(testVillage.storage.food);
    
    // 生産能力が計算されることを確認
    expect(testVillage.economy.production.food).toBeGreaterThan(0);
    
    // 消費量が計算されることを確認
    expect(testVillage.economy.consumption.food).toBeGreaterThan(0);
  });

  it('食料不足時に人口増加が停止し、需給状況が反映される', () => {
    // 食料不足状況を作成
    testVillage.storage.food = 1;
    testVillage.economy.stock.food = 1;
    
    // 経済システムを更新
    economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
    
    // 人口増加可能性をチェック
    const canGrow = populationManager.canPopulationGrow(testVillage);
    expect(canGrow).toBe(false);
    
    // 需給状況が不足または危機的になることを確認
    expect(['shortage', 'critical']).toContain(testVillage.economy.supplyDemandStatus.food);
  });

  it('豊富な食料がある場合は人口増加が可能', () => {
    // 豊富な食料状況を作成
    testVillage.storage.food = 1000;
    testVillage.economy.stock.food = 1000;
    
    // 経済システムを更新
    economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
    
    // 人口増加可能性をチェック
    const canGrow = populationManager.canPopulationGrow(testVillage);
    expect(canGrow).toBe(true);
    
    // 需給状況が良好になることを確認
    expect(['balanced', 'surplus']).toContain(testVillage.economy.supplyDemandStatus.food);
  });

  it('人口変化が経済システムの消費計算に反映される', () => {
    // 初期消費量を記録
    economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
    const initialConsumption = testVillage.economy.consumption.food;
    
    // 人口を増加させる
    testVillage.population += 5;
    
    // 経済システムを再更新
    economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
    
    // 消費量が増加することを確認
    expect(testVillage.economy.consumption.food).toBeGreaterThan(initialConsumption);
  });

  it('統計情報が正確に取得できる', () => {
    // 経済システムを更新
    economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
    
    // 統計情報を取得
    const stats = populationManager.getPopulationStats(testVillage);
    
    // 統計情報が正確であることを確認
    expect(stats.currentPopulation).toBe(testVillage.population);
    expect(stats.foodConsumption).toBe(testVillage.economy.consumption.food);
    expect(typeof stats.canGrow).toBe('boolean');
    expect(typeof stats.shouldDecline).toBe('boolean');
    expect(['growing', 'stable', 'declining']).toContain(stats.populationTrend);
  });
});
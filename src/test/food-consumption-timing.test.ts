/**
 * 食料消費タイミング制御のテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PopulationManager } from "../game-systems/population/population-manager";
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from "../settings";
import type { Village } from "../game-systems/world/village";
import type { GameTime } from "../game-systems/shared-types";

describe("Food Consumption Timing Control", () => {
  let populationManager: PopulationManager;
  let testVillage: Village;
  let gameTime: GameTime;

  beforeEach(() => {
    populationManager = new PopulationManager(DEFAULT_SUPPLY_DEMAND_CONFIG);
    
    testVillage = {
      x: 5,
      y: 5,
      population: 10,
      storage: { food: 50, wood: 20, ore: 10 },
      collectionRadius: 2,
      lastUpdateTime: 0,
      populationHistory: [10],
      nextFoodConsumptionTime: 0, // 初回は即座に消費
      economy: {
        production: { food: 5, wood: 3, ore: 2 },
        consumption: { food: 10, wood: 0, ore: 0 },
        stock: { food: 50, wood: 20, ore: 10, capacity: 100 },
        buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
        supplyDemandStatus: { food: "balanced", wood: "balanced", ore: "balanced" },
      },
    };

    gameTime = {
      currentTime: 0,
      deltaTime: 1.0,
      totalTicks: 0,
      totalSeconds: 0,
      totalMinutes: 0,
      currentTick: 0,
    };
  });

  it("初回は即座に食料を消費する", () => {
    const initialFood = testVillage.storage.food;
    
    populationManager.updatePopulation(testVillage, gameTime);
    
    // 食料が消費されている
    expect(testVillage.storage.food).toBeLessThan(initialFood);
    // 次回消費時刻が設定されている
    expect(testVillage.nextFoodConsumptionTime).toBeGreaterThan(0);
  });

  it("消費時刻に達するまで食料を消費しない", () => {
    // 初回消費を実行
    populationManager.updatePopulation(testVillage, gameTime);
    const foodAfterFirstConsumption = testVillage.storage.food;
    const nextConsumptionTime = testVillage.nextFoodConsumptionTime;
    
    // 消費時刻に達していない時刻で更新
    gameTime.currentTick = nextConsumptionTime - 1;
    populationManager.updatePopulation(testVillage, gameTime);
    
    // 食料は消費されない
    expect(testVillage.storage.food).toBe(foodAfterFirstConsumption);
    // 次回消費時刻は変わらない
    expect(testVillage.nextFoodConsumptionTime).toBe(nextConsumptionTime);
  });

  it("消費時刻に達したら食料を消費する", () => {
    // 初回消費を実行
    populationManager.updatePopulation(testVillage, gameTime);
    const foodAfterFirstConsumption = testVillage.storage.food;
    const nextConsumptionTime = testVillage.nextFoodConsumptionTime;
    
    // 消費時刻に達した時刻で更新
    gameTime.currentTick = nextConsumptionTime;
    populationManager.updatePopulation(testVillage, gameTime);
    
    // 食料が再び消費されている
    expect(testVillage.storage.food).toBeLessThan(foodAfterFirstConsumption);
    // 新しい次回消費時刻が設定されている
    expect(testVillage.nextFoodConsumptionTime).toBeGreaterThan(nextConsumptionTime);
  });

  it("消費間隔がランダムに変動する", () => {
    const intervals: number[] = [];
    
    // 複数回消費を実行して間隔を記録
    for (let i = 0; i < 10; i++) {
      gameTime.currentTick = testVillage.nextFoodConsumptionTime;
      const currentTime = gameTime.currentTick;
      
      populationManager.updatePopulation(testVillage, gameTime);
      
      const interval = testVillage.nextFoodConsumptionTime - currentTime;
      intervals.push(interval);
    }
    
    // 間隔にバリエーションがある（全て同じではない）
    const uniqueIntervals = new Set(intervals);
    expect(uniqueIntervals.size).toBeGreaterThan(1);
    
    // 間隔が設定範囲内にある
    const baseInterval = DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionInterval;
    const randomFactor = DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionRandomFactor;
    const minInterval = Math.max(1, Math.round(baseInterval * (1 - randomFactor)));
    const maxInterval = Math.round(baseInterval * (1 + randomFactor));
    
    intervals.forEach(interval => {
      expect(interval).toBeGreaterThanOrEqual(minInterval);
      expect(interval).toBeLessThanOrEqual(maxInterval);
    });
  });

  it("設定値に基づいて消費間隔が決まる", () => {
    // カスタム設定でテスト
    const customConfig = {
      ...DEFAULT_SUPPLY_DEMAND_CONFIG,
      foodConsumptionInterval: 10,
      foodConsumptionRandomFactor: 0.2,
    };
    
    const customPopulationManager = new PopulationManager(customConfig);
    
    gameTime.currentTick = testVillage.nextFoodConsumptionTime;
    const currentTime = gameTime.currentTick;
    
    customPopulationManager.updatePopulation(testVillage, gameTime);
    
    const interval = testVillage.nextFoodConsumptionTime - currentTime;
    
    // 間隔が設定範囲内にある
    const minInterval = Math.max(1, Math.round(10 * 0.8)); // 8
    const maxInterval = Math.round(10 * 1.2); // 12
    
    expect(interval).toBeGreaterThanOrEqual(minInterval);
    expect(interval).toBeLessThanOrEqual(maxInterval);
  });
});
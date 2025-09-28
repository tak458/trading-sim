/**
 * 村の経済システム - 基盤インターフェース
 * 要件 1.1, 1.2, 1.3, 1.4 に対応
 */

/**
 * 資源の生産能力を表すインターフェース
 */
export interface Production {
  food: number;
  wood: number;
  ore: number;
}

/**
 * 資源の消費量を表すインターフェース
 */
export interface Consumption {
  food: number;        // 人口による消費
  wood: number;        // 建物建設による消費
  ore: number;         // 建物建設による消費
}

/**
 * 資源のストック情報を表すインターフェース
 */
export interface Stock {
  food: number;
  wood: number;
  ore: number;
  capacity: number;    // ストック容量
}

/**
 * 建物情報を表すインターフェース
 */
export interface Buildings {
  count: number;       // 現在の建物数
  targetCount: number; // 人口に基づく目標建物数
  constructionQueue: number; // 建設待ち数
}

/**
 * 需給状況を表す型
 */
export type SupplyDemandLevel = 'surplus' | 'balanced' | 'shortage' | 'critical';

/**
 * 各資源の需給状況を表すインターフェース
 */
export interface SupplyDemandStatus {
  food: SupplyDemandLevel;
  wood: SupplyDemandLevel;
  ore: SupplyDemandLevel;
}

/**
 * 村の経済システム全体を管理するインターフェース
 * 要件 1.1: 村ごとに生産・消費・ストック管理機能を追加
 * 要件 1.2: 村のストックを更新
 * 要件 1.3: 各資源タイプの現在量を追跡
 * 要件 1.4: 生産・消費・ストック情報を更新
 */
export interface VillageEconomy {
  // 生産能力
  production: Production;
  
  // 消費量
  consumption: Consumption;
  
  // ストック情報（既存のstorageを拡張）
  stock: Stock;
  
  // 建物情報
  buildings: Buildings;
  
  // 需給状況
  supplyDemandStatus: SupplyDemandStatus;
}

/**
 * 需給システムの設定値を管理するインターフェース
 * 人口・建物・需給バランス関連の設定値を定義
 */
export interface SupplyDemandConfig {
  // 人口関連設定
  foodConsumptionPerPerson: number;    // 1人当たりの食料消費量
  populationGrowthRate: number;        // 人口増加率
  populationDeclineRate: number;       // 人口減少率
  
  // 建物関連設定
  buildingsPerPopulation: number;      // 人口当たりの建物数
  buildingWoodCost: number;           // 建物1つの木材コスト
  buildingOreCost: number;            // 建物1つの鉱石コスト
  
  // 需給バランス判定閾値
  surplusThreshold: number;           // 余剰判定閾値
  shortageThreshold: number;          // 不足判定閾値
  criticalThreshold: number;          // 危機判定閾値
  
  // ストック関連設定
  baseStorageCapacity: number;        // 基本ストック容量
  storageCapacityPerBuilding: number; // 建物1つあたりの追加容量
}

/**
 * デフォルトの需給システム設定
 */
export const DEFAULT_SUPPLY_DEMAND_CONFIG: SupplyDemandConfig = {
  // 人口関連
  foodConsumptionPerPerson: 0.2,      // 1人当たり0.2食料/時間（調整済み）
  populationGrowthRate: 0.02,         // 2%の成長率
  populationDeclineRate: 0.05,        // 5%の減少率
  
  // 建物関連
  buildingsPerPopulation: 0.1,        // 人口10人につき1建物
  buildingWoodCost: 10,               // 建物1つにつき木材10
  buildingOreCost: 5,                 // 建物1つにつき鉱石5
  
  // 需給バランス閾値
  surplusThreshold: 1.5,              // 消費量の1.5倍以上で余剰
  shortageThreshold: 0.8,             // 消費量の0.8倍以下で不足
  criticalThreshold: 0.3,             // 消費量の0.3倍以下で危機
  
  // ストック関連
  baseStorageCapacity: 100,           // 基本容量100
  storageCapacityPerBuilding: 20,     // 建物1つにつき+20容量
};
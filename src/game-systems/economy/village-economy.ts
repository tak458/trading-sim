/**
 * 村の経済システム - 基盤インターフェース
 * 要件 1.1, 1.2, 1.3, 1.4 に対応
 */

// import { SupplyDemandConfig } from '../../settings'; // Unused import

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

// 注意: SupplyDemandConfig と DEFAULT_SUPPLY_DEMAND_CONFIG は
// 新しい統合設定システム（src/settings.ts）から取得してください
// 
// 使用例:
// import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../../settings';
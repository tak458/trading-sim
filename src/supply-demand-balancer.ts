/**
 * SupplyDemandBalancer - 需給バランス評価システム
 * 要件 6.1, 6.2, 6.3, 6.4 に対応
 */

import { Village } from './village';
import { 
  SupplyDemandLevel, 
  SupplyDemandStatus, 
  SupplyDemandConfig, 
  DEFAULT_SUPPLY_DEMAND_CONFIG 
} from './village-economy';

/**
 * 資源タイプを表す型
 */
export type ResourceType = 'food' | 'wood' | 'ore';

/**
 * 村の資源バランス情報を表すインターフェース
 */
export interface VillageResourceBalance {
  village: Village;
  resourceType: ResourceType;
  level: SupplyDemandLevel;
  production: number;
  consumption: number;
  stock: number;
  netBalance: number; // 生産量 - 消費量
  stockDays: number;  // 現在のストックで何日持つか
}

/**
 * 村間の資源バランス比較結果を表すインターフェース
 */
export interface VillageBalanceComparison {
  surplusVillages: VillageResourceBalance[];
  shortageVillages: VillageResourceBalance[];
  balancedVillages: VillageResourceBalance[];
  criticalVillages: VillageResourceBalance[];
}

/**
 * 需給バランス評価システムを管理するクラス
 * 要件 6.1: システムが村の状態を評価する時に各村の資源余剰・不足状況を判定する
 * 要件 6.2: 村に資源余剰がある時にシステムは余剰資源を他村への供給候補として識別する
 * 要件 6.3: 村で資源不足が発生している時にシステムは近隣村からの供給可能性を評価する
 * 要件 6.4: 資源バランスが変化する時にシステムは村間の需給関係を更新する
 */
export class SupplyDemandBalancer {
  private config: SupplyDemandConfig;

  constructor(config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG) {
    this.config = config;
  }

  /**
   * 各資源の余剰・不足状況を判定
   * 要件 6.1: システムが村の状態を評価する時に各村の資源余剰・不足状況を判定する
   * @param village 対象の村
   * @returns 村の需給バランス状況
   */
  evaluateVillageBalance(village: Village): SupplyDemandStatus {
    const production = village.economy.production;
    const consumption = village.economy.consumption;
    const stock = village.economy.stock;

    return {
      food: this.evaluateResourceBalance(production.food, consumption.food, stock.food),
      wood: this.evaluateResourceBalance(production.wood, consumption.wood, stock.wood),
      ore: this.evaluateResourceBalance(production.ore, consumption.ore, stock.ore)
    };
  }

  /**
   * 資源ごとの需給状況を計算
   * @param villages 全ての村のリスト
   * @param resourceType 対象の資源タイプ
   * @returns 資源別の村バランス比較結果
   */
  calculateResourceBalance(villages: Village[], resourceType: ResourceType): VillageBalanceComparison {
    const resourceBalances: VillageResourceBalance[] = villages.map(village => {
      const production = village.economy.production[resourceType];
      const consumption = village.economy.consumption[resourceType];
      const stock = village.economy.stock[resourceType];
      const level = this.evaluateResourceBalance(production, consumption, stock);
      const netBalance = production - consumption;
      const stockDays = consumption > 0 ? stock / consumption : stock > 0 ? Infinity : 0;

      return {
        village,
        resourceType,
        level,
        production,
        consumption,
        stock,
        netBalance,
        stockDays
      };
    });

    // レベル別に分類
    const surplusVillages = resourceBalances.filter(rb => rb.level === 'surplus');
    const shortageVillages = resourceBalances.filter(rb => rb.level === 'shortage');
    const balancedVillages = resourceBalances.filter(rb => rb.level === 'balanced');
    const criticalVillages = resourceBalances.filter(rb => rb.level === 'critical');

    return {
      surplusVillages,
      shortageVillages,
      balancedVillages,
      criticalVillages
    };
  }

  /**
   * 村間の資源バランス比較機能
   * 要件 6.4: 資源バランスが変化する時にシステムは村間の需給関係を更新する
   * @param villages 全ての村のリスト
   * @returns 全資源タイプの村バランス比較結果
   */
  compareVillageBalances(villages: Village[]): Record<ResourceType, VillageBalanceComparison> {
    const resourceTypes: ResourceType[] = ['food', 'wood', 'ore'];
    const result: Record<ResourceType, VillageBalanceComparison> = {} as any;

    for (const resourceType of resourceTypes) {
      result[resourceType] = this.calculateResourceBalance(villages, resourceType);
    }

    return result;
  }

  /**
   * 資源不足村と余剰村の識別機能
   * 要件 6.2: 村に資源余剰がある時にシステムは余剰資源を他村への供給候補として識別する
   * 要件 6.3: 村で資源不足が発生している時にシステムは近隣村からの供給可能性を評価する
   * @param villages 全ての村のリスト
   * @returns 不足村と余剰村のマッピング
   */
  identifySupplyDemandVillages(villages: Village[]): {
    shortageVillages: Village[];
    surplusVillages: Village[];
    criticalVillages: Village[];
    resourceSpecificBalances: Record<ResourceType, VillageBalanceComparison>;
  } {
    // 全体的な不足・余剰村を特定
    const shortageVillages = villages.filter(village => 
      this.hasResourceShortage(village)
    );

    const surplusVillages = villages.filter(village => 
      this.hasResourceSurplus(village)
    );

    const criticalVillages = villages.filter(village => 
      this.hasResourceCritical(village)
    );

    // 資源別の詳細バランス
    const resourceSpecificBalances = this.compareVillageBalances(villages);

    return {
      shortageVillages,
      surplusVillages,
      criticalVillages,
      resourceSpecificBalances
    };
  }

  /**
   * 近隣村からの供給可能性を評価
   * 要件 6.3: 村で資源不足が発生している時にシステムは近隣村からの供給可能性を評価する
   * @param shortageVillage 不足している村
   * @param potentialSuppliers 供給候補の村のリスト
   * @param resourceType 対象の資源タイプ
   * @param maxDistance 最大供給距離
   * @returns 供給可能性のある村のリスト（距離順）
   */
  evaluateSupplyPossibility(
    shortageVillage: Village, 
    potentialSuppliers: Village[], 
    resourceType: ResourceType,
    maxDistance: number = 10
  ): Array<{
    supplier: Village;
    distance: number;
    availableSupply: number;
    supplyCapacity: number;
  }> {
    const nearbySuppliers = potentialSuppliers
      .filter(supplier => {
        // 自分自身は除外
        if (supplier === shortageVillage) return false;
        
        // 距離チェック
        const distance = this.calculateDistance(shortageVillage, supplier);
        if (distance > maxDistance) return false;
        
        // 該当資源で余剰があるかチェック
        const supplierBalance = supplier.economy.supplyDemandStatus[resourceType];
        return supplierBalance === 'surplus';
      })
      .map(supplier => {
        const distance = this.calculateDistance(shortageVillage, supplier);
        const production = supplier.economy.production[resourceType];
        const consumption = supplier.economy.consumption[resourceType];
        const stock = supplier.economy.stock[resourceType];
        
        // 供給可能量を計算（余剰生産量 + 余剰ストック）
        const netProduction = Math.max(0, production - consumption);
        const excessStock = Math.max(0, stock - consumption * 3); // 3日分は保持
        const availableSupply = netProduction + excessStock * 0.1; // ストックの10%まで供給可能
        
        // 供給能力（距離による減衰を考慮）
        const distanceDecay = Math.max(0.1, 1 - distance / maxDistance);
        const supplyCapacity = availableSupply * distanceDecay;
        
        return {
          supplier,
          distance,
          availableSupply,
          supplyCapacity
        };
      })
      .filter(item => item.supplyCapacity > 0)
      .sort((a, b) => b.supplyCapacity - a.supplyCapacity); // 供給能力順でソート

    return nearbySuppliers;
  }

  /**
   * 個別資源の需給バランスを評価
   * @param production 生産量
   * @param consumption 消費量
   * @param stock 現在のストック量
   * @returns 需給レベル
   */
  private evaluateResourceBalance(production: number, consumption: number, stock: number): SupplyDemandLevel {
    // 消費量がゼロの場合は生産量とストックで判定
    if (consumption <= 0) {
      if (stock > 50) return 'surplus';
      if (stock > 20) return 'balanced';
      if (stock > 5) return 'shortage';
      return 'critical';
    }

    // 生産量と消費量の比率で基本判定
    const productionRatio = production / consumption;
    
    // ストック量も考慮した総合判定
    const stockDays = stock / consumption; // 現在のストックで何日持つか

    // 危機的状況を最優先で判定（生産が大幅に不足し、ストックが危機的）
    if (productionRatio < this.config.criticalThreshold || stockDays < 1) {
      return 'critical';
    }
    
    // 生産が消費を大幅に上回り、ストックも十分
    if (productionRatio >= this.config.surplusThreshold && stockDays > 10) {
      return 'surplus';
    }
    
    // 生産が消費を下回り、ストックも少ない（ただし危機的ではない）
    if (productionRatio < this.config.shortageThreshold && stockDays < 5) {
      return 'shortage';
    }
    
    return 'balanced';
  }

  /**
   * 村が資源不足状態かチェック
   * @param village 対象の村
   * @returns 不足状態の場合true
   */
  private hasResourceShortage(village: Village): boolean {
    const status = village.economy.supplyDemandStatus;
    return status.food === 'shortage' || 
           status.wood === 'shortage' || 
           status.ore === 'shortage';
  }

  /**
   * 村が資源余剰状態かチェック
   * @param village 対象の村
   * @returns 余剰状態の場合true
   */
  private hasResourceSurplus(village: Village): boolean {
    const status = village.economy.supplyDemandStatus;
    return status.food === 'surplus' || 
           status.wood === 'surplus' || 
           status.ore === 'surplus';
  }

  /**
   * 村が資源危機状態かチェック
   * @param village 対象の村
   * @returns 危機状態の場合true
   */
  private hasResourceCritical(village: Village): boolean {
    const status = village.economy.supplyDemandStatus;
    return status.food === 'critical' || 
           status.wood === 'critical' || 
           status.ore === 'critical';
  }

  /**
   * 2つの村間の距離を計算
   * @param village1 村1
   * @param village2 村2
   * @returns ユークリッド距離
   */
  private calculateDistance(village1: Village, village2: Village): number {
    const dx = village1.x - village2.x;
    const dy = village1.y - village2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
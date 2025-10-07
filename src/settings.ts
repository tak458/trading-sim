/**
 * 統合設定システム - 全ての設定値を一元管理
 * 要件 2.1, 2.2, 2.3 に対応
 *
 * このファイルは全てのゲーム設定を統合し、型安全な設定管理を提供します。
 */

/**
 * 資源管理設定インターフェース
 */
export interface ResourceConfig {
  depletionRate: number; // 採取時の消耗率 (0.1 = 10%減少)
  recoveryRate: number; // 回復率 (フレームあたり)
  recoveryDelay: number; // 枯渇後の回復開始遅延（フレーム数）
  minRecoveryThreshold: number; // 回復開始の最小閾値
  typeMultipliers: TileTypeMultipliers;
}

/**
 * タイルタイプ別の資源回復倍率
 */
export interface TileTypeMultipliers {
  water: { food: number; wood: number; ore: number };
  land: { food: number; wood: number; ore: number };
  forest: { food: number; wood: number; ore: number };
  mountain: { food: number; wood: number; ore: number };
  road: { food: number; wood: number; ore: number };
}

/**
 * 需給システム設定インターフェース
 */
export interface SupplyDemandConfig {
  // 人口関連設定
  foodConsumptionPerPerson: number; // 1人当たりの食料消費量
  populationGrowthRate: number; // 人口増加率
  populationDeclineRate: number; // 人口減少率

  // 建物関連設定
  buildingsPerPopulation: number; // 人口当たりの建物数
  buildingWoodCost: number; // 建物1つの木材コスト
  buildingOreCost: number; // 建物1つの鉱石コスト

  // 需給バランス判定閾値
  surplusThreshold: number; // 余剰判定閾値
  shortageThreshold: number; // 不足判定閾値
  criticalThreshold: number; // 危機判定閾値

  // ストック関連設定
  baseStorageCapacity: number; // 基本ストック容量
  storageCapacityPerBuilding: number; // 建物1つあたりの追加容量
}

/**
 * 時間システム設定インターフェース
 */
export interface TimeConfig {
  gameSpeed: number; // ゲーム速度倍率
  ticksPerSecond: number; // 1秒あたりのティック数
  updateIntervals: {
    resources: number; // 資源更新間隔（ティック）
    villages: number; // 村更新間隔（ティック）
    trade: number; // 交易更新間隔（ティック）
    visuals: number; // 視覚更新間隔（ティック）
  };
}

/**
 * グラフィックス設定インターフェース
 */
export interface GraphicsConfig {
  tileSize: number; // タイルサイズ（ピクセル）
  mapSize: number; // マップサイズ（タイル数）
  cameraSettings: CameraConfig;
  uiSettings: UIConfig;
}

/**
 * カメラ設定インターフェース
 */
export interface CameraConfig {
  zoomMin: number; // 最小ズーム
  zoomMax: number; // 最大ズーム
  zoomDefault: number; // デフォルトズーム
  panSpeed: number; // パン速度
}

/**
 * UI設定インターフェース
 */
export interface UIConfig {
  fontSize: number; // フォントサイズ
  panelOpacity: number; // パネル透明度
  animationSpeed: number; // アニメーション速度
  showDebugInfo: boolean; // デバッグ情報表示
}

/**
 * ゲームプレイ設定インターフェース
 */
export interface GameplayConfig {
  difficulty: "easy" | "normal" | "hard" | "extreme";
  villageCount: number; // 村の数
  initialResources: ResourceAmounts;
  autoSave: boolean; // 自動保存
  autoSaveInterval: number; // 自動保存間隔（秒）
}

/**
 * 資源量インターフェース
 */
export interface ResourceAmounts {
  food: number;
  wood: number;
  ore: number;
}

/**
 * 統合ゲーム設定インターフェース
 */
export interface GameSettings {
  resources: ResourceConfig;
  supplyDemand: SupplyDemandConfig;
  time: TimeConfig;
  graphics: GraphicsConfig;
  gameplay: GameplayConfig;
}

/**
 * 部分的なゲーム設定インターフェース（更新用）
 */
export interface PartialGameSettings {
  resources?: Partial<ResourceConfig>;
  supplyDemand?: Partial<SupplyDemandConfig>;
  time?: Partial<TimeConfig>;
  graphics?: Partial<GraphicsConfig>;
  gameplay?: Partial<GameplayConfig>;
}

/**
 * 設定検証エラーインターフェース
 */
export interface SettingsValidationError {
  category: keyof GameSettings;
  field: string;
  value: any;
  message: string;
  suggestedValue?: any;
}

/**
 * 設定検証結果インターフェース
 */
export interface SettingsValidationResult {
  isValid: boolean;
  errors: SettingsValidationError[];
  warnings: SettingsValidationError[];
  correctedSettings?: GameSettings;
}

/**
 * デフォルト設定値
 */
export const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
  depletionRate: 0.1, // 10%の消耗率
  recoveryRate: 0.02, // ティックあたり2%回復
  recoveryDelay: 5, // 5ティック（5秒）の遅延
  minRecoveryThreshold: 0.1, // 10%以下で回復開始
  typeMultipliers: {
    water: { food: 0.0, wood: 0.0, ore: 0.0 }, // 水域は資源なし
    land: { food: 1.5, wood: 0.5, ore: 0.3 },
    forest: { food: 0.8, wood: 2.0, ore: 0.2 },
    mountain: { food: 0.3, wood: 0.5, ore: 2.5 },
    road: { food: 0.1, wood: 0.1, ore: 0.1 }, // 道路は資源が少ない
  },
};

export const DEFAULT_SUPPLY_DEMAND_CONFIG: SupplyDemandConfig = {
  // 人口関連
  foodConsumptionPerPerson: 0.2, // 1人当たり0.2食料/時間
  populationGrowthRate: 0.02, // 2%の成長率
  populationDeclineRate: 0.05, // 5%の減少率

  // 建物関連
  buildingsPerPopulation: 0.1, // 人口10人につき1建物
  buildingWoodCost: 10, // 建物1つにつき木材10
  buildingOreCost: 5, // 建物1つにつき鉱石5

  // 需給バランス閾値
  surplusThreshold: 1.5, // 消費量の1.5倍以上で余剰
  shortageThreshold: 0.8, // 消費量の0.8倍以下で不足
  criticalThreshold: 0.3, // 消費量の0.3倍以下で危機

  // ストック関連
  baseStorageCapacity: 100, // 基本容量100
  storageCapacityPerBuilding: 20, // 建物1つにつき+20容量
};

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  gameSpeed: 1.0, // 通常速度
  ticksPerSecond: 1, // 1秒に1ティック
  updateIntervals: {
    resources: 1, // 毎ティック資源更新
    villages: 1, // 毎ティック村更新
    trade: 2, // 2ティックごとに交易
    visuals: 1, // 毎ティック視覚更新
  },
};

export const DEFAULT_GRAPHICS_CONFIG: GraphicsConfig = {
  tileSize: 32, // 32ピクセル
  mapSize: 50, // 50x50タイル
  cameraSettings: {
    zoomMin: 0.5,
    zoomMax: 3.0,
    zoomDefault: 1.0,
    panSpeed: 200,
  },
  uiSettings: {
    fontSize: 14,
    panelOpacity: 0.8,
    animationSpeed: 1.0,
    showDebugInfo: false,
  },
};

export const DEFAULT_GAMEPLAY_CONFIG: GameplayConfig = {
  difficulty: "normal",
  villageCount: 5,
  initialResources: {
    food: 50,
    wood: 30,
    ore: 20,
  },
  autoSave: true,
  autoSaveInterval: 300, // 5分
};

/**
 * デフォルトゲーム設定
 */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  resources: DEFAULT_RESOURCE_CONFIG,
  supplyDemand: DEFAULT_SUPPLY_DEMAND_CONFIG,
  time: DEFAULT_TIME_CONFIG,
  graphics: DEFAULT_GRAPHICS_CONFIG,
  gameplay: DEFAULT_GAMEPLAY_CONFIG,
};
/**

 * 設定制約条件インターフェース
 */
interface SettingsConstraints {
  min: number;
  max: number;
  recommended?: {
    min: number;
    max: number;
  };
}

/**
 * 各設定項目の制約条件
 */
const RESOURCE_CONSTRAINTS: Record<
  keyof ResourceConfig,
  SettingsConstraints | null
> = {
  depletionRate: { min: 0, max: 1, recommended: { min: 0.05, max: 0.3 } },
  recoveryRate: { min: 0, max: 1, recommended: { min: 0.01, max: 0.1 } },
  recoveryDelay: { min: 0, max: 60, recommended: { min: 3, max: 15 } },
  minRecoveryThreshold: {
    min: 0,
    max: 1,
    recommended: { min: 0.05, max: 0.3 },
  },
  typeMultipliers: null, // 複雑な構造のため個別検証
};

const SUPPLY_DEMAND_CONSTRAINTS: Record<
  keyof SupplyDemandConfig,
  SettingsConstraints
> = {
  foodConsumptionPerPerson: {
    min: 0.1,
    max: 2.0,
    recommended: { min: 0.15, max: 0.5 },
  },
  populationGrowthRate: {
    min: 0.001,
    max: 0.1,
    recommended: { min: 0.01, max: 0.05 },
  },
  populationDeclineRate: {
    min: 0.001,
    max: 0.2,
    recommended: { min: 0.02, max: 0.1 },
  },
  buildingsPerPopulation: {
    min: 0.05,
    max: 1.0,
    recommended: { min: 0.08, max: 0.2 },
  },
  buildingWoodCost: { min: 1, max: 100, recommended: { min: 5, max: 20 } },
  buildingOreCost: { min: 1, max: 50, recommended: { min: 2, max: 15 } },
  surplusThreshold: { min: 1.1, max: 3.0, recommended: { min: 1.2, max: 2.0 } },
  shortageThreshold: {
    min: 0.3,
    max: 0.95,
    recommended: { min: 0.6, max: 0.9 },
  },
  criticalThreshold: {
    min: 0.1,
    max: 0.6,
    recommended: { min: 0.2, max: 0.5 },
  },
  baseStorageCapacity: {
    min: 50,
    max: 500,
    recommended: { min: 80, max: 200 },
  },
  storageCapacityPerBuilding: {
    min: 5,
    max: 100,
    recommended: { min: 10, max: 50 },
  },
};

const TIME_CONSTRAINTS: Record<keyof TimeConfig, SettingsConstraints | null> = {
  gameSpeed: { min: 0.1, max: 5.0, recommended: { min: 0.5, max: 2.0 } },
  ticksPerSecond: { min: 0.1, max: 10, recommended: { min: 0.5, max: 2.0 } },
  updateIntervals: null, // 複雑な構造のため個別検証
};

/**
 * 型安全な設定管理クラス（シングルトン）
 * 要件 2.1, 2.2, 2.3: 設定の一元管理、型安全性、検証機能を提供
 */
export class SettingsManager {
  private static instance: SettingsManager | null = null;
  private settings: GameSettings;
  private listeners: Map<string, ((settings: GameSettings) => void)[]> =
    new Map();

  private constructor(initialSettings?: PartialGameSettings) {
    this.settings = this.mergeWithDefaults(initialSettings || {});

    // 初期設定を検証して修正
    const validationResult = this.validateSettings(this.settings);
    if (!validationResult.isValid && validationResult.correctedSettings) {
      this.settings = validationResult.correctedSettings;
      console.warn(
        "初期設定に問題があったため修正しました:",
        validationResult.errors,
      );
    }
  }

  /**
   * シングルトンインスタンスを取得
   * @param initialSettings 初期設定（初回のみ使用）
   * @returns SettingsManagerインスタンス
   */
  static getInstance(initialSettings?: PartialGameSettings): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager(initialSettings);
    }
    return SettingsManager.instance;
  }

  /**
   * 現在の設定を取得
   * @returns 現在のゲーム設定
   */
  getSettings(): GameSettings {
    return JSON.parse(JSON.stringify(this.settings)); // ディープコピー
  }

  /**
   * 設定を更新
   * @param partialSettings 更新する設定の一部
   * @returns 更新結果
   */
  updateSettings(
    partialSettings: PartialGameSettings,
  ): SettingsValidationResult {
    const mergedSettings = this.mergeSettings(this.settings, partialSettings);
    const validationResult = this.validateSettings(mergedSettings);

    if (validationResult.isValid || validationResult.correctedSettings) {
      const newSettings = validationResult.correctedSettings || mergedSettings;
      const oldSettings = this.settings;
      this.settings = newSettings;

      // 変更通知
      this.notifyListeners(oldSettings, newSettings);
    }

    return validationResult;
  }

  /**
   * 設定をデフォルト値にリセット
   */
  resetToDefaults(): void {
    const oldSettings = this.settings;
    this.settings = JSON.parse(JSON.stringify(DEFAULT_GAME_SETTINGS));
    this.notifyListeners(oldSettings, this.settings);
  }

  /**
   * 設定変更リスナーを追加
   * @param category 監視する設定カテゴリ
   * @param listener 変更時に呼び出される関数
   */
  addListener(
    category: keyof GameSettings,
    listener: (settings: GameSettings) => void,
  ): void {
    if (!this.listeners.has(category)) {
      this.listeners.set(category, []);
    }
    this.listeners.get(category)!.push(listener);
  }

  /**
   * 設定変更リスナーを削除
   * @param category 設定カテゴリ
   * @param listener 削除する関数
   */
  removeListener(
    category: keyof GameSettings,
    listener: (settings: GameSettings) => void,
  ): void {
    const categoryListeners = this.listeners.get(category);
    if (categoryListeners) {
      const index = categoryListeners.indexOf(listener);
      if (index !== -1) {
        categoryListeners.splice(index, 1);
      }
    }
  }

  /**
   * 設定の妥当性を検証
   * @param settings 検証する設定
   * @returns 検証結果
   */
  validateSettings(settings: GameSettings): SettingsValidationResult {
    const errors: SettingsValidationError[] = [];
    const warnings: SettingsValidationError[] = [];
    const correctedSettings: GameSettings = JSON.parse(
      JSON.stringify(settings),
    );

    // 資源設定の検証
    this.validateResourceConfig(
      settings.resources,
      errors,
      warnings,
      correctedSettings.resources,
    );

    // 需給設定の検証
    this.validateSupplyDemandConfig(
      settings.supplyDemand,
      errors,
      warnings,
      correctedSettings.supplyDemand,
    );

    // 時間設定の検証
    this.validateTimeConfig(
      settings.time,
      errors,
      warnings,
      correctedSettings.time,
    );

    // グラフィックス設定の検証
    this.validateGraphicsConfig(
      settings.graphics,
      errors,
      warnings,
      correctedSettings.graphics,
    );

    // ゲームプレイ設定の検証
    this.validateGameplayConfig(
      settings.gameplay,
      errors,
      warnings,
      correctedSettings.gameplay,
    );

    // 論理的整合性の検証
    this.validateLogicalConsistency(correctedSettings, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      correctedSettings: errors.length > 0 ? correctedSettings : undefined,
    };
  }

  /**
   * 設定値をサニタイズ（無効な値を修正）
   * @param settings サニタイズする設定
   * @returns サニタイズされた設定
   */
  sanitizeSettings(settings: PartialGameSettings): GameSettings {
    const mergedSettings = this.mergeWithDefaults(settings);
    const validationResult = this.validateSettings(mergedSettings);

    return validationResult.correctedSettings || mergedSettings;
  }

  /**
   * 設定をJSONとしてエクスポート
   * @returns JSON文字列
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * JSONから設定をインポート
   * @param jsonString JSON文字列
   * @returns インポート結果
   */
  importSettings(jsonString: string): {
    success: boolean;
    error?: string;
    validationResult?: SettingsValidationResult;
  } {
    try {
      const importedSettings = JSON.parse(jsonString) as PartialGameSettings;
      const validationResult = this.updateSettings(importedSettings);

      return {
        success:
          validationResult.isValid ||
          validationResult.correctedSettings !== undefined,
        validationResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラー",
      };
    }
  }

  /**
   * 設定の統計情報を取得
   * @returns 設定統計
   */
  getSettingsStats(): {
    totalFields: number;
    validFields: number;
    warningFields: number;
    errorFields: number;
    overallHealth: "excellent" | "good" | "warning" | "error";
  } {
    const validationResult = this.validateSettings(this.settings);
    const totalFields = this.countTotalFields(this.settings);
    const errorFields = validationResult.errors.length;
    const warningFields = validationResult.warnings.length;
    const validFields = totalFields - errorFields;

    let overallHealth: "excellent" | "good" | "warning" | "error";
    if (errorFields > 0) {
      overallHealth = "error";
    } else if (warningFields > 5) {
      overallHealth = "warning";
    } else if (warningFields > 0) {
      overallHealth = "good";
    } else {
      overallHealth = "excellent";
    }

    return {
      totalFields,
      validFields,
      warningFields,
      errorFields,
      overallHealth,
    };
  }

  // プライベートメソッド

  private mergeWithDefaults(
    partialSettings: PartialGameSettings,
  ): GameSettings {
    return {
      resources: { ...DEFAULT_RESOURCE_CONFIG, ...partialSettings.resources },
      supplyDemand: {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        ...partialSettings.supplyDemand,
      },
      time: { ...DEFAULT_TIME_CONFIG, ...partialSettings.time },
      graphics: { ...DEFAULT_GRAPHICS_CONFIG, ...partialSettings.graphics },
      gameplay: { ...DEFAULT_GAMEPLAY_CONFIG, ...partialSettings.gameplay },
    };
  }

  private mergeSettings(
    current: GameSettings,
    partial: PartialGameSettings,
  ): GameSettings {
    return {
      resources: { ...current.resources, ...partial.resources },
      supplyDemand: { ...current.supplyDemand, ...partial.supplyDemand },
      time: { ...current.time, ...partial.time },
      graphics: { ...current.graphics, ...partial.graphics },
      gameplay: { ...current.gameplay, ...partial.gameplay },
    };
  }

  private notifyListeners(
    oldSettings: GameSettings,
    newSettings: GameSettings,
  ): void {
    // 変更されたカテゴリを検出
    const changedCategories: (keyof GameSettings)[] = [];

    if (
      JSON.stringify(oldSettings.resources) !==
      JSON.stringify(newSettings.resources)
    ) {
      changedCategories.push("resources");
    }
    if (
      JSON.stringify(oldSettings.supplyDemand) !==
      JSON.stringify(newSettings.supplyDemand)
    ) {
      changedCategories.push("supplyDemand");
    }
    if (JSON.stringify(oldSettings.time) !== JSON.stringify(newSettings.time)) {
      changedCategories.push("time");
    }
    if (
      JSON.stringify(oldSettings.graphics) !==
      JSON.stringify(newSettings.graphics)
    ) {
      changedCategories.push("graphics");
    }
    if (
      JSON.stringify(oldSettings.gameplay) !==
      JSON.stringify(newSettings.gameplay)
    ) {
      changedCategories.push("gameplay");
    }

    // 該当するリスナーに通知
    changedCategories.forEach((category) => {
      const categoryListeners = this.listeners.get(category);
      if (categoryListeners) {
        categoryListeners.forEach((listener) => listener(newSettings));
      }
    });
  }

  private countTotalFields(settings: GameSettings): number {
    let count = 0;

    // 各カテゴリのフィールド数をカウント（ネストした構造も考慮）
    count += this.countObjectFields(settings.resources);
    count += this.countObjectFields(settings.supplyDemand);
    count += this.countObjectFields(settings.time);
    count += this.countObjectFields(settings.graphics);
    count += this.countObjectFields(settings.gameplay);

    return count;
  }

  private countObjectFields(obj: any): number {
    let count = 0;
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          count += this.countObjectFields(obj[key]);
        } else {
          count++;
        }
      }
    }
    return count;
  }
  private validateResourceConfig(
    config: ResourceConfig,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
    corrected: ResourceConfig,
  ): void {
    // 基本的な数値フィールドの検証
    const numericFields: (keyof ResourceConfig)[] = [
      "depletionRate",
      "recoveryRate",
      "recoveryDelay",
      "minRecoveryThreshold",
    ];

    numericFields.forEach((field) => {
      const value = config[field] as number;
      const constraints = RESOURCE_CONSTRAINTS[field];

      if (
        constraints &&
        this.validateNumericField(
          "resources",
          field,
          value,
          constraints,
          errors,
          warnings,
        )
      ) {
        (corrected as any)[field] = this.correctNumericValue(
          value,
          constraints,
        );
      }
    });

    // typeMultipliers の検証
    if (config.typeMultipliers) {
      const tileTypes: (keyof TileTypeMultipliers)[] = [
        "water",
        "land",
        "forest",
        "mountain",
        "road",
      ];
      const resourceTypes: (keyof ResourceAmounts)[] = ["food", "wood", "ore"];

      tileTypes.forEach((tileType) => {
        if (config.typeMultipliers[tileType]) {
          resourceTypes.forEach((resourceType) => {
            const value = config.typeMultipliers[tileType][resourceType];
            if (typeof value === "number") {
              if (value < 0) {
                errors.push({
                  category: "resources",
                  field: `typeMultipliers.${tileType}.${resourceType}`,
                  value,
                  message: "倍率は0以上である必要があります",
                  suggestedValue: 0,
                });
                corrected.typeMultipliers[tileType][resourceType] = 0;
              } else if (value > 10) {
                warnings.push({
                  category: "resources",
                  field: `typeMultipliers.${tileType}.${resourceType}`,
                  value,
                  message: "倍率が10を超えると回復が非常に早くなります",
                  suggestedValue: 3.0,
                });
              }
            }
          });
        }
      });
    }
  }

  private validateSupplyDemandConfig(
    config: SupplyDemandConfig,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
    corrected: SupplyDemandConfig,
  ): void {
    // 全フィールドの検証
    (
      Object.keys(SUPPLY_DEMAND_CONSTRAINTS) as (keyof SupplyDemandConfig)[]
    ).forEach((field) => {
      const value = config[field];
      const constraints = SUPPLY_DEMAND_CONSTRAINTS[field];

      if (
        this.validateNumericField(
          "supplyDemand",
          field,
          value,
          constraints,
          errors,
          warnings,
        )
      ) {
        (corrected as any)[field] = this.correctNumericValue(
          value,
          constraints,
        );
      }
    });

    // 論理的整合性チェック（需給バランス閾値）
    if (corrected.criticalThreshold >= corrected.shortageThreshold) {
      errors.push({
        category: "supplyDemand",
        field: "criticalThreshold",
        value: corrected.criticalThreshold,
        message: "criticalThresholdはshortageThreshold未満である必要があります",
        suggestedValue: corrected.shortageThreshold * 0.8,
      });
      corrected.criticalThreshold = corrected.shortageThreshold * 0.8;
    }

    if (corrected.shortageThreshold >= corrected.surplusThreshold) {
      errors.push({
        category: "supplyDemand",
        field: "shortageThreshold",
        value: corrected.shortageThreshold,
        message: "shortageThresholdはsurplusThreshold未満である必要があります",
        suggestedValue: corrected.surplusThreshold * 0.9,
      });
      corrected.shortageThreshold = corrected.surplusThreshold * 0.9;
    }

    // 人口変化率の論理チェック
    if (corrected.populationDeclineRate <= corrected.populationGrowthRate) {
      warnings.push({
        category: "supplyDemand",
        field: "populationDeclineRate",
        value: corrected.populationDeclineRate,
        message: "人口減少率は通常、増加率より大きく設定することを推奨します",
        suggestedValue: corrected.populationGrowthRate * 2,
      });
    }
  }

  private validateTimeConfig(
    config: TimeConfig,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
    corrected: TimeConfig,
  ): void {
    // gameSpeed と ticksPerSecond の検証
    const numericFields: (keyof TimeConfig)[] = ["gameSpeed", "ticksPerSecond"];

    numericFields.forEach((field) => {
      const value = config[field] as number;
      const constraints = TIME_CONSTRAINTS[field];

      if (
        constraints &&
        this.validateNumericField(
          "time",
          field,
          value,
          constraints,
          errors,
          warnings,
        )
      ) {
        (corrected as any)[field] = this.correctNumericValue(
          value,
          constraints,
        );
      }
    });

    // updateIntervals の検証
    if (config.updateIntervals) {
      const intervalFields: (keyof TimeConfig["updateIntervals"])[] = [
        "resources",
        "villages",
        "trade",
        "visuals",
      ];

      intervalFields.forEach((field) => {
        const value = config.updateIntervals[field];
        if (typeof value === "number") {
          if (value < 1) {
            errors.push({
              category: "time",
              field: `updateIntervals.${field}`,
              value,
              message: "更新間隔は1以上である必要があります",
              suggestedValue: 1,
            });
            corrected.updateIntervals[field] = 1;
          } else if (value > 60) {
            warnings.push({
              category: "time",
              field: `updateIntervals.${field}`,
              value,
              message: "更新間隔が60を超えると応答性が悪くなる可能性があります",
              suggestedValue: 10,
            });
          }
        }
      });
    }
  }

  private validateGraphicsConfig(
    config: GraphicsConfig,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
    corrected: GraphicsConfig,
  ): void {
    // tileSize の検証
    if (config.tileSize < 8 || config.tileSize > 128) {
      errors.push({
        category: "graphics",
        field: "tileSize",
        value: config.tileSize,
        message: "タイルサイズは8から128ピクセルの範囲内である必要があります",
        suggestedValue: Math.max(8, Math.min(128, config.tileSize)),
      });
      corrected.tileSize = Math.max(8, Math.min(128, config.tileSize));
    }

    // mapSize の検証
    if (config.mapSize < 10 || config.mapSize > 200) {
      errors.push({
        category: "graphics",
        field: "mapSize",
        value: config.mapSize,
        message: "マップサイズは10から200タイルの範囲内である必要があります",
        suggestedValue: Math.max(10, Math.min(200, config.mapSize)),
      });
      corrected.mapSize = Math.max(10, Math.min(200, config.mapSize));
    }

    // カメラ設定の検証
    if (config.cameraSettings) {
      const { zoomMin, zoomMax, zoomDefault } = config.cameraSettings;

      if (zoomMin >= zoomMax) {
        errors.push({
          category: "graphics",
          field: "cameraSettings.zoomMin",
          value: zoomMin,
          message: "最小ズームは最大ズーム未満である必要があります",
          suggestedValue: zoomMax * 0.5,
        });
        corrected.cameraSettings.zoomMin = zoomMax * 0.5;
      }

      if (zoomDefault < zoomMin || zoomDefault > zoomMax) {
        errors.push({
          category: "graphics",
          field: "cameraSettings.zoomDefault",
          value: zoomDefault,
          message:
            "デフォルトズームは最小ズームと最大ズームの間である必要があります",
          suggestedValue: (zoomMin + zoomMax) / 2,
        });
        corrected.cameraSettings.zoomDefault =
          (corrected.cameraSettings.zoomMin +
            corrected.cameraSettings.zoomMax) /
          2;
      }
    }

    // UI設定の検証
    if (config.uiSettings) {
      if (
        config.uiSettings.panelOpacity < 0 ||
        config.uiSettings.panelOpacity > 1
      ) {
        errors.push({
          category: "graphics",
          field: "uiSettings.panelOpacity",
          value: config.uiSettings.panelOpacity,
          message: "パネル透明度は0から1の範囲内である必要があります",
          suggestedValue: Math.max(
            0,
            Math.min(1, config.uiSettings.panelOpacity),
          ),
        });
        corrected.uiSettings.panelOpacity = Math.max(
          0,
          Math.min(1, config.uiSettings.panelOpacity),
        );
      }
    }
  }

  private validateGameplayConfig(
    config: GameplayConfig,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
    corrected: GameplayConfig,
  ): void {
    // 難易度の検証
    const validDifficulties = ["easy", "normal", "hard", "extreme"];
    if (!validDifficulties.includes(config.difficulty)) {
      errors.push({
        category: "gameplay",
        field: "difficulty",
        value: config.difficulty,
        message: "有効な難易度を選択してください",
        suggestedValue: "normal",
      });
      corrected.difficulty = "normal";
    }

    // 村の数の検証
    if (config.villageCount < 1 || config.villageCount > 20) {
      errors.push({
        category: "gameplay",
        field: "villageCount",
        value: config.villageCount,
        message: "村の数は1から20の範囲内である必要があります",
        suggestedValue: Math.max(1, Math.min(20, config.villageCount)),
      });
      corrected.villageCount = Math.max(1, Math.min(20, config.villageCount));
    }

    // 初期資源の検証
    if (config.initialResources) {
      const resourceTypes: (keyof ResourceAmounts)[] = ["food", "wood", "ore"];
      resourceTypes.forEach((resourceType) => {
        const value = config.initialResources[resourceType];
        if (value < 0) {
          errors.push({
            category: "gameplay",
            field: `initialResources.${resourceType}`,
            value,
            message: "初期資源量は0以上である必要があります",
            suggestedValue: 0,
          });
          corrected.initialResources[resourceType] = 0;
        } else if (value > 1000) {
          warnings.push({
            category: "gameplay",
            field: `initialResources.${resourceType}`,
            value,
            message:
              "初期資源量が1000を超えるとゲームバランスが崩れる可能性があります",
            suggestedValue: 100,
          });
        }
      });
    }

    // 自動保存間隔の検証
    if (config.autoSaveInterval < 60 || config.autoSaveInterval > 3600) {
      warnings.push({
        category: "gameplay",
        field: "autoSaveInterval",
        value: config.autoSaveInterval,
        message: "自動保存間隔は60秒から3600秒（1時間）の範囲を推奨します",
        suggestedValue: Math.max(60, Math.min(3600, config.autoSaveInterval)),
      });
    }
  }

  private validateLogicalConsistency(
    settings: GameSettings,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
  ): void {
    // 資源消耗と回復のバランスチェック
    const { depletionRate, recoveryRate } = settings.resources;
    if (depletionRate > recoveryRate * 10) {
      warnings.push({
        category: "resources",
        field: "depletionRate",
        value: depletionRate,
        message: "消耗率が回復率に比べて非常に高く、資源が枯渇しやすくなります",
        suggestedValue: recoveryRate * 5,
      });
    }

    // 時間設定とゲーム速度の整合性
    const { gameSpeed, ticksPerSecond } = settings.time;
    const effectiveTickRate = gameSpeed * ticksPerSecond;
    if (effectiveTickRate > 10) {
      warnings.push({
        category: "time",
        field: "gameSpeed",
        value: gameSpeed,
        message:
          "実効ティック率が高すぎるとパフォーマンスに影響する可能性があります",
        suggestedValue: 5 / ticksPerSecond,
      });
    }

    // 建物コストと初期資源のバランス
    const { buildingWoodCost, buildingOreCost } = settings.supplyDemand;
    const { wood, ore } = settings.gameplay.initialResources;

    if (wood < buildingWoodCost || ore < buildingOreCost) {
      warnings.push({
        category: "gameplay",
        field: "initialResources",
        value: { wood, ore },
        message: "初期資源が建物建設コストを下回っています",
        suggestedValue: {
          wood: buildingWoodCost * 2,
          ore: buildingOreCost * 2,
        },
      });
    }
  }

  private validateNumericField(
    category: keyof GameSettings,
    field: string,
    value: number,
    constraints: SettingsConstraints,
    errors: SettingsValidationError[],
    warnings: SettingsValidationError[],
  ): boolean {
    let hasError = false;

    // NaN や Infinity の検出
    if (!isFinite(value) || isNaN(value)) {
      errors.push({
        category,
        field,
        value,
        message: `${field}は有効な数値である必要があります`,
        suggestedValue: constraints.recommended?.min || constraints.min,
      });
      return true;
    }

    // 基本範囲チェック
    if (value < constraints.min || value > constraints.max) {
      errors.push({
        category,
        field,
        value,
        message: `${field}は${constraints.min}から${constraints.max}の範囲内である必要があります`,
        suggestedValue: Math.max(
          constraints.min,
          Math.min(constraints.max, value),
        ),
      });
      hasError = true;
    }

    // 推奨範囲チェック
    if (!hasError && constraints.recommended) {
      const { min: recMin, max: recMax } = constraints.recommended;
      if (value < recMin || value > recMax) {
        warnings.push({
          category,
          field,
          value,
          message: `${field}の推奨範囲は${recMin}から${recMax}です`,
          suggestedValue: Math.max(recMin, Math.min(recMax, value)),
        });
      }
    }

    return hasError;
  }

  private correctNumericValue(
    value: number,
    constraints: SettingsConstraints,
  ): number {
    if (!isFinite(value) || isNaN(value)) {
      return constraints.recommended?.min || constraints.min;
    }
    return Math.max(constraints.min, Math.min(constraints.max, value));
  }
}

/**
 * グローバル設定マネージャーインスタンス（便利関数用）
 */
let globalSettingsManager: SettingsManager | null = null;

/**
 * グローバル設定マネージャーを取得
 * @param initialSettings 初期設定（初回のみ使用）
 * @returns SettingsManagerインスタンス
 */
export function getGlobalSettingsManager(
  initialSettings?: PartialGameSettings,
): SettingsManager {
  if (!globalSettingsManager) {
    globalSettingsManager = SettingsManager.getInstance(initialSettings);
  }
  return globalSettingsManager;
}

/**
 * グローバル設定を取得（便利関数）
 * @returns 現在のグローバル設定
 */
export function getGlobalSettings(): GameSettings {
  return getGlobalSettingsManager().getSettings();
}

/**
 * グローバル設定を更新（便利関数）
 * @param partialSettings 更新する設定の一部
 * @returns 更新結果
 */
export function updateGlobalSettings(
  partialSettings: PartialGameSettings,
): SettingsValidationResult {
  return getGlobalSettingsManager().updateSettings(partialSettings);
}

/**
 * 設定プリセット定義
 */
export interface SettingsPreset {
  name: string;
  description: string;
  settings: PartialGameSettings;
}

/**
 * 利用可能な設定プリセット
 */
export const SETTINGS_PRESETS: SettingsPreset[] = [
  {
    name: "easy",
    description: "初心者向け - 資源が豊富で管理が簡単",
    settings: {
      resources: {
        depletionRate: 0.05,
        recoveryRate: 0.04,
        recoveryDelay: 3,
        minRecoveryThreshold: 0.2,
        typeMultipliers: {
          water: { food: 0.0, wood: 0.0, ore: 0.0 },
          land: { food: 2.0, wood: 0.8, ore: 0.5 },
          forest: { food: 1.2, wood: 2.5, ore: 0.3 },
          mountain: { food: 0.5, wood: 0.8, ore: 3.0 },
          road: { food: 0.1, wood: 0.1, ore: 0.1 },
        },
      },
      supplyDemand: {
        foodConsumptionPerPerson: 0.15,
        populationGrowthRate: 0.015,
        populationDeclineRate: 0.03,
        buildingsPerPopulation: 0.08,
        buildingWoodCost: 8,
        buildingOreCost: 4,
        surplusThreshold: 1.8,
        shortageThreshold: 0.9,
        criticalThreshold: 0.4,
        baseStorageCapacity: 120,
        storageCapacityPerBuilding: 25,
      },
      gameplay: {
        difficulty: "easy" as const,
        villageCount: 5,
        initialResources: { food: 100, wood: 60, ore: 40 },
        autoSave: true,
        autoSaveInterval: 300,
      },
    },
  },
  {
    name: "normal",
    description: "標準的なバランス",
    settings: {},
  },
  {
    name: "hard",
    description: "上級者向け - 資源管理が重要",
    settings: {
      resources: {
        depletionRate: 0.15,
        recoveryRate: 0.01,
        recoveryDelay: 10,
        minRecoveryThreshold: 0.05,
        typeMultipliers: {
          water: { food: 0.0, wood: 0.0, ore: 0.0 },
          land: { food: 1.2, wood: 0.3, ore: 0.2 },
          forest: { food: 0.5, wood: 1.5, ore: 0.1 },
          mountain: { food: 0.2, wood: 0.3, ore: 2.0 },
          road: { food: 0.05, wood: 0.05, ore: 0.05 },
        },
      },
      supplyDemand: {
        foodConsumptionPerPerson: 0.3,
        populationGrowthRate: 0.025,
        populationDeclineRate: 0.08,
        buildingsPerPopulation: 0.12,
        buildingWoodCost: 15,
        buildingOreCost: 8,
        surplusThreshold: 1.3,
        shortageThreshold: 0.7,
        criticalThreshold: 0.25,
        baseStorageCapacity: 80,
        storageCapacityPerBuilding: 15,
      },
      gameplay: {
        difficulty: "hard" as const,
        villageCount: 5,
        initialResources: { food: 30, wood: 20, ore: 15 },
        autoSave: true,
        autoSaveInterval: 300,
      },
    },
  },
  {
    name: "extreme",
    description: "エキスパート向け - 極限の資源管理",
    settings: {
      resources: {
        depletionRate: 0.25,
        recoveryRate: 0.005,
        recoveryDelay: 15,
        minRecoveryThreshold: 0.02,
        typeMultipliers: {
          water: { food: 0.0, wood: 0.0, ore: 0.0 },
          land: { food: 1.0, wood: 0.2, ore: 0.1 },
          forest: { food: 0.3, wood: 1.2, ore: 0.05 },
          mountain: { food: 0.1, wood: 0.2, ore: 1.5 },
          road: { food: 0.02, wood: 0.02, ore: 0.02 },
        },
      },
      supplyDemand: {
        foodConsumptionPerPerson: 0.4,
        populationGrowthRate: 0.03,
        populationDeclineRate: 0.12,
        buildingsPerPopulation: 0.15,
        buildingWoodCost: 20,
        buildingOreCost: 12,
        surplusThreshold: 1.2,
        shortageThreshold: 0.6,
        criticalThreshold: 0.2,
        baseStorageCapacity: 60,
        storageCapacityPerBuilding: 10,
      },
      gameplay: {
        difficulty: "extreme" as const,
        villageCount: 5,
        initialResources: { food: 20, wood: 15, ore: 10 },
        autoSave: true,
        autoSaveInterval: 300,
      },
    },
  },
];

/**
 * プリセットを適用
 * @param presetName プリセット名
 * @returns 適用結果
 */
export function applySettingsPreset(
  presetName: string,
): SettingsValidationResult | null {
  const preset = SETTINGS_PRESETS.find((p) => p.name === presetName);
  if (!preset) {
    return null;
  }

  return getGlobalSettingsManager().updateSettings(preset.settings);
}

/**
 * 利用可能なプリセット一覧を取得
 * @returns プリセット一覧
 */
export function getAvailablePresets(): SettingsPreset[] {
  return [...SETTINGS_PRESETS];
}

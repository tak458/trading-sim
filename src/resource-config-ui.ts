/**
 * ResourceConfigUI - 資源設定UI
 * 要件 2.1, 3.1, 6.1 の設定システムのUI実装
 */

import { 
  SupplyDemandConfigManager, 
  getGlobalConfigManager, 
  ConfigValidationResult 
} from './supply-demand-config';
import { SupplyDemandConfig } from './village-economy';

/**
 * 設定UIの状態を管理するインターフェース
 */
interface ConfigUIState {
  isVisible: boolean;
  activeTab: 'population' | 'buildings' | 'balance' | 'storage';
  hasUnsavedChanges: boolean;
  validationResult: ConfigValidationResult | null;
}

/**
 * 資源設定UIクラス
 * 設定値の表示、編集、検証機能を提供
 */
export class ResourceConfigUI {
  private configManager: SupplyDemandConfigManager;
  private container: HTMLElement;
  private state: ConfigUIState;
  private tempConfig: SupplyDemandConfig;

  constructor(container: HTMLElement) {
    this.configManager = getGlobalConfigManager();
    this.container = container;
    this.state = {
      isVisible: false,
      activeTab: 'population',
      hasUnsavedChanges: false,
      validationResult: null
    };
    this.tempConfig = this.configManager.getConfig();
    
    this.initializeUI();
  }

  /**
   * UIを表示
   */
  show(): void {
    this.state.isVisible = true;
    this.tempConfig = this.configManager.getConfig();
    this.state.hasUnsavedChanges = false;
    this.render();
  }

  /**
   * UIを非表示
   */
  hide(): void {
    if (this.state.hasUnsavedChanges) {
      const shouldSave = confirm('未保存の変更があります。保存しますか？');
      if (shouldSave) {
        this.saveConfig();
      }
    }
    this.state.isVisible = false;
    this.render();
  }

  /**
   * UIを初期化
   */
  private initializeUI(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 400px;
      max-height: 600px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 15px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      overflow-y: auto;
      display: none;
    `;
    
    this.render();
  }

  /**
   * UIをレンダリング
   */
  private render(): void {
    if (!this.state.isVisible) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';
    
    const stats = this.configManager.getConfigStats();
    const healthColor = this.getHealthColor(stats.overallHealth);
    
    this.container.innerHTML = `
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #fff;">資源設定</h3>
        <div style="margin-left: auto;">
          <span style="color: ${healthColor};">●</span>
          <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" 
                  style="background: #666; color: white; border: none; padding: 2px 8px; margin-left: 10px; cursor: pointer;">×</button>
        </div>
      </div>
      
      ${this.renderValidationStatus()}
      ${this.renderTabs()}
      ${this.renderActiveTab()}
      ${this.renderActionButtons()}
    `;

    this.attachEventListeners();
  }

  /**
   * 検証状態を表示
   */
  private renderValidationStatus(): string {
    if (!this.state.validationResult) {
      return '';
    }

    const { isValid, errors, warnings } = this.state.validationResult;
    
    if (isValid && warnings.length === 0) {
      return '<div style="color: #4CAF50; margin-bottom: 10px;">✓ 設定は有効です</div>';
    }

    let html = '';
    
    if (errors.length > 0) {
      html += '<div style="color: #f44336; margin-bottom: 10px;">';
      html += '<strong>エラー:</strong><br>';
      errors.forEach(error => {
        html += `• ${error.field}: ${error.message}<br>`;
      });
      html += '</div>';
    }

    if (warnings.length > 0) {
      html += '<div style="color: #ff9800; margin-bottom: 10px;">';
      html += '<strong>警告:</strong><br>';
      warnings.forEach(warning => {
        html += `• ${warning.field}: ${warning.message}<br>`;
      });
      html += '</div>';
    }

    return html;
  }

  /**
   * タブを表示
   */
  private renderTabs(): string {
    const tabs = [
      { id: 'population', label: '人口' },
      { id: 'buildings', label: '建物' },
      { id: 'balance', label: '需給' },
      { id: 'storage', label: 'ストック' }
    ];

    return `
      <div style="display: flex; margin-bottom: 15px; border-bottom: 1px solid #444;">
        ${tabs.map(tab => `
          <button class="config-tab" data-tab="${tab.id}" 
                  style="background: ${this.state.activeTab === tab.id ? '#555' : 'transparent'}; 
                         color: white; border: none; padding: 8px 12px; cursor: pointer; 
                         border-bottom: ${this.state.activeTab === tab.id ? '2px solid #4CAF50' : 'none'};">
            ${tab.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * アクティブなタブの内容を表示
   */
  private renderActiveTab(): string {
    switch (this.state.activeTab) {
      case 'population':
        return this.renderPopulationTab();
      case 'buildings':
        return this.renderBuildingsTab();
      case 'balance':
        return this.renderBalanceTab();
      case 'storage':
        return this.renderStorageTab();
      default:
        return '';
    }
  }

  /**
   * 人口タブを表示
   */
  private renderPopulationTab(): string {
    return `
      <div class="config-section">
        <h4>人口関連設定</h4>
        ${this.renderConfigField('foodConsumptionPerPerson', '食料消費量/人')}
        ${this.renderConfigField('populationGrowthRate', '人口増加率')}
        ${this.renderConfigField('populationDeclineRate', '人口減少率')}
      </div>
    `;
  }

  /**
   * 建物タブを表示
   */
  private renderBuildingsTab(): string {
    return `
      <div class="config-section">
        <h4>建物関連設定</h4>
        ${this.renderConfigField('buildingsPerPopulation', '建物数/人口')}
        ${this.renderConfigField('buildingWoodCost', '木材コスト/建物')}
        ${this.renderConfigField('buildingOreCost', '鉱石コスト/建物')}
      </div>
    `;
  }

  /**
   * 需給バランスタブを表示
   */
  private renderBalanceTab(): string {
    return `
      <div class="config-section">
        <h4>需給バランス閾値</h4>
        ${this.renderConfigField('surplusThreshold', '余剰閾値')}
        ${this.renderConfigField('shortageThreshold', '不足閾値')}
        ${this.renderConfigField('criticalThreshold', '危機閾値')}
      </div>
    `;
  }

  /**
   * ストレージタブを表示
   */
  private renderStorageTab(): string {
    return `
      <div class="config-section">
        <h4>ストレージ設定</h4>
        ${this.renderConfigField('baseStorageCapacity', '基本容量')}
        ${this.renderConfigField('storageCapacityPerBuilding', '建物あたり容量')}
      </div>
    `;
  }

  /**
   * 設定フィールドを表示
   */
  private renderConfigField(field: keyof SupplyDemandConfig, label: string): string {
    const value = this.tempConfig[field];
    const range = this.configManager.getRecommendedRange(field);
    const description = this.configManager.getConfigDescription(field);
    
    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">${label}</label>
        <input type="number" 
               class="config-input" 
               data-field="${field}"
               value="${value}" 
               min="${range.min}" 
               max="${range.max}"
               step="0.001"
               style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 3px;">
        <div style="font-size: 10px; color: #aaa; margin-top: 3px;">
          範囲: ${range.min} - ${range.max}
          ${range.recommended ? ` (推奨: ${range.recommended.min} - ${range.recommended.max})` : ''}
        </div>
        <div style="font-size: 10px; color: #ccc; margin-top: 3px;">${description}</div>
      </div>
    `;
  }

  /**
   * アクションボタンを表示
   */
  private renderActionButtons(): string {
    return `
      <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #444;">
        <button class="save-config" 
                style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; flex: 1;">
          保存
        </button>
        <button class="reset-config" 
                style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; flex: 1;">
          リセット
        </button>
        <button class="validate-config" 
                style="background: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; flex: 1;">
          検証
        </button>
      </div>
    `;
  }

  /**
   * イベントリスナーを設定
   */
  private attachEventListeners(): void {
    // タブ切り替え
    this.container.querySelectorAll('.config-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        this.state.activeTab = target.dataset.tab as any;
        this.render();
      });
    });

    // 設定値変更
    this.container.querySelectorAll('.config-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const field = target.dataset.field as keyof SupplyDemandConfig;
        const value = parseFloat(target.value);
        
        if (!isNaN(value)) {
          this.tempConfig[field] = value;
          this.state.hasUnsavedChanges = true;
          this.validateCurrentConfig();
        }
      });
    });

    // 保存ボタン
    const saveButton = this.container.querySelector('.save-config');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveConfig());
    }

    // リセットボタン
    const resetButton = this.container.querySelector('.reset-config');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetConfig());
    }

    // 検証ボタン
    const validateButton = this.container.querySelector('.validate-config');
    if (validateButton) {
      validateButton.addEventListener('click', () => this.validateCurrentConfig());
    }
  }

  /**
   * 設定を保存
   */
  private saveConfig(): void {
    const result = this.configManager.updateConfig(this.tempConfig);
    this.state.validationResult = result;
    this.state.hasUnsavedChanges = false;
    
    if (result.isValid) {
      console.log('設定が保存されました');
    } else {
      console.warn('設定にエラーがありましたが修正して保存しました');
      this.tempConfig = this.configManager.getConfig();
    }
    
    this.render();
  }

  /**
   * 設定をリセット
   */
  private resetConfig(): void {
    if (confirm('設定をデフォルト値にリセットしますか？')) {
      this.configManager.resetToDefaults();
      this.tempConfig = this.configManager.getConfig();
      this.state.hasUnsavedChanges = false;
      this.state.validationResult = null;
      this.render();
    }
  }

  /**
   * 現在の設定を検証
   */
  private validateCurrentConfig(): void {
    this.state.validationResult = this.configManager.validateConfig(this.tempConfig);
    this.render();
  }

  /**
   * 健康状態の色を取得
   */
  private getHealthColor(health: string): string {
    switch (health) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#666';
    }
  }

  /**
   * 現在の設定統計を取得
   */
  getConfigStats(): {
    totalFields: number;
    validFields: number;
    warningFields: number;
    errorFields: number;
    overallHealth: string;
  } {
    return this.configManager.getConfigStats();
  }

  /**
   * UIの表示状態を取得
   */
  isVisible(): boolean {
    return this.state.isVisible;
  }

  /**
   * 未保存の変更があるかチェック
   */
  hasUnsavedChanges(): boolean {
    return this.state.hasUnsavedChanges;
  }
}
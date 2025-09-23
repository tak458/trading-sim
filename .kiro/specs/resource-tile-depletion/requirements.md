# Requirements Document

## Introduction

この機能は、村が資源を採取する際にタイルの資源が徐々に枯渇し、時間の経過とともに回復するシステムを実装します。現在のシステムでは資源は無限に採取できますが、この機能により資源管理がより戦略的になり、村の配置や交易の重要性が高まります。

## Requirements

### Requirement 1

**User Story:** プレイヤーとして、村が資源を採取する際にタイルの資源量が減少することで、資源の有限性を感じたい

#### Acceptance Criteria

1. WHEN 村が資源タイルから採取を行う THEN そのタイルの資源量は採取量分減少する SHALL
2. WHEN タイルの資源量が0になる THEN そのタイルからは資源を採取できなくなる SHALL
3. WHEN 村が資源を採取する THEN 採取量はタイルの現在の資源量を超えない SHALL
4. IF タイルの資源量が採取要求量より少ない THEN 利用可能な分だけ採取される SHALL

### Requirement 2

**User Story:** プレイヤーとして、枯渇したタイルが時間の経過とともに回復することで、長期的な資源管理戦略を立てたい

#### Acceptance Criteria

1. WHEN 一定時間が経過する THEN 枯渇していないタイルの資源量は徐々に回復する SHALL
2. WHEN タイルが完全に枯渇している THEN より長い時間をかけて回復を開始する SHALL
3. WHEN タイルが回復する THEN 元の最大資源量を超えることはない SHALL
4. IF タイルタイプが異なる THEN 回復速度も異なる SHALL（森林は木材回復が早い、山は鉱石回復が早いなど）

### Requirement 3

**User Story:** プレイヤーとして、タイルの資源状態を視覚的に確認できることで、採取戦略を立てたい

#### Acceptance Criteria

1. WHEN タイルの資源量が変化する THEN 視覚的な表現も更新される SHALL
2. WHEN タイルが枯渇に近づく THEN 色や透明度で状態が分かる SHALL
3. WHEN タイルが完全に枯渇する THEN 明確に区別できる表示になる SHALL
4. IF プレイヤーが詳細情報を要求する THEN タイルの正確な資源量が表示される SHALL

### Requirement 4

**User Story:** プレイヤーとして、村の採取効率が資源の枯渇状況に応じて調整されることで、現実的な資源管理を体験したい

#### Acceptance Criteria

1. WHEN 村の収集範囲内の資源が豊富である THEN 通常の採取効率で資源を得る SHALL
2. WHEN 村の収集範囲内の資源が枯渇気味である THEN 採取効率が低下する SHALL
3. WHEN 村の収集範囲内のすべての資源が枯渇する THEN その村の成長が停滞する SHALL
4. IF 村が複数の資源タイプにアクセスできる THEN 利用可能な資源から優先的に採取する SHALL

### Requirement 5

**User Story:** 神（プレイヤー）として、土地の資源量を直接調整することで、村の発展を導きたい

#### Acceptance Criteria

1. WHEN 神がタイルをクリックまたは選択する THEN そのタイルの資源量を増加または減少させることができる SHALL
2. WHEN 神が資源量を調整する THEN 調整後の値は0から最大値の範囲内に制限される SHALL
3. WHEN 神が枯渇したタイルに資源を追加する THEN そのタイルは即座に採取可能になる SHALL
4. IF 神が資源量を0に設定する THEN そのタイルは完全に枯渇状態になる SHALL

### Requirement 6

**User Story:** 神（プレイヤー）として、資源の枯渇と回復のバランスが調整可能であることで、シミュレーションの難易度を調整したい

#### Acceptance Criteria

1. WHEN ゲーム設定で枯渇速度を変更する THEN 資源の減少率が調整される SHALL
2. WHEN ゲーム設定で回復速度を変更する THEN 資源の回復率が調整される SHALL
3. WHEN ゲーム設定で最大資源量を変更する THEN タイルの初期・最大資源量が調整される SHALL
4. IF 設定値が無効な範囲である THEN デフォルト値が使用される SHALL
# 技術スタック & ビルドシステム

## コア技術
- **TypeScript** - 厳密な型チェックを有効にしたメイン言語
- **Vite** - ビルドツールと開発サーバー
- **Phaser 3** - グラフィックスとレンダリング用ゲームエンジン
- **Vitest** - jsdom環境でのテストフレームワーク
- **Biome** - コードフォーマットとリンティング（ESLint/Prettierの代替）

## 主要ライブラリ
- **delaunator** - 村間の道路生成用Delaunay三角分割
- **simplex-noise** - 地形用プロシージャルノイズ生成
- **jsdom** - テスト用DOM シミュレーション

## モジュール解決
- **ベースURL**: プロジェクトルート（`.`）
- **パスエイリアス**: `@/*` が `src/*` にマップ
- **ESモジュール**: package.jsonで `"type": "module"` の完全ESMセットアップ

## デプロイメント
- **GitHub Pages** - 本番環境
- **ベースパス**: `/trading-sim/` (vite.config.tsで設定)

## 開発環境
- **Node.js** - JavaScript ランタイム
- **npm** - パッケージマネージャー
- **Windows** - 開発プラットフォーム
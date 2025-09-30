// テスト環境のセットアップ
import { vi } from 'vitest'

// Phaserのモック（必要に応じて）
(globalThis as any).Phaser = {
  Game: vi.fn(),
  Scene: vi.fn(),
  AUTO: 'AUTO'
} as any
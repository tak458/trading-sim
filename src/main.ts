import Phaser from "phaser";
import { generateMap, Tile } from "./map";
import { Village, createVillages, updateVillages } from "./village";
import { buildRoads, updateRoads, Road } from "./trade";

const TILE_SIZE = 8;
const MAP_SIZE = 64;

class MainScene extends Phaser.Scene {
  map: Tile[][] = [];
  villages: Village[] = [];
  roads: Road[] = [];
  villageTexts: Phaser.GameObjects.Text[] = [];
  showCollectionRanges: boolean = false;
  collectionRangeGraphics?: Phaser.GameObjects.Graphics;

  preload() { }

  create() {
    // マップ生成
    this.map = generateMap(MAP_SIZE);

    // 村生成
    this.villages = createVillages(this.map, 6);

    // 道生成 (最近傍 + ブレゼンハム直線)
    this.roads = buildRoads(this.map, this.villages);

    this.renderMap();
    this.renderCollectionRanges();

    // 村ストック表示用テキスト（マップ描画後に作成）
    this.villageTexts = this.villages.map((v) => {
      const initialText = `Pop:${v.population}\nF:${v.storage.food} W:${v.storage.wood} O:${v.storage.ore}`;

      const textObj = this.add.text(
        v.x * TILE_SIZE + TILE_SIZE / 2,
        v.y * TILE_SIZE - 5,
        initialText,
        {
          fontSize: "12px",
          fontFamily: "Arial",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 4, y: 2 }
        }
      );

      textObj.setOrigin(0.5, 1);
      textObj.setDepth(100);

      return textObj;
    });

    // タイトル表示
    this.add.text(10, 10, "Trading Simulation", {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    // 操作説明
    this.add.text(10, 35, "Press 'R' to toggle collection ranges", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    // 収集範囲描画用グラフィックス
    this.collectionRangeGraphics = this.add.graphics();
    this.collectionRangeGraphics.setDepth(50); // 村より下、地形より上

    // キーボード入力設定
    this.input.keyboard?.on('keydown-R', () => {
      this.showCollectionRanges = !this.showCollectionRanges;
      this.renderCollectionRanges();
    });
  }

  update() {
    updateVillages(this.map, this.villages, this.roads);
    updateRoads(this.roads);

    // 村ストックを更新
    this.villages.forEach((v, i) => {
      if (this.villageTexts[i]) {
        const text = `Pop:${v.population}\nF:${v.storage.food} W:${v.storage.wood} O:${v.storage.ore}`;
        this.villageTexts[i].setText(text);
      }
    });

    // 収集範囲を更新（村が成長した場合）
    if (this.showCollectionRanges) {
      this.renderCollectionRanges();
    }
  }

  renderMap() {
    const g = this.add.graphics();

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const t = this.map[y][x];
        let color = 0x228b22; // 草地
        if (t.height < 0.3) color = 0x1e90ff; // 海
        else if (t.height > 0.7) color = 0x8b4513; // 山

        g.fillStyle(color).fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // 道
    this.roads.forEach(road => {
      if (road.path.length === 0) return;

      const color = road.usage > 5 ? 0xffd700 : 0xaaaaaa;
      g.lineStyle(2, color, 1.0);
      g.beginPath();
      g.moveTo(road.path[0].x * TILE_SIZE + TILE_SIZE / 2, road.path[0].y * TILE_SIZE + TILE_SIZE / 2);
      road.path.forEach(p => g.lineTo(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2));
      g.strokePath();
    });

    // 村
    this.villages.forEach(v => {
      g.fillStyle(0xff0000).fillCircle(
        v.x * TILE_SIZE + TILE_SIZE / 2,
        v.y * TILE_SIZE + TILE_SIZE / 2,
        6
      );
    });
  }

  renderCollectionRanges() {
    if (!this.collectionRangeGraphics) return;
    
    this.collectionRangeGraphics.clear();
    
    if (this.showCollectionRanges) {
      this.villages.forEach(village => {
        const centerX = village.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = village.y * TILE_SIZE + TILE_SIZE / 2;
        const radius = village.collectionRadius * TILE_SIZE;
        
        // 半透明の円で収集範囲を表示
        this.collectionRangeGraphics!.fillStyle(0x00ff00, 0.2); // 緑色、透明度20%
        this.collectionRangeGraphics!.fillCircle(centerX, centerY, radius);
        
        // 境界線を描画
        this.collectionRangeGraphics!.lineStyle(2, 0x00ff00, 0.8); // 緑色、透明度80%
        this.collectionRangeGraphics!.strokeCircle(centerX, centerY, radius);
      });
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: MAP_SIZE * TILE_SIZE,
  height: MAP_SIZE * TILE_SIZE,
  scene: MainScene,
});

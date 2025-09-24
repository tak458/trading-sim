import Phaser from "phaser";
import { UIScene } from "./ui-scene";
import { MapScene } from "./map-scene";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: [MapScene, UIScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  backgroundColor: '#2c3e50'
});
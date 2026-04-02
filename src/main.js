import Phaser from "phaser";
import { SpinePlugin } from "@esotericsoftware/spine-phaser-v4";
import { inject } from "@vercel/analytics";
import BootScene from "./scenes/BootScene";
import GameScene from "./scenes/GameScene";
import EndScene from "./scenes/EndScene";
/**vercel analytics */
inject();

/** Portrait 9:16 — same aspect as Variant games (e.g. 720×1280). */
const VIEW_W = 720;
const VIEW_H = 1280;

const config = {
  type: Phaser.WEBGL,
  parent: "app",
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: "#1b1f34",
  scene: [BootScene, GameScene, EndScene],
  plugins: {
    scene: [{ key: "SpinePlugin", plugin: SpinePlugin, mapping: "spine" }],
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);

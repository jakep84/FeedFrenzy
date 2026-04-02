import Phaser from "phaser";
import { SpinePlugin } from "@esotericsoftware/spine-phaser-v4";

const VIEW_W = 720;
const VIEW_H = 1280;

const ANIMATIONS = [
  "Idle",
  "Walk",
  "Run",
  "Jump",
  "JumpInPlace",
  "Facepalm",
  "Cringe",
  "Deadpan",
  "LaughingGrin",
  "MoneyEyes",
  "VictoryJump",
  "Shrug",
  "Surprise",
  "Point",
  "Point2",
  "PointDouble",
  "MindBlown",
  "VillainGrin",
  "HandsOnHips",
  "Thinking",
  "thinking",
  "Wave",
  "Dance",
  "Dance2",
  "Strut",
  "Moonwalk",
  "DramaticCollapse",
  "Faint",
  "KnockOver",
  "LightHit",
  "HardHit",
];

class AnimationTestScene extends Phaser.Scene {
  constructor() {
    super({ key: "AnimationTestScene" });
    this.hero = null;
    this.animIndex = 0;
    this.loop = false;
    this.nameText = null;
    this.statusText = null;
    this.helpText = null;
  }

  preload() {
    this.load.spineJson("man", "/spine/man/skeleton.json");
    this.load.spineAtlas("manAtlas", "/spine/man/skeleton.atlas", true);
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#11162b");

    this.add
      .rectangle(width * 0.5, height * 0.5, width, height, 0x11162b)
      .setDepth(-20);
    this.add
      .rectangle(
        width * 0.5,
        height * 0.55,
        width - 80,
        height - 260,
        0x1a2140,
        0.55,
      )
      .setDepth(-19);

    this.add
      .text(width * 0.5, 40, "SPINE ANIMATION TESTER", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.nameText = this.add
      .text(width * 0.5, 92, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        color: "#8dffb0",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width * 0.5, 130, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#aab6ea",
        align: "center",
      })
      .setOrigin(0.5);

    this.helpText = this.add
      .text(
        width * 0.5,
        height - 34,
        "Left/Right = change • Space = replay • L = loop on/off",
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          color: "#aab6ea",
          align: "center",
        },
      )
      .setOrigin(0.5, 1);

    this.hero = this.add.spine(width * 0.5, height * 0.73, "man", "manAtlas");
    this.hero.setDepth(10);
    this.hero.setScale(0.34);
    this.hero.animationState.data.defaultMix = 0.12;
    this.hero.skeleton.scaleX = Math.abs(this.hero.skeleton.scaleX);

    this.input.keyboard?.on("keydown-RIGHT", () => {
      this.animIndex = (this.animIndex + 1) % ANIMATIONS.length;
      this.playCurrentAnimation();
    });

    this.input.keyboard?.on("keydown-LEFT", () => {
      this.animIndex =
        (this.animIndex - 1 + ANIMATIONS.length) % ANIMATIONS.length;
      this.playCurrentAnimation();
    });

    this.input.keyboard?.on("keydown-SPACE", () => {
      this.playCurrentAnimation();
    });

    this.input.keyboard?.on("keydown-L", () => {
      this.loop = !this.loop;
      this.playCurrentAnimation();
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.x > width * 0.5) {
        this.animIndex = (this.animIndex + 1) % ANIMATIONS.length;
      } else {
        this.animIndex =
          (this.animIndex - 1 + ANIMATIONS.length) % ANIMATIONS.length;
      }
      this.playCurrentAnimation();
    });

    this.playCurrentAnimation();
  }

  playCurrentAnimation() {
    const name = ANIMATIONS[this.animIndex];

    this.nameText.setText(name);
    this.statusText.setText(
      `Animation ${this.animIndex + 1}/${ANIMATIONS.length} • loop: ${this.loop ? "ON" : "OFF"}`,
    );

    try {
      this.hero.animationState.setAnimation(0, name, this.loop);
    } catch (err) {
      this.nameText.setText(`${name} (FAILED)`);
      this.statusText.setText(String(err));
      console.error("Animation failed:", name, err);
    }
  }
}

const config = {
  type: Phaser.WEBGL,
  parent: "app",
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: "#11162b",
  scene: [AnimationTestScene],
  plugins: {
    scene: [{ key: "SpinePlugin", plugin: SpinePlugin, mapping: "spine" }],
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);

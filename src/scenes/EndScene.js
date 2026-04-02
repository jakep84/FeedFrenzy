import Phaser from "phaser";

const PANEL_W = 520;
const BUTTON_W = 320;
const BUTTON_H = 74;

export default class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: "EndScene" });

    this.restartHandler = null;
    this.replayButton = null;
    this.hero = null;
    this.moonwalkTween = null;
  }

  preload() {
    if (!this.cache.json.exists("man")) {
      this.load.spineJson("man", "/spine/man/skeleton.json");
    }

    if (!this.cache.text.exists("manAtlas")) {
      this.load.spineAtlas("manAtlas", "/spine/man/skeleton.atlas", true);
    }
  }

  create(data) {
    const { width, height } = this.scale;
    const score = Math.floor(data?.score ?? 0);
    const rank = data?.rank ?? this.getRunRank(score);
    const anim = data?.animation ?? "Dance";

    this.cameras.main.setBackgroundColor("#09101f");

    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x09101f, 1);

    this.add
      .rectangle(
        width * 0.5,
        height * 0.55,
        PANEL_W,
        height - 240,
        0x0e1730,
        0.94,
      )
      .setStrokeStyle(3, 0x8aa0ff, 0.25);

    this.add
      .text(width * 0.5, 110, "RUN OVER", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "54px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, 192, `Score: ${score}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "34px",
        color: "#8dffb0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, 258, rank, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "26px",
        color: "#d6ddff",
      })
      .setOrigin(0.5);

    this.createHero(anim, width, height);
    this.createReplayButton(width, height);

    this.restartHandler = () => {
      this.restartGame();
    };

    this.input.keyboard?.on("keydown-R", this.restartHandler);

    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);
  }

  createHero(anim, width, height) {
    this.hero = this.add.spine(width * 0.5, height * 0.63, "man", "manAtlas");
    this.hero.setDepth(10);
    this.hero.setScale(0.32);
    this.hero.animationState.data.defaultMix = 0.12;

    if (anim === "Moonwalk") {
      this.hero.x = width + 40;
      this.hero.y = height * 0.67;

      // Face left while traveling left so the moonwalk reads correctly.
      this.hero.skeleton.scaleX = -Math.abs(this.hero.skeleton.scaleX);
      this.hero.animationState.setAnimation(0, "Moonwalk", true);

      this.moonwalkTween = this.tweens.add({
        targets: this.hero,
        x: width * 0.28,
        duration: 2400,
        ease: "Sine.InOut",
      });

      return;
    }

    this.hero.skeleton.scaleX = Math.abs(this.hero.skeleton.scaleX);
    this.hero.animationState.setAnimation(0, anim, anim === "Dance");

    if (anim === "DramaticCollapse") {
      this.hero.animationState.addAnimation(0, "Walk", true, 0);
    }
  }

  createReplayButton(width, height) {
    this.replayButton = this.add
      .rectangle(width * 0.5, height - 152, BUTTON_W, BUTTON_H, 0x6f7cff, 1)
      .setStrokeStyle(3, 0xffffff, 0.2)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width * 0.5, height - 152, "Play Again", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height - 78, "Tap button or press R", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#9aa7d8",
      })
      .setOrigin(0.5);

    this.replayButton.on("pointerup", this.restartGame, this);
  }

  restartGame() {
    if (!this.scene.isActive()) return;
    this.scene.start("GameScene");
  }

  cleanup() {
    if (this.restartHandler) {
      this.input.keyboard?.off("keydown-R", this.restartHandler);
      this.restartHandler = null;
    }

    if (this.replayButton) {
      this.replayButton.off("pointerup", this.restartGame, this);
      this.replayButton.removeInteractive();
      this.replayButton = null;
    }

    if (this.moonwalkTween) {
      this.moonwalkTween.stop();
      this.moonwalkTween = null;
    }

    this.hero = null;
  }

  getRunRank(score) {
    if (score >= 420) return "Main Character Energy";
    if (score >= 320) return "Certified Feed Survivor";
    if (score >= 220) return "Clout Goblin";
    if (score >= 140) return "Too Online";
    return "Scroll Damage";
  }
}

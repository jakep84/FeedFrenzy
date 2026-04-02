import Phaser from "phaser";
import { RULES } from "../data/rules";

const ANIM_IDLE = "Walk";
const ANIM_WALK = "Walk";
const ANIM_JUMP = "Jump";
const ANIM_BAD_HIT = "KnockOver";
const ANIM_REWARD = "Dance";
const ANIM_JACKPOT = "MoneyEyes";

const GAME_DURATION = 60;
const PLAYER_RADIUS = 48;
const PLAYER_RADIUS_SQ = PLAYER_RADIUS * PLAYER_RADIUS;
const BASE_PLAYER_SCALE = 0.28;
const MIN_PLAYER_SCALE = 0.22;
const MAX_PLAYER_SCALE = 0.38;
const PLAYFIELD_W = 500;

const MAX_ORBS = 48;
const FLOATING_TEXT_POOL_SIZE = 12;

const SMALL_POP_COOLDOWN_MS = 140;
const REACTION_COOLDOWN_MS = 180;
const SCORE_FLASH_DURATION_MS = 120;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });

    this.hero = null;
    this.currentAnim = "";
    this.gameEnded = false;
    this.gameStarted = false;
    this.introOverlay = null;
    this.hitAnimLocked = false;
    this.rewardAnimLocked = false;

    this.player = {
      x: 360,
      y: 920,
      vx: 0,
      vy: 0,
      maxSpeed: 420,
      accel: 2400,
      drag: 1800,
    };

    this.moveInput = { x: 0, y: 0 };
    this.touchInput = { x: 0, y: 0 };

    this.touchState = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    };

    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.elapsed = 0;
    this.finalTenTriggered = false;

    this.ruleIndex = 0;
    this.currentRule = RULES[0];
    this.ruleTimeLeft = RULES[0].duration;

    this.objects = [];
    this.orbPool = [];
    this.spawnAccumulator = 0;
    this.spawnBaseInterval = 0.72;

    this.floatingTextPool = [];
    this.floatingTextPoolIndex = 0;

    this.touchGrassZone = null;
    this.touchGrassGraphics = null;
    this.insideGrass = false;
    this.touchGrassMoveTimer = 0;
    this.touchGrassTarget = null;
    this.touchGrassRetargetInterval = 1.2;
    this.touchGrassMoveSpeed = 90;
    this.touchGrassProgressAccumulator = 0;
    this.touchGrassHintText = null;
    this.wasInsideGrass = false;

    this.playerScale = BASE_PLAYER_SCALE;

    this.lastTimerDisplay = null;
    this.lastScoreDisplay = null;
    this.lastTipDisplay = null;
    this.lastRuleLabel = null;
    this.lastTimerUrgent = false;

    this.nextSmallPopAt = 0;
    this.nextReactionAt = 0;
    this.scoreFlashEvent = null;
  }

  create() {
    const { width, height } = this.scale;

    this.resetState(width, height);
    this.cameras.main.setBackgroundColor("#0f1430");

    this.createBackground();
    this.createHud();
    this.createTouchUi();
    this.createPools();

    this.hero = this.add.spine(this.player.x, this.player.y, "man", "manAtlas");
    this.hero.setDepth(20);
    this.hero.setScale(this.playerScale);
    this.hero.animationState.data.defaultMix = 0.12;
    this.hero.skeleton.scaleX = Math.abs(this.hero.skeleton.scaleX);
    this.playHeroAnimation(ANIM_IDLE, true);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("pointerupoutside", this.onPointerUp, this);

    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.gameEnded) return;
      if (!this.gameStarted) {
        this.startGame();
        return;
      }
      this.smallPop();
    });

    this.input.keyboard?.on("keydown-ENTER", () => {
      if (!this.gameStarted && !this.gameEnded) {
        this.startGame();
      }
    });

    this.applyRule(0);
    this.updateHud(true);
    this.createIntroOverlay();
  }

  resetState(width, height) {
    this.gameEnded = false;
    this.gameStarted = false;
    this.currentAnim = "";
    this.hitAnimLocked = false;
    this.rewardAnimLocked = false;

    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.elapsed = 0;
    this.finalTenTriggered = false;

    this.player.x = width * 0.5;
    this.player.y = height * 0.73;
    this.player.vx = 0;
    this.player.vy = 0;

    this.ruleIndex = 0;
    this.currentRule = RULES[0];
    this.ruleTimeLeft = RULES[0].duration;

    this.spawnAccumulator = 0;
    this.touchGrassZone = null;
    this.touchGrassGraphics = null;
    this.insideGrass = false;
    this.touchGrassMoveTimer = 0;
    this.touchGrassTarget = null;
    this.touchGrassProgressAccumulator = 0;
    this.wasInsideGrass = false;

    this.playerScale = BASE_PLAYER_SCALE;

    this.moveInput = { x: 0, y: 0 };
    this.touchInput = { x: 0, y: 0 };
    this.touchState = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    };

    this.lastTimerDisplay = null;
    this.lastScoreDisplay = null;
    this.lastTipDisplay = null;
    this.lastRuleLabel = null;
    this.lastTimerUrgent = false;

    this.nextSmallPopAt = 0;
    this.nextReactionAt = 0;

    if (this.scoreFlashEvent) {
      this.scoreFlashEvent.remove(false);
      this.scoreFlashEvent = null;
    }

    if (this.objects?.length) {
      for (let i = this.objects.length - 1; i >= 0; i -= 1) {
        this.releaseOrb(this.objects[i]);
      }
    }
    this.objects = [];

    if (this.floatingTextPool?.length) {
      for (let i = 0; i < this.floatingTextPool.length; i += 1) {
        const popup = this.floatingTextPool[i];
        popup.setVisible(false);
        popup.setAlpha(0);
        popup.active = false;
      }
    }
  }

  createBackground() {
    const { width, height } = this.scale;
    const panelX = width * 0.5;
    const panelW = PLAYFIELD_W;

    this.add
      .rectangle(width * 0.5, height * 0.5, width, height, 0x0f1430)
      .setDepth(-60);

    this.add
      .rectangle(
        width * 0.16,
        height * 0.5,
        width * 0.32,
        height,
        0x0a1026,
        0.75,
      )
      .setDepth(-59);

    this.add
      .rectangle(
        width * 0.84,
        height * 0.5,
        width * 0.32,
        height,
        0x0a1026,
        0.75,
      )
      .setDepth(-59);

    this.bgPanelShadow = this.add
      .rectangle(
        panelX,
        height * 0.54,
        panelW + 22,
        height - 215,
        0x050914,
        0.35,
      )
      .setDepth(-55);

    this.bgPanel = this.add
      .rectangle(panelX, height * 0.54, panelW, height - 230, 0x152043, 0.82)
      .setStrokeStyle(2, 0x2a3f72, 0.6)
      .setDepth(-50);

    this.bgGlow = this.add
      .rectangle(
        panelX,
        height * 0.54,
        panelW - 26,
        height - 265,
        0x67c8ff,
        0.05,
      )
      .setDepth(-49);

    for (let i = 0; i < 14; i += 1) {
      const x = Phaser.Math.Between(
        panelX - panelW / 2 + 28,
        panelX + panelW / 2 - 28,
      );
      const y = Phaser.Math.Between(130, height - 150);
      const size = Phaser.Math.Between(6, 16);
      const alpha = Phaser.Math.FloatBetween(0.04, 0.11);
      this.add.circle(x, y, size, 0xffffff, alpha).setDepth(-45);
    }

    this.titleText = this.add
      .text(width * 0.5, 84, "FEED FRENZY", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "34px",
        color: "#f4f7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.controlsText = this.add
      .text(width * 0.5, 116, "WASD on desktop • drag on mobile", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#8fa0d7",
      })
      .setOrigin(0.5)
      .setDepth(50);
  }

  createHud() {
    const { width } = this.scale;

    this.timerText = this.add
      .text(42, 34, "60", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setDepth(60);

    this.scoreText = this.add
      .text(width - 42, 34, "0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(60);

    this.ruleBannerBg = this.add
      .rectangle(width * 0.5, 190, 468, 72, 0x101425, 0.88)
      .setStrokeStyle(3, 0x7b8cff, 0.95)
      .setDepth(60);

    this.ruleText = this.add
      .text(width * 0.5, 178, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "31px",
        color: "#f5f7ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(61);

    this.tipText = this.add
      .text(width * 0.5, 214, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: "#aab6ea",
      })
      .setOrigin(0.5)
      .setDepth(61);

    this.finalTenText = this.add
      .text(width * 0.5, 266, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        color: "#ff8c98",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(65);

    this.touchGrassHintText = this.add
      .text(width * 0.5, 302, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#8dffb0",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(65);
  }

  createTouchUi() {
    const { height } = this.scale;

    this.joystickBase = this.add
      .circle(110, height - 120, 70, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.14)
      .setDepth(70)
      .setVisible(false);

    this.joystickThumb = this.add
      .circle(110, height - 120, 34, 0xffffff, 0.18)
      .setStrokeStyle(2, 0xffffff, 0.22)
      .setDepth(71)
      .setVisible(false);
  }

  createPools() {
    this.orbPool = [];
    this.objects = [];

    for (let i = 0; i < MAX_ORBS; i += 1) {
      const orb = this.add.circle(0, 0, 10, 0xffffff, 1);
      orb.setStrokeStyle(3, 0xffffff, 0.2);
      orb.setDepth(10);
      orb.setVisible(false);
      orb.active = false;
      this.orbPool.push({
        display: orb,
        active: false,
        type: "blue",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 22,
        radiusSq: 22 * 22,
      });
    }

    this.floatingTextPool = [];
    for (let i = 0; i < FLOATING_TEXT_POOL_SIZE; i += 1) {
      const popup = this.add
        .text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "28px",
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#101425",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(90)
        .setVisible(false)
        .setAlpha(0);

      popup.active = false;
      this.floatingTextPool.push(popup);
    }
  }

  createIntroOverlay() {
    const { width, height } = this.scale;

    this.introOverlay = this.add.container(0, 0).setDepth(200);

    const shade = this.add.rectangle(
      width * 0.5,
      height * 0.5,
      width,
      height,
      0x07101e,
      0.66,
    );

    const panel = this.add
      .rectangle(width * 0.5, height * 0.56, 520, 470, 0x0e1730, 0.96)
      .setStrokeStyle(3, this.currentRule.bannerStroke, 0.95);

    const title = this.add
      .text(width * 0.5, height * 0.36, "FEED FRENZY", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width * 0.5, height * 0.42, "Survive the remix for 60 seconds", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#a9b8eb",
      })
      .setOrigin(0.5);

    const body = this.add
      .text(
        width * 0.5,
        height * 0.53,
        [
          "• Collect blue, avoid red",
          "• Rules change every few seconds",
          "• WASD on desktop",
          "• Drag anywhere on mobile",
        ],
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "24px",
          color: "#eef3ff",
          align: "center",
          lineSpacing: 16,
        },
      )
      .setOrigin(0.5);

    const ctaBox = this.add
      .rectangle(
        width * 0.5,
        height * 0.68,
        340,
        74,
        this.currentRule.bannerStroke,
        1,
      )
      .setStrokeStyle(3, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    const cta = this.add
      .text(width * 0.5, height * 0.68, "Tap or Press Space", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(width * 0.5, height * 0.77, this.currentRule.subtitle, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#8dffb0",
      })
      .setOrigin(0.5);

    ctaBox.on("pointerup", () => this.startGame());

    this.introOverlay.add([
      shade,
      panel,
      title,
      subtitle,
      body,
      ctaBox,
      cta,
      hint,
    ]);
  }

  startGame() {
    if (this.gameStarted) return;

    this.gameStarted = true;

    if (this.introOverlay) {
      this.tweens.add({
        targets: this.introOverlay,
        alpha: 0,
        duration: 180,
        onComplete: () => {
          this.introOverlay.destroy();
          this.introOverlay = null;
        },
      });
    }

    this.cameras.main.flash(120, 255, 255, 255, false);
  }

  onPointerDown(pointer) {
    if (this.gameEnded) return;

    if (!this.gameStarted) {
      this.startGame();
      return;
    }

    this.touchState.active = true;
    this.touchState.pointerId = pointer.id;
    this.touchState.startX = pointer.x;
    this.touchState.startY = pointer.y;
    this.touchState.currentX = pointer.x;
    this.touchState.currentY = pointer.y;

    this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
    this.joystickThumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  onPointerMove(pointer) {
    if (!this.touchState.active || this.touchState.pointerId !== pointer.id) {
      return;
    }

    this.touchState.currentX = pointer.x;
    this.touchState.currentY = pointer.y;
  }

  onPointerUp(pointer) {
    if (!this.touchState.active || this.touchState.pointerId !== pointer.id) {
      return;
    }

    this.touchState.active = false;
    this.touchState.pointerId = null;
    this.touchInput.x = 0;
    this.touchInput.y = 0;

    this.joystickBase.setVisible(false);
    this.joystickThumb.setVisible(false);
  }

  update(_, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;

    if (this.gameEnded) return;

    if (!this.gameStarted) {
      this.hero.y = this.player.y + Math.sin(this.time.now * 0.004) * 4;
      return;
    }

    this.elapsed += dt;
    this.timeLeft = Math.max(0, GAME_DURATION - this.elapsed);
    this.ruleTimeLeft = Math.max(0, this.ruleTimeLeft - dt);

    if (!this.finalTenTriggered && this.timeLeft <= 10) {
      this.triggerFinalTen();
    }

    if (this.ruleTimeLeft <= 0) {
      const nextIndex = Math.min(this.ruleIndex + 1, RULES.length - 1);
      if (nextIndex !== this.ruleIndex) {
        this.applyRule(nextIndex);
      } else {
        this.ruleTimeLeft = 999;
      }
    }

    this.updateInput();
    this.updatePlayer(dt);
    this.updateTouchGrass(dt);
    this.updateSpawning(dt);
    this.updateObjectsAndCollisions(dt);
    this.updateHud();

    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  updateInput() {
    let x = 0;
    let y = 0;

    const leftDown = this.keys?.left?.isDown || this.cursors?.left?.isDown;
    const rightDown = this.keys?.right?.isDown || this.cursors?.right?.isDown;
    const upDown = this.keys?.up?.isDown || this.cursors?.up?.isDown;
    const downDown = this.keys?.down?.isDown || this.cursors?.down?.isDown;

    if (leftDown) x -= 1;
    if (rightDown) x += 1;
    if (upDown) y -= 1;
    if (downDown) y += 1;

    this.moveInput.x = x;
    this.moveInput.y = y;

    if (this.touchState.active) {
      const dx = this.touchState.currentX - this.touchState.startX;
      const dy = this.touchState.currentY - this.touchState.startY;
      const maxDist = 56;
      const dist = Math.hypot(dx, dy);

      if (dist > 10) {
        const clamped = Math.min(dist, maxDist);
        const nx = dx / dist;
        const ny = dy / dist;

        this.touchInput.x = nx * (clamped / maxDist);
        this.touchInput.y = ny * (clamped / maxDist);

        this.joystickThumb.setPosition(
          this.touchState.startX + nx * clamped,
          this.touchState.startY + ny * clamped,
        );
      } else {
        this.touchInput.x = 0;
        this.touchInput.y = 0;
        this.joystickThumb.setPosition(
          this.touchState.startX,
          this.touchState.startY,
        );
      }
    } else {
      this.touchInput.x = 0;
      this.touchInput.y = 0;
    }
  }

  getCombinedInput() {
    let x = this.touchState.active ? this.touchInput.x : this.moveInput.x;
    let y = this.touchState.active ? this.touchInput.y : this.moveInput.y;

    if (this.currentRule.id === "brain-lag") {
      x *= -1;
      y *= -1;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  updatePlayer(dt) {
    const input = this.getCombinedInput();
    const moving = Math.hypot(input.x, input.y) > 0.01;

    const accel = this.player.accel;
    const drag = this.player.drag;
    let maxSpeed = this.player.maxSpeed;

    if (this.currentRule.id === "main-character") maxSpeed += 70;
    if (this.currentRule.id === "gremlin-mode") maxSpeed += 35;

    if (moving) {
      this.player.vx += input.x * accel * dt;
      this.player.vy += input.y * accel * dt;
    } else {
      this.player.vx = this.moveTowards(this.player.vx, 0, drag * dt);
      this.player.vy = this.moveTowards(this.player.vy, 0, drag * dt);
    }

    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.player.vx *= scale;
      this.player.vy *= scale;
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const minX = this.scale.width * 0.5 - PLAYFIELD_W * 0.5 + 40;
    const maxX = this.scale.width * 0.5 + PLAYFIELD_W * 0.5 - 40;
    const minY = 275;
    const maxY = this.scale.height - 92;

    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
    this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);

    this.hero.x = this.player.x;
    this.hero.y = this.player.y;

    if (!this.hitAnimLocked && !this.rewardAnimLocked) {
      if (this.player.vx > 12) {
        this.hero.skeleton.scaleX = Math.abs(this.hero.skeleton.scaleX);
      } else if (this.player.vx < -12) {
        this.hero.skeleton.scaleX = -Math.abs(this.hero.skeleton.scaleX);
      }

      this.applyHeroScale();

      if (moving || speed > 30) {
        this.playHeroAnimation(ANIM_WALK, true);
      } else {
        this.playHeroAnimation(ANIM_IDLE, true);
      }
    }
  }

  moveTowards(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
  }

  updateSpawning(dt) {
    let spawnInterval = this.spawnBaseInterval;

    if (this.currentRule.id === "main-character") spawnInterval = 0.46;
    if (this.currentRule.id === "gremlin-mode") spawnInterval = 0.32;
    if (this.currentRule.id === "touch-grass") spawnInterval = 0.88;

    this.spawnAccumulator += dt;

    while (this.spawnAccumulator >= spawnInterval) {
      this.spawnAccumulator -= spawnInterval;
      this.spawnOrb();
    }
  }

  getPlayfieldBounds() {
    return {
      left: this.scale.width * 0.5 - PLAYFIELD_W * 0.5,
      right: this.scale.width * 0.5 + PLAYFIELD_W * 0.5,
      top: 250,
      bottom: this.scale.height - 20,
    };
  }

  getRandomTravelPath(edge) {
    const bounds = this.getPlayfieldBounds();
    let startX = bounds.left;
    let startY = bounds.top;
    let targetX = bounds.right;
    let targetY = bounds.bottom;

    if (edge === 0) {
      startX = Phaser.Math.Between(bounds.left + 20, bounds.right - 20);
      startY = bounds.top;
      targetX = Phaser.Math.Between(bounds.left + 20, bounds.right - 20);
      targetY = Phaser.Math.Between(bounds.top + 140, bounds.bottom - 20);
    } else if (edge === 1) {
      startX = bounds.right;
      startY = Phaser.Math.Between(bounds.top + 20, bounds.bottom - 20);
      targetX = Phaser.Math.Between(bounds.left + 20, bounds.right - 140);
      targetY = Phaser.Math.Between(bounds.top + 20, bounds.bottom - 20);
    } else if (edge === 2) {
      startX = Phaser.Math.Between(bounds.left + 20, bounds.right - 20);
      startY = bounds.bottom;
      targetX = Phaser.Math.Between(bounds.left + 20, bounds.right - 20);
      targetY = Phaser.Math.Between(bounds.top + 20, bounds.bottom - 140);
    } else {
      startX = bounds.left;
      startY = Phaser.Math.Between(bounds.top + 20, bounds.bottom - 20);
      targetX = Phaser.Math.Between(bounds.left + 140, bounds.right - 20);
      targetY = Phaser.Math.Between(bounds.top + 20, bounds.bottom - 20);
    }

    return { startX, startY, targetX, targetY };
  }

  getOrbFromPool() {
    for (let i = 0; i < this.orbPool.length; i += 1) {
      if (!this.orbPool[i].active) {
        return this.orbPool[i];
      }
    }
    return null;
  }

  spawnOrb() {
    const orb = this.getOrbFromPool();
    if (!orb) return;

    const edge = Phaser.Math.Between(0, 3);
    const path = this.getRandomTravelPath(edge);

    const dx = path.targetX - path.startX;
    const dy = path.targetY - path.startY;
    const len = Math.max(1, Math.hypot(dx, dy));

    let speed = 180 + Phaser.Math.Between(0, 85);
    if (this.currentRule.id === "main-character") speed += 20;
    if (this.currentRule.id === "gremlin-mode") speed += 90;

    const orbType = this.rollOrbType();
    const config = this.getOrbVisualConfig(orbType);

    orb.active = true;
    orb.type = orbType;
    orb.x = path.startX;
    orb.y = path.startY;
    orb.vx = (dx / len) * speed;
    orb.vy = (dy / len) * speed;
    orb.radius = config.radius;
    orb.radiusSq = config.radius * config.radius;

    orb.display.setPosition(path.startX, path.startY);
    orb.display.setRadius(config.radius);
    orb.display.setFillStyle(config.color, config.alpha);
    orb.display.setStrokeStyle(3, 0xffffff, 0.2);
    orb.display.setVisible(true);
    orb.display.active = true;

    this.objects.push(orb);
  }

  releaseOrb(obj) {
    if (!obj) return;

    obj.active = false;
    obj.x = 0;
    obj.y = 0;
    obj.vx = 0;
    obj.vy = 0;

    obj.display.setVisible(false);
    obj.display.active = false;
    obj.display.setPosition(-9999, -9999);
  }

  rollOrbType() {
    if (this.currentRule.id === "main-character") {
      const roll = Math.random();
      if (roll < 0.34) return "gold";
      return roll < 0.68 ? "blue" : "red";
    }

    if (this.currentRule.id === "touch-grass") {
      const roll = Math.random();
      if (roll < 0.12) return "gold";
      return roll < 0.56 ? "blue" : "red";
    }

    const roll = Math.random();
    return roll < 0.6 ? "blue" : "red";
  }

  getOrbVisualConfig(type) {
    if (type === "blue") return { radius: 22, color: 0x67c8ff, alpha: 0.95 };
    if (type === "red") return { radius: 24, color: 0xff5d6c, alpha: 0.95 };
    return { radius: 20, color: 0xffda59, alpha: 0.98 };
  }

  updateObjectsAndCollisions(dt) {
    const leftBound = this.scale.width * 0.5 - PLAYFIELD_W * 0.5 - 60;
    const rightBound = this.scale.width * 0.5 + PLAYFIELD_W * 0.5 + 60;
    const playerX = this.player.x;
    const playerY = this.player.y;

    for (let i = this.objects.length - 1; i >= 0; i -= 1) {
      const obj = this.objects[i];

      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;
      obj.display.setPosition(obj.x, obj.y);

      const offscreen =
        obj.x < leftBound ||
        obj.x > rightBound ||
        obj.y < 190 ||
        obj.y > this.scale.height + 60;

      if (offscreen) {
        this.releaseOrb(obj);
        this.objects.splice(i, 1);
        continue;
      }

      const dx = playerX - obj.x;
      const dy = playerY - obj.y;
      const collisionRadius = PLAYER_RADIUS + obj.radius;
      const collisionRadiusSq = collisionRadius * collisionRadius;

      if (dx * dx + dy * dy <= collisionRadiusSq) {
        this.handleOrbCollision(obj);
        this.releaseOrb(obj);
        this.objects.splice(i, 1);
      }
    }
  }

  adjustPlayerScale(delta) {
    const flip = this.currentRule.id === "bad-take" ? -1 : 1;
    this.playerScale = Phaser.Math.Clamp(
      this.playerScale + delta * flip,
      MIN_PLAYER_SCALE,
      MAX_PLAYER_SCALE,
    );
  }

  applyHeroScale() {
    if (!this.hero) return;

    const facing = Math.sign(this.hero.skeleton.scaleX) || 1;
    this.hero.scaleX = this.playerScale;
    this.hero.scaleY = this.playerScale;
    this.hero.skeleton.scaleX = Math.abs(this.hero.skeleton.scaleX) * facing;
  }

  pulseHeroScale(multiplier = 1.06, duration = 140) {
    if (!this.hero) return;

    const facing = Math.sign(this.hero.skeleton.scaleX) || 1;
    const pulseScale = Phaser.Math.Clamp(
      this.playerScale * multiplier,
      MIN_PLAYER_SCALE,
      MAX_PLAYER_SCALE * 1.08,
    );

    this.tweens.killTweensOf(this.hero);

    this.hero.scaleX = pulseScale;
    this.hero.scaleY = pulseScale;
    this.hero.skeleton.scaleX = Math.abs(this.hero.skeleton.scaleX) * facing;

    this.tweens.add({
      targets: this.hero,
      scaleX: this.playerScale,
      scaleY: this.playerScale,
      duration,
      ease: "Quad.Out",
      onUpdate: () => {
        if (!this.hero) return;
        this.hero.skeleton.scaleX =
          Math.abs(this.hero.skeleton.scaleX) * facing;
      },
    });
  }

  handleOrbCollision(obj) {
    const good = this.isOrbGood(obj.type);

    if (good) {
      let gain = 10;
      if (obj.type === "gold") gain = 25;
      if (this.currentRule.id === "main-character" && obj.type === "gold") {
        gain = 40;
      }

      this.score += gain;
      this.adjustPlayerScale(0.012);
      this.flashScore("#8dffb0");
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 90,
        `+${gain}`,
        0x8dffb0,
      );

      const now = this.time.now;
      if (now >= this.nextReactionAt) {
        this.nextReactionAt = now + REACTION_COOLDOWN_MS;

        if (obj.type === "gold" || gain >= 40) {
          this.playOneShotAnimation(ANIM_JACKPOT, 650, true);
        } else if (Math.random() < 0.14) {
          this.playOneShotAnimation(ANIM_REWARD, 500, true);
        } else {
          this.smallPop();
        }
      } else {
        this.smallPop();
      }
    } else {
      this.score = Math.max(0, this.score - 15);
      this.adjustPlayerScale(-0.014);
      this.flashScore("#ff8894");
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 90,
        "-15",
        0xff8894,
      );

      const now = this.time.now;
      if (now >= this.nextReactionAt) {
        this.nextReactionAt = now + REACTION_COOLDOWN_MS;
        this.cameras.main.shake(90, 0.004);
        this.playOneShotAnimation(ANIM_BAD_HIT, 500, false);
      }
    }
  }

  smallPop() {
    if (!this.hero) return;
    if (this.time.now < this.nextSmallPopAt) return;

    this.nextSmallPopAt = this.time.now + SMALL_POP_COOLDOWN_MS;

    this.hero.animationState.setAnimation(0, ANIM_JUMP, false);
    this.hero.animationState.addAnimation(0, ANIM_WALK, true, 0);

    this.pulseHeroScale(1.06, 140);
  }

  playOneShotAnimation(name, durationMs = 500, preserveFacing = true) {
    if (!this.hero) return;

    const faceSign = Math.sign(this.hero.skeleton.scaleX) || 1;
    this.applyHeroScale();

    if (name === ANIM_BAD_HIT) {
      this.hitAnimLocked = true;
    } else {
      this.rewardAnimLocked = true;
    }

    this.currentAnim = name;
    this.hero.animationState.setAnimation(0, name, false);

    this.time.delayedCall(durationMs, () => {
      if (!this.hero) return;

      if (preserveFacing) {
        this.hero.skeleton.scaleX =
          Math.abs(this.hero.skeleton.scaleX) * faceSign;
      }

      if (name === ANIM_BAD_HIT) {
        this.hitAnimLocked = false;
      } else {
        this.rewardAnimLocked = false;
      }

      this.applyHeroScale();
      this.playHeroAnimation(ANIM_WALK, true);
    });
  }

  spawnFloatingText(x, y, text, tint) {
    if (!this.floatingTextPool.length) return;

    const popup = this.floatingTextPool[this.floatingTextPoolIndex];
    this.floatingTextPoolIndex =
      (this.floatingTextPoolIndex + 1) % this.floatingTextPool.length;

    this.tweens.killTweensOf(popup);

    popup.active = true;
    popup.setText(text);
    popup.setPosition(x, y);
    popup.setTint(tint);
    popup.setAlpha(1);
    popup.setVisible(true);

    this.tweens.add({
      targets: popup,
      y: y - 36,
      alpha: 0,
      duration: 450,
      ease: "Cubic.Out",
      onComplete: () => {
        popup.active = false;
        popup.setVisible(false);
      },
    });
  }

  isOrbGood(type) {
    switch (this.currentRule.id) {
      case "clout-chase":
        return type === "blue";
      case "bad-take":
        return type === "red";
      case "brain-lag":
        return type === "blue";
      case "touch-grass":
        return type === "gold" || type === "blue";
      case "main-character":
        return type === "gold" || type === "blue";
      case "gremlin-mode":
        return type === "blue" || type === "gold";
      default:
        return type === "blue";
    }
  }

  getTouchGrassBounds() {
    const minX = this.scale.width * 0.5 - PLAYFIELD_W * 0.5 + 90;
    const maxX = this.scale.width * 0.5 + PLAYFIELD_W * 0.5 - 90;
    const minY = 310;
    const maxY = this.scale.height - 180;

    return { minX, maxX, minY, maxY };
  }

  pickTouchGrassTarget() {
    const bounds = this.getTouchGrassBounds();

    return {
      x: Phaser.Math.Between(bounds.minX, bounds.maxX),
      y: Phaser.Math.Between(bounds.minY, bounds.maxY),
    };
  }

  ensureTouchGrassZone() {
    if (!this.touchGrassZone) {
      const start = this.pickTouchGrassTarget();
      this.touchGrassZone = {
        x: start.x,
        y: start.y,
        radius: 90,
      };
      this.touchGrassTarget = this.pickTouchGrassTarget();
      this.touchGrassMoveTimer = this.touchGrassRetargetInterval;
    }

    if (!this.touchGrassGraphics) {
      this.touchGrassGraphics = this.add
        .circle(
          this.touchGrassZone.x,
          this.touchGrassZone.y,
          this.touchGrassZone.radius,
          0x58e58a,
          0.18,
        )
        .setStrokeStyle(4, 0x8dffb0, 0.95)
        .setDepth(5);
    }
  }

  updateTouchGrass(dt) {
    if (this.currentRule.id !== "touch-grass") {
      if (this.touchGrassGraphics) this.touchGrassGraphics.setVisible(false);
      if (this.touchGrassHintText) this.touchGrassHintText.setAlpha(0);
      this.insideGrass = false;
      this.wasInsideGrass = false;
      this.touchGrassProgressAccumulator = 0;
      return;
    }

    this.ensureTouchGrassZone();
    this.touchGrassGraphics.setVisible(true);

    this.touchGrassMoveTimer -= dt;
    if (this.touchGrassMoveTimer <= 0 || !this.touchGrassTarget) {
      this.touchGrassTarget = this.pickTouchGrassTarget();
      this.touchGrassMoveTimer = Phaser.Math.FloatBetween(0.9, 1.6);
    }

    const dx = this.touchGrassTarget.x - this.touchGrassZone.x;
    const dy = this.touchGrassTarget.y - this.touchGrassZone.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget > 1) {
      const moveStep = Math.min(distToTarget, this.touchGrassMoveSpeed * dt);
      this.touchGrassZone.x += (dx / distToTarget) * moveStep;
      this.touchGrassZone.y += (dy / distToTarget) * moveStep;
    }

    this.touchGrassGraphics.setPosition(
      this.touchGrassZone.x,
      this.touchGrassZone.y,
    );

    const zoneDx = this.player.x - this.touchGrassZone.x;
    const zoneDy = this.player.y - this.touchGrassZone.y;
    const zoneRadiusSq =
      this.touchGrassZone.radius * this.touchGrassZone.radius;

    this.insideGrass = zoneDx * zoneDx + zoneDy * zoneDy <= zoneRadiusSq;

    if (this.insideGrass) {
      this.touchGrassProgressAccumulator += 4 * dt;

      while (this.touchGrassProgressAccumulator >= 1) {
        this.touchGrassProgressAccumulator -= 1;
        this.score += 1;
      }

      if (!this.wasInsideGrass && this.touchGrassHintText) {
        this.touchGrassHintText.setText("+4/sec");
        this.touchGrassHintText.setAlpha(1);
      }
      this.wasInsideGrass = true;
    } else {
      this.touchGrassProgressAccumulator = 0;
      this.wasInsideGrass = false;
      if (this.touchGrassHintText) {
        this.touchGrassHintText.setText("Stand in the circle");
        this.touchGrassHintText.setAlpha(0.9);
      }
    }
  }

  updateHud(force = false) {
    const timerDisplay = Math.ceil(this.timeLeft);
    const scoreDisplay = Math.floor(this.score);
    const urgentTimer = this.timeLeft <= 10;

    if (force || timerDisplay !== this.lastTimerDisplay) {
      this.lastTimerDisplay = timerDisplay;
      this.timerText.setText(timerDisplay.toString());
    }

    if (force || scoreDisplay !== this.lastScoreDisplay) {
      this.lastScoreDisplay = scoreDisplay;
      this.scoreText.setText(scoreDisplay.toString());
    }

    if (force || this.currentRule.subtitle !== this.lastTipDisplay) {
      this.lastTipDisplay = this.currentRule.subtitle;
      this.tipText.setText(this.currentRule.subtitle);
    }

    if (force || this.currentRule.label !== this.lastRuleLabel) {
      this.lastRuleLabel = this.currentRule.label;
      this.ruleText.setText(this.currentRule.label);
    }

    if (force || urgentTimer !== this.lastTimerUrgent) {
      this.lastTimerUrgent = urgentTimer;
      if (urgentTimer) {
        this.timerText.setScale(1.16);
        this.timerText.setColor("#ff8c98");
      } else {
        this.timerText.setScale(1);
        this.timerText.setColor("#ffffff");
      }
    }
  }

  applyRule(index) {
    this.ruleIndex = index;
    this.currentRule = RULES[index];
    this.ruleTimeLeft = this.currentRule.duration;

    this.lastRuleLabel = null;
    this.lastTipDisplay = null;
    this.updateHud(true);

    this.ruleBannerBg.setFillStyle(this.currentRule.bannerFill, 0.9);
    this.ruleBannerBg.setStrokeStyle(3, this.currentRule.bannerStroke, 0.95);
    this.ruleText.setColor("#ffffff");
    this.tipText.setColor(
      `#${this.currentRule.accent.toString(16).padStart(6, "0")}`,
    );

    this.bgGlow.setFillStyle(this.currentRule.accent, 0.08);

    if (this.currentRule.id === "touch-grass") {
      const start = this.pickTouchGrassTarget();
      this.touchGrassZone = {
        x: start.x,
        y: start.y,
        radius: 90,
      };
      this.touchGrassTarget = this.pickTouchGrassTarget();
      this.touchGrassMoveTimer = Phaser.Math.FloatBetween(0.9, 1.6);
      this.touchGrassProgressAccumulator = 0;
      this.wasInsideGrass = false;

      if (this.touchGrassGraphics) {
        this.touchGrassGraphics.setPosition(start.x, start.y).setVisible(true);
      }
      if (this.touchGrassHintText) {
        this.touchGrassHintText.setText("Stand in the circle");
        this.touchGrassHintText.setAlpha(0.9);
      }
    } else if (this.touchGrassHintText) {
      this.touchGrassHintText.setAlpha(0);
    }

    this.ruleBannerBg.setScale(1.16, 1.16);
    this.ruleText.setScale(1.18);
    this.tipText.setAlpha(0);

    this.tweens.add({
      targets: [this.ruleBannerBg, this.ruleText],
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: "Back.Out",
    });

    this.tweens.add({
      targets: this.tipText,
      alpha: 1,
      delay: 60,
      duration: 180,
    });

    this.cameras.main.flash(140, 255, 255, 255, false);
    this.cameras.main.shake(80, 0.0025);
    this.smallPop();
  }

  triggerFinalTen() {
    this.finalTenTriggered = true;
    this.finalTenText.setText("FINAL 10");
    this.finalTenText.setAlpha(1);
    this.finalTenText.setScale(1.35);

    this.tweens.add({
      targets: this.finalTenText,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: "Back.Out",
    });

    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: this.finalTenText,
        alpha: 0,
        duration: 250,
      });
    });

    this.cameras.main.flash(120, 255, 220, 220, false);
  }

  playHeroAnimation(name, loop = true) {
    if (!this.hero) return;
    if (this.currentAnim === name) return;

    this.currentAnim = name;
    this.hero.animationState.setAnimation(0, name, loop);
  }

  flashScore(color) {
    this.scoreText.setColor(color);
    this.tweens.killTweensOf(this.scoreText);
    this.scoreText.setScale(1.18);

    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: "Quad.Out",
    });

    if (this.scoreFlashEvent) {
      this.scoreFlashEvent.remove(false);
      this.scoreFlashEvent = null;
    }

    this.scoreFlashEvent = this.time.delayedCall(
      SCORE_FLASH_DURATION_MS,
      () => {
        if (!this.gameEnded) {
          this.scoreText.setColor("#ffffff");
        }
        this.scoreFlashEvent = null;
      },
    );
  }

  endGame() {
    this.gameEnded = true;

    this.input.off("pointerdown", this.onPointerDown, this);
    this.input.off("pointermove", this.onPointerMove, this);
    this.input.off("pointerup", this.onPointerUp, this);
    this.input.off("pointerupoutside", this.onPointerUp, this);

    const resultAnimation =
      this.score >= 360
        ? "Moonwalk"
        : this.score >= 220
          ? "Dance"
          : "DramaticCollapse";

    this.scene.start("EndScene", {
      score: this.score,
      animation: resultAnimation,
      rank: this.getRunRank(Math.floor(this.score)),
    });
  }

  getRunRank(score) {
    if (score >= 420) return "Main Character Energy";
    if (score >= 320) return "Certified Feed Survivor";
    if (score >= 220) return "Clout Goblin";
    if (score >= 140) return "Too Online";
    return "Scroll Damage";
  }
}

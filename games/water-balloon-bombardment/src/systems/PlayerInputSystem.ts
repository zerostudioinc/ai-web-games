import Phaser from 'phaser';
import { FIELD_BOUNDS } from '../config';
import { clamp, type Vec2 } from './movement';

const STICK_DEADZONE = 0.25;

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

/**
 * Per-player reticle input. Player 0 also accepts keyboard; controller N drives player N.
 * Touch/mouse aiming is only active in single-player games.
 */
export class PlayerInputSystem {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd?: WasdKeys;
  private readonly touchEnabled: boolean;
  private aimTarget: Vec2 | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    playerCount: number,
  ) {
    const keyboard = scene.input.keyboard;
    this.cursors = keyboard?.createCursorKeys();
    this.wasd = keyboard?.addKeys('W,A,S,D') as WasdKeys | undefined;

    this.touchEnabled = playerCount === 1;
    if (this.touchEnabled) {
      scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer, this);
      scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointer, this);
    }
  }

  /** Direction in -1..1 per axis; screen space, so +y is down. */
  getMove(playerIndex: number): Vec2 {
    let x = 0;
    let y = 0;

    if (playerIndex === 0 && this.cursors && this.wasd) {
      x += Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
      y += Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    }

    const pad = this.scene.input.gamepad?.getPad(playerIndex);
    if (pad?.connected) {
      x += Number(pad.right) - Number(pad.left);
      y += Number(pad.down) - Number(pad.up);
      if (Math.abs(pad.leftStick.x) > STICK_DEADZONE) x += pad.leftStick.x;
      if (Math.abs(pad.leftStick.y) > STICK_DEADZONE) y += pad.leftStick.y;
    }

    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  /** Returns the latest touch/mouse aim point once, or null. Single-player only. */
  consumeAim(playerIndex: number): Vec2 | null {
    if (playerIndex !== 0) return null;
    const target = this.aimTarget;
    this.aimTarget = null;
    return target;
  }

  isControllerConnected(playerIndex: number): boolean {
    return this.scene.input.gamepad?.getPad(playerIndex)?.connected ?? false;
  }

  destroy(): void {
    if (!this.touchEnabled) return;
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointer, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointer, this);
  }

  private onPointer(pointer: Phaser.Input.Pointer): void {
    // Ignore the HUD strip and hover-only mouse movement.
    if (!pointer.isDown || pointer.y < FIELD_BOUNDS.top) return;
    this.aimTarget = { x: pointer.x, y: pointer.y };
  }
}

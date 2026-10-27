import Phaser from 'phaser';
import { FIELD_BOUNDS, MAX_PLAYERS } from '../config';
import { clamp, type Vec2 } from './movement';

const STICK_DEADZONE = 0.25;
const START_BUTTON = 9;
// Start pauses and the D-pad moves the reticle, so neither fires.
const NON_FIRE_BUTTONS = new Set([START_BUTTON, 12, 13, 14, 15]);

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

export function isFireButtonDown(pad: Phaser.Input.Gamepad.Gamepad): boolean {
  return pad.buttons.some((button, index) => button.pressed && !NON_FIRE_BUTTONS.has(index));
}

/**
 * Per-player input. Player 0 also accepts keyboard; controller N drives player N.
 * Touch/mouse aiming and tap-to-fire are only active in single-player games.
 * Call `poll()` once per frame before reading `firePressed` / `pausePressed`.
 */
export class PlayerInputSystem {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd?: WasdKeys;
  private readonly fireKey?: Phaser.Input.Keyboard.Key;
  private readonly pauseKeys: Phaser.Input.Keyboard.Key[] = [];
  private readonly touchEnabled: boolean;

  private readonly fireEdge: boolean[] = new Array<boolean>(MAX_PLAYERS).fill(false);
  private readonly padFireDown: boolean[] = new Array<boolean>(MAX_PLAYERS).fill(false);
  private readonly padStartDown: boolean[] = new Array<boolean>(MAX_PLAYERS).fill(false);
  private pauseEdge = false;
  private touchFire = false;
  private aimTarget: Vec2 | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    playerCount: number,
  ) {
    const keyboard = scene.input.keyboard;
    this.cursors = keyboard?.createCursorKeys();
    this.wasd = keyboard?.addKeys('W,A,S,D') as WasdKeys | undefined;
    this.fireKey = keyboard?.addKey('SPACE');
    for (const name of ['ESC', 'P']) {
      const key = keyboard?.addKey(name);
      if (key) this.pauseKeys.push(key);
    }

    this.touchEnabled = playerCount === 1;
    if (this.touchEnabled) {
      scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
      scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    }

    // Buttons already held when the scene starts must not count as a fresh press.
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = scene.input.gamepad?.getPad(i);
      this.padFireDown[i] = !!pad?.connected && isFireButtonDown(pad);
      this.padStartDown[i] = !!pad?.connected && !!pad.buttons[START_BUTTON]?.pressed;
    }
  }

  /** Latches this frame's fire / pause presses. */
  poll(): void {
    this.fireEdge.fill(false);
    this.pauseEdge = false;

    if (this.fireKey && Phaser.Input.Keyboard.JustDown(this.fireKey)) this.fireEdge[0] = true;
    for (const key of this.pauseKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) this.pauseEdge = true;
    }
    if (this.touchFire) {
      this.fireEdge[0] = true;
      this.touchFire = false;
    }

    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      const connected = pad?.connected ?? false;

      const fireDown = connected && !!pad && isFireButtonDown(pad);
      if (fireDown && !this.padFireDown[i]) this.fireEdge[i] = true;
      this.padFireDown[i] = fireDown;

      const startDown = connected && !!pad?.buttons[START_BUTTON]?.pressed;
      if (startDown && !this.padStartDown[i]) this.pauseEdge = true;
      this.padStartDown[i] = startDown;
    }
  }

  firePressed(playerIndex: number): boolean {
    return this.fireEdge[playerIndex] ?? false;
  }

  pausePressed(): boolean {
    return this.pauseEdge;
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

  /** Drops any pending aim and tap-to-fire, e.g. a tap that landed on a pause-menu button. */
  discard(): void {
    this.aimTarget = null;
    this.touchFire = false;
  }

  isControllerConnected(playerIndex: number): boolean {
    return this.scene.input.gamepad?.getPad(playerIndex)?.connected ?? false;
  }

  destroy(): void {
    if (!this.touchEnabled) return;
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.inField(pointer)) return;
    this.aimTarget = { x: pointer.x, y: pointer.y };
    this.touchFire = true;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown || !this.inField(pointer)) return;
    this.aimTarget = { x: pointer.x, y: pointer.y };
  }

  // The HUD strip above the field holds buttons and must not aim or fire.
  private inField(pointer: Phaser.Input.Pointer): boolean {
    return pointer.y >= FIELD_BOUNDS.top;
  }
}

/**
 * Per-player input for the play scene: keyboard, mouse, touch and controllers.
 */
import Phaser from 'phaser';
import { FIELD_BOUNDS, MAX_PLAYERS } from '../config';
import { clamp, type Vec2 } from './movement';
import { padIndexForPlayer, playerForPadIndex } from './players';
import { anyNewPress, fireButtonStates } from './padFire';

/** How far a stick must be pushed (0 to 1) before it moves the reticle; filters out resting drift. */
const STICK_DEADZONE = 0.25;
/** Standard-mapping index of a controller's Start button, which pauses the game. */
const START_BUTTON = 9;

/** The four movement keys, looked up by letter. */
type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

/**
 * Whether any fire button on a controller is currently held.
 *
 * @param pad - The controller to inspect.
 * @returns True while at least one fire button is pressed (the D-pad, Start and so on do not count).
 */
export function isFireButtonDown(pad: Phaser.Input.Gamepad.Gamepad): boolean {
  return fireButtonStates(pad.buttons).some(Boolean);
}

/**
 * Per-player input. Keyboard, mouse and touch always drive player 1; controllers are
 * assigned by `players.ts` (player 2 first, so player 1 only gets one when everyone else has).
 * Call `poll()` once per frame before reading `firePressed` / `pausePressed`.
 */
export class PlayerInputSystem {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys; // arrow keys; undefined without a keyboard
  private readonly wasd?: WasdKeys; // W/A/S/D keys
  private readonly fireKey?: Phaser.Input.Keyboard.Key; // Space fires for player 1
  private readonly pauseKeys: Phaser.Input.Keyboard.Key[] = []; // Esc and P

  private readonly fireEdge: boolean[] = new Array<boolean>(MAX_PLAYERS).fill(false); // fire presses latched this frame, by player
  private readonly padFireDown: boolean[][] = Array.from({ length: MAX_PLAYERS }, () => fireButtonStates([])); // by pad index, per fire button
  private readonly padStartDown: boolean[] = new Array<boolean>(MAX_PLAYERS).fill(false); // by pad index
  private pauseEdge = false; // a pause was requested this frame
  private touchFire = false; // a tap or click landed since the last poll
  private aimTarget: Vec2 | null = null; // latest touch/mouse aim point not yet consumed

  /**
   * Binds the keys and pointer events, and snapshots controller buttons that are already held
   * so they do not count as fresh presses.
   *
   * @param scene - Scene whose input plugins are used; pointer listeners are attached to it.
   * @param playerCount - Number of players (1 to 4); decides which controller drives which player.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly playerCount: number,
  ) {
    const keyboard = scene.input.keyboard;
    this.cursors = keyboard?.createCursorKeys();
    this.wasd = keyboard?.addKeys('W,A,S,D') as WasdKeys | undefined;
    this.fireKey = keyboard?.addKey('SPACE');
    // Either Esc or P pauses.
    for (const name of ['ESC', 'P']) {
      const key = keyboard?.addKey(name);
      if (key) this.pauseKeys.push(key);
    }

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);

    // Buttons already held when the scene starts must not count as a fresh press.
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = scene.input.gamepad?.getPad(i);
      this.padFireDown[i] = fireButtonStates(pad?.connected ? pad.buttons : []);
      this.padStartDown[i] = !!pad?.connected && !!pad.buttons[START_BUTTON]?.pressed;
    }
  }

  /**
   * Latches this frame's fire / pause presses. Call once per frame before `firePressed` / `pausePressed`.
   */
  poll(): void {
    this.fireEdge.fill(false);
    this.pauseEdge = false;

    if (this.fireKey && Phaser.Input.Keyboard.JustDown(this.fireKey)) this.fireEdge[0] = true;
    for (const key of this.pauseKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) this.pauseEdge = true;
    }
    // A tap or click also fires for player 1; clear the latch so one tap is one shot.
    if (this.touchFire) {
      this.fireEdge[0] = true;
      this.touchFire = false;
    }

    for (let i = 0; i < MAX_PLAYERS; i++) {
      const pad = this.scene.input.gamepad?.getPad(i);
      const connected = pad?.connected ?? false;

      // Fire when any fire button newly went down, for whichever player this controller belongs to.
      const fireDown = fireButtonStates(connected && pad ? pad.buttons : []);
      const player = playerForPadIndex(i, this.playerCount);
      if (anyNewPress(this.padFireDown[i], fireDown) && player !== null) this.fireEdge[player] = true;
      this.padFireDown[i] = fireDown;

      // Any controller's Start button pauses.
      const startDown = connected && !!pad?.buttons[START_BUTTON]?.pressed;
      if (startDown && !this.padStartDown[i]) this.pauseEdge = true;
      this.padStartDown[i] = startDown;
    }
  }

  /**
   * Whether a player pressed fire this frame.
   *
   * @param playerIndex - 0-based player index.
   * @returns True if fire went down during the latest `poll()`.
   */
  firePressed(playerIndex: number): boolean {
    return this.fireEdge[playerIndex] ?? false;
  }

  /**
   * Whether anyone asked to pause this frame (Esc, P or any controller's Start).
   *
   * @returns True if a pause was requested during the latest `poll()`.
   */
  pausePressed(): boolean {
    return this.pauseEdge;
  }

  /**
   * Reads the movement input that steers a player's reticle.
   *
   * @param playerIndex - 0-based player index; only player 1 uses the keyboard.
   * @returns Direction in -1..1 per axis; screen space, so +y is down.
   */
  getMove(playerIndex: number): Vec2 {
    let x = 0;
    let y = 0;

    // Arrow keys and WASD drive player 1 only.
    if (playerIndex === 0 && this.cursors && this.wasd) {
      x += Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
      y += Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    }

    // The D-pad and the left stick both steer; the stick ignores small drift inside the deadzone.
    const pad = this.scene.input.gamepad?.getPad(padIndexForPlayer(playerIndex, this.playerCount));
    if (pad?.connected) {
      x += Number(pad.right) - Number(pad.left);
      y += Number(pad.down) - Number(pad.up);
      if (Math.abs(pad.leftStick.x) > STICK_DEADZONE) x += pad.leftStick.x;
      if (Math.abs(pad.leftStick.y) > STICK_DEADZONE) y += pad.leftStick.y;
    }

    // Keyboard and controller can add up past 1, so clamp the combined direction.
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  /**
   * Returns the latest touch/mouse aim point once, or null. Only player 1 aims this way.
   *
   * @param playerIndex - 0-based player index.
   * @returns The pending aim point (cleared by this call), or null when there is none.
   */
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

  /**
   * Whether the controller assigned to a player is connected.
   *
   * @param playerIndex - 0-based player index.
   * @returns True when that player's controller is connected.
   */
  isControllerConnected(playerIndex: number): boolean {
    return this.scene.input.gamepad?.getPad(padIndexForPlayer(playerIndex, this.playerCount))?.connected ?? false;
  }

  /** Removes the pointer listeners; call when the scene shuts down so restarts do not leak handlers. */
  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
  }

  /**
   * Pointer-down handler: aims at the pressed point and queues a shot.
   *
   * @param pointer - The mouse or finger that went down.
   */
  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.inField(pointer)) return;
    this.aimTarget = { x: pointer.x, y: pointer.y };
    this.touchFire = true;
  }

  /**
   * Pointer-move handler: while the pointer is held down, drags the aim point along with it (no shot).
   *
   * @param pointer - The mouse or finger that moved.
   */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown || !this.inField(pointer)) return;
    this.aimTarget = { x: pointer.x, y: pointer.y };
  }

  /**
   * Whether a pointer is over the playing field rather than the HUD strip.
   * The HUD strip above the field holds buttons and must not aim or fire.
   *
   * @param pointer - The pointer to test.
   * @returns True when the pointer is at or below the top of the field.
   */
  private inField(pointer: Phaser.Input.Pointer): boolean {
    return pointer.y >= FIELD_BOUNDS.top;
  }
}

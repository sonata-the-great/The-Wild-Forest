import * as THREE from 'three';

/**
 * Unified input for keyboard+mouse (desktop) and touch (mobile).
 * Owns yaw/pitch so FPP and TPP share the same view direction.
 */
export class InputManager {
  constructor(domElement, settings) {
    this.domElement = domElement;
    this.settings = settings;

    this.keys = {};
    this.yaw = 0;
    this.pitch = -0.08;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    this.joystick = { x: 0, y: 0 };
    this.sprintHeld = false;

    this.pointerLocked = false;
    this.isMobile = settings.isMobile();

    // mobile look tracking
    this.lookTouchId = null;
    this.lastLookX = 0;
    this.lastLookY = 0;

    this._setupKeyboard();
    this._setupMouse();
    if (this.isMobile) this._setupTouch();
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      // Prevent page scroll on space / arrows
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  _setupMouse() {
    if (this.isMobile) return;

    this.domElement.addEventListener('click', () => {
      if (!this.pointerLocked) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.lookDeltaX += e.movementX;
      this.lookDeltaY += e.movementY;
    });
  }

  _setupTouch() {
    const el = this.domElement;

    el.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        // Right half of screen = look
        if (t.clientX > window.innerWidth * 0.5 && this.lookTouchId === null) {
          this.lookTouchId = t.identifier;
          this.lastLookX = t.clientX;
          this.lastLookY = t.clientY;
        }
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouchId) {
          this.lookDeltaX += (t.clientX - this.lastLookX) * 1.6;
          this.lookDeltaY += (t.clientY - this.lastLookY) * 1.6;
          this.lastLookX = t.clientX;
          this.lastLookY = t.clientY;
          e.preventDefault();
        }
      }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouchId) this.lookTouchId = null;
      }
    });
    el.addEventListener('touchcancel', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouchId) this.lookTouchId = null;
      }
    });
  }

  update() {
    const sens = 0.0022 * this.settings.sensitivity;
    const invert = this.settings.invertY ? -1 : 1;

    this.yaw -= this.lookDeltaX * sens;
    this.pitch -= this.lookDeltaY * sens * invert;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);

    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
  }

  getMoveInput() {
    let x = 0, y = 0;
    if (this.keys.KeyW) y += 1;
    if (this.keys.KeyS) y -= 1;
    if (this.keys.KeyD) x += 1;
    if (this.keys.KeyA) x -= 1;

    // Joystick: y positive = down (screen space), so forward is -y
    x += this.joystick.x;
    y -= this.joystick.y;

    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, magnitude: Math.min(1, len) };
  }

  isSprintHeld() {
    return !!(this.keys.ShiftLeft || this.keys.ShiftRight || this.sprintHeld);
  }

  requestPointerLock() {
    if (!this.isMobile) this.domElement.requestPointerLock?.();
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
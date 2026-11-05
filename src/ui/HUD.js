import * as THREE from 'three';

export class HUD {
  constructor(root, player, cameraManager, settings) {
    this.root = root;
    this.player = player;
    this.cameraManager = cameraManager;
    this.settings = settings;

    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="vitals">
        <div>
          <div class="bar-label">Health</div>
          <div class="bar bar-health"><div class="bar-fill" data-health></div></div>
        </div>
        <div>
          <div class="bar-label">Stamina</div>
          <div class="bar bar-stamina"><div class="bar-fill" data-stamina></div></div>
        </div>
      </div>

      <div class="crosshair" data-crosshair></div>

      <div class="status">
        <div>Posture: <strong data-posture>STAND</strong></div>
        <div>Camera: <strong data-camera>FPP</strong></div>
      </div>

      <div class="hint" data-hint>
        WASD move · Mouse look · Shift sprint · C crouch · Z prone · Space jump · V camera · ESC pause
      </div>

      <div class="top-right">
        <button class="icon-btn" data-btn-camera title="Camera (V)">◎</button>
        <button class="icon-btn" data-btn-pause title="Pause (Esc)">❚❚</button>
      </div>
    `;
    root.appendChild(this.el);

    this.healthFill = this.el.querySelector('[data-health]');
    this.staminaFill = this.el.querySelector('[data-stamina]');
    this.crosshair = this.el.querySelector('[data-crosshair]');
    this.postureEl = this.el.querySelector('[data-posture]');
    this.cameraEl = this.el.querySelector('[data-camera]');
    this.hintEl = this.el.querySelector('[data-hint]');

    this.hintTimeout = setTimeout(() => this.hintEl.classList.add('fade'), 8000);
  }

  update() {
    // Bars
    const hpPct = Math.max(0, Math.min(1, this.player.health / this.player.healthMax));
    const stPct = Math.max(0, Math.min(1, this.player.stamina / this.player.staminaMax));
    this.healthFill.style.width = `${hpPct * 100}%`;
    this.staminaFill.style.width = `${stPct * 100}%`;

    // Crosshair state
    this.crosshair.classList.toggle('sprint',
      this.input?.isSprintHeld?.() === true && this.player.posture === 'stand');
    this.crosshair.classList.toggle('prone', this.player.posture === 'prone');

    // Text
    this.postureEl.textContent = this.player.posture.toUpperCase();
    this.cameraEl.textContent = this.cameraManager.mode;
  }

  show() { this.el.classList.remove('hud-hidden'); }
  hide() { this.el.classList.add('hud-hidden'); }
}
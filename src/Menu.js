export class Menu {
  constructor(root, settings, callbacks) {
    this.root = root;
    this.settings = settings;
    this.callbacks = callbacks; // { onResume, onRestart }
    this.isOpen = false;

    this.el = document.createElement('div');
    this.el.className = 'menu-overlay hidden';
    root.appendChild(this.el);

    this._renderPause();
  }

  _renderPause() {
    this.el.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">WILD FRONTIER</div>
        <div class="menu-subtitle">Paused</div>

        <button class="menu-btn primary" data-act="resume">Resume</button>
        <button class="menu-btn" data-act="settings">Settings</button>
        <button class="menu-btn" data-act="restart">Restart</button>
      </div>
    `;

    this.el.querySelector('[data-act="resume"]').addEventListener('click', () => {
      this.close();
    });
    this.el.querySelector('[data-act="settings"]').addEventListener('click', () => {
      this._renderSettings();
    });
    this.el.querySelector('[data-act="restart"]').addEventListener('click', () => {
      window.location.reload();
    });
  }

  _renderSettings() {
    this.el.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">SETTINGS</div>
        <div class="menu-subtitle">Preferences</div>

        <div class="settings-row">
          <span>Look Sensitivity</span>
          <input type="range" min="0.3" max="2.5" step="0.05" value="${this.settings.sensitivity}" data-k="sensitivity" />
          <span class="settings-value" data-v="sensitivity">${this.settings.sensitivity.toFixed(2)}</span>
        </div>

        <div class="settings-row">
          <span>Invert Y</span>
          <input type="checkbox" ${this.settings.invertY ? 'checked' : ''} data-k="invertY" />
          <span></span>
        </div>

        <div class="settings-row">
          <span>Field of View</span>
          <input type="range" min="60" max="95" step="1" value="${this.settings.fov}" data-k="fov" />
          <span class="settings-value" data-v="fov">${this.settings.fov}</span>
        </div>

        <button class="menu-btn settings-back" data-act="back">Back</button>
      </div>
    `;

    this.el.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        const key = inp.dataset.k;
        if (key === 'invertY') {
          this.settings.invertY = inp.checked;
        } else if (key === 'sensitivity') {
          this.settings.sensitivity = parseFloat(inp.value);
          this.el.querySelector('[data-v="sensitivity"]').textContent = this.settings.sensitivity.toFixed(2);
        } else if (key === 'fov') {
          this.settings.fov = parseFloat(inp.value);
          this.el.querySelector('[data-v="fov"]').textContent = this.settings.fov;
          this.callbacks.onFovChange?.(this.settings.fov);
        }
        this.settings.save();
      });
    });

    this.el.querySelector('[data-act="back"]').addEventListener('click', () => {
      this._renderPause();
    });
  }

  open() {
    this.isOpen = true;
    this.el.classList.remove('hidden');
    this._renderPause();
    this.callbacks.onPause?.();
  }

  close() {
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.callbacks.onResume?.();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }
}
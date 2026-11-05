/**
 * On-screen joystick (left) + action buttons (right).
 * Only shown on touch devices.
 */
export class MobileControls {
  constructor(root, input, player, cameraManager, settings) {
    this.root = root;
    this.input = input;
    this.player = player;
    this.cameraManager = cameraManager;
    this.settings = settings;

    if (!settings.isMobile()) return;

    this.container = document.createElement('div');
    this.container.className = 'mobile-root';
    this.container.innerHTML = `
      <div class="joystick-zone" data-joy>
        <div class="joystick-base"></div>
        <div class="joystick-knob" data-knob></div>
      </div>
      <div class="action-buttons">
        <button class="action-btn" data-action="sprint">SPRINT</button>
        <button class="action-btn" data-action="jump">JUMP</button>
        <button class="action-btn" data-action="crouch">CROUCH</button>
        <button class="action-btn" data-action="prone">PRONE</button>
        <button class="action-btn wide" data-action="camera">CAMERA</button>
      </div>
    `;
    root.appendChild(this.container);

    this._setupJoystick();
    this._setupButtons();
  }

  _setupJoystick() {
    const zone = this.container.querySelector('[data-joy]');
    const knob = this.container.querySelector('[data-knob]');
    const baseRect = () => zone.getBoundingClientRect();
    let pointerId = null;
    const maxR = 55;

    const onDown = (e) => {
      if (pointerId !== null) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      pointerId = t.identifier !== undefined ? t.identifier : 'mouse';
      this._update(t.clientX, t.clientY);
      e.preventDefault();
    };
    const onMove = (e) => {
      if (pointerId === null) return;
      const list = e.changedTouches
        ? Array.from(e.changedTouches).find(x => x.identifier === pointerId)
        : e;
      if (!list) return;
      this._update(list.clientX, list.clientY);
      e.preventDefault();
    };
    const onUp = (e) => {
      if (pointerId === null) return;
      const t = e.changedTouches
        ? Array.from(e.changedTouches).find(x => x.identifier === pointerId)
        : e;
      if (e.changedTouches && !t) return;
      pointerId = null;
      this.input.joystick.x = 0;
      this.input.joystick.y = 0;
      knob.style.transform = '';
    };

    const update = (cx, cy) => {
      const r = baseRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      let dx = cx - centerX;
      let dy = cy - centerY;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.joystick.x = dx / maxR;
      this.input.joystick.y = dy / maxR;
    };
    this._update = update;

    zone.addEventListener('touchstart', onDown, { passive: false });
    zone.addEventListener('touchmove', onMove, { passive: false });
    zone.addEventListener('touchend', onUp);
    zone.addEventListener('touchcancel', onUp);
    zone.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  _setupButtons() {
    const press = (btn, handler) => {
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); handler(true); }, { passive: false });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); handler(false); }, { passive: false });
      btn.addEventListener('touchcancel', (e) => { e.preventDefault(); handler(false); }, { passive: false });
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); handler(true); });
      btn.addEventListener('mouseup', (e) => { e.preventDefault(); handler(false); });
    };

    // Sprint: hold
    const sprintBtn = this.container.querySelector('[data-action="sprint"]');
    press(sprintBtn, (down) => {
      this.input.sprintHeld = down;
      sprintBtn.classList.toggle('active', down);
    });

    // Jump: tap
    this.container.querySelector('[data-action="jump"]').addEventListener('click', () => {
      this.input.keys.Space = true;
      setTimeout(() => { this.input.keys.Space = false; }, 100);
    });

    // Crouch: tap toggle
    this.container.querySelector('[data-action="crouch"]').addEventListener('click', () => {
      this.player.toggleCrouch();
    });

    // Prone: tap toggle
    this.container.querySelector('[data-action="prone"]').addEventListener('click', () => {
      this.player.toggleProne();
    });

    // Camera: tap toggle
    this.container.querySelector('[data-action="camera"]').addEventListener('click', () => {
      this.cameraManager.toggle();
    });
  }

  show() { if (this.container) this.container.classList.remove('hidden'); }
  hide() { if (this.container) this.container.classList.add('hidden'); }
}
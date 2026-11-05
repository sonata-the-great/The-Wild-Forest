import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { Settings } from './Settings.js';
import { World } from '../world/World.js';
import { Player } from '../player/Player.js';
import { CameraManager } from '../camera/CameraManager.js';
import { HUD } from '../ui/HUD.js';
import { MobileControls } from '../ui/MobileControls.js';
import { Menu } from '../ui/Menu.js';

export class Game {
  constructor(container, uiRoot) {
    this.container = container;
    this.uiRoot = uiRoot;
    this.settings = new Settings();
    this.isMobile = this.settings.isMobile();

    /* ---------- Renderer ---------- */
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
    });
    const dprCap = this.isMobile ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    /* ---------- Scene & Camera ---------- */
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      window.innerWidth / window.innerHeight,
      0.08,
      700
    );

    /* ---------- Subsystems ---------- */
    this.input = new InputManager(this.renderer.domElement, this.settings);
    this.world = new World(this.scene, this.settings);
    this.player = new Player(this.world, this.input, this.settings);
    this.player.addToScene(this.scene);
    this.cameraManager = new CameraManager(
      this.camera, this.player, this.input, this.settings, this.world
    );

    /* ---------- UI ---------- */
    this.hud = new HUD(this.uiRoot, this.player, this.cameraManager, this.settings);
    this.mobileControls = new MobileControls(this.uiRoot, this.input, this.player, this.cameraManager, this.settings);
    this.menu = new Menu(this.uiRoot, this.settings, {
      onPause: () => this._onPause(),
      onResume: () => this._onResume(),
      onFovChange: (fov) => {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
      },
    });

    /* ---------- State ---------- */
    this.paused = false;

    /* ---------- Global events ---------- */
    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('keydown', (e) => this._onKeyDown(e));

    // HUD buttons
    this.hud.el.querySelector('[data-btn-camera]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.cameraManager.toggle();
    });
    this.hud.el.querySelector('[data-btn-pause]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.menu.toggle();
    });

    /* ---------- Loop ---------- */
    this.loop = new GameLoop(
      (dt) => this._update(dt),
      () => this._render()
    );
  }

  start() {
    this.loop.start();
  }

  _update(dt) {
    if (this.paused) return;
    this.input.update();
    this.player.update(dt);
    this.world.update(dt, this.player.position);
    this.cameraManager.update(dt);
    this.hud.update();
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }

  _onKeyDown(e) {
    if (e.code === 'Escape') {
      this.menu.toggle();
    } else if (e.code === 'KeyV' && !this.paused) {
      this.cameraManager.toggle();
    }
  }

  _onPause() {
    this.paused = true;
    this.input.exitPointerLock();
    this.mobileControls.hide();
  }

  _onResume() {
    this.paused = false;
    this.mobileControls.show();
    // Best-effort pointer lock resume (requires user gesture — the click on Resume
    // is that gesture, so this succeeds).
    setTimeout(() => {
      if (!this.isMobile) this.input.requestPointerLock();
    }, 50);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
  }
}

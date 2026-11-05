import * as THREE from 'three';
import { FirstPersonCamera } from './FirstPersonCamera.js';
import { ThirdPersonCamera } from './ThirdPersonCamera.js';

export class CameraManager {
  constructor(camera, player, input, settings, world) {
    this.camera = camera;
    this.player = player;
    this.input = input;
    this.settings = settings;
    this.world = world;

    this.fpp = new FirstPersonCamera();
    this.tpp = new ThirdPersonCamera();

    // blend = 1 → full FPP, blend = 0 → full TPP
    this.blend = 1;
    this.targetBlend = 1;

    this.fppOut = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
    this.tppOut = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

    camera.rotation.order = 'YXZ';
  }

  get mode() {
    return this.targetBlend > 0.5 ? 'FPP' : 'TPP';
  }

  toggle() {
    this.targetBlend = this.targetBlend > 0.5 ? 0 : 1;
  }

  setMode(mode) {
    this.targetBlend = mode === 'FPP' ? 1 : 0;
  }

  update(dt) {
    // Smooth the blend
    const k = 1 - Math.exp(-dt * 10);
    this.blend += (this.targetBlend - this.blend) * k;

    const yaw = this.input.yaw;
    const pitch = this.input.pitch;

    // Compute both
    this.fpp.computeTransform(this.player, yaw, pitch, this.fppOut);
    this.tpp.computeTransform(this.player, yaw, pitch, this.tppOut, this.world);

    // Blend
    const b = this.blend;
    this.camera.position.lerpVectors(this.tppOut.position, this.fppOut.position, b);
    this.camera.quaternion.slerpQuaternions(this.tppOut.quaternion, this.fppOut.quaternion, b);

    // Hide player model when in/near FPP
    this.player.setModelVisible(b < 0.85);
  }
}
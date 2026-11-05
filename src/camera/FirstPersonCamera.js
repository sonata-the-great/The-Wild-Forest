import * as THREE from 'three';

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class FirstPersonCamera {
  constructor() {}

  computeTransform(player, yaw, pitch, out) {
    player.getEyePosition(out.position);
    _euler.set(pitch, yaw, 0);
    out.quaternion.setFromEuler(_euler);
    return out;
  }
}
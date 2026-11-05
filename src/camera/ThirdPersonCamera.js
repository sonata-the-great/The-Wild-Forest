import * as THREE from 'three';

const _target = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();

export class ThirdPersonCamera {
  constructor() {
    this.distance = 4.2;
  }

  computeTransform(player, yaw, pitch, out, world) {
    // Aim pivot: just above the player's chest
    _target.copy(player.position);
    _target.y += 1.35;

    const cosP = Math.cos(pitch);
    // "Behind the player" offset: opposite of forward direction
    _dir.set(
      Math.sin(yaw) * cosP,
      -Math.sin(pitch),
      Math.cos(yaw) * cosP
    ).normalize();

    // Collision-aware distance
    const distance = world
      ? world.raycastCameraCollision(_target, _dir, this.distance)
      : this.distance;

    out.position.copy(_target).addScaledVector(_dir, distance);

    // Look at pivot
    _m.lookAt(out.position, _target, _up);
    out.quaternion.setFromRotationMatrix(_m);

    return out;
  }
}
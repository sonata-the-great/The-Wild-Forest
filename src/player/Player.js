import * as THREE from 'three';

const POSTURE = { STAND: 'stand', CROUCH: 'crouch', PRONE: 'prone' };
const EYE = { stand: 1.68, crouch: 1.12, prone: 0.42 };

export class Player {
  constructor(world, input, settings) {
    this.world = world;
    this.input = input;
    this.settings = settings;

    // State
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.posture = POSTURE.STAND;
    this.currentEyeHeight = EYE.stand;
    this.onGround = false;
    this.radius = 0.42;

    this.stamina = 100;
    this.staminaMax = 100;
    this.health = 100;
    this.healthMax = 100;

    // Speeds (m/s)
    this.speedWalk = 3.4;
    this.speedSprint = 6.8;
    this.speedCrouch = 1.9;
    this.speedProne = 0.9;
    this.jumpSpeed = 7.2;
    this.gravity = -24;

    // Visual model for TPP
    this._buildModel();

    // Spawn on ground
    this.position.y = world.getHeight(0, 0);
    this._syncModel();
  }

  _buildModel() {
    this.model = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6d4f33, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdcb28c, roughness: 0.9 });

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.78, 4, 10), bodyMat);
    torso.position.y = 0.92;
    torso.castShadow = true;
    this.model.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skinMat);
    head.position.y = 1.55;
    head.castShadow = true;
    this.model.add(head);

    // Legs (simple)
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1.0 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.13, 0.35, 0);
    legL.castShadow = true;
    this.model.add(legL);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.13, 0.35, 0);
    legR.castShadow = true;
    this.model.add(legR);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 6);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.36, 1.05, 0);
    armL.rotation.z = 0.15;
    armL.castShadow = true;
    this.model.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.36, 1.05, 0);
    armR.rotation.z = -0.15;
    armR.castShadow = true;
    this.model.add(armR);

    this.model.visible = false;
  }

  getEyePosition(out = new THREE.Vector3()) {
    out.copy(this.position);
    out.y += this.currentEyeHeight;
    return out;
  }

  setPosture(p) {
    if (this.posture === p) return;
    this.posture = p;
  }

  toggleCrouch() {
    this.posture = this.posture === POSTURE.CROUCH ? POSTURE.STAND : POSTURE.CROUCH;
  }

  toggleProne() {
    this.posture = this.posture === POSTURE.PRONE ? POSTURE.STAND : POSTURE.PRONE;
  }

  isMoving() {
    return this.velocity.x !== 0 || this.velocity.z !== 0;
  }

  update(dt) {
    /* ---------- Input ---------- */
    const move = this.input.getMoveInput();
    const wantsSprint = this.input.isSprintHeld();

    /* ---------- Posture ---------- */
    if (this.input.keys.KeyC) this.toggleCrouch();
    if (this.input.keys.KeyZ) this.toggleProne();
    // consume keys by clearing (crouch/prone are edge-triggered via a small flag)
    // (handled by Game via keydown -> toggleFromKey; kept simple here)
    // ---- The following is a deliberate simple path: use a "pressed this frame" check
    // Since InputManager only stores state, we detect edge via a private set.
    if (this.input.keys.KeyC && !this._cKeyDown) { this._cKeyDown = true; }
    if (!this.input.keys.KeyC) this._cKeyDown = false;
    if (this.input.keys.KeyZ && !this._zKeyDown) { this._zKeyDown = true; }
    if (!this.input.keys.KeyZ) this._zKeyDown = false;

    /* ---------- Speed selection ---------- */
    let speed = this.speedWalk;
    let sprinting = false;
    if (this.posture === POSTURE.CROUCH) {
      speed = this.speedCrouch;
    } else if (this.posture === POSTURE.PRONE) {
      speed = this.speedProne;
    } else if (wantsSprint && this.stamina > 1 && (move.magnitude > 0.1)) {
      speed = this.speedSprint;
      sprinting = true;
    }

    /* ---------- Horizontal velocity ---------- */
    if (move.magnitude > 0.01) {
      const yaw = this.input.yaw;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      // right = (cos, 0, -sin), forward = (-sin, 0, -cos)
      const dx = (move.x * cos) + (move.y * -sin);
      const dz = (move.x * -sin) + (move.y * -cos);
      const len = Math.hypot(dx, dz) || 1;
      this.velocity.x = (dx / len) * speed * move.magnitude;
      this.velocity.z = (dz / len) * speed * move.magnitude;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    /* ---------- Jump & gravity ---------- */
    if (this.input.keys.Space && this.onGround && this.posture !== POSTURE.PRONE) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
      if (this.posture === POSTURE.CROUCH) this.posture = POSTURE.STAND;
    }
    this.velocity.y += this.gravity * dt;

    /* ---------- Integrate position ---------- */
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    /* ---------- Collision: trees ---------- */
    const trees = this.world.getTreesNear(this.position.x, this.position.z, 2);
    for (const t of trees) {
      const dx = this.position.x - t.x;
      const dz = this.position.z - t.z;
      const minDist = t.radius + this.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDist * minDist && d2 > 1e-4) {
        const d = Math.sqrt(d2);
        const nx = dx / d, nz = dz / d;
        const push = minDist - d;
        this.position.x += nx * push;
        this.position.z += nz * push;
      }
    }

    /* ---------- Terrain ground clamp ---------- */
    const ground = this.world.getHeight(this.position.x, this.position.z);
    if (this.position.y <= ground) {
      this.position.y = ground;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    /* ---------- Smooth eye height ---------- */
    const targetEye = EYE[this.posture];
    const k = 1 - Math.exp(-dt * 12);
    this.currentEyeHeight += (targetEye - this.currentEyeHeight) * k;

    /* ---------- Stamina ---------- */
    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 18);
    } else {
      this.stamina = Math.min(this.staminaMax, this.stamina + dt * 12);
    }

    /* ---------- Visual model ---------- */
    this._syncModel();
  }

  _syncModel() {
    if (!this.model) return;
    this.model.position.copy(this.position);
    this.model.rotation.y = this.input.yaw;
    // Visual squash for posture (temporary model — see limitations)
    const sy = this.posture === POSTURE.PRONE ? 0.42
             : this.posture === POSTURE.CROUCH ? 0.72
             : 1.0;
    this.model.scale.y += (sy - this.model.scale.y) * 0.25;
  }

  setModelVisible(v) {
    if (this.model) this.model.visible = v;
  }

  addToScene(scene) {
    scene.add(this.model);
  }
}

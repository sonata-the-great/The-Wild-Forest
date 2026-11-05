import * as THREE from 'three';

/**
 * Sky gradient, sun, ambient light, and fog.
 * Sun follows the player for crisp shadows across the whole map.
 */
export class Environment {
  constructor(scene, settings) {
    this.scene = scene;
    this.settings = settings;

    // Fog — atmospheric depth
    this.scene.fog = new THREE.FogExp2(0xa8c4c8, 0.0055);

    // Gradient sky dome
    const skyGeo = new THREE.SphereGeometry(500, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor:    { value: new THREE.Color(0x4a86c4) },
        bottomColor: { value: new THREE.Color(0xd4dcd0) },
        offset:      { value: 30.0 },
        exponent:    { value: 0.65 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // Warm late-afternoon sun
    this.sun = new THREE.DirectionalLight(0xffe9c2, 2.4);
    this.sun.position.set(40, 80, 30);
    this.sun.castShadow = true;
    const shadowSize = settings.isMobile() ? 1024 : 2048;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    this.sun.shadow.camera.left = -45;
    this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 45;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Ambient hemisphere — cool sky / warm ground bounce
    this.hemi = new THREE.HemisphereLight(0xbfd8e8, 0x4a3d2c, 0.85);
    scene.add(this.hemi);

    // Weak fill from opposite side
    this.fill = new THREE.DirectionalLight(0x9ab8c8, 0.35);
    this.fill.position.set(-40, 30, -25);
    scene.add(this.fill);
  }

  update(playerPos) {
    // Sun follows the player so shadow resolution stays high everywhere
    this.sun.position.set(
      playerPos.x + 40,
      playerPos.y + 80,
      playerPos.z + 30
    );
    this.sun.target.position.copy(playerPos);
    this.sun.target.updateMatrixWorld();

    // Sky follows player so we never walk outside the dome
    this.sky.position.copy(playerPos);
  }
}
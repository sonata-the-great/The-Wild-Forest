import * as THREE from 'three';

/* Simple grid spatial hash for fast neighbor lookups */
class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  _key(x, z) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }
  insert(obj) {
    const k = this._key(obj.x, obj.z);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(obj);
  }
  query(x, z, radius = 0) {
    const results = [];
    const cs = this.cellSize;
    const minCX = Math.floor((x - radius) / cs);
    const maxCX = Math.floor((x + radius) / cs);
    const minCZ = Math.floor((z - radius) / cs);
    const maxCZ = Math.floor((z + radius) / cs);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const arr = this.cells.get(`${cx},${cz}`);
        if (arr) for (const o of arr) results.push(o);
      }
    }
    return results;
  }
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Vegetation {
  constructor(scene, terrain, settings) {
    this.scene = scene;
    this.terrain = terrain;
    this.settings = settings;
    this.treeHash = new SpatialHash(12);
    this.grassWindMaterial = null;
    this._time = 0;

    const rand = mulberry32(1337);

    this._buildTrees(rand);
    this._buildRocks(rand);
    this._buildBushes(rand);
    this._buildGrass(rand);
  }

  _buildTrees(rand) {
    const worldSize = this.terrain.size * 0.92;
    const count = this.settings.isMobile() ? 190 : 320;

    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.28, 4.2, 6, 1);
    trunkGeo.translate(0, 2.1, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1.0 });

    const foli1Geo = new THREE.ConeGeometry(1.35, 2.8, 8);
    foli1Geo.translate(0, 1.4, 0);
    const foli1Mat = new THREE.MeshStandardMaterial({ color: 0x2e5c2a, roughness: 0.95, flatShading: true });

    const foli2Geo = new THREE.ConeGeometry(0.95, 2.4, 8);
    foli2Geo.translate(0, 1.2, 0);
    const foli2Mat = new THREE.MeshStandardMaterial({ color: 0x3b7034, roughness: 0.95, flatShading: true });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const foli1 = new THREE.InstancedMesh(foli1Geo, foli1Mat, count);
    const foli2 = new THREE.InstancedMesh(foli2Geo, foli2Mat, count);
    trunks.castShadow = true;
    foli1.castShadow = true;
    foli2.castShadow = true;
    trunks.receiveShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 8) {
      attempts++;
      const x = (rand() - 0.5) * worldSize;
      const z = (rand() - 0.5) * worldSize;
      const y = this.terrain.heightAt(x, z);
      if (y > 5.5) continue; // no trees on rocky peaks

      // No clustering right at spawn point
      if (Math.hypot(x, z) < 4) continue;

      const scale = 0.75 + rand() * 0.85;
      const rotY = rand() * Math.PI * 2;
      const trunkRadius = 0.28 * scale;

      // Trunk
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      s.set(scale, scale, scale);
      p.set(x, y, z);
      m.compose(p, q, s);
      trunks.setMatrixAt(placed, m);

      // Lower foliage (sits above trunk base)
      p.set(x, y + 2.6 * scale, z);
      s.set(scale, scale, scale);
      m.compose(p, q, s);
      foli1.setMatrixAt(placed, m);

      // Upper foliage (smaller, higher)
      p.set(x, y + 4.3 * scale, z);
      s.set(scale * 0.72, scale * 0.9, scale * 0.72);
      m.compose(p, q, s);
      foli2.setMatrixAt(placed, m);

      this.treeHash.insert({ x, z, radius: trunkRadius });
      placed++;
    }

    // Shrink instance count to placed amount if we couldn't fill all
    if (placed < count) {
      trunks.count = placed;
      foli1.count = placed;
      foli2.count = placed;
    }
    trunks.instanceMatrix.needsUpdate = true;
    foli1.instanceMatrix.needsUpdate = true;
    foli2.instanceMatrix.needsUpdate = true;

    this.scene.add(trunks, foli1, foli2);
  }

  _buildRocks(rand) {
    const worldSize = this.terrain.size * 0.9;
    const count = this.settings.isMobile() ? 60 : 110;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 1.0, flatShading: true });
    const rocks = new THREE.InstancedMesh(geo, mat, count);
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * worldSize;
      const z = (rand() - 0.5) * worldSize;
      const y = this.terrain.heightAt(x, z);
      const scale = 0.4 + rand() * 1.2;
      q.setFromEuler(new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI));
      s.set(scale, scale * (0.6 + rand() * 0.5), scale);
      p.set(x, y + scale * 0.2, z);
      m.compose(p, q, s);
      rocks.setMatrixAt(i, m);
    }
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(rocks);
  }

  _buildBushes(rand) {
    const worldSize = this.terrain.size * 0.9;
    const count = this.settings.isMobile() ? 90 : 170;
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a6b34, roughness: 1.0, flatShading: true });
    const bushes = new THREE.InstancedMesh(geo, mat, count);
    bushes.castShadow = true;
    bushes.receiveShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * worldSize;
      const z = (rand() - 0.5) * worldSize;
      const y = this.terrain.heightAt(x, z);
      const scale = 0.5 + rand() * 0.7;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      s.set(scale, scale * 0.7, scale);
      p.set(x, y + scale * 0.4, z);
      m.compose(p, q, s);
      bushes.setMatrixAt(i, m);
    }
    bushes.instanceMatrix.needsUpdate = true;
    this.scene.add(bushes);
  }

  _buildGrass(rand) {
    const worldSize = this.terrain.size * 0.95;
    const count = this.settings.isMobile() ? 3200 : 6500;

    // Thin cone blade — cheap and reads as a grass tuft at distance
    const geo = new THREE.ConeGeometry(0.055, 0.55, 3);
    geo.translate(0, 0.275, 0);

    const mat = new THREE.MeshLambertMaterial({ color: 0x4e8a3a });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      mat.userData.shader = shader;
      shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 instancePos = vec3(0.0);
        #ifdef USE_INSTANCING
          instancePos = instanceMatrix[3].xyz;
        #endif
        float sway = max(0.0, position.y) * 0.35;
        transformed.x += sin(time * 1.8 + instancePos.x * 0.35 + instancePos.z * 0.22) * sway * 0.14;
        transformed.z += cos(time * 1.5 + instancePos.x * 0.28 + instancePos.z * 0.31) * sway * 0.10;
        `
      );
    };
    this.grassWindMaterial = mat;

    const grass = new THREE.InstancedMesh(geo, mat, count);
    grass.castShadow = false;
    grass.receiveShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let placed = 0;

    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * worldSize;
      const z = (rand() - 0.5) * worldSize;
      const y = this.terrain.heightAt(x, z);
      if (y > 5.0) continue; // skip rocky peaks
      const scale = 0.7 + rand() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      s.set(scale, scale * (0.8 + rand() * 0.5), scale);
      p.set(x, y, z);
      m.compose(p, q, s);
      grass.setMatrixAt(placed++, m);
    }
    grass.count = placed;
    grass.instanceMatrix.needsUpdate = true;
    this.scene.add(grass);
  }

  update(dt) {
    this._time += dt;
    const sh = this.grassWindMaterial?.userData?.shader;
    if (sh) sh.uniforms.time.value = this._time;
  }

  getTreesNear(x, z, radius = 2) {
    return this.treeHash.query(x, z, radius);
  }
}
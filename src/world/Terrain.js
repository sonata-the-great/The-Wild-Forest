import * as THREE from 'three';

/* ---------- Seeded PRNG ---------- */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 2D value noise ---------- */
function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += vnoise(x * freq, y * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum; // 0..~1
}

/**
 * Procedural terrain. Height is an analytic function so collision
 * and vertex generation use the exact same source of truth.
 */
export class Terrain {
  constructor(size = 240, resolution = 128) {
    this.size = size;
    this.resolution = resolution;
    this.mesh = this._build();
  }

  heightAt(x, z) {
    // Compose noise layers — rolling hills + subtle ridges
    const base = (fbm(x * 0.012, z * 0.012, 4) - 0.5) * 18;
    const detail = (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 3;
    const ridge = Math.abs(fbm(x * 0.02, z * 0.02, 2) - 0.5) * 6;
    return base + detail + ridge - 3;
  }

  normalAt(x, z) {
    const e = 0.6;
    const hL = this.heightAt(x - e, z);
    const hR = this.heightAt(x + e, z);
    const hD = this.heightAt(x, z - e);
    const hU = this.heightAt(x, z + e);
    return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  }

  _build() {
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.resolution, this.resolution);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.heightAt(x, z);
      pos.setY(i, h);

      // Vertex color: dirt→grass→rock gradient
      if (h > 5.5) {
        c.setHSL(0.09, 0.12, 0.32 + (h - 5.5) * 0.008); // rocky grey-brown
      } else if (h > 3.5) {
        c.setHSL(0.15, 0.28, 0.34 + (h - 3.5) * 0.02); // dry grass
      } else if (h > -2) {
        c.setHSL(0.27, 0.42, 0.30 + (h + 2) * 0.006); // meadow green
      } else {
        c.setHSL(0.30, 0.38, 0.22);                    // damp lowland
      }
      // Subtle per-vertex variation
      const v = (vnoise(x * 0.9, z * 0.9) - 0.5) * 0.06;
      c.r += v; c.g += v; c.b += v;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'terrain';
    return mesh;
  }
}
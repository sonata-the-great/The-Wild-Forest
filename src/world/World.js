import * as THREE from 'three';
import { Terrain } from './Terrain.js';
import { Vegetation } from './Vegetation.js';
import { Environment } from './Environment.js';

export class World {
  constructor(scene, settings) {
    this.scene = scene;
    this.settings = settings;

    this.terrain = new Terrain(240, 128);
    scene.add(this.terrain.mesh);

    this.environment = new Environment(scene, settings);
    this.vegetation = new Vegetation(scene, this.terrain, settings);
  }

  update(dt, playerPos) {
    this.vegetation.update(dt);
    this.environment.update(playerPos);
  }

  getHeight(x, z) {
    return this.terrain.heightAt(x, z);
  }

  getTreesNear(x, z, radius = 2) {
    return this.vegetation.getTreesNear(x, z, radius);
  }

  /**
   * March a ray from `origin` in `direction` and return the closest
   * distance before hitting terrain or a tree trunk. Used by TPP camera.
   */
  raycastCameraCollision(origin, direction, maxDist) {
    let minT = maxDist;

    // Terrain march (cheap: sample heights at fixed steps)
    const STEPS = 14;
    for (let i = 1; i <= STEPS; i++) {
      const t = (i / STEPS) * maxDist;
      const px = origin.x + direction.x * t;
      const py = origin.y + direction.y * t;
      const pz = origin.z + direction.z * t;
      const ground = this.terrain.heightAt(px, pz);
      if (py < ground + 0.35) {
        minT = Math.min(minT, Math.max(0.6, t - 0.3));
        break;
      }
    }

    // Tree trunk march — sample along the ray against nearby tree cylinders
    const midX = origin.x + direction.x * (maxDist * 0.5);
    const midZ = origin.z + direction.z * (maxDist * 0.5);
    const nearTrees = this.vegetation.getTreesNear(midX, midZ, maxDist);
    for (const tree of nearTrees) {
      // closest point on XZ segment to tree center
      const dx = tree.x - origin.x;
      const dz = tree.z - origin.z;
      const t = dx * direction.x + dz * direction.z;
      if (t < 0 || t > minT) continue;
      const cx = origin.x + direction.x * t;
      const cz = origin.z + direction.z * t;
      const distSq = (cx - tree.x) ** 2 + (cz - tree.z) ** 2;
      const r = tree.radius + 0.35;
      if (distSq < r * r) {
        minT = Math.min(minT, Math.max(0.6, t - 0.2));
      }
    }

    return minT;
  }
}

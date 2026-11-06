import * as THREE from 'three';
import { ObstacleCollider, PortalWallOpening, WorldId } from './types';

interface WorldCollisionData {
  halfWidth: number;
  halfLength: number;
  floorY: number;
  obstacles: ObstacleCollider[];
  portalOpenings: PortalWallOpening[];
}

/**
 * Handles physical collision detection for the player across multiple 3D worlds.
 * Blocks movement through ordinary walls and pillars while permitting physical passage
 * through designated portal openings.
 */
export class CollisionManager {
  private worldData: Map<WorldId, WorldCollisionData> = new Map();
  private readonly playerRadius = 0.44;

  public registerWorldBounds(
    worldId: WorldId,
    width: number,
    length: number,
    floorY = 0
  ): void {
    this.worldData.set(worldId, {
      halfWidth: width / 2 - 0.65,
      halfLength: length / 2 - 0.65,
      floorY,
      obstacles: [],
      portalOpenings: [],
    });
  }

  public addObstacle(worldId: WorldId, collider: ObstacleCollider): void {
    const data = this.worldData.get(worldId);
    if (data) {
      data.obstacles.push(collider);
    }
  }

  public addPortalOpening(worldId: WorldId, opening: PortalWallOpening): void {
    const data = this.worldData.get(worldId);
    if (data) {
      data.portalOpenings.push(opening);
    }
  }

  /**
   * Resolves player 3D position against room boundaries, portal openings, and obstacles.
   * Mutates and returns the resolved position.
   */
  public resolvePlayerPosition(
    worldId: WorldId,
    targetPos: THREE.Vector3,
    eyeHeight = 1.72
  ): THREE.Vector3 {
    const data = this.worldData.get(worldId);
    if (!data) return targetPos;

    // 1. Lock player to floor + eyeHeight (prevent falling through floor)
    targetPos.y = data.floorY + eyeHeight;

    // 2. Check if player is aligned with a portal opening on any wall
    let allowNorthPocket = false;
    let allowSouthPocket = false;
    let allowEastPocket = false;
    let allowWestPocket = false;

    for (const op of data.portalOpenings) {
      if (op.wallAxis === 'z_north') {
        if (Math.abs(targetPos.x - op.centerCoord) <= op.halfWidth - this.playerRadius * 0.5) {
          allowNorthPocket = true;
        }
      } else if (op.wallAxis === 'z_south') {
        if (Math.abs(targetPos.x - op.centerCoord) <= op.halfWidth - this.playerRadius * 0.5) {
          allowSouthPocket = true;
        }
      } else if (op.wallAxis === 'x_east') {
        if (Math.abs(targetPos.z - op.centerCoord) <= op.halfWidth - this.playerRadius * 0.5) {
          allowEastPocket = true;
        }
      } else if (op.wallAxis === 'x_west') {
        if (Math.abs(targetPos.z - op.centerCoord) <= op.halfWidth - this.playerRadius * 0.5) {
          allowWestPocket = true;
        }
      }
    }

    // 3. Enforce room wall boundaries (with portal doorway recess allowance)
    const minX = allowWestPocket ? -data.halfWidth - 1.6 : -data.halfWidth + this.playerRadius;
    const maxX = allowEastPocket ? data.halfWidth + 1.6 : data.halfWidth - this.playerRadius;
    const minZ = allowNorthPocket ? -data.halfLength - 1.8 : -data.halfLength + this.playerRadius;
    const maxZ = allowSouthPocket ? data.halfLength + 1.8 : data.halfLength - this.playerRadius;

    targetPos.x = THREE.MathUtils.clamp(targetPos.x, minX, maxX);
    targetPos.z = THREE.MathUtils.clamp(targetPos.z, minZ, maxZ);

    // 4. Resolve cylinder & AABB obstacles (pillars, relic pedestals, crystals)
    for (const obs of data.obstacles) {
      if (obs.type === 'cylinder') {
        const dx = targetPos.x - obs.x;
        const dz = targetPos.z - obs.z;
        const distSq = dx * dx + dz * dz;
        const minDist = obs.radius + this.playerRadius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          targetPos.x += (dx / dist) * overlap;
          targetPos.z += (dz / dist) * overlap;
        }
      } else if (obs.type === 'box') {
        const closestX = THREE.MathUtils.clamp(targetPos.x, obs.minX, obs.maxX);
        const closestZ = THREE.MathUtils.clamp(targetPos.z, obs.minZ, obs.maxZ);
        const dx = targetPos.x - closestX;
        const dz = targetPos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < this.playerRadius * this.playerRadius) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = this.playerRadius - dist;
          targetPos.x += (dx / dist) * overlap;
          targetPos.z += (dz / dist) * overlap;
        }
      }
    }

    return targetPos;
  }
}

import * as THREE from 'three';
import { BuiltWorldBundle, EnvironmentBuilder } from './EnvironmentBuilder';
import { ExternalAssetConfig, WorldConfig, WorldId } from './types';

/**
 * Manages multiple independent THREE.Scene instances, their configurations,
 * animated architectural props, and runtime GLB/GLTF scene additions.
 */
export class WorldManager {
  private worlds: Map<WorldId, BuiltWorldBundle> = new Map();
  private configs: Map<WorldId, WorldConfig> = new Map();
  private sceneMap: Map<WorldId, THREE.Scene> = new Map();
  private activeWorldId: WorldId;
  private builder: EnvironmentBuilder;

  constructor(
    worldConfigs: WorldConfig[],
    builder: EnvironmentBuilder,
    envMap: THREE.Texture
  ) {
    this.builder = builder;
    this.activeWorldId = worldConfigs[0]?.id || 'world_01';

    for (const cfg of worldConfigs) {
      this.configs.set(cfg.id, cfg);
      const bundle = this.builder.buildWorld(cfg, envMap);
      this.worlds.set(cfg.id, bundle);
      this.sceneMap.set(cfg.id, bundle.scene);
    }
  }

  public getActiveWorldId(): WorldId {
    return this.activeWorldId;
  }

  public setActiveWorldId(worldId: WorldId): void {
    if (this.worlds.has(worldId)) {
      this.activeWorldId = worldId;
    }
  }

  public getActiveScene(): THREE.Scene {
    return this.sceneMap.get(this.activeWorldId)!;
  }

  public getScene(worldId: WorldId): THREE.Scene | undefined {
    return this.sceneMap.get(worldId);
  }

  public getSceneMap(): Map<WorldId, THREE.Scene> {
    return this.sceneMap;
  }

  public getWorldConfig(worldId: WorldId): WorldConfig | undefined {
    return this.configs.get(worldId);
  }

  public getAllWorldConfigs(): WorldConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Updates animated architectural relics, celestial rings, and ambient particles
   * in ALL worlds so that looking through a portal always displays live, moving
   * 3D geometry in the destination dimension.
   */
  public update(delta: number, elapsedTime: number): void {
    const dt = Math.min(delta, 0.05);

    for (const bundle of this.worlds.values()) {
      bundle.ambientParticles.update(dt, elapsedTime);

      for (const prop of bundle.animatedProps) {
        if (!prop.object) continue;

        if (prop.type === 'rotate_y') {
          prop.object.rotation.y += prop.speed * dt;
        } else if (prop.type === 'rotate_xyz') {
          prop.object.rotation.y += prop.speed * dt;
          prop.object.rotation.x += prop.speed * 0.45 * dt;
        } else if (prop.type === 'bob_and_rotate') {
          prop.object.rotation.y += prop.speed * dt;
          if (prop.baseY !== undefined) {
            const amp = prop.amplitude ?? 0.15;
            const phase = prop.phase ?? 0;
            prop.object.position.y =
              prop.baseY + Math.sin(elapsedTime * 2.2 + phase) * amp;
          }
        }
      }
    }
  }

  /**
   * Dynamically imports a GLB/GLTF 3D model into the specified world scene.
   */
  public importExternalModelIntoWorld(
    worldId: WorldId,
    assetConfig: ExternalAssetConfig,
    onSuccess?: () => void,
    onError?: (err: unknown) => void
  ): void {
    const scene = this.sceneMap.get(worldId);
    if (!scene) return;

    this.builder.loadExternalAsset(
      scene,
      worldId,
      assetConfig,
      () => onSuccess?.(),
      (err) => onError?.(err)
    );
  }
}

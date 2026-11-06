import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CollisionManager } from './CollisionManager';
import { DEFAULT_PORTAL_ENGINE_CONFIG, PORTAL_STYLES } from './defaultConfig';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { PlayerController } from './PlayerController';
import { PortalManager, TraversalResult } from './PortalManager';
import { PortalRenderer } from './PortalRenderer';
import { ProceduralTextures } from './ProceduralTextures';
import { SoundEffects } from './SoundEffects';
import { EngineTelemetry, PortalEngineConfig, WorldId } from './types';
import { WorldManager } from './WorldManager';

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Main Reusable 3D Connecting Portal Engine.
 * Coordinates WorldManager, PortalManager, PortalRenderer, PlayerController,
 * CollisionManager, and EnvironmentBuilder.
 */
export class PortalEngine {
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  public worldManager: WorldManager;
  public portalManager: PortalManager;
  public portalRenderer: PortalRenderer;
  public playerController: PlayerController;
  public collisionManager: CollisionManager;
  public soundEffects: SoundEffects;
  public config: PortalEngineConfig;
  public isSoftwareGl: boolean;

  private container: HTMLElement;
  private clock: THREE.Clock;
  private frameId = 0;
  private isDisposed = false;
  private traversalCount = 0;
  private fps = 60;
  private frameCounter = 0;
  private lastFpsUpdate = 0;

  private onTelemetryCallback?: (telemetry: EngineTelemetry) => void;
  private onTraversalCallback?: (result: TraversalResult) => void;

  constructor(
    container: HTMLElement,
    config: PortalEngineConfig = DEFAULT_PORTAL_ENGINE_CONFIG,
    onTelemetry?: (telemetry: EngineTelemetry) => void,
    onTraversal?: (result: TraversalResult) => void
  ) {
    this.container = container;
    this.config = config;
    this.onTelemetryCallback = onTelemetry;
    this.onTraversalCallback = onTraversal;

    this.isSoftwareGl = detectSoftwareWebGL();

    // 1. Initialize WebGLRenderer with ACES Filmic Tone Mapping & SRGB Color Space
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear container and mount canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(this.renderer.domElement);

    // 2. Generate Studio PMREM Environment Map for PBR metallic/crystal reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Initialize Camera
    const aspect =
      (container.clientWidth || window.innerWidth) /
      (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 120);

    // 4. Initialize Sub-Managers
    const proceduralTextures = new ProceduralTextures(this.renderer);
    const sparkTexture = proceduralTextures.createSparkParticleTexture();
    this.collisionManager = new CollisionManager();
    this.soundEffects = new SoundEffects();

    const envBuilder = new EnvironmentBuilder(
      proceduralTextures,
      this.collisionManager,
      sparkTexture,
      this.isSoftwareGl
    );

    this.worldManager = new WorldManager(
      this.config.worlds,
      envBuilder,
      envMap
    );

    this.portalRenderer = new PortalRenderer(this.renderer, this.isSoftwareGl);
    this.portalManager = new PortalManager(
      this.portalRenderer,
      proceduralTextures,
      this.collisionManager,
      sparkTexture,
      this.isSoftwareGl
    );

    this.portalManager.buildConnections(
      this.config.connections,
      this.config.styles,
      this.worldManager.getSceneMap()
    );

    const initialWorld = this.config.worlds[0];
    this.playerController = new PlayerController(
      this.camera,
      this.renderer.domElement,
      this.collisionManager,
      initialWorld.spawnPoint,
      initialWorld.spawnYaw
    );

    // Pre-warm shaders on hardware GPUs
    if (!this.isSoftwareGl) {
      for (const scene of this.worldManager.getSceneMap().values()) {
        this.renderer.compile(scene, this.camera);
      }
    }

    this.clock = new THREE.Clock();
    window.addEventListener('resize', this.onResize);

    // Start main render loop
    this.tick();
  }

  private onResize = (): void => {
    if (this.isDisposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.portalRenderer.resizeRenderTargets(this.portalManager.getEndpoints());
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tick = (): void => {
    if (this.isDisposed) return;

    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.16);
    const elapsed = this.clock.getElapsedTime();

    const activeWorldId = this.worldManager.getActiveWorldId();

    // 1. Update First-Person Player Movement & Collision
    this.playerController.update(delta, activeWorldId);

    // 2. Check Physical Portal Crossing Plane
    const traversal = this.portalManager.checkPlayerPortalTraversal(
      activeWorldId,
      this.playerController.previousPosition,
      this.playerController.position,
      this.playerController.yaw,
      this.playerController.velocity
    );

    if (traversal && traversal.traversed) {
      this.traversalCount++;
      this.worldManager.setActiveWorldId(traversal.toWorldId);
      this.playerController.setTeleportState(
        traversal.newPosition,
        traversal.newYaw
      );
      this.soundEffects.playPortalTraversalWhoosh();
      this.onTraversalCallback?.(traversal);
    }

    const currentWorldId = this.worldManager.getActiveWorldId();

    // 3. Update Animated Relics, Crystals, Particles, and Portal Rings in All Worlds
    this.worldManager.update(delta, elapsed);
    this.portalManager.update(delta, elapsed);

    // 4. Render Live Connected Destination World(s) into Portal WebGLRenderTargets
    this.portalRenderer.renderActiveWorldPortals(
      currentWorldId,
      this.camera,
      this.portalManager.getEndpoints(),
      this.worldManager.getSceneMap()
    );

    // 5. Render Active World Scene to Main Screen
    const activeScene = this.worldManager.getActiveScene();
    this.renderer.render(activeScene, this.camera);

    // 6. Update Telemetry at ~6Hz
    this.frameCounter++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 180) {
      this.fps = Math.min(
        144,
        Math.round((this.frameCounter * 1000) / Math.max(1, now - this.lastFpsUpdate))
      );
      this.frameCounter = 0;
      this.lastFpsUpdate = now;
      this.emitTelemetry(currentWorldId);
    }

    // 7. Schedule next frame (software WebGL safe pacing)
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private emitTelemetry(currentWorldId: WorldId): void {
    if (!this.onTelemetryCallback) return;

    const currentConfig = this.worldManager.getWorldConfig(currentWorldId);
    const nearest = this.portalManager.getNearestPortalDistance(
      currentWorldId,
      this.playerController.position
    );
    const connectedConfig = nearest.targetWorldId
      ? this.worldManager.getWorldConfig(nearest.targetWorldId)
      : undefined;

    this.onTelemetryCallback({
      activeWorldId: currentWorldId,
      activeWorldName: currentConfig?.name || 'Mystic Sanctum',
      activeWorldSubtitle: currentConfig?.subtitle || '',
      connectedWorldName: connectedConfig?.name || 'Astral Dimension',
      playerPosition: {
        x: Number(this.playerController.position.x.toFixed(1)),
        y: Number(this.playerController.position.y.toFixed(1)),
        z: Number(this.playerController.position.z.toFixed(1)),
      },
      playerYaw: this.playerController.yaw,
      distanceToNearestPortal: Number(nearest.distance.toFixed(1)),
      traversalCount: this.traversalCount,
      isPointerLocked: this.playerController.isPointerLocked,
      isSoftwareGl: this.isSoftwareGl,
      fps: this.fps,
    });
  }

  public enterExperience(): void {
    this.playerController.requestPointerLock();
  }

  public walkThroughActivePortal(): void {
    const activeWorldId = this.worldManager.getActiveWorldId();
    for (const ep of this.portalManager.getEndpoints()) {
      if (ep.worldId === activeWorldId) {
        // Determine inward Z direction into the portal
        const inwardSign = ep.group.position.z < 0 ? -1 : 1;
        this.playerController.startAutoWalkThroughPortal(
          ep.group.position,
          inwardSign
        );
        break;
      }
    }
  }

  public resetToWorldSpawn(worldId?: WorldId): void {
    const targetId = worldId || this.worldManager.getActiveWorldId();
    const cfg = this.worldManager.getWorldConfig(targetId);
    if (!cfg) return;

    this.worldManager.setActiveWorldId(targetId);
    this.playerController.setTeleportState(
      new THREE.Vector3(cfg.spawnPoint.x, cfg.spawnPoint.y, cfg.spawnPoint.z),
      cfg.spawnYaw
    );
    this.emitTelemetry(targetId);
  }

  public setPortalStyleById(styleId: string): void {
    const style = PORTAL_STYLES[styleId];
    if (style) {
      this.portalManager.setPortalStyle(style);
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    this.playerController.dispose();
    for (const ep of this.portalManager.getEndpoints()) {
      ep.renderTarget.dispose();
    }
    this.renderer.dispose();
  }
}

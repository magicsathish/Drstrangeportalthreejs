import * as THREE from 'three';
import { CollisionManager } from './CollisionManager';
import { PortalParticleSystem } from './ParticleSystem';
import { PortalRenderer } from './PortalRenderer';
import {
  createEldritchRingMaterial,
  createPortalSurfaceMaterial,
} from './PortalShader';
import { ProceduralTextures } from './ProceduralTextures';
import {
  PortalConnectionConfig,
  PortalInstanceEndpoint,
  PortalStyleConfig,
  PortalTransformConfig,
  WorldId,
} from './types';

// Pre-allocated math objects for physical traversal calculations
const _localPrev = new THREE.Vector3();
const _localCurr = new THREE.Vector3();
const _invSrcMat = new THREE.Matrix4();
const _flipYMat = new THREE.Matrix4().makeRotationY(Math.PI);
const _transferMat = new THREE.Matrix4();
const _newWorldPos = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();
const _destNormal = new THREE.Vector3();
const _destQuat = new THREE.Quaternion();

export interface TraversalResult {
  traversed: boolean;
  fromWorldId: WorldId;
  toWorldId: WorldId;
  newPosition: THREE.Vector3;
  newYaw: number;
  portalId: string;
}

/**
 * Manages the creation, animation, style customization, and physical player traversal
 * of all magical portals across connected 3D worlds.
 */
export class PortalManager {
  private endpoints: PortalInstanceEndpoint[] = [];
  private particleSystems: Map<string, PortalParticleSystem> = new Map();
  private ringMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private portalRenderer: PortalRenderer;
  private textures: ProceduralTextures;
  private collisionManager: CollisionManager;
  private sparkTexture: THREE.CanvasTexture;
  private isSoftwareGl: boolean;
  private lastTraversalTime = 0;
  private readonly traversalCooldownMs = 280;

  constructor(
    portalRenderer: PortalRenderer,
    textures: ProceduralTextures,
    collisionManager: CollisionManager,
    sparkTexture: THREE.CanvasTexture,
    isSoftwareGl: boolean
  ) {
    this.portalRenderer = portalRenderer;
    this.textures = textures;
    this.collisionManager = collisionManager;
    this.sparkTexture = sparkTexture;
    this.isSoftwareGl = isSoftwareGl;
  }

  public getEndpoints(): PortalInstanceEndpoint[] {
    return this.endpoints;
  }

  public buildConnections(
    connections: PortalConnectionConfig[],
    styles: Record<string, PortalStyleConfig>,
    worldScenes: Map<WorldId, THREE.Scene>
  ): void {
    for (const conn of connections) {
      const style = styles[conn.styleId] || Object.values(styles)[0];

      const sourceScene = worldScenes.get(conn.sourceWorldId);
      const destScene = worldScenes.get(conn.destinationWorldId);
      if (!sourceScene || !destScene) continue;

      const sourceEndpoint = this.createPortalEndpoint(
        `${conn.id}_src`,
        conn.id,
        conn.sourceWorldId,
        conn.destinationWorldId,
        conn.sourceTransform,
        style
      );

      const destEndpoint = this.createPortalEndpoint(
        `${conn.id}_dst`,
        conn.id,
        conn.destinationWorldId,
        conn.sourceWorldId,
        conn.destinationTransform,
        style
      );

      // Link bidirectional partner endpoints
      sourceEndpoint.partnerEndpoint = destEndpoint;
      if (conn.bidirectional) {
        destEndpoint.partnerEndpoint = sourceEndpoint;
      }

      sourceScene.add(sourceEndpoint.group);
      destScene.add(destEndpoint.group);

      this.endpoints.push(sourceEndpoint, destEndpoint);

      // Register wall openings in CollisionManager so the player can walk physically through the portal plane
      this.registerWallOpeningForPortal(conn.sourceWorldId, conn.sourceTransform);
      this.registerWallOpeningForPortal(conn.destinationWorldId, conn.destinationTransform);
    }
  }

  private registerWallOpeningForPortal(
    worldId: WorldId,
    transform: PortalTransformConfig
  ): void {
    const { position, radius } = transform;
    const walkableHalfWidth = radius * 0.82;

    if (position.z < -8) {
      this.collisionManager.addPortalOpening(worldId, {
        wallAxis: 'z_north',
        centerCoord: position.x,
        halfWidth: walkableHalfWidth,
        portalDepthAllowance: 2.0,
      });
    } else if (position.z > 8) {
      this.collisionManager.addPortalOpening(worldId, {
        wallAxis: 'z_south',
        centerCoord: position.x,
        halfWidth: walkableHalfWidth,
        portalDepthAllowance: 2.0,
      });
    } else if (position.x > 8) {
      this.collisionManager.addPortalOpening(worldId, {
        wallAxis: 'x_east',
        centerCoord: position.z,
        halfWidth: walkableHalfWidth,
        portalDepthAllowance: 2.0,
      });
    } else if (position.x < -8) {
      this.collisionManager.addPortalOpening(worldId, {
        wallAxis: 'x_west',
        centerCoord: position.z,
        halfWidth: walkableHalfWidth,
        portalDepthAllowance: 2.0,
      });
    }
  }

  private createPortalEndpoint(
    endpointId: string,
    connectionId: string,
    worldId: WorldId,
    targetWorldId: WorldId,
    transform: PortalTransformConfig,
    style: PortalStyleConfig
  ): PortalInstanceEndpoint {
    const group = new THREE.Group();
    group.position.set(transform.position.x, transform.position.y, transform.position.z);
    group.rotation.y = transform.rotationY;

    // Exact portal plane reference frame (normal = +Z local)
    const portalFrameObject = new THREE.Object3D();
    group.add(portalFrameObject);

    const renderTarget = this.portalRenderer.createPortalRenderTarget();
    const radius = transform.radius;

    // 1. Live Destination Viewport Disc (Circular Opening)
    const surfaceGeometry = new THREE.CircleGeometry(radius, 64);
    const surfaceMaterial = createPortalSurfaceMaterial(
      renderTarget.texture,
      style
    );
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surfaceMesh.position.z = 0.01;
    group.add(surfaceMesh);

    // 2. Primary Molten Eldritch Energy Ring (Custom GLSL Shader)
    const ringPlaneGeo = new THREE.PlaneGeometry(radius * 2.55, radius * 2.55);
    const ringMaterial = createEldritchRingMaterial(style);
    const innerRingMesh = new THREE.Mesh(ringPlaneGeo, ringMaterial);
    innerRingMesh.position.z = 0.04;
    group.add(innerRingMesh);
    this.ringMaterials.set(endpointId, ringMaterial);

    // 3. Counter-Rotating Doctor Strange Sacred Geometry Mandala Rings
    const mandalaTex = this.textures.createEldritchMandalaTexture(
      style.primaryColor,
      style.coreHotColor
    );
    const mandalaMat = new THREE.MeshBasicMaterial({
      map: mandalaTex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const outerMandalaMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.48, radius * 2.48),
      mandalaMat
    );
    outerMandalaMesh.position.z = 0.07;
    group.add(outerMandalaMesh);

    const secondaryMandalaMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.28, radius * 2.28),
      mandalaMat.clone()
    );
    secondaryMandalaMesh.position.z = -0.05;
    group.add(secondaryMandalaMesh);

    // 4. Glowing 3D Molten Core Rim Torus
    const coreRimMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(style.coreHotColor),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const coreTorus = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.97, 0.055, 16, 72),
      coreRimMat
    );
    coreTorus.position.z = 0.03;
    group.add(coreTorus);

    // 5. Tangential Flying Sparks & Embers Particle System
    const particleSystem = new PortalParticleSystem(
      radius * 0.98,
      style,
      this.sparkTexture,
      this.isSoftwareGl ? 180 : 360
    );
    particleSystem.points.position.z = 0.08;
    group.add(particleSystem.points);
    this.particleSystems.set(endpointId, particleSystem);

    // 6. Dynamic Light Emission onto the surrounding hall floor & walls
    const portalLight = new THREE.PointLight(
      style.lightColor,
      style.lightIntensity,
      18,
      1.35
    );
    portalLight.position.set(0, 0, 1.35);
    group.add(portalLight);

    // Glowing floor reflection pool directly underneath the portal ring
    const floorGlowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(style.primaryColor),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const floorGlowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.4, 2.6),
      floorGlowMat
    );
    floorGlowMesh.rotation.x = -Math.PI / 2;
    floorGlowMesh.position.set(0, -transform.position.y + 0.03, 0.9);
    group.add(floorGlowMesh);

    return {
      id: endpointId,
      connectionId,
      worldId,
      targetWorldId,
      group,
      portalFrameObject,
      surfaceMesh,
      surfaceMaterial,
      innerRingMesh,
      outerMandalaMesh,
      secondaryMandalaMesh,
      portalLight,
      renderTarget,
      radius,
      width: transform.width,
      height: transform.height,
      style,
    };
  }

  /**
   * Updates portal shader uniforms, rotating mandala rings, dynamic light flicker,
   * and tangential spark particle physics every frame.
   */
  public update(delta: number, elapsedTime: number): void {
    for (const ep of this.endpoints) {
      ep.surfaceMaterial.uniforms.uTime.value = elapsedTime;

      const ringMat = this.ringMaterials.get(ep.id);
      if (ringMat) {
        ringMat.uniforms.uTime.value = elapsedTime;
      }

      // Rotate inner and outer eldritch rings
      ep.innerRingMesh.rotation.z = elapsedTime * 1.45 * ep.style.sparkSpeedMultiplier;
      ep.outerMandalaMesh.rotation.z = elapsedTime * 0.65 * ep.style.sparkSpeedMultiplier;
      ep.secondaryMandalaMesh.rotation.z = -elapsedTime * 0.48 * ep.style.sparkSpeedMultiplier;

      // Subtle dynamic firelight flicker
      const flicker =
        1.0 +
        Math.sin(elapsedTime * 17.0) * 0.06 +
        Math.cos(elapsedTime * 29.0) * 0.04;
      ep.portalLight.intensity = ep.style.lightIntensity * flicker;

      const ps = this.particleSystems.get(ep.id);
      if (ps) {
        ps.update(delta);
      }
    }
  }

  /**
   * Dynamically switches the visual style of all portals at runtime.
   */
  public setPortalStyle(style: PortalStyleConfig): void {
    for (const ep of this.endpoints) {
      ep.style = style;
      ep.surfaceMaterial.uniforms.uPrimaryColor.value.set(style.primaryColor);
      ep.surfaceMaterial.uniforms.uSecondaryColor.value.set(style.secondaryColor);
      ep.surfaceMaterial.uniforms.uCoreHotColor.value.set(style.coreHotColor);
      ep.surfaceMaterial.uniforms.uDistortionStrength.value = style.distortionStrength;

      const ringMat = this.ringMaterials.get(ep.id);
      if (ringMat) {
        ringMat.uniforms.uPrimaryColor.value.set(style.primaryColor);
        ringMat.uniforms.uSecondaryColor.value.set(style.secondaryColor);
        ringMat.uniforms.uCoreHotColor.value.set(style.coreHotColor);
      }

      ep.portalLight.color.set(style.lightColor);
      ep.portalLight.intensity = style.lightIntensity;

      const ps = this.particleSystems.get(ep.id);
      if (ps) {
        ps.updateStyle(style);
      }
    }
  }

  /**
   * Checks if the player has physically crossed the doorway plane of any portal in the active world.
   * Preserves relative position, camera yaw direction, and velocity smoothly across worlds.
   */
  public checkPlayerPortalTraversal(
    activeWorldId: WorldId,
    prevWorldPos: THREE.Vector3,
    currWorldPos: THREE.Vector3,
    currentYaw: number,
    playerVelocity: THREE.Vector3
  ): TraversalResult | null {
    const now = performance.now();
    if (now - this.lastTraversalTime < this.traversalCooldownMs) {
      return null;
    }

    for (const srcPortal of this.endpoints) {
      if (srcPortal.worldId !== activeWorldId) continue;
      const dstPortal = srcPortal.partnerEndpoint;
      if (!dstPortal) continue;

      srcPortal.portalFrameObject.updateMatrixWorld(true);
      dstPortal.portalFrameObject.updateMatrixWorld(true);

      // Convert previous and current player positions into sourcePortal local coordinates
      _localPrev.copy(prevWorldPos);
      _localCurr.copy(currWorldPos);
      srcPortal.portalFrameObject.worldToLocal(_localPrev);
      srcPortal.portalFrameObject.worldToLocal(_localCurr);

      // Check if player crossed the portal plane from front (z > 0) to back (z <= 0.12)
      // while moving inward (localCurr.z < localPrev.z) and inside the circular opening
      const crossedPlane =
        _localPrev.z > 0.08 &&
        _localCurr.z <= 0.12 &&
        _localCurr.z < _localPrev.z;

      const withinOpeningWidth = Math.abs(_localCurr.x) <= srcPortal.radius * 0.82;
      const withinOpeningHeight = Math.abs(_localCurr.y) <= srcPortal.radius * 0.95;

      if (crossedPlane && withinOpeningWidth && withinOpeningHeight) {
        this.lastTraversalTime = now;

        // Compute full 3D portal coordinate transformation:
        // M_transfer = M_dst * R_y(PI) * inv(M_src)
        _invSrcMat.copy(srcPortal.portalFrameObject.matrixWorld).invert();
        _transferMat
          .copy(dstPortal.portalFrameObject.matrixWorld)
          .multiply(_flipYMat)
          .multiply(_invSrcMat);

        // 1. Transform player position to destination portal and step slightly forward (+0.32m)
        // along destination portal's outward normal to prevent re-triggering
        _newWorldPos.copy(currWorldPos).applyMatrix4(_transferMat);

        dstPortal.portalFrameObject.getWorldQuaternion(_destQuat);
        _destNormal.set(0, 0, 1).applyQuaternion(_destQuat).normalize();
        _newWorldPos.addScaledVector(_destNormal, 0.32);

        // 2. Transform player viewing direction (yaw)
        _forwardVec.set(-Math.sin(currentYaw), 0, -Math.cos(currentYaw));
        _forwardVec.transformDirection(_transferMat).normalize();
        const newYaw = Math.atan2(-_forwardVec.x, -_forwardVec.z);

        // 3. Transform player velocity vector so momentum is preserved seamlessly
        playerVelocity.transformDirection(_transferMat);

        return {
          traversed: true,
          fromWorldId: srcPortal.worldId,
          toWorldId: srcPortal.targetWorldId,
          newPosition: _newWorldPos.clone(),
          newYaw,
          portalId: srcPortal.connectionId,
        };
      }
    }

    return null;
  }

  public getNearestPortalDistance(
    activeWorldId: WorldId,
    playerPos: THREE.Vector3
  ): { distance: number; targetWorldId: WorldId | null } {
    let minDist = Infinity;
    let targetWorldId: WorldId | null = null;

    for (const ep of this.endpoints) {
      if (ep.worldId !== activeWorldId) continue;
      const dx = playerPos.x - ep.group.position.x;
      const dz = playerPos.z - ep.group.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) {
        minDist = d;
        targetWorldId = ep.targetWorldId;
      }
    }

    return { distance: minDist, targetWorldId };
  }
}

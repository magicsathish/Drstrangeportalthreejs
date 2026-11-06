import * as THREE from 'three';
import { PortalInstanceEndpoint, WorldId } from './types';

// Pre-allocated math objects at module scope (zero GC in render loop)
const _invSourceMatrix = new THREE.Matrix4();
const _flipY180Matrix = new THREE.Matrix4().makeRotationY(Math.PI);
const _virtualCamMatrix = new THREE.Matrix4();
const _destNormal = new THREE.Vector3();
const _destPos = new THREE.Vector3();
const _destQuat = new THREE.Quaternion();
const _clipPoint = new THREE.Vector3();
const _clipPlane = new THREE.Plane();

/**
 * Real-time Portal Rendering Engine.
 * Transforms a virtual PerspectiveCamera into the destination world's coordinate space
 * relative to the linked portal pair, clips geometry behind the destination portal plane,
 * and renders the live destination THREE.Scene into the source portal's WebGLRenderTarget.
 */
export class PortalRenderer {
  private renderer: THREE.WebGLRenderer;
  private virtualCamera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;

  constructor(renderer: THREE.WebGLRenderer, isSoftwareGl: boolean) {
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.virtualCamera = new THREE.PerspectiveCamera(70, 1, 0.1, 140);
    this.virtualCamera.matrixAutoUpdate = false;
  }

  public createPortalRenderTarget(): THREE.WebGLRenderTarget {
    const scale = this.isSoftwareGl ? 0.65 : Math.min(window.devicePixelRatio, 1.5);
    const width = Math.max(512, Math.floor(window.innerWidth * scale));
    const height = Math.max(512, Math.floor(window.innerHeight * scale));

    const rt = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    return rt;
  }

  public resizeRenderTargets(portals: PortalInstanceEndpoint[]): void {
    const scale = this.isSoftwareGl ? 0.65 : Math.min(window.devicePixelRatio, 1.5);
    const width = Math.max(512, Math.floor(window.innerWidth * scale));
    const height = Math.max(512, Math.floor(window.innerHeight * scale));

    for (const p of portals) {
      p.renderTarget.setSize(width, height);
    }
  }

  /**
   * Updates all visible portals in the active world by rendering their connected
   * destination scenes from the transformed virtual camera perspective.
   */
  public renderActiveWorldPortals(
    activeWorldId: WorldId,
    playerCamera: THREE.PerspectiveCamera,
    portals: PortalInstanceEndpoint[],
    worldScenes: Map<WorldId, THREE.Scene>
  ): void {
    playerCamera.updateMatrixWorld(true);

    const prevRenderTarget = this.renderer.getRenderTarget();
    const prevClippingPlanes = this.renderer.clippingPlanes;
    const prevLocalClipping = this.renderer.localClippingEnabled;

    this.renderer.localClippingEnabled = true;

    for (const sourcePortal of portals) {
      if (sourcePortal.worldId !== activeWorldId) continue;
      const destPortal = sourcePortal.partnerEndpoint;
      if (!destPortal) continue;

      const destScene = worldScenes.get(sourcePortal.targetWorldId);
      if (!destScene) continue;

      sourcePortal.portalFrameObject.updateMatrixWorld(true);
      destPortal.portalFrameObject.updateMatrixWorld(true);

      // 1. Compute Virtual Camera World Matrix:
      // M_virtual = M_dest * R_y(180deg) * inv(M_source) * M_playerCam
      _invSourceMatrix.copy(sourcePortal.portalFrameObject.matrixWorld).invert();

      _virtualCamMatrix
        .copy(destPortal.portalFrameObject.matrixWorld)
        .multiply(_flipY180Matrix)
        .multiply(_invSourceMatrix)
        .multiply(playerCamera.matrixWorld);

      this.virtualCamera.matrixWorld.copy(_virtualCamMatrix);
      this.virtualCamera.matrixWorldInverse.copy(_virtualCamMatrix).invert();
      this.virtualCamera.projectionMatrix.copy(playerCamera.projectionMatrix);
      this.virtualCamera.projectionMatrixInverse.copy(playerCamera.projectionMatrixInverse);

      // 2. Configure Destination Portal Clipping Plane so the wall behind the destination
      // portal never blocks the virtual camera when looking from afar.
      destPortal.portalFrameObject.getWorldPosition(_destPos);
      destPortal.portalFrameObject.getWorldQuaternion(_destQuat);
      _destNormal.set(0, 0, 1).applyQuaternion(_destQuat).normalize();

      // Clip at +0.02m in front of destination portal frame so the back wall is completely removed
      // and the entire destination hall interior is visible.
      _clipPoint.copy(_destPos).addScaledVector(_destNormal, 0.02);
      _clipPlane.setFromNormalAndCoplanarPoint(_destNormal, _clipPoint);
      this.renderer.clippingPlanes = [_clipPlane];

      // 3. Prevent infinite recursion by hiding the destination portal's inner surface during this pass
      // and reduce fog attenuation caused by virtual camera distance behind the portal plane
      const prevDestSurfaceVisible = destPortal.surfaceMesh.visible;
      destPortal.surfaceMesh.visible = false;

      const expFog = destScene.fog as THREE.FogExp2 | null;
      const prevFogDensity = expFog ? expFog.density : 0;
      if (expFog) {
        expFog.density = prevFogDensity * 0.35;
      }

      // 4. Render Destination World into Source Portal's WebGLRenderTarget
      this.renderer.setRenderTarget(sourcePortal.renderTarget);
      this.renderer.clear(true, true, false);
      this.renderer.render(destScene, this.virtualCamera);

      if (expFog) {
        expFog.density = prevFogDensity;
      }
      destPortal.surfaceMesh.visible = prevDestSurfaceVisible;
    }

    // Restore renderer state for main screen pass
    this.renderer.clippingPlanes = prevClippingPlanes;
    this.renderer.localClippingEnabled = prevLocalClipping;
    this.renderer.setRenderTarget(prevRenderTarget);
  }
}

import * as THREE from 'three';

export type WorldId = string;
export type PortalId = string;

export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface PortalStyleConfig {
  id: string;
  name: string;
  primaryColor: string;     // Main ring & spark core color (e.g. #ff9d1a)
  secondaryColor: string;   // Outer ember / plasma glow (e.g. #ff4500)
  coreHotColor: string;     // White-hot inner rim (e.g. #fff4cc)
  lightColor: string;       // Dynamic PointLight color
  lightIntensity: number;
  sparkSpeedMultiplier: number;
  distortionStrength: number;
}

export interface ExternalAssetConfig {
  id: string;
  url: string;
  format: 'glb' | 'gltf';
  position: Vector3Tuple;
  rotationY: number;
  scale: number;
  autoGenerateBoundsCollider?: boolean;
}

export interface WorldConfig {
  id: WorldId;
  name: string;
  subtitle: string;
  description: string;
  themeType: 'mystic_sanctum' | 'astral_dimension' | 'custom_imported';
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  spawnPoint: Vector3Tuple;
  spawnYaw: number; // Radians
  fogColor: string;
  fogDensity: number;
  backgroundColor: string;
  ambientLightColor: string;
  ambientLightIntensity: number;
  externalAssets?: ExternalAssetConfig[];
}

export interface PortalTransformConfig {
  position: Vector3Tuple;
  rotationY: number; // Facing normal in radians (0 = +Z, Math.PI = -Z, Math.PI/2 = +X, -Math.PI/2 = -X)
  width: number;     // Total width in meters (recommended 4.5 - 5.2m)
  height: number;    // Total height in meters (recommended 5.0 - 5.6m)
  radius: number;    // Circular opening radius in meters (e.g. 2.45m)
}

export interface PortalConnectionConfig {
  id: PortalId;
  name: string;
  sourceWorldId: WorldId;
  destinationWorldId: WorldId;
  bidirectional: boolean;
  styleId: string;
  sourceTransform: PortalTransformConfig;
  destinationTransform: PortalTransformConfig;
}

export interface PortalEngineConfig {
  version: string;
  projectTitle: string;
  worlds: WorldConfig[];
  styles: Record<string, PortalStyleConfig>;
  connections: PortalConnectionConfig[];
}

export interface CylinderCollider {
  type: 'cylinder';
  x: number;
  z: number;
  radius: number;
  label?: string;
}

export interface BoxCollider {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export interface PortalWallOpening {
  wallAxis: 'z_north' | 'z_south' | 'x_east' | 'x_west';
  centerCoord: number;
  halfWidth: number;
  portalDepthAllowance: number;
}

export type ObstacleCollider = CylinderCollider | BoxCollider;

export interface PortalInstanceEndpoint {
  id: string;
  connectionId: string;
  worldId: WorldId;
  targetWorldId: WorldId;
  group: THREE.Group;
  portalFrameObject: THREE.Object3D; // Exact center & orientation of the portal plane (normal = +Z local)
  surfaceMesh: THREE.Mesh;
  surfaceMaterial: THREE.ShaderMaterial;
  innerRingMesh: THREE.Mesh;
  outerMandalaMesh: THREE.Mesh;
  secondaryMandalaMesh: THREE.Mesh;
  portalLight: THREE.PointLight;
  renderTarget: THREE.WebGLRenderTarget;
  radius: number;
  width: number;
  height: number;
  style: PortalStyleConfig;
  partnerEndpoint?: PortalInstanceEndpoint;
}

export interface EngineTelemetry {
  activeWorldId: WorldId;
  activeWorldName: string;
  activeWorldSubtitle: string;
  connectedWorldName: string;
  playerPosition: Vector3Tuple;
  playerYaw: number;
  distanceToNearestPortal: number;
  traversalCount: number;
  isPointerLocked: boolean;
  isSoftwareGl: boolean;
  fps: number;
}

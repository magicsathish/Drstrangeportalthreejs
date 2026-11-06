import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CollisionManager } from './CollisionManager';
import { WorldAmbientParticles } from './ParticleSystem';
import { ProceduralTextures } from './ProceduralTextures';
import { ExternalAssetConfig, WorldConfig } from './types';

export interface AnimatedWorldProp {
  object: THREE.Object3D;
  type: 'rotate_y' | 'rotate_xyz' | 'bob_and_rotate' | 'pulse_light';
  speed: number;
  baseY?: number;
  amplitude?: number;
  phase?: number;
}

export interface BuiltWorldBundle {
  scene: THREE.Scene;
  animatedProps: AnimatedWorldProp[];
  ambientParticles: WorldAmbientParticles;
}

/**
 * Constructs rich, multi-part procedural 3D architectural environments for
 * World 01 (Mystic Sanctum) and World 02 (Astral Dimension), plus supports
 * loading external GLB/GLTF 3D environment models.
 */
export class EnvironmentBuilder {
  private textures: ProceduralTextures;
  private collisionManager: CollisionManager;
  private gltfLoader: GLTFLoader;
  private sparkTexture: THREE.CanvasTexture;
  private isSoftwareGl: boolean;

  constructor(
    textures: ProceduralTextures,
    collisionManager: CollisionManager,
    sparkTexture: THREE.CanvasTexture,
    isSoftwareGl: boolean
  ) {
    this.textures = textures;
    this.collisionManager = collisionManager;
    this.sparkTexture = sparkTexture;
    this.isSoftwareGl = isSoftwareGl;
    this.gltfLoader = new GLTFLoader();
  }

  public buildWorld(
    config: WorldConfig,
    envMap: THREE.Texture
  ): BuiltWorldBundle {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor);
    scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    scene.environment = envMap;

    this.collisionManager.registerWorldBounds(
      config.id,
      config.dimensions.width,
      config.dimensions.length,
      0
    );

    const animatedProps: AnimatedWorldProp[] = [];

    if (config.themeType === 'mystic_sanctum') {
      this.buildMysticSanctum(scene, config, animatedProps);
    } else if (config.themeType === 'astral_dimension') {
      this.buildAstralDimension(scene, config, animatedProps);
    } else {
      this.buildMysticSanctum(scene, config, animatedProps);
    }

    // Load any configured external GLB/GLTF assets
    if (config.externalAssets && config.externalAssets.length > 0) {
      for (const asset of config.externalAssets) {
        this.loadExternalAsset(scene, config.id, asset);
      }
    }

    const ambientParticles =
      config.themeType === 'mystic_sanctum'
        ? new WorldAmbientParticles(
            config.dimensions,
            '#fbbf24',
            '#38bdf8',
            this.sparkTexture,
            this.isSoftwareGl ? 110 : 220
          )
        : new WorldAmbientParticles(
            config.dimensions,
            '#e879f9',
            '#38bdf8',
            this.sparkTexture,
            this.isSoftwareGl ? 130 : 250
          );

    scene.add(ambientParticles.points);

    return {
      scene,
      animatedProps,
      ambientParticles,
    };
  }

  /**
   * Builds WORLD 01: MYSTIC SANCTUM
   * Ancient Kamar-Taj / Sanctum Sanctorum hall with dark slate stone floor, brass astrolabe inlays,
   * 8 composite pillars with floating mystic braziers, vaulted ceiling, and Seal of the Vishanti Oculus.
   */
  private buildMysticSanctum(
    scene: THREE.Scene,
    config: WorldConfig,
    animatedProps: AnimatedWorldProp[]
  ): void {
    const { width, length, height } = config.dimensions;
    const halfW = width / 2;
    const halfL = length / 2;

    // 1. Lighting Rig (Warm golden portal/brazier contrast against cool moonlight oculus fill)
    const hemiLight = new THREE.HemisphereLight('#60a5fa', '#1e1b18', 1.15);
    hemiLight.position.set(0, height, 0);
    scene.add(hemiLight);

    const oculusKeyLight = new THREE.DirectionalLight('#93c5fd', 1.8);
    oculusKeyLight.position.set(3, height + 4, 2);
    if (!this.isSoftwareGl) {
      oculusKeyLight.castShadow = true;
      oculusKeyLight.shadow.mapSize.set(1024, 1024);
      oculusKeyLight.shadow.camera.near = 1;
      oculusKeyLight.shadow.camera.far = 32;
      const d = 15;
      oculusKeyLight.shadow.camera.left = -d;
      oculusKeyLight.shadow.camera.right = d;
      oculusKeyLight.shadow.camera.top = d;
      oculusKeyLight.shadow.camera.bottom = -d;
      oculusKeyLight.shadow.bias = -0.0005;
    }
    scene.add(oculusKeyLight);

    // Warm sanctuary fill lights
    const southWarmLight = new THREE.PointLight('#f59e0b', 2.8, 22, 1.5);
    southWarmLight.position.set(0, 6.5, 8);
    scene.add(southWarmLight);

    const centerCoolLight = new THREE.PointLight('#38bdf8', 2.4, 24, 1.4);
    centerCoolLight.position.set(0, 9.5, 0);
    scene.add(centerCoolLight);

    // 2. Materials
    const floorTex = this.textures.createSanctumFloorTextures();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex.map,
      roughnessMap: floorTex.roughnessMap,
      bumpMap: floorTex.bumpMap,
      bumpScale: 0.03,
      roughness: 0.36,
      metalness: 0.22,
    });

    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: '#182030',
      roughness: 0.62,
      metalness: 0.15,
    });

    const carvedWoodMat = new THREE.MeshStandardMaterial({
      color: '#2b1b12',
      roughness: 0.48,
      metalness: 0.12,
    });

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: '#d99b3c',
      roughness: 0.24,
      metalness: 0.88,
    });

    const glowingRuneMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // 3. Large Stone Floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      floorMat
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !this.isSoftwareGl;
    scene.add(floorMesh);

    // Recessed Golden Astrolabe Floor Ring & Runway leading to the North Portal
    const astrolabeGroup = new THREE.Group();
    astrolabeGroup.position.set(0, 0.02, 0);

    const outerFloorRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.45, 64),
      brushedGoldMat
    );
    outerFloorRing.rotation.x = -Math.PI / 2;
    astrolabeGroup.add(outerFloorRing);

    const innerFloorRing = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.88, 64),
      brushedGoldMat
    );
    innerFloorRing.rotation.x = -Math.PI / 2;
    astrolabeGroup.add(innerFloorRing);

    // Golden pathway strips from spawn to portal
    for (const xOffset of [-1.85, 1.85]) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, length - 4),
        brushedGoldMat
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(xOffset, 0.005, 0);
      astrolabeGroup.add(strip);
    }
    scene.add(astrolabeGroup);

    // 4. Tall Sanctum Perimeter Walls with Architectural Framing
    const wallThickness = 0.8;
    // North Wall (z = -halfL) - Main Portal Wall!
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      darkStoneMat
    );
    northWall.position.set(0, height / 2, -halfL);
    scene.add(northWall);

    // Grand Architectural Altar Archway framing the North Portal
    const portalArchFrame = this.createSanctumPortalArchway(
      darkStoneMat,
      carvedWoodMat,
      brushedGoldMat
    );
    portalArchFrame.position.set(0, 0, -halfL + 0.45);
    scene.add(portalArchFrame);

    // South Wall (z = +halfL) with Grand Sanctum Entrance Doors
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      darkStoneMat
    );
    southWall.position.set(0, height / 2, halfL);
    scene.add(southWall);

    const southDoorFrame = this.createSanctumGrandDoor(
      carvedWoodMat,
      brushedGoldMat,
      glowingRuneMat
    );
    southDoorFrame.position.set(0, 0, halfL - 0.42);
    scene.add(southDoorFrame);

    // East & West Walls with Kamar-Taj Bookcase / Relic Alcoves and Wall Pilasters
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, height, length),
        darkStoneMat
      );
      sideWall.position.set(side * halfW, height / 2, 0);
      scene.add(sideWall);

      // Wall pilasters & arcane lattice panels along East/West walls
      for (let z = -11; z <= 11; z += 5.5) {
        const pilaster = new THREE.Group();
        pilaster.position.set(side * (halfW - 0.45), 0, z);

        const shaft = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, height - 1, 0.9),
          carvedWoodMat
        );
        shaft.position.y = (height - 1) / 2;
        pilaster.add(shaft);

        const goldTrim = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.35, 0.98),
          brushedGoldMat
        );
        goldTrim.position.y = 4.2;
        pilaster.add(goldTrim);

        // Glowing mystic wall sconce
        const sconceOrb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.24, 1),
          glowingRuneMat
        );
        sconceOrb.position.set(-side * 0.45, 4.6, 0);
        pilaster.add(sconceOrb);

        scene.add(pilaster);
      }
    }

    // 5. Eight Composite Multi-Part Sanctum Pillars (2 rows of 4)
    const pillarXPositions = [-6.4, 6.4];
    const pillarZPositions = [-9.5, -3.2, 3.2, 9.5];

    for (const px of pillarXPositions) {
      for (const pz of pillarZPositions) {
        const { pillarGroup, floatingFlame } = this.createSanctumPillar(
          height,
          darkStoneMat,
          carvedWoodMat,
          brushedGoldMat
        );
        pillarGroup.position.set(px, 0, pz);
        scene.add(pillarGroup);

        animatedProps.push({
          object: floatingFlame,
          type: 'bob_and_rotate',
          speed: 1.8,
          baseY: floatingFlame.position.y,
          amplitude: 0.14,
          phase: px + pz,
        });

        // Register solid cylindrical collider for each pillar
        this.collisionManager.addObstacle(config.id, {
          type: 'cylinder',
          x: px,
          z: pz,
          radius: 0.95,
          label: 'Sanctum Pillar',
        });
      }
    }

    // 6. Vaulted Ceiling & The Seal of the Vishanti Sanctum Oculus Skylight
    const ceilingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      darkStoneMat
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = height;
    scene.add(ceilingMesh);

    // Vaulted ceiling timber ribs
    for (let z = -12; z <= 12; z += 6) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(width - 0.8, 0.55, 0.65),
        carvedWoodMat
      );
      beam.position.set(0, height - 0.3, z);
      scene.add(beam);
    }

    // Seal of the Vishanti Circular Stained-Glass Oculus overhead
    const oculusTex = this.textures.createSanctumOculusTexture();
    const oculusMat = new THREE.MeshBasicMaterial({
      map: oculusTex,
      side: THREE.DoubleSide,
    });
    const oculusDisc = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 64),
      oculusMat
    );
    oculusDisc.rotation.x = Math.PI / 2;
    oculusDisc.position.set(0, height - 0.08, 0);
    scene.add(oculusDisc);

    const oculusRim = new THREE.Mesh(
      new THREE.TorusGeometry(5.25, 0.24, 16, 64),
      brushedGoldMat
    );
    oculusRim.rotation.x = Math.PI / 2;
    oculusRim.position.set(0, height - 0.15, 0);
    scene.add(oculusRim);

    // 7. Side Relic Pedestals (Levitating Armillary Sphere & Relic of Agamotto)
    for (const side of [-1, 1]) {
      const pedX = side * 9.2;
      const pedZ = 0;
      const { pedestalGroup, relicCluster } = this.createSanctumRelicPedestal(
        darkStoneMat,
        brushedGoldMat,
        glowingRuneMat
      );
      pedestalGroup.position.set(pedX, 0, pedZ);
      scene.add(pedestalGroup);

      animatedProps.push({
        object: relicCluster,
        type: 'rotate_xyz',
        speed: 0.85 * side,
      });

      this.collisionManager.addObstacle(config.id, {
        type: 'cylinder',
        x: pedX,
        z: pedZ,
        radius: 1.05,
        label: 'Relic Pedestal',
      });
    }
  }

  /**
   * Creates a multi-part Sanctum Pillar with stepped plinth, fluted shaft, gold collars,
   * capital, and an attached mystical brazier with a floating arcane flame crystal.
   */
  private createSanctumPillar(
    height: number,
    stoneMat: THREE.Material,
    woodMat: THREE.Material,
    goldMat: THREE.Material
  ): { pillarGroup: THREE.Group; floatingFlame: THREE.Object3D } {
    const group = new THREE.Group();

    // 1. Stepped Octagonal Plinth Base (grounded at y = 0)
    const base1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.45, 8),
      stoneMat
    );
    base1.position.y = 0.225;
    group.add(base1);

    const base2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.9, 0.4, 8),
      woodMat
    );
    base2.position.y = 0.65;
    group.add(base2);

    const baseGoldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.06, 12, 24),
      goldMat
    );
    baseGoldRing.rotation.x = Math.PI / 2;
    baseGoldRing.position.y = 0.86;
    group.add(baseGoldRing);

    // 2. Main Pillar Shaft
    const shaftHeight = height - 2.1;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.72, shaftHeight, 12),
      stoneMat
    );
    shaft.position.y = 0.85 + shaftHeight / 2;
    shaft.castShadow = !this.isSoftwareGl;
    shaft.receiveShadow = !this.isSoftwareGl;
    group.add(shaft);

    // Mid-shaft ornamental gold collar
    const midCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.32, 12),
      goldMat
    );
    midCollar.position.y = 3.6;
    group.add(midCollar);

    // 3. Ornate Capital
    const cap1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 0.66, 0.75, 8),
      woodMat
    );
    cap1.position.y = height - 0.9;
    group.add(cap1);

    const capAbacus = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.45, 1.9),
      stoneMat
    );
    capAbacus.position.y = height - 0.3;
    group.add(capAbacus);

    // 4. Mystic Brazier Bowl projecting toward center aisle
    const inwardSign = -1; // We'll orient or place symmetrically
    const brazierArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.85),
      goldMat
    );
    brazierArm.position.set(0, 3.6, inwardSign * 0.75);
    group.add(brazierArm);

    const brazierBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.16, 0.28, 12),
      goldMat
    );
    brazierBowl.position.set(0, 3.72, inwardSign * 1.1);
    group.add(brazierBowl);

    const flameMat = new THREE.MeshStandardMaterial({
      color: '#ffedd5',
      emissive: '#f97316',
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const floatingFlame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      flameMat
    );
    floatingFlame.position.set(0, 4.15, inwardSign * 1.1);
    group.add(floatingFlame);

    return { pillarGroup: group, floatingFlame };
  }

  private createSanctumPortalArchway(
    stoneMat: THREE.Material,
    woodMat: THREE.Material,
    goldMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    // Raised Stone Altar Dais Frame on the floor around the portal entrance
    for (const side of [-1, 1]) {
      const jambPillar = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 7.6, 1.1),
        stoneMat
      );
      jambPillar.position.set(side * 3.55, 3.8, 0);
      group.add(jambPillar);

      const goldInlay = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 7.2, 1.16),
        goldMat
      );
      goldInlay.position.set(side * 3.55, 3.8, 0);
      group.add(goldInlay);
    }

    // Grand Lintel Header Beam above the portal
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(8.8, 1.1, 1.25),
      woodMat
    );
    lintel.position.set(0, 7.9, 0);
    group.add(lintel);

    const lintelGoldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(9.1, 0.24, 1.32),
      goldMat
    );
    lintelGoldTrim.position.set(0, 7.32, 0);
    group.add(lintelGoldTrim);

    return group;
  }

  private createSanctumGrandDoor(
    woodMat: THREE.Material,
    goldMat: THREE.Material,
    runeMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 6.2, 0.35),
      woodMat
    );
    doorPanel.position.set(0, 3.1, 0);
    group.add(doorPanel);

    // Gold vertical center seam & knockers
    const centerBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 6.2, 0.42),
      goldMat
    );
    centerBar.position.set(0, 3.1, 0);
    group.add(centerBar);

    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.05, 12, 24),
        goldMat
      );
      ring.position.set(side * 0.65, 2.8, -0.22);
      group.add(ring);
    }

    // Glowing Vishanti crest above door
    const crest = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.06, 12, 32),
      runeMat
    );
    crest.position.set(0, 7.4, -0.2);
    group.add(crest);

    return group;
  }

  private createSanctumRelicPedestal(
    stoneMat: THREE.Material,
    goldMat: THREE.Material,
    runeMat: THREE.Material
  ): { pedestalGroup: THREE.Group; relicCluster: THREE.Object3D } {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.98, 1.25, 8),
      stoneMat
    );
    base.position.y = 0.625;
    group.add(base);

    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.82, 0.18, 8),
      goldMat
    );
    topCap.position.y = 1.32;
    group.add(topCap);

    // Floating Armillary Sphere Relic
    const relicCluster = new THREE.Group();
    relicCluster.position.set(0, 2.35, 0);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.04, 16, 48),
      goldMat
    );
    relicCluster.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.035, 16, 48),
      goldMat
    );
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    relicCluster.add(ring2);

    const coreGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      runeMat
    );
    relicCluster.add(coreGem);

    group.add(relicCluster);
    return { pedestalGroup: group, relicCluster };
  }

  /**
   * Builds WORLD 02: ASTRAL DIMENSION
   * A completely different architectural identity: Crystalline Celestial Sanctuary with
   * glowing violet/magenta/cyan hex-circuit obsidian floor, levitating crystal monolith columns,
   * giant rotating celestial astrolabe rings in the upper vault, and floating crystal formations.
   */
  private buildAstralDimension(
    scene: THREE.Scene,
    config: WorldConfig,
    animatedProps: AnimatedWorldProp[]
  ): void {
    const { width, length, height } = config.dimensions;
    const halfW = width / 2;
    const halfL = length / 2;

    // 1. Astral Dimension Lighting Rig (Ethereal purple, magenta & cyan celestial illumination)
    const hemiLight = new THREE.HemisphereLight('#e879f9', '#1e1b4b', 1.25);
    hemiLight.position.set(0, height, 0);
    scene.add(hemiLight);

    const astralKeyLight = new THREE.DirectionalLight('#f0abfc', 1.75);
    astralKeyLight.position.set(-4, height + 3, -3);
    if (!this.isSoftwareGl) {
      astralKeyLight.castShadow = true;
      astralKeyLight.shadow.mapSize.set(1024, 1024);
      const d = 16;
      astralKeyLight.shadow.camera.left = -d;
      astralKeyLight.shadow.camera.right = d;
      astralKeyLight.shadow.camera.top = d;
      astralKeyLight.shadow.camera.bottom = -d;
    }
    scene.add(astralKeyLight);

    const magentaPoint = new THREE.PointLight('#d946ef', 3.4, 28, 1.4);
    magentaPoint.position.set(0, 7.5, -5);
    scene.add(magentaPoint);

    const cyanPoint = new THREE.PointLight('#38bdf8', 3.0, 26, 1.4);
    cyanPoint.position.set(0, 9.0, 6);
    scene.add(cyanPoint);

    // 2. Materials
    const astralFloorTex = this.textures.createAstralFloorTextures();
    const floorMat = new THREE.MeshStandardMaterial({
      map: astralFloorTex.map,
      emissiveMap: astralFloorTex.emissiveMap,
      emissive: new THREE.Color('#d946ef'),
      emissiveIntensity: 0.95,
      roughnessMap: astralFloorTex.roughnessMap,
      roughness: 0.22,
      metalness: 0.55,
    });

    const obsidianCrystalMat = new THREE.MeshStandardMaterial({
      color: '#170d2e',
      roughness: 0.22,
      metalness: 0.75,
    });

    const amethystCrystalMat = new THREE.MeshStandardMaterial({
      color: '#a855f7',
      emissive: '#7e22ce',
      emissiveIntensity: 1.35,
      roughness: 0.15,
      metalness: 0.4,
    });

    const cyanCrystalMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 1.6,
      roughness: 0.14,
      metalness: 0.5,
    });

    const silverCelestialMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.18,
      metalness: 0.92,
    });

    // 3. Glowing Astral Crystal Floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      floorMat
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !this.isSoftwareGl;
    scene.add(floorMesh);

    // Glowing Astral Energy Conduits & Central Nexus Mandala on Floor
    const nexusGroup = new THREE.Group();
    nexusGroup.position.set(0, 0.025, 0);

    const nexusRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 5.05, 6),
      cyanCrystalMat
    );
    nexusRingOuter.rotation.x = -Math.PI / 2;
    nexusGroup.add(nexusRingOuter);

    const nexusRingInner = new THREE.Mesh(
      new THREE.RingGeometry(3.1, 3.3, 12),
      amethystCrystalMat
    );
    nexusRingInner.rotation.x = -Math.PI / 2;
    nexusGroup.add(nexusRingInner);
    scene.add(nexusGroup);

    // 4. Astral Boundary Architecture (Faceted Crystalline Colonnade Walls)
    const wallThickness = 0.8;

    // South Gateway Wall (z = +halfL) where the Return Portal to Mystic Sanctum stands!
    const southPortalWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      obsidianCrystalMat
    );
    southPortalWall.position.set(0, height / 2, halfL);
    scene.add(southPortalWall);

    const astralPortalFrame = this.createAstralPortalGatewayFrame(
      obsidianCrystalMat,
      amethystCrystalMat,
      silverCelestialMat
    );
    astralPortalFrame.position.set(0, 0, halfL - 0.45);
    scene.add(astralPortalFrame);

    // North Celestial Altar Wall (z = -halfL) with Giant Levitating Astral Monolith Throne
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      obsidianCrystalMat
    );
    northWall.position.set(0, height / 2, -halfL);
    scene.add(northWall);

    const northShrine = this.createAstralNorthSanctuary(
      obsidianCrystalMat,
      amethystCrystalMat,
      cyanCrystalMat,
      silverCelestialMat
    );
    northShrine.position.set(0, 0, -halfL + 2.2);
    scene.add(northShrine);
    animatedProps.push({
      object: northShrine.userData.floatingCore,
      type: 'rotate_xyz',
      speed: 0.7,
    });

    // East & West Faceted Crystal Rib Walls
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, height, length),
        obsidianCrystalMat
      );
      sideWall.position.set(side * halfW, height / 2, 0);
      scene.add(sideWall);

      // Angled crystalline buttresses & glowing energy pillars along East/West walls
      for (let z = -12; z <= 12; z += 6) {
        const buttress = new THREE.Group();
        buttress.position.set(side * (halfW - 0.5), 0, z);

        const crystalRib = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.7, height - 1, 6),
          obsidianCrystalMat
        );
        crystalRib.position.y = (height - 1) / 2;
        buttress.add(crystalRib);

        const glowingVein = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, height - 3, 0.25),
          z % 12 === 0 ? cyanCrystalMat : amethystCrystalMat
        );
        glowingVein.position.set(-side * 0.35, height / 2, 0);
        buttress.add(glowingVein);

        scene.add(buttress);
      }
    }

    // 5. Eight Celestial Prismatic Obelisk Columns with Levitating Shards
    const colXPositions = [-7.2, 7.2];
    const colZPositions = [-10.0, -3.4, 3.4, 10.0];

    for (const cx of colXPositions) {
      for (const cz of colZPositions) {
        const { columnGroup, orbitingRing } = this.createAstralObeliskColumn(
          height,
          obsidianCrystalMat,
          amethystCrystalMat,
          cyanCrystalMat,
          silverCelestialMat
        );
        columnGroup.position.set(cx, 0, cz);
        scene.add(columnGroup);

        animatedProps.push({
          object: orbitingRing,
          type: 'bob_and_rotate',
          speed: 1.35,
          baseY: orbitingRing.position.y,
          amplitude: 0.22,
          phase: cx * 0.5 + cz,
        });

        this.collisionManager.addObstacle(config.id, {
          type: 'cylinder',
          x: cx,
          z: cz,
          radius: 1.05,
          label: 'Astral Obelisk Column',
        });
      }
    }

    // 6. High Celestial Vault Ceiling with Giant Rotating Cosmic Astrolabe Rings
    const upperVault = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      obsidianCrystalMat
    );
    upperVault.rotation.x = Math.PI / 2;
    upperVault.position.y = height;
    scene.add(upperVault);

    const celestialGyroGroup = new THREE.Group();
    celestialGyroGroup.position.set(0, height - 2.6, 0);

    const gyroRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.16, 16, 72),
      silverCelestialMat
    );
    gyroRing1.rotation.x = Math.PI / 2;
    celestialGyroGroup.add(gyroRing1);

    const gyroRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(5.1, 0.14, 16, 64),
      amethystCrystalMat
    );
    gyroRing2.rotation.x = Math.PI / 2.3;
    gyroRing2.rotation.y = Math.PI / 6;
    celestialGyroGroup.add(gyroRing2);

    const gyroRing3 = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.12, 16, 48),
      cyanCrystalMat
    );
    gyroRing3.rotation.x = Math.PI / 1.8;
    gyroRing3.rotation.y = -Math.PI / 5;
    celestialGyroGroup.add(gyroRing3);

    scene.add(celestialGyroGroup);
    animatedProps.push({
      object: celestialGyroGroup,
      type: 'rotate_y',
      speed: 0.35,
    });

    // 7. Crystal Cluster Formations on the flanks
    for (const side of [-1, 1]) {
      const clusterX = side * 10.0;
      const clusterZ = 0;
      const cluster = this.createCrystalCluster(
        obsidianCrystalMat,
        amethystCrystalMat,
        cyanCrystalMat
      );
      cluster.position.set(clusterX, 0, clusterZ);
      scene.add(cluster);

      this.collisionManager.addObstacle(config.id, {
        type: 'cylinder',
        x: clusterX,
        z: clusterZ,
        radius: 1.25,
        label: 'Crystal Formation',
      });
    }
  }

  private createAstralObeliskColumn(
    height: number,
    obsidianMat: THREE.Material,
    amethystMat: THREE.Material,
    cyanMat: THREE.Material,
    silverMat: THREE.Material
  ): { columnGroup: THREE.Group; orbitingRing: THREE.Object3D } {
    const group = new THREE.Group();

    // Base hexagonal crystal pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.15, 0.8, 6),
      obsidianMat
    );
    base.position.y = 0.4;
    group.add(base);

    // Lower Tapered Obelisk Shaft
    const lowerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.82, 4.2, 6),
      obsidianMat
    );
    lowerShaft.position.y = 2.9;
    group.add(lowerShaft);

    // Glowing Levitating Energy Core in the gap between lower & upper obelisk!
    const coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      amethystMat
    );
    coreCrystal.position.y = 5.9;
    group.add(coreCrystal);

    // Orbiting silver & cyan shard ring around the levitating gap
    const orbitingRing = new THREE.Group();
    orbitingRing.position.y = 5.9;

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.05, 12, 32),
      silverMat
    );
    torus.rotation.x = Math.PI / 2;
    orbitingRing.add(torus);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        cyanMat
      );
      shard.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05);
      orbitingRing.add(shard);
    }
    group.add(orbitingRing);

    // Upper Suspended Inverted Obelisk reaching down from the ceiling
    const upperHeight = height - 7.2;
    const upperShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.48, upperHeight, 6),
      obsidianMat
    );
    upperShaft.position.y = 7.0 + upperHeight / 2;
    group.add(upperShaft);

    return { columnGroup: group, orbitingRing };
  }

  private createAstralPortalGatewayFrame(
    obsidianMat: THREE.Material,
    amethystMat: THREE.Material,
    silverMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.85, 8.2, 6),
        obsidianMat
      );
      pylon.position.set(side * 3.7, 4.1, 0);
      pylon.rotation.z = side * -0.08;
      group.add(pylon);

      const crystalStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 7.4, 0.9),
        amethystMat
      );
      crystalStripe.position.set(side * 3.65, 3.9, 0);
      group.add(crystalStripe);
    }

    const crownArc = new THREE.Mesh(
      new THREE.TorusGeometry(3.8, 0.22, 12, 36, Math.PI),
      silverMat
    );
    crownArc.position.set(0, 4.6, 0);
    group.add(crownArc);

    return group;
  }

  private createAstralNorthSanctuary(
    obsidianMat: THREE.Material,
    amethystMat: THREE.Material,
    cyanMat: THREE.Material,
    silverMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.8, 0.6, 6),
      obsidianMat
    );
    dais.position.y = 0.3;
    group.add(dais);

    const floatingCore = new THREE.Group();
    floatingCore.position.set(0, 4.4, 0);

    const icosa = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 0),
      amethystMat
    );
    floatingCore.add(icosa);

    const outerCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.75, 1),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      })
    );
    floatingCore.add(outerCage);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.07, 16, 48),
      silverMat
    );
    floatingCore.add(halo);

    // Add a cyan crystal ring around the dais base
    const daisHalo = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.06, 12, 36),
      cyanMat
    );
    daisHalo.rotation.x = Math.PI / 2;
    daisHalo.position.y = 0.62;
    group.add(daisHalo);

    group.add(floatingCore);
    group.userData.floatingCore = floatingCore;
    return group;
  }

  private createCrystalCluster(
    obsidianMat: THREE.Material,
    amethystMat: THREE.Material,
    cyanMat: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 0.35, 7),
      obsidianMat
    );
    base.position.y = 0.175;
    group.add(base);

    const specs = [
      { r: 0.32, h: 3.1, x: 0, z: 0, rx: 0.05, rz: -0.06, mat: amethystMat },
      { r: 0.24, h: 2.3, x: 0.42, z: 0.25, rx: 0.22, rz: -0.28, mat: cyanMat },
      { r: 0.26, h: 2.5, x: -0.38, z: 0.3, rx: 0.18, rz: 0.25, mat: amethystMat },
      { r: 0.2, h: 1.8, x: 0.25, z: -0.42, rx: -0.26, rz: -0.18, mat: cyanMat },
      { r: 0.22, h: 2.0, x: -0.32, z: -0.32, rx: -0.2, rz: 0.24, mat: amethystMat },
    ];

    for (const s of specs) {
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(s.r, s.h, 6),
        s.mat
      );
      spire.position.set(s.x, s.h / 2 + 0.2, s.z);
      spire.rotation.set(s.rx, 0, s.rz);
      group.add(spire);
    }

    return group;
  }

  /**
   * Future 3D Asset Support (Section 10):
   * Loads an external GLB or GLTF model into a designated world scene and optionally
   * registers its bounding box with the CollisionManager.
   */
  public loadExternalAsset(
    scene: THREE.Scene,
    worldId: string,
    assetConfig: ExternalAssetConfig,
    onLoaded?: (model: THREE.Group) => void,
    onError?: (err: unknown) => void
  ): void {
    this.gltfLoader.load(
      assetConfig.url,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(
          assetConfig.position.x,
          assetConfig.position.y,
          assetConfig.position.z
        );
        model.rotation.y = assetConfig.rotationY;
        model.scale.setScalar(assetConfig.scale);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = !this.isSoftwareGl;
            child.receiveShadow = !this.isSoftwareGl;
          }
        });

        scene.add(model);

        if (assetConfig.autoGenerateBoundsCollider) {
          const box = new THREE.Box3().setFromObject(model);
          this.collisionManager.addObstacle(worldId, {
            type: 'box',
            minX: box.min.x,
            maxX: box.max.x,
            minZ: box.min.z,
            maxZ: box.max.z,
            label: assetConfig.id,
          });
        }

        onLoaded?.(model);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load external 3D asset (${assetConfig.id}):`, err);
        onError?.(err);
      }
    );
  }
}

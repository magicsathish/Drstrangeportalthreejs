import { PortalEngineConfig, PortalStyleConfig } from './types';

export const PORTAL_STYLES: Record<string, PortalStyleConfig> = {
  eldritch_gold: {
    id: 'eldritch_gold',
    name: 'Kamar-Taj Eldritch Sling Ring',
    primaryColor: '#ff9d1a',
    secondaryColor: '#ff3b00',
    coreHotColor: '#fff6d6',
    lightColor: '#ff8c1a',
    lightIntensity: 4.5,
    sparkSpeedMultiplier: 1.0,
    distortionStrength: 0.025,
  },
  astral_amethyst: {
    id: 'astral_amethyst',
    name: 'Celestial Astral Gateway',
    primaryColor: '#e879f9',
    secondaryColor: '#7e22ce',
    coreHotColor: '#fae8ff',
    lightColor: '#d946ef',
    lightIntensity: 4.2,
    sparkSpeedMultiplier: 1.15,
    distortionStrength: 0.032,
  },
  crimson_vishanti: {
    id: 'crimson_vishanti',
    name: 'Crimson Seal of Vishanti',
    primaryColor: '#fb7185',
    secondaryColor: '#e11d48',
    coreHotColor: '#ffe4e6',
    lightColor: '#f43f5e',
    lightIntensity: 4.4,
    sparkSpeedMultiplier: 1.25,
    distortionStrength: 0.028,
  },
};

export const DEFAULT_PORTAL_ENGINE_CONFIG: PortalEngineConfig = {
  version: '1.0.0',
  projectTitle: 'Doctor Strange Connecting Portal',
  styles: PORTAL_STYLES,
  worlds: [
    {
      id: 'world_01',
      name: 'Mystic Sanctum',
      subtitle: 'Hall of the Ancient Relics · Earth Realm',
      description:
        'An ancient vaulted stone sanctum illuminated by moonlight through the Seal of the Vishanti oculus and warm golden eldritch braziers.',
      themeType: 'mystic_sanctum',
      dimensions: {
        width: 24,
        length: 32,
        height: 13.5,
      },
      spawnPoint: { x: 0, y: 1.72, z: 9.5 },
      spawnYaw: 0, // Looking toward -Z where the portal stands
      fogColor: '#070b14',
      fogDensity: 0.022,
      backgroundColor: '#050811',
      ambientLightColor: '#25385c',
      ambientLightIntensity: 0.85,
      externalAssets: [],
    },
    {
      id: 'world_02',
      name: 'Astral Dimension',
      subtitle: 'Crystalline Nexus of Shifting Planes · Outermost Void',
      description:
        'An otherworldly celestial sanctuary of levitating crystalline monoliths, glowing sacred energy conduits, and rotating cosmic astrolabe rings.',
      themeType: 'astral_dimension',
      dimensions: {
        width: 26,
        length: 34,
        height: 16,
      },
      spawnPoint: { x: 0, y: 1.72, z: -8.5 },
      spawnYaw: Math.PI, // Looking toward +Z where the return portal or center hall stands
      fogColor: '#130722',
      fogDensity: 0.019,
      backgroundColor: '#0c0417',
      ambientLightColor: '#4c1d95',
      ambientLightIntensity: 0.9,
      externalAssets: [],
    },
  ],
  connections: [
    {
      id: 'portal_01',
      name: 'Sanctum — Astral Gateway',
      sourceWorldId: 'world_01',
      destinationWorldId: 'world_02',
      bidirectional: true,
      styleId: 'eldritch_gold',
      sourceTransform: {
        // Placed prominently on the North main wall (z = -14.2) of Mystic Sanctum, facing +Z (rotationY = 0)
        position: { x: 0, y: 2.75, z: -14.2 },
        rotationY: 0,
        width: 5.0,
        height: 5.5,
        radius: 2.48,
      },
      destinationTransform: {
        // Placed prominently on the South gateway wall (z = 15.2) of Astral Dimension, facing -Z (rotationY = Math.PI)
        // When walking North (-Z) into World 01's portal, you emerge walking North (-Z) into the heart of World 02!
        position: { x: 0, y: 2.75, z: 15.2 },
        rotationY: Math.PI,
        width: 5.0,
        height: 5.5,
        radius: 2.48,
      },
    },
  ],
};

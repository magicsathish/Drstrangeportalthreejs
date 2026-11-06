import * as THREE from 'three';
import { PortalStyleConfig } from './types';

/**
 * Creates the ShaderMaterial for the inner dimensional opening of the portal.
 * Uses clip-space screen projection (vClipPos.xy / vClipPos.w * 0.5 + 0.5)
 * so the rendered destination WebGLRenderTarget aligns seamlessly with the 3D perspective
 * of the player's camera, plus a fiery eldritch energy rim distortion at the circular boundary.
 */
export function createPortalSurfaceMaterial(
  renderTargetTexture: THREE.Texture,
  style: PortalStyleConfig
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPortalTexture: { value: renderTargetTexture },
      uTime: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(style.primaryColor) },
      uSecondaryColor: { value: new THREE.Color(style.secondaryColor) },
      uCoreHotColor: { value: new THREE.Color(style.coreHotColor) },
      uDistortionStrength: { value: style.distortionStrength },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec4 vClipPos;

      void main() {
        vUv = uv;
        vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vClipPos = clipPos;
        gl_Position = clipPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uPortalTexture;
      uniform float uTime;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uCoreHotColor;
      uniform float uDistortionStrength;

      varying vec2 vUv;
      varying vec4 vClipPos;

      // Fast procedural noise for fiery rim turbulence
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        // Centered polar coordinates on the circular portal mesh (-1.0 to 1.0)
        vec2 centered = (vUv - 0.5) * 2.0;
        float r = length(centered);
        if (r > 1.0) {
          discard;
        }

        float angle = atan(centered.y, centered.x);

        // Animated swirling noise along the portal rim
        float rimNoise = noise(vec2(angle * 5.0 - uTime * 3.8, r * 8.0 - uTime * 2.2));
        float fineSparks = noise(vec2(angle * 16.0 - uTime * 7.5, r * 14.0));

        // Screen-space UV from clip coordinates so the 3D perspective matches a real doorway
        vec2 screenUv = (vClipPos.xy / max(vClipPos.w, 0.0001)) * 0.5 + 0.5;

        // Subtle energy ripple only near the outer rim (r > 0.72), keeping center 100% crystal clear
        float rimFactor = smoothstep(0.70, 0.98, r);
        vec2 radialDir = normalize(centered + vec2(0.0001));
        vec2 tangDir = vec2(-radialDir.y, radialDir.x);

        vec2 rippleOffset =
          (radialDir * (rimNoise - 0.5) + tangDir * (fineSparks - 0.5)) *
          uDistortionStrength *
          rimFactor;

        vec2 finalUv = clamp(screenUv + rippleOffset, 0.002, 0.998);
        vec4 destSceneColor = texture2D(uPortalTexture, finalUv);

        // Fiery Doctor Strange plasma meniscus along the outer boundary (0.85 < r < 1.0)
        float outerGlow = smoothstep(0.82, 0.96, r);
        float hotCoreRim = smoothstep(0.91, 0.985, r);
        float sparkStreaks = pow(fineSparks, 3.0) * smoothstep(0.76, 0.96, r);

        vec3 plasmaColor = mix(uSecondaryColor, uPrimaryColor, rimNoise);
        plasmaColor = mix(plasmaColor, uCoreHotColor, hotCoreRim + sparkStreaks * 0.65);

        // Combine clear destination world view with glowing eldritch meniscus
        vec3 combined = mix(destSceneColor.rgb, plasmaColor, outerGlow * 0.85);
        combined += plasmaColor * sparkStreaks * 0.55;

        // Soft alpha feather at very outer edge (0.97 -> 1.0) to blend with 3D spark rings
        float edgeAlpha = 1.0 - smoothstep(0.975, 1.0, r);

        gl_FragColor = vec4(combined, edgeAlpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

/**
 * Creates the high-emission spinning Eldritch Sling Ring ShaderMaterial
 * for the fiery concentric rings surrounding the portal doorway.
 */
export function createEldritchRingMaterial(style: PortalStyleConfig): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(style.primaryColor) },
      uSecondaryColor: { value: new THREE.Color(style.secondaryColor) },
      uCoreHotColor: { value: new THREE.Color(style.coreHotColor) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uCoreHotColor;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r < 0.68 || r > 1.0) {
          discard;
        }

        float angle = atan(p.y, p.x);

        // Tangential spiral streaks simulating spinning sling-ring sparks
        float spiralAngle = angle * 14.0 + r * 22.0 - uTime * 9.5;
        float streak1 = noise(vec2(spiralAngle, r * 12.0 - uTime * 3.0));
        float streak2 = noise(vec2(angle * 28.0 - uTime * 14.0, r * 20.0));

        // Concentric ring profile peaking at r = 0.83
        float ringProfile = exp(-pow((r - 0.83) * 11.5, 2.0));
        float innerHotBand = exp(-pow((r - 0.80) * 22.0, 2.0));

        float energy = ringProfile * (0.65 + 0.65 * streak1 + 0.45 * pow(streak2, 2.0));

        vec3 col = mix(uSecondaryColor, uPrimaryColor, clamp(energy, 0.0, 1.0));
        col = mix(col, uCoreHotColor, innerHotBand * 0.85 + pow(streak2, 3.0) * ringProfile);

        float alpha = clamp(energy * 1.35, 0.0, 1.0);
        gl_FragColor = vec4(col * 1.4, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

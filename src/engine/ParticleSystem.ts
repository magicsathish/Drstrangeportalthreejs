import * as THREE from 'three';
import { PortalStyleConfig } from './types';

/**
 * Generates and updates the tangential flying sparks and embers around a Doctor Strange portal,
 * plus ambient mystical particles inside each 3D hall.
 */
export class PortalParticleSystem {
  public points: THREE.Points;
  private count: number;
  private radius: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private maxLifetimes: Float32Array;
  private angles: Float32Array;
  private speedMult: number;

  constructor(
    radius: number,
    style: PortalStyleConfig,
    sparkTexture: THREE.Texture,
    count = 340
  ) {
    this.count = count;
    this.radius = radius;
    this.speedMult = style.sparkSpeedMultiplier;

    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.lifetimes = new Float32Array(count);
    this.maxLifetimes = new Float32Array(count);
    this.angles = new Float32Array(count);

    const colors = new Float32Array(count * 3);
    const primary = new THREE.Color(style.primaryColor);
    const secondary = new THREE.Color(style.secondaryColor);
    const hot = new THREE.Color(style.coreHotColor);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      this.respawnParticle(i, Math.random());

      const t = Math.random();
      if (t > 0.72) {
        tempColor.copy(hot);
      } else if (t > 0.3) {
        tempColor.copy(primary);
      } else {
        tempColor.copy(secondary);
      }
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.22,
      map: sparkTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
  }

  private respawnParticle(index: number, initialPhase = 0): void {
    const angle = Math.random() * Math.PI * 2;
    this.angles[index] = angle;

    // Spawn tightly around the circular portal ring perimeter
    const rJitter = this.radius * (0.94 + Math.random() * 0.12);
    const px = Math.cos(angle) * rJitter;
    const py = Math.sin(angle) * rJitter;
    const pz = (Math.random() - 0.5) * 0.18;

    // Tangential velocity (counter-clockwise sling ring spin) + slight outward spray
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const radialX = Math.cos(angle);
    const radialY = Math.sin(angle);

    const tangSpeed = (2.8 + Math.random() * 3.4) * this.speedMult;
    const outSpeed = (0.35 + Math.random() * 1.15) * this.speedMult;

    const vx = tangentX * tangSpeed + radialX * outSpeed;
    const vy = tangentY * tangSpeed + radialY * outSpeed;
    const vz = (Math.random() - 0.42) * 1.1; // Slight forward bias into the room

    const maxLife = 0.35 + Math.random() * 0.65;
    const life = initialPhase * maxLife;

    this.maxLifetimes[index] = maxLife;
    this.lifetimes[index] = life;

    this.velocities[index * 3] = vx;
    this.velocities[index * 3 + 1] = vy;
    this.velocities[index * 3 + 2] = vz;

    this.positions[index * 3] = px + vx * life;
    this.positions[index * 3 + 1] = py + vy * life;
    this.positions[index * 3 + 2] = pz + vz * life;
  }

  public update(delta: number): void {
    const dt = Math.min(delta, 0.05);
    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      this.lifetimes[i] += dt;
      if (this.lifetimes[i] >= this.maxLifetimes[i]) {
        this.respawnParticle(i, 0);
      } else {
        const i3 = i * 3;
        // Apply subtle gravity to falling sparks
        this.velocities[i3 + 1] -= 2.4 * dt;
        // Apply air drag
        this.velocities[i3] *= 1 - 0.6 * dt;
        this.velocities[i3 + 2] *= 1 - 0.6 * dt;

        this.positions[i3] += this.velocities[i3] * dt;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
        this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
      }
    }

    posAttr.needsUpdate = true;
  }

  public updateStyle(style: PortalStyleConfig): void {
    this.speedMult = style.sparkSpeedMultiplier;
    const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const primary = new THREE.Color(style.primaryColor);
    const secondary = new THREE.Color(style.secondaryColor);
    const hot = new THREE.Color(style.coreHotColor);
    const temp = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const t = (i % 10) / 10;
      if (t > 0.7) temp.copy(hot);
      else if (t > 0.3) temp.copy(primary);
      else temp.copy(secondary);

      colorAttr.setXYZ(i, temp.r, temp.g, temp.b);
    }
    colorAttr.needsUpdate = true;
  }
}

/**
 * Floating atmospheric motes & embers inside a 3D hall
 */
export class WorldAmbientParticles {
  public points: THREE.Points;
  private count: number;
  private positions: Float32Array;
  private speeds: Float32Array;
  private bounds: { width: number; length: number; height: number };

  constructor(
    bounds: { width: number; length: number; height: number },
    colorHexA: string,
    colorHexB: string,
    sparkTexture: THREE.Texture,
    count = 220
  ) {
    this.count = count;
    this.bounds = bounds;
    this.positions = new Float32Array(count * 3);
    this.speeds = new Float32Array(count);

    const colors = new Float32Array(count * 3);
    const colA = new THREE.Color(colorHexA);
    const colB = new THREE.Color(colorHexB);
    const temp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * (bounds.width - 2);
      this.positions[i * 3 + 1] = 0.4 + Math.random() * (bounds.height - 1.5);
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * (bounds.length - 2);
      this.speeds[i] = 0.18 + Math.random() * 0.38;

      temp.copy(i % 2 === 0 ? colA : colB);
      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: sparkTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
  }

  public update(delta: number, elapsedTime: number): void {
    const dt = Math.min(delta, 0.05);
    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.positions[i3 + 1] += this.speeds[i] * dt;
      this.positions[i3] += Math.sin(elapsedTime * 0.7 + i) * 0.08 * dt;

      if (this.positions[i3 + 1] > this.bounds.height - 1.0) {
        this.positions[i3 + 1] = 0.4;
      }
    }
    posAttr.needsUpdate = true;
  }
}

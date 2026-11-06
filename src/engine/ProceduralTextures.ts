import * as THREE from 'three';

/**
 * Generates zero-404 procedural PBR textures for the Mystic Sanctum, Astral Dimension,
 * and Doctor Strange Eldritch Mandala rings.
 */
export class ProceduralTextures {
  private maxAnisotropy: number;

  constructor(renderer: THREE.WebGLRenderer) {
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy() || 4;
  }

  /**
   * Sanctum Stone Floor Texture with inlaid gold celestial astrolabe markings
   */
  public createSanctumFloorTextures(): {
    map: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
  } {
    const size = 1024;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const ctx = colorCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d')!;

    // Base dark slate stone
    ctx.fillStyle = '#141923';
    ctx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#555555'; // Fairly polished stone
    rCtx.fillRect(0, 0, size, size);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    // Draw ashlar stone tiles (4x4 grid per repeat)
    const tiles = 4;
    const step = size / tiles;

    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const px = x * step;
        const py = y * step;
        const shade = 18 + ((x * 7 + y * 13) % 10);
        ctx.fillStyle = `rgb(${shade}, ${shade + 5}, ${shade + 14})`;
        ctx.fillRect(px + 3, py + 3, step - 6, step - 6);

        // Subtle stone marbling
        for (let i = 0; i < 45; i++) {
          const sx = px + Math.random() * step;
          const sy = py + Math.random() * step;
          const sr = 6 + Math.random() * 24;
          ctx.fillStyle =
            i % 2 === 0 ? 'rgba(38, 52, 74, 0.14)' : 'rgba(8, 11, 18, 0.18)';
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Roughness variation per tile
        const rShade = 65 + ((x * 11 + y * 5) % 35);
        rCtx.fillStyle = `rgb(${rShade}, ${rShade}, ${rShade})`;
        rCtx.fillRect(px + 4, py + 4, step - 8, step - 8);

        // Grout lines in bump & roughness
        bCtx.strokeStyle = '#202020';
        bCtx.lineWidth = 6;
        bCtx.strokeRect(px, py, step, step);

        rCtx.strokeStyle = '#dcdcdc';
        rCtx.lineWidth = 6;
        rCtx.strokeRect(px, py, step, step);
      }
    }

    // Inlaid Sanctum Gold Brass Geometric Lines on tile intersections
    ctx.strokeStyle = '#b4833e';
    ctx.lineWidth = 3;
    for (let i = 0; i <= tiles; i++) {
      const pos = i * step;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Central compass / mystic diamond inlay
    ctx.strokeStyle = 'rgba(217, 155, 67, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();

    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 5);
    map.anisotropy = this.maxAnisotropy;

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(4, 5);
    roughnessMap.anisotropy = this.maxAnisotropy;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(4, 5);
    bumpMap.anisotropy = this.maxAnisotropy;

    return { map, roughnessMap, bumpMap };
  }

  /**
   * Creates the Seal of the Vishanti (Doctor Strange Sanctum Sanctorum Window) texture
   */
  public createSanctumOculusTexture(): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;

    // Deep celestial blue stained glass radial gradient
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, size * 0.48);
    grad.addColorStop(0, '#bae6fd');
    grad.addColorStop(0.25, '#38bdf8');
    grad.addColorStop(0.6, '#1d4ed8');
    grad.addColorStop(0.88, '#1e293b');
    grad.addColorStop(1.0, '#090d16');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Draw dark bronze architectural window framing (Seal of the Vishanti)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;

    // Outer circles
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.39, 0, Math.PI * 2);
    ctx.stroke();

    // Signature curved Vishanti intersecting arcs (4-fold + skewed mandala)
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#fbbf24';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i * Math.PI) / 2 + 0.25);
      ctx.beginPath();
      ctx.moveTo(-size * 0.39, -size * 0.14);
      ctx.bezierCurveTo(
        -size * 0.1,
        -size * 0.36,
        size * 0.15,
        size * 0.36,
        size * 0.39,
        size * 0.14
      );
      ctx.stroke();
      ctx.restore();
    }

    // Inner sacred eye diamond
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAnisotropy;
    return tex;
  }

  /**
   * Creates Astral Dimension glowing crystalline hexagonal energy circuit floor textures
   */
  public createAstralFloorTextures(): {
    map: THREE.CanvasTexture;
    emissiveMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const size = 1024;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const ctx = colorCanvas.getContext('2d')!;

    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = size;
    emissiveCanvas.height = size;
    const eCtx = emissiveCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d')!;

    // Deep obsidian crystal base
    ctx.fillStyle = '#0f071e';
    ctx.fillRect(0, 0, size, size);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#262626'; // Mirror-like polished crystal floor
    rCtx.fillRect(0, 0, size, size);

    // Draw sacred geometric hexagonal & octagonal astral grid
    const gridCount = 4;
    const step = size / gridCount;

    for (let y = 0; y < gridCount; y++) {
      for (let x = 0; x < gridCount; x++) {
        const cx = x * step + step / 2;
        const cy = y * step + step / 2;
        const r = step * 0.42;

        // Octagon crystal facet
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 4;
        eCtx.strokeStyle = (x + y) % 2 === 0 ? '#c026d3' : '#38bdf8';
        eCtx.lineWidth = 3;
        rCtx.strokeStyle = '#999999';
        rCtx.lineWidth = 5;

        const drawPoly = (targetCtx: CanvasRenderingContext2D, radius: number) => {
          targetCtx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 + Math.PI / 8;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            if (i === 0) targetCtx.moveTo(px, py);
            else targetCtx.lineTo(px, py);
          }
          targetCtx.closePath();
          targetCtx.stroke();
        };

        drawPoly(ctx, r);
        drawPoly(eCtx, r);
        drawPoly(rCtx, r);

        // Inner glowing rune circle
        eCtx.strokeStyle = 'rgba(232, 121, 249, 0.55)';
        eCtx.lineWidth = 2;
        eCtx.beginPath();
        eCtx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        eCtx.stroke();

        // Connecting energy conduits
        eCtx.beginPath();
        eCtx.moveTo(cx - step / 2, cy);
        eCtx.lineTo(cx - r, cy);
        eCtx.moveTo(cx + r, cy);
        eCtx.lineTo(cx + step / 2, cy);
        eCtx.moveTo(cx, cy - step / 2);
        eCtx.lineTo(cx, cy - r);
        eCtx.moveTo(cx, cy + r);
        eCtx.lineTo(cx, cy + step / 2);
        eCtx.stroke();
      }
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5, 6);
    map.anisotropy = this.maxAnisotropy;

    const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;
    emissiveMap.repeat.set(5, 6);
    emissiveMap.anisotropy = this.maxAnisotropy;

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(5, 6);
    roughnessMap.anisotropy = this.maxAnisotropy;

    return { map, emissiveMap, roughnessMap };
  }

  /**
   * Creates the Doctor Strange Eldritch Mandala Rune Texture for the rotating outer rings
   * around the portal gateway.
   */
  public createEldritchMandalaTexture(
    primaryHex: string,
    hotHex: string
  ): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.shadowColor = primaryHex;
    ctx.shadowBlur = 14;

    // Outer Concentric Eldritch Rings (at r = 0.72 to 0.96 of half-size so center is completely clear!)
    const radii = [0.73, 0.76, 0.84, 0.87, 0.94];
    for (const rNorm of radii) {
      ctx.strokeStyle = rNorm < 0.78 ? hotHex : primaryHex;
      ctx.lineWidth = rNorm < 0.78 ? 5 : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, (size / 2) * rNorm, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 12-Pointed Sacred Geometry Star chords strictly outside r = 0.72
    const innerR = (size / 2) * 0.73;
    const outerR = (size / 2) * 0.93;
    ctx.strokeStyle = primaryHex;
    ctx.lineWidth = 3;

    for (let i = 0; i < 24; i++) {
      const a1 = (i * Math.PI * 2) / 24;
      const a2 = ((i + 1) * Math.PI * 2) / 24;
      const midA = (a1 + a2) * 0.5;

      // Geometric teeth & glyphs between innerR and outerR
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR);
      ctx.lineTo(cx + Math.cos(midA) * outerR, cy + Math.sin(midA) * outerR);
      ctx.lineTo(cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR);
      ctx.stroke();

      // Arcane Sanskrit-inspired geometric rune ticks
      const runeR = (size / 2) * 0.805;
      ctx.save();
      ctx.translate(cx + Math.cos(a1) * runeR, cy + Math.sin(a1) * runeR);
      ctx.rotate(a1 + Math.PI / 2);
      ctx.strokeStyle = hotHex;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAnisotropy;
    return tex;
  }

  /**
   * Soft radial glow sprite texture for flying sparks and embers
   */
  public createSparkParticleTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, 2, cx, cx, cx);
    grad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
    grad.addColorStop(0.25, 'rgba(255, 195, 70, 0.95)');
    grad.addColorStop(0.6, 'rgba(255, 95, 10, 0.45)');
    grad.addColorStop(1.0, 'rgba(255, 40, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

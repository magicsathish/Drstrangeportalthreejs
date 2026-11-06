import * as THREE from 'three';
import { CollisionManager } from './CollisionManager';
import { Vector3Tuple, WorldId } from './types';

// Pre-allocated movement vectors
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * First-Person Player Controller supporting Desktop (WASD + Shift + Pointer Lock + Mouse Drag)
 * and Mobile (Virtual Touch Joystick + Touch Drag Look) with physical collision resolution
 * and smooth head-bob / sprint FOV kinematics.
 */
export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public previousPosition: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw = 0;
  public pitch = 0;
  public isPointerLocked = false;
  public isRunning = false;

  private keys: Record<string, boolean> = {};
  private joystickInput = { x: 0, y: 0 };
  private isDraggingLook = false;
  private lastPointerPos = { x: 0, y: 0 };
  private domElement: HTMLElement;
  private collisionManager: CollisionManager;

  // Auto-pilot walk state (optional convenience for one-click portal crossing demonstration)
  private autoWalkTarget: THREE.Vector3 | null = null;

  private readonly walkSpeed = 6.2;
  private readonly runSpeed = 10.5;
  private readonly eyeHeight = 1.72;
  private bobTimer = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    collisionManager: CollisionManager,
    initialSpawn: Vector3Tuple,
    initialYaw: number
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.collisionManager = collisionManager;

    this.position = new THREE.Vector3(
      initialSpawn.x,
      initialSpawn.y,
      initialSpawn.z
    );
    this.previousPosition = this.position.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = initialYaw;
    this.pitch = 0;

    this.syncCameraTransform(0);
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  public requestPointerLock(): void {
    try {
      if (document.pointerLockElement !== this.domElement && this.domElement.requestPointerLock) {
        this.domElement.requestPointerLock();
      }
    } catch {
      // Fallback drag-to-look remains active if pointer lock is restricted by iframe
    }
  }

  public exitPointerLock(): void {
    try {
      if (document.pointerLockElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch {
      // Ignore
    }
  }

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    // Ignore shortcuts if typing in an input field
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }
    this.keys[e.code] = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isRunning = true;
    }
    // Cancel auto-walk on manual key press
    if (
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        e.code
      )
    ) {
      this.autoWalkTarget = null;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isRunning = false;
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0 && !this.isPointerLocked) {
      this.isDraggingLook = true;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    }
  };

  private onMouseUp = (): void => {
    this.isDraggingLook = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const sensitivity = 0.0022;
    if (this.isPointerLocked) {
      this.yaw -= e.movementX * sensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - e.movementY * sensitivity,
        -Math.PI / 2.25,
        Math.PI / 2.25
      );
    } else if (this.isDraggingLook) {
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      this.yaw -= dx * sensitivity * 1.3;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - dy * sensitivity * 1.3,
        -Math.PI / 2.25,
        Math.PI / 2.25
      );
    }
  };

  /**
   * Called by Mobile Touch Joystick UI component
   */
  public setJoystickInput(x: number, y: number): void {
    this.joystickInput.x = x;
    this.joystickInput.y = y;
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
      this.autoWalkTarget = null;
    }
  }

  /**
   * Called by Mobile Touch Look area
   */
  public applyTouchLookDelta(deltaX: number, deltaY: number): void {
    const touchSensitivity = 0.0038;
    this.yaw -= deltaX * touchSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - deltaY * touchSensitivity,
      -Math.PI / 2.25,
      Math.PI / 2.25
    );
  }

  public setTeleportState(newPos: THREE.Vector3, newYaw: number): void {
    this.position.copy(newPos);
    this.previousPosition.copy(newPos);
    this.yaw = newYaw;
    this.autoWalkTarget = null;
    this.syncCameraTransform(0);
  }

  /**
   * Initiates a smooth physical walk straight through a target portal point
   */
  public startAutoWalkThroughPortal(portalPos: THREE.Vector3, portalNormalZSign: number): void {
    // If player is far from the portal (> 7m), place them at a dramatic approach point 4.5m in front
    // of the portal first so they physically walk across the portal threshold within ~1.2 seconds.
    const distToPortal = Math.hypot(
      portalPos.x - this.position.x,
      portalPos.z - this.position.z
    );
    if (distToPortal > 7.0) {
      this.position.set(
        portalPos.x,
        this.eyeHeight,
        portalPos.z - portalNormalZSign * 4.2
      );
      this.previousPosition.copy(this.position);
    }

    const dx = portalPos.x - this.position.x;
    const dz = portalPos.z - this.position.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = 0;

    this.autoWalkTarget = new THREE.Vector3(
      portalPos.x,
      this.eyeHeight,
      portalPos.z + portalNormalZSign * 1.4
    );
  }

  public update(delta: number, activeWorldId: WorldId): void {
    const dt = Math.min(delta, 0.16);
    this.previousPosition.copy(this.position);

    // Forward (-Z rotated by yaw) and Right (+X rotated by yaw) on the horizontal XZ plane
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    _moveDir.set(0, 0, 0);

    // Keyboard WASD / Arrow input
    if (this.keys['KeyW'] || this.keys['ArrowUp']) _moveDir.add(_forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) _moveDir.sub(_forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) _moveDir.add(_right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) _moveDir.sub(_right);

    // Mobile Touch Joystick input
    if (Math.abs(this.joystickInput.x) > 0.01 || Math.abs(this.joystickInput.y) > 0.01) {
      _moveDir.addScaledVector(_right, this.joystickInput.x);
      _moveDir.addScaledVector(_forward, -this.joystickInput.y);
    }

    // Optional Auto-Walk toward portal plane
    if (this.autoWalkTarget) {
      const toTarget = new THREE.Vector3().subVectors(this.autoWalkTarget, this.position);
      toTarget.y = 0;
      if (toTarget.length() < 0.25) {
        this.autoWalkTarget = null;
      } else {
        toTarget.normalize();
        _moveDir.copy(toTarget);
      }
    }

    const isMoving = _moveDir.lengthSq() > 0.001;
    if (isMoving) {
      _moveDir.normalize();
    }

    const targetSpeed =
      this.isRunning || this.autoWalkTarget !== null
        ? this.runSpeed
        : this.walkSpeed;
    const targetVx = _moveDir.x * targetSpeed;
    const targetVz = _moveDir.z * targetSpeed;

    // Smooth exponential damping on horizontal velocity
    const damping = 12.0;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVx, damping, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVz, damping, dt);

    // Advance player position
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Resolve collisions against walls, pillars, and portal openings
    this.collisionManager.resolvePlayerPosition(
      activeWorldId,
      this.position,
      this.eyeHeight
    );

    // Subtle first-person footsteps head-bob
    const speedMag = Math.hypot(this.velocity.x, this.velocity.z);
    if (speedMag > 0.4) {
      this.bobTimer += dt * (this.isRunning ? 13.5 : 9.5);
    } else {
      this.bobTimer = 0;
    }
    const bobOffset =
      speedMag > 0.4 ? Math.sin(this.bobTimer) * 0.042 * Math.min(speedMag / 6, 1) : 0;

    // Subtle FOV widening when sprinting
    const targetFov = this.isRunning && isMoving ? 75 : 70;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
      this.camera.updateProjectionMatrix();
    }

    this.syncCameraTransform(bobOffset);
  }

  private syncCameraTransform(bobOffset: number): void {
    this.camera.position.set(
      this.position.x,
      this.position.y + bobOffset,
      this.position.z
    );
    _euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(_euler);
  }
}

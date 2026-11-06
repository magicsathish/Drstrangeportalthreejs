import React, { useRef, useState } from 'react';

interface TouchControlsProps {
  onJoystickMove: (x: number, y: number) => void;
  onTouchLookDelta: (dx: number, dy: number) => void;
  isRunning: boolean;
  onToggleRun: () => void;
}

/**
 * Mobile & Touch Screen First-Person Controls:
 * - Left Virtual Thumbstick for 360-degree smooth movement
 * - Right Touch-Drag Zone for smooth camera look
 * - Sprint toggle button
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  onJoystickMove,
  onTouchLookDelta,
  isRunning,
  onToggleRun,
}) => {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });

  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  const maxRadius = 42;

  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!touch) return;

    const rect = e.currentTarget.getBoundingClientRect();
    joystickTouchId.current = touch.identifier;
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchId.current) {
        updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setKnobOffset({ x: 0, y: 0 });
        onJoystickMove(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - joystickCenter.current.x;
    const dy = clientY - joystickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: kx, y: ky });
    onJoystickMove(kx / maxRadius, ky / maxRadius);
  };

  const handleLookStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        onTouchLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  return (
    <>
      {/* Right-half invisible touch-drag look area for mobile/tablets */}
      <div
        className="fixed inset-y-16 right-0 w-1/2 z-10 md:hidden touch-none"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Bottom-left Virtual Movement Joystick (visible on mobile/touch viewports or via toggle) */}
      <div className="fixed bottom-24 left-5 z-20 flex items-end gap-3 md:hidden select-none touch-none">
        <div
          className="relative w-28 h-28 rounded-full bg-[#0b0f19]/90 border border-amber-500/40 flex items-center justify-center shadow-lg"
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
          aria-label="Movement Joystick"
        >
          {/* Crosshair guide */}
          <div className="w-16 h-16 rounded-full border border-slate-700/60 pointer-events-none" />
          {/* Thumb knob */}
          <div
            className="w-11 h-11 rounded-full bg-amber-500/90 border border-amber-200 shadow-md pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={onToggleRun}
          className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
            isRunning
              ? 'bg-amber-500 text-slate-950 border-amber-300'
              : 'bg-[#0b0f19]/90 text-slate-200 border-slate-700'
          }`}
        >
          {isRunning ? 'Sprint: On' : 'Sprint'}
        </button>
      </div>
    </>
  );
};

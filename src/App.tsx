import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Maximize2,
  Minimize2,
  MoveRight,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AssetImportModal } from './components/AssetImportModal';
import { TouchControls } from './components/TouchControls';
import { PORTAL_STYLES } from './engine/defaultConfig';
import { PortalEngine } from './engine/PortalEngine';
import { TraversalResult } from './engine/PortalManager';
import { EngineTelemetry, ExternalAssetConfig, WorldId } from './engine/types';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PortalEngine | null>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRunningMobile, setIsRunningMobile] = useState(false);
  const [activeStyleId, setActiveStyleId] = useState<string>('eldritch_gold');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);
  const [traversalFlash, setTraversalFlash] = useState(false);

  const [telemetry, setTelemetry] = useState<EngineTelemetry>({
    activeWorldId: 'world_01',
    activeWorldName: 'Mystic Sanctum',
    activeWorldSubtitle: 'Hall of the Ancient Relics · Earth Realm',
    connectedWorldName: 'Astral Dimension',
    playerPosition: { x: 0, y: 1.7, z: 9.5 },
    playerYaw: 0,
    distanceToNearestPortal: 23.7,
    traversalCount: 0,
    isPointerLocked: false,
    isSoftwareGl: false,
    fps: 60,
  });

  const handleTelemetry = useCallback((data: EngineTelemetry) => {
    setTelemetry(data);
  }, []);

  const handleTraversal = useCallback((_result: TraversalResult) => {
    setTraversalFlash(true);
    window.setTimeout(() => setTraversalFlash(false), 320);
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new PortalEngine(
      container,
      undefined,
      handleTelemetry,
      handleTraversal
    );
    engineRef.current = engine;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'KeyH') {
        setIsDockCollapsed((prev) => !prev);
      }
    };

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleTelemetry, handleTraversal]);

  const handleEnterExperience = () => {
    setShowIntro(false);
    engineRef.current?.enterExperience();
  };

  const handleWalkThroughPortal = () => {
    setShowIntro(false);
    engineRef.current?.walkThroughActivePortal();
  };

  const handleSwitchWorldSpawn = (worldId: WorldId) => {
    setShowIntro(false);
    engineRef.current?.resetToWorldSpawn(worldId);
  };

  const handleStyleSelect = (styleId: string) => {
    setActiveStyleId(styleId);
    engineRef.current?.setPortalStyleById(styleId);
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    const next = !isMuted;
    engineRef.current.soundEffects.isMuted = next;
    setIsMuted(next);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleJoystickMove = useCallback((x: number, y: number) => {
    engineRef.current?.playerController.setJoystickInput(x, y);
  }, []);

  const handleTouchLookDelta = useCallback((dx: number, dy: number) => {
    engineRef.current?.playerController.applyTouchLookDelta(dx, dy);
  }, []);

  const handleToggleMobileRun = useCallback(() => {
    setIsRunningMobile((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.playerController.isRunning = next;
      }
      return next;
    });
  }, []);

  const handleImportExternalAsset = (
    worldId: WorldId,
    asset: ExternalAssetConfig
  ) => {
    engineRef.current?.worldManager.importExternalModelIntoWorld(worldId, asset);
  };

  const isWorld01 = telemetry.activeWorldId === 'world_01';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080d] select-none">
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        onClick={() => {
          if (!showIntro && !isAssetModalOpen) {
            engineRef.current?.enterExperience();
          }
        }}
        className="w-full h-full cursor-crosshair"
      />

      {/* Subtle Dimensional Crossing Rim Flash */}
      <div
        className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-300 ${
          traversalFlash ? 'opacity-60' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle at center, transparent 35%, rgba(251, 146, 60, 0.55) 100%)',
        }}
      />

      {/* Subtle Center Crosshair when navigating */}
      {!showIntro && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-300/70 ring-2 ring-black/40" />
        </div>
      )}

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#090c15]/90 border-b border-slate-800/80">
        {/* Zone 1: Single-line Brand Title */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setShowIntro(true);
          }}
          className="text-base md:text-lg font-bold tracking-wide font-display text-amber-300 whitespace-nowrap shrink-0"
        >
          Doctor Strange Connecting Portal
        </a>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleSwitchWorldSpawn('world_01')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${
              isWorld01 ? 'text-amber-300 underline underline-offset-4' : ''
            }`}
          >
            Mystic Sanctum
          </button>
          <button
            type="button"
            onClick={() => handleSwitchWorldSpawn('world_02')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${
              !isWorld01 ? 'text-amber-300 underline underline-offset-4' : ''
            }`}
          >
            Astral Dimension
          </button>
          <button
            type="button"
            onClick={handleWalkThroughPortal}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Traverse Portal
          </button>
          <button
            type="button"
            onClick={() => setIsAssetModalOpen(true)}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Import 3D Asset
          </button>
          <button
            type="button"
            onClick={() => setShowControlsGuide((prev) => !prev)}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            Controls Guide
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {showIntro ? (
            <button
              type="button"
              onClick={handleEnterExperience}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Enter Experience
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Active World & Movement Instructions Banner (Top-Left below header) */}
      {!showIntro && (
        <div className="fixed top-16 left-6 z-20 pointer-events-none max-w-md">
          <div className="bg-[#090c15]/88 border border-slate-800/80 rounded-xl px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Current World</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                Portal {telemetry.distanceToNearestPortal}m ahead
              </span>
              <span aria-hidden="true">·</span>
              <span>Links to {telemetry.connectedWorldName}</span>
            </div>
            <h2 className="text-lg font-bold font-display text-slate-100 mt-0.5">
              {telemetry.activeWorldName}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              WASD to Walk <span aria-hidden="true">·</span> Shift to Run{' '}
              <span aria-hidden="true">·</span> Mouse / Drag to Look{' '}
              <span aria-hidden="true">·</span> ESC to Release Cursor
            </p>
          </div>
        </div>
      )}

      {/* Optional Controls Guide Popover */}
      {showControlsGuide && !showIntro && (
        <div className="fixed top-16 right-6 z-30 w-80 bg-[#0b0f1c]/95 border border-slate-800 rounded-xl p-4 shadow-2xl text-xs text-slate-300 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-amber-300 font-display">
              Navigation & Portal Architecture
            </span>
            <button
              type="button"
              onClick={() => setShowControlsGuide(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Walk physically through the glowing circular gateway on the main wall to cross seamlessly between the{' '}
            <strong className="text-slate-200">Mystic Sanctum</strong> and the{' '}
            <strong className="text-slate-200">Astral Dimension</strong>.
          </p>
          <div className="space-y-1 text-slate-300 pt-1">
            <div>Desktop: W / A / S / D to move · Shift to run</div>
            <div>Look: Click canvas for Pointer Lock or Drag mouse</div>
            <div>Release Cursor: Press ESC key</div>
            <div>Mobile: Left Thumbstick to move · Right Drag to look</div>
          </div>
        </div>
      )}

      {/* Attractive Introduction Overlay Screen (Section 13 Requirement) */}
      {showIntro && (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-6 bg-gradient-to-t from-[#05070e]/90 via-[#05070e]/55 to-transparent">
          <div className="max-w-2xl w-full bg-[#090d18]/92 border border-amber-500/30 rounded-2xl p-8 md:p-10 shadow-2xl text-center">
            <div className="text-xs text-amber-300/90 tracking-widest uppercase mb-2">
              Real-Time Bidirectional 3D Portal Engine · Three.js WebGL
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold font-display text-slate-100 tracking-wide"
              style={{ textWrap: 'balance' }}
            >
              Doctor Strange Connecting Portal
            </h1>
            <p className="text-sm md:text-base text-slate-300 mt-4 max-w-xl mx-auto leading-relaxed">
              Explore two independent, physically navigable 3D halls connected through a live dimensional Sling Ring gateway. Look directly through the portal to view the destination world rendered in real time, and walk physically across the threshold in both directions.
            </p>

            {/* Connected Worlds Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-left">
              <div className="rounded-xl bg-[#0e1424] border border-slate-800 p-4">
                <div className="text-xs text-amber-400 font-medium">
                  World 01 · Active Spawn
                </div>
                <div className="text-base font-semibold font-display text-slate-100 mt-0.5">
                  Mystic Sanctum
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ancient slate & brass astrolabe floor, fluted pillars with levitating braziers, and the Seal of the Vishanti oculus skylight.
                </p>
              </div>

              <div className="rounded-xl bg-[#130d24] border border-slate-800 p-4">
                <div className="text-xs text-fuchsia-400 font-medium">
                  World 02 · Connected Destination
                </div>
                <div className="text-base font-semibold font-display text-slate-100 mt-0.5">
                  Astral Dimension
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Crystalline monolith colonnade, glowing violet hex-circuit floor, and rotating cosmic astrolabe rings with a return portal.
                </p>
              </div>
            </div>

            {/* Simple Movement Instructions */}
            <div className="mt-6 py-3 px-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span>WASD / Arrows: Move</span>
              <span aria-hidden="true">·</span>
              <span>Mouse / Touch Drag: Look</span>
              <span aria-hidden="true">·</span>
              <span>Shift: Run</span>
              <span aria-hidden="true">·</span>
              <span>ESC: Release Mouse</span>
            </div>

            {/* Primary CTA Buttons */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleEnterExperience}
                className="px-7 py-3 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition-colors whitespace-nowrap shrink-0"
              >
                Enter Experience
              </button>
              <button
                type="button"
                onClick={handleWalkThroughPortal}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Auto-Walk Through Portal</span>
                <MoveRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Touch Joystick & Drag-to-Look Controls */}
      {!showIntro && (
        <TouchControls
          onJoystickMove={handleJoystickMove}
          onTouchLookDelta={handleTouchLookDelta}
          isRunning={isRunningMobile}
          onToggleRun={handleToggleMobileRun}
        />
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className="fixed bottom-4 left-1/2 z-30 w-[min(920px,94vw)] transition-transform duration-200"
        style={{
          transform: isDockCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Tab */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-t-lg bg-[#090c15]/95 border border-b-0 border-slate-800 text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Portal Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Bottom Dock Surface */}
        <div className="rounded-xl bg-[#090c15]/95 border border-slate-800 px-4 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          {/* Left: Current World & Live Portal Telemetry */}
          <div className="flex items-center gap-3 min-w-0">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs text-slate-300 truncate">
              <span className="font-semibold text-slate-100">
                {telemetry.activeWorldName}
              </span>
              <span className="mx-1.5 text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-400 font-mono-tabular">
                Pos ({telemetry.playerPosition.x}, {telemetry.playerPosition.z})
              </span>
              <span className="mx-1.5 text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-amber-300 font-mono-tabular">
                Traversals: {telemetry.traversalCount}
              </span>
            </div>
          </div>

          {/* Center: Sling Ring Style Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
            {Object.values(PORTAL_STYLES).map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => handleStyleSelect(style.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeStyleId === style.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {style.id === 'eldritch_gold'
                  ? 'Eldritch Gold'
                  : style.id === 'astral_amethyst'
                  ? 'Astral Amethyst'
                  : 'Crimson Vishanti'}
              </button>
            ))}
          </div>

          {/* Right: Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleWalkThroughPortal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Walk Through Portal</span>
              <MoveRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleSwitchWorldSpawn(telemetry.activeWorldId)}
              title="Reset Player Position in Current Hall"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAssetModalOpen(true)}
              title="Import External GLB/GLTF 3D Model"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GLB</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Portal Audio' : 'Mute Portal Audio'}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shrink-0"
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* External 3D GLB/GLTF Asset Loader Modal */}
      <AssetImportModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        activeWorldId={telemetry.activeWorldId}
        onImportAsset={handleImportExternalAsset}
      />
    </div>
  );
}

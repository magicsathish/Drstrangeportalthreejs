import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ExternalAssetConfig, WorldId } from '../engine/types';

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorldId: WorldId;
  onImportAsset: (worldId: WorldId, asset: ExternalAssetConfig) => void;
}

export const AssetImportModal: React.FC<AssetImportModalProps> = ({
  isOpen,
  onClose,
  activeWorldId,
  onImportAsset,
}) => {
  const [targetWorld, setTargetWorld] = useState<WorldId>(activeWorldId);
  const [modelUrl, setModelUrl] = useState('');
  const [scale, setScale] = useState(1.0);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [enableCollider, setEnableCollider] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setModelUrl(objectUrl);
    setStatusMessage(`Selected local 3D file: ${file.name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelUrl.trim()) {
      setStatusMessage('Please provide a GLB/GLTF URL or choose a local .glb file.');
      return;
    }

    onImportAsset(targetWorld, {
      id: `custom_asset_${Date.now()}`,
      url: modelUrl.trim(),
      format: modelUrl.toLowerCase().endsWith('.gltf') ? 'gltf' : 'glb',
      position: { x: Number(posX), y: Number(posY), z: Number(posZ) },
      rotationY: 0,
      scale: Number(scale) || 1,
      autoGenerateBoundsCollider: enableCollider,
    });

    setStatusMessage('3D Asset dispatched to World Scene Loader.');
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#0d121f] border border-slate-800 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold font-display text-amber-300">
              Import External 3D Environment / GLB Asset
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Mount custom GLB or GLTF architectural models into any connected portal world
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Destination World
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetWorld('world_01')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  targetWorld === 'world_01'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                World 01 · Mystic Sanctum
              </button>
              <button
                type="button"
                onClick={() => setTargetWorld('world_02')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  targetWorld === 'world_02'
                    ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                World 02 · Astral Dimension
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              GLB / GLTF File or URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://example.com/model.glb or upload local file"
                className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Browse .GLB</span>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pos X (m)</label>
              <input
                type="number"
                step="0.5"
                value={posX}
                onChange={(e) => setPosX(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pos Y (m)</label>
              <input
                type="number"
                step="0.5"
                value={posY}
                onChange={(e) => setPosY(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pos Z (m)</label>
              <input
                type="number"
                step="0.5"
                value={posZ}
                onChange={(e) => setPosZ(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Scale</label>
              <input
                type="number"
                step="0.1"
                min="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enableCollider}
              onChange={(e) => setEnableCollider(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500"
            />
            <span>Automatically register bounding-box collision for imported asset</span>
          </label>

          {statusMessage && (
            <p className="text-xs text-amber-300">{statusMessage}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
            >
              Load Into Scene
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

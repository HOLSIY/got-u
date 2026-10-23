import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, Move, Loader2, Sparkles } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string | File | Blob;
  aspectRatio: number; // e.g. 1 for avatar (square), 2.5 for cover
  cropShape?: 'round' | 'rect';
  title?: string;
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob, croppedDataUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  aspectRatio = 1,
  cropShape = 'round',
  title = 'Adjust & Crop Image',
  onCancel,
  onConfirm,
}) => {
  const [imageObjectUrl, setImageObjectUrl] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert File to Object URL if needed
  useEffect(() => {
    if (typeof imageSrc === 'string') {
      setImageObjectUrl(imageSrc);
    } else if (imageSrc) {
      const url = URL.createObjectURL(imageSrc as Blob);
      setImageObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageSrc]);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse / Touch drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialTouchDistRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialTouchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && initialTouchDistRef.current !== null) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const scaleFactor = currentDist / initialTouchDistRef.current;
      setZoom((prev) => Math.max(0.6, Math.min(3.5, prev * (scaleFactor > 1 ? 1.03 : 0.97))));
      initialTouchDistRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialTouchDistRef.current = null;
  };

  // Perform canvas crop
  const handleApplyCrop = useCallback(async () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const cropContainer = containerRef.current;
      const containerRect = cropContainer.getBoundingClientRect();

      // Output resolution target
      const outputWidth = aspectRatio === 1 ? 600 : 1200;
      const outputHeight = Math.round(outputWidth / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // Translate to center
      ctx.save();
      ctx.translate(outputWidth / 2, outputHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Scale factor from container to target canvas
      const scaleToCanvas = outputWidth / containerRect.width;

      // Draw the image at the transformed scale and position
      const renderedWidth = img.clientWidth * zoom * scaleToCanvas;
      const renderedHeight = img.clientHeight * zoom * scaleToCanvas;
      const drawX = position.x * scaleToCanvas - renderedWidth / 2;
      const drawY = position.y * scaleToCanvas - renderedHeight / 2;

      ctx.drawImage(img, drawX, drawY, renderedWidth, renderedHeight);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onConfirm(blob, dataUrl);
          } else {
            // Fallback with base64 converted to blob
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const fallbackBlob = new Blob([ab], { type: mimeString });
            onConfirm(fallbackBlob, dataUrl);
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      console.error('Crop processing failed:', err);
      setIsProcessing(false);
    }
  }, [aspectRatio, rotation, zoom, position, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#12141d] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff2d60]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Box / Crop Stage */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden p-6 select-none" style={{ minHeight: '280px' }}>
          {/* Draggable Image Stage */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative flex items-center justify-center overflow-hidden cursor-move select-none ${
              cropShape === 'round' ? 'w-56 h-56 rounded-full' : 'w-full max-w-sm h-36 rounded-2xl'
            } ring-2 ring-[#ff2d60] shadow-2xl z-10`}
          >
            {imageObjectUrl && (
              <img
                ref={imageRef}
                src={imageObjectUrl}
                alt="Crop preview"
                onLoad={handleImageLoaded}
                draggable={false}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                  maxWidth: 'none',
                }}
                className="select-none pointer-events-none"
              />
            )}
          </div>

          {/* Guidelines Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-black/40 flex items-center justify-center">
            <div
              className={`border-2 border-dashed border-white/60 pointer-events-none ${
                cropShape === 'round' ? 'w-56 h-56 rounded-full' : 'w-full max-w-sm h-36 rounded-2xl'
              }`}
            />
          </div>

          {/* Hint Overlay */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/80 font-medium flex items-center gap-1.5 pointer-events-none">
            <Move className="w-3 h-3" />
            <span>Drag to pan • Pinch / Slider to zoom</span>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 bg-slate-50 dark:bg-[#181a24] border-t border-slate-100 dark:border-white/10">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min="0.6"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#ff2d60] h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="p-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/20 transition-all cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-2xl border border-slate-300 dark:border-white/10 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cropping...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply & Use</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

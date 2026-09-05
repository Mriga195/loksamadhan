import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * Interactive Before & After split comparison slider.
 * Lets citizens and officers drag a divider between the reported defect photo (Before)
 * and the officer's resolution proof photo (After).
 *
 * The AI verdict on this evidence lives in the admin triage drawer, not here: it is advisory,
 * costs a paid call, and only an admin acts on it.
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  resolutionNote = '',
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div className="space-y-4">
      {/* ── Interactive Split Comparison Slider ── */}
      <div
        ref={containerRef}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        className="group relative h-[360px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-line bg-slate-900 select-none shadow-md cursor-ew-resize"
      >
        {/* Layer 1: AFTER Image (Resolution Proof - underneath) */}
        <img
          src={afterSrc}
          alt="Resolution proof (After)"
          className="absolute inset-0 size-full object-cover pointer-events-none"
        />

        {/* Layer 2: BEFORE Image (Reported Defect - clipped) */}
        <div
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          className="absolute inset-0 size-full pointer-events-none"
        >
          <img
            src={beforeSrc}
            alt="Reported civic defect (Before)"
            className="absolute inset-0 size-full object-cover pointer-events-none"
          />
        </div>

        {/* Divider Handle Line */}
        <div
          style={{ left: `${sliderPos}%` }}
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
        >
          {/* Circular Grab Knob */}
          <div className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-slate-900/90 text-white shadow-xl backdrop-blur-md transition-transform group-hover:scale-110">
            <svg
              className="size-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>

        {/* Floating Badges */}
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/20 shadow-md">
          <span className="size-2 rounded-full bg-amber-400" />
          Before: Reported Issue
        </div>

        <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-purple-950/85 px-3 py-1 text-xs font-bold text-purple-100 backdrop-blur-md border border-purple-400/30 shadow-md">
          <span className="size-2 rounded-full bg-emerald-400" />
          After: Officer Proof
        </div>

        {/* Bottom Helper Hint */}
        <div className="pointer-events-none absolute bottom-3 inset-x-0 z-10 flex justify-center">
          <span className="rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md shadow-sm">
            Drag slider left or right to compare work
          </span>
        </div>

        {/* Accessible Range Input for Keyboard & Screen Readers */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          aria-label="Before and after comparison slider"
          className="sr-only"
        />
      </div>

      {/* Officer Resolution Note */}
      {resolutionNote && (
        <div className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-ink-muted flex items-start gap-2">
          <Icon name="clipboard" className="size-4 shrink-0 text-slate-400 mt-0.5" />
          <p>
            <strong className="text-ink font-semibold">Officer Note:</strong> &ldquo;{resolutionNote}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import Spinner from './Spinner';

/**
 * Interactive Before & After split comparison slider.
 * Lets citizens and officers drag a divider between the reported defect photo (Before)
 * and the officer's resolution proof photo (After).
 *
 * Includes integrated AI Resolution Verification status (via Groq Vision).
 */
export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  aiVerification,
  onRunVerification,
  isVerifying = false,
  resolutionNote = '',
  verifiedBy = null,
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

  const hasAI = Boolean(aiVerification && (aiVerification.matchScore !== null || aiVerification.summary));
  const isVerified = Boolean(aiVerification?.verified);
  const isGroq = aiVerification?.provider === 'groq';

  // Determine banner theme based on verification status
  let bannerClass = 'border-purple-200 bg-purple-50/40 text-purple-950';
  let iconBgClass = 'bg-purple-600 text-white';
  let badgeColorClass = 'bg-purple-100 text-purple-800';
  let statusTitle = 'AI Resolution Verification';

  if (hasAI) {
    if (isVerified) {
      bannerClass = 'border-emerald-200 bg-emerald-50/60 text-emerald-950';
      iconBgClass = 'bg-emerald-600 text-white';
      badgeColorClass = 'bg-emerald-100 text-emerald-800';
      statusTitle = `AI Verified Resolution (${aiVerification.matchScore}% Match Score)`;
    } else if (aiVerification.matchScore !== null) {
      bannerClass = 'border-rose-300 bg-rose-50/70 text-rose-950';
      iconBgClass = 'bg-rose-600 text-white';
      badgeColorClass = 'bg-rose-100 text-rose-800';
      statusTitle = `AI Flagged: Evidence Mismatch (${aiVerification.matchScore}% Match)`;
    } else {
      bannerClass = 'border-amber-200 bg-amber-50/60 text-amber-950';
      iconBgClass = 'bg-amber-500 text-white';
      badgeColorClass = 'bg-amber-100 text-amber-800';
      statusTitle = 'AI Inspection Pending / Under Review';
    }
  }

  return (
    <div className="space-y-4">
      {/* ── AI Verification Banner (if available or triggerable) ── */}
      <div className={`rounded-2xl border p-4 transition-all duration-300 ${bannerClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`grid size-9 place-items-center rounded-xl text-base shadow-sm ${iconBgClass}`}>
              {hasAI ? (isVerified ? '✓' : (aiVerification?.matchScore !== null ? '⚠️' : '🤖')) : '🤖'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold leading-tight">
                  {statusTitle}
                </h3>
                {hasAI && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColorClass}`}>
                    {isGroq ? 'Groq Vision AI' : 'Rule Verified'}
                  </span>
                )}
                {verifiedBy && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    ✓ Admin Approved
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">
                {hasAI
                  ? aiVerification.summary
                  : 'Multi-modal AI vision inspection analyzes physical before-and-after change.'}
              </p>
            </div>
          </div>

          {onRunVerification && (
            <button
              type="button"
              onClick={onRunVerification}
              disabled={isVerifying}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-purple-300 bg-white px-3 py-1 text-xs font-semibold text-purple-700 shadow-sm transition-all duration-200 hover:bg-purple-50 hover:border-purple-400 disabled:opacity-60 cursor-pointer"
            >
              {isVerifying ? <Spinner label="Analyzing…" /> : <Icon name="refresh" className="size-3.5" />}
              <span>{hasAI && isGroq ? 'Re-Verify with AI' : 'Run AI Inspection'}</span>
            </button>
          )}
        </div>
      </div>

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

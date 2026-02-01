import React from 'react';
import { X } from 'lucide-react';

export type TutorialPlacement = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface TutorialStep {
  title: string;
  description: string;
  targetId?: string | null;
  placement?: TutorialPlacement;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  currentStep: number;
  visible: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const centerStyle: React.CSSProperties = {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

const clamp = (value: number, min: number, max: number) => {
  if (min > max) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const getTooltipPosition = (
  rect: DOMRect,
  placement: TutorialPlacement = 'bottom',
  tooltipRect?: DOMRect | null,
): React.CSSProperties => {
  const margin = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const tooltipWidth = tooltipRect?.width ?? 0;
  const tooltipHeight = tooltipRect?.height ?? 0;
  const horizontalMin = margin + tooltipWidth / 2;
  const horizontalMax = viewportWidth - margin - tooltipWidth / 2;
  const verticalCenterMin = margin + tooltipHeight / 2;
  const verticalCenterMax = viewportHeight - margin - tooltipHeight / 2;

  const safeHorizontalLeft = margin + tooltipWidth;
  const safeHorizontalRight = viewportWidth - margin - tooltipWidth;
  const safeVerticalTop = margin + tooltipHeight;
  const safeVerticalBottom = viewportHeight - margin - tooltipHeight;

  switch (placement) {
    case 'top': {
      const top = clamp(rect.top - margin, safeVerticalTop, viewportHeight - margin);
      const left = clamp(rect.left + rect.width / 2, horizontalMin, horizontalMax);
      return { top: `${top}px`, left: `${left}px`, transform: 'translate(-50%, -100%)' };
    }
    case 'left': {
      const top = clamp(rect.top + rect.height / 2, verticalCenterMin, verticalCenterMax);
      const left = clamp(rect.left - margin, safeHorizontalLeft, viewportWidth - margin);
      return { top: `${top}px`, left: `${left}px`, transform: 'translate(-100%, -50%)' };
    }
    case 'right': {
      const top = clamp(rect.top + rect.height / 2, verticalCenterMin, verticalCenterMax);
      const left = clamp(rect.right + margin, margin, safeHorizontalRight);
      return { top: `${top}px`, left: `${left}px`, transform: 'translate(0, -50%)' };
    }
    case 'bottom':
    default: {
      const top = clamp(rect.bottom + margin, margin, safeVerticalBottom);
      const left = clamp(rect.left + rect.width / 2, horizontalMin, horizontalMax);
      return { top: `${top}px`, left: `${left}px`, transform: 'translate(-50%, 0)' };
    }
  }
};

export function TutorialOverlay({
  steps,
  currentStep,
  visible,
  onNext,
  onBack,
  onSkip,
}: TutorialOverlayProps) {
  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = React.useState<React.CSSProperties>(centerStyle);
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);

  const step = steps[currentStep];

  const updatePositions = React.useCallback(() => {
    if (!visible || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!step || !step.targetId) {
      setHighlightRect(null);
      setTooltipStyle(centerStyle);
      return;
    }

    const element = document.getElementById(step.targetId);

    if (!element) {
      setHighlightRect(null);
      setTooltipStyle(centerStyle);
      return;
    }

    const rect = element.getBoundingClientRect();
    setHighlightRect(rect);
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    setTooltipStyle(getTooltipPosition(rect, step.placement, tooltipRect));
  }, [step, visible]);

  React.useEffect(() => {
    if (!visible || typeof document === 'undefined') {
      return;
    }

    const targetId = step?.targetId;
    if (targetId) {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, step?.targetId, visible]);

  React.useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    const raf = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(raf);
  }, [visible, currentStep, updatePositions]);

  React.useEffect(() => {
    if (!visible) return;

    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, true);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
    };
  }, [visible, updatePositions]);

  if (!visible || !step) {
    return null;
  }

  const highlightStyle = highlightRect
    ? {
        top: `${Math.max(highlightRect.top - 12, 8)}px`,
        left: `${Math.max(highlightRect.left - 12, 8)}px`,
        width: `${highlightRect.width + 24}px`,
        height: `${highlightRect.height + 24}px`,
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial walkthrough"
    >
      <div
        className="absolute inset-0 bg-black/70 transition-opacity pointer-events-auto"
        aria-hidden="true"
        onClick={onNext}
      />

      {highlightStyle && (
        <div
          className="fixed border-2 border-white/90 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.35)] transition-all duration-200 ease-out pointer-events-none"
          style={highlightStyle}
        >
          <div className="absolute inset-0 rounded-3xl bg-white/10 animate-pulse" />
        </div>
      )}

      <div
        ref={tooltipRef}
        className="fixed max-w-sm w-[calc(100%-32px)] bg-white rounded-3xl shadow-2xl p-6 text-gray-900 pointer-events-auto transition-all"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-widest text-gray-400">
            Step {currentStep + 1} / {steps.length}
          </div>
          <button
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
        </div>

        <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-5">{step.description}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index <= currentStep ? 'w-4 bg-rose-500' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={onBack}
                className="px-3 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onSkip}
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white pointer-events-auto backdrop-blur"
        aria-label="Close tutorial"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

import React from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw, ChevronRight } from 'lucide-react';
import { ConflictAnalysisResult } from '../types/permit';

interface WorkConflictInlineBannerProps {
  workOrderNumber: string;
  jobType: string | string[];
  analysis: ConflictAnalysisResult | null;
  isLoading: boolean;
  onAnalyze: () => void;
  onOpenDetails: () => void;
}

export const WorkConflictInlineBanner: React.FC<WorkConflictInlineBannerProps> = ({
  workOrderNumber,
  jobType,
  analysis,
  isLoading,
  onAnalyze,
  onOpenDetails,
}) => {
  const wo = (workOrderNumber || '').trim();
  const jt = Array.isArray(jobType) ? jobType.join(', ') : (jobType || '').trim();

  // If nothing is entered yet, show an inviting prompt
  if (!wo && !jt) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
          <Sparkles className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
          <span>Enter a <strong>Work Order Number</strong> and <strong>Type of Job</strong> to enable AI conflict & SIMOPs detection.</span>
        </div>
      </div>
    );
  }

  // If loading
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent-subtle)] p-3 flex items-center justify-between gap-3 text-xs animate-pulse">
        <div className="flex items-center gap-2.5 text-[var(--color-accent)] font-medium">
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          <span>Gemini AI is scanning active plant permits for Work Order #{wo || 'N/A'} and job conflicts...</span>
        </div>
      </div>
    );
  }

  // If not analyzed yet
  if (!analysis) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] border border-[var(--color-accent-border)] text-[var(--color-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-semibold text-[var(--color-text-main)]">
              AI Work Conflict Detection Ready
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              Audit #{wo || 'WO'} ({jt || 'Job'}) against active permits, SIMOPs, and physical drop zones.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm ml-auto"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Scan Conflicts with AI
        </button>
      </div>
    );
  }

  // Analyzed state
  const isCritical = analysis.conflictLevel === 'CRITICAL';
  const isHigh = analysis.conflictLevel === 'HIGH';
  const isMedium = analysis.conflictLevel === 'MEDIUM';
  const isSafe = analysis.conflictLevel === 'NONE' || analysis.conflictLevel === 'LOW';

  return (
    <div
      className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
        isCritical
          ? 'border-red-500/40 bg-red-500/10 text-red-300'
          : isHigh
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : isMedium
          ? 'border-amber-400/30 bg-amber-400/5 text-amber-200'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isCritical ? (
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
        ) : isHigh || isMedium ? (
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-xs text-[var(--color-text-main)]">
              {isSafe ? 'No Conflicts Detected' : `${analysis.detectedConflicts.length} Conflict(s) Detected`}
            </span>
            <span
              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                isCritical
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : isHigh
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : isMedium
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              Risk: {analysis.conflictLevel}
            </span>
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
              WO #{analysis.workOrderNumber || wo}
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-md sm:max-w-xl">
            {analysis.conflictSummary}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        <button
          type="button"
          onClick={onAnalyze}
          title="Re-run AI analysis"
          className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-1"
        >
          <span>Inspect Details</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

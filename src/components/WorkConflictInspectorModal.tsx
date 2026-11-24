import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
  Flame,
  ArrowUpRight,
  Cpu,
  Check,
} from 'lucide-react';
import { ConflictAnalysisResult, DetectedConflictItem } from '../types/permit';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';

interface WorkConflictInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ConflictAnalysisResult | null;
  isLoading: boolean;
  onReanalyze?: () => void;
  source?: string;
}

export const WorkConflictInspectorModal: React.FC<WorkConflictInspectorModalProps> = ({
  isOpen,
  onClose,
  analysis,
  isLoading,
  onReanalyze,
  source,
}) => {
  const [checkedPrecautions, setCheckedPrecautions] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const toggleCheck = (idx: number) => {
    setCheckedPrecautions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-500 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-amber-400/15 text-amber-400 border-amber-400/30';
      case 'LOW':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HOT_WORK_ATMOSPHERE':
        return <Flame className="h-4 w-4 text-amber-500" />;
      case 'SPATIAL_DROP_ZONE':
        return <ArrowUpRight className="h-4 w-4 text-emerald-400" />;
      case 'ISOLATION_LOTO':
        return <Cpu className="h-4 w-4 text-sky-400" />;
      case 'DUPLICATE_WORK_ORDER':
        return <Layers className="h-4 w-4 text-purple-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-elevated)]">
          <div className="flex items-center gap-3">
            <GhacemLogo className="h-10 w-10 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-main)]">
                  AI Work Conflict & SIMOPs Inspector
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)] font-semibold">
                  {source?.includes('gemini') ? 'Gemini 3.8 Flash' : 'Safety Engine'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Automated multi-work-order overlap, spatial SIMOPs, and hazardous activity conflict detection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[var(--color-accent)]" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">
                  Evaluating Work Order & Simultaneous Operations...
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Cross-referencing active permits, location boundaries, hot work hazards, and drop zones.
                </p>
              </div>
            </div>
          ) : analysis ? (
            <>
              {/* Target Identification Pill Strip */}
              <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-[var(--color-text-muted)]">Work Order:</span>
                  <span className="font-bold text-[var(--color-accent)] bg-[var(--color-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                    {analysis.workOrderNumber || 'Unassigned'}
                  </span>
                </div>
                <div className="w-px h-4 bg-[var(--color-border)]" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--color-text-muted)]">Job Type:</span>
                  <span className="font-semibold text-[var(--color-text-main)]">
                    {analysis.jobType || 'General Task'}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border uppercase ${getSeverityBadge(
                      analysis.conflictLevel
                    )}`}
                  >
                    Risk Level: {analysis.conflictLevel}
                  </span>
                </div>
              </div>

              {/* Conflict Summary Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  analysis.conflictLevel === 'CRITICAL'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : analysis.conflictLevel === 'HIGH'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : analysis.conflictLevel === 'MEDIUM'
                    ? 'border-amber-400/30 bg-amber-400/5 text-amber-200'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {analysis.conflictLevel === 'CRITICAL' ? (
                  <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                ) : analysis.conflictLevel === 'HIGH' || analysis.conflictLevel === 'MEDIUM' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-display font-bold text-sm text-[var(--color-text-main)]">
                    {analysis.hasDirectConflict ? 'Operational Conflict Identified' : 'Clear Safety Profile'}
                  </div>
                  <p className="text-xs text-[var(--color-text-main)]/90 leading-relaxed">
                    {analysis.conflictSummary}
                  </p>
                  <p className="text-[11px] font-medium opacity-85 mt-1">
                    Notice: {analysis.approvalNotice}
                  </p>
                </div>
              </div>

              {/* Detected Conflict Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Detected Conflicts & Interferences ({analysis.detectedConflicts.length})
                  </h4>
                  {onReanalyze && (
                    <button
                      onClick={onReanalyze}
                      className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Re-analyze
                    </button>
                  )}
                </div>

                {analysis.detectedConflicts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                    No active simultaneous operations (SIMOPs), duplicate work orders, or spatial collisions found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.detectedConflicts.map((c: DetectedConflictItem, idx: number) => (
                      <div
                        key={c.id || idx}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-sm hover:border-[var(--color-accent-border)] transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                              {getCategoryIcon(c.conflictCategory)}
                            </div>
                            <div>
                              <h5 className="font-display font-semibold text-xs sm:text-sm text-[var(--color-text-main)]">
                                {c.title}
                              </h5>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                                <span className="font-mono">Category: {c.conflictCategory.replace(/_/g, ' ')}</span>
                                {c.conflictingWorkOrder && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-[var(--color-accent)]">
                                      Collides with WO #{c.conflictingWorkOrder}
                                    </span>
                                  </>
                                )}
                                {c.conflictingLocation && (
                                  <>
                                    <span>•</span>
                                    <span>Loc: {c.conflictingLocation}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(
                              c.severity
                            )}`}
                          >
                            {c.severity}
                          </span>
                        </div>

                        {/* Explanation */}
                        <div className="text-xs text-[var(--color-text-muted)] leading-relaxed pl-8">
                          {c.explanation}
                        </div>

                        {/* Recommended Mitigation */}
                        <div className="rounded-lg bg-[var(--color-surface-elevated)] p-3 text-xs border border-[var(--color-border-subtle)] space-y-1">
                          <div className="font-semibold text-[var(--color-accent)] flex items-center gap-1.5 text-[11px]">
                            <ArrowRight className="h-3 w-3" /> Mandatory Safety Mitigation
                          </div>
                          <p className="text-[var(--color-text-main)] pl-4">
                            {c.recommendedMitigation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Precaution Checklist */}
              {analysis.simopsPrecautionChecklist && analysis.simopsPrecautionChecklist.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-semibold text-xs text-[var(--color-text-main)] flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
                      SIMOPs Supervisor Verification Checklist
                    </h4>
                    <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      {Object.values(checkedPrecautions).filter(Boolean).length} of{' '}
                      {analysis.simopsPrecautionChecklist.length} verified
                    </span>
                  </div>
                  <div className="space-y-2">
                    {analysis.simopsPrecautionChecklist.map((item: string, idx: number) => {
                      const isChecked = !!checkedPrecautions[idx];
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleCheck(idx)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center gap-3 transition-colors ${
                            isChecked
                              ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent-border)] text-[var(--color-text-main)]'
                              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isChecked
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-[var(--color-text-muted)] space-y-3">
              <AlertCircle className="h-8 w-8 mx-auto text-[var(--color-text-faint)]" />
              <p>No conflict analysis data available yet.</p>
              {onReanalyze && (
                <button
                  onClick={onReanalyze}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold hover:bg-[var(--color-accent-hover)]"
                >
                  Run Conflict Check
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3.5 bg-[var(--color-surface-elevated)] text-xs">
          <div className="text-[11px] font-mono text-[var(--color-text-faint)]">
            GHACEM OCPF-04 SIMOPs Safety Standard
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acknowledge & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

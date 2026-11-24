import React from 'react';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  FileText,
  Send,
  RotateCcw,
  ShieldCheck,
  Lock,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ConflictAnalysisResult, PermitType } from '../types/permit';

interface WorkflowSidebarProps {
  formType: PermitType;
  submissionId: string;
  isDraft: boolean;
  isSupervisorAuthorized: boolean;
  isEhsTestRequired: boolean;
  isEhsTestDone: boolean;
  isHodApproved: boolean;
  isPermitApproved: boolean;
  isClosed: boolean;
  isSubmitting: boolean;
  lastUpdated?: string;
  conflictAnalysis?: ConflictAnalysisResult | null;
  isConflictLoading?: boolean;
  onRunConflictCheck?: () => void;
  onOpenConflictDetails?: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onClearForm: () => void;
}

export const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({
  formType,
  submissionId,
  isDraft,
  isSupervisorAuthorized,
  isEhsTestRequired,
  isEhsTestDone,
  isHodApproved,
  isPermitApproved,
  isClosed,
  isSubmitting,
  lastUpdated,
  conflictAnalysis,
  isConflictLoading,
  onRunConflictCheck,
  onOpenConflictDetails,
  onSubmit,
  onSaveDraft,
  onClearForm,
}) => {
  const [confirmingReset, setConfirmingReset] = React.useState(false);

  React.useEffect(() => {
    setConfirmingReset(false);
  }, [formType]);

  // Steps definition based on permit requirements
  const steps = [
    {
      id: 'draft',
      label: 'Draft Preparation',
      sub: isDraft && !submissionId ? 'Filling in controls & precautions' : 'Safety controls documented',
      done: !isDraft || !!submissionId,
      current: isDraft && !submissionId,
    },
    {
      id: 'submitted',
      label: 'Server Submission',
      sub: submissionId ? `Recorded: ${submissionId.slice(-8)}` : 'Pending initial submission',
      done: !!submissionId,
      current: !submissionId,
    },
    {
      id: 'supervisor',
      label: 'Site Supervisor Authorization',
      sub: isSupervisorAuthorized ? 'Authorized via Work ID' : 'Pending supervisor sign-off',
      done: isSupervisorAuthorized,
      current: !!submissionId && !isSupervisorAuthorized,
    },
    ...(isEhsTestRequired
      ? [
          {
            id: 'ehs',
            label: 'EHS Atmospheric Space Test',
            sub: isEhsTestDone ? 'Gas test verified & logged' : 'Pre-entry gas test pending',
            done: isEhsTestDone,
            current: isSupervisorAuthorized && !isEhsTestDone,
          },
        ]
      : []),
    {
      id: 'hod',
      label: 'HoD Review & Field Code',
      sub: isHodApproved ? 'HoD authorization granted' : 'Pending HoD decision',
      done: isHodApproved,
      current: (isEhsTestRequired ? isEhsTestDone : isSupervisorAuthorized) && !isHodApproved,
    },
    {
      id: 'active',
      label: isClosed ? 'Closed & Audited' : 'Approved & Active',
      sub: isClosed ? 'Work completed and signed off' : isPermitApproved ? 'Authorized for 24-hour operation' : 'Awaiting all approvals',
      done: isPermitApproved || isClosed,
      current: isHodApproved && !isPermitApproved && !isClosed,
    },
  ];

  const overallStatus = isClosed
    ? 'CLOSED'
    : isPermitApproved
    ? 'APPROVED'
    : isHodApproved
    ? 'FINALIZING'
    : isEhsTestRequired && !isEhsTestDone && isSupervisorAuthorized
    ? 'AWAITING EHS TEST'
    : submissionId && !isSupervisorAuthorized
    ? 'AWAITING SUPERVISOR'
    : submissionId
    ? 'PENDING APPROVAL'
    : 'DRAFT';

  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-4">
      {/* Workflow Stepper Card */}
      <div className={`rounded-xl border p-5 bg-[var(--color-surface)] ${
        formType === 'hotwork'
          ? 'border-red-500/40 shadow-sm shadow-red-500/5'
          : formType === 'height'
          ? 'border-blue-500/40 shadow-sm shadow-blue-500/5'
          : 'border-[var(--color-border)]'
      }`}>
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--color-border)]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              CONTROL LIFECYCLE
            </div>
            <h3 className="font-display font-bold text-sm text-[var(--color-text-main)]">
              Permit Workflow
            </h3>
          </div>
          <span
            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
              isClosed
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                : isPermitApproved
                ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent-border)]'
                : 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/30'
            }`}
          >
            {overallStatus}
          </span>
        </div>

        {/* Stepper items */}
        <div className="relative space-y-4">
          {/* Vertical connecting line */}
          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-[var(--color-border)] z-0" />

          {steps.map((step, index) => {
            const isCompleted = step.done;
            const isCurrent = step.current;

            return (
              <div key={step.id} className="relative z-10 flex items-start gap-3 text-xs">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isCompleted
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                      : isCurrent
                      ? 'border-[var(--color-warning)] bg-[var(--color-warning-subtle)] text-[var(--color-warning)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-faint)]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <span className="font-mono text-xs font-bold">{index + 1}</span>
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>

                <div className="min-w-0 pt-0.5">
                  <div
                    className={`font-medium leading-tight ${
                      isCompleted
                        ? 'text-[var(--color-text-main)]'
                        : isCurrent
                        ? 'text-[var(--color-warning)] font-semibold'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 truncate">
                    {step.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-muted)] flex items-center justify-between">
            <span>Last sync:</span>
            <span>{lastUpdated}</span>
          </div>
        )}
      </div>

      {/* AI Work Conflict Status Card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 font-display font-bold text-xs text-[var(--color-text-main)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            <span>AI Conflict Shield</span>
          </div>
          {conflictAnalysis && (
            <span
              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                conflictAnalysis.conflictLevel === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : conflictAnalysis.conflictLevel === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : conflictAnalysis.conflictLevel === 'MEDIUM'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {conflictAnalysis.conflictLevel}
            </span>
          )}
        </div>

        {isConflictLoading ? (
          <div className="py-2 text-center text-xs text-[var(--color-accent)] flex items-center justify-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Scanning for conflicts...</span>
          </div>
        ) : conflictAnalysis ? (
          <div className="space-y-2 text-xs">
            <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
              {conflictAnalysis.conflictSummary}
            </p>
            {conflictAnalysis.detectedConflicts.length > 0 ? (
              <button
                type="button"
                onClick={onOpenConflictDetails}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-main)] transition-colors"
              >
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{conflictAnalysis.detectedConflicts.length} Conflict(s) Review</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenConflictDetails}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-main)] transition-colors"
              >
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>No SIMOPs Conflicts</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Scan active plant permits for Work Order overlap and dangerous SIMOPs collisions.
            </p>
            {onRunConflictCheck && (
              <button
                type="button"
                onClick={onRunConflictCheck}
                className="w-full py-1.5 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>Check Conflicts with AI</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Commands Card */}
      <div className={`rounded-xl border p-4 space-y-2.5 bg-[var(--color-surface)] ${
        formType === 'hotwork'
          ? 'border-red-500/40 shadow-sm shadow-red-500/5'
          : formType === 'height'
          ? 'border-blue-500/40 shadow-sm shadow-blue-500/5'
          : 'border-[var(--color-border)]'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            OPERATIONAL ACTIONS
          </span>
          <span className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
            formType === 'hotwork'
              ? 'bg-red-600/15 text-red-600 dark:text-red-400'
              : formType === 'height'
              ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
              : 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400'
          }`}>
            {formType === 'hotwork' ? 'RED FORM' : formType === 'height' ? 'BLUE FORM' : 'GREEN FORM'}
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-display font-bold text-xs transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${
            formType === 'hotwork'
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-700/30'
              : formType === 'height'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-700/30'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          {isSubmitting
            ? 'Processing Submission...'
            : submissionId
            ? formType === 'hotwork'
              ? 'Update Hot Work Permit (Red)'
              : formType === 'height'
              ? 'Update Height Permit (Blue)'
              : 'Update General Permit'
            : formType === 'hotwork'
            ? 'Submit Hot Work Permit (Red)'
            : formType === 'height'
            ? 'Submit Height Permit (Blue)'
            : 'Submit General Permit'}
        </button>

        <button
          type="button"
          onClick={onSaveDraft}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-main)] text-xs font-medium transition-colors"
        >
          <FileText className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          Save Local Draft
        </button>

        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-red-500/5 text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Form Fields
          </button>
        ) : (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 space-y-2">
            <p className="text-[11px] font-medium text-red-500 text-center">
              Clear all fields on this form?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)] text-xs font-medium hover:bg-[var(--color-surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingReset(false);
                  onClearForm();
                }}
                className="px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Corporate Compliance Note */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[11px] text-[var(--color-text-muted)] space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]">
          <Lock className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          <span>GHACEM PTW Security Policy</span>
        </div>
        <p className="leading-relaxed">
          All permits are digitally timestamped and sealed with SHA-256 tamper-evident integrity hashes. Authorizations require verified employee Work IDs.
        </p>
      </div>
    </aside>
  );
};

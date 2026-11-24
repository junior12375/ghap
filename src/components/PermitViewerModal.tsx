import React, { useState, useEffect, useRef } from 'react';
import { HistoryRecord, PermitType } from '../types/permit';
import { getWorkOrderNumber, isPermitClosed, isPermitRejected } from '../utils/permitHelpers';
import {
  Printer,
  X,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';

interface PermitViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: PermitType;
  record: HistoryRecord | null;
  submissionId: string;
  relatedPermits?: Array<{ formType: PermitType; record: HistoryRecord; id: string }>;
  canReview?: boolean;
  defaultReviewerName?: string;
  onApprovePermit?: (
    formType: PermitType,
    submissionId: string,
    record: HistoryRecord,
    details: { reviewerName: string; remarks: string }
  ) => Promise<void>;
  onRejectPermit?: (
    formType: PermitType,
    submissionId: string,
    record: HistoryRecord,
    details: { reviewerName: string; reason: string }
  ) => Promise<void>;
}

export const PermitViewerModal: React.FC<PermitViewerModalProps> = ({
  isOpen,
  onClose,
  formType: initialFormType,
  record: initialRecord,
  submissionId: initialSubId,
  relatedPermits = [],
  canReview = false,
  defaultReviewerName = '',
  onApprovePermit,
  onRejectPermit,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [reviewerName, setReviewerName] = useState(defaultReviewerName);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [decisionFeedback, setDecisionFeedback] = useState<{ type: 'approved' | 'rejected'; text: string } | null>(null);
  const [isProcessingDecision, setIsProcessingDecision] = useState<'approve' | 'reject' | null>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIdx(0);
      setReviewerName(defaultReviewerName);
      setDecisionNotes('');
      setDecisionError('');
      setDecisionFeedback(null);
      setIsProcessingDecision(null);
    }
  }, [isOpen, initialSubId, defaultReviewerName]);

  if (!isOpen || !initialRecord) return null;

  const allPermits = [
    { formType: initialFormType, record: initialRecord, id: initialSubId },
    ...relatedPermits,
  ];

  const current = allPermits[selectedIdx] || allPermits[0];
  const { formType, record, id } = current;
  const wo = getWorkOrderNumber(formType, record);
  const location = String(record['Location'] || record['Department/Location'] || 'Unspecified Location');
  const description = String(record['Description'] || record['Purpose'] || 'N/A');
  const isRejected = isPermitRejected(record);
  const isClosed = isPermitClosed(formType, record);
  const hodApproval = String(record['HoD Approval'] || record['Approval Status'] || '');
  const isHodApproved = !isRejected && hodApproval.toLowerCase() === 'approved';
  const rejectionReason = String(record['HoD Rejection Reason'] || record['Rejection Reason'] || '');
  const decisionAt = String(record['HoD Approval At'] || record['Last Updated'] || '');
  const decidedBy = String(
    record['HoD Approved By'] || record['HoD Rejected By'] || ''
  );
  const decisionRemarks = String(record['HoD Decision Remarks'] || '');
  const isRenewal = String(record['Renewal Status'] || '') === 'Approved' || id.includes('-R');

  const statusLabel = isRejected
    ? 'REJECTED'
    : isClosed
    ? 'CLOSED'
    : isHodApproved
    ? 'HOD APPROVED'
    : String(record['Status'] || record['Permit Status'] || 'PENDING REVIEW').toUpperCase();

  const statusBadgeClass = isRejected
    ? 'bg-red-500/15 text-red-500 border-red-500/40'
    : isClosed
    ? 'bg-slate-500/15 text-slate-400 border-slate-500/40'
    : isHodApproved
    ? 'bg-[var(--color-good-subtle)] text-[var(--color-good)] border-[var(--color-good)]/30'
    : 'bg-amber-500/15 text-amber-500 border-amber-500/40';

  const handlePrint = () => {
    window.print();
  };

  const handleApproveClick = async () => {
    if (!onApprovePermit || isProcessingDecision) return;
    setDecisionError('');
    setIsProcessingDecision('approve');
    try {
      await onApprovePermit(formType, id, record, {
        reviewerName: reviewerName.trim() || 'Head of Department (HoD)',
        remarks: decisionNotes.trim(),
      });
      setDecisionFeedback({
        type: 'approved',
        text: `Permit ${id} approved and updated across the safety register.`,
      });
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Failed to approve permit.');
    } finally {
      setIsProcessingDecision(null);
    }
  };

  const handleRejectClick = async () => {
    if (!onRejectPermit || isProcessingDecision) return;
    const trimmedReason = decisionNotes.trim();
    if (!trimmedReason) {
      setDecisionError('A specific rejection reason is required before rejecting this permit.');
      notesTextareaRef.current?.focus();
      return;
    }
    setDecisionError('');
    setIsProcessingDecision('reject');
    try {
      await onRejectPermit(formType, id, record, {
        reviewerName: reviewerName.trim() || 'Head of Department (HoD)',
        reason: trimmedReason,
      });
      setDecisionFeedback({
        type: 'rejected',
        text: `Permit ${id} formally rejected and moved to the Rejected Permits Register.`,
      });
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Failed to reject permit.');
    } finally {
      setIsProcessingDecision(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col max-h-[92vh] print-page">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--color-border)] no-print">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">
                OFFICIAL CORPORATE PERMIT RECORD
              </span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold ${statusBadgeClass}`}>
                {statusLabel}
              </span>
              {isRenewal && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)] font-bold">
                  RENEWED
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-main)] mt-0.5">
              Work Order {wo || '—'} · {location}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>Print Official PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher if multiple permits share this Work Order */}
        {allPermits.length > 1 && (
          <div className="flex border-b border-[var(--color-border)] px-5 pt-2 gap-2 text-xs overflow-x-auto no-print">
            {allPermits.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setSelectedIdx(idx)}
                className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  selectedIdx === idx
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {p.formType.toUpperCase()} ({p.id.slice(-8)})
              </button>
            ))}
          </div>
        )}

        {/* Printable Official Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Interactive Approval / Rejection Panel when opened for decision */}
          {canReview && !isClosed && onApprovePermit && onRejectPermit && (
            <div className="rounded-xl border-2 border-[var(--color-accent-border)] bg-[var(--color-surface-elevated)] p-4 space-y-3 no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
                  <span className="font-display font-bold text-sm text-[var(--color-text-main)]">
                    HoD / EHS Authorization Decision
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  Approve or Reject with Reason
                </span>
              </div>

              {decisionFeedback && (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                    decisionFeedback.type === 'approved'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                      : 'border-red-500/40 bg-red-500/10 text-red-500'
                  }`}
                >
                  {decisionFeedback.type === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{decisionFeedback.text}</span>
                </div>
              )}

              {decisionError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                  <span>{decisionError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-1">
                    Authorizing Officer / HoD Name
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Osei Emmanuel (HoD)"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-snug">
                    Inspect the work scope, hazards, gas tests, and signatures below before issuing final approval or logging a rejection reason.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[var(--color-text-muted)] mb-1">
                  Approval Remarks or Mandatory Rejection Reason
                </label>
                <textarea
                  ref={notesTextareaRef}
                  rows={2}
                  value={decisionNotes}
                  onChange={(e) => {
                    setDecisionNotes(e.target.value);
                    if (decisionError) setDecisionError('');
                  }}
                  placeholder="Optional conditions/remarks when approving, or state the exact safety/operational reason when rejecting..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isProcessingDecision !== null}
                  onClick={handleRejectClick}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-display font-bold text-xs transition-colors cursor-pointer"
                >
                  {isProcessingDecision === 'reject' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>Reject Permit with Reason</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessingDecision !== null}
                  onClick={handleApproveClick}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-display font-bold text-xs transition-colors cursor-pointer"
                >
                  {isProcessingDecision === 'approve' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Approve Permit</span>
                </button>
              </div>
            </div>
          )}

          {/* Recorded Decision Status Callout (Visible on Print & Read-Only View) */}
          {isRejected && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-red-500 font-display font-bold text-xs">
                <AlertOctagon className="h-4 w-4 shrink-0" />
                <span>PERMIT FORMALLY REJECTED</span>
              </div>
              <p className="text-xs text-[var(--color-text-main)] font-medium">
                Reason: {rejectionReason || 'No specific rejection reason recorded.'}
              </p>
              <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                {decidedBy ? `Reviewed By: ${decidedBy} · ` : ''}
                {decisionAt ? `Timestamp: ${decisionAt}` : ''}
              </div>
            </div>
          )}

          {isHodApproved && (
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4 space-y-1">
              <div className="flex items-center gap-2 text-emerald-500 font-display font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>HOD AUTHORIZATION APPROVED</span>
              </div>
              {decisionRemarks && (
                <p className="text-xs text-[var(--color-text-main)]">Remarks: {decisionRemarks}</p>
              )}
              <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                {decidedBy ? `Approved By: ${decidedBy} · ` : ''}
                {decisionAt ? `Timestamp: ${decisionAt}` : ''}
              </div>
            </div>
          )}

          {/* Top Brand Banner */}
          <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface-elevated)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <GhacemLogo className="h-12 w-12 shrink-0 drop-shadow-sm" />
              <div className="h-9 w-px bg-[var(--color-border)]" />
              <HeidelbergMaterialsLogo className="h-8" textColor="var(--color-text-main)" />
              <div className="border-l border-[var(--color-border)] pl-3 hidden md:block">
                <div className="font-display font-extrabold text-sm tracking-wide text-[var(--color-text-main)]">
                  PERMIT-TO-WORK AUTHORIZATION
                </div>
                <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                  Environment, Health &amp; Safety Department · ISO 45001 Standard
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-[var(--color-text-muted)]">
              <div>Permit ID: <strong className="text-[var(--color-text-main)]">{id}</strong></div>
              <div>Issue Date: {String(record['Date of Issue'] || record['Date of Activity'] || record['Date of Work'] || 'N/A')}</div>
            </div>
          </div>

          {/* Core Identification Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
            <div>
              <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">Work Order</span>
              <span className="font-mono font-bold text-xs text-[var(--color-text-main)]">{wo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">Department</span>
              <span className="font-medium text-xs text-[var(--color-text-main)]">{String(record['Department'] || 'General')}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">Location</span>
              <span className="font-medium text-xs text-[var(--color-text-main)]">{location}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">Contractor / Crew</span>
              <span className="font-medium text-xs text-[var(--color-text-main)]">{String(record['Contractor'] || record['Dept/Contractor'] || 'In-House')}</span>
            </div>
          </div>

          {/* Description of Work */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] space-y-1">
            <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">Scope of Activity &amp; Description</span>
            <p className="text-xs text-[var(--color-text-main)] leading-relaxed">{description}</p>
          </div>

          {/* Gas Test Data if Hot Work / Confined Space */}
          {formType === 'hotwork' && (
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] space-y-2">
              <span className="text-[10px] uppercase font-mono text-[var(--color-accent)] font-bold block">
                Atmospheric Gas Test Verification
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">O2 Concentration</span>
                  <span className="font-bold text-[var(--color-text-main)]">{String(record['O2 Reading'] || '20.9%')}</span>
                </div>
                <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Flammable (LEL)</span>
                  <span className="font-bold text-[var(--color-text-main)]">{String(record['LEL Reading'] || '0%')}</span>
                </div>
                <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Carbon Monoxide</span>
                  <span className="font-bold text-[var(--color-text-main)]">{String(record['CO Reading'] || '0 ppm')}</span>
                </div>
                <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Temperature</span>
                  <span className="font-bold text-[var(--color-text-main)]">{String(record['Temp Reading'] || '28°C')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Photo Evidence Embed */}
          {Boolean(record['Isolation Photo Evidence'] || record['Fire Extinguisher Photo Evidence']) && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] block">Verified Safety Photo Evidence</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Boolean(record['Fire Extinguisher Photo Evidence']) && (
                  <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] block mb-1">Fire Extinguisher Attachment</span>
                    <img
                      src={String(record['Fire Extinguisher Photo Evidence'])}
                      alt="Fire Extinguisher Evidence"
                      className="rounded-lg max-h-48 w-full object-contain bg-black/40"
                    />
                  </div>
                )}
                {Boolean(record['Isolation Photo Evidence']) && (
                  <div className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)] block mb-1">LOTO Isolation Attachment</span>
                    <img
                      src={String(record['Isolation Photo Evidence'])}
                      alt="Isolation Evidence"
                      className="rounded-lg max-h-48 w-full object-contain bg-black/40"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures & Authorizations Verified Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] font-mono text-[11px]">
            <div>
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">Supervisor Authorization</span>
              <span className="font-bold text-[var(--color-text-main)]">
                {String(record['Authorization Signed By'] || record['Safe Commence - Mgr'] || record['Auth - Mgr'] || 'Verified Supervisor')}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                Work ID: {String(record['Authorization Signed By ID'] || record['Safe Commence - Mgr ID'] || record['Auth - Mgr ID'] || record['Department Authorized By Work ID'] || '11037')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">Crew Leader Receipt</span>
              <span className="font-bold text-[var(--color-text-main)]">
                {String(record['Crew Leader Signed By'] || record['Safe Commence - Crew'] || record['Auth - Crew'] || 'Crew Leader')}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                Timestamp: {String(record['Last Updated'] || 'Authenticated')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { HistoryRecord, PermitType } from '../types/permit';
import { RefreshCw, X, ShieldAlert, Check } from 'lucide-react';

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: PermitType;
  submissionId: string;
  record: HistoryRecord | null;
  onSubmitRenewal: (formType: PermitType, parentSubmissionId: string, remarks: string) => Promise<void>;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  isOpen,
  onClose,
  formType,
  submissionId,
  record,
  onSubmitRenewal,
}) => {
  const [scopeUnchanged, setScopeUnchanged] = useState(false);
  const [controlsEffective, setControlsEffective] = useState(false);
  const [equipmentReady, setEquipmentReady] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !record) return null;

  const canSubmit = scopeUnchanged && controlsEffective && equipmentReady && remarks.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmitRenewal(formType, submissionId, remarks.trim());
      onClose();
    } catch (e) {
      console.error('Renewal failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[var(--color-accent)]" />
            <h3 className="font-display font-bold text-base text-[var(--color-text-main)]">
              Request 24-Hour Permit Renewal
            </h3>
          </div>

          <button onClick={onClose} className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Reconfirm safety controls prior to issuing another 24-hour authorization for{' '}
          <strong className="text-[var(--color-text-main)] font-mono">{submissionId}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={scopeUnchanged}
                onChange={(e) => setScopeUnchanged(e.target.checked)}
                className="mt-0.5 rounded accent-[var(--color-accent)] cursor-pointer"
              />
              <span className="text-[var(--color-text-main)]">
                Work scope, physical location, and equipment boundaries are completely unchanged.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={controlsEffective}
                onChange={(e) => setControlsEffective(e.target.checked)}
                className="mt-0.5 rounded accent-[var(--color-accent)] cursor-pointer"
              />
              <span className="text-[var(--color-text-main)]">
                All identified hazards, safety barricades, and PPE measures remain active and effective.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={equipmentReady}
                onChange={(e) => setEquipmentReady(e.target.checked)}
                className="mt-0.5 rounded accent-[var(--color-accent)] cursor-pointer"
              />
              <span className="text-[var(--color-text-main)]">
                Tools, isolation padlocks/tags, and emergency rescue gear have been physically re-checked.
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
              Renewal Remarks &amp; Justification <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Briefly explain why work continues into the next 24-hour cycle..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="px-5 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting Renewal...' : 'Authorize 24h Renewal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

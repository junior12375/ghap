import React, { useState } from 'react';
import { Check, X, ShieldCheck, UserCheck } from 'lucide-react';
import { SignatureRecord } from '../types/permit';
import { lookupSupervisorName } from '../utils/permitHelpers';

interface SignatureBlockProps {
  label: string;
  roleDescription?: string;
  signature: SignatureRecord | null | undefined;
  isWorkIdRequired?: boolean;
  onSign: (sig: SignatureRecord) => void;
  onClear: () => void;
}

export const SignatureBlock: React.FC<SignatureBlockProps> = ({
  label,
  roleDescription,
  signature,
  isWorkIdRequired = false,
  onSign,
  onClear,
}) => {
  const [typedName, setTypedName] = useState('');
  const [workId, setWorkId] = useState('');

  const recognizedName = isWorkIdRequired ? lookupSupervisorName(workId) : '';

  const handleSignClick = () => {
    if (isWorkIdRequired) {
      if (!recognizedName) return;
      onSign({
        name: recognizedName,
        workId: workId.trim(),
        at: Date.now(),
      });
      setWorkId('');
    } else {
      if (!typedName.trim()) return;
      onSign({
        name: typedName.trim(),
        at: Date.now(),
      });
      setTypedName('');
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[var(--color-text-main)] block">{label}</span>
          {roleDescription && (
            <span className="text-[11px] text-[var(--color-text-muted)] block mt-0.5">{roleDescription}</span>
          )}
        </div>
        {signature && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--color-good)] bg-[var(--color-good-subtle)] px-2 py-0.5 rounded border border-[var(--color-good)]/30">
            <ShieldCheck className="h-3 w-3" />
            Signed
          </span>
        )}
      </div>

      {signature ? (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-subtle)] px-3 py-2.5 text-xs">
          <div>
            <div className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>{signature.name}</span>
              {signature.workId && (
                <span className="font-mono text-[10px] text-[var(--color-accent)]">
                  (Work ID: {signature.workId})
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">
              Timestamp: {typeof signature.at === 'number' ? new Date(signature.at).toLocaleString() : signature.at}
            </div>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
            title="Clear signature"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {isWorkIdRequired ? (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter Employee Work ID (e.g. 11037)"
                  value={workId}
                  onChange={(e) => setWorkId(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSignClick}
                  disabled={!recognizedName}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-display font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Verify & Sign
                </button>
              </div>

              {workId.trim() && (
                <div className="text-[11px] font-mono">
                  {recognizedName ? (
                    <span className="text-[var(--color-good)] flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Employee verified: {recognizedName}
                    </span>
                  ) : (
                    <span className="text-[var(--color-danger)]">
                      Work ID not found in supervisor directory
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type full legal name to sign"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSignClick}
                disabled={!typedName.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-display font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Sign Record
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

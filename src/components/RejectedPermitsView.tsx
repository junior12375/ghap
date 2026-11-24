import React, { useState } from 'react';
import { HistoryRecord, PermitType } from '../types/permit';
import { isPermitRejected, getWorkOrderNumber } from '../utils/permitHelpers';
import { RefreshCw, XCircle, Search, Eye, AlertOctagon } from 'lucide-react';

interface RejectedPermitsViewProps {
  history: Record<PermitType, HistoryRecord[]>;
  onRefresh: () => void;
  onOpenViewer: (formType: PermitType, record: HistoryRecord, submissionId: string) => void;
}

export const RejectedPermitsView: React.FC<RejectedPermitsViewProps> = ({
  history,
  onRefresh,
  onOpenViewer,
}) => {
  const [selectedType, setSelectedType] = useState<PermitType>('general');
  const [searchQuery, setSearchQuery] = useState('');

  const records = history[selectedType] || [];
  const rejectedRecords = records.filter(isPermitRejected);

  const filtered = rejectedRecords.filter((r) => {
    const hay = [
      getWorkOrderNumber(selectedType, r),
      String(r['Location'] || r['Department/Location'] || ''),
      String(r['HoD Rejection Reason'] || ''),
      String(r['Submission ID'] || ''),
    ]
      .join(' ')
      .toLowerCase();

    return !searchQuery || hay.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div>
            <span className="font-mono text-xs font-semibold text-[var(--color-danger)] tracking-wider">
              GOVERNANCE AUDIT REGISTER
            </span>
            <h2 className="font-display font-bold text-xl text-[var(--color-text-main)] flex items-center gap-2">
              <XCircle className="h-5 w-5 text-[var(--color-danger)]" />
              Rejected Permits Register
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Permits formally rejected by the Head of Department with audited justification reasons.
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Cloud List</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 pt-4">
          {[
            { id: 'general', label: 'General Work (04A)' },
            { id: 'hotwork', label: 'Hot Work / Confined (04B)' },
            { id: 'height', label: 'Working at Height (04C)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as PermitType)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedType === tab.id
                  ? 'bg-[var(--color-danger)] text-white shadow-sm'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search rejected records by Work Order or rejection reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-9 pr-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-danger)] focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-xs text-[var(--color-text-muted)]">
          No rejected permits found in this category. All submitted works are either active or awaiting decision.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record, index) => {
            const subId = String(record['Submission ID'] || `rec-${index}`);
            const wo = getWorkOrderNumber(selectedType, record);
            const location = String(record['Location'] || record['Department/Location'] || 'Unspecified Location');
            const reason = String(record['HoD Rejection Reason'] || 'No specific remarks recorded.');
            const rejectedAt = String(record['HoD Approval At'] || record['Last Updated'] || 'N/A');

            return (
              <div
                key={subId}
                className="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-surface)] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-[var(--color-text-main)]">
                        {location}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)]/30">
                        REJECTED BY HOD
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-1">
                      WO: <strong className="text-[var(--color-text-main)]">{wo || 'N/A'}</strong> · ID: {subId} · Rejected: {rejectedAt}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenViewer(selectedType, record, subId)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    <span>View Record</span>
                  </button>
                </div>

                {/* Audit Rejection Reason Callout */}
                <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-subtle)] p-3 text-xs text-[var(--color-danger)] flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Official HoD Rejection Reason:</span>
                    <p className="mt-0.5 text-[var(--color-text-main)] font-medium">{reason}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { HistoryRecord, PermitType } from '../types/permit';
import { buildPermitVerificationUrl, getPublicPortalUrl } from '../utils/syncEngine';
import { isPermitClosed, isPermitOverdue, isPermitRejected, getWorkOrderNumber } from '../utils/permitHelpers';
import { Search, QrCode, Copy, RefreshCw, Eye, ShieldCheck, Check, Clock, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';

interface ApprovedPermitsViewProps {
  history: Record<PermitType, HistoryRecord[]>;
  onRefresh: () => void;
  onOpenViewer: (formType: PermitType, record: HistoryRecord, submissionId: string) => void;
  onOpenRenewalModal: (formType: PermitType, submissionId: string, record: HistoryRecord) => void;
}

export const ApprovedPermitsView: React.FC<ApprovedPermitsViewProps> = ({
  history,
  onRefresh,
  onOpenViewer,
  onOpenRenewalModal,
}) => {
  const [selectedType, setSelectedType] = useState<PermitType>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'new' | 'old'>('new');
  const [qrModalData, setQrModalData] = useState<{ url: string; title: string; id: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const records = history[selectedType] || [];

  // Filter approved/active permits: not closed, not rejected, not overdue
  const activeRecords = records.filter((r) => {
    return !isPermitClosed(selectedType, r) && !isPermitRejected(r) && !isPermitOverdue(r);
  });

  const filtered = activeRecords.filter((r) => {
    const hay = [
      getWorkOrderNumber(selectedType, r),
      String(r['Location'] || r['Department/Location'] || ''),
      String(r['Description'] || r['Purpose'] || ''),
      String(r['Submission ID'] || ''),
      String(r['Department'] || ''),
    ]
      .join(' ')
      .toLowerCase();

    return !searchQuery || hay.includes(searchQuery.toLowerCase());
  });

  if (sortOrder === 'old') {
    filtered.reverse();
  }

  const handleShowQr = async (formType: PermitType, record: HistoryRecord) => {
    const subId = String(record['Submission ID'] || 'N/A');
    const wo = getWorkOrderNumber(formType, record);
    const url = buildPermitVerificationUrl(formType, subId, wo);
    const title = String(record['Location'] || record['Department/Location'] || 'Permit Verification');

    try {
      const qrImage = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(qrImage);
      setQrModalData({ url, title, id: subId });
    } catch (e) {
      console.error('Failed to generate QR code:', e);
    }
  };

  const handleCopyLink = (formType: PermitType, record: HistoryRecord) => {
    const subId = String(record['Submission ID'] || '');
    const wo = getWorkOrderNumber(formType, record);
    const url = buildPermitVerificationUrl(formType, subId, wo);

    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(subId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div>
            <span className="font-mono text-xs font-semibold text-[var(--color-accent)] tracking-wider">
              PUBLIC SAFETY REGISTER
            </span>
            <h2 className="font-display font-bold text-xl text-[var(--color-text-main)]">
              Approved &amp; Active Permits
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Authorized permits currently valid for active industrial work across plant locations.
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

        {/* Permit Type Segmented Control */}
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
                  ? 'bg-[var(--color-accent)] text-neutral-950 shadow-sm'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Bar */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by Work Order, location, or contractor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-9 pr-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'new' | 'old')}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="new">Newest First</option>
            <option value="old">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Permits Grid / List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-xs text-[var(--color-text-muted)]">
          No approved permits currently match your filters in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record, index) => {
            const subId = String(record['Submission ID'] || `record-${index}`);
            const wo = getWorkOrderNumber(selectedType, record);
            const location = String(record['Location'] || record['Department/Location'] || 'Unspecified Location');
            const description = String(record['Description'] || record['Purpose'] || 'No description provided');
            const updated = String(record['Last Updated'] || record['Submitted At'] || 'N/A');
            const isRenewal = String(record['Renewal Status'] || '') === 'Approved' || subId.includes('-R');

            return (
              <div
                key={subId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-accent-border)] transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-sm text-[var(--color-text-main)]">
                        {location}
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-good-subtle)] text-[var(--color-good)] border border-[var(--color-good)]/30">
                        APPROVED
                      </span>
                      {isRenewal && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)]">
                          RENEWED
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[var(--color-text-muted)] line-clamp-2 max-w-2xl">
                      {description}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--color-text-muted)] pt-1">
                      <span>WO: <strong className="text-[var(--color-text-main)]">{wo || 'N/A'}</strong></span>
                      <span>·</span>
                      <span>ID: <span className="text-[var(--color-text-faint)]">{subId}</span></span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated: {updated}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onOpenViewer(selectedType, record, subId)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                      <span>View Form</span>
                    </button>

                    <button
                      onClick={() => handleShowQr(selectedType, record)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
                      title="Show Verification QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">QR Scan</span>
                    </button>

                    <button
                      onClick={() => handleCopyLink(selectedType, record)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
                      title="Copy Public Mobile Link"
                    >
                      {copiedId === subId ? (
                        <Check className="h-3.5 w-3.5 text-[var(--color-good)]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">{copiedId === subId ? 'Copied' : 'Link'}</span>
                    </button>

                    <button
                      onClick={() => onOpenRenewalModal(selectedType, subId, record)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-subtle)] text-[var(--color-warning)] text-xs font-medium hover:brightness-110 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>24h Renewal</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Inspection Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <h3 className="font-display font-bold text-sm text-[var(--color-text-main)]">
                On-Site Inspection QR Code
              </h3>
              <button
                onClick={() => setQrModalData(null)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Scan with any mobile device camera to verify real-time permit status without requiring login.
            </p>

            <div className="flex justify-center p-4 bg-white rounded-xl shadow-inner">
              <img src={qrDataUrl} alt="Permit QR code" className="h-56 w-56 object-contain" />
            </div>

            <div className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
              {qrModalData.title}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(qrModalData.url);
                setQrModalData(null);
              }}
              className="w-full py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-display font-bold text-xs transition-colors"
            >
              Copy Verification URL &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

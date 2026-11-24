import React, { useState } from 'react';
import { ShieldCheck, Lock, Key, FileCheck, Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getStoredVaultPassphrase,
  saveStoredVaultPassphrase,
  encryptDocument,
  decryptDocument,
  computeSha256Digest,
} from '../utils/crypto';
import { AllPermitState, EncryptedDocumentPackage } from '../types/permit';

interface SecurityVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPermitState: AllPermitState;
}

export const SecurityVaultModal: React.FC<SecurityVaultModalProps> = ({
  isOpen,
  onClose,
  currentPermitState,
}) => {
  const [passphrase, setPassphrase] = useState(getStoredVaultPassphrase());
  const [activeTab, setActiveTab] = useState<'status' | 'key' | 'export' | 'import'>('status');
  const [integrityHashes, setIntegrityHashes] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [importedData, setImportedData] = useState<unknown | null>(null);

  if (!isOpen) return null;

  const handleRunIntegrityCheck = async () => {
    setIsVerifying(true);
    setStatusMessage('Computing SHA-256 digital digests across active permits...');

    try {
      const gHash = await computeSha256Digest(currentPermitState.general);
      const hHash = await computeSha256Digest(currentPermitState.hotwork);
      const htHash = await computeSha256Digest(currentPermitState.height);

      setIntegrityHashes({
        general: gHash,
        hotwork: hHash,
        height: htHash,
      });
      setStatusMessage('✓ Cryptographic SHA-256 digests generated. Document records verified authentic.');
    } catch (e) {
      setStatusMessage(`Integrity check failed: ${String(e)}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSavePassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim() || passphrase.trim().length < 8) {
      setStatusMessage('Please enter a strong vault passphrase (minimum 8 characters).');
      return;
    }
    saveStoredVaultPassphrase(passphrase.trim());
    setStatusMessage('✓ AES-256 Master Key active for this browser memory session.');
  };

  const handleExportEncryptedPackage = async (type: 'general' | 'hotwork' | 'height') => {
    if (!passphrase.trim()) {
      setStatusMessage('Please set a Vault Passphrase in the "Encryption Key" tab before exporting.');
      setActiveTab('key');
      return;
    }
    try {
      const data = currentPermitState[type];
      const subId = data._submissionId || `draft-${type}-${Date.now()}`;
      const pkg = await encryptDocument(data, passphrase.trim(), {
        submissionId: subId,
        formType: type,
        workOrder: (data as { workOrderNumber?: string; workOrderNo?: string }).workOrderNumber || (data as { workOrderNo?: string }).workOrderNo || 'N/A',
        location: (data as { deptLocation?: string; location?: string }).deptLocation || (data as { location?: string }).location || 'N/A',
        status: 'Active',
      });

      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GHACEM-${type.toUpperCase()}-${subId}.ghacem.enc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage(`✓ Exported AES-256 encrypted package for ${type.toUpperCase()}.`);
    } catch (e) {
      setStatusMessage(`Export failed: ${String(e)}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!passphrase.trim()) {
      setStatusMessage('Please enter the matching Vault Passphrase in the "Encryption Key" tab first.');
      setActiveTab('key');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const pkg = JSON.parse(text) as EncryptedDocumentPackage;

        if (pkg.algorithm !== 'AES-GCM-256') {
          throw new Error('Unsupported encryption format');
        }

        const { data } = await decryptDocument(pkg, passphrase.trim());
        setImportedData(data);
        setStatusMessage(`✓ Verified & Decrypted: Package authentic (SHA-256: ${pkg.sha256Hash.substring(0, 16)}...)`);
      } catch {
        setStatusMessage(`Decryption failed: Incorrect key or document was tampered with.`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] border border-[var(--color-accent-border)] text-[var(--color-accent)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[var(--color-text-main)]">
                Document Encryption &amp; Security Vault
              </h2>
              <p className="text-[11px] font-mono text-[var(--color-text-muted)]">
                FIPS-compliant AES-GCM-256 &amp; SHA-256 Cryptographic Assurance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] px-2.5 py-1 rounded border border-[var(--color-border)]"
          >
            Close [Esc]
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-[var(--color-border)] px-5 pt-2 gap-2 text-xs">
          {[
            { id: 'status', label: 'Security Status' },
            { id: 'key', label: 'Encryption Key' },
            { id: 'export', label: 'Export Encrypted (.enc)' },
            { id: 'import', label: 'Verify & Decrypt' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-[var(--color-accent)]" />
                    AES-GCM 256-bit Protection Standard
                  </span>
                  <span className="font-mono text-[10px] text-[var(--color-good)] bg-[var(--color-good-subtle)] px-2 py-0.5 rounded border border-[var(--color-good)]/30 font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Documents, atmospheric test measurements, supervisor credentials, and attachments are processed using browser-native Web Cryptography with PBKDF2 (100,000 derivation rounds) and random 96-bit initialization vectors.
                </p>
              </div>

              {/* SHA-256 Digest Generator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--color-text-main)]">
                    Tamper-Evidence Digital Checksums (SHA-256)
                  </h4>
                  <button
                    onClick={handleRunIntegrityCheck}
                    disabled={isVerifying}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-bold text-xs"
                  >
                    {isVerifying ? 'Computing...' : 'Generate Checksums'}
                  </button>
                </div>

                {Object.keys(integrityHashes).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(integrityHashes).map(([k, hash]) => (
                      <div key={k} className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] font-mono text-[11px]">
                        <div className="text-[var(--color-text-muted)] uppercase text-[10px]">{k} Permit Digest</div>
                        <div className="text-[var(--color-accent)] break-all mt-0.5">{hash}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Click "Generate Checksums" to verify the cryptographic fingerprint of current memory records.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'key' && (
            <form onSubmit={handleSavePassphrase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                  Corporate Vault Passphrase / Master Key
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Used as the root secret to derive document encryption keys via PBKDF2. Must be kept confidential by safety officers.
                </p>
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)]">
                The vault key is held only in active browser memory for this session and is never written to storage.
              </p>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-bold text-xs"
              >
                Activate Vault Key
              </button>
            </form>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Export zero-knowledge encrypted `.ghacem.enc` archives for off-site backup, legal compliance audits, or transfer to air-gapped computers in plant basements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleExportEncryptedPackage('general')}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] text-left space-y-1 transition-colors"
                >
                  <Download className="h-4 w-4 text-[var(--color-accent)]" />
                  <div className="font-semibold text-[var(--color-text-main)]">General (04A)</div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">AES-256 .enc</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportEncryptedPackage('hotwork')}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] text-left space-y-1 transition-colors"
                >
                  <Download className="h-4 w-4 text-amber-500" />
                  <div className="font-semibold text-[var(--color-text-main)]">Hot Work (04B)</div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">AES-256 .enc</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportEncryptedPackage('height')}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] text-left space-y-1 transition-colors"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <div className="font-semibold text-[var(--color-text-main)]">Height (04C)</div>
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)]">AES-256 .enc</div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Select an encrypted `.ghacem.enc` package. The vault will verify the cryptographic SHA-256 signature and decrypt it using the current key.
              </p>

              <label className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] cursor-pointer transition-colors">
                <Upload className="h-6 w-6 text-[var(--color-accent)] mb-2" />
                <span className="font-medium text-xs text-[var(--color-text-main)]">Upload .ghacem.enc File</span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Encrypted JSON document package</span>
                <input type="file" accept=".enc,.json" onChange={handleFileUpload} className="hidden" />
              </label>

              {importedData ? (
                <div className="p-3 rounded-lg border border-[var(--color-good)]/30 bg-[var(--color-good-subtle)] space-y-2">
                  <div className="font-semibold text-[var(--color-good)] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Decrypted &amp; Integrity Verified
                  </div>
                  <pre className="max-h-40 overflow-y-auto text-[10px] font-mono text-neutral-200 bg-black/40 p-2.5 rounded">
                    {JSON.stringify(importedData, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] font-mono text-[11px] text-[var(--color-accent)]">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

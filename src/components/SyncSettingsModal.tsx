import React, { useState } from 'react';
import { Cloud, RefreshCw, Smartphone, Laptop, Check, AlertCircle, Send, Download, Upload } from 'lucide-react';
import {
  getSyncUrl,
  saveSyncUrl,
  getPublicPortalUrl,
  savePublicPortalUrl,
  getDeviceId,
  getOutboxQueue,
  flushOutboxQueue,
  DEFAULT_SYNC_URL,
  DEFAULT_PUBLIC_PORTAL_URL,
  postToBackend,
} from '../utils/syncEngine';
import { SyncStatusInfo } from '../types/permit';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatusInfo;
  onSyncStatusChange: (status: SyncStatusInfo) => void;
  onTriggerFullRefresh: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  onSyncStatusChange,
  onTriggerFullRefresh,
}) => {
  const [urlInput, setUrlInput] = useState(getSyncUrl());
  const [portalUrlInput, setPortalUrlInput] = useState(getPublicPortalUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const deviceId = getDeviceId();
  const outbox = getOutboxQueue();

  if (!isOpen) return null;

  const handleSaveUrls = () => {
    saveSyncUrl(urlInput);
    savePublicPortalUrl(portalUrlInput);
    setTestResult('✓ Settings saved successfully.');
    onSyncStatusChange({
      ...syncStatus,
      state: 'synced',
      message: 'Cloud sync endpoints updated.',
    });
  };

  const handleResetDefaults = () => {
    setUrlInput(DEFAULT_SYNC_URL);
    setPortalUrlInput(DEFAULT_PUBLIC_PORTAL_URL);
    saveSyncUrl(DEFAULT_SYNC_URL);
    savePublicPortalUrl(DEFAULT_PUBLIC_PORTAL_URL);
    setTestResult('✓ Reset to built-in GHACEM central cloud backend.');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult('Testing connection to cloud backend...');

    try {
      const res = await postToBackend({ action: 'ping', client: 'corporate-ptw-portal', deviceId }, urlInput);
      if (res && res.ok) {
        setTestResult(`✓ Connection established! Server response: ${String(res.message || 'OK')}`);
        onSyncStatusChange({
          state: 'synced',
          message: 'Connected to GHACEM Cloud Backend',
          lastSyncTime: new Date(),
          pendingQueueCount: outbox.length,
        });
      } else {
        setTestResult(`Connection failed: ${res?.error || 'Server error'}`);
        onSyncStatusChange({
          state: 'error',
          message: 'Failed to connect to cloud endpoint',
          pendingQueueCount: outbox.length,
        });
      }
    } catch (e) {
      setTestResult(`Network error: ${String(e)}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleForceFlushQueue = async () => {
    onSyncStatusChange({
      ...syncStatus,
      state: 'syncing',
      message: 'Flushing pending outbox queue...',
    });

    const res = await flushOutboxQueue(onSyncStatusChange);
    setTestResult(`✓ Flushed outbox: ${res.processed} synchronized, ${res.errors} errors.`);
    onTriggerFullRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] border border-[var(--color-accent-border)] text-[var(--color-accent)]">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[var(--color-text-main)]">
                Cross-Device Cloud Synchronization
              </h2>
              <p className="text-[11px] font-mono text-[var(--color-text-muted)]">
                Device Identifier: <span className="text-[var(--color-accent)]">{deviceId}</span>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Sync Status Banner */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block">
                CURRENT SYNC STATE
              </span>
              <div className="font-semibold text-sm text-[var(--color-text-main)] capitalize flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    syncStatus.state === 'synced'
                      ? 'bg-[var(--color-good)]'
                      : syncStatus.state === 'syncing'
                      ? 'bg-[var(--color-accent)] animate-ping'
                      : 'bg-[var(--color-warning)]'
                  }`}
                />
                {syncStatus.state === 'synced' ? 'Live Cloud Connected' : syncStatus.state}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">{syncStatus.message}</p>
            </div>

            <button
              onClick={handleForceFlushQueue}
              disabled={outbox.length === 0}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync Outbox ({outbox.length})</span>
            </button>
          </div>

          {/* URLs configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                Google Apps Script Web App Endpoint URL
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Direct endpoint to the GHACEM Google Sheets centralized database.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                Public Verification Portal URL (For Mobile QR Scans)
              </label>
              <input
                type="text"
                value={portalUrlInput}
                onChange={(e) => setPortalUrlInput(e.target.value)}
                placeholder="https://junior12375.github.io/GHACEM-PERMIT/"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Destination URL encoded in generated QR codes. Must be reachable by mobile phones on site.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveUrls}
                className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-bold text-xs transition-colors"
              >
                Save Endpoints
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-main)] font-medium text-xs transition-colors"
              >
                {isTesting ? 'Pinging Cloud...' : 'Test Connection'}
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs transition-colors ml-auto"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {testResult && (
            <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] font-mono text-[11px] text-[var(--color-accent)]">
              {testResult}
            </div>
          )}

          {/* Device Architecture Note */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 text-[11px] text-[var(--color-text-muted)] space-y-1.5">
            <span className="font-semibold text-[var(--color-text-main)] block">Seamless Multi-Device Architecture:</span>
            <p>
              When offline in silos or underground plants, permits are stored in the local encrypted Outbox queue. Once mobile data or plant Wi-Fi is restored, the queue automatically syncs to the central cloud repository without losing records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

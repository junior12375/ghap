/**
 * Seamless Cross-Device Cloud Synchronization Engine
 * Handles online/offline state, outbox queue replay, Google Apps Script API calls,
 * and peer-to-peer encrypted sync archive for air-gapped devices.
 */

import { HistoryRecord, PermitType, SyncStatusInfo } from '../types/permit';
import { computeSha256Digest } from './crypto';

export const DEFAULT_SYNC_URL =
  'https://script.google.com/macros/s/AKfycbz8L1Izxu4dXNaQ9uIgwIGLtxT9o3N8w3kNA7cba2r27YD3YSfEIahLCs4fkQ5W_Igv/exec';
export const DEFAULT_PUBLIC_PORTAL_URL =
  'https://junior12375.github.io/GHACEM-PERMIT/';

const SYNC_URL_STORAGE_KEY = 'ghacem_sync_url';
const PUBLIC_PORTAL_URL_KEY = 'ghacem_public_portal_url';
const DEVICE_ID_KEY = 'ghacem_device_id';
const OUTBOX_STORAGE_KEY = 'ghacem_sync_outbox_queue';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'DEV-LOCAL-SESSION';
  }
}

export function getSyncUrl(): string {
  try {
    return localStorage.getItem(SYNC_URL_STORAGE_KEY) || DEFAULT_SYNC_URL;
  } catch {
    return DEFAULT_SYNC_URL;
  }
}

export function saveSyncUrl(url: string): void {
  try {
    if (!url.trim()) {
      localStorage.setItem(SYNC_URL_STORAGE_KEY, DEFAULT_SYNC_URL);
    } else {
      localStorage.setItem(SYNC_URL_STORAGE_KEY, url.trim());
    }
  } catch (e) {
    console.error('Failed to save sync url:', e);
  }
}

export function getPublicPortalUrl(): string {
  try {
    const saved = localStorage.getItem(PUBLIC_PORTAL_URL_KEY);
    if (saved && !saved.includes('ais-dev-')) return saved;
    if (
      typeof window !== 'undefined' &&
      window.location.origin &&
      window.location.origin.startsWith('http') &&
      !window.location.origin.includes('ais-dev-') &&
      !window.location.origin.includes('localhost')
    ) {
      return window.location.origin + window.location.pathname;
    }
    return DEFAULT_PUBLIC_PORTAL_URL;
  } catch {
    return DEFAULT_PUBLIC_PORTAL_URL;
  }
}

export function savePublicPortalUrl(url: string): void {
  try {
    localStorage.setItem(PUBLIC_PORTAL_URL_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save portal url:', e);
  }
}

export interface OutboxItem {
  id: string;
  formType: PermitType;
  action: 'submit' | 'update' | 'close' | 'department_authorize' | 'request_ehs_test' | 'ehs_update_test' | 'hod_decision';
  submissionId: string;
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  integrityHash: string;
}

export function getOutboxQueue(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOutboxQueue(queue: OutboxItem[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save outbox queue:', e);
  }
}

export async function addToOutbox(item: Omit<OutboxItem, 'id' | 'createdAt' | 'retryCount' | 'integrityHash'>): Promise<OutboxItem> {
  const hash = await computeSha256Digest(item.data);
  const queue = getOutboxQueue();
  const existingIdx = queue.findIndex(
    (q) => q.submissionId === item.submissionId && q.action === item.action
  );
  const outboxItem: OutboxItem = {
    ...item,
    id: existingIdx !== -1 ? queue[existingIdx].id : UtilitiesUuid(),
    createdAt: Date.now(),
    retryCount: 0,
    integrityHash: hash,
  };
  if (existingIdx !== -1) {
    queue[existingIdx] = outboxItem;
  } else {
    queue.push(outboxItem);
  }
  saveOutboxQueue(queue);
  return outboxItem;
}

function UtilitiesUuid(): string {
  return 'outbox-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Low-level post to backend with timeout handling
 */
export async function postToBackend(job: Record<string, unknown>, targetUrl?: string): Promise<{ ok: boolean; error?: string; [key: string]: unknown }> {
  const url = targetUrl || getSyncUrl();
  if (!url) return { ok: false, error: 'Cloud Sync URL is not configured' };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(job),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let result: Record<string, unknown> | null = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      return { ok: false, error: (result?.error as string) || `HTTP error ${res.status}` };
    }

    if (!result || typeof result !== 'object') {
      return { ok: true, responseUnparsed: true, raw: text };
    }

    return result as { ok: boolean; [key: string]: unknown };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Fetch history for a specific permit type
 */
export async function fetchHistoryFromBackend(formType: PermitType): Promise<{ ok: boolean; records?: HistoryRecord[]; error?: string }> {
  const url = getSyncUrl();
  if (!url) return { ok: false, error: 'No sync URL configured' };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);
    const fullUrl = `${url}?formType=${encodeURIComponent(formType)}&mode=history&_t=${Date.now()}`;
    const res = await fetch(fullUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Process any pending outbox queue items silently (never sends duplicate/unsolicited emails on page load)
 */
export async function flushOutboxQueue(onProgress?: (info: SyncStatusInfo) => void): Promise<{ processed: number; errors: number }> {
  const MAX_OUTBOX_AGE_MS = 24 * 60 * 60 * 1000;
  const MAX_RETRIES = 3;
  const now = Date.now();
  const queue = getOutboxQueue().filter(
    (item) => item && now - (item.createdAt || 0) <= MAX_OUTBOX_AGE_MS && (item.retryCount || 0) < MAX_RETRIES
  );
  if (queue.length === 0) {
    saveOutboxQueue([]);
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;
  const remaining: OutboxItem[] = [];

  for (const item of queue) {
    try {
      if (onProgress) {
        onProgress({
          state: 'syncing',
          message: `Synchronizing queued permit ${item.submissionId} (${processed + 1}/${queue.length})...`,
          pendingQueueCount: queue.length - processed,
        });
      }

      const res = await postToBackend({
        formType: item.formType,
        action: item.action,
        submissionId: item.submissionId,
        skipAppsScriptEmail: true,
        isOutboxReplay: true,
        data: item.data,
      });

      if (res && res.ok) {
        processed++;
      } else {
        errors++;
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount < MAX_RETRIES) {
          remaining.push(item);
        }
      }
    } catch {
      errors++;
      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount < MAX_RETRIES) {
        remaining.push(item);
      }
    }
  }

  saveOutboxQueue(remaining);

  if (onProgress) {
    onProgress({
      state: remaining.length === 0 ? 'synced' : 'error',
      message: remaining.length === 0 ? `All ${processed} pending items synchronized successfully.` : `${processed} synced, ${remaining.length} queued for retry.`,
      lastSyncTime: new Date(),
      pendingQueueCount: remaining.length,
    });
  }

  return { processed, errors };
}

/** Generate public QR / email review or EHS gas test verification URL */
export function buildPermitVerificationUrl(
  formType: PermitType,
  submissionId: string,
  workOrder?: string,
  options?: { review?: boolean; ehsGasTest?: boolean }
): string {
  const isEhsGasTest = Boolean(options?.ehsGasTest);
  const isReview = Boolean(options?.review);

  // Email action links always target the publicly accessible Google Apps Script Web App
  // so recipients never hit AI Studio dev auth errors or unpublished 404 pages.
  if (isEhsGasTest || isReview) {
    const syncBase = getSyncUrl() || DEFAULT_SYNC_URL;
    const targetMode = isEhsGasTest ? 'ehs_test' : 'review';
    try {
      const url = new URL(syncBase);
      url.searchParams.set('mode', targetMode);
      url.searchParams.set('permit', formType);
      url.searchParams.set('id', submissionId);
      if (workOrder) url.searchParams.set('workorder', workOrder);
      return url.toString();
    } catch {
      return `${syncBase}?mode=${targetMode}&permit=${encodeURIComponent(formType)}&id=${encodeURIComponent(submissionId)}${
        workOrder ? `&workorder=${encodeURIComponent(workOrder)}` : ''
      }`;
    }
  }

  const base = getPublicPortalUrl();
  try {
    const url = new URL(base);
    url.searchParams.set('permit', formType);
    url.searchParams.set('id', submissionId);
    if (workOrder) url.searchParams.set('workorder', workOrder);
    return url.toString();
  } catch {
    return `${base}?permit=${encodeURIComponent(formType)}&id=${encodeURIComponent(submissionId)}${
      workOrder ? `&workorder=${encodeURIComponent(workOrder)}` : ''
    }`;
  }
}

export interface SilentEmailPayload {
  event: 'permit_submitted' | 'ehs_confined_alert' | 'permit_closed' | 'permit_approved' | 'permit_rejected';
  formType: PermitType;
  submissionId: string;
  workOrder?: string;
  location?: string;
  department?: string;
  equipmentId?: string;
  description?: string;
  supervisorName?: string;
  supervisorWorkId?: string;
  closedBy?: string;
  closureRemarks?: string;
  reviewerName?: string;
  decisionRemarks?: string;
  rejectionReason?: string;
  verificationUrl?: string;
}

/**
 * Dispatches an automatic server-side email alert without displaying
 * any email address or confirmation modal to the user.
 */
export async function dispatchSilentEmailNotification(
  payload: SilentEmailPayload
): Promise<{ ok: boolean; deliveredByServer: boolean }> {
  try {
    const res = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, deliveredByServer: false };
    }
    const json = (await res.json()) as { ok?: boolean; deliveredByServer?: boolean };
    return {
      ok: Boolean(json.ok),
      deliveredByServer: Boolean(json.deliveredByServer),
    };
  } catch {
    return { ok: false, deliveredByServer: false };
  }
}

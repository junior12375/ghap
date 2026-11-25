/**
 * GHACEM Executive Credentials & Authentication Client
 * Communicates with server-side authentication endpoints using in-memory Bearer tokens.
 * No plaintext passwords or tokens are stored in client source code or browser storage.
 */

export interface ExecutiveUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
  facility: 'Tema Main Works' | 'Takoradi Grinding Plant' | 'All GHACEM Facilities';
  workId: string;
  clearanceLevel: 'Level 1 - Supervisor' | 'Level 2 - Plant Lead' | 'Level 3 - Director & Executive';
  envManaged?: boolean;
}

export interface ExecutiveAuthStatus {
  configured: boolean;
  envOverride: boolean;
  accountCount: number;
  backendAvailable: boolean;
}

export interface ExecutiveAuthResult {
  success: boolean;
  user?: ExecutiveUser;
  error?: string;
}

// Held strictly in JS memory — never persisted to localStorage or sessionStorage
let inMemoryBearerToken: string | null = null;
let inMemoryExecutiveUser: ExecutiveUser | null = null;

export function getExecutiveToken(): string | null {
  return inMemoryBearerToken;
}

export function getActiveExecutiveUser(): ExecutiveUser | null {
  return inMemoryExecutiveUser;
}

export function clearExecutiveSession(): void {
  inMemoryBearerToken = null;
  inMemoryExecutiveUser = null;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (inMemoryBearerToken) {
    headers.Authorization = `Bearer ${inMemoryBearerToken}`;
  }
  return headers;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Check whether at least one executive account or env admin passcode is configured on the server */
export async function fetchExecutiveAuthStatus(): Promise<ExecutiveAuthStatus> {
  try {
    const res = await fetch('/api/executive/status');
    const json = await parseJsonSafe(res);
    if (res.ok && json && json.ok) {
      return {
        configured: Boolean(json.configured),
        envOverride: Boolean(json.envOverride),
        accountCount: Number(json.accountCount || 0),
        backendAvailable: true,
      };
    }
  } catch {
    // Network unreachable
  }
  return { configured: false, envOverride: false, accountCount: 0, backendAvailable: false };
}

/** One-time first-run setup when no executive credentials exist on the server yet */
export async function setupInitialExecutiveAccount(payload: {
  username: string;
  password: string;
  fullName: string;
  role: string;
  department: string;
  facility: ExecutiveUser['facility'];
  workId: string;
}): Promise<ExecutiveAuthResult> {
  try {
    const res = await fetch('/api/executive/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJsonSafe(res);
    if (!json) {
      return {
        success: false,
        error: 'Executive authentication backend (/api/executive/setup) is not running on this host.',
      };
    }
    if (res.ok && json.ok && json.token && json.user) {
      inMemoryBearerToken = String(json.token);
      inMemoryExecutiveUser = json.user as ExecutiveUser;
      return { success: true, user: inMemoryExecutiveUser };
    }
    return { success: false, error: String(json.error || 'Failed to complete initial executive setup.') };
  } catch (err) {
    return { success: false, error: `Network error: ${String(err)}` };
  }
}

/** Verify username/Work ID + password on the server */
export async function loginExecutive(username: string, password: string): Promise<ExecutiveAuthResult> {
  try {
    const res = await fetch('/api/executive/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await parseJsonSafe(res);
    if (!json) {
      return {
        success: false,
        error: 'Executive authentication API (/api/executive/login) is unreachable on this deployment. Deploy with the Node.js server (npm run start) rather than static-only hosting.',
      };
    }
    if (res.ok && json.ok && json.token && json.user) {
      inMemoryBearerToken = String(json.token);
      inMemoryExecutiveUser = json.user as ExecutiveUser;
      return { success: true, user: inMemoryExecutiveUser };
    }
    return { success: false, error: String(json.error || 'Invalid executive username or password.') };
  } catch (err) {
    return { success: false, error: `Authentication request failed: ${String(err)}` };
  }
}

/** Update password for the currently signed-in executive */
export async function updateExecutivePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!inMemoryBearerToken) {
    return { success: false, error: 'Active executive session required.' };
  }
  try {
    const res = await fetch('/api/executive/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { success: true, message: json.message || 'Password updated successfully.' };
    }
    return { success: false, error: json.error || 'Failed to update password.' };
  } catch (err) {
    return { success: false, error: `Network error: ${String(err)}` };
  }
}

/** Fetch sanitized list of executive accounts (requires valid Bearer token) */
export async function fetchExecutiveAccounts(): Promise<ExecutiveUser[]> {
  if (!inMemoryBearerToken) return [];
  try {
    const res = await fetch('/api/executive/accounts', {
      headers: authHeaders(),
    });
    const json = await res.json();
    if (res.ok && json.ok && Array.isArray(json.accounts)) {
      return json.accounts as ExecutiveUser[];
    }
  } catch {
    // Ignore
  }
  return [];
}

/** Provision an additional executive account (Level 3 Director clearance required) */
export async function createExecutiveAccount(payload: {
  username: string;
  password: string;
  fullName: string;
  role: string;
  department: string;
  facility: ExecutiveUser['facility'];
  workId: string;
  clearanceLevel: ExecutiveUser['clearanceLevel'];
}): Promise<ExecutiveAuthResult> {
  if (!inMemoryBearerToken) {
    return { success: false, error: 'Active executive session required.' };
  }
  try {
    const res = await fetch('/api/executive/accounts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok && json.ok && json.account) {
      return { success: true, user: json.account as ExecutiveUser };
    }
    return { success: false, error: json.error || 'Failed to provision executive account.' };
  } catch (err) {
    return { success: false, error: `Network error: ${String(err)}` };
  }
}

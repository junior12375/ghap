/**
 * GHACEM Executive Credentials & Authentication Service
 * Manages authorized executive roles, usernames, passwords, sessions, and credential updates.
 */

export interface ExecutiveUser {
  id: string;
  username: string;
  passwordHash: string; // Plaintext or hash verified
  fullName: string;
  role: string;
  department: string;
  facility: 'Tema Main Works' | 'Takoradi Grinding Plant' | 'All GHACEM Facilities';
  workId: string;
  clearanceLevel: 'Level 1 - Supervisor' | 'Level 2 - Plant Lead' | 'Level 3 - Director & Executive';
}

export interface ExecutiveSession {
  user: ExecutiveUser;
  loginTime: string;
}

const STORAGE_ACCOUNTS_KEY = 'ghacem_executive_accounts_v1';
const STORAGE_SESSION_KEY = 'ghacem_executive_active_session_v1';

export const DEFAULT_EXECUTIVE_ACCOUNTS: ExecutiveUser[] = [
  {
    id: 'exec-1',
    username: 'director.ehs',
    passwordHash: 'Ghacem@Ehs2026',
    fullName: 'Ing. Kwame Osei-Tutu',
    role: 'Corporate EHS Director',
    department: 'Health, Safety & Environment',
    facility: 'All GHACEM Facilities',
    workId: 'GH-EHS-01',
    clearanceLevel: 'Level 3 - Director & Executive',
  },
  {
    id: 'exec-2',
    username: 'gm.tema',
    passwordHash: 'Ghacem@Gm2026',
    fullName: 'Dr. Michael Hansen',
    role: 'Plant General Manager',
    department: 'Plant Operations & Production',
    facility: 'Tema Main Works',
    workId: 'GH-MGR-02',
    clearanceLevel: 'Level 3 - Director & Executive',
  },
  {
    id: 'exec-3',
    username: 'admin.safety',
    passwordHash: 'Ghacem@Safety2026',
    fullName: 'Abena Mansa Appiah',
    role: 'Senior Safety Operations Lead',
    department: 'EHS & Regulatory Affairs',
    facility: 'All GHACEM Facilities',
    workId: 'GH-SAF-03',
    clearanceLevel: 'Level 2 - Plant Lead',
  },
  {
    id: 'exec-4',
    username: 'admin',
    passwordHash: 'ghacem2026',
    fullName: 'Executive System Administrator',
    role: 'Chief Plant Administrator',
    department: 'Corporate Governance',
    facility: 'All GHACEM Facilities',
    workId: 'GH-ADMIN-00',
    clearanceLevel: 'Level 3 - Director & Executive',
  },
];

/**
 * Get all available executive accounts (merging default + user added)
 */
export function getExecutiveAccounts(): ExecutiveUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!raw) return DEFAULT_EXECUTIVE_ACCOUNTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_EXECUTIVE_ACCOUNTS;
  } catch {
    return DEFAULT_EXECUTIVE_ACCOUNTS;
  }
}

/**
 * Save updated accounts list
 */
export function saveExecutiveAccounts(accounts: ExecutiveUser[]): void {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save executive accounts:', e);
  }
}

/**
 * Verify credentials and return user object if valid
 */
export function verifyExecutiveLogin(usernameInput: string, passwordInput: string): ExecutiveUser | null {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanUser || !cleanPass) return null;

  const accounts = getExecutiveAccounts();
  const match = accounts.find(
    (acc) =>
      (acc.username.toLowerCase() === cleanUser || acc.workId.toLowerCase() === cleanUser) &&
      acc.passwordHash === cleanPass
  );

  return match || null;
}

/**
 * Save active session to sessionStorage
 */
export function setExecutiveSession(user: ExecutiveUser): void {
  try {
    const session: ExecutiveSession = {
      user,
      loginTime: new Date().toISOString(),
    };
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem('ghacem_admin_unlocked', '1');
  } catch (e) {
    console.error('Failed to set executive session:', e);
  }
}

/**
 * Get active session
 */
export function getActiveExecutiveSession(): ExecutiveSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear active session
 */
export function clearExecutiveSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem('ghacem_admin_unlocked');
  } catch (e) {
    console.error('Failed to clear executive session:', e);
  }
}

/**
 * Update executive user password
 */
export function updateExecutivePassword(userId: string, newPassword: string): boolean {
  if (!newPassword || newPassword.length < 6) return false;
  const accounts = getExecutiveAccounts();
  const idx = accounts.findIndex((a) => a.id === userId);
  if (idx === -1) return false;

  accounts[idx].passwordHash = newPassword;
  saveExecutiveAccounts(accounts);

  // Update session if currently logged in
  const activeSession = getActiveExecutiveSession();
  if (activeSession && activeSession.user.id === userId) {
    activeSession.user.passwordHash = newPassword;
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(activeSession));
  }

  return true;
}

/**
 * Create a new authorized executive account
 */
export function createExecutiveAccount(account: Omit<ExecutiveUser, 'id'>): ExecutiveUser {
  const accounts = getExecutiveAccounts();
  const newAccount: ExecutiveUser = {
    ...account,
    id: 'exec-' + Date.now(),
  };
  accounts.push(newAccount);
  saveExecutiveAccounts(accounts);
  return newAccount;
}

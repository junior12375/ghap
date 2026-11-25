import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();

function resolveServerPort(): number {
  const cliPortIdx = process.argv.indexOf('--port');
  if (cliPortIdx !== -1 && process.argv[cliPortIdx + 1]) {
    const parsed = parseInt(process.argv[cliPortIdx + 1], 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NGINX_PORT) {
    const appPort = parseInt(process.env.DEFAULT_APP_PORT || '3000', 10);
    if (!Number.isNaN(appPort) && appPort > 0) return appPort;
  }
  const envPort = parseInt(process.env.PORT || '3000', 10);
  return !Number.isNaN(envPort) && envPort > 0 ? envPort : 3000;
}

const PORT = resolveServerPort();

app.use(express.json({ limit: '10mb' }));

app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, status: 'healthy' });
});

// ============================================================================
// Server-Side Gemini Client Initialization (@google/genai)
// ============================================================================
const apiKey = (process.env.GEMINI_API_KEY || '').trim();
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('GEMINI_API_KEY is not set in environment.');
}

// ============================================================================
// Server-Side Executive Authentication & Session Management
// ============================================================================
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface ServerExecutiveAccount {
  id: string;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  fullName: string;
  role: string;
  department: string;
  facility: 'Tema Main Works' | 'Takoradi Grinding Plant' | 'All GHACEM Facilities';
  workId: string;
  clearanceLevel: 'Level 1 - Supervisor' | 'Level 2 - Plant Lead' | 'Level 3 - Director & Executive';
  envManaged?: boolean;
}

export type PublicExecutiveUser = Omit<ServerExecutiveAccount, 'passwordSalt' | 'passwordHash'>;

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz8L1Izxu4dXNaQ9uIgwIGLtxT9o3N8w3kNA7cba2r27YD3YSfEIahLCs4fkQ5W_Igv/exec';

const ACCOUNTS_STORE_PATH = process.env.VERCEL
  ? path.join('/tmp', 'executive-accounts.json')
  : path.resolve('.executive-accounts.json');

function loadPersistedExecutiveAccounts(): ServerExecutiveAccount[] {
  try {
    if (!fs.existsSync(ACCOUNTS_STORE_PATH)) return [];
    const raw = fs.readFileSync(ACCOUNTS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerExecutiveAccount[]) : [];
  } catch (err) {
    console.warn('Could not load persisted executive accounts:', err);
    return [];
  }
}

function savePersistedExecutiveAccounts(accounts: ServerExecutiveAccount[]): void {
  try {
    fs.writeFileSync(ACCOUNTS_STORE_PATH, JSON.stringify(accounts, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist executive accounts to disk:', err);
  }
}

const executiveAccounts: ServerExecutiveAccount[] = loadPersistedExecutiveAccounts();

async function callAppsScriptExec(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  const syncUrl = (process.env.APPS_SCRIPT_SYNC_URL || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!syncUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await resp.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function hashPassword(password: string, saltHex?: string): { saltHex: string; hashHex: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return { saltHex: salt, hashHex: derived.toString('hex') };
}

function verifyPasswordHash(password: string, saltHex: string, expectedHashHex: string): boolean {
  try {
    const derived = crypto.scryptSync(password, saltHex, 64);
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function sanitizeUser(acc: ServerExecutiveAccount): PublicExecutiveUser {
  const { passwordSalt: _salt, passwordHash: _hash, ...pub } = acc;
  return pub;
}

function signSessionToken(user: PublicExecutiveUser): string {
  const payload = {
    sub: user.id,
    username: user.username,
    workId: user.workId,
    clearanceLevel: user.clearanceLevel,
    user,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(
  token: string
): { sub: string; username: string; user?: PublicExecutiveUser; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    if (!constantTimeStringEqual(sig, expectedSig)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      sub: string;
      username: string;
      user?: PublicExecutiveUser;
      exp: number;
    };
    if (!decoded || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function getEnvAdminUser(): PublicExecutiveUser | null {
  const envPass = (process.env.EXECUTIVE_ADMIN_PASSWORD || '').trim();
  if (!envPass) return null;
  return {
    id: 'exec-env-admin',
    username: 'admin',
    fullName: 'Executive System Administrator',
    role: 'Chief Plant Administrator',
    department: 'Corporate Governance',
    facility: 'All GHACEM Facilities',
    workId: 'GH-ADMIN-00',
    clearanceLevel: 'Level 3 - Director & Executive',
    envManaged: true,
  };
}

function findUserById(id: string): PublicExecutiveUser | null {
  const envAdmin = getEnvAdminUser();
  if (envAdmin && id === envAdmin.id) return envAdmin;
  const found = executiveAccounts.find((a) => a.id === id);
  return found ? sanitizeUser(found) : null;
}

interface AuthenticatedRequest extends Request {
  executiveUser?: PublicExecutiveUser;
}

function requireExecutiveAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return res.status(401).json({ ok: false, error: 'Authentication required. Please sign in.' });
  }
  const verified = verifySessionToken(match[1].trim());
  if (!verified) {
    return res.status(401).json({ ok: false, error: 'Session expired or invalid. Please sign in again.' });
  }
  const user = findUserById(verified.sub) || verified.user || null;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Executive account no longer active.' });
  }
  req.executiveUser = user;
  return next();
}

// GET /api/executive/status - Check whether executive auth is configured
app.get('/api/executive/status', async (_req: Request, res: Response) => {
  const envAdmin = getEnvAdminUser();
  const hasLocalAccounts = executiveAccounts.length > 0;
  let remoteConfigured = false;
  let remoteCount = 0;

  if (!hasLocalAccounts) {
    const remote = await callAppsScriptExec('exec_status');
    if (remote && remote.ok) {
      remoteConfigured = Boolean(remote.configured);
      remoteCount = Number(remote.accountCount || 0);
    }
  }

  return res.json({
    ok: true,
    configured: Boolean(envAdmin || hasLocalAccounts || remoteConfigured),
    envOverride: Boolean(envAdmin),
    accountCount: Math.max(executiveAccounts.length, remoteCount) + (envAdmin ? 1 : 0),
  });
});

// POST /api/executive/setup - One-time first-run executive account creation (locks once claimed or if env password set)
app.post('/api/executive/setup', async (req: Request, res: Response) => {
  const envAdmin = getEnvAdminUser();
  const remoteStatus = executiveAccounts.length === 0 ? await callAppsScriptExec('exec_status') : null;
  const remoteConfigured = Boolean(remoteStatus && remoteStatus.ok && remoteStatus.configured);

  if (envAdmin || executiveAccounts.length > 0 || remoteConfigured) {
    return res.status(409).json({
      ok: false,
      error: 'Executive access is already configured. Please sign in with your credentials.',
    });
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'Corporate EHS Director';
  const department = typeof body.department === 'string' && body.department.trim() ? body.department.trim() : 'Health, Safety & Environment';
  const workId = typeof body.workId === 'string' && body.workId.trim() ? body.workId.trim().toUpperCase() : 'GH-EHS-01';
  const facilityRaw = typeof body.facility === 'string' ? body.facility : 'All GHACEM Facilities';
  const facility: ServerExecutiveAccount['facility'] =
    facilityRaw === 'Tema Main Works' || facilityRaw === 'Takoradi Grinding Plant' ? facilityRaw : 'All GHACEM Facilities';

  if (!username || username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
    return res.status(400).json({
      ok: false,
      error: 'Username must be at least 3 characters (letters, numbers, dot, underscore, or hyphen).',
    });
  }
  if (!fullName) {
    return res.status(400).json({ ok: false, error: 'Full name is required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters long.' });
  }

  const { saltHex, hashHex } = hashPassword(password);
  const newAccount: ServerExecutiveAccount = {
    id: `exec-${crypto.randomUUID()}`,
    username,
    passwordSalt: saltHex,
    passwordHash: hashHex,
    fullName,
    role,
    department,
    facility,
    workId,
    clearanceLevel: 'Level 3 - Director & Executive',
  };

  executiveAccounts.push(newAccount);
  savePersistedExecutiveAccounts(executiveAccounts);
  const publicUser = sanitizeUser(newAccount);

  // Also persist to Google Apps Script cloud store if deployed Code.gs supports exec_setup
  await callAppsScriptExec('exec_setup', {
    username,
    password,
    fullName,
    role,
    department,
    facility,
    workId,
  });

  const token = signSessionToken(publicUser);

  return res.status(201).json({
    ok: true,
    token,
    user: publicUser,
  });
});

// POST /api/executive/login - Verify username/Work ID + password on server
app.post('/api/executive/login', async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const usernameInput = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const passwordInput = typeof body.password === 'string' ? body.password : '';

  if (!usernameInput || !passwordInput) {
    return res.status(400).json({ ok: false, error: 'Username/Work ID and password are required.' });
  }

  // Check env-configured admin override first
  const envPass = (process.env.EXECUTIVE_ADMIN_PASSWORD || '').trim();
  const envAdmin = getEnvAdminUser();
  if (envPass && envAdmin && (usernameInput === envAdmin.username || usernameInput === envAdmin.workId.toLowerCase())) {
    if (constantTimeStringEqual(passwordInput, envPass)) {
      const token = signSessionToken(envAdmin);
      return res.json({ ok: true, token, user: envAdmin });
    }
    return res.status(401).json({ ok: false, error: 'Invalid executive username or password.' });
  }

  // Verify against server-stored scrypt-hashed executive accounts
  const match = executiveAccounts.find(
    (acc) => acc.username.toLowerCase() === usernameInput || acc.workId.toLowerCase() === usernameInput
  );

  if (match && verifyPasswordHash(passwordInput, match.passwordSalt, match.passwordHash)) {
    const publicUser = sanitizeUser(match);
    const token = signSessionToken(publicUser);
    return res.json({ ok: true, token, user: publicUser });
  }

  // Fallback check against Google Apps Script persistent store (handles Vercel/Cloud Run cold starts)
  const remoteLogin = await callAppsScriptExec('exec_login', {
    username: usernameInput,
    password: passwordInput,
  });
  if (remoteLogin && remoteLogin.ok && remoteLogin.user) {
    const remoteUser = remoteLogin.user as PublicExecutiveUser;
    const token = signSessionToken(remoteUser);
    return res.json({ ok: true, token, user: remoteUser });
  }

  return res.status(401).json({ ok: false, error: 'Invalid executive username or password.' });
});

// GET /api/executive/me - Get current authenticated executive session
app.get('/api/executive/me', requireExecutiveAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ ok: true, user: req.executiveUser });
});

// POST /api/executive/change-password - Update password for authenticated user
app.post('/api/executive/change-password', requireExecutiveAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.executiveUser!;
  if (user.envManaged) {
    return res.status(400).json({
      ok: false,
      error: 'This account password is managed via EXECUTIVE_ADMIN_PASSWORD in Settings > Secrets.',
    });
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters long.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ ok: false, error: 'New password must differ from the current password.' });
  }

  const account = executiveAccounts.find((a) => a.id === user.id);
  if (account) {
    if (!verifyPasswordHash(currentPassword, account.passwordSalt, account.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Current password does not match our records.' });
    }
    const { saltHex, hashHex } = hashPassword(newPassword);
    account.passwordSalt = saltHex;
    account.passwordHash = hashHex;
    savePersistedExecutiveAccounts(executiveAccounts);
  }

  const remoteChanged = await callAppsScriptExec('exec_change_password', {
    username: user.username,
    currentPassword,
    newPassword,
  });

  if (!account && (!remoteChanged || !remoteChanged.ok)) {
    return res.status(401).json({
      ok: false,
      error: String(remoteChanged?.error || 'Current password does not match our records.'),
    });
  }

  return res.json({ ok: true, message: 'Password updated successfully.' });
});

// GET /api/executive/accounts - List sanitized executive accounts (authenticated)
app.get('/api/executive/accounts', requireExecutiveAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const envAdmin = getEnvAdminUser();
  const remoteAccountsResp = await callAppsScriptExec('exec_accounts');
  const remoteAccounts =
    remoteAccountsResp && remoteAccountsResp.ok && Array.isArray(remoteAccountsResp.accounts)
      ? (remoteAccountsResp.accounts as PublicExecutiveUser[])
      : [];
  const mergedMap = new Map<string, PublicExecutiveUser>();
  if (envAdmin) mergedMap.set(envAdmin.username.toLowerCase(), envAdmin);
  executiveAccounts.map(sanitizeUser).forEach((u) => mergedMap.set(u.username.toLowerCase(), u));
  remoteAccounts.forEach((u) => {
    if (u && u.username && !mergedMap.has(u.username.toLowerCase())) {
      mergedMap.set(u.username.toLowerCase(), u);
    }
  });
  return res.json({ ok: true, accounts: Array.from(mergedMap.values()) });
});

// POST /api/executive/accounts - Provision a new executive account (Level 3 only)
app.post('/api/executive/accounts', requireExecutiveAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.executiveUser?.clearanceLevel !== 'Level 3 - Director & Executive') {
    return res.status(403).json({ ok: false, error: 'Level 3 Director clearance required to add executive accounts.' });
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'Safety Operations Lead';
  const department = typeof body.department === 'string' && body.department.trim() ? body.department.trim() : 'EHS & Operations';
  const workId = typeof body.workId === 'string' ? body.workId.trim().toUpperCase() : '';
  const facilityRaw = typeof body.facility === 'string' ? body.facility : 'All GHACEM Facilities';
  const clearanceRaw = typeof body.clearanceLevel === 'string' ? body.clearanceLevel : 'Level 2 - Plant Lead';

  const facility: ServerExecutiveAccount['facility'] =
    facilityRaw === 'Tema Main Works' || facilityRaw === 'Takoradi Grinding Plant' ? facilityRaw : 'All GHACEM Facilities';
  const clearanceLevel: ServerExecutiveAccount['clearanceLevel'] =
    clearanceRaw === 'Level 1 - Supervisor' || clearanceRaw === 'Level 3 - Director & Executive'
      ? clearanceRaw
      : 'Level 2 - Plant Lead';

  if (!username || username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
    return res.status(400).json({ ok: false, error: 'Valid username (min 3 chars) is required.' });
  }
  if (!fullName || !workId) {
    return res.status(400).json({ ok: false, error: 'Full name and Work ID are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters long.' });
  }
  if (
    username === 'admin' && getEnvAdminUser() ||
    executiveAccounts.some((a) => a.username.toLowerCase() === username || a.workId.toLowerCase() === workId.toLowerCase())
  ) {
    return res.status(409).json({ ok: false, error: 'An executive account with that username or Work ID already exists.' });
  }

  const remoteCreate = await callAppsScriptExec('exec_create', {
    username,
    password,
    fullName,
    role,
    department,
    facility,
    workId,
    clearanceLevel,
  });
  if (remoteCreate && remoteCreate.ok === false && remoteCreate.conflict) {
    return res.status(409).json({ ok: false, error: String(remoteCreate.error || 'Account already exists.') });
  }

  const { saltHex, hashHex } = hashPassword(password);
  const created: ServerExecutiveAccount = {
    id: `exec-${crypto.randomUUID()}`,
    username,
    passwordSalt: saltHex,
    passwordHash: hashHex,
    fullName,
    role,
    department,
    facility,
    workId,
    clearanceLevel,
  };
  executiveAccounts.push(created);
  savePersistedExecutiveAccounts(executiveAccounts);
  return res.status(201).json({ ok: true, account: sanitizeUser(created) });
});

// ============================================================================
// AI Work Conflict Detection Endpoint
// ============================================================================
export interface ConflictRequestPayload {
  workOrderNumber: string;
  jobType: string | string[];
  location?: string;
  department?: string;
  date?: string;
  equipmentId?: string;
  description?: string;
  currentPermitType?: 'general' | 'hotwork' | 'height';
  existingPermits?: Array<Record<string, unknown>>;
}

export interface DetectedConflictItem {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conflictingWorkOrder?: string;
  conflictingJobType?: string;
  conflictingLocation?: string;
  conflictCategory: 'SIMOPs' | 'DUPLICATE_WORK_ORDER' | 'SPATIAL_DROP_ZONE' | 'HOT_WORK_ATMOSPHERE' | 'ISOLATION_LOTO' | 'TIMING' | 'SAFETY_CONTROLS';
  explanation: string;
  recommendedMitigation: string;
}

export interface ConflictAnalysisResponse {
  conflictLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hasDirectConflict: boolean;
  conflictSummary: string;
  detectedConflicts: DetectedConflictItem[];
  simopsPrecautionChecklist: string[];
  safeToProceed: boolean;
  approvalNotice: string;
  analyzedAt: string;
  workOrderNumber: string;
  jobType: string;
}

// Local deterministic SIMOPs rule check used to augment AI findings
function evaluateLocalRules(payload: ConflictRequestPayload): ConflictAnalysisResponse {
  const wo = (payload.workOrderNumber || '').trim().toUpperCase();
  const jtStr = Array.isArray(payload.jobType) ? payload.jobType.join(', ') : (payload.jobType || '');
  const loc = (payload.location || '').toLowerCase();
  const eq = (payload.equipmentId || '').toLowerCase();
  const permits = Array.isArray(payload.existingPermits) ? payload.existingPermits : [];

  const conflicts: DetectedConflictItem[] = [];

  const sameWoPermits = permits.filter((p) => {
    const pWo = String(p['Work Order Number'] || p['Work Order No.'] || p['workOrderNumber'] || p['workOrderNo'] || '').trim().toUpperCase();
    return pWo && pWo === wo;
  });

  if (sameWoPermits.length > 0) {
    const activeSameWo = sameWoPermits.filter((p) => {
      const st = String(p['Status'] || p['Approval Status'] || p['Permit Status'] || '').toLowerCase();
      return !st.includes('closed') && !st.includes('rejected') && !st.includes('draft');
    });

    if (activeSameWo.length > 0) {
      conflicts.push({
        id: 'dup-wo-' + Date.now(),
        title: `Work Order ${wo} has ${activeSameWo.length} active permit(s) in progress`,
        severity: 'HIGH',
        conflictingWorkOrder: wo,
        conflictingJobType: String(activeSameWo[0]['Type of Work'] || activeSameWo[0]['Description'] || 'Active Permit'),
        conflictingLocation: String(activeSameWo[0]['Location'] || activeSameWo[0]['Department/Location'] || 'Plant site'),
        conflictCategory: 'DUPLICATE_WORK_ORDER',
        explanation: `Work Order #${wo} already has active authorization logged in the system. Issuing overlapping permits under the same Work Order can lead to uncoordinated trade activities or premature sign-off.`,
        recommendedMitigation: `Verify whether this is a supplemental permit (e.g. Hot Work + Height companion) or a duplicate submission. Ensure clear boundary delineation between work teams.`,
      });
    }
  }

  permits.forEach((p, idx) => {
    const pLoc = String(p['Location'] || p['Department/Location'] || '').toLowerCase();
    const pEq = String(p['Equipment ID'] || p['equipmentId'] || '').toLowerCase();
    const pStatus = String(p['Status'] || p['Approval Status'] || p['Permit Status'] || '').toLowerCase();
    const isClosedOrRejected = pStatus.includes('closed') || pStatus.includes('rejected');

    if (isClosedOrRejected) return;

    const pWo = String(p['Work Order Number'] || p['Work Order No.'] || p['workOrderNumber'] || 'N/A');
    const pWorkType = String(p['Type of Work'] || p['Description'] || 'General Work');

    const sameLocation = loc && pLoc && (loc.includes(pLoc) || pLoc.includes(loc));
    const sameEquipment = eq && pEq && (eq.includes(pEq) || pEq.includes(eq));

    if ((sameLocation || sameEquipment) && pWo !== wo) {
      const isHotWorkCurrent = /hot\s*work|weld|torch|burn|grind/i.test(jtStr);
      const isHeightCurrent = /height|scaffold|ladder|roof|elevation/i.test(jtStr);
      const isConfinedCurrent = /confined|silo|tank|vessel/i.test(jtStr);

      const isHotWorkOther = /hot\s*work|weld|torch|burn|grind/i.test(pWorkType);
      const isHeightOther = /height|scaffold|ladder|roof|elevation/i.test(pWorkType);
      const isConfinedOther = /confined|silo|tank|vessel/i.test(pWorkType);

      if (isHotWorkCurrent && (isConfinedOther || isConfinedCurrent)) {
        conflicts.push({
          id: `simops-hot-confined-${idx}`,
          title: `SIMOPs Conflict: Hot Work in Confined Space / Silo Area`,
          severity: 'CRITICAL',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'HOT_WORK_ATMOSPHERE',
          explanation: `Simultaneous hot work / spark-producing activity in or near a confined space or silo (${loc || pLoc}) can trigger toxic fume accumulation, rapid oxygen depletion, or dust cloud ignition.`,
          recommendedMitigation: `Continuous 4-gas atmospheric monitoring (O2, LEL, CO, H2S) required. Mandatory mechanical forced-air ventilation and dedicated EHS space entry certification.`,
        });
      } else if ((isHeightCurrent && !isHeightOther) || (!isHeightCurrent && isHeightOther)) {
        conflicts.push({
          id: `simops-height-drop-${idx}`,
          title: `Overhead SIMOPs Conflict: Working at Height Drop Zone Hazard`,
          severity: 'HIGH',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'SPATIAL_DROP_ZONE',
          explanation: `Work at height is scheduled simultaneously with ground or mezzanine personnel in ${loc || pLoc}. Risk of dropped tools, scaffolding hardware, or slag strike on lower personnel.`,
          recommendedMitigation: `Establish a minimum 10-meter barricaded drop zone below with danger signage and overhead netting. Coordinate staggered shifts or work halts during overhead rigging.`,
        });
      } else if (sameEquipment) {
        conflicts.push({
          id: `simops-loto-${idx}`,
          title: `Equipment Isolation / LOTO Conflict on ${eq.toUpperCase()}`,
          severity: 'HIGH',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'ISOLATION_LOTO',
          explanation: `Multiple work parties are assigned to the same asset (${eq.toUpperCase()}) across different work orders. Potential danger of premature energization or conflicting isolation keys.`,
          recommendedMitigation: `Apply Group Lockout / Master Lock Box procedure. Each supervisor and crew leader must affix their individual padlock to the group lock box.`,
        });
      } else if (sameLocation) {
        conflicts.push({
          id: `simops-location-${idx}`,
          title: `Location Congestion: Multiple Operations at ${loc}`,
          severity: 'MEDIUM',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'SIMOPs',
          explanation: `Active work order #${pWo} (${pWorkType}) is occupying the same zone (${loc}). Congestion may restrict emergency egress paths or fire fighting access.`,
          recommendedMitigation: `Conduct joint pre-task safety briefing with both crew leaders before commencing work. Verify clear egress routes and fire equipment clearance.`,
        });
      }
    }
  });

  const hasCritical = conflicts.some((c) => c.severity === 'CRITICAL');
  const hasHigh = conflicts.some((c) => c.severity === 'HIGH');
  const hasMedium = conflicts.some((c) => c.severity === 'MEDIUM');

  const level = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : hasMedium ? 'MEDIUM' : conflicts.length > 0 ? 'LOW' : 'NONE';

  return {
    conflictLevel: level,
    hasDirectConflict: conflicts.length > 0,
    conflictSummary:
      conflicts.length === 0
        ? `No active safety, SIMOPs, or Work Order collisions identified for ${wo || 'this order'} (${jtStr || 'Job'}). Operating conditions are clear.`
        : `Identified ${conflicts.length} work conflict(s) for Work Order #${wo || 'unassigned'} performing "${jtStr || 'job'}". Highest severity is ${level}.`,
    detectedConflicts: conflicts,
    simopsPrecautionChecklist: [
      'Verify physical work order isolation boundaries and tag numbers',
      'Conduct Joint Tool Box Talk (TBT) with adjacent crew supervisors',
      'Confirm emergency egress paths remain unblocked by tools or equipment',
      'Verify designated fire watch or safety observer is stationed',
      'Ensure individual LOTO padlocks are applied to plant isolation points',
    ],
    safeToProceed: !hasCritical,
    approvalNotice: hasCritical
      ? 'CRITICAL SIMOPs conflict detected. Work cannot proceed without EHS Department and Plant HoD sign-off.'
      : hasHigh
      ? 'High-risk conflict detected. Site supervisor must verify mitigation controls before authorization.'
      : 'Standard permit safety controls apply.',
    analyzedAt: new Date().toISOString(),
    workOrderNumber: wo,
    jobType: jtStr,
  };
}

// POST /api/detect-conflicts - AI Work Conflict Detection Endpoint
app.post('/api/detect-conflicts', async (req: Request, res: Response) => {
  try {
    const payload = (req.body || {}) as ConflictRequestPayload;
    const wo = typeof payload.workOrderNumber === 'string' ? payload.workOrderNumber.trim() : '';
    const jt = Array.isArray(payload.jobType)
      ? payload.jobType.map((s) => String(s)).join(', ').trim()
      : typeof payload.jobType === 'string'
      ? payload.jobType.trim()
      : '';

    if (!wo && !jt) {
      return res.status(400).json({
        ok: false,
        error: 'Work Order Number and Type of Job are required for conflict detection.',
      });
    }

    if (!ai) {
      return res.status(503).json({
        ok: false,
        error: 'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.',
      });
    }

    const localBaseline = evaluateLocalRules({ ...payload, workOrderNumber: wo, jobType: jt });

    const existingPermitsContext = (Array.isArray(payload.existingPermits) ? payload.existingPermits : [])
      .slice(0, 40)
      .map((p) => ({
        workOrder: p['Work Order Number'] || p['Work Order No.'] || p['workOrderNumber'] || 'N/A',
        typeOfWork: p['Type of Work'] || p['Description'] || 'N/A',
        location: p['Location'] || p['Department/Location'] || 'N/A',
        status: p['Status'] || p['Approval Status'] || 'Active',
        equipment: p['Equipment ID'] || p['equipmentId'] || 'N/A',
        date: p['Date of Activity'] || p['Date of Issue'] || p['Date of Work'] || 'N/A',
      }));

    const prompt = `
You are the Chief Safety Engineer and SIMOPs (Simultaneous Operations) Safety Auditor for GHACEM (Ghana Cement Ltd) heavy manufacturing plant.
Perform an exhaustive, safety-critical AI Work Conflict Detection on a new or edited Permit-to-Work (PTW) submission.

Target Permit Information:
- Work Order Number: "${wo || 'UNSPECIFIED'}"
- Type of Job / Activity: "${jt || 'UNSPECIFIED'}"
- Location: "${typeof payload.location === 'string' ? payload.location : 'Plant Grounds'}"
- Department: "${typeof payload.department === 'string' ? payload.department : 'Plant Operations'}"
- Equipment ID: "${typeof payload.equipmentId === 'string' ? payload.equipmentId : 'N/A'}"
- Date of Work: "${typeof payload.date === 'string' ? payload.date : 'Today'}"
- Detailed Work Scope / Description: "${typeof payload.description === 'string' ? payload.description : 'Standard maintenance task'}"
- Permit Classification: "${payload.currentPermitType || 'general'}"

Existing Active / Scheduled Plant Permits:
${JSON.stringify(existingPermitsContext, null, 2)}

Audit Requirements:
1. Examine if this Work Order Number (${wo}) duplicates or collides with already-existing active permits.
2. Analyze physical, spatial, and chemical SIMOPs hazards:
   - Hot Work (welding/grinding/cutting sparks) near combustible areas, coal mills, fuel storage, or confined space entry.
   - Working at Height creating a drop zone hazard over another team working below.
   - Confined space / silo entry during nearby toxic gas, dust generation, or hot work.
   - Lockout / Tagout (LOTO) isolation conflicts on the same equipment (${payload.equipmentId || 'N/A'}) or electrical motor.
   - Shared location congestion blocking emergency exits or access roads.
3. Determine an overall risk rating: 'NONE', 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'.
4. Provide structured conflict items with actionable, industrial-grade mitigation controls following ISO 45001 and GHACEM safety standards.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are GHACEM Corporate Permit-to-Work AI Safety Officer. Analyze work order numbers and job types for dangerous SIMOPs and operational collisions in cement manufacturing. Output valid JSON according to schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conflictLevel: {
              type: Type.STRING,
              description: 'Overall risk level: NONE, LOW, MEDIUM, HIGH, or CRITICAL',
            },
            hasDirectConflict: {
              type: Type.BOOLEAN,
              description: 'Whether any serious conflict exists',
            },
            conflictSummary: {
              type: Type.STRING,
              description: 'Executive 2-3 sentence overview of findings',
            },
            detectedConflicts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING, description: 'LOW, MEDIUM, HIGH, or CRITICAL' },
                  conflictingWorkOrder: { type: Type.STRING },
                  conflictingJobType: { type: Type.STRING },
                  conflictingLocation: { type: Type.STRING },
                  conflictCategory: {
                    type: Type.STRING,
                    description: 'SIMOPs, DUPLICATE_WORK_ORDER, SPATIAL_DROP_ZONE, HOT_WORK_ATMOSPHERE, ISOLATION_LOTO, TIMING, or SAFETY_CONTROLS',
                  },
                  explanation: { type: Type.STRING },
                  recommendedMitigation: { type: Type.STRING },
                },
                required: ['id', 'title', 'severity', 'conflictCategory', 'explanation', 'recommendedMitigation'],
              },
            },
            simopsPrecautionChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific checklist points for field supervisors',
            },
            safeToProceed: {
              type: Type.BOOLEAN,
              description: 'Whether work may proceed after mitigations or must be held',
            },
            approvalNotice: {
              type: Type.STRING,
              description: 'Specific instruction for the approving supervisor / HoD',
            },
          },
          required: [
            'conflictLevel',
            'hasDirectConflict',
            'conflictSummary',
            'detectedConflicts',
            'simopsPrecautionChecklist',
            'safeToProceed',
            'approvalNotice',
          ],
        },
      },
    });

    const text = response.text || '';
    if (!text) {
      return res.status(502).json({
        ok: false,
        error: 'Gemini returned an empty conflict analysis response.',
      });
    }

    const parsed = JSON.parse(text) as Partial<ConflictAnalysisResponse>;

    const mergedConflicts = [...(parsed.detectedConflicts || [])] as DetectedConflictItem[];
    localBaseline.detectedConflicts.forEach((locC) => {
      if (!mergedConflicts.some((mc) => mc.conflictCategory === locC.conflictCategory && mc.title === locC.title)) {
        mergedConflicts.push(locC);
      }
    });

    const finalResult: ConflictAnalysisResponse = {
      conflictLevel: (parsed.conflictLevel as ConflictAnalysisResponse['conflictLevel']) || localBaseline.conflictLevel,
      hasDirectConflict: mergedConflicts.length > 0,
      conflictSummary: parsed.conflictSummary || localBaseline.conflictSummary,
      detectedConflicts: mergedConflicts,
      simopsPrecautionChecklist:
        parsed.simopsPrecautionChecklist && parsed.simopsPrecautionChecklist.length > 0
          ? parsed.simopsPrecautionChecklist
          : localBaseline.simopsPrecautionChecklist,
      safeToProceed: parsed.safeToProceed !== undefined ? parsed.safeToProceed : localBaseline.safeToProceed,
      approvalNotice: parsed.approvalNotice || localBaseline.approvalNotice,
      analyzedAt: new Date().toISOString(),
      workOrderNumber: wo,
      jobType: jt,
    };

    return res.json({
      ok: true,
      source: 'gemini-4-hydrogen',
      analysis: finalResult,
    });
  } catch (error) {
    console.error('Error in /api/detect-conflicts:', error);
    const errMessage = error instanceof Error ? error.message : String(error);
    const statusCode =
      /PERMISSION_DENIED|API_KEY_INVALID|401|403/i.test(errMessage)
        ? 403
        : /RESOURCE_EXHAUSTED|429/i.test(errMessage)
        ? 429
        : 502;
    return res.status(statusCode).json({
      ok: false,
      error: `AI conflict analysis failed: ${errMessage}`,
    });
  }
});

// ============================================================================
// Automatic Silent Server-Side Email Notification System
// Recipient addresses stay strictly server-side (never exposed to browser UI)
// ============================================================================
const EHS_ALERT_EMAIL = (process.env.EHS_ALERT_EMAIL || 'sebastianerchiejnr4@gmail.com').trim();
const HOD_ALERT_EMAIL = (process.env.HOD_ALERT_EMAIL || 'oseiemmanue67@gmail.com').trim();

type NotificationEvent =
  | 'permit_submitted'
  | 'ehs_confined_alert'
  | 'permit_closed'
  | 'permit_approved'
  | 'permit_rejected';

interface NotificationEmailBody {
  event?: NotificationEvent;
  formType?: 'general' | 'hotwork' | 'height';
  submissionId?: string;
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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}



function buildFallbackReviewUrl(
  formType: string,
  submissionId: string,
  workOrder: string,
  mode: 'review' | 'ehs_test' = 'review'
): string {
  const customPublic = (process.env.APP_PUBLIC_URL || process.env.PUBLIC_PORTAL_URL || '').trim();
  if (
    mode === 'review' &&
    customPublic &&
    !customPublic.includes('ais-dev-') &&
    !customPublic.includes('ais-pre-')
  ) {
    try {
      const url = new URL(customPublic);
      url.searchParams.set('permit', formType);
      url.searchParams.set('id', submissionId);
      if (workOrder && workOrder !== 'UNSPECIFIED') {
        url.searchParams.set('workorder', workOrder);
      }
      url.searchParams.set('review', '1');
      return url.toString();
    } catch {
      return `${customPublic}?permit=${encodeURIComponent(formType)}&id=${encodeURIComponent(submissionId)}&review=1`;
    }
  }

  const scriptBase = (process.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL).trim();
  try {
    const url = new URL(scriptBase);
    url.searchParams.set('mode', mode);
    url.searchParams.set('permit', formType);
    url.searchParams.set('id', submissionId);
    if (workOrder && workOrder !== 'UNSPECIFIED') {
      url.searchParams.set('workorder', workOrder);
    }
    return url.toString();
  } catch {
    return `${scriptBase}?mode=${mode}&permit=${encodeURIComponent(formType)}&id=${encodeURIComponent(submissionId)}`;
  }
}

function buildNotificationEmailContent(payload: NotificationEmailBody): {
  recipients: string[];
  subject: string;
  text: string;
  html: string;
} {
  const allowedEvents: NotificationEvent[] = [
    'permit_submitted',
    'ehs_confined_alert',
    'permit_closed',
    'permit_approved',
    'permit_rejected',
  ];
  const event: NotificationEvent =
    payload.event && allowedEvents.includes(payload.event) ? payload.event : 'permit_submitted';

  const formType = payload.formType || 'general';
  const formLabel =
    formType === 'hotwork'
      ? 'Hot Work / Confined Space / Silo Entry (04B)'
      : formType === 'height'
      ? 'Working at Height (04C)'
      : 'General Work Permit (04A)';

  const subId = (payload.submissionId || 'N/A').trim();
  const wo = (payload.workOrder || 'UNSPECIFIED').trim();
  const loc = (payload.location || 'Plant Grounds').trim();
  const dept = (payload.department || 'Plant Operations').trim();
  const eq = (payload.equipmentId || 'N/A').trim();
  const desc = (payload.description || 'Scheduled plant maintenance').trim();
  const supName = (payload.supervisorName || 'Authorized Supervisor').trim();
  const supId = (payload.supervisorWorkId || 'Verified').trim();
  const timestamp = new Date().toISOString();
  const desiredMode: 'review' | 'ehs_test' = event === 'ehs_confined_alert' ? 'ehs_test' : 'review';
  const providedUrl = (payload.verificationUrl || '').trim();
  const isUnreachablePreviewUrl =
    !providedUrl || providedUrl.includes('ais-dev-') || providedUrl.includes('ais-pre-');
  const actionUrl = isUnreachablePreviewUrl
    ? buildFallbackReviewUrl(formType, subId, wo, desiredMode)
    : providedUrl;

  let recipients: string[] = [HOD_ALERT_EMAIL];
  let subject = `[GHACPerm] Permit Submitted for Approval - WO #${wo} (${subId})`;
  let bannerColor = '#0f8a3c';
  let heading = 'Permit Submitted for Authorization';
  let intro = 'A Permit-to-Work has been submitted and awaits review. Use the button below to open the permit and approve or reject it with a reason.';
  let ctaLabel = 'Open Permit to Approve or Reject';

  if (event === 'ehs_confined_alert') {
    recipients = [EHS_ALERT_EMAIL];
    subject = `[RED PROTOCOL ALERT] Enter EHS Confined Space Gas Test Results - WO #${wo} (${loc})`;
    bannerColor = '#c5221f';
    heading = 'RED PROTOCOL: EHS Atmospheric Gas Test Required';
    intro =
      'An on-site EHS Atmospheric Gas Test (O2, LEL, CO, Temperature) is required prior to Confined Space / Silo Entry. Click the button below to enter and submit the gas test readings.';
    ctaLabel = 'Enter Atmospheric Gas Test Results';
  } else if (event === 'permit_closed') {
    recipients = [HOD_ALERT_EMAIL, EHS_ALERT_EMAIL];
    subject = `[GHACPerm Closed] Work Completed & Handed Back - WO #${wo} (${subId})`;
    bannerColor = '#1d4ed8';
    heading = 'Permit Closed & Handed Back';
    intro = `Work under this permit has been marked completed and closed by ${payload.closedBy || 'Executive Operations'}.`;
    ctaLabel = 'View Closed Permit Record';
  } else if (event === 'permit_approved') {
    recipients = [HOD_ALERT_EMAIL, EHS_ALERT_EMAIL];
    subject = `[GHACPerm APPROVED] Permit Authorized - WO #${wo} (${subId})`;
    bannerColor = '#0f8a3c';
    heading = 'Permit Formally Approved';
    intro = `This Permit-to-Work has been approved by ${payload.reviewerName || 'Head of Department (HoD)'}.`;
    ctaLabel = 'Open Permit Record';
  } else if (event === 'permit_rejected') {
    recipients = [HOD_ALERT_EMAIL, EHS_ALERT_EMAIL];
    subject = `[GHACPerm REJECTED] Permit Denied - WO #${wo} (${subId})`;
    bannerColor = '#c5221f';
    heading = 'Permit Formally Rejected';
    intro = `This Permit-to-Work was rejected by ${payload.reviewerName || 'Head of Department (HoD)'}.`;
    ctaLabel = 'View Rejection Details';
  } else if (formType === 'hotwork') {
    recipients = [HOD_ALERT_EMAIL, EHS_ALERT_EMAIL];
    subject = `[GHACPerm RED PROTOCOL] Hot Work / Entry Permit Submitted - WO #${wo} (${subId})`;
    bannerColor = '#c5221f';
    heading = 'High-Risk Red Protocol Permit Submitted';
    intro =
      'A High-Risk Hot Work / Confined Space permit has been submitted for authorization. Click the button below to open the permit and approve or reject it with a reason.';
    ctaLabel = 'Open Permit to Approve or Reject';
  }

  const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)));

  const detailsRows: Array<[string, string]> = [
    ['Permit Classification', formLabel],
    ['Submission ID', subId],
    ['Work Order Number', wo],
    ['Location', loc],
    ['Department', dept],
    ['Equipment ID', eq],
    ['Work Scope', desc],
    ['Site Supervisor', `${supName} (${supId})`],
    ...(event === 'permit_closed'
      ? [
          ['Closed By', payload.closedBy || 'Executive Operations'] as [string, string],
          ['Handback Remarks', payload.closureRemarks || 'Work completed safely'] as [string, string],
        ]
      : []),
    ...(event === 'permit_approved'
      ? [
          ['Approved By', payload.reviewerName || 'Head of Department (HoD)'] as [string, string],
          ...(payload.decisionRemarks
            ? ([['Approval Remarks', payload.decisionRemarks]] as Array<[string, string]>)
            : []),
        ]
      : []),
    ...(event === 'permit_rejected'
      ? [
          ['Rejected By', payload.reviewerName || 'Head of Department (HoD)'] as [string, string],
          ['Rejection Reason', payload.rejectionReason || 'No reason provided'] as [string, string],
        ]
      : []),
    ['Timestamp (UTC)', timestamp],
  ];

  const textLines = [
    'GHACEM CORPORATE PERMIT-TO-WORK (GHACPerm)',
    heading.toUpperCase(),
    '============================================================',
    intro,
    '',
    ...detailsRows.map(([k, v]) => `${k.padEnd(22, ' ')}: ${v}`),
    `Review / Action Link  : ${actionUrl}`,
    '',
    '-- Automated Dispatch from GHACPerm Corporate Safety System',
  ];

  const htmlRows = detailsRows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:180px;">${escapeHtml(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(v)}</td></tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#ffffff;">
      <div style="background:${bannerColor};color:#ffffff;padding:18px 22px;">
        <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">GHACEM Corporate Permit-to-Work</div>
        <h2 style="margin:6px 0 0;font-size:18px;line-height:1.3;">${escapeHtml(heading)}</h2>
      </div>
      <div style="padding:20px 22px;color:#1f2937;font-size:14px;line-height:1.5;">
        <p style="margin-top:0;">${escapeHtml(intro)}</p>
        <div style="margin:20px 0;text-align:center;">
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:${bannerColor};color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:bold;font-size:14px;letter-spacing:0.2px;">${escapeHtml(ctaLabel)}</a>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;border:1px solid #e5e7eb;">
          ${htmlRows}
        </table>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">
          Direct Permit Link: <a href="${escapeHtml(actionUrl)}" style="color:${bannerColor};">${escapeHtml(actionUrl)}</a>
        </p>
      </div>
      <div style="background:#f9fafb;padding:12px 22px;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;">
        Automated notification dispatched by GHACPerm ISO 45001 Safety System.
      </div>
    </div>
  `;

  return {
    recipients: uniqueRecipients,
    subject,
    text: textLines.join('\n'),
    html,
  };
}

app.post('/api/notifications/email', async (req: Request, res: Response) => {
  try {
    const payload = (req.body || {}) as NotificationEmailBody;
    const { recipients, subject, text, html } = buildNotificationEmailContent(payload);

    // 1. Try Resend HTTPS API if configured
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (resendKey) {
      const fromAddr = (process.env.EMAIL_FROM || 'GHACPerm Safety System <onboarding@resend.dev>').trim();
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: recipients,
          subject,
          text,
          html,
        }),
      });

      if (resendResp.ok) {
        return res.json({ ok: true, deliveredByServer: true, transport: 'resend' });
      }
      const errText = await resendResp.text().catch(() => '');
      console.warn('Resend dispatch failed, checking SMTP fallback:', errText);
    }

    // 2. Try Nodemailer SMTP (Gmail App Password or custom SMTP) if configured
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
    if (smtpUser && smtpPass) {
      const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
      const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number.isNaN(smtpPort) ? 465 : smtpPort,
        secure: (Number.isNaN(smtpPort) ? 465 : smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: (process.env.EMAIL_FROM || `GHACPerm Safety System <${smtpUser}>`).trim(),
        to: recipients.join(', '),
        subject,
        text,
        html,
      });

      return res.json({ ok: true, deliveredByServer: true, transport: 'smtp' });
    }

    // 3. Try custom HTTPS Email Webhook if configured
    const webhookUrl = (process.env.EMAIL_WEBHOOK_URL || '').trim();
    if (webhookUrl) {
      const hookResp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipients, subject, text, html, event: payload.event }),
      });
      if (hookResp.ok) {
        return res.json({ ok: true, deliveredByServer: true, transport: 'webhook' });
      }
    }

    // 4. Signal client that Google Apps Script MailApp fallback should handle delivery
    return res.json({
      ok: true,
      deliveredByServer: false,
      transport: 'apps_script_fallback',
    });
  } catch (err) {
    console.error('Error in /api/notifications/email:', err);
    return res.status(500).json({
      ok: false,
      deliveredByServer: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Vite Middleware integration for development / static serving for production
async function startServer() {
  const isDevProcess =
    process.execArgv.some((arg) => arg.includes('tsx')) ||
    process.argv.some((arg) => arg.includes('tsx')) ||
    process.env.npm_lifecycle_event === 'dev';
  const distDir = path.resolve('dist');
  const distIndex = path.join(distDir, 'index.html');
  const useProductionAssets =
    process.env.NODE_ENV === 'production' || (!isDevProcess && fs.existsSync(distIndex));

  if (useProductionAssets) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
      } else {
        res.status(503).send('Application build artifacts not found. Run npm run build.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`GHACEM Corporate PTW server running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    const fallbackPort = parseInt(process.env.DEFAULT_APP_PORT || '3000', 10);
    if (err.code === 'EADDRINUSE' && PORT !== fallbackPort && !Number.isNaN(fallbackPort)) {
      console.warn(`Port ${PORT} in use, retrying on DEFAULT_APP_PORT ${fallbackPort}...`);
      app.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`GHACEM Corporate PTW server running at http://0.0.0.0:${fallbackPort}`);
      });
    } else {
      console.error('Server listen error:', err);
      process.exit(1);
    }
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;

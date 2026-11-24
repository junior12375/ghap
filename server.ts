import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

const executiveAccounts: ServerExecutiveAccount[] = [];

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
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string): { sub: string; username: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    if (!constantTimeStringEqual(sig, expectedSig)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      sub: string;
      username: string;
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
  const user = findUserById(verified.sub);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Executive account no longer active.' });
  }
  req.executiveUser = user;
  return next();
}

// GET /api/executive/status - Check whether executive auth is configured
app.get('/api/executive/status', (_req: Request, res: Response) => {
  const envAdmin = getEnvAdminUser();
  const hasAccounts = executiveAccounts.length > 0;
  return res.json({
    ok: true,
    configured: Boolean(envAdmin || hasAccounts),
    envOverride: Boolean(envAdmin),
    accountCount: executiveAccounts.length + (envAdmin ? 1 : 0),
  });
});

// POST /api/executive/setup - One-time first-run executive account creation (locks once claimed or if env password set)
app.post('/api/executive/setup', (req: Request, res: Response) => {
  const envAdmin = getEnvAdminUser();
  if (envAdmin || executiveAccounts.length > 0) {
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
  const publicUser = sanitizeUser(newAccount);
  const token = signSessionToken(publicUser);

  return res.status(201).json({
    ok: true,
    token,
    user: publicUser,
  });
});

// POST /api/executive/login - Verify username/Work ID + password on server
app.post('/api/executive/login', (req: Request, res: Response) => {
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

  if (!match || !verifyPasswordHash(passwordInput, match.passwordSalt, match.passwordHash)) {
    return res.status(401).json({ ok: false, error: 'Invalid executive username or password.' });
  }

  const publicUser = sanitizeUser(match);
  const token = signSessionToken(publicUser);
  return res.json({ ok: true, token, user: publicUser });
});

// GET /api/executive/me - Get current authenticated executive session
app.get('/api/executive/me', requireExecutiveAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ ok: true, user: req.executiveUser });
});

// POST /api/executive/change-password - Update password for authenticated user
app.post('/api/executive/change-password', requireExecutiveAuth, (req: AuthenticatedRequest, res: Response) => {
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
  if (!account || !verifyPasswordHash(currentPassword, account.passwordSalt, account.passwordHash)) {
    return res.status(401).json({ ok: false, error: 'Current password does not match our records.' });
  }

  const { saltHex, hashHex } = hashPassword(newPassword);
  account.passwordSalt = saltHex;
  account.passwordHash = hashHex;

  return res.json({ ok: true, message: 'Password updated successfully.' });
});

// GET /api/executive/accounts - List sanitized executive accounts (authenticated)
app.get('/api/executive/accounts', requireExecutiveAuth, (_req: AuthenticatedRequest, res: Response) => {
  const envAdmin = getEnvAdminUser();
  const list: PublicExecutiveUser[] = [
    ...(envAdmin ? [envAdmin] : []),
    ...executiveAccounts.map(sanitizeUser),
  ];
  return res.json({ ok: true, accounts: list });
});

// POST /api/executive/accounts - Provision a new executive account (Level 3 only)
app.post('/api/executive/accounts', requireExecutiveAuth, (req: AuthenticatedRequest, res: Response) => {
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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

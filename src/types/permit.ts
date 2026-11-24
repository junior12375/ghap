export type PermitType = 'general' | 'hotwork' | 'height';

export type PermitStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Awaiting EHS Space Test'
  | 'Awaiting HoD Approval'
  | 'Approved'
  | 'Active'
  | 'Overdue'
  | 'Closed'
  | 'Rejected'
  | 'Cancelled';

export interface SignatureRecord {
  name: string;
  at: number | string;
  workId?: string;
}

export interface SafetyPhotos {
  isolation?: string;
  isolationName?: string;
  isolationAt?: string;
  fireExtinguisher?: string;
  fireExtinguisherName?: string;
  fireExtinguisherAt?: string;
  [key: string]: string | undefined;
}

export interface CrewLogEntry {
  date: string;
  persons: string;
  sigLeader: boolean | string;
  sigMgr: boolean | string;
  timeStart: string;
  timeStop: string;
}

export interface HeightCrewMember {
  name: string;
  trained: 'Yes' | 'No' | null;
}

export interface GasTestReading {
  reading: string;
  date: string;
  time: string;
}

export interface HotworkTestData {
  oxygen: GasTestReading;
  lel: GasTestReading;
  co: GasTestReading;
  temp: GasTestReading;
}

export interface GeneralPermitData {
  department: string;
  deptLocation: string;
  description: string;
  dateIssue: string;
  timeIssue: string;
  workOrderNumber: string;
  contractor: string;
  envHazards: string[];
  safetyHazards: string[];
  ppeItems: string[];
  ppeOthers: string;
  precEnv: string[];
  precSafety: string[];
  safetyPhotos: SafetyPhotos;
  dynamicRiskAssessment: boolean;
  crewLeaderSig: SignatureRecord | null;
  authSig: SignatureRecord | null;
  crewLog: CrewLogEntry[];
  completionSig: SignatureRecord | null;
  _submissionId?: string;
  [key: string]: unknown;
}

export interface HotworkPermitData {
  no: string;
  dateActivity: string;
  location: string;
  equipmentId: string;
  department: string;
  workOrderNumber: string;
  deptContractor: string;
  typeOfWork: string[];
  purpose: string;
  workAtHeight: 'Yes' | 'No' | null;
  heightFormRef: string;
  isolation: {
    electrical: 'Yes' | 'No' | null;
    mechanical: 'Yes' | 'No' | null;
    fireDetection: 'Yes' | 'No' | null;
    pipeline: 'Yes' | 'No' | null;
    contactMaintenance: 'Yes' | 'No' | null;
  };
  isolationOther: string;
  isolationCheckedBy: string;
  testData: HotworkTestData;
  confinedSpaceTestedBy: string;
  combustibleCleared: 'Yes' | 'No' | null;
  sparksContact: 'Yes' | 'No' | null;
  sparksControls: string[];
  sparksOther: string;
  firewatchBy: string;
  fumesProduced: 'Yes' | 'No' | null;
  ventilationOther: string[];
  ventilationOtherList: string;
  commsEquip: 'Yes' | 'No' | 'N/A' | null;
  commsDescribe: string;
  ppe: string[];
  ppeOther: string;
  entrants: string;
  attendants: string;
  entrantUnderstands: 'Yes' | 'No' | null;
  attendantUnderstands: 'Yes' | 'No' | null;
  emergencyOther: string;
  emergencyEquip: string;
  safetyPhotos: SafetyPhotos;
  dynamicRiskAssessment: boolean;
  safeCommenceMgr: SignatureRecord | null;
  safeCommenceCrew: SignatureRecord | null;
  signOffMgr: SignatureRecord | null;
  signOffCrew: SignatureRecord | null;
  _submissionId?: string;
  departmentAuthorized?: boolean;
  supervisorApproved?: boolean;
  [key: string]: unknown;
}

export interface HeightPermitData {
  formNo: string;
  location: string;
  equipmentId: string;
  department: string;
  workOrderNo: string;
  dateOfWork: string;
  description: string;
  contractor: string;
  isoMechanical: 'Yes' | 'No' | 'N/A' | null;
  isoElectrical: 'Yes' | 'No' | 'N/A' | null;
  isoDepressurized: 'Yes' | 'No' | 'N/A' | null;
  isoFlushed: 'Yes' | 'No' | 'N/A' | null;
  isoEarthed: 'Yes' | 'No' | 'N/A' | null;
  isolationCheckedBy: string;
  scaffolding: 'Yes' | 'No' | 'N/A' | null;
  safeAccess: 'Yes' | 'No' | 'N/A' | null;
  ladderTied: 'Yes' | 'No' | 'N/A' | null;
  otherAccessMeans: string;
  platformsSafe: 'Yes' | 'No' | 'N/A' | null;
  railingsToeBoards: 'Yes' | 'No' | 'N/A' | null;
  ppeAppropriate: 'Yes' | 'No' | 'N/A' | null;
  dropZoneCordoned: 'Yes' | 'No' | 'N/A' | null;
  dropZoneCleared: 'Yes' | 'No' | 'N/A' | null;
  dropZoneSigns: 'Yes' | 'No' | 'N/A' | null;
  lighted: 'Yes' | 'No' | 'N/A' | null;
  commsAssured: 'Yes' | 'No' | 'N/A' | null;
  emergencyOther: string;
  emergencyEquip: string;
  safetyPhotos: SafetyPhotos;
  dynamicRiskAssessment: boolean;
  specialInstructions: string;
  crew: HeightCrewMember[];
  explainNo: string;
  authCrew: SignatureRecord | null;
  authMgr: SignatureRecord | null;
  closureCrew: SignatureRecord | null;
  closureMgr: SignatureRecord | null;
  _submissionId?: string;
  [key: string]: unknown;
}

export interface AllPermitState {
  general: GeneralPermitData;
  hotwork: HotworkPermitData;
  height: HeightPermitData;
}

export interface HistoryRecord {
  'Submission ID'?: string;
  'Last Updated'?: string;
  'Submitted At'?: string;
  'Status'?: string;
  'Approval Status'?: string;
  'Permit Status'?: string;
  'Department Authorization'?: string;
  'Department Authorization At'?: string;
  'Department Authorized By'?: string;
  'Department Authorized By Work ID'?: string;
  'Supervisor Approval'?: string;
  'HoD Approval'?: string;
  'HoD Approval At'?: string;
  'HoD Approved By'?: string;
  'HoD Rejection Reason'?: string;
  'HoD Field Code'?: string;
  'EHS Test Requested'?: string;
  'EHS Test Completed'?: string;
  'EHS Test Completed At'?: string;
  'EHS Tested By'?: string;
  'Renewal Status'?: string;
  'Renewal Of'?: string;
  'Renewal Remarks'?: string;
  'Work Order Number'?: string;
  'Work Order No.'?: string;
  'Location'?: string;
  'Department/Location'?: string;
  'Description'?: string;
  'Purpose'?: string;
  'Department'?: string;
  'Contractor'?: string;
  'Type of Work'?: string;
  'Dynamic Risk Assessment Done'?: string;
  'Encrypted'?: string;
  'Encrypted Hash'?: string;
  [key: string]: unknown;
}

export interface EncryptedDocumentPackage {
  version: '1.0';
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  saltHex: string;
  ivHex: string;
  ciphertextBase64: string;
  sha256Hash: string;
  submissionId: string;
  formType: PermitType;
  createdAt: string;
  metadataSummary: {
    workOrder: string;
    location: string;
    status: string;
  };
}

export interface SyncStatusInfo {
  state: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  message: string;
  lastSyncTime?: Date;
  pendingQueueCount: number;
}

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ConflictCategory =
  | 'SIMOPs'
  | 'DUPLICATE_WORK_ORDER'
  | 'SPATIAL_DROP_ZONE'
  | 'HOT_WORK_ATMOSPHERE'
  | 'ISOLATION_LOTO'
  | 'TIMING'
  | 'SAFETY_CONTROLS';

export interface DetectedConflictItem {
  id: string;
  title: string;
  severity: ConflictSeverity;
  conflictingWorkOrder?: string;
  conflictingJobType?: string;
  conflictingLocation?: string;
  conflictCategory: ConflictCategory;
  explanation: string;
  recommendedMitigation: string;
}

export interface ConflictAnalysisResult {
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


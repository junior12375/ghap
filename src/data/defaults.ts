import { AllPermitState, GeneralPermitData, HeightPermitData, HotworkPermitData, PermitType } from '../types/permit';

export const SUPERVISOR_DIRECTORY: Record<string, string> = {
  '11037': 'Nii Adje Bismark',
  '11079': 'Asomah Yakubu',
  '10108': 'Osei Emmanuel',
  '10112': 'Prince Kissi',
};

export const DEPARTMENTS = ['Electricals', 'Mechanicals', 'Production', 'Auto', 'EHS & Safety', 'Civil Works'];

export function createFreshPermitDefaults(type: 'general'): GeneralPermitData;
export function createFreshPermitDefaults(type: 'hotwork'): HotworkPermitData;
export function createFreshPermitDefaults(type: 'height'): HeightPermitData;
export function createFreshPermitDefaults<T extends PermitType>(type: T): AllPermitState[T];
export function createFreshPermitDefaults(type: PermitType): GeneralPermitData | HotworkPermitData | HeightPermitData {
  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().substring(0, 5);
  const year = new Date().getFullYear();

  if (type === 'general') {
    const freshGeneral: GeneralPermitData = {
      department: '',
      deptLocation: '',
      description: '',
      dateIssue: today,
      timeIssue: nowTime,
      workOrderNumber: '',
      contractor: '',
      envHazards: [],
      safetyHazards: [],
      ppeItems: [],
      ppeOthers: '',
      precEnv: [],
      precSafety: [],
      safetyPhotos: { isolation: '', isolationName: '', isolationAt: '' },
      dynamicRiskAssessment: false,
      crewLeaderSig: null,
      authSig: null,
      crewLog: [{ date: today, persons: '4', sigLeader: false, sigMgr: false, timeStart: '08:00', timeStop: '16:30' }],
      completionSig: null,
      _submissionId: '',
    };
    return freshGeneral;
  }

  if (type === 'hotwork') {
    const freshHotwork: HotworkPermitData = {
      no: 'HW-' + year + '-' + Math.floor(1000 + Math.random() * 9000),
      dateActivity: today,
      location: '',
      equipmentId: '',
      department: '',
      workOrderNumber: '',
      deptContractor: '',
      typeOfWork: [],
      purpose: '',
      workAtHeight: null,
      heightFormRef: '',
      isolation: {
        electrical: null,
        mechanical: null,
        fireDetection: null,
        pipeline: null,
        contactMaintenance: null,
      },
      isolationOther: '',
      isolationCheckedBy: '',
      testData: {
        oxygen: { reading: '20.9', date: today, time: nowTime },
        lel: { reading: '0', date: today, time: nowTime },
        co: { reading: '0', date: today, time: nowTime },
        temp: { reading: '28', date: today, time: nowTime },
      },
      confinedSpaceTestedBy: '',
      combustibleCleared: null,
      sparksContact: null,
      sparksControls: [],
      sparksOther: '',
      firewatchBy: '',
      fumesProduced: null,
      ventilationOther: [],
      ventilationOtherList: '',
      commsEquip: null,
      commsDescribe: '',
      ppe: [],
      ppeOther: '',
      entrants: '',
      attendants: '',
      entrantUnderstands: null,
      attendantUnderstands: null,
      emergencyOther: '',
      emergencyEquip: 'CO2 & Dry Powder Extinguishers, Emergency Stretcher, Radio Ch 4',
      safetyPhotos: {
        isolation: '',
        isolationName: '',
        isolationAt: '',
        fireExtinguisher: '',
        fireExtinguisherName: '',
        fireExtinguisherAt: '',
      },
      dynamicRiskAssessment: false,
      safeCommenceMgr: null,
      safeCommenceCrew: null,
      signOffMgr: null,
      signOffCrew: null,
      _submissionId: '',
    };
    return freshHotwork;
  }

  const freshHeight: HeightPermitData = {
    formNo: 'WAH-' + year + '-' + Math.floor(1000 + Math.random() * 9000),
    location: '',
    equipmentId: '',
    department: '',
    workOrderNo: '',
    dateOfWork: today,
    description: '',
    contractor: '',
    isoMechanical: null,
    isoElectrical: null,
    isoDepressurized: null,
    isoFlushed: null,
    isoEarthed: null,
    isolationCheckedBy: '',
    scaffolding: null,
    safeAccess: null,
    ladderTied: null,
    otherAccessMeans: '',
    platformsSafe: null,
    railingsToeBoards: null,
    ppeAppropriate: null,
    dropZoneCordoned: null,
    dropZoneCleared: null,
    dropZoneSigns: null,
    lighted: null,
    commsAssured: null,
    emergencyOther: '',
    emergencyEquip: 'Safety Harnesses, Shock Absorbing Lanyards, Rescue Winch, VHF Radio',
    specialInstructions: '',
    crew: [{ name: '', trained: null }],
    explainNo: '',
    safetyPhotos: { isolation: '', isolationName: '', isolationAt: '' },
    dynamicRiskAssessment: false,
    authCrew: null,
    authMgr: null,
    closureCrew: null,
    closureMgr: null,
    _submissionId: '',
  };
  return freshHeight;
}

export const DEFAULT_PERMIT_STATE: AllPermitState = {
  general: createFreshPermitDefaults('general'),
  hotwork: createFreshPermitDefaults('hotwork'),
  height: createFreshPermitDefaults('height'),
};

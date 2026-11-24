import { GeneralPermitData, HeightPermitData, HistoryRecord, HotworkPermitData, PermitType, SignatureRecord } from '../types/permit';
import { SUPERVISOR_DIRECTORY } from '../data/defaults';

export function lookupSupervisorName(workId: string): string {
  return SUPERVISOR_DIRECTORY[workId.trim()] || '';
}

export function needsConfinedSpaceEhsTest(typeOfWork: string[] | string | undefined): boolean {
  const text = Array.isArray(typeOfWork) ? typeOfWork.join(', ') : String(typeOfWork || '');
  return /confined\s*space|silo/i.test(text);
}

export function formatSigTime(at: number | string | undefined): string {
  if (!at) return '';
  if (typeof at === 'number') return new Date(at).toLocaleString();
  return String(at);
}

function sigOrEmpty(sig: SignatureRecord | null | undefined): string {
  return sig?.name || '';
}

function sigTimeOrEmpty(sig: SignatureRecord | null | undefined): string {
  return sig?.at ? formatSigTime(sig.at) : '';
}

function sigWorkIdOrEmpty(sig: SignatureRecord | null | undefined): string {
  return sig?.workId || '';
}

export function flattenGeneral(g: GeneralPermitData): Record<string, unknown> {
  return {
    Timestamp: new Date().toLocaleString(),
    Department: g.department,
    'Department/Location': g.deptLocation,
    Description: g.description,
    'Date of Issue': g.dateIssue,
    'Time of Issue': g.timeIssue,
    'Work Order Number': g.workOrderNumber,
    Contractor: g.contractor,
    'Environment Hazards': (g.envHazards || []).join(', '),
    'Safety Hazards': (g.safetyHazards || []).join(', '),
    'PPE Required': (g.ppeItems || []).join(', '),
    'PPE Others': g.ppeOthers,
    'Precautions Environmental': (g.precEnv || []).join(', '),
    'Precautions Safety': (g.precSafety || []).join(', '),
    'Isolation Photo Evidence': g.safetyPhotos?.isolation || '',
    'Isolation Photo File': g.safetyPhotos?.isolationName || '',
    'Isolation Photo Captured At': g.safetyPhotos?.isolationAt || '',
    'Dynamic Risk Assessment Done': g.dynamicRiskAssessment ? 'Yes' : 'No',
    'Crew Leader Signed By': sigOrEmpty(g.crewLeaderSig),
    'Crew Leader Signed At': sigTimeOrEmpty(g.crewLeaderSig),
    'Authorization Signed By': sigOrEmpty(g.authSig),
    'Authorization Signed At': sigTimeOrEmpty(g.authSig),
    'Authorization Signed By ID': sigWorkIdOrEmpty(g.authSig),
    'Completion Signed By': sigOrEmpty(g.completionSig),
    'Completion Signed At': sigTimeOrEmpty(g.completionSig),
    'Completion Signed By ID': sigWorkIdOrEmpty(g.completionSig),
    'Crew Log': JSON.stringify(g.crewLog || []),
    Status: g.completionSig ? 'Closed' : (g.authSig && g.crewLeaderSig ? 'Active' : 'Draft'),
  };
}

export function flattenHotwork(h: HotworkPermitData): Record<string, unknown> {
  return {
    Timestamp: new Date().toLocaleString(),
    'No.': h.no,
    'Date of Activity': h.dateActivity,
    Location: h.location,
    'Equipment ID': h.equipmentId,
    'Work Order Number': h.workOrderNumber,
    'Dept/Contractor': h.deptContractor,
    'Type of Work': (h.typeOfWork || []).join(', '),
    Purpose: h.purpose,
    'Work at Height?': h.workAtHeight,
    'Isolation - Electrical': h.isolation.electrical,
    'Isolation - Mechanical': h.isolation.mechanical,
    'Isolation - Fire Detection': h.isolation.fireDetection,
    'Isolation - Pipeline': h.isolation.pipeline,
    'Isolation - Contact Maintenance': h.isolation.contactMaintenance,
    'Isolation Other': h.isolationOther,
    'Isolation Checked By': h.isolationCheckedBy,
    'Isolation Photo Evidence': h.safetyPhotos?.isolation || '',
    'Isolation Photo File': h.safetyPhotos?.isolationName || '',
    'Isolation Photo Captured At': h.safetyPhotos?.isolationAt || '',
    'Fire Extinguisher Photo Evidence': h.safetyPhotos?.fireExtinguisher || '',
    'Fire Extinguisher Photo File': h.safetyPhotos?.fireExtinguisherName || '',
    'Fire Extinguisher Photo Captured At': h.safetyPhotos?.fireExtinguisherAt || '',
    'O2 Reading': h.testData.oxygen.reading,
    'O2 Date': h.testData.oxygen.date,
    'O2 Time': h.testData.oxygen.time,
    'LEL Reading': h.testData.lel.reading,
    'LEL Date': h.testData.lel.date,
    'LEL Time': h.testData.lel.time,
    'CO Reading': h.testData.co.reading,
    'CO Date': h.testData.co.date,
    'CO Time': h.testData.co.time,
    'Temp Reading': h.testData.temp.reading,
    'Temp Date': h.testData.temp.date,
    'Temp Time': h.testData.temp.time,
    'Confined Space Tested By': h.confinedSpaceTestedBy,
    'Combustible Cleared?': h.combustibleCleared,
    'Sparks Contact?': h.sparksContact,
    'Sparks Controls': (h.sparksControls || []).join(', '),
    'Sparks Other': h.sparksOther,
    'Firewatch By': h.firewatchBy,
    'Fumes Produced?': h.fumesProduced,
    'Ventilation/Other': (h.ventilationOther || []).join(', '),
    'Ventilation List': h.ventilationOtherList,
    'Comms Equip?': h.commsEquip,
    'Comms Describe': h.commsDescribe,
    PPE: (h.ppe || []).join(', '),
    'PPE Other': h.ppeOther,
    Entrants: h.entrants,
    Attendants: h.attendants,
    'Entrant Understands?': h.entrantUnderstands,
    'Attendant Understands?': h.attendantUnderstands,
    'Emergency Other': h.emergencyOther,
    'Emergency Equipment': h.emergencyEquip,
    'Dynamic Risk Assessment Done': h.dynamicRiskAssessment ? 'Yes' : 'No',
    'Safe Commence - Mgr': sigOrEmpty(h.safeCommenceMgr),
    'Safe Commence - Mgr At': sigTimeOrEmpty(h.safeCommenceMgr),
    'Safe Commence - Mgr ID': sigWorkIdOrEmpty(h.safeCommenceMgr),
    'Safe Commence - Crew': sigOrEmpty(h.safeCommenceCrew),
    'Safe Commence - Crew At': sigTimeOrEmpty(h.safeCommenceCrew),
    'Sign Off - Mgr': sigOrEmpty(h.signOffMgr),
    'Sign Off - Mgr At': sigTimeOrEmpty(h.signOffMgr),
    'Sign Off - Mgr ID': sigWorkIdOrEmpty(h.signOffMgr),
    'Sign Off - Crew': sigOrEmpty(h.signOffCrew),
    'Sign Off - Crew At': sigTimeOrEmpty(h.signOffCrew),
    Status: h.signOffMgr && h.signOffCrew ? 'Closed' : (h.safeCommenceMgr && h.safeCommenceCrew ? 'Active' : 'Draft'),
  };
}

export function flattenHeight(h: HeightPermitData): Record<string, unknown> {
  return {
    Timestamp: new Date().toLocaleString(),
    Location: h.location,
    Department: h.department,
    'Equipment ID': h.equipmentId,
    'Form No.': h.formNo,
    'Work Order No.': h.workOrderNo,
    'Date of Work': h.dateOfWork,
    Description: h.description,
    Contractor: h.contractor,
    'Iso - Mechanical': h.isoMechanical,
    'Iso - Electrical': h.isoElectrical,
    'Iso - Depressurized': h.isoDepressurized,
    'Iso - Flushed': h.isoFlushed,
    'Iso - Earthed': h.isoEarthed,
    'Isolation Checked By': h.isolationCheckedBy,
    'Isolation Photo Evidence': h.safetyPhotos?.isolation || '',
    'Isolation Photo File': h.safetyPhotos?.isolationName || '',
    'Isolation Photo Captured At': h.safetyPhotos?.isolationAt || '',
    'Scaffolding?': h.scaffolding,
    'Safe Access?': h.safeAccess,
    'Ladder Tied?': h.ladderTied,
    'Other Access Means': h.otherAccessMeans,
    'Platforms Safe?': h.platformsSafe,
    'Railings/Toe Boards?': h.railingsToeBoards,
    'PPE Appropriate?': h.ppeAppropriate,
    'Drop Zone Cordoned?': h.dropZoneCordoned,
    'Drop Zone Cleared?': h.dropZoneCleared,
    'Drop Zone Signs?': h.dropZoneSigns,
    'Lighted?': h.lighted,
    'Comms Assured?': h.commsAssured,
    'Emergency Other': h.emergencyOther,
    'Emergency Equipment': h.emergencyEquip,
    'Special Instructions': h.specialInstructions,
    Crew: JSON.stringify(h.crew || []),
    'Explain No': h.explainNo,
    'Dynamic Risk Assessment Done': h.dynamicRiskAssessment ? 'Yes' : 'No',
    'Auth - Crew': sigOrEmpty(h.authCrew),
    'Auth - Crew At': sigTimeOrEmpty(h.authCrew),
    'Auth - Mgr': sigOrEmpty(h.authMgr),
    'Auth - Mgr At': sigTimeOrEmpty(h.authMgr),
    'Auth - Mgr ID': sigWorkIdOrEmpty(h.authMgr),
    'Closure - Crew': sigOrEmpty(h.closureCrew),
    'Closure - Crew At': sigTimeOrEmpty(h.closureCrew),
    'Closure - Mgr': sigOrEmpty(h.closureMgr),
    'Closure - Mgr At': sigTimeOrEmpty(h.closureMgr),
    'Closure - Mgr ID': sigWorkIdOrEmpty(h.closureMgr),
    Status: h.closureCrew && h.closureMgr ? 'Closed' : (h.authCrew && h.authMgr ? 'Active' : 'Draft'),
  };
}

export function isPermitOverdue(record: HistoryRecord): boolean {
  const updatedStr = record['Last Updated'] || record['Submitted At'];
  if (!updatedStr) return false;
  const d = new Date(String(updatedStr));
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() > 24 * 60 * 60 * 1000;
}

export function isPermitClosed(formType: PermitType, record: HistoryRecord): boolean {
  const status = String(record['Status'] || '').toLowerCase();
  if (status === 'closed' || status === 'cancelled') return true;
  if (formType === 'general') return !!record['Completion Signed By'];
  if (formType === 'hotwork') return !!(record['Sign Off - Mgr'] && record['Sign Off - Crew']);
  if (formType === 'height') return !!(record['Closure - Crew'] && record['Closure - Mgr']);
  return false;
}

export function isPermitRejected(record: HistoryRecord): boolean {
  return (
    String(record['HoD Approval'] || '').toLowerCase() === 'rejected' ||
    String(record['Approval Status'] || '').toLowerCase() === 'rejected' ||
    String(record['Permit Status'] || '').toLowerCase() === 'rejected'
  );
}

export function getWorkOrderNumber(formType: PermitType, record: HistoryRecord): string {
  return String(formType === 'height' ? record['Work Order No.'] || '' : record['Work Order Number'] || '').trim();
}

/** Resize and compress photo for mobile storage and cloud transmission */
export async function compressImageFile(file: File): Promise<{ dataUrl: string; name: string; timestamp: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1280;
        const maxH = 960;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const scale = Math.min(1, maxW / w, maxH / h);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve({
          dataUrl,
          name: file.name,
          timestamp: new Date().toLocaleString(),
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

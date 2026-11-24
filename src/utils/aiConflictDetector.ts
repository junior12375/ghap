import { ConflictAnalysisResult, DetectedConflictItem, HistoryRecord, PermitType } from '../types/permit';

export interface ConflictDetectionParams {
  workOrderNumber: string;
  jobType: string | string[];
  location?: string;
  department?: string;
  date?: string;
  equipmentId?: string;
  description?: string;
  currentPermitType?: PermitType;
  existingPermits?: HistoryRecord[];
}

export interface ConflictApiResponse {
  ok: boolean;
  analysis?: ConflictAnalysisResult;
  source?: string;
  error?: string;
}

/**
 * Client-side fallback analyzer in case backend or network is offline
 */
export function evaluateClientFallbackConflicts(params: ConflictDetectionParams): ConflictAnalysisResult {
  const wo = (params.workOrderNumber || '').trim().toUpperCase();
  const jtStr = Array.isArray(params.jobType) ? params.jobType.join(', ') : (params.jobType || '');
  const loc = (params.location || '').toLowerCase();
  const eq = (params.equipmentId || '').toLowerCase();
  const permits = params.existingPermits || [];

  const conflicts: DetectedConflictItem[] = [];

  // Check 1: Duplicate or existing active Work Order
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
        explanation: `Work Order #${wo} already has an active permit authorized on plant grounds. Overlapping permits under the same Work Order can cause conflicting task handovers or missed isolation steps.`,
        recommendedMitigation: `Verify with site supervisor whether this is a companion permit (e.g. Hot Work + Working at Height) or a duplicate submission. Ensure separate work groups sign individual logs.`,
      });
    }
  }

  // Check 2: SIMOPs collisions
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
          title: `SIMOPs Hazard: Hot Work in Confined Space / Silo Zone`,
          severity: 'CRITICAL',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'HOT_WORK_ATMOSPHERE',
          explanation: `Simultaneous hot work / spark-producing activity in or near a confined space or silo (${loc || pLoc}) can trigger toxic fume accumulation, rapid oxygen depletion, or dust cloud deflagration.`,
          recommendedMitigation: `Conduct mandatory 4-gas pre-entry atmospheric test (O2, LEL, CO, H2S). Station dedicated EHS standby sentry and mechanical air blowers.`,
        });
      } else if ((isHeightCurrent && !isHeightOther) || (!isHeightCurrent && isHeightOther)) {
        conflicts.push({
          id: `simops-height-drop-${idx}`,
          title: `Overhead SIMOPs Conflict: Working at Height Drop Zone`,
          severity: 'HIGH',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'SPATIAL_DROP_ZONE',
          explanation: `Work at height is scheduled simultaneously with ground or mezzanine personnel in ${loc || pLoc}. Risk of dropped tools, scaffolding parts, or hot slag striking personnel below.`,
          recommendedMitigation: `Establish a minimum 10-meter barricaded drop zone below with danger signage and overhead debris netting. Coordinate staggered shifts or work halts during overhead rigging.`,
        });
      } else if (sameEquipment) {
        conflicts.push({
          id: `simops-loto-${idx}`,
          title: `Isolation / LOTO Conflict on Asset ${eq.toUpperCase()}`,
          severity: 'HIGH',
          conflictingWorkOrder: pWo,
          conflictingJobType: pWorkType,
          conflictingLocation: pLoc,
          conflictCategory: 'ISOLATION_LOTO',
          explanation: `Multiple work parties are assigned to the same asset (${eq.toUpperCase()}) under separate work orders. Risk of premature re-energization or misaligned breaker tags.`,
          recommendedMitigation: `Apply Group Lockout / Master Lock Box procedure. Each supervisor and crew leader must affix their individual padlock to the lock box.`,
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

/**
 * Call server-side Gemini AI conflict detection API, with seamless client fallback
 */
export async function detectWorkConflicts(params: ConflictDetectionParams): Promise<ConflictApiResponse> {
  const wo = (params.workOrderNumber || '').trim();
  const jt = Array.isArray(params.jobType) ? params.jobType.join(', ') : (params.jobType || '').trim();

  if (!wo && !jt) {
    return {
      ok: false,
      error: 'Please enter a Work Order Number or Type of Job to detect conflicts.',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch('/api/detect-conflicts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workOrderNumber: params.workOrderNumber,
        jobType: params.jobType,
        location: params.location,
        department: params.department,
        date: params.date,
        equipmentId: params.equipmentId,
        description: params.description,
        currentPermitType: params.currentPermitType,
        existingPermits: (params.existingPermits || []).slice(0, 30),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Server responded with ${res.status}, using client fallback.`);
      const fallback = evaluateClientFallbackConflicts(params);
      return { ok: true, analysis: fallback, source: 'client-fallback' };
    }

    const json = await res.json();
    if (json && json.ok && json.analysis) {
      return {
        ok: true,
        analysis: json.analysis,
        source: json.source || 'gemini-3.8-flash',
      };
    } else {
      const fallback = evaluateClientFallbackConflicts(params);
      return { ok: true, analysis: fallback, source: 'client-fallback' };
    }
  } catch (err) {
    console.warn('Network call to /api/detect-conflicts failed, utilizing client fallback:', err);
    const fallback = evaluateClientFallbackConflicts(params);
    return { ok: true, analysis: fallback, source: 'offline-client-heuristics' };
  }
}

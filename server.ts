import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Server-side initialization of Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
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
  console.warn('GEMINI_API_KEY is not set in environment. Heuristic conflict analysis will be used as fallback.');
}

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

// Fallback rule-based conflict detector in case of offline/unavailable Gemini API
function evaluateLocalHeuristics(payload: ConflictRequestPayload): ConflictAnalysisResponse {
  const wo = (payload.workOrderNumber || '').trim().toUpperCase();
  const jtStr = Array.isArray(payload.jobType) ? payload.jobType.join(', ') : (payload.jobType || '');
  const loc = (payload.location || '').toLowerCase();
  const eq = (payload.equipmentId || '').toLowerCase();
  const permits = payload.existingPermits || [];

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
        explanation: `Work Order #${wo} already has active authorization logged in the system. Issuing overlapping permits under the same Work Order can lead to uncoordinated trade activities or premature sign-off.`,
        recommendedMitigation: `Verify whether this is a supplemental permit (e.g. Hot Work + Height companion) or a duplicate submission. Ensure clear boundary delineation between work teams.`,
      });
    }
  }

  // Check 2: Spatial & SIMOPs conflicts with other permits in same location or equipment
  permits.forEach((p, idx) => {
    const pLoc = String(p['Location'] || p['Department/Location'] || '').toLowerCase();
    const pEq = String(p['Equipment ID'] || p['equipmentId'] || '').toLowerCase();
    const pStatus = String(p['Status'] || p['Approval Status'] || p['Permit Status'] || '').toLowerCase();
    const isClosedOrRejected = pStatus.includes('closed') || pStatus.includes('rejected');

    if (isClosedOrRejected) return;

    const pWo = String(p['Work Order Number'] || p['Work Order No.'] || p['workOrderNumber'] || 'N/A');
    const pWorkType = String(p['Type of Work'] || p['Description'] || 'General Work');

    // Location / Equipment collision
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
    const payload: ConflictRequestPayload = req.body;
    const wo = (payload.workOrderNumber || '').trim();
    const jt = Array.isArray(payload.jobType) ? payload.jobType.join(', ') : (payload.jobType || '').trim();

    if (!wo && !jt) {
      return res.status(400).json({
        ok: false,
        error: 'Work Order Number and Type of Job are required for conflict detection.',
      });
    }

    // Always compute heuristic baseline
    const localBaseline = evaluateLocalHeuristics(payload);

    // If Gemini client is not initialized, return the rich local heuristics
    if (!ai) {
      return res.json({
        ok: true,
        source: 'local-heuristics',
        analysis: localBaseline,
      });
    }

    // Prepare prompt with GHACEM heavy industrial cement manufacturing context
    const existingPermitsContext = (payload.existingPermits || []).slice(0, 40).map((p) => ({
      workOrder: p['Work Order Number'] || p['Work Order No.'] || p['workOrderNumber'] || 'N/A',
      typeOfWork: p['Type of Work'] || p['Description'] || 'N/A',
      location: p['Location'] || p['Department/Location'] || 'N/A',
      status: p['Status'] || p['Approval Status'] || 'Active',
      equipment: p['Equipment ID'] || p['equipmentId'] || 'N/A',
      date: p['Date of Activity'] || p['Date of Issue'] || p['Date of Work'] || 'N/A',
    }));

    const prompt = `
You are the Chief Safety Engineer and SIMOPs (Simultaneous Operations) Safety Auditor for GHACEM (Ghana Cement Ltd) heavy manufacturing plant.
Your mission is to perform an exhaustive, safety-critical AI Work Conflict Detection on a new or edited Permit-to-Work (PTW) submission.

Target Permit Information:
- Work Order Number: "${wo || 'UNSPECIFIED'}"
- Type of Job / Activity: "${jt || 'UNSPECIFIED'}"
- Location: "${payload.location || 'Plant Grounds'}"
- Department: "${payload.department || 'Plant Operations'}"
- Equipment ID: "${payload.equipmentId || 'N/A'}"
- Date of Work: "${payload.date || 'Today'}"
- Detailed Work Scope / Description: "${payload.description || 'Standard maintenance task'}"
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
      model: 'gemini-3.8-flash',
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
    let parsed: Partial<ConflictAnalysisResponse> = {};
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.warn('Failed to parse Gemini response as JSON, falling back to heuristics:', parseErr);
      return res.json({
        ok: true,
        source: 'local-heuristics',
        analysis: localBaseline,
      });
    }

    // Merge any critical local detections that might have been detected
    const mergedConflicts = [...(parsed.detectedConflicts || [])] as DetectedConflictItem[];
    // If local heuristics found a critical duplicate WO that Gemini missed, add it
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
      simopsPrecautionChecklist: parsed.simopsPrecautionChecklist && parsed.simopsPrecautionChecklist.length > 0
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
      source: 'gemini-3.8-flash',
      analysis: finalResult,
    });
  } catch (error) {
    console.error('Error in /api/detect-conflicts:', error);
    // Graceful fallback to local heuristics so user is never stranded
    const payload: ConflictRequestPayload = req.body || {};
    const fallback = evaluateLocalHeuristics(payload);
    return res.json({
      ok: true,
      source: 'local-heuristics-fallback',
      analysis: fallback,
      fallbackReason: String(error),
    });
  }
});

// Vite Middleware integration for development / production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GHACEM Corporate PTW server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

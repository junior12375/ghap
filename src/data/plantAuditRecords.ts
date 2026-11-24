import { HistoryRecord, PermitType } from '../types/permit';
import { isPermitClosed, isPermitOverdue, isPermitRejected, getWorkOrderNumber } from '../utils/permitHelpers';
import { UnifiedPermitRecord } from '../components/ExecutiveGraphicalDashboard';

export const BASELINE_PLANT_RECORDS: Array<{ formType: PermitType; record: HistoryRecord; id: string; zone: string; facility: 'Tema' | 'Takoradi' }> = [
  {
    formType: 'hotwork',
    id: 'HW-2026-8841',
    zone: 'kiln',
    facility: 'Tema',
    record: {
      'Submission ID': 'HW-2026-8841',
      'Work Order Number': 'WO-2026-8841',
      'No.': 'HW-2026-8841',
      Location: 'Kiln 2 Cooler Plate & Burner Pipe Chamber',
      'Equipment ID': 'EQ-KILN-02-CLR',
      Department: 'Mechanicals',
      'Dept/Contractor': 'Barbex Technical Engineering',
      'Type of Work': 'Hot Work (Arc Welding & Oxy-Acetylene Cutting)',
      Purpose: 'Replacement of worn cooler grates, clinker crusher liner plates & burner pipe adjustment.',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Isolation Checked By': 'Osei Emmanuel (10108)',
      'O2 Reading': '20.9',
      'LEL Reading': '0',
      'CO Reading': '0',
      'Sign Off - Mgr': '',
      'Sign Off - Crew': '',
    },
  },
  {
    formType: 'hotwork',
    id: 'HW-2026-8812',
    zone: 'clinker',
    facility: 'Takoradi',
    record: {
      'Submission ID': 'HW-2026-8812',
      'Work Order Number': 'WO-2026-8812',
      'No.': 'HW-2026-8812',
      Location: 'Clinker Silo 3 Discharge Bottom Chute',
      'Equipment ID': 'EQ-CLINK-SILO-03',
      Department: 'Production',
      'Dept/Contractor': 'Ghacem Internal',
      'Type of Work': 'Confined Space Entry & Arc Gouging',
      Purpose: 'Entry into silo discharge hopper for clinker buildup de-lumping and wear plate welding.',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Isolation Checked By': 'Asomah Yakubu (11079)',
      'O2 Reading': '20.8',
      'LEL Reading': '0',
      'CO Reading': '2',
      'Sign Off - Mgr': '',
      'Sign Off - Crew': '',
    },
  },
  {
    formType: 'general',
    id: 'GEN-2026-7994',
    zone: 'cementmill',
    facility: 'Tema',
    record: {
      'Submission ID': 'GEN-2026-7994',
      'Work Order Number': 'WO-2026-7994',
      Department: 'Mechanicals',
      'Department/Location': 'Cement Mill 4 Trunnion Bearing & Lubrication Station',
      Description: 'Overhaul and flushing of trunnion lube oil circulation pumps, strainer cleaning and dial gauge runout check.',
      'Date of Issue': new Date(Date.now() - 28 * 3600 * 1000).toISOString().split('T')[0],
      Contractor: 'Ghacem Internal',
      Status: 'Closed',
      'Last Updated': new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      'Completion Signed By': 'Prince Kissi (10112)',
      'Completion Signed At': new Date(Date.now() - 20 * 3600 * 1000).toLocaleString(),
      'Dynamic Risk Assessment Done': 'Yes',
    },
  },
  {
    formType: 'height',
    id: 'WAH-2026-8730',
    zone: 'kiln',
    facility: 'Tema',
    record: {
      'Submission ID': 'WAH-2026-8730',
      'Work Order No.': 'WO-2026-8730',
      formNo: 'WAH-2026-8730',
      location: 'Preheater Cyclone Stage 4 External Ductwork',
      Location: 'Preheater Cyclone Stage 4 External Ductwork (Elevation 42m)',
      equipmentId: 'EQ-PH-CYC-04',
      department: 'Civil Works',
      Department: 'Civil Works',
      description: 'Erection of heavy-duty steel tube scaffolding and static lifeline anchor inspection for refractory cladding.',
      Description: 'Erection of heavy-duty steel tube scaffolding and static lifeline anchor inspection for refractory cladding.',
      contractor: 'Desimone Scaffolding Ltd',
      Contractor: 'Desimone Scaffolding Ltd',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Closure - Crew': '',
      'Closure - Mgr': '',
    },
  },
  {
    formType: 'general',
    id: 'GEN-2026-6512',
    zone: 'rawmill',
    facility: 'Tema',
    record: {
      'Submission ID': 'GEN-2026-6512',
      'Work Order Number': 'WO-2026-6512',
      Department: 'Mechanicals',
      'Department/Location': 'Limestone Primary Crusher & Apron Feeder',
      Description: 'Rotational replacement of heavy alloy breaker hammers and inspection of eccentric bearings.',
      Contractor: 'Ponti Engineering Gh',
      Status: 'Closed',
      'Last Updated': new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      'Completion Signed By': 'Nii Adje Bismark (11037)',
      'Completion Signed At': new Date(Date.now() - 44 * 3600 * 1000).toLocaleString(),
      'Dynamic Risk Assessment Done': 'Yes',
    },
  },
  {
    formType: 'hotwork',
    id: 'HW-2026-8921',
    zone: 'packing',
    facility: 'Takoradi',
    record: {
      'Submission ID': 'HW-2026-8921',
      'Work Order Number': 'WO-2026-8921',
      'No.': 'HW-2026-8921',
      Location: 'Bulk Cement Dispatch Gantry 2 Loading Spout',
      'Equipment ID': 'EQ-BULK-DISP-02',
      Department: 'Production',
      'Dept/Contractor': 'Westcoast Welding Ltd',
      'Type of Work': 'Hot Work (MIG Welding on Bulk Loading Arm)',
      Purpose: 'Patch welding of telescopic loading chute bellows and clamp bracket reinforcement.',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Isolation Checked By': 'Prince Kissi (10112)',
      'O2 Reading': '20.9',
      'LEL Reading': '0',
      'CO Reading': '0',
      'Sign Off - Mgr': '',
      'Sign Off - Crew': '',
    },
  },
  {
    formType: 'general',
    id: 'GEN-2026-7420',
    zone: 'substation',
    facility: 'Tema',
    record: {
      'Submission ID': 'GEN-2026-7420',
      'Work Order Number': 'WO-2026-7420',
      Department: 'Electricals',
      'Department/Location': 'Main 11kV Substation 1 Transformer Bay TR-1',
      Description: 'LOTO isolation, breaker contact resistance micro-ohmmeter testing, and transformer silica gel breather replacement.',
      Contractor: 'Siemens Energy / Ghacem Electrical',
      Status: 'Closed',
      'Last Updated': new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      'Completion Signed By': 'Osei Emmanuel (10108)',
      'Completion Signed At': new Date(Date.now() - 68 * 3600 * 1000).toLocaleString(),
      'Dynamic Risk Assessment Done': 'Yes',
    },
  },
  {
    formType: 'hotwork',
    id: 'HW-2026-8990',
    zone: 'rawmill',
    facility: 'Takoradi',
    record: {
      'Submission ID': 'HW-2026-8990',
      'Work Order Number': 'WO-2026-8990',
      'No.': 'HW-2026-8990',
      Location: 'Coal Mill Grinding Table Hydraulic System',
      'Equipment ID': 'EQ-COAL-MILL-01',
      Department: 'Mechanicals',
      'Dept/Contractor': 'Ghacem Internal',
      'Type of Work': 'Hot Work & Hydraulic Line Brazing',
      Purpose: 'Brazing and testing high-pressure tensioning cylinder hydraulic lines under inert nitrogen purge.',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Isolation Checked By': 'Asomah Yakubu (11079)',
      'O2 Reading': '20.9',
      'LEL Reading': '0',
      'CO Reading': '0',
      'Sign Off - Mgr': '',
      'Sign Off - Crew': '',
    },
  },
  {
    formType: 'height',
    id: 'WAH-2026-9102',
    zone: 'jetty',
    facility: 'Tema',
    record: {
      'Submission ID': 'WAH-2026-9102',
      'Work Order No.': 'WO-2026-9102',
      formNo: 'WAH-2026-9102',
      location: 'Harbour Marine Jetty Clinker Gantry Crane Boom (Elevation 28m)',
      Location: 'Harbour Marine Jetty Clinker Gantry Crane Boom (Elevation 28m)',
      equipmentId: 'EQ-JETTY-CRANE-01',
      department: 'Mechanicals',
      Department: 'Mechanicals',
      description: 'Suspended safety harness inspection of main wire rope sheaves and anti-collision limit switches over water.',
      Description: 'Suspended safety harness inspection of main wire rope sheaves and anti-collision limit switches over water.',
      contractor: 'Ghana Port Cranes / Ponti',
      Contractor: 'Ghana Port Cranes / Ponti',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Closure - Crew': '',
      'Closure - Mgr': '',
    },
  },
  {
    formType: 'general',
    id: 'GEN-2026-7140',
    zone: 'packing',
    facility: 'Takoradi',
    record: {
      'Submission ID': 'GEN-2026-7140',
      'Work Order Number': 'WO-2026-7140',
      Department: 'Auto',
      'Department/Location': 'Bag Packing Plant Rotary Carousel Packer 3',
      Description: 'Load-cell calibration and discharge bag paddle speed alignment for 50kg Supercem & Extracem packaging.',
      Contractor: 'Ghacem Internal',
      Status: 'Closed',
      'Last Updated': new Date(Date.now() - 54 * 3600 * 1000).toISOString(),
      'Completion Signed By': 'Prince Kissi (10112)',
      'Completion Signed At': new Date(Date.now() - 50 * 3600 * 1000).toLocaleString(),
      'Dynamic Risk Assessment Done': 'Yes',
    },
  },
  {
    formType: 'hotwork',
    id: 'HW-2026-8605',
    zone: 'rawmill',
    facility: 'Tema',
    record: {
      'Submission ID': 'HW-2026-8605',
      'Work Order Number': 'WO-2026-8605',
      'No.': 'HW-2026-8605',
      Location: 'Raw Mill Feed Hopper Discharge Transition',
      'Equipment ID': 'EQ-RM-HOPPER-01',
      Department: 'Mechanicals',
      'Dept/Contractor': 'Barbex Technical Engineering',
      'Type of Work': 'Hot Work (Arc Gouging)',
      Purpose: 'Removal of cracked wear liners on feed hopper.',
      Status: 'Rejected',
      'HoD Approval': 'Rejected',
      'Rejection Reason': 'Atmospheric test instrument out of calibration; inadequate fire sentry extinguisher certification.',
      'Last Updated': new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'No',
    },
  },
  {
    formType: 'height',
    id: 'WAH-2026-9233',
    zone: 'workshop',
    facility: 'Tema',
    record: {
      'Submission ID': 'WAH-2026-9233',
      'Work Order No.': 'WO-2026-9233',
      formNo: 'WAH-2026-9233',
      location: 'Central Engineering Workshop Roof Shed (Elevation 12m)',
      Location: 'Central Engineering Workshop Roof Shed (Elevation 12m)',
      equipmentId: 'EQ-WRKSHP-SHED',
      department: 'Civil Works',
      Department: 'Civil Works',
      description: 'Installation of translucent fiberglass roof daylight sheets and safety netting underneath.',
      Description: 'Installation of translucent fiberglass roof daylight sheets and safety netting underneath.',
      contractor: 'Desimone Roofing',
      Contractor: 'Desimone Roofing',
      Status: 'Active',
      'Last Updated': new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      'Dynamic Risk Assessment Done': 'Yes',
      'Closure - Crew': '',
      'Closure - Mgr': '',
    },
  },
];

export function getUnifiedPermits(
  liveHistory: Record<PermitType, HistoryRecord[]>,
  includeBaseline = true
): UnifiedPermitRecord[] {
  const result: UnifiedPermitRecord[] = [];
  const seenIds = new Set<string>();

  // 1. Process Live records from database / memory
  (['general', 'hotwork', 'height'] as PermitType[]).forEach((type) => {
    (liveHistory[type] || []).forEach((record, index) => {
      const id = String(record['Submission ID'] || `rec-${type}-${index}`);
      seenIds.add(id);

      const wo = getWorkOrderNumber(type, record);
      const loc = String(record['Location'] || record['Department/Location'] || 'Plant Works');
      const dept = String(record['Department'] || 'Operations');
      const contractor = String(record['Contractor'] || record['Dept/Contractor'] || 'Ghacem Internal');
      const ts = String(record['Last Updated'] || record['Submitted At'] || record['Timestamp'] || '');

      const isClosed = isPermitClosed(type, record);
      const isOverdue = isPermitOverdue(record);
      const isRejected = isPermitRejected(record);

      let status: UnifiedPermitRecord['status'] = 'Active';
      if (isClosed) status = 'Closed';
      else if (isOverdue) status = 'Overdue';
      else if (isRejected) status = 'Rejected';

      // Infer facility
      const facility: 'Tema' | 'Takoradi' =
        loc.toLowerCase().includes('takoradi') || dept.toLowerCase().includes('takoradi')
          ? 'Takoradi'
          : 'Tema';

      // Infer zone
      let zone = 'workshop';
      const locLower = loc.toLowerCase();
      if (locLower.includes('kiln') || locLower.includes('preheater')) zone = 'kiln';
      else if (locLower.includes('clinker') || locLower.includes('silo')) zone = 'clinker';
      else if (locLower.includes('raw mill') || locLower.includes('crusher') || locLower.includes('coal')) zone = 'rawmill';
      else if (locLower.includes('cement mill') || locLower.includes('ball mill')) zone = 'cementmill';
      else if (locLower.includes('packing') || locLower.includes('bulk')) zone = 'packing';
      else if (locLower.includes('jetty') || locLower.includes('harbour') || locLower.includes('port')) zone = 'jetty';
      else if (locLower.includes('substation') || locLower.includes('transformer')) zone = 'substation';

      result.push({
        formType: type,
        record,
        id,
        workOrder: wo,
        location: loc,
        department: dept,
        status,
        facility,
        contractor,
        timestamp: ts,
        hasLoto: !!record['Isolation Checked By'] || !!record['Isolation Photo Evidence'],
        hasGasTest: !!record['O2 Reading'],
        hasFallArrest: type === 'height',
        zone,
      });
    });
  });

  // 2. Append baseline plant records if requested and not duplicated
  if (includeBaseline) {
    BASELINE_PLANT_RECORDS.forEach(({ formType, record, id, zone, facility }) => {
      if (!seenIds.has(id)) {
        const wo = getWorkOrderNumber(formType, record);
        const loc = String(record['Location'] || record['Department/Location'] || '');
        const dept = String(record['Department'] || '');
        const contractor = String(record['Contractor'] || record['Dept/Contractor'] || '');
        const ts = String(record['Last Updated'] || '');

        const isClosed = isPermitClosed(formType, record);
        const isOverdue = isPermitOverdue(record);
        const isRejected = isPermitRejected(record);

        let status: UnifiedPermitRecord['status'] = 'Active';
        if (isClosed) status = 'Closed';
        else if (isOverdue) status = 'Overdue';
        else if (isRejected) status = 'Rejected';

        result.push({
          formType,
          record,
          id,
          workOrder: wo,
          location: loc,
          department: dept,
          status,
          facility,
          contractor,
          timestamp: ts,
          hasLoto: true,
          hasGasTest: formType === 'hotwork',
          hasFallArrest: formType === 'height',
          zone,
        });
      }
    });
  }

  return result;
}

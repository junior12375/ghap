import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Flame,
  ArrowUpRight,
  Cpu,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  ConflictAnalysisResult,
  HistoryRecord,
  PermitType,
  DetectedConflictItem,
} from '../types/permit';
import { detectWorkConflicts } from '../utils/aiConflictDetector';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';

interface WorkConflictDetectionViewProps {
  history: Record<PermitType, HistoryRecord[]>;
  onOpenViewer?: (formType: PermitType, record: HistoryRecord, submissionId: string) => void;
  onSelectWorkOrderForDraft?: (wo: string, jobType: string, loc?: string) => void;
}

export const WorkConflictDetectionView: React.FC<WorkConflictDetectionViewProps> = ({
  history,
  onOpenViewer,
  onSelectWorkOrderForDraft,
}) => {
  // Input fields for conflict inspection
  const [workOrderInput, setWorkOrderInput] = useState<string>('WO-2026-8841');
  const [jobTypeInput, setJobTypeInput] = useState<string>('Hot Work & Confined Space Entry');
  const [locationInput, setLocationInput] = useState<string>('Clinker Silo 2, Grinding Bay');
  const [equipmentInput, setEquipmentInput] = useState<string>('EQ-FAN-401');

  // Audit state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ConflictAnalysisResult | null>(null);
  const [engineSource, setEngineSource] = useState<string>('gemini-3.8-flash');
  const [plantScanFilter, setPlantScanFilter] = useState<'all' | 'conflicts-only'>('all');

  // Flatten all history permits
  const allPermits = useMemo(() => {
    const list: Array<{ formType: PermitType; record: HistoryRecord; id: string; status: string; wo: string; loc: string; type: string }> = [];
    (['general', 'hotwork', 'height'] as PermitType[]).forEach((ft) => {
      (history[ft] || []).forEach((r) => {
        const id = String(r['Submission ID'] || '');
        const status = String(r['Status'] || r['Approval Status'] || r['Permit Status'] || 'Draft');
        const wo = String(r['Work Order Number'] || r['Work Order No.'] || '');
        const loc = String(r['Location'] || r['Department/Location'] || '');
        const type = String(r['Type of Work'] || r['Description'] || (ft === 'hotwork' ? 'Hot Work' : ft === 'height' ? 'Working at Height' : 'General Maintenance'));
        list.push({ formType: ft, record: r, id, status, wo, loc, type });
      });
    });
    return list;
  }, [history]);

  // Extract unique active work orders
  const activeWorkOrders = useMemo(() => {
    const set = new Set<string>();
    allPermits.forEach((p) => {
      if (p.wo && !p.status.toLowerCase().includes('closed') && !p.status.toLowerCase().includes('rejected')) {
        set.add(p.wo);
      }
    });
    return Array.from(set);
  }, [allPermits]);

  // Run Conflict Audit
  const handleRunAudit = async () => {
    if (!workOrderInput && !jobTypeInput) return;
    setIsLoading(true);

    try {
      const flatRecords = [...history.general, ...history.hotwork, ...history.height];
      const res = await detectWorkConflicts({
        workOrderNumber: workOrderInput,
        jobType: jobTypeInput,
        location: locationInput,
        equipmentId: equipmentInput,
        existingPermits: flatRecords,
      });

      if (res && res.analysis) {
        setAnalysisResult(res.analysis);
        setEngineSource(res.source || 'gemini-3.8-flash');
      }
    } catch (e) {
      console.error('Audit failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-configured test scenarios
  const applyScenario = (wo: string, jt: string, loc: string, eq: string) => {
    setWorkOrderInput(wo);
    setJobTypeInput(jt);
    setLocationInput(loc);
    setEquipmentInput(eq);
    // Auto-run audit
    setIsLoading(true);
    const flatRecords = [...history.general, ...history.hotwork, ...history.height];
    detectWorkConflicts({
      workOrderNumber: wo,
      jobType: jt,
      location: loc,
      equipmentId: eq,
      existingPermits: flatRecords,
    })
      .then((res) => {
        if (res && res.analysis) {
          setAnalysisResult(res.analysis);
          setEngineSource(res.source || 'gemini-3.8-flash');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Compute detected cross-permit conflicts in existing active permits
  const detectedPlantConflicts = useMemo(() => {
    const list: Array<{
      p1: (typeof allPermits)[0];
      p2: (typeof allPermits)[0];
      type: string;
      reason: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    }> = [];

    for (let i = 0; i < allPermits.length; i++) {
      for (let j = i + 1; j < allPermits.length; j++) {
        const a = allPermits[i];
        const b = allPermits[j];

        // Skip closed/rejected
        if (
          a.status.toLowerCase().includes('closed') ||
          a.status.toLowerCase().includes('rejected') ||
          b.status.toLowerCase().includes('closed') ||
          b.status.toLowerCase().includes('rejected')
        ) {
          continue;
        }

        // Same WO
        if (a.wo && b.wo && a.wo.toUpperCase() === b.wo.toUpperCase()) {
          list.push({
            p1: a,
            p2: b,
            type: 'Duplicate Work Order Active',
            reason: `Multiple live permits registered under Work Order #${a.wo}. Risk of uncoordinated crew actions.`,
            severity: 'HIGH',
          });
        }
        // Location collision
        else if (
          a.loc &&
          b.loc &&
          (a.loc.toLowerCase().includes(b.loc.toLowerCase()) || b.loc.toLowerCase().includes(a.loc.toLowerCase()))
        ) {
          const aHot = /hot|weld|burn|torch/i.test(a.type);
          const bHot = /hot|weld|burn|torch/i.test(b.type);
          const aHeight = /height|scaffold|roof/i.test(a.type);
          const bHeight = /height|scaffold|roof/i.test(b.type);
          const aConf = /confined|silo/i.test(a.type);
          const bConf = /confined|silo/i.test(b.type);

          if ((aHot && bConf) || (bHot && aConf)) {
            list.push({
              p1: a,
              p2: b,
              type: 'Hot Work vs Confined Space (Toxic/Fire Hazard)',
              reason: `Hot work occurring adjacent to confined space entry in ${a.loc}. Fumes and spark hazard.`,
              severity: 'CRITICAL',
            });
          } else if ((aHeight && !bHeight) || (!aHeight && bHeight)) {
            list.push({
              p1: a,
              p2: b,
              type: 'Working at Height Drop Zone Collision',
              reason: `Overhead work simultaneous with ground team at ${a.loc}. Risk of dropped objects.`,
              severity: 'HIGH',
            });
          } else {
            list.push({
              p1: a,
              p2: b,
              type: 'Shared Location Congestion',
              reason: `Both permits active in ${a.loc}. Potential egress restriction.`,
              severity: 'MEDIUM',
            });
          }
        }
      }
    }

    return list;
  }, [allPermits]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3.5">
            <GhacemLogo className="h-11 w-11 shrink-0" />
            <div className="h-9 w-px bg-[var(--color-border)] hidden sm:block" />
            <HeidelbergMaterialsLogo className="h-7 hidden sm:flex" textColor="var(--color-text-main)" />
            <div className="border-l border-[var(--color-border)] pl-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-main)]">
                  AI Work Conflict & SIMOPs Command Center
                </h2>
                <span className="font-mono text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)] font-semibold">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Evaluates Work Order Numbers and Job Types against plant-wide active permits, spatial boundaries, and simultaneous high-risk activities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-text-muted)]">Active Plant Work Orders:</span>
            <span className="font-mono font-bold text-[var(--color-accent)] bg-[var(--color-surface-elevated)] px-2.5 py-1 rounded border border-[var(--color-border)]">
              {activeWorkOrders.length} Tracked
            </span>
          </div>
        </div>

        {/* Test Scenarios Quick-Pills */}
        <div className="pt-4">
          <div className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Instant Test Scenarios:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              onClick={() =>
                applyScenario(
                  'WO-2026-8841',
                  'Hot Work & Welding in Silo Entry',
                  'Clinker Silo 2, Grinding Bay',
                  'EQ-FAN-401'
                )
              }
              className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-left transition-colors"
            >
              <div className="font-semibold text-xs text-red-400 flex items-center justify-between">
                <span>SIMOPs Critical Collision</span>
                <Flame className="h-3.5 w-3.5" />
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate">
                WO-2026-8841: Silo Entry + Hot Work
              </div>
            </button>

            <button
              onClick={() =>
                applyScenario(
                  'WO-2026-9021',
                  'Working at Height / Scaffolding',
                  'Bagging Plant Roof, Pre-heater',
                  'ELEV-04'
                )
              }
              className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-colors"
            >
              <div className="font-semibold text-xs text-amber-400 flex items-center justify-between">
                <span>Drop Zone Hazard</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate">
                WO-2026-9021: Height Scaffolding
              </div>
            </button>

            <button
              onClick={() =>
                applyScenario(
                  'WO-2026-3301',
                  'Mechanical Overhaul & Motor Repair',
                  'Mill Area 3, Pre-heater Tower',
                  'EQ-FAN-401'
                )
              }
              className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-left transition-colors"
            >
              <div className="font-semibold text-xs text-purple-400 flex items-center justify-between">
                <span>Duplicate WO & LOTO</span>
                <Cpu className="h-3.5 w-3.5" />
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate">
                WO-2026-3301: Motor Overhaul
              </div>
            </button>

            <button
              onClick={() =>
                applyScenario(
                  'WO-2026-5510',
                  'Routine Instrument Inspection & Calibration',
                  'Main Electrical Substation B',
                  'SUB-SEC-02'
                )
              }
              className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-colors"
            >
              <div className="font-semibold text-xs text-emerald-400 flex items-center justify-between">
                <span>Clear / Safe Task</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate">
                WO-2026-5510: Substation Routine
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Form Inputs vs AI Analysis Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conflict Inspector Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-[var(--color-text-main)] flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--color-accent)]" />
              Inspect Work Order & Job Parameters
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
                Work Order Number <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. WO-2026-8841"
                value={workOrderInput}
                onChange={(e) => setWorkOrderInput(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-mono text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              {activeWorkOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[var(--color-text-muted)]">Active WOs:</span>
                  {activeWorkOrders.slice(0, 4).map((wo) => (
                    <button
                      key={wo}
                      type="button"
                      onClick={() => setWorkOrderInput(wo)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] text-[var(--color-text-main)]"
                    >
                      {wo}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
                Type of Job / Activity <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Hot Work, Welding, Confined Space Entry, Scaffolding"
                value={jobTypeInput}
                onChange={(e) => setJobTypeInput(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Hot Work & Welding',
                  'Confined Space Entry',
                  'Working at Height',
                  'Silo Cleanout',
                  'Mechanical Overhaul',
                  'Electrical Isolation',
                ].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setJobTypeInput(type)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
                  Plant Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Clinker Silo 2, Grinding Bay"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
                  Equipment ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. EQ-FAN-401"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-mono text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunAudit}
              disabled={isLoading || (!workOrderInput && !jobTypeInput)}
              className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Auditing SIMOPs with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Execute AI Work Conflict Audit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis Result Display */}
        <div className="lg:col-span-7 space-y-4">
          {isLoading ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[var(--color-accent)]" />
              <div className="text-sm font-semibold text-[var(--color-text-main)]">
                Cross-referencing Plant Operations...
              </div>
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                Comparing Work Order #{workOrderInput || 'N/A'} against active permits for spatial collisions, drop zones, atmospheric risks, and duplicate authorizations.
              </p>
            </div>
          ) : analysisResult ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
              {/* Header Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
                      AUDIT RESULT: {analysisResult.workOrderNumber || 'WO-TARGET'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                      Engine: {engineSource}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-base text-[var(--color-text-main)] mt-0.5">
                    {analysisResult.jobType}
                  </h4>
                </div>

                <span
                  className={`font-mono text-xs font-bold px-3 py-1 rounded-md border uppercase ${
                    analysisResult.conflictLevel === 'CRITICAL'
                      ? 'bg-red-500/15 text-red-400 border-red-500/40'
                      : analysisResult.conflictLevel === 'HIGH'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                      : analysisResult.conflictLevel === 'MEDIUM'
                      ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  RISK: {analysisResult.conflictLevel}
                </span>
              </div>

              {/* Executive Summary */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                  analysisResult.conflictLevel === 'CRITICAL'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : analysisResult.conflictLevel === 'HIGH'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : analysisResult.conflictLevel === 'MEDIUM'
                    ? 'border-amber-400/30 bg-amber-400/5 text-amber-200'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {analysisResult.conflictLevel === 'CRITICAL' ? (
                  <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                ) : analysisResult.conflictLevel === 'HIGH' || analysisResult.conflictLevel === 'MEDIUM' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-[var(--color-text-main)]">
                    {analysisResult.conflictSummary}
                  </div>
                  <div className="text-[11px] opacity-85">
                    Supervisor Directive: {analysisResult.approvalNotice}
                  </div>
                </div>
              </div>

              {/* Conflicts List */}
              <div className="space-y-3">
                <div className="font-display font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Detected Conflicts ({analysisResult.detectedConflicts.length})
                </div>

                {analysisResult.detectedConflicts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
                    No simultaneous operations or work order conflicts identified.
                  </div>
                ) : (
                  analysisResult.detectedConflicts.map((c: DetectedConflictItem, idx: number) => (
                    <div
                      key={c.id || idx}
                      className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[var(--color-text-main)]">
                          {c.title}
                        </div>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                          {c.conflictCategory.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[var(--color-text-muted)] leading-relaxed">
                        {c.explanation}
                      </p>
                      <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[11px] space-y-0.5">
                        <span className="font-semibold text-[var(--color-accent)] block">
                          Required Safety Mitigation:
                        </span>
                        <span className="text-[var(--color-text-main)]">
                          {c.recommendedMitigation}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              {onSelectWorkOrderForDraft && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectWorkOrderForDraft(
                        analysisResult.workOrderNumber,
                        analysisResult.jobType,
                        locationInput
                      )
                    }
                    className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-1.5"
                  >
                    <span>Create Permit with Mitigations</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center text-xs text-[var(--color-text-muted)] space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-[var(--color-text-faint)]" />
              <p className="font-semibold text-sm text-[var(--color-text-main)]">
                Ready to Audit Work Order & SIMOPs
              </p>
              <p className="max-w-xs mx-auto">
                Select one of the sample test scenarios above or enter a custom Work Order Number and Type of Job to run the AI engine.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Plant-Wide Active Permits SIMOPs Scan Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--color-text-main)] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[var(--color-accent)]" />
              Plant-Wide Simultaneous Operations (SIMOPs) Register
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Auditing {allPermits.length} total permits across General, Hot Work, and Height registers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlantScanFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                plantScanFilter === 'all'
                  ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent-border)] font-semibold'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]'
              }`}
            >
              All Active Permits ({allPermits.length})
            </button>
            <button
              onClick={() => setPlantScanFilter('conflicts-only')}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                plantScanFilter === 'conflicts-only'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]'
              }`}
            >
              <span>Potential Collisions</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                {detectedPlantConflicts.length}
              </span>
            </button>
          </div>
        </div>

        {plantScanFilter === 'conflicts-only' ? (
          <div className="space-y-3">
            {detectedPlantConflicts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                No simultaneous work conflicts found among currently active plant permits.
              </div>
            ) : (
              detectedPlantConflicts.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-xs text-[var(--color-text-main)]">
                        {c.type}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          c.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </div>
                    <p className="text-[var(--color-text-muted)] text-[11px]">
                      {c.reason}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-[var(--color-text-muted)]">
                      <span>Permit A: {c.p1.wo || c.p1.id} ({c.p1.type})</span>
                      <span>•</span>
                      <span>Permit B: {c.p2.wo || c.p2.id} ({c.p2.type})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenViewer && (
                      <button
                        onClick={() => onOpenViewer(c.p1.formType, c.p1.record, c.p1.id)}
                        className="px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-medium text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]"
                      >
                        View Permit A
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] font-mono text-[11px]">
                  <th className="py-2.5 px-3">Work Order</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Job / Scope</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {allPermits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                      No permit records loaded in local or cloud store.
                    </td>
                  </tr>
                ) : (
                  allPermits.slice(0, 15).map((p, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-hover)]/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[var(--color-accent)]">
                        {p.wo || '—'}
                      </td>
                      <td className="py-2 px-3 capitalize font-medium text-[var(--color-text-muted)]">
                        {p.formType}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-text-main)] truncate max-w-xs">
                        {p.type}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-text-muted)] truncate max-w-[140px]">
                        {p.loc || 'Plant Site'}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setWorkOrderInput(p.wo || 'WO-TARGET');
                            setJobTypeInput(p.type);
                            setLocationInput(p.loc);
                            handleRunAudit();
                          }}
                          className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-accent)] text-[11px] font-medium text-[var(--color-accent)]"
                        >
                          Audit WO
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

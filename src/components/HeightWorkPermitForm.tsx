import React from 'react';
import { HeightPermitData, ConflictAnalysisResult } from '../types/permit';
import { DEPARTMENTS } from '../data/defaults';
import { PhotoEvidenceUploader } from './PhotoEvidenceUploader';
import { SignatureBlock } from './SignatureBlock';
import { WorkConflictInlineBanner } from './WorkConflictInlineBanner';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';
import { ArrowUpRight, Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface HeightWorkPermitFormProps {
  data: HeightPermitData;
  onChange: (updated: Partial<HeightPermitData>) => void;
  conflictAnalysis?: ConflictAnalysisResult | null;
  isConflictLoading?: boolean;
  onRunConflictCheck?: () => void;
  onOpenConflictModal?: () => void;
}

export const HeightWorkPermitForm: React.FC<HeightWorkPermitFormProps> = ({
  data,
  onChange,
  conflictAnalysis,
  isConflictLoading,
  onRunConflictCheck,
  onOpenConflictModal,
}) => {
  const handleAddCrew = () => {
    onChange({ crew: [...data.crew, { name: '', trained: null }] });
  };

  const handleRemoveCrew = (index: number) => {
    if (data.crew.length <= 1) return;
    onChange({ crew: data.crew.filter((_, i) => i !== index) });
  };

  const handleCrewChange = (index: number, field: string, value: unknown) => {
    const updated = [...data.crew];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ crew: updated });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Critical Fall Protection Blue Safety Protocol Advisory Strip */}
      <div className="rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-600/15 via-blue-600/5 to-transparent p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
          </span>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-display font-bold text-xs sm:text-sm text-blue-700 dark:text-blue-300">
              CRITICAL FALL PROTECTION BLUE PROTOCOL: WORKING AT HEIGHT (&gt;2M) · 100% TIE-OFF &amp; DROP ZONE EXCLUSION
            </span>
          </div>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded bg-blue-600 text-white tracking-wider shadow-sm shadow-blue-600/30">
          BLUE PROTOCOL
        </span>
      </div>

      {/* Header Info (Blue Themed) */}
      <div className="rounded-xl border-2 border-blue-500/40 bg-gradient-to-b from-blue-600/[0.04] via-blue-600/[0.01] to-[var(--color-surface)] p-3.5 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <GhacemLogo className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
            <div className="h-8 w-px bg-blue-500/20 hidden sm:block" />
            <HeidelbergMaterialsLogo className="h-6 sm:h-7 hidden sm:flex" textColor="var(--color-text-main)" />
            <div className="border-l border-blue-500/20 pl-3 hidden lg:block">
              <span className="font-mono text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded tracking-wider inline-block mb-0.5 shadow-sm shadow-blue-600/20">
                FORM GHA.OCPF 04C
              </span>
              <h2 className="font-display font-bold text-base text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
                <ArrowUpRight className="h-4 w-4 text-blue-600 animate-pulse" />
                Working at Height Safety Authorization
              </h2>
            </div>
            <div className="lg:hidden">
              <span className="font-mono text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded tracking-wider inline-block mb-0.5">
                FORM GHA.OCPF 04C
              </span>
              <h2 className="font-display font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                Working at Height
              </h2>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-600/10 px-2.5 py-1 rounded border border-blue-500/30">
            Height Safety Standard
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Work Order Number <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. WO-2026-7732"
              value={data.workOrderNo}
              onChange={(e) => onChange({ workOrderNo: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Form Number</label>
            <input
              type="text"
              value={data.formNo}
              onChange={(e) => onChange({ formNo: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Date of Work</label>
            <input
              type="date"
              value={data.dateOfWork}
              onChange={(e) => onChange({ dateOfWork: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Location <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bagging Plant Roof, Elevator Head"
              value={data.location}
              onChange={(e) => onChange({ location: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Department</label>
            <select
              value={data.department}
              onChange={(e) => onChange({ department: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Equipment ID</label>
            <input
              type="text"
              placeholder="e.g. ELEV-04"
              value={data.equipmentId}
              onChange={(e) => onChange({ equipmentId: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Description of Activity at Height <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Describe work scope, elevation height, scaffolding status, anchor points..."
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          {/* AI Work Conflict & SIMOPs Banner */}
          <div className="md:col-span-3 pt-2">
            <WorkConflictInlineBanner
              workOrderNumber={data.workOrderNo}
              jobType={data.description || 'Working at Height'}
              analysis={conflictAnalysis || null}
              isLoading={!!isConflictLoading}
              onAnalyze={onRunConflictCheck || (() => {})}
              onOpenDetails={onOpenConflictModal || (() => {})}
            />
          </div>
        </div>
      </div>

      {/* Checklist: Energy Isolation (Blue Protocol) */}
      <div className="rounded-xl border border-blue-500/30 bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400">
            Checklist — Energy Isolation &amp; Zero Energy State (Blue Height Standard)
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Confirm all mechanical, electrical, pressure, and earth connections are isolated prior to ascent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { key: 'isoMechanical', label: 'Mechanical isolation secured' },
            { key: 'isoElectrical', label: 'Electrical supply isolated and locked out' },
            { key: 'isoDepressurized', label: 'Depressurized and drained completely' },
            { key: 'isoFlushed', label: 'Flushed, purged and vented' },
            { key: 'isoEarthed', label: 'Properly earthed / static discharge bonded' },
          ].map((item) => {
            const val = data[item.key as keyof HeightPermitData];
            return (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-blue-500/20 bg-[var(--color-surface-elevated)]"
              >
                <span className="text-[11px] font-medium">{item.label}</span>
                <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                  {(['Yes', 'No', 'N/A'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onChange({ [item.key]: opt })}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono ${
                        val === opt
                          ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-700/20'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
            Isolation Checked &amp; Verified By (Name)
          </label>
          <input
            type="text"
            placeholder="e.g. Mechanical Supervisor / Plant Electrical Officer"
            value={data.isolationCheckedBy}
            onChange={(e) => onChange({ isolationCheckedBy: e.target.value })}
            className="w-full rounded-lg border border-blue-500/20 bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Scaffolding, Platforms, & Drop Zone Verification (Blue Protocol) */}
      <div className="rounded-xl border border-blue-500/30 bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400">
            Access Means, Platforms, &amp; Drop Zone Barricading (Blue Fall Protection)
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Physical inspection of scaffolding tag, working platforms, guardrails, toe boards, and drop zone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { key: 'scaffolding', label: 'Adequate scaffolding inspected & tagged green?' },
            { key: 'safeAccess', label: 'Safe access ladder and egress provided?' },
            { key: 'ladderTied', label: 'Ladders tied off and secured at top/bottom?' },
            { key: 'platformsSafe', label: 'Working platforms planked and secure?' },
            { key: 'railingsToeBoards', label: 'Standard handrails (top/mid) and toe boards in place?' },
            { key: 'ppeAppropriate', label: 'Full body harness, lanyard & fall arrest inspected?' },
            { key: 'dropZoneCordoned', label: 'Drop zone below cordoned off with barrier tape?' },
            { key: 'dropZoneCleared', label: 'Drop zone clear of personnel and equipment?' },
            { key: 'dropZoneSigns', label: 'Warning danger signs posted around drop zone?' },
            { key: 'lighted', label: 'Work area sufficiently illuminated (>=150 lux)?' },
            { key: 'commsAssured', label: 'Clear communication assured between top & ground?' },
          ].map((item) => {
            const val = data[item.key as keyof HeightPermitData];
            return (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border border-blue-500/20 bg-[var(--color-surface-elevated)]"
              >
                <span className="text-[11px] font-medium">{item.label}</span>
                <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
                  {(['Yes', 'No', 'N/A'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onChange({ [item.key]: opt })}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono ${
                        val === opt
                          ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-700/20'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Work Crew Members & Training Verification (Blue Protocol) */}
      <div className="rounded-xl border border-blue-500/30 bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400">
              Height Crew Members &amp; Certified Training
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Verify each crew member has valid Working at Height certified training.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddCrew}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm shadow-blue-700/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Crew
          </button>
        </div>

        <div className="space-y-2">
          {data.crew.map((member, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
            >
              <input
                type="text"
                placeholder="Crew member full name"
                value={member.name}
                onChange={(e) => handleCrewChange(idx, 'name', e.target.value)}
                className="flex-1 rounded border border-[var(--color-border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
              />

              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] text-[var(--color-text-muted)] mr-1">Trained:</span>
                {(['Yes', 'No'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleCrewChange(idx, 'trained', opt)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono ${
                      member.trained === opt
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-700/20'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleRemoveCrew(idx)}
                disabled={data.crew.length <= 1}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {data.crew.some((c) => c.trained === 'No') && (
          <div className="pt-2">
            <label className="block text-[11px] font-medium text-[var(--color-warning)] mb-1">
              Explanation for Untrained Crew Member (Mitigation / Supervision plan)
            </label>
            <textarea
              rows={2}
              placeholder="Explain ground-only restrictions or 1-on-1 direct supervision arrangement..."
              value={data.explainNo}
              onChange={(e) => onChange({ explainNo: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-warning)] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Safety Photo Evidence (Blue Protocol) */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400">
          Safety Evidence Photo (Fall Protection Verification)
        </h3>
        <PhotoEvidenceUploader
          label="Height Fall Protection / Scaffold Green Tag"
          description="Photograph of scaffold tag, anchor point, or safety netting."
          required={false}
          photoUrl={data.safetyPhotos.isolation}
          photoName={data.safetyPhotos.isolationName}
          photoTimestamp={data.safetyPhotos.isolationAt}
          onPhotoUploaded={(url, name, timestamp) => {
            onChange({
              safetyPhotos: {
                ...data.safetyPhotos,
                isolation: url,
                isolationName: name,
                isolationAt: timestamp,
              },
            });
          }}
          onPhotoRemoved={() => {
            onChange({
              safetyPhotos: {
                ...data.safetyPhotos,
                isolation: '',
                isolationName: '',
                isolationAt: '',
              },
            });
          }}
        />
      </div>

      {/* Dynamic Risk Assessment Confirmation (Blue Protocol) */}
      <div className="rounded-xl border-2 border-blue-500/50 bg-blue-600/[0.04] p-5 shadow-sm">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.dynamicRiskAssessment}
            onChange={(e) => onChange({ dynamicRiskAssessment: e.target.checked })}
            className="mt-1 h-4 w-4 rounded accent-blue-600 cursor-pointer"
          />
          <div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-blue-600 animate-pulse" />
              Dynamic Risk Assessment Confirmation (Mandatory Blue Height Clearance) <span className="text-[var(--color-danger)]">*</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
              I certify that wind speed (&lt;32 km/h), weather conditions, overhead power lines, full-body harnesses, and anchor structural integrity have been physically evaluated on site prior to commencement.
            </p>
          </div>
        </label>
      </div>

      {/* Authorizations (Blue Protocol) */}
      <div className="rounded-xl border border-blue-500/30 bg-[var(--color-surface)] p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400">
            Working at Height Safety Form Authorisation (Blue Protocol Authorization)
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Both the Site Supervisor (verified by Work ID) and Crew Leader must authorize before ascending.
          </p>
        </div>

        <SignatureBlock
          label="Site Supervisor / Dept Manager Authorization"
          roleDescription="Verified employee Work ID (e.g. 11037, 11079, 10108, 10112)"
          signature={data.authMgr}
          isWorkIdRequired={true}
          onSign={(sig) => onChange({ authMgr: sig })}
          onClear={() => onChange({ authMgr: null })}
        />

        <SignatureBlock
          label="Crew Leader Acceptance Signature"
          roleDescription="Crew Leader accepting responsibility on site"
          signature={data.authCrew}
          isWorkIdRequired={false}
          onSign={(sig) => onChange({ authCrew: sig })}
          onClear={() => onChange({ authCrew: null })}
        />
      </div>

      {/* Closure Authorizations (Blue Protocol) */}
      <div className="rounded-xl border border-blue-500/30 bg-[var(--color-surface)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <h3 className="font-display font-bold text-sm text-blue-600 dark:text-blue-400">
            Permit Closure &amp; Drop Zone Release (Blue Protocol Handback)
          </h3>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          All personnel have safely descended, harnesses accounted for, tools removed, and drop zone reopened.
        </p>

        <SignatureBlock
          label="Supervisor Closure Sign-off"
          roleDescription="Signed by verified employee Work ID"
          signature={data.closureMgr}
          isWorkIdRequired={true}
          onSign={(sig) => onChange({ closureMgr: sig })}
          onClear={() => onChange({ closureMgr: null })}
        />

        <SignatureBlock
          label="Crew Leader Closure Sign-off"
          roleDescription="Crew Leader confirming work complete"
          signature={data.closureCrew}
          isWorkIdRequired={false}
          onSign={(sig) => onChange({ closureCrew: sig })}
          onClear={() => onChange({ closureCrew: null })}
        />
      </div>
    </div>
  );
};

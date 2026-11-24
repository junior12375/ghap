import React from 'react';
import { GeneralPermitData, ConflictAnalysisResult } from '../types/permit';
import { DEPARTMENTS } from '../data/defaults';
import { PhotoEvidenceUploader } from './PhotoEvidenceUploader';
import { SignatureBlock } from './SignatureBlock';
import { WorkConflictInlineBanner } from './WorkConflictInlineBanner';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';
import { Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface GeneralWorkPermitFormProps {
  data: GeneralPermitData;
  onChange: (updated: Partial<GeneralPermitData>) => void;
  conflictAnalysis?: ConflictAnalysisResult | null;
  isConflictLoading?: boolean;
  onRunConflictCheck?: () => void;
  onOpenConflictModal?: () => void;
}

export const GeneralWorkPermitForm: React.FC<GeneralWorkPermitFormProps> = ({
  data,
  onChange,
  conflictAnalysis,
  isConflictLoading,
  onRunConflictCheck,
  onOpenConflictModal,
}) => {
  const toggleArrayItem = (list: string[], item: string): string[] => {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  };

  const handleAddCrewLogRow = () => {
    const updated = [
      ...data.crewLog,
      {
        date: new Date().toISOString().split('T')[0],
        persons: '1',
        sigLeader: false,
        sigMgr: false,
        timeStart: '08:00',
        timeStop: '16:30',
      },
    ];
    onChange({ crewLog: updated });
  };

  const handleRemoveCrewLogRow = (index: number) => {
    if (data.crewLog.length <= 1) return;
    const updated = data.crewLog.filter((_, i) => i !== index);
    onChange({ crewLog: updated });
  };

  const handleCrewLogChange = (index: number, field: string, value: unknown) => {
    const updated = [...data.crewLog];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ crewLog: updated });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <GhacemLogo className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
            <div className="h-8 w-px bg-[var(--color-border)] hidden sm:block" />
            <HeidelbergMaterialsLogo className="h-6 sm:h-7 hidden sm:flex" textColor="var(--color-text-main)" />
            <div className="border-l border-[var(--color-border)] pl-3 hidden lg:block">
              <span className="font-mono text-xs font-semibold text-[var(--color-accent)] tracking-wider block">
                FORM GHA.OCPF 04A
              </span>
              <h2 className="font-display font-bold text-base text-[var(--color-text-main)]">
                General Work Permit / Authorization
              </h2>
            </div>
            <div className="lg:hidden">
              <span className="font-mono text-[10px] font-semibold text-[var(--color-accent)] tracking-wider block">
                FORM GHA.OCPF 04A
              </span>
              <h2 className="font-display font-bold text-sm sm:text-base text-[var(--color-text-main)]">
                General Work Permit
              </h2>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2.5 py-1 rounded border border-[var(--color-border)]">
            Valid: 24h Daily Renewal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Work Order Number <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. WO-2026-8841"
              value={data.workOrderNumber}
              onChange={(e) => onChange({ workOrderNumber: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Department <span className="text-[var(--color-danger)]">*</span>
            </label>
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
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Location of Work (Activity) <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mill Area 3, Pre-heater Tower"
              value={data.deptLocation}
              onChange={(e) => onChange({ deptLocation: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Contractor / Department Executing
            </label>
            <input
              type="text"
              placeholder="e.g. Mechanical Maintenance / In-house"
              value={data.contractor}
              onChange={(e) => onChange({ contractor: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Date of Issue</label>
              <input
                type="date"
                value={data.dateIssue}
                onChange={(e) => onChange({ dateIssue: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Time of Issue</label>
              <input
                type="time"
                value={data.timeIssue}
                onChange={(e) => onChange({ timeIssue: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Description of Activity / Scope of Work <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe work scope, isolation boundaries, tools, and specific actions..."
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>

        {/* AI Work Conflict & SIMOPs Banner */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          <WorkConflictInlineBanner
            workOrderNumber={data.workOrderNumber}
            jobType={data.description || 'General Work Activity'}
            analysis={conflictAnalysis || null}
            isLoading={!!isConflictLoading}
            onAnalyze={onRunConflictCheck || (() => {})}
            onOpenDetails={onOpenConflictModal || (() => {})}
          />
        </div>

        {/* Supervisor Authorization */}
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <SignatureBlock
            label="Site Supervisor / Department Authorization"
            roleDescription="Authorized by verified employee Work ID"
            signature={data.authSig}
            isWorkIdRequired={true}
            onSign={(sig) => onChange({ authSig: sig })}
            onClear={() => onChange({ authSig: null })}
          />
        </div>
      </div>

      {/* Hazards Identification */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
            EHS Hazard Identification
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Identify all environmental and physical safety hazards present at the work site.
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium text-[var(--color-text-main)] mb-2">Environmental Hazards</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
            {['Dust', 'Noise', 'Corrosive Chemicals', 'Inflammables', 'Fumes', 'Waste Spillage', 'Others'].map((h) => {
              const active = data.envHazards.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onChange({ envHazards: toggleArrayItem(data.envHazards, h) })}
                  className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[40px] sm:min-h-0 ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>{h}</span>
                  {active && <span className="sm:hidden text-xs font-mono">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-[var(--color-text-main)] mb-2">Safety Hazards</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
            {['Moving Machinery', 'Hot Material', 'Traffic / Mobile Plant', 'Buried Services', 'Electricity / Energized', 'Others'].map((h) => {
              const active = data.safetyHazards.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onChange({ safetyHazards: toggleArrayItem(data.safetyHazards, h) })}
                  className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[40px] sm:min-h-0 ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>{h}</span>
                  {active && <span className="sm:hidden text-xs font-mono">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PPE Requirements */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
            Required Personal Protective Equipment (PPE)
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Mandatory equipment required for all personnel entering the active permit perimeter.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
          {[
            'Head Protection (Hard Hat)',
            'Ear Protection (Defenders/Plugs)',
            'Eye/Face Protection (Shield/Goggles)',
            'Respiratory Protection (Dust Mask/Respirator)',
            'Hand Protection (Heavy Duty Gloves)',
            'Body Protection (High-Vis Overalls)',
            'Feet Protection (Steel-Toe Boots)',
            'Other Specialist PPE',
          ].map((ppe) => {
            const active = data.ppeItems.includes(ppe);
            return (
              <button
                key={ppe}
                type="button"
                onClick={() => onChange({ ppeItems: toggleArrayItem(data.ppeItems, ppe) })}
                className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[40px] sm:min-h-0 ${
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                <span>{ppe}</span>
                {active && <span className="sm:hidden text-xs font-mono">✓</span>}
              </button>
            );
          })}
        </div>

        {data.ppeItems.includes('Other Specialist PPE') && (
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Specify Other PPE Requirements
            </label>
            <input
              type="text"
              placeholder="e.g. Chemical apron, full-face respirator"
              value={data.ppeOthers}
              onChange={(e) => onChange({ ppeOthers: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Precautions to be Taken */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
            Precautions to be Taken
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Confirm all environmental and physical safety controls are actively implemented before starting.
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium text-[var(--color-text-main)] mb-2">Environmental Aspects</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
            {[
              'Clean spilled chemicals, oils, raw material, cement',
              'Storage of materials/oils appropriately',
              'Disposal of waste (segregate & dispose appropriately)',
              'Handling of raw materials/oils to prevent spillage',
              'Other Environmental Precautions',
            ].map((prec) => {
              const active = (data.precEnv || []).includes(prec);
              return (
                <button
                  key={prec}
                  type="button"
                  onClick={() => onChange({ precEnv: toggleArrayItem(data.precEnv || [], prec) })}
                  className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[40px] sm:min-h-0 ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>{prec}</span>
                  {active && <span className="sm:hidden text-xs font-mono">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-[var(--color-text-main)] mb-2">Safety Precautions</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
            {[
              'Required PPE supplied & checked',
              'Area cordoned off with safety tape',
              'Fire fighting equipment provided on site',
              'Services (electricity, water, air) isolated & locked off',
              'Possible leakage guarded & contained',
              'Warning signs displayed around perimeter',
            ].map((prec) => {
              const active = (data.precSafety || []).includes(prec);
              return (
                <button
                  key={prec}
                  type="button"
                  onClick={() => onChange({ precSafety: toggleArrayItem(data.precSafety || [], prec) })}
                  className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[40px] sm:min-h-0 ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <span>{prec}</span>
                  {active && <span className="sm:hidden text-xs font-mono">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Photo Evidence & Isolation Verification */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
          Safety Evidence & Physical Isolation
        </h3>
        <PhotoEvidenceUploader
          label="Locked & Isolated System (LOTO Evidence)"
          description="Photograph showing lock-out, tag-out, or physical disconnection of energy sources before work begins."
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

      {/* Mandatory Dynamic Risk Assessment */}
      <div className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-surface)] p-3.5 sm:p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.dynamicRiskAssessment}
            onChange={(e) => onChange({ dynamicRiskAssessment: e.target.checked })}
            className="mt-1 h-4 w-4 rounded accent-[var(--color-accent)] cursor-pointer"
          />
          <div>
            <div className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
              Dynamic Risk Assessment Confirmation <span className="text-[var(--color-danger)]">*</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
              I confirm that a dynamic on-site risk assessment has been executed immediately prior to commencing work, and all identified residual risks are controlled.
            </p>
          </div>
        </label>
      </div>

      {/* Crew Leader Receipt */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5">
        <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)] mb-1">
          Receipt & Acceptance (Crew Leader)
        </h3>
        <p className="text-[11px] text-[var(--color-text-muted)] mb-4">
          I have read this authorization, understand the scope and precautions, and confirm our crew will follow all site safety regulations.
        </p>

        <SignatureBlock
          label="Crew Leader Signature"
          roleDescription="Crew Leader accepting responsibility for on-site execution"
          signature={data.crewLeaderSig}
          isWorkIdRequired={false}
          onSign={(sig) => onChange({ crewLeaderSig: sig })}
          onClear={() => onChange({ crewLeaderSig: null })}
        />
      </div>

      {/* Daily Crew Log */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
              Daily Crew Attendance & Shift Log
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Record daily manning levels, shift commencement, and completion.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddCrewLogRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] font-mono text-[11px] uppercase border-b border-[var(--color-border)]">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Crew Size</th>
                <th className="p-2.5 text-center">Leader Sig</th>
                <th className="p-2.5 text-center">Mgr Sig</th>
                <th className="p-2.5">Start Time</th>
                <th className="p-2.5">Stop Time</th>
                <th className="p-2.5 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.crewLog.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-surface-hover)]">
                  <td className="p-2">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleCrewLogChange(idx, 'date', e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.persons}
                      onChange={(e) => handleCrewLogChange(idx, 'persons', e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(row.sigLeader)}
                      onChange={(e) => handleCrewLogChange(idx, 'sigLeader', e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-accent)]"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(row.sigMgr)}
                      onChange={(e) => handleCrewLogChange(idx, 'sigMgr', e.target.checked)}
                      className="h-4 w-4 rounded accent-[var(--color-accent)]"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="time"
                      value={row.timeStart}
                      onChange={(e) => handleCrewLogChange(idx, 'timeStart', e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="time"
                      value={row.timeStop}
                      onChange={(e) => handleCrewLogChange(idx, 'timeStop', e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs font-mono"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveCrewLogRow(idx)}
                      disabled={data.crewLog.length <= 1}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completion of Permit */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-[var(--color-good)]" />
          <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
            Permit Completion & Handback
          </h3>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)] mb-4">
          I have personally examined the site and plant conditions, confirm all tools and isolates are cleared, and declare the installation safe for normal operations.
        </p>

        <SignatureBlock
          label="Department Manager Completion Sign-off"
          roleDescription="Final sign-off by verified employee Work ID"
          signature={data.completionSig}
          isWorkIdRequired={true}
          onSign={(sig) => onChange({ completionSig: sig })}
          onClear={() => onChange({ completionSig: null })}
        />
      </div>
    </div>
  );
};

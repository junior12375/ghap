import React from 'react';
import { HotworkPermitData, ConflictAnalysisResult } from '../types/permit';
import { PhotoEvidenceUploader } from './PhotoEvidenceUploader';
import { SignatureBlock } from './SignatureBlock';
import { WorkConflictInlineBanner } from './WorkConflictInlineBanner';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';
import { needsConfinedSpaceEhsTest } from '../utils/permitHelpers';
import { Flame, AlertTriangle, ShieldCheck, Wind, Radio, BellRing, Info } from 'lucide-react';

interface HotWorkPermitFormProps {
  data: HotworkPermitData;
  onChange: (updated: Partial<HotworkPermitData>) => void;
  onNotifyEhsConfined: () => void;
  isNotifyingEhs: boolean;
  notifyStatusMessage?: string;
  supervisorWorkId: string;
  conflictAnalysis?: ConflictAnalysisResult | null;
  isConflictLoading?: boolean;
  onRunConflictCheck?: () => void;
  onOpenConflictModal?: () => void;
}

export const HotWorkPermitForm: React.FC<HotWorkPermitFormProps> = ({
  data,
  onChange,
  onNotifyEhsConfined,
  isNotifyingEhs,
  notifyStatusMessage,
  supervisorWorkId,
  conflictAnalysis,
  isConflictLoading,
  onRunConflictCheck,
  onOpenConflictModal,
}) => {
  const isConfinedOrSilo = needsConfinedSpaceEhsTest(data.typeOfWork);

  const toggleWorkType = (type: string) => {
    const list = data.typeOfWork || [];
    const updated = list.includes(type) ? list.filter((t) => t !== type) : [...list, type];
    onChange({ typeOfWork: updated });
  };

  const toggleSparksControl = (ctrl: string) => {
    const list = data.sparksControls || [];
    const updated = list.includes(ctrl) ? list.filter((c) => c !== ctrl) : [...list, ctrl];
    onChange({ sparksControls: updated });
  };

  const togglePpe = (item: string) => {
    const list = data.ppe || [];
    const updated = list.includes(item) ? list.filter((p) => p !== item) : [...list, item];
    onChange({ ppe: updated });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* High-Risk Red Hazard Protocol Advisory Strip */}
      <div className="rounded-xl border border-red-500/40 bg-gradient-to-r from-red-600/15 via-red-600/5 to-transparent p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </span>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="font-display font-bold text-xs sm:text-sm text-red-700 dark:text-red-300">
              HIGH-RISK RED PROTOCOL: HOT WORK · CONFINED SPACE · SILO ENTRY
            </span>
          </div>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded bg-red-600 text-white tracking-wider shadow-sm shadow-red-600/30">
          RED PROTOCOL
        </span>
      </div>

      {/* Permit Header & Identification (Red Themed) */}
      <div className="rounded-xl border-2 border-red-500/40 bg-gradient-to-b from-red-600/[0.04] via-red-600/[0.01] to-[var(--color-surface)] p-3.5 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <GhacemLogo className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
            <div className="h-8 w-px bg-red-500/20 hidden sm:block" />
            <HeidelbergMaterialsLogo className="h-6 sm:h-7 hidden sm:flex" textColor="var(--color-text-main)" />
            <div className="border-l border-red-500/20 pl-3 hidden lg:block">
              <span className="font-mono text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded tracking-wider inline-block mb-0.5 shadow-sm shadow-red-600/20">
                FORM GHA.OCPF 04B
              </span>
              <h2 className="font-display font-bold text-base text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-0.5">
                <Flame className="h-4 w-4 text-red-600 animate-pulse" />
                Hot Work / Confined Space / Silo Entry
              </h2>
            </div>
            <div className="lg:hidden">
              <span className="font-mono text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded tracking-wider inline-block mb-0.5">
                FORM GHA.OCPF 04B
              </span>
              <h2 className="font-display font-bold text-sm sm:text-base text-red-600 dark:text-red-400 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-red-600" />
                Hot Work & Confined Entry
              </h2>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 bg-red-600/10 px-2.5 py-1 rounded border border-red-500/30">
            High-Risk Controlled Permit
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Work Order Number <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. WO-2026-9021"
              value={data.workOrderNumber}
              onChange={(e) => onChange({ workOrderNumber: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Permit Number</label>
            <input
              type="text"
              value={data.no}
              onChange={(e) => onChange({ no: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Date of Activity</label>
            <input
              type="date"
              value={data.dateActivity}
              onChange={(e) => onChange({ dateActivity: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Location <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Clinker Silo 2, Grinding Bay"
              value={data.location}
              onChange={(e) => onChange({ location: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Equipment ID</label>
            <input
              type="text"
              placeholder="e.g. EQ-FAN-401"
              value={data.equipmentId}
              onChange={(e) => onChange({ equipmentId: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">Dept / Contractor</label>
            <input
              type="text"
              placeholder="e.g. Mechanicals / Welding Crew"
              value={data.deptContractor}
              onChange={(e) => onChange({ deptContractor: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
              Purpose of Entry / Hot Work <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Describe specific welding, burning, grinding, cutting, or entry purpose..."
              value={data.purpose}
              onChange={(e) => onChange({ purpose: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          {/* AI Work Conflict & SIMOPs Banner */}
          <div className="md:col-span-3 pt-2">
            <WorkConflictInlineBanner
              workOrderNumber={data.workOrderNumber}
              jobType={data.typeOfWork.length > 0 ? data.typeOfWork.join(', ') : (data.purpose || 'Hot Work')}
              analysis={conflictAnalysis || null}
              isLoading={!!isConflictLoading}
              onAnalyze={onRunConflictCheck || (() => {})}
              onOpenDetails={onOpenConflictModal || (() => {})}
            />
          </div>
        </div>
      </div>

      {/* Type of Work Selector (Red Themed) */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--color-surface)] p-3.5 sm:p-5 space-y-3">
        <div>
          <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-red-600" />
            Type of Work Activity <span className="text-[var(--color-danger)]">*</span>
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Selecting Confined Space or Silo Entry requires pre-entry EHS atmospheric verification under Red Protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {['Hot Work', 'Confined Space Entry', 'Silo Entry'].map((type) => {
            const active = data.typeOfWork.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleWorkType(type)}
                className={`w-full px-4 py-2.5 sm:py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[42px] sm:min-h-0 ${
                  active
                    ? 'border-red-600 bg-red-600 text-white shadow-md shadow-red-700/30 font-bold'
                    : 'border-red-500/20 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-red-600 hover:border-red-500/40'
                }`}
              >
                <span>{type}</span>
                {active && <span className="text-xs font-mono font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        {/* EHS Space Test Alert & Trigger Panel for Confined Space / Silo Entry */}
        {isConfinedOrSilo && (
          <div className="mt-4 rounded-xl border-2 border-red-500/60 bg-red-600/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-red-600 dark:text-red-300">
                  Confined Space / Silo Entry — Pre-Entry EHS Atmospheric Test Required (Red Protocol)
                </h4>
                <p className="text-[11px] text-red-700/90 dark:text-red-300/80 mt-1 leading-relaxed">
                  Both Confined Space and Silo Entry require an on-site atmospheric gas test (Oxygen, LEL, CO, H2S) by EHS personnel.
                  Entering a valid Site Supervisor Work ID below unlocks the EHS alert trigger.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onNotifyEhsConfined}
                disabled={isNotifyingEhs || !supervisorWorkId}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-red-700/25"
              >
                <BellRing className="h-3.5 w-3.5" />
                {isNotifyingEhs ? 'Sending Red Alert...' : 'Notify EHS for Confined Space Test'}
              </button>

              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                {supervisorWorkId
                  ? '✓ Supervisor Work ID verified — ready to alert EHS'
                  : 'Enter Site Supervisor Work ID in Section 16 below to unlock'}
              </span>
            </div>

            {notifyStatusMessage && (
              <div className="text-xs font-mono p-2.5 rounded bg-black/30 border border-amber-500/30 text-amber-200">
                {notifyStatusMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 5: Work at Height Coordination (Red Protocol) */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--color-surface)] p-5 space-y-3">
        <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400">
          5. Height Assessment
        </h3>
        <div className="flex items-center justify-between text-xs">
          <span>Will hot work / entry be conducted at a height above 2 meters?</span>
          <div className="flex gap-2">
            {(['Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ workAtHeight: opt })}
                className={`px-3 py-1 rounded-md text-xs font-bold border ${
                  data.workAtHeight === opt
                    ? 'border-red-600 bg-red-600 text-white shadow-sm'
                    : 'border-red-500/20 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {data.workAtHeight === 'Yes' && (
          <div className="pt-2 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5 font-mono">
            <Info className="h-4 w-4 text-red-500" />
            <span>Cross-reference required: GHA.OCPF 04C (Working at Height) must also be authorized.</span>
          </div>
        )}
      </div>

      {/* Section 6: Isolation Verification (Red Protocol) */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--color-surface)] p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400">
            6. Energy &amp; System Isolations (Red LOTO Standard)
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Verify all physical barriers, electrical disconnects, and pipeline line breaks prior to ignition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { key: 'electrical', label: 'Electrical Isolation (LOTO verified)' },
            { key: 'mechanical', label: 'Mechanical Isolation (Drive uncoupled / pinned)' },
            { key: 'fireDetection', label: 'Fire Detection System (Deactivated/masked locally)' },
            { key: 'pipeline', label: 'Pipeline Isolation (Blinded / Spaded / Locked)' },
            { key: 'contactMaintenance', label: 'Contact with Maintenance Verified' },
          ].map((item) => {
            const val = data.isolation[item.key as keyof typeof data.isolation];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/20 bg-[var(--color-surface-elevated)]"
              >
                <span className="text-[11px] font-medium">{item.label}</span>
                <div className="flex gap-1.5 shrink-0">
                  {(['Yes', 'No'] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() =>
                        onChange({
                          isolation: { ...data.isolation, [item.key]: o },
                        })
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-mono ${
                        val === o
                          ? 'bg-red-600 text-white font-bold shadow-sm shadow-red-700/20'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
            Isolation Inspected &amp; Verified By (Name)
          </label>
          <input
            type="text"
            placeholder="e.g. Electrical Supervisor / Mechanical Lead"
            value={data.isolationCheckedBy}
            onChange={(e) => onChange({ isolationCheckedBy: e.target.value })}
            className="w-full rounded-lg border border-red-500/20 bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Section 7: Confined Space Atmospheric Test Data (Red Protocol) */}
      <div className="rounded-xl border-2 border-red-500/40 bg-red-600/[0.02] p-5 space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-600" />
            <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400">
              7. Confined Space Atmospheric Gas Test Data (Mandatory Red Clearance)
            </h3>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            Entry is prohibited if any reading exceeds the Permissible Exposure Limit (PEL).
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-red-500/30">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-red-600/10 text-red-700 dark:text-red-300 font-mono text-[11px] uppercase border-b border-red-500/30 font-bold">
              <tr>
                <th className="p-2.5">Substance Tested</th>
                <th className="p-2.5">Permissible Limit (PEL)</th>
                <th className="p-2.5">Measured Reading</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              <tr>
                <td className="p-2.5 font-medium">% Oxygen (O2)</td>
                <td className="p-2.5 font-mono text-[var(--color-text-muted)]">&gt;19.5% &amp; &lt;22.0%</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={data.testData.oxygen.reading}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, oxygen: { ...data.testData.oxygen, reading: e.target.value } },
                      })
                    }
                    className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={data.testData.oxygen.date}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, oxygen: { ...data.testData.oxygen, date: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    value={data.testData.oxygen.time}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, oxygen: { ...data.testData.oxygen, time: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
              </tr>

              <tr>
                <td className="p-2.5 font-medium">% LEL (Flammable Vapours)</td>
                <td className="p-2.5 font-mono text-[var(--color-text-muted)]">&lt; 10%</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={data.testData.lel.reading}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, lel: { ...data.testData.lel, reading: e.target.value } },
                      })
                    }
                    className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={data.testData.lel.date}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, lel: { ...data.testData.lel, date: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    value={data.testData.lel.time}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, lel: { ...data.testData.lel, time: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
              </tr>

              <tr>
                <td className="p-2.5 font-medium">Carbon Monoxide (CO)</td>
                <td className="p-2.5 font-mono text-[var(--color-text-muted)]">&lt; 35 ppm</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={data.testData.co.reading}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, co: { ...data.testData.co, reading: e.target.value } },
                      })
                    }
                    className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={data.testData.co.date}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, co: { ...data.testData.co, date: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    value={data.testData.co.time}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, co: { ...data.testData.co, time: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
              </tr>

              <tr>
                <td className="p-2.5 font-medium">Temperature</td>
                <td className="p-2.5 font-mono text-[var(--color-text-muted)]">&lt; 40°C</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={data.testData.temp.reading}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, temp: { ...data.testData.temp, reading: e.target.value } },
                      })
                    }
                    className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={data.testData.temp.date}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, temp: { ...data.testData.temp, date: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    value={data.testData.temp.time}
                    onChange={(e) =>
                      onChange({
                        testData: { ...data.testData, temp: { ...data.testData.temp, time: e.target.value } },
                      })
                    }
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 font-mono text-xs"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
            Confined Space Atmospheric Test Performed By
          </label>
          <input
            type="text"
            placeholder="e.g. EHS Officer / Authorized Gas Tester"
            value={data.confinedSpaceTestedBy}
            onChange={(e) => onChange({ confinedSpaceTestedBy: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Sparks, Combustibles & Firewatch (Red Protocol) */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--color-surface)] p-5 space-y-4">
        <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400">
          8 &amp; 9. Combustible Materials &amp; Firewatch Controls
        </h3>

        <div className="flex items-center justify-between text-xs">
          <span>All removable combustible materials cleared within 15 meters?</span>
          <div className="flex gap-2">
            {(['Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ combustibleCleared: opt })}
                className={`px-3 py-1 rounded-md text-xs font-bold border ${
                  data.combustibleCleared === opt
                    ? 'border-red-600 bg-red-600 text-white shadow-sm'
                    : 'border-red-500/20 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-red-700 dark:text-red-300 mb-2">Sparks Containment Controls (Red Protocol)</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
            {[
              'Fire Blankets / Screens',
              'Covered Floor Penetrations',
              'Area Barricades & Signage',
              'Ventilation Purging',
              'Dedicated Firewatch Stationed',
              'Services Isolated',
            ].map((ctrl) => {
              const active = data.sparksControls.includes(ctrl);
              return (
                <button
                  key={ctrl}
                  type="button"
                  onClick={() => toggleSparksControl(ctrl)}
                  className={`w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-between sm:justify-center text-left sm:text-center min-h-[40px] sm:min-h-0 ${
                    active
                      ? 'border-red-600 bg-red-600 text-white font-bold shadow-sm shadow-red-700/25'
                      : 'border-red-500/20 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-red-600 hover:border-red-500/40'
                  }`}
                >
                  <span>{ctrl}</span>
                  {active && <span className="text-xs font-mono font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-1">
            Dedicated Firewatch Person (Maintained for 30 minutes post-work)
          </label>
          <input
            type="text"
            placeholder="Name of appointed firewatch attendant"
            value={data.firewatchBy}
            onChange={(e) => onChange({ firewatchBy: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Mandatory Fire Extinguisher Photo Evidence */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-[var(--color-text-main)]">
          Mandatory Safety Evidence Attachments
        </h3>

        <PhotoEvidenceUploader
          label="Hot Work Fire Extinguisher on Site"
          description="Mandatory evidence: Photograph showing a certified, ready-for-use fire extinguisher placed immediately adjacent to the hot work zone."
          required={true}
          photoUrl={data.safetyPhotos.fireExtinguisher}
          photoName={data.safetyPhotos.fireExtinguisherName}
          photoTimestamp={data.safetyPhotos.fireExtinguisherAt}
          onPhotoUploaded={(url, name, timestamp) => {
            onChange({
              safetyPhotos: {
                ...data.safetyPhotos,
                fireExtinguisher: url,
                fireExtinguisherName: name,
                fireExtinguisherAt: timestamp,
              },
            });
          }}
          onPhotoRemoved={() => {
            onChange({
              safetyPhotos: {
                ...data.safetyPhotos,
                fireExtinguisher: '',
                fireExtinguisherName: '',
                fireExtinguisherAt: '',
              },
            });
          }}
        />

        <PhotoEvidenceUploader
          label="Isolation & LOTO Evidence (Optional)"
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

      {/* Dynamic Risk Assessment Confirmation (Red Protocol) */}
      <div className="rounded-xl border-2 border-red-500/50 bg-red-600/[0.04] p-5 shadow-sm">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.dynamicRiskAssessment}
            onChange={(e) => onChange({ dynamicRiskAssessment: e.target.checked })}
            className="mt-1 h-4 w-4 rounded accent-red-600 cursor-pointer"
          />
          <div>
            <div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
              Dynamic Risk Assessment Confirmation (Mandatory Red Hazard Clearance) <span className="text-[var(--color-danger)]">*</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
              I certify that all potential fire, explosion, suffocation, toxic vapor, and heat-stress hazards have been physically surveyed and controlled prior to starting hot work.
            </p>
          </div>
        </label>
      </div>

      {/* Section 16: Safe to Commence Authorizations (Red Protocol) */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--color-surface)] p-5 space-y-4">
        <div>
          <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400">
            16. Safe to Commence Authorisation (Red Protocol Authorization)
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Both the Site Supervisor (verified by Work ID) and Crew Leader must authorize before execution starts.
          </p>
        </div>

        <SignatureBlock
          label="Site Supervisor / Manager Authorization"
          roleDescription="Verified employee Work ID (e.g. 11037, 11079, 10108, 10112)"
          signature={data.safeCommenceMgr}
          isWorkIdRequired={true}
          onSign={(sig) => onChange({ safeCommenceMgr: sig })}
          onClear={() => onChange({ safeCommenceMgr: null })}
        />

        <SignatureBlock
          label="Crew Leader Acceptance Signature"
          roleDescription="Crew Leader accepting responsibility on site"
          signature={data.safeCommenceCrew}
          isWorkIdRequired={false}
          onSign={(sig) => onChange({ safeCommenceCrew: sig })}
          onClear={() => onChange({ safeCommenceCrew: null })}
        />
      </div>

      {/* Section 17: Sign-Off Closure (Red Protocol) */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--color-surface)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-red-600" />
          <h3 className="font-display font-bold text-sm text-red-600 dark:text-red-400">
            17. Sign Off &amp; Job Closure (Red Protocol Decommission)
          </h3>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          The hot work / entry is completed, site cooled down, fire detection reactivated, and area safe.
        </p>

        <SignatureBlock
          label="Manager Closure Sign-off"
          roleDescription="Signed by verified employee Work ID"
          signature={data.signOffMgr}
          isWorkIdRequired={true}
          onSign={(sig) => onChange({ signOffMgr: sig })}
          onClear={() => onChange({ signOffMgr: null })}
        />

        <SignatureBlock
          label="Crew Leader Closure Sign-off"
          roleDescription="Crew Leader confirming work handback"
          signature={data.signOffCrew}
          isWorkIdRequired={false}
          onSign={(sig) => onChange({ signOffCrew: sig })}
          onClear={() => onChange({ signOffCrew: null })}
        />
      </div>
    </div>
  );
};

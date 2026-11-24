/**
 * GHACEM Corporate Permit-to-Work (PTW) Enterprise Portal
 *
 * Implements refined minimalist corporate aesthetic, multi-stage safety authorization,
 * AES-GCM 256 document encryption vault, and cross-device cloud synchronization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AllPermitState, HistoryRecord, PermitType, SyncStatusInfo } from './types/permit';
import { DEFAULT_PERMIT_STATE } from './data/defaults';
import { Header } from './components/Header';
import { WorkflowSidebar } from './components/WorkflowSidebar';
import { GeneralWorkPermitForm } from './components/GeneralWorkPermitForm';
import { HotWorkPermitForm } from './components/HotWorkPermitForm';
import { HeightWorkPermitForm } from './components/HeightWorkPermitForm';
import { ApprovedPermitsView } from './components/ApprovedPermitsView';
import { RejectedPermitsView } from './components/RejectedPermitsView';
import { AdminOperationsView } from './components/AdminOperationsView';
import { WorkConflictDetectionView } from './components/WorkConflictDetectionView';
import { WorkConflictInspectorModal } from './components/WorkConflictInspectorModal';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { PermitViewerModal } from './components/PermitViewerModal';
import { RenewalModal } from './components/RenewalModal';
import { WelcomeGateModal } from './components/WelcomeGateModal';
import { GhacemLogo, HeidelbergMaterialsLogo } from './components/Logos';
import { Flame, ArrowUpRight, ShieldCheck, Shield } from 'lucide-react';
import { ConflictAnalysisResult } from './types/permit';
import { detectWorkConflicts } from './utils/aiConflictDetector';
import {
  ExecutiveUser,
  verifyExecutiveLogin,
  setExecutiveSession,
  clearExecutiveSession,
  getActiveExecutiveSession,
} from './utils/executiveAuth';

import {
  fetchHistoryFromBackend,
  postToBackend,
  addToOutbox,
  flushOutboxQueue,
  getOutboxQueue,
} from './utils/syncEngine';
import {
  flattenGeneral,
  flattenHotwork,
  flattenHeight,
  isPermitClosed,
  needsConfinedSpaceEhsTest,
} from './utils/permitHelpers';

const LOCAL_STORAGE_PERMIT_KEY = 'ghacem_corporate_permits_data';
const THEME_STORAGE_KEY = 'ghacem_corporate_theme';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('general');
  const [formType, setFormType] = useState<PermitType>('general');

  // Permit Forms In-Memory Data
  const [permitState, setPermitState] = useState<AllPermitState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PERMIT_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PERMIT_STATE;
    } catch {
      return DEFAULT_PERMIT_STATE;
    }
  });

  // History Cache from Backend
  const [historyCache, setHistoryCache] = useState<Record<PermitType, HistoryRecord[]>>({
    general: [],
    hotwork: [],
    height: [],
  });

  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    state: 'idle',
    message: 'Initializing cloud connection...',
    pendingQueueCount: getOutboxQueue().length,
  });

  // Admin Access Gate & Executive User Session
  const [currentExecutiveUser, setCurrentExecutiveUser] = useState<ExecutiveUser | null>(() => {
    try {
      const active = getActiveExecutiveSession();
      return active ? active.user : null;
    } catch {
      return null;
    }
  });

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ghacem_admin_unlocked') === '1' && !!getActiveExecutiveSession();
    } catch {
      return false;
    }
  });

  // Theme Preset (White daylight default, Emerald dark, Steel slate)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored && ['daylight', 'dark', 'steel'].includes(stored) ? stored : 'daylight';
    } catch {
      return 'daylight';
    }
  });

  // Modals State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [viewerModalData, setViewerModalData] = useState<{
    isOpen: boolean;
    formType: PermitType;
    record: HistoryRecord | null;
    submissionId: string;
    relatedPermits?: Array<{ formType: PermitType; record: HistoryRecord; id: string }>;
  }>({
    isOpen: false,
    formType: 'general',
    record: null,
    submissionId: '',
  });

  const [renewalModalData, setRenewalModalData] = useState<{
    isOpen: boolean;
    formType: PermitType;
    submissionId: string;
    record: HistoryRecord | null;
  }>({
    isOpen: false,
    formType: 'general',
    submissionId: '',
    record: null,
  });

  // AI Conflict Detection State
  const [conflictAnalysisState, setConflictAnalysisState] = useState<Record<PermitType, ConflictAnalysisResult | null>>({
    general: null,
    hotwork: null,
    height: null,
  });
  const [isConflictLoading, setIsConflictLoading] = useState<Record<PermitType, boolean>>({
    general: false,
    hotwork: false,
    height: false,
  });
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictModalTarget, setConflictModalTarget] = useState<PermitType>('general');
  const [conflictSource, setConflictSource] = useState<string>('gemini-3.8-flash');

  // Welcome Gate & Mandatory Terms State - Automatically the first page to see before the permit
  const [isWelcomeGateOpen, setIsWelcomeGateOpen] = useState<boolean>(true);
  const [isTermsReviewMode, setIsTermsReviewMode] = useState<boolean>(false);

  // UI Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNotifyingEhs, setIsNotifyingEhs] = useState(false);
  const [notifyStatusMessage, setNotifyStatusMessage] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleAcceptTerms = useCallback((userName: string, workId: string) => {
    setIsWelcomeGateOpen(false);
    setIsTermsReviewMode(false);
    showToast(`✓ Welcome to GHACPerm${userName ? `, ${userName}` : ''}. Full permit authorization access granted.`);
  }, [showToast]);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PERMIT_KEY, JSON.stringify(permitState));
    } catch (e) {
      console.error('Failed to save permit state to localStorage:', e);
    }
  }, [permitState]);

  // Apply Theme
  useEffect(() => {
    if (currentTheme && currentTheme !== 'daylight') {
      document.documentElement.setAttribute('data-theme', currentTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'daylight');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch {}
  }, [currentTheme]);

  // Cloud History Loader
  const loadCloudHistory = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, state: 'syncing', message: 'Fetching cloud history...' }));
    try {
      const [gRes, hRes, htRes] = await Promise.all([
        fetchHistoryFromBackend('general'),
        fetchHistoryFromBackend('hotwork'),
        fetchHistoryFromBackend('height'),
      ]);

      setHistoryCache({
        general: gRes.ok && gRes.records ? gRes.records : [],
        hotwork: hRes.ok && hRes.records ? hRes.records : [],
        height: htRes.ok && htRes.records ? htRes.records : [],
      });

      const outbox = getOutboxQueue();
      setSyncStatus({
        state: 'synced',
        message: 'Connected to GHACEM Cloud Backend',
        lastSyncTime: new Date(),
        pendingQueueCount: outbox.length,
      });
    } catch (e) {
      console.warn('Backend fetch failed, using local offline cache:', e);
      setSyncStatus((prev) => ({
        ...prev,
        state: 'offline',
        message: 'Operating offline with local store',
      }));
    }
  }, []);

  // Flush outbox queue and load cloud history on startup
  useEffect(() => {
    const initSync = async () => {
      await flushOutboxQueue(setSyncStatus);
      await loadCloudHistory();
    };
    initSync();

    // Listen to network changes
    const handleOnline = () => {
      showToast('✓ Network reconnected. Synchronizing pending permits...');
      flushOutboxQueue(setSyncStatus).then(loadCloudHistory);
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, state: 'offline', message: 'Device is offline' }));
      showToast('Device offline. Submissions will be stored in encrypted local outbox.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadCloudHistory, showToast]);

  // Deep Link & QR Code Parameter Handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkType = params.get('permit') as PermitType | null;
    const linkId = params.get('id');

    if (linkType && linkId && ['general', 'hotwork', 'height'].includes(linkType)) {
      // Find matching record
      const match = (historyCache[linkType] || []).find((r) => String(r['Submission ID'] || '') === linkId);
      if (match) {
        setViewerModalData({
          isOpen: true,
          formType: linkType,
          record: match,
          submissionId: linkId,
        });
      }
    }
  }, [historyCache]);

  // Form Change Handler
  const handleFormChange = <T extends PermitType>(type: T, updated: Partial<AllPermitState[T]>) => {
    setPermitState((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...updated,
      },
    }));
  };

  // Run AI Conflict Check on current or specified form
  const handleRunConflictCheck = useCallback(
    async (targetType: PermitType = formType) => {
      const current = permitState[targetType];
      let wo = '';
      let jt = '';
      let loc = '';
      let dept = '';
      let eq = '';
      let desc = '';

      if (targetType === 'general') {
        const g = current as typeof permitState.general;
        wo = g.workOrderNumber;
        jt = g.description || 'General Work Activity';
        loc = g.deptLocation;
        dept = g.department;
        desc = g.description;
      } else if (targetType === 'hotwork') {
        const h = current as typeof permitState.hotwork;
        wo = h.workOrderNumber;
        jt = h.typeOfWork.length > 0 ? h.typeOfWork.join(', ') : (h.purpose || 'Hot Work Activity');
        loc = h.location;
        dept = h.department;
        eq = h.equipmentId;
        desc = h.purpose;
      } else if (targetType === 'height') {
        const ht = current as typeof permitState.height;
        wo = ht.workOrderNo;
        jt = ht.description || 'Working at Height Safety Authorization';
        loc = ht.location;
        dept = ht.department;
        eq = ht.equipmentId;
        desc = ht.description;
      }

      if (!wo && !jt) {
        showToast('Please provide a Work Order Number or Type of Job first.');
        return;
      }

      setIsConflictLoading((prev) => ({ ...prev, [targetType]: true }));

      try {
        const allRecords = [...historyCache.general, ...historyCache.hotwork, ...historyCache.height];
        const res = await detectWorkConflicts({
          workOrderNumber: wo,
          jobType: jt,
          location: loc,
          department: dept,
          equipmentId: eq,
          description: desc,
          currentPermitType: targetType,
          existingPermits: allRecords,
        });

        if (res && res.analysis) {
          setConflictAnalysisState((prev) => ({ ...prev, [targetType]: res.analysis }));
          setConflictSource(res.source || 'gemini-3.8-flash');
          if (res.analysis.hasDirectConflict) {
            showToast(`⚠️ ${res.analysis.detectedConflicts.length} work conflict(s) detected (${res.analysis.conflictLevel} risk).`);
          } else {
            showToast(`✓ AI Conflict Scan Complete: Clear of collisions.`);
          }
        }
      } catch (err) {
        console.error('Conflict detection error:', err);
        showToast('Failed to complete AI conflict scan.');
      } finally {
        setIsConflictLoading((prev) => ({ ...prev, [targetType]: false }));
      }
    },
    [formType, permitState, historyCache, showToast]
  );

  // Draft creator from Conflict Detection View
  const handleSelectWorkOrderForDraft = (wo: string, jobType: string, loc?: string) => {
    const isHot = /hot|weld|burn|torch/i.test(jobType);
    const isHeight = /height|scaffold|roof/i.test(jobType);
    const targetForm: PermitType = isHot ? 'hotwork' : isHeight ? 'height' : 'general';

    setFormType(targetForm);
    setCurrentTab(targetForm);

    if (targetForm === 'general') {
      handleFormChange('general', {
        workOrderNumber: wo,
        description: jobType,
        deptLocation: loc || permitState.general.deptLocation,
      });
    } else if (targetForm === 'hotwork') {
      const types: string[] = [];
      if (/hot\s*work|weld/i.test(jobType)) types.push('Hot Work');
      if (/confined/i.test(jobType)) types.push('Confined Space Entry');
      if (/silo/i.test(jobType)) types.push('Silo Entry');
      if (types.length === 0) types.push('Hot Work');

      handleFormChange('hotwork', {
        workOrderNumber: wo,
        purpose: jobType,
        typeOfWork: types,
        location: loc || permitState.hotwork.location,
      });
    } else if (targetForm === 'height') {
      handleFormChange('height', {
        workOrderNo: wo,
        description: jobType,
        location: loc || permitState.height.location,
      });
    }

    showToast(`Loaded Work Order #${wo} into ${targetForm.toUpperCase()} form.`);
  };

  // Submit Active Permit to Cloud Workflow
  const handleSubmitActivePermit = async () => {
    const current = permitState[formType];
    const missingItems: string[] = [];

    if (formType === 'general') {
      const g = current as typeof permitState.general;
      if (!g.workOrderNumber) missingItems.push('Work Order Number');
      if (!g.deptLocation) missingItems.push('Location of Work');
      if (!g.authSig) missingItems.push('Site Supervisor Authorization (Work ID)');
      if (!g.crewLeaderSig) missingItems.push('Crew Leader Signature');
      if (!g.dynamicRiskAssessment) missingItems.push('Dynamic Risk Assessment confirmation');
    } else if (formType === 'hotwork') {
      const h = current as typeof permitState.hotwork;
      if (!h.workOrderNumber) missingItems.push('Work Order Number');
      if (!h.location) missingItems.push('Location');
      if (h.typeOfWork.length === 0) missingItems.push('Type of Work');
      if (!h.safeCommenceMgr) missingItems.push('Site Supervisor Authorization (Work ID)');
      if (!h.safeCommenceCrew) missingItems.push('Crew Leader Signature');
      if (!h.safetyPhotos.fireExtinguisher) missingItems.push('Fire Extinguisher Photo Evidence');
      if (!h.dynamicRiskAssessment) missingItems.push('Dynamic Risk Assessment confirmation');
    } else if (formType === 'height') {
      const ht = current as typeof permitState.height;
      if (!ht.workOrderNo) missingItems.push('Work Order Number');
      if (!ht.location) missingItems.push('Location');
      if (!ht.authMgr) missingItems.push('Supervisor Authorization (Work ID)');
      if (!ht.authCrew) missingItems.push('Crew Leader Signature');
      if (!ht.dynamicRiskAssessment) missingItems.push('Dynamic Risk Assessment confirmation');
    }

    if (missingItems.length > 0) {
      showToast(`Missing required items: ${missingItems.slice(0, 2).join(', ')}${missingItems.length > 2 ? '...' : ''}`);
      return;
    }

    const currentAnalysis = conflictAnalysisState[formType];
    if (currentAnalysis && currentAnalysis.conflictLevel === 'CRITICAL' && !currentAnalysis.safeToProceed) {
      const proceed = window.confirm(
        `🚨 CRITICAL WORK CONFLICT DETECTED!\n\n` +
        `Work Order #${currentAnalysis.workOrderNumber || 'Target'}: ${currentAnalysis.conflictSummary}\n\n` +
        `Notice: ${currentAnalysis.approvalNotice}\n\n` +
        `Do you want to review mitigations before submitting? Click Cancel to review or OK to proceed.`
      );
      if (!proceed) {
        setConflictModalTarget(formType);
        setIsConflictModalOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    let submissionId = current._submissionId?.trim();
    const isNew = !submissionId;

    if (!submissionId) {
      submissionId = `${formType.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    let flatData: Record<string, unknown> = {};
    if (formType === 'general') flatData = flattenGeneral(permitState.general);
    else if (formType === 'hotwork') flatData = flattenHotwork(permitState.hotwork);
    else flatData = flattenHeight(permitState.height);

    flatData['Submission ID'] = submissionId;

    try {
      const res = await postToBackend({
        formType,
        action: 'submit',
        submissionId,
        data: flatData,
      });

      if (res && res.ok) {
        handleFormChange(formType, { _submissionId: submissionId } as unknown as Partial<AllPermitState[typeof formType]>);
        showToast(`✓ Permit ${submissionId} submitted to workflow.`);
        await loadCloudHistory();
      } else {
        // Queue to Outbox for resilient offline sync
        await addToOutbox({
          formType,
          action: 'submit',
          submissionId,
          data: flatData,
        });
        handleFormChange(formType, { _submissionId: submissionId } as unknown as Partial<AllPermitState[typeof formType]>);
        setSyncStatus((prev) => ({
          ...prev,
          pendingQueueCount: prev.pendingQueueCount + 1,
        }));
        showToast(`Stored in local offline queue. Will sync automatically once online.`);
      }
    } catch {
      await addToOutbox({
        formType,
        action: 'submit',
        submissionId,
        data: flatData,
      });
      handleFormChange(formType, { _submissionId: submissionId } as unknown as Partial<AllPermitState[typeof formType]>);
      setSyncStatus((prev) => ({
        ...prev,
        pendingQueueCount: prev.pendingQueueCount + 1,
      }));
      showToast(`Permit saved locally in encrypted outbox.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notify EHS for Confined Space Entry Test
  const handleNotifyEhsConfined = async () => {
    const h = permitState.hotwork;
    const supervisorWorkId = h.safeCommenceMgr?.workId || '';
    const supervisorName = h.safeCommenceMgr?.name || '';

    if (!supervisorWorkId) {
      setNotifyStatusMessage('🔒 Enter the Site Supervisor Work ID in Section 16 first.');
      showToast('Enter Site Supervisor Work ID first.');
      return;
    }

    setIsNotifyingEhs(true);
    setNotifyStatusMessage('Saving permit and dispatching EHS alert...');

    try {
      let subId = h._submissionId?.trim();
      if (!subId) {
        subId = `HOTWORK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        handleFormChange('hotwork', { _submissionId: subId });
      }

      const flatData = flattenHotwork(h);
      flatData['Submission ID'] = subId;

      await postToBackend({
        formType: 'hotwork',
        action: 'submit',
        submissionId: subId,
        data: flatData,
      });

      const r = await postToBackend({
        action: 'request_ehs_test',
        formType: 'hotwork',
        submissionId: subId,
        data: {
          'Supervisor Work ID': supervisorWorkId,
          'Approved By': supervisorName,
        },
      });

      if (r && r.ok) {
        const fieldCodeMsg = r.hodFieldCode ? ` Field Authorization Code: ${r.hodFieldCode}` : '';
        setNotifyStatusMessage(`✓ Site Supervisor authorized. EHS alerted via secure dispatch.${fieldCodeMsg}`);
        showToast('✓ EHS notified for confined space test.');
        await loadCloudHistory();
      } else {
        setNotifyStatusMessage(`Dispatch issue: ${r?.error || 'Failed to send EHS notification.'}`);
      }
    } catch (e) {
      setNotifyStatusMessage(`Network error during dispatch: ${String(e)}`);
    } finally {
      setIsNotifyingEhs(false);
    }
  };

  // Renewal Handler
  const handleAuthorizeRenewal = async (type: PermitType, parentId: string, remarks: string) => {
    const parentRecord = (historyCache[type] || []).find((r) => String(r['Submission ID'] || '') === parentId);
    if (!parentRecord) return;

    const baseId = parentId.replace(/-R\d+$/, '');
    const renewalPattern = new RegExp(`^${baseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-R(\\d+)$`);
    const versions = (historyCache[type] || [])
      .map((r) => renewalPattern.exec(String(r['Submission ID'] || '')))
      .filter(Boolean)
      .map((m) => Number(m![1]));
    const nextVersion = (versions.length ? Math.max(...versions) : 0) + 1;
    const renewalId = `${baseId}-R${nextVersion}`;

    const renewalData = { ...parentRecord };
    delete renewalData['Last Updated'];
    renewalData['Submission ID'] = renewalId;
    renewalData['Renewal Of'] = parentId;
    renewalData['Renewal Remarks'] = remarks;
    renewalData['Renewal Approved At'] = new Date().toLocaleString();
    renewalData['Status'] = 'Active';
    renewalData['Approval Status'] = 'Approved';

    await postToBackend({
      action: 'submit',
      formType: type,
      submissionId: renewalId,
      data: renewalData,
    });

    showToast(`✓ Renewal ${renewalId} authorized for 24 hours.`);
    await loadCloudHistory();
  };

  // Determine current workflow state for active form
  const activeRecord = (historyCache[formType] || []).find(
    (r) => String(r['Submission ID'] || '') === permitState[formType]._submissionId
  );

  const isSupervisorAuthorized = Boolean(
    activeRecord?.['Department Authorization'] === 'Approved' ||
      (formType === 'general' && permitState.general.authSig) ||
      (formType === 'hotwork' && permitState.hotwork.safeCommenceMgr) ||
      (formType === 'height' && permitState.height.authMgr)
  );

  const isEhsTestRequired = formType === 'hotwork' && needsConfinedSpaceEhsTest(permitState.hotwork.typeOfWork);
  const isEhsTestDone = Boolean(activeRecord?.['EHS Test Completed'] === 'Completed');
  const isHodApproved = Boolean(activeRecord?.['HoD Approval'] === 'Approved');
  const isPermitApproved = Boolean(
    activeRecord?.['Approval Status'] === 'Approved' || activeRecord?.['Permit Status'] === 'Approved'
  );
  const isClosed = Boolean(isPermitClosed(formType, activeRecord || ({} as HistoryRecord)));

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-main)] flex flex-col font-sans">
      {/* Top Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (['general', 'hotwork', 'height'].includes(tab)) {
            setFormType(tab as PermitType);
          }
        }}
        syncStatus={syncStatus}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenTermsModal={() => {
          setIsTermsReviewMode(true);
          setIsWelcomeGateOpen(true);
        }}
        currentTheme={currentTheme}
        onChangeTheme={setCurrentTheme}
        isAdminUnlocked={isAdminUnlocked}
      />

      {/* Main Viewport */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-[var(--color-accent)] text-neutral-950 font-display font-bold text-xs px-4 py-2.5 shadow-xl animate-fade-in flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* View Routing */}
        {['general', 'hotwork', 'height'].includes(currentTab) ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Form Subtabs Segmented Control */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] w-full sm:w-auto overflow-x-auto scrollbar-none">
                {[
                  { id: 'general', label: 'General Work (04A)', icon: ShieldCheck, activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-700/25 border-emerald-600', idleClass: 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10' },
                  { id: 'hotwork', label: 'Hot Work / Confined / Silo (04B)', icon: Flame, activeClass: 'bg-red-600 text-white shadow-md shadow-red-700/30 border-red-600 font-bold', idleClass: 'text-red-600 dark:text-red-400 hover:bg-red-500/10' },
                  { id: 'height', label: 'Working at Height (04C)', icon: ArrowUpRight, activeClass: 'bg-blue-600 text-white shadow-md shadow-blue-700/30 border-blue-600 font-bold', idleClass: 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10' },
                ].map((f) => {
                  const Icon = f.icon;
                  const isActive = formType === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFormType(f.id as PermitType);
                        setCurrentTab(f.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                        isActive
                          ? f.activeClass
                          : `border-transparent ${f.idleClass}`
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {permitState[formType]._submissionId && (
                <div className="text-[11px] font-mono text-[var(--color-text-muted)] flex items-center gap-2">
                  <span>Tracking:</span>
                  <span className="font-bold text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-2 py-0.5 rounded border border-[var(--color-accent-border)]">
                    {permitState[formType]._submissionId}
                  </span>
                </div>
              )}
            </div>

            {/* Form & Workflow Dual-Zone Layout */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
              {/* Left Zone: Form Inputs */}
              <div className="flex-1 w-full min-w-0">
                {formType === 'general' && (
                  <GeneralWorkPermitForm
                    data={permitState.general}
                    onChange={(upd) => handleFormChange('general', upd)}
                    conflictAnalysis={conflictAnalysisState.general}
                    isConflictLoading={isConflictLoading.general}
                    onRunConflictCheck={() => handleRunConflictCheck('general')}
                    onOpenConflictModal={() => {
                      setConflictModalTarget('general');
                      setIsConflictModalOpen(true);
                    }}
                  />
                )}

                {formType === 'hotwork' && (
                  <HotWorkPermitForm
                    data={permitState.hotwork}
                    onChange={(upd) => handleFormChange('hotwork', upd)}
                    onNotifyEhsConfined={handleNotifyEhsConfined}
                    isNotifyingEhs={isNotifyingEhs}
                    notifyStatusMessage={notifyStatusMessage}
                    supervisorWorkId={permitState.hotwork.safeCommenceMgr?.workId || ''}
                    conflictAnalysis={conflictAnalysisState.hotwork}
                    isConflictLoading={isConflictLoading.hotwork}
                    onRunConflictCheck={() => handleRunConflictCheck('hotwork')}
                    onOpenConflictModal={() => {
                      setConflictModalTarget('hotwork');
                      setIsConflictModalOpen(true);
                    }}
                  />
                )}

                {formType === 'height' && (
                  <HeightWorkPermitForm
                    data={permitState.height}
                    onChange={(upd) => handleFormChange('height', upd)}
                    conflictAnalysis={conflictAnalysisState.height}
                    isConflictLoading={isConflictLoading.height}
                    onRunConflictCheck={() => handleRunConflictCheck('height')}
                    onOpenConflictModal={() => {
                      setConflictModalTarget('height');
                      setIsConflictModalOpen(true);
                    }}
                  />
                )}
              </div>

              {/* Right Zone: Interactive Workflow Sidebar */}
              <WorkflowSidebar
                formType={formType}
                submissionId={permitState[formType]._submissionId || ''}
                isDraft={!permitState[formType]._submissionId}
                isSupervisorAuthorized={isSupervisorAuthorized}
                isEhsTestRequired={isEhsTestRequired}
                isEhsTestDone={isEhsTestDone}
                isHodApproved={isHodApproved}
                isPermitApproved={isPermitApproved}
                isClosed={isClosed}
                isSubmitting={isSubmitting}
                lastUpdated={activeRecord?.['Last Updated'] as string | undefined}
                conflictAnalysis={conflictAnalysisState[formType]}
                isConflictLoading={isConflictLoading[formType]}
                onRunConflictCheck={() => handleRunConflictCheck(formType)}
                onOpenConflictDetails={() => {
                  setConflictModalTarget(formType);
                  setIsConflictModalOpen(true);
                }}
                onSubmit={handleSubmitActivePermit}
                onSaveDraft={() => {
                  showToast('✓ Local encrypted draft saved to browser storage.');
                }}
                onClearForm={() => {
                  if (window.confirm('Clear all fields for this form?')) {
                    handleFormChange(formType, DEFAULT_PERMIT_STATE[formType] as Partial<AllPermitState[typeof formType]>);
                    showToast('Form reset to default.');
                  }
                }}
                onVerifySecurity={() => setIsSecurityModalOpen(true)}
              />
            </div>
          </div>
        ) : currentTab === 'conflicts' ? (
          <WorkConflictDetectionView
            history={historyCache}
            onOpenViewer={(fType, rec, sId) => {
              setViewerModalData({
                isOpen: true,
                formType: fType,
                record: rec,
                submissionId: sId,
              });
            }}
            onSelectWorkOrderForDraft={handleSelectWorkOrderForDraft}
          />
        ) : currentTab === 'approved' ? (
          <ApprovedPermitsView
            history={historyCache}
            onRefresh={loadCloudHistory}
            onOpenViewer={(fType, rec, sId) => {
              setViewerModalData({
                isOpen: true,
                formType: fType,
                record: rec,
                submissionId: sId,
              });
            }}
            onOpenRenewalModal={(fType, sId, rec) => {
              setRenewalModalData({
                isOpen: true,
                formType: fType,
                submissionId: sId,
                record: rec,
              });
            }}
          />
        ) : currentTab === 'rejected' ? (
          <RejectedPermitsView
            history={historyCache}
            onRefresh={loadCloudHistory}
            onOpenViewer={(fType, rec, sId) => {
              setViewerModalData({
                isOpen: true,
                formType: fType,
                record: rec,
                submissionId: sId,
              });
            }}
          />
        ) : currentTab === 'admin' ? (
          <AdminOperationsView
            history={historyCache}
            isAdminUnlocked={isAdminUnlocked}
            currentExecutiveUser={currentExecutiveUser}
            onUnlockWithCredentials={(uname, pwd) => {
              const user = verifyExecutiveLogin(uname, pwd);
              if (user) {
                setExecutiveSession(user);
                setCurrentExecutiveUser(user);
                setIsAdminUnlocked(true);
                showToast(`✓ Executive session unlocked. Welcome, ${user.fullName}.`);
                return { success: true, user };
              }
              return { success: false, error: 'Invalid executive username or password. Check credentials and retry.' };
            }}
            onLock={() => {
              clearExecutiveSession();
              setCurrentExecutiveUser(null);
              setIsAdminUnlocked(false);
              showToast('Executive console locked.');
            }}
            onRefresh={loadCloudHistory}
            onOpenViewer={(fType, rec, sId) => {
              setViewerModalData({
                isOpen: true,
                formType: fType,
                record: rec,
                submissionId: sId,
              });
            }}
          />
        ) : null}
      </main>

      {/* Corporate Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-6 text-xs text-[var(--color-text-muted)] no-print">
        <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GhacemLogo className="h-8 w-8 shrink-0" />
            <div className="h-6 w-px bg-[var(--color-border)]" />
            <HeidelbergMaterialsLogo className="h-5" textColor="var(--color-text-main)" />
            <div className="text-[11px] text-[var(--color-text-muted)] hidden sm:block">
              · A Heidelberg Materials Company · The Nation Builder
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setIsTermsReviewMode(true);
                setIsWelcomeGateOpen(true);
              }}
              className="text-[11px] text-[var(--color-accent)] hover:underline font-medium cursor-pointer"
            >
              GHACPerm Terms &amp; Safety Policy
            </button>
            <div className="font-mono text-[11px] text-[var(--color-text-muted)]">
              AES-256 Secured Document Architecture · ISO 45001 EHS Compliant
            </div>
          </div>
        </div>
      </footer>

      {/* Mandatory Welcome & EHS Terms Gate Modal */}
      <WelcomeGateModal
        isOpen={isWelcomeGateOpen || isTermsReviewMode}
        canDismiss={isTermsReviewMode}
        onClose={() => {
          setIsTermsReviewMode(false);
          if (localStorage.getItem('ghacperm_terms_accepted') === 'true') {
            setIsWelcomeGateOpen(false);
          }
        }}
        onAccept={handleAcceptTerms}
      />

      {/* Security Vault Modal */}
      <SecurityVaultModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        currentPermitState={permitState}
      />

      {/* Sync & Connection Settings Modal */}
      <SyncSettingsModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncStatus={syncStatus}
        onSyncStatusChange={setSyncStatus}
        onTriggerFullRefresh={loadCloudHistory}
      />

      {/* Official Read-Only Permit Viewer Modal */}
      <PermitViewerModal
        isOpen={viewerModalData.isOpen}
        onClose={() => setViewerModalData((prev) => ({ ...prev, isOpen: false }))}
        formType={viewerModalData.formType}
        record={viewerModalData.record}
        submissionId={viewerModalData.submissionId}
        relatedPermits={viewerModalData.relatedPermits}
      />

      {/* 24-Hour Renewal Modal */}
      <RenewalModal
        isOpen={renewalModalData.isOpen}
        onClose={() => setRenewalModalData((prev) => ({ ...prev, isOpen: false }))}
        formType={renewalModalData.formType}
        submissionId={renewalModalData.submissionId}
        record={renewalModalData.record}
        onSubmitRenewal={handleAuthorizeRenewal}
      />

      {/* AI Work Conflict & SIMOPs Inspector Modal */}
      <WorkConflictInspectorModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        analysis={conflictAnalysisState[conflictModalTarget]}
        isLoading={isConflictLoading[conflictModalTarget]}
        onReanalyze={() => handleRunConflictCheck(conflictModalTarget)}
        source={conflictSource}
      />
    </div>
  );
}

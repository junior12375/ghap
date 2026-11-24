import React, { useState, useMemo, useEffect } from 'react';
import { HistoryRecord, PermitType } from '../types/permit';
import { isPermitClosed, isPermitOverdue, isPermitRejected, getWorkOrderNumber } from '../utils/permitHelpers';
import {
  Lock,
  Unlock,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Sparkles,
  PieChart,
  SlidersHorizontal,
  ChevronRight,
  Database,
  User,
  KeyRound,
  ShieldCheck,
  BadgeCheck,
  Building2,
  LogOut,
  Info,
} from 'lucide-react';
import { ExecutiveGraphicalDashboard, UnifiedPermitRecord } from './ExecutiveGraphicalDashboard';
import { getUnifiedPermits } from '../data/plantAuditRecords';
import {
  ExecutiveUser,
  getActiveExecutiveSession,
  getExecutiveAccounts,
} from '../utils/executiveAuth';
import { ChangePasswordModal } from './ChangePasswordModal';

interface AdminOperationsViewProps {
  history: Record<PermitType, HistoryRecord[]>;
  isAdminUnlocked: boolean;
  onUnlockWithCredentials: (username: string, password: string) => { success: boolean; error?: string; user?: ExecutiveUser };
  onLock: () => void;
  onRefresh: () => void;
  onOpenViewer: (formType: PermitType, record: HistoryRecord, submissionId: string) => void;
  currentExecutiveUser: ExecutiveUser | null;
}

export const AdminOperationsView: React.FC<AdminOperationsViewProps> = ({
  history,
  isAdminUnlocked,
  onUnlockWithCredentials,
  onLock,
  onRefresh,
  onOpenViewer,
  currentExecutiveUser,
}) => {
  // Login State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountsDirectory, setShowAccountsDirectory] = useState(false);

  // Password Change Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Tabs and Filters
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'active' | 'overdue' | 'closed' | 'all'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [includeBaseline, setIncludeBaseline] = useState(true);

  // Registered executive accounts for quick reference hint
  const availableAccounts = useMemo(() => getExecutiveAccounts(), [isChangePasswordOpen]);

  // Unified permit records
  const unifiedRecords: UnifiedPermitRecord[] = useMemo(() => {
    return getUnifiedPermits(history, includeBaseline);
  }, [history, includeBaseline]);

  // Executive KPI Computations
  const stats = useMemo(() => {
    const total = unifiedRecords.length;
    let closed = 0;
    let overdue = 0;
    let active = 0;
    let rejected = 0;

    unifiedRecords.forEach((r) => {
      if (r.status === 'Rejected') {
        rejected++;
      } else if (r.status === 'Closed') {
        closed++;
      } else if (r.status === 'Overdue') {
        overdue++;
      } else {
        active++;
      }
    });

    const complianceRate = total > 0 ? Math.round((closed / total) * 100) : 100;
    return { total, active, overdue, closed, rejected, complianceRate };
  }, [unifiedRecords]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Permit Type', 'Submission ID', 'Work Order', 'Location', 'Department', 'Facility', 'Contractor', 'Status', 'Updated At'];
    const rows = unifiedRecords.map((r) => {
      return [
        r.formType.toUpperCase(),
        r.id,
        r.workOrder,
        r.location,
        r.department,
        r.facility,
        r.contractor,
        r.status,
        r.timestamp,
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GHACEM-Executive-Operations-Report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    if (!usernameInput.trim()) {
      setLoginError('Please enter your authorized username or Work ID.');
      setIsSubmitting(false);
      return;
    }

    if (!passwordInput.trim()) {
      setLoginError('Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    const result = onUnlockWithCredentials(usernameInput, passwordInput);
    if (result.success) {
      setUsernameInput('');
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError(result.error || 'Invalid executive username or password. Check credentials and retry.');
    }
    setIsSubmitting(false);
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsernameInput(user);
    setPasswordInput(pass);
    setLoginError('');
  };

  // Chart drilldown
  const handleChartDrilldown = (filterType: string, filterValue: string) => {
    if (filterType === 'status') {
      if (filterValue === 'active') {
        setActiveSubTab('active');
        setStatusFilter('active');
      } else if (filterValue === 'overdue') {
        setActiveSubTab('overdue');
        setStatusFilter('overdue');
      } else if (filterValue === 'closed') {
        setActiveSubTab('closed');
        setStatusFilter('closed');
      } else if (filterValue === 'rejected') {
        setActiveSubTab('all');
        setStatusFilter('rejected');
      }
    } else if (filterType === 'type') {
      setActiveSubTab('all');
      setTypeFilter(filterValue);
    }
  };

  // If locked, render the Executive Username + Password Login Gate
  if (!isAdminUnlocked) {
    return (
      <div className="mx-auto max-w-lg py-8 sm:py-12 px-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-accent)] shadow-xs">
              <ShieldCheck className="h-8 w-8 text-[var(--color-accent)]" />
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)] font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                ISO 45001 EHS GOVERNANCE
              </div>
              <h2 className="font-display font-black text-2xl text-[var(--color-text-main)] tracking-tight">
                Executive Operations Login
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed mt-1">
                Authorized Plant Leadership, EHS Directors, and Governance Officers must provide verified username and password credentials.
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="rounded-xl border border-red-500/40 bg-red-600/10 p-3 text-xs text-red-600 dark:text-red-400 font-medium flex items-start gap-2.5 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Username / Work ID field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1.5">
                Executive Username or Work ID
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. director.ehs or GH-EHS-01"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-9 pr-3.5 py-2.5 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--color-text-main)]">
                  Specific Executive Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your designated executive password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] pl-9 pr-3.5 py-2.5 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-display font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Verify &amp; Unlock Executive Console</span>
            </button>
          </form>

          {/* Quick Authorized Accounts Directory Drawer */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setShowAccountsDirectory(!showAccountsDirectory)}
              className="w-full py-2 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <Info className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                <span>Authorized Executive Credentials Directory</span>
              </div>
              <span className="text-[10px] text-[var(--color-accent)] font-semibold">
                {showAccountsDirectory ? 'Hide Directory ▲' : 'Show Accounts ▼'}
              </span>
            </button>

            {showAccountsDirectory && (
              <div className="mt-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] space-y-2.5 animate-fade-in text-left">
                <div className="text-[11px] font-bold text-[var(--color-text-main)]">
                  Pre-configured Executive Accounts (Click to Auto-Fill):
                </div>

                <div className="space-y-1.5 text-xs">
                  {availableAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleQuickFill(acc.username, acc.passwordHash)}
                      className="w-full p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)] transition-all flex items-center justify-between group cursor-pointer text-left"
                    >
                      <div>
                        <div className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                          <span>{acc.fullName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                            {acc.role}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5">
                          User: <span className="text-[var(--color-accent)] font-bold">{acc.username}</span> · Pass: <span className="text-[var(--color-text-main)] font-mono">{acc.passwordHash}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        Fill →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[11px] text-[var(--color-text-faint)]">
            GHACEM Limited · Heidelberg Materials EHS Corporate Governance
          </div>
        </div>
      </div>
    );
  }

  // Filtered rows for Register Views
  const filteredRecords = unifiedRecords.filter((r) => {
    const hay = [
      r.id,
      r.workOrder,
      r.location,
      r.department,
      r.contractor,
      String(r.record['Description'] || r.record['Purpose'] || ''),
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch = !searchQuery || hay.includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || r.formType === typeFilter;

    let matchesStatus = true;
    if (activeSubTab === 'active' || statusFilter === 'active') {
      matchesStatus = r.status === 'Active';
    } else if (activeSubTab === 'overdue' || statusFilter === 'overdue') {
      matchesStatus = r.status === 'Overdue';
    } else if (activeSubTab === 'closed' || statusFilter === 'closed') {
      matchesStatus = r.status === 'Closed';
    } else if (statusFilter === 'rejected') {
      matchesStatus = r.status === 'Rejected';
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>{toastNotification}</span>
          </div>
          <button onClick={() => setToastNotification(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Read-Only Governance Notice & Executive Control Bar with User Identification */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-good-subtle)] text-[var(--color-good)] shrink-0">
              <Unlock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display font-bold text-xs text-[var(--color-text-main)] flex items-center gap-2">
                <span>EXECUTIVE OPERATIONS MANAGEMENT CONSOLE</span>
                {currentExecutiveUser && (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent-border)]">
                    {currentExecutiveUser.clearanceLevel}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)]">
                Plant-wide safety oversight, graphical hazard analytics, and regulatory compliance audit trail.
              </div>
            </div>
          </div>

          {/* Active Logged-in Executive Card & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {currentExecutiveUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[11px]">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-accent)] text-neutral-950 font-bold text-[10px]">
                  {currentExecutiveUser.fullName.charAt(0)}
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-[var(--color-text-main)]">
                    {currentExecutiveUser.fullName}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    {currentExecutiveUser.role} · <span className="font-mono">{currentExecutiveUser.facility}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors cursor-pointer"
              title="Change your executive password"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
              <span>Change Password</span>
            </button>

            <button
              onClick={onLock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors cursor-pointer"
              title="Log out and secure executive console"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>

        {/* Second Row: Data Tools & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            {/* Baseline Plant Data Toggle */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] cursor-pointer text-xs text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors select-none">
              <input
                type="checkbox"
                checked={includeBaseline}
                onChange={(e) => setIncludeBaseline(e.target.checked)}
                className="accent-[var(--color-accent)] h-3.5 w-3.5 rounded"
              />
              <Database className="h-3 w-3 text-[var(--color-accent)]" />
              <span className="font-mono text-[11px]">
                Baseline Plant Data ({includeBaseline ? 'On' : 'Off'})
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
              title="Refresh from Cloud"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync Cloud</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Briefing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab Switcher: Graphical Suite vs Specific Register Tables */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-x-auto max-w-full">
          <button
            onClick={() => {
              setActiveSubTab('overview');
              setStatusFilter('');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-xs border border-[var(--color-border)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Graphical Operations Suite</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('active');
              setStatusFilter('active');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'active'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-xs border border-[var(--color-border)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span>Active Operations ({stats.active})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('overdue');
              setStatusFilter('overdue');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'overdue'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-xs border border-[var(--color-border)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span>Overdue Handbacks ({stats.overdue})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('closed');
              setStatusFilter('closed');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'closed'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-xs border border-[var(--color-border)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
            <span>Closed &amp; Handed Back ({stats.closed})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('all');
              setStatusFilter('');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeSubTab === 'all'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-xs border border-[var(--color-border)] font-bold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-purple-500" />
            <span>All Plant Registers ({stats.total})</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
          Records in Scope: <span className="font-bold text-[var(--color-text-main)]">{unifiedRecords.length}</span>
        </div>
      </div>

      {/* VIEW 1: Full Interactive Executive Graphical Dashboard */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <ExecutiveGraphicalDashboard
            records={unifiedRecords}
            onSelectFilter={handleChartDrilldown}
            onOpenViewer={(fType: PermitType, rec: HistoryRecord, id: string) => onOpenViewer(fType, rec, id)}
          />
        </div>
      )}

      {/* VIEW 2: Complete Filterable Register Table */}
      {activeSubTab !== 'overview' && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs space-y-4 p-5">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search permit #, work order, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-main)] font-mono placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
              >
                <option value="">All Permit Types</option>
                <option value="general">General (04A)</option>
                <option value="hotwork">Hot Work / Confined (04B)</option>
                <option value="height">Height Work (04C)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-main)] focus:border-[var(--color-accent)] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue (&gt;24h)</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="text-xs text-[var(--color-text-muted)] font-mono">
              Filtered results: <span className="font-bold text-[var(--color-text-main)]">{filteredRecords.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] font-mono text-[11px] uppercase border-b border-[var(--color-border)]">
                <tr>
                  <th className="p-3.5">Type &amp; ID</th>
                  <th className="p-3.5">Work Order</th>
                  <th className="p-3.5">Location &amp; Scope</th>
                  <th className="p-3.5">Crew / Dept</th>
                  <th className="p-3.5">Facility</th>
                  <th className="p-3.5">Lifecycle</th>
                  <th className="p-3.5">Last Timestamp</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[var(--color-text-muted)]">
                      No matching records found in selected view.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item) => (
                    <tr key={`${item.formType}-${item.id}`} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="p-3.5">
                        <span className={`font-mono font-bold text-xs block ${
                          item.formType === 'hotwork'
                            ? 'text-red-500'
                            : item.formType === 'height'
                            ? 'text-blue-500'
                            : 'text-emerald-500'
                        }`}>
                          {item.formType.toUpperCase()}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                          {item.id.slice(-10)}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-xs font-semibold text-[var(--color-text-main)]">
                        {item.workOrder || 'N/A'}
                      </td>

                      <td className="p-3.5">
                        <span className="text-[var(--color-text-main)] block font-medium">{item.location}</span>
                        <span className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                          {String(item.record['Description'] || item.record['Purpose'] || '')}
                        </span>
                      </td>

                      <td className="p-3.5 text-xs text-[var(--color-text-main)]">
                        {item.contractor || 'Ghacem Internal'}
                      </td>

                      <td className="p-3.5 font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.facility === 'Takoradi'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {item.facility}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {item.status === 'Closed' ? (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-good-subtle)] text-[var(--color-good)] border border-[var(--color-good)]/30 font-semibold">
                            Closed
                          </span>
                        ) : item.status === 'Rejected' ? (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 font-semibold">
                            Rejected
                          </span>
                        ) : item.status === 'Overdue' ? (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 font-semibold">
                            Overdue (&gt;24h)
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-semibold">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-[var(--color-text-muted)]">
                        {item.timestamp || 'N/A'}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => onOpenViewer(item.formType, item.record, item.id)}
                          className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-main)] transition-colors inline-flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-[var(--color-accent)]" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentExecutiveUser}
        onPasswordChanged={(msg) => {
          setToastNotification(msg);
          setTimeout(() => setToastNotification(null), 5000);
        }}
      />
    </div>
  );
};

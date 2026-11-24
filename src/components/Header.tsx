import React from 'react';
import { Cloud, CloudOff, RefreshCw, Shield, SlidersHorizontal, Sun, Moon, FileText } from 'lucide-react';
import { SyncStatusInfo } from '../types/permit';
import { GhacemLogo, HeidelbergMaterialsLogo } from './Logos';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  syncStatus: SyncStatusInfo;
  onOpenSyncModal: () => void;
  onOpenSecurityModal: () => void;
  onOpenTermsModal?: () => void;
  currentTheme: string;
  onChangeTheme: (theme: string) => void;
  isAdminUnlocked: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  syncStatus,
  onOpenSyncModal,
  onOpenSecurityModal,
  onOpenTermsModal,
  currentTheme,
  onChangeTheme,
  isAdminUnlocked,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Co-Branded Logos (GHACEM + Heidelberg Materials) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('general')}
            className="flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none group"
            title="GHACEM - A Heidelberg Materials Company"
          >
            {/* GHACEM Official Circular Emblem */}
            <GhacemLogo className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 transition-transform group-hover:scale-105" />

            {/* Subtle Divider */}
            <div className="h-7 w-px bg-[var(--color-border)] hidden sm:block" />

            {/* Heidelberg Materials Logo */}
            <div className="hidden sm:block">
              <HeidelbergMaterialsLogo className="h-6 sm:h-7" textColor="var(--color-text-main)" />
            </div>

            {/* Mobile Text fallback if small screen */}
            <div className="sm:hidden">
              <div className="font-display text-sm font-bold tracking-tight text-[var(--color-text-main)] leading-none">
                GHACEM <span className="text-[var(--color-accent)] font-mono text-[10px] ml-1">PTW</span>
              </div>
              <div className="text-[9px] font-mono text-[var(--color-text-muted)] tracking-wider mt-0.5">
                HEIDELBERG
              </div>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-line controls) */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[var(--color-text-muted)]">
          <button
            onClick={() => onSelectTab('general')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 text-xs ${
              ['general', 'hotwork', 'height'].includes(currentTab)
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                : 'hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            Permit Forms
          </button>

          {onOpenTermsModal && (
            <button
              onClick={onOpenTermsModal}
              className="px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 text-xs flex items-center gap-1.5 hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
              title="Review GHACPerm Terms & Conditions and 5 Golden Life-Saving Rules"
            >
              <FileText className="h-3.5 w-3.5 text-[#F5B700]" />
              Terms &amp; Safety Policy
            </button>
          )}

          <button
            onClick={() => onSelectTab('conflicts')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 text-xs flex items-center gap-1.5 ${
              currentTab === 'conflicts'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                : 'hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            AI Conflict Radar
          </button>

          <button
            onClick={() => onSelectTab('approved')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 text-xs ${
              currentTab === 'approved'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                : 'hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            Approved Register
          </button>

          <button
            onClick={() => onSelectTab('rejected')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 text-xs ${
              currentTab === 'rejected'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                : 'hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            Rejected Register
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 text-xs flex items-center gap-1.5 ${
              currentTab === 'admin'
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-accent)] font-semibold border border-[var(--color-border)]'
                : 'hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            Executive Operations
            {isAdminUnlocked && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-good)]" title="Admin Unlocked" />
            )}
          </button>
        </nav>

        {/* Zone 3: Security & Sync Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* GHACPerm Terms & Safety Charter Button */}
          {onOpenTermsModal && (
            <button
              onClick={onOpenTermsModal}
              title="Review GHACPerm Terms & Conditions and 5 Golden Life-Saving Rules"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-accent-border)] transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span className="hidden md:inline font-mono text-[11px]">Terms &amp; Policy</span>
            </button>
          )}

          {/* Document Encryption Vault Button */}
          <button
            onClick={onOpenSecurityModal}
            title="Secure Document Encryption & SHA-256 Vault"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-accent-border)] transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            <span className="hidden sm:inline font-mono text-[11px]">AES-256</span>
          </button>

          {/* Cloud Sync Status Indicator */}
          <button
            onClick={onOpenSyncModal}
            title={syncStatus.message}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-accent-border)] transition-colors"
          >
            {syncStatus.state === 'syncing' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />
            ) : syncStatus.state === 'synced' ? (
              <Cloud className="h-3.5 w-3.5 text-[var(--color-good)]" />
            ) : (
              <CloudOff className="h-3.5 w-3.5 text-[var(--color-warning)]" />
            )}
            <span className="hidden lg:inline text-[11px] font-mono capitalize">
              {syncStatus.state === 'synced' ? 'Cloud Synced' : syncStatus.state}
            </span>
            {syncStatus.pendingQueueCount > 0 && (
              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)]/30">
                {syncStatus.pendingQueueCount}
              </span>
            )}
          </button>

          {/* Theme Selector */}
          <button
            onClick={() => {
              const nextTheme = (currentTheme === 'daylight' || !currentTheme) ? 'dark' : currentTheme === 'dark' ? 'steel' : 'daylight';
              onChangeTheme(nextTheme);
            }}
            title="Toggle theme preset (Daylight White / Emerald Dark / Steel Slate)"
            className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
            aria-label="Toggle Theme"
          >
            {currentTheme === 'dark' || currentTheme === 'steel' ? (
              <Sun className="h-4 w-4 text-[var(--color-warning)]" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--color-accent)]" />
            )}
          </button>

          {/* Sync Settings button */}
          <button
            onClick={onOpenSyncModal}
            title="Sync & Connection Settings"
            className="p-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
            aria-label="Sync Settings"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden overflow-x-auto scrollbar-none border-t border-[var(--color-border-subtle)] px-3 py-2 gap-2 text-xs touch-pan-x">
        <button
          onClick={() => onSelectTab('general')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap min-h-[36px] flex items-center font-medium transition-colors ${
            ['general', 'hotwork', 'height'].includes(currentTab)
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent-border)]'
              : 'text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]'
          }`}
        >
          Permit Forms
        </button>
        <button
          onClick={() => onSelectTab('conflicts')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap min-h-[36px] flex items-center font-medium transition-colors ${
            currentTab === 'conflicts'
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent-border)]'
              : 'text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]'
          }`}
        >
          AI Conflict Radar
        </button>
        <button
          onClick={() => onSelectTab('approved')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap min-h-[36px] flex items-center font-medium transition-colors ${
            currentTab === 'approved'
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent-border)]'
              : 'text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]'
          }`}
        >
          Approved Register
        </button>
        <button
          onClick={() => onSelectTab('rejected')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap min-h-[36px] flex items-center font-medium transition-colors ${
            currentTab === 'rejected'
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent-border)]'
              : 'text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => onSelectTab('admin')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap min-h-[36px] flex items-center font-medium transition-colors ${
            currentTab === 'admin'
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent-border)]'
              : 'text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]'
          }`}
        >
          Executive Operations
        </button>
      </div>
    </header>
  );
};

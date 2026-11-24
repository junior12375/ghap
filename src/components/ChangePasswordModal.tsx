import React, { useState } from 'react';
import {
  KeyRound,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  BadgeCheck,
} from 'lucide-react';
import {
  ExecutiveUser,
  updateExecutivePassword,
} from '../utils/executiveAuth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ExecutiveUser | null;
  onPasswordChanged: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPasswordChanged,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentUser.envManaged) {
      setError('This administrator account is managed via EXECUTIVE_ADMIN_PASSWORD in Settings > Secrets.');
      return;
    }

    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setIsSaving(true);
    const res = await updateExecutivePassword(currentPassword, newPassword);
    setIsSaving(false);

    if (res.success) {
      onPasswordChanged(`✓ Password for ${currentUser.fullName} updated successfully.`);
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to update password. Please verify your current password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-elevated)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-[var(--color-text-main)]">
                Update Executive Password
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {currentUser.fullName} ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-600/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[11px] space-y-1">
            <div className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>{currentUser.clearanceLevel}</span>
            </div>
            <div className="text-[var(--color-text-muted)]">
              Username: <span className="font-mono font-bold text-[var(--color-text-main)]">{currentUser.username}</span> · Work ID: <span className="font-mono text-[var(--color-text-main)]">{currentUser.workId}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-main)] mb-1">
              Current Password
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter existing password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-main)] mb-1">
              New Password <span className="text-[10px] text-[var(--color-text-muted)] font-normal">(min. 8 characters)</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-main)] mb-1">
              Confirm New Password
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-main)] font-mono focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center gap-1.5 cursor-pointer"
            >
              {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showPass ? 'Hide passwords' : 'Show passwords'}</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-muted)] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-neutral-950 font-display font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

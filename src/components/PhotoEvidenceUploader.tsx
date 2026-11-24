import React, { useRef } from 'react';
import { Camera, Check, Trash2, ShieldAlert } from 'lucide-react';
import { compressImageFile } from '../utils/permitHelpers';

interface PhotoEvidenceUploaderProps {
  label: string;
  description: string;
  required?: boolean;
  photoUrl?: string;
  photoName?: string;
  photoTimestamp?: string;
  onPhotoUploaded: (dataUrl: string, name: string, timestamp: string) => void;
  onPhotoRemoved: () => void;
}

export const PhotoEvidenceUploader: React.FC<PhotoEvidenceUploaderProps> = ({
  label,
  description,
  required,
  photoUrl,
  photoName,
  photoTimestamp,
  onPhotoUploaded,
  onPhotoRemoved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUrl, name, timestamp } = await compressImageFile(file);
      onPhotoUploaded(dataUrl, name, timestamp);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        photoUrl
          ? 'border-[var(--color-accent-border)] bg-[var(--color-surface)]'
          : required
          ? 'border-[var(--color-warning)]/40 bg-[var(--color-surface)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">{label}</span>
            {required && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)]/30">
                REQUIRED
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{description}</p>
        </div>

        {photoUrl ? (
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-good)] font-mono font-medium shrink-0">
            <Check className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : required ? (
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-warning)] font-mono shrink-0">
            <ShieldAlert className="h-3.5 w-3.5" />
            Missing
          </span>
        ) : null}
      </div>

      {photoUrl ? (
        <div className="mt-3 space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/40 aspect-[4/3] max-h-48 flex items-center justify-center">
            <img src={photoUrl} alt={label} className="h-full w-full object-contain" />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)] pt-1">
            <span className="truncate max-w-[200px]">{photoName || 'evidence.jpg'}</span>
            <span>{photoTimestamp || 'Captured'}</span>
          </div>

          <button
            type="button"
            onClick={onPhotoRemoved}
            className="flex items-center gap-1 text-xs text-[var(--color-danger)] hover:underline pt-1"
          >
            <Trash2 className="h-3 w-3" />
            Remove photo
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
          >
            <Camera className="h-4 w-4 text-[var(--color-accent)]" />
            <span>Capture Site Photo Evidence</span>
          </button>
        </div>
      )}
    </div>
  );
};

import { PrimaryButton, OutlineButton } from './ui'

/**
 * Ersetzt native window.alert()/confirm()-Dialoge (die nicht zum sonst
 * komplett eigenen UI-Stil der App passen, siehe AvatarCropModal.tsx für ein
 * weiteres Beispiel eines eigenen Modals) durch eine im gleichen Look
 * gestaltete Karte. Zwei Modi: reine Info (kein onCancel -> nur ein
 * "OK"-Button) oder Bestätigung (Abbrechen + Bestätigen, z. B. beim Löschen).
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Abbrechen',
  danger,
  onConfirm,
  onCancel,
}: {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Bestätigen-Button in Warnfarbe (z. B. für "wirklich löschen"). */
  danger?: boolean
  onConfirm: () => void
  onCancel?: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-[18px] sm:items-center" onClick={onCancel}>
      <div className="w-full max-w-[380px] rounded-2xl border border-line bg-surface p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        {title && <div className="mb-1.5 text-[15px] font-extrabold text-cream">{title}</div>}
        <div className="text-[13px] leading-relaxed text-cream-soft">{message}</div>
        <div className="mt-5 flex gap-2">
          {onCancel && (
            <OutlineButton className="flex-1" onClick={onCancel}>
              {cancelLabel}
            </OutlineButton>
          )}
          <PrimaryButton
            className={danger ? 'flex-1 border-[#e05a4e] bg-[#e05a4e] shadow-[0_10px_24px_rgba(224,90,78,0.35)]' : 'flex-1'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

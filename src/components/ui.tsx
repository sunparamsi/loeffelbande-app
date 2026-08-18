import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export function Chip({
  children,
  selected,
  dashed,
  fav,
  onClick,
}: {
  children: ReactNode
  selected?: boolean
  dashed?: boolean
  fav?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12.5px] font-semibold shadow-card-sm transition-colors ${
        selected
          ? 'border-rust-solid bg-rust-solid text-white'
          : dashed
            ? 'border-dashed border-rust text-rust shadow-none'
            : fav
              ? 'border-line bg-surface text-rust'
              : 'border-line bg-surface text-cream-soft'
      }`}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  children,
  onClick,
  dot,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  dot?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm"
    >
      {children}
      {dot && <span className="absolute -right-0.5 -top-0.5 h-[9px] w-[9px] rounded-full border-2 border-surface bg-rust-solid" />}
    </button>
  )
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={twMerge(
        'flex items-center justify-center gap-2 rounded-full border border-rust-solid bg-rust-solid px-4 py-3.5 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(242,129,74,0.35)] disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function OutlineButton({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge('flex items-center justify-center gap-2 rounded-full border-[1.5px] border-cream px-4 py-3.5 text-[13px] font-bold text-cream', className)}
    >
      {children}
    </button>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return (
    <input
      {...rest}
      // twMerge statt reiner String-Konkatenation: verhindert, dass das fest
      // eingebaute "w-full" eine von außen übergebene Breite (z. B. "w-[62px]"
      // oder "flex-1" in mehrspaltigen Zeilen wie der Zutatenliste) im
      // generierten CSS zufällig überstimmt – Tailwind entscheidet bei
      // gleicher Spezifität nach Reihenfolge im Stylesheet, nicht nach
      // Reihenfolge in der class-Angabe, daher reichte reines Anhängen nicht.
      className={twMerge(
        'w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-cream placeholder:text-cream-soft/70 focus:outline-none focus:border-rust',
        className,
      )}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return (
    <textarea
      {...rest}
      className={twMerge(
        'w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-cream placeholder:text-cream-soft/70 focus:outline-none focus:border-rust',
        className,
      )}
    />
  )
}

export function FormLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">{children}</label>
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="px-[18px] pb-2 pt-[18px] text-[10.5px] font-bold uppercase tracking-wider text-rust">{children}</div>
}

export function RowCard({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`mx-[18px] mb-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 text-[13.5px] text-cream shadow-card-sm ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </div>
  )
}

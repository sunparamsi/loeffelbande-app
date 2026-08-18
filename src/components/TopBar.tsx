import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BellIcon, GearIcon, LogoMarkIcon } from '../icons'
import { IconBtn } from './ui'
import { repo } from '../data'
import { useAuth } from '../lib/useAuth'
import { getMemberAvatar, memberAvatarKey } from '../lib/prefs'

export function LogoBadge({ size = 30 }: { size?: number }) {
  const [logo, setLogo] = useState<string | null>(null)
  useEffect(() => {
    repo.getSettings().then((s) => setLogo(s.logoDataUrl))
  }, [])
  if (logo) {
    return <img src={logo} alt="Logo" style={{ width: size, height: size }} className="rounded-[10px] object-cover flex-shrink-0" />
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex flex-shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-rust)_14%,white)] text-rust"
    >
      <LogoMarkIcon width={size * 0.5} height={size * 0.5} strokeWidth={2} />
    </div>
  )
}

function AvatarBadge({ size = 32 }: { size?: number }) {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    setAvatar(getMemberAvatar(memberAvatarKey(authState?.household?.id, authState?.currentMemberName)))
  }, [authState?.household?.id, authState?.currentMemberName])

  const initial = (authState?.currentMemberName ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <button
      type="button"
      onClick={() => navigate('/einstellungen')}
      aria-label="Profil & Einstellungen"
      style={{ width: size, height: size }}
      className="flex-shrink-0 overflow-hidden rounded-full border-2 border-rust"
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_srgb,var(--color-rust)_14%,white)] text-[12.5px] font-bold text-rust">
          {initial}
        </div>
      )}
    </button>
  )
}

export default function TopBar({ title, showActions = true }: { title: string; showActions?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between px-[18px] pb-2 pt-5">
      <div className="flex items-center gap-2.5">
        <LogoBadge />
        <div className="text-[12.5px] font-semibold text-cream-soft">{title}</div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <AvatarBadge />
          <IconBtn dot onClick={() => navigate('/aktivitaet')} ariaLabel="Aktivität">
            <BellIcon width={15} height={15} />
          </IconBtn>
          <IconBtn onClick={() => navigate('/einstellungen')} ariaLabel="Einstellungen">
            <GearIcon width={15} height={15} />
          </IconBtn>
        </div>
      )}
    </div>
  )
}

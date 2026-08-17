import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BellIcon, GearIcon, CameraIcon } from '../icons'
import { IconBtn } from './ui'
import { repo } from '../data'

export function LogoBadge({ size = 30 }: { size?: number }) {
  const [logo, setLogo] = useState<string | null>(null)
  useEffect(() => {
    repo.getSettings().then((s) => setLogo(s.logoDataUrl))
  }, [])
  if (logo) {
    return <img src={logo} alt="Logo" style={{ width: size, height: size }} className="rounded-[9px] object-cover flex-shrink-0" />
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex flex-shrink-0 items-center justify-center rounded-[9px] border border-dashed border-line bg-surface-2 text-cream-soft"
    >
      <CameraIcon width={size * 0.5} height={size * 0.5} />
    </div>
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
        <div className="flex gap-2">
          <IconBtn dot onClick={() => navigate('/aktivitaet')} ariaLabel="Aktivität">
            <BellIcon />
          </IconBtn>
          <IconBtn onClick={() => navigate('/einstellungen')} ariaLabel="Einstellungen">
            <GearIcon />
          </IconBtn>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon, GearIcon, HeartIcon } from '../icons'
import { IconBtn } from './ui'
import { repo } from '../data'

export function LogoBadge({ size = 30 }: { size?: number }) {
  const [logo, setLogo] = useState<string | null>(null)
  useEffect(() => {
    repo.getSettings().then((s) => setLogo(s.logoDataUrl))
  }, [])
  return (
    <img
      src={logo ?? '/pwa-192x192.png'}
      alt="Logo"
      style={{ width: size, height: size }}
      className="rounded-[10px] object-cover flex-shrink-0"
    />
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
          <IconBtn onClick={() => navigate('/rezepte?filter=Favoriten')} ariaLabel="Favoriten anzeigen">
            <HeartIcon width={15} height={15} />
          </IconBtn>
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

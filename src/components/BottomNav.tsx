import { NavLink } from 'react-router-dom'
import { HomeIcon, BookIcon, BasketIcon, CartIcon, UsersIcon } from '../icons'

const items = [
  { to: '/', label: 'Start', Icon: HomeIcon, end: true },
  { to: '/rezepte', label: 'Rezepte', Icon: BookIcon, end: false },
  { to: '/vorrat', label: 'Vorrat', Icon: BasketIcon, end: false },
  { to: '/einkauf', label: 'Einkauf', Icon: CartIcon, end: false },
  { to: '/haushalt', label: 'Haushalt', Icon: UsersIcon, end: false },
]

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-line bg-surface px-1.5 pb-3 pt-2.5">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 text-[10px] ${isActive ? 'text-rust font-bold' : 'text-cream-soft'}`
          }
        >
          <Icon width={18} height={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

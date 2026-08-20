import { NavLink } from 'react-router-dom'
import { HomeIcon, HomeFilledIcon, BookIcon, CartIcon, UsersIcon } from '../icons'

const items = [
  { to: '/', label: 'Start', Icon: HomeIcon, ActiveIcon: HomeFilledIcon, end: true },
  { to: '/rezepte', label: 'Rezepte', Icon: BookIcon, ActiveIcon: BookIcon, end: false },
  { to: '/einkauf', label: 'Einkauf', Icon: CartIcon, ActiveIcon: CartIcon, end: false },
  { to: '/haushalt', label: 'Haushalt', Icon: UsersIcon, ActiveIcon: UsersIcon, end: false },
]

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-line bg-surface px-1.5 pb-3.5 pt-2.5">
      {items.map(({ to, label, Icon, ActiveIcon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 text-[10px] ${isActive ? 'text-rust font-bold' : 'text-cream-soft font-semibold'}`
          }
        >
          {({ isActive }) => {
            const I = isActive ? ActiveIcon : Icon
            return (
              <>
                <I width={18} height={18} />
                {label}
              </>
            )
          }}
        </NavLink>
      ))}
    </nav>
  )
}

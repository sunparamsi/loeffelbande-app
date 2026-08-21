// Schlichte Linien-Icons (24x24 Viewbox), im Stil des Mockups.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (children: React.ReactNode, props: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={props.width ?? 18}
    height={props.height ?? 18}
    stroke="currentColor"
    fill="none"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
)

export const HomeIcon = (p: IconProps) => base(<><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /></>, p)
export const BookIcon = (p: IconProps) => base(<><path d="M4 19V5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v15" /><path d="M4 19a2 2 0 0 0 2 2h12" /><path d="M4 15h14" /></>, p)
export const BasketIcon = (p: IconProps) => base(<><path d="M3 9h18l-1.5 10.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 9Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></>, p)
export const CartIcon = (p: IconProps) => base(<><circle cx="9" cy="21" r="1" /><circle cx="18" cy="21" r="1" /><path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" /></>, p)
export const UsersIcon = (p: IconProps) => base(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="18" cy="9" r="2.4" /><path d="M15.5 14.2c2.6.3 4.5 2.2 4.5 4.8" /></>, p)
export const ActivityIcon = (p: IconProps) => base(<><path d="M13 3v6h6" /><path d="M5 21v-8l8-8 8 8v8a1 1 0 0 1-1 1h-4v-6H10v6H6a1 1 0 0 1-1-1Z" /></>, p)
export const BellIcon = (p: IconProps) => base(<><path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>, p)
export const GearIcon = (p: IconProps) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>, p)
export const PlusIcon = (p: IconProps) => base(<path d="M12 5v14M5 12h14" />, p)
export const SearchIcon = (p: IconProps) => base(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>, p)
export const XIcon = (p: IconProps) => base(<path d="M18 6 6 18M6 6l12 12" />, p)
export const HeartIcon = (p: IconProps) => base(<path d="M12 21s-6.7-4.3-9.3-8.1C1 10 1.8 6.6 4.6 5.1 7 3.8 9.8 4.6 12 7c2.2-2.4 5-3.2 7.4-1.9 2.8 1.5 3.6 4.9 1.9 7.8C18.7 16.7 12 21 12 21Z" fill="currentColor" stroke="none" />, p)
export const HeartOutlineIcon = (p: IconProps) => base(<path d="M12 21s-6.7-4.3-9.3-8.1C1 10 1.8 6.6 4.6 5.1 7 3.8 9.8 4.6 12 7c2.2-2.4 5-3.2 7.4-1.9 2.8 1.5 3.6 4.9 1.9 7.8C18.7 16.7 12 21 12 21Z" />, p)
export const EditIcon = (p: IconProps) => base(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>, p)
export const ArrowLeftIcon = (p: IconProps) => base(<path d="M15 19l-7-7 7-7" />, p)
export const ArrowRightIcon = (p: IconProps) => base(<path d="M9 5l7 7-7 7" />, p)
export const ShareIcon = (p: IconProps) => base(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9" /></>, p)
export const UploadIcon = (p: IconProps) => base(<><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" /></>, p)
export const LinkIcon = (p: IconProps) => base(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" /></>, p)
export const CameraIcon = (p: IconProps) => base(<><path d="M4 7h4l2-2h6l2 2h4v12H3V7Z" transform="translate(0.5 0)" /><circle cx="12" cy="13" r="3.5" /></>, p)
export const FileIcon = (p: IconProps) => base(<><path d="M4 3h10l6 6v12H4V3Z" /><path d="M14 3v6h6" /></>, p)
export const PdfIcon = (p: IconProps) => base(<><path d="M4 3h10l6 6v12H4V3Z" /><path d="M14 3v6h6" /><path d="M7.5 17.5v-4h1.3a1.2 1.2 0 0 1 0 2.4H7.5" /><path d="M11.3 17.5v-4h1.4" /><path d="M11.3 15.6h1.1" /><path d="M15 17.5v-4h1.6" /></>, p)
export const InstagramIcon = (p: IconProps) => base(<><rect x="3" y="3" width="18" height="18" rx="4.5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" /></>, p)
export const PlayIcon = (p: IconProps) => base(<path d="M5 3v18l15-9L5 3Z" fill="currentColor" stroke="none" />, p)
export const TrashIcon = (p: IconProps) => base(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></>, p)
export const SunIcon = (p: IconProps) => base(<><circle cx="12" cy="12" r="4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>, p)
export const LogoutIcon = (p: IconProps) => base(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>, p)
export const CheckIcon = (p: IconProps) => base(<path d="M20 6 9 17l-5-5" />, p)
export const BookmarkIcon = (p: IconProps) => base(<path d="M6 3h12a1 1 0 0 1 1 1v16.5a.5.5 0 0 1-.8.4L12 17l-6.2 3.9a.5.5 0 0 1-.8-.4V4a1 1 0 0 1 1-1Z" />, p)
export const BookmarkFilledIcon = (p: IconProps) => base(<path d="M6 3h12a1 1 0 0 1 1 1v16.5a.5.5 0 0 1-.8.4L12 17l-6.2 3.9a.5.5 0 0 1-.8-.4V4a1 1 0 0 1 1-1Z" fill="currentColor" stroke="none" />, p)
export const HomeFilledIcon = (p: IconProps) => base(<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1V11.5Z" fill="currentColor" stroke="none" />, p)
export const ClockIcon = (p: IconProps) => base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>, p)
export const LevelIcon = (p: IconProps) => base(<path d="M5 19V10M12 19V5M19 19v-6" />, p)
export const FilterIcon = (p: IconProps) => base(<><path d="M4 6h16M8 12h12M11 18h9" /><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="8" cy="18" r="1.6" fill="currentColor" stroke="none" /></>, p)
export const LeafIcon = (p: IconProps) => base(<path d="M8 2c0 3-2 4-2 7a3 3 0 0 0 6 0c0-3-2-4-2-7" />, p)
export const LogoMarkIcon = (p: IconProps) => base(<><path d="M8 2c0 3-2 4-2 7a3 3 0 0 0 6 0c0-3-2-4-2-7" /><path d="M9 13v9" /><path d="M17 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" /><path d="M19 12v10" /></>, p)
export const VideoIcon = (p: IconProps) => base(<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10.5 5-3v9l-5-3Z" /></>, p)

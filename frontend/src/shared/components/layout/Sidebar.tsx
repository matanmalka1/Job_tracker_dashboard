import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Settings,
  Kanban,
  Calendar,
} from 'lucide-react'
import { fetchHealth } from '../../../api/client.ts'

const HEALTH_CHECK_INTERVAL_MS = 30_000

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={16} /> },
  { to: '/applications', label: 'Applications', icon: <FileText size={16} /> },
  { to: '/pipeline',     label: 'Pipeline',     icon: <Kanban size={16} /> },
  { to: '/interviews',   label: 'Interviews',   icon: <Calendar size={16} /> },
  { to: '/companies',    label: 'Companies',    icon: <Building2 size={16} /> },
  { to: '/settings',     label: 'Settings',     icon: <Settings size={16} /> },
]

interface SidebarProps {
  onNavClick?: () => void
}

const Sidebar = ({ onNavClick }: SidebarProps) => {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: HEALTH_CHECK_INTERVAL_MS,
    retry: 1,
    staleTime: 0, // always poll live — cached "connected" is meaningless for a status indicator
  })

  const connected = !isLoading && !isError && data?.status === 'ok'
  const statusLabel = isLoading ? 'Checking…' : connected ? 'Connected' : 'Disconnected'
  const statusDotClass = isLoading ? 'bg-white/20' : connected ? 'bg-green-500' : 'bg-red-500'

  return (
  <aside className="flex flex-col w-[220px] min-h-screen shrink-0"
    style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>

    {/* logo */}
    <div className="flex items-center gap-3 px-5 py-5"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <img src="/logo.svg" alt="" className="w-7 h-7 shrink-0 opacity-90" />
      <div>
        <div className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
          JobTracker
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          Job search dashboard
        </div>
      </div>
    </div>

    {/* section label */}
    <div className="px-4 pt-5 pb-2">
      <span className="section-label">Menu</span>
    </div>

    {/* nav */}
    <nav className="flex flex-col px-3 flex-1 gap-0.5">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavClick}
          className="no-underline"
        >
          {({ isActive }) => (
            <div className={isActive ? 'nav-item-active' : 'nav-item'}>
              <span style={{ opacity: isActive ? 0.9 : 0.55, color: isActive ? 'var(--accent)' : 'inherit' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>

    {/* footer */}
    <div className="flex items-center gap-2 px-5 py-4"
      style={{ borderTop: '1px solid var(--border)' }}>
      <div className={['w-2 h-2 rounded-full shrink-0', statusDotClass].join(' ')} />
      <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{statusLabel}</span>
    </div>
  </aside>
  )
}

export default Sidebar

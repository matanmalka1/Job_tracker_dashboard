import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Settings,
  Kanban,
  Database,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/pipeline', label: 'Pipeline', icon: <Kanban size={20} /> },
  { to: '/applications', label: 'Applications', icon: <FileText size={20} /> },
  { to: '/companies', label: 'Companies', icon: <Building2 size={20} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  { to: '/manage-data', label: 'Manage Data', icon: <Database size={20} /> },
]

interface SidebarProps {
  onNavClick?: () => void
}

const Sidebar = ({ onNavClick }: SidebarProps) => (
  <aside className="w-60 min-h-screen bg-[#1a1a24] flex flex-col py-6 px-3 shrink-0">
    <div className="px-3 mb-8">
      <h1 className="text-white text-lg font-bold tracking-tight">
        Job<span className="text-purple-500">Tracker</span>
      </h1>
      <p className="text-gray-500 text-xs mt-0.5">Application Dashboard</p>
    </div>

    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavClick}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            ].join(' ')
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>

    <div className="flex-1" />

    <p className="text-gray-600 text-xs text-center">v1.0.0</p>
  </aside>
)

export default Sidebar

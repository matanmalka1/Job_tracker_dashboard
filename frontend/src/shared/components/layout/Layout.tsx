import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { IconButton } from '@/shared/components/ui'
import Sidebar from './Sidebar.tsx'
import GlobalSearch from './GlobalSearch.tsx'
import { useTheme } from '../../hooks/useTheme.ts'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/pipeline':     'Pipeline',
  '/applications': 'Applications',
  '/companies':    'Companies',
  '/live-logger':  'Live Logger',
  '/settings':     'Settings',
  '/manage-data':  'Manage Data',
  '/interviews':   'Interviews',
}

const Clock = () => {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div className="flex flex-col items-end justify-center px-4 min-w-[80px]"
      style={{ borderLeft: '1px solid var(--border)' }}>
      <span className="text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>{time}</span>
      <span className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{date}</span>
    </div>
  )
}

const Layout = () => {
  const { pathname } = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { theme, toggle } = useTheme()

  const isDetailPage = /^\/applications\/\d+/.test(pathname)
  const pageTitle = isDetailPage
    ? 'Application Detail'
    : (PAGE_TITLES[pathname] ?? 'Dashboard')

  const headerBg = theme === 'light'
    ? 'rgba(255,255,255,0.88)'
    : 'rgba(10,10,15,0.90)'

  return (
    <div className="flex min-h-screen bg-base">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar onNavClick={() => setMobileNavOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center h-14 px-6 gap-4"
          style={{
            background: headerBg,
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <IconButton
            onClick={() => setMobileNavOpen((v) => !v)}
            className="md:hidden"
            label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </IconButton>

          <span className="page-title">{pageTitle}</span>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center">
            <GlobalSearch />
          </div>

          {/* Theme toggle */}
          <IconButton
            onClick={toggle}
            label="Toggle theme"
            variant="secondary"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </IconButton>

          <Clock />
        </header>

        {/* Content */}
        <div className="p-6 pb-10">
          <Outlet />
        </div>
      </main>

      <Toaster
        position="bottom-right"
        theme={theme}
        toastOptions={{
          style: {
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-mid)',
            color: 'var(--text-1)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            borderRadius: 10,
          },
        }}
      />
    </div>
  )
}

export default Layout

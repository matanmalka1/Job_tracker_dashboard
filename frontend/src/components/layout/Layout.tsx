import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar.tsx'
import GlobalSearch from '../ui/GlobalSearch.tsx'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/pipeline': 'Pipeline',
  '/applications': 'Applications',
  '/interviews': 'Interviews',
  '/companies': 'Companies',
  '/settings': 'Settings',
}

const Layout = () => {
  const { pathname } = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Match /applications/:id
  const isDetailPage = /^\/applications\/\d+/.test(pathname)
  const pageTitle = isDetailPage
    ? 'Application Detail'
    : PAGE_TITLES[pathname] ?? 'Overview'

  return (
    <div className="flex min-h-screen bg-[#0f0f13]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar overlay */}
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
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 md:px-6 gap-4 sticky top-0 z-30 bg-[#0f0f13]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-white font-semibold text-sm">{pageTitle}</h2>
          </div>
          <div className="hidden sm:block">
            <GlobalSearch />
          </div>
        </header>

        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#1a1a24',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#ffffff',
          },
        }}
      />
    </div>
  )
}

export default Layout

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, FileText, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchApplications } from '../../api/client.ts'
import type { JobApplication } from '../../types/index.ts'
import StatusBadge from './StatusBadge.tsx'

const GlobalSearch = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['applications', 'search-pool'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
    staleTime: 30_000,
  })

  const results: JobApplication[] = query.trim().length < 2
    ? []
    : (data?.items ?? []).filter((app) => {
        const q = query.toLowerCase()
        return (
          app.company_name.toLowerCase().includes(q) ||
          // FIX: role_title is now string | null — guard before calling .toLowerCase()
          (app.role_title?.toLowerCase().includes(q) ?? false) ||
          (app.source ?? '').toLowerCase().includes(q)
        )
      }).slice(0, 8)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (app: JobApplication) => {
    navigate(`/applications/${app.id}`)
    setOpen(false)
    setQuery('')
  }

  const openSearch = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={openSearch}
        className="flex items-center gap-2 bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-1.5 text-gray-500 text-sm hover:border-white/20 hover:text-gray-400 transition-colors w-48"
        aria-label="Open search (⌘K)"
      >
        <Search size={14} />
        <span className="flex-1 text-left text-xs">Search…</span>
        <kbd className="text-xs bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 left-0 w-96 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-label="Search applications"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <Search size={15} className="text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, role, or source…"
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              autoComplete="off"
              aria-label="Search query"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {query.trim().length >= 2 && (
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">No applications found</div>
              ) : (
                results.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSelect(app)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] text-left transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center">
                      <span className="text-purple-400 text-xs font-bold">
                        {app.company_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{app.company_name}</p>
                      {/* FIX: role_title is now string | null */}
                      <p className="text-gray-400 text-xs truncate">{app.role_title ?? '—'}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </button>
                ))
              )}
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="px-4 py-4">
              <p className="text-gray-600 text-xs mb-3">Quick navigation</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Applications', path: '/applications', icon: <FileText size={13} /> },
                  { label: 'Companies', path: '/companies', icon: <Building2 size={13} /> },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 text-xs transition-colors"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
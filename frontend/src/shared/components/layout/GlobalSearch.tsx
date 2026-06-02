import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, FileText, Building2, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button, IconButton, Input, Kbd } from '@/shared/components/ui'
import { fetchApplications } from '../../../api/client.ts'
import type { JobApplication } from '../../types/job-tracker.ts'
import ApplicationStatusBadge from '../data-display/ApplicationStatusBadge.tsx'

const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

const GlobalSearch = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [query])

  const isQueryValid = open && debouncedQuery.trim().length >= MIN_QUERY_LENGTH

  const { data, isFetching, isError } = useQuery({
    queryKey: ['applications', 'global-search', debouncedQuery],
    queryFn: () => fetchApplications({ search: debouncedQuery.trim(), limit: 8, offset: 0 }),
    enabled: isQueryValid,
    staleTime: 15_000,
  })

  const results: JobApplication[] = isQueryValid ? (data?.items ?? []) : []

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
        setDebouncedQuery('')
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
        setDebouncedQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (app: JobApplication) => {
    navigate(`/applications/${app.id}`)
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
  }

  const openSearch = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={openSearch}
        variant="secondary"
        size="sm"
        icon={<Search size={14} />}
        className="w-48 justify-start bg-surface border-mid"
        aria-label="Open search (⌘K)"
      >
        <span className="flex-1 text-left text-xs">Search...</span>
        <Kbd>⌘K</Kbd>
      </Button>

      {open && (
        <div
          className="absolute top-full mt-2 left-0 w-96 bg-surface border border-DEFAULT rounded-xl shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-label="Search applications"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-DEFAULT">
            <Search size={15} className="text-t2 shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, role, or source…"
              className="flex-1 bg-transparent border-transparent p-0 focus:border-transparent focus:ring-0"
              autoComplete="off"
              aria-label="Search query"
            />
            {query && (
              <IconButton
                onClick={() => { setQuery(''); setDebouncedQuery('') }}
                label="Clear search"
                size="sm"
              >
                <X size={14} />
              </IconButton>
            )}
          </div>

          {query.trim().length >= MIN_QUERY_LENGTH && (
            <div className="max-h-80 overflow-y-auto">
              {isFetching ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-t2 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Searching…
                </div>
              ) : isError ? (
                <div className="px-4 py-6 text-center text-red-400 text-sm">Search failed</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center text-t2 text-sm">No applications found</div>
              ) : (
                results.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleSelect(app)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-hover text-left transition-colors border-b border-DEFAULT last:border-0"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center">
                      <span className="text-purple-400 text-xs font-bold">
                        {app.company_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-t1 text-sm font-medium truncate">{app.company_name}</p>
                      <p className="text-t2 text-xs truncate">{app.role_title ?? '—'}</p>
                    </div>
                    <ApplicationStatusBadge status={app.status} />
                  </button>
                ))
              )}
            </div>
          )}

          {query.trim().length < MIN_QUERY_LENGTH && (
            <div className="px-4 py-4">
              <p className="text-t3 text-xs mb-3">Quick navigation</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Applications', path: '/applications', icon: <FileText size={13} /> },
                  { label: 'Companies', path: '/companies', icon: <Building2 size={13} /> },
                ].map((item) => (
                  <Button
                    key={item.path}
                    onClick={() => { navigate(item.path); setOpen(false) }}
                    variant="secondary"
                    size="sm"
                    icon={item.icon}
                    className="h-auto justify-start py-2 bg-raised text-xs"
                  >
                    {item.label}
                  </Button>
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

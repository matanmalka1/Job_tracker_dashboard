import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { fetchCompaniesSummary } from '../../../api/client.ts'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import CompanyCard from '../components/CompanyCard.tsx'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

const CompaniesPage = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['companies', 'summary', debouncedSearch],
    queryFn: () => fetchCompaniesSummary({
      search: debouncedSearch.trim() || undefined,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    staleTime: 30_000,
  })

  const companies = data?.items ?? []
  const companyCount = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Companies</h1>
        <p className="text-gray-400 text-sm mt-1">
          {data
            ? `${companyCount} compan${companyCount !== 1 ? 'ies' : 'y'}`
            : 'Loading…'}
        </p>
      </div>

      <div className="bg-[#1a1a24] border border-white/5 rounded-lg px-4 py-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies…"
          className="w-full bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
        />
      </div>

      {isLoading && <LoadingSpinner size="lg" message="Loading companies…" />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load companies.</p>
        </div>
      )}

      {!isLoading && !isError && companies.length === 0 && (
        <div className="bg-[#1a1a24] rounded-xl p-12 border border-white/5 text-center">
          <Building2 size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {search ? 'No companies match your search.' : 'No companies yet'}
          </p>
          {!search && (
            <p className="text-gray-600 text-xs mt-1">Add applications to see them grouped by company.</p>
          )}
        </div>
      )}

      {!isLoading && !isError && companies.length > 0 && (
        <div className="space-y-3">
          {companies.map((company) => (
            <CompanyCard key={company.company_name} company={company} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CompaniesPage

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { Card, EmptyState, SearchInput } from '@/shared/components/ui'
import { fetchCompaniesSummary } from '../../../api/client.ts'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import PaginationBar from '../../applications/components/PaginationBar.tsx'
import CompanyCard from '../components/CompanyCard.tsx'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

const CompaniesPage = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['companies', 'summary', debouncedSearch, page],
    queryFn: () => fetchCompaniesSummary({
      search: debouncedSearch.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const companies = data?.items ?? []
  const companyCount = data?.total ?? 0
  const totalPages = Math.ceil(companyCount / PAGE_SIZE)
  const setSearchAndResetPage = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-t1 text-2xl font-bold">Companies</h1>
        <p className="text-t2 text-sm mt-1">
          {data
            ? `${companyCount} compan${companyCount !== 1 ? 'ies' : 'y'}`
            : 'Loading…'}
        </p>
      </div>

      <Card padding={false} className="px-4 py-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearchAndResetPage(e.target.value)}
          placeholder="Search companies…"
          className="bg-transparent border-transparent p-0 focus:border-transparent focus:ring-0"
        />
      </Card>

      {isLoading && <LoadingSpinner size="lg" message="Loading companies…" />}

      {isError && (
        <Card className="p-8 text-center">
          <p className="text-red-400 text-sm">Failed to load companies.</p>
        </Card>
      )}

      {!isLoading && !isError && companies.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={<Building2 size={32} />}
            title={search ? 'No companies match your search.' : 'No companies yet'}
            description={!search ? 'Add applications to see them grouped by company.' : undefined}
            className="py-12"
          />
        </Card>
      )}

      {!isLoading && !isError && companies.length > 0 && (
        <div className="space-y-3">
          {companies.map((company) => (
            <CompanyCard key={company.company_name} company={company} />
          ))}
        </div>
      )}

      {!isLoading && !isError && companies.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={companyCount}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

export default CompaniesPage

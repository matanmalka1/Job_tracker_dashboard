import { useQuery } from '@tanstack/react-query'
import { fetchApplications } from '../api/client.ts'
import KanbanBoard from '../components/pipeline/KanbanBoard.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'

const PipelinePage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'pipeline'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const applications = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Pipeline Board</h1>
        <p className="text-gray-400 text-sm mt-1">
          {data ? `${data.total} application${data.total !== 1 ? 's' : ''}` : 'Loading...'}
        </p>
      </div>

      {isLoading && <LoadingSpinner size="lg" message="Loading pipeline..." />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <KanbanBoard applications={applications} />
      )}
    </div>
  )
}

export default PipelinePage

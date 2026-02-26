import { useQuery } from '@tanstack/react-query'
import { fetchApplications } from '../api/client.ts'
import KanbanBoard from '../components/pipeline/KanbanBoard.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import PipelineHeader from './pipeline/components/PipelineHeader.tsx'

const PipelinePage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'pipeline'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const applications = data?.items ?? []

  return (
    <div className="space-y-6">
      <PipelineHeader total={data?.total} />

      {isLoading && <LoadingSpinner size="lg" message="Loading pipeline..." />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && <KanbanBoard applications={applications} />}
    </div>
  )
}

export default PipelinePage

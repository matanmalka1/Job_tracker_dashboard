import { useQuery } from '@tanstack/react-query'
import { fetchPipeline } from '../../../api/client.ts'
import KanbanBoard from '../components/KanbanBoard.tsx'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import PipelineHeader from '../components/PipelineHeader.tsx'

const PipelinePage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pipeline'],
    queryFn: fetchPipeline,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6">
      <PipelineHeader total={data?.total} />

      {isLoading && <LoadingSpinner size="lg" message="Loading pipeline..." />}

      {isError && (
        <div className="bg-surface rounded-xl p-8 border border-DEFAULT text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && data && <KanbanBoard pipeline={data} />}
    </div>
  )
}

export default PipelinePage

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Kanban, List } from 'lucide-react'
import { fetchApplications } from '../api/client.ts'
import KanbanBoard from '../components/pipeline/KanbanBoard.tsx'
import SortableList from '../components/pipeline/SortableList.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'

type View = 'kanban' | 'list'

const PipelinePage = () => {
  const [view, setView] = useState<View>('kanban')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'pipeline'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const applications = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Pipeline Board</h1>
          <p className="text-gray-400 text-sm mt-1">
            {data ? `${data.total} application${data.total !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#1a1a24] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setView('kanban')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'kanban'
                ? 'bg-purple-600/20 text-purple-400'
                : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            <Kanban size={16} />
            Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'list'
                ? 'bg-purple-600/20 text-purple-400'
                : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            <List size={16} />
            List
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner size="lg" message="Loading pipeline..." />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && view === 'kanban' && (
        <KanbanBoard applications={applications} />
      )}

      {!isLoading && !isError && view === 'list' && (
        <SortableList applications={applications} />
      )}
    </div>
  )
}

export default PipelinePage

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ApplicationStatus, JobApplication } from '../../types/index.ts'
import KanbanCard from './KanbanCard.tsx'

interface Props {
  status: ApplicationStatus
  label: string
  applications: JobApplication[]
  color: string
}

const KanbanColumn = ({ status, label, applications, color }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={['w-2 h-2 rounded-full', color].join(' ')} />
        <h3 className="text-white text-sm font-semibold">{label}</h3>
        <span className="text-gray-500 text-xs ml-auto">{applications.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex flex-col gap-2 min-h-[120px] p-2 rounded-xl transition-colors',
          isOver ? 'bg-purple-600/10 border border-purple-600/30' : 'bg-[#1a1a24]/50 border border-white/5',
        ].join(' ')}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-4">Drop here</p>
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
